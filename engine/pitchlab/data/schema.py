"""Canonical match record used across the engine.

A single normalized structure so every data source (mock, football-data.co.uk,
future live adapters) feeds the same downstream pipeline.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime


@dataclass(frozen=True)
class Match:
    """One historical match with results and (optionally) closing odds.

    Odds are decimal. ``*_close`` fields hold the Pinnacle (sharp) closing
    prices when available — these are the benchmark for CLV. The ``*_open``
    fields hold an earlier/soft price used as the "price you could have taken".
    """

    league: str
    date: datetime
    home: str
    away: str

    # Full-time goals (None for not-yet-played fixtures)
    home_goals: int | None
    away_goals: int | None

    # 1X2 closing odds (sharp benchmark, e.g. Pinnacle close)
    close_home: float | None = None
    close_draw: float | None = None
    close_away: float | None = None

    # 1X2 "available" odds (the price a bettor could take pre-close)
    open_home: float | None = None
    open_draw: float | None = None
    open_away: float | None = None

    # Over/Under 2.5 closing odds (optional)
    close_over25: float | None = None
    close_under25: float | None = None

    @property
    def played(self) -> bool:
        return self.home_goals is not None and self.away_goals is not None

    @property
    def result_1x2(self) -> str | None:
        """Return 'H', 'D' or 'A' for a played match, else None."""
        if not self.played:
            return None
        if self.home_goals > self.away_goals:  # type: ignore[operator]
            return "H"
        if self.home_goals < self.away_goals:  # type: ignore[operator]
            return "A"
        return "D"

    @property
    def total_goals(self) -> int | None:
        if not self.played:
            return None
        return self.home_goals + self.away_goals  # type: ignore[operator]
