"""football-data.org adapter — pull real World Cup 2026 groups & fixtures.

Free tier covers the FIFA World Cup competition (code ``WC``). Requires a free
API token in the ``X-Auth-Token`` header (env var ``FOOTBALL_DATA_TOKEN``).

This provides the real schedule/groups to replace the illustrative sample. It
is network-dependent and not exercised in offline/sandbox runs.

Docs: https://www.football-data.org/documentation/api
"""

from __future__ import annotations

import json
import os
from datetime import datetime
from pathlib import Path

import requests

BASE = "https://api.football-data.org/v4"
WORLD_CUP_CODE = "WC"

API_CODE_MAP = {
    "E0": "PL",
    "SP1": "PD",
    "D1": "BL1",
    "I1": "SA",
    "F1": "FL1",
    "WC": "WC",
}


_STATUS_MAP = {
    "FINISHED": "finished",
    "SCHEDULED": "scheduled",
    "TIMED": "scheduled",
    "IN_PLAY": "live",
    "PAUSED": "live",
    "SUSPENDED": "live",
    "POSTPONED": "postponed",
    "CANCELLED": "cancelled",
}


def _map_status(api_status: str | None) -> str:
    if not api_status:
        return "scheduled"
    return _STATUS_MAP.get(api_status.upper(), "scheduled")


def _full_time_goals(m: dict) -> tuple[int | None, int | None]:
    score = m.get("score") or {}
    ft = score.get("fullTime") or score.get("regularTime") or {}
    home = ft.get("home")
    away = ft.get("away")
    if home is None or away is None:
        return None, None
    return int(home), int(away)


def _headers(token: str | None) -> dict[str, str]:
    tok = token or os.environ.get("FOOTBALL_DATA_TOKEN", "")
    if not tok:
        raise RuntimeError(
            "football-data.org token required (set FOOTBALL_DATA_TOKEN or pass token)"
        )
    return {"X-Auth-Token": tok}


def fetch_groups(
    competition_code: str = WORLD_CUP_CODE,
    token: str | None = None,
    cache_dir: str | Path = ".cache",
) -> dict[str, list[str]]:
    """Fetch the groups (label -> team names) for the competition.

    Standings endpoint returns group tables; we extract the team list per group.
    """
    api_code = API_CODE_MAP.get(competition_code, competition_code)
    resp = requests.get(
        f"{BASE}/competitions/{api_code}/standings",
        headers=_headers(token),
        timeout=30,
    )
    resp.raise_for_status()
    data = resp.json()
    groups: dict[str, list[str]] = {}
    for standing in data.get("standings", []):
        group = standing.get("group")
        if not group:
            continue
        label = group.replace("GROUP_", "").strip()
        teams = [row["team"]["name"] for row in standing.get("table", [])]
        if teams:
            groups[label] = teams
    return groups


def fetch_fixtures(competition_code: str = WORLD_CUP_CODE, token: str | None = None) -> list[dict]:
    """Fetch raw match list for the competition (group + knockout)."""
    api_code = API_CODE_MAP.get(competition_code, competition_code)
    resp = requests.get(
        f"{BASE}/competitions/{api_code}/matches",
        headers=_headers(token),
        timeout=30,
    )
    resp.raise_for_status()
    out: list[dict] = []
    for m in resp.json().get("matches", []):
        home_goals, away_goals = _full_time_goals(m)
        out.append(
            {
                "home": m["homeTeam"].get("name"),
                "away": m["awayTeam"].get("name"),
                "group": (m.get("group") or "").replace("GROUP_", "").strip() or None,
                "matchday": m.get("matchday"),
                "kickoff": m.get("utcDate"),
                "stage": m.get("stage"),
                "status": _map_status(m.get("status")),
                "home_goals": home_goals,
                "away_goals": away_goals,
            }
        )
    return out


def save_groups_config(
    out_path: str | Path,
    token: str | None = None,
    name: str = "World Cup 2026",
) -> Path:
    """Fetch real groups and write a TournamentConfig-compatible JSON file."""
    groups = fetch_groups(token)
    cfg = {
        "name": name,
        "illustrative": False,
        "_fetched_at": datetime.utcnow().isoformat() + "Z",
        "_source": "football-data.org",
        "groups": groups,
    }
    dest = Path(out_path)
    dest.write_text(json.dumps(cfg, ensure_ascii=False, indent=2), encoding="utf-8")
    return dest
