const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
// Live weather per ward: one Open-Meteo request for the Tokyo point and the 23 wards; estimates stay shared.
const html=fs.readFileSync('dist/map-preview.html','utf8'),src=html.slice(html.indexOf('// ===== 統計データ'),html.indexOf("'use strict';\nconst el=id"));
const fresh=()=>{const c=vm.createContext({console,AbortController,setTimeout,clearTimeout,Date});vm.runInContext(src,c);return s=>vm.runInContext(s,c)};
const stamp=()=>new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Tokyo',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(new Date()).replace(' ','T');
// The fake API answers every point clear and 18 degrees, except 世田谷区 (index of 13112) with rain at 15 degrees.
const loadWith=(run,mod='')=>run(`(async()=>{let stamp=${JSON.stringify(stamp())},urls=[];const pts=MapWeather.wardPoints(),seta=pts.findIndex(p=>p.code==='13112')+1;
 const one=(code,temp,pr,g)=>({current:{time:stamp,temperature_2m:temp,precipitation:pr,snowfall:0,weather_code:code,wind_gusts_10m:g},daily:{time:[stamp.slice(0,10)],temperature_2m_max:[temp+3],temperature_2m_min:[temp-3]}});
 let fetcher=async url=>{urls.push(url);let list=[one(1,18,0,3),...pts.map(()=>one(1,18,0,3))];list[seta]=one(63,15,1.2,4);${mod}return {ok:true,json:async()=>list}};
 let ok=await MapWeather.load(null,fetcher);return JSON.stringify({ok,urls,wards:MapWeather.wards().length})})()`);

test('each of the 23 wards gets a point inside it',()=>{const run=fresh();const pts=JSON.parse(run(`JSON.stringify(MapWeather.wardPoints())`)),regions=JSON.parse(run(`JSON.stringify(MAP_DATA.regions.filter(r=>/^131(0[1-9]|1[0-9]|2[0-3])$/.test(r.id)).map(r=>[r.id,r.bbox]))`));
 assert.equal(pts.length,23);for(const [id,[x0,y0,x1,y1]] of regions){const p=pts.find(p=>p.code===id);assert.ok(p,id);assert.ok(p.lon>=x0&&p.lon<=x1&&p.lat>=y0&&p.lat<=y1,id+' outside its bbox')}
 const inside=JSON.parse(run(`JSON.stringify(MapWeather.wardPoints().map(p=>{const f=MapModel.locate([p.lon,p.lat],MAP_DATA.regions);return [p.code,f&&f.id]}))`));for(const [code,found] of inside)assert.equal(found,code,code+' point falls in '+found)});

test('one request fetches the Tokyo point and every ward; a ward sees its own live weather and Tokyo is restored after',async()=>{const run=fresh();const r=JSON.parse(await loadWith(run));
 assert.equal(r.ok,true);assert.equal(r.urls.length,1);const q=new URL(r.urls[0]);assert.equal(q.searchParams.get('latitude').split(',').length,24);assert.equal(q.searchParams.get('longitude').split(',').length,24);assert.equal(r.wards,23);
 const x=JSON.parse(run(`(()=>{const pref=PREFS.find(p=>p.n==='東京都'),t={y:2026,mo:11,d:5,dow:4,h:14,hf:14,mi:0,rand:false};
  return JSON.stringify({tokyo:wxLabel(pref,t),seta:MapWeather.inWard('13112',()=>wxLabel(pref,t)),setaRain:MapWeather.inWard('13112',()=>wxOf(pref,t).rain),chiyoda:MapWeather.inWard('13101',()=>wxLabel(pref,t)),after:wxLabel(pref,t),afterRain:wxOf(pref,t).rain,unknown:MapWeather.inWard('99999',()=>wxLabel(pref,t)),
   simSeta:MapWeather.inWard('13112',()=>wxLabel(pref,{...t,rand:true})),simTokyo:wxLabel(pref,{...t,rand:true}),status:MapWeather.status()})})()`));
 assert.equal(x.tokyo,'晴れ 18度');assert.equal(x.seta,'雨 15度');assert.equal(x.setaRain,true);assert.equal(x.chiyoda,'晴れ 18度');
 assert.equal(x.after,'晴れ 18度');assert.equal(x.afterRain,false);assert.equal(x.unknown,'晴れ 18度');assert.equal(x.status,'東京の実況');
 assert.equal(x.simSeta,x.simTokyo,'estimates must stay shared across wards')});

test('a ward with a broken observation falls back to the Tokyo point',async()=>{const run=fresh();await loadWith(run,"list[seta]={current:{time:stamp,temperature_2m:15,precipitation:1,snowfall:0,weather_code:999,wind_gusts_10m:4}};");
 const x=JSON.parse(run(`(()=>{const pref=PREFS.find(p=>p.n==='東京都'),t={y:2026,mo:11,d:5,dow:4,h:14,hf:14,mi:0,rand:false};return JSON.stringify({wards:MapWeather.wards().length,seta:MapWeather.inWard('13112',()=>wxLabel(pref,t))})})()`));
 assert.equal(x.wards,22);assert.equal(x.seta,'晴れ 18度')});

test('people drawn in different wards carry their ward weather on the notice',async()=>{const run=fresh();run(`for(let f of MAP_DATA.regions){f.density=censusMass(f.id)/f.area;f.residentialDensity=censusMass(f.id)/(MAP_DATA.zoning.residentialAreaKm2[f.id]||f.area)}globalThis.envContext=LandProfile.configure(MAP_DATA);`);await loadWith(run);
 const x=JSON.parse(run(`(()=>{const t={y:2026,mo:11,d:5,dow:4,h:14,hf:14,mi:0,rand:false},draw=xy=>{let p=LandProfile.create(envContext,xy,200),parts=LandEstimator.estimate(p,t),out=new Set();for(let i=0;i<40;i++){let c=MapModel.pick(parts);if(!c)break;out.add(c.region.id+' '+mapPerson(c,t).wxText)}return [...out]};
  return JSON.stringify({seta:draw([139.6530,35.6460]),chiyoda:draw([139.7640,35.6812])})})()`));
 assert.ok(x.seta.length&&x.seta.every(s=>s==='13112 雨 15度'),JSON.stringify(x.seta));assert.ok(x.chiyoda.length&&x.chiyoda.every(s=>/ 晴れ 18度$/.test(s)),JSON.stringify(x.chiyoda))});
