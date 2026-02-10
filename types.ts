
export enum ProjectStatus {
  ACTIVE = 'نشط',
  PENDING = 'قيد الانتظار',
  COMPLETED = 'مكتمل',
  DELAYED = 'متأخر'
}

export interface AppSettings {
  id?: string;
  company_name: string;
  logo_url: string;
  address: string;
  phone: string;
  email: string;
  tax_id?: string; // رقم التعريف الجبائي
  footer_text?: string;
}

export interface Client {
  id: string;
  name: string;
  phone: string;
  email?: string;
  address: string;
  category: 'VIP' | 'عادي' | 'جديد';
  notes?: string;
  totalProjects: number;
  totalDebt: number;
  // Computed fields
  totalPaid?: number;
  totalProjectsValue?: number;
}

export interface Material {
  id: string;
  name: string;
  category: 'profile_alu' | 'profile_pvc' | 'glass' | 'accessory' | 'rubber';
  unit: 'bar' | 'm2' | 'piece' | 'roll' | 'kg';
  quantity: number;
  minQuantity: number;
  costPrice: number;
  sellingPrice: number;
  supplier: string;
}

export interface QuoteItem {
  id?: string;
  type: string;
  profileType: 'Aluminium' | 'PVC';
  color: string;
  width: number;
  height: number;
  quantity: number;
  glassType: string;
  unitPrice: number;
  totalPrice: number;
  description?: string;
}

export interface Quote {
  id: string;
  clientId: string;
  clientName?: string;
  date: string;
  validUntil: string;
  status: 'مسودة' | 'مؤكد' | 'مرفوض' | 'منتهي';
  items: QuoteItem[];
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  notes?: string;
}

export interface Project {
  id: string;
  name: string;
  clientId?: string;
  client: string; // Used as client name
  clientName?: string;
  status: ProjectStatus | string;
  startDate?: string;
  endDate?: string;
  deliveryDate?: string;
  totalPrice?: number;
  paidAmount?: number;
  budget: number;
  expenses: number;
  progress: number;
}

export interface Worker {
  id: string;
  name: string;
  role?: string;
  trade?: string;
  phone: string;
  dailyRate: number;
  isActive: boolean;
  currentProject?: string;
  // Computed fields
  totalDaysWorked?: number;
  totalEarned?: number;
  totalPaid?: number;
  balance?: number;
}

export interface Attendance {
  id: string;
  workerId: string;
  date: string;
  morning: boolean;
  evening: boolean;
}

export interface WorkerPayment {
  id: string;
  worker_id: string;
  amount: number;
  date: string;
  notes?: string;
}

export interface Transaction {
  id: string;
  description: string;
  amount: number;
  type: 'income' | 'expense';
  category: string;
  date: string;
  clientId?: string;
  method?: string;
  status?: string;
}

export type InvoiceType = 'ضريبية' | 'شكلية';

export interface InvoiceItem {
  id?: string;
  description: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  total: number;
  invoice_id?: string;
  unit_price?: number;
}

export interface Invoice {
  id: string;
  type: InvoiceType;
  client: string; // Client name
  clientId?: string;
  amount: number;
  tax?: number;
  total: number;
  date: string;
  dueDate?: string;
  status: string;
  items?: InvoiceItem[];
  rawDate?: string;
}

export interface Purchase {
  id: string;
  project: string;
  item: string;
  quantity: string | number;
  total: number;
  supplier: string;
  status: string;
  date: string;
}

export interface Supplier {
  id: string;
  name: string;
  phone?: string;
  address?: string;
  materialType?: string;
  notes?: string;
  // Computed
  totalPurchases?: number;
  totalPaid?: number;
  balance?: number;
}

export interface Transport {
  id: string;
  vehicleType: string;
  plateNumber: string;
  driverName: string;
  phone: string;
  status: string;
}
