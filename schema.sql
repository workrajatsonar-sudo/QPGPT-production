
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==========================================
-- 1. PERMISSIONS & CLEANUP
-- ==========================================
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT USAGE ON SCHEMA storage TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA storage TO postgres, anon, authenticated, service_role;

-- ==========================================
-- 2. TABLE DEFINITIONS
-- ==========================================

-- 0. Custom Users Table (Source of Truth for this App Architecture)
CREATE TABLE IF NOT EXISTS public.users (
  id uuid primary key default uuid_generate_v4(),
  full_name text,
  display_name text,
  username text unique,
  email text unique not null,
  password text not null,
  role text CHECK (role IN ('student', 'teacher', 'admin')) NOT NULL DEFAULT 'student',
  grade_year text,
  level_of_study text,
  course_stream text,
  subjects_of_interest text[],
  exam_type text,
  status text default 'active' CHECK (status IN ('active', 'disabled')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Force add columns if they don't exist (migrations)
DO $$ BEGIN
    ALTER TABLE public.users ADD COLUMN IF NOT EXISTS display_name text;
    ALTER TABLE public.users ADD COLUMN IF NOT EXISTS level_of_study text;
    ALTER TABLE public.users ADD COLUMN IF NOT EXISTS subjects_of_interest text[];
    ALTER TABLE public.users ADD COLUMN IF NOT EXISTS exam_type text;
EXCEPTION WHEN duplicate_column THEN RAISE NOTICE 'column already exists';
END $$;

-- 11. Teacher Applications
CREATE TABLE IF NOT EXISTS public.teacher_applications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    full_name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT NOT NULL,
    institution_name TEXT NOT NULL,
    institution_address TEXT NOT NULL,
    subject_specialization TEXT NOT NULL,
    experience_years INTEGER NOT NULL,
    profile_photo_path TEXT,
    id_card_path TEXT,
    verification_video_path TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    
    -- ARCHITECTURE FIX: Reference public.users because Auth.tsx uses public.users
    -- SAFETY FIX: ON DELETE SET NULL prevents crashes if the Admin user is ever deleted
    reviewed_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    
    reviewed_at TIMESTAMP WITH TIME ZONE,
    rejection_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Other Tables
CREATE TABLE IF NOT EXISTS standards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS subjects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    standard_id UUID REFERENCES standards(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS mediums (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS chapters (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE,
    standard_id UUID REFERENCES standards(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS files (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    description TEXT,
    file_path TEXT NOT NULL,
    file_type TEXT NOT NULL,
    size_kb INTEGER,
    uploaded_by UUID REFERENCES public.users(id),
    standard_id UUID REFERENCES standards(id),
    subject_id UUID REFERENCES subjects(id),
    medium_id UUID REFERENCES mediums(id),
    chapter_id UUID REFERENCES chapters(id),
    year INTEGER,
    type TEXT,
    visibility TEXT DEFAULT 'public',
    approval_status TEXT DEFAULT 'pending',
    approved_by UUID REFERENCES public.users(id),
    approved_at TIMESTAMP WITH TIME ZONE,
    is_seen BOOLEAN DEFAULT false,
    seen_at TIMESTAMP WITH TIME ZONE,
    source TEXT DEFAULT 'upload',
    admin_feedback TEXT,
    download_count INTEGER DEFAULT 0,
    search_text tsvector,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS generated_papers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    generated_by UUID REFERENCES public.users(id),
    standard_id UUID REFERENCES standards(id),
    subject_id UUID REFERENCES subjects(id),
    approval_status TEXT DEFAULT 'pending',
    admin_feedback TEXT,
    content_json JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS search_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    query TEXT,
    user_id UUID REFERENCES public.users(id),
    filters_json JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS download_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    file_id UUID REFERENCES files(id),
    user_id UUID REFERENCES public.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS admin_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    admin_id UUID REFERENCES public.users(id),
    action_type TEXT NOT NULL,
    target_type TEXT NOT NULL,
    target_id UUID,
    target_key TEXT,
    details TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id),
    title TEXT,
    message TEXT NOT NULL,
    type TEXT DEFAULT 'info',
    is_read BOOLEAN DEFAULT false,
    link TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.app_settings (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  platform_name text DEFAULT 'QPGPT',
  support_email text DEFAULT 'support@qbank.pro',
  maintenance_mode boolean DEFAULT false,
  generator_strict_mode boolean DEFAULT true,
  max_questions integer DEFAULT 50,
  allow_pdf_input boolean DEFAULT true,
  allow_text_input boolean DEFAULT true,
  qpgpt_enabled boolean DEFAULT true,
  qpgpt_auto_suggest_upload boolean DEFAULT true,
  qpgpt_search_scope text DEFAULT 'approved_only',
  generator_requires_approval boolean DEFAULT true,
  auto_publish_admin_generated boolean DEFAULT true,
  max_pdf_size_mb integer DEFAULT 50,
  allowed_file_types text[] DEFAULT ARRAY['pdf','docx'],
  theme text DEFAULT 'white',
  updated_by uuid REFERENCES public.users(id),
  updated_at timestamptz DEFAULT now()
);
INSERT INTO public.app_settings (platform_name) SELECT 'QPGPT' WHERE NOT EXISTS (SELECT 1 FROM public.app_settings);

CREATE TABLE IF NOT EXISTS public.contact_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    subject TEXT,
    message TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Seed Data
INSERT INTO mediums (name) VALUES ('English'), ('Hindi'), ('Gujarati') ON CONFLICT (name) DO NOTHING;
INSERT INTO public.users (email, password, role, full_name, username) 
VALUES ('admin@qbank.pro', 'admin123', 'admin', 'System Admin', 'admin')
ON CONFLICT (email) DO UPDATE SET password = 'admin123', role = 'admin';

-- ==========================================
-- 3. RLS POLICIES (UNIVERSAL FIX)
-- ==========================================

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE teacher_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE standards ENABLE ROW LEVEL SECURITY;
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE mediums ENABLE ROW LEVEL SECURITY;
ALTER TABLE chapters ENABLE ROW LEVEL SECURITY;
ALTER TABLE files ENABLE ROW LEVEL SECURITY;
ALTER TABLE generated_papers ENABLE ROW LEVEL SECURITY;
ALTER TABLE search_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE download_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_messages ENABLE ROW LEVEL SECURITY;

-- CLEANUP: Drop all old policies to prevent conflicts
DO $$ 
DECLARE 
    pol record; 
BEGIN 
    FOR pol IN SELECT tablename, policyname FROM pg_policies WHERE schemaname = 'public'
    LOOP 
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, pol.tablename); 
    END LOOP; 
END $$;

-- PERMISSIVE POLICIES (Since we use Custom Auth, we trust the 'public' role)
CREATE POLICY "Public Access Users" ON users FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "Public Access Teacher Apps" ON teacher_applications FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "Public Access Files" ON files FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "Public Access Standards" ON standards FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "Public Access Subjects" ON subjects FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "Public Access Mediums" ON mediums FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "Public Access Chapters" ON chapters FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "Public Access Papers" ON generated_papers FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "Public Access SearchLogs" ON search_logs FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "Public Access DL Logs" ON download_logs FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "Public Access Admin Logs" ON admin_logs FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "Public Access Notifs" ON notifications FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "Public Access Settings" ON app_settings FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "Public Access Contact" ON contact_messages FOR ALL TO public USING (true) WITH CHECK (true);

-- ==========================================
-- 4. STORAGE POLICIES
-- ==========================================

INSERT INTO storage.buckets (id, name, public) VALUES ('question-files', 'question-files', true) ON CONFLICT (id) DO UPDATE SET public = true;
INSERT INTO storage.buckets (id, name, public) VALUES ('teacher-verification-docs', 'teacher-verification-docs', false) ON CONFLICT (id) DO UPDATE SET public = false;

DO $$ 
DECLARE 
    pol record; 
BEGIN 
    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'objects' AND schemaname = 'storage'
    LOOP 
        EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', pol.policyname); 
    END LOOP; 
END $$;

-- Allow universal access to storage (Controlled by App Logic)
CREATE POLICY "Universal Storage Access" ON storage.objects FOR ALL TO public USING (true) WITH CHECK (true);

NOTIFY pgrst, 'reload schema';
