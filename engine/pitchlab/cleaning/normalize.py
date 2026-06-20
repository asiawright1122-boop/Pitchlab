"""Apply the name registry to Match records and flag low-confidence rows."""

from __future__ import annotations

from dataclasses import dataclass, replace

from ..data.schema import Match
from .names import NameRegistry


@dataclass
class NormalizationReport:
    n_matches: int
    n_low_confidence: int          # at least one team not in the registry
    unmapped: set[str]             # distinct unknown team names

    @property
    def coverage(self) -> float:
        if self.n_matches == 0:
            return 1.0
        return 1.0 - self.n_low_confidence / self.n_matches


def normalize_matches(
    matches: list[Match], registry: NameRegistry
) -> tuple[list[Match], NormalizationReport]:
    """Canonicalize home/away names; report rows with unknown teams."""
    cleaned: list[Match] = []
    unmapped: set[str] = set()
    low = 0
    for m in matches:
        home_known = registry.is_known(m.home)
        away_known = registry.is_known(m.away)
        if not home_known:
            unmapped.add(m.home)
        if not away_known:
            unmapped.add(m.away)
        if not (home_known and away_known):
            low += 1
        cleaned.append(
            replace(m, home=registry.canonical(m.home), away=registry.canonical(m.away))
        )
    report = NormalizationReport(
        n_matches=len(matches), n_low_confidence=low, unmapped=unmapped
    )
    return cleaned, report
