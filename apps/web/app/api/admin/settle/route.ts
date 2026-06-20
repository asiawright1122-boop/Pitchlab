import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAdminSession } from "@/lib/admin";
import { settleOpenPaperTrades } from "@/lib/paper";
import { notifySettledTrades } from "@/lib/settlement-notifier";

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    if (!(await verifyAdminSession(request))) {
      return NextResponse.json({ error: "Unauthorized Admin" }, { status: 401 });
    }

    console.log("[Settlement Engine] Starting manual settlement run...");

    // 2. Delegate to the upgraded core settlement library
    const { count: processedCount, settled } = await settleOpenPaperTrades(prisma);
    if (settled.length > 0) {
      await notifySettledTrades(settled);
    }

    console.log(`[Settlement Engine] Manual run complete. Processed ${processedCount} trades.`);

    return NextResponse.json({
      success: true,
      message: `Settlement complete. Processed ${processedCount} trades.`,
      processed: processedCount
    });

  } catch (error) {
    console.error("[Settlement Engine] Error during settlement:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
