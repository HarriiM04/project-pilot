-- ============================================================
-- Proposals Table Migration - Final Version
-- Stores proposal drafts and sent proposals for projects
-- Run this in Supabase SQL Editor
-- ============================================================

-- Drop existing table if it exists (to ensure clean slate)
DROP TABLE IF EXISTS public.proposals CASCADE;

-- ── Table: proposals ────────────────────────────────────────
CREATE TABLE public.proposals (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id       UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  proposal_markdown TEXT NOT NULL,
  status           TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'approved', 'rejected')),
  client_email     TEXT,
  final_cost       TEXT,
  estimated_timeline TEXT,
  expiry_date      DATE,
  personal_message TEXT,
  sent_at          TIMESTAMPTZ,
  draft_created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add trigger for updated_at (ensure handle_updated_at function exists)
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_proposals_updated_at ON public.proposals;
CREATE TRIGGER trg_proposals_updated_at
  BEFORE UPDATE ON public.proposals
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Indexes for fast lookups
CREATE INDEX idx_proposals_project_id ON public.proposals(project_id);
CREATE INDEX idx_proposals_status ON public.proposals(status);
CREATE INDEX idx_proposals_updated_at ON public.proposals(updated_at DESC);

-- ── Row Level Security (RLS) ────────────────────────────────
ALTER TABLE public.proposals ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "proposals_select_project_owner_or_admin" ON public.proposals;
DROP POLICY IF EXISTS "proposals_insert_project_owner_or_admin" ON public.proposals;
DROP POLICY IF EXISTS "proposals_update_project_owner_or_admin" ON public.proposals;
DROP POLICY IF EXISTS "proposals_delete_project_owner_or_admin" ON public.proposals;

-- Create RLS policies
CREATE POLICY "proposals_select_project_owner_or_admin"
  ON public.proposals FOR SELECT
  USING (
    (SELECT is_admin FROM public.profiles WHERE id = auth.uid()) = true OR
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE id = project_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "proposals_insert_project_owner_or_admin"
  ON public.proposals FOR INSERT
  WITH CHECK (
    (SELECT is_admin FROM public.profiles WHERE id = auth.uid()) = true OR
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE id = project_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "proposals_update_project_owner_or_admin"
  ON public.proposals FOR UPDATE
  USING (
    (SELECT is_admin FROM public.profiles WHERE id = auth.uid()) = true OR
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE id = project_id AND user_id = auth.uid()
    )
  )
  WITH CHECK (
    (SELECT is_admin FROM public.profiles WHERE id = auth.uid()) = true OR
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE id = project_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "proposals_delete_project_owner_or_admin"
  ON public.proposals FOR DELETE
  USING (
    (SELECT is_admin FROM public.profiles WHERE id = auth.uid()) = true OR
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE id = project_id AND user_id = auth.uid()
    )
  );

-- Test the table creation
SELECT 'Proposals table created successfully' as result;

-- ============================================================
-- Done. Proposals table with RLS enabled.
-- Apply this migration in Supabase SQL Editor to fix the issue.
-- ============================================================