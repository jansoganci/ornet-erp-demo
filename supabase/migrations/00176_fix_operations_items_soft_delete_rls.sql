-- 00176_fix_operations_items_soft_delete_rls.sql
-- Fix soft delete for operations_items.
--
-- Background:
-- The renamed update policy inherited the old service_requests behavior and
-- does not define an explicit WITH CHECK clause. During soft delete,
-- `deleted_at` becomes non-null, so PostgreSQL evaluates the implicit WITH CHECK
-- against the NEW row and rejects the update.

BEGIN;

DROP POLICY IF EXISTS operations_items_update ON public.operations_items;

CREATE POLICY operations_items_update
  ON public.operations_items
  FOR UPDATE
  TO authenticated
  USING (
    deleted_at IS NULL
    AND EXISTS (
      SELECT 1
      FROM public.profiles
      WHERE id = auth.uid()
        AND role IN ('admin', 'accountant')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.profiles
      WHERE id = auth.uid()
        AND role IN ('admin', 'accountant')
    )
  );

COMMIT;
