"""Build a daily feedback snapshot from exported dashboard JSON."""

from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


def _read_json(path: Path) -> Any | None:
    if not path.exists():
        return None
    return json.loads(path.read_text(encoding="utf-8"))


def build_feedback_snapshot(data_dir: str | Path) -> dict:
    root = Path(data_dir)

    backtest = _read_json(root / "backtest.json") or {}
    leagues = _read_json(root / "leagues.json") or {}
    bundle = _read_json(root / "league_bundle.json") or {}
    status = _read_json(root / "status.json") or {}
    monitor = _read_json(root / "metrics_monitor.json") or {}
    shadow = _read_json(root / "shadow_models.json") or {}

    league_rows = leagues.get("leagues") or []
    avg_clv_by_league = [
        {"code": r.get("code"), "avg_clv": r.get("avg_clv"), "brier": r.get("brier")}
        for r in league_rows
        if isinstance(r, dict)
    ]

    holdout_rows = bundle.get("leagues") or []
    holdout_brier = [
        {
            "code": r.get("code"),
            "brier": (r.get("monitor") or {}).get("brier"),
            "ece": (r.get("monitor") or {}).get("ece"),
        }
        for r in holdout_rows
        if isinstance(r, dict) and "error" not in r
    ]

    champion = {
        "label": "walk-forward CLV (Phase 0 truth machine)",
        "metric": "avg_clv",
        "value": backtest.get("avg_clv"),
        "n_bets": backtest.get("n_bets"),
        "verdict": backtest.get("verdict"),
    }
    shadow_e0 = next(
        (r for r in (shadow.get("leagues") or []) if r.get("league") == "E0"),
        None,
    )
    if shadow_e0 and shadow_e0.get("challenger"):
        challenger = {
            "label": shadow_e0["challenger"].get("label", "challenger"),
            "metric": "brier",
            "value": (shadow_e0["challenger"].get("monitor") or {}).get("brier"),
            "league": "E0",
            "model_id": shadow_e0["challenger"].get("id"),
        }
    else:
        challenger = {
            "label": "league hold-out Brier (Phase 2 monitor)",
            "metric": "brier",
            "value": monitor.get("monitor", {}).get("brier") if monitor else None,
            "league": monitor.get("league"),
        }

    league_preds = _read_json(root / "league_predictions.json") or {}
    wc_pred_n = len(_read_json(root / "predictions.json") or [])

    return {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "agent": {
            "pipeline": status.get("pipeline"),
            "ok": status.get("ok"),
            "run_id": status.get("run_id"),
        },
        "backtest_summary": {
            "source": backtest.get("source"),
            "avg_clv": backtest.get("avg_clv"),
            "roi": backtest.get("roi"),
            "brier": backtest.get("brier"),
            "n_bets": backtest.get("n_bets"),
            "verdict": backtest.get("verdict"),
        },
        "leagues_clv": avg_clv_by_league,
        "leagues_holdout_brier": holdout_brier,
        "champion_challenger": {
            "champion": champion,
            "challenger": challenger,
            "note": shadow.get("policy", {}).get("reason")
            or "Different protocols — compare trends only, not raw numbers.",
            "auto_promote": shadow.get("policy", {}).get("auto_promote", False),
        },
        "shadow_models": {
            "n_leagues": len(shadow.get("leagues") or []),
            "policy": shadow.get("policy"),
            "e0_recommendation": shadow_e0.get("recommendation") if shadow_e0 else None,
            "e0_champion_brier": (shadow_e0.get("champion") or {}).get("monitor", {}).get("brier")
            if shadow_e0
            else None,
            "e0_challenger_brier": (shadow_e0.get("challenger") or {}).get("monitor", {}).get("brier")
            if shadow_e0
            else None,
        },
        "summary_verdict": leagues.get("summary_verdict") or backtest.get("verdict"),
        "prediction_snapshots": {
            "league_holdout_n": len(league_preds.get("predictions") or []),
            "worldcup_fixtures_n": wc_pred_n,
            "model_version": "pitchlab-dc-v0.1",
        },
    }


def append_metrics_history(data_dir: str | Path, snapshot: dict, *, max_entries: int = 90) -> Path:
    """Append snapshot to metrics_history.json (rolling window)."""
    root = Path(data_dir)
    path = root / "metrics_history.json"
    history: list[dict] = []
    if path.exists():
        raw = json.loads(path.read_text(encoding="utf-8"))
        history = raw if isinstance(raw, list) else raw.get("entries", [])

    history.append(snapshot)
    history = history[-max_entries:]

    path.write_text(json.dumps(history, ensure_ascii=False, indent=2), encoding="utf-8")
    return path
