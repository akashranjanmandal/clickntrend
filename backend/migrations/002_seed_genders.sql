-- 002: default genders for the "For: Men / Women / Unisex" filters.
-- Only seeds an empty table, so admin edits/deletions are never undone on restart.

INSERT INTO genders (name, display_name, icon, display_order, is_active)
SELECT v.name, v.display_name, v.icon, v.display_order, true
FROM (VALUES
  ('men',    'Men',    '👨', 1),
  ('women',  'Women',  '👩', 2),
  ('unisex', 'Unisex', '🧑‍🤝‍🧑', 3)
) AS v(name, display_name, icon, display_order)
WHERE NOT EXISTS (SELECT 1 FROM genders);
