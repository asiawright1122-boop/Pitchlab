"""International-football Elo ratings.

A World-Football-Elo-style updater (eloratings.net inspired): expected result
from the rating difference + home advantage, updated with a K-factor scaled by
match importance and margin of victory. Run chronologically over the martj42
history to obtain current ratings.

These ratings feed the match model (Elo diff -> expected goals -> score matrix).
"""

from __future__ import annotations

from dataclasses import dataclass, field

from ..data.internationals import IntlMatch

HOME_ADVANTAGE = 100.0  # Elo points for a true (non-neutral) home side
DEFAULT_RATING = 1500.0

# K-factor by tournament importance (eloratings.net style weights)
_IMPORTANCE = {
    "FIFA World Cup": 60,
    "FIFA World Cup qualification": 40,
    "UEFA Euro": 50,
    "UEFA Euro qualification": 40,
    "Copa América": 50,
    "African Cup of Nations": 40,
    "AFC Asian Cup": 40,
    "UEFA Nations League": 40,
    "Confederations Cup": 45,
    "Friendly": 20,
}
_DEFAULT_K = 30


def _k_factor(tournament: str) -> float:
    for key, val in _IMPORTANCE.items():
        if key.lower() in tournament.lower():
            return float(val)
    return float(_DEFAULT_K)


def _margin_multiplier(goal_diff: int) -> float:
    """eloratings.net margin-of-victory multiplier."""
    g = abs(goal_diff)
    if g <= 1:
        return 1.0
    if g == 2:
        return 1.5
    return (11.0 + g) / 8.0


def expected_score(rating_a: float, rating_b: float, home_adv: float = 0.0) -> float:
    """Probability-like expected result for A (1 win / 0.5 draw / 0 loss)."""
    diff = rating_b - (rating_a + home_adv)
    return 1.0 / (1.0 + 10 ** (diff / 400.0))


@dataclass
class EloRatings:
    ratings: dict[str, float] = field(default_factory=dict)

    def get(self, team: str) -> float:
        return self.ratings.get(team, DEFAULT_RATING)

    def set(self, team: str, value: float) -> None:
        self.ratings[team] = value

    def top(self, n: int = 20) -> list[tuple[str, float]]:
        return sorted(self.ratings.items(), key=lambda kv: kv[1], reverse=True)[:n]


def fit_elo(matches: list[IntlMatch], since_year: int | None = None) -> EloRatings:
    """Run Elo chronologically over historical international matches."""
    elo = EloRatings()
    ordered = sorted(matches, key=lambda m: m.date)
    for m in ordered:
        if since_year and m.date.year < since_year:
            # still update so ratings carry forward, but skip very old noise if asked
            pass
        ra = elo.get(m.home)
        rb = elo.get(m.away)
        home_adv = 0.0 if m.neutral else HOME_ADVANTAGE

        exp_a = expected_score(ra, rb, home_adv)
        if m.home_score > m.away_score:
            score_a = 1.0
        elif m.home_score < m.away_score:
            score_a = 0.0
        else:
            score_a = 0.5

        k = _k_factor(m.tournament) * _margin_multiplier(m.home_score - m.away_score)
        delta = k * (score_a - exp_a)
        elo.set(m.home, ra + delta)
        elo.set(m.away, rb - delta)
    return elo
