import { getAuthContext } from "@/lib/auth";
import { can, Role }      from "@/lib/permissions";
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

// ── Permission helper inside routes ────────────────────────

export function guard(role: Role, permission: (r: Role) => boolean): NextResponse | null {
  if (!permission(role)) return Errors.FORBIDDEN();
  return null;
}

export { can };
