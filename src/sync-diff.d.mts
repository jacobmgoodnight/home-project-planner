import type {Database} from './types';
export type Difference={id:string;label:string;fields?:string[]};
export interface DifferenceGroup {section:string;onlyLocal:Difference[];onlyCloud:Difference[];changed:Difference[]}
export function snapshotDifferences(local:Database,cloud:Database):{groups:DifferenceGroup[];hasDifferences:boolean;total:number};
