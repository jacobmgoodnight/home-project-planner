export type SaveStatus={state:'saving'|'saved'|'error';error:string;revision:number;committed:number};
export interface SaveQueue<T>{
 enqueue(snapshot:T):Promise<void>;
 getStatus():SaveStatus&{hasUnsaved:boolean};
 wait():Promise<void>;
 needsUnloadWarning():boolean;
}
export function createSaveQueue<T>(persist:(snapshot:T)=>Promise<void>,onStatus?:(value:SaveStatus)=>void):SaveQueue<T>;
