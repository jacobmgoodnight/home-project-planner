export const CATEGORIES = ['Home', 'Vehicles', 'Holiday Displays', 'Electronics', 'Family', 'Repairs', 'Maintenance', 'Other'] as const;
export type Category = typeof CATEGORIES[number];
export const STATUSES = ['Planned', 'Active', 'Waiting', 'Completed', 'On Hold'] as const;
export type Status = typeof STATUSES[number];
export type PriorityOverride = 'auto' | 'first' | 'later';
export interface Task { id: string; title: string; done: boolean; phase: string; dueDate: string }
export interface Material { id: string; title: string; quantity: number; unitCents: number; store: string; url: string; purchased: boolean; notes: string }
export interface Expense { id: string; title: string; amountCents: number; date: string; notes: string }
export interface FutureCost { id: string; title: string; amountCents: number; committed: boolean; dueDate: string }
export interface Quote { id: string; vendor: string; description: string; amountCents: number; received: string; url: string; notes: string }
export interface DecisionOption {
  id: string; label: string; cashTodayCents: number; financedCents: number;
  aprPercent: number; months: number; financeFeesCents: number;
  futureCostsCents: number; notes: string;
}
export interface Attachment { id: string; name: string; mime: string; dataUrl: string; date: string }
export interface Project {
  id: string; name: string; category: Category; status: Status; description: string;
  targetDate: string; nextAction: string; estimatedHours: number; budgetCents: number;
  laborEstimateCents: number; contingencyPercent: number;
  urgency: number; financialImpact: number; importance: number; override: PriorityOverride;
  blockedBy: string[]; tasks: Task[]; materials: Material[]; expenses: Expense[];
  futureCosts: FutureCost[]; quotes: Quote[]; options: DecisionOption[];
  attachments: Attachment[]; createdAt: string; updatedAt: string;
}
export interface ServiceEntry { id: string; date: string; hours: number | null; costCents: number; notes: string }
export interface MaintenanceSupply {
  id: string; name: string; size: string; partNumber: string;
  quantity: number; onHand: number; unitCents: number;
  store: string; url: string; notes: string;
}
export interface EquipmentItem {
  id: string; name: string; location: string; manufacturer: string; model: string;
  serial: string; purchasedOn: string; warrantyUntil: string; notes: string;
  photos: Attachment[];
}
export interface MaintenanceItem {
  equipmentId: string;
  id: string; title: string; asset: string; category: Category; projectId: string;
  intervalDays: number; intervalMonths?: number; firstDueDate?: string; templateKey?: string;
  intervalHours: number; currentHours: number | null;
  warrantyUntil: string; notes: string; modelNumber: string; supplies: MaintenanceSupply[]; entries: ServiceEntry[];
}
export interface Database { version: 3; demo: boolean; projects: Project[]; maintenance: MaintenanceItem[]; equipment: EquipmentItem[] }
export function uid() { return crypto.randomUUID(); }
export const today = () => { const d=new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; };
export const emptyDatabase = (): Database => ({ version: 3, demo: false, projects: [], maintenance: [], equipment: [] });
export function newProject(): Project {
  const now = new Date().toISOString();
  return { id: uid(), name: '', category: 'Home', status: 'Planned', description: '', targetDate: '', nextAction: '',
    estimatedHours: 0, budgetCents: 0, laborEstimateCents: 0, contingencyPercent: 10,
    urgency: 2, financialImpact: 2, importance: 2, override: 'auto', blockedBy: [],
    tasks: [], materials: [], expenses: [], futureCosts: [], quotes: [], options: [], attachments: [],
    createdAt: now, updatedAt: now };
}
export function newMaintenance(): MaintenanceItem {
  return { id: uid(), title: '', asset: '', category: 'Maintenance', projectId: '',
    equipmentId: '', intervalDays: 0, intervalMonths: 0, firstDueDate: '', templateKey: '', intervalHours: 0, currentHours: null, warrantyUntil: '', notes: '', modelNumber: '', supplies: [], entries: [] };
}

export function newEquipment(): EquipmentItem {
  return {id:uid(),name:'',location:'',manufacturer:'',model:'',serial:'',purchasedOn:'',warrantyUntil:'',notes:'',photos:[]};
}
