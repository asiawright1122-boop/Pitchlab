"""L5 World Cup value view: model probabilities vs market odds -> +EV bets.

Two odds sources, same downstream pipeline:
  * live  — The Odds API head-to-head prices (needs THE_ODDS_API_KEY)
  * offline illustrative — synthetic soft-book odds derived by perturbing the
    model's own probabilities and adding a bookmaker margin, so the Value view
    is demonstrable with no network/key. Clearly flagged ``illustrative: true``.

For each fixture we compare the Elo->Poisson model probability against the
de-vigged market and flag selections where EV (model_prob * odds - 1) > 0.
"""

from __future__ import annotations

import json
import math
import random
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path

from ..odds.devig import devig_power
from ..strategy.value import find_value
from .config import TournamentConfig
from .elo import EloRatings
from .fixtures import group_stage_fixtures
from .match_model import match_probs

_SELECTIONS = ("home", "draw", "away")


@dataclass(frozen=True)
class FixtureOdds:
    """A fixture with the best available 1X2 decimal odds."""

    home: str
    away: str
    commence: str
    book: str
    odds_home: float
    odds_draw: float
    odds_away: float

    @property
    def odds(self) -> list[float]:
        return [self.odds_home, self.odds_draw, self.odds_away]


def best_odds_per_fixture(markets: list) -> list[FixtureOdds]:
    """Collapse per-book MarketOdds into best (highest) price per selection.

    ``markets`` is a list of ``theoddsapi.MarketOdds``. For a value bettor the
    best price is the *highest* decimal odds available across books for each
    selection (they may come from different books).
    """
    grouped: dict[tuple[str, str, str], list] = {}
    for m in markets:
        grouped.setdefault((m.home, m.away, m.commence), []).append(m)

    out: list[FixtureOdds] = []
    for (home, away, commence), books in grouped.items():
        best = {"home": None, "draw": None, "away": None}
        best_book = {"home": "", "draw": "", "away": ""}
        for b in books:
            for sel, price in (
                ("home", b.price_home),
                ("draw", b.price_draw),
                ("away", b.price_away),
            ):
                if price is None:
                    continue
                if best[sel] is None or price > best[sel]:
                    best[sel] = price
                    best_book[sel] = b.book
        if any(best[s] is None for s in _SELECTIONS):
            continue
        out.append(
            FixtureOdds(
                home=home,
                away=away,
                commence=commence,
                book=best_book["home"] or "n/a",
                odds_home=float(best["home"]),
                odds_draw=float(best["draw"]),
                odds_away=float(best["away"]),
            )
        )
    return out


def illustrative_odds(
    elo: EloRatings,
    cfg: TournamentConfig,
    *,
    vig: float = 0.05,
    noise: float = 0.10,
    seed: int = 7,
) -> list[FixtureOdds]:
    """Synthesize plausible soft-book odds offline.

    Market "true" probabilities = model probs perturbed *multiplicatively* in
    log space (lognormal noise), so the market disagrees with the model by a
    realistic few percent while keeping the odds structure sane. A bookmaker
    margin is then applied. Some selections end up +EV for the model — exactly
    what the Value view shows, without the extreme odds that additive noise on
    small probabilities would produce.
    """
    rng = random.Random(seed)
    out: list[FixtureOdds] = []
    for fx in group_stage_fixtures(cfg):
        p = match_probs(elo, fx.home, fx.away, neutral=True)
        base = [p["home"], p["draw"], p["away"]]
        perturbed = [x * math.exp(rng.gauss(0.0, noise)) for x in base]
        s = sum(perturbed)
        market_true = [x / s for x in perturbed]
        # apply margin: inflate each implied prob, then odds = 1 / inflated.
        # clamp to >= 1.01 (books never price a decimal below this).
        odds = [round(max(1.01, 1.0 / (mt * (1.0 + vig))), 2) for mt in market_true]
        out.append(
            FixtureOdds(
                home=fx.home,
                away=fx.away,
                commence="",
                book="illustrative",
                odds_home=odds[0],
                odds_draw=odds[1],
                odds_away=odds[2],
            )
        )
    return out


def _fixture_value(
    elo: EloRatings, fo: FixtureOdds, min_edge: float
) -> dict:
    p = match_probs(elo, fo.home, fo.away, neutral=True)
    model = [p["home"], p["draw"], p["away"]]
    fair = devig_power(fo.odds)
    bets = find_value(list(_SELECTIONS), model, fo.odds, min_edge=min_edge)
    value_bets = [
        {
            "selection": vb.selection,
            "odds": round(vb.odds, 2),
            "model_prob": round(vb.model_prob, 4),
            "fair_prob": round(fair[_SELECTIONS.index(vb.selection)], 4),
            "edge": round(vb.edge, 4),
            "ev": round(vb.ev, 4),
        }
        for vb in bets
    ]
    return {
        "home": fo.home,
        "away": fo.away,
        "commence": fo.commence,
        "book": fo.book,
        "model": {s: round(model[i], 4) for i, s in enumerate(_SELECTIONS)},
        "odds": {s: round(fo.odds[i], 2) for i, s in enumerate(_SELECTIONS)},
        "fair": {s: round(fair[i], 4) for i, s in enumerate(_SELECTIONS)},
        "value_bets": value_bets,
        "best": value_bets[0] if value_bets else None,
    }


def build_value_report(
    elo: EloRatings,
    fixtures: list[FixtureOdds],
    *,
    illustrative: bool,
    source: str,
    sport: str,
    min_edge: float = 0.0,
) -> dict:
    rows = [_fixture_value(elo, fo, min_edge) for fo in fixtures]
    # surface the juiciest bets first; fixtures with no value go last
    rows.sort(key=lambda r: (r["best"]["ev"] if r["best"] else -1.0), reverse=True)
    n_value = sum(1 for r in rows if r["best"])
    return {
        "illustrative": illustrative,
        "source": source,
        "sport": sport,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "min_edge": min_edge,
        "n_fixtures": len(rows),
        "n_value_bets": n_value,
        "disclaimer": (
            "Model-vs-market expected value for analysis only. Not betting advice. "
            "+EV here is relative to soft-book prices and does not imply real profit."
        ),
        "fixtures": rows,
    }


def export_value(report: dict, out_dir: str | Path) -> Path:
    out = Path(out_dir)
    out.mkdir(parents=True, exist_ok=True)
    dest = out / "value.json"
    dest.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    return dest
