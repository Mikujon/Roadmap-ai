export async function register() {
  try {
    if (process.env.NEXT_RUNTIME === "nodejs") {
      await import("@roadmap/metrics");
    }
  } catch {
    // Workspace package not available in standalone mode — skip
  }
}
