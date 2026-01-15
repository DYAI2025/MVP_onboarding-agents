-- Storage buckets for symbols and reports
-- Run in Supabase SQL Editor

-- Create symbols bucket (public read)
INSERT INTO storage.buckets (id, name, public)
VALUES ('symbols', 'symbols', true)
ON CONFLICT (id) DO NOTHING;

-- Create reports bucket (authenticated read)
INSERT INTO storage.buckets (id, name, public)
VALUES ('reports', 'reports', false)
ON CONFLICT (id) DO NOTHING;

-- Symbols: anyone can read, service role can write
CREATE POLICY "Public read symbols"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'symbols');

-- Reports: users can read own reports
CREATE POLICY "Users read own reports"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'reports'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
