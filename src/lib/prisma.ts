import { PrismaClient } from "@prisma/client";

// ── Primary DB (read + write) ─────────────────────────────────────────────
const globalForPrisma = global as unknown as { db: PrismaClient };

export const db = globalForPrisma.db ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.db = db;

// ── Read Replica ──────────────────────────────────────────────────────────
// Points to DATABASE_URL_REPLICA when set (e.g. Neon read-replica branch,
// RDS reader endpoint). Falls back to primary so the code works without a
// replica in local dev.
//
// Use dbRead for:
//  - Dashboard / portfolio aggregations
//  - Analytics queries
//  - Any SELECT that can tolerate a few-seconds replication lag
//
// Do NOT use dbRead for:
//  - Writes (obviously)
//  - Reads that must see the just-written state (post-mutation checks)
//  - withOrgContext() — always goes through primary to honour RLS safely

const _readUrl = process.env.DATABASE_URL_REPLICA ?? process.env.DATABASE_URL;

const globalForPrismaRead = global as unknown as { dbRead: PrismaClient };

export const dbRead: PrismaClient =
  globalForPrismaRead.dbRead ??
  new PrismaClient({
    datasources: { db: { url: _readUrl } },
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrismaRead.dbRead = dbRead;

// ── withOrgContext ────────────────────────────────────────────────────────
// Wraps a DB operation in a transaction that sets the PostgreSQL session
// variable `app.organisation_id`. This activates all RLS policies.
//
// Usage:
//   const results = await withOrgContext(orgId, (tx) => tx.project.findMany());
//
// IMPORTANT: Always use this wrapper in API route handlers.
// The worker bypasses RLS intentionally (it runs across all orgs).
export async function withOrgContext<T>(
  orgId: string,
  fn: (tx: PrismaClient) => Promise<T>
): Promise<T> {
  return db.$transaction(async (tx) => {
    await tx.$executeRawUnsafe(`SELECT set_org_context($1)`, orgId);
    return fn(tx as unknown as PrismaClient);
  });
}

// ── Typed raw query helper ────────────────────────────────────────────────
// Convenience wrapper for materialized-view reads (bypasses Prisma model layer).
export async function queryRaw<T>(
  client: PrismaClient,
  sql: TemplateStringsArray,
  ...values: unknown[]
): Promise<T[]> {
  return client.$queryRaw<T[]>(sql, ...values);
}
