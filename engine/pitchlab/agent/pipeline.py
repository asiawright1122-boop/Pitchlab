"""Concrete pipelines wired from the L1-L7 modules.

World Cup daily pipeline (offline-capable):
    load_config -> build_elo -> simulate -> export_json -> report

Each task is small, deterministic and idempotent-friendly. Real deployments
would swap seed Elo / sample groups for fitted Elo / official groups via config.
"""

from __future__ import annotations

from pathlib import Path

from ..worldcup import seed_elo
from ..worldcup.config import load_config
from ..worldcup.export import export_all
from ..worldcup.fixtures import group_stage_fixtures
from ..worldcup.report import group_stage_report
from .taskgraph import Context, Task, TaskGraph


def _t_load_config(ctx: Context):
    cfg = load_config(ctx.get("config"))
    ctx.results["_cfg"] = cfg
    return {"name": cfg.name, "groups": len(cfg.groups), "illustrative": cfg.illustrative}


def _t_build_elo(ctx: Context):
    # offline: seed ratings; real: fit from martj42 when ctx['fit'] is set
    if ctx.get("fit"):
        from ..data import internationals
        from ..worldcup.elo import fit_elo

        matches = internationals.load_results(cache_dir=ctx.get("cache", ".cache"))
        elo = fit_elo(matches)
    else:
        elo = seed_elo.seed_ratings()
    ctx.results["_elo"] = elo
    return {"teams_rated": len(elo.ratings)}


def _t_simulate_and_export(ctx: Context):
    cfg = ctx.results["_cfg"]
    elo = ctx.results["_elo"]
    out = Path(ctx.get("out", "out"))
    export_all(cfg, elo, out, n_sims=ctx.get("sims", 10000), seed=ctx.get("seed", 7))
    return {"export_dir": str(out)}


def _t_report(ctx: Context):
    cfg = ctx.results["_cfg"]
    elo = ctx.results["_elo"]
    out = Path(ctx.get("out", "out"))
    md = group_stage_report(elo, group_stage_fixtures(cfg), cfg.name)
    dest = out / "group_stage_report.md"
    dest.write_text(md, encoding="utf-8")
    return {"report": str(dest)}


def worldcup_pipeline() -> TaskGraph:
    g = TaskGraph()
    g.add(Task("load_config", _t_load_config))
    g.add(Task("build_elo", _t_build_elo))
    g.add(Task("simulate_export", _t_simulate_and_export, deps=["load_config", "build_elo"]))
    g.add(Task("report", _t_report, deps=["load_config", "build_elo"]))
    return g


def _load_daily_pipeline():
    from .pipelines.daily import daily_pipeline

    return daily_pipeline()


PIPELINES = {
    "worldcup": worldcup_pipeline,
    "daily": _load_daily_pipeline,
}
