const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const html=fs.readFileSync('dist/map-preview.html','utf8'),ctx=vm.createContext({console});vm.runInContext(html.slice(html.indexOf('// ===== 統計データ'),html.indexOf("'use strict';\nconst el=id")),ctx);const run=s=>vm.runInContext(s,ctx);
run(`for(let f of MAP_DATA.regions){f.density=censusMass(f.id)/f.area;f.residentialDensity=censusMass(f.id)/(MAP_DATA.zoning.residentialAreaKm2[f.id]||f.area)}var envContext=LandProfile.configure(MAP_DATA);
var at=(name,xy,y,mo,d,dow,h,holiday=false)=>{let f=MAP_DATA.facilities.find(f=>f.kind==='university'&&f.name===name&&MapModel.distance(f.xy,xy)<50),t={y,mo,d,dow,h,hf:h+.2,mi:12,rand:false,holiday},parts=LandEstimator.estimate(LandProfile.create(envContext,f.xy,300),t),tot=parts.reduce((s,c)=>s+c.n,0),fest=parts.filter(c=>c.festival);
 return {visitors:fest.filter(c=>c.role==='festival_visitor').reduce((s,c)=>s+c.n,0)/tot,students:fest.filter(c=>c.role==='student').reduce((s,c)=>s+c.n,0)/tot,people:fest.filter(c=>c.n>0).flatMap(c=>Array.from({length:20},()=>{let P=mapPerson({...c,roleP:.01},t);return [c.role,P.age,P.occ.label,P.place,P.sit.stateLabel,P.sit.text]}))}};
var WASEDA=['早稲田大学',[139.7228,35.7092]];`);
test('every listed festival matches a campus in the map data',()=>{
 assert.deepEqual(Array.from(run(`CampusFestival.LIST.filter(x=>!MAP_DATA.facilities.some(f=>f.kind==='university'&&CampusFestival.festivals(f).includes(x))).map(x=>x[0])`)),[]);
});
test('早稲田祭 fills the campus with visitors and students running it; an ordinary Saturday has neither',()=>{
 const r=JSON.parse(run(`JSON.stringify({fest:at(...WASEDA,2026,11,7,6,13),plain:at(...WASEDA,2026,11,14,6,13),prep:at(...WASEDA,2026,11,6,5,19),y2027:at(...WASEDA,2027,11,6,6,13)})`));
 assert.ok(r.fest.visitors>.3,String(r.fest.visitors));assert.ok(r.fest.students>.03);
 assert.ok(r.fest.people.every(p=>p[3]==='早稲田大学'));
 assert.ok(r.fest.people.filter(p=>p[0]==='festival_visitor').every(p=>p[4]==='早稲田祭の来場者'));
 assert.ok(r.fest.people.filter(p=>p[0]==='student').every(p=>/^大学|大学院/.test(p[2])&&p[4]==='早稲田祭に参加している学生'));
 assert.equal(r.plain.visitors+r.plain.students,0);
 assert.equal(r.prep.visitors,0);assert.ok(r.prep.students>0);assert.ok(r.prep.people.every(p=>p[4]==='早稲田祭の準備をしている学生'));
 assert.ok(r.y2027.visitors>.3,'2027 keeps the first weekend of November');
});
test('festivals close in the evening and 駒場祭 runs on the holiday',()=>{
 const r=JSON.parse(run(`JSON.stringify({night:at(...WASEDA,2026,11,7,6,21),komaba:at('東京大学',[139.6848,35.6598],2026,11,23,1,15,true)})`));
 assert.equal(r.night.visitors+r.night.students,0);assert.ok(r.komaba.visitors>.3);
});
