
import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit2, Trash2, Loader2, X, Save, Calendar, ShoppingBag } from 'lucide-react';
import { Project, ProjectStatus, Client } from '../types';
import { supabase } from '../supabase';
import { CURRENCY } from '../constants';

const Projects: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const initialFormState = {
    name: '',
    client: '',
    budget: 0,
    startDate: '',
    endDate: '',
    status: 'قيد الانتظار'
  };

  const [formData, setFormData] = useState(initialFormState);

  useEffect(() => {
    fetchProjects();
    fetchClients();
  }, []);

  async function fetchClients() {
    const { data } = await supabase.from('clients').select('*');
    if (data) setClients(data as any);
  }

  async function fetchProjects() {
    try {
      setLoading(true);
      const { data, error } = await supabase.from('projects').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      
      const mapped = data?.map(p => ({
        id: p.id,
        name: p.name,
        client: p.client_name, // التغيير هنا: استخدام client_name من قاعدة البيانات
        startDate: p.start_date,
        endDate: p.end_date,
        status: p.status,
        budget: Number(p.budget),
        expenses: Number(p.expenses),
        progress: p.progress
      })) || [];
      
      setProjects(mapped);
    } catch (error) {
      console.error('Error fetching projects:', error);
    } finally {
      setLoading(false);
    }
  }

  const handleSaveProject = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('يجب تسجيل الدخول');

      let clientName = formData.client.trim();
      
      if (clientName) {
        const { data: existingClients } = await supabase
          .from('clients')
          .select('name')
          .ilike('name', clientName);

        if (!existingClients || existingClients.length === 0) {
          await supabase.from('clients').insert([{ name: clientName, user_id: user.id }]);
          fetchClients();
        }
      }

      const projectPayload = {
        name: formData.name,
        client_name: clientName, // التغيير هنا ليتوافق مع الـ DB
        budget: formData.budget,
        start_date: formData.startDate || null,
        end_date: formData.endDate || null,
        status: formData.status,
        user_id: user.id
      };

      let error;
      if (editingId) {
        const { error: updateError } = await supabase
          .from('projects')
          .update(projectPayload)
          .eq('id', editingId);
        error = updateError;
      } else {
        const { error: insertError } = await supabase
          .from('projects')
          .insert([{ ...projectPayload, progress: 0, expenses: 0 }]);
        error = insertError;
      }
      
      if (error) throw error;
      
      closeModal();
      fetchProjects();
    } catch (error) {
      console.error(error);
      alert('حدث خطأ أثناء الحفظ.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('هل أنت متأكد من حذف هذه الطلبية؟ سيتم حذف جميع البيانات المرتبطة بها.')) return;

    try {
      const { error } = await supabase.from('projects').delete().eq('id', id);
      if (error) throw error;
      setProjects(projects.filter(p => p.id !== id));
    } catch (error) {
      alert('فشل حذف الطلبية');
      console.error(error);
    }
  };

  const handleEdit = (project: Project) => {
    setFormData({
      name: project.name,
      client: project.client,
      budget: project.budget,
      startDate: project.startDate || '',
      endDate: project.endDate || '',
      status: project.status
    });
    setEditingId(project.id);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setFormData(initialFormState);
    setEditingId(null);
  };

  const filteredProjects = projects.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (p.client && p.client.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-4 bg-white p-5 rounded-[24px] shadow-sm border border-slate-100 items-center justify-between">
        <div className="relative w-full md:w-96">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            type="text"
            placeholder="ابحث عن طلبية بالرقم أو الزبون..."
            className="w-full pr-10 pl-4 py-3 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/10 text-sm text-slate-900"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <button className="flex items-center gap-2 px-8 py-3 bg-blue-600 text-white rounded-2xl text-sm font-black shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-all"
          onClick={() => setIsModalOpen(true)}>
          <Plus size={18} />
          طلبية جديدة
        </button>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-lg rounded-[32px] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
            <div className="p-6 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
              <h3 className="font-black text-slate-800">{editingId ? 'تعديل بيانات الطلبية' : 'إضافة طلبية عمل'}</h3>
              <button onClick={closeModal} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>
            </div>
            <form onSubmit={handleSaveProject} className="p-8 space-y-5">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">مسمى الطلبية / رقم العمل</label>
                <input required className="w-full p-4 bg-white border border-slate-300 rounded-2xl text-sm focus:ring-2 focus:ring-blue-500/10 transition-all text-slate-900" 
                  value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">الزبون</label>
                <div className="relative">
                  <input 
                    required 
                    list="clients-list"
                    className="w-full p-4 bg-white border border-slate-300 rounded-2xl text-sm focus:ring-2 focus:ring-blue-500/10 transition-all text-slate-900" 
                    value={formData.client} 
                    onChange={e => setFormData({...formData, client: e.target.value})} 
                    placeholder="اختر زبون..."
                  />
                  <datalist id="clients-list">
                    {clients.map(c => (
                      <option key={c.id} value={c.name} />
                    ))}
                  </datalist>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">تاريخ الاستلام</label>
                  <div className="relative">
                    <input 
                      type="date" 
                      className="w-full p-4 pl-10 bg-white border border-slate-300 rounded-2xl text-sm text-slate-900"
                      value={formData.startDate} 
                      onChange={e => setFormData({...formData, startDate: e.target.value})} 
                    />
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={18} />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">موعد التسليم</label>
                  <div className="relative">
                    <input 
                      type="date" 
                      className="w-full p-4 pl-10 bg-white border border-slate-300 rounded-2xl text-sm text-slate-900"
                      value={formData.endDate} 
                      onChange={e => setFormData({...formData, endDate: e.target.value})} 
                    />
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={18} />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">قيمة الطلبية ({CURRENCY})</label>
                  <input type="number" required className="w-full p-4 bg-white border border-slate-300 rounded-2xl text-sm text-left text-slate-900" dir="ltr"
                    value={formData.budget} onChange={e => setFormData({...formData, budget: Number(e.target.value)})} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">حالة الطلبية</label>
                  <select className="w-full p-4 bg-white border border-slate-300 rounded-2xl text-sm appearance-none text-slate-900"
                    value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})}>
                    <option value="قيد الانتظار">قيد الانتظار</option>
                    <option value="قيد القص">قيد القص (Débitage)</option>
                    <option value="قيد التجميع">قيد التجميع (Assemblage)</option>
                    <option value="قيد التركيب">قيد التركيب</option>
                    <option value="مكتمل">مكتمل وتم التسليم</option>
                  </select>
                </div>
              </div>
              <button disabled={saving} className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black shadow-xl shadow-blue-500/20 hover:bg-blue-700 transition-all flex items-center justify-center gap-2 mt-4">
                {saving ? <Loader2 className="animate-spin" size={20}/> : <><Save size={20}/> {editingId ? 'تحديث الطلبية' : 'تأكيد الطلبية'}</>}
              </button>
            </form>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
          <Loader2 className="animate-spin mb-4 text-blue-600" size={40} />
          <p className="text-sm font-bold">جاري تحديث سجل الطلبيات...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProjects.map(project => (
            <div key={project.id} className="bg-white rounded-[32px] shadow-sm border border-slate-100 overflow-hidden flex flex-col hover:shadow-xl hover:shadow-slate-200/50 transition-all group">
              <div className="p-8 flex-1">
                <div className="flex justify-between items-start mb-6">
                  <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                    project.status === 'مكتمل' ? 'bg-green-50 text-green-600' :
                    project.status === 'قيد الانتظار' ? 'bg-amber-50 text-amber-600' : 'bg-blue-50 text-blue-600'
                  }`}>
                    {project.status}
                  </span>
                  <div className="flex gap-1">
                     <button onClick={() => handleEdit(project)} className="p-2 hover:bg-slate-50 rounded-full text-slate-400 hover:text-blue-600 transition-colors"><Edit2 size={16}/></button>
                     <button onClick={() => handleDelete(project.id)} className="p-2 hover:bg-red-50 rounded-full text-slate-400 hover:text-red-600 transition-colors"><Trash2 size={16}/></button>
                  </div>
                </div>
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                    <ShoppingBag size={20} />
                  </div>
                  <h3 className="text-xl font-black text-slate-800 leading-tight">{project.name}</h3>
                </div>
                <p className="text-xs text-slate-400 font-medium mb-8">الزبون: {project.client}</p>
                
                <div className="space-y-3">
                  <div className="flex justify-between text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    <span>التقدم في العمل</span>
                    <span className="text-slate-800">{project.progress}%</span>
                  </div>
                  <div className="w-full h-3 bg-slate-50 rounded-full overflow-hidden p-0.5">
                    <div className="h-full bg-blue-600 rounded-full transition-all duration-1000" style={{width: `${project.progress}%`}}></div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mt-8 border-t border-slate-50 pt-8">
                  <div>
                    <p className="text-[9px] text-slate-400 uppercase font-black tracking-widest mb-1">قيمة العمل</p>
                    <p className="text-sm font-black text-slate-800">{project.budget?.toLocaleString()} <span className="text-[10px] font-normal">{CURRENCY}</span></p>
                  </div>
                  <div className="text-left">
                    <p className="text-[9px] text-slate-400 uppercase font-black tracking-widest mb-1">المصاريف</p>
                    <p className="text-sm font-black text-red-500">{project.expenses?.toLocaleString()} <span className="text-[10px] font-normal">{CURRENCY}</span></p>
                  </div>
                </div>
              </div>
              <div className="bg-slate-50/50 px-8 py-5 flex justify-between items-center border-t border-slate-100">
                 <div className="flex flex-col">
                   <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">موعد التسليم</span>
                   <span className="text-xs font-bold text-slate-600">
                     {project.endDate ? new Date(project.endDate).toLocaleDateString('ar-DZ') : 'غير محدد'}
                   </span>
                 </div>
                 <div className="flex gap-2">
                   <button onClick={() => handleEdit(project)} className="p-2.5 text-slate-400 hover:text-blue-600 bg-white rounded-xl border border-slate-200 shadow-sm transition-all"><Edit2 size={16}/></button>
                   <button onClick={() => handleDelete(project.id)} className="p-2.5 text-slate-400 hover:text-red-600 bg-white rounded-xl border border-slate-200 shadow-sm transition-all"><Trash2 size={16}/></button>
                 </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Projects;
