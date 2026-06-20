"""Tests for L5 value detection and L6 Kelly staking."""

from __future__ import annotations

from pitchlab.strategy.staking import kelly_fraction, kelly_stake
from pitchlab.strategy.value import expected_value, find_value


def test_expected_value_sign():
    # fair coin at 2.10 -> +EV
    assert expected_value(0.5, 2.10) > 0
    # fair coin at 1.90 -> -EV
    assert expected_value(0.5, 1.90) < 0


def test_find_value_flags_overlay():
    # model thinks home 55%, market prices imply ~48% (odds 2.10) -> value
    selections = ["H", "D", "A"]
    model = [0.55, 0.25, 0.20]
    odds = [2.10, 3.50, 4.50]
    vbs = find_value(selections, model, odds, min_edge=0.0)
    assert any(v.selection == "H" and v.is_value for v in vbs)
    # all returned edges are positive
    assert all(v.edge > 0 for v in vbs)


def test_find_value_none_when_market_sharp():
    # model equals implied probs -> no edge
    selections = ["H", "A"]
    model = [1 / 1.95, 1 / 1.95]
    odds = [1.95, 1.95]
    vbs = find_value(selections, model, odds, min_edge=0.01)
    assert vbs == []


def test_kelly_fraction_positive_only():
    # +EV bet -> positive fraction
    assert kelly_fraction(0.6, 2.0) > 0
    # -EV bet -> zero (never bet)
    assert kelly_fraction(0.4, 2.0) == 0.0


def test_kelly_fraction_value():
    # p=0.6, odds=2.0 -> f* = (0.6*2 - 1)/(2-1) = 0.2
    assert abs(kelly_fraction(0.6, 2.0, fraction=1.0) - 0.2) < 1e-9
    # quarter kelly
    assert abs(kelly_fraction(0.6, 2.0, fraction=0.25) - 0.05) < 1e-9


def test_kelly_stake_currency():
    assert abs(kelly_stake(1000, 0.6, 2.0, fraction=1.0) - 200.0) < 1e-6
