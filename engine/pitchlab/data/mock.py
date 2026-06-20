"""Synthetic data generator so the backtest runs fully offline.

We simulate a league of teams with latent attack/defence strengths, draw goals
from a bivariate-Poisson-ish process, then build *imperfect* bookmaker odds by
distorting the true probabilities with a margin plus noise. This lets us
sanity-check the whole pipeline (and confirm CLV ~ 0 against an efficient market
by construction, unless the model genuinely recovers the latent strengths).
"""

from __future__ import annotations

import math
from datetime import datetime, timedelta

import numpy as np

from .schema import Match


def _poisson_matrix(lam_home: float, lam_away: float, max_goals: int = 10) -> np.ndarray:
    i = np.arange(max_goals + 1)
    ph = np.exp(-lam_home) * lam_home**i / np.array([math.factorial(k) for k in i])
    pa = np.exp(-lam_away) * lam_away**i / np.array([math.factorial(k) for k in i])
    return np.outer(ph, pa)


def _fair_1x2(matrix: np.ndarray) -> tuple[float, float, float]:
    n = matrix.shape[0]
    home = float(np.tril(matrix, -1).sum())  # i > j
    away = float(np.triu(matrix, 1).sum())   # i < j
    draw = float(np.trace(matrix))
    total = home + draw + away
    return home / total, draw / total, away / total


def _apply_margin(probs: tuple[float, ...], margin: float, rng: np.random.Generator) -> list[float]:
    """Turn fair probabilities into decimal odds with a bookmaker margin + noise."""
    noisy = np.array(probs) * (1.0 + rng.normal(0, 0.03, size=len(probs)))
    noisy = np.clip(noisy, 1e-3, None)
    noisy = noisy / noisy.sum()
    implied = noisy * (1.0 + margin)
    return [float(1.0 / p) for p in implied]


def generate_matches(
    n_teams: int = 16,
    n_seasons: int = 3,
    seed: int = 42,
    league: str = "MOCK",
) -> list[Match]:
    rng = np.random.default_rng(seed)
    teams = [f"Team {chr(65 + k)}" for k in range(n_teams)]
    attack = {t: rng.normal(0.0, 0.30) for t in teams}
    defence = {t: rng.normal(0.0, 0.30) for t in teams}
    base = 0.15           # global scoring intercept (log)
    home_adv = 0.25       # home advantage (log)

    matches: list[Match] = []
    start = datetime(2021, 8, 1)
    day = 0
    for _season in range(n_seasons):
        # double round-robin
        for h in teams:
            for a in teams:
                if h == a:
                    continue
                day += 1
                date = start + timedelta(days=day // 6)  # ~6 matches/day
                lam_h = math.exp(base + home_adv + attack[h] - defence[a])
                lam_a = math.exp(base + attack[a] - defence[h])

                matrix = _poisson_matrix(lam_h, lam_a)
                hg = int(rng.poisson(lam_h))
                ag = int(rng.poisson(lam_a))

                ph, pd, pa = _fair_1x2(matrix)
                # closing odds: tighter margin (sharp); open odds: looser + more noise
                ch, cd, ca = _apply_margin((ph, pd, pa), margin=0.02, rng=rng)
                oh, od, oa = _apply_margin((ph, pd, pa), margin=0.06, rng=rng)

                over = float(np.triu(matrix, -10)[
                    np.add.outer(np.arange(matrix.shape[0]), np.arange(matrix.shape[1])) >= 3
                ].sum())
                over = over / matrix.sum()
                co, cu = _apply_margin((over, 1 - over), margin=0.03, rng=rng)

                matches.append(
                    Match(
                        league=league,
                        date=date,
                        home=h,
                        away=a,
                        home_goals=hg,
                        away_goals=ag,
                        close_home=ch,
                        close_draw=cd,
                        close_away=ca,
                        open_home=oh,
                        open_draw=od,
                        open_away=oa,
                        close_over25=co,
                        close_under25=cu,
                    )
                )
        start = date + timedelta(days=30)
    matches.sort(key=lambda m: m.date)
    return matches
