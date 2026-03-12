-- 00105_soft_delete_sim_card_rpc.sql
-- SECURITY DEFINER RPC for soft-deleting a sim_card.
-- Bypasses RLS for this single operation; role check is enforced inside the
-- function so only admin/accountant can call it successfully.
-- Background: RLS WITH CHECK on sim_cards consistently returns 42501 despite
-- correct role, likely due to get_my_role() evaluation order in the planner.

CREATE OR REPLACE FUNCTION soft_delete_sim_card(sim_card_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF get_my_role() NOT IN ('admin', 'accountant') THEN
    RAISE EXCEPTION 'permission denied' USING ERRCODE = '42501';
  END IF;

  UPDATE sim_cards
  SET deleted_at = now()
  WHERE id = sim_card_id
    AND deleted_at IS NULL;
END;
$$;

GRANT EXECUTE ON FUNCTION soft_delete_sim_card(UUID) TO authenticated;
