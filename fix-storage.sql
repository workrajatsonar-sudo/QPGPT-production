-- Step 1: Make question-files bucket PUBLIC
UPDATE storage.buckets SET public = true WHERE id = 'question-files';

-- Step 2: Fix storage RLS (DROP first, then CREATE - IF NOT EXISTS is not valid for POLICY)
DROP POLICY IF EXISTS "Universal Storage Access" ON storage.objects;
CREATE POLICY "Universal Storage Access" ON storage.objects 
  FOR ALL TO public USING (true) WITH CHECK (true);

-- Step 3: Ensure app_settings table exists
CREATE TABLE IF NOT EXISTS public.app_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  platform_name text DEFAULT 'QPGPT',
  support_email text DEFAULT 'support@qpgpt.com',
  maintenance_mode boolean DEFAULT false,
  qpgpt_enabled boolean DEFAULT true,
  max_pdf_size_mb integer DEFAULT 50,
  allowed_file_types text[] DEFAULT ARRAY['pdf','docx'],
  theme text DEFAULT 'white',
  updated_at timestamptz DEFAULT now()
);

-- Step 4: Enable RLS on app_settings if not already
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- Step 5: Allow public access to app_settings
DROP POLICY IF EXISTS "Public Access Settings" ON app_settings;
CREATE POLICY "Public Access Settings" ON app_settings 
  FOR ALL TO public USING (true) WITH CHECK (true);

-- Step 6: Insert default row if none exists
INSERT INTO public.app_settings (platform_name) 
SELECT 'QPGPT' WHERE NOT EXISTS (SELECT 1 FROM public.app_settings);

-- Step 7: Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
