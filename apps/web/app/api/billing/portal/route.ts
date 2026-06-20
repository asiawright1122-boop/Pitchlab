import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-server";
import { getStripe, siteUrl } from "@/lib/stripe";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    // 1. 获取当前会话登录的用户
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "sign in required" }, { status: 401 });
    }

    const stripe = getStripe();
    if (!stripe) {
      return NextResponse.json(
        { error: "Stripe not configured on server" },
        { status: 503 }
      );
    }

    // 2. 动态查询 Stripe Customer。以用户的 Email 为主键拉取，避免修改 DB Schema。
    let customerId = "";
    const customers = await stripe.customers.list({
      email: user.email,
      limit: 1,
    });

    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
    } else {
      // 若无该客户，在 Stripe 端实时注册
      console.log(`[billing/portal] Customer not found for ${user.email}. Creating new Customer in Stripe...`);
      const newCustomer = await stripe.customers.create({
        email: user.email,
        metadata: {
          userId: user.id,
        },
      });
      customerId = newCustomer.id;
    }

    // 3. 创建 Billing Portal Session (跳转去管理/退订订阅)
    const base = siteUrl();
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${base}/pricing`,
    });

    return NextResponse.json({ url: portalSession.url });
  } catch (error: any) {
    console.error("[billing/portal] Error generating portal session:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create portal session" },
      { status: 500 }
    );
  }
}
