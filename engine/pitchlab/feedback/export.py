"""Export feedback artifacts for web / worker."""

from __future__ import annotations

import json
from pathlib import Path

from .snapshot import append_metrics_history, build_feedback_snapshot
from .weekly_digest import build_weekly_digest


def export_feedback(data_dir: str | Path) -> Path:
    root = Path(data_dir)
    root.mkdir(parents=True, exist_ok=True)

    snap = build_feedback_snapshot(root)
    (root / "feedback_snapshot.json").write_text(
        json.dumps(snap, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    append_metrics_history(root, snap)
    return root


def export_weekly_digest(data_dir: str | Path) -> Path:
    root = Path(data_dir)
    root.mkdir(parents=True, exist_ok=True)
    digest = build_weekly_digest(root)
    (root / "weekly_digest.json").write_text(
        json.dumps(digest, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    return root
