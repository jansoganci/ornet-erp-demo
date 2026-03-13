-- Migration: 00113_revert_write_off
-- Description: Adds fn_revert_write_off() RPC.
--   Reverts a write_off payment back to pending so it can be re-recorded.
--   Only works on payments currently in write_off status.
--   Audit logged inside the same transaction.

CREATE OR REPLACE FUNCTION fn_revert_write_off(
  p_payment_id UUID
)
RETURNS SETOF subscription_payments
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_row     subscription_payments%ROWTYPE;
BEGIN
  SELECT auth.uid() INTO v_user_id;

  UPDATE subscription_payments
  SET
    status     = 'pending',
    updated_at = NOW()
  WHERE id     = p_payment_id
    AND status = 'write_off'
  RETURNING * INTO v_row;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Payment not found or is not in write_off status: %', p_payment_id;
  END IF;

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
    'subscription_payments',
    p_payment_id,
    'status_change',
    jsonb_build_object('status', 'write_off'),
    jsonb_build_object('status', 'pending'),
    v_user_id,
    'Silme geri alındı, ödeme beklemeye alındı'
  );

  RETURN NEXT v_row;
END;
$$;

GRANT EXECUTE ON FUNCTION fn_revert_write_off(UUID) TO authenticated;
