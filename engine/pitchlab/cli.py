"""PitchLab Phase 0 CLI.

Examples:
    pitchlab backtest --source mock
    pitchlab download --league E0 --seasons 2021 2022 2023
    pitchlab backtest --source football-data --league E0 --seasons 2021 2022 2023
"""

from __future__ import annotations

import argparse
import sys

from .backtest.harness import BacktestConfig, run_backtest
from .data import footballdata, mock
from .worldcup import seed_elo
from .worldcup.config import load_config
from .worldcup.match_model import match_probs
from .worldcup.tournament import simulate_tournament


def _cmd_download(args: argparse.Namespace) -> int:
    for year in args.seasons:
        path = footballdata.download_csv(args.league, year, cache_dir=args.cache)
        print(f"downloaded {args.league} {footballdata.season_code(year)} -> {path}")
    return 0


def _cmd_backtest(args: argparse.Namespace) -> int:
    if args.source == "mock":
        matches = mock.generate_matches(
            n_teams=args.teams, n_seasons=args.mock_seasons, seed=args.seed
        )
        print(f"[mock] generated {len(matches)} matches")
    else:
        if not args.seasons:
            print("error: --seasons required for football-data source", file=sys.stderr)
            return 2
        matches = footballdata.load_league(args.league, args.seasons, cache_dir=args.cache)
        print(f"[football-data] loaded {len(matches)} matches for {args.league}")

    cfg = BacktestConfig(
        min_train=args.min_train,
        refit_every=args.refit_every,
        edge_threshold=args.edge,
        calibrate=args.calibrate,
    )
    report = run_backtest(matches, cfg)
    print(report.summary())

    if args.export_json:
        import json
        from pathlib import Path

        src = args.source if args.source == "mock" else f"{args.source}:{args.league}"
        out = Path(args.export_json)
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_text(
            json.dumps(report.to_dict(source=src), ensure_ascii=False, indent=2),
            encoding="utf-8",
        )
        print(f"[backtest] exported track record -> {out}")
    return 0


def _build_elo(args: argparse.Namespace):
    """Seed Elo offline, or fit from martj42 history when --fit is set."""
    if getattr(args, "fit", False):
        from .data import internationals
        from .worldcup.elo import fit_elo

        matches = internationals.load_results(cache_dir=args.cache)
        print(f"[worldcup] fitting Elo on {len(matches)} international matches")
        return fit_elo(matches)
    print("[worldcup] using offline seed Elo ratings (approximate)")
    return seed_elo.seed_ratings()


def _cmd_worldcup(args: argparse.Namespace) -> int:
    elo = _build_elo(args)

    if args.match:
        if not args.home or not args.away:
            print("error: --home and --away required with --match", file=sys.stderr)
            return 2
        probs = match_probs(elo, args.home, args.away, neutral=not args.home_field)
        print(f"\n{args.home} vs {args.away}  (Elo {elo.get(args.home):.0f} vs {elo.get(args.away):.0f})")
        print(f"  Home win : {probs['home'] * 100:5.1f}%")
        print(f"  Draw     : {probs['draw'] * 100:5.1f}%")
        print(f"  Away win : {probs['away'] * 100:5.1f}%")
        print(f"  Over 2.5 : {probs['over25'] * 100:5.1f}%   Under 2.5: {probs['under25'] * 100:5.1f}%")
        return 0

    cfg = load_config(args.config)
    if cfg.illustrative:
        print("⚠️  using ILLUSTRATIVE sample groups — not the official 2026 draw")

    if args.export_json:
        from .worldcup.export import export_all

        out = export_all(cfg, elo, args.export_json, n_sims=args.sims, seed=args.seed)
        print(f"[worldcup] exported meta/title_odds/predictions JSON -> {out}")
        return 0

    if args.report:
        from .worldcup.fixtures import group_stage_fixtures
        from .worldcup.report import group_stage_report

        fixtures = group_stage_fixtures(cfg)
        md = group_stage_report(elo, fixtures, cfg.name)
        if args.out:
            from pathlib import Path

            Path(args.out).write_text(md, encoding="utf-8")
            print(f"[worldcup] wrote group-stage report ({len(fixtures)} fixtures) -> {args.out}")
        else:
            print(md)
        return 0

    print(f"[worldcup] simulating '{cfg.name}' x{args.sims} ...")
    res = simulate_tournament(cfg, elo, n_sims=args.sims, seed=args.seed)

    print("\n" + "=" * 60)
    print(f"  {cfg.name} — Monte Carlo ({args.sims} sims)")
    print("=" * 60)
    print(f"  {'Team':<26}{'Advance':>9}{'Champion':>10}")
    print("-" * 60)
    for team, adv, champ in res.title_table(top=args.top):
        print(f"  {team:<26}{adv * 100:>8.1f}%{champ * 100:>9.1f}%")
    print("=" * 60)
    return 0


