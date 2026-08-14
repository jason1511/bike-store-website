-- LARGE LOCAL-ONLY MULTICOLOUR STOCK SEED.
--
-- Creates 6 dedicated models, 3 colours per model, and 30 units per colour.
-- Opening inventory: 540 units across 18 colour-level stock entries.
-- Rerunning this file resets the complete large multicolour test scenario.
-- Requires migrations through 0017. Do not run with --remote.

BEGIN TRANSACTION;

DELETE FROM invoice_items
WHERE invoice_id LIKE 'seed_faktur_large_invoice_%'
   OR invoice_id = 'seed_faktur_multi_invoice_01';

DELETE FROM invoices
WHERE id LIKE 'seed_faktur_large_invoice_%'
   OR id = 'seed_faktur_multi_invoice_01';

DELETE FROM stock_movements
WHERE id LIKE 'seed_faktur_large_%'
   OR id LIKE 'seed_faktur_multi_%';

DELETE FROM bikes
WHERE id LIKE 'seed_faktur_large_bike_%'
   OR id IN ('seed_faktur_item_a', 'seed_faktur_item_b');

INSERT INTO bikes (
  id, brand_id, brand, name,
  battery, motor, topSpeed, range,
  image, alt, comfort, colorName, colors,
  description, price, featured, inStock, stockQty, updatedAt
)
VALUES
  ('seed_faktur_large_bike_1','brand_exotic','Exotic','EXOTIC MULTICOLOR ALPHA','48V / 20Ah','800 WATT MOTOR','40 KM/H','55 KM','','EXOTIC MULTICOLOR ALPHA','medium','Merah','[{"name":"Merah","hex":"#e31b23","image":"","stockQty":30},{"name":"Hitam","hex":"#111111","image":"","stockQty":30},{"name":"Putih","hex":"#f1f1f1","image":"","stockQty":30}]','Large multicolour faktur seed.',8500000,0,1,90,'2026-08-10 08:00:00'),
  ('seed_faktur_large_bike_2','brand_pacific','Pacific','PACIFIC MULTICOLOR BRAVO','60V / 20Ah','1000 WATT MOTOR','45 KM/H','65 KM','','PACIFIC MULTICOLOR BRAVO','medium','Biru','[{"name":"Biru","hex":"#2776c3","image":"","stockQty":30},{"name":"Silver","hex":"#b8b8b8","image":"","stockQty":30},{"name":"Cream","hex":"#eee1c6","image":"","stockQty":30}]','Large multicolour faktur seed.',9250000,0,1,90,'2026-08-10 08:00:00'),
  ('seed_faktur_large_bike_3','brand_larizz','Larizz','LARIZZ MULTICOLOR CHARLIE','48V / 24Ah','900 WATT MOTOR','42 KM/H','60 KM','','LARIZZ MULTICOLOR CHARLIE','medium','Pink','[{"name":"Pink","hex":"#e89ab5","image":"","stockQty":30},{"name":"Putih","hex":"#f1f1f1","image":"","stockQty":30},{"name":"Cokelat","hex":"#76543b","image":"","stockQty":30}]','Large multicolour faktur seed.',8800000,0,1,90,'2026-08-10 08:00:00'),
  ('seed_faktur_large_bike_4','brand_saige','Saige','SAIGE MULTICOLOR DELTA','60V / 24Ah','1200 WATT MOTOR','48 KM/H','72 KM','','SAIGE MULTICOLOR DELTA','medium','Hijau','[{"name":"Hijau","hex":"#668f56","image":"","stockQty":30},{"name":"Hitam","hex":"#111111","image":"","stockQty":30},{"name":"Cream","hex":"#eee1c6","image":"","stockQty":30}]','Large multicolour faktur seed.',10100000,0,1,90,'2026-08-10 08:00:00'),
  ('seed_faktur_large_bike_5','brand_uwinfly','Uwinfly','UWINFLY MULTICOLOR ECHO','48V / 24Ah','1000 WATT MOTOR','45 KM/H','70 KM','','UWINFLY MULTICOLOR ECHO','medium','Merah','[{"name":"Merah","hex":"#e31b23","image":"","stockQty":30},{"name":"Biru","hex":"#2776c3","image":"","stockQty":30},{"name":"Abu-abu","hex":"#808080","image":"","stockQty":30}]','Large multicolour faktur seed.',8950000,0,1,90,'2026-08-10 08:00:00'),
  ('seed_faktur_large_bike_6','brand_nuv','Nuv','NUV MULTICOLOR FOXTROT','48V / 20Ah','800 WATT MOTOR','40 KM/H','58 KM','','NUV MULTICOLOR FOXTROT','medium','Biru','[{"name":"Biru","hex":"#2776c3","image":"","stockQty":30},{"name":"Cream","hex":"#eee1c6","image":"","stockQty":30},{"name":"Hitam","hex":"#111111","image":"","stockQty":30}]','Large multicolour faktur seed.',8350000,0,1,90,'2026-08-10 08:00:00');

