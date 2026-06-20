"""Tests for the World Cup module: Elo, match model, tournament simulator."""

from __future__ import annotations

from datetime import datetime

from pitchlab.data.internationals import IntlMatch
from pitchlab.worldcup.config import load_config
from pitchlab.worldcup.elo import expected_score, fit_elo
from pitchlab.worldcup.match_model import match_probs
from pitchlab.worldcup.seed_elo import seed_ratings
from pitchlab.worldcup.tournament import simulate_tournament


def test_expected_score_monotonic():
    # stronger team has > 0.5 expectation
    assert expected_score(2000, 1500) > 0.5
    assert expected_score(1500, 2000) < 0.5
    assert abs(expected_score(1700, 1700) - 0.5) < 1e-9


def test_fit_elo_orders_teams():
    matches = [
        IntlMatch(datetime(2024, 1, 1), "Strong", "Weak", 3, 0, "Friendly", True),
        IntlMatch(datetime(2024, 2, 1), "Strong", "Weak", 2, 1, "Friendly", True),
        IntlMatch(datetime(2024, 3, 1), "Weak", "Strong", 0, 2, "Friendly", True),
    ]
    elo = fit_elo(matches)
    assert elo.get("Strong") > elo.get("Weak")


def test_match_probs_sum():
    elo = seed_ratings()
    p = match_probs(elo, "Brazil", "Haiti", neutral=True)
    assert abs(p["home"] + p["draw"] + p["away"] - 1.0) < 1e-6
    assert abs(p["over25"] + p["under25"] - 1.0) < 1e-6
    # strong favourite should be clear
    assert p["home"] > p["away"]


def test_tournament_runs_and_normalizes():
    cfg = load_config()  # illustrative sample
    elo = seed_ratings()
    res = simulate_tournament(cfg, elo, n_sims=300, seed=1)
    table = res.title_table(top=48)
    total_champ = sum(c for _, _, c in table)
    assert abs(total_champ - 1.0) < 1e-6  # exactly one champion per sim
    # every team advances with prob in [0, 1]
    for _team, adv, champ in table:
        assert 0.0 <= adv <= 1.0
        assert 0.0 <= champ <= 1.0
