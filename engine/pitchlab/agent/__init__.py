"""Lean domain orchestrator (the self-built "agent", D14).

Not a general-purpose agent runtime: a minimal, deterministic task graph that
chains the L1->L7 pipeline with idempotency, retries and a run-log. Designed to
be invoked once per schedule by system cron/launchd — no long-running daemon.
LLM nodes (if any) are bounded; the core stays deterministic and replayable.
"""
