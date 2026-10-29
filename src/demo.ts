import type { Database, Project } from './types';
import { newProject, uid } from './types';
function sample(name:string, category:Project['category'], status:Project['status'], amount:number, hours:number, action:string, urgency:number):Project {
  return {...newProject(),name,category,status,budgetCents:amount*100,estimatedHours:hours,nextAction:action,urgency};
}
export function demoData():Database {
  const drain=sample('Backyard drainage improvement','Home','Active',520,6,'Compare pipe fittings and finalize trench route',3);
  drain.materials=[{id:uid(),title:'Solid corrugated pipe',quantity:20,unitCents:340,store:'Fictional hardware store',url:'',purchased:false,notes:'Illustrative price only'},
    {id:uid(),title:'Gravel bags',quantity:6,unitCents:850,store:'Fictional hardware store',url:'',purchased:false,notes:''}];
  drain.expenses=[{id:uid(),title:'Sample site inspection',amountCents:3500,date:'2026-10-12',notes:'Fictional demo expense'}];
  drain.tasks=[{id:uid(),title:'Research drainage route',done:true,phase:'Research',dueDate:''},{id:uid(),title:'Purchase materials',done:false,phase:'Order',dueDate:''},{id:uid(),title:'Install and test',done:false,phase:'Install',dueDate:''}];
  drain.laborEstimateCents=25000; drain.contingencyPercent=10;
  const car=sample('Vehicle repair decision (example)','Vehicles','Waiting',4000,2,'Request a written second estimate',4);
  car.quotes=[{id:uid(),vendor:'Sample service center',description:'Hypothetical repair quote',amountCents:400000,received:'2026-10-15',url:'',notes:'Not a real estimate'}];
  car.options=[
    {id:uid(),label:'Repair now — pay cash',cashTodayCents:400000,financedCents:0,aprPercent:0,months:0,financeFeesCents:0,futureCostsCents:0,notes:'Illustrative only'},
    {id:uid(),label:'Repair now — finance',cashTodayCents:0,financedCents:400000,aprPercent:9,months:12,financeFeesCents:0,futureCostsCents:0,notes:'Hypothetical 9% APR; actual terms may differ'}
  ];
  const display=sample('Winter light storage labels','Holiday Displays','Planned',85,1.5,'Label cords and splitters',1);
  display.tasks=[{id:uid(),title:'Print weatherproof labels',done:false,phase:'Prepare',dueDate:''}];
  const projector=sample('Projector filter cleaning','Electronics','Planned',30,1,'Check projector maintenance instructions',2);
  return {version:1,demo:true,projects:[drain,car,display,projector],maintenance:[]};
}
