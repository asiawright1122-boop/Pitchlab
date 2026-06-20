"""Post-settlement CLV backfill from football-data (open vs Pinnacle close)."""

from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path

from ..data import footballdata
from ..data.schema import Match
from ..league.export import LEAGUE_NAMES, TOP_LEAGUES
from ..metrics.clv import clv_from_odds
from ..odds.devig import devig_power
from .settle import _slug


def _match_clv_rows(m) -> list[dict]:
    """Per-outcome CLV for one played match with open + close 1X2."""
    take = [m.open_home, m.open_draw, m.open_away]
    close = [m.close_home, m.close_draw, m.close_away]
    if any(x is None for x in take) or any(x is None for x in close):
        return []
    close_fair = devig_power([float(c) for c in close])  # type: ignore[arg-type]
    rows = []
    for k, sel in enumerate(["H", "D", "A"]):
        taken = float(take[k])  # type: ignore[arg-type]
        clv = clv_from_odds(taken, close_fair[k])
        rows.append(
            {
                "selection": sel,
                "taken_odds": taken,
                "close_fair_prob": round(close_fair[k], 4),
                "clv": round(clv, 4),
                "won": m.result_1x2 == sel,
            }
        )
    return rows


def _fixture_id(m: Match) -> str:
    date_s = m.date.date().isoformat()
    return _slug(m.league, date_s, m.home, m.away)


def _kickoff_iso(m: Match) -> str:
    if m.date.tzinfo:
        return m.date.astimezone(timezone.utc).isoformat()
    return f"{m.date.date().isoformat()}T15:00:00+00:00"


def build_odds_snapshots(
    seasons: list[int],
    *,
    leagues: tuple[str, ...] = TOP_LEAGUES,
    cache_dir: str = ".cache",
) -> dict:
    """Per-outcome rows for DB import (open vs Pinnacle close)."""
    snapshots: list[dict] = []

    for code in leagues:
        try:
            matches = footballdata.load_league(code, seasons, cache_dir=cache_dir)
        except Exception:
            continue

        for m in matches:
            if not m.played:
                continue
            rows = _match_clv_rows(m)
            if not rows:
                continue
            fid = _fixture_id(m)
            kickoff = _kickoff_iso(m)
            taken_at = kickoff
            for r in rows:
                snapshots.append(
                    {
                        "fixture_id": fid,
                        "league": m.league,
                        "home": m.home,
                        "away": m.away,
                        "kickoff_utc": kickoff,
                        "book": "pinnacle",
                        "market": "1x2",
                        "selection": r["selection"],
                        "price": r["taken_odds"],
                        "close_fair_prob": r["close_fair_prob"],
                        "clv": r["clv"],
                        "won": r["won"],
                        "taken_at": taken_at,
                    }
                )

    # Drop error placeholders if any league failed entirely
    clean = [s for s in snapshots if "fixture_id" in s]
    return {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "source": "football-data.co.uk (open vs Pinnacle close)",
        "seasons": seasons,
        "n_snapshots": len(clean),
        "snapshots": clean,
    }


def build_clv_backfill(
    seasons: list[int],
    *,
    leagues: tuple[str, ...] = TOP_LEAGUES,
    cache_dir: str = ".cache",
) -> dict:
    by_league: list[dict] = []
    all_clv: list[float] = []

    for code in leagues:
        try:
            matches = footballdata.load_league(code, seasons, cache_dir=cache_dir)
        except Exception as exc:  # noqa: BLE001
            by_league.append({"code": code, "error": str(exc)})
            continue

        clvs: list[float] = []
        n_matches = 0
        for m in matches:
            if not m.played:
                continue
            rows = _match_clv_rows(m)
            if not rows:
                continue
            n_matches += 1
            for r in rows:
                clvs.append(r["clv"])
                all_clv.append(r["clv"])

        avg = sum(clvs) / len(clvs) if clvs else None
        by_league.append(
            {
                "code": code,
                "name": LEAGUE_NAMES.get(code, code),
                "n_matches_with_odds": n_matches,
                "n_outcomes": len(clvs),
                "avg_clv": round(avg, 4) if avg is not None else None,
            }
        )

    overall = sum(all_clv) / len(all_clv) if all_clv else None
    return {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "source": "football-data.co.uk (open vs Pinnacle close)",
        "seasons": seasons,
        "avg_clv_all": round(overall, 4) if overall is not None else None,
        "n_outcomes": len(all_clv),
        "leagues": by_league,
        "note": "Historical open vs close on all outcomes — not the value-bet subset.",
    }


def export_clv_backfill(
    data_dir: str | Path,
    seasons: list[int],
    *,
    cache_dir: str = ".cache",
    export_snapshots: bool = True,
) -> Path:
    root = Path(data_dir)
    payload = build_clv_backfill(seasons, cache_dir=cache_dir)
    (root / "clv_backfill.json").write_text(
        json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    if export_snapshots:
        snap = build_odds_snapshots(seasons, cache_dir=cache_dir)
        (root / "odds_snapshots.json").write_text(
            json.dumps(snap, ensure_ascii=False, indent=2), encoding="utf-8"
        )
    return root
