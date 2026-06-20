/**
 * Pull the active model version from PostgreSQL (SystemSetting.active_model_version)
 * and write it back to pipeline_config.json so the Python engine can read it.
 */
import fs from "node:fs";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import { resolveDataDir } from "./artifacts.js";

const prisma = new PrismaClient();

async function main() {
  const dataDir = resolveDataDir();
  const configPath = path.join(dataDir, "pipeline_config.json");

  try {
    console.log("[db:pull-config] Fetching active_model_version from database...");
    const setting = await prisma.systemSetting.findUnique({
      where: { key: "active_model_version" },
    });

    if (setting && typeof setting.value === "string") {
      const modelId = setting.value;
      const configData = {
        auto_promote: true,
        promoted_model_id: modelId,
        updated_at: setting.updatedAt ? setting.updatedAt.toISOString() : new Date().toISOString(),
      };

      fs.mkdirSync(path.dirname(configPath), { recursive: true });
      fs.writeFileSync(configPath, JSON.stringify(configData, null, 2), "utf8");
      console.log(`[db:pull-config] Persisted database setting to local config: ${configPath} (id: ${modelId})`);
    } else {
      // If setting doesn't exist, ensure local config is deactivated
      if (fs.existsSync(configPath)) {
        fs.unlinkSync(configPath);
        console.log("[db:pull-config] No active model version in DB. Removed local pipeline_config.json");
      } else {
        console.log("[db:pull-config] No active model version in DB. Local config remains inactive.");
      }
    }
  } catch (err) {
    console.error("[db:pull-config] Failed to pull config from database:", err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
