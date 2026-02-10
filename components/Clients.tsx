
import React, { useState, useEffect } from 'react';
import { UserPlus, Search, Edit2, Trash2, Loader2, X, Save, ArrowDownLeft, Coins, FileText, Calendar } from 'lucide-react';
import { supabase } from '../supabase';
import { Client } from '../types';
import { CURRENCY } from '../constants';

const Clients: React.FC = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Client Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Payment Modal
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedClientForPayment, setSelectedClientForPayment] = useState<Client | null>(null);
  const [paymentData, setPaymentData] = useState({ amount: 0, date: new Date().toISOString().split('T')[0], notes: '' });

  const initialFormState = {
    name: '',
    phone: '',
    email: '',
    address: '',
    notes: ''
  };
  const [formData, setFormData] = useState(initialFormState);

  useEffect(() => {
    fetchClients();
  }, []);

  async function fetchClients() {
    try {
      setLoading(true);
      // 1. Fetch Clients
      const { data: clientsData, error: cError } = await supabase.from('clients').select('*').order('name');
      if (cError) throw cError;

      // 2. Fetch all income transactions related to clients
      const { data: transactionsData, error: tError } = await supabase
        .from('transactions')
        .select('client_id, amount')
        .eq('type', 'income')
        .not('client_id', 'is', null);
      
      if (tError) throw tError;

      // Map data to calculate Paid vs Debt
      const mappedClients = clientsData.map((c: any) => {
        const totalPaid = transactionsData
          .filter((t: any) => t.client_id === c.id)
          .reduce((sum: number, t: any) => sum + Number(t.amount), 0);
        
        return {
          ...c,
          totalPaid: totalPaid,
        };
      });

      // Let's fetch Invoices separately to be accurate
      const { data: invoicesData } = await supabase.from('invoices').select('client_id, total');
      
      const accurateClients = mappedClients.map(c => {
         const totalInvoiced = invoicesData 
            ? invoicesData.filter((i: any) => i.client_id === c.id).reduce((sum, i) => sum + i.total, 0)
            : 0;
         
         return {
           ...c,
           totalProjectsValue: totalInvoiced, 
           totalDebt: totalInvoiced - c.totalPaid 
         };
      });

      setClients(accurateClients);
    } catch (error) {
      console.error('Error fetching clients:', error);
    } finally {
      setLoading(false);
    }
  }

  // --- CRUD ---

  const handleSaveClient = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingId) {
        const { error } = await supabase.from('clients').update(formData).eq('id', editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('clients').insert([formData]);
        if (error) throw error;
      }
      setIsModalOpen(false);
      setFormData(initialFormState);
      setEditingId(null);
      fetchClients();
    } catch (err) {
      alert('حدث خطأ أثناء حفظ بيانات العميل');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا العميل؟')) return;
    try {
      const { error } = await supabase.from('clients').delete().eq('id', id);
      if (error) throw error;
      fetchClients();
    } catch (error) {
      alert('فشل حذف العميل');
    }
  };

  const handleEdit = (client: Client) => {
    setFormData({
      name: client.name,
      phone: client.phone || '',
      email: client.email || '',
      address: client.address || '',
      notes: client.notes || ''
    });
    setEditingId(client.id);
    setIsModalOpen(true);
  };

  // --- Payment Logic ---
  const openPaymentModal = (client: Client) => {
    setSelectedClientForPayment(client);
    setPaymentData({ amount: 0, date: new Date().toISOString().split('T')[0], notes: '' });
    setIsPaymentModalOpen(true);
  };

  const handleSavePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClientForPayment) return;
    setSaving(true);
    try {
      // Create a transaction of type 'income' linked to this client
      const { error } = await supabase.from('transactions').insert([{
        description: `دفعة من العميل: ${selectedClientForPayment.name} - ${paymentData.notes}`,
        amount: paymentData.amount,
        type: 'income',
        date: paymentData.date,
        method: 'نقدي', // Default to cash for simplicity
        status: 'مكتمل',
        client_id: selectedClientForPayment.id
      }]);

      if (error) throw error;
      setIsPaymentModalOpen(false);
      fetchClients(); // Update balances
    } catch (err) {
      alert('خطأ في تسجيل الدفعة');
    } finally {
      setSaving(false);
    }
  };


  const filteredClients = clients.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-4 rounded-2xl border border-slate-100">
        <div className="relative w-full md:w-96">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="بحث عن عميل..."
            className="w-full pr-10 pl-4 py-2.5 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/10 text-sm text-slate-900"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <button onClick={() => setIsModalOpen(true)} className="w-full md:w-auto flex items-center justify-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-all">
          <UserPlus size={18} />
          إضافة عميل
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="animate-spin text-blue-600" /></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredClients.map(client => (
            <div key={client.id} className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 hover:shadow-xl hover:shadow-slate-200/50 transition-all group flex flex-col h-full">
              <div className="flex justify-between items-start mb-6">
                <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 font-black text-xl group-hover:scale-110 transition-transform">
                  {client.name.charAt(0)}
                </div>
                <div className="flex gap-1">
                   <button onClick={() => handleEdit(client)} className="p-2 text-slate-300 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"><Edit2 size={18}/></button>
                   <button onClick={() => handleDelete(client.id)} className="p-2 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"><Trash2 size={18}/></button>
                </div>
              </div>
              <h3 className="font-bold text-slate-800 text-lg mb-1">{client.name}</h3>
              <p className="text-xs text-slate-400 mb-6">{client.phone || 'لا يوجد رقم'}</p>
              
              <div className="grid grid-cols-2 gap-4 border-t border-slate-50 pt-6 mt-auto">
                <div>
                  <p className="text-[9px] text-slate-400 font-black uppercase mb-1 tracking-widest">إجمالي الأعمال</p>
                  <p className="font-bold text-slate-700">{(client as any).totalProjectsValue?.toLocaleString()} {CURRENCY}</p>
                </div>
                <div className="text-left">
                  <p className="text-[9px] text-slate-400 font-black uppercase mb-1 tracking-widest">المدفوعات</p>
                  <p className="font-bold text-green-600">{(client.totalPaid || 0).toLocaleString()} {CURRENCY}</p>
                </div>
              </div>

               <div className="bg-slate-50 rounded-xl p-3 mt-4 flex justify-between items-center">
                 <div>
                    <p className="text-[9px] font-bold text-slate-500 uppercase">المتبقي (دين)</p>
                    <p className={`font-black text-lg ${client.totalDebt > 0 ? 'text-red-600' : 'text-slate-400'}`}>
                      {client.totalDebt.toLocaleString()} {CURRENCY}
                    </p>
                 </div>
                 <button 
                   onClick={() => openPaymentModal(client)}
                   className="bg-white border border-slate-200 text-blue-600 p-2 rounded-lg hover:bg-blue-50 transition-colors shadow-sm" title="تسجيل دفعة">
                   <Coins size={20} />
                 </button>
               </div>
               
               {client.notes && (
                 <div className="mt-4 pt-4 border-t border-slate-50 text-xs text-slate-500 bg-slate-50/50 p-3 rounded-lg flex gap-2">
                   <FileText size={14} className="flex-shrink-0 mt-0.5 text-slate-400" />
                   <p className="line-clamp-2">{client.notes}</p>
                 </div>
               )}
            </div>
          ))}
        </div>
      )}

      {/* Add Client Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-bold text-slate-800">{editingId ? 'تعديل بيانات العميل' : 'إضافة عميل جديد'}</h3>
              <button onClick={() => setIsModalOpen(false)}><X className="text-slate-400 hover:text-slate-600"/></button>
            </div>
            <form onSubmit={handleSaveClient} className="space-y-4">
              <input required placeholder="الاسم" className="w-full p-3 bg-white border border-slate-300 rounded-xl text-slate-900" value={formData.name} onChange={e => setFormData({...formData,name: e.target.value})} />
              <input required placeholder="الهاتف" className="w-full p-3 bg-white border border-slate-300 rounded-xl text-slate-900" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
              <input placeholder="العنوان" className="w-full p-3 bg-white border border-slate-300 rounded-xl text-slate-900" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} />
              <div>
                <label className="text-xs font-bold text-slate-500 mb-1 block">ملاحظات</label>
                <textarea 
                  placeholder="ملاحظات إضافية حول العميل..." 
                  className="w-full p-3 bg-white border border-slate-300 rounded-xl text-sm min-h-[80px] text-slate-900" 
                  value={formData.notes} 
                  onChange={e => setFormData({...formData, notes: e.target.value})} 
                />
              </div>
              <button disabled={saving} className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold flex justify-center gap-2">
                {saving ? <Loader2 className="animate-spin"/> : <Save size={18}/>} حفظ
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Add Payment Modal */}
      {isPaymentModalOpen && selectedClientForPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl p-6 animate-in zoom-in duration-200">
            <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
               <div>
                 <h3 className="font-bold text-slate-800">استلام دفعة مالية</h3>
                 <p className="text-xs text-slate-500">من العميل: {selectedClientForPayment.name}</p>
               </div>
               <button onClick={() => setIsPaymentModalOpen(false)}><X className="text-slate-400 hover:text-slate-600"/></button>
            </div>
            <form onSubmit={handleSavePayment} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-500 mb-1 block">المبلغ المستلم ({CURRENCY})</label>
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
                  value={paymentData.notes} onChange={e => setPaymentData({...paymentData, notes: e.target.value})} placeholder="دفعة تحت الحساب، شيك رقم..." />
              </div>
              <div className="bg-green-50 p-3 rounded-xl text-xs text-green-800 border border-green-100 flex gap-2">
                 <ArrowDownLeft size={16}/> سيتم إضافة المبلغ للخزينة وتخفيض دين العميل
              </div>
              <button disabled={saving} className="w-full py-3 bg-slate-800 text-white rounded-xl font-bold flex justify-center gap-2 hover:bg-black transition-colors">
                {saving ? <Loader2 className="animate-spin"/> : <Save size={18}/>} تسجيل الدفعة
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default Clients;
