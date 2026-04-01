-- Migration: 00173_operations_items_v2_model
-- Description: Add outcome_type, allow nullable customer_id, and replace cancelled status with closed

BEGIN;

-- 1. Add outcome_type column
ALTER TABLE public.operations_items
  ADD COLUMN IF NOT EXISTS outcome_type TEXT
  CHECK (outcome_type IN ('work_order', 'proposal', 'remote_resolved', 'closed_no_action', 'cancelled'));

-- 2. Make customer_id nullable
ALTER TABLE public.operations_items
  ALTER COLUMN customer_id DROP NOT NULL;

-- 3. Migrate old cancelled rows before changing the status constraint
UPDATE public.operations_items
SET
  status = 'closed',
  outcome_type = COALESCE(outcome_type, 'cancelled')
WHERE status = 'cancelled';

-- 4. Replace old status constraint with the new closed-based model
ALTER TABLE public.operations_items
  DROP CONSTRAINT IF EXISTS service_requests_status_check;

ALTER TABLE public.operations_items
  DROP CONSTRAINT IF EXISTS operations_items_status_check;

ALTER TABLE public.operations_items
  ADD CONSTRAINT operations_items_status_check
    CHECK (status IN ('open', 'scheduled', 'completed', 'failed', 'closed'));

COMMIT;
