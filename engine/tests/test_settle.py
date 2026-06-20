"""Settlement / backfill from football-data (offline cache)."""

import json
import tempfile
from pathlib import Path

from pitchlab.feedback.settle import export_settlements, merge_into_fixtures_file


def test_export_settlements_uses_cache():
    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp)
        # requires engine/.cache in real repo; skip if no cache
        cache = Path(__file__).resolve().parents[1] / ".cache"
        if not (cache / "E0_2324.csv").exists():
            return
        export_settlements(root, [2023, 2024], leagues=("E0",), cache_dir=str(cache))
        data = json.loads((root / "settlements.json").read_text(encoding="utf-8"))
        assert data["n_updates"] > 100
        assert data["updates"][0]["home_goals"] is not None


def test_merge_fixtures_file():
    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp)
        (root / "fixtures.json").write_text(
            json.dumps(
                {
                    "fixtures": [
                        {
                            "id": "wc-a-1-team1-team2",
                            "league": "WC",
                            "home": "A",
                            "away": "B",
                            "status": "scheduled",
                        }
                    ]
                }
            ),
            encoding="utf-8",
        )
        n = merge_into_fixtures_file(
            root,
            [
                {
                    "id": "wc-a-1-team1-team2",
                    "home_goals": 2,
                    "away_goals": 1,
                    "result_1x2": "H",
                }
            ],
        )
        assert n == 1
        fx = json.loads((root / "fixtures.json").read_text())["fixtures"][0]
        assert fx["status"] == "finished"
        assert fx["home_goals"] == 2
