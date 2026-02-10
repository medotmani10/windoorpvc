
import React, { useState, useEffect } from 'react';
import { Warehouse, Plus, AlertTriangle, Edit2, X, Loader2, Package, DollarSign } from 'lucide-react';
import { supabase } from '../supabase';
import { Material } from '../types';
import { CURRENCY } from '../constants';

const Inventory: React.FC = () => {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const initialForm = {
    name: '',
    category: 'profile_alu',
    unit: 'bar',
    quantity: 0,
    minQuantity: 5,
    costPrice: 0,
    sellingPrice: 0,
    supplier: ''
  };
  const [formData, setFormData] = useState(initialForm);

  useEffect(() => {
    fetchMaterials();
  }, []);

  async function fetchMaterials() {
    setLoading(true);
    // Fetch materials and map snake_case columns to camelCase Material interface
    const { data } = await supabase.from('materials').select('*').order('quantity', { ascending: true });
    if (data) {
      const mapped: Material[] = data.map((m: any) => ({
        id: m.id,
        name: m.name,
        category: m.category,
        unit: m.unit,
        quantity: m.quantity,
        minQuantity: m.min_quantity,
        costPrice: m.cost_price,
        sellingPrice: m.selling_price,
        supplier: m.supplier
      }));
      setMaterials(mapped);
    }
    setLoading(false);
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      name: formData.name,
      category: formData.category,
      unit: formData.unit,
      quantity: formData.quantity,
      min_quantity: formData.minQuantity,
      cost_price: formData.costPrice,
      selling_price: formData.sellingPrice,
      supplier: formData.supplier
    };

    if (editingId) {
      await supabase.from('materials').update(payload).eq('id', editingId);
    } else {
      await supabase.from('materials').insert(payload);
    }
    setIsModalOpen(false);
    setFormData(initialForm);
    setEditingId(null);
    fetchMaterials();
  };

  const handleEdit = (m: Material) => {
    setFormData({
      name: m.name,
      category: m.category,
      unit: m.unit,
      quantity: m.quantity,
      minQuantity: m.minQuantity,
      costPrice: m.costPrice,
      sellingPrice: m.sellingPrice,
      supplier: m.supplier
    });
    setEditingId(m.id);
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white p-6 rounded-3xl border border-slate-100">
        <div>
           <h2 className="text-2xl font-black text-slate-800">إدارة المخزون (Stock)</h2>
           <p className="text-slate-400 text-sm">متابعة البروفيلات، الزجاج، والأكسسوارات</p>
        </div>
        <button onClick={() => { setFormData(initialForm); setEditingId(null); setIsModalOpen(true); }} className="flex items-center gap-2 px-6 py-3 bg-yellow-400 text-black rounded-xl font-bold shadow-lg shadow-yellow-400/20 hover:bg-yellow-500 transition-all">
          <Plus size={20} /> مادة جديدة
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {['profile_alu', 'glass', 'accessory'].map(cat => {
           const count = materials.filter(m => m.category === cat).length;
           const lowStock = materials.filter(m => m.category === cat && m.quantity <= m.minQuantity).length;
           return (
             <div key={cat} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                <h3 className="text-sm font-bold text-slate-500 uppercase mb-2">
                  {cat === 'profile_alu' ? 'بروفيلات الألمنيوم' : cat === 'glass' ? 'الزجاج' : 'أكسسوارات'}
                </h3>
                <div className="flex justify-between items-end">
                   <span className="text-3xl font-black text-slate-800">{count}</span>
                   {lowStock > 0 && <span className="text-xs font-bold text-red-500 flex items-center gap-1"><AlertTriangle size={12}/> {lowStock} نواقص</span>}
                </div>
             </div>
           )
        })}
      </div>

      <div className="bg-white rounded-3xl border border-slate-100 overflow-hidden">
        {loading ? <div className="p-10 flex justify-center"><Loader2 className="animate-spin text-yellow-500"/></div> : 
        <table className="w-full text-sm text-right">
          <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-100">
             <tr>
               <th className="p-4">اسم المادة</th>
               <th className="p-4">التصنيف</th>
               <th className="p-4">الكمية</th>
               <th className="p-4">سعر التكلفة</th>
               <th className="p-4">المورد</th>
               <th className="p-4"></th>
             </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
             {materials.map(m => (
               <tr key={m.id} className="hover:bg-slate-50/50 transition-colors">
                 <td className="p-4 font-bold text-slate-700">{m.name}</td>
                 <td className="p-4">
                   <span className={`px-2 py-1 rounded text-[10px] font-bold ${
                     m.category === 'profile_alu' ? 'bg-blue-100 text-blue-700' :
                     m.category === 'glass' ? 'bg-cyan-100 text-cyan-700' : 'bg-amber-100 text-amber-700'
                   }`}>
                     {m.category === 'profile_alu' ? 'ألمنيوم' : m.category === 'glass' ? 'زجاج' : m.category}
                   </span>
                 </td>
                 <td className="p-4">
                   <span className={`font-bold ${m.quantity <= m.minQuantity ? 'text-red-500' : 'text-slate-800'}`}>
                     {m.quantity} {m.unit === 'bar' ? 'بار' : m.unit}
                   </span>
                 </td>
                 <td className="p-4 text-slate-600">{m.costPrice.toLocaleString()} {CURRENCY}</td>
                 <td className="p-4 text-xs text-slate-400">{m.supplier}</td>
                 <td className="p-4">
                    <button onClick={() => handleEdit(m)} className="p-2 text-slate-400 hover:text-yellow-600"><Edit2 size={16}/></button>
                 </td>
               </tr>
             ))}
          </tbody>
        </table>
        }
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
           <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                 <h3 className="font-bold text-lg text-slate-800">{editingId ? 'تعديل مادة' : 'إضافة مادة للمخزون'}</h3>
                 <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X/></button>
              </div>
              
              <form onSubmit={handleSave} className="p-6 space-y-5">
                 {/* اسم المادة */}
                 <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 mr-1">اسم المادة</label>
                    <input 
                      required 
                      placeholder="مثال: بروفيل 40 أبيض، زجاج 6مم..." 
                      className="w-full p-3 bg-white border border-slate-300 rounded-xl text-slate-900 outline-none focus:ring-2 focus:ring-yellow-400/20 focus:border-yellow-400" 
                      value={formData.name} 
                      onChange={e => setFormData({...formData, name: e.target.value})} 
                    />
                 </div>

                 {/* التصنيف والوحدة */}
                 <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                       <label className="text-xs font-bold text-slate-500 mr-1">التصنيف</label>
                       <select className="w-full p-3 bg-white border border-slate-300 rounded-xl text-slate-900 outline-none focus:border-yellow-400" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value as any})}>
                          <option value="profile_alu">بروفيل ألمنيوم</option>
                          <option value="profile_pvc">بروفيل PVC</option>
                          <option value="glass">زجاج</option>
                          <option value="accessory">أكسسوارات</option>
                          <option value="rubber">مطاط (Joint)</option>
                       </select>
                    </div>
                    <div className="space-y-1">
                       <label className="text-xs font-bold text-slate-500 mr-1">وحدة القياس</label>
                       <select className="w-full p-3 bg-white border border-slate-300 rounded-xl text-slate-900 outline-none focus:border-yellow-400" value={formData.unit} onChange={e => setFormData({...formData, unit: e.target.value as any})}>
                          <option value="bar">بار (6 متر)</option>
                          <option value="m2">متر مربع</option>
                          <option value="piece">قطعة</option>
                          <option value="roll">رولو</option>
                       </select>
                    </div>
                 </div>

                 {/* الكميات */}
                 <div className="grid grid-cols-2 gap-4 bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <div className="space-y-1">
                       <label className="text-[10px] font-bold text-slate-500 flex items-center gap-1"><Package size={12}/> الكمية الحالية</label>
                       <input 
                         type="number" 
                         className="w-full p-2 bg-white border border-slate-200 rounded-lg text-slate-900 font-bold text-center" 
                         value={formData.quantity} 
                         onChange={e => setFormData({...formData, quantity: Number(e.target.value)})} 
                       />
                    </div>
                    <div className="space-y-1">
                       <label className="text-[10px] font-bold text-slate-500 flex items-center gap-1 text-red-400"><AlertTriangle size={12}/> حد التنبيه (النواقص)</label>
                       <input 
                         type="number" 
                         className="w-full p-2 bg-white border border-slate-200 rounded-lg text-slate-900 font-bold text-center placeholder:text-slate-300" 
                         placeholder="مثال: 5"
                         value={formData.minQuantity} 
                         onChange={e => setFormData({...formData, minQuantity: Number(e.target.value)})} 
                       />
                    </div>
                 </div>

                 {/* الأسعار */}
                 <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                       <label className="text-xs font-bold text-slate-500 mr-1">سعر الشراء (للوحدة)</label>
                       <div className="relative">
                          <input 
                            type="number" 
                            className="w-full p-3 pl-8 bg-white border border-slate-300 rounded-xl text-slate-900 outline-none focus:border-yellow-400" 
                            value={formData.costPrice} 
                            onChange={e => setFormData({...formData, costPrice: Number(e.target.value)})} 
                          />
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-bold">{CURRENCY}</span>
                       </div>
                    </div>
                    <div className="space-y-1">
                       <label className="text-xs font-bold text-slate-500 mr-1">سعر البيع التقديري</label>
                       <div className="relative">
                          <input 
                            type="number" 
                            className="w-full p-3 pl-8 bg-white border border-slate-300 rounded-xl text-slate-900 outline-none focus:border-yellow-400" 
                            value={formData.sellingPrice} 
                            onChange={e => setFormData({...formData, sellingPrice: Number(e.target.value)})} 
                          />
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-bold">{CURRENCY}</span>
                       </div>
                    </div>
                 </div>

                 <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 mr-1">المورد (اختياري)</label>
                    <input 
                      placeholder="اسم المورد المعتاد لهذه المادة" 
                      className="w-full p-3 bg-white border border-slate-300 rounded-xl text-slate-900 outline-none focus:border-yellow-400" 
                      value={formData.supplier} 
                      onChange={e => setFormData({...formData, supplier: e.target.value})} 
                    />
                 </div>
                 
                 <button className="w-full py-3.5 bg-yellow-400 text-black rounded-xl font-bold mt-4 hover:bg-yellow-500 shadow-lg shadow-yellow-400/20 transition-all">
                   حفظ البيانات
                 </button>
              </form>
           </div>
        </div>
      )}
    </div>
  );
};

export default Inventory;
