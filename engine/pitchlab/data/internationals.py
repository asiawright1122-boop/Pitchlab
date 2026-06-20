"""Download & parse the martj42/international_results dataset (CC0).

~49k men's full international matches from 1872 to present, updated after each
international window. Used to fit international-team Elo ratings for the World
Cup module.

Columns: date, home_team, away_team, home_score, away_score, tournament,
city, country, neutral.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from pathlib import Path

import pandas as pd
import requests

RESULTS_URL = (
    "https://raw.githubusercontent.com/martj42/international_results/master/results.csv"
)


@dataclass(frozen=True)
class IntlMatch:
    date: datetime
    home: str
    away: str
    home_score: int
    away_score: int
    tournament: str
    neutral: bool


def download_results(cache_dir: str | Path = ".cache") -> Path:
    cache = Path(cache_dir)
    cache.mkdir(parents=True, exist_ok=True)
    dest = cache / "international_results.csv"
    if dest.exists():
        return dest
    resp = requests.get(RESULTS_URL, timeout=60)
    resp.raise_for_status()
    dest.write_bytes(resp.content)
    return dest


def parse_results(path: str | Path) -> list[IntlMatch]:
    df = pd.read_csv(path)
    out: list[IntlMatch] = []
    for _, row in df.iterrows():
        if pd.isna(row.get("home_score")) or pd.isna(row.get("away_score")):
            continue
        try:
            date = datetime.strptime(str(row["date"]), "%Y-%m-%d")
        except (ValueError, KeyError):
            continue
        neutral = bool(row.get("neutral", False))
        if isinstance(row.get("neutral"), str):
            neutral = row["neutral"].strip().lower() == "true"
        out.append(
            IntlMatch(
                date=date,
                home=str(row["home_team"]).strip(),
                away=str(row["away_team"]).strip(),
                home_score=int(row["home_score"]),
                away_score=int(row["away_score"]),
                tournament=str(row.get("tournament", "")).strip(),
                neutral=neutral,
            )
        )
    out.sort(key=lambda m: m.date)
    return out


def load_results(cache_dir: str | Path = ".cache") -> list[IntlMatch]:
    return parse_results(download_results(cache_dir))
