import { createClient } from '@supabase/supabase-js';

// استخدام القيم المباشرة لضمان عدم وجود أخطاء في متغيرات البيئة
const supabaseUrl = 'https://memkrezfsnyzyqaxbgcx.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1lbWtyZXpmc255enlxYXhiZ2N4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA2ODI4MTEsImV4cCI6MjA4NjI1ODgxMX0.2x_lFlJB5rmdmkSvDuBqpgBmFiGAH2exqbkKuIguT-E';
export const supabase = createClient(supabaseUrl, supabaseAnonKey);