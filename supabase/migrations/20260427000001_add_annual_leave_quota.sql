-- Add annual_leave_quota to teachers table
ALTER TABLE teachers ADD COLUMN IF NOT EXISTS annual_leave_quota integer DEFAULT 12;
