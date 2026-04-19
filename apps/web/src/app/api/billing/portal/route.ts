import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { getAuthContext } from "@/lib/auth";

export async function POST() {
  const ctx = await getAuthContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!ctx.org.stripeCustomerId)
    return NextResponse.json({ error: "No billing account" }, { status: 400 });

  const session = await stripe.billingPortal.sessions.create({
    customer: ctx.org.stripeCustomerId,
    return_url: `${process.env.NEXT_PUBLIC_APP_URL}/settings/billing`,
  });
  return NextResponse.json({ url: session.url });
}