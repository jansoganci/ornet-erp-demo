-- 00162_work_orders_audit_logs.sql
-- Append audit rows for work_orders INSERT/UPDATE via SECURITY DEFINER trigger.
-- Skips logging when only updated_at changes (BEFORE trigger bumps it every UPDATE).
-- RLS: non-admins who can SELECT the work order may SELECT matching audit_logs rows.
-- No historical backfill — events exist only from migration apply onward.

CREATE OR REPLACE FUNCTION public.log_work_order_audit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_action   TEXT;
  v_old_trim JSONB;
  v_new_trim JSONB;
  v_desc     TEXT;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_new_trim := to_jsonb(NEW) - 'updated_at';
    INSERT INTO public.audit_logs (
      table_name,
      record_id,
      action,
      old_values,
      new_values,
      user_id,
      description
    ) VALUES (
      'work_orders',
      NEW.id,
      'insert',
      NULL,
      v_new_trim,
      auth.uid(),
      'work_order.created'
    );
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    v_old_trim := to_jsonb(OLD) - 'updated_at';
    v_new_trim := to_jsonb(NEW) - 'updated_at';
    IF v_old_trim IS NOT DISTINCT FROM v_new_trim THEN
      RETURN NEW;
    END IF;

    v_action := 'update';
    v_desc := 'work_order.updated';

    IF OLD.status IS DISTINCT FROM NEW.status THEN
      v_action := 'status_change';
      v_desc := 'work_order.status_changed';
    END IF;

    IF OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL THEN
      v_desc := 'work_order.soft_deleted';
    END IF;

    INSERT INTO public.audit_logs (
      table_name,
      record_id,
      action,
      old_values,
      new_values,
      user_id,
      description
    ) VALUES (
      'work_orders',
      NEW.id,
      v_action,
      v_old_trim,
      v_new_trim,
      auth.uid(),
      v_desc
    );
    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_work_orders ON public.work_orders;
CREATE TRIGGER trg_audit_work_orders
  AFTER INSERT OR UPDATE ON public.work_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.log_work_order_audit();

COMMENT ON FUNCTION public.log_work_order_audit() IS
  'Writes audit_logs for work_orders; SECURITY DEFINER to bypass audit_logs INSERT RLS.';

-- Allow readers of a work order (same scope as work_orders_select) to read its audit trail.
CREATE POLICY "audit_select_work_orders"
  ON public.audit_logs
  FOR SELECT
  TO authenticated
  USING (
    table_name = 'work_orders'
    AND EXISTS (
      SELECT 1
      FROM public.work_orders wo
      WHERE wo.id = audit_logs.record_id
        AND wo.deleted_at IS NULL
        AND (
          get_my_role() IN ('admin', 'accountant')
          OR auth.uid() = ANY (wo.assigned_to)
          OR wo.created_by = auth.uid()
        )
    )
  );
