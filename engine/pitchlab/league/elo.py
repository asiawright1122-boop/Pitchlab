"""Domestic league Elo from historical Match records."""

from __future__ import annotations

from dataclasses import dataclass, field

from ..data.schema import Match

DEFAULT_ELO = 1500.0
HOME_ADV = 65.0
K = 20.0


@dataclass
class LeagueElo:
    ratings: dict[str, float] = field(default_factory=dict)

    def get(self, team: str) -> float:
        return self.ratings.get(team, DEFAULT_ELO)

    def table(self) -> list[tuple[str, float]]:
        return sorted(self.ratings.items(), key=lambda x: x[1], reverse=True)


def _expected(ra: float, rb: float, home_adv: float) -> float:
    return 1.0 / (1.0 + 10 ** ((rb + home_adv - ra) / 400.0))


def fit_league_elo(
    matches: list[Match],
    *,
    k: float = K,
    home_adv: float = HOME_ADV,
) -> LeagueElo:
    """Chronological Elo updates on played matches only."""
    played = sorted([m for m in matches if m.played], key=lambda m: m.date)
    elo = LeagueElo()
    for m in played:
        ra = elo.get(m.home)
        rb = elo.get(m.away)
        exp = _expected(ra, rb, home_adv)
        result = m.result_1x2
        if result == "H":
            score = 1.0
        elif result == "D":
            score = 0.5
        else:
            score = 0.0
        delta = k * (score - exp)
        elo.ratings[m.home] = ra + delta
        elo.ratings[m.away] = rb - delta
    return elo
