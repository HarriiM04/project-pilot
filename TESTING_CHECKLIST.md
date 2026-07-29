# Proposal Auto-Save - Testing Checklist ✅

Now that the database constraint has been added, follow these steps to test the fix:

## Pre-Test Setup

1. **Restart your development server:**
   ```bash
   npm run dev
   ```

2. **Clear browser cache** (optional but recommended):
   - Open DevTools (F12)
   - Right-click the refresh button → "Empty Cache and Hard Reload"

## Test Scenario 1: Edit Existing Proposal ✅

1. Navigate to a project with an existing proposal
2. Go to the **Proposal** tab
3. Click **Edit** on any section (e.g., "Project Overview")
4. Make some changes to the text
5. Click **Save**

**Expected Result:**
- ✅ "Section updated" green toast appears immediately
- ✅ "Saving..." indicator shows at the top
- ✅ "Saved" green checkmark appears after 2 seconds
- ❌ NO "Auto-save failed: Proposal not found" error

## Test Scenario 2: Generate New Proposal ✅

1. Navigate to a project **without** a proposal
2. Go to the **Proposal** tab
3. Click **Generate Proposal Draft**
4. Wait for generation to complete
5. Click **Edit** on any section
6. Make changes and click **Save**

**Expected Result:**
- ✅ Proposal generates successfully
- ✅ Section saves without errors
- ✅ Auto-save completes within 2-3 seconds

## Test Scenario 3: Multiple Edits ✅

1. Edit and save one section
2. Immediately edit and save another section
3. Edit the first section again

**Expected Result:**
- ✅ All saves work correctly
- ✅ No 404 errors
- ✅ Latest changes are preserved

## Test Scenario 4: Regenerate Proposal ✅

1. With an existing proposal, go back to chat
2. In the **Requirement Summary** tab, click **Generate Requirement Summary** again
3. Go back to **Proposal** tab
4. Click **Generate Proposal Draft** again
5. Edit a section and save

**Expected Result:**
- ✅ Proposal regenerates (updates existing, doesn't create duplicate)
- ✅ New proposal can be edited and saved
- ✅ No stale ID errors

## Browser Console Check 🔍

Open DevTools (F12) and check the Console tab while testing:

**Good Signs:**
- ✅ `[PROPOSAL] Updated existing proposal: <uuid>`
- ✅ Status 200 responses for `/api/proposals/[id]`

**Bad Signs (report if you see these):**
- ❌ 404 errors
- ❌ "Proposal not found" errors
- ❌ Multiple proposals being created

## Network Tab Check 🌐

1. Open DevTools → Network tab
2. Filter by "Fetch/XHR"
3. Edit and save a section
4. Look for the PATCH request to `/api/proposals/[id]`

**Expected:**
- ✅ Status: 200 OK
- ✅ Response: `{"success": true, "updated_at": "..."}`

## Database Verification (Optional) 🗄️

If you have Supabase access, run this query:

```sql
-- Check for duplicate proposals (should return 0 rows)
SELECT project_id, COUNT(*) as count
FROM public.proposals
GROUP BY project_id
HAVING COUNT(*) > 1;

-- Verify your proposals exist
SELECT id, project_id, status, updated_at
FROM public.proposals
ORDER BY updated_at DESC
LIMIT 10;
```

## Troubleshooting 🔧

### Issue: Still seeing "Proposal not found"

**Check:**
1. Verify the UNIQUE constraint exists in Supabase:
   ```sql
   SELECT conname FROM pg_constraint
   WHERE conrelid = 'public.proposals'::regclass
     AND contype = 'u';
   -- Should show: proposals_project_id_unique
   ```

2. Check browser console for the exact error
3. Note the `proposalId` in the error
4. Check if that ID exists in the database

### Issue: "Save failed" but no specific error

**Check:**
1. Network tab in DevTools for the actual error response
2. Supabase logs for RLS policy violations
3. Ensure you're logged in and own the project

### Issue: Changes not saving

**Check:**
1. Look for rate limiting (status 429)
2. Verify network connection
3. Check browser console for JavaScript errors

## Success Criteria ✅

The fix is working correctly if:

- [x] You can edit and save proposal sections
- [x] "Saved" indicator appears after edits
- [x] No "Auto-save failed" error messages
- [x] No 404 errors in browser console
- [x] Only one proposal per project in database
- [x] Proposal regeneration works without errors

## Report Issues

If any tests fail, please provide:
1. Screenshot of the error
2. Browser console output
3. Network tab request/response details
4. Steps to reproduce

---

**Status:** Ready for testing
**Last Updated:** 2025-07-29
