"""Export Phase 2 league artifacts for web / worker."""

from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path

from ..data import footballdata, mock
from ..data.schema import Match
from .elo import fit_league_elo
from .predict import predict_holdout

LEAGUE_NAMES = {
    "E0": "Premier League (ENG)",
    "D1": "Bundesliga (GER)",
    "SP1": "La Liga (ESP)",
    "I1": "Serie A (ITA)",
    "F1": "Ligue 1 (FRA)",
    "E1": "Championship (ENG 2nd)",
}

TOP_LEAGUES = ("E0", "D1", "SP1", "I1", "F1")


def export_league(
    league: str,
    seasons: list[int],
    out_dir: str | Path,
    *,
    source: str = "football-data",
    cache_dir: str = ".cache",
    holdout: int = 30,
    mock_teams: int = 16,
    calibrate: bool = True,
) -> dict:
    out = Path(out_dir)
    out.mkdir(parents=True, exist_ok=True)

    model_version = "dc-isotonic-v0.1"
    config_path = out / "pipeline_config.json"
    shadow_path = out / "shadow_models.json"

    promoted_model_id = None
    auto_promote_active = False

    if config_path.exists():
        try:
            config_data = json.loads(config_path.read_text(encoding="utf-8"))
            if config_data.get("auto_promote"):
                promoted_model_id = config_data.get("promoted_model_id")
                auto_promote_active = True
        except Exception:
            pass

    if not promoted_model_id and shadow_path.exists():
        try:
            shadow_data = json.loads(shadow_path.read_text(encoding="utf-8"))
            policy = shadow_data.get("policy", {})
            if policy.get("auto_promote"):
                promoted_model_id = policy.get("promoted_model_id")
                auto_promote_active = True
        except Exception:
            pass

    if auto_promote_active and promoted_model_id == "dc-raw-v0.1":
        calibrate = False
        model_version = "dc-raw-v0.1"
        print(f"[league] auto-promote ACTIVE: switching to {model_version}")

    if source == "mock":
        matches = mock.generate_matches(
            n_teams=mock_teams, n_seasons=max(2, len(seasons)), seed=42
        )
    else:
        matches = footballdata.load_league(league, seasons, cache_dir=cache_dir)

    # Apply L2 team name normalization & alignment
    from ..cleaning.seed_aliases import seed_registry
    from ..cleaning.normalize import normalize_matches

    registry = seed_registry()
    custom_reg_path = Path(out_dir) / "names_registry.json"
    if custom_reg_path.exists():
        registry.merge_json(custom_reg_path)

    cleaned_matches, norm_report = normalize_matches(matches, registry)

    if norm_report.unmapped:
        unmapped_path = Path(out_dir) / "unmapped_teams.json"
        existing_unmapped = set()
        if unmapped_path.exists():
            try:
                existing_unmapped = set(json.loads(unmapped_path.read_text(encoding="utf-8")).get("unmapped", []))
            except Exception:
                pass
        merged_unmapped = existing_unmapped.union(norm_report.unmapped)
        unmapped_path.write_text(
            json.dumps({"unmapped": sorted(list(merged_unmapped))}, ensure_ascii=False, indent=2),
            encoding="utf-8"
        )
        print(f"[cleaning] WARNING: {len(norm_report.unmapped)} unmapped teams in league {league}. Saved to {unmapped_path}")

    matches = cleaned_matches

    elo = fit_league_elo(matches)
    pred_rows, monitor = predict_holdout(matches, holdout=holdout, calibrate=calibrate)

    generated = datetime.now(timezone.utc).isoformat()

    elo_payload = {
        "generated_at": generated,
        "league": league,
        "league_name": LEAGUE_NAMES.get(league, league),
        "seasons": seasons,
        "teams": [{"team": t, "elo": round(r, 1)} for t, r in elo.table()],
    }
    (out / "league_elo.json").write_text(
        json.dumps(elo_payload, ensure_ascii=False, indent=2), encoding="utf-8"
    )

    preds_payload = {
        "generated_at": generated,
        "league": league,
        "league_name": LEAGUE_NAMES.get(league, league),
        "holdout": holdout,
        "model_version": model_version,
        "disclaimer": "Hold-out sample for monitoring only — not betting advice.",
        "predictions": [
            {
                "date": r.date,
                "home": r.home,
                "away": r.away,
                "home_prob": r.home_prob,
                "draw_prob": r.draw_prob,
                "away_prob": r.away_prob,
                "actual": r.actual,
                "value_selection": r.value_selection,
                "kelly_frac": r.kelly_frac,
            }
            for r in pred_rows
        ],
    }
    (out / "league_predictions.json").write_text(
        json.dumps(preds_payload, ensure_ascii=False, indent=2), encoding="utf-8"
    )

    metrics_payload = {
        "generated_at": generated,
        "league": league,
        "monitor": monitor,
        "model": "Dixon-Coles" if calibrate else "Dixon-Coles (no calibration)",
        "model_version": model_version,
        "strategy": "devig + value edge>=2% + quarter-Kelly (analysis only)",
    }
    (out / "metrics_monitor.json").write_text(
        json.dumps(metrics_payload, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    (out / f"metrics_monitor_{league}.json").write_text(
        json.dumps(metrics_payload, ensure_ascii=False, indent=2), encoding="utf-8"
    )

    return metrics_payload


def export_all_leagues(
    seasons: list[int],
    out_dir: str | Path,
    *,
    leagues: tuple[str, ...] = TOP_LEAGUES,
    **kwargs,
) -> Path:
    """Export monitoring summary for multiple leagues into league_bundle.json."""
    import json
    from datetime import datetime, timezone

    out = Path(out_dir)
    bundle: list[dict] = []
    for code in leagues:
        try:
            m = export_league(code, seasons, out, **kwargs)
            bundle.append(
                {
                    "code": code,
                    "name": LEAGUE_NAMES.get(code, code),
                    "monitor": m.get("monitor", {}),
                }
            )
        except Exception as exc:  # noqa: BLE001 — collect per-league failures
            bundle.append({"code": code, "name": LEAGUE_NAMES.get(code, code), "error": str(exc)})

    payload = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "seasons": seasons,
        "leagues": bundle,
    }
    (out / "league_bundle.json").write_text(
        json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    return out
