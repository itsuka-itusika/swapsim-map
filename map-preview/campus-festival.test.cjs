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
test('school festivals: the whole school takes part, middle schools share the high school festival, visitors are families and friends',()=>{
 const r=JSON.parse(run(`(()=>{const at=(name,mo,d,dow,h)=>{let f=MAP_DATA.facilities.find(x=>x.name===name),t={y:2026,mo,d,dow,h:Math.floor(h),hf:h,mi:0,rand:false},parts=LandEstimator.estimate(LandProfile.create(envContext,f.xy,100),t),own=parts.filter(c=>c.facility===f||c.facility?.id===f.id);
  return {fest:own.filter(c=>c.schoolFestival&&!c.festivalPrep).reduce((s,c)=>s+c.n,0),prep:own.filter(c=>c.festivalPrep).reduce((s,c)=>s+c.n,0),plain:own.filter(c=>c.role==='student'&&!c.schoolFestival).reduce((s,c)=>s+c.n,0),
   people:own.filter(c=>c.schoolFestival&&c.n>0).flatMap(c=>Array.from({length:30},()=>{let P=mapPerson({...c,roleP:.01},t);return [c.role,P.age,P.occ.label,P.sit.stateLabel,P.sit.text]}))}};
  return JSON.stringify({high:at('開成高等学校',9,19,6,11),middle:at('開成中学校',9,19,6,11),prep:at('開成高等学校',9,18,5,16),plain:at('開成高等学校',9,26,6,11),matched:MAP_DATA.facilities.filter(f=>CampusFestival.schoolFestival(f)).length})})()`));
 assert.ok(r.matched>200,String(r.matched));
 assert.ok(r.high.fest>500&&r.middle.fest>500);assert.equal(r.plain.fest,0);assert.ok(r.prep.prep>0&&r.prep.fest===0);
 const pupils=[...r.high.people,...r.middle.people].filter(p=>p[0]==='student');assert.ok(pupils.length);
 assert.ok(r.high.people.filter(p=>p[0]==='student').every(p=>/^高校/.test(p[2])&&p[3]==='文化祭に参加している生徒'));
 assert.ok(r.middle.people.filter(p=>p[0]==='student').every(p=>/^中学/.test(p[2])));
 const visitors=[...r.high.people,...r.middle.people].filter(p=>p[0]==='school_festival_visitor');assert.ok(visitors.every(p=>p[3]==='開成の文化祭の来場者'));
 assert.ok(!visitors.some(p=>p[1]<=9&&/志望校/.test(p[4])));assert.ok(!r.middle.people.some(p=>p[0]==='school_festival_visitor'&&p[1]>=13&&p[1]<=15&&/志望校/.test(p[4])));
});
test('東京海洋大学: campus-specific classes at 品川 and 越中島, 海鷹祭 closing at 13:00 on its last day, and 海王祭 in May',()=>{
 const r=JSON.parse(run(`(()=>{const F=xy=>MAP_DATA.facilities.find(f=>f.name==='東京海洋大学'&&MapModel.distance(f.xy,xy)<50),SH=F([139.746881,35.626354]),EC=F([139.791765,35.667851]);
  const own=(f,k)=>TimeSituations.schoolPool({role:'student',facility:f},k,{})||[];
  const fest=(f,mo,d,dow,h,hol)=>{let t={y:2026,mo,d,dow,h:Math.floor(h),hf:h,mi:0,rand:false,holiday:hol},rows=CampusFestival.rows(f,t,{role:'student',w:1,n:1});return rows.filter(z=>z.role==='festival_visitor').reduce((s,z)=>s+z.w,0)};
  let shClass=[],ecClass=[];for(let i=0;i<40;i++){shClass.push(...own(SH,'college_class'));ecClass.push(...own(EC,'college_class'))}
  return JSON.stringify({radius:[SH.radius,EC.radius],shClass:[...new Set(shClass)],ecClass:[...new Set(ecClass)],kaiyo11:fest(SH,11,3,2,11,true),kaiyo15:fest(SH,11,3,2,15,true),kaiyo2:fest(SH,11,2,1,16,false),kaio:fest(EC,5,16,6,13,false),festOther:fest(EC,11,3,2,11,true)})})()`));
 assert.deepEqual(r.radius,[190,170]);
 assert.ok(r.shClass.some(x=>/魚|プランクトン|かまぼこ/.test(x))&&!r.shClass.some(x=>/海図|ディーゼル|六分儀/.test(x)));
 assert.ok(r.ecClass.some(x=>/海図|ディーゼル|六分儀/.test(x))&&!r.ecClass.some(x=>/プランクトン|かまぼこ/.test(x)));
 assert.ok(r.kaiyo11>0&&r.kaiyo2>0);assert.equal(r.kaiyo15,0);assert.ok(r.kaio>0);assert.equal(r.festOther,0);
});
