import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import { getStripe } from "@/lib/stripe";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const stripe = getStripe();
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripe || !secret) {
    return NextResponse.json({ error: "webhook not configured" }, { status: 503 });
  }

  const body = await request.text();
  const sig = request.headers.get("stripe-signature");
  if (!sig) {
    return NextResponse.json({ error: "missing signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, secret);
  } catch (err) {
    console.error("[billing/webhook] verify failed", err);
    return NextResponse.json({ error: "invalid signature" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const userId = session.metadata?.userId;
    if (userId) {
      let periodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      if (session.subscription && typeof session.subscription === "string") {
        const sub = await stripe.subscriptions.retrieve(session.subscription);
        periodEnd = new Date(sub.current_period_end * 1000);
        await stripe.subscriptions.update(sub.id, {
          metadata: { userId },
        });
      }
      await prisma.subscription.update({
        where: { userId },
        data: { planId: "pro", status: "active", periodEnd },
      });
    }
  }

  if (event.type === "customer.subscription.deleted") {
    const sub = event.data.object as Stripe.Subscription;
    const userId = sub.metadata?.userId;
    if (userId) {
      await prisma.subscription.update({
        where: { userId },
        data: { planId: "free", status: "canceled", periodEnd: new Date() },
      });
    }
  }

  return NextResponse.json({ received: true });
}