def _cmd_value(args: argparse.Namespace) -> int:
    """Model-vs-market +EV view. Live via The Odds API, or offline illustrative."""
    from .worldcup import value_export
    from .worldcup.config import load_config

    elo = _build_elo(args)
    cfg = load_config(args.config)

    use_live = not args.illustrative and (
        args.token or __import__("os").environ.get("THE_ODDS_API_KEY")
    )
    if use_live:
        from .data import theoddsapi

        markets = theoddsapi.fetch_h2h(
            sport=args.sport, regions=args.regions, token=args.token
        )
        fixtures = value_export.best_odds_per_fixture(markets)
        source = f"the-odds-api:{args.sport} ({args.regions}, best of book)"
        illustrative = False
        print(f"[value] fetched {len(markets)} book quotes -> {len(fixtures)} fixtures")
    else:
        fixtures = value_export.illustrative_odds(elo, cfg, seed=args.seed)
        source = "illustrative (synthetic soft-book odds)"
        illustrative = True
        print(f"[value] generated {len(fixtures)} illustrative fixtures (no key/--illustrative)")

    report = value_export.build_value_report(
        elo,
        fixtures,
        illustrative=illustrative,
        source=source,
        sport=args.sport,
        min_edge=args.min_edge,
    )
    print(
        f"[value] {report['n_value_bets']}/{report['n_fixtures']} fixtures show +EV "
        f"(min_edge={args.min_edge})"
    )
    for r in report["fixtures"][:8]:
        if not r["best"]:
            continue
        b = r["best"]
        print(
            f"   {r['home']:<14} vs {r['away']:<14}  {b['selection']:<5} "
            f"@{b['odds']:.2f}  EV {b['ev'] * 100:+5.1f}%  edge {b['edge'] * 100:+5.1f}%"
        )

    if args.export_json:
        dest = value_export.export_value(report, args.export_json)
        print(f"[value] exported -> {dest}")
    return 0


def _cmd_settle(args: argparse.Namespace) -> int:
    from pathlib import Path

    from .feedback.settle import export_settlements

    if not args.seasons:
        print("error: --seasons required", file=sys.stderr)
        return 2
    out = Path(args.export_json) if args.export_json else Path("../apps/web/public/data")
    export_settlements(
        out,
        args.seasons,
        cache_dir=args.cache,
        merge_fixtures=not args.no_merge_fixtures,
    )
    print(f"[settle] fetched results -> {out / 'settlements.json'}")
    if getattr(args, "with_clv", False):
        from .feedback.clv_backfill import export_clv_backfill

        export_clv_backfill(out, args.seasons, cache_dir=args.cache)
        print(f"[settle] CLV backfill -> {out / 'clv_backfill.json'}")
        print(f"[settle] odds snapshots -> {out / 'odds_snapshots.json'}")
    return 0


def _cmd_feedback(args: argparse.Namespace) -> int:
    from pathlib import Path

    from .feedback.export import export_feedback, export_weekly_digest

    out = Path(args.export_json) if args.export_json else Path("../apps/web/public/data")
    if args.feedback_action == "snapshot":
        export_feedback(out)
        print(f"[feedback] snapshot + metrics_history -> {out}")
        return 0
    if args.feedback_action == "weekly":
        export_weekly_digest(out)
        print(f"[feedback] weekly_digest.json -> {out}")
        return 0
    print("error: unknown feedback action", file=sys.stderr)
    return 2


