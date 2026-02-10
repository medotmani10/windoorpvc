
import React, { useEffect, useState } from 'react';
import { UserPlus, HardHat, Loader2, X, Save, Edit2, Trash2, CalendarCheck, Coins, ArrowUpRight, Calendar } from 'lucide-react';
import { supabase } from '../supabase';
import { Worker, Attendance, WorkerPayment } from '../types';
import { CURRENCY } from '../constants';

const Workers: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'list' | 'attendance' | 'finance'>('list');
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [projects, setProjects] = useState<any[]>([]); // These will now be "Orders"
  const [attendanceData, setAttendanceData] = useState<Attendance[]>([]);
  const [payments, setPayments] = useState<WorkerPayment[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedWorkerForPayment, setSelectedWorkerForPayment] = useState<Worker | null>(null);

  const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().split('T')[0]);

  const initialFormState = {
    name: '',
    trade: '',
    phone: '',
    daily_rate: 0,
    current_project: ''
  };
  const [formData, setFormData] = useState(initialFormState);
  
  const [paymentData, setPaymentData] = useState({
    amount: 0,
    date: new Date().toISOString().split('T')[0],
    notes: ''
  });

  useEffect(() => {
    fetchAllData();
  }, []);

  async function fetchAllData() {
    try {
      setLoading(true);
      const { data: workersData, error: wError } = await supabase.from('workers').select('*').order('name');
      if (wError) throw wError;

      const { data: projectsData, error: pError } = await supabase.from('projects').select('id, name').order('created_at', { ascending: false });
      if (pError) throw pError;
      if (projectsData) setProjects(projectsData);

      const { data: attData, error: aError } = await supabase.from('attendance').select('*');
      if (aError) throw aError;

      const { data: payData, error: payError } = await supabase.from('worker_payments').select('*');
      if (payError) throw payError;

      const processedWorkers: Worker[] = workersData.map((w: any) => {
        const workerAtt = attData.filter((a: any) => a.worker_id === w.id);
        const totalDaysWorked = workerAtt.reduce((sum: number, a: any) => {
          let dayVal = 0;
          if (a.morning) dayVal += 0.5;
          if (a.evening) dayVal += 0.5;
          return sum + dayVal;
        }, 0);

        const totalEarned = totalDaysWorked * (w.daily_rate || 0);
        const workerPayments = payData.filter((p: any) => p.worker_id === w.id);
        const totalPaid = workerPayments.reduce((sum: number, p: any) => sum + Number(p.amount), 0);

        return {
          id: w.id,
          name: w.name,
          trade: w.trade,
          phone: w.phone,
          dailyRate: w.daily_rate,
          currentProject: w.current_project,
          isActive: w.is_active,
          totalDaysWorked,
          totalEarned,
          totalPaid,
          balance: totalEarned - totalPaid
        };
      });

      setWorkers(processedWorkers);
      setAttendanceData(attData.map((a: any) => ({
        id: a.id,
        workerId: a.worker_id,
        date: a.date,
        morning: a.morning,
        evening: a.evening
      })));
      setPayments(payData);

    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  }

  const handleSaveWorker = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingId) {
        const { error } = await supabase.from('workers').update(formData).eq('id', editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('workers').insert([formData]);
        if (error) throw error;
      }
      setIsModalOpen(false);
      setFormData(initialFormState);
      setEditingId(null);
      fetchAllData();
    } catch (err) {
      alert('خطأ في حفظ بيانات العامل');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا العامل؟')) return;
    try {
      const { error } = await supabase.from('workers').delete().eq('id', id);
      if (error) throw error;
      fetchAllData();
    } catch (error) {
      alert('فشل حذف العامل');
    }
  };

  const handleEdit = (worker: Worker) => {
    setFormData({
      name: worker.name,
      trade: worker.trade,
      phone: worker.phone,
      daily_rate: worker.dailyRate,
      current_project: worker.currentProject || ''
    });
    setEditingId(worker.id);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setFormData(initialFormState);
    setEditingId(null);
  };

  const toggleAttendance = async (workerId: string, type: 'morning' | 'evening', currentValue: boolean) => {
    try {
      const existingRecord = attendanceData.find(a => a.workerId === workerId && a.date === attendanceDate);

      if (existingRecord) {
        const updatePayload = type === 'morning' ? { morning: !currentValue } : { evening: !currentValue };
        const { error } = await supabase
          .from('attendance')
          .update(updatePayload)
          .eq('id', existingRecord.id);
        if (error) throw error;
      } else {
        const insertPayload = {
          worker_id: workerId,
          date: attendanceDate,
          morning: type === 'morning',
          evening: type === 'evening'
        };
        const { error } = await supabase.from('attendance').insert([insertPayload]);
        if (error) throw error;
      }
      fetchAllData();
    } catch (error) {
      console.error('Attendance update failed', error);
    }
  };

  const openPaymentModal = (worker: Worker) => {
    setSelectedWorkerForPayment(worker);
    setPaymentData({ ...paymentData, amount: 0, notes: '' });
    setIsPaymentModalOpen(true);
  };

  const handleSavePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWorkerForPayment) return;
    setSaving(true);
    try {
      const { error } = await supabase.from('worker_payments').insert([{
        worker_id: selectedWorkerForPayment.id,
        amount: paymentData.amount,
        date: paymentData.date,
        notes: paymentData.notes
      }]);
      
      if (error) throw error;
      setIsPaymentModalOpen(false);
      fetchAllData();
    } catch (err) {
      alert('خطأ في تسجيل الدفعة');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
           <p className="text-xs text-slate-400 mb-1">إجمالي العمال</p>
           <p className="text-xl font-bold text-slate-800">{workers.length}</p>
        </div>
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
           <p className="text-xs text-slate-400 mb-1">مستحقات العمال (لهم)</p>
           <p className="text-xl font-bold text-red-600">
             {workers.reduce((acc, w) => acc + (w.balance && w.balance > 0 ? w.balance : 0), 0).toLocaleString()} <span className="text-xs">{CURRENCY}</span>
           </p>
        </div>
         <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
           <p className="text-xs text-slate-400 mb-1">الديون المستردة (سلف)</p>
           <p className="text-xl font-bold text-green-600">
             {Math.abs(workers.reduce((acc, w) => acc + (w.balance && w.balance < 0 ? w.balance : 0), 0)).toLocaleString()} <span className="text-xs">{CURRENCY}</span>
           </p>
        </div>
         <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between">
           <div>
             <p className="text-xs text-slate-400 mb-1">المنجزين اليوم</p>
             <p className="text-xl font-bold text-blue-600">
                {attendanceData.filter(a => a.date === new Date().toISOString().split('T')[0] && (a.morning || a.evening)).length}
             </p>
           </div>
           <CalendarCheck size={28} className="text-blue-200" />
        </div>
      </div>

      <div className="flex bg-white p-1.5 rounded-2xl border border-slate-100 w-fit">
        <button 
          onClick={() => setActiveTab('list')}
          className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === 'list' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
        >
          <HardHat size={16} className="inline-block ml-2"/> قائمة الفريق
        </button>
        <button 
          onClick={() => setActiveTab('attendance')}
          className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === 'attendance' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
        >
          <CalendarCheck size={16} className="inline-block ml-2"/> سجل الحضور
        </button>
        <button 
          onClick={() => setActiveTab('finance')}
          className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === 'finance' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
        >
          <Coins size={16} className="inline-block ml-2"/> حسابات الأجور
        </button>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden min-h-[400px]">
        {activeTab === 'list' && (
          <div className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-bold text-slate-800">إدارة فريق العمل</h3>
              <button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700">
                <UserPlus size={18} /> إضافة عامل
              </button>
            </div>
            {loading ? <div className="flex justify-center py-10"><Loader2 className="animate-spin text-blue-600"/></div> : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-right">
                  <thead className="bg-slate-50 text-slate-500 uppercase text-xs font-bold">
                    <tr>
                      <th className="px-6 py-4 rounded-r-xl">الاسم</th>
                      <th className="px-6 py-4">التخصص</th>
                      <th className="px-6 py-4">الطلبية الحالية</th>
                      <th className="px-6 py-4">اليومية</th>
                      <th className="px-6 py-4">الحالة</th>
                      <th className="px-6 py-4 rounded-l-xl">الإجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {workers.map(w => (
                      <tr key={w.id} className="hover:bg-slate-50/50">
                        <td className="px-6 py-4 font-bold text-slate-800">{w.name}</td>
                        <td className="px-6 py-4 text-slate-600">{w.trade}</td>
                        <td className="px-6 py-4 text-blue-600 font-medium">{w.currentProject || 'ورشة عامة'}</td>
                        <td className="px-6 py-4 font-bold">{w.dailyRate.toLocaleString()} {CURRENCY}</td>
                        <td className="px-6 py-4">
                          {w.isActive ? <span className="text-green-600 text-xs font-bold bg-green-50 px-2 py-1 rounded-full">نشط</span> : <span className="text-slate-400 text-xs bg-slate-100 px-2 py-1 rounded-full">غير نشط</span>}
                        </td>
                        <td className="px-6 py-4 flex gap-2">
                           <button onClick={() => handleEdit(w)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"><Edit2 size={16}/></button>
                           <button onClick={() => handleDelete(w.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg"><Trash2 size={16}/></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === 'attendance' && (
          <div className="p-6">
             <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
              <h3 className="font-bold text-slate-800">حضور اليوم</h3>
              <div className="relative">
                <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-xl border border-slate-200">
                  <span className="text-xs font-bold text-slate-500 px-2">تاريخ:</span>
                  <input 
                    type="date" 
                    value={attendanceDate}
                    onChange={(e) => setAttendanceDate(e.target.value)}
                    className="bg-white border border-slate-200 rounded-lg px-3 py-1 text-sm outline-none focus:border-blue-500 pl-8"
                  />
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
                </div>
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-right">
                <thead className="bg-slate-50 text-slate-500 uppercase text-xs font-bold">
                  <tr>
                    <th className="px-6 py-4 rounded-r-xl">العامل</th>
                    <th className="px-6 py-4 text-center">الفترة الصباحية</th>
                    <th className="px-6 py-4 text-center rounded-l-xl">الفترة المسائية</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {workers.filter(w => w.isActive).map(w => {
                    const record = attendanceData.find(a => a.workerId === w.id && a.date === attendanceDate);
                    const isMorning = record?.morning || false;
                    const isEvening = record?.evening || false;
                    return (
                      <tr key={w.id} className="hover:bg-slate-50/50">
                        <td className="px-6 py-4">
                          <p className="font-bold text-slate-800">{w.name}</p>
                          <p className="text-xs text-slate-400">{w.trade}</p>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <button 
                            onClick={() => toggleAttendance(w.id, 'morning', isMorning)}
                            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${isMorning ? 'bg-green-100 text-green-700 ring-2 ring-green-500/20' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}`}
                          >
                            {isMorning ? 'حاضر' : 'غائب'}
                          </button>
                        </td>
                        <td className="px-6 py-4 text-center">
                           <button 
                            onClick={() => toggleAttendance(w.id, 'evening', isEvening)}
                            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${isEvening ? 'bg-green-100 text-green-700 ring-2 ring-green-500/20' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}`}
                          >
                            {isEvening ? 'حاضر' : 'غائب'}
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'finance' && (
          <div className="p-6">
            <h3 className="font-bold text-slate-800 mb-6">مستحقات فريق العمل</h3>
             <div className="overflow-x-auto">
              <table className="w-full text-sm text-right">
                <thead className="bg-slate-50 text-slate-500 uppercase text-xs font-bold">
                  <tr>
                    <th className="px-6 py-4 rounded-r-xl">العامل</th>
                    <th className="px-6 py-4">أيام العمل</th>
                    <th className="px-6 py-4 text-blue-600">المستحق الإجمالي</th>
                    <th className="px-6 py-4 text-amber-600">المدفوع</th>
                    <th className="px-6 py-4">الرصيد</th>
                    <th className="px-6 py-4 rounded-l-xl">إجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {workers.map(w => (
                    <tr key={w.id} className="hover:bg-slate-50/50">
                      <td className="px-6 py-4 font-bold text-slate-800">{w.name}</td>
                      <td className="px-6 py-4 font-bold">{w.totalDaysWorked} يوم</td>
                      <td className="px-6 py-4 text-blue-600 font-bold">
                        {w.totalEarned?.toLocaleString()} <span className="text-[9px]">{CURRENCY}</span>
                      </td>
                      <td className="px-6 py-4 text-amber-600 font-bold">
                         {w.totalPaid?.toLocaleString()} <span className="text-[9px]">{CURRENCY}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`font-black text-sm px-3 py-1 rounded-lg ${
                          (w.balance || 0) > 0 ? 'bg-red-50 text-red-600' : 
                          (w.balance || 0) < 0 ? 'bg-green-50 text-green-600' : 'bg-slate-100 text-slate-500' 
                        }`}>
                           {(w.balance || 0) > 0 ? `باقي: ${w.balance?.toLocaleString()}` : (w.balance || 0) < 0 ? `سلفة: ${Math.abs(w.balance || 0).toLocaleString()}` : 'خالص'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <button onClick={() => openPaymentModal(w)} className="bg-slate-800 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-black transition-colors">
                          صرف أجر
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white w-full max-md rounded-3xl shadow-2xl p-6">
            <div className="flex justify-between items-center mb-6">
               <h3 className="font-bold text-slate-800">{editingId ? 'تعديل بيانات عامل' : 'إضافة عامل جديد'}</h3>
               <button onClick={closeModal}><X className="text-slate-400 hover:text-slate-600"/></button>
            </div>
            <form onSubmit={handleSaveWorker} className="space-y-4">
              <input required placeholder="اسم العامل" className="w-full p-3 bg-white border border-slate-300 rounded-xl text-slate-900" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
              <input required placeholder="التخصص (مثلاً: معلم ألمنيوم)" className="w-full p-3 bg-white border border-slate-300 rounded-xl text-slate-900" value={formData.trade} onChange={e => setFormData({...formData, trade: e.target.value})} />
              <div className="grid grid-cols-2 gap-4">
                 <input required placeholder="رقم الهاتف" className="w-full p-3 bg-white border border-slate-300 rounded-xl text-slate-900" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
                 <input type="number" required placeholder="اليومية (د.ج)" className="w-full p-3 bg-white border border-slate-300 rounded-xl text-slate-900" value={formData.daily_rate} onChange={e => setFormData({...formData, daily_rate: Number(e.target.value)})} />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 mb-1 block">الطلبية المكلف بها (اختياري)</label>
                <select 
                  className="w-full p-3 bg-white border border-slate-300 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-900"
                  value={formData.current_project}
                  onChange={e => setFormData({...formData, current_project: e.target.value})}
                >
                  <option value="">ورشة عامة (غير مخصص لطلبية محددة)</option>
                  {projects.map(p => (
                    <option key={p.id} value={p.name}>{p.name}</option>
                  ))}
                </select>
              </div>
              <button disabled={saving} className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold flex justify-center gap-2">
                {saving ? <Loader2 className="animate-spin"/> : <Save size={18}/>} حفظ البيانات
              </button>
            </form>
          </div>
        </div>
      )}

      {isPaymentModalOpen && selectedWorkerForPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl p-6 animate-in zoom-in duration-200">
            <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
               <div>
                 <h3 className="font-bold text-slate-800">صرف مبلغ مالي</h3>
                 <p className="text-xs text-slate-500">للعامل: {selectedWorkerForPayment.name}</p>
               </div>
               <button onClick={() => setIsPaymentModalOpen(false)}><X className="text-slate-400 hover:text-slate-600"/></button>
            </div>
            <form onSubmit={handleSavePayment} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-500 mb-1 block">المبلغ ({CURRENCY})</label>
                <input type="number" required className="w-full p-4 bg-white border border-slate-300 rounded-xl text-lg font-bold text-slate-800" 
                  value={paymentData.amount} onChange={e => setPaymentData({...paymentData, amount: Number(e.target.value)})} />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 mb-1 block">التاريخ</label>
                <div className="relative">
                  <input type="date" required className="w-full p-3 pl-10 bg-white border border-slate-300 rounded-xl text-slate-900" 
                    value={paymentData.date} onChange={e => setPaymentData({...paymentData, date: e.target.value})} />
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={18} />
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 mb-1 block">ملاحظات (سلفة / راتب أسبوعي)</label>
                <textarea className="w-full p-3 bg-white border border-slate-300 rounded-xl text-slate-900" 
                  value={paymentData.notes} onChange={e => setPaymentData({...paymentData, notes: e.target.value})} placeholder="مثال: تسوية أسبوعية..." />
              </div>
              <div className="bg-amber-50 p-3 rounded-xl text-xs text-amber-800 border border-amber-100 flex gap-2">
                 <ArrowUpRight size={16}/> سيتم تسجيل هذا المصروف وخصمه من رصيد العامل
              </div>
              <button disabled={saving} className="w-full py-3 bg-slate-800 text-white rounded-xl font-bold flex justify-center gap-2 hover:bg-black transition-colors">
                {saving ? <Loader2 className="animate-spin"/> : <Save size={18}/>} تأكيد الصرف
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Workers;
