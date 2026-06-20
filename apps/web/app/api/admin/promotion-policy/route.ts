import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAdminSession } from "@/lib/admin";

export const dynamic = "force-dynamic";

const DEFAULT_POLICY = {
  auto_promote: true,
  eval_days: 90,
  min_snapshots: 7,
  clv_threshold: 0.0,
  brier_check: true
};

export async function GET(request: Request) {
  try {
    if (!(await verifyAdminSession(request))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const setting = await prisma.systemSetting.findUnique({
      where: { key: "PROMOTION_POLICY" }
    });

    return NextResponse.json({
      policy: setting?.value || DEFAULT_POLICY
    });
  } catch (error: any) {
    console.error("[Promotion Policy API] GET Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    if (!(await verifyAdminSession(request))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { auto_promote, eval_days, min_snapshots, clv_threshold, brier_check } = body;

    // Validate parameters
    if (typeof auto_promote !== "boolean" || 
        typeof eval_days !== "number" || 
        typeof min_snapshots !== "number" || 
        typeof clv_threshold !== "number" || 
        typeof brier_check !== "boolean") {
      return NextResponse.json({ error: "Invalid configuration parameters" }, { status: 400 });
    }

    // Save to database
    const setting = await prisma.systemSetting.upsert({
      where: { key: "PROMOTION_POLICY" },
      update: {
        value: { auto_promote, eval_days, min_snapshots, clv_threshold, brier_check }
      },
      create: {
        key: "PROMOTION_POLICY",
        value: { auto_promote, eval_days, min_snapshots, clv_threshold, brier_check }
      }
    });

    return NextResponse.json({ success: true, policy: setting.value });
  } catch (error: any) {
    console.error("[Promotion Policy API] POST Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
