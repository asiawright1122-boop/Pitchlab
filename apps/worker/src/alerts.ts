/**
 * Personalized alert delivery (Phase 6).
 *
 *   npm run alerts -w pitchlab-worker
 *
 * Scans fixtures + value artifact; sends Telegram for matching subscriptions.
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

type AlertKind = "kickoff" | "result" | "value_hit" | "odds_move";

type ValueFixture = {
  home: string;
  away: string;
  league?: string;
  value_bets?: { selection: string; edge: number; ev: number; odds: number }[];
};

type ValuePayload = {
  fixtures?: ValueFixture[];
  min_edge?: number;
};

function parseKinds(raw: unknown): AlertKind[] {
  if (!Array.isArray(raw)) return [];
  const allowed = new Set<AlertKind>(["kickoff", "result", "value_hit", "odds_move"]);
  return raw.filter((k): k is AlertKind => typeof k === "string" && allowed.has(k as AlertKind));
}

function scopeMatches(
  sub: { scopeType: string; scopeLeague: string | null },
  league: string
): boolean {
  if (sub.scopeType === "all") return true;
  return sub.scopeLeague === league;
}

async function sendTelegram(chatId: string, text: string): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    console.log(`\n=== TELEGRAM ALERT PREVIEW (${chatId}) ===`);
    console.log(text);
    console.log("======================================\n");
    console.log(`[alerts] TELEGRAM_BOT_TOKEN unset — skip send`);
    return false;
  }
  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, disable_web_page_preview: true }),
  });
  if (!res.ok) {
    console.error("[alerts] telegram error", await res.text());
    return false;
  }
  return true;
}

async function loadValuePayload(): Promise<ValuePayload | null> {
  const row = await prisma.publishedArtifact.findUnique({ where: { key: "value" } });
  if (row?.payload) return row.payload as ValuePayload;
  return null;
}

async function recordDelivery(subscriptionId: string, dedupeKey: string, kind: string) {
  try {
    await prisma.alertDelivery.create({
      data: { subscriptionId, dedupeKey, kind },
    });
    return true;
  } catch {
    return false;
  }
}

async function deliver(
  subscriptionId: string,
  dedupeKey: string,
  kind: AlertKind,
  chatId: string,
  text: string
): Promise<boolean> {
  const inserted = await recordDelivery(subscriptionId, dedupeKey, kind);
  if (!inserted) return false;
  return sendTelegram(chatId, text);
}

async function main() {
  const subs = await prisma.alertSubscription.findMany({
    where: { active: true },
    include: {
      user: {
        include: {
          channelBindings: true,
          subscription: { include: { plan: true } },
        },
      },
    },
  });

  if (!subs.length) {
    console.log("[alerts] no active subscriptions");
    return;
  }

  const now = Date.now();
  const kickoffWindowMs = 65 * 60 * 1000;
  const kickoffMinMs = 55 * 60 * 1000;

  const fixtures = await prisma.fixture.findMany({
    where: {
      OR: [
        { kickoffUtc: { gte: new Date(now), lte: new Date(now + kickoffWindowMs) } },
        { status: { in: ["finished", "FT", "completed", "AET", "PEN", "FINISHED", "COMPLETED"] }, updatedAt: { gte: new Date(now - 24 * 60 * 60 * 1000) } },
      ],
    },
  });

  const valuePayload = await loadValuePayload();

  // Pre-calculate odds_move alerts for upcoming 48h fixtures
  const oddsMoveWindowMs = 48 * 60 * 60 * 1000;
  const upcomingFixtures = await prisma.fixture.findMany({
    where: {
      status: "scheduled",
      kickoffUtc: { gte: new Date(now), lte: new Date(now + oddsMoveWindowMs) }
    },
    include: {
      oddsSnapshots: {
        orderBy: { takenAt: "asc" }
      }
    }
  });

  type OddsMoveAlertData = {
    fixtureId: string;
    fixtureLabel: string;
    league: string;
    market: string;
    selection: string;
    oldPrice: number;
    newPrice: number;
    dropPct: number;
  };
  const oddsMoveAlerts: OddsMoveAlertData[] = [];

  for (const fx of upcomingFixtures) {
    const groups: Record<string, typeof fx.oddsSnapshots> = {};
    for (const snap of fx.oddsSnapshots) {
      const key = `${snap.market}:${snap.selection}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(snap);
    }
    for (const [key, snaps] of Object.entries(groups)) {
      if (snaps.length < 2) continue;
      const first = snaps[0]!;
      const last = snaps[snaps.length - 1]!;
      if (first.price > last.price) {
        const dropPct = (first.price - last.price) / first.price;
        if (dropPct >= 0.1) {
          oddsMoveAlerts.push({
            fixtureId: fx.id,
            fixtureLabel: `${fx.home} vs ${fx.away}`,
            league: fx.league,
            market: first.market,
            selection: first.selection,
            oldPrice: first.price,
            newPrice: last.price,
            dropPct,
          });
        }
      }
    }
  }

  let sent = 0;

  for (const sub of subs) {
    const ent = sub.user.subscription?.plan.entitlements as Record<string, boolean> | undefined;
    if (!ent?.push) continue;

    const tg = sub.user.channelBindings.find((b) => b.channel === "telegram");
    if (!tg?.externalId) continue;

    const kinds = parseKinds(sub.kinds);
    const chatId = tg.externalId;

    for (const fx of fixtures) {
      if (!scopeMatches(sub, fx.league)) continue;

      const label = `${fx.home} vs ${fx.away} (${fx.league})`;
      const kickoffIn = fx.kickoffUtc.getTime() - now;

      if (kinds.includes("kickoff") && kickoffIn >= kickoffMinMs && kickoffIn <= kickoffWindowMs) {
        const key = `kickoff:${fx.id}`;
        const text = [
          "Quant Edge · Kickoff soon",
          "",
          label,
          `Kickoff: ${fx.kickoffUtc.toISOString().slice(0, 16)} UTC`,
          "",
          "Research only — not betting advice.",
        ].join("\n");
        if (await deliver(sub.id, key, "kickoff", chatId, text)) sent += 1;
      }

      if (
        kinds.includes("result") &&
        ["FINISHED", "FT", "COMPLETED", "AET", "PEN"].includes(fx.status.toUpperCase()) &&
        fx.homeGoals != null &&
        fx.awayGoals != null
      ) {
        const key = `result:${fx.id}`;
        const text = [
          "Quant Edge · Full time",
          "",
          label,
          `Score: ${fx.homeGoals}-${fx.awayGoals}`,
          "",
          "Research only — not betting advice.",
        ].join("\n");
        if (await deliver(sub.id, key, "result", chatId, text)) sent += 1;
      }
    }

    if (kinds.includes("value_hit") && valuePayload?.fixtures?.length) {
      const minEdge = sub.minEdge ?? valuePayload.min_edge ?? 0.02;
      for (const vf of valuePayload.fixtures) {
        const league = vf.league ?? "all";
        if (sub.scopeType === "league" && vf.league && !scopeMatches(sub, vf.league)) continue;
        if (sub.scopeType === "league" && !vf.league) continue;

        const hits = (vf.value_bets ?? []).filter((b) => b.edge >= minEdge);
        if (!hits.length) continue;

        const key = `value:${vf.home}:${vf.away}`;
        const top = hits[0]!;
        const text = [
          "Quant Edge · Value hit",
          "",
          `${vf.home} vs ${vf.away}`,
          `Selection: ${top.selection} @ ${top.odds.toFixed(2)}`,
          `Edge: ${(top.edge * 100).toFixed(2)}% · EV: ${(top.ev * 100).toFixed(1)}%`,
          `Your min edge: ${(minEdge * 100).toFixed(1)}%`,
          "",
          "Model vs market — research only.",
        ].join("\n");
        if (await deliver(sub.id, key, "value_hit", chatId, text)) sent += 1;
      }
    }

    if (kinds.includes("odds_move") && oddsMoveAlerts.length) {
      for (const alert of oddsMoveAlerts) {
        if (sub.scopeType === "league" && !scopeMatches(sub, alert.league)) continue;

        const key = `odds_move:${alert.fixtureId}:${alert.market}:${alert.selection}`;
        const text = [
          "Quant Edge · Odds Move Alert 📉",
          "",
          `${alert.fixtureLabel} (${alert.league})`,
          `Selection: ${alert.selection} (${alert.market})`,
          `Price drop: ${alert.oldPrice.toFixed(2)} → ${alert.newPrice.toFixed(2)} (-${(alert.dropPct * 100).toFixed(1)}%)`,
          "",
          "Heavy market action detected."
        ].join("\n");
        if (await deliver(sub.id, key, "odds_move", chatId, text)) sent += 1;
      }
    }
  }

  console.log(`[alerts] delivered ${sent} messages`);
}

main()
  .catch((e) => {
    console.error("[alerts] failed", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
