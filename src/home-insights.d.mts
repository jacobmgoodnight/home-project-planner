import type {EquipmentItem,MaintenanceItem,ServiceEntry} from './types';
export function findEquipment(equipment:EquipmentItem[],maintenance:MaintenanceItem[],query:string):EquipmentItem[];
export function expiringWarranties(equipment:EquipmentItem[],asOf:string,horizonDays?:number):{item:EquipmentItem;daysRemaining:number}[];
export interface ServiceInsightRow {item:MaintenanceItem;entry:ServiceEntry;equipment:EquipmentItem|null}
export function maintenanceYearSummary(maintenance:MaintenanceItem[],equipment:EquipmentItem[],year:string|number):{
 year:string;count:number;totalCents:number;rows:ServiceInsightRow[];
 byMonth:{month:string;amountCents:number;count:number}[];
 byAsset:{key:string;label:string;amountCents:number;count:number}[];
};
