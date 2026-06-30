CREATE TABLE IF NOT EXISTS invoices (
  id TEXT PRIMARY KEY,
  invoice_number TEXT NOT NULL UNIQUE,

  customer_name TEXT NOT NULL,
  customer_phone TEXT DEFAULT '',
  customer_address TEXT DEFAULT '',

  bike_id TEXT NOT NULL,
  bike_brand TEXT NOT NULL,
  bike_name TEXT NOT NULL,
  bike_color_name TEXT DEFAULT '',
  bike_color_hex TEXT DEFAULT '',
  bike_color_image TEXT DEFAULT '',

  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price INTEGER NOT NULL DEFAULT 0,
  total_price INTEGER NOT NULL DEFAULT 0,

  payment_method TEXT DEFAULT '',
  notes TEXT DEFAULT '',

  created_by_id TEXT,
  created_by_username TEXT NOT NULL,
  created_by_role TEXT NOT NULL,

  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_invoices_invoice_number ON invoices (invoice_number);
CREATE INDEX IF NOT EXISTS idx_invoices_customer_name ON invoices (customer_name);
CREATE INDEX IF NOT EXISTS idx_invoices_bike_id ON invoices (bike_id);
CREATE INDEX IF NOT EXISTS idx_invoices_bike_color ON invoices (bike_color_name);
CREATE INDEX IF NOT EXISTS idx_invoices_created_at ON invoices (created_at);
CREATE INDEX IF NOT EXISTS idx_invoices_created_by ON invoices (created_by_username);