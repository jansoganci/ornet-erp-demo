-- Migration: 00112_migrate_annual_subscription_type
-- Description: Eliminates legacy subscription_type = 'annual' rows by mapping
--   them to the modern (billing_frequency + subscription_type) model introduced
--   in migration 00022.
--
-- Mapping logic:
--   annual + payment_method_id IS NOT NULL  →  recurring_card  + billing_frequency = yearly
--   annual + payment_method_id IS NULL      →  manual_cash     + billing_frequency = yearly
--
-- After this runs there are no 'annual' rows left. The DB CHECK constraint
-- still permits the value (kept for backward-compat with audit logs / old data
-- references) but no new rows will ever carry it because the Zod schema and
-- form never offer it as an option.

DO $$
DECLARE
  v_count INTEGER;
BEGIN
  -- Count affected rows so we can log it
  SELECT COUNT(*) INTO v_count
  FROM subscriptions
  WHERE subscription_type = 'annual';

  IF v_count > 0 THEN
    UPDATE subscriptions
    SET
      billing_frequency = 'yearly',
      subscription_type = CASE
        WHEN payment_method_id IS NOT NULL THEN 'recurring_card'
        ELSE 'manual_cash'
      END,
      updated_at = NOW()
    WHERE subscription_type = 'annual';

    RAISE NOTICE 'Migrated % annual subscription(s) to modern type + billing_frequency=yearly', v_count;
  ELSE
    RAISE NOTICE 'No annual subscriptions found — nothing to migrate';
  END IF;
END;
$$;
