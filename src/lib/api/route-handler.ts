import { getAuthContext } from "@/lib/auth";
import { can, Role }      from "@/lib/permissions";
import { db }             from "@/lib/prisma";
import { Errors }         from "./response";
import { NextResponse }   from "next/server";

type AuthContext = Awaited<ReturnType<typeof getAuthContext>>;

interface RouteOptions {
  allowedRoles?: Role[];
  requireAuth?: boolean;
}

type Handler = (
  req: Request,
  ctx: NonNullable<AuthContext>,
  params: Record<string, string>
) => Promise<NextResponse>;

export function withAuth(handler: Handler, options: RouteOptions = {}) {
  return async (req: Request, { params }: { params: Promise<Record<string, string>> }) => {
    try {
      const resolvedParams = await params;

      if (options.requireAuth === false) {
        return handler(req, {} as NonNullable<AuthContext>, resolvedParams);
      }

      const ctx = await getAuthContext();
      if (!ctx) return Errors.UNAUTHORIZED();

      if (options.allowedRoles && !options.allowedRoles.includes(ctx.role as Role)) {
        return Errors.FORBIDDEN();
      }

      return await handler(req, ctx, resolvedParams);
    } catch (error) {
      console.error("Route handler error:", error);
      return Errors.INTERNAL(String(error));
    }
  };
}

// ── External API auth (Bearer org API key OR Clerk session) ──

export interface ApiAuthCtx {
  orgId: string;
  role: Role | null;
  userId: string | null;
}

type ApiHandler = (
  req: Request,
  ctx: ApiAuthCtx,
  params: Record<string, string>
) => Promise<NextResponse>;

export function withApiAuth(handler: ApiHandler) {
  return async (req: Request, { params }: { params: Promise<Record<string, string>> }) => {
    try {
      const resolvedParams = await params;

      const authHeader = req.headers.get("authorization");
      if (authHeader?.startsWith("Bearer ")) {
        const token = authHeader.slice(7);
        const org = await db.organisation.findUnique({ where: { apiKey: token } });
        if (org) {
          return await handler(req, { orgId: org.id, role: null, userId: null }, resolvedParams);
        }
        return Errors.UNAUTHORIZED();
      }

      const ctx = await getAuthContext();
      if (!ctx) return Errors.UNAUTHORIZED();

      return await handler(
        req,
        { orgId: ctx.org.id, role: ctx.role as Role, userId: ctx.user.id },
        resolvedParams,
      );
    } catch (error) {
      console.error("API route error:", error);
      return Errors.INTERNAL(String(error));
    }
  };
}

// ── Permission helper inside routes ────────────────────────

export function guard(role: Role, permission: (r: Role) => boolean): NextResponse | null {
  if (!permission(role)) return Errors.FORBIDDEN();
  return null;
}

export { can };
