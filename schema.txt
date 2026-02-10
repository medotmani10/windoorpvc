-- ==========================================
-- نظام إدارة مشاريع البناء - Schema المتكاملة (نسخة الإصلاح)
-- ==========================================

-- 1. التأكد من وجود الجداول الأساسية
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT,
  avatar_url TEXT,
  role TEXT DEFAULT 'مدير',
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.clients (id UUID DEFAULT gen_random_uuid() PRIMARY KEY, name TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS public.projects (id UUID DEFAULT gen_random_uuid() PRIMARY KEY, name TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS public.workers (id UUID DEFAULT gen_random_uuid() PRIMARY KEY, name TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS public.invoices (id UUID DEFAULT gen_random_uuid() PRIMARY KEY);
CREATE TABLE IF NOT EXISTS public.invoice_items (id UUID DEFAULT gen_random_uuid() PRIMARY KEY);
CREATE TABLE IF NOT EXISTS public.purchases (id UUID DEFAULT gen_random_uuid() PRIMARY KEY);
CREATE TABLE IF NOT EXISTS public.transactions (id UUID DEFAULT gen_random_uuid() PRIMARY KEY, amount DECIMAL NOT NULL);

-- 2. دالة ذكية لإضافة الأعمدة المفقودة لضمان عدم حدوث خطأ "column does not exist"
DO $$ 
DECLARE
    t text;
BEGIN
    FOR t IN SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' 
             AND table_name IN ('clients', 'projects', 'workers', 'invoices', 'invoice_items', 'purchases', 'transactions')
    LOOP
        -- إضافة عمود user_id إذا كان مفقوداً
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = t AND column_name = 'user_id') THEN
            EXECUTE format('ALTER TABLE public.%I ADD COLUMN user_id UUID REFERENCES auth.users DEFAULT auth.uid()', t);
        END IF;
    END LOOP;
END $$;

-- 3. تحديث هيكلية الجداول (إضافة باقي الأعمدة إذا كانت مفقودة)
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS phone TEXT, ADD COLUMN IF NOT EXISTS email TEXT, ADD COLUMN IF NOT EXISTS address TEXT, ADD COLUMN IF NOT EXISTS total_projects INTEGER DEFAULT 0, ADD COLUMN IF NOT EXISTS total_debt DECIMAL(12,2) DEFAULT 0, ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS client TEXT, ADD COLUMN IF NOT EXISTS budget DECIMAL(12,2) DEFAULT 0, ADD COLUMN IF NOT EXISTS expenses DECIMAL(12,2) DEFAULT 0, ADD COLUMN IF NOT EXISTS progress INTEGER DEFAULT 0, ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'نشط', ADD COLUMN IF NOT EXISTS start_date DATE, ADD COLUMN IF NOT EXISTS end_date DATE, ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE public.workers ADD COLUMN IF NOT EXISTS trade TEXT, ADD COLUMN IF NOT EXISTS phone TEXT, ADD COLUMN IF NOT EXISTS daily_rate DECIMAL(10,2) DEFAULT 0, ADD COLUMN IF NOT EXISTS current_project TEXT, ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE, ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL, ADD COLUMN IF NOT EXISTS type TEXT CHECK (type IN ('شكلية', 'ضريبية')), ADD COLUMN IF NOT EXISTS amount DECIMAL(12,2) DEFAULT 0, ADD COLUMN IF NOT EXISTS tax DECIMAL(12,2) DEFAULT 0, ADD COLUMN IF NOT EXISTS total DECIMAL(12,2) DEFAULT 0, ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'معلقة', ADD COLUMN IF NOT EXISTS due_date DATE, ADD COLUMN IF NOT EXISTS date TIMESTAMP WITH TIME ZONE DEFAULT NOW(), ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE public.invoice_items ADD COLUMN IF NOT EXISTS invoice_id UUID REFERENCES public.invoices(id) ON DELETE CASCADE, ADD COLUMN IF NOT EXISTS description TEXT, ADD COLUMN IF NOT EXISTS unit TEXT, ADD COLUMN IF NOT EXISTS quantity DECIMAL(10,2), ADD COLUMN IF NOT EXISTS unit_price DECIMAL(10,2), ADD COLUMN IF NOT EXISTS total DECIMAL(12,2), ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE public.purchases ADD COLUMN IF NOT EXISTS project_name TEXT, ADD COLUMN IF NOT EXISTS item TEXT, ADD COLUMN IF NOT EXISTS quantity TEXT, ADD COLUMN IF NOT EXISTS total DECIMAL(12,2), ADD COLUMN IF NOT EXISTS supplier TEXT, ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'تم الطلب', ADD COLUMN IF NOT EXISTS date TIMESTAMP WITH TIME ZONE DEFAULT NOW(), ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS description TEXT, ADD COLUMN IF NOT EXISTS type TEXT CHECK (type IN ('income', 'expense')), ADD COLUMN IF NOT EXISTS method TEXT, ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'مكتمل', ADD COLUMN IF NOT EXISTS date TIMESTAMP WITH TIME ZONE DEFAULT NOW(), ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- 4. تفعيل RLS لجميع الجداول
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- 5. إعادة إنشاء سياسات الأمان بشكل نظيف
DO $$ 
DECLARE
    t text;
BEGIN
    FOR t IN SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' 
             AND table_name IN ('clients', 'projects', 'workers', 'invoices', 'invoice_items', 'purchases', 'transactions')
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I', 'owner_policy_' || t, t);
        EXECUTE format('CREATE POLICY %I ON %I FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)', 'owner_policy_' || t, t);
    END LOOP;
END $$;

-- سياسة خاصة بجدول Profiles
DROP POLICY IF EXISTS "owner_policy_profiles" ON public.profiles;
CREATE POLICY "owner_policy_profiles" ON public.profiles FOR ALL TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- 6. التلقائيات
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url, role)
  VALUES (new.id, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url', 'مدير')
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();