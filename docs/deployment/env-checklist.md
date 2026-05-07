# Production Environment Variables

Required in Vercel Dashboard → Settings → Environment Variables:

## Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_xxx
CLERK_SECRET_KEY=sk_live_xxx
CLERK_WEBHOOK_SECRET=whsec_xxx
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/dashboard

## Database (Neon)
DATABASE_URL=postgresql://xxx

## AI
ANTHROPIC_API_KEY=sk-ant-xxx
ANTHROPIC_MODEL=claude-sonnet-4-5

## Email (Resend)
RESEND_API_KEY=re_xxx
RESEND_FROM_EMAIL=noreply@yourdomain.com

## Payments (Stripe)
STRIPE_SECRET_KEY=sk_live_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_xxx
NEXT_PUBLIC_STRIPE_PRICE_PRO=price_xxx
NEXT_PUBLIC_STRIPE_PRICE_BUSINESS=price_xxx

## App
NEXT_PUBLIC_APP_URL=https://yourdomain.com
INTERNAL_API_SECRET=generate-random-32-chars
CRON_SECRET=generate-random-32-chars

## Optional (for integrations)
SLACK_CLIENT_ID=xxx
SLACK_CLIENT_SECRET=xxx
SLACK_SIGNING_SECRET=xxx
GOOGLE_CLIENT_ID=xxx
GOOGLE_CLIENT_SECRET=xxx
ZOOM_CLIENT_ID=xxx
ZOOM_CLIENT_SECRET=xxx
ZOOM_WEBHOOK_SECRET_TOKEN=xxx
MICROSOFT_CLIENT_ID=xxx
MICROSOFT_CLIENT_SECRET=xxx
MICROSOFT_TENANT_ID=xxx

## Optional (observability)
METRICS_SECRET=generate-random-32-chars
# OTEL_EXPORTER_OTLP_ENDPOINT=https://your-otel-endpoint

## Note: Redis / BullMQ worker is NOT deployed on Vercel
## The background worker (apps/worker) runs separately (Railway, Render, Fly.io, etc.)
## Vercel functions are stateless — Redis-backed queues are not supported here
