/* Current Tokyo weather follows the original engine's validation and climate fallback.
   Live observations are fetched for the Tokyo point and each of the 23 wards in one request; a person drawn in a ward
   sees that ward's weather (inWard). Estimates (no observation, or a specified time) stay one value for all of Tokyo. */
const MapWeather=(()=>{
 const key='swapsim-map-tokyo-weather-v1',ttl=30*60e3,timeout=6000;let pending=null,attempt=0,wards={},points=null;
 const tokyoIndex=()=>PREFS.findIndex(p=>p.n==='東京都');
 // A point inside each ward: the area centroid of its largest polygon ring.
 function wardPoints(){if(points)return points;points=[];
  for(const r of (typeof MAP_DATA!=='undefined'&&MAP_DATA.regions)||[]){if(!/^131(0[1-9]|1[0-9]|2[0-3])$/.test(r.id))continue;
   const g=r.geometry,rings=g?.type==='Polygon'?[g.coordinates[0]]:g?.type==='MultiPolygon'?g.coordinates.map(p=>p[0]):[];
   let best=null,bestA=0;for(const ring of rings){let a=0,x=0,y=0;for(let i=0;i<ring.length-1;i++){const [x0,y0]=ring[i],[x1,y1]=ring[i+1],k=x0*y1-x1*y0;a+=k;x+=(x0+x1)*k;y+=(y0+y1)*k}if(Math.abs(a)>bestA){bestA=Math.abs(a);best=[x/(3*a),y/(3*a)]}}
   if(best)points.push({code:r.id,lat:+best[1].toFixed(3),lon:+best[0].toFixed(3)})}
  return points}
 function obsOf(o){const c=o?.current;return {c:c?Object.fromEntries(['temperature_2m','precipitation','snowfall','weather_code','wind_gusts_10m'].map(k=>[k,c[k]])):null,time:c&&typeof c.time==='string'?Date.parse(c.time+'+09:00'):NaN,day:o?.daily?.time?.[0]||null,x:o?.daily?.temperature_2m_max?.[0]??null,n:o?.daily?.temperature_2m_min?.[0]??null}}
 function accept(data){let i=tokyoIndex();if(i<0||!data||!Number.isFinite(data.at)||data.at>Date.now()+60000||Date.now()-data.at>ttl||!validWeatherObs(data.obs))return false;WX.at=data.at;WX.raw=Array(PREFS.length).fill(null);WX.byPref=Array(PREFS.length).fill(null);WX.raw[i]=data.obs;WX.byPref[i]=wxFromObs(data.obs);
  // Wards with a valid observation of their own; the others use the Tokyo point.
  wards={};for(const [code,obs] of Object.entries(data.wards||{}))if(/^131\d\d$/.test(code)&&validWeatherObs(obs))wards[code]=obs;return true}
 function status(){let obs=WX.raw?.[tokyoIndex()];return obs&&Date.now()-WX.at<WX_TTL&&validWeatherObs(obs)?'東京の実況':'季節から推定'}
 // Runs fn with the engine's Tokyo weather set to ward `code`'s live observation, then puts the Tokyo point back.
 function inWard(code,fn){const i=tokyoIndex(),obs=wards[code];if(i<0||!obs||!WX.raw||!WX.byPref||!validWeatherObs(obs))return fn();
  const raw=WX.raw[i],by=WX.byPref[i];WX.raw[i]=obs;WX.byPref[i]=wxFromObs(obs);try{return fn()}finally{WX.raw[i]=raw;WX.byPref[i]=by}}
 async function load(storage,fetcher=fetch){if(pending)return pending;try{if(status()!=='東京の実況'&&storage)accept(JSON.parse(storage.getItem(key)||'null'))}catch{}if(status()==='東京の実況'&&Date.now()-WX.at<ttl)return true;if(Date.now()-attempt<5*60e3)return false;attempt=Date.now();pending=(async()=>{const ctl=new AbortController(),timer=setTimeout(()=>ctl.abort(),timeout);try{
  // One request: the Tokyo point first, then the ward points (Open-Meteo answers a list in the same order).
  let tokyo=PREFS.find(p=>p.n==='東京都'),pts=wardPoints(),lat=[tokyo.ll[0],...pts.map(p=>p.lat)].join(','),lon=[tokyo.ll[1],...pts.map(p=>p.lon)].join(','),url='https://api.open-meteo.com/v1/forecast?latitude='+lat+'&longitude='+lon+'&current=temperature_2m,precipitation,snowfall,weather_code,wind_gusts_10m&daily=temperature_2m_max,temperature_2m_min&forecast_days=1&timezone=Asia%2FTokyo&wind_speed_unit=ms',r=await fetcher(url,{signal:ctl.signal});if(!r.ok)throw Error('weather unavailable');
  let o=await r.json(),list=Array.isArray(o)?o:[o],wardObs={};pts.forEach((p,k)=>{if(list[k+1])wardObs[p.code]=obsOf(list[k+1])});
  let data={at:Date.now(),obs:obsOf(list[0]),wards:wardObs};if(!accept(data))throw Error('invalid observation');try{storage?.setItem(key,JSON.stringify(data))}catch{}return true}catch{return false}finally{clearTimeout(timer);pending=null}})();return pending}
 return {accept,status,load,inWard,wardPoints,wards:()=>Object.keys(wards)};
})();
if(typeof module!=='undefined')module.exports=MapWeather;
