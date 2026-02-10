
-- ==========================================
-- نظام إدارة نجارة الألمنيوم و PVC - Schema
-- ==========================================

-- 1. الجداول الأساسية للمستخدمين والملفات الشخصية
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT,
  avatar_url TEXT,
  role TEXT DEFAULT 'مدير',
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. إعدادات النظام (المؤسسة)
CREATE TABLE IF NOT EXISTS public.settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_name TEXT DEFAULT 'Windoor',
  logo_url TEXT,
  address TEXT,
  phone TEXT,
  email TEXT,
  tax_id TEXT,
  footer_text TEXT,
  user_id UUID REFERENCES auth.users DEFAULT auth.uid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. العملاء (مع التصنيف)
CREATE TABLE IF NOT EXISTS public.clients (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  address TEXT,
  category TEXT DEFAULT 'عادي', -- VIP, عادي, جديد
  notes TEXT,
  total_projects INTEGER DEFAULT 0,
  total_debt DECIMAL(12,2) DEFAULT 0,
  user_id UUID REFERENCES auth.users DEFAULT auth.uid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. المخزون والمواد الخام (Aluminum, PVC, Glass, Accessories)
CREATE TABLE IF NOT EXISTS public.materials (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL, -- مثال: بروفيل 40 أبيض، زجاج 6ملم
  category TEXT NOT NULL, -- profile_alu, profile_pvc, glass, accessory, rubber
  unit TEXT NOT NULL, -- bar (6m), m2, piece, roll
  quantity DECIMAL(10,2) DEFAULT 0, -- الكمية الحالية
  min_quantity DECIMAL(10,2) DEFAULT 5, -- حد التنبيه
  cost_price DECIMAL(10,2) DEFAULT 0, -- سعر الشراء
  selling_price DECIMAL(10,2) DEFAULT 0, -- سعر البيع التقديري (للمتر أو القطعة)
  supplier TEXT,
  user_id UUID REFERENCES auth.users DEFAULT auth.uid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. المشاريع (ورش العمل)
CREATE TABLE IF NOT EXISTS public.projects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  client_name TEXT, -- للتسهيل
  status TEXT DEFAULT 'قيد التنفيذ', -- Devis, مؤكد, قيد القص, قيد التركيب, منتهي
  start_date DATE,
  delivery_date DATE,
  total_price DECIMAL(12,2) DEFAULT 0,
  paid_amount DECIMAL(12,2) DEFAULT 0,
  progress INTEGER DEFAULT 0,
  notes TEXT,
  budget DECIMAL(12,2) DEFAULT 0,
  expenses DECIMAL(12,2) DEFAULT 0,
  end_date DATE,
  user_id UUID REFERENCES auth.users DEFAULT auth.uid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. عروض الأسعار (Devis)
CREATE TABLE IF NOT EXISTS public.quotes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL, -- إذا تحول لمشروع
  date DATE DEFAULT CURRENT_DATE,
  valid_until DATE,
  status TEXT DEFAULT 'مسودة', -- مسودة، مرسل، مقبول، مرفوض
  subtotal DECIMAL(12,2) DEFAULT 0,
  discount DECIMAL(12,2) DEFAULT 0,
  tax DECIMAL(12,2) DEFAULT 0,
  total DECIMAL(12,2) DEFAULT 0,
  notes TEXT,
  user_id UUID REFERENCES auth.users DEFAULT auth.uid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. تفاصيل عرض السعر (النوافذ والأبواب)
CREATE TABLE IF NOT EXISTS public.quote_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  quote_id UUID REFERENCES public.quotes(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- نافذة سحاب، باب فرنسي، فاست، ...
  profile_type TEXT, -- Alu, PVC
  color TEXT,
  width DECIMAL(10,2) NOT NULL, -- العرض (سم)
  height DECIMAL(10,2) NOT NULL, -- الارتفاع (سم)
  quantity INTEGER DEFAULT 1,
  glass_type TEXT, -- زجاج بسيط، مزدوج، عاكس
  unit_price DECIMAL(12,2) NOT NULL, -- السعر المحسوب للوحدة
  total_price DECIMAL(12,2) NOT NULL,
  description TEXT, -- تفاصيل إضافية
  image_url TEXT, -- صورة توضيحية للموديل
  user_id UUID REFERENCES auth.users DEFAULT auth.uid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. العمال والحضور
CREATE TABLE IF NOT EXISTS public.workers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  role TEXT, -- معلم قص، مساعد، تركيب
  trade TEXT,
  phone TEXT,
  daily_rate DECIMAL(10,2) DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  current_project TEXT,
  user_id UUID REFERENCES auth.users DEFAULT auth.uid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.attendance (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    worker_id UUID REFERENCES public.workers(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    morning BOOLEAN DEFAULT FALSE,
    evening BOOLEAN DEFAULT FALSE,
    status TEXT DEFAULT 'حاضر', 
    user_id UUID REFERENCES auth.users DEFAULT auth.uid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(worker_id, date)
);

CREATE TABLE IF NOT EXISTS public.worker_payments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    worker_id UUID REFERENCES public.workers(id) ON DELETE CASCADE,
    amount DECIMAL(12,2) DEFAULT 0,
    date DATE DEFAULT CURRENT_DATE,
    notes TEXT,
    user_id UUID REFERENCES auth.users DEFAULT auth.uid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 9. المشتريات
CREATE TABLE IF NOT EXISTS public.purchases (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    project_name TEXT,
    item TEXT,
    quantity TEXT,
    total DECIMAL(12,2) DEFAULT 0,
    supplier TEXT,
    status TEXT DEFAULT 'تم الطلب',
    date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    user_id UUID REFERENCES auth.users DEFAULT auth.uid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.suppliers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    phone TEXT,
    address TEXT,
    material_type TEXT,
    notes TEXT,
    user_id UUID REFERENCES auth.users DEFAULT auth.uid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 10. الفواتير
CREATE TABLE IF NOT EXISTS public.invoices (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
    type TEXT,
    amount DECIMAL(12,2) DEFAULT 0,
    tax DECIMAL(12,2) DEFAULT 0,
    total DECIMAL(12,2) DEFAULT 0,
    status TEXT DEFAULT 'معلقة',
    date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    due_date DATE,
    user_id UUID REFERENCES auth.users DEFAULT auth.uid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.invoice_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    invoice_id UUID REFERENCES public.invoices(id) ON DELETE CASCADE,
    description TEXT,
    unit TEXT,
    quantity DECIMAL(10,2),
    unit_price DECIMAL(10,2),
    total DECIMAL(12,2),
    user_id UUID REFERENCES auth.users DEFAULT auth.uid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 11. النقل
CREATE TABLE IF NOT EXISTS public.transports (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    vehicle_type TEXT,
    plate_number TEXT,
    driver_name TEXT,
    phone TEXT,
    status TEXT DEFAULT 'نشط',
    user_id UUID REFERENCES auth.users DEFAULT auth.uid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 12. المعاملات المالية
CREATE TABLE IF NOT EXISTS public.transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  description TEXT,
  amount DECIMAL(12,2) NOT NULL,
  type TEXT CHECK (type IN ('income', 'expense')),
  category TEXT, -- دفعة مقدمة، شراء مواد، رواتب
  method TEXT,
  status TEXT DEFAULT 'مكتمل',
  date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  user_id UUID REFERENCES auth.users DEFAULT auth.uid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================
-- إعدادات التخزين (Supabase Storage)
-- ==========================================

-- إنشاء Bucket لتخزين شعارات المؤسسة (إذا لم يكن موجوداً)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('app-assets', 'app-assets', true)
ON CONFLICT (id) DO NOTHING;

-- سياسة السماح برفع الملفات للمستخدمين المسجلين
CREATE POLICY "Allow authenticated uploads"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'app-assets');

-- سياسة السماح للجميع بعرض الملفات (للشعارات في الفواتير)
CREATE POLICY "Allow public view"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'app-assets');

-- سياسة السماح للمستخدمين بتحديث ملفاتهم
CREATE POLICY "Allow authenticated updates"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'app-assets');


-- تفعيل RLS (الأمان)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quote_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.worker_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- سياسات الأمان
DO $$ 
DECLARE
    t text;
BEGIN
    FOR t IN SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' 
             AND table_name IN ('settings', 'clients', 'materials', 'projects', 'quotes', 'quote_items', 'workers', 'attendance', 'worker_payments', 'purchases', 'suppliers', 'invoices', 'invoice_items', 'transports', 'transactions')
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I', 'owner_policy_' || t, t);
        EXECUTE format('CREATE POLICY %I ON %I FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)', 'owner_policy_' || t, t);
    END LOOP;
END $$;

-- سياسة البروفايل
DROP POLICY IF EXISTS "owner_policy_profiles" ON public.profiles;
CREATE POLICY "owner_policy_profiles" ON public.profiles FOR ALL TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- Trigger للمستخدم الجديد
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url, role)
  VALUES (new.id, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url', 'مدير')
  ON CONFLICT (id) DO NOTHING;
  
  -- إنشاء إعدادات افتراضية
  INSERT INTO public.settings (user_id, company_name) VALUES (new.id, 'Windoor');
  
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
