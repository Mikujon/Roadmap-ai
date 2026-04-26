import { getAuthContext } from "@/lib/auth";

type ApiAuthResult =
  | { valid: true;  orgId: string; ctx: Awaited<ReturnType<typeof getAuthContext>> }
  | { valid: false; orgId: null;   ctx: null };

export async function getApiAuth(req: Request): Promise<ApiAuthResult> {
  const authHeader = req.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    if (token === process.env.INTERNAL_API_SECRET) {
      const orgId = req.headers.get("x-org-id");
      if (orgId) return { valid: true, orgId, ctx: null };
    }
  }

  const ctx = await getAuthContext();
  if (ctx) return { valid: true, orgId: ctx.org.id, ctx };

  return { valid: false, orgId: null, ctx: null };
}
