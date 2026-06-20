"""Weekly digest builder (offline)."""

import json
from pathlib import Path

from pitchlab.feedback.weekly_digest import build_weekly_digest


def test_build_weekly_digest(tmp_path: Path):
    snap = {
        "backtest_summary": {
            "avg_clv": -0.05,
            "roi": -0.1,
            "brier": 0.58,
            "n_bets": 100,
            "verdict": "no edge",
        },
        "leagues_clv": [{"code": "E0", "avg_clv": -0.08, "brier": 0.59}],
        "summary_verdict": "Test verdict",
        "agent": {"pipeline": "worldcup", "ok": True},
        "champion_challenger": {"champion": {"label": "CLV"}, "challenger": {"label": "Brier"}, "note": "trend only"},
    }
    (tmp_path / "feedback_snapshot.json").write_text(json.dumps(snap), encoding="utf-8")
    (tmp_path / "metrics_history.json").write_text("[]", encoding="utf-8")

    out = build_weekly_digest(tmp_path)
    assert out["week_ending"]
    assert "body_markdown" in out
    assert "# PitchLab Weekly Digest" in out["body_markdown"]
    assert len(out["sections"]) >= 3
