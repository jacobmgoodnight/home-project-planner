import type { Database, Project, MaintenanceItem, EquipmentItem } from './types';
import { CATEGORIES, STATUSES } from './types';
import { upgradeSnapshot } from './maintenance-support.mjs';
const DB_NAME = 'home-project-planner-v1';
const STORE = 'snapshots';
const KEY = 'main';
const RECOVERY_KEY = 'previous-workspace';

function open(): Promise<IDBDatabase> {
  return new Promise((resolve,reject)=>{
    if(!('indexedDB' in window)) { reject(new Error('IndexedDB is unavailable in this browser.')); return; }
    const request=indexedDB.open(DB_NAME,1);
    request.onupgradeneeded=()=>{if(!request.result.objectStoreNames.contains(STORE))request.result.createObjectStore(STORE);};
    request.onerror=()=>reject(request.error||new Error('Could not open local database.'));
    request.onsuccess=()=>resolve(request.result);
  });
}
async function transaction<T>(mode: IDBTransactionMode, worker:(store:IDBObjectStore, done:(value:T)=>void)=>void):Promise<T> {
  const db=await open();
  return new Promise<T>((resolve,reject)=>{
    let value:T;
    let hasValue=false;
    const tx=db.transaction(STORE,mode);
    tx.oncomplete=()=>{db.close(); if(hasValue)resolve(value);else reject(new Error('Database operation returned no result.'));};
    tx.onerror=()=>{db.close();reject(tx.error||new Error('Database operation failed.'));};
    tx.onabort=()=>{db.close();reject(tx.error||new Error('Database operation aborted.'));};
    try {worker(tx.objectStore(STORE),x=>{value=x;hasValue=true;});}
    catch(error){tx.abort();reject(error);}
  });
}
export async function load():Promise<Database|null> {
  const stored=await transaction<unknown>('readonly',(store,done)=>{
    const req=store.get(KEY);
    req.onsuccess=()=>done(req.result??null);
  });
  if(stored===null)return null;
  const migrated=upgradeSnapshot(stored);
  if(!validateBackup(migrated))throw new Error('Stored data has an unsupported or damaged format. No changes were made.');
  return migrated;
}
/** Keep one local checkpoint so a destructive local replacement can be reversed. */
export async function saveRecoverySnapshot(value:Database):Promise<void>{
 if(!validateBackup(value))throw new Error('Cannot checkpoint invalid local records.');
 await transaction<void>('readwrite',(store,done)=>{store.put(value,RECOVERY_KEY);done(undefined);});
}
export async function loadRecoverySnapshot():Promise<Database|null>{
 const raw=await transaction<unknown>('readonly',(store,done)=>{
  const request=store.get(RECOVERY_KEY);request.onsuccess=()=>done(request.result??null);
 });
 if(raw===null)return null;
 const upgraded=upgradeSnapshot(raw);
 if(!validateBackup(upgraded))throw new Error('Stored recovery checkpoint is invalid.');
 return upgraded;
}
export async function save(value:Database):Promise<void> {
  return transaction<void>('readwrite',(store,done)=>{
    store.put(value,KEY);done(undefined);
  });
}

