"""Walk-forward backtest: the truth machine.

For each match in chronological order, fit the Dixon-Coles model on matches
*strictly before* it (no look-ahead), produce 1X2 probabilities, compare with
the de-vigged sharp closing line, place a paper value-bet when the model sees
edge, and record CLV / Brier / ROI out-of-sample.

Go/No-Go: a niche with out-of-sample average CLV >= +2% over a sufficient sample
signals genuine edge.
"""

from __future__ import annotations

from dataclasses import dataclass, field

from ..data.schema import Match
from ..markets.derive import prob_1x2
from ..metrics.brier import brier_multiclass
from ..metrics.calibration import (
    expected_calibration_error,
    flatten_multiclass,
    log_loss_multiclass,
    reliability_curve,
)
from ..metrics.clv import clv_from_odds
from ..metrics.roi import BetResult, roi
from ..models.calibration import IsotonicCalibrator
from ..models.dixon_coles import fit_dixon_coles
from ..odds.devig import devig_power
from ..strategy.staking import kelly_fraction

_OUTCOME_INDEX = {"H": 0, "D": 1, "A": 2}


def _downsample(series: list[float], max_points: int) -> list[float]:
    if len(series) <= max_points:
        return [round(x, 4) for x in series]
    step = len(series) / max_points
    return [round(series[int(i * step)], 4) for i in range(max_points)]


@dataclass
class BacktestConfig:
    min_train: int = 200      # minimum matches before we start predicting
    refit_every: int = 20     # refit model every N matches (speed vs freshness)
    edge_threshold: float = 0.02   # only bet when model_prob - market_prob > this
    xi: float = 0.0018        # time-decay rate for fitting
    kelly_fraction: float = 0.25   # fractional Kelly for the staking sim
    calibrate: bool = False        # apply rolling isotonic calibration
    calib_min: int = 150           # min past matches before calibrating
    calib_refit_every: int = 50    # refit the calibrator every N matches


@dataclass
class BacktestReport:
    n_predicted: int = 0
    n_bets: int = 0
    sum_clv: float = 0.0
    bets: list[BetResult] = field(default_factory=list)
    model_probs: list[list[float]] = field(default_factory=list)
    outcomes: list[int] = field(default_factory=list)
    clv_curve: list[float] = field(default_factory=list)  # running avg CLV per bet
    kelly_bankroll: float = 1.0       # quarter-Kelly bankroll, starts at 1.0
    bankroll_curve: list[float] = field(default_factory=list)

    @property
    def avg_clv(self) -> float:
        return self.sum_clv / self.n_bets if self.n_bets else float("nan")

    @property
    def kelly_growth(self) -> float:
        """Final bankroll relative to start (e.g. 0.12 = +12%)."""
        return self.kelly_bankroll - 1.0

    def calibration(self) -> dict:
        flat_p, flat_h = flatten_multiclass(self.model_probs, self.outcomes)
        curve = reliability_curve(flat_p, flat_h, n_bins=10)
        return {
            "ece": round(expected_calibration_error(flat_p, flat_h), 4),
            "log_loss": round(log_loss_multiclass(self.model_probs, self.outcomes), 4),
            "bins": [
                {"p_mean": round(b.p_mean, 4), "freq": round(b.freq, 4), "count": b.count}
                for b in curve
            ],
        }

    def to_dict(self, source: str = "") -> dict:
        return {
            "source": source,
            "n_predicted": self.n_predicted,
            "n_bets": self.n_bets,
            "avg_clv": None if self.n_bets == 0 else round(self.avg_clv, 4),
            "roi": None if not self.bets else round(self.roi, 4),
            "kelly_growth": None if not self.bets else round(self.kelly_growth, 4),
            "brier": round(self.brier, 4),
            "calibration": self.calibration(),
            "verdict": _verdict(self.avg_clv, self.n_bets).split("Verdict:")[-1].strip(),
            # downsample the curve to <=120 points for the chart
            "clv_curve": _downsample(self.clv_curve, 120),
        }

    @property
    def brier(self) -> float:
        return brier_multiclass(self.model_probs, self.outcomes)

    @property
    def roi(self) -> float:
        return roi(self.bets) if self.bets else float("nan")

    def summary(self) -> str:
        lines = [
            "=" * 52,
            "  PitchLab Truth Machine — Backtest Report",
            "=" * 52,
            f"  Predicted matches : {self.n_predicted}",
            f"  Value bets placed : {self.n_bets}",
            f"  Avg CLV           : {self.avg_clv * 100:+.2f}%"
            if self.n_bets
            else "  Avg CLV           : n/a",
            f"  ROI (flat stake)  : {self.roi * 100:+.2f}%"
            if self.bets
            else "  ROI               : n/a",
            f"  Kelly growth      : {self.kelly_growth * 100:+.2f}%"
            if self.bets
            else "  Kelly growth      : n/a",
            f"  Brier (1X2)       : {self.brier:.4f}",
            "-" * 52,
            _verdict(self.avg_clv, self.n_bets),
            "=" * 52,
        ]
        return "\n".join(lines)


