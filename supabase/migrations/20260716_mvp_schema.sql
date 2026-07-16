-- ProjectPilot 3-Day MVP Schema (Minimal 3-Table Persistence + RLS + Safe Column Additions)

-- 1. Projects (Each discovery session is one project record)
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'Untitled Discovery',
  client_name TEXT,
  domain TEXT,
  dominant_language TEXT DEFAULT 'English',
  completeness_score INTEGER DEFAULT 0,
  uploaded_docs JSONB DEFAULT '[]'::jsonb, -- Array of { filename, storage_path, extracted_text_snippet }
  discovery_state JSONB DEFAULT null,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Ensure columns exist on pre-existing projects table
ALTER TABLE projects ADD COLUMN IF NOT EXISTS dominant_language TEXT DEFAULT 'English';
ALTER TABLE projects ADD COLUMN IF NOT EXISTS completeness_score INTEGER DEFAULT 0;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS uploaded_docs JSONB DEFAULT '[]'::jsonb;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS discovery_state JSONB DEFAULT null;

-- 2. Messages (Turn-by-turn chat transcript for LLM context memory)
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system_event')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Kickoff Reports (The single generated 15-section deliverable)
CREATE TABLE IF NOT EXISTS kickoff_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID UNIQUE REFERENCES projects(id) ON DELETE CASCADE,
  report_markdown TEXT NOT NULL, -- Full 15-section markdown
  extracted_json JSONB NOT NULL, -- Structured extraction payload
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Basic RLS: Users can only see/edit their own projects & reports
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE kickoff_reports ENABLE ROW LEVEL SECURITY;

-- Safely drop existing policies if re-running to prevent policy duplicate errors
DROP POLICY IF EXISTS "Users access own projects" ON projects;
DROP POLICY IF EXISTS "Users access own messages" ON messages;
DROP POLICY IF EXISTS "Users access own reports" ON kickoff_reports;

CREATE POLICY "Users access own projects" ON projects FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users access own messages" ON messages FOR ALL USING (auth.uid() = (SELECT user_id FROM projects WHERE id = project_id));
CREATE POLICY "Users access own reports" ON kickoff_reports FOR ALL USING (auth.uid() = (SELECT user_id FROM projects WHERE id = project_id));
