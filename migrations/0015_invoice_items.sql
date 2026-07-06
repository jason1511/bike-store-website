CREATE TABLE IF NOT EXISTS invoice_items (
  id TEXT PRIMARY KEY,
  invoice_id TEXT NOT NULL,

  bike_id TEXT NOT NULL,
  bike_brand TEXT NOT NULL,
  bike_name TEXT NOT NULL,
  bike_color_name TEXT NOT NULL DEFAULT '',
  bike_color_hex TEXT NOT NULL DEFAULT '',
  bike_color_image TEXT NOT NULL DEFAULT '',

  quantity INTEGER NOT NULL,
  unit_price INTEGER NOT NULL DEFAULT 0,
  line_total INTEGER NOT NULL DEFAULT 0,

  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (invoice_id) REFERENCES invoices(id)
);

CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice_id
ON invoice_items(invoice_id);

CREATE INDEX IF NOT EXISTS idx_invoice_items_bike_id
ON invoice_items(bike_id);