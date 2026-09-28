ALTER TABLE invoices
ADD COLUMN invoice_type TEXT NOT NULL DEFAULT 'normal';

CREATE INDEX IF NOT EXISTS idx_invoices_invoice_type
ON invoices (invoice_type);
