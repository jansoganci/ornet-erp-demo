-- Migration: 00172_rename_service_requests
-- Description: Rename service_requests objects to operations_items

BEGIN;

-- ============================================================================
-- 1. Table rename
-- ============================================================================

ALTER TABLE IF EXISTS public.service_requests
  RENAME TO operations_items;

-- ============================================================================
-- 2. Trigger rename
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'update_service_requests_updated_at'
  ) THEN
    ALTER TRIGGER update_service_requests_updated_at
      ON public.operations_items
      RENAME TO update_operations_items_updated_at;
  END IF;
END $$;

-- ============================================================================
-- 3. Index rename
-- ============================================================================

ALTER INDEX IF EXISTS public.idx_sr_status_open RENAME TO idx_oi_status_open;
ALTER INDEX IF EXISTS public.idx_sr_region RENAME TO idx_oi_region;
ALTER INDEX IF EXISTS public.idx_sr_contact_status RENAME TO idx_oi_contact_status;
ALTER INDEX IF EXISTS public.idx_sr_scheduled_date RENAME TO idx_oi_scheduled_date;
ALTER INDEX IF EXISTS public.idx_sr_customer RENAME TO idx_oi_customer;
ALTER INDEX IF EXISTS public.idx_sr_work_order RENAME TO idx_oi_work_order;
ALTER INDEX IF EXISTS public.idx_service_requests_status_deleted RENAME TO idx_operations_items_status_deleted;

-- ============================================================================
-- 4. Policy rename
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'operations_items'
      AND policyname = 'service_requests_select'
  ) THEN
    ALTER POLICY service_requests_select
      ON public.operations_items
      RENAME TO operations_items_select;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'operations_items'
      AND policyname = 'service_requests_insert'
  ) THEN
    ALTER POLICY service_requests_insert
      ON public.operations_items
      RENAME TO operations_items_insert;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'operations_items'
      AND policyname = 'service_requests_update'
  ) THEN
    ALTER POLICY service_requests_update
      ON public.operations_items
      RENAME TO operations_items_update;
  END IF;
END $$;

-- ============================================================================
-- 5. View rename (recreate)
-- ============================================================================

DROP VIEW IF EXISTS public.service_requests_detail;

CREATE OR REPLACE VIEW public.operations_items_detail AS
SELECT
  oi.id,
  oi.customer_id,
  oi.site_id,
  oi.description,
  oi.region,
  oi.priority,
  oi.work_type,
  oi.contact_status,
  oi.contact_attempts,
  oi.last_contact_at,
  oi.contact_notes,
  oi.status,
  oi.work_order_id,
  oi.scheduled_date,
  oi.scheduled_time,
  oi.failure_reason,
  oi.reschedule_count,
  oi.created_by,
  oi.created_at,
  oi.updated_at,
  c.company_name   AS customer_name,
  c.phone          AS customer_phone,
  cs.site_name,
  cs.account_no,
  cs.city,
  cs.district,
  cs.contact_phone AS site_contact_phone,
  p.full_name      AS created_by_name,
  wo.form_no       AS work_order_form_no,
  wo.status        AS work_order_status
FROM public.operations_items oi
LEFT JOIN public.customers c       ON c.id = oi.customer_id
LEFT JOIN public.customer_sites cs ON cs.id = oi.site_id
LEFT JOIN public.profiles p        ON p.id = oi.created_by
LEFT JOIN public.work_orders wo    ON wo.id = oi.work_order_id
WHERE oi.deleted_at IS NULL;

-- ============================================================================
-- 6. RPC rename (recreate under new names)
-- ============================================================================

