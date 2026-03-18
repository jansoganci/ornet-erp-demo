-- Migration: 00149_pending_payments_summary_notification
-- Description: On the 25th of every month at 09:00 Turkey time, create one notification
-- summarizing how many current-month subscription payments are still pending.
-- Visible to admin/accountant in notification center and bell dropdown.

-- ============================================================================
-- 1. EXTEND NOTIFICATIONS.TYPE CHECK CONSTRAINT
-- ============================================================================

ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_type_check CHECK (type IN (
  'subscription_cancelled', 'subscription_paused', 'payment_due_soon',
  'renewal_due_soon', 'work_order_assigned', 'task_due_soon', 'user_reminder',
  'sim_card_cancelled', 'pending_payments_summary'
));

-- ============================================================================
-- 2. FN_CREATE_PENDING_PAYMENTS_SUMMARY_NOTIFICATION()
-- ============================================================================

CREATE OR REPLACE FUNCTION fn_create_pending_payments_summary_notification()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_month_start DATE := date_trunc('month', CURRENT_DATE)::DATE;
  v_next_month_start   DATE := (v_current_month_start + INTERVAL '1 month')::DATE;
  v_count              INTEGER;
  v_dedup_key          TEXT;
BEGIN
  -- Count pending payments for the current month
  SELECT COUNT(*)
  INTO v_count
  FROM subscription_payments sp
  WHERE sp.status = 'pending'
    AND sp.payment_month >= v_current_month_start
    AND sp.payment_month <  v_next_month_start;

  v_dedup_key := 'pending_payments_summary::' || to_char(v_current_month_start, 'YYYY-MM');

  IF v_count > 0 THEN
    INSERT INTO notifications (
      type,
      title,
      body,
      related_entity_type,
      related_entity_id,
      target_role,
      dedup_key
    )
    VALUES (
      'pending_payments_summary',
      'Bu ay ' || v_count || ' aboneliğin ödemesi henüz alınmadı',
      NULL,
      'subscription',
      NULL,
      'accountant',
      v_dedup_key
    )
    ON CONFLICT (dedup_key) DO NOTHING;
  ELSE
    -- If there is an existing notification for this month and everything is paid, resolve it
    UPDATE notifications
    SET resolved_at = NOW()
    WHERE dedup_key = v_dedup_key
      AND resolved_at IS NULL;
  END IF;
END;
$$;

-- ============================================================================
-- 3. SCHEDULE PG_CRON JOB
-- ============================================================================

DO $$
BEGIN
  PERFORM cron.unschedule('pending-payments-summary');
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

SELECT cron.schedule(
  'pending-payments-summary',
  '0 6 25 * *',
  $$ SELECT fn_create_pending_payments_summary_notification(); $$
);
