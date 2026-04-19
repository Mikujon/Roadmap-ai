/**
 * Fire-and-forget: invalidates the cached Guardian report for a project
 * so the next fetch re-runs the AI analysis.
 * Called after feature/sprint/risk mutations.
 */
export function triggerGuardian(projectId: string): void {
  if (!projectId) return;
  // Non-blocking: invalidate the guardian cache endpoint in the background
  fetch(`${process.env.NEXT_PUBLIC_APP_URL ?? ""}/api/guardian/${projectId}/invalidate`, {
    method: "POST",
  }).catch(() => {
    // silent — cache invalidation is best-effort
  });
}
