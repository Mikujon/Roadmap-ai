-- Migration: add_ambient_intelligence
-- Safe migration: only adds new columns, does not modify existing data

-- 1. Add integration fields to organisations table
ALTER TABLE "organisations" ADD COLUMN IF NOT EXISTS "slackTeamId" TEXT;
ALTER TABLE "organisations" ADD COLUMN IF NOT EXISTS "slackBotToken" TEXT;
ALTER TABLE "organisations" ADD COLUMN IF NOT EXISTS "gmailEmail" TEXT;
ALTER TABLE "organisations" ADD COLUMN IF NOT EXISTS "gmailWatchId" TEXT;
ALTER TABLE "organisations" ADD COLUMN IF NOT EXISTS "teamsWebhookUrl" TEXT;
ALTER TABLE "organisations" ADD COLUMN IF NOT EXISTS "zoomAccountId" TEXT;

-- 2. Create ambient_messages table
CREATE TABLE IF NOT EXISTS "ambient_messages" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT cuid(),
    "orgId" TEXT NOT NULL,
    "projectId" TEXT,
    "platform" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "sender" TEXT NOT NULL,
    "summary" TEXT,
    "confidence" DOUBLE PRECISION,
    "extractions" JSONB,
    "applied" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
    CONSTRAINT "ambient_messages_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organisations"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ambient_messages_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "ambient_messages_orgId_createdAt_idx" ON "ambient_messages"("orgId", "createdAt");
CREATE INDEX IF NOT EXISTS "ambient_messages_projectId_idx" ON "ambient_messages"("projectId");