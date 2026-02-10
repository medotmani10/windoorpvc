
import React, { useState, useEffect } from 'react';
import { Plus, Printer, Trash2, Calculator, X, Loader2, FileCheck, ArrowRightLeft, FileText, CheckCircle2 } from 'lucide-react';
import { supabase } from '../supabase';
import { CURRENCY, WINDOW_TYPES, GLASS_TYPES, PROFILE_TYPES } from '../constants';
import { Client, Quote, QuoteItem } from '../types';

const Quotes: React.FC = () => {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [convertingId, setConvertingId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Conversion Modal State
  const [isConvertModalOpen, setIsConvertModalOpen] = useState(false);
  const [selectedQuoteForConversion, setSelectedQuoteForConversion] = useState<Quote | null>(null);
  const [conversionType, setConversionType] = useState<'ضريبية' | 'شكلية'>('ضريبية');

  // Quote Form State
  const [currentQuote, setCurrentQuote] = useState<Partial<Quote>>({
    date: new Date().toISOString().split('T')[0],
    items: []
  });
  
  // Item Calculator State
  const [itemForm, setItemForm] = useState<Partial<QuoteItem>>({
    type: WINDOW_TYPES[0],
    profileType: 'Aluminium',
    color: 'أبيض (Blanc)',
    width: 100,
    height: 100,
    quantity: 1,
    glassType: GLASS_TYPES[0],
    unitPrice: 0
  });

  useEffect(() => {
    fetchQuotes();
    fetchClients();
  }, []);

  async function fetchQuotes() {
    setLoading(true);
    const { data } = await supabase.from('quotes').select('*, clients(name)').order('created_at', { ascending: false });
    if (data) {
      setQuotes(data.map(q => ({
        ...q,
        clientId: q.client_id,
        clientName: q.clients?.name,
        validUntil: q.valid_until
      })));
    }
    setLoading(false);
  }

  async function fetchClients() {
    const { data } = await supabase.from('clients').select('*');
    if (data) setClients(data as any);
  }

  // --- Calculator Logic ---
  const calculatePrice = () => {
    const w = itemForm.width || 0; // cm
    const h = itemForm.height || 0; // cm
    const qty = itemForm.quantity || 1;
    
    // تحويل للمتر
    const w_m = w / 100;
    const h_m = h / 100;

    // حساب طول البروفيل تقريبي
    const perimeter = (w_m + h_m) * 2; 
    const innerProfile = (w_m + h_m) * 2; 
    const totalProfileLength = (perimeter + innerProfile) * 1.1; // +10% waste

    // أسعار افتراضية
    const profilePricePerMeter = itemForm.profileType === 'Aluminium' ? 1200 : 900;
    const glassPricePerM2 = 1500;
    const accessoryCost = 2000; 
    const fabricationCost = 3000; 

    const glassArea = w_m * h_m;
    
    const materialCost = (totalProfileLength * profilePricePerMeter) + (glassArea * glassPricePerM2) + accessoryCost;
    const totalCost = materialCost + fabricationCost;
    
    // هامش الربح 20%
    const sellingPrice = Math.ceil(totalCost * 1.2);

    setItemForm(prev => ({ ...prev, unitPrice: sellingPrice, totalPrice: sellingPrice * qty }));
  };

  useEffect(() => {
    calculatePrice();
  }, [itemForm.width, itemForm.height, itemForm.quantity, itemForm.type, itemForm.profileType]);

  const addItem = () => {
    if (!itemForm.width || !itemForm.height) return;
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
    if (!currentQuote.clientId || !currentQuote.items?.length) return alert('يرجى اختيار العميل وإضافة عنصر واحد على الأقل');
    
    const subtotal = currentQuote.items.reduce((sum, i) => sum + i.totalPrice, 0);
    const tax = subtotal * 0.19;
    const total = subtotal + tax;

    try {
      // 1. Save Quote Header
      const { data: quoteData, error } = await supabase.from('quotes').insert({
        client_id: currentQuote.clientId,
        date: currentQuote.date,
        valid_until: currentQuote.validUntil,
        status: 'مسودة',
        subtotal,
        tax,
        total,
        notes: currentQuote.notes
      }).select().single();

      if (error) throw error;

      // 2. Save Items
      const itemsPayload = currentQuote.items.map(item => ({
        quote_id: quoteData.id,
        type: item.type,
        profile_type: item.profileType,
        color: item.color,
        width: item.width,
        height: item.height,
        quantity: item.quantity,
        glass_type: item.glassType,
        unit_price: item.unitPrice,
        total_price: item.totalPrice
      }));

      await supabase.from('quote_items').insert(itemsPayload);
      
      setIsModalOpen(false);
      fetchQuotes();
      setCurrentQuote({ date: new Date().toISOString().split('T')[0], items: [] });
    } catch (error) {
      console.error(error);
      alert('خطأ في حفظ العرض');
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
      // 1. Fetch Quote Items
      const { data: qItems, error: itemsError } = await supabase
        .from('quote_items')
        .select('*')
        .eq('quote_id', selectedQuoteForConversion.id);
      
      if (itemsError) throw itemsError;

      // 2. Create Invoice
      const { data: newInv, error: invError } = await supabase.from('invoices').insert({
        client_id: selectedQuoteForConversion.clientId,
        type: conversionType,
        amount: selectedQuoteForConversion.subtotal,
        tax: selectedQuoteForConversion.tax,
        total: selectedQuoteForConversion.total,
        status: conversionType === 'شكلية' ? 'مسودة' : 'معلقة',
        date: new Date().toISOString(),
        due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // Due in 7 days
      }).select().single();

      if (invError) throw invError;

      // 3. Create Invoice Items
      if (newInv && qItems) {
        const invItemsPayload = qItems.map(item => ({
          invoice_id: newInv.id,
          description: `${item.type} - ${item.profile_type} (${item.width}x${item.height} سم) - ${item.glass_type}`,
          unit: 'وحدة',
          quantity: item.quantity,
          unit_price: item.unit_price,
          total: item.total_price
        }));

        const { error: invItemsError } = await supabase.from('invoice_items').insert(invItemsPayload);
        if (invItemsError) throw invItemsError;
      }

      // 4. Update Quote Status only if converting to Final Invoice
      if (conversionType === 'ضريبية') {
        await supabase.from('quotes').update({ status: 'مؤكد' }).eq('id', selectedQuoteForConversion.id);
      }

      alert('تم إنشاء الفاتورة بنجاح!');
      setIsConvertModalOpen(false);
      fetchQuotes();

    } catch (error: any) {
      console.error('Conversion Error:', error);
      alert('حدث خطأ أثناء التحويل: ' + error.message);
    } finally {
      setConvertingId(null);
    }
  };

  const handlePrint = async (quote: Quote) => {
    // Fetch Company Settings first
    const { data: settings } = await supabase.from('settings').select('*').single();
    const company = settings || { company_name: 'Windoor System', address: '', phone: '' };

    // Fetch Items if not loaded
    const { data: items } = await supabase.from('quote_items').select('*').eq('quote_id', quote.id);
    
    const w = window.open('', '_blank');
    w?.document.write(`
      <html dir="rtl">
        <head>
          <title>Devis #${quote.id.substring(0,8)}</title>
          <link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;700&display=swap" rel="stylesheet">
          <style>
            body { font-family: 'Tajawal', sans-serif; padding: 40px; color: #333; }
            .header-container { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px; border-bottom: 2px solid #eee; padding-bottom: 20px; }
            .company-details h1 { margin: 0; color: #000; font-size: 24px; }
            .company-details p { margin: 4px 0; font-size: 12px; color: #555; }
            .logo { max-height: 80px; margin-bottom: 10px; }
            .doc-title { text-align: left; }
            .doc-title h2 { margin: 0; font-size: 28px; color: #fbbf24; text-transform: uppercase; }
            .doc-title p { margin: 5px 0; color: #777; font-size: 12px; }
            
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th { background-color: #f9fafb; padding: 12px; text-align: right; border-bottom: 2px solid #ddd; font-size: 12px; }
            td { padding: 12px; border-bottom: 1px solid #eee; font-size: 13px; }
            
            .totals { width: 300px; margin-right: auto; margin-top: 30px; }
            .totals-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee; }
            .totals-row.final { font-weight: bold; font-size: 16px; border-top: 2px solid #000; border-bottom: none; margin-top: 10px; padding-top: 10px; }
          </style>
        </head>
        <body>
          <div class="header-container">
            <div class="company-details">
              ${company.logo_url ? `<img src="${company.logo_url}" class="logo" />` : ''}
              <h1>${company.company_name}</h1>
              <p>${company.address}</p>
              <p>${company.phone} | ${company.email}</p>
            </div>
            <div class="doc-title">
              <h2>عرض أسعار (Devis)</h2>
              <p>رقم: #${quote.id.substring(0,8)}</p>
              <p>التاريخ: ${quote.date}</p>
              <p>العميل: <strong>${quote.clientName}</strong></p>
            </div>
          </div>

          <table>
            <thead>
              <tr><th>الوصف / النوع</th><th>الأبعاد (سم)</th><th>الكمية</th><th>السعر الإفرادي</th><th>الإجمالي</th></tr>
            </thead>
            <tbody>
              ${items?.map((item: any) => `
                <tr>
                  <td>
                    <strong>${item.type}</strong>
                    <div style="font-size:11px; color:#666;">${item.profile_type} - ${item.color}</div>
                  </td>
                  <td dir="ltr" style="text-align:right">${item.width} x ${item.height}</td>
                  <td>${item.quantity}</td>
                  <td>${Number(item.unit_price).toLocaleString()}</td>
                  <td style="font-weight:bold">${Number(item.total_price).toLocaleString()}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div class="totals">
             <div class="totals-row"><span>المجموع (HT)</span><span>${Number(quote.subtotal).toLocaleString()} ${CURRENCY}</span></div>
             <div class="totals-row"><span>الضريبة (19%)</span><span>${Number(quote.tax).toLocaleString()} ${CURRENCY}</span></div>
             <div class="totals-row final"><span>الإجمالي (TTC)</span><span>${Number(quote.total).toLocaleString()} ${CURRENCY}</span></div>
          </div>
          
          <script>window.print()</script>
        </body>
      </html>
    `);
    w?.document.close();
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white p-6 rounded-3xl border border-slate-100">
        <div>
          <h2 className="text-2xl font-black text-slate-800">حساب Devis الذكي</h2>
          <p className="text-slate-400 text-sm">إنشاء عروض أسعار دقيقة للألمنيوم و PVC</p>
        </div>
        <button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-bold shadow-lg hover:bg-blue-700">
          <Plus size={20} /> عرض جديد
        </button>
      </div>

      <div className="bg-white rounded-3xl border border-slate-100 overflow-hidden">
        {loading ? <div className="p-10 flex justify-center"><Loader2 className="animate-spin text-blue-600"/></div> : 
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
              <tr key={q.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                <td className="p-4 font-bold text-slate-700">{q.clientName}</td>
                <td className="p-4">{q.date}</td>
                <td className="p-4 font-black text-blue-600">{q.total?.toLocaleString()} {CURRENCY}</td>
                <td className="p-4"><span className={`px-2 py-1 rounded text-xs font-bold ${q.status === 'مؤكد' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}>{q.status}</span></td>
                <td className="p-4 flex justify-center gap-2">
                  <button onClick={() => handlePrint(q)} className="p-2 text-slate-400 hover:text-blue-600" title="طباعة"><Printer size={18}/></button>
                  <button 
                    onClick={() => openConversionModal(q)} 
                    disabled={convertingId === q.id || q.status === 'مؤكد'}
                    className={`p-2 rounded-lg transition-colors flex items-center gap-2 font-bold text-xs ${q.status === 'مؤكد' ? 'text-green-300 cursor-not-allowed' : 'text-slate-400 hover:text-green-600 hover:bg-green-50'}`}
                    title="تحويل إلى فاتورة"
                  >
                    {convertingId === q.id ? <Loader2 className="animate-spin" size={18}/> : <FileCheck size={18}/>}
                    <span className="hidden md:inline">إنشاء فاتورة</span>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        }
      </div>

      {/* Quote Creation Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white w-full max-w-4xl rounded-3xl shadow-2xl flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-slate-100 flex justify-between bg-slate-50">
              <h3 className="font-bold text-lg text-slate-800">إنشاء عرض أسعار جديد</h3>
              <button onClick={() => setIsModalOpen(false)}><X className="text-slate-400 hover:text-red-500"/></button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1 space-y-8">
              {/* Client Selection */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                   <label className="text-xs font-bold text-slate-500 block mb-1">الزبون</label>
                   <select 
                     className="w-full p-3 bg-white border border-slate-300 rounded-xl text-slate-900"
                     onChange={e => setCurrentQuote({...currentQuote, clientId: e.target.value})}
                   >
                     <option value="">اختر الزبون...</option>
                     {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                   </select>
                </div>
                <div>
                   <label className="text-xs font-bold text-slate-500 block mb-1">تاريخ العرض</label>
                   <input type="date" className="w-full p-3 bg-white border border-slate-300 rounded-xl text-slate-900" value={currentQuote.date} onChange={e => setCurrentQuote({...currentQuote, date: e.target.value})} />
                </div>
              </div>

              {/* CALCULATOR AREA */}
              <div className="bg-blue-50/50 border border-blue-100 p-6 rounded-2xl">
                <h4 className="flex items-center gap-2 font-bold text-blue-800 mb-4"><Calculator size={20}/> حاسبة المقاسات</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div>
                    <label className="text-[10px] font-bold text-slate-500">النوع</label>
                    <select className="w-full p-2 rounded-lg border border-slate-300 bg-white text-slate-900 text-sm" value={itemForm.type} onChange={e => setItemForm({...itemForm, type: e.target.value})}>
                      {WINDOW_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                   <div>
                    <label className="text-[10px] font-bold text-slate-500">المادة</label>
                    <select className="w-full p-2 rounded-lg border border-slate-300 bg-white text-slate-900 text-sm" value={itemForm.profileType} onChange={e => setItemForm({...itemForm, profileType: e.target.value as any})}>
                      {PROFILE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                   <div>
                    <label className="text-[10px] font-bold text-slate-500">اللون</label>
                     <input type="text" className="w-full p-2 rounded-lg border border-slate-300 bg-white text-slate-900 text-sm" value={itemForm.color} onChange={e => setItemForm({...itemForm, color: e.target.value})} />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500">الزجاج</label>
                    <select className="w-full p-2 rounded-lg border border-slate-300 bg-white text-slate-900 text-sm" value={itemForm.glassType} onChange={e => setItemForm({...itemForm, glassType: e.target.value})}>
                      {GLASS_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-3 md:grid-cols-6 gap-4 items-end">
                   <div className="col-span-1">
                      <label className="text-[10px] font-bold text-slate-500">العرض (cm)</label>
                      <input type="number" className="w-full p-2 rounded-lg border border-slate-300 bg-white text-slate-900 text-center font-bold" value={itemForm.width} onChange={e => setItemForm({...itemForm, width: Number(e.target.value)})} />
                   </div>
                   <div className="col-span-1">
                      <label className="text-[10px] font-bold text-slate-500">الارتفاع (cm)</label>
                      <input type="number" className="w-full p-2 rounded-lg border border-slate-300 bg-white text-slate-900 text-center font-bold" value={itemForm.height} onChange={e => setItemForm({...itemForm, height: Number(e.target.value)})} />
                   </div>
                   <div className="col-span-1">
                      <label className="text-[10px] font-bold text-slate-500">الكمية</label>
                      <input type="number" className="w-full p-2 rounded-lg border border-slate-300 bg-white text-slate-900 text-center font-bold" value={itemForm.quantity} onChange={e => setItemForm({...itemForm, quantity: Number(e.target.value)})} />
                   </div>
                   <div className="col-span-2">
                      <label className="text-[10px] font-bold text-slate-500">السعر التقديري (للوحدة)</label>
                      <input type="number" className="w-full p-2 rounded-lg border border-slate-300 bg-white text-slate-900 text-center font-bold text-green-600" value={itemForm.unitPrice} onChange={e => setItemForm({...itemForm, unitPrice: Number(e.target.value)})} />
                   </div>
                   <button onClick={addItem} className="bg-blue-600 text-white p-2 rounded-lg font-bold text-sm hover:bg-blue-700">إضافة</button>
                </div>
              </div>

              {/* Items List */}
              <div className="border rounded-xl overflow-hidden">
                <table className="w-full text-sm text-right bg-white">
                  <thead className="bg-slate-50 text-slate-500 font-bold text-xs">
                    <tr>
                      <th className="p-3">العنصر</th>
                      <th className="p-3">الأبعاد</th>
                      <th className="p-3">العدد</th>
                      <th className="p-3">السعر</th>
                      <th className="p-3">الإجمالي</th>
                      <th className="p-3"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentQuote.items?.map((item, idx) => (
                      <tr key={idx} className="border-t border-slate-50">
                        <td className="p-3 font-bold">{item.type} <span className="text-xs text-slate-400 block">{item.profileType} - {item.glassType}</span></td>
                        <td className="p-3" dir="ltr">{item.width} x {item.height}</td>
                        <td className="p-3">{item.quantity}</td>
                        <td className="p-3">{item.unitPrice.toLocaleString()}</td>
                        <td className="p-3 font-bold text-blue-600">{item.totalPrice.toLocaleString()}</td>
                        <td className="p-3"><button onClick={() => removeItem(idx)} className="text-red-400 hover:text-red-600"><Trash2 size={16}/></button></td>
                      </tr>
                    ))}
                    {(!currentQuote.items || currentQuote.items.length === 0) && <tr><td colSpan={6} className="p-6 text-center text-slate-400">لم يتم إضافة عناصر بعد</td></tr>}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-end gap-8 text-lg font-bold border-t pt-4">
                 <span>المجموع:</span>
                 <span className="text-blue-600">{currentQuote.items?.reduce((s, i) => s + i.totalPrice, 0).toLocaleString()} {CURRENCY}</span>
              </div>
            </div>

            <div className="p-4 border-t bg-slate-50 flex justify-end gap-3">
               <button onClick={() => setIsModalOpen(false)} className="px-6 py-2 bg-white border rounded-xl font-bold text-slate-600">إلغاء</button>
               <button onClick={handleSaveQuote} className="px-6 py-2 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700">حفظ العرض</button>
            </div>
          </div>
        </div>
      )}

      {/* Invoice Conversion Modal */}
      {isConvertModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
           <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl p-6 animate-in zoom-in duration-200">
              <h3 className="text-lg font-bold text-slate-800 mb-4 text-center">إنشاء فاتورة من العرض</h3>
              <p className="text-sm text-slate-500 text-center mb-6">
                 سيتم نسخ جميع البنود والأسعار إلى فاتورة جديدة. يرجى اختيار نوع الفاتورة:
              </p>
              
              <div className="space-y-3 mb-6">
                <button 
                  onClick={() => setConversionType('ضريبية')}
                  className={`w-full p-4 rounded-xl border-2 flex items-center gap-3 transition-all ${conversionType === 'ضريبية' ? 'border-blue-500 bg-blue-50' : 'border-slate-100 hover:border-blue-200'}`}
                >
                  <CheckCircle2 size={24} className={conversionType === 'ضريبية' ? 'text-blue-600' : 'text-slate-300'} />
                  <div className="text-right">
                     <p className="font-bold text-slate-800">فاتورة نهائية (Facture)</p>
                     <p className="text-[10px] text-slate-400">سيتم تغيير حالة العرض إلى "مؤكد"</p>
                  </div>
                </button>

                <button 
                  onClick={() => setConversionType('شكلية')}
                  className={`w-full p-4 rounded-xl border-2 flex items-center gap-3 transition-all ${conversionType === 'شكلية' ? 'border-amber-500 bg-amber-50' : 'border-slate-100 hover:border-amber-200'}`}
                >
                  <FileText size={24} className={conversionType === 'شكلية' ? 'text-amber-600' : 'text-slate-300'} />
                  <div className="text-right">
                     <p className="font-bold text-slate-800">فاتورة شكلية (Proforma)</p>
                     <p className="text-[10px] text-slate-400">يبقى العرض متاحاً للتعديل</p>
                  </div>
                </button>
              </div>

              <div className="flex gap-3">
                 <button onClick={() => setIsConvertModalOpen(false)} className="flex-1 py-3 border border-slate-200 rounded-xl font-bold text-slate-600 hover:bg-slate-50">إلغاء</button>
                 <button onClick={handleProcessConversion} className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 shadow-lg shadow-blue-500/20">تأكيد الإنشاء</button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default Quotes;
