import React, { useState, useEffect } from 'react';
import { ArrowUpRight, ArrowDownRight, Landmark, Loader2, Plus, Wallet, TrendingUp, TrendingDown, Printer } from 'lucide-react';
import { supabase } from '../supabase';
import { Transaction } from '../types';
import { CURRENCY } from '../constants';

const Finance: React.FC = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [financials, setFinancials] = useState({
    balance: 0,
    monthlyIncome: 0,
    monthlyExpense: 0,
    clientDebt: 0,
    supplierDebt: 0
  });

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      setLoading(true);
      
      // 1. جلب المعاملات العامة (إيرادات ومصروفات)
      const { data: txData, error: txError } = await supabase
        .from('transactions')
        .select('*')
        .order('date', { ascending: false });
      if (txError) throw txError;

      // 2. جلب مدفوعات العمال (تعتبر مصروفات)
      const { data: workerPayData, error: wpError } = await supabase
        .from('worker_payments')
        .select('*, workers(name)')
        .order('date', { ascending: false });
      if (wpError) throw wpError;

      // 3. جلب الفواتير لحساب ديون العملاء
      const { data: invoicesData } = await supabase.from('invoices').select('total');
      
      // 4. جلب المشتريات لحساب ديون الموردين (نفترض أن غير المستلمة هي دين)
      const { data: purchasesData } = await supabase
        .from('purchases')
        .select('total')
        .neq('status', 'تم الاستلام');

      // --- معالجة البيانات ---

      // توحيد مدفوعات العمال كمعاملات مصروفات
      const workerTransactions: Transaction[] = (workerPayData || []).map((wp: any) => ({
        id: wp.id,
        description: `راتب/سلفة: ${wp.workers?.name || 'عامل'}`,
        amount: Number(wp.amount),
        date: wp.date,
        method: 'نقدي',
        status: 'مكتمل',
        type: 'expense',
        category: 'رواتب'
      }));

      // تنسيق المعاملات العادية
      const regularTransactions: Transaction[] = (txData || []).map((t: any) => ({
        id: t.id,
        description: t.description,
        amount: Number(t.amount),
        date: t.date,
        method: t.method,
        status: t.status,
        type: t.type as 'income' | 'expense',
        category: t.category || 'عام'
      }));

      // دمج الكل وترتيبهم حسب التاريخ
      const allTx = [...regularTransactions, ...workerTransactions].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      );

      // الحسابات
      const totalIncome = allTx.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
      const totalExpense = allTx.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
      const balance = totalIncome - totalExpense;

      // حسابات الشهر الحالي
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();
      
      const monthlyIncome = allTx
        .filter(t => t.type === 'income' && new Date(t.date).getMonth() === currentMonth && new Date(t.date).getFullYear() === currentYear)
        .reduce((sum, t) => sum + t.amount, 0);
        
      const monthlyExpense = allTx
        .filter(t => t.type === 'expense' && new Date(t.date).getMonth() === currentMonth && new Date(t.date).getFullYear() === currentYear)
        .reduce((sum, t) => sum + t.amount, 0);

      // حساب ديون العملاء (إجمالي الفواتير - إجمالي المقبوضات)
      const totalInvoiced = invoicesData?.reduce((sum, inv) => sum + (Number(inv.total) || 0), 0) || 0;
      // ملاحظة: نفترض هنا أن كل الدخل في المعاملات هو سداد من العملاء
      const clientDebt = Math.max(0, totalInvoiced - totalIncome);

      // حساب ديون الموردين
      const supplierDebt = purchasesData?.reduce((sum, p) => sum + (Number(p.total) || 0), 0) || 0;

      setTransactions(allTx);
      setFinancials({
        balance, 
        monthlyIncome, 
        monthlyExpense,
        clientDebt,
        supplierDebt
      });

    } catch (error) {
      console.error('Error fetching finance data:', error);
    } finally {
      setLoading(false);
    }
  }

  // دالة لإضافة معاملة يدوية (سريعة)
  const handleAddTransaction = async () => {
    const desc = prompt('وصف المعاملة (مثال: شراء قرطاسية):');
    if (!desc) return;
    const amountStr = prompt('المبلغ:');
    if (!amountStr) return;
    const type = confirm('هل هي إيراد؟ (موافق = إيراد / إلغاء = مصروف)') ? 'income' : 'expense';
    
    try {
      const { error } = await supabase.from('transactions').insert([{
        description: desc,
        amount: Number(amountStr),
        type: type,
        date: new Date().toISOString(),
        method: 'نقدي',
        status: 'مكتمل'
      }]);
      if (error) throw error;
      fetchData();
    } catch (e) {
      alert('خطأ في الإضافة');
    }
  };

  const handlePrintReport = () => {
    const printWindow = window.open('', '', 'width=900,height=600');
    if (!printWindow) return;

    const today = new Date().toLocaleDateString('ar-DZ');

    const htmlContent = `
      <html dir="rtl" lang="ar">
        <head>
          <title>تقرير مالي - ${today}</title>
          <link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;700&display=swap" rel="stylesheet">
          <style>
            body { font-family: 'Tajawal', sans-serif; padding: 40px; color: #1e293b; }
            .header { text-align: center; margin-bottom: 40px; border-bottom: 2px solid #e2e8f0; padding-bottom: 20px; }
            .header h1 { margin: 0; color: #0f172a; font-size: 24px; }
            .header p { color: #64748b; margin: 5px 0 0; }
            
            .summary-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-bottom: 40px; }
            .card { background: #f8fafc; padding: 20px; border-radius: 12px; border: 1px solid #e2e8f0; text-align: center; }
            .card h3 { margin: 0 0 10px; font-size: 14px; color: #64748b; }
            .card p { margin: 0; font-size: 20px; font-weight: bold; color: #0f172a; }
            .card.income p { color: #16a34a; }
            .card.expense p { color: #dc2626; }

            table { width: 100%; border-collapse: collapse; font-size: 12px; }
            th { background: #f1f5f9; padding: 12px; text-align: right; font-weight: bold; border-bottom: 2px solid #e2e8f0; }
            td { padding: 12px; border-bottom: 1px solid #e2e8f0; }
            tr:nth-child(even) { background: #f8fafc; }
            
            .income-row { color: #166534; }
            .expense-row { color: #991b1b; }
            
            .footer { margin-top: 50px; text-align: center; font-size: 10px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 20px; }
            
            @media print {
              button { display: none; }
              body { padding: 0; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>تقرير الوضع المالي</h1>
            <p>تاريخ الاستخراج: ${today}</p>
            <p>نظام بناء برو</p>
          </div>

          <div class="summary-grid">
            <div class="card">
              <h3>الرصيد الحالي</h3>
              <p>${financials.balance.toLocaleString()} ${CURRENCY}</p>
            </div>
            <div class="card income">
              <h3>مداخيل الشهر</h3>
              <p>+${financials.monthlyIncome.toLocaleString()} ${CURRENCY}</p>
            </div>
            <div class="card expense">
              <h3>مصاريف الشهر</h3>
              <p>-${financials.monthlyExpense.toLocaleString()} ${CURRENCY}</p>
            </div>
          </div>
          
          <div class="summary-grid" style="grid-template-columns: 1fr 1fr;">
             <div class="card">
              <h3>ديون العملاء (لنا)</h3>
              <p>${financials.clientDebt.toLocaleString()} ${CURRENCY}</p>
            </div>
            <div class="card">
              <h3>ديون الموردين (علينا)</h3>
              <p>${financials.supplierDebt.toLocaleString()} ${CURRENCY}</p>
            </div>
          </div>

          <h3 style="margin-bottom: 15px;">سجل المعاملات التفصيلي</h3>
          <table>
            <thead>
              <tr>
                <th>التاريخ</th>
                <th>الوصف</th>
                <th>النوع</th>
                <th>المبلغ</th>
                <th>طريقة الدفع</th>
              </tr>
            </thead>
            <tbody>
              ${transactions.map(t => `
                <tr class="${t.type === 'income' ? 'income-row' : 'expense-row'}">
                  <td>${new Date(t.date).toLocaleDateString('ar-DZ')}</td>
                  <td>${t.description}</td>
                  <td>${t.type === 'income' ? 'إيراد' : 'مصروف'}</td>
                  <td style="font-weight:bold; direction: ltr; text-align: left;">${t.amount.toLocaleString()}</td>
                  <td>${t.method || 'نقدي'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div class="footer">
            تم استخراج هذا المستند إلكترونياً عبر منصة بناء برو للإدارة الرقمية.
          </div>
          <script>
            window.onload = function() { window.print(); }
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  if (loading) return <div className="flex justify-center p-20"><Loader2 className="animate-spin text-blue-600" size={40} /></div>;

  return (
    <div className="space-y-6">
      {/* بطاقات الملخص العلوية */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* البطاقة الرئيسية للرصيد */}
        <div className="bg-slate-900 p-8 rounded-[32px] shadow-2xl shadow-slate-900/20 text-white relative overflow-hidden group">
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-2 opacity-70">
               <Wallet size={18} />
               <p className="text-sm font-medium">الخزينة الحالية</p>
            </div>
            <h2 className="text-4xl font-black mb-8 tracking-tight">{financials.balance.toLocaleString()} <span className="text-xl font-normal opacity-60">{CURRENCY}</span></h2>
            <div className="flex justify-between items-center">
               <div className={`px-4 py-1.5 rounded-full text-xs font-bold backdrop-blur-md flex items-center gap-2 ${financials.balance >= 0 ? 'bg-green-500/20 text-green-300 border border-green-500/30' : 'bg-red-500/20 text-red-300 border border-red-500/30'}`}>
                  {financials.balance >= 0 ? <TrendingUp size={14}/> : <TrendingDown size={14}/>}
                  {financials.balance >= 0 ? 'وضع مالي مستقر' : 'عجز في السيولة'}
               </div>
            </div>
          </div>
          {/* خلفية جمالية */}
          <div className="absolute right-0 top-0 w-64 h-64 bg-blue-600/20 rounded-full blur-[80px] group-hover:bg-blue-600/30 transition-all duration-500"></div>
          <div className="absolute -left-10 -bottom-10 w-40 h-40 bg-purple-600/20 rounded-full blur-[60px]"></div>
        </div>

        {/* بطاقة المداخيل الشهرية */}
        <div className="bg-white p-6 rounded-[28px] shadow-sm border border-slate-100 flex flex-col justify-between hover:shadow-md transition-shadow">
           <div className="flex justify-between items-start">
              <div className="p-3 bg-green-50 text-green-600 rounded-2xl"><ArrowUpRight size={24}/></div>
              <span className="text-[10px] font-black text-green-600 bg-green-50 px-3 py-1 rounded-full uppercase">هذا الشهر</span>
           </div>
           <div className="mt-6">
              <p className="text-slate-400 text-xs mb-1 font-bold">المداخيل الشهرية</p>
              <p className="text-3xl font-black text-slate-800 tracking-tight">{financials.monthlyIncome.toLocaleString()} <span className="text-sm font-normal text-slate-400">{CURRENCY}</span></p>
           </div>
        </div>

        {/* بطاقة المصاريف الشهرية */}
        <div className="bg-white p-6 rounded-[28px] shadow-sm border border-slate-100 flex flex-col justify-between hover:shadow-md transition-shadow">
           <div className="flex justify-between items-start">
              <div className="p-3 bg-red-50 text-red-600 rounded-2xl"><ArrowDownRight size={24}/></div>
              <span className="text-[10px] font-black text-red-600 bg-red-50 px-3 py-1 rounded-full uppercase">هذا الشهر</span>
           </div>
           <div className="mt-6">
              <p className="text-slate-400 text-xs mb-1 font-bold">المصاريف الشهرية</p>
              <p className="text-3xl font-black text-slate-800 tracking-tight">{financials.monthlyExpense.toLocaleString()} <span className="text-sm font-normal text-slate-400">{CURRENCY}</span></p>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* جدول المعاملات */}
        <div className="lg:col-span-2 bg-white rounded-[28px] shadow-sm border border-slate-100 overflow-hidden flex flex-col">
          <div className="p-6 border-b border-slate-50 flex justify-between items-center bg-slate-50/30">
            <h3 className="font-bold text-slate-800 flex items-center gap-2">
              <Landmark size={20} className="text-blue-600"/>
              سجل المعاملات المالية
            </h3>
            <button onClick={handleAddTransaction} className="flex items-center gap-1 bg-blue-600 text-white px-3 py-1.5 rounded-xl text-xs font-bold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/20">
              <Plus size={16}/> معاملة سريعة
            </button>
          </div>
          <div className="divide-y divide-slate-50 overflow-y-auto h-[400px] scrollbar-thin">
            {transactions.map(tx => (
              <div key={tx.id} className="flex items-center justify-between p-5 hover:bg-slate-50 transition-colors group">
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-colors ${
                    tx.type === 'income' ? 'bg-green-50 text-green-600 group-hover:bg-green-100' : 'bg-red-50 text-red-600 group-hover:bg-red-100'
                  }`}>
                    {tx.type === 'income' ? <ArrowUpRight size={20} /> : <ArrowDownRight size={20} />}
                  </div>
                  <div>
                    <p className="font-bold text-slate-800 text-sm">{tx.description}</p>
                    <div className="flex items-center gap-2 text-[10px] text-slate-400 font-medium mt-0.5">
                       <span>{new Date(tx.date).toLocaleDateString('ar-DZ')}</span>
                       <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                       <span>{tx.method || 'نقدي'}</span>
                       {tx.category && (
                         <>
                           <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                           <span className="text-blue-500">{tx.category}</span>
                         </>
                       )}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`font-black text-sm dir-ltr ${tx.type === 'income' ? 'text-green-600' : 'text-slate-800'}`}>
                    {tx.type === 'income' ? '+' : '-'} {tx.amount.toLocaleString()}
                  </p>
                  <span className="text-[10px] font-bold text-slate-400 text-xs">{CURRENCY}</span>
                </div>
              </div>
            ))}
            {transactions.length === 0 && (
              <div className="text-center py-20 text-slate-400">لا توجد معاملات مسجلة بعد</div>
            )}
          </div>
        </div>

        {/* قسم الديون والمستحقات */}
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-[28px] shadow-sm border border-slate-100 h-full">
            <h3 className="font-bold text-slate-800 mb-6 border-b border-slate-50 pb-4">المستحقات والديون</h3>
            
            <div className="space-y-6">
              {/* ديون العملاء */}
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                <div className="flex justify-between items-start mb-2">
                   <div className="p-2 bg-blue-100 text-blue-600 rounded-xl"><Wallet size={16}/></div>
                   <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">مستحقات عند العملاء</span>
                </div>
                <p className="text-2xl font-black text-slate-800">{financials.clientDebt.toLocaleString()} <span className="text-xs font-normal text-slate-400">{CURRENCY}</span></p>
                <div className="w-full bg-slate-200 h-1.5 rounded-full mt-3 overflow-hidden">
                   <div className="bg-blue-500 h-full rounded-full w-3/4"></div>
                </div>
              </div>

              {/* ديون الموردين */}
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                <div className="flex justify-between items-start mb-2">
                   <div className="p-2 bg-amber-100 text-amber-600 rounded-xl"><ArrowDownRight size={16}/></div>
                   <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">ديون للموردين</span>
                </div>
                <p className="text-2xl font-black text-amber-600">{financials.supplierDebt.toLocaleString()} <span className="text-xs font-normal text-amber-600/60">{CURRENCY}</span></p>
                <div className="w-full bg-slate-200 h-1.5 rounded-full mt-3 overflow-hidden">
                   <div className="bg-amber-500 h-full rounded-full w-1/4"></div>
                </div>
              </div>

              <div className="pt-2">
                <button 
                  onClick={handlePrintReport}
                  className="w-full py-3 bg-white border border-slate-200 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-50 transition-all shadow-sm flex items-center justify-center gap-2"
                >
                  <Printer size={16}/>
                  تحميل التقرير المالي (PDF)
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Finance;