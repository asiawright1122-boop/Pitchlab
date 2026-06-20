"""Derive all market probabilities from one score matrix.

The whole point of the score-distribution engine: 1X2, Over/Under, Asian
Handicap, BTTS, correct score all come from the *same* matrix P[i, j].
"""

from __future__ import annotations

import numpy as np


def prob_1x2(matrix: np.ndarray) -> tuple[float, float, float]:
    """Return (home, draw, away) probabilities."""
    home = float(np.tril(matrix, -1).sum())  # i > j
    away = float(np.triu(matrix, 1).sum())   # i < j
    draw = float(np.trace(matrix))
    total = home + draw + away
    return home / total, draw / total, away / total


def prob_over_under(matrix: np.ndarray, line: float = 2.5) -> tuple[float, float]:
    """Return (over, under) probabilities for a goals line (no pushes at .5)."""
    n = matrix.shape[0]
    i, j = np.indices((n, n))
    totals = i + j
    over = float(matrix[totals > line].sum())
    under = float(matrix[totals < line].sum())
    s = over + under
    return over / s, under / s


def prob_asian_handicap(matrix: np.ndarray, line: float) -> tuple[float, float]:
    """Return (home, away) win probabilities for an Asian handicap on the home team.

    ``line`` is the handicap applied to the home team (e.g. -0.5 means home must
    win). Only quarter/half lines (no push) are supported here for simplicity.
    """
    n = matrix.shape[0]
    i, j = np.indices((n, n))
    margin = (i - j) + line  # home goal margin after handicap
    home = float(matrix[margin > 0].sum())
    away = float(matrix[margin < 0].sum())
    s = home + away
    if s == 0:
        return 0.5, 0.5
    return home / s, away / s


def prob_btts(matrix: np.ndarray) -> tuple[float, float]:
    """Both teams to score: (yes, no)."""
    yes = float(matrix[1:, 1:].sum())
    return yes, 1.0 - yes


def fair_odds(prob: float) -> float:
    """Decimal fair odds for a probability."""
    return float("inf") if prob <= 0 else 1.0 / prob
