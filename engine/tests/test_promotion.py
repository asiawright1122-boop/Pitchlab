"""Shadow promotion gates."""

import json
from pathlib import Path
from pitchlab.models.promotion import brier_gate, pnl_gate_from_history, evaluate_promotion, _best_challenger_id


def test_brier_gate_pass():
    ok, _ = brier_gate(0.62, 0.60)
    assert ok


def test_pnl_gate_insufficient_history():
    ok, msg = pnl_gate_from_history(
        [{"generated_at": "2026-06-01T00:00:00+00:00", "backtest_summary": {"avg_pnl": 50}}]
    )
    assert not ok
    assert "need" in msg.lower()


def test_pnl_gate_pass():
    ok, msg = pnl_gate_from_history(
        [{"generated_at": f"2026-06-0{i}T00:00:00+00:00", "backtest_summary": {"avg_pnl": 100}} for i in range(1, 9)]
    )
    assert ok
    assert msg == "OK"

def test_pnl_gate_fail():
    ok, msg = pnl_gate_from_history(
        [{"generated_at": f"2026-06-0{i}T00:00:00+00:00", "backtest_summary": {"avg_pnl": -50}} for i in range(1, 9)]
    )
    assert not ok
    assert "Negative CLV" in msg


def test_best_challenger_id():
    league_row = {
        "challenger": {"id": "dc-raw-v0.1", "monitor": {"brier": 0.6083}},
        "shadow_ml_logreg": {"id": "logreg-elo-v0", "status": "ok", "monitor": {"brier": 0.5998}},
        "shadow_ml_gbm": {"id": "gbm-elo-v0", "status": "ok", "monitor": {"brier": 0.6210}},
    }
    assert _best_challenger_id(league_row) == "logreg-elo-v0"


def test_evaluate_promotion_with_id(tmp_path):
    history_file = tmp_path / "metrics_history.json"
    history = [{"generated_at": "2026-06-01T00:00:00Z", "backtest_summary": {"avg_pnl": 100}} for _ in range(8)]
    history_file.write_text(json.dumps(history), encoding="utf-8")

    e0_row = {
        "champion": {"id": "dc-isotonic-v0.1", "monitor": {"brier": 0.6299}},
        "challenger": {"id": "dc-raw-v0.1", "monitor": {"brier": 0.6083}},
    }
    res = evaluate_promotion(tmp_path, e0_row, allow_auto_promote=True)
    assert res["auto_promote"] is True
    assert res["promoted_model_id"] == "dc-raw-v0.1"


def test_export_shadow_models_persists_config(tmp_path):
    from pitchlab.models.shadow import export_shadow_models

    # Setup metrics history
    history_file = tmp_path / "metrics_history.json"
    history = [{"generated_at": "2026-06-01T00:00:00Z", "backtest_summary": {"avg_pnl": 100}} for _ in range(8)]
    history_file.write_text(json.dumps(history), encoding="utf-8")

    # Run export with mock source so compare_shadow runs quickly
    export_shadow_models(
        tmp_path,
        seasons=[2022, 2023],
        leagues=("E0",),
        source="mock",
        holdout=30,
        allow_auto_promote=True,
    )

    # Since E0 has mock challenger and champion, check if config is persisted
    shadow_file = tmp_path / "shadow_models.json"
    assert shadow_file.exists()

    shadow_data = json.loads(shadow_file.read_text(encoding="utf-8"))
    auto_p = shadow_data.get("policy", {}).get("auto_promote")
    assert auto_p is True
    assert shadow_data.get("policy", {}).get("promoted_model_id") is not None


def test_export_league_reads_config(tmp_path):
    from pitchlab.league.export import export_league

    # Write a dummy config file indicating active auto-promote
    config_file = tmp_path / "pipeline_config.json"
    config_data = {
        "auto_promote": True,
        "promoted_model_id": "dc-raw-v0.1"
    }
    config_file.write_text(json.dumps(config_data), encoding="utf-8")

    res = export_league(
        "E0",
        [2022, 2023],
        tmp_path,
        source="mock",
        holdout=30,
        calibrate=True # Should be overridden to False by config
    )

    assert res["model_version"] == "dc-raw-v0.1"
    assert "no calibration" in res["model"].lower()


def test_ece_gate_passes_promotion(tmp_path):
    # Champion ECE = 0.04, Challenger ECE = 0.05 (margin 0.02, so 0.05 <= 0.04 + 0.02, OK)
    history_file = tmp_path / "metrics_history.json"
    history = [{"generated_at": "2026-06-01T00:00:00Z", "backtest_summary": {"avg_pnl": 100}} for _ in range(8)]
    history_file.write_text(json.dumps(history), encoding="utf-8")

    e0_row = {
        "champion": {"id": "dc-isotonic-v0.1", "monitor": {"brier": 0.6299, "ece": 0.04}},
        "challenger": {"id": "dc-raw-v0.1", "monitor": {"brier": 0.6083, "ece": 0.05}},
    }
    res = evaluate_promotion(tmp_path, e0_row, allow_auto_promote=True)
    assert res["auto_promote"] is True
    assert res["gates"]["ece"]["ok"] is True
    assert res["promoted_model_id"] == "dc-raw-v0.1"


def test_ece_gate_blocks_promotion(tmp_path):
    # Champion ECE = 0.03, Challenger ECE = 0.06 (margin 0.02, so 0.06 > 0.03 + 0.02, BLOCKED)
    history_file = tmp_path / "metrics_history.json"
    history = [{"generated_at": "2026-06-01T00:00:00Z", "backtest_summary": {"avg_pnl": 100}} for _ in range(8)]
    history_file.write_text(json.dumps(history), encoding="utf-8")

    e0_row = {
        "champion": {"id": "dc-isotonic-v0.1", "monitor": {"brier": 0.6299, "ece": 0.03}},
        "challenger": {"id": "dc-raw-v0.1", "monitor": {"brier": 0.6083, "ece": 0.06}},
    }
    res = evaluate_promotion(tmp_path, e0_row, allow_auto_promote=True)
    assert res["auto_promote"] is False
    assert res["gates"]["ece"]["ok"] is False
    assert "blocked" in res["gates"]["ece"]["detail"].lower()
    assert res["promoted_model_id"] is None


