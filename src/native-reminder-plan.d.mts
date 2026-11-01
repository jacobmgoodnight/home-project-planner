import type {Database} from './types';
export const HPP_NOTIFICATION_START:number;
export const HPP_NOTIFICATION_LIMIT:number;
export const HPP_NOTIFICATION_END:number;
export interface PlannedNotification {id:number;key:string;at:Date;title:string;body:string}
export function planLocalNotifications(db:Database,now?:Date):PlannedNotification[];
