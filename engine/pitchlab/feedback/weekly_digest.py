"""Weekly research digest for distribution (B content)."""

from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


def _read_json(path: Path) -> Any | None:
    if not path.exists():
        return None
    return json.loads(path.read_text(encoding="utf-8"))


def _pct(x: float | None) -> str:
    if x is None:
        return "n/a"
    return f"{x * 100:+.2f}%"


def _delta(cur: float | None, prev: float | None) -> float | None:
    if cur is None or prev is None:
        return None
    return cur - prev


def build_weekly_digest(data_dir: str | Path) -> dict:
    root = Path(data_dir)
    snap = _read_json(root / "feedback_snapshot.json") or {}
    history_raw = _read_json(root / "metrics_history.json")
    history: list[dict] = []
    if isinstance(history_raw, list):
        history = history_raw
    elif isinstance(history_raw, dict):
        history = history_raw.get("entries") or []

    latest = history[-1] if history else snap
    previous = history[-2] if len(history) >= 2 else None

    bt = snap.get("backtest_summary") or {}
    cur_clv = bt.get("avg_clv")
    prev_clv = (previous or {}).get("backtest_summary", {}).get("avg_clv")
    clv_delta = _delta(cur_clv, prev_clv)

    leagues = snap.get("leagues_clv") or []
    worst = (
        min(leagues, key=lambda r: r.get("avg_clv") if r.get("avg_clv") is not None else 0)
        if leagues
        else None
    )
    best = (
        max(leagues, key=lambda r: r.get("avg_clv") if r.get("avg_clv") is not None else -1)
        if leagues
        else None
    )

    cc = snap.get("champion_challenger") or {}
    agent = snap.get("agent") or {}
    verdict = snap.get("summary_verdict") or bt.get("verdict") or "No summary."

    now = datetime.now(timezone.utc)
    week_ending = now.strftime("%Y-%m-%d")

    headline = (
        f"Week ending {week_ending}: sample-out CLV {_pct(cur_clv)}"
        + (f" ({_pct(clv_delta)} vs prior run)" if clv_delta is not None else "")
        + ". Research only — not betting advice."
    )

    sections: list[dict] = [
        {
            "id": "summary",
            "title": "Executive summary",
            "bullets": [
                verdict[:280],
                f"Pipeline: {agent.get('pipeline', '—')} · ok={agent.get('ok')}",
            ],
        },
        {
            "id": "backtest",
            "title": "Walk-forward backtest",
            "metrics": {
                "avg_clv": cur_clv,
                "roi": bt.get("roi"),
                "brier": bt.get("brier"),
                "n_bets": bt.get("n_bets"),
                "clv_delta_vs_prior": clv_delta,
            },
        },
        {
            "id": "leagues",
            "title": "League CLV (snapshot)",
            "rows": leagues,
            "highlight": {
                "best_code": best.get("code") if best else None,
                "worst_code": worst.get("code") if worst else None,
            },
        },
        {
            "id": "champion_challenger",
            "title": "Champion vs challenger",
            "champion": cc.get("champion"),
            "challenger": cc.get("challenger"),
            "note": cc.get("note"),
        },
    ]

    lines = [
        f"# PitchLab Weekly Digest · {week_ending}",
        "",
        headline,
        "",
        "## Executive summary",
        "",
        f"- {verdict[:400]}",
        "",
        "## Walk-forward backtest",
        "",
        f"- Avg CLV: {_pct(cur_clv)}"
        + (f" (Δ {_pct(clv_delta)} vs prior pipeline run)" if clv_delta is not None else ""),
        f"- ROI (flat): {_pct(bt.get('roi'))}",
        f"- Brier: {bt.get('brier', 'n/a')}",
        f"- Bets: {bt.get('n_bets', 'n/a')}",
        "",
        "## League CLV",
        "",
    ]
    for row in leagues:
        code = row.get("code", "?")
        lines.append(f"- **{code}**: CLV {_pct(row.get('avg_clv'))} · Brier {row.get('brier', 'n/a')}")
    if best and worst:
        lines.extend(
            [
                "",
                f"_Best (least negative): {best.get('code')}_ · "
                f"_Weakest: {worst.get('code')}_",
            ]
        )
    lines.extend(
        [
            "",
            "## Champion / challenger",
            "",
            f"- Champion: {cc.get('champion', {}).get('label', '—')}",
            f"- Challenger: {cc.get('challenger', {}).get('label', '—')}",
            f"- Note: {cc.get('note', '')}",
            "",
            "---",
            "",
            "Full public metrics: /record · PitchLab research sandbox only.",
        ]
    )

    return {
        "generated_at": now.isoformat(),
        "week_ending": week_ending,
        "title": "PitchLab Weekly Research Digest",
        "headline": headline,
        "sections": sections,
        "body_markdown": "\n".join(lines),
        "share_paths": {"record": "/record", "weekly": "/weekly"},
    }
