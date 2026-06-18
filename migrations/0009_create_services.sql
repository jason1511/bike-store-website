CREATE TABLE IF NOT EXISTS services (
  id TEXT PRIMARY KEY,
  service_number TEXT NOT NULL UNIQUE,

  customer_name TEXT NOT NULL,
  customer_phone TEXT DEFAULT '',
  customer_address TEXT DEFAULT '',

  bike_label TEXT NOT NULL,
  service_type TEXT NOT NULL,
  service_status TEXT NOT NULL DEFAULT 'received' CHECK (
    service_status IN ('received', 'in_progress', 'completed', 'cancelled')
  ),

  service_cost INTEGER NOT NULL DEFAULT 0,
  notes TEXT DEFAULT '',

  created_by_id TEXT,
  created_by_username TEXT NOT NULL,
  created_by_role TEXT NOT NULL,

  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  completed_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_services_service_number ON services (service_number);
CREATE INDEX IF NOT EXISTS idx_services_customer_name ON services (customer_name);
CREATE INDEX IF NOT EXISTS idx_services_customer_phone ON services (customer_phone);
CREATE INDEX IF NOT EXISTS idx_services_status ON services (service_status);
CREATE INDEX IF NOT EXISTS idx_services_created_at ON services (created_at);
CREATE INDEX IF NOT EXISTS idx_services_created_by ON services (created_by_username);