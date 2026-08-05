-- Local-only sales and service seed.
-- Requires seeds/local-test-bikes-large.sql to be loaded first.
--
-- Adds:
-- - 30 invoices
-- - 46 invoice items / 92 invoiced units (85 net after two voids)
-- - Cash and bank-transfer payments
-- - 2 voided invoices
-- - Matching sale movements plus the void restoration
-- - 30 service records across all statuses
-- - Bulk purchases of 5-7 units: same color, mixed colors, and mixed models
--
-- Current bike quantities are not changed. The large bike seed represents
-- current stock after these historical transactions.
-- Rerunning this file replaces only rows whose IDs begin with seed_tx_.

BEGIN TRANSACTION;

DELETE FROM invoice_items
WHERE invoice_id LIKE 'seed_tx_invoice_%';

DELETE FROM invoices
WHERE id LIKE 'seed_tx_invoice_%';

DELETE FROM stock_movements
WHERE id LIKE 'seed_tx_stock_%';

DELETE FROM services
WHERE id LIKE 'seed_tx_service_%';

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
  ('seed_tx_invoice_01','INV-20260722-001','Andi Pratama','081200000001','Bandung','seed_large_exotic_alpha','Exotic','EXOTIC SEED ALPHA','Merah','#e31b23','',1,8500000,8500000,'Cash','','Seed penjualan lokal','','seed_admin','admin','active','',NULL,'','','','2026-07-22 03:15:00'),
  ('seed_tx_invoice_02','INV-20260723-001','Budi Santoso','081200000002','Cimahi','seed_large_pacific_bravo','Pacific','PACIFIC SEED BRAVO','Putih','#f1f1f1','',2,8750000,17500000,'Bank Transfer','BCA','Pembelian dua unit','','seed_admin','admin','active','',NULL,'','','','2026-07-23 04:20:00'),
  ('seed_tx_invoice_03','INV-20260724-001','Citra Lestari','081200000003','Garut','seed_large_larizz_charlie','Larizz','LARIZZ SEED CHARLIE','Merah','#e31b23','',1,7150000,14300000,'Bank Transfer','BRI','Invoice multi-item','','seed_admin','admin','active','',NULL,'','','','2026-07-24 05:10:00'),
  ('seed_tx_invoice_04','INV-20260725-001','Dedi Kurniawan','081200000004','Sumedang','seed_large_saige_alpha','Saige','SAIGE SEED ALPHA','Hijau','#668f56','',1,10100000,10100000,'Cash','','Seed penjualan lokal','','seed_admin','admin','active','',NULL,'','','','2026-07-25 06:30:00'),
  ('seed_tx_invoice_05','INV-20260726-001','Eka Putri','081200000005','Tasikmalaya','seed_large_uwinfly_charlie','Uwinfly','UWINFLY SEED CHARLIE','Biru','#2776c3','',2,7900000,15800000,'Bank Transfer','BNI','Pembelian dua unit','','seed_admin','admin','active','',NULL,'','','','2026-07-26 02:45:00'),
  ('seed_tx_invoice_06','INV-20260727-001','Fajar Hidayat','081200000006','Bandung','seed_large_nuv_delta','Nuv','NUV SEED DELTA','Cream','#eee1c6','',1,9900000,9900000,'Cash','','Seed penjualan lokal','','seed_admin','admin','active','',NULL,'','','','2026-07-27 07:05:00'),
  ('seed_tx_invoice_07','INV-20260728-001','Gina Maharani','081200000007','Cianjur','seed_large_exotic_delta','Exotic','EXOTIC SEED DELTA','Cream','#eee1c6','',1,9800000,17400000,'Bank Transfer','BCA','Invoice multi-item','','seed_admin','admin','active','',NULL,'','','','2026-07-28 03:40:00'),
  ('seed_tx_invoice_08','INV-20260729-001','Hendra Wijaya','081200000008','Subang','seed_large_larizz_bravo','Larizz','LARIZZ SEED BRAVO','Hitam','#111111','',1,10500000,10500000,'Cash','','Seed penjualan lokal','','seed_admin','admin','active','',NULL,'','','','2026-07-29 04:55:00'),
  ('seed_tx_invoice_09','INV-20260730-001','Intan Permata','081200000009','Bandung','seed_large_saige_bravo','Saige','SAIGE SEED BRAVO','Putih','#f1f1f1','',2,8500000,17000000,'Bank Transfer','BRI','Invoice dibatalkan untuk pengujian','','seed_admin','admin','voided','Kesalahan data customer','2026-07-30 08:15:00','','seed_admin','admin','2026-07-30 05:25:00'),
  ('seed_tx_invoice_10','INV-20260731-001','Joko Saputra','081200000010','Majalengka','seed_large_uwinfly_alpha','Uwinfly','UWINFLY SEED ALPHA','Merah','#e31b23','',1,10300000,10300000,'Cash','','Seed penjualan lokal','','seed_admin','admin','active','',NULL,'','','','2026-07-31 06:00:00'),
  ('seed_tx_invoice_11','INV-20260801-001','Kartika Dewi','081200000011','Bandung','seed_large_nuv_alpha','Nuv','NUV SEED ALPHA','Biru','#2776c3','',1,8450000,15650000,'Bank Transfer','BCA','Invoice multi-item','','seed_admin','admin','active','',NULL,'','','','2026-08-01 02:20:00'),
  ('seed_tx_invoice_12','INV-20260801-002','Lukman Hakim','081200000012','Cimahi','seed_large_pacific_echo','Pacific','PACIFIC SEED ECHO','Hijau','#668f56','',1,9950000,9950000,'Cash','','Seed penjualan lokal','','seed_admin','admin','active','',NULL,'','','','2026-08-01 07:35:00'),
  ('seed_tx_invoice_13','INV-20260802-001','Maya Sari','081200000013','Garut','seed_large_larizz_delta','Larizz','LARIZZ SEED DELTA','Silver','#b8b8b8','',2,8650000,17300000,'Bank Transfer','BNI','Pembelian dua unit','','seed_admin','admin','active','',NULL,'','','','2026-08-02 03:50:00'),
  ('seed_tx_invoice_14','INV-20260802-002','Nanda Prakoso','081200000014','Bandung','seed_large_saige_delta','Saige','SAIGE SEED DELTA','Hitam','#111111','',1,11200000,11200000,'Bank Transfer','Bank Lainnya','Seed penjualan lokal','','seed_admin','admin','active','',NULL,'','','','2026-08-02 08:10:00'),
  ('seed_tx_invoice_15','INV-20260803-001','Oki Setiawan','081200000015','Tasikmalaya','seed_large_uwinfly_delta','Uwinfly','UWINFLY SEED DELTA','Hitam','#111111','',1,11400000,18200000,'Cash','','Invoice multi-item','','seed_admin','admin','active','',NULL,'','','','2026-08-03 02:30:00'),
  ('seed_tx_invoice_16','INV-20260803-002','Prita Anggraini','081200000016','Sumedang','seed_large_exotic_echo','Exotic','EXOTIC SEED ECHO','Hitam','#111111','',2,8250000,16500000,'Bank Transfer','BCA','Pembelian dua unit','','seed_admin','admin','active','',NULL,'','','','2026-08-03 06:45:00'),
  ('seed_tx_invoice_17','INV-20260804-001','Rian Nugraha','081200000017','Bandung','seed_large_pacific_alpha','Pacific','PACIFIC SEED ALPHA','Merah','#e31b23','',1,10200000,10200000,'Cash','','Seed penjualan lokal','','seed_admin','admin','active','',NULL,'','','','2026-08-04 03:05:00'),
  ('seed_tx_invoice_18','INV-20260804-002','Siska Amelia','081200000018','Cirebon','seed_large_larizz_alpha','Larizz','LARIZZ SEED ALPHA','Pink','#e89ab5','',1,8400000,16200000,'Bank Transfer','BRI','Invoice multi-item','','seed_admin','admin','active','',NULL,'','','','2026-08-04 07:25:00'),
  ('seed_tx_invoice_19','INV-20260805-001','Taufik Ramadhan','081200000019','Bandung','seed_large_uwinfly_bravo','Uwinfly','UWINFLY SEED BRAVO','Putih','#f1f1f1','',1,8550000,8550000,'Bank Transfer','BNI','Seed penjualan lokal','','seed_admin','admin','active','',NULL,'','','','2026-08-05 02:15:00'),
  ('seed_tx_invoice_20','INV-20260805-002','Vina Melati','081200000020','Cimahi','seed_large_nuv_echo','Nuv','NUV SEED ECHO','Abu-abu','#808080','',2,8350000,16700000,'Cash','','Pembelian dua unit','','seed_admin','admin','active','',NULL,'','','','2026-08-05 05:40:00'),
  ('seed_tx_invoice_21','INV-20260726-002','PT Maju Bersama','081200000021','Bandung','seed_large_exotic_fleet','Exotic','EXOTIC FLEET MAX','Merah','#e31b23','',7,12500000,87500000,'Bank Transfer','BCA','7 unit model dan warna yang sama','','seed_admin','admin','active','',NULL,'','','','2026-07-26 08:15:00'),
  ('seed_tx_invoice_22','INV-20260727-002','Koperasi Sejahtera','081200000022','Cimahi','seed_large_uwinfly_city','Uwinfly','UWINFLY CITY MAX','Merah','#e31b23','',3,8850000,61950000,'Bank Transfer','BRI','7 unit model sama dengan tiga warna','','seed_admin','admin','active','',NULL,'','','','2026-07-27 09:10:00'),
  ('seed_tx_invoice_23','INV-20260728-002','CV Angkutan Jaya','081200000023','Garut','seed_large_pacific_fleet','Pacific','PACIFIC FLEET PRO','Biru','#2776c3','',2,11200000,59100000,'Bank Transfer','Mandiri','6 unit dari tiga model berbeda','','seed_admin','admin','active','',NULL,'','','','2026-07-28 09:35:00'),
  ('seed_tx_invoice_24','INV-20260729-002','Rizky Firmansyah','081200000024','Sumedang','seed_large_nuv_urban','Nuv','NUV URBAN MAX','Abu-abu','#808080','',5,8250000,41250000,'Cash','','5 unit model dan warna yang sama','','seed_admin','admin','active','',NULL,'','','','2026-07-29 09:45:00'),
  ('seed_tx_invoice_25','INV-20260730-002','Yayasan Harapan','081200000025','Tasikmalaya','seed_large_exotic_fleet','Exotic','EXOTIC FLEET MAX','Hitam','#111111','',2,12500000,53900000,'Bank Transfer','BNI','5 unit campuran untuk operasional','','seed_admin','admin','active','',NULL,'','','','2026-07-30 09:00:00'),
  ('seed_tx_invoice_26','INV-20260731-002','Sumber Rejeki Motor','081200000026','Cianjur','seed_large_saige_metro','Saige','SAIGE METRO MAX','Hijau','#668f56','',4,8950000,62650000,'Bank Transfer','BCA','7 unit model sama dua warna','','seed_admin','admin','active','',NULL,'','','','2026-07-31 09:25:00'),
  ('seed_tx_invoice_27','INV-20260801-003','Dimas Kurnia','081200000027','Subang','seed_large_larizz_cargo','Larizz','LARIZZ CARGO MAX','Cream','#eee1c6','',6,9400000,56400000,'Cash','','6 unit model dan warna yang sama','','seed_admin','admin','active','',NULL,'','','','2026-08-01 09:30:00'),
  ('seed_tx_invoice_28','INV-20260802-003','PT Kurir Nusantara','081200000028','Bandung','seed_large_nuv_urban','Nuv','NUV URBAN MAX','Hitam','#111111','',3,8250000,72150000,'Bank Transfer','Mandiri','7 unit dari tiga model berbeda','','seed_admin','admin','active','',NULL,'','','','2026-08-02 09:20:00'),
  ('seed_tx_invoice_29','INV-20260803-003','Toko Berkah Abadi','081200000029','Cirebon','seed_large_uwinfly_city','Uwinfly','UWINFLY CITY MAX','Biru','#2776c3','',5,8850000,44250000,'Bank Transfer','BRI','Bulk invoice dibatalkan untuk pengujian','','seed_admin','admin','voided','Pesanan perusahaan dibatalkan','2026-08-03 11:00:00','','seed_admin','admin','2026-08-03 09:15:00'),
  ('seed_tx_invoice_30','INV-20260804-003','Koperasi Karyawan NBA','081200000030','Bandung','seed_large_exotic_fleet','Exotic','EXOTIC FLEET MAX','Merah','#e31b23','',2,12500000,61700000,'Cash','','6 unit campuran tiga model','','seed_admin','admin','active','',NULL,'','','','2026-08-04 09:40:00');

