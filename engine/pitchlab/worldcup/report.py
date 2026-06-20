"""Generate shareable prediction reports (the distribution deliverable).

Per-fixture 1X2 + O/U 2.5 probabilities and a most-likely-outcome call,
rendered as Markdown grouped by group/matchday. Compliance: probabilities and
analysis only — no "guaranteed win" language.
"""

from __future__ import annotations

from .elo import EloRatings
from .fixtures import Fixture
from .match_model import match_probs


def _call(probs: dict[str, float]) -> str:
    best = max(("home", "draw", "away"), key=lambda k: probs[k])
    label = {"home": "Home win", "draw": "Draw", "away": "Away win"}[best]
    return f"{label} ({probs[best] * 100:.0f}%)"


def fixture_line(elo: EloRatings, fx: Fixture) -> str:
    p = match_probs(elo, fx.home, fx.away, neutral=True)
    return (
        f"| {fx.home} vs {fx.away} | "
        f"{p['home'] * 100:.0f}% / {p['draw'] * 100:.0f}% / {p['away'] * 100:.0f}% | "
        f"{p['over25'] * 100:.0f}% | {_call(p)} |"
    )


def group_stage_report(elo: EloRatings, fixtures: list[Fixture], title: str) -> str:
    """Render a Markdown report for the group stage, grouped by group/matchday."""
    lines = [
        f"# {title} — Group Stage Predictions",
        "",
        "> Probabilities from PitchLab's international Elo model. "
        "For information/analysis only — not betting advice.",
        "",
    ]
    by_group: dict[str, list[Fixture]] = {}
    for fx in fixtures:
        by_group.setdefault(fx.group, []).append(fx)

    for group in sorted(by_group):
        lines.append(f"## Group {group}")
        lines.append("")
        for md in sorted({f.matchday for f in by_group[group]}):
            lines.append(f"### Matchday {md}")
            lines.append("")
            lines.append("| Match | H / D / A | Over 2.5 | Call |")
            lines.append("|---|---|---|---|")
            for fx in [f for f in by_group[group] if f.matchday == md]:
                lines.append(fixture_line(elo, fx))
            lines.append("")
    return "\n".join(lines)
