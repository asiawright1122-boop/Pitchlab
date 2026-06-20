"""Map Elo ratings to a score distribution for a single international match.

Simple, defensible mapping:
  - goal supremacy = (Elo_home + home_adv - Elo_away) / ELO_PER_GOAL
  - expected total goals ~ TOTAL_GOALS (slightly reduced for big mismatches)
  - lambda_home = (total + supremacy) / 2 ; lambda_away = (total - supremacy) / 2
Then build a Poisson score matrix and derive all markets via markets.derive.

This is a *simplification* (no per-team attack/defence like Dixon-Coles), which
is appropriate for the small-sample international setting.
"""

from __future__ import annotations

import math

import numpy as np

from ..markets.derive import prob_1x2, prob_over_under
from .elo import HOME_ADVANTAGE, EloRatings

ELO_PER_GOAL = 150.0   # ~150 Elo difference ≈ 1 goal of supremacy
TOTAL_GOALS = 2.6      # baseline expected total goals in an international match
MAX_GOALS = 10


def _poisson_matrix(lam_home: float, lam_away: float, max_goals: int = MAX_GOALS) -> np.ndarray:
    idx = np.arange(max_goals + 1)
    fact = np.array([math.factorial(k) for k in idx], dtype=float)
    ph = np.exp(-lam_home) * lam_home**idx / fact
    pa = np.exp(-lam_away) * lam_away**idx / fact
    m = np.outer(ph, pa)
    return m / m.sum()


def lambdas(
    elo: EloRatings, home: str, away: str, neutral: bool = True
) -> tuple[float, float]:
    home_adv = 0.0 if neutral else HOME_ADVANTAGE
    diff = (elo.get(home) + home_adv) - elo.get(away)
    supremacy = diff / ELO_PER_GOAL
    lam_home = max((TOTAL_GOALS + supremacy) / 2.0, 0.15)
    lam_away = max((TOTAL_GOALS - supremacy) / 2.0, 0.15)
    return lam_home, lam_away


def score_matrix(elo: EloRatings, home: str, away: str, neutral: bool = True) -> np.ndarray:
    lam_h, lam_a = lambdas(elo, home, away, neutral)
    return _poisson_matrix(lam_h, lam_a)


def match_probs(
    elo: EloRatings, home: str, away: str, neutral: bool = True
) -> dict[str, float]:
    """Return 1X2 + O/U 2.5 probabilities for a fixture."""
    m = score_matrix(elo, home, away, neutral)
    ph, pd, pa = prob_1x2(m)
    over, under = prob_over_under(m, 2.5)
    return {
        "home": ph,
        "draw": pd,
        "away": pa,
        "over25": over,
        "under25": under,
    }
