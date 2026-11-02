const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const html=fs.readFileSync('dist/map-preview.html','utf8'),ctx=vm.createContext({console});vm.runInContext(html.slice(html.indexOf('// ===== 統計データ'),html.indexOf("'use strict';\nconst el=id")),ctx);const run=s=>vm.runInContext(s,ctx);
run(`for(let f of MAP_DATA.regions){f.density=censusMass(f.id)/f.area;f.residentialDensity=censusMass(f.id)/(MAP_DATA.zoning.residentialAreaKm2[f.id]||f.area)}var envContext=LandProfile.configure(MAP_DATA);
var T=(d,dow,h)=>({y:2026,mo:11,d,dow,h:Math.floor(h),hf:h,mi:Math.round(h%1*60),rand:false});
var showOn=(v,dow,want=true)=>{for(let d=1;d<=28;d++){let w=(d+6)%7;if(w===dow&&LiveHouseModel.showDay(v,T(d,w,12))===want)return d}return null};
var draw=(name,dow,h,n=80,want=true)=>{let v=MAP_DATA.specialPlaces.find(x=>x.name===name),d=showOn(v,dow,want),t=T(d,dow,h),parts=LandEstimator.estimate(LandProfile.create(envContext,v.xy,10),t),tot=parts.reduce((s,c)=>s+c.n,0);return {phase:LiveHouseModel.phase(v,t),people:Array.from({length:n},()=>{let c=MapModel.pick(parts),P=mapPerson({...c,roleP:c.n/tot},t);return [c.role,P.occ.label,P.age,P.sex,P.place,P.sit.text]})}};`);
test('live houses are their own places, not duplicated as theatres',()=>{
 const r=JSON.parse(run(`JSON.stringify({n:MAP_DATA.specialPlaces.filter(x=>x.placeKind==='livehouse').length,dup:MAP_DATA.specialPlaces.filter(x=>x.placeKind==='theatre'&&['AKB48劇場','EX THEATER ROPPONGI','WWW'].includes(x.name)).length})`));
 assert.ok(r.n>=20);assert.equal(r.dup,0);
});
test('a show night fills the hall with the audience; performers and staff work there',()=>{
 const r=JSON.parse(run(`JSON.stringify(draw('Zepp Shinjuku(TOKYO)',5,20))`));
 assert.equal(r.phase,'show');
 const guests=r.people.filter(p=>p[0]==='live_guest');assert.ok(guests.length>50,String(guests.length));
 assert.ok(guests.every(p=>p[4]==='Zepp Shinjuku(TOKYO)'&&p[1]!=='ミュージシャン'));
 assert.ok(r.people.filter(p=>/^live_(artist|staff)$/.test(p[0])).every(p=>['ミュージシャン','ライブハウスのスタッフ'].includes(p[1])));
});
test('rehearsal in the afternoon, nobody on a dark day, idols and jazz have their own people',()=>{
 const reh=JSON.parse(run(`JSON.stringify(draw('下北沢SHELTER',3,15))`));assert.equal(reh.phase,'setup');assert.ok(!reh.people.some(p=>p[0]==='live_guest'));assert.ok(reh.people.some(p=>/リハーサル|サウンドチェック|PA卓|照明|機材/.test(p[5])));
 const dark=JSON.parse(run(`(()=>{let v=MAP_DATA.specialPlaces.find(x=>x.name==='Zepp Haneda(TOKYO)'),d=showOn(v,2,false);return JSON.stringify(LiveHouseModel.roles(v,T(d,2,20)))})()`));assert.ok(dark.every(z=>z.w===0));
 const idol=JSON.parse(run(`JSON.stringify(draw('AKB48劇場',3,19.5))`));assert.equal(idol.phase,'show');
 for(const p of idol.people.filter(p=>p[1]==='アイドル')){assert.equal(p[3],'f');assert.ok(p[2]>=16&&p[2]<=25,String(p))}
 assert.ok(idol.people.filter(p=>p[0]==='live_guest').every(p=>/推しメン|ペンライト|コール/.test(p[5])));
 const jazz=JSON.parse(run(`JSON.stringify(draw('Blue Note Tokyo',6,20))`));
 assert.ok(jazz.people.filter(p=>p[0]==='live_guest').every(p=>p[2]>=20));assert.ok(!jazz.people.some(p=>/押し合い|ドリンクチケット|整理番号/.test(p[5])));
});
