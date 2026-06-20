"""Tests for fixture export (Phase 1)."""

from pitchlab.data.fixtures_export import build_fixtures_payload, fixtures_from_config
from pitchlab.worldcup.config import load_config


def test_offline_fixtures_count():
    cfg = load_config(None)
    rows = fixtures_from_config(cfg)
    # 12 groups × 6 matches per group (4-team round robin)
    assert len(rows) == 72
    assert rows[0]["id"]
    assert rows[0]["home"] and rows[0]["away"]


def test_build_payload_illustrative_flag():
    payload = build_fixtures_payload(config_path=None)
    assert payload["competition"] == "WC"
    assert len(payload["fixtures"]) == 72
    assert "illustrative" in payload
