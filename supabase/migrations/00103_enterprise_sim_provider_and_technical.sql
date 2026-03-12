-- 00103_enterprise_sim_provider_and_technical.sql
-- Enterprise SIM card: provider_companies table and technical fields on sim_cards.
-- No legacy support; new imports require HAT NO, ANA ŞİRKET, AYLIK MALIYET, AYLIK SATIS FIYAT.

-- =============================================================================
-- 1. PROVIDER COMPANIES TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS provider_companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Updated_at trigger (reuse existing function from sim_cards)
CREATE TRIGGER update_provider_companies_updated_at
  BEFORE UPDATE ON provider_companies
  FOR EACH ROW
  EXECUTE PROCEDURE update_updated_at_column();

-- RLS: authenticated read (dropdowns/filters); admin/accountant manage
ALTER TABLE provider_companies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read provider_companies"
  ON provider_companies FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage provider_companies"
  ON provider_companies FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'accountant')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'accountant')
    )
  );

-- =============================================================================
-- 2. SIM_CARDS: ADD PROVIDER AND TECHNICAL COLUMNS
-- =============================================================================

ALTER TABLE sim_cards
  ADD COLUMN IF NOT EXISTS provider_company_id UUID REFERENCES provider_companies(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS imsi TEXT,
  ADD COLUMN IF NOT EXISTS gprs_serial_no TEXT,
  ADD COLUMN IF NOT EXISTS account_no TEXT;

-- Index for list filter by provider
CREATE INDEX IF NOT EXISTS idx_sim_cards_provider_company_id
  ON sim_cards (provider_company_id)
  WHERE deleted_at IS NULL;

-- Partial unique index on imsi (non-deleted, non-null only)
CREATE UNIQUE INDEX IF NOT EXISTS idx_sim_cards_imsi_active
  ON sim_cards (imsi)
  WHERE deleted_at IS NULL AND imsi IS NOT NULL AND imsi <> '';
