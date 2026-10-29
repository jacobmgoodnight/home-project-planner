import type {Category,MaintenanceItem} from './types';
import {newMaintenance} from './types';
export interface MaintenancePreset {
 key:string;title:string;asset:string;category:Category;group:'Everyday home'|'Home equipment & outdoors'|'Only if installed'|'Spring'|'Summer'|'Fall'|'Winter';months:number;notes:string;defaultSelected:boolean;
}
const rows:[string,string,string,Category,MaintenancePreset['group'],number,boolean,string][]=[
['hvac-filter','Change / inspect HVAC air filter','Heating & cooling system','Maintenance','Everyday home',1,true,'Check monthly; replace per your preference, when dirty, or as directed by the filter/system instructions. ENERGY STAR recommends checking every month and replacing at least every three months.'],
['fridge-water','Replace refrigerator drinking-water filter','Refrigerator water dispenser / ice maker','Maintenance','Everyday home',4,true,'Four months is a household preference, not the manufacturer interval. GE commonly recommends six months or earlier if flow decreases; confirm your actual cartridge.'],
['smoke','Test smoke alarms','All smoke alarms','Maintenance','Everyday home',1,true,'Use each test button and follow manufacturer instructions. Replace alarm units at the manufacturer recommended age (often 10 years).'],
['co','Test carbon-monoxide alarms','Carbon-monoxide detectors','Maintenance','Everyday home',1,true,'Test as directed by each manufacturer. Remove this suggestion if not applicable and verify home safety requirements.'],
['dryer','Inspect / clean dryer exhaust vent','Clothes dryer & outside vent','Maintenance','Everyday home',6,true,'Clean the dryer lint screen after every load. Check exterior vent for airflow and buildup; hire qualified cleaning when needed.'],
['dishwasher','Clean dishwasher filter','Dishwasher','Maintenance','Everyday home',1,false,'Only if dishwasher has a user-cleanable filter. Follow manufacturer guidance.'],
['leaks','Check under-sink and appliance leaks','Sinks, toilets, refrigerator & laundry','Maintenance','Everyday home',3,true,'Look for visible drips, damp cabinet floors and unusual moisture.'],
['gutters','Inspect gutters, downspouts & yard drainage','Exterior runoff & planting beds','Home','Home equipment & outdoors',6,true,'Inspect in spring and after leaf fall or storms; check downspouts and problem drainage areas. Avoid ladder hazards.'],
['garage-fridge','Inspect garage refrigerator seals & condensation','Garage refrigerator','Maintenance','Home equipment & outdoors',3,false,'Inspect gasket, moisture and temperature in hot/cold weather; check the appliance temperature rating.'],
['shower','Replace / check shower filter cartridge','Shower water filter (e.g. AquaBliss)','Maintenance','Home equipment & outdoors',4,false,'Four months is a placeholder; check cartridge model, usage and manufacturer instructions.'],
['projector','Inspect projector vents and filters','Home theater & holiday projectors','Electronics','Home equipment & outdoors',6,false,'Inspect ventilation and user-serviceable filters according to the exact projector manual; do not blow compressed air into unapproved locations.'],
['holiday-power','Inspect holiday power connections','Outdoor cords, smart plugs & covers','Holiday Displays','Home equipment & outdoors',6,false,'Before setup, examine cords, GFCI protection, weather covers and connections. Replace damaged cords.'],
['permanent-light','Check permanent outdoor lighting','Outdoor fixtures, low-voltage wire & controllers','Holiday Displays','Home equipment & outdoors',6,false,'Inspect mounting, weather seals, enclosures and cabling from safe access points.'],
['freeze','Prepare outdoor faucets and hoses for winter','Outdoor faucets & hoses','Home','Fall',12,false,'Set first due for fall. Winterize as appropriate for local freeze conditions and installed fixtures.'],
['hvac-service','Professional HVAC service','Heating / cooling system','Maintenance','Only if installed',12,false,'Schedule qualified seasonal service according to equipment instructions.'],
['water-heater','Inspect / service water heater','Water heater','Maintenance','Only if installed',12,false,'Follow the specific tank or tankless manual. Professional help for flushing, valves, pressure or fuel connections as appropriate.'],
['sump','Test sump pump','Sump / backup pump','Maintenance','Only if installed',3,false,'Only if installed. Follow pump testing instructions and electrical safety precautions.'],
['garage-door','Test garage-door safety reversal','Motorized garage door','Maintenance','Only if installed',1,false,'Follow opener safety testing instructions. Never work on high-tension springs or cables.'],
['whole-water','Replace whole-home water filter','Whole-house filter','Maintenance','Only if installed',4,false,'Only if installed. Four months is a placeholder; use cartridge and water-condition guidance.'],
['humidifier','Inspect furnace humidifier pad','Whole-home humidifier','Maintenance','Only if installed',12,false,'Only if installed. Adjust to manufacturer instructions.'],
['spring-faucet','Inspect exterior faucets after freeze season','Outdoor faucets','Home','Spring',12,false,'Look for leaks and frost damage from safe access. Schedule first due in spring; confirm plumbing configuration.'],
['spring-seals','Inspect exterior caulking and seals','Windows, doors & siding','Home','Spring',12,false,'Visually check accessible seals for gaps and moisture; repair according to product instructions.'],
['spring-screens','Inspect window screens and tracks','Windows and screens','Home','Spring',12,false,'Check damage and gently clear debris using manufacturer-safe methods.'],
['summer-ac','Check accessible A/C condensate drain and moisture','Air-conditioning system','Maintenance','Summer',12,false,'Inspect only accessible user-serviceable areas for clogs or leaks; hire a professional if uncertain.'],
['summer-railings','Inspect outdoor steps, decks and railings','Outdoor walking surfaces','Home','Summer',12,false,'Look for visible loose fasteners, decay or trip hazards without dismantling structural components.'],
['summer-hoses','Check hose connections and garden-water leaks','Outdoor water connections','Home','Summer',12,false,'Inspect for drips and puddling during watering season; keep water away from the foundation.'],
['fall-seals','Inspect exterior door weatherstripping','Entry doors and garage weather seals','Home','Fall',12,false,'Check drafts and damaged weatherstripping before colder weather.'],
['fall-roof','Visually inspect roofline and flashing from the ground','Roof and chimney exterior','Home','Fall',12,false,'Use safe ground-level observations; do not climb onto the roof. Arrange qualified inspection if concerns arise.'],
['winter-condensation','Check indoor window condensation and humidity','Windows and indoor humidity','Home','Winter',12,false,'Look for persistent moisture and condensation and follow HVAC/home instructions for safe humidity management.'],
['winter-pipes','Check visible pipes for cold-weather leaks','Accessible plumbing near cold areas','Home','Winter',12,false,'Check accessible pipes without removing insulation or touching electrical/heating components.'],
['winter-supplies','Check emergency flashlights and cold-weather supplies','Household emergency supplies','Family','Winter',12,false,'Verify flashlight batteries, basic supplies and readily accessible emergency information.']
];
export const MAINTENANCE_PRESETS:MaintenancePreset[]=rows.map(([key,title,asset,category,group,months,defaultSelected,notes])=>({key,title,asset,category,group,months,defaultSelected,notes}));
export function createFromPreset(p:MaintenancePreset):MaintenanceItem {return {...newMaintenance(),title:p.title,asset:p.asset,category:p.category,intervalMonths:p.months,intervalDays:0,firstDueDate:'',templateKey:p.key,notes:p.notes};}
export function isPresetInstalled(p:MaintenancePreset,items:MaintenanceItem[]):boolean {
 const normalize=(s:string)=>s.trim().toLocaleLowerCase('en-US');
 return items.some(i=>i.templateKey===p.key||normalize(i.title)===normalize(p.title));
}
