-- 1. Add is_admin column to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false;

-- 2. Drop old policies
DROP POLICY IF EXISTS "projects_select_own" ON public.projects;
DROP POLICY IF EXISTS "projects_update_own" ON public.projects;
DROP POLICY IF EXISTS "projects_delete_own" ON public.projects;

DROP POLICY IF EXISTS "messages_select_project_owner" ON public.messages;
DROP POLICY IF EXISTS "messages_insert_project_owner" ON public.messages;
DROP POLICY IF EXISTS "messages_delete_project_owner" ON public.messages;

DROP POLICY IF EXISTS "kickoff_reports_select_project_owner" ON public.kickoff_reports;
DROP POLICY IF EXISTS "kickoff_reports_insert_project_owner" ON public.kickoff_reports;
DROP POLICY IF EXISTS "kickoff_reports_update_project_owner" ON public.kickoff_reports;
DROP POLICY IF EXISTS "kickoff_reports_delete_project_owner" ON public.kickoff_reports;

-- 3. Create new Admin-aware policies
-- PROJECTS
CREATE POLICY "projects_select_own_or_admin" ON public.projects FOR SELECT
USING (auth.uid() = user_id OR (SELECT is_admin FROM public.profiles WHERE id = auth.uid()) = true);

CREATE POLICY "projects_update_own_or_admin" ON public.projects FOR UPDATE
USING (auth.uid() = user_id OR (SELECT is_admin FROM public.profiles WHERE id = auth.uid()) = true)
WITH CHECK (auth.uid() = user_id OR (SELECT is_admin FROM public.profiles WHERE id = auth.uid()) = true);

CREATE POLICY "projects_delete_own_or_admin" ON public.projects FOR DELETE
USING (auth.uid() = user_id OR (SELECT is_admin FROM public.profiles WHERE id = auth.uid()) = true);

-- MESSAGES
CREATE POLICY "messages_select_project_owner_or_admin" ON public.messages FOR SELECT
USING (
  (SELECT is_admin FROM public.profiles WHERE id = auth.uid()) = true OR
  EXISTS (SELECT 1 FROM public.projects WHERE id = project_id AND user_id = auth.uid())
);

CREATE POLICY "messages_insert_project_owner_or_admin" ON public.messages FOR INSERT
WITH CHECK (
  (SELECT is_admin FROM public.profiles WHERE id = auth.uid()) = true OR
  EXISTS (SELECT 1 FROM public.projects WHERE id = project_id AND user_id = auth.uid())
);

CREATE POLICY "messages_delete_project_owner_or_admin" ON public.messages FOR DELETE
USING (
  (SELECT is_admin FROM public.profiles WHERE id = auth.uid()) = true OR
  EXISTS (SELECT 1 FROM public.projects WHERE id = project_id AND user_id = auth.uid())
);

-- REPORTS
CREATE POLICY "kickoff_reports_select_project_owner_or_admin" ON public.kickoff_reports FOR SELECT
USING (
  (SELECT is_admin FROM public.profiles WHERE id = auth.uid()) = true OR
  EXISTS (SELECT 1 FROM public.projects WHERE id = project_id AND user_id = auth.uid())
);

CREATE POLICY "kickoff_reports_insert_project_owner_or_admin" ON public.kickoff_reports FOR INSERT
WITH CHECK (
  (SELECT is_admin FROM public.profiles WHERE id = auth.uid()) = true OR
  EXISTS (SELECT 1 FROM public.projects WHERE id = project_id AND user_id = auth.uid())
);

CREATE POLICY "kickoff_reports_update_project_owner_or_admin" ON public.kickoff_reports FOR UPDATE
USING (
  (SELECT is_admin FROM public.profiles WHERE id = auth.uid()) = true OR
  EXISTS (SELECT 1 FROM public.projects WHERE id = project_id AND user_id = auth.uid())
) WITH CHECK (
  (SELECT is_admin FROM public.profiles WHERE id = auth.uid()) = true OR
  EXISTS (SELECT 1 FROM public.projects WHERE id = project_id AND user_id = auth.uid())
);

CREATE POLICY "kickoff_reports_delete_project_owner_or_admin" ON public.kickoff_reports FOR DELETE
USING (
  (SELECT is_admin FROM public.profiles WHERE id = auth.uid()) = true OR
  EXISTS (SELECT 1 FROM public.projects WHERE id = project_id AND user_id = auth.uid())
);
