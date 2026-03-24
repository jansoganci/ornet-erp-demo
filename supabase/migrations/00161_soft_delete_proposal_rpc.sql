-- 00161_soft_delete_proposal_rpc.sql
-- SECURITY DEFINER RPC for soft-deleting a proposal.
-- Mirrors 00105_soft_delete_sim_card_rpc: direct UPDATE under RLS can return 403/42501
-- when get_my_role() + WITH CHECK interact badly with the planner.
-- Role is enforced inside the function.

CREATE OR REPLACE FUNCTION soft_delete_proposal(p_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF get_my_role() NOT IN ('admin', 'accountant') THEN
    RAISE EXCEPTION 'permission denied' USING ERRCODE = '42501';
  END IF;

  UPDATE proposals
  SET deleted_at = now()
  WHERE id = p_id
    AND deleted_at IS NULL;
END;
$$;

GRANT EXECUTE ON FUNCTION soft_delete_proposal(UUID) TO authenticated;
