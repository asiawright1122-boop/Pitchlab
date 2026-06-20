import { exec } from "node:child_process";
import path from "node:path";

const INTERVAL_MS = Number(process.env.SYNC_INTERVAL_MS) || 5 * 60 * 1000; // 默认 5 分钟
const scriptPath = path.resolve(import.meta.dirname, "fixtures-live.sh");

function runSync() {
  console.log(`[Auto-Sync] [${new Date().toISOString()}] Starting live sync command: bash ${scriptPath}`);
  
  exec(`bash "${scriptPath}"`, (error, stdout, stderr) => {
    if (error) {
      console.error(`[Auto-Sync] Error executing sync:`, error);
      return;
    }
    if (stdout) console.log(`[Auto-Sync] Output:\n${stdout.trim()}`);
    if (stderr) console.warn(`[Auto-Sync] Stderr:\n${stderr.trim()}`);
    console.log(`[Auto-Sync] Sync cycle completed successfully.`);
  });
}

// 启动时立即运行一次，随后按间隔轮询
runSync();
setInterval(runSync, INTERVAL_MS);

console.log(`[Auto-Sync] Daemon started. Syncing every ${INTERVAL_MS / 1000} seconds.`);
