import type {Database} from './types';
export interface WeeklySummary {start:string;end:string;asOf:string;service:{title:string;date:string;costCents:number}[];expenses:{title:string;project:string;date:string;costCents:number}[];due:{title:string;id:string;due:ReturnType<typeof import('./logic.mjs').dueMaintenance>}[];totalService:number;totalProject:number;completedProjectCount:number}
export function weeklyHomeSummary(db:Database,asOf:string):WeeklySummary;
export function reminderItems(db:Database,asOf:string,horizon?:number):{maintenance:{id:string;title:string;due:ReturnType<typeof import('./logic.mjs').dueMaintenance>}[];warranties:Database['equipment']};
export function weeklySummaryText(summary:WeeklySummary):string;
