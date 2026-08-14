-- LARGE LOCAL-ONLY MULTICOLOUR SALES SEED.
--
-- Run seeds/local-test-multicolor-stock-large.sql first.
-- Creates 12 invoices. Every invoice contains two bike models and all three
-- colours of each model (72 invoice-item colour lines in total).
-- Quantities vary from 1 to 3 units per colour and include frame numbers.
-- Rerunning this file produces the same invoices and final stock balances.
-- Requires migrations through 0017. Do not run with --remote.

BEGIN TRANSACTION;

DELETE FROM invoice_items
WHERE invoice_id LIKE 'seed_faktur_large_invoice_%';

DELETE FROM invoices
WHERE id LIKE 'seed_faktur_large_invoice_%';

DELETE FROM stock_movements
WHERE id LIKE 'seed_faktur_large_sale_%';

-- Restore every model to its opening balance before rebuilding the sales.
UPDATE bikes SET colors = '[{"name":"Merah","hex":"#e31b23","image":"","stockQty":30},{"name":"Hitam","hex":"#111111","image":"","stockQty":30},{"name":"Putih","hex":"#f1f1f1","image":"","stockQty":30}]', stockQty = 90, inStock = 1 WHERE id = 'seed_faktur_large_bike_1';
UPDATE bikes SET colors = '[{"name":"Biru","hex":"#2776c3","image":"","stockQty":30},{"name":"Silver","hex":"#b8b8b8","image":"","stockQty":30},{"name":"Cream","hex":"#eee1c6","image":"","stockQty":30}]', stockQty = 90, inStock = 1 WHERE id = 'seed_faktur_large_bike_2';
UPDATE bikes SET colors = '[{"name":"Pink","hex":"#e89ab5","image":"","stockQty":30},{"name":"Putih","hex":"#f1f1f1","image":"","stockQty":30},{"name":"Cokelat","hex":"#76543b","image":"","stockQty":30}]', stockQty = 90, inStock = 1 WHERE id = 'seed_faktur_large_bike_3';
UPDATE bikes SET colors = '[{"name":"Hijau","hex":"#668f56","image":"","stockQty":30},{"name":"Hitam","hex":"#111111","image":"","stockQty":30},{"name":"Cream","hex":"#eee1c6","image":"","stockQty":30}]', stockQty = 90, inStock = 1 WHERE id = 'seed_faktur_large_bike_4';
UPDATE bikes SET colors = '[{"name":"Merah","hex":"#e31b23","image":"","stockQty":30},{"name":"Biru","hex":"#2776c3","image":"","stockQty":30},{"name":"Abu-abu","hex":"#808080","image":"","stockQty":30}]', stockQty = 90, inStock = 1 WHERE id = 'seed_faktur_large_bike_5';
UPDATE bikes SET colors = '[{"name":"Biru","hex":"#2776c3","image":"","stockQty":30},{"name":"Cream","hex":"#eee1c6","image":"","stockQty":30},{"name":"Hitam","hex":"#111111","image":"","stockQty":30}]', stockQty = 90, inStock = 1 WHERE id = 'seed_faktur_large_bike_6';

