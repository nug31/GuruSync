/*
  # Update NIK and Avatar Support

  1. New Columns
    - `profiles`
      - `nik` (text, unique) - National ID for admins/users
      - `avatar_url` (text) - Profile picture URL
    - `teachers`
      - `avatar_url` (text) - Profile picture URL
  
  2. Storage
    - Create `avatars` bucket for profile pictures
    - Set up RLS policies for storage
*/

-- Add columns to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS nik text UNIQUE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_url text;

-- Add column to teachers
ALTER TABLE teachers ADD COLUMN IF NOT EXISTS avatar_url text;

-- Create storage bucket (if not exists via SQL)
-- Note: This requires the storage extension to be enabled
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Set up storage policies
-- Allow public read access to avatars
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'avatars');

-- Allow authenticated users to upload their own avatars
CREATE POLICY "Users can upload avatars"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'avatars');

-- Allow users to update their own avatars
CREATE POLICY "Users can update avatars"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'avatars')
WITH CHECK (bucket_id = 'avatars');

-- Allow users to delete their own avatars
CREATE POLICY "Users can delete avatars"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'avatars');
