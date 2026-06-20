"""World Cup fixtures.

Either generated from group composition (round-robin within each group) for an
offline demo, or loaded from an explicit fixtures list (e.g. fetched from
football-data.org) when real schedule/dates are available.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date
from itertools import combinations

from .config import TournamentConfig


@dataclass(frozen=True)
class Fixture:
    group: str
    matchday: int
    home: str
    away: str
    kickoff: date | None = None


def group_stage_fixtures(cfg: TournamentConfig) -> list[Fixture]:
    """Generate round-robin group-stage fixtures (6 per group of 4).

    Matchday assignment uses the standard 4-team round-robin schedule so each
    team plays once per matchday. Kickoff dates are left None (offline demo);
    real dates come from football-data.org.
    """
    fixtures: list[Fixture] = []
    for label, teams in cfg.groups.items():
        t = list(teams)
        # standard 3-round schedule for 4 teams
        schedule = [
            [(t[0], t[1]), (t[2], t[3])],
            [(t[0], t[2]), (t[3], t[1])],
            [(t[0], t[3]), (t[1], t[2])],
        ]
        for md, pairs in enumerate(schedule, start=1):
            for home, away in pairs:
                fixtures.append(Fixture(group=label, matchday=md, home=home, away=away))
    return fixtures