INSERT INTO invoices (
  id, invoice_number,
  customer_name, customer_phone, customer_address,
  bike_id, bike_brand, bike_name,
  bike_color_name, bike_color_hex, bike_color_image,
  quantity, unit_price, total_price,
  payment_method, payment_bank, notes,
  created_by_id, created_by_username, created_by_role,
  status, void_reason, voided_at,
  voided_by_id, voided_by_username, voided_by_role,
  created_at
)
VALUES
  ('seed_faktur_large_invoice_01','INV-SEED-LARGE-001','PT Pelangi Nusantara','081210000001','Bandung','','','','','','',0,0,0,'Bank Transfer','BCA','Dua model, masing-masing tiga warna.','','seed_admin','admin','active','',NULL,'','','','2026-08-11 09:00:00'),
  ('seed_faktur_large_invoice_02','INV-SEED-LARGE-002','Koperasi Maju Jaya','081210000002','Cimahi','','','','','','',0,0,0,'Cash','','Dua model, masing-masing tiga warna.','','seed_admin','admin','active','',NULL,'','','','2026-08-11 11:00:00'),
  ('seed_faktur_large_invoice_03','INV-SEED-LARGE-003','CV Angkutan Sejahtera','081210000003','Garut','','','','','','',0,0,0,'Bank Transfer','BRI','Dua model, masing-masing tiga warna.','','seed_admin','admin','active','',NULL,'','','','2026-08-11 14:00:00'),
  ('seed_faktur_large_invoice_04','INV-SEED-LARGE-004','Toko Sumber Rejeki','081210000004','Sumedang','','','','','','',0,0,0,'Bank Transfer','BNI','Dua model, masing-masing tiga warna.','','seed_admin','admin','active','',NULL,'','','','2026-08-12 09:30:00'),
  ('seed_faktur_large_invoice_05','INV-SEED-LARGE-005','Yayasan Harapan Baru','081210000005','Tasikmalaya','','','','','','',0,0,0,'Cash','','Dua model, masing-masing tiga warna.','','seed_admin','admin','active','',NULL,'','','','2026-08-12 11:30:00'),
  ('seed_faktur_large_invoice_06','INV-SEED-LARGE-006','PT Kurir Cepat','081210000006','Bandung','','','','','','',0,0,0,'Bank Transfer','Mandiri','Dua model, masing-masing tiga warna.','','seed_admin','admin','active','',NULL,'','','','2026-08-12 15:00:00'),
  ('seed_faktur_large_invoice_07','INV-SEED-LARGE-007','Koperasi Karyawan Abadi','081210000007','Cianjur','','','','','','',0,0,0,'Bank Transfer','BCA','Dua model, masing-masing tiga warna.','','seed_admin','admin','active','',NULL,'','','','2026-08-13 08:45:00'),
  ('seed_faktur_large_invoice_08','INV-SEED-LARGE-008','CV Mandiri Elektrik','081210000008','Subang','','','','','','',0,0,0,'Cash','','Dua model, masing-masing tiga warna.','','seed_admin','admin','active','',NULL,'','','','2026-08-13 10:45:00'),
  ('seed_faktur_large_invoice_09','INV-SEED-LARGE-009','PT Niaga Sentosa','081210000009','Cirebon','','','','','','',0,0,0,'Bank Transfer','BRI','Dua model, masing-masing tiga warna.','','seed_admin','admin','active','',NULL,'','','','2026-08-13 14:15:00'),
  ('seed_faktur_large_invoice_10','INV-SEED-LARGE-010','Bengkel Mitra Utama','081210000010','Bandung','','','','','','',0,0,0,'Bank Transfer','BNI','Dua model, masing-masing tiga warna.','','seed_admin','admin','active','',NULL,'','','','2026-08-14 09:15:00'),
  ('seed_faktur_large_invoice_11','INV-SEED-LARGE-011','UD Cahaya Motor','081210000011','Lumajang','','','','','','',0,0,0,'Cash','','Dua model, masing-masing tiga warna.','','seed_admin','admin','active','',NULL,'','','','2026-08-14 12:15:00'),
  ('seed_faktur_large_invoice_12','INV-SEED-LARGE-012','PT Armada Bersama','081210000012','Surabaya','','','','','','',0,0,0,'Bank Transfer','Mandiri','Dua model, masing-masing tiga warna.','','seed_admin','admin','active','',NULL,'','','','2026-08-14 16:15:00');

DROP TABLE IF EXISTS seed_faktur_large_lines;

CREATE TABLE seed_faktur_large_lines (
  item_id TEXT PRIMARY KEY,
  invoice_id TEXT NOT NULL,
  bike_id TEXT NOT NULL,
  bike_brand TEXT NOT NULL,
  bike_name TEXT NOT NULL,
  colour TEXT NOT NULL,
  colour_hex TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  unit_price INTEGER NOT NULL,
  line_total INTEGER NOT NULL,
  frame_numbers TEXT NOT NULL,
  created_at TEXT NOT NULL
);

