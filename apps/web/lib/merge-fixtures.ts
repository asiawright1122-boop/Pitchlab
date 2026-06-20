import type { FixtureRecord, FixturesData, PredictionRow } from "./types";

export function mergePredictionsIntoFixtures(
  fixtures: FixtureRecord[],
  predictions: PredictionRow[]
): FixtureRecord[] {
  const byPair = new Map<string, PredictionRow>();
  for (const p of predictions) {
    byPair.set(`${p.home}|${p.away}`, p);
  }
  return fixtures.map((f) => {
    const p = byPair.get(`${f.home}|${f.away}`);
    if (!p) return f;
    return {
      ...f,
      group: f.group ?? p.group,
      matchday: f.matchday ?? p.matchday,
      home_prob: p.home_prob,
      draw_prob: p.draw_prob,
      away_prob: p.away_prob,
      over25: p.over25,
    };
  });
}

export function fixturesFromPredictions(predictions: PredictionRow[]): FixtureRecord[] {
  return predictions.map((p) => ({
    id: `pred-${p.group}-${p.matchday}-${p.home}-${p.away}`,
    league: "WC",
    home: p.home,
    away: p.away,
    group: p.group,
    matchday: p.matchday,
    status: "scheduled",
    home_prob: p.home_prob,
    draw_prob: p.draw_prob,
    away_prob: p.away_prob,
    over25: p.over25,
  }));
}

export async function loadMergedFixtures(
  loadArtifact: <T>(key: "fixtures" | "predictions") => Promise<T | null>
): Promise<{ rows: FixtureRecord[]; meta: FixturesData | null }> {
  const [fixturesData, predictions] = await Promise.all([
    loadArtifact<FixturesData>("fixtures"),
    loadArtifact<PredictionRow[]>("predictions"),
  ]);

  const preds = predictions ?? [];

  if (fixturesData?.fixtures?.length) {
    return {
      meta: fixturesData,
      rows: mergePredictionsIntoFixtures(fixturesData.fixtures, preds),
    };
  }

  return {
    meta: null,
    rows: fixturesFromPredictions(preds),
  };
}
