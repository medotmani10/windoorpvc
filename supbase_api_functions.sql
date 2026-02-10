
-- ================================================================
-- دوال API مخصصة لـ n8n (Supabase RPC)
-- قم بتشغيل هذا الكود في SQL Editor في لوحة تحكم Supabase
-- ================================================================

-- 1. دالة: جلب ملخص يومي (لإرساله في تقرير عبر تليجرام أو إيميل عبر n8n)
CREATE OR REPLACE FUNCTION get_daily_summary()
RETURNS JSON AS $$
DECLARE
    today_income DECIMAL;
    today_expense DECIMAL;
    active_projects_count INT;
    new_clients_count INT;
BEGIN
    -- حساب إيرادات اليوم
    SELECT COALESCE(SUM(amount), 0) INTO today_income
    FROM public.transactions
    WHERE type = 'income' AND date::DATE = CURRENT_DATE;

    -- حساب مصروفات اليوم
    SELECT COALESCE(SUM(amount), 0) INTO today_expense
    FROM public.transactions
    WHERE type = 'expense' AND date::DATE = CURRENT_DATE;

    -- عدد المشاريع النشطة
    SELECT COUNT(*) INTO active_projects_count
    FROM public.projects
    WHERE status = 'نشط';

    -- عدد العملاء الجدد اليوم
    SELECT COUNT(*) INTO new_clients_count
    FROM public.clients
    WHERE created_at::DATE = CURRENT_DATE;

    -- إرجاع النتيجة كـ JSON
    RETURN json_build_object(
        'date', CURRENT_DATE,
        'income', today_income,
        'expense', today_expense,
        'net_profit', today_income - today_expense,
        'active_projects', active_projects_count,
        'new_clients', new_clients_count
    );
END;
$$ LANGUAGE plpgsql;

-- 2. دالة: تسجيل دفعة سريعة (مثلاً من Google Forms أو Chatbot)
CREATE OR REPLACE FUNCTION quick_add_transaction(
    p_description TEXT,
    p_amount DECIMAL,
    p_type TEXT, -- 'income' or 'expense'
    p_method TEXT DEFAULT 'آلي'
)
RETURNS JSON AS $$
DECLARE
    new_id UUID;
BEGIN
    INSERT INTO public.transactions (description, amount, type, method, date, status)
    VALUES (p_description, p_amount, p_type, p_method, NOW(), 'مكتمل')
    RETURNING id INTO new_id;

    RETURN json_build_object('success', true, 'id', new_id, 'message', 'تمت الإضافة بنجاح');
END;
$$ LANGUAGE plpgsql;

-- 3. دالة: جلب قائمة ديون العملاء (للتذكير الآلي)
CREATE OR REPLACE FUNCTION get_clients_debt_report()
RETURNS TABLE (
    client_name TEXT,
    phone TEXT,
    total_invoiced DECIMAL,
    total_paid DECIMAL,
    remaining_debt DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.name,
        c.phone,
        COALESCE(SUM(i.total), 0) as total_invoiced,
        COALESCE((SELECT SUM(t.amount) FROM transactions t WHERE t.client_id = c.id AND t.type = 'income'), 0) as total_paid,
        (COALESCE(SUM(i.total), 0) - COALESCE((SELECT SUM(t.amount) FROM transactions t WHERE t.client_id = c.id AND t.type = 'income'), 0)) as remaining_debt
    FROM clients c
    LEFT JOIN invoices i ON c.id = i.client_id
    GROUP BY c.id, c.name, c.phone
    HAVING (COALESCE(SUM(i.total), 0) - COALESCE((SELECT SUM(t.amount) FROM transactions t WHERE t.client_id = c.id AND t.type = 'income'), 0)) > 0;
END;
$$ LANGUAGE plpgsql;
