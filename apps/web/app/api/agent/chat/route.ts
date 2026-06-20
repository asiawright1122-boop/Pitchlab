import { createOpenAI } from "@ai-sdk/openai";
import { streamText, tool } from "ai";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export const maxDuration = 60;

export async function POST(req: Request) {
  const session = await getSession();
  
  if (!session.userId) {
    return new Response("Unauthorized", { status: 401 });
  }

  if (session.planId !== "pro") {
    return new Response("Pro subscription required", { status: 403 });
  }

  const { messages } = await req.json();

  // Fetch dynamic AI config — prefer NVIDIA NIM, then DB config, then env vars
  const nvidiaKey = process.env.NVIDIA_API_KEY;

  let baseURL: string;
  let apiKey: string | undefined;
  let modelName: string;

  if (nvidiaKey) {
    baseURL = process.env.NVIDIA_BASE_URL || "https://integrate.api.nvidia.com/v1";
    apiKey = nvidiaKey;
    modelName = process.env.NVIDIA_MODEL || "meta/llama-3.3-70b-instruct";
  } else {
    const aiConfigSetting = await prisma.systemSetting.findUnique({
      where: { key: "AI_CONFIG" }
    });

    baseURL = process.env.AI_BASE_URL || "https://api.openai.com/v1";
    apiKey = process.env.AI_API_KEY || process.env.OPENAI_API_KEY;
    modelName = process.env.AI_MODEL || "gpt-4o-mini";

    if (aiConfigSetting && aiConfigSetting.value) {
      const dbConfig = aiConfigSetting.value as any;
      if (dbConfig.baseURL) baseURL = dbConfig.baseURL;
      if (dbConfig.apiKey) apiKey = dbConfig.apiKey;
      if (dbConfig.modelName) modelName = dbConfig.modelName;
    }
  }

  const aiProvider = createOpenAI({
    baseURL,
    apiKey,
  });

  const systemPrompt = `You are the Quant Edge Pro Agent, an expert quantitative sports researcher.
Base your calculations on the Quant Edge database via tools.
Use tools to look up upcoming fixtures, odds, predictions, and value bets before answering.
Do not invent data. If a tool returns no data, inform the user clearly.
`;

  const result = await streamText({
    model: aiProvider(modelName),
    messages,
    system: systemPrompt,
    tools: {
      getUpcomingFixtures: tool({
        description: "Get upcoming scheduled fixtures, optionally filtered by league.",
        inputSchema: z.object({
          league: z.string().optional().describe("League code e.g., 'E0' for Premier League, 'WC' for World Cup"),
          limit: z.number().optional().default(10),
        }),
        execute: (async ({ league, limit }: { league?: string; limit?: number }) => {
          return await prisma.fixture.findMany({
            where: {
              status: "scheduled",
              ...(league ? { league } : {}),
            },
            orderBy: { kickoffUtc: "asc" },
            take: limit,
          });
        }),
      }),
      getMatchOdds: tool({
        description: "Get the latest odds snapshots for a specific fixture.",
        inputSchema: z.object({
          fixtureId: z.string(),
        }),
        execute: (async ({ fixtureId }: { fixtureId: string }) => {
          return await prisma.oddsSnapshot.findMany({
            where: { fixtureId },
            orderBy: { takenAt: "desc" },
            take: 50,
          });
        }),
      }),
      getPredictions: tool({
        description: "Get the model predictions for a specific fixture.",
        inputSchema: z.object({
          fixtureId: z.string(),
        }),
        execute: (async ({ fixtureId }: { fixtureId: string }) => {
          return await prisma.prediction.findMany({
            where: { fixtureId },
          });
        }),
      }),
      getValueBets: tool({
        description: "Look up active value bets from published artifacts. Good for questions like 'Are there any value bets today?'",
        inputSchema: z.object({}),
        execute: (async () => {
          const valuePayload = await prisma.publishedArtifact.findUnique({
            where: { key: "value" }
          });
          if (!valuePayload) return { fixtures: [] };
          return valuePayload.payload;
        }),
      }),
    },
  });

  return result.toTextStreamResponse();
}
