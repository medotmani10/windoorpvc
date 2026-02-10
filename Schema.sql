
-- ==========================================
-- نظام إدارة نجارة الألمنيوم و PVC - Schema (نسخة محدثة)
-- ==========================================

-- 1. الجداول الأساسية
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT,
  avatar_url TEXT,
  role TEXT DEFAULT 'مدير',
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

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

CREATE TABLE IF NOT EXISTS public.clients (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  address TEXT,
  category TEXT DEFAULT 'عادي',
  notes TEXT,
  total_projects INTEGER DEFAULT 0,
  total_debt DECIMAL(12,2) DEFAULT 0,
  user_id UUID REFERENCES auth.users DEFAULT auth.uid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.materials (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  unit TEXT NOT NULL,
  quantity DECIMAL(10,2) DEFAULT 0,
  min_quantity DECIMAL(10,2) DEFAULT 5,
  cost_price DECIMAL(10,2) DEFAULT 0,
  selling_price DECIMAL(10,2) DEFAULT 0,
  supplier TEXT,
  user_id UUID REFERENCES auth.users DEFAULT auth.uid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.projects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  client_name TEXT,
  status TEXT DEFAULT 'قيد التنفيذ',
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

CREATE TABLE IF NOT EXISTS public.quotes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  date DATE DEFAULT CURRENT_DATE,
  valid_until DATE,
  status TEXT DEFAULT 'مسودة',
  subtotal DECIMAL(12,2) DEFAULT 0,
  discount DECIMAL(12,2) DEFAULT 0,
  tax DECIMAL(12,2) DEFAULT 0,
  total DECIMAL(12,2) DEFAULT 0,
  notes TEXT,
  user_id UUID REFERENCES auth.users DEFAULT auth.uid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- تحديث جدول تفاصيل عرض السعر ليشمل جميع الحقول المحسوبة
CREATE TABLE IF NOT EXISTS public.quote_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  quote_id UUID REFERENCES public.quotes(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  profile_type TEXT,
  color TEXT,
  width DECIMAL(10,2) NOT NULL,
  height DECIMAL(10,2) NOT NULL,
  quantity INTEGER DEFAULT 1,
  glass_type TEXT,
  material_price DECIMAL(12,2) DEFAULT 0,
  accessory_price DECIMAL(12,2) DEFAULT 0,
  fabrication_price DECIMAL(12,2) DEFAULT 0,
  transport_price DECIMAL(12,2) DEFAULT 0,
  installation_price DECIMAL(12,2) DEFAULT 0,
  unit_price DECIMAL(12,2) NOT NULL,
  total_price DECIMAL(12,2) NOT NULL,
  description TEXT,
  user_id UUID REFERENCES auth.users DEFAULT auth.uid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ... باقي الجداول (Workers, Attendance, etc.)
CREATE TABLE IF NOT EXISTS public.workers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
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
    user_id UUID REFERENCES auth.users DEFAULT auth.uid(),
    UNIQUE(worker_id, date)
);

CREATE TABLE IF NOT EXISTS public.worker_payments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    worker_id UUID REFERENCES public.workers(id) ON DELETE CASCADE,
    amount DECIMAL(12,2) DEFAULT 0,
    date DATE DEFAULT CURRENT_DATE,
    notes TEXT,
    user_id UUID REFERENCES auth.users DEFAULT auth.uid()
);

CREATE TABLE IF NOT EXISTS public.purchases (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    project_name TEXT,
    item TEXT,
    quantity TEXT,
    total DECIMAL(12,2) DEFAULT 0,
    supplier TEXT,
    status TEXT DEFAULT 'تم الطلب',
    date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    user_id UUID REFERENCES auth.users DEFAULT auth.uid()
);

CREATE TABLE IF NOT EXISTS public.suppliers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    phone TEXT,
    address TEXT,
    material_type TEXT,
    notes TEXT,
    user_id UUID REFERENCES auth.users DEFAULT auth.uid()
);

CREATE TABLE IF NOT EXISTS public.invoices (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
    type TEXT,
    amount DECIMAL(12,2) DEFAULT 0,
    tax DECIMAL(12,2) DEFAULT 0,
    total DECIMAL(12,2) DEFAULT 0,
    status TEXT DEFAULT 'معلقة',
    date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    user_id UUID REFERENCES auth.users DEFAULT auth.uid()
);

CREATE TABLE IF NOT EXISTS public.invoice_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    invoice_id UUID REFERENCES public.invoices(id) ON DELETE CASCADE,
    description TEXT,
    unit TEXT,
    quantity DECIMAL(10,2),
    unit_price DECIMAL(10,2),
    total DECIMAL(12,2),
    user_id UUID REFERENCES auth.users DEFAULT auth.uid()
);

CREATE TABLE IF NOT EXISTS public.transports (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    driver_name TEXT,
    vehicle_type TEXT,
    phone TEXT,
    balance DECIMAL(12,2) DEFAULT 0,
    status TEXT DEFAULT 'نشط',
    user_id UUID REFERENCES auth.users DEFAULT auth.uid()
);

CREATE TABLE IF NOT EXISTS public.transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  description TEXT,
  amount DECIMAL(12,2) NOT NULL,
  type TEXT CHECK (type IN ('income', 'expense')),
  category TEXT,
  method TEXT,
  date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  user_id UUID REFERENCES auth.users DEFAULT auth.uid()
);

-- تفعيل RLS لجميع الجداول
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
