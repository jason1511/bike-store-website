ALTER TABLE invoices ADD COLUMN bike_color_name TEXT DEFAULT '';
ALTER TABLE invoices ADD COLUMN bike_color_hex TEXT DEFAULT '';
ALTER TABLE invoices ADD COLUMN bike_color_image TEXT DEFAULT '';

ALTER TABLE stock_movements ADD COLUMN bike_color_name TEXT DEFAULT '';

CREATE INDEX IF NOT EXISTS idx_invoices_bike_color ON invoices (bike_color_name);
CREATE INDEX IF NOT EXISTS idx_stock_movements_bike_color ON stock_movements (bike_color_name);