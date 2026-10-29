import type { MaintenanceItem,MaintenanceSupply,Attachment } from './types';
export interface CompletionDetails {id:string;date:string;asOf:string;hours:number|null;costCents:number;notes:string;usedSupplies:{partId:string;quantity:number}[];deductStock:boolean;receipt?:Attachment}
export function completeService(item:MaintenanceItem,details:CompletionDetails):MaintenanceItem;
export interface AgendaItem {item:MaintenanceItem;dueDate:string;daysUntil:number}
export function maintenanceAgenda(items:MaintenanceItem[],asOf:string,horizon?:number):{overdue:AgendaItem[];upcoming:AgendaItem[];usageDue:{item:MaintenanceItem;dueHours:number;remaining:number}[];unscheduled:MaintenanceItem[]};
export function lowStockRows(items:MaintenanceItem[]):{maintenanceId:string;maintenanceTitle:string;part:MaintenanceSupply;shortfall:number}[];
