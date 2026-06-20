import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAdminSession } from "@/lib/admin";
import { ensurePaperWallet } from "@/lib/paper";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    if (!(await verifyAdminSession(request))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const users = await prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        subscription: {
          include: { plan: true }
        },
        paperWallet: true
      }
    });

    const formatted = users.map(u => ({
      id: u.id,
      email: u.email,
      createdAt: u.createdAt,
      planId: u.subscription?.planId || "free",
      subStatus: u.subscription?.status || "inactive",
      ruBalance: u.paperWallet?.balance ?? 10000
    }));

    return NextResponse.json({ users: formatted });
  } catch (error: any) {
    console.error("[Admin Users API] GET Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    if (!(await verifyAdminSession(request))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { userId, action, value } = body as {
      userId: string;
      action: "update_plan" | "add_ru";
      value: any;
    };

    if (!userId || !action) {
      return NextResponse.json({ error: "userId and action are required" }, { status: 400 });
    }

    // Ensure user exists
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (action === "update_plan") {
      const planId = String(value);
      if (planId !== "free" && planId !== "pro") {
        return NextResponse.json({ error: "Invalid planId (must be free or pro)" }, { status: 400 });
      }

      // Ensure plan exists (plans are seeded as free / pro)
      await prisma.plan.upsert({
        where: { id: planId },
        update: {},
        create: {
          id: planId,
          name: planId === "pro" ? "Pro" : "Free",
          entitlements: planId === "pro" ? { push: true, Kelly: true, DixonColes: true } : {},
          priceCents: planId === "pro" ? 1900 : 0
        }
      });

      await prisma.subscription.upsert({
        where: { userId },
        update: { planId, status: "active" },
        create: {
          userId,
          planId,
          status: "active"
        }
      });
      console.log(`[Admin Users API] Updated user ${user.email} plan to ${planId}`);

    } else if (action === "add_ru") {
      const amount = Number(value);
      if (isNaN(amount)) {
        return NextResponse.json({ error: "value must be a valid number" }, { status: 400 });
      }

      await ensurePaperWallet(prisma, userId);
      await prisma.paperWallet.update({
        where: { userId },
        data: { balance: amount }
      });
      console.log(`[Admin Users API] Updated user ${user.email} RU balance to ${amount}`);

    } else {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[Admin Users API] PUT Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    if (!(await verifyAdminSession(request))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Prevent admin from deleting themselves (e.g. comparing emails if they match)
    // For safety, allow delete for mock users
    await prisma.user.delete({
      where: { id: userId }
    });

    console.log(`[Admin Users API] Physically deleted user: ${user.email}`);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[Admin Users API] DELETE Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
