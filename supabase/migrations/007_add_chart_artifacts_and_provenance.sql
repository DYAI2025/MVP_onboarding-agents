-- Migration 007: Add chart_artifacts and provenance fields
-- Deterministic BAZI integration with full audit trail

ALTER TABLE charts
  ADD COLUMN IF NOT EXISTS input_hash TEXT,
  ADD COLUMN IF NOT EXISTS bazi_data JSONB,
  ADD COLUMN IF NOT EXISTS western_data JSONB,
  ADD COLUMN IF NOT EXISTS fusion_data JSONB,
  ADD COLUMN IF NOT EXISTS symbol_path TEXT,
  ADD COLUMN IF NOT EXISTS provenance JSONB,
  ADD COLUMN IF NOT EXISTS latency_ms INTEGER,
  ADD COLUMN IF NOT EXISTS error_class TEXT;

-- Add index on input_hash for idempotency
CREATE INDEX IF NOT EXISTS idx_charts_input_hash ON charts(input_hash);

-- Add comment
COMMENT ON COLUMN charts.input_hash IS 'SHA-256 hash of normalized input for idempotency';
COMMENT ON COLUMN charts.provenance IS 'Audit trail: versions, fallback_used, accuracy, source';
