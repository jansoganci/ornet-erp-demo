-- Migration: 00143_add_payment_start_month
-- Description: Add payment_start_month (INTEGER 1-12) as the sole source of truth
--   for payment cycle scheduling in non-monthly subscriptions.
--   start_date is kept as a historical contract date only.

-- ============================================================================
-- 1. Add column
-- ============================================================================
ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS payment_start_month INTEGER
  CHECK (payment_start_month BETWEEN 1 AND 12);

-- ============================================================================
-- 2. Backfill existing non-monthly subscriptions from start_date month
-- ============================================================================
UPDATE subscriptions
SET payment_start_month = EXTRACT(MONTH FROM start_date)::INTEGER
WHERE billing_frequency IN ('3_month', '6_month', 'yearly')
  AND payment_start_month IS NULL;

-- ============================================================================
-- 3. Replace generate_subscription_payments
--    KEY CHANGE: use payment_start_month as anchor for non-monthly frequencies
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
  v_payments        INTEGER;
  v_interval_months INTEGER;
  v_start           DATE;
  v_month           DATE;
  v_anchor_year     INTEGER;
  i                 INTEGER;
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
      v_multiplier      := 1;
      v_payments        := 12;
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

-- ============================================================================
-- 4. Update extend_active_subscription_payments
--    KEY CHANGE: fallback anchor uses payment_start_month when available
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
BEGIN
  v_current_month := date_trunc('month', CURRENT_DATE)::DATE;

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

    IF v_next_due <= v_current_month THEN
      v_subtotal := COALESCE(v_sub.base_price, 0)
                  + COALESCE(v_sub.sms_fee, 0)
                  + COALESCE(v_sub.line_fee, 0)
                  + COALESCE(v_sub.static_ip_fee, 0)
                  + COALESCE(v_sub.sim_amount, 0);
      v_vat   := ROUND(v_subtotal * COALESCE(v_sub.vat_rate, 20) / 100, 2);
      v_total := v_subtotal + v_vat;

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
    END IF;
  END LOOP;
END;
$$;

