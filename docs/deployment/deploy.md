# Deployment Guide

## First Deploy

### 1. Push to GitHub main branch
```bash
git push origin main
```

### 2. Connect to Vercel
```bash
vercel link
```
Or via Vercel Dashboard → Import Project → GitHub

### 3. Set environment variables in Vercel dashboard
See [env-checklist.md](./env-checklist.md) for the full list.

### 4. Configure build settings in Vercel
- **Root directory**: `.` (project root, not apps/web/)
- **Build command**: `pnpm build`
- **Output directory**: `.next`
- **Install command**: `pnpm install`
- **Node.js version**: 20.x

### 5. Deploy
```bash
vercel --prod
```

---

## After First Deploy

### 6. Update Clerk webhook URL
Clerk Dashboard → Webhooks → Add endpoint:
```
https://yourdomain.com/api/webhooks/clerk
```
Events to subscribe: `user.created`, `organization.created`, `organizationMembership.created`

### 7. Update Stripe webhook URL
Stripe Dashboard → Developers → Webhooks → Add endpoint:
```
https://yourdomain.com/api/webhooks/stripe
```
Events: `customer.subscription.updated`, `customer.subscription.deleted`, `checkout.session.completed`

### 8. Run database migrations
```bash
DATABASE_URL=<production-url> npx prisma migrate deploy
```

### 9. Test production
- [ ] Sign up new account
- [ ] Create project
- [ ] Mark feature DONE → health score updates
- [ ] Guardian AI chat works (check Vercel function logs for Claude API calls)
- [ ] Cron runs at xx:00 (check Vercel Dashboard → Cron Jobs)
- [ ] SSE stream connects (check /api/stream response in browser DevTools → Network)

---

## Subsequent Deploys

Push to `main` — Vercel auto-deploys on every push.

For database schema changes:
```bash
DATABASE_URL=<production-url> npx prisma migrate deploy
```

---

## Monitoring

- **Vercel Dashboard → Functions** — watch for runtime errors and cold-start times
- **Vercel Dashboard → Cron Jobs** — verify hourly sweep runs at :00
- **Vercel Dashboard → Functions → `/api/stream`** — SSE connections (max 300s)
- **Neon Console** — query performance and connection count

---

## Notes

- The **BullMQ worker** (`apps/worker/`) is NOT deployed on Vercel — it requires a persistent Node process with Redis. Deploy separately on Railway, Render, or Fly.io with `REDIS_URL` pointing to Upstash Redis.
- The **SSE endpoint** (`/api/stream`) has `maxDuration: 300` — Vercel Pro required (Hobby plan caps at 60s).
- **Prisma** uses the Neon serverless adapter in production (`@prisma/adapter-neon`) for connection pooling.
