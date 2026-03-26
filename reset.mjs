import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();
await db.sprint.updateMany({ where: { status: "DONE" }, data: { status: "UPCOMING" } });
console.log("Reset done!");
await db.$disconnect();