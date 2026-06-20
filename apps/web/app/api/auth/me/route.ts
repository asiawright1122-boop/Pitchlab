import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-server";
import { isAdminUser } from "@/lib/admin";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ user: null });
  }
  return NextResponse.json({
    user: {
      email: user.email,
      planId: user.planId,
      entitlements: user.entitlements,
      isAdmin: isAdminUser(user.email),
    },
  });
}
