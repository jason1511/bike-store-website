-- LARGE LOCAL-ONLY MULTICOLOUR SALES SEED.
--
-- Run seeds/local-test-multicolor-stock-large.sql first.
-- Creates 24 invoices covering:
-- - one model / one colour / normal quantity
-- - one model / one colour / bulk quantity of 5-7
-- - one model split across 2-3 colours
-- - several different models with one colour each
-- - several models each split across several colours
-- - four mixed invoices combining all of those patterns
-- - populated and intentionally blank optional frame numbers
-- - Cash and bank transfers, plus voided invoices with stock restoration
-- Rerunning this file produces the same invoices and final stock balances.
-- Requires migrations through 0017. Do not run with --remote.

BEGIN TRANSACTION;

DELETE FROM invoice_items
WHERE invoice_id LIKE 'seed_faktur_large_invoice_%';

DELETE FROM invoices
WHERE id LIKE 'seed_faktur_large_invoice_%';

DELETE FROM stock_movements
WHERE id LIKE 'seed_faktur_large_sale_%'
   OR id LIKE 'seed_faktur_large_restore_%';

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
  ('seed_faktur_large_invoice_01','INV-SEED-LARGE-001','Andi Pratama','081210000001','Bandung','','','','','','',0,0,0,'Cash','','Satu model dan satu warna.','','seed_admin','admin','active','',NULL,'','','','2026-08-11 08:00:00'),
  ('seed_faktur_large_invoice_02','INV-SEED-LARGE-002','Bella Amanda','081210000002','Cimahi','','','','','','',0,0,0,'Bank Transfer','BCA','Satu model dan satu warna.','','seed_admin','admin','active','',NULL,'','','','2026-08-11 09:00:00'),
  ('seed_faktur_large_invoice_03','INV-SEED-LARGE-003','Citra Lestari','081210000003','Garut','','','','','','',0,0,0,'Cash','','Satu model dan satu warna.','','seed_admin','admin','active','',NULL,'','','','2026-08-11 10:00:00'),
  ('seed_faktur_large_invoice_04','INV-SEED-LARGE-004','Dedi Kurniawan','081210000004','Sumedang','','','','','','',0,0,0,'Bank Transfer','BRI','Satu model dan satu warna.','','seed_admin','admin','active','',NULL,'','','','2026-08-11 11:00:00'),
  ('seed_faktur_large_invoice_05','INV-SEED-LARGE-005','PT Satu Warna','081210000005','Tasikmalaya','','','','','','',0,0,0,'Bank Transfer','BNI','Bulk 5 unit model dan warna sama.','','seed_admin','admin','active','',NULL,'','','','2026-08-11 13:00:00'),
  ('seed_faktur_large_invoice_06','INV-SEED-LARGE-006','CV Enam Roda','081210000006','Bandung','','','','','','',0,0,0,'Cash','','Bulk 6 unit model dan warna sama.','','seed_admin','admin','active','',NULL,'','','','2026-08-11 14:00:00'),
  ('seed_faktur_large_invoice_07','INV-SEED-LARGE-007','Koperasi Tujuh Unit','081210000007','Cianjur','','','','','','',0,0,0,'Bank Transfer','Mandiri','Bulk 7 unit model dan warna sama.','','seed_admin','admin','active','',NULL,'','','','2026-08-11 15:00:00'),
  ('seed_faktur_large_invoice_08','INV-SEED-LARGE-008','Pesanan Dibatalkan','081210000008','Subang','','','','','','',0,0,0,'Cash','','Bulk dibatalkan dan stok dipulihkan.','','seed_admin','admin','voided','Customer membatalkan pesanan','2026-08-11 17:00:00','','seed_admin','admin','2026-08-11 16:00:00'),
  ('seed_faktur_large_invoice_09','INV-SEED-LARGE-009','Eka Putri','081210000009','Cirebon','','','','','','',0,0,0,'Bank Transfer','BCA','Satu model dengan tiga warna.','','seed_admin','admin','active','',NULL,'','','','2026-08-12 08:00:00'),
  ('seed_faktur_large_invoice_10','INV-SEED-LARGE-010','Fajar Hidayat','081210000010','Bandung','','','','','','',0,0,0,'Cash','','Satu model dengan tiga warna.','','seed_admin','admin','active','',NULL,'','','','2026-08-12 09:00:00'),
  ('seed_faktur_large_invoice_11','INV-SEED-LARGE-011','Gina Maharani','081210000011','Lumajang','','','','','','',0,0,0,'Bank Transfer','BRI','Satu model dengan tiga warna.','','seed_admin','admin','active','',NULL,'','','','2026-08-12 10:00:00'),
  ('seed_faktur_large_invoice_12','INV-SEED-LARGE-012','Hendra Wijaya','081210000012','Surabaya','','','','','','',0,0,0,'Bank Transfer','BNI','Satu model dengan tiga warna.','','seed_admin','admin','active','',NULL,'','','','2026-08-12 11:00:00'),
  ('seed_faktur_large_invoice_13','INV-SEED-LARGE-013','PT Tiga Model','081210000013','Bandung','','','','','','',0,0,0,'Cash','','Tiga model berbeda, satu warna masing-masing.','','seed_admin','admin','active','',NULL,'','','','2026-08-12 13:00:00'),
  ('seed_faktur_large_invoice_14','INV-SEED-LARGE-014','Koperasi Maju Jaya','081210000014','Cimahi','','','','','','',0,0,0,'Bank Transfer','Mandiri','Tiga model berbeda, satu warna masing-masing.','','seed_admin','admin','active','',NULL,'','','','2026-08-12 14:00:00'),
  ('seed_faktur_large_invoice_15','INV-SEED-LARGE-015','CV Angkutan Sejahtera','081210000015','Garut','','','','','','',0,0,0,'Bank Transfer','Bank Lainnya','Tiga model berbeda, satu warna masing-masing.','','seed_admin','admin','active','',NULL,'','','','2026-08-12 15:00:00'),
  ('seed_faktur_large_invoice_16','INV-SEED-LARGE-016','Toko Sumber Rejeki','081210000016','Sumedang','','','','','','',0,0,0,'Cash','','Tiga model berbeda, satu warna masing-masing.','','seed_admin','admin','active','',NULL,'','','','2026-08-12 16:00:00'),
  ('seed_faktur_large_invoice_17','INV-SEED-LARGE-017','Yayasan Harapan Baru','081210000017','Tasikmalaya','','','','','','',0,0,0,'Bank Transfer','BCA','Dua model, tiga warna per model.','','seed_admin','admin','active','',NULL,'','','','2026-08-13 08:00:00'),
  ('seed_faktur_large_invoice_18','INV-SEED-LARGE-018','PT Kurir Cepat','081210000018','Bandung','','','','','','',0,0,0,'Bank Transfer','BRI','Dua model, tiga warna per model.','','seed_admin','admin','active','',NULL,'','','','2026-08-13 10:00:00'),
  ('seed_faktur_large_invoice_19','INV-SEED-LARGE-019','Invoice Multi Dibatalkan','081210000019','Cianjur','','','','','','',0,0,0,'Bank Transfer','BNI','Multi-model dibatalkan dan stok dipulihkan.','','seed_admin','admin','voided','Kesalahan data pembelian','2026-08-13 13:00:00','','seed_admin','admin','2026-08-13 12:00:00'),
  ('seed_faktur_large_invoice_20','INV-SEED-LARGE-020','CV Mandiri Elektrik','081210000020','Subang','','','','','','',0,0,0,'Cash','','Dua model, tiga warna per model.','','seed_admin','admin','active','',NULL,'','','','2026-08-13 14:00:00'),
  ('seed_faktur_large_invoice_21','INV-SEED-LARGE-021','PT Pelangi Nusantara','081210000021','Bandung','','','','','','',0,0,0,'Bank Transfer','Mandiri','Campuran lengkap: bulk, multiwarna, dan multimodel.','','seed_admin','admin','active','',NULL,'','','','2026-08-14 08:00:00'),
  ('seed_faktur_large_invoice_22','INV-SEED-LARGE-022','Koperasi Karyawan Abadi','081210000022','Cimahi','','','','','','',0,0,0,'Cash','','Campuran lengkap: bulk, multiwarna, dan multimodel.','','seed_admin','admin','active','',NULL,'','','','2026-08-14 10:00:00'),
  ('seed_faktur_large_invoice_23','INV-SEED-LARGE-023','PT Niaga Sentosa','081210000023','Cirebon','','','','','','',0,0,0,'Bank Transfer','BCA','Campuran lengkap dengan nomor rangka opsional kosong.','','seed_admin','admin','active','',NULL,'','','','2026-08-14 13:00:00'),
  ('seed_faktur_large_invoice_24','INV-SEED-LARGE-024','PT Armada Bersama','081210000024','Surabaya','','','','','','',0,0,0,'Bank Transfer','Mandiri','Campuran lengkap: empat model dan tujuh baris warna.','','seed_admin','admin','active','',NULL,'','','','2026-08-14 16:00:00');

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
    WHERE invoice_index < 24
  ),
  colour_numbers(colour_index) AS (
    VALUES (1), (2), (3)
  ),
  model_offsets(model_offset) AS (
    VALUES (0), (1), (2)
  ),
  unit_numbers(unit_index) AS (
    VALUES (1), (2), (3), (4), (5), (6), (7)
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
  mixed_lines(
    invoice_index, model_index, colour_index, quantity
  ) AS (
    VALUES
      (21,1,1,7),(21,2,1,2),(21,2,2,3),(21,2,3,1),(21,3,2,1),(21,4,1,5),(21,4,3,2),
      (22,2,2,6),(22,3,1,1),(22,3,2,2),(22,3,3,3),(22,4,1,2),(22,5,2,5),(22,5,3,2),
      (23,3,3,5),(23,4,1,3),(23,4,2,1),(23,4,3,2),(23,5,1,1),(23,6,1,5),(23,6,2,2),
      (24,4,1,7),(24,5,1,2),(24,5,2,3),(24,5,3,1),(24,6,2,1),(24,1,2,5),(24,1,3,2)
  ),
  requested_lines AS (
    -- Invoices 1-4: one model, one colour, quantities 1-4.
    SELECT
      invoice_index,
      ((invoice_index - 1) % 6) + 1 AS model_index,
      ((invoice_index - 1) % 3) + 1 AS colour_index,
      invoice_index AS quantity
    FROM invoice_numbers
    WHERE invoice_index BETWEEN 1 AND 4

    UNION ALL

    -- Invoices 5-8: 5, 6, 7, and 5 units of one exact variant.
    SELECT
      invoice_index,
      ((invoice_index - 1) % 6) + 1,
      ((invoice_index - 1) % 3) + 1,
      5 + ((invoice_index - 5) % 3)
    FROM invoice_numbers
    WHERE invoice_index BETWEEN 5 AND 8

    UNION ALL

    -- Invoices 9-12: one model purchased in all three colours.
    SELECT
      invoice_numbers.invoice_index,
      ((invoice_numbers.invoice_index - 9) % 6) + 1,
      colour_numbers.colour_index,
      1 + ((invoice_numbers.invoice_index + colour_numbers.colour_index) % 3)
    FROM invoice_numbers
    CROSS JOIN colour_numbers
    WHERE invoice_numbers.invoice_index BETWEEN 9 AND 12

    UNION ALL

    -- Invoices 13-16: three different models, one colour per model.
    SELECT
      invoice_numbers.invoice_index,
      ((invoice_numbers.invoice_index - 13 + model_offsets.model_offset) % 6) + 1,
      ((invoice_numbers.invoice_index + model_offsets.model_offset) % 3) + 1,
      1 + ((invoice_numbers.invoice_index + model_offsets.model_offset) % 3)
    FROM invoice_numbers
    CROSS JOIN model_offsets
    WHERE invoice_numbers.invoice_index BETWEEN 13 AND 16

    UNION ALL

    -- Invoices 17-20: two models, all three colours for each model.
    SELECT
      invoice_numbers.invoice_index,
      models.model_index,
      colour_numbers.colour_index,
      1 + ((invoice_numbers.invoice_index + models.model_index + colour_numbers.colour_index) % 3)
    FROM invoice_numbers
    JOIN models
      ON models.model_index IN (
        ((invoice_numbers.invoice_index - 1) % 6) + 1,
        (invoice_numbers.invoice_index % 6) + 1
      )
    CROSS JOIN colour_numbers
    WHERE invoice_numbers.invoice_index BETWEEN 17 AND 20

    UNION ALL

    -- Invoices 21-24: bulk, multi-colour, and multi-model in one invoice.
    SELECT
      invoice_index,
      model_index,
      colour_index,
      quantity
    FROM mixed_lines
  ),
  base_lines AS (
    SELECT
      requested_lines.invoice_index,
      models.model_index,
      requested_lines.colour_index,
      models.bike_id,
      models.brand,
      models.bike_name,
      models.price,
      CASE requested_lines.colour_index
        WHEN 1 THEN models.colour_1
        WHEN 2 THEN models.colour_2
        ELSE models.colour_3
      END AS colour,
      CASE requested_lines.colour_index
        WHEN 1 THEN models.hex_1
        WHEN 2 THEN models.hex_2
        ELSE models.hex_3
      END AS colour_hex,
      requested_lines.quantity
    FROM requested_lines
    JOIN models
      ON models.model_index = requested_lines.model_index
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
  CASE
    WHEN invoice_index IN (4, 10, 15, 23) THEN '[]'
    ELSE (
      SELECT json_group_array(
        printf(
          'FR-%02d-%d-%d-%02d',
          base_lines.invoice_index,
          base_lines.model_index,
          base_lines.colour_index,
          unit_numbers.unit_index
        )
      )
      FROM unit_numbers
      WHERE unit_numbers.unit_index <= base_lines.quantity
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

WITH movement_events AS (
  SELECT
    replace(item_id, 'seed_faktur_large_item_', 'seed_faktur_large_sale_') AS movement_id,
    invoice_id,
    bike_id,
    bike_brand,
    bike_name,
    colour,
    'sale' AS movement_type,
    -quantity AS quantity_change,
    'Penjualan ' || (
      SELECT invoice_number FROM invoices
      WHERE id = seed_faktur_large_lines.invoice_id
    ) AS movement_note,
    created_at,
    0 AS event_order
  FROM seed_faktur_large_lines

  UNION ALL

  SELECT
    replace(item_id, 'seed_faktur_large_item_', 'seed_faktur_large_restore_'),
    seed_faktur_large_lines.invoice_id,
    seed_faktur_large_lines.bike_id,
    seed_faktur_large_lines.bike_brand,
    seed_faktur_large_lines.bike_name,
    seed_faktur_large_lines.colour,
    'adjustment',
    seed_faktur_large_lines.quantity,
    'Pemulihan stok invoice batal ' || invoices.invoice_number,
    datetime(invoices.voided_at, '+' || row_number() OVER (
      PARTITION BY seed_faktur_large_lines.invoice_id
      ORDER BY item_id
    ) || ' seconds'),
    1
  FROM seed_faktur_large_lines
  JOIN invoices
    ON invoices.id = seed_faktur_large_lines.invoice_id
  WHERE invoices.status = 'voided'
),
movement_balances AS (
  SELECT
    *,
    COALESCE(
      SUM(quantity_change) OVER (
        PARTITION BY bike_id, colour
        ORDER BY created_at, event_order, movement_id
        ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING
      ),
      0
    ) AS previous_net_change,
    SUM(quantity_change) OVER (
      PARTITION BY bike_id, colour
      ORDER BY created_at, event_order, movement_id
      ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
    ) AS cumulative_net_change
  FROM movement_events
)
INSERT INTO stock_movements (
  id, bike_id, bike_brand, bike_name, bike_color_name,
  movement_type, quantity_change, quantity_before, quantity_after,
  note, created_by_id, created_by_username, created_by_role, created_at
)
SELECT
  movement_id,
  bike_id,
  bike_brand,
  bike_name,
  colour,
  movement_type,
  quantity_change,
  30 + previous_net_change,
  30 + cumulative_net_change,
  movement_note,
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
      SELECT SUM(seed_faktur_large_lines.quantity)
      FROM seed_faktur_large_lines
      JOIN invoices
        ON invoices.id = seed_faktur_large_lines.invoice_id
      WHERE seed_faktur_large_lines.bike_id = bikes.id
        AND seed_faktur_large_lines.colour = json_extract(bikes.colors, '$[0].name')
        AND invoices.status = 'active'
    ), 0),
    '$[1].stockQty', 30 - COALESCE((
      SELECT SUM(seed_faktur_large_lines.quantity)
      FROM seed_faktur_large_lines
      JOIN invoices
        ON invoices.id = seed_faktur_large_lines.invoice_id
      WHERE seed_faktur_large_lines.bike_id = bikes.id
        AND seed_faktur_large_lines.colour = json_extract(bikes.colors, '$[1].name')
        AND invoices.status = 'active'
    ), 0),
    '$[2].stockQty', 30 - COALESCE((
      SELECT SUM(seed_faktur_large_lines.quantity)
      FROM seed_faktur_large_lines
      JOIN invoices
        ON invoices.id = seed_faktur_large_lines.invoice_id
      WHERE seed_faktur_large_lines.bike_id = bikes.id
        AND seed_faktur_large_lines.colour = json_extract(bikes.colors, '$[2].name')
        AND invoices.status = 'active'
    ), 0)
  ),
  stockQty = 90 - COALESCE((
    SELECT SUM(seed_faktur_large_lines.quantity)
    FROM seed_faktur_large_lines
    JOIN invoices
      ON invoices.id = seed_faktur_large_lines.invoice_id
    WHERE seed_faktur_large_lines.bike_id = bikes.id
      AND invoices.status = 'active'
  ), 0),
  inStock = 1,
  updatedAt = '2026-08-14 16:00:10'
WHERE id LIKE 'seed_faktur_large_bike_%';

DROP TABLE seed_faktur_large_lines;

COMMIT;
