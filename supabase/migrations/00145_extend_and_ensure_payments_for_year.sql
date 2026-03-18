-- Migration: 00145_extend_and_ensure_payments_for_year
-- Description: Option C for payment schedule year navigation:
--   1. extend_active_subscription_payments: keep 24 months ahead (instead of just next due)
--   2. ensure_payments_for_year: on-demand RPC for frontend when user navigates to empty year

-- ============================================================================
-- 1. Update extend_active_subscription_payments — keep 24 months ahead
-- ============================================================================
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
-- 2. Create ensure_payments_for_year — on-demand generation for empty year
-- ============================================================================
CREATE OR REPLACE FUNCTION ensure_payments_for_year(
  p_subscription_id UUID,
  p_year            INTEGER
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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
  v_count           INTEGER := 0;
BEGIN
  SELECT * INTO v_sub FROM subscriptions WHERE id = p_subscription_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Subscription not found: %', p_subscription_id;
  END IF;

  IF v_sub.status = 'cancelled' THEN
    RETURN 0;
  END IF;

  IF EXISTS (
    SELECT 1 FROM subscription_payments
    WHERE subscription_id = p_subscription_id
      AND EXTRACT(YEAR FROM payment_month) = p_year
  ) THEN
    RETURN 0;
  END IF;

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

  v_subtotal := COALESCE(v_sub.base_price, 0)
              + COALESCE(v_sub.sms_fee, 0)
              + COALESCE(v_sub.line_fee, 0)
              + COALESCE(v_sub.static_ip_fee, 0)
              + COALESCE(v_sub.sim_amount, 0);
  v_vat   := ROUND(v_subtotal * COALESCE(v_sub.vat_rate, 20) / 100, 2);
  v_total := v_subtotal + v_vat;

  SELECT MAX(sp.payment_month)
  INTO   v_last_month
  FROM   subscription_payments sp
  WHERE  sp.subscription_id = p_subscription_id;

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

  WHILE EXTRACT(YEAR FROM v_next_due) <= p_year LOOP
    IF EXTRACT(YEAR FROM v_next_due) = p_year THEN
      INSERT INTO subscription_payments (
        subscription_id,
        payment_month,
        amount,
        vat_amount,
        total_amount
      )
      VALUES (
        p_subscription_id,
        v_next_due,
        v_subtotal * v_multiplier,
        v_vat * v_multiplier,
        v_total * v_multiplier
      )
      ON CONFLICT (subscription_id, payment_month) DO NOTHING;

      v_count := v_count + 1;
    END IF;

    v_next_due := (v_next_due + (v_interval_months || ' months')::INTERVAL)::DATE;
  END LOOP;

  RETURN v_count;
END;
$$;

GRANT EXECUTE ON FUNCTION ensure_payments_for_year(UUID, INTEGER) TO authenticated;
