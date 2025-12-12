-- Migration script to add USD rate column to clinical_records
-- Run this script in your Neon database console

-- Add usd_rate column to store the exchange rate at the time of payment
ALTER TABLE clinical_records ADD COLUMN IF NOT EXISTS usd_rate NUMERIC(10, 2);

-- Verify the column was added
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'clinical_records' 
AND column_name = 'usd_rate';
