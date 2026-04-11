import { AsyncLocalStorage } from "node:async_hooks";

export interface LogContext {
  requestId?: string;
  orgId?:     string;
  userId?:    string;
  projectId?: string;
  service?:   string;
  [key: string]: unknown;
}

const storage = new AsyncLocalStorage<LogContext>();

/** Run fn inside a log context — all loggers created within fn inherit these fields. */
export function withLogContext<T>(ctx: LogContext, fn: () => T): T {
  const parent = storage.getStore() ?? {};
  return storage.run({ ...parent, ...ctx }, fn);
}

/** Read the current log context (or empty object if outside a context). */
export function getLogContext(): LogContext {
  return storage.getStore() ?? {};
}
