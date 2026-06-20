"""Monte Carlo simulator for the 2026 World Cup format.

Format: 12 groups of 4 -> top 2 of each group (24) + 8 best third-placed teams
-> Round of 32 -> R16 -> QF -> SF -> Final (104 matches total).

We simulate the whole tournament many times and tally each team's probability
of advancing from the group, reaching each knockout round, and winning the cup.

Simplification (documented): the official R32 bracket pairing is intricate; we
use strength reseeding each knockout round (strongest vs weakest among the
remaining qualifiers). This yields sensible advancement/title probabilities but
is not the exact official bracket path. Swap in the official mapping later.
"""

from __future__ import annotations

from collections import defaultdict
from dataclasses import dataclass, field
from itertools import combinations

import numpy as np

from .config import TournamentConfig
from .elo import EloRatings, expected_score
from .match_model import lambdas

_ROUNDS = ["r32", "r16", "qf", "sf", "final", "champion"]


@dataclass
class SimResult:
    n_sims: int
    advance: dict[str, int] = field(default_factory=lambda: defaultdict(int))
    rounds: dict[str, dict[str, int]] = field(
        default_factory=lambda: {r: defaultdict(int) for r in _ROUNDS}
    )

    def title_table(self, top: int = 16) -> list[tuple[str, float, float]]:
        """Return [(team, P(advance group), P(champion))] sorted by title prob."""
        teams = set(self.rounds["champion"]) | set(self.advance)
        rows = [
            (
                t,
                self.advance[t] / self.n_sims,
                self.rounds["champion"][t] / self.n_sims,
            )
            for t in teams
        ]
        rows.sort(key=lambda r: r[2], reverse=True)
        return rows[:top]

    def reach_prob(self, team: str, rnd: str) -> float:
        return self.rounds[rnd][team] / self.n_sims


def _sim_match_goals(elo: EloRatings, a: str, b: str, rng: np.random.Generator):
    lam_a, lam_b = lambdas(elo, a, b, neutral=True)
    return int(rng.poisson(lam_a)), int(rng.poisson(lam_b))


def _sim_knockout_winner(elo: EloRatings, a: str, b: str, rng: np.random.Generator) -> str:
    ga, gb = _sim_match_goals(elo, a, b, rng)
    if ga > gb:
        return a
    if gb > ga:
        return b
    # draw -> penalties, decided by Elo-weighted coin
    p_a = expected_score(elo.get(a), elo.get(b))
    return a if rng.random() < p_a else b


def _simulate_group(
    elo: EloRatings, teams: list[str], rng: np.random.Generator
) -> list[tuple[str, int, int, int]]:
    """Round-robin. Return ranked [(team, points, gd, gf)] best-first."""
    pts = dict.fromkeys(teams, 0)
    gd = dict.fromkeys(teams, 0)
    gf = dict.fromkeys(teams, 0)
    for a, b in combinations(teams, 2):
        ga, gb = _sim_match_goals(elo, a, b, rng)
        gf[a] += ga
        gf[b] += gb
        gd[a] += ga - gb
        gd[b] += gb - ga
        if ga > gb:
            pts[a] += 3
        elif gb > ga:
            pts[b] += 3
        else:
            pts[a] += 1
            pts[b] += 1
    ranked = sorted(
        teams,
        key=lambda t: (pts[t], gd[t], gf[t], rng.random()),
        reverse=True,
    )
    return [(t, pts[t], gd[t], gf[t]) for t in ranked]


def _knockout(elo: EloRatings, qualifiers: list[str], result: SimResult, rng) -> None:
    """Single-elimination with strength reseeding. Records round reached."""
    round_names = ["r32", "r16", "qf", "sf", "final"]
    field_ = list(qualifiers)
    for r in field_:
        result.rounds["r32"][r] += 1

    idx = 0
    while len(field_) > 1:
        rnd = round_names[idx] if idx < len(round_names) else "final"
        # reseed: strongest vs weakest
        field_.sort(key=lambda t: elo.get(t), reverse=True)
        n = len(field_)
        winners = []
        for i in range(n // 2):
            a = field_[i]
            b = field_[n - 1 - i]
            w = _sim_knockout_winner(elo, a, b, rng)
            winners.append(w)
        # record advancement to the *next* round
        next_idx = idx + 1
        next_round = round_names[next_idx] if next_idx < len(round_names) else "champion"
        for w in winners:
            result.rounds[next_round][w] += 1
        field_ = winners
        idx += 1
    # champion is recorded inside the loop when the last pair resolves
    # (next_round == "champion"); no post-loop increment to avoid double count.


def simulate_tournament(
    cfg: TournamentConfig,
    elo: EloRatings,
    n_sims: int = 10000,
    seed: int = 7,
) -> SimResult:
    cfg.validate()
    rng = np.random.default_rng(seed)
    result = SimResult(n_sims=n_sims)

    for _ in range(n_sims):
        group_winners: list[str] = []
        group_runners: list[str] = []
        thirds: list[tuple[str, int, int, int]] = []

        for _label, teams in cfg.groups.items():
            ranked = _simulate_group(elo, teams, rng)
            group_winners.append(ranked[0][0])
            group_runners.append(ranked[1][0])
            thirds.append(ranked[2])

        # 8 best third-placed teams
        thirds.sort(key=lambda x: (x[1], x[2], x[3], rng.random()), reverse=True)
        best_thirds = [t[0] for t in thirds[:8]]

        qualifiers = group_winners + group_runners + best_thirds  # 24 + 8 = 32
        for t in qualifiers:
            result.advance[t] += 1

        _knockout(elo, qualifiers, result, rng)

    return result
