-- 00104_sim_cards_rls_use_get_my_role.sql
-- Use get_my_role() for sim_cards RLS so admin/accountant can soft-delete reliably.
-- The previous policy used EXISTS (SELECT FROM profiles), which can fail in some
-- contexts; get_my_role() is SECURITY DEFINER and matches other tables (site_assets, proposals, etc.).

DROP POLICY IF EXISTS "Admins can manage sim_cards" ON sim_cards;
CREATE POLICY "Admins can manage sim_cards"
  ON sim_cards FOR ALL
  TO authenticated
  USING (
    deleted_at IS NULL
    AND get_my_role() IN ('admin', 'accountant')
  )
  WITH CHECK (
    get_my_role() IN ('admin', 'accountant')
  );
