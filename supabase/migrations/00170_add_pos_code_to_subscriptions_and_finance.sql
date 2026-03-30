-- Migration: 00170_add_pos_code_to_subscriptions_and_finance
-- Description: Adds pos_code to subscription_payments and financial_transactions,
--   updates fn_record_payment RPC, and updates the finance sync trigger.

-- 1. Add columns
ALTER TABLE subscription_payments ADD COLUMN pos_code TEXT;
ALTER TABLE financial_transactions ADD COLUMN pos_code TEXT;

-- 2. Update fn_record_payment RPC to accept p_pos_code
CREATE OR REPLACE FUNCTION fn_record_payment(
  p_payment_id     UUID,
  p_payment_date   DATE,
  p_payment_method TEXT,
  p_should_invoice BOOLEAN,
  p_vat_rate       NUMERIC,
  p_invoice_no     TEXT,
  p_invoice_type   TEXT,
  p_notes          TEXT,
  p_reference_no   TEXT,
  p_user_id        UUID,
  p_pos_code       TEXT DEFAULT NULL -- New parameter
)
RETURNS SETOF subscription_payments
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_payment  subscription_payments;
  v_vat_amt  NUMERIC;
  v_total    NUMERIC;
BEGIN
  -- Lock the row
  SELECT * INTO v_payment
  FROM subscription_payments
  WHERE id = p_payment_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'payment_not_found: %', p_payment_id;
  END IF;

  -- Immutability check
  IF v_payment.status = 'paid' AND v_payment.invoice_no IS NOT NULL THEN
    RAISE EXCEPTION 'payment_locked: payment % is already paid and invoiced', p_payment_id;
  END IF;

  -- Derive VAT + totals
  IF p_should_invoice THEN
    v_vat_amt := ROUND(v_payment.amount * p_vat_rate / 100, 2);
    v_total   := v_payment.amount + v_vat_amt;
  ELSE
    v_vat_amt := 0;
    v_total   := v_payment.amount;
  END IF;

  -- Apply update
  UPDATE subscription_payments
  SET
    status            = 'paid',
    payment_date      = p_payment_date,
    payment_method    = p_payment_method,
    should_invoice    = p_should_invoice,
    payment_vat_rate  = CASE WHEN p_should_invoice THEN p_vat_rate ELSE 0 END,
    vat_amount        = v_vat_amt,
    total_amount      = v_total,
    invoice_no        = CASE WHEN p_should_invoice THEN p_invoice_no   ELSE NULL END,
    invoice_type      = CASE WHEN p_should_invoice THEN p_invoice_type ELSE NULL END,
    invoice_date      = CASE
                          WHEN p_should_invoice AND p_invoice_no IS NOT NULL
                          THEN p_payment_date
                          ELSE NULL
                        END,
    notes             = p_notes,
    reference_no      = p_reference_no,
    pos_code          = p_pos_code -- Store new field
  WHERE id = p_payment_id
  RETURNING * INTO v_payment;

  -- Audit log
  INSERT INTO audit_logs (
    table_name, record_id, action,
    old_values, new_values,
    user_id, description
  ) VALUES (
    'subscription_payments',
    p_payment_id,
    'payment_recorded',
    jsonb_build_object('status', 'pending'),
    jsonb_build_object(
      'status',          'paid',
      'payment_date',    p_payment_date,
      'payment_method',  p_payment_method,
      'should_invoice',  p_should_invoice,
      'pos_code',        p_pos_code
    ),
    p_user_id,
    'Ödeme kaydedildi: ' || v_payment.payment_month::text
  );

  RETURN NEXT v_payment;
END;
$$;

-- 3. Update fn_subscription_payment_to_finance trigger function
CREATE OR REPLACE FUNCTION fn_subscription_payment_to_finance()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sub RECORD;
  v_customer_id UUID;
  v_site_id UUID;
  v_cogs_try DECIMAL(12,2);
  v_multiplier INTEGER;
  v_vat_rate DECIMAL(5,2);
  v_expense_category_id UUID;
  v_exists BOOLEAN;
