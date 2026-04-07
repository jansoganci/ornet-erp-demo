-- Migration: 00206_fix_function_search_paths.sql
-- Supabase linter (function_search_path_mutable): pin search_path on these functions
-- so callers cannot shadow public objects via session search_path. Uses ALTER only —
-- bodies and logic unchanged (see 00078_fix_function_search_path.sql pattern).
--
-- normalize_tr_for_search(text): implementation uses translate() only; CREATE EXTENSION
-- unaccent in 00092 is unused inside this function. SET search_path = public matches
-- how generated columns and views resolve the function; if pg_trgm/unaccent objects
-- were ever called from this function they would need to live in public or be
-- schema-qualified — currently not applicable.

BEGIN;

ALTER FUNCTION public.normalize_tr_for_search(text)
  SET search_path = public;

ALTER FUNCTION public.get_monthly_revenue_expense(integer)
  SET search_path = public;

ALTER FUNCTION public.get_overdue_subscription_payments()
  SET search_path = public;

ALTER FUNCTION public.set_proposal_completed_at()
  SET search_path = public;

ALTER FUNCTION public.fn_revert_write_off(uuid)
  SET search_path = public;

ALTER FUNCTION public.generate_subscription_payments(uuid, date)
  SET search_path = public;

ALTER FUNCTION public.extend_active_subscription_payments()
  SET search_path = public;

COMMIT;
