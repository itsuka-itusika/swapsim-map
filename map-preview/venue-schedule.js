/* Historical snapshot + deterministic per-venue/day fallback; public events only. */
const VenueSchedule=(()=>{
 const pad=n=>String(n).padStart(2,'0'),date=t=>`${t.y}-${pad(t.mo)}-${pad(t.d)}`;
 function number(key){let h=2166136261;for(let i=0;i<key.length;i++)h=Math.imul(h^key.charCodeAt(i),16777619);return (h>>>0)/4294967296}
 // 大井競馬場 after the official snapshot: the general pattern of its meetings rather than a daily dice roll.
 // Meetings run Monday-Friday about every third week (the 2026 official rhythm: weeks of 10/5, 10/26, 11/16 ...),
 // with night racing (first race about 14:30, last about 21:00). The year-end meeting runs 12/28-31 every year,
 // in the daytime from 12/29 (東京大賞典); rotation weeks are suppressed from 12/22 to 1/4 around it.
 const OOI_ANCHOR=Date.UTC(2026,9,5);
 function ooiRule(t){let day=Date.UTC(t.y,t.mo-1,t.d),dow=new Date(day).getUTCDay(),md=t.mo*100+t.d,url='https://www.tokyocitykeiba.com/race/schedule/',ev=(opens,starts,endsAssumed)=>({mode:'event',title:'大井競馬（想定日程）',opens,starts,endsAssumed,audience:'horse',url});
  if(md>=1228)return md===1228?ev(13.83,14.5,21.5):ev(10.33,11,18.5);
  if(md>=1222||md<=104)return null;
  if(dow<1||dow>5)return null;
  let week=Math.floor((day-(dow-1)*864e5-OOI_ANCHOR)/(7*864e5));
  return ((week%3)+3)%3===0?ev(13.83,14.5,21.5):null;
 }
 function resolve(c,t){let kind=typeof VenueModel!=='undefined'?VenueModel.kind(c):c.venueKind;if(!kind||kind==='cemetery')return {mode:'none',basis:'対象外',occupancy:0};let force=t.venueEvent||'auto';if(force!=='auto')return {mode:force,basis:'手動設定',occupancy:force==='none'?0:1};
 let h=t.hf??t.h,ds=date(t),name=c.name||'',events=(typeof MAP_DATA!=='undefined'?MAP_DATA.venueSchedules?.events:[])||[],matches=events.filter(e=>e.venue===name&&e.date===ds).sort((a,b)=>a.opens-b.opens);
 // Live crowd lasts from start to at least 2h45m, or until 45 minutes before an all-day event closes.
 const shape=(e,basis)=>{let ends=e.endsAssumed??e.ends,liveEnd=Math.max(e.starts+2.75,ends-.75);if(h<e.opens||h>=ends)return {mode:'none',basis,event:basis==='公式予定'?e:undefined,phase:h<e.opens?(basis==='公式予定'?'開場前':'開場前の想定'):(basis==='公式予定'?'終了見込後':'終了後の想定'),occupancy:0,estimated:basis!=='公式予定'};
  let stage=h<e.starts?'pre':h<liveEnd?'live':'post',occupancy=stage==='pre'?Math.min(.85,.25+.6*(h-e.opens)/Math.max(.25,e.starts-e.opens)):stage==='live'?1:.3,audience=e.audience||(e.mode==='concert'?'rock':kind==='racecourse'?'horse':'amateur');
  return {mode:e.mode,basis,event:basis==='公式予定'?e:undefined,audience,stage,phase:basis==='公式予定'?{pre:'入場中',live:'開催時間帯',post:'終了・退場見込'}[stage]:{pre:'入場中の想定',live:'開催の想定',post:'退場の想定'}[stage],occupancy,estimated:basis!=='公式予定'}};
 if(matches.length){let entry=matches.find(e=>h>=e.opens&&h<e.endsAssumed)||matches.find(e=>h<e.opens)||matches.at(-1);return shape(entry,'公式予定')}
 if(name==='大井競馬場'&&ds>='2026-10-01'&&ds<='2026-12-31')return {mode:'none',basis:'公式競馬日程',phase:'競馬開催日以外',occupancy:0,url:'https://www.tokyocitykeiba.com/race/schedule/'};
 if(name==='大井競馬場'&&ds>='2027-01-01'){let e=ooiRule(t);return e?shape(e,'想定日程'):{mode:'none',basis:'想定日程',phase:'想定日程では非開催',occupancy:0,estimated:true,url:'https://www.tokyocitykeiba.com/race/schedule/'}}
 // One venue/date receives one stable modeled event (VenueAudience), not a fresh dice roll on every click.
 if(c.closedFrom&&ds>=c.closedFrom&&(!c.closedUntil||ds<=c.closedUntil))return {mode:'none',basis:'公式案内',phase:c.closureNote||'休業期間',occupancy:0};
 let planned=typeof VenueAudience!=='undefined'?VenueAudience.plan(name,kind,t):null;
 return planned?shape(planned,'自動推定'):{mode:'none',basis:'自動推定',phase:'通常利用の想定',occupancy:0,estimated:true};
 }
 return {resolve,date,ooiRule};
})();
if(typeof module!=='undefined')module.exports=VenueSchedule;
