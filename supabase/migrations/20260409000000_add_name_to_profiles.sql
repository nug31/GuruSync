-- Add name column to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS name TEXT;

-- Synchronize names from teachers table to profiles table
-- Join on user_id to ensure we match the correct account
UPDATE profiles p
SET name = t.name
FROM teachers t
WHERE p.id = t.user_id
AND p.name IS NULL;
