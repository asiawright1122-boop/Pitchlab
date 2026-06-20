import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({
      ok: true,
      db: "not_configured",
      mode: "static_json",
    });
  }

  try {
    await prisma.$queryRaw`SELECT 1`;
    const [artifactCount, predictionCount, lastRun] = await Promise.all([
      prisma.publishedArtifact.count(),
      prisma.prediction.count(),
      prisma.pipelineRun.findFirst({
        orderBy: { startedAt: "desc" },
        select: { id: true, pipeline: true, status: true, startedAt: true, finishedAt: true },
      }),
    ]);

    return NextResponse.json({
      ok: true,
      db: "connected",
      mode: "postgres",
      artifactCount,
      predictionCount,
      lastRun,
    });
  } catch (err) {
    console.error("[api/health]", err);
    return NextResponse.json(
      {
        ok: false,
        db: "error",
        mode: "static_json_fallback",
      },
      { status: 503 }
    );
  }
}
