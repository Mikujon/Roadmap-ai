import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { getAuthContext } from "@/lib/auth";
import { db } from "@/lib/prisma";

export async function POST(req: Request) {
  const ctx = await getAuthContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { priceId } = await req.json();

  let customerId = ctx.org.stripeCustomerId;
  if (!customerId) {
    const customer = await stripe.customers.create({
      name: ctx.org.name,
      email: ctx.user.email,
      metadata: { orgId: ctx.org.id, clerkOrgId: ctx.org.clerkOrgId },
    });
    customerId = customer.id;
    await db.organisation.update({
      where: { id: ctx.org.id },
      data: { stripeCustomerId: customerId },
    });
  }

const session = await stripe.checkout.sessions.create({
  customer: customerId,
  mode: "subscription",
  line_items: [{ price: priceId, quantity: 1 }],
  success_url: `${process.env.NEXT_PUBLIC_APP_URL}/settings/billing?success=1`,
  cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/settings/billing`,
  metadata: { orgId: ctx.org.id },
  allow_promotion_codes: true,
  trial_period_days: 14,
} as any);
  return NextResponse.json({ url: session.url });
}