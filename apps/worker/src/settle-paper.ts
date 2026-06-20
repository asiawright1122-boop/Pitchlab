import type { PrismaClient } from "@prisma/client";

/** Mirror of apps/web/lib/paper.ts for worker (no cross-import). */
function result1x2(homeGoals: number, awayGoals: number): "H" | "D" | "A" {
  if (homeGoals > awayGoals) return "H";
  if (homeGoals < awayGoals) return "A";
  return "D";
}

function getDeterministicHash(str: string): number {
  let hash = 2166136261;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
  }
  return Math.abs(hash);
}

function checkBetResult(
  market: string | undefined | null,
  selection: string,
  fixtureId: string,
  homeGoals: number,
  awayGoals: number,
  odds: number,
  homeTeam?: string,
  awayTeam?: string
): { won: boolean; isVoid: boolean } {
  const normMarket = (market || "1x2").toLowerCase();
  const hTeam = homeTeam || "Home";
  const aTeam = awayTeam || "Away";

  if (normMarket === "1x2" || normMarket === "独赢盘" || normMarket.includes("match winner")) {
    const normSel = selection.toUpperCase();
    if (homeGoals > awayGoals) {
      return { won: normSel === "H" || normSel === "1" || (selection.toLowerCase().includes(hTeam.toLowerCase()) || selection.toLowerCase().includes("home")), isVoid: false };
    } else if (homeGoals < awayGoals) {
      return { won: normSel === "A" || normSel === "2" || (selection.toLowerCase().includes(aTeam.toLowerCase()) || selection.toLowerCase().includes("away")), isVoid: false };
    } else {
      return { won: normSel === "D" || normSel === "X" || selection.toLowerCase().includes("draw") || selection.includes("平"), isVoid: false };
    }
  }

  if (normMarket.includes("goals over") || normMarket.includes("大小球") || normMarket.includes("goal line")) {
    const match = selection.match(/(大|小|Over|Under)\s*([0-9.]+)/i);
    if (match) {
      const type = match[1].toLowerCase();
      const threshold = parseFloat(match[2]);
      const totalGoals = homeGoals + awayGoals;
      const isOver = type === "大" || type === "over";
      return { won: isOver ? totalGoals > threshold : totalGoals < threshold, isVoid: false };
    }
  }

  if (normMarket.includes("handicap") || normMarket.includes("让球")) {
    const numMatch = selection.match(/([-+]?[0-9.]+)/);
    if (numMatch) {
      const spread = parseFloat(numMatch[1]);
      const isHome = selection.toLowerCase().includes(hTeam.toLowerCase()) || selection.toLowerCase().includes("home") || selection.includes("主");
      if (isHome) {
        const netScore = homeGoals + spread;
        if (netScore > awayGoals) {
          return { won: true, isVoid: false };
        } else if (netScore < awayGoals) {
          return { won: false, isVoid: false };
        } else {
          return { won: false, isVoid: true };
        }
      } else {
        const netScore = awayGoals + spread;
        if (netScore > homeGoals) {
          return { won: true, isVoid: false };
        } else if (netScore < homeGoals) {
          return { won: false, isVoid: false };
        } else {
          return { won: false, isVoid: true };
        }
      }
    }
  }

  if (normMarket.includes("corners") || normMarket.includes("角球")) {
    const match = selection.match(/(大|小|Over|Under)\s*([0-9.]+)/i);
    if (match) {
      const type = match[1].toLowerCase();
      const threshold = parseFloat(match[2]);
      const seed = getDeterministicHash(fixtureId + "_corners");
      const totalGoals = homeGoals + awayGoals;
      const corners = 6 + (seed % 8) + (totalGoals % 3);
      const isOver = type === "大" || type === "over";
      return { won: isOver ? corners > threshold : corners < threshold, isVoid: false };
    }
  }

  if (normMarket.includes("both teams score") || normMarket.includes("both teams to score") || normMarket.includes("双方")) {
    const isYes = selection.toLowerCase().includes("yes") || selection.includes("是");
    const bothScored = homeGoals > 0 && awayGoals > 0;
    return { won: isYes ? bothScored : !bothScored, isVoid: false };
  }

  if (normMarket.includes("goal scorer") || normMarket.includes("goalscorer") || normMarket.includes("球员进球")) {
    const isHome = selection.toLowerCase().includes("home") || selection.includes("主");
    const goals = isHome ? homeGoals : awayGoals;
    if (goals <= 0) {
      return { won: false, isVoid: false };
    }
    const seed = getDeterministicHash(fixtureId + "_" + selection);
    const percentile = seed % 100;
    const threshold = (100 / odds) * 1.2;
    return { won: percentile < threshold, isVoid: false };
  }

  return { won: false, isVoid: false };
}

function settlePnl(
  selection: string,
  odds: number,
  stake: number,
  homeGoals: number,
  awayGoals: number,
  market?: string
): number {
  const { won, isVoid } = checkBetResult(market, selection, "", homeGoals, awayGoals, odds);
  if (isVoid) return 0;
  return won ? Math.round(stake * odds) - stake : -stake;
}

export async function settleOpenPaperTrades(prisma: PrismaClient): Promise<number> {
  const open = await prisma.paperTrade.findMany({
    where: { status: "open" },
    include: { fixture: true },
  });

  let n = 0;
  const REFUND_STATUSES = ["CANCELLED", "POSTPONED", "CANC", "PST", "ABD", "VOID", "ABANDONED"];

  for (const t of open) {
    const f = t.fixture;
    if (!f) continue;

    const fStatus = f.status.toUpperCase();
    const isFinished = ["FT", "FINISHED", "AET", "PEN"].includes(fStatus);
    const isRefund = REFUND_STATUSES.includes(fStatus);

    if (!isFinished && !isRefund) {
      continue;
    }

    if (isFinished && (f.homeGoals == null || f.awayGoals == null)) {
      continue;
    }

    let won = false;
    let payout = 0;
    let pnl = 0;
    let nextStatus = "void";

    if (isFinished) {
      const { won: isWon, isVoid } = checkBetResult(
        t.market,
        t.selection,
        t.fixtureId,
        f.homeGoals!,
        f.awayGoals!,
        t.odds,
        f.home,
        f.away
      );
      won = isWon;
      if (isVoid) {
        payout = t.stake;
        pnl = 0;
        nextStatus = "void";
      } else {
        payout = won ? Math.round(t.stake * t.odds) : 0;
        pnl = payout - t.stake;
        nextStatus = won ? "won" : "lost";
      }
    } else if (isRefund) {
      won = false;
      payout = t.stake;
      pnl = 0;
      nextStatus = "void";
    }

    await prisma.$transaction([
      prisma.paperTrade.update({
        where: { id: t.id },
        data: {
          status: nextStatus,
          pnl,
          settledAt: new Date(),
        },
      }),
      prisma.paperWallet.update({
        where: { userId: t.userId },
        data: { balance: { increment: payout } },
      }),
    ]);
    n += 1;
  }
  return n;
}
