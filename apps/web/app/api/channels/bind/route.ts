import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-server";
import { canAccess } from "@/lib/entitlements";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!canAccess(user.entitlements, "push")) {
    return NextResponse.json({ error: "pro required" }, { status: 403 });
  }

  const { channel, external_id } = (await request.json()) as {
    channel?: string;
    external_id?: string;
  };
  if (!channel || !external_id) {
    return NextResponse.json({ error: "channel and external_id required" }, { status: 400 });
  }

  const row = await prisma.channelBinding.upsert({
    where: { userId_channel: { userId: user.id, channel } },
    create: {
      userId: user.id,
      channel,
      externalId: external_id,
      verifiedAt: new Date(),
    },
    update: { externalId: external_id, verifiedAt: new Date() },
  });

  return NextResponse.json({
    ok: true,
    binding: { channel: row.channel, external_id: row.externalId },
    note:
      row.channel === "telegram"
        ? "Saved. Pipeline summaries will be sent after npm run notify (requires TELEGRAM_BOT_TOKEN)."
        : "Binding saved.",
  });
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!canAccess(user.entitlements, "push")) {
    return NextResponse.json({ bindings: [] }); // return empty if no push entitlement
  }

  const bindings = await prisma.channelBinding.findMany({
    where: { userId: user.id },
    select: { channel: true, externalId: true, verifiedAt: true },
  });

  return NextResponse.json({ bindings });
}

export async function DELETE(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!canAccess(user.entitlements, "push")) {
    return NextResponse.json({ error: "pro required" }, { status: 403 });
  }

  const url = new URL(request.url);
  const channel = url.searchParams.get("channel");
  if (!channel) {
    return NextResponse.json({ error: "channel query parameter required" }, { status: 400 });
  }

  await prisma.channelBinding.deleteMany({
    where: { userId: user.id, channel },
  });

  return NextResponse.json({ ok: true, note: `Unbound from ${channel}.` });
}

