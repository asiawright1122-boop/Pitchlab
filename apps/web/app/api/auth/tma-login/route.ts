import { NextResponse } from "next/server";
import { loginWithTelegram } from "@/lib/auth-server";

export async function POST(request: Request) {
  try {
    const { initData } = await request.json();
    if (!initData) {
      return NextResponse.json({ error: "initData required" }, { status: 400 });
    }

    const user = await loginWithTelegram(initData);

    return NextResponse.json({
      ok: true,
      id: user.id,
      email: user.email,
      planId: user.planId,
    });
  } catch (err: any) {
    console.error("[auth/tma-login]", err);
    return NextResponse.json({ error: err.message || "login failed" }, { status: 401 });
  }
}
