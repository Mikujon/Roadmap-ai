import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { stripe } from "@/lib/stripe";
import { db } from "@/lib/prisma";
import Stripe from "stripe";

export async function POST(req: Request) {
  const body = await req.text();
  const sig = (await headers()).get("stripe-signature")!;
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const getOrgId = (obj: any) => obj?.metadata?.orgId as string | undefined;

  async function syncSubscription(sub: Stripe.Subscription) {
    const orgId =
      getOrgId(sub) ??
      getOrgId(await stripe.customers.retrieve(sub.customer as string));
    if (!orgId) return;
    const priceId = sub.items.data[0]?.price.id;
    const isProPrice = priceId === process.env.STRIPE_PRICE_PRO_MONTHLY;
    const status =
      sub.status === "active"
        ? isProPrice
          ? "PRO"
          : "BUSINESS"
        : sub.status === "past_due"
        ? "PAST_DUE"
        : "CANCELLED";

    await db.organisation.update({
      where: { id: orgId },
      data: {
        stripeSubscriptionId: sub.id,
        stripePriceId: priceId,
        subscriptionStatus: status as any,
        currentPeriodEnd: new Date((sub as any).current_period_end * 1000),
      },
    });
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const s = event.data.object as Stripe.Checkout.Session;
      if (s.mode === "subscription" && s.subscription) {
        const sub = await stripe.subscriptions.retrieve(
          s.subscription as string
        );
        await syncSubscription({
          ...sub,
          metadata: { ...sub.metadata, orgId: s.metadata?.orgId ?? '' },
        });
      }
      break;
    }
    case "customer.subscription.updated":
    case "customer.subscription.deleted":
      await syncSubscription(event.data.object as Stripe.Subscription);
      break;
  }

  return NextResponse.json({ received: true });
}
