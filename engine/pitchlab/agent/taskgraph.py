"""Minimal deterministic task graph.

Tasks declare dependencies; the graph runs them in topological order, with
optional idempotent skip, bounded retries, shared context, and a run-log. If a
task fails (after retries), its dependents are skipped, not silently run.
"""

from __future__ import annotations

import time
import uuid
from dataclasses import dataclass, field
from typing import Any, Callable

from .runlog import RunLogger, TaskRecord


class Context:
    """Shared state passed to every task: results store + arbitrary config."""

    def __init__(self, **config: Any) -> None:
        self.config: dict[str, Any] = dict(config)
        self.results: dict[str, Any] = {}

    def get(self, key: str, default: Any = None) -> Any:
        return self.config.get(key, default)


@dataclass
class Task:
    name: str
    run: Callable[[Context], Any]
    deps: list[str] = field(default_factory=list)
    retries: int = 1
    skip_if: Callable[[Context], bool] | None = None


class TaskGraph:
    def __init__(self) -> None:
        self._tasks: dict[str, Task] = {}
        self.last_run_id: str | None = None
        self.last_records: list[dict[str, Any]] = []  # {task, status, ms}

    def add(self, task: Task) -> "TaskGraph":
        if task.name in self._tasks:
            raise ValueError(f"duplicate task: {task.name}")
        self._tasks[task.name] = task
        return self

    def _topo_order(self) -> list[str]:
        # Kahn's algorithm
        indeg = {n: 0 for n in self._tasks}
        for t in self._tasks.values():
            for d in t.deps:
                if d not in self._tasks:
                    raise ValueError(f"task {t.name!r} depends on unknown task {d!r}")
                indeg[t.name] += 1
        queue = sorted([n for n, d in indeg.items() if d == 0])
        order: list[str] = []
        while queue:
            n = queue.pop(0)
            order.append(n)
            for t in self._tasks.values():
                if n in t.deps:
                    indeg[t.name] -= 1
                    if indeg[t.name] == 0:
                        queue.append(t.name)
            queue.sort()
        if len(order) != len(self._tasks):
            raise ValueError("cycle detected in task graph")
        return order

    def run(self, ctx: Context, logger: RunLogger | None = None) -> dict[str, str]:
        run_id = uuid.uuid4().hex[:12]
        statuses: dict[str, str] = {}
        records: list[dict[str, Any]] = []
        for name in self._topo_order():
            task = self._tasks[name]
            # skip if any dependency failed/skipped
            if any(statuses.get(d) not in ("ok", "skipped") for d in task.deps):
                statuses[name] = "blocked"
                records.append({"task": name, "status": "blocked", "ms": 0})
                _emit(logger, run_id, name, "failed", 0, "dependency not satisfied")
                continue
            if task.skip_if and task.skip_if(ctx):
                statuses[name] = "skipped"
                records.append({"task": name, "status": "skipped", "ms": 0})
                _emit(logger, run_id, name, "skipped", 0, None)
                continue
            status, err, ms = _run_with_retries(task, ctx)
            statuses[name] = status
            records.append({"task": name, "status": status, "ms": ms})
            _emit(logger, run_id, name, status, ms, err)
        self.last_run_id = run_id
        self.last_records = records
        return statuses


def _run_with_retries(task: Task, ctx: Context) -> tuple[str, str | None, int]:
    last_err: str | None = None
    start = time.perf_counter()
    for _attempt in range(max(1, task.retries)):
        try:
            ctx.results[task.name] = task.run(ctx)
            return "ok", None, int((time.perf_counter() - start) * 1000)
        except Exception as e:  # noqa: BLE001 - record and retry
            last_err = f"{type(e).__name__}: {e}"
    return "failed", last_err, int((time.perf_counter() - start) * 1000)


def _emit(
    logger: RunLogger | None, run_id: str, task: str, status: str, ms: int, err: str | None
) -> None:
    if logger is None:
        return
    logger.log(
        TaskRecord(run_id=run_id, task=task, status=status, elapsed_ms=ms, ts=RunLogger.now_iso(), error=err)
    )
