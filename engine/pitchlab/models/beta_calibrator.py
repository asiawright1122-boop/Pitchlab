from __future__ import annotations

import numpy as np


class BetaCalibrator:
    """Beta probability calibrator for binary outcomes.

    Fits a logistic regression map on log-transformed probabilities:
        logit(p_calibrated) = a * ln(p) + b * ln(1 - p) + c
    For stability, we clip input probabilities to [1e-5, 1 - 1e-5].
    """

    def __init__(self) -> None:
        self.clf = None

    def fit(self, probs: list[float], outcomes: list[int]) -> BetaCalibrator:
        try:
            from sklearn.linear_model import LogisticRegression
        except ImportError:
            return self

        x = np.asarray(probs, dtype=float)
        y = np.asarray(outcomes, dtype=int)

        # Clip and log-transform
        x = np.clip(x, 1e-5, 1.0 - 1e-5)
        log_p = np.log(x)
        log_1_p = np.log(1.0 - x)

        features = np.column_stack((log_p, log_1_p))

        # We fit a simple logistic regression mapping
        self.clf = LogisticRegression(max_iter=500, solver="lbfgs")
        self.clf.fit(features, y)
        return self

    def predict_one(self, p: float) -> float:
        if self.clf is None:
            return p

        p_clipped = min(max(p, 1e-5), 1.0 - 1e-5)
        features = np.array([[np.log(p_clipped), np.log(1.0 - p_clipped)]])

        try:
            class_idx = list(self.clf.classes_).index(1)
            return float(self.clf.predict_proba(features)[0, class_idx])
        except (ValueError, IndexError):
            # Fallback to class 1 index mapping or original value
            return p

    def predict(self, probs: list[float]) -> list[float]:
        return [self.predict_one(p) for p in probs]