INSERT INTO invoice_items (
  id, invoice_id,
  bike_id, bike_brand, bike_name,
  bike_color_name, bike_color_hex, bike_color_image,
  frame_numbers,
  quantity, unit_price, line_total,
  created_at
)
VALUES
  ('seed_tx_item_01a','seed_tx_invoice_01','seed_large_exotic_alpha','Exotic','EXOTIC SEED ALPHA','Merah','#e31b23','','["SEED-EXA-R-001"]',1,8500000,8500000,'2026-07-22 03:15:00'),
  ('seed_tx_item_02a','seed_tx_invoice_02','seed_large_pacific_bravo','Pacific','PACIFIC SEED BRAVO','Putih','#f1f1f1','','["SEED-PAB-W-001","SEED-PAB-W-002"]',2,8750000,17500000,'2026-07-23 04:20:00'),
  ('seed_tx_item_03a','seed_tx_invoice_03','seed_large_larizz_charlie','Larizz','LARIZZ SEED CHARLIE','Merah','#e31b23','','["SEED-LAC-R-001"]',1,7150000,7150000,'2026-07-24 05:10:00'),
  ('seed_tx_item_03b','seed_tx_invoice_03','seed_large_nuv_bravo','Nuv','NUV SEED BRAVO','Hitam','#111111','','[]',1,7150000,7150000,'2026-07-24 05:10:01'),
  ('seed_tx_item_04a','seed_tx_invoice_04','seed_large_saige_alpha','Saige','SAIGE SEED ALPHA','Hijau','#668f56','','["SEED-SAA-G-001"]',1,10100000,10100000,'2026-07-25 06:30:00'),
  ('seed_tx_item_05a','seed_tx_invoice_05','seed_large_uwinfly_charlie','Uwinfly','UWINFLY SEED CHARLIE','Biru','#2776c3','','["SEED-UWC-B-001","SEED-UWC-B-002"]',2,7900000,15800000,'2026-07-26 02:45:00'),
  ('seed_tx_item_06a','seed_tx_invoice_06','seed_large_nuv_delta','Nuv','NUV SEED DELTA','Cream','#eee1c6','','[]',1,9900000,9900000,'2026-07-27 07:05:00'),
  ('seed_tx_item_07a','seed_tx_invoice_07','seed_large_exotic_delta','Exotic','EXOTIC SEED DELTA','Cream','#eee1c6','','["SEED-EXD-C-001"]',1,9800000,9800000,'2026-07-28 03:40:00'),
  ('seed_tx_item_07b','seed_tx_invoice_07','seed_large_pacific_charlie','Pacific','PACIFIC SEED CHARLIE','Biru','#2776c3','','[]',1,7600000,7600000,'2026-07-28 03:40:01'),
  ('seed_tx_item_08a','seed_tx_invoice_08','seed_large_larizz_bravo','Larizz','LARIZZ SEED BRAVO','Hitam','#111111','','[]',1,10500000,10500000,'2026-07-29 04:55:00'),
  ('seed_tx_item_09a','seed_tx_invoice_09','seed_large_saige_bravo','Saige','SAIGE SEED BRAVO','Putih','#f1f1f1','','["SEED-SAB-W-001","SEED-SAB-W-002"]',2,8500000,17000000,'2026-07-30 05:25:00'),
  ('seed_tx_item_10a','seed_tx_invoice_10','seed_large_uwinfly_alpha','Uwinfly','UWINFLY SEED ALPHA','Merah','#e31b23','','[]',1,10300000,10300000,'2026-07-31 06:00:00'),
  ('seed_tx_item_11a','seed_tx_invoice_11','seed_large_nuv_alpha','Nuv','NUV SEED ALPHA','Biru','#2776c3','','["SEED-NUA-B-001"]',1,8450000,8450000,'2026-08-01 02:20:00'),
  ('seed_tx_item_11b','seed_tx_invoice_11','seed_large_exotic_bravo','Exotic','EXOTIC SEED BRAVO','Putih','#f1f1f1','','[]',1,7200000,7200000,'2026-08-01 02:20:01'),
  ('seed_tx_item_12a','seed_tx_invoice_12','seed_large_pacific_echo','Pacific','PACIFIC SEED ECHO','Hijau','#668f56','','[]',1,9950000,9950000,'2026-08-01 07:35:00'),
  ('seed_tx_item_13a','seed_tx_invoice_13','seed_large_larizz_delta','Larizz','LARIZZ SEED DELTA','Silver','#b8b8b8','','["SEED-LAD-S-001","SEED-LAD-S-002"]',2,8650000,17300000,'2026-08-02 03:50:00'),
  ('seed_tx_item_14a','seed_tx_invoice_14','seed_large_saige_delta','Saige','SAIGE SEED DELTA','Hitam','#111111','','[]',1,11200000,11200000,'2026-08-02 08:10:00'),
  ('seed_tx_item_15a','seed_tx_invoice_15','seed_large_uwinfly_delta','Uwinfly','UWINFLY SEED DELTA','Hitam','#111111','','["SEED-UWD-B-001"]',1,11400000,11400000,'2026-08-03 02:30:00'),
  ('seed_tx_item_15b','seed_tx_invoice_15','seed_large_nuv_charlie','Nuv','NUV SEED CHARLIE','Merah','#e31b23','','[]',1,6800000,6800000,'2026-08-03 02:30:01'),
  ('seed_tx_item_16a','seed_tx_invoice_16','seed_large_exotic_echo','Exotic','EXOTIC SEED ECHO','Hitam','#111111','','["SEED-EXE-B-001","SEED-EXE-B-002"]',2,8250000,16500000,'2026-08-03 06:45:00'),
  ('seed_tx_item_17a','seed_tx_invoice_17','seed_large_pacific_alpha','Pacific','PACIFIC SEED ALPHA','Merah','#e31b23','','[]',1,10200000,10200000,'2026-08-04 03:05:00'),
  ('seed_tx_item_18a','seed_tx_invoice_18','seed_large_larizz_alpha','Larizz','LARIZZ SEED ALPHA','Pink','#e89ab5','','["SEED-LAA-P-001"]',1,8400000,8400000,'2026-08-04 07:25:00'),
  ('seed_tx_item_18b','seed_tx_invoice_18','seed_large_saige_echo','Saige','SAIGE SEED ECHO','Abu-abu','#808080','','[]',1,7800000,7800000,'2026-08-04 07:25:01'),
  ('seed_tx_item_19a','seed_tx_invoice_19','seed_large_uwinfly_bravo','Uwinfly','UWINFLY SEED BRAVO','Putih','#f1f1f1','','[]',1,8550000,8550000,'2026-08-05 02:15:00'),
  ('seed_tx_item_20a','seed_tx_invoice_20','seed_large_nuv_echo','Nuv','NUV SEED ECHO','Abu-abu','#808080','','["SEED-NUE-G-001","SEED-NUE-G-002"]',2,8350000,16700000,'2026-08-05 05:40:00'),
  ('seed_tx_item_21a','seed_tx_invoice_21','seed_large_exotic_fleet','Exotic','EXOTIC FLEET MAX','Merah','#e31b23','','["XL-EXF-R-001","XL-EXF-R-002","XL-EXF-R-003","XL-EXF-R-004","XL-EXF-R-005","XL-EXF-R-006","XL-EXF-R-007"]',7,12500000,87500000,'2026-07-26 08:15:00'),
  ('seed_tx_item_22a','seed_tx_invoice_22','seed_large_uwinfly_city','Uwinfly','UWINFLY CITY MAX','Merah','#e31b23','','["XL-UWC-R-001","XL-UWC-R-002","XL-UWC-R-003"]',3,8850000,26550000,'2026-07-27 09:10:00'),
  ('seed_tx_item_22b','seed_tx_invoice_22','seed_large_uwinfly_city','Uwinfly','UWINFLY CITY MAX','Putih','#f1f1f1','','["XL-UWC-W-001","XL-UWC-W-002"]',2,8850000,17700000,'2026-07-27 09:10:01'),
  ('seed_tx_item_22c','seed_tx_invoice_22','seed_large_uwinfly_city','Uwinfly','UWINFLY CITY MAX','Biru','#2776c3','','["XL-UWC-B-001","XL-UWC-B-002"]',2,8850000,17700000,'2026-07-27 09:10:02'),
  ('seed_tx_item_23a','seed_tx_invoice_23','seed_large_pacific_fleet','Pacific','PACIFIC FLEET PRO','Biru','#2776c3','','[]',2,11200000,22400000,'2026-07-28 09:35:00'),
  ('seed_tx_item_23b','seed_tx_invoice_23','seed_large_larizz_cargo','Larizz','LARIZZ CARGO MAX','Cream','#eee1c6','','[]',2,9400000,18800000,'2026-07-28 09:35:01'),
  ('seed_tx_item_23c','seed_tx_invoice_23','seed_large_saige_metro','Saige','SAIGE METRO MAX','Hijau','#668f56','','[]',2,8950000,17900000,'2026-07-28 09:35:02'),
  ('seed_tx_item_24a','seed_tx_invoice_24','seed_large_nuv_urban','Nuv','NUV URBAN MAX','Abu-abu','#808080','','["XL-NUU-G-001","XL-NUU-G-002","XL-NUU-G-003","XL-NUU-G-004","XL-NUU-G-005"]',5,8250000,41250000,'2026-07-29 09:45:00'),
  ('seed_tx_item_25a','seed_tx_invoice_25','seed_large_exotic_fleet','Exotic','EXOTIC FLEET MAX','Hitam','#111111','','[]',2,12500000,25000000,'2026-07-30 09:00:00'),
  ('seed_tx_item_25b','seed_tx_invoice_25','seed_large_pacific_fleet','Pacific','PACIFIC FLEET PRO','Silver','#b8b8b8','','[]',1,11200000,11200000,'2026-07-30 09:00:01'),
  ('seed_tx_item_25c','seed_tx_invoice_25','seed_large_uwinfly_city','Uwinfly','UWINFLY CITY MAX','Putih','#f1f1f1','','[]',2,8850000,17700000,'2026-07-30 09:00:02'),
  ('seed_tx_item_26a','seed_tx_invoice_26','seed_large_saige_metro','Saige','SAIGE METRO MAX','Hijau','#668f56','','[]',4,8950000,35800000,'2026-07-31 09:25:00'),
  ('seed_tx_item_26b','seed_tx_invoice_26','seed_large_saige_metro','Saige','SAIGE METRO MAX','Hitam','#111111','','[]',3,8950000,26850000,'2026-07-31 09:25:01'),
  ('seed_tx_item_27a','seed_tx_invoice_27','seed_large_larizz_cargo','Larizz','LARIZZ CARGO MAX','Cream','#eee1c6','','["XL-LAC-C-001","XL-LAC-C-002","XL-LAC-C-003","XL-LAC-C-004","XL-LAC-C-005","XL-LAC-C-006"]',6,9400000,56400000,'2026-08-01 09:30:00'),
  ('seed_tx_item_28a','seed_tx_invoice_28','seed_large_nuv_urban','Nuv','NUV URBAN MAX','Hitam','#111111','','[]',3,8250000,24750000,'2026-08-02 09:20:00'),
  ('seed_tx_item_28b','seed_tx_invoice_28','seed_large_exotic_fleet','Exotic','EXOTIC FLEET MAX','Putih','#f1f1f1','','[]',2,12500000,25000000,'2026-08-02 09:20:01'),
  ('seed_tx_item_28c','seed_tx_invoice_28','seed_large_pacific_fleet','Pacific','PACIFIC FLEET PRO','Biru','#2776c3','','[]',2,11200000,22400000,'2026-08-02 09:20:02'),
  ('seed_tx_item_29a','seed_tx_invoice_29','seed_large_uwinfly_city','Uwinfly','UWINFLY CITY MAX','Biru','#2776c3','','[]',5,8850000,44250000,'2026-08-03 09:15:00'),
  ('seed_tx_item_30a','seed_tx_invoice_30','seed_large_exotic_fleet','Exotic','EXOTIC FLEET MAX','Merah','#e31b23','','[]',2,12500000,25000000,'2026-08-04 09:40:00'),
  ('seed_tx_item_30b','seed_tx_invoice_30','seed_large_larizz_cargo','Larizz','LARIZZ CARGO MAX','Cokelat','#76543b','','[]',2,9400000,18800000,'2026-08-04 09:40:01'),
  ('seed_tx_item_30c','seed_tx_invoice_30','seed_large_saige_metro','Saige','SAIGE METRO MAX','Hijau','#668f56','','[]',2,8950000,17900000,'2026-08-04 09:40:02');

