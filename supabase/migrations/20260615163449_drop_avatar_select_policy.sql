-- Fix Lint 0025: Drop the broad SELECT policy on the avatars bucket
-- Because 'avatars' is a public bucket, we do not need ANY broad SELECT policy 
-- on storage.objects to allow downloading images via the public URL.
-- Having a broad SELECT policy (even if restricted to authenticated users) 
-- allows clients to list all files in the bucket, which triggers the security warning.

DROP POLICY IF EXISTS "Avatar images are accessible by authenticated users" ON storage.objects;
