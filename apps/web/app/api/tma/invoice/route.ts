import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const initData = request.headers.get("x-tma-init-data");
    const token = process.env.TELEGRAM_BOT_TOKEN;
    
    if (!initData || !token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { fixtureId } = await request.json();
    if (!fixtureId) {
      return NextResponse.json({ error: "Missing fixtureId" }, { status: 400 });
    }

    // Call Telegram Bot API to create an invoice link
    // Currency MUST be XTR for Telegram Stars
    const payload = JSON.stringify({
      title: "Unlock Quant Edge AI Forecast",
      description: `Premium Prediction for Match ${fixtureId}`,
      payload: `unlock_${fixtureId}`,
      provider_token: "", // Empty for Telegram Stars
      currency: "XTR",
      prices: [{ label: "Premium AI Forecast", amount: 1 }] // 1 Star
    });

    const tgResponse = await fetch(`https://api.telegram.org/bot${token}/createInvoiceLink`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: payload
    });

    const data = await tgResponse.json();
    if (!data.ok) {
      console.error("[tma-invoice] Telegram API Error:", data);
      return NextResponse.json({ error: "Failed to create invoice" }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      invoiceUrl: data.result, // https://t.me/$xxxxxx
    });
  } catch (error) {
    console.error("Error creating invoice:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