INSERT INTO stock_movements (
  id,
  bike_id, bike_brand, bike_name, bike_color_name,
  movement_type,
  quantity_change, quantity_before, quantity_after,
  note,
  created_by_id, created_by_username, created_by_role,
  created_at
)
VALUES
  ('seed_tx_stock_01','seed_large_exotic_alpha','Exotic','EXOTIC SEED ALPHA','Merah','sale',-1,6,5,'Seed penjualan INV-20260722-001','','seed_admin','admin','2026-07-22 03:15:00'),
  ('seed_tx_stock_02','seed_large_pacific_bravo','Pacific','PACIFIC SEED BRAVO','Putih','sale',-2,7,5,'Seed penjualan INV-20260723-001','','seed_admin','admin','2026-07-23 04:20:00'),
  ('seed_tx_stock_03','seed_large_larizz_charlie','Larizz','LARIZZ SEED CHARLIE','Merah','sale',-1,3,2,'Seed penjualan INV-20260724-001','','seed_admin','admin','2026-07-24 05:10:00'),
  ('seed_tx_stock_04','seed_large_nuv_bravo','Nuv','NUV SEED BRAVO','Hitam','sale',-1,4,3,'Seed penjualan INV-20260724-001','','seed_admin','admin','2026-07-24 05:10:01'),
  ('seed_tx_stock_05','seed_large_saige_alpha','Saige','SAIGE SEED ALPHA','Hijau','sale',-1,7,6,'Seed penjualan INV-20260725-001','','seed_admin','admin','2026-07-25 06:30:00'),
  ('seed_tx_stock_06','seed_large_uwinfly_charlie','Uwinfly','UWINFLY SEED CHARLIE','Biru','sale',-2,4,2,'Seed penjualan INV-20260726-001','','seed_admin','admin','2026-07-26 02:45:00'),
  ('seed_tx_stock_07','seed_large_nuv_delta','Nuv','NUV SEED DELTA','Cream','sale',-1,6,5,'Seed penjualan INV-20260727-001','','seed_admin','admin','2026-07-27 07:05:00'),
  ('seed_tx_stock_08','seed_large_exotic_delta','Exotic','EXOTIC SEED DELTA','Cream','sale',-1,8,7,'Seed penjualan INV-20260728-001','','seed_admin','admin','2026-07-28 03:40:00'),
  ('seed_tx_stock_09','seed_large_pacific_charlie','Pacific','PACIFIC SEED CHARLIE','Biru','sale',-1,3,2,'Seed penjualan INV-20260728-001','','seed_admin','admin','2026-07-28 03:40:01'),
  ('seed_tx_stock_10','seed_large_larizz_bravo','Larizz','LARIZZ SEED BRAVO','Hitam','sale',-1,11,10,'Seed penjualan INV-20260729-001','','seed_admin','admin','2026-07-29 04:55:00'),
  ('seed_tx_stock_11','seed_large_saige_bravo','Saige','SAIGE SEED BRAVO','Putih','sale',-2,3,1,'Seed penjualan INV-20260730-001','','seed_admin','admin','2026-07-30 05:25:00'),
  ('seed_tx_stock_12','seed_large_saige_bravo','Saige','SAIGE SEED BRAVO','Putih','adjustment',2,1,3,'Pemulihan stok invoice batal INV-20260730-001','','seed_admin','admin','2026-07-30 08:15:00'),
  ('seed_tx_stock_13','seed_large_uwinfly_alpha','Uwinfly','UWINFLY SEED ALPHA','Merah','sale',-1,10,9,'Seed penjualan INV-20260731-001','','seed_admin','admin','2026-07-31 06:00:00'),
  ('seed_tx_stock_14','seed_large_nuv_alpha','Nuv','NUV SEED ALPHA','Biru','sale',-1,7,6,'Seed penjualan INV-20260801-001','','seed_admin','admin','2026-08-01 02:20:00'),
  ('seed_tx_stock_15','seed_large_exotic_bravo','Exotic','EXOTIC SEED BRAVO','Putih','sale',-1,4,3,'Seed penjualan INV-20260801-001','','seed_admin','admin','2026-08-01 02:20:01'),
  ('seed_tx_stock_16','seed_large_pacific_echo','Pacific','PACIFIC SEED ECHO','Hijau','sale',-1,7,6,'Seed penjualan INV-20260801-002','','seed_admin','admin','2026-08-01 07:35:00'),
  ('seed_tx_stock_17','seed_large_larizz_delta','Larizz','LARIZZ SEED DELTA','Silver','sale',-2,7,5,'Seed penjualan INV-20260802-001','','seed_admin','admin','2026-08-02 03:50:00'),
  ('seed_tx_stock_18','seed_large_saige_delta','Saige','SAIGE SEED DELTA','Hitam','sale',-1,9,8,'Seed penjualan INV-20260802-002','','seed_admin','admin','2026-08-02 08:10:00'),
  ('seed_tx_stock_19','seed_large_uwinfly_delta','Uwinfly','UWINFLY SEED DELTA','Hitam','sale',-1,8,7,'Seed penjualan INV-20260803-001','','seed_admin','admin','2026-08-03 02:30:00'),
  ('seed_tx_stock_20','seed_large_nuv_charlie','Nuv','NUV SEED CHARLIE','Merah','sale',-1,2,1,'Seed penjualan INV-20260803-001','','seed_admin','admin','2026-08-03 02:30:01'),
  ('seed_tx_stock_21','seed_large_exotic_echo','Exotic','EXOTIC SEED ECHO','Hitam','sale',-2,8,6,'Seed penjualan INV-20260803-002','','seed_admin','admin','2026-08-03 06:45:00'),
  ('seed_tx_stock_22','seed_large_pacific_alpha','Pacific','PACIFIC SEED ALPHA','Merah','sale',-1,9,8,'Seed penjualan INV-20260804-001','','seed_admin','admin','2026-08-04 03:05:00'),
  ('seed_tx_stock_23','seed_large_larizz_alpha','Larizz','LARIZZ SEED ALPHA','Pink','sale',-1,5,4,'Seed penjualan INV-20260804-002','','seed_admin','admin','2026-08-04 07:25:00'),
  ('seed_tx_stock_24','seed_large_saige_echo','Saige','SAIGE SEED ECHO','Abu-abu','sale',-1,5,4,'Seed penjualan INV-20260804-002','','seed_admin','admin','2026-08-04 07:25:01'),
  ('seed_tx_stock_25','seed_large_uwinfly_bravo','Uwinfly','UWINFLY SEED BRAVO','Putih','sale',-1,6,5,'Seed penjualan INV-20260805-001','','seed_admin','admin','2026-08-05 02:15:00'),
  ('seed_tx_stock_26','seed_large_nuv_echo','Nuv','NUV SEED ECHO','Abu-abu','sale',-2,9,7,'Seed penjualan INV-20260805-002','','seed_admin','admin','2026-08-05 05:40:00'),
  ('seed_tx_stock_27','seed_large_exotic_fleet','Exotic','EXOTIC FLEET MAX','Merah','sale',-7,39,32,'Bulk sale INV-20260726-002','','seed_admin','admin','2026-07-26 08:15:00'),
  ('seed_tx_stock_28','seed_large_uwinfly_city','Uwinfly','UWINFLY CITY MAX','Merah','sale',-3,33,30,'Bulk sale INV-20260727-002','','seed_admin','admin','2026-07-27 09:10:00'),
  ('seed_tx_stock_29','seed_large_uwinfly_city','Uwinfly','UWINFLY CITY MAX','Putih','sale',-2,34,32,'Bulk sale INV-20260727-002','','seed_admin','admin','2026-07-27 09:10:01'),
  ('seed_tx_stock_30','seed_large_uwinfly_city','Uwinfly','UWINFLY CITY MAX','Biru','sale',-2,22,20,'Bulk sale INV-20260727-002','','seed_admin','admin','2026-07-27 09:10:02'),
  ('seed_tx_stock_31','seed_large_pacific_fleet','Pacific','PACIFIC FLEET PRO','Biru','sale',-2,32,30,'Bulk sale INV-20260728-002','','seed_admin','admin','2026-07-28 09:35:00'),
  ('seed_tx_stock_32','seed_large_larizz_cargo','Larizz','LARIZZ CARGO MAX','Cream','sale',-2,38,36,'Bulk sale INV-20260728-002','','seed_admin','admin','2026-07-28 09:35:01'),
  ('seed_tx_stock_33','seed_large_saige_metro','Saige','SAIGE METRO MAX','Hijau','sale',-2,43,41,'Bulk sale INV-20260728-002','','seed_admin','admin','2026-07-28 09:35:02'),
  ('seed_tx_stock_34','seed_large_nuv_urban','Nuv','NUV URBAN MAX','Abu-abu','sale',-5,30,25,'Bulk sale INV-20260729-002','','seed_admin','admin','2026-07-29 09:45:00'),
  ('seed_tx_stock_35','seed_large_exotic_fleet','Exotic','EXOTIC FLEET MAX','Hitam','sale',-2,27,25,'Bulk sale INV-20260730-002','','seed_admin','admin','2026-07-30 09:00:00'),
  ('seed_tx_stock_36','seed_large_pacific_fleet','Pacific','PACIFIC FLEET PRO','Silver','sale',-1,23,22,'Bulk sale INV-20260730-002','','seed_admin','admin','2026-07-30 09:00:01'),
  ('seed_tx_stock_37','seed_large_uwinfly_city','Uwinfly','UWINFLY CITY MAX','Putih','sale',-2,32,30,'Bulk sale INV-20260730-002','','seed_admin','admin','2026-07-30 09:00:02'),
  ('seed_tx_stock_38','seed_large_saige_metro','Saige','SAIGE METRO MAX','Hijau','sale',-4,41,37,'Bulk sale INV-20260731-002','','seed_admin','admin','2026-07-31 09:25:00'),
  ('seed_tx_stock_39','seed_large_saige_metro','Saige','SAIGE METRO MAX','Hitam','sale',-3,28,25,'Bulk sale INV-20260731-002','','seed_admin','admin','2026-07-31 09:25:01'),
  ('seed_tx_stock_40','seed_large_larizz_cargo','Larizz','LARIZZ CARGO MAX','Cream','sale',-6,36,30,'Bulk sale INV-20260801-003','','seed_admin','admin','2026-08-01 09:30:00'),
  ('seed_tx_stock_41','seed_large_nuv_urban','Nuv','NUV URBAN MAX','Hitam','sale',-3,23,20,'Bulk sale INV-20260802-003','','seed_admin','admin','2026-08-02 09:20:00'),
  ('seed_tx_stock_42','seed_large_exotic_fleet','Exotic','EXOTIC FLEET MAX','Putih','sale',-2,22,20,'Bulk sale INV-20260802-003','','seed_admin','admin','2026-08-02 09:20:01'),
  ('seed_tx_stock_43','seed_large_pacific_fleet','Pacific','PACIFIC FLEET PRO','Biru','sale',-2,30,28,'Bulk sale INV-20260802-003','','seed_admin','admin','2026-08-02 09:20:02'),
  ('seed_tx_stock_44','seed_large_uwinfly_city','Uwinfly','UWINFLY CITY MAX','Biru','sale',-5,20,15,'Bulk sale INV-20260803-003','','seed_admin','admin','2026-08-03 09:15:00'),
  ('seed_tx_stock_45','seed_large_uwinfly_city','Uwinfly','UWINFLY CITY MAX','Biru','adjustment',5,15,20,'Pemulihan bulk invoice batal INV-20260803-003','','seed_admin','admin','2026-08-03 11:00:00'),
  ('seed_tx_stock_46','seed_large_exotic_fleet','Exotic','EXOTIC FLEET MAX','Merah','sale',-2,32,30,'Bulk sale INV-20260804-003','','seed_admin','admin','2026-08-04 09:40:00'),
  ('seed_tx_stock_47','seed_large_larizz_cargo','Larizz','LARIZZ CARGO MAX','Cokelat','sale',-2,22,20,'Bulk sale INV-20260804-003','','seed_admin','admin','2026-08-04 09:40:01'),
  ('seed_tx_stock_48','seed_large_saige_metro','Saige','SAIGE METRO MAX','Hijau','sale',-2,37,35,'Bulk sale INV-20260804-003','','seed_admin','admin','2026-08-04 09:40:02');

