export async function register() {
  // Observability hooks — only active when workspace packages are available
  try {
    if (process.env.NEXT_RUNTIME === "nodejs") {
      await import("@roadmap/metrics");
    }
  } catch {
    // Workspace package not available in standalone mode — skip
  }
}
