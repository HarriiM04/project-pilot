-- Add proposals table for storing editable proposal drafts
-- This table stores client-facing proposals generated from BRD/PRD/SOW

CREATE TABLE IF NOT EXISTS public.proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID UNIQUE NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  proposal_markdown TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'approved', 'rejected')),
  draft_created_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for fast project lookup
CREATE INDEX IF NOT EXISTS idx_proposals_project_id ON public.proposals(project_id);
CREATE INDEX IF NOT EXISTS idx_proposals_status ON public.proposals(status);

-- Auto-update updated_at trigger
DROP TRIGGER IF EXISTS trg_proposals_updated_at ON public.proposals;
CREATE TRIGGER trg_proposals_updated_at
  BEFORE UPDATE ON public.proposals
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ── RLS Policies ─────────────────────────────────────────────
ALTER TABLE public.proposals ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if re-running
DROP POLICY IF EXISTS "proposals_select_project_owner_or_admin" ON public.proposals;
DROP POLICY IF EXISTS "proposals_insert_project_owner_or_admin" ON public.proposals;
DROP POLICY IF EXISTS "proposals_update_project_owner_or_admin" ON public.proposals;
DROP POLICY IF EXISTS "proposals_delete_project_owner_or_admin" ON public.proposals;

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
