
import React, { useState, useEffect } from 'react';
import { Truck, Search, Phone, User, Loader2, X, Save, AlertCircle, CheckCircle2, Edit2, Trash2 } from 'lucide-react';
import { supabase } from '../supabase';
import { Transport as TransportType } from '../types';

const Transport: React.FC = () => {
  const [transports, setTransports] = useState<TransportType[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const initialFormState = {
    vehicleType: '',
    plateNumber: '',
    driverName: '',
    phone: '',
    status: 'نشط'
  };
  const [formData, setFormData] = useState(initialFormState);

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
        vehicleType: t.vehicle_type,
        plateNumber: t.plate_number,
        driverName: t.driver_name,
        phone: t.phone,
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
        vehicle_type: formData.vehicleType,
        plate_number: formData.plateNumber,
        driver_name: formData.driverName,
        phone: formData.phone,
        status: formData.status
      };

      if (editingId) {
        const { error } = await supabase.from('transports').update(payload).eq('id', editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('transports').insert([payload]);
        if (error) throw error;
      }
      closeModal();
      fetchTransports();
    } catch (err) {
      console.error(err);
      alert('خطأ في حفظ الآلية');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('هل أنت متأكد من حذف هذه الآلية؟')) return;
    try {
      const { error } = await supabase.from('transports').delete().eq('id', id);
      if (error) throw error;
      setTransports(transports.filter(t => t.id !== id));
    } catch (error) {
      alert('فشل حذف الآلية');
    }
  };

  const handleEdit = (transport: TransportType) => {
    setFormData({
      vehicleType: transport.vehicleType,
      plateNumber: transport.plateNumber,
      driverName: transport.driverName,
      phone: transport.phone,
      status: transport.status
    });
    setEditingId(transport.id);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setFormData(initialFormState);
    setEditingId(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-6">
        <div>
           <h2 className="text-xl font-bold text-slate-800">إدارة النقل والآليات</h2>
           <p className="text-xs text-slate-400">متابعة المركبات والسائقين</p>
        </div>
        <button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-blue-500/30">
          <Truck size={18} />
          إضافة آلية
        </button>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <h3 className="font-bold text-slate-800">{editingId ? 'تعديل بيانات المركبة' : 'إضافة مركبة / آلية جديدة'}</h3>
              <button onClick={closeModal} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>
            </div>
            <form onSubmit={handleSaveTransport} className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500">نوع المركبة</label>
                <input required className="w-full p-3 bg-white border border-slate-300 rounded-xl text-sm text-slate-900" 
                  placeholder="مثال: شاحنة، جرافة، سيارة نفعية"
                  value={formData.vehicleType} onChange={e => setFormData({...formData, vehicleType: e.target.value})} />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500">رقم اللوحة (الترقيم)</label>
                <input required className="w-full p-3 bg-white border border-slate-300 rounded-xl text-sm text-left text-slate-900" dir="ltr"
                  value={formData.plateNumber} onChange={e => setFormData({...formData, plateNumber: e.target.value})} />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500">اسم السائق</label>
                <input className="w-full p-3 bg-white border border-slate-300 rounded-xl text-sm text-slate-900"
                  value={formData.driverName} onChange={e => setFormData({...formData, driverName: e.target.value})} />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500">رقم الهاتف</label>
                <input className="w-full p-3 bg-white border border-slate-300 rounded-xl text-sm text-left text-slate-900" dir="ltr"
                  value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500">الحالة</label>
                <select className="w-full p-3 bg-white border border-slate-300 rounded-xl text-sm text-slate-900"
                   value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})}>
                   <option value="نشط">نشط (في الخدمة)</option>
                   <option value="في الصيانة">في الصيانة</option>
                   <option value="خارج الخدمة">خارج الخدمة</option>
                </select>
              </div>
              <button disabled={saving} className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-blue-700 transition-all mt-4">
                {saving ? <Loader2 className="animate-spin" size={20}/> : <><Save size={18}/> {editingId ? 'حفظ التعديلات' : 'حفظ البيانات'}</>}
              </button>
            </form>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        {loading ? (
          <div className="flex justify-center p-10"><Loader2 className="animate-spin text-blue-600" /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-right">
              <thead className="bg-slate-50 text-slate-500 uppercase text-xs font-bold border-b border-slate-100">
                <tr>
                  <th className="px-6 py-4 font-bold">المركبة</th>
                  <th className="px-6 py-4 font-bold">رقم اللوحة</th>
                  <th className="px-6 py-4 font-bold">السائق</th>
                  <th className="px-6 py-4 font-bold">رقم الهاتف</th>
                  <th className="px-6 py-4 font-bold">الحالة</th>
                  <th className="px-6 py-4 font-bold">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {transports.map(t => (
                  <tr key={t.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center">
                          <Truck size={20} />
                        </div>
                        <span className="font-bold text-slate-800">{t.vehicleType}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-600 font-mono text-xs">{t.plateNumber}</td>
                    <td className="px-6 py-4 text-slate-600 flex items-center gap-2">
                      <User size={14} className="text-slate-400"/>
                      {t.driverName || '-'}
                    </td>
                    <td className="px-6 py-4 font-bold text-slate-700">{t.phone || '-'}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold ${
                        t.status === 'نشط' ? 'bg-green-100 text-green-700' : 
                        t.status === 'في الصيانة' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {t.status === 'نشط' ? <CheckCircle2 size={10}/> : <AlertCircle size={10}/>}
                        {t.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                       <div className="flex gap-2">
                        <button onClick={() => handleEdit(t)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"><Edit2 size={16}/></button>
                        <button onClick={() => handleDelete(t.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg"><Trash2 size={16}/></button>
                      </div>
                    </td>
                  </tr>
                ))}
                {transports.length === 0 && (
                   <tr><td colSpan={6} className="text-center py-8 text-slate-400">لا توجد آليات مسجلة حالياً</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default Transport;