WITH RECURSIVE
  invoice_numbers(invoice_index) AS (
    SELECT 1
    UNION ALL
    SELECT invoice_index + 1
    FROM invoice_numbers
    WHERE invoice_index < 12
  ),
  colour_numbers(colour_index) AS (
    VALUES (1), (2), (3)
  ),
  models(
    model_index, bike_id, brand, bike_name, price,
    colour_1, hex_1, colour_2, hex_2, colour_3, hex_3
  ) AS (
    VALUES
      (1,'seed_faktur_large_bike_1','Exotic','EXOTIC MULTICOLOR ALPHA',8500000,'Merah','#e31b23','Hitam','#111111','Putih','#f1f1f1'),
      (2,'seed_faktur_large_bike_2','Pacific','PACIFIC MULTICOLOR BRAVO',9250000,'Biru','#2776c3','Silver','#b8b8b8','Cream','#eee1c6'),
      (3,'seed_faktur_large_bike_3','Larizz','LARIZZ MULTICOLOR CHARLIE',8800000,'Pink','#e89ab5','Putih','#f1f1f1','Cokelat','#76543b'),
      (4,'seed_faktur_large_bike_4','Saige','SAIGE MULTICOLOR DELTA',10100000,'Hijau','#668f56','Hitam','#111111','Cream','#eee1c6'),
      (5,'seed_faktur_large_bike_5','Uwinfly','UWINFLY MULTICOLOR ECHO',8950000,'Merah','#e31b23','Biru','#2776c3','Abu-abu','#808080'),
      (6,'seed_faktur_large_bike_6','Nuv','NUV MULTICOLOR FOXTROT',8350000,'Biru','#2776c3','Cream','#eee1c6','Hitam','#111111')
  ),
  base_lines AS (
    SELECT
      invoice_numbers.invoice_index,
      models.model_index,
      colour_numbers.colour_index,
      models.bike_id,
      models.brand,
      models.bike_name,
      models.price,
      CASE colour_numbers.colour_index
        WHEN 1 THEN models.colour_1
        WHEN 2 THEN models.colour_2
        ELSE models.colour_3
      END AS colour,
      CASE colour_numbers.colour_index
        WHEN 1 THEN models.hex_1
        WHEN 2 THEN models.hex_2
        ELSE models.hex_3
      END AS colour_hex,
      1 + ((invoice_numbers.invoice_index + models.model_index + colour_numbers.colour_index) % 3) AS quantity
    FROM invoice_numbers
    JOIN models
      ON models.model_index IN (
        ((invoice_numbers.invoice_index - 1) % 6) + 1,
        (invoice_numbers.invoice_index % 6) + 1
      )
    CROSS JOIN colour_numbers
  )
INSERT INTO seed_faktur_large_lines (
  item_id, invoice_id,
  bike_id, bike_brand, bike_name,
  colour, colour_hex,
  quantity, unit_price, line_total,
  frame_numbers, created_at
)
SELECT
  printf('seed_faktur_large_item_%02d_%d_%d', invoice_index, model_index, colour_index),
  printf('seed_faktur_large_invoice_%02d', invoice_index),
  bike_id,
  brand,
  bike_name,
  colour,
  colour_hex,
  quantity,
  price,
  quantity * price,
  CASE quantity
    WHEN 1 THEN json_array(printf('FR-%02d-%d-%d-01', invoice_index, model_index, colour_index))
    WHEN 2 THEN json_array(
      printf('FR-%02d-%d-%d-01', invoice_index, model_index, colour_index),
      printf('FR-%02d-%d-%d-02', invoice_index, model_index, colour_index)
    )
    ELSE json_array(
      printf('FR-%02d-%d-%d-01', invoice_index, model_index, colour_index),
      printf('FR-%02d-%d-%d-02', invoice_index, model_index, colour_index),
      printf('FR-%02d-%d-%d-03', invoice_index, model_index, colour_index)
    )
  END,
  datetime(
    (SELECT created_at FROM invoices WHERE id = printf('seed_faktur_large_invoice_%02d', invoice_index)),
    '+' || ((model_index * 3) + colour_index) || ' seconds'
  )
FROM base_lines;

