"""De-vig: strip the bookmaker margin to recover implied "true" probabilities.

The closing line at a sharp book (Pinnacle), de-vigged, is the best available
estimate of true probability and the benchmark for CLV.
"""

from __future__ import annotations


def implied_probs(odds: list[float]) -> list[float]:
    """Raw implied probabilities (sum > 1 by the margin)."""
    return [1.0 / o for o in odds]


def overround(odds: list[float]) -> float:
    """Bookmaker margin: sum(1/odds) - 1."""
    return sum(1.0 / o for o in odds) - 1.0


def devig_multiplicative(odds: list[float]) -> list[float]:
    """Proportional (multiplicative) de-vig: normalize implied probs to sum 1."""
    inv = [1.0 / o for o in odds]
    total = sum(inv)
    return [p / total for p in inv]


def devig_power(odds: list[float], tol: float = 1e-9, max_iter: int = 100) -> list[float]:
    """Power de-vig: find k such that sum(p_i**k) = 1, p_i = (1/odds_i).

    Better than multiplicative for the favourite-longshot bias. Solved by
    bisection on the exponent k.
    """
    inv = [1.0 / o for o in odds]
    lo, hi = 0.5, 2.0

    def s(k: float) -> float:
        return sum(p**k for p in inv)

    # ensure bracket
    if s(lo) < 1.0:
        lo = 0.01
    if s(hi) > 1.0:
        hi = 5.0
    for _ in range(max_iter):
        mid = (lo + hi) / 2
        val = s(mid)
        if abs(val - 1.0) < tol:
            break
        if val > 1.0:
            lo = mid
        else:
            hi = mid
    k = (lo + hi) / 2
    return [p**k for p in inv]


def fair_prob_for_selection(
    odds: list[float], index: int, method: str = "power"
) -> float:
    """De-vig a market and return the fair probability of one selection."""
    if method == "multiplicative":
        probs = devig_multiplicative(odds)
    else:
        probs = devig_power(odds)
    return probs[index]