def _cmd_league(args: argparse.Namespace) -> int:
    from pathlib import Path

    if args.league_action != "export":
        print("error: unknown league action", file=sys.stderr)
        return 2
    if not args.seasons:
        print("error: --seasons required", file=sys.stderr)
        return 2
    out = Path(args.export_json) if args.export_json else Path(".")

    from .league.export import export_all_leagues, export_league

    if getattr(args, "all_leagues", False):
        export_all_leagues(
            args.seasons,
            out,
            source=args.source,
            cache_dir=args.cache,
            holdout=args.holdout,
            mock_teams=args.teams,
            calibrate=not args.no_calibrate,
        )
        print(f"[league] exported all TOP leagues + league_bundle.json -> {out}")
    else:
        export_league(
            args.league,
            args.seasons,
            out,
            source=args.source,
            cache_dir=args.cache,
            holdout=args.holdout,
            mock_teams=args.teams,
            calibrate=not args.no_calibrate,
        )
        print(f"[league] exported elo + predictions + metrics_monitor -> {out}")
    return 0


def _cmd_models_shadow(args: argparse.Namespace) -> int:
    from pathlib import Path

    from .league.export import TOP_LEAGUES
    from .models.shadow import export_shadow_models

    if args.models_action != "shadow":
        print("error: unknown models action", file=sys.stderr)
        return 2
    out = Path(args.export_json)
    leagues = TOP_LEAGUES if getattr(args, "all_leagues", False) else (args.league,)
    export_shadow_models(
        out,
        args.seasons,
        leagues=leagues,
        source=args.source,
        cache_dir=args.cache,
        holdout=args.holdout,
        allow_auto_promote=getattr(args, "auto_promote", False),
    )
    ap = " (auto-promote armed)" if getattr(args, "auto_promote", False) else ""
    print(f"[models] shadow champion/challenger{ap} -> {out / 'shadow_models.json'}")
    return 0


def _cmd_fixtures(args: argparse.Namespace) -> int:
    import json
    from pathlib import Path

    from .data.fixtures_export import build_fixtures_payload

    payload = build_fixtures_payload(
        config_path=args.config,
        live=args.live,
        competition_code=args.league,
        token=args.token,
    )
    print(
        f"[fixtures] {len(payload['fixtures'])} matches "
        f"({payload['source']}, illustrative={payload['illustrative']})"
    )

    if args.export_json:
        out = Path(args.export_json)
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
        print(f"[fixtures] exported -> {out}")
    return 0


def _cmd_agent(args: argparse.Namespace) -> int:
    from .agent.pipeline import PIPELINES
    from .agent.runlog import RunLogger
    from .agent.taskgraph import Context

    if args.pipeline not in PIPELINES:
        print(f"error: unknown pipeline {args.pipeline!r}", file=sys.stderr)
        return 2
    graph = PIPELINES[args.pipeline]()
    ctx = Context(
        config=args.config, out=args.out, sims=args.sims, seed=args.seed,
        fit=args.fit, cache=args.cache,
    )
    logger = RunLogger(args.run_log)
    print(f"[agent] running pipeline '{args.pipeline}' -> out={args.out}")
    statuses = graph.run(ctx, logger=logger)
    print("[agent] task statuses:")
    for task, status in statuses.items():
        mark = {"ok": "✓", "skipped": "·", "failed": "✗", "blocked": "✗"}.get(status, "?")
        print(f"   {mark} {task}: {status}")
    ok = all(s in ("ok", "skipped") for s in statuses.values())

    # write a status summary for the dashboard's System page
    import json
    from datetime import datetime, timezone
    from pathlib import Path

    status_path = Path(args.out) / "status.json"
    status_path.parent.mkdir(parents=True, exist_ok=True)
    status_path.write_text(
        json.dumps(
            {
                "pipeline": args.pipeline,
                "run_id": graph.last_run_id,
                "ok": ok,
                "generated_at": datetime.now(timezone.utc).isoformat(),
                "tasks": graph.last_records,
            },
            ensure_ascii=False,
            indent=2,
        ),
        encoding="utf-8",
    )
    print(f"[agent] run-log -> {args.run_log}  ·  status -> {status_path}")

    if getattr(args, "sync_web", None):
        import shutil

        web_dir = Path(args.sync_web)
        web_dir.mkdir(parents=True, exist_ok=True)
        dest = web_dir / "status.json"
        if status_path.resolve() != dest.resolve():
            shutil.copy2(status_path, dest)
            print(f"[agent] synced status -> {dest}")
        else:
            print(f"[agent] status already at {dest}")

    return 0 if ok else 1


