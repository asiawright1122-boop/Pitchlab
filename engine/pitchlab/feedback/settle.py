"""Fetch results and backfill fixture scores (Phase 3 settlement)."""

from __future__ import annotations

import json
import re
from datetime import datetime, timezone
from pathlib import Path

from ..data import footballdata
from ..data.schema import Match
from ..league.export import LEAGUE_NAMES, TOP_LEAGUES

_FALLBACK_KICKOFF = "2026-06-15T12:00:00.000Z"


def _slug(*parts: str) -> str:
    raw = "-".join(p.lower() for p in parts if p)
    return re.sub(r"[^a-z0-9-]+", "-", raw).strip("-")


def _match_to_update(m: Match) -> dict | None:
    if not m.played or m.result_1x2 is None:
        return None
    date_s = m.date.date().isoformat()
    fid = _slug(m.league, date_s, m.home, m.away)
    return {
        "id": fid,
        "league": m.league,
        "home": m.home,
        "away": m.away,
        "kickoff_utc": (
            m.date.astimezone(timezone.utc).isoformat()
            if m.date.tzinfo
            else f"{date_s}T15:00:00+00:00"
        ),
        "status": "finished",
        "home_goals": m.home_goals,
        "away_goals": m.away_goals,
        "result_1x2": m.result_1x2,
    }


def fetch_settlements_for_league(
    league: str, seasons: list[int], *, cache_dir: str = ".cache"
) -> list[dict]:
    """Download (if needed) CSV and return finished-match updates."""
    matches = footballdata.load_league(league, seasons, cache_dir=cache_dir)
    out: list[dict] = []
    for m in matches:
        row = _match_to_update(m)
        if row:
            out.append(row)
    return out


def fetch_all_settlements(
    seasons: list[int],
    *,
    leagues: tuple[str, ...] = TOP_LEAGUES,
    cache_dir: str = ".cache",
) -> dict:
    """Aggregate settlements for multiple leagues."""
    by_league: dict[str, list[dict]] = {}
    errors: dict[str, str] = {}
    for code in leagues:
        try:
            rows = fetch_settlements_for_league(code, seasons, cache_dir=cache_dir)
            by_league[code] = rows
        except Exception as exc:  # noqa: BLE001
            errors[code] = str(exc)

    flat = [r for rows in by_league.values() for r in rows]
    return {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "source": "football-data.co.uk",
        "seasons": seasons,
        "n_updates": len(flat),
        "by_league": {
            code: {"name": LEAGUE_NAMES.get(code, code), "n": len(rows)}
            for code, rows in by_league.items()
        },
        "errors": errors,
        "updates": flat,
    }


def merge_into_fixtures_file(data_dir: Path, updates: list[dict]) -> int:
    """Patch apps/web/public/data/fixtures.json with finished scores where IDs match."""
    path = data_dir / "fixtures.json"
    if not path.exists():
        return 0
    payload = json.loads(path.read_text(encoding="utf-8"))
    fixtures = payload.get("fixtures") or []
    by_id = {u["id"]: u for u in updates}
    merged = 0
    for f in fixtures:
        u = by_id.get(f.get("id"))
        if not u:
            continue
        f["status"] = "finished"
        f["home_goals"] = u["home_goals"]
        f["away_goals"] = u["away_goals"]
        f["result_1x2"] = u.get("result_1x2")
        merged += 1
    if merged:
        path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    return merged


def export_settlements(
    data_dir: str | Path,
    seasons: list[int],
    *,
    leagues: tuple[str, ...] = TOP_LEAGUES,
    cache_dir: str = ".cache",
    merge_fixtures: bool = True,
) -> Path:
    root = Path(data_dir)
    payload = fetch_all_settlements(seasons, leagues=leagues, cache_dir=cache_dir)
    (root / "settlements.json").write_text(
        json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    if merge_fixtures and payload["updates"]:
        merge_into_fixtures_file(root, payload["updates"])
    return root
