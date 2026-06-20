import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAdminSession } from "@/lib/admin";

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    if (!(await verifyAdminSession(request))) {
      return NextResponse.json({ error: "Unauthorized Admin" }, { status: 401 });
    }

    const aiConfig = await prisma.systemSetting.findUnique({
      where: { key: "AI_CONFIG" }
    });

    return NextResponse.json({
      config: aiConfig?.value || null
    });
  } catch (error) {
    console.error("Admin settings error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    if (!(await verifyAdminSession(request))) {
      return NextResponse.json({ error: "Unauthorized Admin" }, { status: 401 });
    }

    const body = await request.json();
    const { provider, baseURL, apiKey, modelName } = body;

    if (!provider || !baseURL || !apiKey || !modelName) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Upsert the AI config
    const config = await prisma.systemSetting.upsert({
      where: { key: "AI_CONFIG" },
      update: {
        value: { provider, baseURL, apiKey, modelName }
      },
      create: {
        key: "AI_CONFIG",
        value: { provider, baseURL, apiKey, modelName }
      }
    });

    return NextResponse.json({
      success: true,
      config: config.value
    });
  } catch (error) {
    console.error("Admin settings error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
