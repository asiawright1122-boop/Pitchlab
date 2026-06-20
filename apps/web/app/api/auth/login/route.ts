import { NextResponse } from "next/server";
import { loginWithEmail } from "@/lib/auth-server";
import { isAdminUser } from "@/lib/admin";

export async function POST(request: Request) {
  try {
    const { email, plan } = (await request.json()) as { email?: string; plan?: string };
    if (!email) {
      return NextResponse.json({ error: "email required" }, { status: 400 });
    }

    const user = await loginWithEmail(email);

    // Dev helper: ?plan=pro in body upgrades subscription for local testing
    if (plan === "pro" && process.env.NODE_ENV !== "production") {
      const { prisma } = await import("@/lib/prisma");
      const proPlan = await prisma.plan.findUniqueOrThrow({ where: { id: "pro" } });
      await prisma.subscription.update({
        where: { userId: user.id },
        data: { planId: "pro" },
      });
      const { getSession } = await import("@/lib/session");
      const { parseEntitlements } = await import("@/lib/entitlements");
      const session = await getSession();
      session.planId = "pro";
      await session.save();
      user.planId = "pro";
      Object.assign(user.entitlements, parseEntitlements(proPlan.entitlements));
    }

    return NextResponse.json({
      ok: true,
      email: user.email,
      planId: user.planId,
      isAdmin: isAdminUser(user.email),
    });
  } catch (err) {
    console.error("[auth/login]", err);
    return NextResponse.json({ error: "login failed" }, { status: 500 });
  }
}
