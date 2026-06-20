"""Closing Line Value — the single most reliable predictor of long-run edge.

CLV measures whether the price you took beat the (de-vigged) closing line at a
sharp book. Positive average CLV across enough bets => genuine edge, even before
P&L converges.
"""

from __future__ import annotations


def clv_from_odds(taken_odds: float, closing_fair_prob: float) -> float:
    """CLV as a fraction.

    taken_odds: decimal odds you got.
    closing_fair_prob: de-vigged closing probability (sharp benchmark).

    Your implied prob = 1/taken_odds. CLV% = (closing_fair - your_implied)/your_implied
    Equivalently: taken_odds * closing_fair_prob - 1.
    """
    your_implied = 1.0 / taken_odds
    if your_implied <= 0:
        return 0.0
    return (closing_fair_prob - your_implied) / your_implied


def clv_odds_ratio(taken_odds: float, closing_fair_odds: float) -> float:
    """CLV expressed via odds: taken / fair_closing - 1."""
    if closing_fair_odds <= 0:
        return 0.0
    return taken_odds / closing_fair_odds - 1.0
