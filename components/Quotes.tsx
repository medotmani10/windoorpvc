
import React, { useState, useEffect } from 'react';
import { Plus, Printer, Trash2, X, Loader2, FileCheck, CheckCircle2, ArrowRightCircle, Calculator, Ruler, Package, Truck, Wrench, UserPlus, MapPin, Phone, Save } from 'lucide-react';
import { supabase } from '../supabase';
import { CURRENCY, WINDOW_TYPES, GLASS_TYPES, PROFILE_TYPES } from '../constants';
import { Client, Quote, QuoteItem } from '../types';

const Quotes: React.FC = () => {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [convertingId, setConvertingId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Conversion Modal State
  const [isConvertModalOpen, setIsConvertModalOpen] = useState(false);
  const [selectedQuoteForConversion, setSelectedQuoteForConversion] = useState<Quote | null>(null);
  const [conversionType, setConversionType] = useState<'ضريبية' | 'شكلية'>('ضريبية');

  // Quote Form State
  const [currentQuote, setCurrentQuote] = useState<Partial<Quote>>({
    date: new Date().toISOString().split('T')[0],
    items: [],
    clientId: '',
    notes: ''
  });

  // New Client State (Inline Creation)
  const [isNewClient, setIsNewClient] = useState(false);
  const [newClientData, setNewClientData] = useState({
    name: '',
    phone: '',
    address: ''
  });
  
  const [itemForm, setItemForm] = useState<Partial<QuoteItem>>({
    type: WINDOW_TYPES[0],
    profileType: 'Aluminium',
    color: 'أبيض (Blanc)',
    width: 100,
    height: 100,
    quantity: 1,
    glassType: GLASS_TYPES[0],
    materialPrice: 0,
    accessoryPrice: 1500,
    fabricationPrice: 2500,
    transportPrice: 500,
    installationPrice: 1000,
    unitPrice: 0,
    totalPrice: 0
  });

  useEffect(() => {
    fetchQuotes();
    fetchClients();
  }, []);

  async function fetchQuotes() {
    setLoading(true);
    const { data, error } = await supabase.from('quotes').select('*, clients(name)').order('created_at', { ascending: false });
    if (data) {
      setQuotes(data.map(q => ({
        ...q,
        clientId: q.client_id,
        clientName: q.clients?.name,
        validUntil: q.valid_until,
        items: []
      })));
    }
    setLoading(false);
  }

  async function fetchClients() {
    const { data } = await supabase.from('clients').select('*').order('name');
    if (data) setClients(data as any);
  }

  const calculatePrice = () => {
    const w_m = (itemForm.width || 0) / 100;
    const h_m = (itemForm.height || 0) / 100;
    const qty = itemForm.quantity || 1;
    
    const perimeter = (w_m + h_m) * 2;
    const profileCost = perimeter * 1.2 * (itemForm.profileType === 'Aluminium' ? 2200 : 1600);
    const glassArea = w_m * h_m;
    const glassCost = glassArea * (itemForm.glassType.includes('Double') ? 4500 : 2800);
    
    const materialPrice = Math.ceil(profileCost + glassCost);
    const unitPrice = materialPrice + 
                     (itemForm.accessoryPrice || 0) + 
                     (itemForm.fabricationPrice || 0) + 
                     (itemForm.transportPrice || 0) + 
                     (itemForm.installationPrice || 0);
    
    setItemForm(prev => ({ 
      ...prev, 
      materialPrice, 
      unitPrice, 
      totalPrice: unitPrice * qty 
    }));
  };

  useEffect(() => { 
    calculatePrice(); 
  }, [
    itemForm.width, itemForm.height, itemForm.quantity, itemForm.type, 
    itemForm.profileType, itemForm.glassType, itemForm.accessoryPrice, 
    itemForm.fabricationPrice, itemForm.transportPrice, itemForm.installationPrice
  ]);

  const addItem = () => {
    if (!itemForm.width || !itemForm.height || itemForm.width <= 0 || itemForm.height <= 0) {
      alert('يرجى إدخال الأبعاد بشكل صحيح');
      return;
    }
    const newItem = { ...itemForm } as QuoteItem;
    setCurrentQuote(prev => ({
      ...prev,
      items: [...(prev.items || []), newItem]
    }));
    setItemForm(prev => ({ ...prev, quantity: 1 }));
  };

  const removeItem = (idx: number) => {
    setCurrentQuote(prev => ({
      ...prev,
      items: prev.items?.filter((_, i) => i !== idx)
    }));
  };

  const handleSaveQuote = async () => {
    // 1. التحقق من صحة المدخلات
    if (!isNewClient && !currentQuote.clientId) return alert('يرجى اختيار الزبون');
    if (isNewClient && !newClientData.name) return alert('يرجى إدخال اسم الزبون الجديد');
    if (!currentQuote.items || currentQuote.items.length === 0) return alert('يرجى إضافة قطعة واحدة على الأقل للعرض');
    
    setIsSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;
      if (!user) throw new Error('انتهت جلسة العمل، يرجى إعادة تسجيل الدخول');

      let finalClientId = currentQuote.clientId;

      // 2. معالجة الزبون الجديد
      if (isNewClient) {
        const { data: newClient, error: clientError } = await supabase.from('clients').insert({
          name: newClientData.name,
          phone: newClientData.phone,
          address: newClientData.address,
          user_id: user.id
        }).select().single();
        
        if (clientError) throw new Error('فشل إنشاء الزبون: ' + clientError.message);
        finalClientId = newClient.id;
      }

      // 3. حساب القيم المالية
      const subtotal = currentQuote.items.reduce((sum, i) => sum + (i.totalPrice || 0), 0);
      const tax = subtotal * 0.19;
      const total = subtotal + tax;

      // 4. إدراج رأس عرض السعر (Quote Header)
      const { data: quoteData, error: quoteError } = await supabase.from('quotes').insert({
        client_id: finalClientId,
        date: currentQuote.date,
        status: 'مسودة',
        subtotal,
        tax,
        total,
        notes: currentQuote.notes,
        user_id: user.id
      }).select().single();

      if (quoteError) throw new Error('فشل إنشاء عرض السعر: ' + quoteError.message);
      if (!quoteData) throw new Error('لم يتم استلام بيانات العرض بعد الحفظ');

      // 5. إعداد بنود العرض (Quote Items)
      const itemsPayload = currentQuote.items.map(item => ({
        quote_id: quoteData.id,
        type: item.type,
        profile_type: item.profileType,
        color: item.color,
        width: item.width,
        height: item.height,
        quantity: item.quantity,
        glass_type: item.glassType,
        material_price: item.materialPrice || 0,
        accessory_price: item.accessoryPrice || 0,
        fabrication_price: item.fabricationPrice || 0,
        transport_price: item.transportPrice || 0,
        installation_price: item.installationPrice || 0,
        unit_price: item.unitPrice || 0,
        total_price: item.totalPrice || 0,
        user_id: user.id
      }));

      const { error: itemsError } = await supabase.from('quote_items').insert(itemsPayload);
      if (itemsError) throw new Error('فشل إضافة البنود: ' + itemsError.message);

      // 6. النجاح والتنظيف
      alert('تم الحفظ بنجاح');
      setIsModalOpen(false);
      fetchQuotes();
      fetchClients();
      
      // Reset
      setCurrentQuote({ date: new Date().toISOString().split('T')[0], items: [], clientId: '', notes: '' });
      setIsNewClient(false);
      setNewClientData({ name: '', phone: '', address: '' });
      
    } catch (error: any) {
      console.error('Error in handleSaveQuote:', error);
      alert(error.message || 'حدث خطأ غير متوقع أثناء الحفظ');
    } finally {
      setIsSaving(false);
    }
  };

  const handleClientSelection = (val: string) => {
    if (val === 'NEW_CLIENT') {
      setIsNewClient(true);
      setCurrentQuote({ ...currentQuote, clientId: '' });
    } else {
      setIsNewClient(false);
      setCurrentQuote({ ...currentQuote, clientId: val });
    }
  };

  const openConversionModal = (quote: Quote) => {
    setSelectedQuoteForConversion(quote);
    setConversionType('ضريبية');
    setIsConvertModalOpen(true);
  };

  const handleProcessConversion = async () => {
    if (!selectedQuoteForConversion) return;
    setConvertingId(selectedQuoteForConversion.id);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('جلسة العمل منتهية');

      const { data: qItems, error: itemsError } = await supabase
        .from('quote_items').select('*').eq('quote_id', selectedQuoteForConversion.id);
      if (itemsError) throw itemsError;

      const invStatus = conversionType === 'شكلية' ? 'مسودة' : 'معلقة';
      const { data: newInv, error: invError } = await supabase.from('invoices').insert({
        client_id: selectedQuoteForConversion.clientId,
        type: conversionType,
        amount: selectedQuoteForConversion.subtotal,
        tax: selectedQuoteForConversion.tax,
        total: selectedQuoteForConversion.total,
        status: invStatus,
        date: new Date().toISOString(),
        user_id: user.id
      }).select().single();
      if (invError) throw invError;

      if (newInv && qItems) {
        const invItems = qItems.map(item => ({
          invoice_id: newInv.id,
          description: `${item.type} (${item.width}x${item.height} سم) - ${item.profile_type} ${item.color}`,
          unit: 'وحدة',
          quantity: item.quantity,
          unit_price: item.unit_price,
          total: item.total_price,
          user_id: user.id
        }));
        await supabase.from('invoice_items').insert(invItems);
      }

      if (conversionType === 'شكلية') {
        await supabase.from('projects').insert([{
          name: `طلبية: ${selectedQuoteForConversion.clientName}`,
          client_name: selectedQuoteForConversion.clientName,
          client_id: selectedQuoteForConversion.clientId,
          budget: selectedQuoteForConversion.total,
          status: 'قيد الانتظار',
          progress: 0,
          expenses: 0,
          start_date: new Date().toISOString().split('T')[0],
          user_id: user.id
        }]);
      }

      await supabase.from('quotes').update({ status: 'تم التحويل' }).eq('id', selectedQuoteForConversion.id);
      
      alert(`تم بنجاح! تم إنشاء فاتورة ${conversionType} وطلبية عمل.`);
      setIsConvertModalOpen(false);
      fetchQuotes();
    } catch (error: any) {
      alert('حدث خطأ أثناء التحويل: ' + error.message);
    } finally {
      setConvertingId(null);
    }
  };

  const handlePrint = async (quote: Quote) => {
    const { data: settings } = await supabase.from('settings').select('*').single();
    const company = settings || { company_name: 'Windoor System', address: '', phone: '' };
    const { data: items } = await supabase.from('quote_items').select('*').eq('quote_id', quote.id);
    
    const w = window.open('', '_blank');
    w?.document.write(`
      <html dir="rtl">
        <head>
          <title>Devis #${quote.id.substring(0,8)}</title>
          <link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;700&display=swap" rel="stylesheet">
          <style>
            body { font-family: 'Tajawal', sans-serif; padding: 40px; color: #333; }
            .header { display: flex; justify-content: space-between; border-bottom: 2px solid #fbbf24; padding-bottom: 20px; margin-bottom: 30px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th { background: #f8fafc; padding: 12px; text-align: right; border-bottom: 2px solid #ddd; font-size: 11px; color: #64748b; }
            td { padding: 12px; border-bottom: 1px solid #eee; font-size: 12px; }
            .totals { width: 300px; margin-right: auto; margin-top: 30px; }
            .totals div { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f1f5f9; }
            .grand-total { border-top: 2px solid #000; font-weight: 900; font-size: 18px; margin-top: 10px; padding-top: 15px !important; color: #000; }
          </style>
        </head>
        <body>
          <div class="header">
            <div><h1 style="margin:0">${company.company_name}</h1><p style="margin:5px 0; font-size:12px; color:#64748b;">${company.address} | ${company.phone}</p></div>
            <div style="text-align:left"><h2 style="margin:0; color:#fbbf24">عرض أسعار تفصيلي</h2><p style="margin:5px 0; font-size:12px">الرقم: #${quote.id.substring(0,8)}</p><p style="margin:5px 0; font-size:12px">الزبون: <strong>${quote.clientName}</strong></p></div>
          </div>
          <table>
            <thead><tr><th>الوصف والنوع</th><th>الأبعاد (سم)</th><th>مواد+ورشة</th><th>أكسسوارات</th><th>نقل+تركيب</th><th>الكمية</th><th>الإجمالي</th></tr></thead>
            <tbody>
              ${items?.map((item: any) => `
                <tr>
                  <td><strong>${item.type}</strong><br/><span style="font-size:10px; color:#64748b">${item.profile_type} - ${item.glass_type}</span></td>
                  <td style="direction:ltr; text-align:right">${item.width} x ${item.height}</td>
                  <td>${(Number(item.material_price) + Number(item.fabrication_price)).toLocaleString()}</td>
                  <td>${Number(item.accessory_price).toLocaleString()}</td>
                  <td>${(Number(item.transport_price) + Number(item.installation_price)).toLocaleString()}</td>
                  <td style="text-align:center">${item.quantity}</td>
                  <td style="font-weight:bold">${Number(item.total_price).toLocaleString()}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          <div class="totals">
             <div><span>المجموع HT:</span><span>${Number(quote.subtotal).toLocaleString()} ${CURRENCY}</span></div>
             <div class="grand-total"><span>الإجمالي TTC (19%):</span><span>${Number(quote.total).toLocaleString()} ${CURRENCY}</span></div>
          </div>
          <script>window.onload = () => { window.print(); }</script>
        </body>
      </html>
    `);
    w?.document.close();
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
        <div>
          <h2 className="text-2xl font-black text-slate-800">مركز حساب Devis</h2>
          <p className="text-slate-400 text-sm mt-1">إدارة عروض الأسعار والتكاليف</p>
        </div>
        <button onClick={() => { setIsModalOpen(true); setIsNewClient(false); }} className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-bold shadow-lg hover:bg-blue-700 transition-all">
          <Plus size={20} /> عرض جديد
        </button>
      </div>

      <div className="bg-white rounded-3xl border border-slate-100 overflow-hidden shadow-sm">
        {loading ? <div className="p-20 flex justify-center"><Loader2 className="animate-spin text-blue-600" size={32}/></div> : 
        <table className="w-full text-sm text-right">
          <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-100">
            <tr>
              <th className="p-4">الزبون</th>
              <th className="p-4">التاريخ</th>
              <th className="p-4">القيمة الإجمالية</th>
              <th className="p-4">الحالة</th>
              <th className="p-4 text-center">إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {quotes.map(q => (
              <tr key={q.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                <td className="p-4 font-bold text-slate-700">{q.clientName}</td>
                <td className="p-4 text-slate-500">{q.date}</td>
                <td className="p-4 font-black text-blue-600">{q.total?.toLocaleString()} {CURRENCY}</td>
                <td className="p-4">
                  <span className={`px-2 py-1 rounded text-[10px] font-bold ${
                    q.status === 'تم التحويل' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'
                  }`}>
                    {q.status}
                  </span>
                </td>
                <td className="p-4 flex justify-center gap-2">
                  <button onClick={() => handlePrint(q)} className="p-2 text-slate-300 hover:text-blue-600" title="طباعة"><Printer size={18}/></button>
                  <button 
                    onClick={() => openConversionModal(q)} 
                    disabled={convertingId === q.id || q.status === 'تم التحويل'} 
                    className={`flex items-center gap-1 p-2 rounded-xl font-bold text-[10px] transition-all ${
                      q.status === 'تم التحويل' ? 'text-green-300 cursor-not-allowed' : 'text-slate-400 hover:text-green-600 hover:bg-green-50'
                    }`}
                  >
                    {convertingId === q.id ? <Loader2 className="animate-spin" size={14}/> : <FileCheck size={16}/>}
                    {q.status === 'تم التحويل' ? 'تم التحويل' : 'تحويل لفاتورة'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        }
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white w-full max-w-5xl rounded-[40px] shadow-2xl flex flex-col max-h-[95vh] animate-in zoom-in duration-300">
            <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div className="flex items-center gap-3">
                 <div className="p-3 bg-blue-600 text-white rounded-2xl shadow-lg shadow-blue-500/20"><Calculator size={24}/></div>
                 <h3 className="font-black text-xl text-slate-800">حاسبة Devis وورشة النجارة</h3>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-red-50 hover:text-red-500 rounded-xl transition-all"><X size={24}/></button>
            </div>
            
            <div className="p-8 overflow-y-auto flex-1 space-y-8">
              {/* قسم اختيار أو إنشاء زبون */}
              <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-400 mr-1 flex items-center gap-1 uppercase">الزبون المستهدف <UserPlus size={12}/></label>
                    <select 
                      className="w-full p-4 bg-white border border-slate-200 rounded-2xl text-slate-900 font-bold"
                      value={isNewClient ? 'NEW_CLIENT' : currentQuote.clientId}
                      onChange={e => handleClientSelection(e.target.value)}
                    >
                      <option value="">اختر الزبون من القائمة...</option>
                      <option value="NEW_CLIENT" className="text-blue-600 font-black">+ زبون جديد (إضافة سريعة)</option>
                      {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-400 mr-1 uppercase">تاريخ العرض</label>
                    <input type="date" className="w-full p-4 bg-white border border-slate-200 rounded-2xl font-bold" value={currentQuote.date} onChange={e => setCurrentQuote({...currentQuote, date: e.target.value})} />
                  </div>
                </div>

                {/* حقول الزبون الجديد */}
                {isNewClient && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-slate-200 animate-in slide-in-from-top-2 duration-300">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-blue-600 uppercase flex items-center gap-1">اسم الزبون الكامل</label>
                      <input 
                        type="text" 
                        placeholder="أدخل الاسم..." 
                        className="w-full p-3.5 bg-white border border-blue-200 rounded-xl font-bold text-sm"
                        value={newClientData.name}
                        onChange={e => setNewClientData({...newClientData, name: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase flex items-center gap-1">رقم الهاتف <Phone size={10}/></label>
                      <input 
                        type="text" 
                        placeholder="05..." 
                        className="w-full p-3.5 bg-white border border-slate-200 rounded-xl font-bold text-sm"
                        value={newClientData.phone}
                        onChange={e => setNewClientData({...newClientData, phone: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase flex items-center gap-1">العنوان <MapPin size={10}/></label>
                      <input 
                        type="text" 
                        placeholder="المدينة..." 
                        className="w-full p-3.5 bg-white border border-slate-200 rounded-xl font-bold text-sm"
                        value={newClientData.address}
                        onChange={e => setNewClientData({...newClientData, address: e.target.value})}
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="bg-white border-2 border-slate-100 p-8 rounded-[32px] shadow-sm">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase">نوع الهيكل</label>
                    <select className="w-full p-3.5 rounded-2xl border border-slate-200 bg-slate-50 font-bold" value={itemForm.type} onChange={e => setItemForm({...itemForm, type: e.target.value})}>
                      {WINDOW_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase">المادة (Profile)</label>
                    <select className="w-full p-3.5 rounded-2xl border border-slate-200 bg-slate-50 font-bold" value={itemForm.profileType} onChange={e => setItemForm({...itemForm, profileType: e.target.value as any})}>
                      {PROFILE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase">العرض (سم)</label>
                    <input type="number" className="w-full p-3.5 rounded-2xl border border-slate-200 font-black text-center" value={itemForm.width} onChange={e => setItemForm({...itemForm, width: Number(e.target.value)})} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase">الارتفاع (سم)</label>
                    <input type="number" className="w-full p-3.5 rounded-2xl border border-slate-200 font-black text-center" value={itemForm.height} onChange={e => setItemForm({...itemForm, height: Number(e.target.value)})} />
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 items-end border-t border-slate-50 pt-8">
                   <div className="space-y-2"><label className="text-[10px] font-black text-blue-600 uppercase flex items-center gap-1"><Package size={12}/> المواد الأولية</label><input type="number" readOnly className="w-full p-3.5 bg-blue-50 border border-blue-100 rounded-2xl text-sm font-black text-blue-700 text-center" value={itemForm.materialPrice} /></div>
                   <div className="space-y-2"><label className="text-[10px] font-black text-amber-600 uppercase">أكسسوارات</label><input type="number" className="w-full p-3.5 bg-white border border-slate-300 rounded-2xl text-sm font-black text-amber-700 text-center" value={itemForm.accessoryPrice} onChange={e => setItemForm({...itemForm, accessoryPrice: Number(e.target.value)})} /></div>
                   <div className="space-y-2"><label className="text-[10px] font-black text-slate-600 uppercase"><Wrench size={12}/> ورشة وتصنيع</label><input type="number" className="w-full p-3.5 bg-white border border-slate-300 rounded-2xl text-sm font-black text-slate-800 text-center" value={itemForm.fabricationPrice} onChange={e => setItemForm({...itemForm, fabricationPrice: Number(e.target.value)})} /></div>
                   <div className="space-y-2"><label className="text-[10px] font-black text-slate-600 uppercase"><Truck size={12}/> نقل وتوصيل</label><input type="number" className="w-full p-3.5 bg-white border border-slate-300 rounded-2xl text-sm font-black text-slate-800 text-center" value={itemForm.transportPrice} onChange={e => setItemForm({...itemForm, transportPrice: Number(e.target.value)})} /></div>
                   <div className="space-y-2"><label className="text-[10px] font-black text-slate-600 uppercase">تركيب</label><input type="number" className="w-full p-3.5 bg-white border border-slate-300 rounded-2xl text-sm font-black text-slate-800 text-center" value={itemForm.installationPrice} onChange={e => setItemForm({...itemForm, installationPrice: Number(e.target.value)})} /></div>
                </div>

                <div className="flex flex-col md:flex-row justify-between items-center mt-8 p-6 bg-slate-900 rounded-[28px] shadow-xl gap-6">
                   <div className="flex gap-6 items-center">
                      <div className="flex items-center gap-3">
                        <span className="text-[10px] font-black text-white/40 uppercase">الكمية:</span>
                        <input type="number" className="w-24 p-3 bg-white/10 border border-white/20 rounded-xl text-center font-black text-white" value={itemForm.quantity} onChange={e => setItemForm({...itemForm, quantity: Number(e.target.value)})} />
                      </div>
                      <div className="text-right">
                         <p className="text-[10px] font-black text-white/40 uppercase">سعر الوحدة</p>
                         <p className="text-2xl font-black text-white">{itemForm.unitPrice?.toLocaleString()} {CURRENCY}</p>
                      </div>
                   </div>
                   <button onClick={addItem} className="w-full md:w-auto bg-blue-600 text-white px-10 py-4 rounded-2xl font-black hover:bg-blue-700 transition-all shadow-lg flex items-center justify-center gap-2">
                     <Plus size={20} /> إضافة للعرض
                   </button>
                </div>
              </div>

              <div className="border border-slate-100 rounded-[32px] overflow-hidden bg-white shadow-sm">
                <table className="w-full text-xs text-right">
                  <thead className="bg-slate-50 text-slate-400 font-black uppercase border-b border-slate-100">
                    <tr><th className="p-4">القطعة</th><th className="p-4 text-center">الأبعاد</th><th className="p-4 text-center">الورشة+المواد</th><th className="p-4 text-center">أكسسوارات</th><th className="p-4 text-center">نقل/تركيب</th><th className="p-4 text-center">العدد</th><th className="p-4">الإجمالي</th><th className="p-4"></th></tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {currentQuote.items?.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50 transition-colors">
                        <td className="p-4 font-black text-slate-800">{item.type}</td>
                        <td className="p-4 text-center font-mono text-slate-500" dir="ltr">{item.width} x {item.height}</td>
                        <td className="p-4 text-center font-bold text-blue-600">{(item.materialPrice + item.fabricationPrice).toLocaleString()}</td>
                        <td className="p-4 text-center text-amber-600 font-bold">{item.accessoryPrice.toLocaleString()}</td>
                        <td className="p-4 text-center text-slate-500 font-bold">{(item.transportPrice + item.installationPrice).toLocaleString()}</td>
                        <td className="p-4 text-center font-black text-slate-800">{item.quantity}</td>
                        <td className="p-4 font-black text-slate-900">{item.totalPrice.toLocaleString()}</td>
                        <td className="p-4 text-center"><button onClick={() => removeItem(idx)} className="p-2 text-red-300 hover:text-red-600 transition-all"><Trash2 size={18}/></button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="p-8 border-t bg-slate-50 flex flex-col md:flex-row justify-between items-center gap-6">
               <div className="flex gap-10">
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase mb-1">المجموع الصافي (HT)</p>
                    <p className="text-xl font-bold text-slate-700">{currentQuote.items?.reduce((s, i) => s + i.totalPrice, 0).toLocaleString()} {CURRENCY}</p>
                  </div>
                  <div className="border-r border-slate-200 pr-10">
                    <p className="text-[10px] font-black text-blue-600 uppercase mb-1">الإجمالي TTC (19%)</p>
                    <p className="text-3xl font-black text-blue-600">
                      {Math.ceil((currentQuote.items?.reduce((s, i) => s + i.totalPrice, 0) || 0) * 1.19).toLocaleString()} <span className="text-sm font-normal">{CURRENCY}</span>
                    </p>
                  </div>
               </div>
               <div className="flex gap-4 w-full md:w-auto">
                 <button onClick={() => setIsModalOpen(false)} className="px-6 py-2.5 bg-white border border-slate-200 rounded-xl font-black text-slate-600 hover:bg-slate-100 transition-all">إلغاء</button>
                 <button 
                  onClick={handleSaveQuote} 
                  disabled={isSaving} 
                  className="px-8 py-2.5 bg-blue-600 text-white rounded-xl font-black shadow-lg hover:bg-blue-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                 >
                   {isSaving ? <Loader2 className="animate-spin" size={18}/> : <Save size={18}/>}
                   حفظ
                 </button>
               </div>
            </div>
          </div>
        </div>
      )}

      {isConvertModalOpen && selectedQuoteForConversion && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
           <div className="bg-white w-full max-w-sm rounded-[40px] shadow-2xl p-10 animate-in zoom-in duration-200 text-center">
              <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-sm"><FileCheck size={40} /></div>
              <h3 className="text-xl font-black text-slate-800 mb-2">تحويل العرض لفاتورة</h3>
              <p className="text-xs text-slate-400 mb-8">يرجى اختيار نوع الفاتورة المطلوبة لتنفيذ العملية.</p>
              
              <div className="space-y-4 mb-10">
                <button onClick={() => setConversionType('ضريبية')} className={`w-full p-5 rounded-[24px] border-2 flex items-center gap-4 transition-all ${conversionType === 'ضريبية' ? 'border-blue-600 bg-blue-50 shadow-md' : 'border-slate-100 hover:border-blue-200'}`}>
                  <CheckCircle2 size={24} className={conversionType === 'ضريبية' ? 'text-blue-600' : 'text-slate-200'} /><div className="text-right"><p className="font-black text-slate-800 text-sm">فاتورة نهائية</p><p className="text-[10px] text-slate-400">تحويل رسمي للإدارة المالية</p></div>
                </button>
                <button onClick={() => setConversionType('شكلية')} className={`w-full p-5 rounded-[24px] border-2 flex items-center gap-4 transition-all ${conversionType === 'شكلية' ? 'border-amber-500 bg-amber-50 shadow-md' : 'border-slate-100 hover:border-amber-200'}`}>
                  <ArrowRightCircle size={24} className={conversionType === 'شكلية' ? 'text-amber-600' : 'text-slate-200'} /><div className="text-right"><p className="font-black text-slate-800 text-sm">شكلية + فتح طلبية</p><p className="text-[10px] text-slate-400">إنشاء سجل فوري لطلبية العمل</p></div>
                </button>
              </div>

              <div className="flex gap-4">
                <button onClick={() => setIsConvertModalOpen(false)} className="flex-1 py-4 border border-slate-200 rounded-2xl font-black text-slate-400 hover:bg-slate-50 transition-all">تراجع</button>
                <button onClick={handleProcessConversion} disabled={convertingId !== null} className="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-black shadow-xl hover:bg-blue-700 transition-all flex justify-center items-center gap-2">
                  {convertingId !== null ? <Loader2 className="animate-spin" size={20}/> : 'تأكيد العملية'}
                </button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default Quotes;
