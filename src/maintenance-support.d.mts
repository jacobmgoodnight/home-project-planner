import type { MaintenanceItem,MaintenanceSupply } from './types';
export function upgradeSnapshot(snapshot:unknown):unknown;
export function quantityToBuy(part:MaintenanceSupply):number;
export interface ShoppingRow {maintenanceId:string;maintenanceTitle:string;dueDate:string|null;part:MaintenanceSupply;quantity:number;estimatedCents:number|null}
export function shoppingRows(items:MaintenanceItem[],asOf:string,all?:boolean):ShoppingRow[];
export function shoppingSummary(rows:ShoppingRow[]):{knownCents:number;unknownPrices:number;partCount:number};
export function shoppingListText(rows:ShoppingRow[]):string;
export function stockAfterRestock(onHand:number,added:number):number;
