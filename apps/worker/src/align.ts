import fs from "node:fs";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import { resolveDataDir } from "./artifacts.js";

function loadEnvFile(filePath: string) {
  if (!fs.existsSync(filePath)) return;
  try {
    const content = fs.readFileSync(filePath, "utf8");
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const index = trimmed.indexOf("=");
      if (index === -1) continue;
      const key = trimmed.slice(0, index).trim();
      let val = trimmed.slice(index + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      if (!process.env[key]) {
        process.env[key] = val;
      }
    }
  } catch (e) {
    console.warn(`[align] Failed to parse env file at ${filePath}:`, e);
  }
}

loadEnvFile(path.resolve(import.meta.dirname, "../../../.env"));
loadEnvFile(path.resolve(import.meta.dirname, "../../web/.env.local"));

const prisma = new PrismaClient();

const SEED_CANONICALS = [
  "Manchester United", "Manchester City", "Wolverhampton Wanderers", "Tottenham Hotspur",
  "Paris Saint-Germain", "Bayern Munich", "Borussia Dortmund", "Internazionale", "AC Milan",
  "Atlético Madrid", "Real Madrid", "Barcelona", "Juventus", "Napoli", "Roma", "Lazio",
  "Arsenal", "Chelsea", "Liverpool", "Aston Villa", "Newcastle", "West Ham", "Brighton",
  "Turkey", "South Korea", "United States", "Ivory Coast", "Czechia", "Bosnia and Herzegovina",
  "Curaçao", "China PR", "North Macedonia", "Cape Verde", "France", "Germany", "England",
  "Spain", "Italy", "Brazil", "Argentina", "Portugal", "Netherlands", "Belgium", "Croatia"
];

