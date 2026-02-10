
import React, { useState, useEffect } from 'react';
import { Save, Building2, Phone, MapPin, Mail, Image as ImageIcon, Loader2, Upload } from 'lucide-react';
import { supabase } from '../supabase';
import { AppSettings } from '../types';

interface SettingsProps {
  onUpdate: () => void;
}

const Settings: React.FC<SettingsProps> = ({ onUpdate }) => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [settings, setSettings] = useState<AppSettings>({
    company_name: 'Windoor',
    logo_url: '',
    address: '',
    phone: '',
    email: '',
    tax_id: '',
    footer_text: ''
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  async function fetchSettings() {
    setLoading(true);
    const { data } = await supabase.from('settings').select('*').single();
    if (data) setSettings(data);
    setLoading(false);
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const file = event.target.files?.[0];
      if (!file) return;

      setUploading(true);
      const fileExt = file.name.split('.').pop();
      const fileName = `logo-${Math.random()}.${fileExt}`;
      const filePath = `${fileName}`;

      // 1. Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('app-assets')
        .upload(filePath, file);

      if (uploadError) {
        throw uploadError;
      }

      // 2. Get Public URL
      const { data } = supabase.storage.from('app-assets').getPublicUrl(filePath);
      
      // 3. Update State
      setSettings(prev => ({ ...prev, logo_url: data.publicUrl }));
      
    } catch (error: any) {
      console.error('Upload Error:', error);
      alert('فشل تحميل الصورة: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { data: existing } = await supabase.from('settings').select('id').single();
      
      let error;
      if (existing) {
        const { error: updateError } = await supabase
          .from('settings')
          .update(settings)
          .eq('id', existing.id);
        error = updateError;
      } else {
        const { error: insertError } = await supabase
          .from('settings')
          .insert([settings]);
        error = insertError;
      }

      if (error) throw error;
      
      alert('تم حفظ الإعدادات بنجاح');
      onUpdate(); // تحديث التطبيق بالبيانات الجديدة
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('حدث خطأ أثناء حفظ الإعدادات');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex justify-center p-20"><Loader2 className="animate-spin text-yellow-500" /></div>;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="bg-white p-8 rounded-[32px] shadow-sm border border-slate-100">
        <h2 className="text-2xl font-black text-slate-800 mb-6 flex items-center gap-2">
          <Building2 className="text-yellow-500" />
          إعدادات المؤسسة والهوية
        </h2>
        
        <form onSubmit={handleSave} className="space-y-6">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-500">اسم المؤسسة</label>
              <input 
                required 
                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-yellow-400/20 focus:border-yellow-400 transition-all"
                value={settings.company_name}
                onChange={e => setSettings({...settings, company_name: e.target.value})}
                placeholder="Windoor للألمنيوم"
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-500">شعار المؤسسة</label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input 
                    className="w-full p-4 pl-10 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-yellow-400/20 focus:border-yellow-400 transition-all text-left"
                    dir="ltr"
                    value={settings.logo_url}
                    onChange={e => setSettings({...settings, logo_url: e.target.value})}
                    placeholder="رابط مباشر أو قم بالتحميل..."
                  />
                  <ImageIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                </div>
                
                <label className={`
                  flex items-center justify-center px-4 bg-slate-100 border border-slate-200 rounded-xl cursor-pointer hover:bg-yellow-50 hover:border-yellow-400 hover:text-yellow-600 transition-all
                  ${uploading ? 'opacity-50 cursor-not-allowed' : ''}
                `}>
                  <input 
                    type="file" 
                    accept="image/*" 
                    className="hidden" 
                    onChange={handleFileUpload}
                    disabled={uploading}
                  />
                  {uploading ? <Loader2 className="animate-spin" size={20}/> : <Upload size={20} />}
                </label>
              </div>
            </div>
          </div>

          {settings.logo_url && (
            <div className="flex flex-col items-center justify-center p-6 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200 gap-2">
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">معاينة الشعار</p>
              <img src={settings.logo_url} alt="Logo Preview" className="h-20 object-contain" onError={(e) => (e.target as HTMLImageElement).style.display = 'none'} />
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-500">رقم الهاتف</label>
              <div className="relative">
                <input 
                  className="w-full p-4 pl-10 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-yellow-400/20 focus:border-yellow-400 transition-all text-left"
                  dir="ltr"
                  value={settings.phone}
                  onChange={e => setSettings({...settings, phone: e.target.value})}
                  placeholder="0550 00 00 00"
                />
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-500">البريد الإلكتروني</label>
              <div className="relative">
                <input 
                  className="w-full p-4 pl-10 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-yellow-400/20 focus:border-yellow-400 transition-all text-left"
                  dir="ltr"
                  value={settings.email}
                  onChange={e => setSettings({...settings, email: e.target.value})}
                  placeholder="contact@windoor.dz"
                />
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-500">العنوان</label>
            <div className="relative">
              <input 
                className="w-full p-4 pl-10 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-yellow-400/20 focus:border-yellow-400 transition-all"
                value={settings.address}
                onChange={e => setSettings({...settings, address: e.target.value})}
                placeholder="المنطقة الصناعية، الجزائر العاصمة"
              />
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <div className="space-y-2">
              <label className="text-sm font-bold text-slate-500">رقم التعريف الجبائي (NIF/RC)</label>
              <input 
                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-yellow-400/20 focus:border-yellow-400 transition-all"
                value={settings.tax_id}
                onChange={e => setSettings({...settings, tax_id: e.target.value})}
                placeholder="RC: 16/00... NIF: 00..."
              />
            </div>
             <div className="space-y-2">
              <label className="text-sm font-bold text-slate-500">نص تذييل الفواتير</label>
              <input 
                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-yellow-400/20 focus:border-yellow-400 transition-all"
                value={settings.footer_text}
                onChange={e => setSettings({...settings, footer_text: e.target.value})}
                placeholder="شكراً لتعاملكم معنا..."
              />
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100">
            <button 
              disabled={saving || uploading}
              className="w-full py-4 bg-yellow-400 text-black rounded-xl font-black text-lg shadow-lg hover:bg-yellow-500 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {saving ? <Loader2 className="animate-spin"/> : <Save size={20} />}
              حفظ التغييرات
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Settings;
