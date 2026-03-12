-- 00108_soft_delete_recurring_template_rpc.sql
-- SECURITY DEFINER RPC for soft-deleting a recurring_expense_template.
-- Same pattern as 00105 (sim_cards) and 00107 (financial_transactions).
-- The recurring_templates_update policy has no WITH CHECK, causing get_my_role()
-- to return NULL in the planner context → 403 on soft-delete PATCH.

CREATE OR REPLACE FUNCTION soft_delete_recurring_template(template_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF get_my_role() NOT IN ('admin', 'accountant') THEN
    RAISE EXCEPTION 'permission denied' USING ERRCODE = '42501';
  END IF;

  UPDATE recurring_expense_templates
  SET deleted_at = now()
  WHERE id = template_id
    AND deleted_at IS NULL;
END;
$$;

GRANT EXECUTE ON FUNCTION soft_delete_recurring_template(UUID) TO authenticated;
