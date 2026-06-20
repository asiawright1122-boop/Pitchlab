import type { FixtureRecord } from "@/lib/types";
import { MAX_STAKE_PER_BET, MIN_STAKE } from "@/lib/paper";

export const PAPER_DEFAULT_STAKE = 50;
export const KELLY_FRACTION = 0.25;
export const FALLBACK_KICKOFF_UTC = "2026-06-15T12:00:00.000Z";

/** Fractional Kelly stake as a fraction of bankroll (matches engine L6). */
export function kellyFraction(
  prob: number,
  decimalOdds: number,
  fraction = KELLY_FRACTION
): number {
  const b = decimalOdds - 1;
  if (b <= 0) return 0;
  const fStar = (prob * decimalOdds - 1) / b;
  if (fStar <= 0) return 0;
  return Math.min(fStar * fraction, 1);
}

export function kellyStakeUnits(
  bankroll: number,
  prob: number,
  decimalOdds: number,
  fraction = KELLY_FRACTION
): number {
  return bankroll * kellyFraction(prob, decimalOdds, fraction);
}

/** Max allowed paper stake: quarter-Kelly cap, min/default floor, hard ceiling. */
export function maxPaperStake(
  bankroll: number,
  prob: number,
  decimalOdds: number
): number {
  const kelly = Math.floor(kellyStakeUnits(bankroll, prob, decimalOdds));
  const suggested = kelly > 0 ? kelly : PAPER_DEFAULT_STAKE;
  return Math.max(
    MIN_STAKE,
    Math.min(MAX_STAKE_PER_BET, suggested, Math.floor(bankroll))
  );
}

export function resolveKickoffUtc(kickoff?: string | null): string {
  if (kickoff) {
    const d = new Date(kickoff);
    if (!Number.isNaN(d.getTime())) return d.toISOString();
  }
  return FALLBACK_KICKOFF_UTC;
}

/** Fair decimal odds from model probability (research sandbox, not market prices). */
export function impliedFairOdds(prob: number | null | undefined): number | null {
  if (prob == null || prob <= 0) return null;
  const p = Math.max(prob, 0.02);
  return Math.min(100, 1 / p);
}

export type PaperTradeBody = {
  fixture_id: string;
  league: string;
  home: string;
  away: string;
  kickoff_utc: string;
  selection: "H" | "D" | "A";
  odds: number;
  stake: number;
  model_prob?: number;
};

export function selectionProb(
  row: FixtureRecord,
  selection: "H" | "D" | "A"
): number | null {
  const p =
    selection === "H" ? row.home_prob : selection === "D" ? row.draw_prob : row.away_prob;
  return p != null && p > 0 ? p : null;
}

export function buildPaperTradeFromFixture(
  row: FixtureRecord,
  selection: "H" | "D" | "A",
  bankroll?: number
): PaperTradeBody | null {
  const prob = selectionProb(row, selection);
  const odds = impliedFairOdds(prob);
  if (!prob || !odds) return null;
  const stake =
    bankroll != null ? maxPaperStake(bankroll, prob, odds) : PAPER_DEFAULT_STAKE;
  return {
    fixture_id: row.id,
    league: row.league,
    home: row.home,
    away: row.away,
    kickoff_utc: resolveKickoffUtc(row.kickoff_utc),
    selection,
    odds,
    stake,
    model_prob: prob,
  };
}

export async function postPaperTrade(
  body: PaperTradeBody
): Promise<{ balance?: number; error?: string }> {
  const res = await fetch("/api/paper/trades", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = (await res.json()) as { balance?: number; error?: string };
  if (!res.ok) return { error: data.error ?? "failed" };
  return { balance: data.balance };
}
