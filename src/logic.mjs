/** Pure project math; money is integer cents. All formulas are deterministic and independently tested. */
export const money = cents => new Intl.NumberFormat('en-US', {style:'currency',currency:'USD'}).format((cents || 0)/100);
export const fromDollars = dollars => Math.round(Math.min(1_000_000_000, Math.max(0, Number(dollars) || 0)) * 100);
export const dollars = cents => ((cents || 0) / 100).toFixed(2);
export const clamp = (n, min, max) => Math.min(max, Math.max(min, Number(n) || 0));
export const utcDay = text => text ? Math.floor(Date.parse(`${text}T12:00:00Z`) / 86400000) : null;
export function dayDiff(date, today) {const d=utcDay(date), t=utcDay(today);return d === null || t === null ? null : d-t;}

/** A purchased material is excluded from future estimates. Actual costs exist only as Expense entries. */
export function projectCost(p) {
  const spentCents = p.expenses.reduce((s,x)=>s+x.amountCents,0);
  const materialsCents = p.materials.filter(x=>!x.purchased).reduce((s,x)=>s+Math.round(x.quantity*x.unitCents),0);
  const committedCents = p.futureCosts.filter(x=>x.committed).reduce((s,x)=>s+x.amountCents,0);
  const plannedCents = p.futureCosts.filter(x=>!x.committed).reduce((s,x)=>s+x.amountCents,0);
  const estimatedCents = materialsCents+p.laborEstimateCents+plannedCents;
  const contingencyCents = Math.round((committedCents + estimatedCents)*p.contingencyPercent/100);
  const forecastCents = spentCents + committedCents + estimatedCents + contingencyCents;
  return {spentCents,materialsCents,committedCents,plannedCents,estimatedCents,contingencyCents,forecastCents,
    budgetRemainingCents:p.budgetCents-spentCents,forecastHeadroomCents:p.budgetCents-forecastCents};
}

/** Standard fully amortizing fixed-rate monthly payment; APR annual nominal, monthly compounding. */
export function monthlyPayment(principalCents, aprPercent, months) {
  if (!principalCents || !months || months <= 0) return 0;
  if (!aprPercent) return Math.round(principalCents / months);
  const r = (aprPercent / 100) / 12;
  return Math.round(principalCents * r / (1 - Math.pow(1+r,-months)));
}
export function decisionCost(o) {
  const paymentCents = monthlyPayment(o.financedCents, o.aprPercent, o.months);
  // Rounding each payment to cents can differ slightly from a lender's final adjusted payment.
  const loanTotalCents = o.financedCents>0 && o.months<=0 ? o.financedCents : paymentCents*o.months;
  const interestCents = loanTotalCents-o.financedCents;
  return {paymentCents,loanTotalCents,interestCents,
    totalCents:o.cashTodayCents + o.financeFeesCents + o.futureCostsCents + loanTotalCents};
}
export function priority(p, projects, today) {
  const reasons=[];
  let score=p.urgency*10+p.financialImpact*4+p.importance*5;
  reasons.push(`Urgency +${p.urgency*10}`,`Financial impact +${p.financialImpact*4}`,`Importance +${p.importance*5}`);
  const days=dayDiff(p.targetDate,today);
  let deadline=0;
  if(days!==null && days<0)deadline=20;
  else if(days!==null && days<=7)deadline=15;
  else if(days!==null && days<=30)deadline=8;
  if(deadline){score+=deadline;reasons.push(`Deadline +${deadline}${days!==null&&days<0?' (overdue)':''}`);}
  const uncompleted=projects.filter(x=>x.id!==p.id&&x.status!=='Completed'&&x.blockedBy.includes(p.id)).length;
  const unblock=Math.min(15,uncompleted*5);if(unblock){score+=unblock;reasons.push(`Unblocks ${uncompleted} project(s) +${unblock}`);}
  const cost=p.budgetCents; const affordability=cost>0&&cost<=10000?6:cost>0&&cost<=50000?4:0;
  if(affordability){score+=affordability;reasons.push(`Affordable scope +${affordability}`);}
  const quick=p.estimatedHours>0&&p.estimatedHours<=2?6:p.estimatedHours>0&&p.estimatedHours<=8?3:0;
  if(quick){score+=quick;reasons.push(`Short effort +${quick}`);}
  return {score,reasons};
}
export function sortProjects(projects,today) {
  const rank={first:0,auto:1,later:2};
  return [...projects].sort((a,b)=>(rank[a.override]-rank[b.override]) ||
    (priority(b,projects,today).score-priority(a,projects,today).score) || a.name.localeCompare(b.name));
}
export function dueMaintenance(item,today) {
  const last=[...item.entries].sort((a,b)=>b.date.localeCompare(a.date))[0];
  const validLast=last && /^\d{4}-\d{2}-\d{2}$/.test(last.date) && Number.isFinite(Date.parse(`${last.date}T12:00:00Z`));
  const dueDate=validLast && item.intervalDays>0 ?
    new Date(Date.parse(`${last.date}T12:00:00Z`)+item.intervalDays*86400000).toISOString().slice(0,10):'';
  const dueHours=last?.hours!==null && last?.hours!==undefined && item.intervalHours>0 ? last.hours+item.intervalHours : null;
  const dateRemaining=dueDate?dayDiff(dueDate,today):null;
  const hourRemaining=dueHours!==null && item.currentHours!==null?dueHours-item.currentHours:null;
  const due=(dateRemaining!==null && dateRemaining<=0)||(hourRemaining!==null && hourRemaining<=0);
  const soon=!due&&((dateRemaining!==null&&dateRemaining<=30)||(hourRemaining!==null&&hourRemaining<=10));
  return {due,soon,dueDate,dueHours,dateRemaining,hourRemaining};
}
