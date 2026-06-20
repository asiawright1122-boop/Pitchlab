"""Brier score for probability calibration.

For multi-class (1X2) we use the multi-category Brier score:
    BS = mean( sum_k (p_k - o_k)^2 )
where o_k is 1 for the realized outcome, else 0. Lower is better; a perfectly
calibrated-and-sharp model approaches 0, uninformative ~0.67 for 3 equal classes.
"""

from __future__ import annotations


def brier_multiclass(probs: list[list[float]], outcomes: list[int]) -> float:
    """probs: list of probability vectors. outcomes: index of realized class."""
    if not probs:
        return float("nan")
    total = 0.0
    for p, o in zip(probs, outcomes):
        for k, pk in enumerate(p):
            target = 1.0 if k == o else 0.0
            total += (pk - target) ** 2
    return total / len(probs)


def brier_binary(probs: list[float], outcomes: list[int]) -> float:
    """Binary Brier: mean((p - o)^2), o in {0,1}."""
    if not probs:
        return float("nan")
    return sum((p - o) ** 2 for p, o in zip(probs, outcomes)) / len(probs)
