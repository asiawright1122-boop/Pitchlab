"""Tests for the World Cup value view: model-vs-market +EV detection."""

from __future__ import annotations

from pitchlab.worldcup.config import load_config
from pitchlab.worldcup.match_model import match_probs
from pitchlab.worldcup.seed_elo import seed_ratings
from pitchlab.worldcup.value_export import (
    FixtureOdds,
    best_odds_per_fixture,
    build_value_report,
    illustrative_odds,
)


class _MarketOdds:
    """Stand-in for theoddsapi.MarketOdds (duck-typed)."""

    def __init__(self, home, away, commence, book, ph, pd, pa):
        self.home = home
        self.away = away
        self.commence = commence
        self.book = book
        self.price_home = ph
        self.price_draw = pd
        self.price_away = pa


def test_best_odds_picks_highest_per_selection():
    markets = [
        _MarketOdds("A", "B", "t1", "Book1", 2.0, 3.0, 4.0),
        _MarketOdds("A", "B", "t1", "Book2", 2.5, 3.2, 3.5),
    ]
    fixtures = best_odds_per_fixture(markets)
    assert len(fixtures) == 1
    fo = fixtures[0]
    # best (highest) price per selection, possibly across books
    assert fo.odds_home == 2.5
    assert fo.odds_draw == 3.2
    assert fo.odds_away == 4.0


def test_best_odds_drops_incomplete_markets():
    markets = [_MarketOdds("A", "B", "t1", "Book1", 2.0, None, 4.0)]
    assert best_odds_per_fixture(markets) == []


def test_illustrative_odds_are_sane():
    elo = seed_ratings()
    cfg = load_config()
    fixtures = illustrative_odds(elo, cfg, seed=1)
    assert len(fixtures) > 0
    for fo in fixtures:
        # decimal odds must be > 1 and within a plausible range
        for o in fo.odds:
            assert o > 1.0
            assert o < 1000.0


def test_value_report_flags_positive_ev():
    elo = seed_ratings()
    # craft a fixture where the away price is generous vs the model
    p = match_probs(elo, "Brazil", "Haiti", neutral=True)
    # model strongly favours Brazil; give Brazil very generous odds -> +EV
    generous_home = 1.0 / max(p["home"] - 0.10, 0.01)
    fo = FixtureOdds("Brazil", "Haiti", "", "Book", generous_home, 6.0, 12.0)
    report = build_value_report(
        elo, [fo], illustrative=False, source="test", sport="x", min_edge=0.0
    )
    assert report["n_fixtures"] == 1
    row = report["fixtures"][0]
    # home is +EV because the price implies a lower prob than the model
    assert row["best"] is not None
    assert row["best"]["selection"] == "home"
    assert row["best"]["ev"] > 0


def test_value_report_sorted_by_ev():
    elo = seed_ratings()
    cfg = load_config()
    fixtures = illustrative_odds(elo, cfg, seed=7)
    report = build_value_report(
        elo, fixtures, illustrative=True, source="ill", sport="wc", min_edge=0.0
    )
    evs = [r["best"]["ev"] for r in report["fixtures"] if r["best"]]
    assert evs == sorted(evs, reverse=True)
    # probabilities in each row are normalized model probs
    for r in report["fixtures"]:
        s = r["model"]["home"] + r["model"]["draw"] + r["model"]["away"]
        assert abs(s - 1.0) < 1e-3
