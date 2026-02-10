
import React, { useState } from 'react';
import { supabase } from '../supabase';
import { LogIn, UserPlus, Mail, Lock, Loader2, Warehouse, AlertCircle, CheckCircle2, User } from 'lucide-react';

const Auth: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      if (isSignUp) {
        if (!fullName.trim()) throw new Error('يرجى إدخال الاسم الكامل');

        // إنشاء حساب جديد مع تمرير البيانات الوصفية (metadata)
        const { data, error: signUpError } = await supabase.auth.signUp({ 
          email, 
          password,
          options: {
            data: {
              full_name: fullName,
              avatar_url: `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName)}&background=fbbf24&color=000`
            }
          }
        });
        
        if (signUpError) throw signUpError;

        if (data.session) {
          setSuccess('تم إنشاء الحساب وتسجيل الدخول بنجاح!');
        } else {
          setSuccess('تم إنشاء الحساب بنجاح! يرجى التحقق من بريدك الإلكتروني لتأكيد الحساب.');
          setIsSignUp(false);
        }
      } else {
        // تسجيل الدخول
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) throw signInError;
      }
    } catch (err: any) {
      console.error("Auth Error:", err);
      let message = err.message || 'حدث خطأ غير متوقع';
      
      // ترجمة الأخطاء الشائعة
      if (message.includes('Invalid login credentials')) message = 'البريد الإلكتروني أو كلمة المرور غير صحيحة';
      else if (message.includes('User already registered')) message = 'هذا البريد الإلكتروني مسجل مسبقاً، حاول تسجيل الدخول';
      else if (message.includes('Password should be')) message = 'يجب أن تكون كلمة المرور 6 أحرف على الأقل';
      else if (message.includes('Email not confirmed')) message = 'عنوان البريد الإلكتروني لم يتم تأكيده بعد. تحقق من بريدك الوارد.';
      else if (message.includes('is invalid')) message = 'البريد الإلكتروني المدخل غير صالح';
      else if (message.includes('rate limit exceeded')) message = 'تجاوزت الحد المسموح من المحاولات، يرجى الانتظار قليلاً';

      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4 relative overflow-hidden" dir="rtl">
      {/* Background Decor */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-yellow-500/10 rounded-full blur-[100px]"></div>
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-yellow-500/5 rounded-full blur-[100px]"></div>

      <div className="max-w-md w-full bg-white rounded-[40px] shadow-2xl overflow-hidden relative z-10">
        <div className="bg-yellow-400 h-2 w-full"></div>
        <div className="p-10">
          <div className="flex justify-center mb-8">
            <div className="w-20 h-20 bg-black rounded-2xl flex items-center justify-center shadow-xl shadow-black/20 transform rotate-3 hover:rotate-0 transition-transform duration-500">
              <Warehouse size={40} className="text-yellow-400" />
            </div>
          </div>
          
          <div className="text-center mb-8">
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Windoor</h1>
            <p className="text-slate-400 text-sm mt-2 font-bold">
              {isSignUp ? 'انضم إلى نظام إدارة النجارة الاحترافي' : 'سجل دخولك للمتابعة'}
            </p>
          </div>

          <form onSubmit={handleAuth} className="space-y-5">
            {error && (
              <div className="bg-red-50 text-red-700 p-4 rounded-xl text-xs font-bold border border-red-100 flex items-start gap-2 animate-in slide-in-from-top-2">
                <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {success && (
              <div className="bg-green-50 text-green-700 p-4 rounded-xl text-xs font-bold border border-green-100 flex items-start gap-2 animate-in slide-in-from-top-2">
                <CheckCircle2 size={16} className="flex-shrink-0 mt-0.5" />
                <span>{success}</span>
              </div>
            )}

            {isSignUp && (
              <div className="space-y-1 animate-in slide-in-from-top-2 fade-in duration-300">
                <label className="text-xs font-black text-slate-400 mr-1 uppercase tracking-wider">الاسم الكامل</label>
                <div className="relative group">
                  <User className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-yellow-500 transition-colors" size={20} />
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full pr-12 pl-4 py-4 bg-slate-50 border-2 border-transparent focus:border-yellow-400 rounded-2xl outline-none font-bold text-slate-800 placeholder:text-slate-300 text-sm transition-all"
                    placeholder="اسم المؤسسة أو الشخص"
                  />
                </div>
              </div>
            )}

            <div className="space-y-1">
              <label className="text-xs font-black text-slate-400 mr-1 uppercase tracking-wider">البريد الإلكتروني</label>
              <div className="relative group">
                <Mail className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-yellow-500 transition-colors" size={20} />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pr-12 pl-4 py-4 bg-slate-50 border-2 border-transparent focus:border-yellow-400 rounded-2xl outline-none font-bold text-slate-800 placeholder:text-slate-300 text-sm transition-all"
                  placeholder="admin@windoor.dz"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-black text-slate-400 mr-1 uppercase tracking-wider">كلمة المرور</label>
              <div className="relative group">
                <Lock className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-yellow-500 transition-colors" size={20} />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pr-12 pl-4 py-4 bg-slate-50 border-2 border-transparent focus:border-yellow-400 rounded-2xl outline-none font-bold text-slate-800 placeholder:text-slate-300 text-sm transition-all"
                  placeholder="••••••••"
                  minLength={6}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-yellow-400 text-black rounded-2xl font-black text-lg shadow-lg shadow-yellow-400/30 hover:bg-yellow-500 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 mt-6 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <Loader2 className="animate-spin" size={24} />
              ) : isSignUp ? (
                <>
                  <UserPlus size={22} />
                  إنشاء حساب
                </>
              ) : (
                <>
                  <LogIn size={22} />
                  دخول
                </>
              )}
            </button>
          </form>

          <div className="mt-8 text-center pt-6 border-t border-slate-50">
            <button
              onClick={() => {
                setIsSignUp(!isSignUp);
                setError(null);
                setSuccess(null);
                setFullName('');
              }}
              className="text-sm font-bold text-slate-500 hover:text-yellow-600 transition-colors"
            >
              {isSignUp ? 'لديك حساب بالفعل؟ سجل دخولك' : 'جديد في Windoor؟ أنشئ حساباً'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;
