import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  serverExternalPackages: [
    "@prisma/client",
    ".prisma/client",
    "ioredis",
    "bullmq",
    "@roadmap/queue",
  ],
  turbopack: {
    resolveAlias: {
      ".prisma/client": "./node_modules/.prisma/client",
    },
  },
};

export default nextConfig;