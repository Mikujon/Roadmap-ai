import { z, ZodSchema } from "zod";
import { Errors } from "./response";
import { NextResponse } from "next/server";

export async function validateBody<T>(
  req: Request,
  schema: ZodSchema<T>
): Promise<{ data: T; error: null } | { data: null; error: NextResponse }> {
  try {
    const body = await req.json();
    const result = schema.safeParse(body);
    if (!result.success) {
      return {
        data: null,
        error: Errors.VALIDATION(result.error.flatten()),
      };
    }
    return { data: result.data, error: null };
  } catch {
    return {
      data: null,
      error: Errors.VALIDATION("Invalid JSON body"),
    };
  }
}

export async function validateQuery<T>(
  req: Request,
  schema: ZodSchema<T>
): Promise<{ data: T; error: null } | { data: null; error: NextResponse }> {
  const { searchParams } = new URL(req.url);
  const query = Object.fromEntries(searchParams.entries());
  const result = schema.safeParse(query);
  if (!result.success) {
    return { data: null, error: Errors.VALIDATION(result.error.flatten()) };
  }
  return { data: result.data, error: null };
}

// ── Reusable schemas ────────────────────────────────────────

export const PaginationSchema = z.object({
  page:   z.coerce.number().min(1).default(1),
  limit:  z.coerce.number().min(1).max(100).default(20),
  cursor: z.string().optional(),
});

export const IdParamSchema = z.object({
  id: z.string().min(1),
});
