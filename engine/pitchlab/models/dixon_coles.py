"""Dixon-Coles bivariate-Poisson model for football score distributions.

Reference: Dixon & Coles (1997), "Modelling Association Football Scores and
Inefficiencies in the Football Betting Market".

The model estimates per-team attack and defence strengths plus a home
advantage, with a low-score dependence correction (rho) and exponential time
decay (xi) weighting recent matches more heavily. From the fitted score matrix
we can derive *all* markets (1X2, O/U, AH).

This is the deterministic, calibratable, backtestable probability engine that
the whole product hinges on.
"""

from __future__ import annotations

import math
from dataclasses import dataclass

import numpy as np
from scipy.optimize import minimize

from ..data.schema import Match

MAX_GOALS = 10


def _tau(home_goals: int, away_goals: int, lam: float, mu: float, rho: float) -> float:
    """Dixon-Coles low-score dependence adjustment."""
    if home_goals == 0 and away_goals == 0:
        return 1.0 - lam * mu * rho
    if home_goals == 0 and away_goals == 1:
        return 1.0 + lam * rho
    if home_goals == 1 and away_goals == 0:
        return 1.0 + mu * rho
    if home_goals == 1 and away_goals == 1:
        return 1.0 - rho
    return 1.0


@dataclass
class DixonColesModel:
    teams: list[str]
    attack: dict[str, float]
    defence: dict[str, float]
    home_adv: float
    intercept: float
    rho: float

    def _lambdas(self, home: str, away: str) -> tuple[float, float]:
        lam = math.exp(
            self.intercept + self.home_adv + self.attack[home] - self.defence[away]
        )
        mu = math.exp(self.intercept + self.attack[away] - self.defence[home])
        return lam, mu

    def score_matrix(self, home: str, away: str, max_goals: int = MAX_GOALS) -> np.ndarray:
        """Joint probability matrix P[i, j] of home i goals, away j goals."""
        if home not in self.attack or away not in self.attack:
            raise KeyError(f"Unknown team: {home!r} or {away!r}")
        lam, mu = self._lambdas(home, away)
        idx = np.arange(max_goals + 1)
        fact = np.array([math.factorial(k) for k in idx], dtype=float)
        ph = np.exp(-lam) * lam**idx / fact
        pa = np.exp(-mu) * mu**idx / fact
        matrix = np.outer(ph, pa)
        # apply DC correction to the four low-score cells
        for i in (0, 1):
            for j in (0, 1):
                matrix[i, j] *= _tau(i, j, lam, mu, self.rho)
        matrix /= matrix.sum()
        return matrix


