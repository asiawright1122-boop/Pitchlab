"""Seed alias table — canonical name -> known variants across sources.

Starting point for the registry; grows over time as new source variants are
encountered. Covers national-team variants (relevant for the World Cup module)
plus a few common club aliases.
"""

from __future__ import annotations

from .names import NameRegistry

# canonical -> aliases
SEED: dict[str, list[str]] = {
    # national teams (source variants)
    "Turkey": ["Türkiye", "Turkiye"],
    "South Korea": ["Korea Republic", "Korea, South", "Republic of Korea"],
    "United States": ["USA", "United States of America", "US"],
    "Ivory Coast": ["Côte d'Ivoire", "Cote d'Ivoire"],
    "Czechia": ["Czech Republic"],
    "Bosnia and Herzegovina": ["Bosnia", "Bosnia-Herzegovina"],
    "Curaçao": ["Curacao"],
    "China PR": ["China"],
    "North Macedonia": ["Macedonia", "FYR Macedonia"],
    "Cape Verde": ["Cabo Verde"],
    # common clubs (multi-source variants)
    "Manchester United": ["Man United", "Man Utd", "Manchester Utd"],
    "Manchester City": ["Man City"],
    "Wolverhampton Wanderers": ["Wolves", "Wolverhampton"],
    "Tottenham Hotspur": ["Tottenham", "Spurs"],
    "Paris Saint-Germain": ["PSG", "Paris SG", "Paris Saint Germain"],
    "Bayern Munich": ["Bayern München", "FC Bayern", "Bayern Munchen"],
    "Borussia Dortmund": ["Dortmund", "BVB"],
    "Internazionale": ["Inter", "Inter Milan"],
    "AC Milan": ["Milan"],
    "Atlético Madrid": ["Atletico Madrid", "Atletico de Madrid", "Atleti"],
}


def seed_registry() -> NameRegistry:
    return NameRegistry.from_dict(SEED)
