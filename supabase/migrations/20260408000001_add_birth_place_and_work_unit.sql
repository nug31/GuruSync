-- Add birth_place and work_unit columns to teachers table
ALTER TABLE teachers 
ADD COLUMN IF NOT EXISTS birth_place TEXT,
ADD COLUMN IF NOT EXISTS work_unit TEXT;
