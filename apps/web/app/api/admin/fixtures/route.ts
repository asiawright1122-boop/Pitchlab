import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAdminSession } from "@/lib/admin";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    if (!(await verifyAdminSession(request))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "100", 10);

    const fixtures = await prisma.fixture.findMany({
      orderBy: { kickoffUtc: "desc" },
      take: limit,
    });

    return NextResponse.json({ fixtures });
  } catch (error) {
    console.error("[Admin Fixtures] Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
