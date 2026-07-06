ALTER TABLE invoices ADD COLUMN status TEXT NOT NULL DEFAULT 'active';
ALTER TABLE invoices ADD COLUMN void_reason TEXT NOT NULL DEFAULT '';
ALTER TABLE invoices ADD COLUMN voided_at TEXT;
ALTER TABLE invoices ADD COLUMN voided_by_id TEXT NOT NULL DEFAULT '';
ALTER TABLE invoices ADD COLUMN voided_by_username TEXT NOT NULL DEFAULT '';
ALTER TABLE invoices ADD COLUMN voided_by_role TEXT NOT NULL DEFAULT '';

CREATE INDEX IF NOT EXISTS idx_invoices_status_created
ON invoices(status, created_at);