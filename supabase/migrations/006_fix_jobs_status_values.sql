-- Fix jobs.status CHECK constraint to match server code
-- Server code uses 'completed' but schema has 'done'
-- Run after 005_add_report_to_conversations.sql

-- Drop existing constraint
ALTER TABLE jobs DROP CONSTRAINT IF EXISTS jobs_status_check;

-- Add new constraint with correct values
ALTER TABLE jobs ADD CONSTRAINT jobs_status_check CHECK (status IN ('queued', 'processing', 'completed', 'failed'));

-- Update comment
COMMENT ON COLUMN jobs.status IS 'Job status: queued, processing, completed, failed (matches server code)';
