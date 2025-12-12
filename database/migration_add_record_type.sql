-- Migration script to add record_type and debit_amount columns
-- Run this script in your Neon database console

-- Add record_type column if it doesn't exist
ALTER TABLE clinical_records ADD COLUMN IF NOT EXISTS record_type TEXT DEFAULT 'control';

-- Add debit_amount column if it doesn't exist
ALTER TABLE clinical_records ADD COLUMN IF NOT EXISTS debit_amount NUMERIC(10, 2) DEFAULT 0;

-- Verify the columns were added
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'clinical_records' 
AND column_name IN ('record_type', 'debit_amount');
