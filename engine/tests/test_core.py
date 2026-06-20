"""Unit tests for the core math: market derivation, devig, CLV, Brier."""

from __future__ import annotations

import math

import numpy as np

from pitchlab.markets.derive import (
    prob_1x2,
    prob_asian_handicap,
    prob_btts,
    prob_over_under,
)
from pitchlab.metrics.brier import brier_multiclass
from pitchlab.metrics.clv import clv_from_odds
from pitchlab.metrics.roi import BetResult, roi
from pitchlab.odds.devig import devig_multiplicative, devig_power, overround


def _poisson_matrix(lam: float, mu: float, n: int = 11) -> np.ndarray:
    idx = np.arange(n)
    fact = np.array([math.factorial(k) for k in idx], dtype=float)
    ph = np.exp(-lam) * lam**idx / fact
    pa = np.exp(-mu) * mu**idx / fact
    m = np.outer(ph, pa)
    return m / m.sum()


def test_1x2_sums_to_one():
    m = _poisson_matrix(1.4, 1.1)
    h, d, a = prob_1x2(m)
    assert abs(h + d + a - 1.0) < 1e-9
    assert h > a  # higher home lambda -> home favoured


def test_over_under_sums_to_one():
    m = _poisson_matrix(1.5, 1.5)
    over, under = prob_over_under(m, 2.5)
    assert abs(over + under - 1.0) < 1e-9


def test_asian_handicap_symmetry():
    m = _poisson_matrix(1.3, 1.3)  # symmetric teams
    h, a = prob_asian_handicap(m, 0.0)
    assert abs(h - a) < 1e-6


def test_btts():
    m = _poisson_matrix(1.5, 1.5)
    yes, no = prob_btts(m)
    assert abs(yes + no - 1.0) < 1e-9
    assert 0 < yes < 1


def test_devig_multiplicative_sums_to_one():
    probs = devig_multiplicative([2.0, 3.5, 4.0])
    assert abs(sum(probs) - 1.0) < 1e-9


def test_devig_power_sums_to_one():
    probs = devig_power([2.0, 3.5, 4.0])
    assert abs(sum(probs) - 1.0) < 1e-6


def test_overround_positive():
    # 1.9/1.9 two-way book has a clear margin
    assert overround([1.9, 1.9]) > 0


def test_clv_sign():
    # took 2.10 (implied 0.476); fair closing 0.50 -> positive CLV
    assert clv_from_odds(2.10, 0.50) > 0
    # took 2.10; fair closing 0.40 -> negative CLV
    assert clv_from_odds(2.10, 0.40) < 0


def test_brier_perfect_is_zero():
    probs = [[1.0, 0.0, 0.0], [0.0, 1.0, 0.0]]
    outcomes = [0, 1]
    assert brier_multiclass(probs, outcomes) == 0.0


def test_roi_even_money():
    bets = [BetResult(odds=2.0, won=True), BetResult(odds=2.0, won=False)]
    assert abs(roi(bets) - 0.0) < 1e-9
