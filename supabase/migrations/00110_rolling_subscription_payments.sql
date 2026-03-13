-- Migration: 00110_rolling_subscription_payments
-- Description: Creates extend_active_subscription_payments() — the rolling
--   payment-generation function called monthly by the Edge Function scheduler.
--
-- Logic per active subscription:
--   1. Find the latest payment_month in subscription_payments.
--   2. Calculate next_due = latest_payment_month + interval for that frequency.
--   3. If next_due <= current month → insert the next payment row.
--   4. Uses ON CONFLICT DO NOTHING — fully idempotent (safe to re-run).
--
-- Frequency → interval mapping:
--   monthly  → 1 month
--   3_month  → 3 months
--   6_month  → 6 months
--   yearly   → 12 months
--   annual   → 12 months  (legacy subscription_type fallback)

CREATE OR REPLACE FUNCTION extend_active_subscription_payments()
RETURNS TABLE (
  subscription_id   UUID,
  payment_month     DATE,
  action            TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_sub             RECORD;
  v_last_month      DATE;
  v_interval_months INTEGER;
  v_next_due        DATE;
  v_subtotal        NUMERIC(12,2);
  v_vat             NUMERIC(12,2);
  v_total           NUMERIC(12,2);
  v_multiplier      INTEGER;
  v_current_month   DATE;
BEGIN
  v_current_month := date_trunc('month', CURRENT_DATE)::DATE;

  FOR v_sub IN
    SELECT *
    FROM   subscriptions
    WHERE  status = 'active'
  LOOP

    -- Determine interval and amount multiplier from billing_frequency
    -- (also handle legacy subscription_type = 'annual')
    CASE
      WHEN v_sub.billing_frequency = 'yearly'
        OR v_sub.subscription_type = 'annual' THEN
        v_interval_months := 12;
        v_multiplier      := 12;

      WHEN v_sub.billing_frequency = '6_month' THEN
        v_interval_months := 6;
        v_multiplier      := 6;

      WHEN v_sub.billing_frequency = '3_month' THEN
        v_interval_months := 3;
        v_multiplier      := 3;

      ELSE
        -- Default: monthly
        v_interval_months := 1;
        v_multiplier      := 1;
    END CASE;

    -- Find the most recent payment row for this subscription
    SELECT MAX(sp.payment_month)
    INTO   v_last_month
    FROM   subscription_payments sp
    WHERE  sp.subscription_id = v_sub.id;

    -- If no payment rows exist at all, bootstrap from start_date
    IF v_last_month IS NULL THEN
      v_last_month := date_trunc('month', v_sub.start_date)::DATE
                    - (v_interval_months || ' months')::INTERVAL;
    END IF;

    v_next_due := (v_last_month + (v_interval_months || ' months')::INTERVAL)::DATE;

    -- Only act if next payment is due this month or overdue
    IF v_next_due <= v_current_month THEN

      -- Recalculate amounts from current subscription prices
      v_subtotal := COALESCE(v_sub.base_price, 0)
                  + COALESCE(v_sub.sms_fee, 0)
                  + COALESCE(v_sub.line_fee, 0);
      v_vat      := ROUND(v_subtotal * COALESCE(v_sub.vat_rate, 20) / 100, 2);
      v_total    := v_subtotal + v_vat;

      INSERT INTO subscription_payments (
        subscription_id,
        payment_month,
        amount,
        vat_amount,
        total_amount
      )
      VALUES (
        v_sub.id,
        v_next_due,
        v_subtotal * v_multiplier,
        v_vat      * v_multiplier,
        v_total    * v_multiplier
      )
      ON CONFLICT (subscription_id, payment_month) DO NOTHING;

      -- Return a row so the Edge Function can log what was created
      subscription_id := v_sub.id;
      payment_month   := v_next_due;
      action          := 'created';
      RETURN NEXT;

    END IF;

  END LOOP;
END;
$$;

-- Only the service role (used by the Edge Function) may call this.
-- Authenticated users cannot trigger rolling generation manually.
REVOKE EXECUTE ON FUNCTION extend_active_subscription_payments() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION extend_active_subscription_payments() FROM authenticated;
GRANT  EXECUTE ON FUNCTION extend_active_subscription_payments() TO service_role;
