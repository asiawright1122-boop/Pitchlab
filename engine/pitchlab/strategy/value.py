"""L5 — value detection: model probability vs the de-vigged market.

A "value" (positive expected value, +EV) bet exists when our model's
probability for a selection exceeds the price-implied probability. We benchmark
the *fair* market probability by de-vigging the (ideally sharp) odds.
"""

from __future__ import annotations

from dataclasses import dataclass

from ..odds.devig import devig_power


def expected_value(model_prob: float, decimal_odds: float) -> float:
    """EV per 1 unit staked: model_prob * (odds - 1) - (1 - model_prob)."""
    return model_prob * decimal_odds - 1.0


@dataclass
class ValueBet:
    selection: str
    model_prob: float
    odds: float
    fair_market_prob: float
    edge: float          # model_prob - price_implied_prob
    ev: float            # expected value per unit

    @property
    def is_value(self) -> bool:
        return self.ev > 0


def find_value(
    selections: list[str],
    model_probs: list[float],
    market_odds: list[float],
    min_edge: float = 0.0,
) -> list[ValueBet]:
    """Compare model vs market for one market's selections.

    ``market_odds`` should be the full set for the market (so we can de-vig).
    Returns ValueBets that clear ``min_edge`` (edge = model - price-implied),
    sorted by EV descending.
    """
    fair = devig_power(market_odds)
    out: list[ValueBet] = []
    for sel, mp, odds, fmp in zip(selections, model_probs, market_odds, fair):
        implied = 1.0 / odds
        edge = mp - implied
        if edge > min_edge:
            out.append(
                ValueBet(
                    selection=sel,
                    model_prob=mp,
                    odds=odds,
                    fair_market_prob=fmp,
                    edge=edge,
                    ev=expected_value(mp, odds),
                )
            )
    out.sort(key=lambda v: v.ev, reverse=True)
    return out
