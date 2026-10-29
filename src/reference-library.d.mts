import type {EquipmentItem,MaintenanceItem,Project,Attachment} from './types';
export interface ReferenceRow {id:string;type:string;title:string;owner:string;search:string;file?:Attachment;url?:string;equipmentId?:string}
export function referenceRows(equipment:EquipmentItem[],maintenance:MaintenanceItem[],projects:Project[]):ReferenceRow[];
export function searchReferences(rows:ReferenceRow[],query:string,category?:string):ReferenceRow[];
