-- 003: payment settings controlled from the admin panel (Settings tab).
-- COD starts switched OFF. Only inserted once, so admin changes are kept.

INSERT INTO site_settings (key, value, updated_at)
VALUES ('payment', '{"cod_enabled": false, "cod_charge": 49}'::jsonb, NOW())
ON CONFLICT (key) DO NOTHING;
