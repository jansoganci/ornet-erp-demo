-- Migration: 00147_generate_payments_until_2040
-- Description: Replace fixed 12-month window in generate_subscription_payments with
--   a WHILE loop that generates payments through December 2040.
--   Idempotent (ON CONFLICT DO NOTHING) — safe to call multiple times.

-- ============================================================================
-- 1. Replace generate_subscription_payments — loop until 2040-12-01
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
  v_multiplier      INTEGER;
  v_interval_months INTEGER;
  v_start           DATE;
  v_month           DATE;
  v_anchor_year     INTEGER;
  v_horizon         DATE := '2040-12-01'::DATE;
BEGIN
  SELECT * INTO v_sub FROM subscriptions WHERE id = p_subscription_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Subscription not found: %', p_subscription_id;
  END IF;

  v_subtotal := COALESCE(v_sub.base_price, 0)
              + COALESCE(v_sub.sms_fee, 0)
              + COALESCE(v_sub.line_fee, 0)
              + COALESCE(v_sub.static_ip_fee, 0)
              + COALESCE(v_sub.sim_amount, 0);
  v_vat   := ROUND(v_subtotal * COALESCE(v_sub.vat_rate, 20) / 100, 2);
  v_total := v_subtotal + v_vat;

  CASE
    WHEN v_sub.billing_frequency = 'yearly' THEN
      v_multiplier      := 12;
      v_interval_months := 12;

    WHEN v_sub.billing_frequency = '6_month' THEN
      v_multiplier      := 6;
      v_interval_months := 6;

    WHEN v_sub.billing_frequency = '3_month' THEN
      v_multiplier      := 3;
      v_interval_months := 3;

    ELSE
      v_multiplier      := 1;
      v_interval_months := 1;
  END CASE;

  -- Anchor logic:
  -- Monthly (or missing payment_start_month): use start_date truncated to month
  -- Non-monthly with payment_start_month: anchor year from start_date + payment_start_month
  IF v_sub.billing_frequency = 'monthly' OR v_sub.payment_start_month IS NULL THEN
    v_start := date_trunc('month',
                 COALESCE(p_start_date, v_sub.start_date))::DATE;
  ELSE
    v_anchor_year := EXTRACT(YEAR FROM COALESCE(p_start_date, v_sub.start_date))::INTEGER;
    v_start := make_date(v_anchor_year, v_sub.payment_start_month, 1);
  END IF;

  v_month := v_start;

  WHILE v_month <= v_horizon LOOP
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

    v_month := (v_month + (v_interval_months || ' months')::INTERVAL)::DATE;
  END LOOP;
END;
$$;

-- ============================================================================
-- 2. extend_active_subscription_payments — deprecated
-- ============================================================================
-- deprecated, replaced by full generation to 2040
CREATE OR REPLACE FUNCTION extend_active_subscription_payments()
RETURNS TABLE (
  subscription_id   UUID,
  payment_month    DATE,
  action           TEXT
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
  v_horizon         DATE;
BEGIN
  v_current_month := date_trunc('month', CURRENT_DATE)::DATE;
  v_horizon       := (v_current_month + interval '24 months')::DATE;

  FOR v_sub IN
    SELECT *
    FROM   subscriptions
    WHERE  status = 'active'
  LOOP

    CASE
      WHEN v_sub.billing_frequency = 'yearly' THEN
        v_interval_months := 12;
        v_multiplier      := 12;

      WHEN v_sub.billing_frequency = '6_month' THEN
        v_interval_months := 6;
        v_multiplier      := 6;

      WHEN v_sub.billing_frequency = '3_month' THEN
        v_interval_months := 3;
        v_multiplier      := 3;

      ELSE
        v_interval_months := 1;
        v_multiplier      := 1;
    END CASE;

    SELECT MAX(sp.payment_month)
    INTO   v_last_month
    FROM   subscription_payments sp
    WHERE  sp.subscription_id = v_sub.id;

    IF v_last_month IS NULL THEN
      IF v_sub.billing_frequency != 'monthly'
         AND v_sub.payment_start_month IS NOT NULL THEN
        v_last_month := make_date(
          EXTRACT(YEAR FROM v_sub.start_date)::INTEGER,
          v_sub.payment_start_month,
          1
        ) - (v_interval_months || ' months')::INTERVAL;
      ELSE
        v_last_month := date_trunc('month', v_sub.start_date)::DATE
                      - (v_interval_months || ' months')::INTERVAL;
      END IF;
    END IF;

    v_next_due := (v_last_month + (v_interval_months || ' months')::INTERVAL)::DATE;

    v_subtotal := COALESCE(v_sub.base_price, 0)
                + COALESCE(v_sub.sms_fee, 0)
                + COALESCE(v_sub.line_fee, 0)
                + COALESCE(v_sub.static_ip_fee, 0)
                + COALESCE(v_sub.sim_amount, 0);
    v_vat   := ROUND(v_subtotal * COALESCE(v_sub.vat_rate, 20) / 100, 2);
    v_total := v_subtotal + v_vat;

    WHILE v_next_due <= v_horizon LOOP
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
        v_vat * v_multiplier,
        v_total * v_multiplier
      )
      ON CONFLICT (subscription_id, payment_month) DO NOTHING;

      subscription_id := v_sub.id;
      payment_month   := v_next_due;
      action         := 'created';
      RETURN NEXT;

      v_next_due := (v_next_due + (v_interval_months || ' months')::INTERVAL)::DATE;
    END LOOP;
  END LOOP;
END;
$$;

-- ============================================================================
-- 3. One-time backfill: extend existing subscriptions to 2040
-- ============================================================================
-- Run after migration to backfill active/paused subscriptions:
--
--   DO $$
--   DECLARE
--     r RECORD;
--   BEGIN
--     FOR r IN SELECT id FROM subscriptions WHERE status IN ('active', 'paused')
--     LOOP
--       PERFORM generate_subscription_payments(r.id);
--     END LOOP;
--   END;
--   $$;
--
