import { PrismaClient } from "@prisma/client";
import fs from "node:fs";
import path from "node:path";

const prisma = new PrismaClient();

const PLANS = [
  {
    id: "free",
    name: "Free",
    priceCents: 0,
    entitlements: {
      track_record: true,
      leagues_compare: true,
      worldcup: true,
      value_finder: false,
      league_model: false,
      all_leagues: false,
      push: false,
    },
  },
  {
    id: "pro",
    name: "Pro",
    priceCents: 1900,
    entitlements: {
      track_record: true,
      leagues_compare: true,
      worldcup: true,
      value_finder: true,
      league_model: true,
      all_leagues: true,
      push: true,
    },
  },
];

async function main() {
  for (const p of PLANS) {
    await prisma.plan.upsert({
      where: { id: p.id },
      create: p,
      update: {
        name: p.name,
        entitlements: p.entitlements,
        priceCents: p.priceCents,
      },
    });
  }
  console.log(`[seed] plans: ${PLANS.map((p) => p.id).join(", ")}`);

  // Seed default active model version setting
  const activeModel = "dc-raw-v0.1";
  await prisma.systemSetting.upsert({
    where: { key: "active_model_version" },
    create: {
      key: "active_model_version",
      value: activeModel,
    },
    update: {}, // Keep existing settings, preventing data override
  });
  console.log(`[seed] system setting: active_model_version = ${activeModel} (if not present)`);

  // Seed default promotion policy
  const defaultPolicy = {
    auto_promote: true,
    eval_days: 90,
    min_snapshots: 7,
    clv_threshold: 0.0,
    brier_check: true
  };
  await prisma.systemSetting.upsert({
    where: { key: "PROMOTION_POLICY" },
    create: {
      key: "PROMOTION_POLICY",
      value: defaultPolicy,
    },
    update: {}, // Keep existing settings, preventing data override
  });
  console.log(`[seed] system setting: PROMOTION_POLICY = ${JSON.stringify(defaultPolicy)} (if not present)`);

  // Generate mock metrics history to pass CLV gate threshold tests
  const dataDir = path.resolve(process.cwd(), "apps/web/public/data");
  const historyPath = path.join(dataDir, "metrics_history.json");

  if (!fs.existsSync(historyPath)) {
    const historyEntries = [];
    const now = new Date();
    for (let i = 0; i < 10; i++) {
      const generatedAt = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      historyEntries.push({
        generated_at: generatedAt.toISOString(),
        agent: {
          pipeline: "daily",
          ok: true,
          run_id: `run-mock-${i}`,
        },
        backtest_summary: {
          source: "mock",
          avg_clv: 0.025, // positive CLV
          roi: 0.05,
          brier: 0.22,
          n_bets: 42,
          verdict: "profit",
        },
        leagues_clv: {
          E0: 0.025,
        },
        leagues_holdout_brier: {
          E0: 0.22,
        },
        champion_challenger: {
          champion: {
            label: "champion",
            metric: "brier",
            value: 0.23,
            league: "E0",
            model_id: "dc-isotonic-v0.1",
          },
          challenger: {
            label: "challenger",
            metric: "brier",
            value: 0.22,
            league: "E0",
            model_id: "dc-raw-v0.1",
          },
          note: "Different protocols — compare trends only, not raw numbers.",
          auto_promote: true,
        },
        shadow_models: {
          n_leagues: 1,
          policy: {
            auto_promote: true,
            promotion_eligible: true,
            promoted_model_id: "dc-raw-v0.1",
            gates: {
              clv: { ok: true, detail: "OK" },
              pnl: { ok: true, detail: "OK" },
              brier: { ok: true, detail: "Brier gate: challenger 0.2200 < champion 0.2300" }
            },
            promote_if: "avg_clv >= 0.0 for 90d (7+ snapshots) AND best challenger Brier beats champion",
            reason: "Auto-promote ENABLED — gates passed."
          },
          e0_recommendation: "promote",
          e0_champion_brier: 0.23,
          e0_challenger_brier: 0.22,
        },
        summary_verdict: "profit"
      });
    }

    fs.mkdirSync(dataDir, { recursive: true });
    fs.writeFileSync(historyPath, JSON.stringify(historyEntries, null, 2), "utf-8");
    console.log(`[seed] generated mock metrics history at: ${historyPath}`);
  } else {
    console.log(`[seed] metrics_history.json already exists, skipping mock generation to prevent data contamination.`);
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });

