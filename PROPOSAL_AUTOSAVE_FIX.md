# Proposal Auto-Save Issue Fix

## Problem Summary

The auto-save feature in the Proposal Editor was failing with "Proposal not found" error after users edited and saved sections. This document explains the root cause and the fixes applied.

## Root Cause Analysis

### 1. **Missing UNIQUE Constraint on `project_id`**
   - The `proposals` table was missing a UNIQUE constraint on the `project_id` column
   - The migration file `20260728_proposals_table_final.sql` removed this constraint
   - Without it, the database allowed multiple proposals per project
   - The `upsert` operation with `onConflict: 'project_id'` failed because there was no unique constraint to detect conflicts

### 2. **Database State Issues**
   - Multiple proposal records could exist for the same project
   - When generating a new proposal, a new row was inserted instead of updating the existing one
   - The `proposalId` in the app state could become stale/invalid
   - Auto-save attempts to update with the old `proposalId` would fail with 404 "Proposal not found"

### 3. **State Race Condition in ProposalEditor**
   - The `handleSaveEdit` function was calling `getUpdatedMarkdown()` before the state update completed
   - This sent outdated markdown to the API

## Fixes Applied

### 1. **Database Migration** ✅
   **File:** `supabase/migrations/20260729_fix_proposals_unique_constraint.sql`
   
   - Removes duplicate proposals (keeps only the most recent one per project)
   - Adds UNIQUE constraint on `project_id` column
   - Prevents future duplicate proposals

   **Action Required:**
   ```sql
   -- Run this in Supabase SQL Editor:
   -- Navigate to: Supabase Dashboard > SQL Editor > New Query
   -- Copy and paste the contents of the migration file
   -- Click "Run"
   ```

### 2. **API Route Improvement** ✅
   **File:** `app/api/proposal/generate/route.ts`
   
   - Changed from `upsert()` to explicit check + update/insert logic
   - First checks if a proposal exists for the project
   - If exists → UPDATE the existing record
   - If not → INSERT a new record
   - Always returns the correct `proposalId`

### 3. **ProposalEditor Component** ✅
   **File:** `components/proposal-editor.tsx`
   
   - Fixed state race condition in `handleSaveEdit`
   - Calculates updated markdown synchronously before state update
   - Added `useEffect` to reset state when `proposalId` changes
   - Improved error handling with specific error messages
   - Added `showToast` to useCallback dependencies

## How to Apply the Fix

### Step 1: Run the Database Migration

1. Open Supabase Dashboard
2. Navigate to **SQL Editor**
3. Click **New Query**
4. Copy the contents of `supabase/migrations/20260729_fix_proposals_unique_constraint.sql`
5. Paste and click **Run**
6. Verify output shows "Constraint successfully added"

### Step 2: Restart the Application

```bash
# Stop the current dev server (if running)
# Then restart:
npm run dev
```

### Step 3: Test the Fix

1. Navigate to a project's Proposal tab
2. Click **Generate Proposal Draft** (if not already generated)
3. Click **Edit** on any section (e.g., "Project Overview")
4. Make changes to the content
5. Click **Save**
6. **Expected:** 
   - "Section updated" toast appears immediately
   - "Saving..." indicator shows briefly
   - "Saved" indicator appears after 2 seconds
   - NO "Auto-save failed: Proposal not found" error

### Step 4: Verify No Duplicates

Run this query in Supabase SQL Editor to check:

```sql
-- Check for duplicate proposals
SELECT project_id, COUNT(*) as proposal_count
FROM public.proposals
GROUP BY project_id
HAVING COUNT(*) > 1;
```

**Expected:** No rows returned (meaning no duplicates exist)

## Technical Details

### Database Schema Change

**Before:**
```sql
CREATE TABLE public.proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  -- No UNIQUE constraint on project_id
  ...
);
```

**After:**
```sql
CREATE TABLE public.proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  -- Added UNIQUE constraint
  CONSTRAINT proposals_project_id_unique UNIQUE (project_id),
  ...
);
```

### API Logic Change

**Before (using upsert):**
```typescript
const { data: proposalRecord, error } = await supabase
  .from('proposals')
  .upsert({ ... }, { onConflict: 'project_id' }) // ❌ Fails without UNIQUE constraint
  .select()
  .single()
```

**After (explicit check + update/insert):**
```typescript
const { data: existing } = await supabase
  .from('proposals')
  .select('id')
  .eq('project_id', projectId)
  .maybeSingle()

if (existing) {
  // UPDATE existing ✅
  const { data } = await supabase
    .from('proposals')
    .update({ ... })
    .eq('id', existing.id)
    .select()
    .single()
} else {
  // INSERT new ✅
  const { data } = await supabase
    .from('proposals')
    .insert({ ... })
    .select()
    .single()
}
```

## Verification Checklist

- [ ] Database migration executed successfully
- [ ] UNIQUE constraint exists on `proposals.project_id`
- [ ] No duplicate proposals exist in the database
- [ ] Application restarted after code changes
- [ ] Edit and save a proposal section - no errors
- [ ] Auto-save completes within 2-3 seconds
- [ ] "Saved" indicator appears after auto-save
- [ ] No "Proposal not found" errors in browser console
- [ ] Multiple edits work without issues

## Troubleshooting

### Issue: "Constraint already exists" error
**Solution:** The constraint is already added. No action needed.

### Issue: Still seeing duplicate proposals
**Solution:** 
```sql
-- Manually remove duplicates (keeps newest):
WITH ranked AS (
  SELECT id, ROW_NUMBER() OVER (
    PARTITION BY project_id ORDER BY updated_at DESC
  ) as rn
  FROM public.proposals
)
DELETE FROM public.proposals
WHERE id IN (SELECT id FROM ranked WHERE rn > 1);
```

### Issue: "Permission denied" on migration
**Solution:** Make sure you're logged in as a Supabase admin/owner.

### Issue: Auto-save still fails
**Solution:**
1. Check browser console for specific error
2. Verify the `proposalId` matches a record in the database
3. Check Supabase RLS policies allow updates
4. Ensure user owns the project or is an admin

## Related Files

- `supabase/migrations/20260729_fix_proposals_unique_constraint.sql` - Database fix
- `app/api/proposal/generate/route.ts` - API route improvements
- `components/proposal-editor.tsx` - Component fixes
- `app/api/proposals/[id]/route.ts` - PATCH endpoint for auto-save

## Questions?

If you encounter issues after applying this fix, check:
1. Supabase logs for database errors
2. Browser console for client-side errors
3. Network tab for API request/response details
