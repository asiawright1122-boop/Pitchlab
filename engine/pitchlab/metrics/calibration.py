"""Calibration diagnostics — measure before you optimize.

A probability is *calibrated* if, among all events we assign p≈0.6, about 60%
actually happen. We assess this with a reliability curve, the Expected
Calibration Error (ECE) and multiclass log-loss. These are the bedrock: CLV,
value detection and Kelly all assume calibrated probabilities.
"""

from __future__ import annotations

import math
from dataclasses import dataclass


@dataclass
class ReliabilityBin:
    p_mean: float    # mean predicted probability in the bin
    freq: float      # empirical frequency of the event
    count: int


def reliability_curve(
    probs: list[float], hits: list[int], n_bins: int = 10
) -> list[ReliabilityBin]:
    """Bin (predicted prob, binary outcome) pairs into a reliability curve."""
    bins: list[list[tuple[float, int]]] = [[] for _ in range(n_bins)]
    for p, h in zip(probs, hits):
        idx = min(int(p * n_bins), n_bins - 1)
        bins[idx].append((p, h))
    out: list[ReliabilityBin] = []
    for b in bins:
        if not b:
            continue
        ps = [p for p, _ in b]
        hs = [h for _, h in b]
        out.append(
            ReliabilityBin(
                p_mean=sum(ps) / len(ps),
                freq=sum(hs) / len(hs),
                count=len(b),
            )
        )
    return out


def expected_calibration_error(probs: list[float], hits: list[int], n_bins: int = 10) -> float:
    """ECE: sample-weighted mean gap between predicted prob and empirical freq."""
    if not probs:
        return float("nan")
    n = len(probs)
    curve = reliability_curve(probs, hits, n_bins)
    return sum((b.count / n) * abs(b.freq - b.p_mean) for b in curve)


def log_loss_multiclass(probs: list[list[float]], outcomes: list[int], eps: float = 1e-12) -> float:
    """Mean negative log-likelihood of the realized class."""
    if not probs:
        return float("nan")
    total = 0.0
    for p, o in zip(probs, outcomes):
        total += -math.log(max(p[o], eps))
    return total / len(probs)


def flatten_multiclass(
    probs: list[list[float]], outcomes: list[int]
) -> tuple[list[float], list[int]]:
    """Flatten (match, class) into (prob, hit) pairs for reliability/ECE."""
    flat_p: list[float] = []
    flat_h: list[int] = []
    for p, o in zip(probs, outcomes):
        for k, pk in enumerate(p):
            flat_p.append(pk)
            flat_h.append(1 if k == o else 0)
    return flat_p, flat_h
