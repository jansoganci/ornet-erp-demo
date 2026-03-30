-- Migration: 00171_finance_settings
-- Description: Global finance settings for Tevkifat threshold/rate and Tevkifat flags on proposals/work_orders.

-- 1) Finance settings (single-row config table)
CREATE TABLE IF NOT EXISTS finance_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tevkifat_threshold_try NUMERIC(12,2) NOT NULL DEFAULT 12000,
  tevkifat_rate_numerator INTEGER NOT NULL DEFAULT 9 CHECK (tevkifat_rate_numerator >= 0),
  tevkifat_rate_denominator INTEGER NOT NULL DEFAULT 10 CHECK (tevkifat_rate_denominator > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES profiles(id)
);

-- Enforce singleton row pattern
CREATE UNIQUE INDEX IF NOT EXISTS one_finance_settings_row ON finance_settings ((true));

CREATE OR REPLACE TRIGGER set_finance_settings_updated_at
  BEFORE UPDATE ON finance_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Seed default row
INSERT INTO finance_settings (
  tevkifat_threshold_try,
  tevkifat_rate_numerator,
  tevkifat_rate_denominator
)
SELECT 12000, 9, 10
WHERE NOT EXISTS (SELECT 1 FROM finance_settings);

-- 2) Persist Tevkifat choice on source documents
ALTER TABLE proposals
  ADD COLUMN IF NOT EXISTS has_tevkifat BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE work_orders
  ADD COLUMN IF NOT EXISTS has_tevkifat BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN proposals.has_tevkifat IS 'Whether VAT withholding (tevkifat) is applied on this proposal.';
COMMENT ON COLUMN work_orders.has_tevkifat IS 'Whether VAT withholding (tevkifat) is applied on this work order.';

-- 3) RLS
ALTER TABLE finance_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS finance_settings_select ON finance_settings;
CREATE POLICY finance_settings_select ON finance_settings
  FOR SELECT TO authenticated
  USING (get_my_role() IN ('admin', 'accountant'));

DROP POLICY IF EXISTS finance_settings_insert ON finance_settings;
CREATE POLICY finance_settings_insert ON finance_settings
  FOR INSERT TO authenticated
  WITH CHECK (get_my_role() = 'admin');

DROP POLICY IF EXISTS finance_settings_update ON finance_settings;
CREATE POLICY finance_settings_update ON finance_settings
  FOR UPDATE TO authenticated
  USING (get_my_role() IN ('admin', 'accountant'))
  WITH CHECK (get_my_role() IN ('admin', 'accountant'));

DROP POLICY IF EXISTS finance_settings_delete ON finance_settings;
CREATE POLICY finance_settings_delete ON finance_settings
  FOR DELETE TO authenticated
  USING (get_my_role() = 'admin');

GRANT SELECT, INSERT, UPDATE, DELETE ON finance_settings TO authenticated;
