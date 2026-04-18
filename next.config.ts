import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Only externalize packages that contain native Node.js bindings or
  // use non-bundleable APIs (net, tls, binary addons, etc.).
  serverExternalPackages: [
    // Prisma uses native .node binary — must stay external
    "@prisma/client",
    ".prisma/client",
    // ioredis uses net/tls — must stay external
    "ioredis",
    // bullmq depends on ioredis
    "bullmq",
    // workspace package that imports bullmq/ioredis
    "@roadmap/queue",
  ],
  experimental: {
    turbopack: {
      resolveAlias: {
        // Turbopack misresolves `.prisma/client` (leading dot → treated as relative).
        // Point it directly to the generated output directory.
        ".prisma/client": path.resolve(__dirname, "node_modules/.prisma/client"),
      },
    },
  },
};

export default nextConfig;