const object=(v:unknown):v is Record<string,unknown> => !!v&&typeof v==='object'&&!Array.isArray(v);
const text=(v:unknown):v is string => typeof v==='string';
const nonnegative=(v:unknown):v is number => typeof v==='number'&&Number.isFinite(v)&&v>=0;
const array=(v:unknown):v is unknown[] => Array.isArray(v);
const cents=(v:unknown):v is number => nonnegative(v)&&Number.isSafeInteger(v);
const id=(v:unknown):v is string => text(v)&&v.length>0&&v.length<100;
const optUrl=(v:unknown):boolean=>text(v)&&(v===''||/^https?:\/\//i.test(v));
const simple=(v:unknown, fields:string[]):v is Record<string,unknown>=>object(v)&&fields.every(k=>k in v);
const uniqueIds=(rows:unknown[])=>new Set(rows.map(x=>(x as {id:string}).id)).size===rows.length;

function checkAttachment(v:unknown):boolean {
  return simple(v,['id','name','mime','dataUrl','date'])&&id(v.id)&&text(v.name)&&text(v.date)&&
    text(v.mime)&&['application/pdf','image/jpeg','image/png','image/webp'].includes(v.mime)&&text(v.dataUrl)&&
    /^data:(image\/(jpeg|png|webp)|application\/pdf);base64,/.test(v.dataUrl);
}
function checkEquipment(v:unknown):v is EquipmentItem {
  return simple(v,['id','name','location','manufacturer','model','serial','purchasedOn','warrantyUntil','notes','photos'])&&
    id(v.id)&&['name','location','manufacturer','model','serial','purchasedOn','warrantyUntil','notes'].every(k=>text(v[k]))&&
    array(v.photos)&&v.photos.length<=10&&uniqueIds(v.photos)&&v.photos.every(x=>checkAttachment(x)&&typeof (x as {mime:string}).mime==='string'&&(x as {mime:string}).mime.startsWith('image/'))&&
    (v.documents===undefined||(array(v.documents)&&v.documents.length<=20&&uniqueIds(v.documents)&&v.documents.every(checkAttachment)));
}
function checkProject(v:unknown):v is Project {
  if(!simple(v,['id','name','category','status','description','targetDate','nextAction','estimatedHours','budgetCents','laborEstimateCents','contingencyPercent','urgency','financialImpact','importance','override','blockedBy','tasks','materials','expenses','futureCosts','quotes','options','attachments','createdAt','updatedAt']))return false;
  if(!id(v.id)||!text(v.name)||!CATEGORIES.includes(v.category as typeof CATEGORIES[number])||!STATUSES.includes(v.status as typeof STATUSES[number])||!['auto','first','later'].includes(v.override as string))return false;
  if(!['description','targetDate','nextAction','createdAt','updatedAt'].every(k=>text(v[k])))return false;
  if(!['estimatedHours','budgetCents','laborEstimateCents','contingencyPercent','urgency','financialImpact','importance'].every(k=>nonnegative(v[k])))return false;
  if(!cents(v.budgetCents)||!cents(v.laborEstimateCents)||Number(v.contingencyPercent)>100||Number(v.urgency)>4||Number(v.financialImpact)>4||Number(v.importance)>4)return false;
  if(!array(v.blockedBy)||!v.blockedBy.every(id))return false;
  const fieldValidations:Record<string,(x:unknown)=>boolean>={
    tasks:x=>simple(x,['id','title','done','phase','dueDate'])&&id(x.id)&&text(x.title)&&typeof x.done==='boolean'&&text(x.phase)&&text(x.dueDate),
    materials:x=>simple(x,['id','title','quantity','unitCents','store','url','purchased','notes'])&&id(x.id)&&text(x.title)&&nonnegative(x.quantity)&&cents(x.unitCents)&&text(x.store)&&optUrl(x.url)&&typeof x.purchased==='boolean'&&text(x.notes),
    expenses:x=>simple(x,['id','title','amountCents','date','notes'])&&id(x.id)&&text(x.title)&&cents(x.amountCents)&&text(x.date)&&text(x.notes),
    futureCosts:x=>simple(x,['id','title','amountCents','committed','dueDate'])&&id(x.id)&&text(x.title)&&cents(x.amountCents)&&typeof x.committed==='boolean'&&text(x.dueDate),
    quotes:x=>simple(x,['id','vendor','description','amountCents','received','url','notes'])&&id(x.id)&&text(x.vendor)&&text(x.description)&&cents(x.amountCents)&&text(x.received)&&optUrl(x.url)&&text(x.notes),
    options:x=>simple(x,['id','label','cashTodayCents','financedCents','aprPercent','months','financeFeesCents','futureCostsCents','notes'])&&id(x.id)&&text(x.label)&&['cashTodayCents','financedCents','financeFeesCents','futureCostsCents'].every(k=>cents(x[k]))&&nonnegative(x.aprPercent)&&x.aprPercent<=100&&Number.isSafeInteger(x.months)&&Number(x.months)>=0&&Number(x.months)<=600&&text(x.notes),
    attachments:x=>simple(x,['id','name','mime','dataUrl','date'])&&id(x.id)&&text(x.name)&&text(x.date)&&text(x.mime)&&['application/pdf','image/jpeg','image/png','image/webp'].includes(x.mime)&&text(x.dataUrl)&&/^data:(image\/(jpeg|png|webp)|application\/pdf);base64,/.test(x.dataUrl)
  };
  return Object.entries(fieldValidations).every(([key,valid])=>array(v[key])&&v[key].every(valid)&&uniqueIds(v[key]));
}
function checkSupply(v:unknown):boolean {
  return simple(v,['id','name','size','partNumber','quantity','onHand','unitCents','store','url','notes']) &&
    id(v.id) && ['name','size','partNumber','store','notes'].every(k=>text(v[k])) &&
    Number.isSafeInteger(v.quantity) && Number(v.quantity)>0 && Number(v.quantity)<=9999 &&
    Number.isSafeInteger(v.onHand) && Number(v.onHand)>=0 && Number(v.onHand)<=9999 &&
    cents(v.unitCents) && (v.minOnHand===undefined||(Number.isSafeInteger(v.minOnHand)&&nonnegative(v.minOnHand)&&Number(v.minOnHand)<=9999))&&optUrl(v.url);
}
function checkMaintenance(v:unknown):v is MaintenanceItem {
  return simple(v,['id','title','asset','category','projectId','equipmentId','intervalDays','intervalHours','currentHours','warrantyUntil','notes','entries'])&&
    id(v.id)&&['title','asset','projectId','equipmentId','warrantyUntil','notes'].every(k=>text(v[k]))&&CATEGORIES.includes(v.category as typeof CATEGORIES[number])&&
    nonnegative(v.intervalDays)&&(v.intervalMonths===undefined||(Number.isSafeInteger(v.intervalMonths)&&nonnegative(v.intervalMonths)&&Number(v.intervalMonths)<=120))&&
    (v.firstDueDate===undefined||(text(v.firstDueDate)&&(v.firstDueDate===''||/^\d{4}-\d{2}-\d{2}$/.test(v.firstDueDate))))&&
    (v.templateKey===undefined||(text(v.templateKey)&&v.templateKey.length<100))&&text(v.modelNumber)&&v.modelNumber.length<500&&
    array(v.supplies)&&v.supplies.length<=500&&uniqueIds(v.supplies)&&v.supplies.every(checkSupply)&&nonnegative(v.intervalHours)&&(v.currentHours===null||nonnegative(v.currentHours))&&
    array(v.entries)&&uniqueIds(v.entries)&&v.entries.every(x=>simple(x,['id','date','hours','costCents','notes'])&&id(x.id)&&text(x.date)&&text(x.notes)&&cents(x.costCents)&&(x.hours===null||nonnegative(x.hours))&&
      (x.stockDeducted===undefined||typeof x.stockDeducted==='boolean')&&
      (x.receipt===undefined&&true||x.receipt!==undefined&&checkAttachment(x.receipt))&&
      (x.usedSupplies===undefined||(array(x.usedSupplies)&&x.usedSupplies.length<=500&&
        x.usedSupplies.every(s=>simple(s,['partId','quantity'])&&id(s.partId)&&Number.isSafeInteger(s.quantity)&&Number(s.quantity)>0&&Number(s.quantity)<=9999)&&
        new Set(x.usedSupplies.map(s=>(s as {partId:string}).partId)).size===x.usedSupplies.length)));
}
export function validateBackup(data:unknown):data is Database {
  return object(data)&&data.version===3&&typeof data.demo==='boolean'&&array(data.projects)&&array(data.maintenance)&&array(data.equipment)&&
    data.projects.length<=10000&&data.maintenance.length<=10000&&data.equipment.length<=10000&&data.projects.every(checkProject)&&data.maintenance.every(checkMaintenance)&&data.equipment.every(checkEquipment)&&
    uniqueIds(data.projects)&&uniqueIds(data.maintenance)&&uniqueIds(data.equipment)&&data.maintenance.every(m=>!m.equipmentId||(data.equipment as EquipmentItem[]).some(e=>e.id===m.equipmentId));
}
export async function readBackup(file:File):Promise<Database> {
  if(file.size>60*1024*1024)throw new Error('Backup is larger than the 60 MB import limit.');
  let parsed:unknown;
  try {parsed=JSON.parse(await file.text());}catch{throw new Error('This file is not valid JSON.');}
  const migrated=upgradeSnapshot(parsed);
  if(!validateBackup(migrated))throw new Error('Invalid or unsupported backup. Expected a valid version 1, 2 or 3 Home Project Planner export.');
  return migrated;
}
export function downloadBackup(data:Database) {
  const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');a.href=url;a.download=`home-project-planner-${new Date().toISOString().slice(0,10)}.json`;
  a.click();setTimeout(()=>URL.revokeObjectURL(url),60000);
}
export async function attachmentFromFile(file:File) {
  if(!['image/png','image/webp','image/jpeg','application/pdf'].includes(file.type))throw new Error('Use JPG, PNG, WebP or PDF files.');
  if(file.size>15*1024*1024)throw new Error('File must be under 15 MB before image resizing.');
  if(file.type==='application/pdf'&&file.size>2*1024*1024)throw new Error('PDF attachments must be under 2 MB.');
  if(file.type==='application/pdf')return {mime:file.type,dataUrl:await toDataUrl(file)};
  const original=await toDataUrl(file);
  const img=new Image();img.src=original;
  await new Promise<void>((resolve,reject)=>{img.onload=()=>resolve();img.onerror=()=>reject(new Error('Could not read image.'));});
  const scale=Math.min(1,1400/Math.max(img.width,img.height));
  const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(img.width*scale));canvas.height=Math.max(1,Math.round(img.height*scale));
  const ctx=canvas.getContext('2d');if(!ctx)throw new Error('Image compression unavailable.');
  ctx.fillStyle='#ffffff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(img,0,0,canvas.width,canvas.height);
  const dataUrl=canvas.toDataURL('image/jpeg',0.72);
  if(dataUrl.length>3*1024*1024)throw new Error('Compressed image is too large.');
  return {mime:'image/jpeg',dataUrl};
}
function toDataUrl(file:File):Promise<string>{return new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(String(r.result));r.onerror=()=>reject(new Error('File read failed.'));r.readAsDataURL(file);});}
