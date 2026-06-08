CREATE TABLE IF NOT EXISTS bikes (
  id TEXT PRIMARY KEY,
  brand TEXT NOT NULL,
  name TEXT NOT NULL,
  battery TEXT DEFAULT '',
  motor TEXT DEFAULT '',
  topSpeed TEXT DEFAULT '',
  range TEXT DEFAULT '',
  maxWeight TEXT DEFAULT '',
  safety TEXT DEFAULT '',
  image TEXT DEFAULT '',
  alt TEXT DEFAULT '',
  comfort TEXT DEFAULT 'medium',
  description TEXT DEFAULT '',
  featured INTEGER DEFAULT 0,
  inStock INTEGER DEFAULT 1,
  stockQty INTEGER DEFAULT 0,
  createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
  updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_bikes_brand ON bikes (brand);
CREATE INDEX IF NOT EXISTS idx_bikes_stock ON bikes (inStock, stockQty);
CREATE INDEX IF NOT EXISTS idx_bikes_featured ON bikes (featured);