"""Export fixture schedules for Web / Prisma (Phase 1+)."""

from __future__ import annotations

import re
from datetime import datetime, timezone

from ..worldcup.config import TournamentConfig, load_config  # noqa: TC001
from ..worldcup.fixtures import group_stage_fixtures


def _slug(*parts: str) -> str:
    raw = "-".join(p.lower() for p in parts if p)
    return re.sub(r"[^a-z0-9-]+", "-", raw).strip("-")


def fixtures_from_config(cfg: TournamentConfig) -> list[dict]:
    """Offline round-robin group fixtures from tournament config."""
    rows: list[dict] = []
    for f in group_stage_fixtures(cfg):
        fid = _slug("wc", f.group, str(f.matchday), f.home, f.away)
        rows.append(
            {
                "id": fid,
                "league": "WC",
                "home": f.home,
                "away": f.away,
                "group": f.group,
                "matchday": f.matchday,
                "kickoff_utc": f.kickoff.isoformat() if f.kickoff else None,
                "status": "scheduled",
                "home_goals": None,
                "away_goals": None,
            }
        )
    return rows


def fixtures_from_footballdata(competition_code: str = "WC", token: str | None = None) -> list[dict]:
    """Live matches from football-data.org."""
    from .footballdataorg import fetch_fixtures

    rows: list[dict] = []
    for m in fetch_fixtures(competition_code, token):
        home = m.get("home") or "TBD"
        away = m.get("away") or "TBD"
        group = m.get("group") or ""
        md = m.get("matchday") or 0
        fid = _slug(competition_code.lower(), group or "ko", str(md), home, away)
        kick = m.get("kickoff")
        rows.append(
            {
                "id": fid,
                "league": competition_code,
                "home": home,
                "away": away,
                "group": group or None,
                "matchday": md,
                "kickoff_utc": kick,
                "stage": m.get("stage"),
                "status": m.get("status") or "scheduled",
                "home_goals": m.get("home_goals"),
                "away_goals": m.get("away_goals"),
            }
        )
    return rows


def build_fixtures_payload(
    *,
    config_path: str | None = None,
    cfg: TournamentConfig | None = None,
    live: bool = False,
    competition_code: str = "WC",
    token: str | None = None,
) -> dict:
    if live:
        rows = fixtures_from_footballdata(competition_code, token)
        return {
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "source": "football-data.org",
            "competition": competition_code,
            "illustrative": False,
            "fixtures": rows,
        }

    resolved = cfg or load_config(config_path)
    return {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "source": "worldcup-round-robin",
        "competition": "WC",
        "illustrative": resolved.illustrative,
        "fixtures": fixtures_from_config(resolved),
    }

