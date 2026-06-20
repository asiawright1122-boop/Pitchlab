import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateInitData, getOrCreateTmaUser } from "@/lib/tma-auth";
import { maxAlertsForPlan, parseKinds, type AlertKind } from "@/lib/alert-kinds";

export const dynamic = 'force-dynamic';

async function getTmaUser(request: Request) {
  try {
    const initData = request.headers.get("x-tma-init-data");
    let userTgId: number;
    if (process.env.NODE_ENV === "development" && (!initData || initData === "")) {
      userTgId = 123456789;
    } else if (!initData) {
      return null;
    } else {
      const token = process.env.TELEGRAM_BOT_TOKEN || "";
      const isValid = validateInitData(initData, token);
      if (!isValid) return null;
      const searchParams = new URLSearchParams(initData);
      const userParam = searchParams.get("user");
      if (!userParam) return null;
      const userData = JSON.parse(userParam);
      userTgId = userData.id;
    }

    const tmaUserPayload = { id: userTgId };
    const tmaUser = await getOrCreateTmaUser(tmaUserPayload);
    if (!tmaUser) return null;

    return await prisma.user.findUnique({
      where: { id: tmaUser.id },
      include: { subscription: true }
    });
  } catch (err) {
    console.error("[TMA Alerts Auth] Error:", err);
    return null;
  }
}

export async function GET(request: Request) {
  const user = await getTmaUser(request);
  if (!user) return NextResponse.json({ success: false, error: "unauthorized" }, { status: 401 });

  const rows = await prisma.alertSubscription.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({
    success: true,
    alerts: rows.map((r) => ({
      id: r.id,
      scope_type: r.scopeType,
      scope_league: r.scopeLeague,
      kinds: parseKinds(r.kinds),
      min_edge: r.minEdge,
      active: r.active,
    })),
    limit: maxAlertsForPlan(user.subscription?.planId ?? "free"),
  });
}

export async function POST(request: Request) {
  const user = await getTmaUser(request);
  if (!user) return NextResponse.json({ success: false, error: "unauthorized" }, { status: 401 });

  try {
    const body = (await request.json()) as {
      scope_type?: string;
      scope_league?: string | null;
      kinds?: AlertKind[];
      min_edge?: number | null;
      active?: boolean;
    };

    const scopeType = body.scope_type === "league" ? "league" : "all";
    if (scopeType === "league" && !body.scope_league?.trim()) {
      return NextResponse.json({ success: false, error: "scope_league required for league scope" }, { status: 400 });
    }

    const kinds = parseKinds(body.kinds);
    if (!kinds.length) {
      return NextResponse.json({ success: false, error: "at least one kind required" }, { status: 400 });
    }

    const count = await prisma.alertSubscription.count({
      where: { userId: user.id, active: true },
    });
    const limit = maxAlertsForPlan(user.subscription?.planId ?? "free");
    if (count >= limit) {
      return NextResponse.json({ success: false, error: `alert limit reached (${limit})` }, { status: 403 });
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
      success: true,
      alert: {
        id: row.id,
        scope_type: row.scopeType,
        scope_league: row.scopeLeague,
        kinds: parseKinds(row.kinds),
        min_edge: row.minEdge,
        active: row.active,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message || "Bad request" }, { status: 400 });
  }
}

export async function PATCH(request: Request) {
  const user = await getTmaUser(request);
  if (!user) return NextResponse.json({ success: false, error: "unauthorized" }, { status: 401 });

  try {
    const body = (await request.json()) as {
      id: string;
      kinds?: AlertKind[];
      min_edge?: number | null;
      active?: boolean;
    };

    const { id } = body;
    if (!id) return NextResponse.json({ success: false, error: "id required" }, { status: 400 });

    const row = await prisma.alertSubscription.findFirst({
      where: { id, userId: user.id },
    });
    if (!row) return NextResponse.json({ success: false, error: "not found" }, { status: 404 });

    const updated = await prisma.alertSubscription.update({
      where: { id },
      data: {
        ...(body.kinds ? { kinds: parseKinds(body.kinds) } : {}),
        ...(body.min_edge !== undefined ? { minEdge: body.min_edge } : {}),
        ...(body.active !== undefined ? { active: body.active } : {}),
      },
    });

    return NextResponse.json({
      success: true,
      alert: {
        id: updated.id,
        scope_type: updated.scopeType,
        scope_league: updated.scopeLeague,
        kinds: parseKinds(updated.kinds),
        min_edge: updated.minEdge,
        active: updated.active,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message || "Bad request" }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  const user = await getTmaUser(request);
  if (!user) return NextResponse.json({ success: false, error: "unauthorized" }, { status: 401 });

  try {
    const { searchParams } = new URL(request.url);
    let id = searchParams.get("id");

    if (!id) {
      const body = await request.json().catch(() => ({}));
      id = body.id;
    }

    if (!id) return NextResponse.json({ success: false, error: "id required" }, { status: 400 });

    const row = await prisma.alertSubscription.findFirst({
      where: { id, userId: user.id },
    });
    if (!row) return NextResponse.json({ success: false, error: "not found" }, { status: 404 });

    await prisma.alertSubscription.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message || "Bad request" }, { status: 400 });
  }
}