DROP FUNCTION IF EXISTS public.fn_convert_item_to_work_order(UUID, DATE, TIME, TEXT, TEXT, UUID);
CREATE OR REPLACE FUNCTION public.fn_convert_item_to_work_order(
  p_item_id        UUID,
  p_scheduled_date DATE,
  p_scheduled_time TIME    DEFAULT NULL,
  p_work_type      TEXT    DEFAULT NULL,
  p_notes          TEXT    DEFAULT NULL,
  p_user_id        UUID    DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_item   operations_items%ROWTYPE;
  v_wo_id  UUID;
  v_user   UUID;
BEGIN
  v_user := COALESCE(p_user_id, auth.uid());

  SELECT * INTO v_item
  FROM operations_items
  WHERE id = p_item_id
    AND deleted_at IS NULL
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Operations item not found: %', p_item_id;
  END IF;

  IF v_item.status != 'open' THEN
    RAISE EXCEPTION 'Item is not open (current: %)', v_item.status;
  END IF;

  IF v_item.contact_status != 'confirmed' THEN
    RAISE EXCEPTION 'Item is not confirmed (current: %)', v_item.contact_status;
  END IF;

  INSERT INTO work_orders (
    work_type,
    status,
    site_id,
    description,
    scheduled_date,
    scheduled_time,
    priority,
    notes,
    created_by
  ) VALUES (
    COALESCE(p_work_type, v_item.work_type),
    'scheduled',
    v_item.site_id,
    v_item.description,
    p_scheduled_date,
    p_scheduled_time,
    v_item.priority,
    p_notes,
    v_user
  )
  RETURNING id INTO v_wo_id;

  UPDATE operations_items
  SET
    status         = 'scheduled',
    work_order_id  = v_wo_id,
    scheduled_date = p_scheduled_date,
    scheduled_time = p_scheduled_time,
    work_type      = COALESCE(p_work_type, v_item.work_type),
    updated_at     = now()
  WHERE id = p_item_id;

  RETURN v_wo_id;
END;
$$;

DROP FUNCTION IF EXISTS public.fn_convert_request_to_work_order(UUID, DATE, TIME, TEXT, TEXT, UUID);

DROP FUNCTION IF EXISTS public.fn_boomerang_failed_item(UUID, TEXT, UUID);
CREATE OR REPLACE FUNCTION public.fn_boomerang_failed_item(
  p_item_id        UUID,
  p_failure_reason TEXT    DEFAULT NULL,
  p_user_id        UUID    DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_item operations_items%ROWTYPE;
BEGIN
  SELECT * INTO v_item
  FROM operations_items
  WHERE id = p_item_id
    AND deleted_at IS NULL
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Operations item not found: %', p_item_id;
  END IF;

  IF v_item.status NOT IN ('scheduled', 'failed') THEN
    RAISE EXCEPTION 'Cannot boomerang item from status: %', v_item.status;
  END IF;

  IF v_item.work_order_id IS NOT NULL THEN
    UPDATE work_orders
    SET
      status       = 'cancelled',
      cancelled_at = now(),
      notes        = COALESCE(notes, '') ||
        E'\n[Otomatik iptal: Talep yeniden planlanacak - ' ||
        COALESCE(p_failure_reason, 'Belirtilmedi') || ']'
    WHERE id = v_item.work_order_id
      AND status NOT IN ('completed');
  END IF;

  UPDATE operations_items
  SET
    status           = 'open',
    contact_status   = 'not_contacted',
    work_order_id    = NULL,
    scheduled_date   = NULL,
    scheduled_time   = NULL,
    failure_reason   = p_failure_reason,
    reschedule_count = reschedule_count + 1,
    updated_at       = now()
  WHERE id = p_item_id;

  UPDATE operations_items
  SET priority = 'urgent'
  WHERE id = p_item_id
    AND reschedule_count >= 3
    AND priority != 'urgent';
END;
$$;

DROP FUNCTION IF EXISTS public.fn_boomerang_failed_request(UUID, TEXT, UUID);

CREATE OR REPLACE FUNCTION public.fn_get_operations_stats(
  p_date_from DATE DEFAULT date_trunc('month', CURRENT_DATE)::DATE,
  p_date_to   DATE DEFAULT CURRENT_DATE
)
RETURNS JSON
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSON;
BEGIN
  SELECT json_build_object(
    'pool', (
      SELECT json_build_object(
        'total_open', COUNT(*) FILTER (WHERE status = 'open'),
        'not_contacted', COUNT(*) FILTER (WHERE status = 'open' AND contact_status = 'not_contacted'),
        'no_answer', COUNT(*) FILTER (WHERE status = 'open' AND contact_status = 'no_answer'),
        'confirmed', COUNT(*) FILTER (WHERE status = 'open' AND contact_status = 'confirmed'),
        'by_region', json_build_object(
          'istanbul_europe', COUNT(*) FILTER (WHERE status = 'open' AND region = 'istanbul_europe'),
          'istanbul_anatolia', COUNT(*) FILTER (WHERE status = 'open' AND region = 'istanbul_anatolia'),
          'outside_istanbul', COUNT(*) FILTER (WHERE status = 'open' AND region = 'outside_istanbul')
        )
      )
      FROM operations_items
      WHERE deleted_at IS NULL
    ),
    'period', (
      SELECT json_build_object(
        'scheduled', COUNT(*) FILTER (WHERE status = 'scheduled'),
        'completed', COUNT(*) FILTER (WHERE status = 'completed'),
        'failed', COUNT(*) FILTER (WHERE status = 'failed'),
        'cancelled', COUNT(*) FILTER (WHERE status = 'cancelled'),
        'success_rate', CASE
          WHEN COUNT(*) FILTER (WHERE status IN ('completed', 'failed')) > 0
          THEN ROUND(
            COUNT(*) FILTER (WHERE status = 'completed')::NUMERIC /
            COUNT(*) FILTER (WHERE status IN ('completed', 'failed')) * 100, 1
          )
          ELSE 0
        END,
        'avg_reschedules', COALESCE(
          ROUND(AVG(reschedule_count) FILTER (WHERE status IN ('completed', 'failed')), 1),
          0
        ),
        'total_requests', COUNT(*)
      )
      FROM operations_items
      WHERE deleted_at IS NULL
        AND created_at >= p_date_from
        AND created_at < p_date_to + INTERVAL '1 day'
    )
  ) INTO v_result;

  RETURN v_result;
END;
$$;

COMMIT;
