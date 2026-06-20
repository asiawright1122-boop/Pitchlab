"""Shadow auto-promotion gates (off by default until CLV + calibration criteria met)."""

from __future__ import annotations

import json
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any

PNL_THRESHOLD = 0.0
BRIER_MARGIN = 0.002
PNL_LOOKBACK_DAYS = 90
MIN_PNL_SNAPSHOTS = 7


def _parse_ts(iso: str | None) -> datetime | None:
    if not iso:
        return None
    try:
        return datetime.fromisoformat(iso.replace("Z", "+00:00"))
    except ValueError:
        return None


def pnl_gate_from_history(history: list[dict], *, days: int = PNL_LOOKBACK_DAYS) -> tuple[bool, str]:
    """Require enough recent snapshots with avg_clv (or avg_pnl) >= 0.0."""
    cutoff = datetime.now(timezone.utc) - timedelta(days=days)
    samples: list[float] = []
    for entry in history:
        ts = _parse_ts(entry.get("generated_at"))
        if ts and ts < cutoff:
            continue
        summary = entry.get("backtest_summary") or {}
        pnl = summary.get("avg_clv")
        if pnl is None:
            pnl = summary.get("avg_pnl")
        if pnl is not None:
            samples.append(float(pnl))

    if len(samples) < MIN_PNL_SNAPSHOTS:
        return (
            False,
            f"CLV gate: need {MIN_PNL_SNAPSHOTS}+ snapshots in {days}d (have {len(samples)})",
        )
    if not all(s >= PNL_THRESHOLD for s in samples):
        worst = min(samples)
        return False, f"Negative CLV detected: {worst:.2f}"
    return True, "OK"


def brier_gate(champion_brier: float | None, challenger_brier: float | None) -> tuple[bool, str]:
    if champion_brier is None or challenger_brier is None:
        return False, "Brier gate: missing hold-out metrics"
    if challenger_brier < champion_brier - BRIER_MARGIN:
        return (
            True,
            f"Brier gate: challenger {challenger_brier:.4f} < champion {champion_brier:.4f}",
        )
    return (
        False,
        f"Brier gate: challenger {challenger_brier:.4f} not better than {champion_brier:.4f}",
    )


ECE_MARGIN = 0.02


def ece_gate(champion_ece: float | None, challenger_ece: float | None) -> tuple[bool, str]:
    if champion_ece is None or challenger_ece is None:
        return True, "ECE gate: OK (missing metrics, bypassed)"
    if challenger_ece <= champion_ece + ECE_MARGIN:
        return (
            True,
            f"ECE gate: OK (challenger ECE {challenger_ece:.4f} <= champion {champion_ece:.4f} + {ECE_MARGIN})",
        )
    return (
        False,
        f"ECE gate: blocked (challenger ECE {challenger_ece:.4f} > champion {champion_ece:.4f} + {ECE_MARGIN})",
    )


def _best_challenger_brier(league_row: dict) -> float | None:
    candidates: list[float] = []
    ch = (league_row.get("challenger") or {}).get("monitor") or {}
    if ch.get("brier") is not None:
        candidates.append(float(ch["brier"]))
    
    beta = (league_row.get("challenger_beta") or {}).get("monitor") or {}
    if beta.get("brier") is not None:
        candidates.append(float(beta["brier"]))

    for key in ("shadow_ml_gbm", "shadow_ml_logreg", "shadow_ml", "shadow_ml_residual"):
        ml = league_row.get(key) or {}
        mon = ml.get("monitor") or {}
        if ml.get("status") == "ok" and mon.get("brier") is not None:
            candidates.append(float(mon["brier"]))
    return min(candidates) if candidates else None


def _best_challenger_id(league_row: dict) -> str | None:
    best_id = None
    best_b = 999.0

    ch = league_row.get("challenger") or {}
    if ch.get("monitor", {}).get("brier") is not None:
        best_b = float(ch["monitor"]["brier"])
        best_id = ch.get("id") or "dc-raw-v0.1"

    beta = league_row.get("challenger_beta") or {}
    if beta.get("monitor", {}).get("brier") is not None:
        b = float(beta["monitor"]["brier"])
        if b < best_b:
            best_b = b
            best_id = beta.get("id") or "dc-beta-calibrated-v0.1"

    for key in ("shadow_ml_gbm", "shadow_ml_logreg", "shadow_ml", "shadow_ml_residual"):
        ml = league_row.get(key) or {}
        mon = ml.get("monitor") or {}
        if ml.get("status") == "ok" and mon.get("brier") is not None:
            b = float(mon["brier"])
            if b < best_b:
                best_b = b
                best_id = ml.get("id")

    return best_id


def _get_challenger_ece(league_row: dict, model_id: str | None) -> float | None:
    if not model_id:
        return None
    ch = league_row.get("challenger") or {}
    if ch.get("id") == model_id:
        return ch.get("monitor", {}).get("ece")
    beta = league_row.get("challenger_beta") or {}
    if beta.get("id") == model_id:
        return beta.get("monitor", {}).get("ece")
    for key in ("shadow_ml_gbm", "shadow_ml_logreg", "shadow_ml", "shadow_ml_residual"):
        ml = league_row.get(key) or {}
        if ml.get("id") == model_id:
            return ml.get("monitor", {}).get("ece")
    return None


def evaluate_promotion(
    data_dir: Path | None,
    e0_row: dict | None,
    *,
    allow_auto_promote: bool,
) -> dict[str, Any]:
    history: list[dict] = []
    if data_dir:
        path = data_dir / "metrics_history.json"
        if path.exists():
            raw = json.loads(path.read_text(encoding="utf-8"))
            history = raw if isinstance(raw, list) else raw.get("entries") or []

    pnl_ok, pnl_msg = pnl_gate_from_history(history)
    champ_b = (e0_row or {}).get("champion", {}).get("monitor", {}).get("brier")
    champ_ece = (e0_row or {}).get("champion", {}).get("monitor", {}).get("ece")
    
    best_ch = _best_challenger_brier(e0_row or {})
    best_ch_id = _best_challenger_id(e0_row or {})
    best_ch_ece = _get_challenger_ece(e0_row or {}, best_ch_id)

    brier_ok, brier_msg = brier_gate(
        float(champ_b) if champ_b is not None else None,
        best_ch,
    )
    
    ece_ok, ece_msg = ece_gate(
        float(champ_ece) if champ_ece is not None else None,
        float(best_ch_ece) if best_ch_ece is not None else None,
    )

    eligible = pnl_ok and brier_ok and ece_ok
    auto = allow_auto_promote and eligible

    return {
        "auto_promote": auto,
        "promotion_eligible": eligible,
        "promoted_model_id": best_ch_id if eligible else None,
        "gates": {
            "clv": {"ok": pnl_ok, "detail": pnl_msg},
            "pnl": {"ok": pnl_ok, "detail": pnl_msg},
            "brier": {"ok": brier_ok, "detail": brier_msg},
            "ece": {"ok": ece_ok, "detail": ece_msg},
        },
        "promote_if": (
            f"avg_clv >= {PNL_THRESHOLD} for {PNL_LOOKBACK_DAYS}d "
            f"({MIN_PNL_SNAPSHOTS}+ snapshots) AND best challenger Brier beats champion "
            f"AND ECE <= champion ECE + {ECE_MARGIN}"
        ),
        "reason": (
            "Auto-promote ENABLED — gates passed."
            if auto
            else (
                "Auto-promote armed but gates not met."
                if allow_auto_promote
                else "Auto-promote disabled (pass --auto-promote to arm)."
            )
        ),
    }


