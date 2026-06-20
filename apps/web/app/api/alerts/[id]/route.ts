import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-server";
import { parseKinds, type AlertKind } from "@/lib/alert-kinds";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

export async function DELETE(_request: Request, { params }: Params) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await params;
  const row = await prisma.alertSubscription.findFirst({
    where: { id, userId: user.id },
  });
  if (!row) return NextResponse.json({ error: "not found" }, { status: 404 });

  await prisma.alertSubscription.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

export async function PATCH(request: Request, { params }: Params) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await params;
  const row = await prisma.alertSubscription.findFirst({
    where: { id, userId: user.id },
  });
  if (!row) return NextResponse.json({ error: "not found" }, { status: 404 });

  const body = (await request.json()) as {
    kinds?: AlertKind[];
    min_edge?: number | null;
    active?: boolean;
  };

  const updated = await prisma.alertSubscription.update({
    where: { id },
    data: {
      ...(body.kinds ? { kinds: parseKinds(body.kinds) } : {}),
      ...(body.min_edge !== undefined ? { minEdge: body.min_edge } : {}),
      ...(body.active !== undefined ? { active: body.active } : {}),
    },
  });

  return NextResponse.json({
    alert: {
      id: updated.id,
      scope_type: updated.scopeType,
      scope_league: updated.scopeLeague,
      kinds: parseKinds(updated.kinds),
      min_edge: updated.minEdge,
      active: updated.active,
    },
  });
}
