"""Tests for the lean orchestrator (task graph + pipeline)."""

from __future__ import annotations

import json

from pitchlab.agent.pipeline import worldcup_pipeline
from pitchlab.agent.runlog import RunLogger
from pitchlab.agent.taskgraph import Context, Task, TaskGraph


def test_topological_order_and_results():
    order_seen: list[str] = []

    def make(name):
        def fn(ctx: Context):
            order_seen.append(name)
            return name
        return fn

    g = TaskGraph()
    g.add(Task("a", make("a")))
    g.add(Task("b", make("b"), deps=["a"]))
    g.add(Task("c", make("c"), deps=["b"]))
    statuses = g.run(Context())
    assert statuses == {"a": "ok", "b": "ok", "c": "ok"}
    assert order_seen == ["a", "b", "c"]


def test_failure_blocks_dependents():
    g = TaskGraph()
    g.add(Task("a", lambda ctx: (_ for _ in ()).throw(RuntimeError("boom")), retries=1))
    g.add(Task("b", lambda ctx: 1, deps=["a"]))
    statuses = g.run(Context())
    assert statuses["a"] == "failed"
    assert statuses["b"] == "blocked"


def test_skip_if():
    g = TaskGraph()
    g.add(Task("a", lambda ctx: 1, skip_if=lambda ctx: True))
    statuses = g.run(Context())
    assert statuses["a"] == "skipped"


def test_cycle_detected():
    g = TaskGraph()
    g.add(Task("a", lambda ctx: 1, deps=["b"]))
    g.add(Task("b", lambda ctx: 1, deps=["a"]))
    try:
        g.run(Context())
        assert False, "expected cycle error"
    except ValueError as e:
        assert "cycle" in str(e)


def test_worldcup_pipeline_runs(tmp_path):
    g = worldcup_pipeline()
    out = tmp_path / "out"
    ctx = Context(config=None, out=str(out), sims=200, seed=1, fit=False, cache=".cache")
    logger = RunLogger(out / "runlog.jsonl")
    statuses = g.run(ctx, logger=logger)
    assert all(s == "ok" for s in statuses.values())
    assert (out / "title_odds.json").exists()
    assert (out / "group_stage_report.md").exists()
    # run-log written with records
    lines = (out / "runlog.jsonl").read_text().strip().splitlines()
    assert len(lines) == 4
    assert all(json.loads(li)["status"] == "ok" for li in lines)
