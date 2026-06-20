"""Download and parse historical CSVs from football-data.co.uk.

Free data: 30+ seasons of results plus betting odds including Pinnacle closing
odds (PSCH/PSCD/PSCA) and Over/Under 2.5 closing averages — the gold mine for
backtesting CLV.

URL pattern:  https://www.football-data.co.uk/mmz4281/{season}/{league}.csv
  season is a 4-char code, e.g. 2324 for 2023/24
  league e.g. E0 (Premier League), D1 (Bundesliga), SP1 (La Liga), I1, F1
"""

from __future__ import annotations

import io
from datetime import datetime
from pathlib import Path

import pandas as pd
import requests

from .schema import Match

BASE_URL = "https://www.football-data.co.uk/mmz4281"


def season_code(start_year: int) -> str:
    """2023 -> '2324' (the 2023/24 season)."""
    return f"{start_year % 100:02d}{(start_year + 1) % 100:02d}"


def download_csv(league: str, start_year: int, cache_dir: str | Path = ".cache") -> Path:
    """Download one league-season CSV, caching to disk. Returns the file path."""
    cache = Path(cache_dir)
    cache.mkdir(parents=True, exist_ok=True)
    code = season_code(start_year)
    dest = cache / f"{league}_{code}.csv"
    if dest.exists():
        return dest
    url = f"{BASE_URL}/{code}/{league}.csv"
    resp = requests.get(url, timeout=30)
    resp.raise_for_status()
    dest.write_bytes(resp.content)
    return dest


def _f(row: pd.Series, key: str) -> float | None:
    if key not in row:
        return None
    val = row[key]
    try:
        if pd.isna(val):
            return None
        return float(val)
    except (TypeError, ValueError):
        return None


def _parse_date(raw: str) -> datetime:
    for fmt in ("%d/%m/%Y", "%d/%m/%y"):
        try:
            return datetime.strptime(str(raw), fmt)
        except ValueError:
            continue
    raise ValueError(f"Unrecognized date: {raw!r}")


def parse_csv(path: str | Path, league: str | None = None) -> list[Match]:
    """Parse a football-data.co.uk CSV file into Match records."""
    df = pd.read_csv(path, encoding="latin-1")
    matches: list[Match] = []
    for _, row in df.iterrows():
        if "Date" not in row or pd.isna(row.get("Date")):
            continue
        try:
            date = _parse_date(row["Date"])
        except ValueError:
            continue
        hg = _f(row, "FTHG")
        ag = _f(row, "FTAG")
        matches.append(
            Match(
                league=league or str(row.get("Div", "")),
                date=date,
                home=str(row.get("HomeTeam", "")).strip(),
                away=str(row.get("AwayTeam", "")).strip(),
                home_goals=int(hg) if hg is not None else None,
                away_goals=int(ag) if ag is not None else None,
                # Pinnacle closing (sharp benchmark)
                close_home=_f(row, "PSCH"),
                close_draw=_f(row, "PSCD"),
                close_away=_f(row, "PSCA"),
                # Bet365 opening-ish (price you could take); fallback to market avg
                open_home=_f(row, "B365H") or _f(row, "AvgH"),
                open_draw=_f(row, "B365D") or _f(row, "AvgD"),
                open_away=_f(row, "B365A") or _f(row, "AvgA"),
                # O/U 2.5 closing averages
                close_over25=_f(row, "AvgC>2.5") or _f(row, "Avg>2.5"),
                close_under25=_f(row, "AvgC<2.5") or _f(row, "Avg<2.5"),
            )
        )
    matches.sort(key=lambda m: m.date)
    return matches


def load_league(
    league: str, start_years: list[int], cache_dir: str | Path = ".cache"
) -> list[Match]:
    """Download (if needed) and parse multiple seasons for a league."""
    out: list[Match] = []
    for year in start_years:
        path = download_csv(league, year, cache_dir)
        out.extend(parse_csv(path, league=league))
    out.sort(key=lambda m: m.date)
    return out
