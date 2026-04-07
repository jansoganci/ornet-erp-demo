-- Migration: 00205_fix_rls_policies.sql
-- Supabase linter: remove dangerous anon INSERT/UPDATE/DELETE policies (unrestricted
-- WITH CHECK), tighten sim_static_ips UPDATE to admin+accountant on existing rows,
-- and restrict task creation to admin, accountant, and supervisor (not field_worker).
--
-- Import staging tables (customer_name_mappings, import_batches, imported_proposals,
-- imported_subscriptions, proposal_assets, spm_active_subscriptions, spm_sites):
--   No usage found under src/ or in repo migrations. Policies are dropped if those
--   relations exist; imports should use authenticated users or service_role, not anon.

BEGIN;

-- ---------------------------------------------------------------------------
-- 1) Drop permissive anon policies (only if the table exists on this database)
-- ---------------------------------------------------------------------------
DO $drop_anon_policies$
BEGIN
  IF to_regclass('public.customer_name_mappings') IS NOT NULL THEN
    DROP POLICY IF EXISTS "Anon mappings ekleyebilir" ON public.customer_name_mappings;
    DROP POLICY IF EXISTS "Anon mappings guncelleyebilir" ON public.customer_name_mappings;
    DROP POLICY IF EXISTS "Anon mappings silebilir" ON public.customer_name_mappings;
  END IF;

  IF to_regclass('public.import_batches') IS NOT NULL THEN
    DROP POLICY IF EXISTS "Anon kullanicilar batch ekleyebilir" ON public.import_batches;
    DROP POLICY IF EXISTS "Anon kullanicilar batch guncelleyebilir" ON public.import_batches;
    DROP POLICY IF EXISTS "Anon kullanicilar batch silebilir" ON public.import_batches;
  END IF;

  IF to_regclass('public.imported_proposals') IS NOT NULL THEN
    DROP POLICY IF EXISTS "Anon proposals ekleyebilir" ON public.imported_proposals;
    DROP POLICY IF EXISTS "Anon proposals guncelleyebilir" ON public.imported_proposals;
    DROP POLICY IF EXISTS "Anon proposals silebilir" ON public.imported_proposals;
  END IF;

  IF to_regclass('public.imported_subscriptions') IS NOT NULL THEN
    DROP POLICY IF EXISTS "Anon subscriptions ekleyebilir" ON public.imported_subscriptions;
    DROP POLICY IF EXISTS "Anon subscriptions guncelleyebilir" ON public.imported_subscriptions;
    DROP POLICY IF EXISTS "Anon subscriptions silebilir" ON public.imported_subscriptions;
  END IF;

  IF to_regclass('public.proposal_assets') IS NOT NULL THEN
    DROP POLICY IF EXISTS "Anon users can insert proposal_assets" ON public.proposal_assets;
  END IF;

  IF to_regclass('public.spm_active_subscriptions') IS NOT NULL THEN
    DROP POLICY IF EXISTS "Anon users can insert active_subscriptions" ON public.spm_active_subscriptions;
  END IF;

  IF to_regclass('public.spm_sites') IS NOT NULL THEN
    DROP POLICY IF EXISTS "Anon users can insert sites" ON public.spm_sites;
    DROP POLICY IF EXISTS "Anon users can update sites" ON public.spm_sites;
  END IF;
END
$drop_anon_policies$;

-- ---------------------------------------------------------------------------
-- 2) sim_static_ips: UPDATE must not bypass role gate on existing row (USING)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "sim_static_ips_update" ON public.sim_static_ips;

CREATE POLICY "sim_static_ips_update"
  ON public.sim_static_ips
  FOR UPDATE
  TO authenticated
  USING (get_my_role() IN ('admin', 'accountant'))
  WITH CHECK (get_my_role() IN ('admin', 'accountant'));

-- ---------------------------------------------------------------------------
-- 3) tasks: INSERT limited to admin / accountant / supervisor (not field_worker)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS tasks_insert ON public.tasks;

CREATE POLICY tasks_insert
  ON public.tasks
  FOR INSERT
  TO authenticated
  WITH CHECK (get_my_role() IN ('admin', 'accountant', 'supervisor'));

COMMIT;
