"""Export World Cup predictions to JSON for the web dashboard.

Produces three files the Next.js app consumes:
  - meta.json          tournament name, illustrative flag, generated time
  - title_odds.json    per-team advance/title + round-by-round probabilities
  - predictions.json   group-stage fixtures with 1X2 / O-U probabilities
"""

from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path

from .config import TournamentConfig
from .elo import EloRatings
from .fixtures import group_stage_fixtures
from .match_model import match_probs
from .tournament import SimResult, simulate_tournament

_ROUND_KEYS = ["r16", "qf", "sf", "final", "champion"]


def _title_rows(res: SimResult) -> list[dict]:
    teams = set(res.advance) | set(res.rounds["champion"])
    rows = []
    for t in teams:
        rows.append(
            {
                "team": t,
                "advance": round(res.advance[t] / res.n_sims, 4),
                "r16": round(res.reach_prob(t, "r16"), 4),
                "qf": round(res.reach_prob(t, "qf"), 4),
                "sf": round(res.reach_prob(t, "sf"), 4),
                "final": round(res.reach_prob(t, "final"), 4),
                "champion": round(res.reach_prob(t, "champion"), 4),
            }
        )
    rows.sort(key=lambda r: r["champion"], reverse=True)
    return rows


def _prediction_rows(elo: EloRatings, cfg: TournamentConfig) -> list[dict]:
    rows = []
    for fx in group_stage_fixtures(cfg):
        p = match_probs(elo, fx.home, fx.away, neutral=True)
        rows.append(
            {
                "group": fx.group,
                "matchday": fx.matchday,
                "home": fx.home,
                "away": fx.away,
                "home_prob": round(p["home"], 4),
                "draw_prob": round(p["draw"], 4),
                "away_prob": round(p["away"], 4),
                "over25": round(p["over25"], 4),
            }
        )
    return rows


def export_all(
    cfg: TournamentConfig,
    elo: EloRatings,
    out_dir: str | Path,
    n_sims: int = 20000,
    seed: int = 7,
) -> Path:
    out = Path(out_dir)
    out.mkdir(parents=True, exist_ok=True)

    res = simulate_tournament(cfg, elo, n_sims=n_sims, seed=seed)

    meta = {
        "name": cfg.name,
        "illustrative": cfg.illustrative,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "n_sims": n_sims,
        "model": "International Elo -> Poisson score matrix -> Monte Carlo",
        "disclaimer": "Probabilities for information/analysis only. Not betting advice.",
    }
    (out / "meta.json").write_text(json.dumps(meta, ensure_ascii=False, indent=2), encoding="utf-8")
    (out / "title_odds.json").write_text(
        json.dumps(_title_rows(res), ensure_ascii=False, indent=2), encoding="utf-8"
    )
    (out / "predictions.json").write_text(
        json.dumps(_prediction_rows(elo, cfg), ensure_ascii=False, indent=2), encoding="utf-8"
    )

    from ..data.fixtures_export import build_fixtures_payload

    fixtures_payload = build_fixtures_payload(cfg=cfg)
    fixtures_payload["generated_at"] = meta["generated_at"]
    (out / "fixtures.json").write_text(
        json.dumps(fixtures_payload, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    return out
