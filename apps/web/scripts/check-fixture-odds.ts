import fs from "node:fs";
import path from "node:path";

async function main() {
  const jsonPath = "/Users/kaka/Dev/Oobs/PitchLab/apps/web/public/data/odds_snapshots.json";
  if (!fs.existsSync(jsonPath)) {
    console.log("File not found:", jsonPath);
    return;
  }

  const raw = fs.readFileSync(jsonPath, "utf8");
  const data = JSON.parse(raw);
  const snapshots = data.snapshots || [];
  console.log(`Total snapshots in JSON: ${snapshots.length}`);

  const targetId = "1539002";
  const matched = snapshots.filter((s: any) => s.fixture_id === targetId);
  console.log(`Matched snapshots for ${targetId}: ${matched.length}`);

  if (matched.length > 0) {
    console.log("Sample matched snapshots:");
    console.log(matched.slice(0, 5));
  }

  const allIds = Array.from(new Set(snapshots.map((s: any) => s.fixture_id)));
  console.log(`Total unique fixture IDs in JSON: ${allIds.length}`);
  console.log("Some fixture IDs:", allIds.slice(0, 10));
}

main().catch(console.error);
