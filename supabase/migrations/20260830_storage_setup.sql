-- ==============================================================================
-- HostelOps Supabase Storage Setup Migration
-- Configures buckets: `task-proofs` and `attendance-selfies`
-- ==============================================================================

-- 1. Insert Storage Buckets into storage.buckets table
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  (
    'task-proofs',
    'task-proofs',
    false, -- private bucket, accessed via signed URLs or authenticated RLS
    5242880, -- 5 MB
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
  ),
  (
    'attendance-selfies',
    'attendance-selfies',
    false, -- private bucket for employee privacy
    5242880, -- 5 MB
    ARRAY['image/jpeg', 'image/png', 'image/webp']
  )
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 2. Storage RLS Policies for task-proofs
CREATE POLICY "Authenticated users can upload task proof images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'task-proofs'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can view task proof images"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'task-proofs');

-- 3. Storage RLS Policies for attendance-selfies
CREATE POLICY "Staff can upload attendance selfie"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'attendance-selfies'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Relevant users can view attendance selfies"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'attendance-selfies'
  AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR (SELECT role FROM public.users WHERE id = auth.uid()) IN ('owner', 'manager')
  )
);
