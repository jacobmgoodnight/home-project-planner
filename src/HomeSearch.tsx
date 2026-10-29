import {useEffect,useMemo,useRef,useState} from 'react';
import type {Database} from './types';
import {searchHome} from './home-search.mjs';
import type {SearchResult} from './home-search.mjs';
export function HomeSearch({data,onOpen,onClose}:{data:Database;onOpen:(item:SearchResult)=>void;onClose:()=>void}){
 const [query,setQuery]=useState('');
 const inputRef=useRef<HTMLInputElement>(null);
 const results=useMemo(()=>searchHome(data,query),[data,query]);
 useEffect(()=>{inputRef.current?.focus();const close=(e:KeyboardEvent)=>{if(e.key==='Escape')onClose();};
 window.addEventListener('keydown',close);return()=>window.removeEventListener('keydown',close);},[onClose]);
 return <div className="quick-overlay" onClick={onClose}>
  <section role="dialog" aria-modal="true" aria-label="Search home planner" className="panel quick-dialog home-search" onClick={e=>e.stopPropagation()}>
   <div className="parts-heading"><div><h2>Search your home</h2><p>Find projects, model numbers, replacement SKUs, notes and documents.</p></div><button className="small-btn" onClick={onClose} aria-label="Close search">✕</button></div>
   <input ref={inputRef} type="search" aria-label="Search all home records" placeholder="Try 'fridge filter', 'EX3210' or a part number…" value={query} onChange={e=>setQuery(e.target.value)}/>
   {!query.trim()?<p className="subtle">Search stays on this device; nothing is sent to an external service.</p>:
    results.length?<div className="home-search-results">
     {(['project','maintenance','equipment'] as const).map(kind=>{
      const matches=results.filter(r=>r.kind===kind);
      return matches.length?<div key={kind}><h3>{kind==='project'?'Projects':kind==='maintenance'?'Maintenance':'Equipment'} ({matches.length})</h3>
       {matches.slice(0,15).map(result=><button key={result.kind+result.id} onClick={()=>onOpen(result)}>
        <strong>{result.title}</strong><small>{result.subtitle}</small><span>Open →</span>
       </button>)}
      </div>:null;
     })}</div>:<p className="subtle">No matches found. Try a different model, appliance name or part number.</p>}
  </section>
 </div>;
}
