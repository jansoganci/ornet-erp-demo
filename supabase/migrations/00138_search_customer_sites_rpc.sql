-- Migration: 00138_search_customer_sites_rpc
-- Description: View + RPC for customer sites search by account_no, site_name, company_name.
-- Fixes PostgREST 400 when mixing root and embedded table columns in or() filter.

-- ============================================================================
-- 1. View: customer_sites_list
-- Joins customer_sites with customers, exposes all search columns on same row.
-- ============================================================================
CREATE OR REPLACE VIEW customer_sites_list AS
SELECT
  cs.*,
  c.company_name_search,
  json_build_object(
    'company_name', c.company_name,
    'subscriber_title', c.subscriber_title
  ) AS customers
FROM customer_sites cs
JOIN customers c ON cs.customer_id = c.id
WHERE cs.deleted_at IS NULL
  AND c.deleted_at IS NULL;

ALTER VIEW customer_sites_list SET (security_invoker = true);
GRANT SELECT ON customer_sites_list TO authenticated;

-- ============================================================================
-- 2. RPC: search_customer_sites
-- Searches by account_no, site_name, company_name (Turkish-normalized).
-- ============================================================================
CREATE OR REPLACE FUNCTION public.search_customer_sites(search_query TEXT)
RETURNS SETOF customer_sites_list
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  norm_query text;
BEGIN
  norm_query := normalize_tr_for_search(search_query);
  RETURN QUERY
  SELECT * FROM customer_sites_list
  WHERE account_no_search ILIKE '%' || norm_query || '%'
     OR site_name_search ILIKE '%' || norm_query || '%'
     OR company_name_search ILIKE '%' || norm_query || '%'
  ORDER BY created_at DESC;
END;
$$;

-- ============================================================================
-- 3. Grant EXECUTE
-- ============================================================================
GRANT EXECUTE ON FUNCTION public.search_customer_sites(text) TO authenticated;
