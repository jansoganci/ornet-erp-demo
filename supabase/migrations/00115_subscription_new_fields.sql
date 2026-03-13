-- Migration: 00115_subscription_new_fields
-- Description: Add alarm center, alarm center account, and subscriber title fields
--   to the subscriptions table.
--   - alarm_center: name of the monitoring center (MERKEZ)
--   - alarm_center_account: account number at that center (ACC.)
--   - subscriber_title: free-text descriptor shown on detail page (ABONE UNVANI)
--
-- The subscriptions_detail view uses SELECT sub.* so these columns are
-- automatically included — no view recreation needed.

ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS alarm_center        text,
  ADD COLUMN IF NOT EXISTS alarm_center_account text,
  ADD COLUMN IF NOT EXISTS subscriber_title    text;
