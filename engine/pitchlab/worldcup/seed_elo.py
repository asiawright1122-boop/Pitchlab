"""Approximate current international Elo ratings (offline seed).

Source: public World Football Elo (eloratings.net / Wikipedia, ~Jan 2026),
rounded. Used ONLY so the simulator runs offline without downloading the full
martj42 history. For production, fit ratings from real data via `fit_elo`.

NOT authoritative — clearly an approximation for demo purposes.
"""

from __future__ import annotations

from .elo import DEFAULT_RATING, EloRatings

# Approximate Elo (illustrative). Unlisted teams fall back to DEFAULT_RATING.
_SEED: dict[str, float] = {
    "Spain": 2171, "Argentina": 2113, "France": 2063, "England": 2042,
    "Colombia": 1998, "Brazil": 1979, "Portugal": 1976, "Netherlands": 1959,
    "Croatia": 1933, "Ecuador": 1933, "Norway": 1922, "Germany": 1910,
    "Switzerland": 1897, "Uruguay": 1890, "Turkey": 1880, "Türkiye": 1880,
    "Japan": 1879, "Senegal": 1869, "Denmark": 1864, "Italy": 1859,
    "Belgium": 1849, "Morocco": 1840, "United States": 1790, "USA": 1790,
    "Mexico": 1800, "South Korea": 1790, "Korea Republic": 1790,
    "Australia": 1720, "Canada": 1730, "Japan ": 1879, "Iran": 1780,
    "Poland": 1770, "Sweden": 1760, "Austria": 1790, "Scotland": 1760,
    "Ukraine": 1760, "Serbia": 1760, "Egypt": 1700, "Nigeria": 1720,
    "Ivory Coast": 1700, "Paraguay": 1660, "Czechia": 1760, "Tunisia": 1660,
    "Qatar": 1560, "South Africa": 1620, "Bosnia and Herzegovina": 1700,
    "Haiti": 1450, "Curaçao": 1420, "New Zealand": 1480, "Saudi Arabia": 1600,
    "Ghana": 1660, "Algeria": 1740, "Panama": 1560, "Costa Rica": 1560,
    "Jordan": 1500, "Uzbekistan": 1560, "Cape Verde": 1560,
}


def seed_ratings() -> EloRatings:
    return EloRatings(ratings=dict(_SEED))


def get_seed(team: str) -> float:
    return _SEED.get(team, DEFAULT_RATING)
