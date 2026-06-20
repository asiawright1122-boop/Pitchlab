"""Optional ML challengers (Elo features) — requires scikit-learn."""

from __future__ import annotations

from typing import Callable

from ..data.schema import Match
from ..league.elo import fit_league_elo
from ..metrics.brier import brier_multiclass
from ..metrics.calibration import (
    expected_calibration_error,
    flatten_multiclass,
    log_loss_multiclass,
)

_OUTCOME_IDX = {"H": 0, "D": 1, "A": 2}


def _sklearn_missing(model_id: str, label: str) -> dict:
    return {
        "id": model_id,
        "label": label,
        "role": "shadow",
        "status": "skipped",
        "note": "Install: pip install scikit-learn",
    }


def _features(elo_table: dict[str, float], m: Match) -> list[float] | None:
    h = elo_table.get(m.home)
    a = elo_table.get(m.away)
    if h is None or a is None:
        return None
    return [h, a, h - a, 1.0]


def _evaluate_ml(
    matches: list[Match],
    *,
    holdout: int,
    model_id: str,
    label: str,
    make_classifier: Callable[[], object],
) -> dict:
    played = sorted([m for m in matches if m.played], key=lambda m: m.date)
    h = holdout
    if len(played) <= h + 50:
        h = max(5, len(played) // 5)
    train = played[: -h]
    test = played[-h:]

    elo = fit_league_elo(train)
    elo_table = dict(elo.table())

    xs: list[list[float]] = []
    ys: list[int] = []
    for m in train:
        if not m.result_1x2:
            continue
        row = _features(elo_table, m)
        if row is None:
            continue
        xs.append(row)
        ys.append(_OUTCOME_IDX[m.result_1x2])

    if len(ys) < 80:
        return {
            "id": model_id,
            "label": label,
            "status": "skipped",
            "note": f"Too few training rows ({len(ys)})",
        }

    from sklearn.preprocessing import StandardScaler

    scaler = StandardScaler()
    x_train = scaler.fit_transform(xs)
    clf = make_classifier()
    clf.fit(x_train, ys)

    model_probs: list[list[float]] = []
    outcomes: list[int] = []
    for m in test:
        if not m.result_1x2:
            continue
        row = _features(elo_table, m)
        if row is None:
            continue
        proba = clf.predict_proba(scaler.transform([row]))[0]
        model_probs.append(proba.tolist())
        outcomes.append(_OUTCOME_IDX[m.result_1x2])

    if not outcomes:
        return {"id": model_id, "label": label, "status": "skipped", "note": "No hold-out rows"}

    flat_p, flat_h = flatten_multiclass(model_probs, outcomes)
    monitor = {
        "n": len(outcomes),
        "brier": round(brier_multiclass(model_probs, outcomes), 4),
        "log_loss": round(log_loss_multiclass(model_probs, outcomes), 4),
        "ece": round(expected_calibration_error(flat_p, flat_h), 4) if flat_p else None,
    }

    return {
        "id": model_id,
        "label": label,
        "role": "shadow",
        "status": "ok",
        "monitor": monitor,
    }


def evaluate_logistic_challenger(
    matches: list[Match],
    *,
    holdout: int = 30,
) -> dict:
    try:
        from sklearn.linear_model import LogisticRegression
    except ImportError:
        return _sklearn_missing("logreg-elo-v0", "Logistic (Elo features)")

    return _evaluate_ml(
        matches,
        holdout=holdout,
        model_id="logreg-elo-v0",
        label="Logistic regression (Elo features)",
        make_classifier=lambda: LogisticRegression(max_iter=500),
    )


def evaluate_gbm_challenger(
    matches: list[Match],
    *,
    holdout: int = 30,
) -> dict:
    try:
        from sklearn.ensemble import HistGradientBoostingClassifier
    except ImportError:
        return _sklearn_missing("gbm-elo-v0", "GBM (Elo features)")

    return _evaluate_ml(
        matches,
        holdout=holdout,
        model_id="gbm-elo-v0",
        label="HistGradientBoosting (Elo features)",
        make_classifier=lambda: HistGradientBoostingClassifier(
            max_iter=120,
            max_depth=4,
            learning_rate=0.08,
            random_state=42,
        ),
    )


def evaluate_ml_residual_challenger(
    matches: list[Match],
    *,
    holdout: int = 30,
) -> dict:
    model_id = "dc-ml-residual-v0.1"
    label = "Dixon-Coles + ML Residual Correction"
    try:
        from sklearn.linear_model import LogisticRegression
        from sklearn.preprocessing import StandardScaler
        import numpy as np
    except ImportError:
        return _sklearn_missing(model_id, label)

    played = sorted([m for m in matches if m.played], key=lambda m: m.date)
    h = holdout
    if len(played) <= h + 50:
        h = max(5, len(played) // 5)
    train = played[: -h]
    test = played[-h:]

    from ..models.dixon_coles import fit_dixon_coles
    from ..markets.derive import prob_1x2

    try:
        model = fit_dixon_coles(train, ref_date=test[0].date)
    except Exception as e:
        return {
            "id": model_id,
            "label": label,
            "status": "skipped",
            "note": f"Dixon-Coles fit failed: {e}",
        }

    elo = fit_league_elo(train)
    elo_table = dict(elo.table())

    def _get_recent_form(team: str, date) -> tuple[float, float]:
        past = [m for m in played if m.date < date and (m.home == team or m.away == team)]
        past = sorted(past, key=lambda m: m.date, reverse=True)[:5]
        if not past:
            return 1.2, 1.2
        scored = []
        conceded = []
        for m in past:
            if m.home == team:
                scored.append(m.home_goals if m.home_goals is not None else 1.2)
                conceded.append(m.away_goals if m.away_goals is not None else 1.2)
            else:
                scored.append(m.away_goals if m.away_goals is not None else 1.2)
                conceded.append(m.home_goals if m.home_goals is not None else 1.2)
        return float(np.mean(scored)), float(np.mean(conceded))

    xs: list[list[float]] = []
    ys: list[int] = []
    for m in train:
        if not m.result_1x2:
            continue
        if m.home not in model.attack or m.away not in model.attack:
            continue
        home_elo = elo_table.get(m.home)
        away_elo = elo_table.get(m.away)
        if home_elo is None or away_elo is None:
            continue

        matrix = model.score_matrix(m.home, m.away)
        ph, pd, pa = prob_1x2(matrix)
        log_ratio = float(np.log(max(ph, 1e-5) / max(pa, 1e-5)))
        hs_avg, hc_avg = _get_recent_form(m.home, m.date)
        as_avg, ac_avg = _get_recent_form(m.away, m.date)

        xs.append([ph, pd, pa, home_elo, away_elo, home_elo - away_elo, log_ratio, hs_avg, hc_avg, as_avg, ac_avg])
        ys.append(_OUTCOME_IDX[m.result_1x2])

    if len(ys) < 80:
        return {
            "id": model_id,
            "label": label,
            "status": "skipped",
            "note": f"Too few training rows ({len(ys)})",
        }

    scaler = StandardScaler()
    x_train = scaler.fit_transform(xs)
    clf = LogisticRegression(max_iter=500, random_state=42, C=1.0)
    clf.fit(x_train, ys)

    model_probs: list[list[float]] = []
    outcomes: list[int] = []
    for m in test:
        if not m.result_1x2:
            continue
        if m.home not in model.attack or m.away not in model.attack:
            continue
        home_elo = elo_table.get(m.home)
        away_elo = elo_table.get(m.away)
        if home_elo is None or away_elo is None:
            continue

        matrix = model.score_matrix(m.home, m.away)
        ph, pd, pa = prob_1x2(matrix)
        log_ratio = float(np.log(max(ph, 1e-5) / max(pa, 1e-5)))
        hs_avg, hc_avg = _get_recent_form(m.home, m.date)
        as_avg, ac_avg = _get_recent_form(m.away, m.date)

        row = [ph, pd, pa, home_elo, away_elo, home_elo - away_elo, log_ratio, hs_avg, hc_avg, as_avg, ac_avg]

        proba = clf.predict_proba(scaler.transform([row]))[0]
        model_probs.append(proba.tolist())
        outcomes.append(_OUTCOME_IDX[m.result_1x2])

    if not outcomes:
        return {"id": model_id, "label": label, "status": "skipped", "note": "No hold-out rows"}

    flat_p, flat_h = flatten_multiclass(model_probs, outcomes)
    monitor = {
        "n": len(outcomes),
        "brier": round(brier_multiclass(model_probs, outcomes), 4),
        "log_loss": round(log_loss_multiclass(model_probs, outcomes), 4),
        "ece": round(expected_calibration_error(flat_p, flat_h), 4) if flat_p else None,
    }

    return {
        "id": model_id,
        "label": label,
        "role": "shadow",
        "status": "ok",
        "monitor": monitor,
    }

