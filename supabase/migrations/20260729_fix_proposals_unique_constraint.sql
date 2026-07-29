-- ============================================================
-- Fix Proposals Table - Add UNIQUE Constraint on project_id
-- This ensures only one proposal per project exists
-- ============================================================

-- Step 1: Remove duplicate proposals (keep only the most recent one per project)
WITH ranked_proposals AS (
  SELECT 
    id,
    project_id,
    ROW_NUMBER() OVER (
      PARTITION BY project_id 
      ORDER BY updated_at DESC, created_at DESC
    ) as rn
  FROM public.proposals
)
DELETE FROM public.proposals
WHERE id IN (
  SELECT id FROM ranked_proposals WHERE rn > 1
);

-- Step 2: Add UNIQUE constraint to project_id if it doesn't exist
DO $$ 
BEGIN
  -- Check if the constraint already exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'proposals_project_id_unique'
  ) THEN
    -- Add the unique constraint
    ALTER TABLE public.proposals
      ADD CONSTRAINT proposals_project_id_unique UNIQUE (project_id);
    
    RAISE NOTICE 'Added UNIQUE constraint on project_id';
  ELSE
    RAISE NOTICE 'UNIQUE constraint on project_id already exists';
  END IF;
END $$;

-- Step 3: Verify the constraint was added
SELECT 
  conname as constraint_name,
  contype as constraint_type,
  'Constraint successfully added' as status
FROM pg_constraint
WHERE conrelid = 'public.proposals'::regclass
  AND conname = 'proposals_project_id_unique';

-- ============================================================
-- Instructions:
-- 1. Run this in Supabase SQL Editor
-- 2. This will remove duplicate proposals (keeping the newest)
-- 3. Adds UNIQUE constraint to prevent future duplicates
-- ============================================================
