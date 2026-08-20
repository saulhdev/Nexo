-- Add completed_at column to tasks table for auto-archiving completed tasks
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

-- Backfill completed_at for existing done tasks
UPDATE public.tasks
SET completed_at = updated_at
WHERE status = 'done' AND completed_at IS NULL;
