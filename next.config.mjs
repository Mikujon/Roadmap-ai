/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  serverExternalPackages: [
    "@prisma/client",
    ".prisma/client",
    "ioredis",
    "bullmq",
    "@roadmap/queue",
  ],
};

export default nextConfig;
