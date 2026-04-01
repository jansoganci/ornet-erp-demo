-- Migration: 00175_operations_stats_outcomes
-- Description: Add outcome_type breakdown to fn_get_operations_stats

BEGIN;

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
      FROM public.operations_items
      WHERE deleted_at IS NULL
    ),
    'period', (
      SELECT json_build_object(
        'scheduled', COUNT(*) FILTER (WHERE status = 'scheduled'),
        'completed', COUNT(*) FILTER (WHERE status = 'completed'),
        'failed', COUNT(*) FILTER (WHERE status = 'failed'),
        'cancelled', COUNT(*) FILTER (WHERE status = 'closed' AND outcome_type = 'cancelled'),
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
        'total_requests', COUNT(*),
        'outcomes', json_build_object(
          'work_order', COUNT(*) FILTER (WHERE status = 'closed' AND outcome_type = 'work_order'),
          'proposal', COUNT(*) FILTER (WHERE status = 'closed' AND outcome_type = 'proposal'),
          'remote_resolved', COUNT(*) FILTER (WHERE status = 'closed' AND outcome_type = 'remote_resolved'),
          'closed_no_action', COUNT(*) FILTER (WHERE status = 'closed' AND outcome_type = 'closed_no_action'),
          'cancelled', COUNT(*) FILTER (WHERE status = 'closed' AND outcome_type = 'cancelled')
        )
      )
      FROM public.operations_items
      WHERE deleted_at IS NULL
        AND created_at >= p_date_from
        AND created_at < p_date_to + INTERVAL '1 day'
    )
  ) INTO v_result;

  RETURN v_result;
END;
$$;

COMMIT;
