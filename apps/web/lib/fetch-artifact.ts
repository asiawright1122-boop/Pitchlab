import type { ArtifactKey } from "./artifact-keys";
import { staticArtifactPath } from "./artifact-keys";

/**
 * Load dashboard JSON: try API (Postgres) first, then static export in public/data.
 */
export async function fetchArtifact<T>(key: ArtifactKey): Promise<T | null> {
  try {
    const res = await fetch(`/api/artifacts/${key}`, { cache: "no-store" });
    if (res.ok) return (await res.json()) as T;
  } catch {
    /* DB/API unavailable — fall through */
  }

  try {
    const res = await fetch(staticArtifactPath(key));
    if (res.ok) return (await res.json()) as T;
  } catch {
    /* static missing */
  }

  return null;
}
