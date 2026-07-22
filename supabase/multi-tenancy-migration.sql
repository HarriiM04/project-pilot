-- ============================================================
-- ProjectPilot — Multi-Tenancy Migration
-- Run this in your Supabase SQL Editor AFTER the base schema.
-- ============================================================

-- ── 1. Create organizations table ──────────────────────────
CREATE TABLE IF NOT EXISTS public.organizations (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL,
  slug       TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

-- Everyone can read orgs (needed for signup flow to resolve slug → id)
CREATE POLICY "organizations_select_all" ON public.organizations
  FOR SELECT USING (true);

-- ── 2. Seed two companies ──────────────────────────────────
INSERT INTO public.organizations (name, slug) VALUES
  ('Horizon Tech', 'horizon-tech'),
  ('Third-Party Cookies International', 'tpc-international')
ON CONFLICT (slug) DO NOTHING;

-- ── 3. Add org_id to profiles ──────────────────────────────
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL;

-- ── 4. Add org_id to projects ──────────────────────────────
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL;

-- ── 5. Assign existing admin(s) to Horizon Tech by default ─
UPDATE public.profiles
SET org_id = (SELECT id FROM public.organizations WHERE slug = 'horizon-tech')
WHERE is_admin = true AND org_id IS NULL;

-- ── 6. Assign existing projects to their owner's org ───────
UPDATE public.projects p
SET org_id = (SELECT org_id FROM public.profiles WHERE id = p.user_id)
WHERE p.org_id IS NULL;

-- ── 7. Update handle_new_user trigger to set org_id ────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  _org_slug TEXT;
  _org_id   UUID;
BEGIN
  -- Read org_slug from signup metadata
  _org_slug := NEW.raw_user_meta_data ->> 'org_slug';

  -- Look up the organization
  IF _org_slug IS NOT NULL AND _org_slug <> '' THEN
    SELECT id INTO _org_id FROM public.organizations WHERE slug = _org_slug;
  END IF;

  INSERT INTO public.profiles (id, full_name, avatar_url, org_id)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data ->> 'full_name',
    NEW.raw_user_meta_data ->> 'avatar_url',
    _org_id
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── 8. Update admin RLS to enforce org isolation ───────────

-- Drop old admin-aware policies
DROP POLICY IF EXISTS "projects_select_own_or_admin" ON public.projects;
DROP POLICY IF EXISTS "projects_update_own_or_admin" ON public.projects;
DROP POLICY IF EXISTS "projects_delete_own_or_admin" ON public.projects;

DROP POLICY IF EXISTS "messages_select_project_owner_or_admin" ON public.messages;
DROP POLICY IF EXISTS "messages_insert_project_owner_or_admin" ON public.messages;
DROP POLICY IF EXISTS "messages_delete_project_owner_or_admin" ON public.messages;

DROP POLICY IF EXISTS "kickoff_reports_select_project_owner_or_admin" ON public.kickoff_reports;
DROP POLICY IF EXISTS "kickoff_reports_insert_project_owner_or_admin" ON public.kickoff_reports;
DROP POLICY IF EXISTS "kickoff_reports_update_project_owner_or_admin" ON public.kickoff_reports;
DROP POLICY IF EXISTS "kickoff_reports_delete_project_owner_or_admin" ON public.kickoff_reports;

-- New org-scoped admin policies for PROJECTS
CREATE POLICY "projects_select_own_or_org_admin" ON public.projects FOR SELECT
USING (
  auth.uid() = user_id
  OR (
    (SELECT is_admin FROM public.profiles WHERE id = auth.uid()) = true
    AND org_id = (SELECT org_id FROM public.profiles WHERE id = auth.uid())
  )
);

CREATE POLICY "projects_update_own_or_org_admin" ON public.projects FOR UPDATE
USING (
  auth.uid() = user_id
  OR (
    (SELECT is_admin FROM public.profiles WHERE id = auth.uid()) = true
    AND org_id = (SELECT org_id FROM public.profiles WHERE id = auth.uid())
  )
)
WITH CHECK (
  auth.uid() = user_id
  OR (
    (SELECT is_admin FROM public.profiles WHERE id = auth.uid()) = true
    AND org_id = (SELECT org_id FROM public.profiles WHERE id = auth.uid())
  )
);

CREATE POLICY "projects_delete_own_or_org_admin" ON public.projects FOR DELETE
USING (
  auth.uid() = user_id
  OR (
    (SELECT is_admin FROM public.profiles WHERE id = auth.uid()) = true
    AND org_id = (SELECT org_id FROM public.profiles WHERE id = auth.uid())
  )
);

-- New org-scoped admin policies for MESSAGES
CREATE POLICY "messages_select_org_scoped" ON public.messages FOR SELECT
USING (
  EXISTS (SELECT 1 FROM public.projects WHERE id = project_id AND user_id = auth.uid())
  OR (
    (SELECT is_admin FROM public.profiles WHERE id = auth.uid()) = true
    AND EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_id
      AND p.org_id = (SELECT org_id FROM public.profiles WHERE id = auth.uid())
    )
  )
);

