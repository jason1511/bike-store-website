CREATE TABLE IF NOT EXISTS stock_movements (
  id TEXT PRIMARY KEY,

  bike_id TEXT NOT NULL,
  bike_brand TEXT NOT NULL,
  bike_name TEXT NOT NULL,

  movement_type TEXT NOT NULL CHECK (
    movement_type IN ('stock_in', 'sale', 'adjustment')
  ),

  quantity_change INTEGER NOT NULL,
  quantity_before INTEGER NOT NULL,
  quantity_after INTEGER NOT NULL,

  note TEXT DEFAULT '',

  created_by_id TEXT,
  created_by_username TEXT NOT NULL,
  created_by_role TEXT NOT NULL,

  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_stock_movements_bike_id ON stock_movements (bike_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_type ON stock_movements (movement_type);
CREATE INDEX IF NOT EXISTS idx_stock_movements_created_at ON stock_movements (created_at);
CREATE INDEX IF NOT EXISTS idx_stock_movements_created_by ON stock_movements (created_by_username);