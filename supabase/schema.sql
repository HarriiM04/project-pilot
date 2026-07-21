-- ============================================================
-- ProjectPilot — Full Multi-User Supabase Schema
-- Run this entire script in the Supabase SQL Editor.
-- ============================================================

-- ── Extensions ──────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── Helper: auto-update updated_at ──────────────────────────
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── Table: profiles ─────────────────────────────────────────
-- Mirrors auth.users with extra display fields.
-- A row is created automatically via trigger when a user signs up.
CREATE TABLE IF NOT EXISTS public.profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name   TEXT,
  avatar_url  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS trg_profiles_updated_at ON public.profiles;
CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Auto-create profile on new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data ->> 'full_name',
    NEW.raw_user_meta_data ->> 'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ── Table: projects ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.projects (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title            TEXT NOT NULL DEFAULT 'Untitled Project',
  client_name      TEXT NOT NULL DEFAULT '',
  domain           TEXT NOT NULL DEFAULT '',
  dominant_language TEXT DEFAULT 'English',
  completeness_score INTEGER DEFAULT 0,
  uploaded_docs    JSONB DEFAULT '[]'::jsonb,
  discovery_state  JSONB,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS trg_projects_updated_at ON public.projects;
CREATE TRIGGER trg_projects_updated_at
  BEFORE UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Index for fast user-scoped project listing
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON public.projects(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_updated_at ON public.projects(updated_at DESC);

-- ── Table: messages ─────────────────────────────────────────
-- Persists the full chat history per project.
CREATE TABLE IF NOT EXISTS public.messages (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  role        TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system_event')),
  content     TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_messages_project_id ON public.messages(project_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public.messages(created_at ASC);

-- ── Table: kickoff_reports ──────────────────────────────────
CREATE TABLE IF NOT EXISTS public.kickoff_reports (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id       UUID UNIQUE NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  report_markdown  TEXT NOT NULL,
  extracted_json   JSONB NOT NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS trg_kickoff_reports_updated_at ON public.kickoff_reports;
CREATE TRIGGER trg_kickoff_reports_updated_at
  BEFORE UPDATE ON public.kickoff_reports
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE INDEX IF NOT EXISTS idx_kickoff_reports_project_id ON public.kickoff_reports(project_id);

-- ============================================================
-- Row Level Security (RLS)
-- ============================================================

-- ── profiles ────────────────────────────────────────────────
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_select_own"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "profiles_update_own"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- ── projects ────────────────────────────────────────────────
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "projects_select_own"
  ON public.projects FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "projects_insert_own"
  ON public.projects FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "projects_update_own"
  ON public.projects FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "projects_delete_own"
  ON public.projects FOR DELETE
  USING (auth.uid() = user_id);

-- ── messages ────────────────────────────────────────────────
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "messages_select_project_owner"
  ON public.messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE id = project_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "messages_insert_project_owner"
  ON public.messages FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE id = project_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "messages_delete_project_owner"
  ON public.messages FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE id = project_id AND user_id = auth.uid()
    )
  );

-- ── kickoff_reports ─────────────────────────────────────────
ALTER TABLE public.kickoff_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "kickoff_reports_select_project_owner"
  ON public.kickoff_reports FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE id = project_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "kickoff_reports_insert_project_owner"
  ON public.kickoff_reports FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE id = project_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "kickoff_reports_update_project_owner"
  ON public.kickoff_reports FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE id = project_id AND user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE id = project_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "kickoff_reports_delete_project_owner"
  ON public.kickoff_reports FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE id = project_id AND user_id = auth.uid()
    )
  );

-- ============================================================
-- Done. Tables: profiles, projects, messages, kickoff_reports
-- RLS enabled on all tables.
-- ============================================================
