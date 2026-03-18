-- Migration: 00146_fix_ensure_payments_for_year_gap
-- Description: Fix ensure_payments_for_year to fill gaps. Previously it only inserted
--   months where year = p_year, so when user navigated to 2027 we'd add Jan-Dec 2027
--   but skip Sep-Dec 2026, leaving a gap. Now we generate from v_next_due through
--   end of p_year, filling any missing months.

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

  -- Use max payment_month within or before p_year (ignore future years) so we fill gaps correctly
  SELECT MAX(sp.payment_month)
  INTO   v_last_month
  FROM   subscription_payments sp
  WHERE  sp.subscription_id = p_subscription_id
    AND  sp.payment_month <= make_date(p_year, 12, 31);

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

  -- Generate from v_next_due through end of p_year (fills gaps, e.g. Sep-Dec 2026 when user asks for 2027)
  WHILE v_next_due <= make_date(p_year, 12, 31) LOOP
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
    v_next_due := (v_next_due + (v_interval_months || ' months')::INTERVAL)::DATE;
  END LOOP;

  RETURN v_count;
END;
$$;

-- One-time backfill: fill gaps for 2026 (and any other partial years) for active/paused subscriptions
DO $$
DECLARE
  r RECORD;
  n INTEGER;
BEGIN
  FOR r IN SELECT id FROM subscriptions WHERE status IN ('active', 'paused')
  LOOP
    n := ensure_payments_for_year(r.id, 2026);
    IF n > 0 THEN
      RAISE NOTICE 'Filled % payment(s) for subscription %', n, r.id;
    END IF;
  END LOOP;
END;
$$;
