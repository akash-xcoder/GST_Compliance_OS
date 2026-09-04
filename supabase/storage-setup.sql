-- ==============================================================================
-- GST Compliance OS - Supabase Storage Setup
-- Bucket: 'compliance-documents'
-- Row-Level Security (RLS) policies for multi-tenant CA firm document isolation
-- ==============================================================================

-- 1. Create the private storage bucket for compliance documents
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'compliance-documents',
  'compliance-documents',
  false,
  52428800, -- 50MB maximum file size
  ARRAY[
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', -- .xlsx
    'application/vnd.ms-excel', -- .xls
    'text/csv',
    'application/json',
    'image/jpeg',
    'image/png'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = 52428800;

-- 2. Enable Row-Level Security on storage.objects (if not already enabled)
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- 3. Drop existing policies on compliance-documents to ensure clean idempotent setup
DROP POLICY IF EXISTS "Firm isolation - SELECT compliance documents" ON storage.objects;
DROP POLICY IF EXISTS "Firm isolation - INSERT compliance documents" ON storage.objects;
DROP POLICY IF EXISTS "Firm isolation - UPDATE compliance documents" ON storage.objects;
DROP POLICY IF EXISTS "Firm isolation - DELETE compliance documents" ON storage.objects;

-- 4. SELECT Policy:
-- Authenticated users can only read/download objects stored under their firm's folder.
-- Path convention: {firm_id}/{client_id}/{period_year}/{period_month}/{filename}
CREATE POLICY "Firm isolation - SELECT compliance documents"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'compliance-documents'
  AND (storage.foldername(name))[1] IN (
    SELECT firm_id::text
    FROM public.firm_users
    WHERE user_id = auth.uid()
  )
);

-- 5. INSERT Policy:
-- Authenticated users can only upload files whose path starts with their firm_id.
CREATE POLICY "Firm isolation - INSERT compliance documents"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'compliance-documents'
  AND (storage.foldername(name))[1] IN (
    SELECT firm_id::text
    FROM public.firm_users
    WHERE user_id = auth.uid()
  )
);

-- 6. UPDATE Policy:
-- Authenticated users can only update objects within their firm's folder.
CREATE POLICY "Firm isolation - UPDATE compliance documents"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'compliance-documents'
  AND (storage.foldername(name))[1] IN (
    SELECT firm_id::text
    FROM public.firm_users
    WHERE user_id = auth.uid()
  )
);

-- 7. DELETE Policy:
-- Authenticated users can only delete objects within their firm's folder.
CREATE POLICY "Firm isolation - DELETE compliance documents"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'compliance-documents'
  AND (storage.foldername(name))[1] IN (
    SELECT firm_id::text
    FROM public.firm_users
    WHERE user_id = auth.uid()
  )
);
