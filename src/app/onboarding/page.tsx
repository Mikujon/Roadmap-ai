"use server";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { db } from "@/lib/prisma";
import OnboardingClient from "./OnboardingClient";

export default async function OnboardingPage() {
  const { userId, orgId } = await auth();
  if (!userId) redirect("/sign-in");

  // If org exists and onboarding is already complete, go to dashboard
  if (orgId) {
    const org = await db.organisation.findUnique({
      where:  { clerkOrgId: orgId },
      select: { onboardingCompleted: true, name: true },
    });
    if (org?.onboardingCompleted) redirect("/dashboard");
    return <OnboardingClient step="complete" orgName={org?.name ?? ""} />;
  }

  return <OnboardingClient step="create-org" orgName="" />;
}
