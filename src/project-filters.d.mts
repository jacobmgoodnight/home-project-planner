import type {Project} from './types';
export function isUnderBudgetRemaining(project:Project,thresholdCents?:number):boolean;
export function wouldCreateDependencyCycle(projects:Project[],targetId:string,candidateId:string):boolean;
