import type {Database} from './types';
export interface MergePreview {
 additions:{projects:Database['projects'];maintenance:Database['maintenance'];equipment:Database['equipment']};
 conflicts:{projects:string[];maintenance:string[];equipment:string[]};
 unchanged:{projects:string[];maintenance:string[];equipment:string[]};
 addCount:number;conflictCount:number;
}
export function previewMerge(local:Database,incoming:Database):MergePreview;
export function mergeNewRecords(local:Database,incoming:Database):{result:Database;preview:MergePreview};
