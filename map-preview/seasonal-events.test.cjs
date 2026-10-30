const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const html=fs.readFileSync('dist/map-preview.html','utf8'),ctx=vm.createContext({console});vm.runInContext(html.slice(html.indexOf('// ===== 統計データ'),html.indexOf("'use strict';\nconst el=id")),ctx);let run=s=>vm.runInContext(s,ctx);
run(`for(let f of MAP_DATA.regions){f.density=censusMass(f.id)/f.area;f.residentialDensity=censusMass(f.id)/(MAP_DATA.zoning.residentialAreaKm2[f.id]||f.area)}const envContext=LandProfile.configure(MAP_DATA);`);
const T=(mo,d,dow,h)=>`{y:2026,mo:${mo},d:${d},dow:${dow},h:${h},hf:${h},mi:0,rand:true}`;
// Ages and scenes of people drawn within 50m of a point.
const draw=(xy,t,n=300)=>run(`(()=>{let t=${t},p=LandProfile.create(envContext,${JSON.stringify(xy)},50),parts=LandEstimator.estimate(p,t),out=[];for(let i=0;i<${n};i++){let c=MapModel.pick(parts);if(!c)break;let P=mapPerson(c,t);out.push({age:P.age,text:P.sit.text,event:P.sit.source==='seasonal-event'})}return JSON.stringify(out)})()`);
const meiji=[139.6993,35.6764],aoyama=[139.7232,35.6672];
test('Equinox days match the holiday table',()=>{assert.equal(run('SeasonalEvents.equinox(2026,3)'),20);assert.equal(run('SeasonalEvents.equinox(2026,9)'),23);assert.equal(run(`SeasonalEvents.higan(${T(9,26,6,11)})`),'autumn');assert.equal(run(`SeasonalEvents.higan(${T(9,27,0,11)})`),null)});
test('七五三 children at a shrine only in season and by day',()=>{let nov=JSON.parse(draw(meiji,T(11,15,0,11))),kids=nov.filter(x=>x.event&&x.age<10);assert.ok(kids.length>10,'too few 七五三 children: '+kids.length);assert.ok(kids.every(x=>[3,5,7].includes(x.age)));
 for(let t of [T(7,12,0,11),T(11,15,0,20)])assert.ok(!JSON.parse(draw(meiji,t)).some(x=>x.event))});
test('彼岸 grave visits fill the equinox week only',()=>{let higan=JSON.parse(draw(aoyama,T(9,23,3,11))).filter(x=>x.event);assert.ok(higan.length>30);assert.ok(higan.every(x=>/彼岸/.test(x.text)));assert.ok(!JSON.parse(draw(aoyama,T(9,5,6,11))).some(x=>x.event))});
