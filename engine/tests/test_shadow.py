"""Phase 5 shadow model export."""

import json
from pathlib import Path
from pitchlab.models.shadow import SHADOW_POLICY, compare_shadow


def test_shadow_mock_league():
    row = compare_shadow("E0", [2022, 2023], source="mock", holdout=10, mock_teams=12)
    assert row["champion"]["monitor"]["brier"] is not None
    assert row["challenger"]["monitor"]["brier"] is not None
    assert row.get("shadow_ml_gbm") is not None
    assert row.get("shadow_ml_logreg") is not None
    assert row.get("shadow_ml_residual") is not None
    assert SHADOW_POLICY["auto_promote"] is False


def test_export_league_auto_promote_trigger(tmp_path):
    from pitchlab.league.export import export_league

    shadow_payload = {
        "policy": {
            "auto_promote": True,
            "promoted_model_id": "dc-raw-v0.1"
        }
    }
    shadow_file = tmp_path / "shadow_models.json"
    shadow_file.write_text(json.dumps(shadow_payload), encoding="utf-8")

    res = export_league(
        "E0", [2022, 2023], tmp_path,
        source="mock", holdout=10, mock_teams=12
    )

    assert res["model_version"] == "dc-raw-v0.1"
    assert "no calibration" in res["model"]

    preds_file = tmp_path / "league_predictions.json"
    preds_data = json.loads(preds_file.read_text(encoding="utf-8"))
    assert preds_data["model_version"] == "dc-raw-v0.1"

