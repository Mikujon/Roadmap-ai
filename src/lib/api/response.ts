import { NextResponse } from "next/server";

// ── Standard envelope types ─────────────────────────────────

export interface ApiMeta {
  timestamp: string;
  version: string;
  requestId?: string;
}

export interface ApiSuccess<T> {
  data: T;
  meta: ApiMeta;
}

export interface ApiError {
  error: {
    code: string;
    message: string;
    status: number;
    details?: unknown;
  };
  meta: ApiMeta;
}

function meta(): ApiMeta {
  return {
    timestamp: new Date().toISOString(),
    version: "1.0",
  };
}

// ── Response helpers ────────────────────────────────────────

export function ok<T>(data: T, status = 200): NextResponse {
  return NextResponse.json({ data, meta: meta() } satisfies ApiSuccess<T>, { status });
}

export function created<T>(data: T): NextResponse {
  return ok(data, 201);
}

export function noContent(): NextResponse {
  return new NextResponse(null, { status: 204 });
}

export function err(
  code: string,
  message: string,
  status: number,
  details?: unknown
): NextResponse {
  return NextResponse.json(
    { error: { code, message, status, details }, meta: meta() } satisfies ApiError,
    { status }
  );
}

// ── Standard error codes ────────────────────────────────────

export const Errors = {
  UNAUTHORIZED:      () => err("UNAUTHORIZED",      "Authentication required",          401),
  FORBIDDEN:         () => err("FORBIDDEN",          "Insufficient permissions",         403),
  NOT_FOUND:         (resource = "Resource") =>
                          err("NOT_FOUND",           `${resource} not found`,            404),
  CONFLICT:          (msg: string) =>
                          err("CONFLICT",            msg,                                409),
  VALIDATION:        (details: unknown) =>
                          err("VALIDATION_ERROR",    "Invalid request data",             422, details),
  INTERNAL:          (msg = "Internal server error") =>
                          err("INTERNAL_ERROR",      msg,                                500),
  RATE_LIMITED:      () => err("RATE_LIMITED",       "Too many requests",               429),
  NOT_IMPLEMENTED:   () => err("NOT_IMPLEMENTED",    "This endpoint is not yet ready",  501),
} as const;