BEGIN
  IF NEW.status <> 'paid' OR OLD.status = 'paid' THEN
    RETURN NEW;
  END IF;

  SELECT EXISTS(
    SELECT 1 FROM financial_transactions
    WHERE subscription_payment_id = NEW.id LIMIT 1
  ) INTO v_exists;
  IF v_exists THEN
    RETURN NEW;
  END IF;

  SELECT * INTO v_sub FROM subscriptions WHERE id = NEW.subscription_id;
  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  SELECT cs.customer_id, cs.id INTO v_customer_id, v_site_id
  FROM customer_sites cs
  WHERE cs.id = v_sub.site_id;
  IF v_site_id IS NULL THEN
    RETURN NEW;
  END IF;

  v_vat_rate := COALESCE(v_sub.vat_rate, 20);

  IF v_sub.billing_frequency = 'yearly' THEN
    v_multiplier := 12;
  ELSIF v_sub.billing_frequency = '6_month' THEN
    v_multiplier := 6;
  ELSIF v_sub.billing_frequency = '3_month' THEN
    v_multiplier := 3;
  ELSE
    v_multiplier := 1;
  END IF;

  v_cogs_try := COALESCE(v_sub.cost, 0) * v_multiplier;

  -- 1. Insert income row
  BEGIN
    INSERT INTO financial_transactions (
      direction, income_type, subscription_payment_id,
      amount_original, original_currency, amount_try, exchange_rate,
      should_invoice, output_vat, vat_rate, cogs_try,
      transaction_date, customer_id, site_id, payment_method,
      pos_code, -- New field
      created_at, updated_at
    ) VALUES (
      'income', 'subscription', NEW.id,
      COALESCE(NEW.amount, 0), 'TRY', COALESCE(NEW.amount, 0), NULL,
      COALESCE(NEW.should_invoice, true), COALESCE(NEW.vat_amount, 0), v_vat_rate,
      CASE WHEN v_cogs_try > 0 THEN v_cogs_try ELSE NULL END,
      COALESCE(NEW.payment_date, NEW.payment_month), v_customer_id, v_site_id,
      COALESCE(NEW.payment_method, 'cash'),
      NEW.pos_code, -- Copy from payment
      now(), now()
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'fn_subscription_payment_to_finance income failed for payment %: %', NEW.id, SQLERRM;
    RETURN NEW;
  END;

  -- 2. Insert expense row (COGS) if cost > 0
  IF v_cogs_try IS NOT NULL AND v_cogs_try > 0 THEN
    SELECT id INTO v_expense_category_id
    FROM expense_categories
    WHERE code = 'subscription_cogs'
    LIMIT 1;

    IF v_expense_category_id IS NOT NULL THEN
      BEGIN
        INSERT INTO financial_transactions (
          direction, subscription_payment_id, expense_category_id,
          amount_original, original_currency, amount_try, exchange_rate,
          has_invoice, input_vat, vat_rate,
          transaction_date, customer_id, site_id, payment_method,
          pos_code, -- New field
          created_at, updated_at
        ) VALUES (
          'expense', NEW.id, v_expense_category_id,
          v_cogs_try, 'TRY', v_cogs_try, NULL,
          true, ROUND(v_cogs_try * (v_vat_rate / 100.0), 2), v_vat_rate,
          COALESCE(NEW.payment_date, NEW.payment_month), v_customer_id, v_site_id,
          COALESCE(NEW.payment_method, 'cash'),
          NEW.pos_code, -- Copy from payment
          now(), now()
        );
      EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'fn_subscription_payment_to_finance expense failed for payment %: %', NEW.id, SQLERRM;
      END;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- 4. Re-grant permissions
GRANT EXECUTE ON FUNCTION fn_record_payment(
  UUID, DATE, TEXT, BOOLEAN, NUMERIC, TEXT, TEXT, TEXT, TEXT, UUID, TEXT
) TO authenticated;
