CREATE TABLE IF NOT EXISTS brands (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,

  logo_path TEXT DEFAULT '',

  theme_main TEXT NOT NULL DEFAULT '#203333',
  theme_second TEXT NOT NULL DEFAULT '#2f4f4f',
  theme_soft TEXT NOT NULL DEFAULT 'rgba(159, 184, 182, 0.18)',
  theme_glow TEXT NOT NULL DEFAULT 'rgba(0, 0, 0, 0.12)',

  is_active INTEGER NOT NULL DEFAULT 1,
  sort_order INTEGER NOT NULL DEFAULT 0,

  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

INSERT OR IGNORE INTO brands (
  id,
  name,
  slug,
  logo_path,
  theme_main,
  theme_second,
  theme_soft,
  theme_glow,
  sort_order
)
VALUES
  (
    'brand_exotic',
    'Exotic',
    'exotic',
    'images/brands/exotic.jpeg',
    '#ed1c24',
    '#111111',
    'rgba(237, 28, 36, 0.18)',
    'rgba(237, 28, 36, 0.18)',
    10
  ),
  (
    'brand_pacific',
    'Pacific',
    'pacific',
    'images/brands/pacific.jpeg',
    '#ed1c24',
    '#111111',
    'rgba(237, 28, 36, 0.18)',
    'rgba(237, 28, 36, 0.18)',
    20
  ),
  (
    'brand_larizz',
    'Larizz',
    'larizz',
    'images/brands/laris.jpeg',
    '#27245f',
    '#e31b23',
    'rgba(39, 36, 95, 0.18)',
    'rgba(39, 36, 95, 0.18)',
    30
  ),
  (
    'brand_saige',
    'Saige',
    'saige',
    'images/brands/saige.jpeg',
    '#66bd45',
    '#2f6f2e',
    'rgba(102, 189, 69, 0.18)',
    'rgba(102, 189, 69, 0.18)',
    40
  ),
  (
    'brand_uwinfly',
    'Uwinfly',
    'uwinfly',
    'images/brands/uwinfly.jpeg',
    '#ed1c24',
    '#b91319',
    'rgba(237, 28, 36, 0.18)',
    'rgba(237, 28, 36, 0.18)',
    50
  ),
  (
    'brand_nuv',
    'Nuv',
    'nuv',
    'images/brands/nuv.jpeg',
    '#27bfc3',
    '#0f777b',
    'rgba(39, 191, 195, 0.2)',
    'rgba(39, 191, 195, 0.18)',
    60
  );

ALTER TABLE bikes ADD COLUMN brand_id TEXT DEFAULT '';

UPDATE bikes
SET brand_id = 'brand_exotic', brand = 'Exotic'
WHERE lower(trim(brand)) = 'exotic';

UPDATE bikes
SET brand_id = 'brand_pacific', brand = 'Pacific'
WHERE lower(trim(brand)) IN ('pacific', 'pasifik', 'pasific', 'pacific bike');

UPDATE bikes
SET brand_id = 'brand_larizz', brand = 'Larizz'
WHERE lower(trim(brand)) IN ('larizz', 'laris');

UPDATE bikes
SET brand_id = 'brand_saige', brand = 'Saige'
WHERE lower(trim(brand)) = 'saige';

UPDATE bikes
SET brand_id = 'brand_uwinfly', brand = 'Uwinfly'
WHERE lower(trim(brand)) = 'uwinfly';

UPDATE bikes
SET brand_id = 'brand_nuv', brand = 'Nuv'
WHERE lower(trim(brand)) = 'nuv';

CREATE INDEX IF NOT EXISTS idx_brands_slug ON brands (slug);
CREATE INDEX IF NOT EXISTS idx_brands_active_sort ON brands (is_active, sort_order);
CREATE INDEX IF NOT EXISTS idx_bikes_brand_id ON bikes (brand_id);