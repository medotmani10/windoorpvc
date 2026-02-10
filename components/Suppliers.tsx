
import React, { useState, useEffect } from 'react';
import { Package, Search, Phone, MapPin, Loader2, X, Save, Building, Edit2, Trash2, Coins, Wallet, ArrowUpRight, FileText, Calendar } from 'lucide-react';
import { supabase } from '../supabase';
import { Supplier } from '../types';
import { CURRENCY } from '../constants';

const Suppliers: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'list' | 'finance'>('list');
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedSupplierForPayment, setSelectedSupplierForPayment] = useState<Supplier | null>(null);

  // Forms
  const initialFormState = {
    name: '',
    phone: '',
    address: '',
    materialType: '',
    notes: ''
  };
  const [formData, setFormData] = useState(initialFormState);

  const [paymentData, setPaymentData] = useState({
    amount: 0,
    date: new Date().toISOString().split('T')[0],
    notes: ''
  });

  useEffect(() => {
    fetchSuppliers();
  }, []);

  async function fetchSuppliers() {
    try {
      setLoading(true);
      // 1. Fetch Suppliers
      const { data: suppliersData, error: sError } = await supabase.from('suppliers').select('*').order('name');
      if (sError) throw sError;
      
      // 2. Fetch Purchases (Bills/Debt)
      const { data: purchasesData, error: pError } = await supabase.from('purchases').select('supplier, total');
      if (pError) throw pError;

      // 3. Fetch Transactions (Payments)
      const { data: transactionsData, error: tError } = await supabase
        .from('transactions')
        .select('*')
        .eq('type', 'expense');
      if (tError) throw tError;

      const mapped = suppliersData.map((s: any) => {
        // Calculate Total Purchased (Debt)
        const totalPurchased = purchasesData
          .filter((p: any) => p.supplier === s.name)
          .reduce((sum: number, p: any) => sum + (Number(p.total) || 0), 0);

        // Calculate Total Paid
        const totalPaid = transactionsData
          .filter((t: any) => t.description && t.description.includes(`دفعة للمورد: ${s.name}`))
          .reduce((sum: number, t: any) => sum + (Number(t.amount) || 0), 0);

        return {
          id: s.id,
          name: s.name,
          phone: s.phone,
          address: s.address,
          materialType: s.material_type,
          notes: s.notes,
          totalPurchases: totalPurchased,
          totalPaid: totalPaid,
          balance: totalPurchased - totalPaid // Positive means we owe them
        };
      });

      setSuppliers(mapped);
    } catch (error) {
      console.error('Error fetching suppliers:', error);
    } finally {
      setLoading(false);
    }
  }

  // --- CRUD ---

  const handleSaveSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        name: formData.name,
        phone: formData.phone,
        address: formData.address,
        material_type: formData.materialType,
        notes: formData.notes
      };

      if (editingId) {
        const { error } = await supabase.from('suppliers').update(payload).eq('id', editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('suppliers').insert([payload]);
        if (error) throw error;
      }
      closeModal();
      fetchSuppliers();
    } catch (err) {
      console.error(err);
      alert('خطأ في حفظ بيانات المورد');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا المورد؟')) return;
    try {
      const { error } = await supabase.from('suppliers').delete().eq('id', id);
      if (error) throw error;
      setSuppliers(suppliers.filter(s => s.id !== id));
    } catch (error) {
      alert('فشل حذف المورد');
    }
  };

  const handleEdit = (supplier: Supplier) => {
    setFormData({
      name: supplier.name,
      phone: supplier.phone || '',
      address: supplier.address || '',
      materialType: supplier.materialType || '',
      notes: supplier.notes || ''
    });
    setEditingId(supplier.id);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setFormData(initialFormState);
    setEditingId(null);
  };

  // --- Payment Logic ---

  const openPaymentModal = (supplier: Supplier) => {
    setSelectedSupplierForPayment(supplier);
    setPaymentData({ amount: 0, date: new Date().toISOString().split('T')[0], notes: '' });
    setIsPaymentModalOpen(true);
  };

  const handleSavePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSupplierForPayment) return;
    setSaving(true);
    try {
      // Create Expense Transaction
      const { error } = await supabase.from('transactions').insert([{
        description: `دفعة للمورد: ${selectedSupplierForPayment.name} - ${paymentData.notes}`,
        amount: paymentData.amount,
        type: 'expense',
        date: paymentData.date,
        method: 'نقدي',
        status: 'مكتمل',
        category: 'موردين'
      }]);

      if (error) throw error;
      
      setIsPaymentModalOpen(false);
      fetchSuppliers(); // Refresh balances
    } catch (err) {
      alert('خطأ في تسجيل الدفعة');
    } finally {
      setSaving(false);
    }
  };

  const filteredSuppliers = suppliers.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (s.materialType && s.materialType.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      
      {/* Header Stats & Search */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
         <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between">
            <div>
               <p className="text-xs text-slate-400 mb-1">إجمالي ديون الموردين</p>
               <p className="text-xl font-black text-amber-600">
                 {suppliers.reduce((acc, s) => acc + (s.balance || 0), 0).toLocaleString()} <span className="text-xs text-amber-600/60">{CURRENCY}</span>
               </p>
            </div>
            <div className="bg-amber-50 p-2 rounded-xl text-amber-600"><Wallet size={24}/></div>
         </div>
         <div className="md:col-span-2 bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="text"
                placeholder="بحث عن مورد..."
                className="w-full pr-10 pl-4 py-3 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/10 text-sm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-all">
              <Package size={18} />
              إضافة مورد
            </button>
         </div>
      </div>

      {/* Tabs */}
      <div className="flex bg-white p-1.5 rounded-2xl border border-slate-100 w-fit mb-6">
        <button 
          onClick={() => setActiveTab('list')}
          className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === 'list' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
        >
          <Package size={16} className="inline-block ml-2"/> دليل الموردين
        </button>
        <button 
          onClick={() => setActiveTab('finance')}
          className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === 'finance' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
        >
          <Coins size={16} className="inline-block ml-2"/> الحسابات المالية
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="animate-spin text-blue-600" /></div>
      ) : (
        <>
          {/* List View */}
          {activeTab === 'list' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredSuppliers.map(supplier => (
                <div key={supplier.id} className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 hover:shadow-xl hover:shadow-slate-200/50 transition-all group flex flex-col h-full">
                  <div className="flex justify-between items-start mb-6">
                    <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-600 group-hover:scale-110 transition-transform">
                      <Building size={24} />
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => handleEdit(supplier)} className="p-2 text-slate-300 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"><Edit2 size={18}/></button>
                      <button onClick={() => handleDelete(supplier.id)} className="p-2 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"><Trash2 size={18}/></button>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-bold text-slate-800 text-lg">{supplier.name}</h3>
                    <span className="px-2 py-0.5 bg-slate-50 rounded text-[9px] font-bold text-slate-500">{supplier.materialType || 'عام'}</span>
                  </div>
                  
                  <div className="space-y-3 mb-6">
                    <div className="flex items-center gap-3 text-xs text-slate-500">
                      <Phone size={14} className="text-slate-400" />
                      <span>{supplier.phone || '-'}</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-slate-500">
                      <MapPin size={14} className="text-slate-400" />
                      <span>{supplier.address || '-'}</span>
                    </div>
                  </div>

                  <div className="border-t border-slate-50 pt-4 flex justify-between items-center mt-auto">
                    <div>
                       <p className="text-[9px] text-slate-400 font-black uppercase mb-1 tracking-widest">إجمالي المشتريات</p>
                       <p className="font-bold text-slate-700">{supplier.totalPurchases?.toLocaleString()} {CURRENCY}</p>
                    </div>
                    <button onClick={() => { setActiveTab('finance'); }} className="text-xs font-bold text-blue-600 hover:underline">عرض الحساب</button>
                  </div>
                  
                  {supplier.notes && (
                    <div className="mt-4 pt-4 border-t border-slate-50 text-xs text-slate-500 bg-slate-50/50 p-3 rounded-lg flex gap-2">
                      <FileText size={14} className="flex-shrink-0 mt-0.5 text-slate-400" />
                      <p className="line-clamp-2">{supplier.notes}</p>
                    </div>
                  )}
                </div>
              ))}
              {filteredSuppliers.length === 0 && (
                <div className="col-span-full text-center py-10 text-slate-400">لا يوجد موردين مطابقين للبحث.</div>
              )}
            </div>
          )}

          {/* Finance View */}
          {activeTab === 'finance' && (
            <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
               <div className="overflow-x-auto">
                <table className="w-full text-sm text-right">
                  <thead className="bg-slate-50 text-slate-500 uppercase text-xs font-bold">
                    <tr>
                      <th className="px-6 py-4 rounded-r-xl">المورد</th>
                      <th className="px-6 py-4 text-slate-700">إجمالي المشتريات (عليه)</th>
                      <th className="px-6 py-4 text-green-600">المدفوعات (له)</th>
                      <th className="px-6 py-4 text-red-600">المتبقي (دين)</th>
                      <th className="px-6 py-4 rounded-l-xl">إجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {filteredSuppliers.map(s => (
                      <tr key={s.id} className="hover:bg-slate-50/50">
                        <td className="px-6 py-4 font-bold text-slate-800">{s.name}</td>
                        <td className="px-6 py-4 font-bold">{s.totalPurchases?.toLocaleString()} {CURRENCY}</td>
                        <td className="px-6 py-4 text-green-600 font-bold">
                          {s.totalPaid?.toLocaleString()} <span className="text-[9px]">{CURRENCY}</span>
                        </td>
                        <td className="px-6 py-4">
                           <span className={`font-black text-sm px-3 py-1 rounded-lg ${
                            (s.balance || 0) > 0 ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'
                          }`}>
                             {(s.balance || 0).toLocaleString()} {CURRENCY}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <button onClick={() => openPaymentModal(s)} className="bg-slate-800 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-black transition-colors flex items-center gap-1">
                            <ArrowUpRight size={14}/> دفع
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* Supplier Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <h3 className="font-bold text-slate-800">{editingId ? 'تعديل بيانات المورد' : 'إضافة مورد جديد'}</h3>
              <button onClick={closeModal} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>
            </div>
            <form onSubmit={handleSaveSupplier} className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500">اسم المورد / الشركة</label>
                <input required className="w-full p-3 bg-white border border-slate-300 rounded-xl text-sm text-slate-900" 
                  value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500">نوع المواد الموردة</label>
                <input className="w-full p-3 bg-white border border-slate-300 rounded-xl text-sm text-slate-900" 
                  placeholder="مثال: إسمنت، حديد، خشب..."
                  value={formData.materialType} onChange={e => setFormData({...formData, materialType: e.target.value})} />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500">رقم الهاتف</label>
                <input className="w-full p-3 bg-white border border-slate-300 rounded-xl text-sm text-left text-slate-900" dir="ltr"
                  value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500">العنوان</label>
                <input className="w-full p-3 bg-white border border-slate-300 rounded-xl text-sm text-slate-900" 
                  value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 mb-1 block">ملاحظات</label>
                <textarea 
                  placeholder="ملاحظات إضافية حول المورد..." 
                  className="w-full p-3 bg-white border border-slate-300 rounded-xl text-sm min-h-[80px] text-slate-900" 
                  value={formData.notes} 
                  onChange={e => setFormData({...formData, notes: e.target.value})} 
                />
              </div>
              <button disabled={saving} className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-blue-700 transition-all mt-4">
                {saving ? <Loader2 className="animate-spin" size={20}/> : <><Save size={18}/> {editingId ? 'حفظ التعديلات' : 'حفظ البيانات'}</>}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {isPaymentModalOpen && selectedSupplierForPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl p-6 animate-in zoom-in duration-200">
            <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
               <div>
                 <h3 className="font-bold text-slate-800">صرف دفعة لمورد</h3>
                 <p className="text-xs text-slate-500">للمورد: {selectedSupplierForPayment.name}</p>
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
                <label className="text-xs font-bold text-slate-500 mb-1 block">ملاحظات</label>
                <textarea className="w-full p-3 bg-white border border-slate-300 rounded-xl text-slate-900" 
                  value={paymentData.notes} onChange={e => setPaymentData({...paymentData, notes: e.target.value})} placeholder="تفاصيل الدفعة..." />
              </div>
              <div className="bg-amber-50 p-3 rounded-xl text-xs text-amber-800 border border-amber-100 flex gap-2">
                 <ArrowUpRight size={16}/> سيتم تسجيل المبلغ كمصروف وخصمه من رصيد الدين
              </div>
              <button disabled={saving} className="w-full py-3 bg-slate-800 text-white rounded-xl font-bold flex justify-center gap-2 hover:bg-black transition-colors">
                {saving ? <Loader2 className="animate-spin"/> : <Save size={18}/>} تأكيد الدفع
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default Suppliers;
