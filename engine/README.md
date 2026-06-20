# PitchLab Engine — Phase 0 Truth Machine

Deterministic, backtestable football probability engine. Fits a **Dixon-Coles**
model, derives **all markets** (1X2 / O-U / AH / BTTS) from one score matrix,
de-vigs the sharp closing line, and measures **out-of-sample CLV / Brier / ROI**
via a walk-forward backtest.

> Goal: answer "is there any edge?" cheaply before building product.
> Go/No-Go: a niche with out-of-sample **avg CLV ≥ +2%** signals genuine edge.

## Install

```bash
python -m venv .venv && source .venv/bin/activate
pip install -e .          # add ".[dev]" for pytest
```

## Run

```bash
# offline: synthetic data, full pipeline
pitchlab backtest --source mock

# real data (downloads football-data.co.uk, incl. Pinnacle closing odds)
pitchlab download --league E0 --seasons 2021 2022 2023
pitchlab backtest --source football-data --league E0 --seasons 2021 2022 2023
```

### World Cup 2026 (distribution / demo module)

```bash
# Monte Carlo tournament sim (title + advancement probabilities)
pitchlab worldcup --sims 20000

# predict a single match
pitchlab worldcup --match --home Brazil --away Haiti

# fit Elo from real martj42 history (needs network) + official groups
pitchlab worldcup --fit --config path/to/official_groups.json
```

> ⚠️ The bundled groups are an **illustrative sample**, not the official 2026
> draw. The simulator uses **strength reseeding** each knockout round (a
> documented simplification that inflates top seeds); swap in the official
> bracket mapping for fidelity. The World Cup is the most efficient market — this
> module is for distribution/demo/calibration, **not** an edge play.

## Layout

```text
pitchlab/
├── data/       footballdata.py (download/parse) · mock.py · schema.py
├── models/     dixon_coles.py  (MLE fit + score matrix)
├── markets/    derive.py       (matrix -> 1X2/O-U/AH/BTTS)
├── odds/       devig.py        (multiplicative / power de-vig)
├── metrics/    clv.py · brier.py · roi.py
├── backtest/   harness.py      (walk-forward, no look-ahead)
└── cli.py
```

## Tests

```bash
pytest -q
```

## Notes
- **No look-ahead**: the backtest only trains on matches strictly before each prediction.
- CLV benchmarked against **de-vigged Pinnacle closing** (PSCH/PSCD/PSCA columns).
- LLMs are intentionally absent here — the probability core must stay deterministic.
