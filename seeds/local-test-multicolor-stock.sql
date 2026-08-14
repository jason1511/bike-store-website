-- LOCAL-ONLY STOCK ENTRY SEED.
--
-- Creates two dedicated invoice-test bikes with three colours each:
-- - EXOTIC MULTICOLOR A: 30 units
-- - PACIFIC MULTICOLOR B: 30 units
--
-- It also records one stock_in movement for every colour. Rerunning this
-- file resets this isolated scenario, including its matching sales invoice.
-- Requires migrations through 0017.
-- Do not run this file with --remote.

BEGIN TRANSACTION;

DELETE FROM invoice_items
WHERE invoice_id = 'seed_faktur_multi_invoice_01';

DELETE FROM invoices
WHERE id = 'seed_faktur_multi_invoice_01';

DELETE FROM stock_movements
WHERE id LIKE 'seed_faktur_multi_stock_%'
   OR id LIKE 'seed_faktur_multi_sale_%';

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
  stockQty,
  updatedAt
)
VALUES
  (
    'seed_faktur_item_a',
    'brand_exotic',
    'Exotic',
    'EXOTIC MULTICOLOR A',
    '48V / 20Ah',
    '800 WATT MOTOR',
    '40 KM/H',
    '55 KM',
    '',
    'EXOTIC MULTICOLOR A',
    'medium',
    'Merah',
    '[{"name":"Merah","hex":"#e31b23","image":"","stockQty":12},{"name":"Hitam","hex":"#111111","image":"","stockQty":10},{"name":"Putih","hex":"#f1f1f1","image":"","stockQty":8}]',
    'Seed lokal untuk menguji faktur dengan beberapa warna.',
    8500000,
    0,
    1,
    30,
    '2026-08-14 08:00:00'
  ),
  (
    'seed_faktur_item_b',
    'brand_pacific',
    'Pacific',
    'PACIFIC MULTICOLOR B',
    '60V / 20Ah',
    '1000 WATT MOTOR',
    '45 KM/H',
    '65 KM',
    '',
    'PACIFIC MULTICOLOR B',
    'medium',
    'Biru',
    '[{"name":"Biru","hex":"#2776c3","image":"","stockQty":11},{"name":"Silver","hex":"#b8b8b8","image":"","stockQty":9},{"name":"Cream","hex":"#eee1c6","image":"","stockQty":10}]',
    'Seed lokal untuk menguji faktur dengan beberapa warna.',
    9250000,
    0,
    1,
    30,
    '2026-08-14 08:00:00'
  )
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
  updatedAt = excluded.updatedAt;

INSERT INTO stock_movements (
  id,
  bike_id,
  bike_brand,
  bike_name,
  bike_color_name,
  movement_type,
  quantity_change,
  quantity_before,
  quantity_after,
  note,
  created_by_id,
  created_by_username,
  created_by_role,
  created_at
)
VALUES
  ('seed_faktur_multi_stock_a_red','seed_faktur_item_a','Exotic','EXOTIC MULTICOLOR A','Merah','stock_in',12,0,12,'Seed stok masuk warna Merah','','seed_admin','admin','2026-08-14 08:00:00'),
  ('seed_faktur_multi_stock_a_black','seed_faktur_item_a','Exotic','EXOTIC MULTICOLOR A','Hitam','stock_in',10,0,10,'Seed stok masuk warna Hitam','','seed_admin','admin','2026-08-14 08:00:01'),
  ('seed_faktur_multi_stock_a_white','seed_faktur_item_a','Exotic','EXOTIC MULTICOLOR A','Putih','stock_in',8,0,8,'Seed stok masuk warna Putih','','seed_admin','admin','2026-08-14 08:00:02'),
  ('seed_faktur_multi_stock_b_blue','seed_faktur_item_b','Pacific','PACIFIC MULTICOLOR B','Biru','stock_in',11,0,11,'Seed stok masuk warna Biru','','seed_admin','admin','2026-08-14 08:00:03'),
  ('seed_faktur_multi_stock_b_silver','seed_faktur_item_b','Pacific','PACIFIC MULTICOLOR B','Silver','stock_in',9,0,9,'Seed stok masuk warna Silver','','seed_admin','admin','2026-08-14 08:00:04'),
  ('seed_faktur_multi_stock_b_cream','seed_faktur_item_b','Pacific','PACIFIC MULTICOLOR B','Cream','stock_in',10,0,10,'Seed stok masuk warna Cream','','seed_admin','admin','2026-08-14 08:00:05');

COMMIT;
