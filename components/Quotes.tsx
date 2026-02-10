
import React, { useState, useEffect } from 'react';
import { Plus, Printer, Trash2, Calculator, X, Loader2 } from 'lucide-react';
import { supabase } from '../supabase';
import { CURRENCY, WINDOW_TYPES, GLASS_TYPES, PROFILE_TYPES } from '../constants';
import { Client, Quote, QuoteItem } from '../types';

const Quotes: React.FC = () => {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

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
    // هذه معادلة تقديرية، في التطبيق الحقيقي يمكن جلب سعر المتر من قاعدة البيانات (جدول المخزون)
    const w = itemForm.width || 0; // cm
    const h = itemForm.height || 0; // cm
    const qty = itemForm.quantity || 1;
    
    // تحويل للمتر
    const w_m = w / 100;
    const h_m = h / 100;

    // حساب طول البروفيل (إطار + ضلفات) - معادلة تقريبية
    const perimeter = (w_m + h_m) * 2; 
    const innerProfile = (w_m + h_m) * 2; // تقريبي
    const totalProfileLength = (perimeter + innerProfile) * 1.1; // +10% waste

    // أسعار افتراضية (يمكن جعلها ديناميكية لاحقاً)
    const profilePricePerMeter = itemForm.profileType === 'Aluminium' ? 1200 : 900;
    const glassPricePerM2 = 1500;
    const accessoryCost = 2000; // مقابض، عجلات، مطاط
    const fabricationCost = 3000; // مصنعية

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
    // Reset calculator but keep some defaults
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

  const handlePrint = (quote: Quote) => {
    // دالة طباعة مبسطة، يمكن توسيعها
    const w = window.open('', '_blank');
    w?.document.write(`
      <html dir="rtl">
        <head><title>Devis ${quote.clientName}</title>
        <style>
            body { font-family: sans-serif; padding: 20px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: right; }
            th { background-color: #f2f2f2; }
            .header { text-align: center; margin-bottom: 30px; }
        </style>
        </head>
        <body>
          <div class="header">
            <h1>عرض أسعار / Devis</h1>
            <p>السيد: ${quote.clientName}</p>
            <p>التاريخ: ${quote.date}</p>
          </div>
          <table>
            <thead>
              <tr><th>النوع</th><th>الأبعاد (سم)</th><th>المواصفات</th><th>الكمية</th><th>السعر الإفرادي</th><th>الإجمالي</th></tr>
            </thead>
            <tbody>
              <!-- تفاصيل العناصر هنا ستتطلب جلبها من قاعدة البيانات إذا لم تكن موجودة في الـ State -->
              <tr><td colspan="6" style="text-align:center">يرجى معاينة التفاصيل في التطبيق</td></tr>
            </tbody>
            <tfoot>
               <tr><td colspan="5"><strong>المجموع الكلي</strong></td><td><strong>${quote.total?.toLocaleString()} ${CURRENCY}</strong></td></tr>
            </tfoot>
          </table>
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
                <td className="p-4"><span className="bg-slate-100 text-slate-600 px-2 py-1 rounded text-xs font-bold">{q.status}</span></td>
                <td className="p-4 flex justify-center gap-2">
                  <button onClick={() => handlePrint(q)} className="p-2 text-slate-400 hover:text-blue-600"><Printer size={18}/></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        }
      </div>

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
    </div>
  );
};

export default Quotes;
