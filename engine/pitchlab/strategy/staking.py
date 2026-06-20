"""L6 — staking: Kelly criterion for bet sizing (suggestion only).

Kelly fraction for a simple win/lose bet at decimal odds:
    f* = (p * (b) - (1 - p)) / b ,  where b = odds - 1
       = (p * odds - 1) / (odds - 1)

We clip negatives to 0 (never bet -EV) and support fractional Kelly (e.g. 0.25)
to reduce variance — standard practice since full Kelly is very aggressive and
sensitive to probability mis-estimation.
"""

from __future__ import annotations


def kelly_fraction(prob: float, decimal_odds: float, fraction: float = 1.0) -> float:
    """Return the (fractional) Kelly stake as a fraction of bankroll, clipped >=0."""
    b = decimal_odds - 1.0
    if b <= 0:
        return 0.0
    f_star = (prob * decimal_odds - 1.0) / b
    if f_star <= 0:
        return 0.0
    return min(f_star * fraction, 1.0)


def kelly_stake(bankroll: float, prob: float, decimal_odds: float, fraction: float = 0.25) -> float:
    """Suggested stake in currency units (default quarter-Kelly)."""
    return bankroll * kelly_fraction(prob, decimal_odds, fraction)
