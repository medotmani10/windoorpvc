
import React, { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { Users, Briefcase, DollarSign, AlertCircle, TrendingDown, Loader2 } from 'lucide-react';
import { supabase } from '../supabase';
import { CURRENCY } from '../constants';

const Dashboard: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    activeProjects: 0,
    totalRevenue: 0,
    expenses: 0,
    totalWorkers: 0,
    recentProjects: [] as any[],
    chartData: [] as any[]
  });

  useEffect(() => {
    fetchDashboardData();
  }, []);

  async function fetchDashboardData() {
    try {
      const { count: activeProjects } = await supabase.from('projects').select('*', { count: 'exact', head: true }).eq('status', 'نشط');
      const { count: totalWorkers } = await supabase.from('workers').select('*', { count: 'exact', head: true });
      const { data: invoices } = await supabase.from('invoices').select('total, date');
      const { data: expensesData } = await supabase.from('transactions').select('amount, type, date').eq('type', 'expense');
      const { data: recentProjects } = await supabase.from('projects').select('id, name, status, progress').limit(5).order('created_at', { ascending: false });

      const totalRevenue = invoices?.reduce((sum, inv) => sum + (Number(inv.total) || 0), 0) || 0;
      const totalExpenses = expensesData?.reduce((sum, t) => sum + (Number(t.amount) || 0), 0) || 0;

      // تجميع البيانات للمخطط البياني حسب الشهر
      const months = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
      const monthlyData = Array.from({ length: 6 }, (_, i) => {
        const d = new Date();
        d.setMonth(d.getMonth() - (5 - i));
        const monthIdx = d.getMonth();
        const monthName = months[monthIdx];
        
        const income = invoices?.filter(inv => new Date(inv.date).getMonth() === monthIdx).reduce((s, inv) => s + Number(inv.total), 0) || 0;
        const expense = expensesData?.filter(ex => new Date(ex.date).getMonth() === monthIdx).reduce((s, ex) => s + Number(ex.amount), 0) || 0;
        
        return { name: monthName, income, expense };
      });

      setStats({
        activeProjects: activeProjects || 0,
        totalRevenue,
        expenses: totalExpenses,
        totalWorkers: totalWorkers || 0,
        recentProjects: recentProjects || [],
        chartData: monthlyData
      });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }

  const kpis = [
    { title: 'المشاريع النشطة', value: stats.activeProjects.toString(), icon: <Briefcase className="text-blue-600" />, trend: 'مباشر', trendUp: true },
    { title: 'إجمالي الإيرادات', value: stats.totalRevenue.toLocaleString() + ' ' + CURRENCY, icon: <DollarSign className="text-green-600" />, trend: 'محدث', trendUp: true },
    { title: 'المصروفات', value: stats.expenses.toLocaleString() + ' ' + CURRENCY, icon: <TrendingDown className="text-red-600" />, trend: 'فعلي', trendUp: false },
    { title: 'العمال', value: stats.totalWorkers.toString(), icon: <Users className="text-purple-600" />, trend: 'مسجل', trendUp: true },
  ];

  if (loading) return <div className="flex h-96 items-center justify-center"><Loader2 className="animate-spin text-blue-600" size={40} /></div>;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi, idx) => (
          <div key={idx} className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 hover:shadow-md transition-all">
            <div className="flex justify-between items-start mb-4">
              <div className="p-3 bg-slate-50 rounded-2xl">{kpi.icon}</div>
              <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${kpi.trendUp ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                {kpi.trend}
              </span>
            </div>
            <h3 className="text-slate-500 text-xs font-medium mb-1">{kpi.title}</h3>
            <span className="text-xl font-black text-slate-800">{kpi.value}</span>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
          <div className="flex justify-between items-center mb-8">
            <h3 className="font-bold text-slate-800">التدفق النقدي (آخر 6 أشهر)</h3>
            <div className="flex gap-4 text-xs">
              <div className="flex items-center gap-1.5"><div className="w-3 h-3 bg-blue-600 rounded-full"></div> الإيرادات</div>
              <div className="flex items-center gap-1.5"><div className="w-3 h-3 bg-slate-300 rounded-full"></div> المصروفات</div>
            </div>
          </div>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 11}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 11}} />
                <Tooltip 
                  cursor={{fill: '#f8fafc'}}
                  contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}} 
                />
                <Bar dataKey="income" name="الإيرادات" fill="#2563eb" radius={[6, 6, 0, 0]} barSize={35} />
                <Bar dataKey="expense" name="المصروفات" fill="#e2e8f0" radius={[6, 6, 0, 0]} barSize={35} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
          <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2">
            <AlertCircle size={18} className="text-blue-600" />
            تنبيهات حية
          </h3>
          <div className="space-y-4">
             <div className="p-4 rounded-2xl bg-amber-50 border border-amber-100 text-xs">
                <p className="font-bold text-amber-900 mb-1">متابعة العمال</p>
                <p className="text-amber-700 leading-relaxed">هناك {stats.totalWorkers} عمال مسجلين في النظام، يرجى مراجعة سجلات الحضور اليومية.</p>
             </div>
             <div className="p-4 rounded-2xl bg-blue-50 border border-blue-100 text-xs">
                <p className="font-bold text-blue-900 mb-1">إيرادات الفواتير</p>
                <p className="text-blue-700 leading-relaxed">إجمالي المداخيل المسجلة: {stats.totalRevenue.toLocaleString()} {CURRENCY}</p>
             </div>
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
        <h3 className="font-bold text-slate-800 mb-6">المشاريع الحالية</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-right min-w-[500px]">
            <thead className="text-slate-400 text-xs border-b border-slate-50">
              <tr>
                <th className="pb-4 font-bold uppercase tracking-wider">اسم المشروع</th>
                <th className="pb-4 font-bold uppercase tracking-wider">الحالة</th>
                <th className="pb-4 font-bold uppercase tracking-wider">نسبة الإنجاز</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {stats.recentProjects.map(project => (
                <tr key={project.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="py-4 text-sm font-bold text-slate-700">{project.name}</td>
                  <td className="py-4">
                    <span className="px-3 py-1 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700">
                      {project.status}
                    </span>
                  </td>
                  <td className="py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-2 bg-slate-100 rounded-full">
                        <div className="h-full bg-blue-600 rounded-full transition-all duration-700" style={{width: `${project.progress}%`}}></div>
                      </div>
                      <span className="text-[10px] font-black text-slate-500">{project.progress}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
