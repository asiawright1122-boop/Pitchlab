"""Phase 2 league Elo + holdout predict (mock data)."""

from pitchlab.data import mock
from pitchlab.league.elo import fit_league_elo
from pitchlab.league.predict import predict_holdout


def test_league_elo_and_holdout():
    matches = mock.generate_matches(n_teams=12, n_seasons=2, seed=1)
    elo = fit_league_elo(matches)
    assert len(elo.ratings) >= 12
    rows, monitor = predict_holdout(matches, holdout=10)
    assert len(rows) >= 5
    assert monitor.get("brier") is not None
