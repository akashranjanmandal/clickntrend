-- 004: extra hero fields so everything the hero shows is managed from the admin panel.
-- Idempotent (runs on every start). No content is inserted: the hero shows exactly what the admin enters.

ALTER TABLE hero_content ADD COLUMN IF NOT EXISTS eyebrow text;
ALTER TABLE hero_content ADD COLUMN IF NOT EXISTS secondary_cta_text text;
ALTER TABLE hero_content ADD COLUMN IF NOT EXISTS secondary_cta_link text;
ALTER TABLE hero_content ADD COLUMN IF NOT EXISTS highlights text[] NOT NULL DEFAULT '{}';