WITH stock_rows (
  code, bike_id, brand, bike_name, colour, second_offset
) AS (
  VALUES
    ('01','seed_faktur_large_bike_1','Exotic','EXOTIC MULTICOLOR ALPHA','Merah',0),
    ('02','seed_faktur_large_bike_1','Exotic','EXOTIC MULTICOLOR ALPHA','Hitam',1),
    ('03','seed_faktur_large_bike_1','Exotic','EXOTIC MULTICOLOR ALPHA','Putih',2),
    ('04','seed_faktur_large_bike_2','Pacific','PACIFIC MULTICOLOR BRAVO','Biru',3),
    ('05','seed_faktur_large_bike_2','Pacific','PACIFIC MULTICOLOR BRAVO','Silver',4),
    ('06','seed_faktur_large_bike_2','Pacific','PACIFIC MULTICOLOR BRAVO','Cream',5),
    ('07','seed_faktur_large_bike_3','Larizz','LARIZZ MULTICOLOR CHARLIE','Pink',6),
    ('08','seed_faktur_large_bike_3','Larizz','LARIZZ MULTICOLOR CHARLIE','Putih',7),
    ('09','seed_faktur_large_bike_3','Larizz','LARIZZ MULTICOLOR CHARLIE','Cokelat',8),
    ('10','seed_faktur_large_bike_4','Saige','SAIGE MULTICOLOR DELTA','Hijau',9),
    ('11','seed_faktur_large_bike_4','Saige','SAIGE MULTICOLOR DELTA','Hitam',10),
    ('12','seed_faktur_large_bike_4','Saige','SAIGE MULTICOLOR DELTA','Cream',11),
    ('13','seed_faktur_large_bike_5','Uwinfly','UWINFLY MULTICOLOR ECHO','Merah',12),
    ('14','seed_faktur_large_bike_5','Uwinfly','UWINFLY MULTICOLOR ECHO','Biru',13),
    ('15','seed_faktur_large_bike_5','Uwinfly','UWINFLY MULTICOLOR ECHO','Abu-abu',14),
    ('16','seed_faktur_large_bike_6','Nuv','NUV MULTICOLOR FOXTROT','Biru',15),
    ('17','seed_faktur_large_bike_6','Nuv','NUV MULTICOLOR FOXTROT','Cream',16),
    ('18','seed_faktur_large_bike_6','Nuv','NUV MULTICOLOR FOXTROT','Hitam',17)
)
INSERT INTO stock_movements (
  id, bike_id, bike_brand, bike_name, bike_color_name,
  movement_type, quantity_change, quantity_before, quantity_after,
  note, created_by_id, created_by_username, created_by_role, created_at
)
SELECT
  'seed_faktur_large_stock_' || code,
  bike_id,
  brand,
  bike_name,
  colour,
  'stock_in',
  30,
  0,
  30,
  'Large seed stok masuk warna ' || colour,
  '',
  'seed_admin',
  'admin',
  datetime('2026-08-10 08:00:00', '+' || second_offset || ' seconds')
FROM stock_rows;

COMMIT;
