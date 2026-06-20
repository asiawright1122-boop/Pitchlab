"""ROI / yield for a flat-staked betting strategy (paper trading only)."""

from __future__ import annotations

from dataclasses import dataclass


@dataclass
class BetResult:
    odds: float       # decimal odds taken
    won: bool
    stake: float = 1.0


def roi(bets: list[BetResult]) -> float:
    """Return on turnover: total profit / total staked."""
    staked = sum(b.stake for b in bets)
    if staked == 0:
        return 0.0
    profit = 0.0
    for b in bets:
        if b.won:
            profit += b.stake * (b.odds - 1.0)
        else:
            profit -= b.stake
    return profit / staked
