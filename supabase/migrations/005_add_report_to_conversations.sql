-- Add report fields to conversations table
-- The reportWorker stores generated reports directly in conversations table
-- Run after 004_mock_free_schema.sql

-- Add report content and timestamp columns
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS report TEXT NULL;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS report_generated_at TIMESTAMPTZ NULL;

-- Add index for querying conversations with reports
CREATE INDEX IF NOT EXISTS idx_conversations_report_generated ON conversations(report_generated_at) WHERE report_generated_at IS NOT NULL;

-- Add comment for clarity
COMMENT ON COLUMN conversations.report IS 'Generated markdown report from reportWorker after conversation ends';
COMMENT ON COLUMN conversations.report_generated_at IS 'Timestamp when report was generated';
