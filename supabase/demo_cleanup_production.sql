/*
Production-safe DEMO cleanup script for Supabase SQL Editor

Run order:
1) BLOCK 1 (CHECK ONLY)
2) Inspect output
3) BLOCK 2 (DELETE, transactional)
*/

-- =========================================================
-- BLOCK 1 — CHECK ONLY (NO DATA MODIFICATION)
-- =========================================================
DROP TABLE IF EXISTS tmp_demo_check;
CREATE TEMP TABLE tmp_demo_check (
  table_name text,
  count bigint
);

DO $$
DECLARE
  v_customers_marker_col text;
  v_sites_marker_col text;
  v_customers_id_type text;
  v_sites_id_type text;
  r record;
  v_marker_col text;
  v_customer_col_type text;
  v_site_col_type text;
  v_has_customer_id boolean;
  v_has_site_id boolean;
  v_sql text;
  v_cnt bigint;
BEGIN
  -- Find marker column in customers (name/description/notes candidate)
  SELECT c.column_name INTO v_customers_marker_col
  FROM information_schema.columns c
  WHERE c.table_schema = 'public'
    AND c.table_name = 'customers'
    AND c.data_type IN ('text', 'character varying', 'character')
    AND (c.column_name LIKE '%name%' OR c.column_name LIKE '%description%' OR c.column_name LIKE '%note%')
  ORDER BY CASE
    WHEN c.column_name = 'company_name' THEN 1
    WHEN c.column_name = 'name' THEN 2
    WHEN c.column_name = 'description' THEN 3
    WHEN c.column_name = 'notes' THEN 4
    ELSE 100
  END
  LIMIT 1;

  -- Find marker column in customer_sites
  SELECT c.column_name INTO v_sites_marker_col
  FROM information_schema.columns c
  WHERE c.table_schema = 'public'
    AND c.table_name = 'customer_sites'
    AND c.data_type IN ('text', 'character varying', 'character')
    AND (c.column_name LIKE '%name%' OR c.column_name LIKE '%description%' OR c.column_name LIKE '%note%')
  ORDER BY CASE
    WHEN c.column_name = 'site_name' THEN 1
    WHEN c.column_name = 'name' THEN 2
    WHEN c.column_name = 'description' THEN 3
    WHEN c.column_name = 'notes' THEN 4
    ELSE 100
  END
  LIMIT 1;

  IF v_customers_marker_col IS NULL OR v_sites_marker_col IS NULL THEN
    RAISE EXCEPTION 'Marker columns not found for customers/customer_sites';
  END IF;

  -- Canonical ID types
  SELECT format_type(a.atttypid, a.atttypmod) INTO v_customers_id_type
  FROM pg_attribute a
  JOIN pg_class c ON c.oid = a.attrelid
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname='public' AND c.relname='customers' AND a.attname='id' AND a.attnum > 0 AND NOT a.attisdropped;

  SELECT format_type(a.atttypid, a.atttypmod) INTO v_sites_id_type
  FROM pg_attribute a
  JOIN pg_class c ON c.oid = a.attrelid
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname='public' AND c.relname='customer_sites' AND a.attname='id' AND a.attnum > 0 AND NOT a.attisdropped;

  -- Key tables marker counts (requested)
  FOR r IN
    SELECT x.table_name
    FROM (VALUES
      ('customers'),
      ('customer_sites'),
      ('materials'),
      ('work_orders'),
      ('subscriptions'),
      ('subscription_payments'),
      ('sim_cards'),
      ('proposals'),
      ('proposal_items'),
      ('financial_transactions'),
      ('site_assets')
    ) AS x(table_name)
  LOOP
    SELECT c.column_name INTO v_marker_col
    FROM information_schema.columns c
    WHERE c.table_schema = 'public'
      AND c.table_name = r.table_name
      AND c.data_type IN ('text', 'character varying', 'character')
      AND (c.column_name LIKE '%name%' OR c.column_name LIKE '%description%' OR c.column_name LIKE '%note%' OR c.column_name = 'title')
    ORDER BY CASE
      WHEN c.column_name = 'company_name' THEN 1
      WHEN c.column_name = 'site_name' THEN 1
      WHEN c.column_name = 'name' THEN 2
      WHEN c.column_name = 'title' THEN 3
      WHEN c.column_name = 'description' THEN 4
      WHEN c.column_name = 'notes' THEN 5
      ELSE 100
    END
    LIMIT 1;

    IF v_marker_col IS NOT NULL THEN
      v_sql := format(
        'SELECT count(*) FROM public.%I WHERE %I LIKE ''[DEMO]%%''',
        r.table_name, v_marker_col
      );
      EXECUTE v_sql INTO v_cnt;
      INSERT INTO tmp_demo_check(table_name, count)
      VALUES (r.table_name || ' (marker: ' || v_marker_col || ')', v_cnt);
    ELSE
      INSERT INTO tmp_demo_check(table_name, count)
      VALUES (r.table_name || ' (marker: none)', 0);
    END IF;
  END LOOP;

  -- Any table with customer_id/site_id linked to DEMO customer/site
  FOR r IN
    SELECT t.table_name
    FROM information_schema.tables t
    WHERE t.table_schema = 'public'
      AND t.table_type = 'BASE TABLE'
  LOOP
    SELECT EXISTS (
      SELECT 1
      FROM information_schema.columns c
      WHERE c.table_schema='public' AND c.table_name=r.table_name AND c.column_name='customer_id'
    ) INTO v_has_customer_id;

    SELECT EXISTS (
      SELECT 1
      FROM information_schema.columns c
      WHERE c.table_schema='public' AND c.table_name=r.table_name AND c.column_name='site_id'
    ) INTO v_has_site_id;

    v_customer_col_type := NULL;
    v_site_col_type := NULL;

    IF v_has_customer_id THEN
      SELECT format_type(a.atttypid, a.atttypmod) INTO v_customer_col_type
      FROM pg_attribute a
      JOIN pg_class c ON c.oid = a.attrelid
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname='public' AND c.relname=r.table_name
        AND a.attname='customer_id' AND a.attnum > 0 AND NOT a.attisdropped;
    END IF;

    IF v_has_site_id THEN
      SELECT format_type(a.atttypid, a.atttypmod) INTO v_site_col_type
      FROM pg_attribute a
      JOIN pg_class c ON c.oid = a.attrelid
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname='public' AND c.relname=r.table_name
        AND a.attname='site_id' AND a.attnum > 0 AND NOT a.attisdropped;
    END IF;

    IF v_has_customer_id OR v_has_site_id THEN
      v_sql := format(
        'SELECT count(*) FROM public.%I t WHERE (%s) OR (%s)',
        r.table_name,
        CASE
          WHEN v_has_customer_id AND v_customer_col_type = v_customers_id_type THEN
            format(
              't.customer_id IN (SELECT id FROM public.customers WHERE %I LIKE ''[DEMO]%%'')',
              v_customers_marker_col
            )
          ELSE 'false'
        END,
        CASE
          WHEN v_has_site_id AND v_site_col_type = v_sites_id_type THEN
            format(
              't.site_id IN (SELECT id FROM public.customer_sites WHERE %I LIKE ''[DEMO]%%'')',
              v_sites_marker_col
            )
          ELSE 'false'
        END
      );
      EXECUTE v_sql INTO v_cnt;
      INSERT INTO tmp_demo_check(table_name, count)
      VALUES (r.table_name || ' (linked by customer_id/site_id)', v_cnt);
    END IF;
  END LOOP;
