
import React, { useEffect, useState } from 'react';
import { ShoppingBag, Search, Filter, Truck, CheckCircle2, Clock, Loader2, Plus, X, Save, Edit2, Trash2, Calendar } from 'lucide-react';
import { supabase } from '../supabase';
import { Purchase } from '../types';
import { CURRENCY } from '../constants';

const Purchases: React.FC = () => {
  const [items, setItems] = useState<Purchase[]>([]);
  const [projectsList, setProjectsList] = useState<any[]>([]);
  const [suppliersList, setSuppliersList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const initialFormState = {
    project_name: '',
    item: '',
    quantity: '',
    total: 0,
    supplier: '',
    status: 'تم الطلب' as const,
    date: new Date().toISOString().split('T')[0]
  };

  const [formData, setFormData] = useState(initialFormState);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      setLoading(true);
      // 1. Fetch Purchases
      const { data: purchasesData, error: pError } = await supabase.from('purchases').select('*').order('date', { ascending: false });
      if (pError) throw pError;

      // 2. Fetch Projects (for dropdown)
      const { data: projData } = await supabase.from('projects').select('name').eq('status', 'نشط');
      
      // 3. Fetch Suppliers (for dropdown)
      const { data: suppData } = await supabase.from('suppliers').select('name');

      const mappedData = purchasesData.map((p: any) => ({
        id: p.id,
        project: p.project_name,
        item: p.item,
        quantity: p.quantity,
        total: p.total,
        supplier: p.supplier,
        status: p.status,
        date: p.date
      }));

      setItems(mappedData);
      if (projData) setProjectsList(projData);
      if (suppData) setSuppliersList(suppData);

    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        project_name: formData.project_name,
        item: formData.item,
        quantity: formData.quantity,
        total: formData.total,
        supplier: formData.supplier,
        status: formData.status,
        date: formData.date
      };

      if (editingId) {
        const { error } = await supabase.from('purchases').update(payload).eq('id', editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('purchases').insert([payload]);
        if (error) throw error;
      }

      closeModal();
      fetchData();
    } catch (error) {
      console.error('Error saving purchase:', error);
      alert('حدث خطأ أثناء حفظ الطلب');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا الطلب؟')) return;
    try {
      const { error } = await supabase.from('purchases').delete().eq('id', id);
      if (error) throw error;
      setItems(items.filter(i => i.id !== id));
    } catch (error) {
      alert('فشل حذف الطلب');
    }
  };

  const handleEdit = (item: Purchase) => {
    setFormData({
      project_name: item.project,
      item: item.item,
      quantity: item.quantity.toString(),
      total: item.total,
      supplier: item.supplier,
      status: item.status as any,
      date: item.date.split('T')[0]
    });
    setEditingId(item.id);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setFormData(initialFormState);
    setEditingId(null);
  };

  const filteredItems = items.filter(item => 
    item.item.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.supplier.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.project.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalPurchases = items.reduce((sum, item) => sum + (item.total || 0), 0);
  const pendingOrders = items.filter(i => i.status !== 'تم الاستلام').length;
  // Calculate top supplier
  const supplierCounts = items.reduce((acc: any, item) => {
    acc[item.supplier] = (acc[item.supplier] || 0) + 1;
    return acc;
  }, {});
  const topSupplier = Object.keys(supplierCounts).reduce((a, b) => supplierCounts[a] > supplierCounts[b] ? a : b, 'لا يوجد');

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          <div className="bg-blue-50 p-3 rounded-2xl text-blue-600">
            <ShoppingBag size={24} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-800">طلبات التوريد والمشتريات</h2>
            <p className="text-xs text-slate-400">إدارة المواد الأولية والموردين</p>
          </div>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-all"
        >
          <Plus size={18} />
          طلب شراء جديد
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <p className="text-xs text-slate-400 mb-1">إجمالي المشتريات</p>
          <p className="text-2xl font-black text-slate-800">{totalPurchases.toLocaleString()} {CURRENCY}</p>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <p className="text-xs text-slate-400 mb-1">طلبات بانتظار الاستلام</p>
          <p className="text-2xl font-black text-amber-600">{pendingOrders} طلبات</p>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <p className="text-xs text-slate-400 mb-1">أكثر الموردين تعاملاً</p>
          <p className="text-xl font-black text-blue-600 truncate">{topSupplier}</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
           <div className="relative w-72">
             <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
             <input 
               type="text" 
               placeholder="بحث في المشتريات..." 
               className="w-full pr-10 pl-4 py-2 bg-white border border-slate-200 rounded-lg text-xs outline-none" 
               value={searchTerm}
               onChange={(e) => setSearchTerm(e.target.value)}
             />
           </div>
           <button className="text-xs font-bold text-slate-500 flex items-center gap-1"><Filter size={14}/> تصفية متقدمة</button>
        </div>
        
        {loading ? (
           <div className="flex justify-center p-10"><Loader2 className="animate-spin text-blue-600" /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-right">
              <thead className="text-slate-400 font-bold uppercase text-[10px] border-b border-slate-50">
                <tr>
                  <th className="px-6 py-4">المادة / الصنف</th>
                  <th className="px-6 py-4">المشروع</th>
                  <th className="px-6 py-4">الكمية</th>
                  <th className="px-6 py-4">الإجمالي</th>
                  <th className="px-6 py-4">المورد</th>
                  <th className="px-6 py-4">الحالة</th>
                  <th className="px-6 py-4 text-center">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredItems.map(po => (
                  <tr key={po.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <p className="font-bold text-slate-800">{po.item}</p>
                      <p className="text-[10px] text-slate-400">{new Date(po.date).toLocaleDateString('ar-DZ')}</p>
                    </td>
                    <td className="px-6 py-4 text-slate-600 text-xs font-bold">{po.project}</td>
                    <td className="px-6 py-4 text-slate-500 font-mono">{po.quantity}</td>
                    <td className="px-6 py-4 font-bold text-slate-700">{po.total?.toLocaleString()} {CURRENCY}</td>
                    <td className="px-6 py-4 text-blue-600 text-xs font-bold">{po.supplier}</td>
                    <td className="px-6 py-4">
                      <span className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-bold w-fit ${
                        po.status === 'تم الاستلام' ? 'bg-green-100 text-green-700' : 
                        po.status === 'قيد الشحن' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'
                      }`}>
                        {po.status === 'تم الاستلام' ? <CheckCircle2 size={12}/> : 
                        po.status === 'قيد الشحن' ? <Truck size={12}/> : <Clock size={12}/>}
                        {po.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-center gap-2">
                         <button onClick={() => handleEdit(po)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"><Edit2 size={16}/></button>
                         <button onClick={() => handleDelete(po.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg"><Trash2 size={16}/></button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredItems.length === 0 && (
                  <tr><td colSpan={7} className="text-center py-8 text-slate-400">لا توجد سجلات مطابقة</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl p-6 animate-in zoom-in duration-200">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-bold text-slate-800">{editingId ? 'تعديل طلب الشراء' : 'إضافة طلب شراء جديد'}</h3>
              <button onClick={closeModal}><X className="text-slate-400 hover:text-slate-600"/></button>
            </div>
            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500">اسم المادة / الصنف</label>
                  <input required placeholder="مثال: إسمنت مقاوم" className="w-full p-3 bg-white border border-slate-300 rounded-xl text-sm text-slate-900" 
                    value={formData.item} onChange={e => setFormData({...formData, item: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500">الكمية والوحدة</label>
                  <input required placeholder="مثال: 50 كيس" className="w-full p-3 bg-white border border-slate-300 rounded-xl text-sm text-slate-900" 
                    value={formData.quantity} onChange={e => setFormData({...formData, quantity: e.target.value})} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500">التكلفة الإجمالية ({CURRENCY})</label>
                    <input type="number" required className="w-full p-3 bg-white border border-slate-300 rounded-xl text-sm font-bold text-slate-900" 
                      value={formData.total} onChange={e => setFormData({...formData, total: Number(e.target.value)})} />
                 </div>
                 <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500">تاريخ الطلب</label>
                    <div className="relative">
                      <input type="date" required className="w-full p-3 pl-10 bg-white border border-slate-300 rounded-xl text-sm text-slate-900" 
                        value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} />
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={18} />
                    </div>
                 </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500">المورد</label>
                <div className="relative">
                   <input list="suppliers_list" required className="w-full p-3 bg-white border border-slate-300 rounded-xl text-sm text-slate-900" 
                      placeholder="اختر مورد أو اكتب اسم جديد"
                      value={formData.supplier} onChange={e => setFormData({...formData, supplier: e.target.value})} />
                   <datalist id="suppliers_list">
                      {suppliersList.map((s, i) => <option key={i} value={s.name} />)}
                   </datalist>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500">المشروع المستفيد</label>
                <select required className="w-full p-3 bg-white border border-slate-300 rounded-xl text-sm text-slate-900" 
                  value={formData.project_name} onChange={e => setFormData({...formData, project_name: e.target.value})}>
                  <option value="">اختر المشروع...</option>
                  {projectsList.map((p, i) => <option key={i} value={p.name}>{p.name}</option>)}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500">حالة الطلب</label>
                <select className="w-full p-3 bg-white border border-slate-300 rounded-xl text-sm text-slate-900" 
                  value={formData.status} onChange={e => setFormData({...formData, status: e.target.value as any})}>
                  <option value="تم الطلب">تم الطلب</option>
                  <option value="قيد الشحن">قيد الشحن</option>
                  <option value="تم الاستلام">تم الاستلام (وصل للموقع)</option>
                </select>
              </div>

              <button disabled={saving} className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold flex justify-center gap-2 mt-2 hover:bg-blue-700 transition-all">
                {saving ? <Loader2 className="animate-spin"/> : <Save size={18}/>} حفظ الطلب
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default Purchases;
