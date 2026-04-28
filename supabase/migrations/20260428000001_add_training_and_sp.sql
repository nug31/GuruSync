-- Add training_history and sp_level columns to teachers table
ALTER TABLE teachers 
ADD COLUMN IF NOT EXISTS training_history TEXT,
ADD COLUMN IF NOT EXISTS sp_level TEXT DEFAULT 'Tidak ada';
