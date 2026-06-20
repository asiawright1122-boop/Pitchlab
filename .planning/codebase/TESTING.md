# Testing Patterns

**Analysis Date:** 2026-06-09

## Test Framework

**Python Engine:**
- **Runner:** `pytest` (v9.0.3)
- **Configuration:** Managed inside `engine/pyproject.toml` under `[project.optional-dependencies] dev = ["pytest>=7.4"]`.
- **Match Patterns:** Tests are matching files starting with `test_` under `engine/tests/`.

**Run Commands:**
```bash
# Run all python tests
cd engine && .venv/bin/pytest

# Run tests in a specific file
cd engine && .venv/bin/pytest tests/test_promotion.py

# Run a specific test case
cd engine && .venv/bin/pytest tests/test_promotion.py -k "test_evaluate_promotion"
```

## Test File Organization

**Location:**
- Python tests live in a dedicated `engine/tests/` directory separate from `engine/pitchlab/` package.
- File naming format: `test_[module].py`.

**Structure:**
```
engine/
├── pitchlab/             # Application source code
└── tests/                # Test suite
    ├── test_agent.py
    ├── test_calibration.py
    ├── test_dixon_coles.py
    ├── test_promotion.py
    └── ...
```

## Test Structure

**Suite Organization:**
- Uses pytest function style.
- Uses pytest fixtures to setup reusable test objects (e.g., list of matches, mock filesystem paths, config dicts).

**Example:**
```python
def test_evaluate_promotion_pnl_gate_fails(tmp_path):
    # Arrange
    metrics_history = {
        "entries": [
            {"generated_at": "2026-06-01T00:00:00Z", "backtest_summary": {"avg_pnl": -0.05}}
        ]
    }
    history_file = tmp_path / "metrics_history.json"
    history_file.write_text(json.dumps(metrics_history))

    e0_row = {
        "champion": {"monitor": {"brier": 0.220}},
        "challenger": {"monitor": {"brier": 0.215}},
    }

    # Act
    res = evaluate_promotion(tmp_path, e0_row, allow_auto_promote=True)

    # Assert
    assert res["auto_promote"] is False
    assert res["gates"]["pnl"]["ok"] is False
```

## Mocking & Fixtures

**Data Fixtures:**
- Mock matches generation helper (`pitchlab/data/mock.py`) is used to generate synthetic matches datasets for testing ELO calculations and Dixon-Coles calibration.
- Temporary files and directories are managed using pytest's built-in `tmp_path` fixture.

**Third-Party APIs:**
- Mocking is utilized for football-data.org HTTP calls and database sync logic where network is normally required.
