-- ============================================================
-- Fix Infinite Recursion in RLS Policies
-- ============================================================

-- 1. Create a SECURITY DEFINER function to check if the current user is an admin
CREATE OR REPLACE FUNCTION public.is_current_user_org_admin(target_org_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  _is_admin BOOLEAN;
  _org_id UUID;
BEGIN
  -- We query the table directly. Since this is SECURITY DEFINER, it bypasses RLS,
  -- avoiding the infinite recursion loop.
  SELECT is_admin, org_id INTO _is_admin, _org_id
  FROM public.profiles
  WHERE id = auth.uid();
  
  RETURN coalesce(_is_admin, false) AND _org_id = target_org_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Fix the Profiles policy
DROP POLICY IF EXISTS "profiles_select_own_or_org_admin" ON public.profiles;

CREATE POLICY "profiles_select_own_or_org_admin" ON public.profiles FOR SELECT
USING (
  auth.uid() = id
  OR public.is_current_user_org_admin(org_id)
);

-- 3. Fix the Projects policies
DROP POLICY IF EXISTS "projects_select_own_or_org_admin" ON public.projects;
DROP POLICY IF EXISTS "projects_update_own_or_org_admin" ON public.projects;
DROP POLICY IF EXISTS "projects_delete_own_or_org_admin" ON public.projects;

CREATE POLICY "projects_select_own_or_org_admin" ON public.projects FOR SELECT
USING (
  auth.uid() = user_id
  OR public.is_current_user_org_admin(org_id)
);

CREATE POLICY "projects_update_own_or_org_admin" ON public.projects FOR UPDATE
USING (
  auth.uid() = user_id
  OR public.is_current_user_org_admin(org_id)
)
WITH CHECK (
  auth.uid() = user_id
  OR public.is_current_user_org_admin(org_id)
);

CREATE POLICY "projects_delete_own_or_org_admin" ON public.projects FOR DELETE
USING (
  auth.uid() = user_id
  OR public.is_current_user_org_admin(org_id)
);

-- 4. Fix Messages policies
DROP POLICY IF EXISTS "messages_select_org_scoped" ON public.messages;
DROP POLICY IF EXISTS "messages_insert_org_scoped" ON public.messages;
DROP POLICY IF EXISTS "messages_delete_org_scoped" ON public.messages;

CREATE POLICY "messages_select_org_scoped" ON public.messages FOR SELECT
USING (
  EXISTS (SELECT 1 FROM public.projects WHERE id = project_id AND user_id = auth.uid())
  OR (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_id
      AND public.is_current_user_org_admin(p.org_id)
    )
  )
);

CREATE POLICY "messages_insert_org_scoped" ON public.messages FOR INSERT
WITH CHECK (
  EXISTS (SELECT 1 FROM public.projects WHERE id = project_id AND user_id = auth.uid())
  OR (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_id
      AND public.is_current_user_org_admin(p.org_id)
    )
  )
);

CREATE POLICY "messages_delete_org_scoped" ON public.messages FOR DELETE
USING (
  EXISTS (SELECT 1 FROM public.projects WHERE id = project_id AND user_id = auth.uid())
  OR (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_id
      AND public.is_current_user_org_admin(p.org_id)
    )
  )
);

-- 5. Fix Kickoff Reports policies
DROP POLICY IF EXISTS "kickoff_reports_select_org_scoped" ON public.kickoff_reports;
DROP POLICY IF EXISTS "kickoff_reports_insert_org_scoped" ON public.kickoff_reports;
DROP POLICY IF EXISTS "kickoff_reports_update_org_scoped" ON public.kickoff_reports;
DROP POLICY IF EXISTS "kickoff_reports_delete_org_scoped" ON public.kickoff_reports;

CREATE POLICY "kickoff_reports_select_org_scoped" ON public.kickoff_reports FOR SELECT
USING (
  EXISTS (SELECT 1 FROM public.projects WHERE id = project_id AND user_id = auth.uid())
  OR (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_id
      AND public.is_current_user_org_admin(p.org_id)
    )
  )
);

CREATE POLICY "kickoff_reports_insert_org_scoped" ON public.kickoff_reports FOR INSERT
WITH CHECK (
  EXISTS (SELECT 1 FROM public.projects WHERE id = project_id AND user_id = auth.uid())
  OR (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_id
      AND public.is_current_user_org_admin(p.org_id)
    )
  )
);

CREATE POLICY "kickoff_reports_update_org_scoped" ON public.kickoff_reports FOR UPDATE
USING (
  EXISTS (SELECT 1 FROM public.projects WHERE id = project_id AND user_id = auth.uid())
  OR (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_id
      AND public.is_current_user_org_admin(p.org_id)
    )
  )
)
WITH CHECK (
  EXISTS (SELECT 1 FROM public.projects WHERE id = project_id AND user_id = auth.uid())
  OR (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_id
      AND public.is_current_user_org_admin(p.org_id)
    )
  )
);

CREATE POLICY "kickoff_reports_delete_org_scoped" ON public.kickoff_reports FOR DELETE
USING (
  EXISTS (SELECT 1 FROM public.projects WHERE id = project_id AND user_id = auth.uid())
  OR (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_id
      AND public.is_current_user_org_admin(p.org_id)
    )
  )
);
