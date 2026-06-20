"""The Odds API adapter — live/upcoming odds for value detection.

Free tier: 500 credits/month (cost = markets x regions per request). Soft books
only (no Pinnacle); pair with SportsGameOdds for a sharp de-vig benchmark.

Token via env ``THE_ODDS_API_KEY``. Network-dependent; not run offline.
Docs: https://the-odds-api.com/liveapi/guides/v4/
"""

from __future__ import annotations

import os
from dataclasses import dataclass

import requests

BASE = "https://api.the-odds-api.com/v4"

# useful soccer sport keys
SPORT_WORLD_CUP = "soccer_fifa_world_cup"
SPORT_EPL = "soccer_epl"


@dataclass
class MarketOdds:
    home: str
    away: str
    commence: str
    book: str
    price_home: float | None
    price_draw: float | None
    price_away: float | None


def _key(token: str | None) -> str:
    tok = token or os.environ.get("THE_ODDS_API_KEY", "")
    if not tok:
        raise RuntimeError("The Odds API key required (set THE_ODDS_API_KEY)")
    return tok


def fetch_h2h(
    sport: str = SPORT_WORLD_CUP,
    regions: str = "eu",
    token: str | None = None,
) -> list[MarketOdds]:
    """Fetch head-to-head (1X2) odds for upcoming fixtures of a sport."""
    resp = requests.get(
        f"{BASE}/sports/{sport}/odds",
        params={
            "apiKey": _key(token),
            "regions": regions,
            "markets": "h2h",
            "oddsFormat": "decimal",
        },
        timeout=30,
    )
    resp.raise_for_status()
    out: list[MarketOdds] = []
    for ev in resp.json():
        home, away = ev.get("home_team"), ev.get("away_team")
        for bk in ev.get("bookmakers", []):
            ph = pd = pa = None
            for mk in bk.get("markets", []):
                if mk.get("key") != "h2h":
                    continue
                for oc in mk.get("outcomes", []):
                    name, price = oc.get("name"), oc.get("price")
                    if name == home:
                        ph = price
                    elif name == away:
                        pa = price
                    else:
                        pd = price
            out.append(
                MarketOdds(
                    home=home,
                    away=away,
                    commence=ev.get("commence_time", ""),
                    book=bk.get("title", ""),
                    price_home=ph,
                    price_draw=pd,
                    price_away=pa,
                )
            )
    return out
