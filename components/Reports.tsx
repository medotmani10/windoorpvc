
import React, { useEffect, useState } from 'react';
import { BarChart3, FileSpreadsheet, FilePieChart, Download, Loader2, Printer } from 'lucide-react';
import { supabase } from '../supabase';
import { CURRENCY } from '../constants';

const Reports: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [reportData, setReportData] = useState({
    avgProgress: 0,
    activeCount: 0,
    totalBudget: 0,
    totalExpenses: 0
  });
  
  const [generatingReport, setGeneratingReport] = useState<string | null>(null);

  useEffect(() => {
    fetchReportData();
  }, []);

  async function fetchReportData() {
    try {
      setLoading(true);
      const { data: projects, error } = await supabase.from('projects').select('*');
      if (error) throw error;

      if (projects) {
        const activeProjects = projects.filter((p: any) => p.status === 'نشط');
        const avgProgress = activeProjects.length 
          ? activeProjects.reduce((sum: number, p: any) => sum + (p.progress || 0), 0) / activeProjects.length 
          : 0;
        
        const totalBudget = projects.reduce((sum: number, p: any) => sum + (Number(p.budget) || 0), 0);
        const totalExpenses = projects.reduce((sum: number, p: any) => sum + (Number(p.expenses) || 0), 0);

        setReportData({
          avgProgress: Math.round(avgProgress),
          activeCount: activeProjects.length,
          totalBudget,
          totalExpenses
        });
      }
    } catch (error) {
      console.error('Error fetching reports:', error);
    } finally {
      setLoading(false);
    }
  }

  const handlePrintReport = async (reportTitle: string) => {
    setGeneratingReport(reportTitle);
    
    try {
      // Get Company Info
      const { data: settings } = await supabase.from('settings').select('*').single();
      const company = settings || { company_name: 'Windoor System' };

      let htmlContent = '';
      const dateStr = new Date().toLocaleDateString('ar-DZ');
      
      const getStyles = () => `
        <style>
          body { font-family: 'Tajawal', sans-serif; padding: 30px; direction: rtl; color: #1e293b; }
          .header { text-align: center; margin-bottom: 40px; border-bottom: 2px solid #e2e8f0; padding-bottom: 20px; }
          .company-name { font-size: 18px; font-weight: bold; color: #000; margin-bottom: 5px; }
          h1 { margin: 10px 0; font-size: 24px; color: #fbbf24; text-transform: uppercase; }
          .meta { color: #64748b; font-size: 12px; margin-top: 5px; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 12px; }
          th { background: #000; padding: 12px; text-align: right; font-weight: bold; color: #fbbf24; }
          td { padding: 12px; border-bottom: 1px solid #e2e8f0; color: #334155; }
          tr:nth-child(even) { background: #f8fafc; }
          .stat-container { display: flex; justify-content: center; gap: 20px; margin-bottom: 30px; }
          .stat-box { padding: 15px 25px; background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; text-align: center; min-width: 150px; box-shadow: 0 2px 4px rgba(0,0,0,0.05); }
          .stat-val { font-size: 20px; font-weight: 800; display: block; color: #0f172a; }
          .stat-label { font-size: 11px; color: #64748b; margin-top: 4px; display: block; }
          .footer { margin-top: 50px; padding-top: 20px; border-top: 1px solid #e2e8f0; text-align: center; font-size: 10px; color: #94a3b8; }
          @media print {
            body { padding: 0; }
            .no-print { display: none; }
          }
        </style>
      `;

      const getHeader = (title: string) => `
        <div class="header">
          <div class="company-name">${company.company_name}</div>
          <h1>${title}</h1>
          <div class="meta">
            <p>تاريخ الاستخراج: ${dateStr}</p>
            <p>نظام Windoor لإدارة المشاريع</p>
          </div>
        </div>
      `;

      if (reportTitle === 'أداء المشاريع السنوي') {
        const { data: projects } = await supabase.from('projects').select('*').order('created_at', {ascending: false});
        const list = projects || [];
        
        const rows = list.map(p => `
          <tr>
            <td style="font-weight:bold">${p.name}</td>
            <td>${p.client}</td>
            <td><span style="padding:4px 8px;border-radius:4px;background:#f1f5f9;font-size:10px">${p.status}</span></td>
            <td>
              <div style="width:100px;background:#e2e8f0;height:6px;border-radius:3px;overflow:hidden">
                <div style="width:${p.progress}%;background:#fbbf24;height:100%"></div>
              </div>
              <span style="font-size:10px">${p.progress}%</span>
            </td>
            <td>${Number(p.budget).toLocaleString()}</td>
            <td>${Number(p.expenses).toLocaleString()}</td>
            <td>${p.start_date || '-'}</td>
          </tr>
        `).join('');

        htmlContent = `
          <html dir="rtl">
            <head><title>تقرير المشاريع</title>
            <link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;800&display=swap" rel="stylesheet">
            ${getStyles()}
            </head>
            <body>
              ${getHeader('تقرير أداء المشاريع الشامل')}
              <div class="stat-container">
                 <div class="stat-box"><span class="stat-val">${list.length}</span><span class="stat-label">إجمالي المشاريع</span></div>
                 <div class="stat-box"><span class="stat-val">${list.filter(p => p.status === 'نشط').length}</span><span class="stat-label">المشاريع النشطة</span></div>
                 <div class="stat-box"><span class="stat-val text-yellow-600">${list.reduce((s,p) => s + Number(p.budget),0).toLocaleString()} ${CURRENCY}</span><span class="stat-label">إجمالي الميزانيات</span></div>
              </div>
              <table>
                <thead>
                  <tr>
                    <th>المشروع</th>
                    <th>العميل</th>
                    <th>الحالة</th>
                    <th>نسبة الإنجاز</th>
                    <th>الميزانية</th>
                    <th>المصروفات</th>
                    <th>تاريخ البدء</th>
                  </tr>
                </thead>
                <tbody>${rows}</tbody>
              </table>
              <div class="footer">${company.footer_text || 'تم إنشاء هذا التقرير تلقائياً'}</div>
            </body>
          </html>
        `;

      } else if (reportTitle === 'تقرير الأرباح والخسائر') {
         const { data: txs } = await supabase.from('transactions').select('*').order('date', {ascending: false});
         const transactions = txs || [];
         const income = transactions.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0);
         const expense = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0);
         
         const rows = transactions.slice(0, 100).map(t => `
          <tr>
            <td>${new Date(t.date).toLocaleDateString('ar-DZ')}</td>
            <td>${t.description}</td>
            <td>${t.type === 'income' ? 'إيراد' : 'مصروف'}</td>
            <td>${t.category || 'عام'}</td>
            <td style="font-weight:bold; direction:ltr; text-align:right; color: ${t.type === 'income' ? '#16a34a' : '#dc2626'}">
              ${t.type === 'income' ? '+' : '-'} ${Number(t.amount).toLocaleString()}
            </td>
          </tr>
         `).join('');

         htmlContent = `
          <html dir="rtl">
            <head><title>التقرير المالي</title>
            <link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;800&display=swap" rel="stylesheet">
            ${getStyles()}
            </head>
            <body>
              ${getHeader('التقرير المالي (الأرباح والخسائر)')}
              <div class="stat-container">
                 <div class="stat-box" style="border-bottom: 4px solid #16a34a"><span class="stat-val" style="color:#16a34a">${income.toLocaleString()} ${CURRENCY}</span><span class="stat-label">إجمالي الإيرادات</span></div>
                 <div class="stat-box" style="border-bottom: 4px solid #dc2626"><span class="stat-val" style="color:#dc2626">${expense.toLocaleString()} ${CURRENCY}</span><span class="stat-label">إجمالي المصروفات</span></div>
                 <div class="stat-box" style="border-bottom: 4px solid #fbbf24"><span class="stat-val" style="color:#000">${(income - expense).toLocaleString()} ${CURRENCY}</span><span class="stat-label">صافي الربح</span></div>
              </div>
              <h3 style="font-size:14px; margin-bottom:10px; color:#475569">سجل العمليات المالية (آخر 100 عملية)</h3>
              <table>
                <thead>
                  <tr>
                    <th>التاريخ</th>
                    <th>البيان</th>
                    <th>النوع</th>
                    <th>التصنيف</th>
                    <th>المبلغ</th>
                  </tr>
                </thead>
                <tbody>${rows}</tbody>
              </table>
              <div class="footer">${company.footer_text || 'تم إنشاء هذا التقرير تلقائياً'}</div>
            </body>
          </html>
        `;
      } else if (reportTitle === 'جرد المشتريات') {
         const { data: purchases } = await supabase.from('purchases').select('*').order('date', {ascending: false});
         const list = purchases || [];
         const total = list.reduce((s, i) => s + Number(i.total), 0);

         const rows = list.map(p => `
          <tr>
             <td style="font-weight:bold">${p.item}</td>
             <td>${p.quantity}</td>
             <td>${p.supplier}</td>
             <td>${p.project_name}</td>
             <td>${new Date(p.date).toLocaleDateString('ar-DZ')}</td>
             <td><span style="background:#f1f5f9; padding:2px 6px; border-radius:4px; font-size:10px">${p.status}</span></td>
             <td style="font-weight:bold">${Number(p.total).toLocaleString()}</td>
          </tr>
         `).join('');

         htmlContent = `
           <html dir="rtl">
            <head><title>تقرير المشتريات</title>
            <link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;800&display=swap" rel="stylesheet">
            ${getStyles()}
            </head>
            <body>
              ${getHeader('تقرير المشتريات والمخزون')}
              <div class="stat-container">
                 <div class="stat-box"><span class="stat-val">${list.length}</span><span class="stat-label">عدد الطلبات</span></div>
                 <div class="stat-box"><span class="stat-val text-amber-600">${total.toLocaleString()} ${CURRENCY}</span><span class="stat-label">إجمالي التكلفة</span></div>
                 <div class="stat-box"><span class="stat-val">${list.filter(i => i.status !== 'تم الاستلام').length}</span><span class="stat-label">طلبات معلقة</span></div>
              </div>
              <table>
                <thead>
                  <tr>
                    <th>المادة / الصنف</th>
                    <th>الكمية</th>
                    <th>المورد</th>
                    <th>المشروع</th>
                    <th>تاريخ الطلب</th>
                    <th>الحالة</th>
                    <th>التكلفة</th>
                  </tr>
                </thead>
                <tbody>${rows}</tbody>
              </table>
              <div class="footer">${company.footer_text || 'تم إنشاء هذا التقرير تلقائياً'}</div>
            </body>
          </html>
         `;
      } else if (reportTitle === 'كشف حضور العمال') {
         const { data: workers } = await supabase.from('workers').select('*').order('name');
         const list = workers || [];

         const rows = list.map(w => `
           <tr>
             <td style="font-weight:bold">${w.name}</td>
             <td>${w.trade}</td>
             <td>${w.phone}</td>
             <td>${Number(w.daily_rate).toLocaleString()}</td>
             <td>${w.current_project || 'حر'}</td>
             <td><span style="color:${w.is_active ? 'green' : 'gray'}">${w.is_active ? 'نشط' : 'غير نشط'}</span></td>
           </tr>
         `).join('');

         htmlContent = `
            <html dir="rtl">
            <head><title>سجل العمال</title>
            <link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;800&display=swap" rel="stylesheet">
            ${getStyles()}
            </head>
            <body>
              ${getHeader('سجل العمال والموظفين')}
               <div class="stat-container">
                 <div class="stat-box"><span class="stat-val">${list.length}</span><span class="stat-label">إجمالي العمال</span></div>
                 <div class="stat-box"><span class="stat-val text-green-600">${list.filter(w=>w.is_active).length}</span><span class="stat-label">العمال النشطين</span></div>
              </div>
              <table>
                <thead>
                  <tr>
                    <th>الاسم</th>
                    <th>التخصص</th>
                    <th>الهاتف</th>
                    <th>اليومية</th>
                    <th>الموقع الحالي</th>
                    <th>الحالة</th>
                  </tr>
                </thead>
                <tbody>${rows}</tbody>
              </table>
              <div class="footer">${company.footer_text || 'تم إنشاء هذا التقرير تلقائياً'}</div>
            </body>
          </html>
         `;
      }

      // Print Logic
      const printWindow = window.open('', '_blank', 'width=1000,height=800');
      if (printWindow) {
        printWindow.document.write(htmlContent);
        printWindow.document.close();
        // Trigger print after load
        printWindow.onload = () => {
          setTimeout(() => {
            printWindow.print();
          }, 800);
        };
      } else {
        alert('يرجى السماح بالنوافذ المنبثقة للطباعة');
      }

    } catch (error) {
      console.error(error);
      alert('حدث خطأ أثناء إنشاء التقرير');
    } finally {
      setGeneratingReport(null);
    }
  }

  const reports = [
    { title: 'تقرير الأرباح والخسائر', type: 'مالي', icon: <FilePieChart className="text-yellow-500" /> },
    { title: 'كشف حضور العمال', type: 'إداري', icon: <FileSpreadsheet className="text-green-500" /> },
    { title: 'أداء المشاريع السنوي', type: 'فني', icon: <BarChart3 className="text-purple-500" /> },
    { title: 'جرد المشتريات', type: 'مخازن', icon: <FileSpreadsheet className="text-amber-500" /> },
  ];

  if (loading) return <div className="flex justify-center p-20"><Loader2 className="animate-spin text-yellow-500" size={40} /></div>;

  return (
    <div className="space-y-8">
      <div className="bg-white p-8 rounded-[32px] shadow-sm border border-slate-100">
        <div className="flex justify-between items-center mb-10">
          <div>
            <h2 className="text-2xl font-black text-slate-800">مركز التقارير الذكي</h2>
            <p className="text-slate-400 text-sm mt-1">إحصائيات مباشرة من قاعدة البيانات</p>
          </div>
          <div className="bg-yellow-50 text-yellow-700 px-4 py-2 rounded-xl text-xs font-bold border border-yellow-200 flex items-center gap-2">
            <span className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></span>
            بيانات حية ومحدثة
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {reports.map((report, idx) => (
            <div key={idx} 
              onClick={() => handlePrintReport(report.title)}
              className="group p-6 bg-slate-50 rounded-3xl border border-slate-100 hover:bg-white hover:shadow-xl hover:shadow-slate-200/50 transition-all cursor-pointer relative overflow-hidden"
            >
              <div className="w-14 h-14 bg-white rounded-2xl shadow-sm flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                {generatingReport === report.title ? <Loader2 className="animate-spin text-slate-400"/> : report.icon}
              </div>
              <h3 className="font-bold text-slate-800 mb-2">{report.title}</h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-6">تصنيف: {report.type}</p>
              <button 
                disabled={generatingReport !== null}
                className="flex items-center gap-2 text-yellow-600 font-bold text-xs group-hover:underline"
              >
                {generatingReport === report.title ? 'جاري التحضير...' : <><Printer size={14} /> طباعة التقرير</>}
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-8 rounded-[32px] shadow-sm border border-slate-100">
           <h3 className="font-bold text-slate-800 mb-8">تحليل أداء المشاريع النشطة</h3>
           <div className="space-y-8">
              <div>
                 <div className="flex justify-between text-xs mb-3">
                    <span className="font-bold text-slate-600 uppercase tracking-wider">متوسط إنجاز المشاريع ({reportData.activeCount})</span>
                    <span className="font-black text-yellow-500">{reportData.avgProgress}%</span>
                 </div>
                 <div className="h-3 bg-slate-100 rounded-full overflow-hidden p-0.5">
                    <div className="h-full bg-yellow-400 rounded-full transition-all duration-1000" style={{width: `${reportData.avgProgress}%`}}></div>
                 </div>
              </div>
              
              <div>
                 <div className="flex justify-between text-xs mb-3">
                    <span className="font-bold text-slate-600 uppercase tracking-wider">استهلاك الميزانية المجمع</span>
                    <span className="font-black text-amber-600">
                      {reportData.totalBudget > 0 
                        ? Math.round((reportData.totalExpenses / reportData.totalBudget) * 100) 
                        : 0}%
                    </span>
                 </div>
                 <div className="h-3 bg-slate-100 rounded-full overflow-hidden p-0.5">
                    <div 
                      className="h-full bg-amber-500 rounded-full transition-all duration-1000" 
                      style={{width: `${reportData.totalBudget > 0 ? (reportData.totalExpenses / reportData.totalBudget) * 100 : 0}%`}}
                    ></div>
                 </div>
              </div>

              <div className="pt-6 grid grid-cols-2 gap-8 border-t border-slate-50">
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">إجمالي الميزانيات</p>
                  <p className="font-black text-slate-800 text-xl">{reportData.totalBudget.toLocaleString()} <span className="text-xs font-normal">{CURRENCY}</span></p>
                </div>
                <div className="text-left">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">إجمالي المصروفات</p>
                  <p className="font-black text-red-600 text-xl">{reportData.totalExpenses.toLocaleString()} <span className="text-xs font-normal">{CURRENCY}</span></p>
                </div>
              </div>
           </div>
        </div>

        <div className="bg-black p-10 rounded-[40px] shadow-2xl text-white relative overflow-hidden group">
           <div className="relative z-10">
              <h3 className="text-2xl font-black mb-6 text-yellow-400">التحليل التلقائي</h3>
              <p className="text-slate-400 text-sm mb-10 leading-loose min-h-[80px]">
                بناءً على المعطيات الحقيقية لـ {reportData.activeCount} مشاريع، نلاحظ أن معدل الإنجاز ({reportData.avgProgress}%) يتماشى مع المصاريف التشغيلية. نظام "Windoor" يقترح عليك موازنة المشتريات لتقليل تكاليف المواد.
              </p>
              <div className="grid grid-cols-2 gap-4">
                 <div className="p-4 bg-white/5 rounded-2xl border border-white/10 group-hover:bg-white/10 transition-all">
                    <p className="text-[10px] text-blue-400 font-bold mb-1">الرؤية</p>
                    <p className="text-xs font-medium truncate">استقرار مالي جيد</p>
                 </div>
                 <div className="p-4 bg-white/5 rounded-2xl border border-white/10 group-hover:bg-white/10 transition-all">
                    <p className="text-[10px] text-green-400 font-bold mb-1">التوصية</p>
                    <p className="text-xs font-medium truncate">تحسين المشتريات</p>
                 </div>
              </div>
           </div>
           <BarChart3 size={200} className="absolute -right-20 -bottom-20 text-yellow-400/10 group-hover:rotate-12 transition-transform duration-500" />
        </div>
      </div>
    </div>
  );
};

export default Reports;
