-- LOCAL-ONLY MULTICOLOUR SALES SEED.
--
-- Requires seeds/local-test-multicolor-stock.sql to be run first.
-- Creates one invoice containing:
-- - Item A: 6 units across Merah, Hitam, and Putih
-- - Item B: 7 units across Biru, Silver, and Cream
-- - Grand total: Rp 115.750.000
--
-- Rerunning this file replaces the invoice and restores the same final stock.
-- Requires migrations through 0017.
-- Do not run this file with --remote.

BEGIN TRANSACTION;

DELETE FROM invoice_items
WHERE invoice_id = 'seed_faktur_multi_invoice_01';

DELETE FROM invoices
WHERE id = 'seed_faktur_multi_invoice_01';

DELETE FROM stock_movements
WHERE id LIKE 'seed_faktur_multi_sale_%';

-- Restore the known opening balance before recreating the sale.
UPDATE bikes
SET
  colors = '[{"name":"Merah","hex":"#e31b23","image":"","stockQty":12},{"name":"Hitam","hex":"#111111","image":"","stockQty":10},{"name":"Putih","hex":"#f1f1f1","image":"","stockQty":8}]',
  stockQty = 30,
  inStock = 1,
  updatedAt = '2026-08-14 09:00:00'
WHERE id = 'seed_faktur_item_a';

UPDATE bikes
SET
  colors = '[{"name":"Biru","hex":"#2776c3","image":"","stockQty":11},{"name":"Silver","hex":"#b8b8b8","image":"","stockQty":9},{"name":"Cream","hex":"#eee1c6","image":"","stockQty":10}]',
  stockQty = 30,
  inStock = 1,
  updatedAt = '2026-08-14 09:00:00'
WHERE id = 'seed_faktur_item_b';

INSERT INTO invoices (
  id,
  invoice_number,
  customer_name,
  customer_phone,
  customer_address,
  bike_id,
  bike_brand,
  bike_name,
  bike_color_name,
  bike_color_hex,
  bike_color_image,
  quantity,
  unit_price,
  total_price,
  payment_method,
  payment_bank,
  notes,
  created_by_id,
  created_by_username,
  created_by_role,
  status,
  void_reason,
  voided_at,
  voided_by_id,
  voided_by_username,
  voided_by_role,
  created_at
)
VALUES (
  'seed_faktur_multi_invoice_01',
  'INV-20260814-001',
  'PT Pelangi Nusantara',
  '081234567890',
  'Jl. Merdeka No. 25, Bandung',
  'seed_faktur_item_a',
  'Exotic',
  'EXOTIC MULTICOLOR A',
  'Merah',
  '#e31b23',
  '',
  13,
  0,
  115750000,
  'Bank Transfer',
  'BCA',
  'Pembelian dua model dengan tiga warna per model.',
  '',
  'seed_admin',
  'admin',
  'active',
  '',
  NULL,
  '',
  '',
  '',
  '2026-08-14 09:15:00'
);

