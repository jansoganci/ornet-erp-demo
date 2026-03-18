-- 00141_soft_delete_customer_rpc.sql
-- SECURITY DEFINER RPC for soft-deleting a customer and its children.
-- Bypasses RLS (same pattern as soft_delete_sim_card in 00105).
-- Cascade: customer_sites soft-deleted, active subscriptions cancelled.

CREATE OR REPLACE FUNCTION soft_delete_customer(p_customer_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_site_ids UUID[];
BEGIN
  -- Role guard: only admin and accountant may delete customers
  IF get_my_role() NOT IN ('admin', 'accountant') THEN
    RAISE EXCEPTION 'permission denied' USING ERRCODE = '42501';
  END IF;

  -- 1. Collect all site IDs for this customer (not yet deleted)
  SELECT array_agg(id) INTO v_site_ids
  FROM customer_sites
  WHERE customer_id = p_customer_id
    AND deleted_at IS NULL;

  -- 2. Cancel active/paused subscriptions tied to those sites
  IF v_site_ids IS NOT NULL AND array_length(v_site_ids, 1) > 0 THEN
    UPDATE subscriptions
    SET status       = 'cancelled',
        cancel_reason = 'Müşteri silindi',
        cancelled_at  = now(),
        updated_at    = now()
    WHERE site_id = ANY(v_site_ids)
      AND status IN ('active', 'paused');

    -- Write off pending payments for those cancelled subscriptions
    UPDATE subscription_payments
    SET status     = 'write_off',
        updated_at = now()
    WHERE subscription_id IN (
      SELECT id FROM subscriptions
      WHERE site_id = ANY(v_site_ids)
        AND status = 'cancelled'
        AND cancel_reason = 'Müşteri silindi'
    )
    AND status = 'pending';
  END IF;

  -- 3. Soft-delete all customer sites
  UPDATE customer_sites
  SET deleted_at = now()
  WHERE customer_id = p_customer_id
    AND deleted_at IS NULL;

  -- 4. Soft-delete the customer itself
  UPDATE customers
  SET deleted_at = now()
  WHERE id = p_customer_id
    AND deleted_at IS NULL;
END;
$$;

GRANT EXECUTE ON FUNCTION soft_delete_customer(UUID) TO authenticated;
