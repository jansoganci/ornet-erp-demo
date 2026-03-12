-- 00107_soft_delete_transaction_rpc.sql
-- SECURITY DEFINER RPC for soft-deleting a financial_transaction.
-- Bypasses the RLS WITH CHECK issue on PATCH requests (same pattern as
-- soft_delete_sim_card in 00105). Role check enforced inside the function.
--
-- Also fixes: restores 'accountant' role access to financial_transactions
-- (accidentally dropped in 00081/00089 which changed to admin/manager/office).

-- ── Soft-delete RPC ───────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION soft_delete_transaction(transaction_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF get_my_role() NOT IN ('admin', 'accountant', 'manager', 'office') THEN
    RAISE EXCEPTION 'permission denied' USING ERRCODE = '42501';
  END IF;

  UPDATE financial_transactions
  SET deleted_at = now()
  WHERE id = transaction_id
    AND deleted_at IS NULL;
END;
$$;

GRANT EXECUTE ON FUNCTION soft_delete_transaction(UUID) TO authenticated;

-- ── Restore accountant access ─────────────────────────────────────────────────
DROP POLICY IF EXISTS ft_select ON financial_transactions;
CREATE POLICY ft_select ON financial_transactions FOR SELECT TO authenticated
  USING (
    deleted_at IS NULL
    AND get_my_role() IN ('admin', 'accountant', 'manager', 'office')
  );

DROP POLICY IF EXISTS ft_insert ON financial_transactions;
CREATE POLICY ft_insert ON financial_transactions FOR INSERT TO authenticated
  WITH CHECK (get_my_role() IN ('admin', 'accountant', 'manager', 'office'));

DROP POLICY IF EXISTS ft_update ON financial_transactions;
CREATE POLICY ft_update ON financial_transactions FOR UPDATE TO authenticated
  USING (
    deleted_at IS NULL
    AND get_my_role() IN ('admin', 'accountant', 'manager', 'office')
  )
  WITH CHECK (get_my_role() IN ('admin', 'accountant', 'manager', 'office'));

DROP POLICY IF EXISTS ft_delete ON financial_transactions;
CREATE POLICY ft_delete ON financial_transactions FOR DELETE TO authenticated
  USING (get_my_role() IN ('admin', 'accountant'));
