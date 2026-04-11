import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Only externalize packages that contain native Node.js bindings or
  // use non-bundleable APIs (net, tls, binary addons, etc.).
  // Pure-JS packages (prom-client, winston) are bundled normally by webpack.
  serverExternalPackages: [
    // ioredis uses net/tls — must stay external
    "ioredis",
    // bullmq depends on ioredis
    "bullmq",
    // workspace package that imports bullmq/ioredis
    "@roadmap/queue",
  ],
};

export default nextConfig;
