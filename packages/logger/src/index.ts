import winston from "winston";
import { getLogContext } from "./context.js";

export { withLogContext, getLogContext } from "./context.js";
export type { LogContext } from "./context.js";

const isDev = process.env.NODE_ENV !== "production";

// ── Formats ─────────────────────────────────────────────────────────────────

const jsonFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  // Merge AsyncLocalStorage context into every log entry
  winston.format((info) => {
    const ctx = getLogContext();
    return { ...info, ...ctx };
  })(),
  winston.format.json()
);

const prettyFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: "HH:mm:ss" }),
  winston.format.errors({ stack: true }),
  winston.format.printf(({ level, message, timestamp, service, requestId, ...rest }) => {
    const ctx = getLogContext();
    const rid = requestId ?? ctx.requestId;
    const svc = service ?? ctx.service ?? "";
    const extra = Object.keys(rest).length ? " " + JSON.stringify(rest) : "";
    return `${timestamp} [${svc}] ${level}: ${message}${rid ? ` (req=${rid})` : ""}${extra}`;
  })
);

// ── Base instance ────────────────────────────────────────────────────────────

const base = winston.createLogger({
  level: process.env.LOG_LEVEL ?? (isDev ? "debug" : "info"),
  format: isDev ? prettyFormat : jsonFormat,
  transports: [new winston.transports.Console()],
  // Unhandled rejections / exceptions are logged but don't kill the process
  exceptionHandlers: [new winston.transports.Console()],
  rejectionHandlers: [new winston.transports.Console()],
});

// ── Factory ──────────────────────────────────────────────────────────────────

/**
 * Create a child logger bound to a service name and optional static fields.
 *
 * @example
 * const log = createLogger("guardian-worker");
 * log.info("job started", { projectId });
 */
export function createLogger(
  service: string,
  meta: Record<string, unknown> = {}
): winston.Logger {
  return base.child({ service, ...meta });
}

/** Default logger — use createLogger() in production code for proper service labels. */
export const logger = createLogger("roadmap");
