import fs from "fs/promises";
import path from "path";
import { ARTIFACT_FILENAMES, type ArtifactKey } from "./artifact-keys";
import { prisma } from "./prisma";

export async function loadArtifactServer<T>(key: ArtifactKey): Promise<T | null> {
  if (process.env.DATABASE_URL) {
    try {
      const row = await prisma.publishedArtifact.findUnique({ where: { key } });
      if (row?.payload) return row.payload as T;
    } catch {
      /* fall through to static */
    }
  }

  try {
    const filePath = path.join(process.cwd(), "public/data", ARTIFACT_FILENAMES[key]);
    const raw = await fs.readFile(filePath, "utf8");
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}
