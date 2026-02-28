-- Run this in Supabase Dashboard → SQL Editor
-- Enables uploads from the pedido flow (anon) and public read for design images.

-- 0. Ensure the "designs" bucket exists and is PUBLIC (required for public URLs to work)
-- If the bucket already exists (e.g. created via Dashboard), this just makes it public:
INSERT INTO storage.buckets (id, name, public)
VALUES ('designs', 'designs', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 1. Allow anonymous users to upload (INSERT) into the "designs" bucket
CREATE POLICY "Allow anon upload to designs"
ON storage.objects
FOR INSERT
TO anon
WITH CHECK (bucket_id = 'designs');

-- 2. Allow anyone to read (SELECT) from "designs" so images can be displayed
CREATE POLICY "Allow public read designs"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'designs');
