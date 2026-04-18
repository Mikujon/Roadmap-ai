FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@10.33.0 --activate

# ── deps ──────────────────────────────────────────────────────────────────
FROM base AS deps
WORKDIR /app
COPY pnpm-workspace.yaml ./
COPY package.json ./
COPY packages/core/package.json       ./packages/core/
COPY packages/engines/package.json    ./packages/engines/
COPY packages/ai/package.json         ./packages/ai/
COPY packages/queue/package.json      ./packages/queue/
COPY apps/worker/package.json         ./apps/worker/
RUN pnpm install --frozen-lockfile --filter @roadmap/worker...

# ── build ─────────────────────────────────────────────────────────────────
FROM deps AS builder
WORKDIR /app
COPY packages/ ./packages/
COPY apps/worker/ ./apps/worker/
COPY prisma/ ./prisma/
COPY tsconfig.json ./
RUN pnpm --filter @roadmap/worker build

# ── runner ────────────────────────────────────────────────────────────────
FROM node:22-alpine AS runner
RUN corepack enable && corepack prepare pnpm@10.33.0 --activate
WORKDIR /app

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages     ./packages
COPY --from=builder /app/apps/worker  ./apps/worker
COPY --from=builder /app/prisma       ./prisma

ENV NODE_ENV=production

CMD ["node", "--import", "tsx/esm", "apps/worker/src/index.ts"]
