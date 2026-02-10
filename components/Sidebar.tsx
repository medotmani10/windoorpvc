
import React from 'react';
import { NAV_ITEMS } from '../constants';
import { AppSettings } from '../types';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  settings?: AppSettings;
}

const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab, settings }) => {
  return (
    <aside className="w-64 bg-black text-slate-400 flex flex-col h-full shadow-2xl z-20 transition-all duration-300 border-l border-white/5">
      <div className="p-6 flex items-center space-x-3 space-x-reverse border-b border-white/10">
        {settings?.logo_url ? (
          <img src={settings.logo_url} alt="Logo" className="w-10 h-10 object-contain rounded-lg bg-white/10 p-1" />
        ) : (
          <div className="w-10 h-10 bg-yellow-400 rounded-lg flex items-center justify-center shadow-lg shadow-yellow-400/20">
            <span className="text-black font-black text-xl">{settings?.company_name?.charAt(0) || 'W'}</span>
          </div>
        )}
        <span className="text-lg font-bold text-white tracking-tight truncate">{settings?.company_name || 'Windoor'}</span>
      </div>
      
      <nav className="flex-1 mt-6 px-3 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`w-full flex items-center space-x-3 space-x-reverse px-4 py-3.5 rounded-xl text-sm font-bold transition-all duration-200 ${
              activeTab === item.id 
                ? 'bg-yellow-400 text-black shadow-lg shadow-yellow-400/20 translate-x-1' 
                : 'hover:bg-white/10 hover:text-white'
            }`}
          >
            {item.icon}
            <span>{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="p-4 mt-auto border-t border-white/10 flex flex-col items-center gap-3">
        <div className="flex items-center gap-2 text-[10px] text-green-400 font-bold bg-green-400/10 px-3 py-1.5 rounded-full border border-green-400/20">
          <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></div>
          النظام متصل
        </div>
        <div className="text-[10px] text-slate-600 font-medium">
          Windoor System v2.0
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
