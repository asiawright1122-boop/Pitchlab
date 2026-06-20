import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-server";
import { maxAlertsForPlan, parseKinds, type AlertKind } from "@/lib/alert-kinds";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const rows = await prisma.alertSubscription.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({
    alerts: rows.map((r) => ({
      id: r.id,
      scope_type: r.scopeType,
      scope_league: r.scopeLeague,
      kinds: parseKinds(r.kinds),
      min_edge: r.minEdge,
      active: r.active,
    })),
    limit: maxAlertsForPlan(user.planId),
  });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = (await request.json()) as {
    scope_type?: string;
    scope_league?: string | null;
    kinds?: AlertKind[];
    min_edge?: number | null;
    active?: boolean;
  };

  const scopeType = body.scope_type === "league" ? "league" : "all";
  if (scopeType === "league" && !body.scope_league?.trim()) {
    return NextResponse.json({ error: "scope_league required for league scope" }, { status: 400 });
  }

  const kinds = parseKinds(body.kinds);
  if (!kinds.length) {
    return NextResponse.json({ error: "at least one kind required" }, { status: 400 });
  }

  const count = await prisma.alertSubscription.count({
    where: { userId: user.id, active: true },
  });
  const limit = maxAlertsForPlan(user.planId);
  if (count >= limit) {
    return NextResponse.json({ error: `alert limit reached (${limit})` }, { status: 403 });
  }

  const row = await prisma.alertSubscription.create({
    data: {
      userId: user.id,
      scopeType,
      scopeLeague: scopeType === "league" ? body.scope_league!.trim() : null,
      kinds,
      minEdge: body.min_edge ?? 0.02,
      active: body.active ?? true,
    },
  });

  return NextResponse.json({
    alert: {
      id: row.id,
      scope_type: row.scopeType,
      scope_league: row.scopeLeague,
      kinds: parseKinds(row.kinds),
      min_edge: row.minEdge,
      active: row.active,
    },
  });
}
