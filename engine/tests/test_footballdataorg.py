"""football-data.org adapter helpers (offline)."""

from unittest.mock import patch
from pitchlab.data.footballdataorg import _full_time_goals, _map_status, fetch_fixtures, API_CODE_MAP


def test_map_status_finished():
    assert _map_status("FINISHED") == "finished"
    assert _map_status("IN_PLAY") == "live"


def test_full_time_goals():
    m = {"score": {"fullTime": {"home": 2, "away": 1}}}
    assert _full_time_goals(m) == (2, 1)


def test_api_code_map():
    assert API_CODE_MAP["E0"] == "PL"
    assert API_CODE_MAP["WC"] == "WC"


@patch("pitchlab.data.footballdataorg.requests.get")
def test_fetch_fixtures_leagues(mock_get):
    mock_get.return_value.json.return_value = {"matches": []}
    mock_get.return_value.status_code = 200

    res = fetch_fixtures("E0", token="fake")
    assert res == []

    args, kwargs = mock_get.call_args
    assert "PL/matches" in args[0]
    assert kwargs["headers"]["X-Auth-Token"] == "fake"

