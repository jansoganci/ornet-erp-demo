-- Restore security_invoker on views recreated without it (default = owner/superuser
-- privileges, bypassing RLS — Supabase linter flags as SECURITY DEFINER risk).
-- Prefer ALTER (no logic/JOIN change) over DROP/CREATE.

BEGIN;

ALTER VIEW public.operations_items_detail SET (security_invoker = true);
COMMENT ON VIEW public.operations_items_detail IS
  'security_invoker=true: each base table RLS applies to the querying role (authenticated).';

ALTER VIEW public.view_finance_health_check SET (security_invoker = true);
COMMENT ON VIEW public.view_finance_health_check IS
  'security_invoker=true: finance/ops audit rows limited by RLS on work_orders, proposals, financial_transactions, etc.';

ALTER VIEW public.subscriptions_detail SET (security_invoker = true);
COMMENT ON VIEW public.subscriptions_detail IS
  'security_invoker=true: subscriptions and joined tables (payment_methods, sim_cards, …) enforce RLS per caller.';

COMMIT;