CREATE POLICY "messages_insert_org_scoped" ON public.messages FOR INSERT
WITH CHECK (
  EXISTS (SELECT 1 FROM public.projects WHERE id = project_id AND user_id = auth.uid())
  OR (
    (SELECT is_admin FROM public.profiles WHERE id = auth.uid()) = true
    AND EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_id
      AND p.org_id = (SELECT org_id FROM public.profiles WHERE id = auth.uid())
    )
  )
);

CREATE POLICY "messages_delete_org_scoped" ON public.messages FOR DELETE
USING (
  EXISTS (SELECT 1 FROM public.projects WHERE id = project_id AND user_id = auth.uid())
  OR (
    (SELECT is_admin FROM public.profiles WHERE id = auth.uid()) = true
    AND EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_id
      AND p.org_id = (SELECT org_id FROM public.profiles WHERE id = auth.uid())
    )
  )
);

-- New org-scoped admin policies for KICKOFF_REPORTS
CREATE POLICY "kickoff_reports_select_org_scoped" ON public.kickoff_reports FOR SELECT
USING (
  EXISTS (SELECT 1 FROM public.projects WHERE id = project_id AND user_id = auth.uid())
  OR (
    (SELECT is_admin FROM public.profiles WHERE id = auth.uid()) = true
    AND EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_id
      AND p.org_id = (SELECT org_id FROM public.profiles WHERE id = auth.uid())
    )
  )
);

CREATE POLICY "kickoff_reports_insert_org_scoped" ON public.kickoff_reports FOR INSERT
WITH CHECK (
  EXISTS (SELECT 1 FROM public.projects WHERE id = project_id AND user_id = auth.uid())
  OR (
    (SELECT is_admin FROM public.profiles WHERE id = auth.uid()) = true
    AND EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_id
      AND p.org_id = (SELECT org_id FROM public.profiles WHERE id = auth.uid())
    )
  )
);

CREATE POLICY "kickoff_reports_update_org_scoped" ON public.kickoff_reports FOR UPDATE
USING (
  EXISTS (SELECT 1 FROM public.projects WHERE id = project_id AND user_id = auth.uid())
  OR (
    (SELECT is_admin FROM public.profiles WHERE id = auth.uid()) = true
    AND EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_id
      AND p.org_id = (SELECT org_id FROM public.profiles WHERE id = auth.uid())
    )
  )
)
WITH CHECK (
  EXISTS (SELECT 1 FROM public.projects WHERE id = project_id AND user_id = auth.uid())
  OR (
    (SELECT is_admin FROM public.profiles WHERE id = auth.uid()) = true
    AND EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_id
      AND p.org_id = (SELECT org_id FROM public.profiles WHERE id = auth.uid())
    )
  )
);

CREATE POLICY "kickoff_reports_delete_org_scoped" ON public.kickoff_reports FOR DELETE
USING (
  EXISTS (SELECT 1 FROM public.projects WHERE id = project_id AND user_id = auth.uid())
  OR (
    (SELECT is_admin FROM public.profiles WHERE id = auth.uid()) = true
    AND EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_id
      AND p.org_id = (SELECT org_id FROM public.profiles WHERE id = auth.uid())
    )
  )
);

-- ── 9. Allow admins to read all profiles in their org ──────
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;

CREATE POLICY "profiles_select_own_or_org_admin" ON public.profiles FOR SELECT
USING (
  auth.uid() = id
  OR (
    (SELECT is_admin FROM public.profiles WHERE id = auth.uid()) = true
    AND org_id = (SELECT org_id FROM public.profiles WHERE id = auth.uid())
  )
);

-- ── 10. Index for fast org-scoped queries ──────────────────
CREATE INDEX IF NOT EXISTS idx_projects_org_id ON public.projects(org_id);
CREATE INDEX IF NOT EXISTS idx_profiles_org_id ON public.profiles(org_id);

-- ============================================================
-- Done. Run this migration, then deploy the updated code.
-- ============================================================
