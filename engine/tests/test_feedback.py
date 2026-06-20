"""Phase 3 feedback snapshot tests."""

import json
import tempfile
from pathlib import Path

from pitchlab.feedback.export import export_feedback


def test_feedback_snapshot_and_history():
    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp)
        (root / "backtest.json").write_text(
            json.dumps({"avg_clv": -0.05, "brier": 0.58, "n_bets": 10, "verdict": "no edge"}),
            encoding="utf-8",
        )
        export_feedback(root)
        assert (root / "feedback_snapshot.json").exists()
        hist = json.loads((root / "metrics_history.json").read_text(encoding="utf-8"))
        assert len(hist) == 1
        assert hist[0]["backtest_summary"]["avg_clv"] == -0.05
