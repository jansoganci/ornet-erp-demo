-- Migration: 00148_fix_payment_start_from_current_date
-- Fix: use CURRENT_DATE instead of start_date when p_start_date is NULL
-- start_date is a contract date, not a system entry date.
-- Payments should start from the month the subscription is added to the system.

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

  -- Anchor logic: use CURRENT_DATE when p_start_date is NULL (not start_date)
  IF v_sub.billing_frequency = 'monthly' OR v_sub.payment_start_month IS NULL THEN
    v_start := date_trunc('month',
                 COALESCE(p_start_date, CURRENT_DATE))::DATE;
  ELSE
    v_anchor_year := EXTRACT(YEAR FROM COALESCE(p_start_date, CURRENT_DATE))::INTEGER;
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