INSERT INTO invoice_items (
  id,
  invoice_id,
  bike_id,
  bike_brand,
  bike_name,
  bike_color_name,
  bike_color_hex,
  bike_color_image,
  frame_numbers,
  quantity,
  unit_price,
  line_total,
  created_at
)
VALUES
  ('seed_faktur_multi_item_a_red','seed_faktur_multi_invoice_01','seed_faktur_item_a','Exotic','EXOTIC MULTICOLOR A','Merah','#e31b23','','["A-MERAH-001","A-MERAH-002"]',2,8500000,17000000,'2026-08-14 09:15:00'),
  ('seed_faktur_multi_item_a_black','seed_faktur_multi_invoice_01','seed_faktur_item_a','Exotic','EXOTIC MULTICOLOR A','Hitam','#111111','','["A-HITAM-001","A-HITAM-002","A-HITAM-003"]',3,8500000,25500000,'2026-08-14 09:15:01'),
  ('seed_faktur_multi_item_a_white','seed_faktur_multi_invoice_01','seed_faktur_item_a','Exotic','EXOTIC MULTICOLOR A','Putih','#f1f1f1','','["A-PUTIH-001"]',1,8500000,8500000,'2026-08-14 09:15:02'),
  ('seed_faktur_multi_item_b_blue','seed_faktur_multi_invoice_01','seed_faktur_item_b','Pacific','PACIFIC MULTICOLOR B','Biru','#2776c3','','["B-BIRU-001","B-BIRU-002"]',2,9250000,18500000,'2026-08-14 09:15:03'),
  ('seed_faktur_multi_item_b_silver','seed_faktur_multi_invoice_01','seed_faktur_item_b','Pacific','PACIFIC MULTICOLOR B','Silver','#b8b8b8','','["B-SILVER-001","B-SILVER-002"]',2,9250000,18500000,'2026-08-14 09:15:04'),
  ('seed_faktur_multi_item_b_cream','seed_faktur_multi_invoice_01','seed_faktur_item_b','Pacific','PACIFIC MULTICOLOR B','Cream','#eee1c6','','["B-CREAM-001","B-CREAM-002","B-CREAM-003"]',3,9250000,27750000,'2026-08-14 09:15:05');

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
  ('seed_faktur_multi_sale_a_red','seed_faktur_item_a','Exotic','EXOTIC MULTICOLOR A','Merah','sale',-2,12,10,'Seed penjualan INV-20260814-001','','seed_admin','admin','2026-08-14 09:15:00'),
  ('seed_faktur_multi_sale_a_black','seed_faktur_item_a','Exotic','EXOTIC MULTICOLOR A','Hitam','sale',-3,10,7,'Seed penjualan INV-20260814-001','','seed_admin','admin','2026-08-14 09:15:01'),
  ('seed_faktur_multi_sale_a_white','seed_faktur_item_a','Exotic','EXOTIC MULTICOLOR A','Putih','sale',-1,8,7,'Seed penjualan INV-20260814-001','','seed_admin','admin','2026-08-14 09:15:02'),
  ('seed_faktur_multi_sale_b_blue','seed_faktur_item_b','Pacific','PACIFIC MULTICOLOR B','Biru','sale',-2,11,9,'Seed penjualan INV-20260814-001','','seed_admin','admin','2026-08-14 09:15:03'),
  ('seed_faktur_multi_sale_b_silver','seed_faktur_item_b','Pacific','PACIFIC MULTICOLOR B','Silver','sale',-2,9,7,'Seed penjualan INV-20260814-001','','seed_admin','admin','2026-08-14 09:15:04'),
  ('seed_faktur_multi_sale_b_cream','seed_faktur_item_b','Pacific','PACIFIC MULTICOLOR B','Cream','sale',-3,10,7,'Seed penjualan INV-20260814-001','','seed_admin','admin','2026-08-14 09:15:05');

UPDATE bikes
SET
  colors = '[{"name":"Merah","hex":"#e31b23","image":"","stockQty":10},{"name":"Hitam","hex":"#111111","image":"","stockQty":7},{"name":"Putih","hex":"#f1f1f1","image":"","stockQty":7}]',
  stockQty = 24,
  inStock = 1,
  updatedAt = '2026-08-14 09:15:05'
WHERE id = 'seed_faktur_item_a';

UPDATE bikes
SET
  colors = '[{"name":"Biru","hex":"#2776c3","image":"","stockQty":9},{"name":"Silver","hex":"#b8b8b8","image":"","stockQty":7},{"name":"Cream","hex":"#eee1c6","image":"","stockQty":7}]',
  stockQty = 23,
  inStock = 1,
  updatedAt = '2026-08-14 09:15:05'
WHERE id = 'seed_faktur_item_b';

INSERT INTO invoice_sequences (
  date_code,
  last_sequence,
  updated_at
)
VALUES ('20260814', 1, CURRENT_TIMESTAMP)
ON CONFLICT(date_code) DO UPDATE SET
  last_sequence = MAX(invoice_sequences.last_sequence, excluded.last_sequence),
  updated_at = CURRENT_TIMESTAMP;

COMMIT;
