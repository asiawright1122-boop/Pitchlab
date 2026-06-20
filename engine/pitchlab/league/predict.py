"""League hold-out predictions and monitoring (Dixon-Coles + strategy hints)."""

from __future__ import annotations

from dataclasses import dataclass

from ..data.schema import Match
from ..markets.derive import prob_1x2
from ..metrics.brier import brier_multiclass
from ..metrics.calibration import expected_calibration_error, flatten_multiclass, log_loss_multiclass
from ..models.calibration import IsotonicCalibrator
from ..models.dixon_coles import fit_dixon_coles
from ..strategy.staking import kelly_fraction
from ..strategy.value import find_value

_OUTCOME_IDX = {"H": 0, "D": 1, "A": 2}


@dataclass
class LeaguePredictionRow:
    date: str
    home: str
    away: str
    home_prob: float
    draw_prob: float
    away_prob: float
    actual: str | None
    open_odds: list[float] | None
    value_selection: str | None
    kelly_frac: float | None


def _fit_calibrator(train: list[Match], calib_window: int, calib_type: str = "isotonic") -> IsotonicCalibrator | BetaCalibrator | None:
    if len(train) <= calib_window + 80:
        return None
    fit_slice = train[: -calib_window]
    calib_slice = train[-calib_window:]
    model_fit = fit_dixon_coles(fit_slice, ref_date=calib_slice[0].date)
    cal_probs: list[float] = []
    cal_hits: list[int] = []
    for m in calib_slice:
        if m.home not in model_fit.attack or m.away not in model_fit.attack:
            continue
        res = m.result_1x2
        if not res:
            continue
        mat = model_fit.score_matrix(m.home, m.away)
        ph, pd, pa = prob_1x2(mat)
        o = _OUTCOME_IDX[res]
        for k, p in enumerate([ph, pd, pa]):
            cal_probs.append(p)
            cal_hits.append(1 if k == o else 0)
    if len(cal_hits) < 30:
        return None
    
    if calib_type == "beta":
        from ..models.beta_calibrator import BetaCalibrator
        return BetaCalibrator().fit(cal_probs, cal_hits)
    return IsotonicCalibrator().fit(cal_probs, cal_hits)


def predict_holdout(
    matches: list[Match],
    *,
    holdout: int = 30,
    edge_threshold: float = 0.02,
    calibrate: bool = False,
    calib_window: int = 150,
    calibration_type: str = "isotonic",
) -> tuple[list[LeaguePredictionRow], dict]:
    """Fit on all but last ``holdout`` played matches; predict the tail."""
    played = sorted([m for m in matches if m.played], key=lambda m: m.date)
    if len(played) <= holdout + 50:
        holdout = max(5, len(played) // 5)

    train = played[: -holdout]
    test = played[-holdout:]

    calibrator = _fit_calibrator(train, calib_window, calibration_type) if calibrate else None
    model = fit_dixon_coles(train, ref_date=test[0].date)

    rows: list[LeaguePredictionRow] = []
    model_probs: list[list[float]] = []
    raw_probs_list: list[list[float]] = []
    outcomes: list[int] = []

    for m in test:
        if m.home not in model.attack or m.away not in model.attack:
            continue
        matrix = model.score_matrix(m.home, m.away)
        ph, pd, pa = prob_1x2(matrix)
        raw_probs = [ph, pd, pa]
        if calibrator is not None:
            adj = [calibrator.predict_one(p) for p in raw_probs]
            s = sum(adj)
            probs = [a / s for a in adj] if s > 0 else raw_probs
        else:
            probs = raw_probs

        actual = m.result_1x2
        if actual:
            model_probs.append(probs)
            raw_probs_list.append(raw_probs)
            outcomes.append(_OUTCOME_IDX[actual])

        open_odds = None
        value_sel = None
        kelly = None
        if m.open_home and m.open_draw and m.open_away:
            open_odds = [m.open_home, m.open_draw, m.open_away]  # type: ignore[list-item]
            bets = find_value(
                ["H", "D", "A"],
                probs,
                open_odds,
                min_edge=edge_threshold,
            )
            if bets:
                value_sel = bets[0].selection
                sel_i = _OUTCOME_IDX[value_sel]
                kelly = kelly_fraction(probs[sel_i], open_odds[sel_i], fraction=0.25)

        rows.append(
            LeaguePredictionRow(
                date=m.date.date().isoformat(),
                home=m.home,
                away=m.away,
                home_prob=round(probs[0], 4),
                draw_prob=round(probs[1], 4),
                away_prob=round(probs[2], 4),
                actual=actual,
                open_odds=open_odds,
                value_selection=value_sel,
                kelly_frac=round(kelly, 4) if kelly is not None else None,
            )
        )

    flat_p, flat_h = flatten_multiclass(model_probs, outcomes) if outcomes else ([], [])
    monitor: dict = {
        "n_holdout": len(rows),
        "n_scored": len(outcomes),
        "calibrated": calibrator is not None,
        "brier": round(brier_multiclass(model_probs, outcomes), 4) if outcomes else None,
        "ece": round(expected_calibration_error(flat_p, flat_h), 4) if flat_p else None,
        "log_loss": round(log_loss_multiclass(model_probs, outcomes), 4) if outcomes else None,
    }
    if calibrator and outcomes:
        monitor["brier_raw"] = round(brier_multiclass(raw_probs_list, outcomes), 4)
    return rows, monitor
