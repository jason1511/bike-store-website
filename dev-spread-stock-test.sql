WITH ranked_invoices AS (
  SELECT
    id,
    ROW_NUMBER() OVER (ORDER BY created_at DESC) AS rn
  FROM invoices
  WHERE customer_name LIKE 'STOCK TEST CUSTOMER%'
)
UPDATE invoices
SET created_at = datetime('now', '-' || (
  SELECT (rn - 1) % 14
  FROM ranked_invoices
  WHERE ranked_invoices.id = invoices.id
) || ' days')
WHERE id IN (
  SELECT id FROM ranked_invoices
);

WITH ranked_movements AS (
  SELECT
    id,
    ROW_NUMBER() OVER (ORDER BY created_at DESC) AS rn
  FROM stock_movements
  WHERE bike_id LIKE 'test-stock-%'
     OR bike_name LIKE 'TEST%'
     OR note LIKE '%stock movement test%'
     OR note LIKE '%invoice%'
     OR note LIKE '%Invoice%'
)
UPDATE stock_movements
SET created_at = datetime('now', '-' || (
  SELECT (rn - 1) % 14
  FROM ranked_movements
  WHERE ranked_movements.id = stock_movements.id
) || ' days')
WHERE id IN (
  SELECT id FROM ranked_movements
);