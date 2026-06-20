export type PlanId = "free" | "pro" | "premium";

export type Entitlements = {
  track_record: boolean;
  leagues_compare: boolean;
  worldcup: boolean;
  value_finder: boolean;
  league_model: boolean;
  all_leagues: boolean;
  push: boolean;
};

export const DEFAULT_ENTITLEMENTS: Entitlements = {
  track_record: true,
  leagues_compare: true,
  worldcup: true,
  value_finder: false,
  league_model: false,
  all_leagues: false,
  push: false,
};

export function parseEntitlements(raw: unknown): Entitlements {
  if (!raw || typeof raw !== "object") return DEFAULT_ENTITLEMENTS;
  const o = raw as Record<string, boolean>;
  return {
    track_record: o.track_record ?? true,
    leagues_compare: o.leagues_compare ?? true,
    worldcup: o.worldcup ?? true,
    value_finder: !!o.value_finder,
    league_model: !!o.league_model,
    all_leagues: !!o.all_leagues,
    push: !!o.push,
  };
}

export function canAccess(ent: Entitlements, feature: keyof Entitlements): boolean {
  return !!ent[feature];
}
