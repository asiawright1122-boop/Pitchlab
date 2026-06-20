import { NextResponse } from "next/server";
import { ARTIFACT_KEYS } from "@/lib/artifact-keys";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/** List published artifacts and sync timestamps (for ops / System tab). */
export async function GET() {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({
      source: "static",
      artifacts: ARTIFACT_KEYS.map((key) => ({ key, syncedAt: null, source: null })),
    });
  }

  try {
    const rows = await prisma.publishedArtifact.findMany({
      select: { key: true, source: true, generatedAt: true, syncedAt: true, runId: true },
      orderBy: { key: "asc" },
    });
    return NextResponse.json({ source: "postgres", artifacts: rows });
  } catch (err) {
    console.error("[api/artifacts]", err);
    return NextResponse.json({ error: "database unavailable" }, { status: 503 });
  }
}
