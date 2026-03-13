-- Migration: 00109_add_3month_billing_frequency
-- Description: Formally add '3_month' billing frequency.
--   - Extends CHECK constraint on subscriptions.billing_frequency
--   - Replaces generate_subscription_payments() to handle all 4 frequencies
-- Billing model:
--   monthly  → 1 payment/month,  amount = 1 × subtotal
--   3_month  → 1 payment/quarter, amount = 3 × subtotal, interval = 3 months
--   6_month  → 1 payment/half,   amount = 6 × subtotal, interval = 6 months
--   yearly   → 1 payment/year,   amount = 12 × subtotal, interval = 12 months

-- ============================================================================
-- 1. Extend CHECK constraint
-- ============================================================================

ALTER TABLE subscriptions
  DROP CONSTRAINT IF EXISTS subscriptions_billing_frequency_check;

ALTER TABLE subscriptions
  ADD CONSTRAINT subscriptions_billing_frequency_check
  CHECK (billing_frequency IN ('monthly', '3_month', '6_month', 'yearly'));

COMMENT ON COLUMN subscriptions.billing_frequency IS
  'Billing cycle: monthly (12/year), 3_month (4/year), 6_month (2/year), yearly (1/year). '
  'cost column is always the MONTHLY operational cost regardless of billing_frequency.';

-- ============================================================================
-- 2. Replace generate_subscription_payments()
--    Generates a FIXED initial batch (1 year worth) when a subscription is
--    first created or manually reactivated. Rolling month-by-month extension
--    is handled separately by extend_active_subscription_payments().
-- ============================================================================

CREATE OR REPLACE FUNCTION generate_subscription_payments(
  p_subscription_id UUID,
  p_start_date      DATE DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_sub             RECORD;
  v_subtotal        NUMERIC(12,2);
  v_vat             NUMERIC(12,2);
  v_total           NUMERIC(12,2);
  v_multiplier      INTEGER;   -- amount multiplier per payment
  v_payments        INTEGER;   -- how many rows to insert (always 1 year worth)
  v_interval_months INTEGER;   -- months between consecutive payments
  v_start           DATE;
  v_month           DATE;
  i                 INTEGER;
BEGIN
  SELECT * INTO v_sub FROM subscriptions WHERE id = p_subscription_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Subscription not found: %', p_subscription_id;
  END IF;

  -- Monthly base subtotal (prices are always stored as monthly amounts)
  v_subtotal := COALESCE(v_sub.base_price, 0)
              + COALESCE(v_sub.sms_fee, 0)
              + COALESCE(v_sub.line_fee, 0);
  v_vat   := ROUND(v_subtotal * COALESCE(v_sub.vat_rate, 20) / 100, 2);
  v_total := v_subtotal + v_vat;

  -- Derive frequency parameters
  CASE
    WHEN v_sub.billing_frequency = 'yearly'
      OR v_sub.subscription_type = 'annual' THEN
      v_multiplier      := 12;
      v_payments        := 1;
      v_interval_months := 12;

    WHEN v_sub.billing_frequency = '6_month' THEN
      v_multiplier      := 6;
      v_payments        := 2;
      v_interval_months := 6;

    WHEN v_sub.billing_frequency = '3_month' THEN
      v_multiplier      := 3;
      v_payments        := 4;
      v_interval_months := 3;

    ELSE
      -- Default: monthly
      v_multiplier      := 1;
      v_payments        := 12;
      v_interval_months := 1;
  END CASE;

  v_start := date_trunc('month',
               COALESCE(p_start_date, v_sub.start_date))::DATE;

  FOR i IN 0..(v_payments - 1) LOOP
    v_month := (v_start + (i * v_interval_months || ' months')::INTERVAL)::DATE;

    INSERT INTO subscription_payments (
      subscription_id,
      payment_month,
      amount,
      vat_amount,
      total_amount
    )
    VALUES (
      p_subscription_id,
      v_month,
      v_subtotal * v_multiplier,
      v_vat     * v_multiplier,
      v_total   * v_multiplier
    )
    ON CONFLICT (subscription_id, payment_month) DO NOTHING;
  END LOOP;
END;
$$;

GRANT EXECUTE ON FUNCTION generate_subscription_payments(UUID, DATE) TO authenticated;