INSERT INTO invoice_sequences (date_code, last_sequence, updated_at)
VALUES
  ('20260722',1,CURRENT_TIMESTAMP),('20260723',1,CURRENT_TIMESTAMP),
  ('20260724',1,CURRENT_TIMESTAMP),('20260725',1,CURRENT_TIMESTAMP),
  ('20260726',2,CURRENT_TIMESTAMP),('20260727',2,CURRENT_TIMESTAMP),
  ('20260728',2,CURRENT_TIMESTAMP),('20260729',2,CURRENT_TIMESTAMP),
  ('20260730',2,CURRENT_TIMESTAMP),('20260731',2,CURRENT_TIMESTAMP),
  ('20260801',3,CURRENT_TIMESTAMP),('20260802',3,CURRENT_TIMESTAMP),
  ('20260803',3,CURRENT_TIMESTAMP),('20260804',3,CURRENT_TIMESTAMP),
  ('20260805',2,CURRENT_TIMESTAMP)
ON CONFLICT(date_code) DO UPDATE SET
  last_sequence = MAX(invoice_sequences.last_sequence, excluded.last_sequence),
  updated_at = CURRENT_TIMESTAMP;

INSERT INTO services (
  id, service_number,
  customer_name, customer_phone, customer_address,
  bike_label, service_type, service_status,
  service_cost, notes,
  created_by_id, created_by_username, created_by_role,
  created_at, completed_at
)
VALUES
  ('seed_tx_service_01','SRV-20260723-SEED001','Agus Setiawan','082100000001','Bandung','EXOTIC SEED ALPHA - Merah','Servis rem','completed',175000,'Ganti kampas rem depan','','seed_admin','admin','2026-07-23 02:10:00','2026-07-23 08:30:00'),
  ('seed_tx_service_02','SRV-20260724-SEED002','Bella Amanda','082100000002','Cimahi','PACIFIC SEED BRAVO - Putih','Pemeriksaan baterai','completed',250000,'Pengecekan sel dan konektor','','seed_admin','admin','2026-07-24 03:20:00','2026-07-25 05:00:00'),
  ('seed_tx_service_03','SRV-20260725-SEED003','Cecep Maulana','082100000003','Garut','LARIZZ SEED CHARLIE - Merah','Ganti ban','completed',325000,'Ganti ban belakang','','seed_admin','admin','2026-07-25 04:15:00','2026-07-25 09:10:00'),
  ('seed_tx_service_04','SRV-20260726-SEED004','Dian Puspita','082100000004','Bandung','SAIGE SEED ALPHA - Hijau','Servis rutin','completed',150000,'Pemeriksaan umum dan pelumasan','','seed_admin','admin','2026-07-26 02:45:00','2026-07-26 07:40:00'),
  ('seed_tx_service_05','SRV-20260727-SEED005','Erwin Gunawan','082100000005','Sumedang','UWINFLY SEED CHARLIE - Biru','Perbaikan lampu','cancelled',0,'Customer membatalkan service','','seed_admin','admin','2026-07-27 05:00:00',NULL),
  ('seed_tx_service_06','SRV-20260728-SEED006','Fitri Handayani','082100000006','Tasikmalaya','NUV SEED DELTA - Cream','Ganti controller','completed',650000,'Controller lama rusak','','seed_admin','admin','2026-07-28 03:30:00','2026-07-30 06:20:00'),
  ('seed_tx_service_07','SRV-20260729-SEED007','Galih Pratama','082100000007','Bandung','EXOTIC SEED DELTA - Cream','Servis suspensi','completed',275000,'Setel dan lumasi suspensi','','seed_admin','admin','2026-07-29 04:50:00','2026-07-29 09:00:00'),
  ('seed_tx_service_08','SRV-20260730-SEED008','Hani Lestari','082100000008','Cianjur','LARIZZ SEED BRAVO - Hitam','Pemeriksaan motor','completed',225000,'Motor normal, konektor dibersihkan','','seed_admin','admin','2026-07-30 02:20:00','2026-07-31 04:30:00'),
  ('seed_tx_service_09','SRV-20260731-SEED009','Irfan Hakim','082100000009','Subang','SAIGE SEED BRAVO - Putih','Ganti throttle','completed',375000,'Throttle diganti baru','','seed_admin','admin','2026-07-31 05:10:00','2026-08-01 03:15:00'),
  ('seed_tx_service_10','SRV-20260801-SEED010','Julia Kartini','082100000010','Bandung','UWINFLY SEED ALPHA - Merah','Servis rutin','completed',150000,'Pemeriksaan berkala','','seed_admin','admin','2026-08-01 02:40:00','2026-08-01 07:10:00'),
  ('seed_tx_service_11','SRV-20260801-SEED011','Kurniawan','082100000011','Cimahi','NUV SEED ALPHA - Biru','Perbaikan charger','in_progress',425000,'Menunggu komponen charger','','seed_admin','admin','2026-08-01 06:05:00',NULL),
  ('seed_tx_service_12','SRV-20260802-SEED012','Linda Sari','082100000012','Garut','PACIFIC SEED ECHO - Hijau','Ganti bearing','in_progress',350000,'Sedang dikerjakan teknisi','','seed_admin','admin','2026-08-02 03:25:00',NULL),
  ('seed_tx_service_13','SRV-20260802-SEED013','Maman Suherman','082100000013','Bandung','LARIZZ SEED DELTA - Silver','Pemeriksaan kelistrikan','received',200000,'Unit baru diterima','','seed_admin','admin','2026-08-02 07:45:00',NULL),
  ('seed_tx_service_14','SRV-20260803-SEED014','Nina Marlina','082100000014','Tasikmalaya','SAIGE SEED DELTA - Hitam','Ganti display','in_progress',550000,'Display sedang dipesan','','seed_admin','admin','2026-08-03 02:55:00',NULL),
  ('seed_tx_service_15','SRV-20260803-SEED015','Oscar Wijaya','082100000015','Bandung','EXOTIC SEED ECHO - Hitam','Servis rem','received',180000,'Keluhan rem belakang','','seed_admin','admin','2026-08-03 06:35:00',NULL),
  ('seed_tx_service_16','SRV-20260804-SEED016','Putri Ayu','082100000016','Cirebon','PACIFIC SEED ALPHA - Merah','Pemeriksaan baterai','received',250000,'Baterai cepat habis','','seed_admin','admin','2026-08-04 03:20:00',NULL),
  ('seed_tx_service_17','SRV-20260804-SEED017','Rudi Hartono','082100000017','Bandung','UWINFLY SEED BRAVO - Putih','Perbaikan alarm','in_progress',225000,'Pemeriksaan modul alarm','','seed_admin','admin','2026-08-04 07:00:00',NULL),
  ('seed_tx_service_18','SRV-20260805-SEED018','Santi Dewi','082100000018','Cimahi','NUV SEED ECHO - Abu-abu','Servis rutin','received',150000,'Pemeriksaan awal belum dimulai','','seed_admin','admin','2026-08-05 04:10:00',NULL),
  ('seed_tx_service_19','SRV-20260726-SEED019','Raka Prasetyo','082100000019','Bandung','EXOTIC FLEET MAX - Merah','Kalibrasi controller','completed',475000,'Kalibrasi dan uji jalan selesai','','seed_admin','admin','2026-07-26 01:15:00','2026-07-27 06:30:00'),
  ('seed_tx_service_20','SRV-20260727-SEED020','Sari Wulandari','082100000020','Cimahi','UWINFLY CITY MAX - Putih','Ganti ban depan','completed',350000,'Ban dan pentil diganti','','seed_admin','admin','2026-07-27 02:25:00','2026-07-27 08:45:00'),
  ('seed_tx_service_21','SRV-20260728-SEED021','Teguh Santoso','082100000021','Garut','PACIFIC FLEET PRO - Biru','Servis rem lengkap','completed',425000,'Kampas depan belakang diganti','','seed_admin','admin','2026-07-28 01:40:00','2026-07-29 04:20:00'),
  ('seed_tx_service_22','SRV-20260729-SEED022','Umi Kalsum','082100000022','Tasikmalaya','LARIZZ CARGO MAX - Cream','Pemeriksaan rangka','completed',225000,'Baut rangka dikencangkan','','seed_admin','admin','2026-07-29 03:05:00','2026-07-29 07:55:00'),
  ('seed_tx_service_23','SRV-20260730-SEED023','Wahyu Hidayat','082100000023','Sumedang','SAIGE METRO MAX - Hijau','Ganti baterai','completed',2850000,'Baterai pengganti terpasang','','seed_admin','admin','2026-07-30 01:30:00','2026-08-01 05:15:00'),
  ('seed_tx_service_24','SRV-20260731-SEED024','Yanti Mulyani','082100000024','Bandung','NUV URBAN MAX - Abu-abu','Perbaikan klakson','completed',185000,'Relay klakson diganti','','seed_admin','admin','2026-07-31 03:15:00','2026-07-31 08:00:00'),
  ('seed_tx_service_25','SRV-20260801-SEED025','Zaki Abdullah','082100000025','Cianjur','EXOTIC FLEET MAX - Hitam','Pemeriksaan kelistrikan','in_progress',325000,'Menelusuri arus bocor','','seed_admin','admin','2026-08-01 04:20:00',NULL),
  ('seed_tx_service_26','SRV-20260802-SEED026','Aulia Rahman','082100000026','Subang','UWINFLY CITY MAX - Merah','Ganti bearing roda','in_progress',375000,'Menunggu bearing depan','','seed_admin','admin','2026-08-02 05:10:00',NULL),
  ('seed_tx_service_27','SRV-20260803-SEED027','Bagas Maulana','082100000027','Cirebon','PACIFIC FLEET PRO - Silver','Servis suspensi','received',300000,'Suspensi depan berbunyi','','seed_admin','admin','2026-08-03 04:35:00',NULL),
  ('seed_tx_service_28','SRV-20260804-SEED028','Clara Wijaya','082100000028','Bandung','LARIZZ CARGO MAX - Cokelat','Pemeriksaan motor','received',250000,'Tenaga motor berkurang','','seed_admin','admin','2026-08-04 05:25:00',NULL),
  ('seed_tx_service_29','SRV-20260805-SEED029','Doni Saputra','082100000029','Cimahi','SAIGE METRO MAX - Hitam','Perbaikan display','in_progress',625000,'Display berkedip saat berjalan','','seed_admin','admin','2026-08-05 01:50:00',NULL),
  ('seed_tx_service_30','SRV-20260805-SEED030','Elsa Maharani','082100000030','Bandung','NUV URBAN MAX - Cream','Ganti charger','cancelled',0,'Customer membawa unit pulang','','seed_admin','admin','2026-08-05 06:20:00',NULL);

COMMIT;
