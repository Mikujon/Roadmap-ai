import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();

async function main() {
  // Get the TEst organisation
  const org = await db.organisation.findFirst({
    where: { name: "TEst" },
  });

  if (!org) {
    console.log("Organisation 'TEst' not found");
    await db.$disconnect();
    return;
  }

  // Get the existing admin user
  const adminUser = await db.user.findFirst({
    where: { email: "jetmir.gjeloshi@gmail.com" }
  });

  if (!adminUser) {
    console.log("Admin user not found");
    await db.$disconnect();
    return;
  }

  // Create test users for each role
  const testUsers = [
    { email: "pmo@test.roadmapai.com",         name: "Test PMO",         role: "PMO" },
    { email: "ceo@test.roadmapai.com",         name: "Test CEO",         role: "CEO" },
    { email: "stakeholder@test.roadmapai.com", name: "Test Stakeholder", role: "STAKEHOLDER" },
    { email: "dev@test.roadmapai.com",         name: "Test Developer",   role: "DEV" },
  ];

  for (const u of testUsers) {
    // Create user (no clerkId — test only)
    const user = await db.user.upsert({
      where: { email: u.email },
      create: {
        clerkId:       `test_${u.role.toLowerCase()}_${Date.now()}`,
        email:         u.email,
        name:          u.name,
        preferredView: u.role,
      },
      update: {
        name:          u.name,
        preferredView: u.role,
      },
    });

    // Create member with correct role
    await db.member.upsert({
      where: {
        userId_organisationId: {
          userId:         user.id,
          organisationId: org.id,
        }
      },
      create: {
        userId:         user.id,
        organisationId: org.id,
        role:           u.role as any,
      },
      update: {
        role: u.role as any,
      },
    });

    console.log(`✓ Created: ${u.name} (${u.role}) — ${u.email}`);
  }

  console.log("\nAll test users created in org: TEst");
  console.log("\nTo test each role, change preferredView in the app:");
  console.log("Settings → Profile → View as: PMO / CEO / Stakeholder / Developer");

  await db.$disconnect();
}

main().catch(console.error);