def _fit_dixon_coles_single(
    matches: list[Match],
    ref_date=None,
    xi: float = 0.0018,
    max_goals: int = MAX_GOALS,
) -> DixonColesModel:
    played = [m for m in matches if m.played]
    if not played:
        raise ValueError("No played matches to fit on.")

    teams = sorted({m.home for m in played} | {m.away for m in played})
    t_index = {t: k for k, t in enumerate(teams)}
    n = len(teams)

    ref = ref_date or max(m.date for m in played)
    weights = np.array(
        [math.exp(-xi * max((ref - m.date).days, 0)) for m in played]
    )

    home_idx = np.array([t_index[m.home] for m in played])
    away_idx = np.array([t_index[m.away] for m in played])
    hg = np.array([m.home_goals for m in played], dtype=float)
    ag = np.array([m.away_goals for m in played], dtype=float)

    # params: [attack(n), defence(n), home_adv, intercept, rho]
    # identifiability: mean(attack) = 0 enforced via soft penalty
    def unpack(p):
        atk = p[:n]
        dfc = p[n : 2 * n]
        home_adv = p[2 * n]
        intercept = p[2 * n + 1]
        rho = p[2 * n + 2]
        return atk, dfc, home_adv, intercept, rho

    def neg_log_likelihood(p):
        atk, dfc, home_adv, intercept, rho = unpack(p)
        lam = np.exp(intercept + home_adv + atk[home_idx] - dfc[away_idx])
        mu = np.exp(intercept + atk[away_idx] - dfc[home_idx])
        lam = np.clip(lam, 1e-8, 50)
        mu = np.clip(mu, 1e-8, 50)

        ll = -lam - mu + hg * np.log(lam) + ag * np.log(mu)
        # DC tau correction (vectorized over the 4 low-score cells)
        tau = np.ones_like(lam)
        m00 = (hg == 0) & (ag == 0)
        m01 = (hg == 0) & (ag == 1)
        m10 = (hg == 1) & (ag == 0)
        m11 = (hg == 1) & (ag == 1)
        tau[m00] = 1.0 - lam[m00] * mu[m00] * rho
        tau[m01] = 1.0 + lam[m01] * rho
        tau[m10] = 1.0 + mu[m10] * rho
        tau[m11] = 1.0 - rho
        tau = np.clip(tau, 1e-8, None)
        ll = ll + np.log(tau)

        wll = float(np.sum(weights * ll))
        penalty = 1000.0 * (atk.mean() ** 2)  # anchor mean attack to 0
        return -wll + penalty

    x0 = np.concatenate(
        [np.zeros(n), np.zeros(n), np.array([0.25]), np.array([0.0]), np.array([-0.05])]
    )
    bounds = (
        [(-3, 3)] * n + [(-3, 3)] * n + [(-1, 1), (-2, 2), (-0.2, 0.2)]
    )
    res = minimize(neg_log_likelihood, x0, method="L-BFGS-B", bounds=bounds)
    atk, dfc, home_adv, intercept, rho = unpack(res.x)

    return DixonColesModel(
        teams=teams,
        attack={t: float(atk[t_index[t]]) for t in teams},
        defence={t: float(dfc[t_index[t]]) for t in teams},
        home_adv=float(home_adv),
        intercept=float(intercept),
        rho=float(rho),
    )


def fit_dixon_coles(
    matches: list[Match],
    ref_date=None,
    xi: float | list[float] | None = 0.0018,
    max_goals: int = MAX_GOALS,
) -> DixonColesModel:
    """Fit a Dixon-Coles model via weighted maximum likelihood, optionally optimizing xi."""
    played = [m for m in matches if m.played]
    if not played:
        raise ValueError("No played matches to fit on.")

    if xi is None or isinstance(xi, (list, tuple)):
        candidates = xi if isinstance(xi, (list, tuple)) else [
            0.0005, 0.0010, 0.0015, 0.0018, 0.0020, 0.0025, 0.0030, 0.0035, 0.0040, 0.0045, 0.0050
        ]
        n_played = len(played)
        val_size = min(30, max(5, n_played // 5))
        if n_played - val_size >= 20:
            train_matches = played[:-val_size]
            val_matches = played[-val_size:]
            
            from ..markets.derive import prob_1x2
            from ..metrics.brier import brier_multiclass
            _OUTCOME_IDX = {"H": 0, "D": 1, "A": 2}
            
            best_xi = 0.0018
            best_brier = 999.0
            
            for candidate in candidates:
                try:
                    m_fit = _fit_dixon_coles_single(
                        train_matches,
                        ref_date=val_matches[0].date,
                        xi=candidate,
                        max_goals=max_goals
                    )
                    val_probs = []
                    val_outcomes = []
                    for vm in val_matches:
                        if vm.home not in m_fit.attack or vm.away not in m_fit.attack:
                            continue
                        mat = m_fit.score_matrix(vm.home, vm.away)
                        ph, pd, pa = prob_1x2(mat)
                        val_probs.append([ph, pd, pa])
                        val_outcomes.append(_OUTCOME_IDX[vm.result_1x2])
                    
                    if val_outcomes:
                        b = brier_multiclass(val_probs, val_outcomes)
                        if b < best_brier:
                            best_brier = b
                            best_xi = candidate
                except Exception:
                    continue
            
            print(f"[dixon-coles] Optimal time-decay xi selected via grid search: {best_xi} (Brier: {best_brier:.4f})")
            xi_val = best_xi
        else:
            xi_val = 0.0018
    else:
        xi_val = xi

    return _fit_dixon_coles_single(played, ref_date=ref_date, xi=xi_val, max_goals=max_goals)
