"""Feature stubs for Phase 2 (expand in Phase 3 ROI loop)."""

from __future__ import annotations

from ..data.schema import Match
from .elo import LeagueElo


def match_features(m: Match, elo: LeagueElo) -> dict[str, float]:
    """Simple tabular features at prediction time (no future leakage)."""
    rh = elo.get(m.home)
    ra = elo.get(m.away)
    return {
        "elo_home": rh,
        "elo_away": ra,
        "elo_diff": rh - ra,
        "home_adv_elo": rh + 65.0 - ra,
    }