-- ============================================================================
-- 5. Update bulk_import_subscriptions: accept payment_start_month
-- ============================================================================
CREATE OR REPLACE FUNCTION bulk_import_subscriptions(
  items jsonb,
  p_user_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row        jsonb;
  v_sub_id     uuid;
  v_idx        integer := 0;
  v_created    integer := 0;
  v_failed     integer := 0;
  v_errors     jsonb   := '[]'::jsonb;
  v_row_num    integer;
BEGIN
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;

  FOR v_row IN SELECT * FROM jsonb_array_elements(items)
  LOOP
    v_idx := v_idx + 1;
    v_row_num := COALESCE((v_row->>'row_num')::integer, v_idx + 1);

    BEGIN
      INSERT INTO subscriptions (
        site_id,
        start_date,
        billing_day,
        base_price,
        sim_amount,
        sms_fee,
        line_fee,
        cost,
        vat_rate,
        currency,
        billing_frequency,
        payment_start_month,
        service_type,
        official_invoice,
        notes,
        setup_notes,
        subscriber_title,
        alarm_center,
        alarm_center_account,
        created_by
      ) VALUES (
        (v_row->>'site_id')::uuid,
        (v_row->>'start_date')::date,
        COALESCE((v_row->>'billing_day')::integer, 1),
        COALESCE((v_row->>'base_price')::decimal, 0),
        COALESCE((v_row->>'sim_amount')::decimal, 0),
        COALESCE((v_row->>'sms_fee')::decimal, 0),
        COALESCE((v_row->>'line_fee')::decimal, 0),
        COALESCE((v_row->>'cost')::decimal, 0),
        COALESCE((v_row->>'vat_rate')::decimal, 20),
        COALESCE(v_row->>'currency', 'TRY'),
        COALESCE(v_row->>'billing_frequency', 'monthly'),
        (v_row->>'payment_start_month')::integer,
        NULLIF(v_row->>'service_type', ''),
        COALESCE((v_row->>'official_invoice')::boolean, true),
        NULLIF(v_row->>'notes', ''),
        NULLIF(v_row->>'setup_notes', ''),
        NULLIF(v_row->>'subscriber_title', ''),
        NULLIF(v_row->>'alarm_center', ''),
        NULLIF(v_row->>'alarm_center_account', ''),
        p_user_id
      )
      RETURNING id INTO v_sub_id;

      PERFORM generate_subscription_payments(v_sub_id);

      INSERT INTO audit_logs (table_name, record_id, action, new_values, user_id, description)
      VALUES (
        'subscriptions',
        v_sub_id,
        'insert',
        v_row,
        p_user_id,
        'Toplu içe aktarma ile oluşturuldu'
      );

      v_created := v_created + 1;

    EXCEPTION WHEN OTHERS THEN
      v_failed := v_failed + 1;
      v_errors := v_errors || jsonb_build_object(
        'row', v_row_num,
        'message', SQLERRM
      );
    END;
  END LOOP;

  RETURN jsonb_build_object(
    'created', v_created,
    'failed',  v_failed,
    'errors',  v_errors
  );
END;
$$;

-- ============================================================================
-- 6. Recreate subscriptions_detail view to pick up new column
--    (PostgreSQL expands sub.* at view creation time)
-- ============================================================================
DROP VIEW IF EXISTS subscriptions_detail;

CREATE VIEW subscriptions_detail AS
SELECT
  sub.*,
  (sub.base_price + sub.sms_fee + sub.line_fee + sub.static_ip_fee + sub.sim_amount) AS subtotal,
  ROUND((sub.base_price + sub.sms_fee + sub.line_fee + sub.static_ip_fee + sub.sim_amount) * sub.vat_rate / 100, 2) AS vat_amount,
  ROUND((sub.base_price + sub.sms_fee + sub.line_fee + sub.static_ip_fee + sub.sim_amount) * (1 + sub.vat_rate / 100), 2) AS total_amount,
  ROUND(
    (sub.base_price + sub.sms_fee + sub.line_fee + sub.static_ip_fee + sub.sim_amount) * (1 + sub.vat_rate / 100)
    - sub.cost - sub.static_ip_cost,
    2
  ) AS profit,
  (
    SELECT ip_address
    FROM sim_static_ips
    WHERE sim_card_id = sub.sim_card_id
      AND cancelled_at IS NULL
    LIMIT 1
  ) AS static_ip_address,
  EXISTS (
    SELECT 1 FROM subscription_payments sp
    WHERE sp.subscription_id = sub.id
      AND sp.status = 'pending'
      AND sp.payment_month < date_trunc('month', CURRENT_DATE)::date
  ) AS has_overdue_pending,
  s.account_no,
  s.site_name,
  s.address       AS site_address,
  s.city,
  s.district,
  s.contact_phone AS site_phone,
  c.id            AS customer_id,
  c.company_name,
  c.phone         AS customer_phone,
  c.tax_number,
  normalize_tr_for_search(c.company_name) AS company_name_search,
  normalize_tr_for_search(s.account_no) AS account_no_search,
  normalize_tr_for_search(s.site_name) AS site_name_search,
  pm.method_type  AS pm_type,
  pm.card_last4   AS pm_card_last4,
  pm.card_brand   AS pm_card_brand,
  pm.card_holder  AS pm_card_holder,
  pm.bank_name    AS pm_bank_name,
  pm.iban         AS pm_iban,
  pm.label        AS pm_label,
  mgr.full_name   AS managed_by_name,
  slr.full_name   AS sold_by_name,
  cash_collector.full_name AS cash_collector_name,
  sc.phone_number AS sim_phone_number,
  COALESCE(sc.sale_price, 0) AS sim_tl
FROM subscriptions sub
JOIN customer_sites s ON sub.site_id = s.id
JOIN customers c ON s.customer_id = c.id
LEFT JOIN payment_methods pm ON sub.payment_method_id = pm.id
LEFT JOIN profiles mgr ON sub.managed_by = mgr.id
LEFT JOIN profiles slr ON sub.sold_by = slr.id
LEFT JOIN profiles cash_collector ON sub.cash_collector_id = cash_collector.id
LEFT JOIN sim_cards sc ON sub.sim_card_id = sc.id;
