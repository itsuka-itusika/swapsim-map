/* Historical snapshot + deterministic per-venue/day fallback; public events only. */
const VenueSchedule=(()=>{
 const pad=n=>String(n).padStart(2,'0'),date=t=>`${t.y}-${pad(t.mo)}-${pad(t.d)}`;
 function number(key){let h=2166136261;for(let i=0;i<key.length;i++)h=Math.imul(h^key.charCodeAt(i),16777619);return (h>>>0)/4294967296}
 function resolve(c,t){let kind=typeof VenueModel!=='undefined'?VenueModel.kind(c):c.venueKind;if(!kind||kind==='cemetery')return {mode:'none',basis:'対象外',occupancy:0};let force=t.venueEvent||'auto';if(force!=='auto')return {mode:force,basis:'手動設定',occupancy:force==='none'?0:1};
 let h=t.hf??t.h,ds=date(t),name=c.name||'',events=(typeof MAP_DATA!=='undefined'?MAP_DATA.venueSchedules?.events:[])||[],matches=events.filter(e=>e.venue===name&&e.date===ds).sort((a,b)=>a.opens-b.opens);
 if(matches.length){let e=matches.find(e=>h>=e.opens&&h<e.endsAssumed),entry=e||matches.find(e=>h<e.opens)||matches.at(-1);if(!e)return {mode:'none',basis:'公式予定',event:entry,phase:h<entry.opens?'開場前':'終了見込後',occupancy:0};let last=entry.starts+2.75,occupancy=h<entry.starts?Math.min(.85,.25+.6*(h-entry.opens)/Math.max(.25,entry.starts-entry.opens)):h<last?1:.3;return {mode:entry.mode,basis:'公式予定',event:entry,phase:h<entry.starts?'入場中':h<last?'開催時間帯':'終了・退場見込',occupancy};}
 if(name==='大井競馬場'&&ds>='2026-10-01'&&ds<='2026-12-31')return {mode:'none',basis:'公式競馬日程',phase:'競馬開催日以外',occupancy:0,url:'https://www.tokyocitykeiba.com/race/schedule/'};
 // One venue/date receives one stable modeled schedule, not a fresh dice roll on every click.
 let weekend=t.dow===0||t.dow===6||t.holiday,p=kind==='racecourse'?(weekend?.28:.08):kind==='dome'?(weekend?.64:.32):kind==='arena'?(weekend?.5:.18):(weekend?.34:.10),v=number(name+'/'+ds+'/occurs'),chosen=v<p,kindRoll=number(name+'/'+ds+'/type'),mode=kind==='racecourse'?'event':kind==='arena'||kind==='dome'?(kindRoll<.62?'concert':'event'):'event',start=weekend?14:18,opens=start-1,end=start+3.5,active=chosen&&h>=opens&&h<end;
 return {mode:active?mode:'none',basis:'自動推定',phase:chosen?(h<opens?'開場前の想定':h>=end?'終了後の想定':'開催の想定'):'通常利用の想定',occupancy:active?(h<start?.55:h<start+2.75?1:.3):0,estimated:true};
 }
 return {resolve,date};
})();
if(typeof module!=='undefined')module.exports=VenueSchedule;
