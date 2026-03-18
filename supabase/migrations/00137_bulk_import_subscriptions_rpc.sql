-- Migration: 00137_bulk_import_subscriptions_rpc
-- Description: Server-side RPC for bulk subscription import.
-- Accepts a JSONB array of subscription payloads (with site_id already resolved).
-- For each row: inserts subscription, generates payments, writes audit log.
-- Returns a JSONB summary: { created, failed, errors[] }.
-- Partial-success mode: bad rows are skipped and reported, good rows commit.

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
  -- Auth check: caller must be authenticated
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;

  FOR v_row IN SELECT * FROM jsonb_array_elements(items)
  LOOP
    v_idx := v_idx + 1;
    v_row_num := COALESCE((v_row->>'row_num')::integer, v_idx + 1);

    BEGIN
      -- Insert subscription
      INSERT INTO subscriptions (
        site_id,
        subscription_type,
        start_date,
        billing_day,
        base_price,
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
        COALESCE(v_row->>'subscription_type', 'manual_bank'),
        (v_row->>'start_date')::date,
        COALESCE((v_row->>'billing_day')::integer, 1),
        COALESCE((v_row->>'base_price')::decimal, 0),
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

      -- Generate payment records (reuses existing function — no HTTP call)
      PERFORM generate_subscription_payments(v_sub_id);

      -- Audit log
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

GRANT EXECUTE ON FUNCTION bulk_import_subscriptions(jsonb, uuid) TO authenticated;
