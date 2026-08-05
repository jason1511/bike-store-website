-- Large local-only seed for catalogue, invoice, and stock-movement testing.
--
-- 36 bike models across all six seeded brands.
-- 194 physical units before any edits or sales.
-- Images are intentionally blank.
-- No stock_movements are inserted, so the movement chart starts clean.
-- Rerunning this file updates the same seed IDs without creating duplicates.

BEGIN TRANSACTION;

WITH seed_data (
  id,
  brand_id,
  brand,
  name,
  battery,
  motor,
  top_speed,
  range_text,
  color_name,
  colors,
  price,
  stock_qty
) AS (
  VALUES
    (
      'seed_large_exotic_alpha', 'brand_exotic', 'Exotic',
      'EXOTIC SEED ALPHA', '48V / 20Ah', '800 WATT MOTOR', '40 KM/H', '55 KM',
      'Merah',
      '[{"name":"Merah","hex":"#e31b23","image":"","stockQty":5},{"name":"Hitam","hex":"#111111","image":"","stockQty":4}]',
      8500000, 9
    ),
    (
      'seed_large_exotic_bravo', 'brand_exotic', 'Exotic',
      'EXOTIC SEED BRAVO', '48V / 12Ah', '500 WATT MOTOR', '35 KM/H', '45 KM',
      'Putih',
      '[{"name":"Putih","hex":"#f1f1f1","image":"","stockQty":3},{"name":"Biru","hex":"#2776c3","image":"","stockQty":2}]',
      7200000, 5
    ),
    (
      'seed_large_exotic_charlie', 'brand_exotic', 'Exotic',
      'EXOTIC SEED CHARLIE', '48V / 12Ah', '500 WATT MOTOR', '32 KM/H', '40 KM',
      'Abu-abu',
      '[{"name":"Abu-abu","hex":"#808080","image":"","stockQty":1},{"name":"Hitam","hex":"#111111","image":"","stockQty":1},{"name":"Merah","hex":"#e31b23","image":"","stockQty":1}]',
      6800000, 3
    ),
    (
      'seed_large_exotic_delta', 'brand_exotic', 'Exotic',
      'EXOTIC SEED DELTA', '60V / 20Ah', '1000 WATT MOTOR', '45 KM/H', '60 KM',
      'Cream',
      '[{"name":"Cream","hex":"#eee1c6","image":"","stockQty":7}]',
      9800000, 7
    ),
    (
      'seed_large_exotic_echo', 'brand_exotic', 'Exotic',
      'EXOTIC SEED ECHO', '48V / 20Ah', '800 WATT MOTOR', '38 KM/H', '52 KM',
      'Hijau',
      '[{"name":"Hijau","hex":"#668f56","image":"","stockQty":0},{"name":"Hitam","hex":"#111111","image":"","stockQty":6}]',
      8250000, 6
    ),
    (
      'seed_large_exotic_zero', 'brand_exotic', 'Exotic',
      'EXOTIC SEED ZERO', '48V / 12Ah', '500 WATT MOTOR', '32 KM/H', '40 KM',
      'Merah',
      '[{"name":"Merah","hex":"#e31b23","image":"","stockQty":0}]',
      6500000, 0
    ),

    (
      'seed_large_pacific_alpha', 'brand_pacific', 'Pacific',
      'PACIFIC SEED ALPHA', '60V / 20Ah', '1000 WATT MOTOR', '45 KM/H', '65 KM',
      'Merah',
      '[{"name":"Merah","hex":"#e31b23","image":"","stockQty":8},{"name":"Hitam","hex":"#111111","image":"","stockQty":4}]',
      10200000, 12
    ),
    (
      'seed_large_pacific_bravo', 'brand_pacific', 'Pacific',
      'PACIFIC SEED BRAVO', '48V / 20Ah', '800 WATT MOTOR', '40 KM/H', '55 KM',
      'Putih',
      '[{"name":"Putih","hex":"#f1f1f1","image":"","stockQty":5}]',
      8750000, 5
    ),
    (
      'seed_large_pacific_charlie', 'brand_pacific', 'Pacific',
      'PACIFIC SEED CHARLIE', '48V / 12Ah', '500 WATT MOTOR', '35 KM/H', '45 KM',
      'Biru',
      '[{"name":"Biru","hex":"#2776c3","image":"","stockQty":2},{"name":"Abu-abu","hex":"#808080","image":"","stockQty":2}]',
      7600000, 4
    ),
    (
      'seed_large_pacific_delta', 'brand_pacific', 'Pacific',
      'PACIFIC SEED DELTA', '48V / 12Ah', '650 WATT MOTOR', '36 KM/H', '48 KM',
      'Cream',
      '[{"name":"Cream","hex":"#eee1c6","image":"","stockQty":3},{"name":"Cokelat","hex":"#76543b","image":"","stockQty":1}]',
      7900000, 4
    ),
    (
      'seed_large_pacific_echo', 'brand_pacific', 'Pacific',
      'PACIFIC SEED ECHO', '60V / 20Ah', '1000 WATT MOTOR', '45 KM/H', '60 KM',
      'Hijau',
      '[{"name":"Hijau","hex":"#668f56","image":"","stockQty":6},{"name":"Hitam","hex":"#111111","image":"","stockQty":2}]',
      9950000, 8
    ),
    (
      'seed_large_pacific_zero', 'brand_pacific', 'Pacific',
      'PACIFIC SEED ZERO', '48V / 12Ah', '500 WATT MOTOR', '32 KM/H', '40 KM',
      'Putih',
      '[{"name":"Putih","hex":"#f1f1f1","image":"","stockQty":0}]',
      6900000, 0
    ),

    (
      'seed_large_larizz_alpha', 'brand_larizz', 'Larizz',
      'LARIZZ SEED ALPHA', '48V / 20Ah', '800 WATT MOTOR', '40 KM/H', '55 KM',
      'Pink',
      '[{"name":"Pink","hex":"#e89ab5","image":"","stockQty":4},{"name":"Putih","hex":"#f1f1f1","image":"","stockQty":4}]',
      8400000, 8
    ),
    (
      'seed_large_larizz_bravo', 'brand_larizz', 'Larizz',
      'LARIZZ SEED BRAVO', '60V / 20Ah', '1000 WATT MOTOR', '45 KM/H', '65 KM',
      'Hitam',
      '[{"name":"Hitam","hex":"#111111","image":"","stockQty":10}]',
      10500000, 10
    ),
    (
      'seed_large_larizz_charlie', 'brand_larizz', 'Larizz',
      'LARIZZ SEED CHARLIE', '48V / 12Ah', '500 WATT MOTOR', '34 KM/H', '43 KM',
      'Merah',
      '[{"name":"Merah","hex":"#e31b23","image":"","stockQty":2},{"name":"Emas","hex":"#c9a227","image":"","stockQty":1}]',
      7150000, 3
    ),
    (
      'seed_large_larizz_delta', 'brand_larizz', 'Larizz',
      'LARIZZ SEED DELTA', '48V / 20Ah', '800 WATT MOTOR', '38 KM/H', '52 KM',
      'Silver',
      '[{"name":"Silver","hex":"#b8b8b8","image":"","stockQty":5},{"name":"Biru","hex":"#2776c3","image":"","stockQty":2}]',
      8650000, 7
    ),
    (
      'seed_large_larizz_echo', 'brand_larizz', 'Larizz',
      'LARIZZ SEED ECHO', '48V / 12Ah', '650 WATT MOTOR', '36 KM/H', '48 KM',
      'Cream',
      '[{"name":"Cream","hex":"#eee1c6","image":"","stockQty":0},{"name":"Cokelat","hex":"#76543b","image":"","stockQty":2}]',
      7750000, 2
    ),
    (
      'seed_large_larizz_zero', 'brand_larizz', 'Larizz',
      'LARIZZ SEED ZERO', '48V / 12Ah', '500 WATT MOTOR', '32 KM/H', '40 KM',
      'Pink',
      '[{"name":"Pink","hex":"#e89ab5","image":"","stockQty":0}]',
      6750000, 0
    ),

    (
      'seed_large_saige_alpha', 'brand_saige', 'Saige',
      'SAIGE SEED ALPHA', '60V / 20Ah', '1000 WATT MOTOR', '45 KM/H', '65 KM',
      'Hijau',
      '[{"name":"Hijau","hex":"#668f56","image":"","stockQty":6},{"name":"Hitam","hex":"#111111","image":"","stockQty":5}]',
      10100000, 11
    ),
    (
      'seed_large_saige_bravo', 'brand_saige', 'Saige',
      'SAIGE SEED BRAVO', '48V / 20Ah', '800 WATT MOTOR', '40 KM/H', '55 KM',
      'Putih',
      '[{"name":"Putih","hex":"#f1f1f1","image":"","stockQty":3},{"name":"Biru","hex":"#2776c3","image":"","stockQty":3}]',
      8500000, 6
    ),
    (
      'seed_large_saige_charlie', 'brand_saige', 'Saige',
      'SAIGE SEED CHARLIE', '48V / 12Ah', '500 WATT MOTOR', '34 KM/H', '43 KM',
      'Merah',
      '[{"name":"Merah","hex":"#e31b23","image":"","stockQty":1},{"name":"Cream","hex":"#eee1c6","image":"","stockQty":1}]',
      7100000, 2
    ),
    (
      'seed_large_saige_delta', 'brand_saige', 'Saige',
      'SAIGE SEED DELTA', '60V / 20Ah', '1200 WATT MOTOR', '48 KM/H', '70 KM',
      'Hitam',
      '[{"name":"Hitam","hex":"#111111","image":"","stockQty":8}]',
      11200000, 8
    ),
    (
      'seed_large_saige_echo', 'brand_saige', 'Saige',
      'SAIGE SEED ECHO', '48V / 12Ah', '650 WATT MOTOR', '36 KM/H', '48 KM',
      'Abu-abu',
      '[{"name":"Abu-abu","hex":"#808080","image":"","stockQty":4},{"name":"Hijau","hex":"#668f56","image":"","stockQty":2}]',
      7800000, 6
    ),
    (
      'seed_large_saige_zero', 'brand_saige', 'Saige',
      'SAIGE SEED ZERO', '48V / 12Ah', '500 WATT MOTOR', '32 KM/H', '40 KM',
      'Hijau',
      '[{"name":"Hijau","hex":"#668f56","image":"","stockQty":0}]',
      6800000, 0
    ),

    (
      'seed_large_uwinfly_alpha', 'brand_uwinfly', 'Uwinfly',
      'UWINFLY SEED ALPHA', '60V / 20Ah', '1000 WATT MOTOR', '45 KM/H', '65 KM',
      'Merah',
      '[{"name":"Merah","hex":"#e31b23","image":"","stockQty":9},{"name":"Hitam","hex":"#111111","image":"","stockQty":3}]',
      10300000, 12
    ),
    (
      'seed_large_uwinfly_bravo', 'brand_uwinfly', 'Uwinfly',
      'UWINFLY SEED BRAVO', '48V / 20Ah', '800 WATT MOTOR', '40 KM/H', '55 KM',
      'Putih',
      '[{"name":"Putih","hex":"#f1f1f1","image":"","stockQty":5}]',
      8550000, 5
    ),
    (
      'seed_large_uwinfly_charlie', 'brand_uwinfly', 'Uwinfly',
      'UWINFLY SEED CHARLIE', '48V / 12Ah', '650 WATT MOTOR', '36 KM/H', '48 KM',
      'Biru',
      '[{"name":"Biru","hex":"#2776c3","image":"","stockQty":2},{"name":"Abu-abu","hex":"#808080","image":"","stockQty":2},{"name":"Merah","hex":"#e31b23","image":"","stockQty":2}]',
      7900000, 6
    ),
    (
      'seed_large_uwinfly_delta', 'brand_uwinfly', 'Uwinfly',
      'UWINFLY SEED DELTA', '60V / 20Ah', '1200 WATT MOTOR', '48 KM/H', '70 KM',
      'Hitam',
      '[{"name":"Hitam","hex":"#111111","image":"","stockQty":7},{"name":"Emas","hex":"#c9a227","image":"","stockQty":1}]',
      11400000, 8
    ),
    (
      'seed_large_uwinfly_echo', 'brand_uwinfly', 'Uwinfly',
      'UWINFLY SEED ECHO', '48V / 12Ah', '500 WATT MOTOR', '34 KM/H', '43 KM',
      'Cream',
      '[{"name":"Cream","hex":"#eee1c6","image":"","stockQty":0},{"name":"Cokelat","hex":"#76543b","image":"","stockQty":4}]',
      7350000, 4
    ),
    (
      'seed_large_uwinfly_zero', 'brand_uwinfly', 'Uwinfly',
      'UWINFLY SEED ZERO', '48V / 12Ah', '500 WATT MOTOR', '32 KM/H', '40 KM',
      'Merah',
      '[{"name":"Merah","hex":"#e31b23","image":"","stockQty":0}]',
      6700000, 0
    ),

    (
      'seed_large_nuv_alpha', 'brand_nuv', 'Nuv',
      'NUV SEED ALPHA', '48V / 20Ah', '800 WATT MOTOR', '40 KM/H', '55 KM',
      'Biru',
      '[{"name":"Biru","hex":"#2776c3","image":"","stockQty":6},{"name":"Putih","hex":"#f1f1f1","image":"","stockQty":4}]',
      8450000, 10
    ),
    (
      'seed_large_nuv_bravo', 'brand_nuv', 'Nuv',
      'NUV SEED BRAVO', '48V / 12Ah', '500 WATT MOTOR', '35 KM/H', '45 KM',
      'Hitam',
      '[{"name":"Hitam","hex":"#111111","image":"","stockQty":3}]',
      7150000, 3
    ),
    (
      'seed_large_nuv_charlie', 'brand_nuv', 'Nuv',
      'NUV SEED CHARLIE', '48V / 12Ah', '500 WATT MOTOR', '32 KM/H', '40 KM',
      'Merah',
      '[{"name":"Merah","hex":"#e31b23","image":"","stockQty":1},{"name":"Putih","hex":"#f1f1f1","image":"","stockQty":0}]',
      6800000, 1
    ),
    (
      'seed_large_nuv_delta', 'brand_nuv', 'Nuv',
      'NUV SEED DELTA', '60V / 20Ah', '1000 WATT MOTOR', '45 KM/H', '65 KM',
      'Hijau',
      '[{"name":"Hijau","hex":"#668f56","image":"","stockQty":5},{"name":"Cream","hex":"#eee1c6","image":"","stockQty":5}]',
      9900000, 10
    ),
    (
      'seed_large_nuv_echo', 'brand_nuv', 'Nuv',
      'NUV SEED ECHO', '48V / 20Ah', '800 WATT MOTOR', '38 KM/H', '52 KM',
      'Abu-abu',
      '[{"name":"Abu-abu","hex":"#808080","image":"","stockQty":7},{"name":"Biru","hex":"#2776c3","image":"","stockQty":2}]',
      8350000, 9
    ),
    (
      'seed_large_nuv_zero', 'brand_nuv', 'Nuv',
      'NUV SEED ZERO', '48V / 12Ah', '500 WATT MOTOR', '32 KM/H', '40 KM',
      'Biru',
      '[{"name":"Biru","hex":"#2776c3","image":"","stockQty":0}]',
      6600000, 0
    )
)
INSERT INTO bikes (
  id,
  brand_id,
  brand,
  name,
  battery,
  motor,
  topSpeed,
  range,
  image,
  alt,
  comfort,
  colorName,
  colors,
  description,
  price,
  featured,
  inStock,
  stockQty
)
SELECT
  id,
  brand_id,
  brand,
  name,
  battery,
  motor,
  top_speed,
  range_text,
  '',
  name,
  'medium',
  color_name,
  colors,
  'Large local seed without images for catalogue, invoice, and stock testing.',
  price,
  0,
  1,
  stock_qty
FROM seed_data
WHERE 1
ON CONFLICT(id) DO UPDATE SET
  brand_id = excluded.brand_id,
  brand = excluded.brand,
  name = excluded.name,
  battery = excluded.battery,
  motor = excluded.motor,
  topSpeed = excluded.topSpeed,
  range = excluded.range,
  image = excluded.image,
  alt = excluded.alt,
  comfort = excluded.comfort,
  colorName = excluded.colorName,
  colors = excluded.colors,
  description = excluded.description,
  price = excluded.price,
  featured = excluded.featured,
  inStock = excluded.inStock,
  stockQty = excluded.stockQty,
  updatedAt = CURRENT_TIMESTAMP;

COMMIT;
