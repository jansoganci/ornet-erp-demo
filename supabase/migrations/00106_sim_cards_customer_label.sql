-- 00106_sim_cards_customer_label.sql
-- Add a plain-text customer label to sim_cards.
-- Stores the subscriber name from Excel imports directly as text.
-- The existing customer_id FK is kept for formal ERP customer links.

ALTER TABLE sim_cards ADD COLUMN IF NOT EXISTS customer_label TEXT;
