
import React from 'react';
import { 
  LayoutDashboard, 
  Ruler, 
  Warehouse, 
  Users, 
  Hammer, 
  DollarSign, 
  FileText, 
  ClipboardList,
  Settings
} from 'lucide-react';

export const CURRENCY = 'د.ج';

export const NAV_ITEMS = [
  { id: 'dashboard', label: 'لوحة القيادة', icon: <LayoutDashboard size={20} /> },
  { id: 'quotes', label: 'حساب Devis', icon: <Ruler size={20} /> }, // Core feature
  { id: 'projects', label: 'الورشات (المشاريع)', icon: <Hammer size={20} /> },
  { id: 'inventory', label: 'المخزون (Stock)', icon: <Warehouse size={20} /> },
  { id: 'clients', label: 'الزبائن', icon: <Users size={20} /> },
  { id: 'workers', label: 'العمال والحضور', icon: <ClipboardList size={20} /> },
  { id: 'finance', label: 'المالية', icon: <DollarSign size={20} /> },
  { id: 'reports', label: 'التقارير', icon: <FileText size={20} /> },
  { id: 'settings', label: 'إعدادات المؤسسة', icon: <Settings size={20} /> },
];

export const PROFILE_TYPES = ['Aluminium', 'PVC'];
export const WINDOW_TYPES = ['نافذة سحاب (Coulissant)', 'نافذة فتح (Ouvrant)', 'باب (Porte)', 'واجهة (Façade)', 'شبك (Moustiquaire)'];
export const GLASS_TYPES = ['زجاج 6مم بسيط', 'زجاج مزدوج (Double)', 'زجاج عاكس (Reflect)', 'زجاج مثلج (Sablé)'];