END $$;

SELECT table_name, count
FROM tmp_demo_check
WHERE count > 0
ORDER BY table_name;


-- =========================================================
-- BLOCK 2 — DELETE (RUN ONLY AFTER BLOCK 1)
-- Transactional + reverse FK order
-- =========================================================
BEGIN;

DROP TABLE IF EXISTS tmp_demo_customers;
DROP TABLE IF EXISTS tmp_demo_sites;
CREATE TEMP TABLE tmp_demo_customers (id uuid PRIMARY KEY);
CREATE TEMP TABLE tmp_demo_sites (id uuid PRIMARY KEY);

DO $$
DECLARE
  v_customers_marker_col text;
  v_sites_marker_col text;
  v_sql text;
BEGIN
  SELECT c.column_name INTO v_customers_marker_col
  FROM information_schema.columns c
  WHERE c.table_schema = 'public'
    AND c.table_name = 'customers'
    AND c.data_type IN ('text', 'character varying', 'character')
    AND (c.column_name LIKE '%name%' OR c.column_name LIKE '%description%' OR c.column_name LIKE '%note%')
  ORDER BY CASE
    WHEN c.column_name = 'company_name' THEN 1
    WHEN c.column_name = 'name' THEN 2
    WHEN c.column_name = 'description' THEN 3
    WHEN c.column_name = 'notes' THEN 4
    ELSE 100
  END
  LIMIT 1;

  SELECT c.column_name INTO v_sites_marker_col
  FROM information_schema.columns c
  WHERE c.table_schema = 'public'
    AND c.table_name = 'customer_sites'
    AND c.data_type IN ('text', 'character varying', 'character')
    AND (c.column_name LIKE '%name%' OR c.column_name LIKE '%description%' OR c.column_name LIKE '%note%')
  ORDER BY CASE
    WHEN c.column_name = 'site_name' THEN 1
    WHEN c.column_name = 'name' THEN 2
    WHEN c.column_name = 'description' THEN 3
    WHEN c.column_name = 'notes' THEN 4
    ELSE 100
  END
  LIMIT 1;

  IF v_customers_marker_col IS NULL OR v_sites_marker_col IS NULL THEN
    RAISE EXCEPTION 'Marker columns not found for customers/customer_sites';
  END IF;

  -- Demo customers by prefix
  v_sql := format(
    'INSERT INTO tmp_demo_customers(id)
     SELECT id FROM public.customers WHERE %I LIKE ''[DEMO]%%''',
    v_customers_marker_col
  );
  EXECUTE v_sql;

  -- Demo sites by prefix OR site belongs to demo customer
  v_sql := format(
    'INSERT INTO tmp_demo_sites(id)
     SELECT id
     FROM public.customer_sites
     WHERE %I LIKE ''[DEMO]%%''
        OR customer_id IN (SELECT id FROM tmp_demo_customers)',
    v_sites_marker_col
  );
  EXECUTE v_sql;
END $$;

-- Remove static IP rows linked to demo SIM cards
DELETE FROM public.sim_static_ips
WHERE sim_card_id IN (
  SELECT id
  FROM public.sim_cards
  WHERE customer_id IN (SELECT id FROM tmp_demo_customers)
     OR site_id IN (SELECT id FROM tmp_demo_sites)
);

-- Remove proposal item rows linked to demo proposals
DELETE FROM public.proposal_items
WHERE proposal_id IN (
  SELECT id
  FROM public.proposals
  WHERE site_id IN (SELECT id FROM tmp_demo_sites)
     OR title LIKE '[DEMO]%'
);

-- Remove proposal sections if table exists
DO $$
BEGIN
  IF to_regclass('public.proposal_sections') IS NOT NULL THEN
    EXECUTE '
      DELETE FROM public.proposal_sections
      WHERE proposal_id IN (
        SELECT id
        FROM public.proposals
        WHERE site_id IN (SELECT id FROM tmp_demo_sites)
           OR title LIKE ''[DEMO]%''
      )';
  END IF;
END $$;

-- Remove proposals linked to demo scope
DELETE FROM public.proposals
WHERE site_id IN (SELECT id FROM tmp_demo_sites)
   OR title LIKE '[DEMO]%';

-- Remove work_order_materials linked to demo work orders
DELETE FROM public.work_order_materials
WHERE work_order_id IN (
  SELECT id
  FROM public.work_orders
  WHERE site_id IN (SELECT id FROM tmp_demo_sites)
     OR description LIKE '[DEMO]%'
);

-- Remove financial transactions linked to demo scope
DELETE FROM public.financial_transactions
WHERE customer_id IN (SELECT id FROM tmp_demo_customers)
   OR site_id IN (SELECT id FROM tmp_demo_sites)
   OR work_order_id IN (
     SELECT id
     FROM public.work_orders
     WHERE site_id IN (SELECT id FROM tmp_demo_sites)
        OR description LIKE '[DEMO]%'
   )
   OR proposal_id IN (
     SELECT id
     FROM public.proposals
     WHERE site_id IN (SELECT id FROM tmp_demo_sites)
   )
   OR description LIKE '[DEMO]%';

-- Remove subscription payments linked to demo subscriptions
DELETE FROM public.subscription_payments
WHERE subscription_id IN (
  SELECT id
  FROM public.subscriptions
  WHERE site_id IN (SELECT id FROM tmp_demo_sites)
     OR notes LIKE '[DEMO]%'
)
OR notes LIKE '[DEMO]%';

-- Remove subscriptions linked to demo sites or marker prefix
DELETE FROM public.subscriptions
WHERE site_id IN (SELECT id FROM tmp_demo_sites)
   OR notes LIKE '[DEMO]%';

-- Remove site assets linked to demo customer/site or marker prefix
DELETE FROM public.site_assets
WHERE site_id IN (SELECT id FROM tmp_demo_sites)
   OR equipment_name LIKE '[DEMO]%';

-- Remove SIM cards linked to demo customer/site or marker prefix
DELETE FROM public.sim_cards
WHERE customer_id IN (SELECT id FROM tmp_demo_customers)
   OR site_id IN (SELECT id FROM tmp_demo_sites)
   OR notes LIKE '[DEMO]%';

-- Remove work orders linked to demo sites or marker prefix
DELETE FROM public.work_orders
WHERE site_id IN (SELECT id FROM tmp_demo_sites)
   OR description LIKE '[DEMO]%';

-- Remove demo marker rows in materials
DELETE FROM public.materials
WHERE name LIKE '[DEMO]%'
   OR description LIKE '[DEMO]%';

-- Remove customer sites in demo scope
DELETE FROM public.customer_sites
WHERE id IN (SELECT id FROM tmp_demo_sites);

-- Remove customers in demo scope
DELETE FROM public.customers
WHERE id IN (SELECT id FROM tmp_demo_customers);

COMMIT;

-- Final confirmation check after delete
SELECT 'customers' AS table_name, count(*) AS count
FROM public.customers
WHERE id IN (SELECT id FROM tmp_demo_customers)
UNION ALL
SELECT 'customer_sites', count(*)
FROM public.customer_sites
WHERE id IN (SELECT id FROM tmp_demo_sites)
UNION ALL
SELECT 'work_orders', count(*)
FROM public.work_orders
WHERE site_id IN (SELECT id FROM tmp_demo_sites)
   OR description LIKE '[DEMO]%'
UNION ALL
SELECT 'subscriptions', count(*)
FROM public.subscriptions
WHERE site_id IN (SELECT id FROM tmp_demo_sites)
UNION ALL
SELECT 'subscription_payments', count(*)
FROM public.subscription_payments
WHERE notes LIKE '[DEMO]%'
UNION ALL
SELECT 'sim_cards', count(*)
FROM public.sim_cards
WHERE customer_id IN (SELECT id FROM tmp_demo_customers)
   OR site_id IN (SELECT id FROM tmp_demo_sites)
UNION ALL
SELECT 'proposals', count(*)
FROM public.proposals
WHERE site_id IN (SELECT id FROM tmp_demo_sites)
   OR title LIKE '[DEMO]%'
UNION ALL
SELECT 'proposal_items', count(*)
FROM public.proposal_items
WHERE description LIKE '[DEMO]%'
UNION ALL
SELECT 'financial_transactions', count(*)
FROM public.financial_transactions
WHERE description LIKE '[DEMO]%'
   OR customer_id IN (SELECT id FROM tmp_demo_customers)
   OR site_id IN (SELECT id FROM tmp_demo_sites)
UNION ALL
SELECT 'site_assets', count(*)
FROM public.site_assets
WHERE equipment_name LIKE '[DEMO]%'
   OR site_id IN (SELECT id FROM tmp_demo_sites)
UNION ALL
SELECT 'materials', count(*)
FROM public.materials
WHERE name LIKE '[DEMO]%'
   OR description LIKE '[DEMO]%';
