-- Replace client-side MAX aggregation with a server-side GROUP BY.
-- fetchTemplateLastGenerated() was fetching every financial_transactions row
-- that had a recurring_template_id and doing the max-date reduction in JS.
-- This function returns exactly one row per template (the latest date),
-- keeping the transferred payload permanently bounded by template count.

CREATE OR REPLACE FUNCTION fn_last_generated_per_template()
RETURNS TABLE(recurring_template_id uuid, last_date date)
LANGUAGE sql
STABLE
AS $$
  SELECT recurring_template_id, MAX(transaction_date)::date
  FROM financial_transactions
  WHERE recurring_template_id IS NOT NULL
  GROUP BY recurring_template_id;
$$;

