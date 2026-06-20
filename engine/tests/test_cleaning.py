"""Tests for the L2 name-cleaning layer."""

from __future__ import annotations

from datetime import datetime

from pitchlab.cleaning.names import NameRegistry, normalize_key
from pitchlab.cleaning.normalize import normalize_matches
from pitchlab.cleaning.seed_aliases import seed_registry
from pitchlab.data.schema import Match


def test_normalize_key_strips_accents_and_affixes():
    assert normalize_key("Türkiye") == "turkiye"
    assert normalize_key("Atlético Madrid") == "atletico madrid"
    assert normalize_key("Manchester United FC") == "manchester united"


def test_alias_resolves_to_canonical():
    reg = seed_registry()
    assert reg.canonical("Man Utd") == "Manchester United"
    assert reg.canonical("Türkiye") == "Turkey"
    assert reg.canonical("Korea Republic") == "South Korea"
    assert reg.canonical("PSG") == "Paris Saint-Germain"


def test_unknown_returns_input_and_suggestion():
    reg = seed_registry()
    assert reg.is_known("Some Random FC") is False
    # near-miss should suggest the canonical
    res = reg.resolve("Manchester Unitd")  # typo
    assert res.known is False
    assert res.suggestion == "Manchester United"


def test_json_round_trip(tmp_path):
    reg = seed_registry()
    p = tmp_path / "reg.json"
    reg.to_json(p)
    reg2 = NameRegistry.from_json(p)
    assert reg2.canonical("Man City") == "Manchester City"


def test_normalize_matches_reports_coverage():
    reg = seed_registry()
    matches = [
        Match("WC", datetime(2026, 6, 11), "Türkiye", "USA", 1, 1),
        Match("WC", datetime(2026, 6, 12), "Atlantis", "Wakanda", 0, 0),
    ]
    cleaned, report = normalize_matches(matches, reg)
    assert cleaned[0].home == "Turkey"
    assert cleaned[0].away == "United States"
    assert report.n_low_confidence == 1
    assert "Atlantis" in report.unmapped
    assert 0.0 <= report.coverage <= 1.0
