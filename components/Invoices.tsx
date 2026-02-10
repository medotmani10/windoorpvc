
import React, { useState, useEffect } from 'react';
import { Plus, Download, Printer, Filter, Trash2, Save, FileText, ChevronRight, Loader2, FileCheck, Calendar, FileSpreadsheet, Search, X } from 'lucide-react';
import { Invoice, InvoiceItem, InvoiceType, Client } from '../types';
import { supabase } from '../supabase';
import { CURRENCY } from '../constants';

const Invoices: React.FC = () => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [invoiceType, setInvoiceType] = useState<InvoiceType>('ضريبية');
  const [items, setItems] = useState<Partial<InvoiceItem>[]>([
    { id: '1', description: '', unit: 'متر', quantity: 1, unitPrice: 0, total: 0 }
  ]);
  
  // Data State
  const [invoices, setInvoices] = useState<any[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filter State
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Form State
  const [selectedClientId, setSelectedClientId] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [saving, setSaving] = useState(false);
  const [printingId, setPrintingId] = useState<string | null>(null);

  useEffect(() => {
    fetchInvoices();
    fetchClients();
  }, [dateFrom, dateTo]);

  async function fetchInvoices() {
    try {
      setLoading(true);
      let query = supabase
        .from('invoices')
        .select('*, clients(name)')
        .order('created_at', { ascending: false });

      if (dateFrom) {
        query = query.gte('date', dateFrom);
      }
      if (dateTo) {
        query = query.lte('date', dateTo);
      }

      const { data, error } = await query;
        
      if (error) throw error;
      
      const mappedInvoices = data.map((inv: any) => ({
        id: inv.id,
        client: inv.clients?.name || 'عميل غير معروف',
        amount: inv.total,
        date: inv.date,
        type: inv.type,
        status: inv.status,
        rawDate: inv.date 
      }));
      
      setInvoices(mappedInvoices);
    } catch (error) {
      console.error('Error fetching invoices:', error);
    } finally {
      setLoading(false);
    }
  }

  async function fetchClients() {
    const { data } = await supabase.from('clients').select('id, name, address, phone');
    if (data) setClients(data as any);
  }

  // --- Actions ---

  const handleSaveInvoice = async () => {
    if (!selectedClientId) return alert('الرجاء اختيار العميل');
    if (items.length === 0 || !items[0].description) return alert('الرجاء إضافة بند واحد على الأقل');

    setSaving(true);
    const subTotal = items.reduce((sum, item) => sum + (item.total || 0), 0);
    const tax = subTotal * 0.19; // 19% VAT
    const total = subTotal + tax;

    try {
      // 1. Insert Invoice
      const { data: invoiceData, error: invoiceError } = await supabase
        .from('invoices')
        .insert({
          type: invoiceType,
          client_id: selectedClientId,
          amount: subTotal,
          tax: tax,
          total: total,
          status: invoiceType === 'شكلية' ? 'مسودة' : 'معلقة',
          due_date: dueDate || null,
          date: new Date().toISOString()
        })
        .select()
        .single();

      if (invoiceError) throw invoiceError;

      // 2. Insert Items
      if (invoiceData) {
        const invoiceItems = items.map(item => ({
          invoice_id: invoiceData.id,
          description: item.description,
          unit: item.unit,
          quantity: item.quantity,
          unit_price: item.unitPrice,
          total: item.total
        }));

        const { error: itemsError } = await supabase
          .from('invoice_items')
          .insert(invoiceItems);
          
        if (itemsError) throw itemsError;
        
        setShowCreateModal(false);
        fetchInvoices();
        setItems([{ id: '1', description: '', unit: 'متر', quantity: 1, unitPrice: 0, total: 0 }]);
        setSelectedClientId('');
        setDueDate('');
      }
    } catch (error) {
      console.error('Error saving invoice:', error);
      alert('حدث خطأ أثناء حفظ الفاتورة');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('هل أنت متأكد من حذف هذه الفاتورة؟ لا يمكن التراجع عن هذا الإجراء.')) return;
    try {
      const { error } = await supabase.from('invoices').delete().eq('id', id);
      if (error) throw error;
      setInvoices(invoices.filter(inv => inv.id !== id));
    } catch (error) {
      alert('فشل حذف الفاتورة');
    }
  };

  const handleConvertToFinal = async (id: string) => {
    if (!window.confirm('هل تريد اعتماد الفاتورة كفاتورة ضريبية نهائية؟')) return;
    try {
      const { error } = await supabase.from('invoices').update({ type: 'ضريبية', status: 'معلقة' }).eq('id', id);
      if (error) throw error;
      fetchInvoices();
    } catch (error) {
      alert('فشل التحديث');
    }
  };

  const handleExportCSV = () => {
    try {
      if (filteredInvoices.length === 0) {
        return alert('لا توجد بيانات لتصديرها');
      }

      const headers = ['الرقم المرجعي', 'النوع', 'العميل', 'المبلغ الإجمالي', 'التاريخ', 'الحالة'];
      const csvRows = filteredInvoices.map(inv => [
        `"${inv.id}"`, // Escape ID
        `"${inv.type}"`,
        `"${inv.client.replace(/"/g, '""')}"`, // Escape quotes
        inv.amount,
        `"${new Date(inv.date).toLocaleDateString('ar-DZ')}"`,
        `"${inv.status}"`
      ]);

      const csvContent = [
        headers.join(','),
        ...csvRows.map(row => row.join(','))
      ].join('\n');

      const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `invoices_${new Date().toISOString().slice(0,10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error(err);
      alert('حدث خطأ أثناء التصدير');
    }
  };

  const handlePrintInvoice = async (invoiceId: string) => {
    // Open window immediately to satisfy popup blockers
    const printWindow = window.open('', '_blank', 'width=900,height=1000');
    if (!printWindow) {
      alert('تم حظر النافذة المنبثقة. يرجى السماح بالنوافذ المنبثقة لهذا الموقع.');
      return;
    }

    // Set initial loading state content
    printWindow.document.write(`
      <html dir="rtl">
        <head><title>جاري التحميل...</title></head>
        <body style="font-family:sans-serif;text-align:center;padding:50px;display:flex;flex-direction:column;align-items:center;justify-content:center;">
          <div style="border: 4px solid #f3f3f3; border-top: 4px solid #fbbf24; border-radius: 50%; width: 40px; height: 40px; animation: spin 1s linear infinite;"></div>
          <h3 style="color:#555;margin-top:20px;">جاري تحضير الفاتورة...</h3>
          <style>@keyframes spin {0% {transform: rotate(0deg);} 100% {transform: rotate(360deg);}}</style>
        </body>
      </html>
    `);

    try {
      setPrintingId(invoiceId);
      
      // Fetch full details
      const { data: invoiceData, error } = await supabase
        .from('invoices')
        .select(`
          *,
          clients (name, address, phone),
          invoice_items (*)
        `)
        .eq('id', invoiceId)
        .single();

      if (error) throw error;
      if (!invoiceData) throw new Error('لم يتم العثور على الفاتورة');

      // Fetch Company Settings
      const { data: settings } = await supabase.from('settings').select('*').single();
      const company = settings || { company_name: 'Windoor', address: 'الجزائر', phone: '' };

      const client = invoiceData.clients;
      const invItems = invoiceData.invoice_items || [];
      const isProforma = invoiceData.type === 'شكلية';
      const title = isProforma ? 'فاتورة شكلية / Proforma Invoice' : 'فاتورة / Invoice';

      const htmlContent = `
        <html dir="rtl" lang="ar">
        <head>
          <title>${title} #${invoiceData.id.substring(0, 8)}</title>
          <link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;700&display=swap" rel="stylesheet">
          <style>
            body { font-family: 'Tajawal', sans-serif; padding: 40px; color: #1e293b; max-width: 800px; margin: 0 auto; background: white; }
            .header-top { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px; border-bottom: 2px solid #e2e8f0; padding-bottom: 20px; }
            .company-info h1 { margin: 0; color: #000; font-size: 24px; font-weight: 900; }
            .company-info p { margin: 5px 0; font-size: 12px; color: #64748b; }
            .logo-img { height: 60px; object-fit: contain; margin-bottom: 10px; }
            .invoice-meta { text-align: left; }
            .invoice-meta h2 { margin: 0; color: #fbbf24; font-size: 20px; text-transform: uppercase; font-weight: 900; }
            .invoice-meta p { margin: 5px 0; font-size: 12px; color: #64748b; }
            .client-box { background: #f8fafc; padding: 20px; border-radius: 8px; margin-bottom: 30px; border: 1px solid #e2e8f0; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
            th { background: #000; color: #fbbf24; padding: 12px; text-align: right; font-weight: bold; font-size: 12px; }
            td { padding: 12px; border-bottom: 1px solid #e2e8f0; font-size: 13px; }
            .totals { width: 300px; margin-right: auto; }
            .totals-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e2e8f0; }
            .totals-row.final { border-bottom: none; border-top: 2px solid #000; margin-top: 10px; padding-top: 15px; font-weight: bold; font-size: 16px; }
            .footer { margin-top: 60px; text-align: center; font-size: 10px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 20px; }
            @media print {
              body { padding: 0; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="header-top">
            <div class="company-info">
              ${company.logo_url ? `<img src="${company.logo_url}" class="logo-img" alt="Logo" />` : ''}
              <h1>${company.company_name}</h1>
              <p>${company.address || ''}</p>
              <p>${company.phone ? `هاتف: ${company.phone}` : ''} ${company.email ? `| بريد: ${company.email}` : ''}</p>
              ${company.tax_id ? `<p>NIF/RC: ${company.tax_id}</p>` : ''}
            </div>
            <div class="invoice-meta">
              <h2>${title}</h2>
              <p>رقم: <strong>#${invoiceData.id.substring(0, 8)}</strong></p>
              <p>التاريخ: ${new Date(invoiceData.date).toLocaleDateString('ar-DZ')}</p>
            </div>
          </div>

          <div class="client-box">
            <h3 style="margin:0 0 10px;font-size:14px;color:#64748b;">بيانات العميل</h3>
            <p style="margin:0;font-weight:bold;">${client?.name || 'عميل عام'}</p>
            <p style="margin:5px 0 0;font-size:12px;">${client?.phone || ''} - ${client?.address || ''}</p>
          </div>

          <table>
            <thead>
              <tr>
                <th style="width: 50%">الوصف</th>
                <th style="width: 10%">الوحدة</th>
                <th style="width: 10%">الكمية</th>
                <th style="width: 15%">السعر</th>
                <th style="width: 15%">الإجمالي</th>
              </tr>
            </thead>
            <tbody>
              ${invItems.map((item: any) => `
                <tr>
                  <td>${item.description}</td>
                  <td>${item.unit}</td>
                  <td>${item.quantity}</td>
                  <td>${Number(item.unit_price).toLocaleString()}</td>
                  <td style="font-weight: bold;">${Number(item.total).toLocaleString()}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div class="totals">
            <div class="totals-row">
              <span>المجموع (HT)</span>
              <span>${Number(invoiceData.amount).toLocaleString()} ${CURRENCY}</span>
            </div>
            <div class="totals-row">
              <span>الضريبة (19%)</span>
              <span>${Number(invoiceData.tax).toLocaleString()} ${CURRENCY}</span>
            </div>
            <div class="totals-row final">
              <span>الإجمالي (TTC)</span>
              <span>${Number(invoiceData.total).toLocaleString()} ${CURRENCY}</span>
            </div>
          </div>

          <div class="footer">
            <p>${company.footer_text || 'شكراً لتعاملكم معنا'}</p>
          </div>
          <script>
            // Auto print when loaded
            window.onload = function() { setTimeout(function() { window.print(); }, 800); };
          </script>
        </body>
        </html>
      `;

      // Write content to existing window
      printWindow.document.open();
      printWindow.document.write(htmlContent);
      printWindow.document.close();

    } catch (error: any) {
      console.error('Print Error:', error);
      // Show error in the window instead of closing it so user knows what happened
      if (printWindow) {
        printWindow.document.body.innerHTML = `
          <div style="color:red;text-align:center;padding:20px;font-family:sans-serif;">
            <h3>فشل تحميل الفاتورة</h3>
            <p>${error.message || 'حدث خطأ غير معروف'}</p>
            <button onclick="window.close()" style="padding:10px 20px;cursor:pointer;">إغلاق</button>
          </div>
        `;
      }
    } finally {
      setPrintingId(null);
    }
  };

  const addItem = () => {
    setItems([...items, { id: Math.random().toString(), description: '', unit: 'متر', quantity: 1, unitPrice: 0, total: 0 }]);
  };

  const removeItem = (id: string) => {
    if (items.length > 1) {
      setItems(items.filter(item => item.id !== id));
    }
  };

  const updateItem = (id: string, field: keyof InvoiceItem, value: any) => {
    setItems(items.map(item => {
      if (item.id === id) {
        const updated = { ...item, [field]: value };
        if (field === 'quantity' || field === 'unitPrice') {
          updated.total = (updated.quantity || 0) * (updated.unitPrice || 0);
        }
        return updated;
      }
      return item;
    }));
  };

  const subTotal = items.reduce((sum, item) => sum + (item.total || 0), 0);
  const tax = subTotal * 0.19;
  const total = subTotal + tax;

  const filteredInvoices = invoices.filter(inv => 
    inv.client.toLowerCase().includes(searchTerm.toLowerCase()) || 
    inv.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      
      {/* Top Header & Stats */}
      <div className="flex flex-col xl:flex-row gap-6 justify-between items-start xl:items-center bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
        <div>
           <h2 className="text-2xl font-black text-slate-800">الفواتير والمطالبات</h2>
           <p className="text-slate-400 text-sm mt-1">إدارة الفواتير الضريبية والشكلية وتتبع المدفوعات</p>
        </div>
        
        <div className="flex flex-wrap gap-3 w-full xl:w-auto">
          {/* Date Filter */}
          <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-xl border border-slate-200">
             <div className="relative">
               <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="bg-transparent text-xs font-bold text-slate-600 outline-none w-28 px-2"/>
             </div>
             <span className="text-slate-300 text-xs">إلى</span>
             <div className="relative">
               <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="bg-transparent text-xs font-bold text-slate-600 outline-none w-28 px-2"/>
             </div>
             {(dateFrom || dateTo) && (
               <button onClick={() => { setDateFrom(''); setDateTo(''); }} className="p-1 hover:bg-slate-200 rounded-full"><X size={12}/></button>
             )}
          </div>

          <div className="h-8 w-px bg-slate-200 hidden xl:block"></div>

          <button 
             onClick={handleExportCSV}
             className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-50 hover:text-slate-900 transition-all"
          >
             <FileSpreadsheet size={16} className="text-green-600"/>
             تصدير Excel
          </button>
          
          <button 
            onClick={() => { setInvoiceType('شكلية'); setShowCreateModal(true); }}
            className="flex items-center gap-2 px-4 py-2.5 bg-amber-50 text-amber-700 rounded-xl text-xs font-bold hover:bg-amber-100 transition-all border border-amber-100"
          >
            <FileText size={16} />
            شكلية جديدة
          </button>
          
          <button 
            onClick={() => { setInvoiceType('ضريبية'); setShowCreateModal(true); }}
            className="flex items-center gap-2 px-5 py-2.5 bg-yellow-400 text-black rounded-xl text-xs font-bold shadow-lg shadow-yellow-400/20 hover:bg-yellow-500 transition-all"
          >
            <Plus size={16} />
            فاتورة جديدة
          </button>
        </div>
      </div>

      {/* Invoices List */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden min-h-[500px] flex flex-col">
        {/* Search Bar */}
        <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center gap-3">
           <Search size={18} className="text-slate-400" />
           <input 
             type="text" 
             placeholder="بحث برقم الفاتورة أو اسم العميل..." 
             className="bg-transparent w-full text-sm outline-none placeholder:text-slate-400"
             value={searchTerm}
             onChange={e => setSearchTerm(e.target.value)}
           />
        </div>

        {loading ? (
           <div className="flex flex-1 justify-center items-center"><Loader2 className="animate-spin text-yellow-500" size={32} /></div>
        ) : (
        <div className="overflow-x-auto flex-1">
          <table className="w-full text-sm text-right">
            <thead className="bg-slate-50 text-slate-500 font-bold text-[10px] uppercase border-b border-slate-100">
              <tr>
                <th className="px-6 py-4">المرجع</th>
                <th className="px-6 py-4">النوع</th>
                <th className="px-6 py-4">العميل</th>
                <th className="px-6 py-4">المبلغ</th>
                <th className="px-6 py-4">التاريخ</th>
                <th className="px-6 py-4">الحالة</th>
                <th className="px-6 py-4 text-center">خيارات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredInvoices.map(inv => (
                <tr key={inv.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-6 py-4 font-black text-yellow-600 truncate max-w-[100px]" title={inv.id}>{inv.id.substring(0,8)}...</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold ${
                      inv.type === 'شكلية' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'
                    }`}>
                      {inv.type}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-medium text-slate-700">{inv.client}</td>
                  <td className="px-6 py-4 font-bold text-slate-900">{inv.amount.toLocaleString()} {CURRENCY}</td>
                  <td className="px-6 py-4 text-slate-400 text-xs">{new Date(inv.date).toLocaleDateString('ar-DZ')}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        inv.status === 'مدفوعة بالكامل' ? 'bg-green-100 text-green-700' : 
                        inv.status === 'مسودة' ? 'bg-slate-100 text-slate-500' : 'bg-amber-100 text-amber-700'
                    }`}>
                      {inv.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex justify-center gap-1">
                      {inv.type === 'شكلية' && (
                        <button 
                          onClick={() => handleConvertToFinal(inv.id)} 
                          title="اعتماد كفاتورة نهائية" 
                          className="p-2 text-slate-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                        >
                          <FileCheck size={16}/>
                        </button>
                      )}
                      
                      <button 
                        onClick={() => handlePrintInvoice(inv.id)}
                        disabled={printingId === inv.id}
                        title="تحميل PDF" 
                        className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                      >
                         {printingId === inv.id ? <Loader2 className="animate-spin" size={16}/> : <Download size={16}/>}
                      </button>

                      <button 
                        onClick={() => handlePrintInvoice(inv.id)}
                        disabled={printingId === inv.id}
                        title="طباعة" 
                        className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg"
                      >
                         <Printer size={16}/>
                      </button>

                      <button 
                        onClick={() => handleDelete(inv.id)}
                        title="حذف" 
                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                      >
                        <Trash2 size={16}/>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredInvoices.length === 0 && (
                 <tr><td colSpan={7} className="text-center py-20 text-slate-400 flex flex-col items-center justify-center w-full">
                    <FileText size={40} className="mb-4 opacity-20"/>
                    <p>لا توجد فواتير مطابقة للبحث</p>
                 </td></tr>
              )}
            </tbody>
          </table>
        </div>
        )}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-4xl max-h-[90vh] rounded-3xl shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div>
                <h3 className="text-lg font-bold text-slate-800">إنشاء فاتورة {invoiceType} جديدة</h3>
                <p className="text-xs text-slate-400">أدخل تفاصيل الخدمات وأسعار الوحدات</p>
              </div>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-slate-600 p-2"><X size={24}/></button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 mr-1">العميل</label>
                  <select 
                    value={selectedClientId}
                    onChange={(e) => setSelectedClientId(e.target.value)}
                    className="w-full p-3 bg-white border border-slate-300 rounded-xl text-sm outline-none focus:ring-2 focus:ring-yellow-400/20 text-slate-900"
                  >
                    <option value="">اختر العميل...</option>
                    {clients.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 mr-1">تاريخ الاستحقاق</label>
                  <div className="relative">
                    <input 
                      type="date" 
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                      className="w-full p-3 pl-10 bg-white border border-slate-300 rounded-xl text-sm outline-none text-slate-900" 
                    />
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={18} />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h4 className="text-sm font-bold text-slate-700">بنود الفاتورة</h4>
                  <button onClick={addItem} className="text-yellow-600 text-xs font-bold flex items-center gap-1 hover:underline">
                    <Plus size={14} /> إضافة بند
                  </button>
                </div>
                
                <div className="space-y-3">
                  {items.map((item, index) => (
                    <div key={item.id} className="grid grid-cols-12 gap-2 p-4 bg-slate-50 rounded-2xl border border-slate-100 items-end">
                      <div className="col-span-12 md:col-span-5 space-y-1">
                        <label className="text-[10px] font-bold text-slate-400">الوصف</label>
                        <input 
                          value={item.description}
                          onChange={(e) => updateItem(item.id!, 'description', e.target.value)}
                          placeholder="وصف الخدمة أو المنتج" 
                          className="w-full p-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900" 
                        />
                      </div>
                      <div className="col-span-3 md:col-span-2 space-y-1">
                        <label className="text-[10px] font-bold text-slate-400">الوحدة</label>
                        <select 
                          value={item.unit}
                          onChange={(e) => updateItem(item.id!, 'unit', e.target.value)}
                          className="w-full p-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900"
                        >
                          <option>متر</option><option>طن</option><option>ساعة</option><option>م3</option><option>م2</option><option>وحدة</option>
                        </select>
                      </div>
                      <div className="col-span-3 md:col-span-2 space-y-1">
                        <label className="text-[10px] font-bold text-slate-400">السعر</label>
                        <input 
                          type="number"
                          value={item.unitPrice}
                          onChange={(e) => updateItem(item.id!, 'unitPrice', parseFloat(e.target.value))}
                          className="w-full p-2 bg-white border border-slate-300 rounded-lg text-sm text-center text-slate-900" 
                        />
                      </div>
                      <div className="col-span-3 md:col-span-2 space-y-1">
                        <label className="text-[10px] font-bold text-slate-400">الكمية</label>
                        <input 
                          type="number"
                          value={item.quantity}
                          onChange={(e) => updateItem(item.id!, 'quantity', parseFloat(e.target.value))}
                          className="w-full p-2 bg-white border border-slate-300 rounded-lg text-sm text-center text-slate-900" 
                        />
                      </div>
                      <div className="col-span-3 md:col-span-1 flex justify-center pb-1">
                        <button onClick={() => removeItem(item.id!)} className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex flex-col md:flex-row justify-between items-center gap-6">
              <div className="flex gap-8 text-right w-full md:w-auto">
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">المجموع (HT)</p>
                  <p className="text-lg font-bold text-slate-700">{subTotal.toLocaleString()} {CURRENCY}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">TVA (19%)</p>
                  <p className="text-lg font-bold text-slate-500">{tax.toLocaleString()} {CURRENCY}</p>
                </div>
                <div className="border-r border-slate-200 pr-8">
                  <p className="text-[10px] font-bold text-yellow-600 uppercase">الصافي (TTC)</p>
                  <p className="text-2xl font-black text-yellow-600">{total.toLocaleString()} {CURRENCY}</p>
                </div>
              </div>
              <div className="flex gap-3 w-full md:w-auto">
                <button onClick={() => setShowCreateModal(false)} className="flex-1 md:flex-none px-6 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50">إلغاء</button>
                <button 
                  onClick={handleSaveInvoice} 
                  disabled={saving}
                  className="flex-1 md:flex-none px-8 py-3 bg-yellow-400 text-black rounded-xl text-sm font-bold shadow-lg shadow-yellow-400/20 hover:bg-yellow-500 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                  حفظ وإصدار
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default Invoices;
