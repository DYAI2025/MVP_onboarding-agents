-- Row Level Security Policies
-- Run this AFTER 001_initial_schema.sql

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE charts ENABLE ROW LEVEL SECURITY;
ALTER TABLE symbols ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;

-- Profiles: users can read and update own profile
CREATE POLICY "Users can read own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- Charts: users can read own charts (inserts via service role)
CREATE POLICY "Users can read own charts"
  ON charts FOR SELECT
  USING (auth.uid() = user_id);

-- Symbols: users can read own symbols
CREATE POLICY "Users can read own symbols"
  ON symbols FOR SELECT
  USING (auth.uid() = user_id);

-- Conversations: users can read own conversations
CREATE POLICY "Users can read own conversations"
  ON conversations FOR SELECT
  USING (auth.uid() = user_id);

-- Reports: users can read own reports
CREATE POLICY "Users can read own reports"
  ON reports FOR SELECT
  USING (auth.uid() = user_id);

-- Jobs: users can read own job status
CREATE POLICY "Users can read own jobs"
  ON jobs FOR SELECT
  USING (auth.uid() = user_id);