INSERT INTO invoice_items (
  id, invoice_id,
  bike_id, bike_brand, bike_name,
  bike_color_name, bike_color_hex, bike_color_image,
  frame_numbers,
  quantity, unit_price, line_total, created_at
)
SELECT
  item_id, invoice_id,
  bike_id, bike_brand, bike_name,
  colour, colour_hex, '',
  frame_numbers,
  quantity, unit_price, line_total, created_at
FROM seed_faktur_large_lines;

UPDATE invoices
SET
  bike_id = (
    SELECT bike_id FROM seed_faktur_large_lines
    WHERE invoice_id = invoices.id ORDER BY item_id LIMIT 1
  ),
  bike_brand = (
    SELECT bike_brand FROM seed_faktur_large_lines
    WHERE invoice_id = invoices.id ORDER BY item_id LIMIT 1
  ),
  bike_name = (
    SELECT bike_name FROM seed_faktur_large_lines
    WHERE invoice_id = invoices.id ORDER BY item_id LIMIT 1
  ),
  bike_color_name = (
    SELECT colour FROM seed_faktur_large_lines
    WHERE invoice_id = invoices.id ORDER BY item_id LIMIT 1
  ),
  bike_color_hex = (
    SELECT colour_hex FROM seed_faktur_large_lines
    WHERE invoice_id = invoices.id ORDER BY item_id LIMIT 1
  ),
  quantity = (
    SELECT SUM(quantity) FROM seed_faktur_large_lines
    WHERE invoice_id = invoices.id
  ),
  total_price = (
    SELECT SUM(line_total) FROM seed_faktur_large_lines
    WHERE invoice_id = invoices.id
  )
WHERE id LIKE 'seed_faktur_large_invoice_%';

WITH movement_balances AS (
  SELECT
    *,
    COALESCE(
      SUM(quantity) OVER (
        PARTITION BY bike_id, colour
        ORDER BY created_at, item_id
        ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING
      ),
      0
    ) AS previously_sold,
    SUM(quantity) OVER (
      PARTITION BY bike_id, colour
      ORDER BY created_at, item_id
      ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
    ) AS cumulatively_sold
  FROM seed_faktur_large_lines
)
INSERT INTO stock_movements (
  id, bike_id, bike_brand, bike_name, bike_color_name,
  movement_type, quantity_change, quantity_before, quantity_after,
  note, created_by_id, created_by_username, created_by_role, created_at
)
SELECT
  replace(item_id, 'seed_faktur_large_item_', 'seed_faktur_large_sale_'),
  bike_id,
  bike_brand,
  bike_name,
  colour,
  'sale',
  -quantity,
  30 - previously_sold,
  30 - cumulatively_sold,
  'Large seed penjualan ' || (
    SELECT invoice_number FROM invoices WHERE id = movement_balances.invoice_id
  ),
  '',
  'seed_admin',
  'admin',
  created_at
FROM movement_balances;

UPDATE bikes
SET
  colors = json_set(
    colors,
    '$[0].stockQty', 30 - COALESCE((
      SELECT SUM(quantity)
      FROM seed_faktur_large_lines
      WHERE bike_id = bikes.id
        AND colour = json_extract(bikes.colors, '$[0].name')
    ), 0),
    '$[1].stockQty', 30 - COALESCE((
      SELECT SUM(quantity)
      FROM seed_faktur_large_lines
      WHERE bike_id = bikes.id
        AND colour = json_extract(bikes.colors, '$[1].name')
    ), 0),
    '$[2].stockQty', 30 - COALESCE((
      SELECT SUM(quantity)
      FROM seed_faktur_large_lines
      WHERE bike_id = bikes.id
        AND colour = json_extract(bikes.colors, '$[2].name')
    ), 0)
  ),
  stockQty = 90 - COALESCE((
    SELECT SUM(quantity)
    FROM seed_faktur_large_lines
    WHERE bike_id = bikes.id
  ), 0),
  inStock = 1,
  updatedAt = '2026-08-14 16:15:10'
WHERE id LIKE 'seed_faktur_large_bike_%';

DROP TABLE seed_faktur_large_lines;

COMMIT;
