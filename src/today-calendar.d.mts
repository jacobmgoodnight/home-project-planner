import type {Project,MaintenanceItem,Task} from './types';
export function todayOverview(projects:Project[],maintenance:MaintenanceItem[],asOf:string):{
 due:{item:MaintenanceItem;status:ReturnType<typeof import('./logic.mjs').dueMaintenance>}[];
 nextSteps:{project:Project;task:Task}[];quickWins:Project[];upcomingProjects:Project[];
};
export function calendarEntries(maintenance:MaintenanceItem[]):{id:string;title:string;date:string;asset:string}[];
export function calendarIcs(items:MaintenanceItem[],asOf:string):{count:number;text:string};
