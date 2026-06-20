"""Daily quant pipeline: shadow models + feedback snapshot (Phase 5 agent)."""

from __future__ import annotations

from pathlib import Path

from ..taskgraph import Context, Task, TaskGraph


def _get_config(ctx: Context) -> tuple[list[int], str]:
    import os
    source = ctx.get("source") or os.environ.get("DAILY_SOURCE") or "football-data"
    seasons_str = ctx.get("seasons") or os.environ.get("DAILY_SEASONS")
    if seasons_str:
        if isinstance(seasons_str, str):
            seasons = [int(s) for s in seasons_str.replace(",", " ").split()]
        else:
            seasons = [int(s) for s in seasons_str]
    else:
        seasons = [2022, 2023, 2024]
    return seasons, source


def _t_settle(ctx: Context):
    from ...feedback.clv_backfill import export_clv_backfill
    from ...feedback.settle import export_settlements

    out = Path(ctx.get("out", "../apps/web/public/data"))
    seasons, _ = _get_config(ctx)

    export_settlements(
        out,
        seasons,
        cache_dir=ctx.get("cache", ".cache"),
        merge_fixtures=True,
    )
    export_clv_backfill(out, seasons, cache_dir=ctx.get("cache", ".cache"))
    return {"settlements": str(out / "settlements.json"), "metrics_history": str(out / "metrics_history.json")}


def _t_shadow(ctx: Context):
    from ...league.export import TOP_LEAGUES
    from ...models.shadow import export_shadow_models

    out = Path(ctx.get("out", "../apps/web/public/data"))
    seasons, source = _get_config(ctx)
    leagues = TOP_LEAGUES if ctx.get("all_leagues", True) else (ctx.get("league", "E0"),)

    allow_auto_promote = ctx.get("allow_auto_promote", True)

    export_shadow_models(
        out,
        seasons,
        leagues=leagues,
        source=source,
        cache_dir=ctx.get("cache", ".cache"),
        holdout=ctx.get("holdout", 30),
        allow_auto_promote=allow_auto_promote,
    )
    return {"shadow_models": str(out / "shadow_models.json")}


def _t_league_export(ctx: Context):
    from ...league.export import TOP_LEAGUES, export_all_leagues

    out = Path(ctx.get("out", "../apps/web/public/data"))
    seasons, source = _get_config(ctx)
    leagues = TOP_LEAGUES if ctx.get("all_leagues", True) else (ctx.get("league", "E0"),)

    export_all_leagues(
        seasons,
        out,
        leagues=leagues,
        source=source,
        cache_dir=ctx.get("cache", ".cache"),
        holdout=ctx.get("holdout", 30),
    )
    return {"league_bundle": str(out / "league_bundle.json")}


def _t_feedback(ctx: Context):
    from ...feedback.export import export_feedback, export_weekly_digest

    out = Path(ctx.get("out", "../apps/web/public/data"))
    export_feedback(out)
    export_weekly_digest(out)
    return {"feedback": str(out)}


def daily_pipeline() -> TaskGraph:
    g = TaskGraph()
    g.add(Task("settle", _t_settle))
    g.add(Task("shadow_models", _t_shadow, deps=["settle"]))
    g.add(Task("league_export", _t_league_export, deps=["shadow_models"]))
    g.add(Task("feedback_snapshot", _t_feedback, deps=["shadow_models"]))
    return g


