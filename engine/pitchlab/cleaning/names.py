"""Canonical name normalization and registry.

Normalization key: NFKD accent-strip, lowercase, drop punctuation, collapse
whitespace, and remove common club affixes (fc, afc, cf, sc...). The registry
maps any alias to its canonical name, and suggests close matches for unknowns.
"""

from __future__ import annotations

import json
import re
import unicodedata
from dataclasses import dataclass, field
from difflib import get_close_matches
from pathlib import Path

# affixes that carry no identity for matching (kept out of the key)
_AFFIXES = {"fc", "afc", "cf", "sc", "ac", "ss", "ssc", "as", "rc", "cd", "ud", "fk"}


def normalize_key(name: str) -> str:
    """Aggressive normalization used only for *matching* (not display)."""
    s = unicodedata.normalize("NFKD", str(name))
    s = "".join(c for c in s if not unicodedata.combining(c))
    s = s.lower()
    s = re.sub(r"[^a-z0-9\s]", " ", s)
    tokens = [t for t in s.split() if t and t not in _AFFIXES]
    return " ".join(tokens)


@dataclass
class ResolveResult:
    canonical: str
    known: bool
    suggestion: str | None = None


@dataclass
class NameRegistry:
    # display canonical name -> set of alias display strings (for export)
    canonicals: dict[str, list[str]] = field(default_factory=dict)
    # normalized key -> canonical display name
    _key_to_canonical: dict[str, str] = field(default_factory=dict)

    def register(self, canonical: str, aliases: list[str] | None = None) -> None:
        self.canonicals.setdefault(canonical, [])
        self._key_to_canonical[normalize_key(canonical)] = canonical
        for a in aliases or []:
            if a not in self.canonicals[canonical]:
                self.canonicals[canonical].append(a)
            self._key_to_canonical[normalize_key(a)] = canonical

    def resolve(self, name: str, fuzzy: bool = True) -> ResolveResult:
        key = normalize_key(name)
        if key in self._key_to_canonical:
            return ResolveResult(self._key_to_canonical[key], True)
        if fuzzy:
            match = get_close_matches(key, list(self._key_to_canonical.keys()), n=1, cutoff=0.88)
            if match:
                return ResolveResult(name, False, suggestion=self._key_to_canonical[match[0]])
        return ResolveResult(name, False)

    def canonical(self, name: str) -> str:
        """Best-effort canonical name (falls back to the input if unknown)."""
        return self.resolve(name, fuzzy=False).canonical

    def is_known(self, name: str) -> bool:
        return normalize_key(name) in self._key_to_canonical

    # --- persistence (the accumulating moat) ---
    def to_json(self, path: str | Path) -> None:
        Path(path).write_text(
            json.dumps(self.canonicals, ensure_ascii=False, indent=2), encoding="utf-8"
        )

    def merge_json(self, path: str | Path) -> None:
        """Merge aliases from a JSON file into this registry in-place."""
        p = Path(path)
        if not p.exists():
            return
        try:
            data = json.loads(p.read_text(encoding="utf-8"))
            if isinstance(data, dict):
                for canonical, aliases in data.items():
                    self.register(canonical, aliases)
        except Exception as e:
            print(f"[cleaning] Error merging registry {path}: {e}")

    @classmethod
    def from_dict(cls, data: dict[str, list[str]]) -> "NameRegistry":
        reg = cls()
        for canonical, aliases in data.items():
            reg.register(canonical, aliases)
        return reg

    @classmethod
    def from_json(cls, path: str | Path) -> "NameRegistry":
        p = Path(path)
        if not p.exists():
            return cls()
        try:
            return cls.from_dict(json.loads(p.read_text(encoding="utf-8")))
        except Exception as e:
            print(f"[cleaning] Error loading registry {path}: {e}")
            return cls()
