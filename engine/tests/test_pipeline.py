"""End-to-end smoke test: fit Dixon-Coles on mock data and run a backtest."""

from __future__ import annotations

from pitchlab.backtest.harness import BacktestConfig, run_backtest
from pitchlab.data import mock
from pitchlab.models.dixon_coles import fit_dixon_coles


def test_fit_and_predict():
    matches = mock.generate_matches(n_teams=10, n_seasons=2, seed=1)
    model = fit_dixon_coles(matches)
    m = model.score_matrix(matches[-1].home, matches[-1].away)
    assert abs(m.sum() - 1.0) < 1e-6
    assert model.home_adv > 0  # mock has home advantage built in


def test_backtest_runs():
    matches = mock.generate_matches(n_teams=12, n_seasons=2, seed=2)
    report = run_backtest(matches, BacktestConfig(min_train=120, refit_every=40))
    assert report.n_predicted > 0
    # Brier should be informative (well below the uninformative ~0.667)
    assert report.brier < 0.67


def test_backtest_with_calibration_runs():
    matches = mock.generate_matches(n_teams=12, n_seasons=3, seed=3)
    report = run_backtest(
        matches,
        BacktestConfig(min_train=120, refit_every=40, calibrate=True, calib_min=100),
    )
    assert report.n_predicted > 0
    cal = report.calibration()
    assert cal["ece"] >= 0.0
    assert len(cal["bins"]) > 0
