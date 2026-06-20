"""Phase 5: champion vs challenger (shadow) model comparison — record only, no auto-promote."""

from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path

from ..data import footballdata, mock
from ..data.schema import Match
from ..league.export import LEAGUE_NAMES, TOP_LEAGUES
from ..league.predict import predict_holdout
from .ml_challenger import (
    evaluate_gbm_challenger,
    evaluate_logistic_challenger,
    evaluate_ml_residual_challenger,
)
from .promotion import evaluate_promotion

SHADOW_POLICY = {
    "auto_promote": False,
    "reason": "Phase 8 Active: PnL backtesting armed.",
    "promote_if": "avg_clv >= 0.0 for 90d AND challenger Brier < champion Brier on hold-out",
}


def _load_matches(
    league: str,
    seasons: list[int],
    *,
    source: str,
    cache_dir: str,
    mock_teams: int,
) -> list[Match]:
    if source == "mock":
        return mock.generate_matches(
            n_teams=mock_teams, n_seasons=max(2, len(seasons)), seed=42
        )
    return footballdata.load_league(league, seasons, cache_dir=cache_dir)


def compare_shadow(
    league: str,
    seasons: list[int],
    *,
    source: str = "football-data",
    cache_dir: str = ".cache",
    holdout: int = 30,
    mock_teams: int = 16,
) -> dict:
    matches = _load_matches(
        league, seasons, source=source, cache_dir=cache_dir, mock_teams=mock_teams
    )
    _, mon_champion = predict_holdout(matches, holdout=holdout, calibrate=True)
    _, mon_challenger = predict_holdout(matches, holdout=holdout, calibrate=False)
    _, mon_beta = predict_holdout(matches, holdout=holdout, calibrate=True, calibration_type="beta")

    shadow_ml_res = evaluate_ml_residual_challenger(matches, holdout=holdout)

    row = {
        "league": league,
        "league_name": LEAGUE_NAMES.get(league, league),
        "seasons": seasons,
        "holdout": holdout,
        "champion": {
            "id": "dc-isotonic-v0.1",
            "label": "Dixon-Coles + isotonic calibration",
            "role": "champion",
            "monitor": mon_champion,
        },
        "challenger": {
            "id": "dc-raw-v0.1",
            "label": "Dixon-Coles (no calibration)",
            "role": "challenger",
            "monitor": mon_challenger,
        },
        "challenger_beta": {
            "id": "dc-beta-calibrated-v0.1",
            "label": "Dixon-Coles + Beta Calibration",
            "role": "challenger",
            "monitor": mon_beta,
        },
        "shadow_ml_logreg": evaluate_logistic_challenger(matches, holdout=holdout),
        "shadow_ml_gbm": evaluate_gbm_challenger(matches, holdout=holdout),
        "shadow_ml_residual": shadow_ml_res,
        "recommendation": _recommendation(mon_champion, mon_challenger, mon_beta, shadow_ml_res),
    }
    return _attach_shadow_ml_alias(row)


def _attach_shadow_ml_alias(row: dict) -> dict:
    """Backward-compat: shadow_ml points at best ML challenger by Brier."""
    best = None
    best_b = 999.0
    for key in ("shadow_ml_gbm", "shadow_ml_logreg"):
        ml = row.get(key) or {}
        b = (ml.get("monitor") or {}).get("brier")
        if ml.get("status") == "ok" and b is not None and b < best_b:
            best_b = float(b)
            best = ml
    row["shadow_ml"] = best or row.get("shadow_ml_logreg")
    return row


def _recommendation(champion: dict, challenger: dict, challenger_beta: dict, ml_residual: dict) -> str:
    cb = champion.get("brier")
    hb = challenger.get("brier")
    beta_b = challenger_beta.get("brier")
    
    # 考虑 ML residual 模型的 holdout 表现
    ml_b = (ml_residual.get("monitor") or {}).get("brier") if ml_residual.get("status") == "ok" else None
    
    best_challenger_b = hb
    if beta_b is not None:
        if best_challenger_b is None or beta_b < best_challenger_b:
            best_challenger_b = beta_b
    if ml_b is not None:
        if best_challenger_b is None or ml_b < best_challenger_b:
            best_challenger_b = ml_b

    if cb is None or best_challenger_b is None:
        return "Insufficient hold-out metrics."
    if best_challenger_b < cb - 0.002:
        return "Challenger beats champion on Brier — still no auto-promote (CLV gate)."
    if cb < best_challenger_b - 0.002:
        return "Champion remains better calibrated on hold-out Brier."
    return "Champion and challenger tied on Brier — keep champion."


def build_shadow_payload(
    seasons: list[int],
    *,
    leagues: tuple[str, ...] = TOP_LEAGUES,
    source: str = "football-data",
    cache_dir: str = ".cache",
    holdout: int = 30,
    data_dir: str | Path | None = None,
    allow_auto_promote: bool = False,
) -> dict:
    rows: list[dict] = []
    errors: dict[str, str] = {}
    for code in leagues:
        try:
            rows.append(
                compare_shadow(
                    code,
                    seasons,
                    source=source,
                    cache_dir=cache_dir,
                    holdout=holdout,
                )
            )
        except Exception as exc:  # noqa: BLE001
            errors[code] = str(exc)

    e0 = next((r for r in rows if r.get("league") == "E0"), None)
    promotion = evaluate_promotion(
        Path(data_dir) if data_dir else None,
        e0,
        allow_auto_promote=allow_auto_promote,
    )
    policy = {**SHADOW_POLICY, **promotion}

    return {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "policy": policy,
        "source": source,
        "seasons": seasons,
        "leagues": rows,
        "errors": errors,
    }


def export_shadow_models(
    data_dir: str | Path,
    seasons: list[int],
    *,
    leagues: tuple[str, ...] = TOP_LEAGUES,
    source: str = "football-data",
    cache_dir: str = ".cache",
    holdout: int = 30,
    allow_auto_promote: bool = False,
) -> Path:
    root = Path(data_dir)
    payload = build_shadow_payload(
        seasons,
        leagues=leagues,
        source=source,
        cache_dir=cache_dir,
        holdout=holdout,
        data_dir=root,
        allow_auto_promote=allow_auto_promote,
    )
    (root / "shadow_models.json").write_text(
        json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8"
    )

    # Auto-promotion persistence is now handled via the TS worker sync process.
    # The sync process detects policy.auto_promote and updates SystemSetting in Postgres.

    return root
