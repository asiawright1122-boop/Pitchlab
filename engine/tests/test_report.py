"""Tests for fixtures generation and the prediction report."""

from __future__ import annotations

from pitchlab.worldcup.config import load_config
from pitchlab.worldcup.fixtures import group_stage_fixtures
from pitchlab.worldcup.report import group_stage_report
from pitchlab.worldcup.seed_elo import seed_ratings


def test_group_stage_fixtures_count():
    cfg = load_config()
    fixtures = group_stage_fixtures(cfg)
    # 12 groups * 6 matches = 72 group-stage matches
    assert len(fixtures) == 72
    # each team plays exactly 3 group games
    appearances: dict[str, int] = {}
    for fx in fixtures:
        appearances[fx.home] = appearances.get(fx.home, 0) + 1
        appearances[fx.away] = appearances.get(fx.away, 0) + 1
    assert all(v == 3 for v in appearances.values())


def test_report_renders_markdown():
    cfg = load_config()
    elo = seed_ratings()
    md = group_stage_report(elo, group_stage_fixtures(cfg), cfg.name)
    assert "Group Stage Predictions" in md
    assert "## Group A" in md
    assert "| Match |" in md
