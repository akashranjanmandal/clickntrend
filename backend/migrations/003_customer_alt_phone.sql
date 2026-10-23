-- 003: optional alternative contact number captured at checkout.
-- Idempotent: safe to run on every backend start (see src/utils/migrate.ts).

ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_alt_phone text;
