
import React, { useState, useEffect } from 'react';
import { Truck, Phone, User, Loader2, X, Save, Edit2, Coins, Wallet, ArrowUpRight, CheckCircle2, AlertCircle } from 'lucide-react';
import { supabase } from '../supabase';
import { Transport as TransportType } from '../types';
import { CURRENCY } from '../constants';

const Transport: React.FC = () => {
  const [transports, setTransports] = useState<TransportType[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedDriverForPayment, setSelectedDriverForPayment] = useState<TransportType | null>(null);

  const [formData, setFormData] = useState({
    driverName: '',
    vehicleType: '',
    phone: '',
    status: 'نشط'
  });

  const [paymentData, setPaymentData] = useState({
    amount: 0,
    date: new Date().toISOString().split('T')[0],
    notes: ''
  });

  useEffect(() => {
    fetchTransports();
  }, []);

  async function fetchTransports() {
    try {
      setLoading(true);
      const { data, error } = await supabase.from('transports').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      
      const mapped = data.map((t: any) => ({
        id: t.id,
        driverName: t.driver_name,
        vehicleType: t.vehicle_type,
        phone: t.phone,
        balance: t.balance || 0,
        status: t.status
      }));
      setTransports(mapped);
    } catch (error) {
      console.error('Error fetching transports:', error);
    } finally {
      setLoading(false);
    }
  }

  const handleSaveTransport = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        driver_name: formData.driverName,
        vehicle_type: formData.vehicleType,
        phone: formData.phone,
        status: formData.status
      };

      if (editingId) {
        await supabase.from('transports').update(payload).eq('id', editingId);
      } else {
        await supabase.from('transports').insert([payload]);
      }
      closeModal();
      fetchTransports();
    } catch (err) {
      alert('خطأ في حفظ البيانات');
    } finally {
      setSaving(false);
    }
  };

  const openPaymentModal = (driver: TransportType) => {
    setSelectedDriverForPayment(driver);
    setPaymentData({ amount: 0, date: new Date().toISOString().split('T')[0], notes: '' });
    setIsPaymentModalOpen(true);
  };

  const handleSavePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDriverForPayment) return;
    setSaving(true);
    try {
      // 1. تسجيل المصروف في جدول المالية
      await supabase.from('transactions').insert([{
        description: `سداد مستحقات نقل: ${selectedDriverForPayment.driverName}`,
        amount: paymentData.amount,
        type: 'expense',
        category: 'نقل وتوصيل',
        date: paymentData.date,
        method: 'نقدي'
      }]);

      // 2. تحديث رصيد الناقل (خصم المبلغ من المستحق له)
      const newBalance = (selectedDriverForPayment.balance || 0) - paymentData.amount;
      await supabase.from('transports').update({ balance: newBalance }).eq('id', selectedDriverForPayment.id);

      setIsPaymentModalOpen(false);
      fetchTransports();
      alert('تم تسجيل عملية الصرف وتحديث رصيد الناقل.');
    } catch (err) {
      alert('خطأ في تسجيل عملية الصرف');
    } finally {
      setSaving(false);
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setFormData({ driverName: '', vehicleType: '', phone: '', status: 'نشط' });
    setEditingId(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
        <div>
           <h2 className="text-2xl font-black text-slate-800">إدارة الناقلين والحسابات</h2>
           <p className="text-slate-400 text-sm">متابعة حسابات الأشخاص (المقاولين) المسؤولين عن التوصيل</p>
        </div>
        <button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-bold shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-all">
          <Truck size={18} /> إضافة ناقل جديد
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-between">
           <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1">إجمالي المستحقات للناقلين</p>
           <p className="text-3xl font-black text-red-600 tracking-tight">
             {transports.reduce((s, t) => s + (t.balance || 0), 0).toLocaleString()} <span className="text-sm font-normal">{CURRENCY}</span>
           </p>
           <div className="mt-4 flex items-center gap-2 text-[10px] text-red-400 font-bold bg-red-50 p-2 rounded-lg">
             <AlertCircle size={14} /> ديون مستحقة للغير
           </div>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-between">
           <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1">الناقلين النشطين</p>
           <p className="text-3xl font-black text-blue-600 tracking-tight">{transports.filter(t => t.status === 'نشط').length}</p>
           <div className="mt-4 flex items-center gap-2 text-[10px] text-blue-400 font-bold bg-blue-50 p-2 rounded-lg">
             <CheckCircle2 size={14} /> متوفر للعمل
           </div>
        </div>
        <div className="bg-slate-900 p-6 rounded-3xl shadow-xl shadow-slate-900/20 flex flex-col justify-between relative overflow-hidden">
           <div className="relative z-10 text-white">
              <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1">إدارة السيولة</p>
              <p className="text-xl font-bold tracking-tight">تتبع دفعات السائقين</p>
           </div>
           <Wallet className="absolute right-[-10px] bottom-[-10px] text-white/10" size={100} />
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden min-h-[400px]">
        {loading ? <div className="p-20 flex justify-center"><Loader2 className="animate-spin text-blue-600" size={32} /></div> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-right">
              <thead className="bg-slate-50 text-slate-500 font-bold text-[10px] uppercase border-b border-slate-100">
                <tr>
                  <th className="px-6 py-4">الناقل / السائق</th>
                  <th className="px-6 py-4">المركبة</th>
                  <th className="px-6 py-4">الهاتف</th>
                  <th className="px-6 py-4">الرصيد المالي (لنا/عليه)</th>
                  <th className="px-6 py-4 text-center">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {transports.map(t => (
                  <tr key={t.id} className="hover:bg-slate-50 transition-all group">
                    <td className="px-6 py-4 font-black text-slate-800 flex items-center gap-3">
                       <div className="w-10 h-10 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-blue-100 group-hover:text-blue-600 transition-colors">
                         <User size={18}/>
                       </div>
                       {t.driverName}
                    </td>
                    <td className="px-6 py-4 text-slate-500 font-bold">{t.vehicleType}</td>
                    <td className="px-6 py-4 font-mono text-xs">{t.phone}</td>
                    <td className="px-6 py-4">
                       <span className={`px-4 py-1.5 rounded-xl font-black text-xs inline-block ${
                         t.balance > 0 ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'
                       }`}>
                         {t.balance > 0 ? `له: ${t.balance.toLocaleString()}` : `خالص`} {CURRENCY}
                       </span>
                    </td>
                    <td className="px-6 py-4">
                       <div className="flex justify-center gap-2">
                          <button onClick={() => openPaymentModal(t)} className="px-4 py-2 bg-slate-800 text-white rounded-xl text-[10px] font-bold hover:bg-black transition-all flex items-center gap-2">
                             <Coins size={14}/> دفع مستحقات
                          </button>
                          <button onClick={() => { setFormData({ driverName: t.driverName, vehicleType: t.vehicleType, phone: t.phone, status: t.status }); setEditingId(t.id); setIsModalOpen(true); }} className="p-2.5 text-slate-300 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all">
                            <Edit2 size={16}/>
                          </button>
                       </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-[40px] shadow-2xl overflow-hidden p-8 animate-in zoom-in duration-200">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-xl font-black text-slate-800">{editingId ? 'تعديل بيانات الناقل' : 'إضافة ناقل جديد'}</h3>
              <button onClick={closeModal} className="p-2 text-slate-400 hover:bg-slate-50 rounded-xl"><X size={20}/></button>
            </div>
            <form onSubmit={handleSaveTransport} className="space-y-5">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mr-1">اسم السائق / المقاول</label>
                <input required className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-bold" value={formData.driverName} onChange={e => setFormData({...formData, driverName: e.target.value})} />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mr-1">نوع المركبة</label>
                <input required placeholder="مثال: شاحنة صغيرة J5" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-bold" value={formData.vehicleType} onChange={e => setFormData({...formData, vehicleType: e.target.value})} />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mr-1">رقم الهاتف</label>
                <input required className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-bold text-left" dir="ltr" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
              </div>
              <button disabled={saving} className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black shadow-xl shadow-blue-500/20 hover:bg-blue-700 transition-all flex items-center justify-center gap-3">
                {saving ? <Loader2 className="animate-spin"/> : <Save size={18}/>}
                حفظ البيانات
              </button>
            </form>
          </div>
        </div>
      )}

      {isPaymentModalOpen && selectedDriverForPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-sm rounded-[40px] shadow-2xl p-8 animate-in zoom-in duration-200 text-center">
            <div className="flex justify-between items-center mb-8">
               <div className="text-right">
                 <h3 className="font-black text-slate-800">صرف أجرة توصيل</h3>
                 <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">المستفيد: {selectedDriverForPayment.driverName}</p>
               </div>
               <button onClick={() => setIsPaymentModalOpen(false)} className="p-2 text-slate-400 hover:bg-slate-50 rounded-xl"><X size={20}/></button>
            </div>
            <form onSubmit={handleSavePayment} className="space-y-6">
              <div className="p-5 bg-red-50 rounded-3xl border border-red-100">
                 <p className="text-[10px] text-red-400 font-black uppercase tracking-widest mb-1">المستحق الحالي له</p>
                 <p className="text-2xl font-black text-red-600">{selectedDriverForPayment.balance.toLocaleString()} {CURRENCY}</p>
              </div>
              <div className="space-y-1 text-right">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mr-1">المبلغ المراد صرفه</label>
                <input type="number" required className="w-full p-5 bg-slate-50 border-2 border-slate-200 rounded-2xl text-2xl font-black text-center text-slate-800 outline-none focus:border-blue-500 transition-all" value={paymentData.amount} onChange={e => setPaymentData({...paymentData, amount: Number(e.target.value)})} />
              </div>
              <button disabled={saving} className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black shadow-xl shadow-slate-900/20 hover:bg-black transition-all flex justify-center items-center gap-3">
                {saving ? <Loader2 className="animate-spin"/> : <ArrowUpRight size={20}/>}
                تأكيد عملية الصرف
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Transport;
