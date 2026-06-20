export const ALERT_KINDS = ["kickoff", "result", "value_hit"] as const;
export type AlertKind = (typeof ALERT_KINDS)[number];

export function parseKinds(raw: unknown): AlertKind[] {
  if (!Array.isArray(raw)) return ["value_hit"];
  const set = new Set(ALERT_KINDS);
  return raw.filter((k): k is AlertKind => typeof k === "string" && set.has(k as AlertKind));
}

export const ALERT_LIMITS: Record<string, number> = {
  free: 3,
  pro: 50,
};

export function maxAlertsForPlan(planId: string): number {
  return ALERT_LIMITS[planId] ?? ALERT_LIMITS.free;
}
