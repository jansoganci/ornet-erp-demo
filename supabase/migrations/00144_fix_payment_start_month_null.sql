-- Migration: 00144_fix_payment_start_month_null
-- Description: Allow NULL in payment_start_month for monthly subscriptions.
--   The previous CHECK (payment_start_month BETWEEN 1 AND 12) rejects NULL,
--   causing 400 errors when creating monthly subscriptions.

-- Drop existing CHECK, add one that allows NULL
ALTER TABLE subscriptions DROP CONSTRAINT IF EXISTS subscriptions_payment_start_month_check;
ALTER TABLE subscriptions ADD CONSTRAINT subscriptions_payment_start_month_check
  CHECK (payment_start_month IS NULL OR (payment_start_month BETWEEN 1 AND 12));
