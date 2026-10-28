/* Historical snapshot + deterministic per-venue/day fallback; public events only. */
const VenueSchedule=(()=>{
 const pad=n=>String(n).padStart(2,'0'),date=t=>`${t.y}-${pad(t.mo)}-${pad(t.d)}`;
 function number(key){let h=2166136261;for(let i=0;i<key.length;i++)h=Math.imul(h^key.charCodeAt(i),16777619);return (h>>>0)/4294967296}
 function resolve(c,t){let kind=typeof VenueModel!=='undefined'?VenueModel.kind(c):c.venueKind;if(!kind||kind==='cemetery')return {mode:'none',basis:'対象外',occupancy:0};let force=t.venueEvent||'auto';if(force!=='auto')return {mode:force,basis:'手動設定',occupancy:force==='none'?0:1};
 let h=t.hf??t.h,ds=date(t),name=c.name||'',events=(typeof MAP_DATA!=='undefined'?MAP_DATA.venueSchedules?.events:[])||[],matches=events.filter(e=>e.venue===name&&e.date===ds).sort((a,b)=>a.opens-b.opens);
 // Live crowd lasts from start to at least 2h45m, or until 45 minutes before an all-day event closes.
 const shape=(e,basis)=>{let ends=e.endsAssumed??e.ends,liveEnd=Math.max(e.starts+2.75,ends-.75);if(h<e.opens||h>=ends)return {mode:'none',basis,event:basis==='公式予定'?e:undefined,phase:h<e.opens?(basis==='公式予定'?'開場前':'開場前の想定'):(basis==='公式予定'?'終了見込後':'終了後の想定'),occupancy:0,estimated:basis!=='公式予定'};
  let stage=h<e.starts?'pre':h<liveEnd?'live':'post',occupancy=stage==='pre'?Math.min(.85,.25+.6*(h-e.opens)/Math.max(.25,e.starts-e.opens)):stage==='live'?1:.3,audience=e.audience||(e.mode==='concert'?'rock':kind==='racecourse'?'horse':'amateur');
  return {mode:e.mode,basis,event:basis==='公式予定'?e:undefined,audience,stage,phase:basis==='公式予定'?{pre:'入場中',live:'開催時間帯',post:'終了・退場見込'}[stage]:{pre:'入場中の想定',live:'開催の想定',post:'退場の想定'}[stage],occupancy,estimated:basis!=='公式予定'}};
 if(matches.length){let entry=matches.find(e=>h>=e.opens&&h<e.endsAssumed)||matches.find(e=>h<e.opens)||matches.at(-1);return shape(entry,'公式予定')}
 if(name==='大井競馬場'&&ds>='2026-10-01'&&ds<='2026-12-31')return {mode:'none',basis:'公式競馬日程',phase:'競馬開催日以外',occupancy:0,url:'https://www.tokyocitykeiba.com/race/schedule/'};
 // One venue/date receives one stable modeled event (VenueAudience), not a fresh dice roll on every click.
 if(c.closedFrom&&ds>=c.closedFrom&&(!c.closedUntil||ds<=c.closedUntil))return {mode:'none',basis:'公式案内',phase:c.closureNote||'休業期間',occupancy:0};
 let planned=typeof VenueAudience!=='undefined'?VenueAudience.plan(name,kind,t):null;
 return planned?shape(planned,'自動推定'):{mode:'none',basis:'自動推定',phase:'通常利用の想定',occupancy:0,estimated:true};
 }
 return {resolve,date};
})();
if(typeof module!=='undefined')module.exports=VenueSchedule;
