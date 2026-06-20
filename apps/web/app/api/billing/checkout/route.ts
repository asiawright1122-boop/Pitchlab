import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-server";
import { getStripe, siteUrl } from "@/lib/stripe";

export async function POST() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "sign in required" }, { status: 401 });
  }
  if (user.planId === "pro") {
    return NextResponse.json({ error: "already on pro" }, { status: 400 });
  }

  const stripe = getStripe();
  const priceId = process.env.STRIPE_PRO_PRICE_ID;
  if (!stripe || !priceId) {
    return NextResponse.json(
      { error: "Stripe not configured (STRIPE_SECRET_KEY, STRIPE_PRO_PRICE_ID)" },
      { status: 503 }
    );
  }

  const base = siteUrl();
  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer_email: user.email,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${base}/pricing?checkout=success`,
    cancel_url: `${base}/pricing?checkout=cancel`,
    metadata: { userId: user.id },
  });

  return NextResponse.json({ url: session.url });
}
