"""Tests for calibration metrics and the isotonic calibrator."""

from __future__ import annotations

import numpy as np

from pitchlab.metrics.calibration import (
    expected_calibration_error,
    log_loss_multiclass,
    reliability_curve,
)
from pitchlab.models.calibration import IsotonicCalibrator


def test_perfectly_calibrated_low_ece():
    # outcomes drawn with the predicted probability -> ECE should be small
    rng = np.random.default_rng(0)
    probs = list(rng.uniform(0, 1, 4000))
    hits = [int(rng.random() < p) for p in probs]
    ece = expected_calibration_error(probs, hits, n_bins=10)
    assert ece < 0.05


def test_reliability_curve_monotone_ish():
    rng = np.random.default_rng(1)
    probs = list(rng.uniform(0, 1, 3000))
    hits = [int(rng.random() < p) for p in probs]
    curve = reliability_curve(probs, hits, n_bins=10)
    assert len(curve) > 3
    # higher predicted prob bins should have higher empirical freq on average
    assert curve[0].freq < curve[-1].freq


def test_log_loss_better_for_confident_correct():
    confident = [[0.9, 0.05, 0.05]]
    unsure = [[0.34, 0.33, 0.33]]
    assert log_loss_multiclass(confident, [0]) < log_loss_multiclass(unsure, [0])


def test_isotonic_reduces_ece_on_miscalibrated():
    # overconfident model: true prob = p, but model reports p**0.5 (too high)
    rng = np.random.default_rng(2)
    true_p = rng.uniform(0, 1, 5000)
    reported = np.sqrt(true_p)  # miscalibrated (overconfident on low end)
    hits = [int(rng.random() < tp) for tp in true_p]

    ece_before = expected_calibration_error(list(reported), hits)

    # fit isotonic on first half, evaluate on second half (out-of-sample)
    mid = len(reported) // 2
    cal = IsotonicCalibrator().fit(list(reported[:mid]), hits[:mid])
    adj = cal.predict(list(reported[mid:]))
    ece_after = expected_calibration_error(adj, hits[mid:])

    assert ece_after < ece_before


def test_isotonic_monotone():
    cal = IsotonicCalibrator().fit([0.1, 0.2, 0.3, 0.8, 0.9], [0, 0, 1, 1, 1])
    out = cal.predict([0.05, 0.25, 0.85])
    assert out[0] <= out[1] <= out[2]
