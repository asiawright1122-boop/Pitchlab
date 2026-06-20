"""Tests for BetaCalibrator and Dixon-Coles xi grid search."""

from __future__ import annotations

from datetime import datetime, timedelta
import numpy as np

from pitchlab.data.schema import Match
from pitchlab.models.beta_calibrator import BetaCalibrator
from pitchlab.models.dixon_coles import fit_dixon_coles
from pitchlab.metrics.calibration import expected_calibration_error


def test_beta_calibrator_reduces_ece():
    # Construct a miscalibrated set of probabilities
    rng = np.random.default_rng(42)
    true_p = rng.uniform(0.05, 0.95, 2000)
    # Overconfident model: reported = p**0.5 (shifts probabilities higher)
    reported = np.power(true_p, 0.5)
    hits = [int(rng.random() < tp) for tp in true_p]

    ece_before = expected_calibration_error(list(reported), hits)

    # Split for out-of-sample evaluation
    mid = len(reported) // 2
    cal = BetaCalibrator().fit(list(reported[:mid]), hits[:mid])
    adjusted = cal.predict(list(reported[mid:]))

    ece_after = expected_calibration_error(adjusted, hits[mid:])

    # ECE should decrease after Beta calibration
    assert ece_after < ece_before
    # Values should be valid probabilities
    for val in adjusted:
        assert 0.0 <= val <= 1.0


def test_beta_calibrator_no_sklearn(monkeypatch):
    # If sklearn is missing, fit should return self and predict should return original probs
    import sys
    # Simulate sklearn not being installed
    monkeypatch.setitem(sys.modules, 'sklearn', None)
    monkeypatch.setitem(sys.modules, 'sklearn.linear_model', None)

    cal = BetaCalibrator()
    res = cal.fit([0.1, 0.2], [0, 1])
    assert res is cal
    assert cal.predict_one(0.5) == 0.5
    assert cal.predict([0.3, 0.7]) == [0.3, 0.7]


def test_dixon_coles_xi_grid_search():
    # Generate mock matches to run Dixon-Coles xi grid search
    base_date = datetime(2026, 1, 1)
    matches = []
    
    # We need enough matches to trigger grid search: val_size is min(30, max(5, n_played // 5))
    # If we have 100 matches, val_size is 20. train_matches is 80.
    # Total matches: 100
    for i in range(100):
        # alternate wins/draws to make it a bit random but fitable
        home_g = 2 if i % 3 == 0 else (1 if i % 3 == 1 else 0)
        away_g = 0 if i % 3 == 0 else (1 if i % 3 == 1 else 2)
        matches.append(
            Match(
                league="E0",
                date=base_date + timedelta(days=i),
                home="TeamA" if i % 2 == 0 else "TeamB",
                away="TeamB" if i % 2 == 0 else "TeamA",
                home_goals=home_g,
                away_goals=away_g,
            )
        )

    # 1. Test specifying list of candidates
    model = fit_dixon_coles(matches, xi=[0.0010, 0.0020])
    assert model is not None
    assert len(model.teams) == 2

    # 2. Test xi=None (runs full grid search candidates)
    model_opt = fit_dixon_coles(matches, xi=None)
    assert model_opt is not None
    assert len(model_opt.teams) == 2
