
import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import Projects from './components/Projects';
import Clients from './components/Clients';
import Workers from './components/Workers';
import Finance from './components/Finance';
import Quotes from './components/Quotes';
import Inventory from './components/Inventory';
import Reports from './components/Reports';
import Settings from './components/Settings';
import Transport from './components/Transport'; // إضافة استيراد مكون النقل
import Auth from './components/Auth';
import { Menu, LogOut, Loader2 } from 'lucide-react';
import { supabase } from './supabase';
import { AppSettings } from './types';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [session, setSession] = useState<any>(null);
  const [initializing, setInitializing] = useState(true);
  const [appSettings, setAppSettings] = useState<AppSettings | undefined>(undefined);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setInitializing(false);
      if (session) fetchSettings();
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) fetchSettings();
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchSettings = async () => {
    const { data } = await supabase.from('settings').select('*').single();
    if (data) setAppSettings(data);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard': return <Dashboard />;
      case 'quotes': return <Quotes />;
      case 'projects': return <Projects />;
      case 'inventory': return <Inventory />;
      case 'clients': return <Clients />;
      case 'workers': return <Workers />;
      case 'transport': return <Transport />; // إضافة حالة النقل هنا
      case 'finance': return <Finance />;
      case 'reports': return <Reports />;
      case 'settings': return <Settings onUpdate={fetchSettings} />;
      default: return <Dashboard />;
    }
  };

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    setIsSidebarOpen(false);
  };

  if (initializing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <Loader2 className="animate-spin text-yellow-400" size={48} />
      </div>
    );
  }

  if (!session) {
    return <Auth />;
  }

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden relative dir-rtl">
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-30 lg:hidden transition-opacity"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <div className={`
        fixed inset-y-0 right-0 z-40 transform transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0
        ${isSidebarOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'}
      `}>
        <Sidebar activeTab={activeTab} setActiveTab={handleTabChange} settings={appSettings} />
      </div>

      <main className="flex-1 overflow-y-auto w-full">
        <header className="sticky top-0 z-20 bg-white/80 backdrop-blur-md border-b border-slate-100 p-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="p-2 hover:bg-slate-100 rounded-lg lg:hidden"
            >
              <Menu size={24} className="text-slate-600" />
            </button>
            <div>
              <h1 className="text-lg md:text-2xl font-black text-slate-800 truncate max-w-[200px] md:max-w-none">
                {activeTab === 'dashboard' && 'لوحة القيادة'}
                {activeTab === 'quotes' && 'عروض الأسعار (Devis)'}
                {activeTab === 'projects' && 'المشاريع والورشات'}
                {activeTab === 'inventory' && 'المخزون'}
                {activeTab === 'clients' && 'الزبائن'}
                {activeTab === 'workers' && 'الموارد البشرية'}
                {activeTab === 'transport' && 'خدمات النقل'}
                {activeTab === 'finance' && 'الإدارة المالية'}
                {activeTab === 'reports' && 'التقارير'}
                {activeTab === 'settings' && 'إعدادات النظام'}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2 md:gap-4">
             <div className="hidden sm:block text-left">
                <p className="text-xs md:text-sm font-bold">{appSettings?.company_name || 'Windoor System'}</p>
                <p className="text-[10px] text-slate-400 text-right">{session.user.email}</p>
             </div>
             <button 
               onClick={handleLogout}
               className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
               title="تسجيل الخروج"
             >
               <LogOut size={20} />
             </button>
             <div className="w-8 h-8 md:w-10 md:h-10 rounded-xl bg-yellow-400 flex items-center justify-center text-black font-black text-sm uppercase shadow-lg shadow-yellow-400/20">
                {session.user.email?.[0]}
             </div>
          </div>
        </header>

        <div className="p-4 md:p-8 pb-20 md:pb-8">
          {renderContent()}
        </div>
      </main>
    </div>
  );
};

export default App;
