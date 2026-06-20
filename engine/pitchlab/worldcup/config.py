"""Tournament configuration: group composition loaded from JSON (data-driven).

We never hard-code the official 2026 draw in logic — groups come from a config
file so the real draw (from FIFA / football-data.org) can be dropped in. A
clearly-labelled *illustrative* sample ships for offline runs.
"""

from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path

SAMPLE_CONFIG = Path(__file__).parent / "sample_groups.json"


@dataclass
class TournamentConfig:
    name: str
    groups: dict[str, list[str]]   # group label -> 4 team names
    illustrative: bool = False

    def all_teams(self) -> list[str]:
        return [t for teams in self.groups.values() for t in teams]

    def validate(self) -> None:
        if len(self.groups) != 12:
            raise ValueError(f"Expected 12 groups, got {len(self.groups)}")
        for label, teams in self.groups.items():
            if len(teams) != 4:
                raise ValueError(f"Group {label} must have 4 teams, got {len(teams)}")


def load_config(path: str | Path | None = None) -> TournamentConfig:
    p = Path(path) if path else SAMPLE_CONFIG
    data = json.loads(Path(p).read_text(encoding="utf-8"))
    cfg = TournamentConfig(
        name=data.get("name", "World Cup 2026"),
        groups=data["groups"],
        illustrative=bool(data.get("illustrative", False)),
    )
    cfg.validate()
    return cfg