def _verdict(avg_clv: float, n_bets: int) -> str:
    if n_bets < 50:
        return "  Verdict: insufficient sample (need >=50 bets for CLV)"
    if avg_clv >= 0.02:
        return "  Verdict: +CLV>=2% -> potential edge. Investigate niche."
    if avg_clv >= 0.0:
        return "  Verdict: marginal CLV. Likely no exploitable edge."
    return "  Verdict: negative CLV -> no edge. Pivot to pure tool (C)."


def run_backtest(matches: list[Match], config: BacktestConfig | None = None) -> BacktestReport:
    cfg = config or BacktestConfig()
    played = [m for m in matches if m.played]
    played.sort(key=lambda m: m.date)

    report = BacktestReport()
    model = None
    calibrator: IsotonicCalibrator | None = None
    # rolling history of RAW (model probs, outcome) used to fit the calibrator
    hist_probs: list[list[float]] = []
    hist_outcomes: list[int] = []

    for i, match in enumerate(played):
        if i < cfg.min_train:
            continue

        # refit periodically on all strictly-prior matches (no look-ahead)
        if model is None or i % cfg.refit_every == 0:
            try:
                model = fit_dixon_coles(played[:i], ref_date=match.date, xi=cfg.xi)
            except Exception:
                continue

        if match.home not in model.attack or match.away not in model.attack:
            continue  # team unseen in training window

        matrix = model.score_matrix(match.home, match.away)
        ph, pd, pa = prob_1x2(matrix)
        raw_probs = [ph, pd, pa]

        result = match.result_1x2
        if result is None:
            continue
        outcome_idx = _OUTCOME_INDEX[result]

        # rolling isotonic calibration (fit on strictly-past predictions only)
        if cfg.calibrate:
            if (
                len(hist_outcomes) >= cfg.calib_min
                and (calibrator is None or i % cfg.calib_refit_every == 0)
            ):
                fp, fh = flatten_multiclass(hist_probs, hist_outcomes)
                calibrator = IsotonicCalibrator().fit(fp, fh)
            if calibrator is not None:
                adj = [calibrator.predict_one(p) for p in raw_probs]
                s = sum(adj)
                model_probs = [a / s for a in adj] if s > 0 else raw_probs
            else:
                model_probs = raw_probs
        else:
            model_probs = raw_probs

        # record raw probs+outcome to history for future calibrator fits
        hist_probs.append(raw_probs)
        hist_outcomes.append(outcome_idx)

        report.model_probs.append(model_probs)
        report.outcomes.append(outcome_idx)
        report.n_predicted += 1

        # need both a price to take (open) and a sharp close to benchmark CLV
        take = [match.open_home, match.open_draw, match.open_away]
        close = [match.close_home, match.close_draw, match.close_away]
        if any(x is None for x in take) or any(x is None for x in close):
            continue

        close_fair = devig_power([float(c) for c in close])  # type: ignore[arg-type]

        # value-bet rule: model prob exceeds the price-implied prob by threshold
        for k in range(3):
            taken_odds = float(take[k])  # type: ignore[arg-type]
            implied = 1.0 / taken_odds
            if model_probs[k] - implied > cfg.edge_threshold:
                clv = clv_from_odds(taken_odds, close_fair[k])
                report.sum_clv += clv
                report.n_bets += 1
                won = outcome_idx == k
                report.bets.append(BetResult(odds=taken_odds, won=won))
                report.clv_curve.append(report.sum_clv / report.n_bets)

                # quarter-Kelly bankroll simulation (sized on model prob vs taken odds)
                f = kelly_fraction(model_probs[k], taken_odds, fraction=cfg.kelly_fraction)
                stake = report.kelly_bankroll * f
                if won:
                    report.kelly_bankroll += stake * (taken_odds - 1.0)
                else:
                    report.kelly_bankroll -= stake
                report.bankroll_curve.append(report.kelly_bankroll)

    return report
