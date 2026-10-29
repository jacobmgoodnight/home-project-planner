import {projectCost} from './logic.mjs';
/** No cost estimate is unknown, not $0. Unbudgeted projects can still have valid estimates. */
export function isUnderBudgetRemaining(project,thresholdCents=10000){
 if(project.status==='Completed')return false;
 const known=project.expenses.length>0||project.materials.length>0
  ||project.futureCosts.length>0||project.laborEstimateCents>0||project.budgetCents>0;
 if(!known)return false;
 const costs=projectCost(project);
 return Math.max(0,costs.forecastCents-costs.spentCents)<=thresholdCents;
}
/** Adding candidate as a prerequisite creates a loop if candidate already depends on target. */
export function wouldCreateDependencyCycle(projects,targetId,candidateId){
 if(targetId===candidateId)return true;
 const byId=new Map(projects.map(p=>[p.id,p]));
 const seen=new Set();
 const stack=[candidateId];
 while(stack.length){
  const current=stack.pop();
  if(current===targetId)return true;
  if(seen.has(current))continue;
  seen.add(current);
  for(const id of byId.get(current)?.blockedBy||[])stack.push(id);
 }
 return false;
}