export async function alignTeams(): Promise<void> {
  const dataDir = resolveDataDir();
  const unmappedPath = path.join(dataDir, "unmapped_teams.json");
  const registryPath = path.join(dataDir, "names_registry.json");

  if (!fs.existsSync(unmappedPath)) {
    return;
  }

  let unmappedData: { unmapped: string[] };
  try {
    unmappedData = JSON.parse(fs.readFileSync(unmappedPath, "utf8"));
  } catch (e) {
    console.error("[align] Error reading unmapped_teams.json:", e);
    return;
  }

  const unmapped = unmappedData.unmapped || [];
  if (unmapped.length === 0) {
    try {
      fs.unlinkSync(unmappedPath);
    } catch {}
    return;
  }

  console.log(`[align] Found ${unmapped.length} unmapped teams. Starting Agent alignment...`);

  let registry: Record<string, string[]> = {};
  if (fs.existsSync(registryPath)) {
    try {
      registry = JSON.parse(fs.readFileSync(registryPath, "utf8"));
    } catch (e) {
      console.warn("[align] Failed to parse names_registry.json, using empty dictionary:", e);
    }
  }

  const canonicals = new Set([...SEED_CANONICALS, ...Object.keys(registry)]);
  const canonicalList = Array.from(canonicals);

  // 1. Resolve LLM Configuration — prefer NVIDIA NIM, then DB, then env
  let baseURL = process.env.AI_BASE_URL || "";
  let apiKey = process.env.NVIDIA_API_KEY || process.env.AI_API_KEY || process.env.OPENAI_API_KEY || process.env.GEMINI_API_KEY || "";
  let modelName = process.env.AI_MODEL || "gpt-4o-mini";
  let isGeminiProtocol = !baseURL && !process.env.NVIDIA_API_KEY && !!process.env.GEMINI_API_KEY;
  let isNvidiaProtocol = !!process.env.NVIDIA_API_KEY;

  if (isNvidiaProtocol) {
    baseURL = process.env.NVIDIA_BASE_URL || "https://integrate.api.nvidia.com/v1";
    modelName = process.env.NVIDIA_MODEL || "meta/llama-3.3-70b-instruct";
    isGeminiProtocol = false;
  }

  try {
    const aiConfigSetting = await prisma.systemSetting.findUnique({
      where: { key: "AI_CONFIG" },
    });
    if (aiConfigSetting?.value && !isNvidiaProtocol) {
      const dbConfig = aiConfigSetting.value as any;
      if (dbConfig.baseURL) baseURL = dbConfig.baseURL;
      if (dbConfig.apiKey) apiKey = dbConfig.apiKey;
      if (dbConfig.modelName) modelName = dbConfig.modelName;
      isGeminiProtocol = false;
    }
  } catch (e) {
    console.warn("[align] DB lookup for AI_CONFIG failed (using env fallback):", e);
  }

  const isDev = process.env.NODE_ENV === "development" || !process.env.NODE_ENV;

  if (!apiKey && !isDev) {
    console.warn("[align] No API key configured and not in dev mode. Skipping alignment.");
    await prisma.$disconnect();
    return;
  }

  let matches: Record<string, string> = {};

  if (!apiKey && isDev) {
    console.log("[align] Dev Mode: Simulating local mock alignment...");
    for (const team of unmapped) {
      const lower = team.toLowerCase();
      if (lower.includes("utd") || lower.includes("united")) {
        matches[team] = "Manchester United";
      } else if (lower === "psg") {
        matches[team] = "Paris Saint-Germain";
      } else {
        matches[team] = team;
      }
    }
  } else {
    const prompt = `
Given a list of unmapped football team names (which might be in Chinese, abbreviations, or have typos) and a list of canonical standard team names.
Match each unmapped team name to the most semantically identical canonical team name.
If a team name has no match in the canonical list because it's a completely new team (e.g. a newly promoted club or minor team), you can either match it to a new canonical name (often the standard English display name of that team) or leave it out if you are completely unsure.

Unmapped Team Names:
${JSON.stringify(unmapped, null, 2)}

Canonical Candidates List:
${JSON.stringify(canonicalList, null, 2)}

Respond ONLY with a JSON object where keys are the unmapped names and values are the canonical standard names. 
Example response format:
{
  "Man United": "Manchester United",
  "PSG": "Paris Saint-Germain",
  "Nottm Forest": "Nottingham Forest"
}
Do NOT include markdown formatting, backticks, or any conversational text.
`.trim();

    try {
      let replyText = "";

      if (isGeminiProtocol) {
        console.log("[align] Using Gemini API Protocol...");
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            signal: AbortSignal.timeout(5000),
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: {
                maxOutputTokens: 1000,
                temperature: 0.1,
              }
            })
          }
        );

        if (!response.ok) {
          throw new Error(`Gemini API returned status ${response.status}: ${await response.text()}`);
        }
        const data = (await response.json()) as any;
        replyText = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
      } else {
        const finalBaseURL = baseURL || "https://api.openai.com/v1";
        console.log(`[align] Using OpenAI-compatible API Protocol (${finalBaseURL}, model: ${modelName})...`);
        const response = await fetch(`${finalBaseURL.replace(/\/$/, "")}/chat/completions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}`
          },
          signal: AbortSignal.timeout(5000),
          body: JSON.stringify({
            model: modelName,
            messages: [
              { role: "system", content: "You are a football team name matching agent. Output raw JSON map only." },
              { role: "user", content: prompt }
            ],
            temperature: 0.1,
          })
        });

        if (!response.ok) {
          throw new Error(`OpenAI-compatible API returned status ${response.status}: ${await response.text()}`);
        }
        const data = (await response.json()) as any;
        replyText = data.choices?.[0]?.message?.content || "";
      }

      replyText = replyText.replace(/```json/g, "").replace(/```/g, "").trim();
      matches = JSON.parse(replyText);
    } catch (err) {
      console.error("[align] Error executing LLM alignment:", err);
      await prisma.$disconnect();
      return;
    }
  }

  try {
    console.log("[align] Mappings to apply:", matches);
    let updated = false;
    for (const [unmappedName, canonicalName] of Object.entries(matches)) {
      if (!unmappedName || !canonicalName) continue;
      
      if (!registry[canonicalName]) {
        registry[canonicalName] = [];
      }
      
      if (!registry[canonicalName].includes(unmappedName)) {
        registry[canonicalName].push(unmappedName);
        updated = true;
        console.log(`[align] Mapped Alias: "${unmappedName}" -> Canonical: "${canonicalName}"`);
      }
    }

    if (updated) {
      fs.writeFileSync(registryPath, JSON.stringify(registry, null, 2), "utf8");
      console.log(`[align] Custom names_registry.json successfully updated.`);
    }

    try {
      fs.unlinkSync(unmappedPath);
      console.log("[align] Cleaned up unmapped_teams.json");
    } catch {}

  } catch (err) {
    console.error("[align] Error executing alignment merge:", err);
  } finally {
    await prisma.$disconnect();
  }
}
