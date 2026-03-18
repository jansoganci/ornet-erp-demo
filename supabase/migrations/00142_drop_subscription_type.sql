-- Migration: 00142_drop_subscription_type
-- Description: Remove subscription_type column from subscriptions.
--   All logic that used subscription_type = 'annual' now uses billing_frequency = 'yearly' only.
--   Payment method (card/cash/bank) is inferred from payment_method_id, cash_collector_id, card_bank_name.

-- 1. Update generate_subscription_payments: remove subscription_type = 'annual' fallback
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

-- 2. Update extend_active_subscription_payments: remove subscription_type = 'annual'
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
      v_last_month := date_trunc('month', v_sub.start_date)::DATE
                    - (v_interval_months || ' months')::INTERVAL;
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

-- 3. Update bulk_import_subscriptions: remove subscription_type from INSERT
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

-- 4. Update fn_update_subscription_price: remove subscription_type = 'annual'
CREATE OR REPLACE FUNCTION fn_update_subscription_price(
  p_subscription_id  UUID,
  p_base_price       NUMERIC,
  p_sms_fee          NUMERIC,
  p_line_fee         NUMERIC,
  p_static_ip_fee    NUMERIC,
  p_vat_rate         NUMERIC,
  p_cost             NUMERIC,
  p_old_prices       JSONB,
  p_user_id          UUID
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sub         subscriptions;
  v_subtotal    NUMERIC;
  v_vat_amt     NUMERIC;
  v_total       NUMERIC;
  v_multiplier  INT;
BEGIN
  SELECT * INTO v_sub
  FROM subscriptions
  WHERE id = p_subscription_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'subscription_not_found: %', p_subscription_id;
  END IF;

  UPDATE subscriptions
  SET
    base_price      = p_base_price,
    sms_fee         = p_sms_fee,
    line_fee        = p_line_fee,
    static_ip_fee   = p_static_ip_fee,
    vat_rate        = p_vat_rate,
    cost            = p_cost
  WHERE id = p_subscription_id;

  v_subtotal := p_base_price + p_sms_fee + p_line_fee + p_static_ip_fee;
  v_vat_amt  := ROUND(v_subtotal * p_vat_rate / 100, 2);
  v_total    := v_subtotal + v_vat_amt;

  v_multiplier := CASE
    WHEN v_sub.billing_frequency = 'yearly'   THEN 12
    WHEN v_sub.billing_frequency = '6_month'  THEN 6
    ELSE 1
  END;

  UPDATE subscription_payments
  SET
    amount       = v_subtotal * v_multiplier,
    vat_amount   = v_vat_amt  * v_multiplier,
    total_amount = v_total    * v_multiplier
  WHERE subscription_id = p_subscription_id
    AND status = 'pending';

  INSERT INTO audit_logs (table_name, record_id, action, old_values, new_values, user_id, description)
  VALUES (
    'subscriptions',
    p_subscription_id,
    'price_change',
    p_old_prices,
    jsonb_build_object(
      'base_price',     p_base_price,
      'sms_fee',        p_sms_fee,
      'line_fee',       p_line_fee,
      'static_ip_fee',  p_static_ip_fee,
      'vat_rate',       p_vat_rate
    ),
    p_user_id,
    'Fiyat güncellendi'
  );
END;
$$;

-- 5. Update bulk_update_subscription_prices: remove subscription_type
CREATE OR REPLACE FUNCTION bulk_update_subscription_prices(p_updates JSONB)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role TEXT;
  v_count   INTEGER := 0;
  i         INTEGER;
  elem      JSONB;
  v_id      UUID;
  v_freq    TEXT;
  old_base_price DECIMAL(10,2);
  old_sms_fee    DECIMAL(10,2);
  old_line_fee   DECIMAL(10,2);
  old_vat_rate   DECIMAL(5,2);
  old_cost       DECIMAL(10,2);
  v_base_price   DECIMAL(10,2);
  v_sms_fee      DECIMAL(10,2);
  v_line_fee     DECIMAL(10,2);
  v_vat_rate     DECIMAL(5,2);
  v_cost         DECIMAL(10,2);
  v_subtotal_one DECIMAL(10,2);
  v_vat_one      DECIMAL(10,2);
  v_total_one    DECIMAL(10,2);
  v_amount       DECIMAL(10,2);
  v_vat_amount   DECIMAL(10,2);
  v_total_amount DECIMAL(10,2);
BEGIN
  v_role := get_my_role();
  IF v_role NOT IN ('admin', 'accountant') THEN
    RAISE EXCEPTION 'Unauthorized: role % cannot update subscription prices', v_role;
  END IF;

  IF p_updates IS NULL OR jsonb_array_length(p_updates) = 0 THEN
    RETURN 0;
  END IF;

  FOR i IN 0..(jsonb_array_length(p_updates) - 1) LOOP
    elem := p_updates->i;
    v_id := (elem->>'id')::UUID;

    SELECT base_price, sms_fee, line_fee, vat_rate, cost
      INTO old_base_price, old_sms_fee, old_line_fee, old_vat_rate, old_cost
      FROM subscriptions
      WHERE id = v_id;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Subscription not found: %', v_id;
    END IF;

    v_base_price := COALESCE((elem->>'base_price')::DECIMAL(10,2), 0);
    v_sms_fee    := COALESCE((elem->>'sms_fee')::DECIMAL(10,2), 0);
    v_line_fee   := COALESCE((elem->>'line_fee')::DECIMAL(10,2), 0);
    v_vat_rate   := COALESCE((elem->>'vat_rate')::DECIMAL(5,2), 20);
    v_cost       := COALESCE((elem->>'cost')::DECIMAL(10,2), 0);

    UPDATE subscriptions
    SET base_price = v_base_price,
        sms_fee    = v_sms_fee,
        line_fee   = v_line_fee,
        vat_rate   = v_vat_rate,
        cost       = v_cost,
        updated_at = now()
    WHERE id = v_id;

    SELECT billing_frequency INTO v_freq
      FROM subscriptions WHERE id = v_id;

    v_subtotal_one := v_base_price + v_sms_fee + v_line_fee;
    v_vat_one      := ROUND(v_subtotal_one * v_vat_rate / 100, 2);
    v_total_one    := v_subtotal_one + v_vat_one;

    IF v_freq = 'yearly' THEN
      v_amount       := v_subtotal_one * 12;
      v_vat_amount   := v_vat_one * 12;
      v_total_amount := v_total_one * 12;
    ELSE
      v_amount       := v_subtotal_one;
      v_vat_amount   := v_vat_one;
      v_total_amount := v_total_one;
    END IF;

    UPDATE subscription_payments
    SET amount       = v_amount,
        vat_amount   = v_vat_amount,
        total_amount = v_total_amount,
        updated_at   = now()
    WHERE subscription_id = v_id
      AND status = 'pending';

    INSERT INTO audit_logs (table_name, record_id, action, old_values, new_values, user_id, description)
    VALUES (
      'subscriptions',
      v_id,
      'price_change',
      jsonb_build_object(
        'base_price', old_base_price, 'sms_fee', old_sms_fee, 'line_fee', old_line_fee,
        'vat_rate', old_vat_rate, 'cost', old_cost
      ),
      jsonb_build_object(
        'base_price', v_base_price, 'sms_fee', v_sms_fee, 'line_fee', v_line_fee,
        'vat_rate', v_vat_rate, 'cost', v_cost
      ),
      auth.uid(),
      'Fiyat güncellendi (toplu revizyon)'
    );

    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;

-- 6. Drop view that depends on subscription_type, then drop column and index
DROP VIEW IF EXISTS subscriptions_detail;
DROP INDEX IF EXISTS idx_subscriptions_type;
ALTER TABLE subscriptions DROP COLUMN IF EXISTS subscription_type;
