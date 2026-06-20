/**
 * Sync engine-exported JSON from apps/web/public/data into PostgreSQL.
 *
 * Usage (from repo root, after db:up + db:migrate):
 *   npm run db:sync
 *
 * Requires DATABASE_URL in .env at repo root (or environment).
 */
import fs from "node:fs";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import {
  ARTIFACT_FILES,
  extractGeneratedAt,
  inferSource,
  readArtifactFile,
  resolveDataDir,
} from "./artifacts.js";
import { importFixturesToDb, type FixturesFile } from "./import-fixtures.js";
import { importSettlements } from "./import-settlements.js";
import {
  importLeaguePredictions,
  importWorldcupPredictions,
} from "./import-predictions.js";
import { importOddsSnapshots } from "./import-odds-snapshots.js";
import { settleOpenPaperTrades } from "./settle-paper.js";
import { alignTeams } from "./align.js";
import { sendPromotionNotification } from "./notify-promotion.js";
import { runScraper } from "./scrape-standings.js";
import { syncCsvOdds } from "./sync-csv-odds.js";

const prisma = new PrismaClient();

async function main() {
  const dataDir = resolveDataDir();
  const pipeline = process.env.PIPELINE ?? "sync-json";

  const run = await prisma.pipelineRun.create({
    data: { pipeline, status: "running" },
  });

  const synced: string[] = [];
  const skipped: string[] = [];

  try {
    for (const key of Object.keys(ARTIFACT_FILES)) {
      const payload = readArtifactFile(dataDir, key);
      if (payload === null) {
        skipped.push(key);
        continue;
      }

      await prisma.publishedArtifact.upsert({
        where: { key },
        create: {
          key,
          payload: payload as object,
          source: inferSource(key, payload),
          generatedAt: extractGeneratedAt(key, payload),
          runId: run.id,
        },
        update: {
          payload: payload as object,
          source: inferSource(key, payload),
          generatedAt: extractGeneratedAt(key, payload),
          runId: run.id,
        },
      });

      if (key === "shadow_models") {
        const payloadPolicy = (payload as any)?.policy;
        let autoPromote = payloadPolicy?.auto_promote;
        const promotedModelId = payloadPolicy?.promoted_model_id;

        try {
          const dbPolicySetting = await prisma.systemSetting.findUnique({
            where: { key: "PROMOTION_POLICY" },
          });
          if (dbPolicySetting?.value) {
            const dbPolicy = dbPolicySetting.value as any;
            if (dbPolicy.auto_promote !== undefined) {
              autoPromote = dbPolicy.auto_promote;
              console.log(`[db:sync] Overriding auto_promote with DB policy setting: ${autoPromote}`);
            }
          }
        } catch (dbErr) {
          console.warn("[db:sync] Failed to query PROMOTION_POLICY from DB, using payload default:", dbErr);
        }

        if (autoPromote && promotedModelId) {
          await prisma.systemSetting.upsert({
            where: { key: "active_model_version" },
            create: {
              key: "active_model_version",
              value: promotedModelId,
            },
            update: {
              value: promotedModelId,
            },
          });
          console.log(`[db:sync] Detected auto_promote! SystemSetting.active_model_version updated to: ${promotedModelId}`);
          
          try {
            await sendPromotionNotification(payloadPolicy);
          } catch (e) {
            console.error("[db:sync] Failed to dispatch promotion notification:", e);
          }
        } else {
          console.log(`[db:sync] Auto-promote skipped. DB or payload config: auto_promote = ${autoPromote}, model = ${promotedModelId}`);
        }
      }

      synced.push(key);
    }

    let fixturesImported = 0;
    const fixturesPayload = readArtifactFile(dataDir, "fixtures");
    if (fixturesPayload && typeof fixturesPayload === "object" && "fixtures" in fixturesPayload) {
      console.log("[db:sync] Starting importFixturesToDb...");
      fixturesImported = await importFixturesToDb(
        prisma,
        fixturesPayload as FixturesFile
      );
      console.log(`[db:sync] Finished importFixturesToDb, imported ${fixturesImported} rows.`);
    }

    let settlementsImported = 0;
    const settlementsPayload = readArtifactFile(dataDir, "settlements");
    if (
      settlementsPayload &&
      typeof settlementsPayload === "object" &&
      "updates" in settlementsPayload
    ) {
      console.log("[db:sync] Starting importSettlements...");
      settlementsImported = await importSettlements(
        prisma,
        settlementsPayload as Parameters<typeof importSettlements>[1]
      );
      console.log(`[db:sync] Finished importSettlements, imported ${settlementsImported} rows.`);
    }

    let predictionsImported = 0;
    const leaguePreds = readArtifactFile(dataDir, "league_predictions");
    if (leaguePreds && typeof leaguePreds === "object" && "predictions" in leaguePreds) {
      console.log("[db:sync] Starting importLeaguePredictions...");
      predictionsImported += await importLeaguePredictions(
        prisma,
        leaguePreds as Parameters<typeof importLeaguePredictions>[1]
      );
      console.log(`[db:sync] Finished importLeaguePredictions, current predictionsImported count: ${predictionsImported}`);
    }
    const wcPreds = readArtifactFile(dataDir, "predictions");
    if (Array.isArray(wcPreds)) {
      console.log("[db:sync] Starting importWorldcupPredictions...");
      predictionsImported += await importWorldcupPredictions(prisma, wcPreds);
      console.log(`[db:sync] Finished importWorldcupPredictions, current predictionsImported count: ${predictionsImported}`);
    }

    try {
      console.log("[db:sync] Fetching and merging latest odds from CSV data source...");
      await syncCsvOdds(dataDir);
    } catch (csvErr) {
      console.warn("[db:sync] CSV odds fetch warning:", csvErr);
    }

    let oddsSnapshotsImported = 0;
    const oddsPath = path.join(dataDir, "odds_snapshots.json");
    if (fs.existsSync(oddsPath)) {
      console.log("[db:sync] Starting importOddsSnapshots...");
      const oddsPayload = JSON.parse(
        fs.readFileSync(oddsPath, "utf8")
      ) as Parameters<typeof importOddsSnapshots>[1];
      oddsSnapshotsImported = await importOddsSnapshots(prisma, oddsPayload);
      console.log(`[db:sync] Finished importOddsSnapshots, imported ${oddsSnapshotsImported} snapshots.`);
    }

    let paperTradesSettled = 0;
    try {
      console.log("[db:sync] Starting settleOpenPaperTrades...");
      paperTradesSettled = await settleOpenPaperTrades(prisma);
      console.log(`[db:sync] Finished settleOpenPaperTrades, settled ${paperTradesSettled} trades.`);
    } catch (e) {
      console.warn("[pitchlab-worker] paper settle skipped:", e);
    }

    try {
      console.log("[db:sync] Starting alignTeams...");
      await alignTeams();
      console.log("[db:sync] Finished alignTeams.");
    } catch (e) {
      console.warn("[pitchlab-worker] team alignment failed:", e);
    }

    try {
      console.log("[db:sync] Starting scrapeStandings...");
      await runScraper();
      console.log("[db:sync] Finished scrapeStandings.");
    } catch (e) {
      console.warn("[pitchlab-worker] standings scraping failed:", e);
    }

    await prisma.pipelineRun.update({
      where: { id: run.id },
      data: {
        status: "ok",
        finishedAt: new Date(),
        log: {
          dataDir,
          synced,
          skipped,
          fixturesImported,
          settlementsImported,
          predictionsImported,
          oddsSnapshotsImported,
          paperTradesSettled,
        },
      },
    });

    console.log(`[pitchlab-worker] sync ok run=${run.id}`);
    if (fixturesImported) console.log(`  fixtures rows: ${fixturesImported}`);
    if (settlementsImported) console.log(`  settlements: ${settlementsImported}`);
    if (predictionsImported) console.log(`  prediction rows: ${predictionsImported}`);
    if (oddsSnapshotsImported)
      console.log(`  odds_snapshots: ${oddsSnapshotsImported}`);
    if (paperTradesSettled) console.log(`  paper trades settled: ${paperTradesSettled}`);
    console.log(`  dataDir: ${dataDir}`);
    console.log(`  synced:  ${synced.join(", ") || "(none)"}`);
    if (skipped.length) console.log(`  skipped: ${skipped.join(", ")}`);
  } catch (err) {
    await prisma.pipelineRun.update({
      where: { id: run.id },
      data: {
        status: "failed",
        finishedAt: new Date(),
        log: { error: String(err), dataDir },
      },
    });
    throw err;
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error("[pitchlab-worker] sync failed:", e);
  process.exit(1);
});
