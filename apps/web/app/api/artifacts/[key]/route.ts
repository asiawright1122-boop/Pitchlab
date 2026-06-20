import { NextResponse } from "next/server";
import { isArtifactKey } from "@/lib/artifact-keys";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: { key: string } }
) {
  const { key } = context.params;
  if (!isArtifactKey(key)) {
    return NextResponse.json({ error: "unknown artifact key" }, { status: 400 });
  }

  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ error: "database not configured" }, { status: 503 });
  }

  try {
    const row = await prisma.publishedArtifact.findUnique({ where: { key } });
    if (!row) {
      return NextResponse.json({ error: "not found" }, { status: 404 });
    }
    return NextResponse.json(row.payload);
  } catch (err) {
    console.error("[api/artifacts]", key, err);
    return NextResponse.json({ error: "database unavailable" }, { status: 503 });
  }
}
