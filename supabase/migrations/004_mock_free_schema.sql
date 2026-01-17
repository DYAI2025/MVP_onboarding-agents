-- Mock-Free Schema Extensions
-- Adds fields required by server code to eliminate runtime DB errors
-- Run after 001_initial_schema.sql and 002_rls_policies.sql

-- 1. Profiles: add ui_state for frontend persistence
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS ui_state JSONB NULL;

-- 2. Conversations: add status, metadata, transcript
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'started';
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS metadata JSONB NULL;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS transcript TEXT NULL;

-- Add CHECK constraint for status (if not exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'conversations_status_check'
  ) THEN
    ALTER TABLE conversations ADD CONSTRAINT conversations_status_check CHECK (status IN ('started','active','completed','failed'));
  END IF;
END $$;

-- 3. Jobs: ensure type and status are consistent with server code
-- Current schema has type CHECK ('report','pdf','email') and status CHECK ('queued','processing','done','failed')
-- Server code uses these exact values, so no change needed
-- But we add a comment for clarity
COMMENT ON COLUMN jobs.type IS 'Job type: report, pdf, email (must match server code)';
COMMENT ON COLUMN jobs.status IS 'Job status: queued, processing, done, failed (must match server code)';

-- 4. Index for conversations.status (performance)
CREATE INDEX IF NOT EXISTS idx_conversations_status ON conversations(status);

