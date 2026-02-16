-- Query to check all movements for the Laptop product
SELECT 
    id,
    type,
    quantity,
    notes,
    "createdAt",
    "createdBy"
FROM stock_movements
WHERE "productId" = '618b97d6-410c-421f-9950-5653314b45c8'
  AND "storeId" = 'a90a1706-4725-4987-a150-c0e12171a31e'
ORDER BY "createdAt" ASC;
