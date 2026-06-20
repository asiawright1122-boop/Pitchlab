"""Isotonic probability calibrator via Pool Adjacent Violators (PAVA).

Implemented from first principles (no scikit-learn dependency): fit a monotone
non-decreasing mapping from raw predicted probability to calibrated probability
by isotonic regression on (prob, outcome) pairs, then apply via interpolation.

Use: fit on a held-out calibration window, apply to future predictions. Keeps
the deterministic, inspectable spirit of the engine.
"""

from __future__ import annotations

import numpy as np


def _pava(y: np.ndarray, w: np.ndarray) -> np.ndarray:
    """Pool Adjacent Violators: monotone non-decreasing least-squares fit."""
    y = y.astype(float).copy()
    w = w.astype(float).copy()
    n = len(y)
    # blocks: value, weight, count
    vals = list(y)
    wts = list(w)
    idx = list(range(n))  # block -> number of original points
    counts = [1] * n
    i = 0
    while i < len(vals) - 1:
        if vals[i] > vals[i + 1] + 1e-15:
            # pool i and i+1
            new_w = wts[i] + wts[i + 1]
            new_v = (vals[i] * wts[i] + vals[i + 1] * wts[i + 1]) / new_w
            vals[i] = new_v
            wts[i] = new_w
            counts[i] += counts[i + 1]
            del vals[i + 1]
            del wts[i + 1]
            del counts[i + 1]
            if i > 0:
                i -= 1
        else:
            i += 1
    # expand blocks back to per-point fitted values
    out = np.empty(n)
    pos = 0
    for v, c in zip(vals, counts):
        out[pos : pos + c] = v
        pos += c
    return out


class IsotonicCalibrator:
    """Monotone calibration map fitted by isotonic regression."""

    def __init__(self) -> None:
        self._x: np.ndarray | None = None  # sorted unique predicted probs
        self._y: np.ndarray | None = None  # calibrated values

    def fit(self, probs: list[float], outcomes: list[int]) -> "IsotonicCalibrator":
        x = np.asarray(probs, dtype=float)
        y = np.asarray(outcomes, dtype=float)
        order = np.argsort(x, kind="mergesort")
        xs = x[order]
        ys = y[order]
        w = np.ones_like(ys)
        fitted = _pava(ys, w)
        # collapse duplicate x to keep interpolation well-defined
        self._x = xs
        self._y = np.clip(fitted, 0.0, 1.0)
        return self

    def predict_one(self, p: float) -> float:
        if self._x is None or self._y is None or len(self._x) == 0:
            return p
        return float(np.interp(p, self._x, self._y))

    def predict(self, probs: list[float]) -> list[float]:
        return [self.predict_one(p) for p in probs]
