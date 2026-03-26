import { auth, currentUser, clerkClient } from "@clerk/nextjs/server";
import { db } from "./prisma";
import { NextResponse } from "next/server";

export async function getAuthContext() {
  const { userId, orgId } = await auth();
  if (!userId || !orgId) return null;

  const clerkUser = await currentUser();
  if (!clerkUser) return null;

  const client = await clerkClient();
  const clerkOrg = await client.organizations.getOrganization({ organizationId: orgId });

  // Upsert user
  const user = await db.user.upsert({
    where: { clerkId: userId },
    update: {
      name: `${clerkUser.firstName ?? ""} ${clerkUser.lastName ?? ""}`.trim(),
      email: clerkUser.emailAddresses[0]?.emailAddress ?? "",
      avatarUrl: clerkUser.imageUrl,
    },
    create: {
      clerkId: userId,
      name: `${clerkUser.firstName ?? ""} ${clerkUser.lastName ?? ""}`.trim(),
      email: clerkUser.emailAddresses[0]?.emailAddress ?? "",
      avatarUrl: clerkUser.imageUrl,
    },
  });

  // Upsert organisation
  const org = await db.organisation.upsert({
    where: { clerkOrgId: orgId },
    update: { name: clerkOrg.name },
    create: {
      clerkOrgId: orgId,
      name: clerkOrg.name,
      slug: clerkOrg.slug ?? orgId,
    },
  });

  // Upsert membership
  const member = await db.member.upsert({
    where: { userId_organisationId: { userId: user.id, organisationId: org.id } },
    update: {},
    create: {
      userId: user.id,
      organisationId: org.id,
      role: "ADMIN",
    },
  });

  return { user, org, role: member.role };
}

export function requireAuth(handler: Function) {
  return async (req: Request, ctx: any) => {
    const context = await getAuthContext();
    if (!context)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return handler(req, ctx, context);
  };
}