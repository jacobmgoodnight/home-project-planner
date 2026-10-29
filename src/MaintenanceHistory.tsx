import {useState} from 'react';
import type {EquipmentItem,MaintenanceItem} from './types';
import {today} from './types';
import {money} from './logic.mjs';
import {maintenanceYearSummary} from './home-insights.mjs';

export function MaintenanceHistory({items,equipment,openTask}:{items:MaintenanceItem[];equipment:EquipmentItem[];openTask:(id:string)=>void}){
 const years=[...new Set(items.flatMap(m=>m.entries.map(e=>e.date.slice(0,4))).filter(y=>/^\d{4}$/.test(y)))].sort().reverse();
 const defaultYear=years.includes(today().slice(0,4))?today().slice(0,4):years[0]||today().slice(0,4);
 const [year,setYear]=useState(defaultYear);
 const [filter,setFilter]=useState('');
 const summary=maintenanceYearSummary(items,equipment,year);
 const rows=summary.rows.filter(x=>!filter||x.item.equipmentId===filter);
 const visibleTotal=rows.reduce((s,r)=>s+r.entry.costCents,0);
 const maxMonth=Math.max(1,...summary.byMonth.map(m=>m.amountCents));
 return <div className="maintenance-history">
  <div className="page-heading"><div><h1>Maintenance spending & history</h1><p>What was completed and actually paid, organized by year and equipment.</p></div></div>
  <section className="panel history-filters"><label className="field"><span>Year</span><select value={year} onChange={e=>setYear(e.target.value)}>{[...new Set([...years,today().slice(0,4)])].sort().reverse().map(y=><option key={y}>{y}</option>)}</select></label>
   <label className="field"><span>Equipment</span><select value={filter} onChange={e=>setFilter(e.target.value)}><option value="">All equipment / tasks</option>{equipment.map(e=><option key={e.id} value={e.id}>{e.name||e.model||'Unnamed equipment'}</option>)}</select></label>
  </section>
  <div className="history-summary-grid"><div className="panel"><span>Paid in {year}</span><strong>{money(summary.totalCents)}</strong><small>All recorded maintenance payments</small></div><div className="panel"><span>Completed services</span><strong>{summary.count}</strong><small>Including free DIY work</small></div><div className="panel"><span>{filter?'Filtered service spending':'Recorded equipment'}</span><strong>{filter?money(visibleTotal):String(summary.byAsset.length)}</strong><small>{filter?'Only selected equipment':'Includes unlinked tasks'}</small></div></div>
  <div className="history-columns"><section className="panel"><h2>Spending by month</h2><p className="subtle">Actual service costs entered in Maintenance, not shopping estimates.</p>
   <div className="history-bars">{summary.byMonth.map((m,i)=><div className="history-bar-row" key={m.month}><small>{['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][i]}</small><span className="history-bar-track"><span style={{width:(m.amountCents>0?Math.max(2,m.amountCents/maxMonth*100):0)+'%'}}/></span><strong>{money(m.amountCents)}</strong></div>)}</div>
  </section><section className="panel"><h2>Spending by equipment / task</h2>{summary.byAsset.length?summary.byAsset.map(x=><div className="history-asset-row" key={x.key}><span>{x.label}<small>{x.count} service(s)</small></span><strong>{money(x.amountCents)}</strong></div>):<p className="subtle">No recorded maintenance spending this year.</p>}
   <p className="subtle history-warning">Maintenance totals are shown separately from Projects. If you manually entered the same expense there, do not add these totals together.</p>
  </section></div>
  <section className="panel"><div className="parts-heading"><div><h2>Service log</h2><p>{rows.length} completed service record(s) matching your filters.</p></div></div>
   {rows.length?<div className="service-log-rows">{rows.map(x=><div className="service-log-row" key={x.item.id+'-'+x.entry.id}>
      <div><strong>{x.item.title}</strong><small>{x.entry.date}{x.equipment?' · '+x.equipment.name:''}</small>{x.entry.notes&&<p>{x.entry.notes}</p>}{x.entry.usedSupplies?.length? <small>{x.entry.usedSupplies.length} part type(s) logged{ x.entry.stockDeducted?' · stock deducted':''}</small>:null}</div>
      <div className="service-log-actions"><strong>{money(x.entry.costCents)}</strong>{x.entry.receipt&&<a download={x.entry.receipt.name} href={x.entry.receipt.dataUrl}>Receipt ↧</a>}<button className="small-btn" onClick={()=>openTask(x.item.id)}>Open task</button></div>
    </div>)}</div>:<p className="subtle">No completed services for this year and selection. Try another year or log your next maintenance task.</p>}
  </section>
 </div>;
}