def build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(prog="pitchlab", description="PitchLab Phase 0 truth machine")
    sub = p.add_subparsers(dest="command", required=True)

    d = sub.add_parser("download", help="download football-data.co.uk CSVs")
    d.add_argument("--league", default="E0", help="league code, e.g. E0, D1, SP1")
    d.add_argument("--seasons", type=int, nargs="+", required=True,
                   help="season start years, e.g. 2021 2022 2023")
    d.add_argument("--cache", default=".cache")
    d.set_defaults(func=_cmd_download)

    b = sub.add_parser("backtest", help="run a walk-forward backtest")
    b.add_argument("--source", choices=["mock", "football-data"], default="mock")
    b.add_argument("--league", default="E0")
    b.add_argument("--seasons", type=int, nargs="*", default=[])
    b.add_argument("--cache", default=".cache")
    b.add_argument("--min-train", dest="min_train", type=int, default=200)
    b.add_argument("--refit-every", dest="refit_every", type=int, default=20)
    b.add_argument("--edge", type=float, default=0.02, help="value-bet edge threshold")
    b.add_argument("--export-json", dest="export_json", help="export track-record JSON to this file")
    b.add_argument("--calibrate", action="store_true", help="apply rolling isotonic calibration")
    # mock-only knobs
    b.add_argument("--teams", type=int, default=16)
    b.add_argument("--mock-seasons", dest="mock_seasons", type=int, default=3)
    b.add_argument("--seed", type=int, default=42)
    b.set_defaults(func=_cmd_backtest)

    w = sub.add_parser("worldcup", help="World Cup 2026 simulator / match predictor")
    w.add_argument("--config", default=None, help="groups JSON (default: sample)")
    w.add_argument("--sims", type=int, default=10000, help="Monte Carlo iterations")
    w.add_argument("--seed", type=int, default=7)
    w.add_argument("--top", type=int, default=16, help="rows in title table")
    w.add_argument("--fit", action="store_true", help="fit Elo from martj42 (needs network)")
    w.add_argument("--cache", default=".cache")
    # single-match mode
    w.add_argument("--match", action="store_true", help="predict one match instead of simulating")
    w.add_argument("--home")
    w.add_argument("--away")
    w.add_argument("--home-field", dest="home_field", action="store_true",
                   help="treat home team as playing at home (default neutral)")
    # report mode
    w.add_argument("--report", action="store_true", help="generate group-stage prediction report")
    w.add_argument("--out", help="write report markdown to this path")
    w.add_argument("--export-json", dest="export_json",
                   help="export meta/title_odds/predictions JSON to this dir (for web)")
    w.set_defaults(func=_cmd_worldcup)

    v = sub.add_parser("value", help="model-vs-market +EV view (The Odds API or offline)")
    v.add_argument("--sport", default="soccer_fifa_world_cup", help="The Odds API sport key")
    v.add_argument("--regions", default="eu", help="bookmaker regions (eu/uk/us/au)")
    v.add_argument("--config", default=None, help="groups JSON (for illustrative fixtures)")
    v.add_argument("--min-edge", dest="min_edge", type=float, default=0.0,
                   help="minimum model-vs-implied edge to flag a bet")
    v.add_argument("--illustrative", action="store_true",
                   help="force offline synthetic odds even if a key is present")
    v.add_argument("--token", default=None, help="The Odds API key (or THE_ODDS_API_KEY env)")
    v.add_argument("--fit", action="store_true", help="fit Elo from martj42 (needs network)")
    v.add_argument("--cache", default=".cache")
    v.add_argument("--seed", type=int, default=7)
    v.add_argument("--export-json", dest="export_json",
                   help="export value.json to this dir (for web)")
    v.set_defaults(func=_cmd_value)

    st = sub.add_parser(
        "settle",
        help="auto-fetch results from football-data.co.uk and backfill fixtures (Phase 3)",
    )
    st.add_argument("--seasons", type=int, nargs="+", required=True)
    st.add_argument("--cache", default=".cache")
    st.add_argument("--export-json", dest="export_json", default=None, help="data directory")
    st.add_argument(
        "--no-merge-fixtures",
        dest="no_merge_fixtures",
        action="store_true",
        help="do not patch fixtures.json",
    )
    st.add_argument(
        "--with-clv",
        action="store_true",
        help="also export clv_backfill.json (open vs Pinnacle close)",
    )
    st.set_defaults(func=_cmd_settle)

    fb = sub.add_parser("feedback", help="L7 feedback snapshot + metrics history (Phase 3)")
    fb_sub = fb.add_subparsers(dest="feedback_action", required=True)
    fb_snap = fb_sub.add_parser("snapshot", help="append feedback_snapshot + metrics_history")
    fb_snap.add_argument("--export-json", dest="export_json", default=None, help="data directory")
    fb_snap.set_defaults(func=_cmd_feedback)
    fb_week = fb_sub.add_parser("weekly", help="export weekly_digest.json for /weekly")
    fb_week.add_argument("--export-json", dest="export_json", default=None, help="data directory")
    fb_week.set_defaults(func=_cmd_feedback)

    lg = sub.add_parser("league", help="domestic league Elo + DC predictions (Phase 2)")
    lg_sub = lg.add_subparsers(dest="league_action", required=True)
    lg_ex = lg_sub.add_parser("export", help="export league_elo + league_predictions + metrics_monitor")
    lg_ex.add_argument("--league", default="E0")
    lg_ex.add_argument("--seasons", type=int, nargs="+", required=True)
    lg_ex.add_argument("--cache", default=".cache")
    lg_ex.add_argument("--holdout", type=int, default=30, help="hold-out matches for monitoring")
    lg_ex.add_argument("--export-json", dest="export_json", required=True, help="output directory")
    lg_ex.add_argument("--source", choices=["football-data", "mock"], default="football-data")
    lg_ex.add_argument("--teams", type=int, default=16, help="mock-only team count")
    lg_ex.add_argument("--all", dest="all_leagues", action="store_true", help="export E0,D1,SP1,I1,F1 + bundle")
    lg_ex.add_argument("--no-calibrate", dest="no_calibrate", action="store_true")
    lg_ex.set_defaults(func=_cmd_league)

    f = sub.add_parser("fixtures", help="export fixture list for web/DB (offline or football-data.org)")
    f.add_argument("--config", default=None, help="groups JSON (default: sample)")
    f.add_argument("--live", action="store_true", help="fetch from football-data.org (needs token)")
    f.add_argument("--league", default="WC", help="league/competition code (e.g. WC, E0, SP1)")
    f.add_argument("--token", default=None, help="FOOTBALL_DATA_TOKEN override")
    f.add_argument("--export-json", dest="export_json", help="write fixtures.json")
    f.set_defaults(func=_cmd_fixtures)

    a = sub.add_parser("agent", help="run an orchestrated pipeline (L1->L7)")
    a.add_argument("--pipeline", default="worldcup", help="pipeline name")
    a.add_argument("--config", default=None, help="groups JSON (worldcup)")
    a.add_argument("--out", default="out", help="output directory")
    a.add_argument("--sims", type=int, default=10000)
    a.add_argument("--seed", type=int, default=7)
    a.add_argument("--fit", action="store_true", help="fit Elo from martj42 (needs network)")
    a.add_argument("--cache", default=".cache")
    a.add_argument("--run-log", dest="run_log", default="out/runlog.jsonl")
    a.add_argument(
        "--sync-web",
        dest="sync_web",
        help="copy status.json (and run-log path hint) to DATA_DIR for the dashboard",
    )
    a.set_defaults(func=_cmd_agent)

    md = sub.add_parser("models", help="Phase 5 shadow / champion-challenger")
    md_sub = md.add_subparsers(dest="models_action", required=True)
    md_sh = md_sub.add_parser("shadow", help="export shadow_models.json (DC calibrated vs raw)")
    md_sh.add_argument("--league", default="E0")
    md_sh.add_argument("--seasons", type=int, nargs="+", required=True)
    md_sh.add_argument("--cache", default=".cache")
    md_sh.add_argument("--holdout", type=int, default=30)
    md_sh.add_argument("--export-json", dest="export_json", required=True)
    md_sh.add_argument("--source", choices=["football-data", "mock"], default="football-data")
    md_sh.add_argument("--all", dest="all_leagues", action="store_true")
    md_sh.add_argument(
        "--auto-promote",
        dest="auto_promote",
        action="store_true",
        help="arm promotion if PnL+Brier gates pass (default: record only)",
    )
    md_sh.set_defaults(func=_cmd_models_shadow)

    return p


def main(argv: list[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)
    return args.func(args)


if __name__ == "__main__":
    raise SystemExit(main())
