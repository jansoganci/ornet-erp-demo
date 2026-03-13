-- Migration: 00111_atomic_cancel_subscription
-- Description: Replaces the two-step JS cancel logic with a single atomic
--   RPC function. Both the subscription status update and the optional
--   payment write-off execute inside one transaction — if either fails,
--   everything rolls back and the subscription remains active with payments
--   untouched.

CREATE OR REPLACE FUNCTION fn_cancel_subscription(
  p_subscription_id  UUID,
  p_reason           TEXT    DEFAULT NULL,
  p_write_off_unpaid BOOLEAN DEFAULT FALSE
)
RETURNS SETOF subscriptions
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_row     subscriptions%ROWTYPE;
BEGIN
  -- Resolve the calling user for the audit log
  SELECT auth.uid() INTO v_user_id;

  -- 1. Cancel the subscription
  UPDATE subscriptions
  SET
    status       = 'cancelled',
    cancel_reason = p_reason,
    cancelled_at  = NOW(),
    updated_at    = NOW()
  WHERE id = p_subscription_id
  RETURNING * INTO v_row;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Subscription not found: %', p_subscription_id;
  END IF;

  -- 2. Optionally write off all pending payments (same transaction)
  IF p_write_off_unpaid THEN
    UPDATE subscription_payments
    SET
      status     = 'write_off',
      updated_at = NOW()
    WHERE subscription_id = p_subscription_id
      AND status          = 'pending';
  END IF;

  -- 3. Audit log (also inside the same transaction)
  INSERT INTO audit_logs (
    table_name,
    record_id,
    action,
    old_values,
    new_values,
    user_id,
    description
  )
  VALUES (
    'subscriptions',
    p_subscription_id,
    'cancel',
    NULL,
    jsonb_build_object(
      'reason',           p_reason,
      'write_off_unpaid', p_write_off_unpaid
    ),
    v_user_id,
    'Abonelik iptal edildi'
  );

  RETURN NEXT v_row;
END;
$$;

GRANT EXECUTE ON FUNCTION fn_cancel_subscription(UUID, TEXT, BOOLEAN) TO authenticated;
