-- 00177_soft_delete_operations_item_rpc.sql
-- SECURITY DEFINER RPC for soft-deleting an operations item.
-- Mirrors the working proposal/sim_card patterns to avoid PostgREST 403 when
-- direct UPDATE hits RLS/permission evaluation edge cases.

CREATE OR REPLACE FUNCTION soft_delete_operations_item(p_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF get_my_role() NOT IN ('admin', 'accountant') THEN
    RAISE EXCEPTION 'permission denied' USING ERRCODE = '42501';
  END IF;

  UPDATE operations_items
  SET deleted_at = now()
  WHERE id = p_id
    AND deleted_at IS NULL;
END;
$$;

GRANT EXECUTE ON FUNCTION soft_delete_operations_item(UUID) TO authenticated;
