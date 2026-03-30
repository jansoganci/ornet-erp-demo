-- Migration: 00169_fix_subscription_stats_mrr_include_sim_amount
-- Goal: Include SIM card fee (subscriptions.sim_amount) into subscription MRR
-- KPI calculation.
--
-- Constraint: Keep the exact same JSON structure/keys returned by
-- get_subscription_stats().

CREATE OR REPLACE FUNCTION get_subscription_stats()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result         JSON;
  v_last_month_end DATE;
BEGIN
  v_last_month_end := (date_trunc('month', CURRENT_DATE) - INTERVAL '1 day')::DATE;

  SELECT json_build_object(
    'active_count', (SELECT COUNT(*) FROM subscriptions WHERE status = 'active'),
    'distinct_customer_count', (
      SELECT COUNT(DISTINCT cs.customer_id)
      FROM subscriptions s
      JOIN customer_sites cs ON s.site_id = cs.id
      WHERE s.status = 'active'
    ),
    'paused_count',    (SELECT COUNT(*) FROM subscriptions WHERE status = 'paused'),
    'cancelled_count', (SELECT COUNT(*) FROM subscriptions WHERE status = 'cancelled'),

    -- MRR (NET / KDV haric): base + sms + line + static_ip + sim_amount
    -- sim_amount is the monthly SIM fee stored on the subscription.
    'mrr', (
      SELECT COALESCE(
        SUM(
          base_price
          + sms_fee
          + line_fee
          + static_ip_fee
          + COALESCE(sim_amount, 0)
        ),
        0
      )
      FROM subscriptions
      WHERE status = 'active'
    ),

    -- Previous month "active" snapshot (same time rules as existing RPC)
    'mrr_previous_month', (
      SELECT COALESCE(
        SUM(
          s.base_price
          + s.sms_fee
          + s.line_fee
          + s.static_ip_fee
          + COALESCE(s.sim_amount, 0)
        ),
        0
      )
      FROM subscriptions s
      WHERE s.start_date <= v_last_month_end
        AND (s.end_date IS NULL OR s.end_date >= v_last_month_end)
        AND (s.cancelled_at IS NULL OR s.cancelled_at::date > v_last_month_end)
        AND (
          s.paused_at IS NULL
          OR s.paused_at::date > v_last_month_end
          OR (s.reactivated_at IS NOT NULL AND s.reactivated_at::date <= v_last_month_end)
        )
    ),

    'active_count_previous_month', (
      SELECT COUNT(*)
      FROM subscriptions s
      WHERE s.start_date <= v_last_month_end
        AND (s.end_date IS NULL OR s.end_date >= v_last_month_end)
        AND (s.cancelled_at IS NULL OR s.cancelled_at::date > v_last_month_end)
        AND (
          s.paused_at IS NULL
          OR s.paused_at::date > v_last_month_end
          OR (s.reactivated_at IS NOT NULL AND s.reactivated_at::date <= v_last_month_end)
        )
    ),

    'overdue_invoice_count', (
      SELECT COUNT(*) FROM subscription_payments
      WHERE status = 'paid'
        AND should_invoice = TRUE
        AND invoice_no IS NULL
        AND payment_date < CURRENT_DATE - INTERVAL '7 days'
    ),

    'unpaid_count', (
      SELECT COUNT(*) FROM subscription_payments
      WHERE status IN ('pending', 'failed')
        AND payment_month < date_trunc('month', CURRENT_DATE)::DATE
    ),

    'unpaid_total_amount', (
      SELECT COALESCE(SUM(total_amount), 0)
      FROM subscription_payments
      WHERE status IN ('pending', 'failed')
        AND payment_month < date_trunc('month', CURRENT_DATE)::DATE
    )
  ) INTO v_result;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION get_subscription_stats() TO authenticated;

