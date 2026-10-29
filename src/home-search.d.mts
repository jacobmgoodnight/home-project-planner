import type {Database} from './types';
export type SearchResult={kind:'project'|'maintenance'|'equipment';id:string;title:string;subtitle:string};
export function searchHome(database:Database,query:string):SearchResult[];
