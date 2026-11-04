const test=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),vm=require('vm');
const html=fs.readFileSync('dist/map-preview.html','utf8'),ctx=vm.createContext({console});vm.runInContext(html.slice(html.indexOf('// ===== 統計データ'),html.indexOf("'use strict';\nconst el=id")),ctx);const run=s=>vm.runInContext(s,ctx);
run(`for(let f of MAP_DATA.regions){f.density=censusMass(f.id)/f.area;f.residentialDensity=censusMass(f.id)/(MAP_DATA.zoning.residentialAreaKm2[f.id]||f.area)}`);
// Draw the original engine with a fixed job.
const draw=(o,n)=>JSON.parse(run(`(()=>{const o=${JSON.stringify(o)},out=[];const job=JOB_OBJS.find(j=>j.n===o.job);for(let i=0;i<${n};i++){const pref=PREFS.find(p=>p.n==='東京都'),muni=pref.munis[0],t={y:2026,mo:11,d:o.d,dow:o.dow,h:Math.floor(o.h),hf:o.h,mi:0,rand:true};
 const P={pref,muni,urb:'metro',age:o.age||35,sex:o.sex||'m',t};P.birth=birthOf(P.age,t);P.g=gradeIndex(P.birth,t);P.occ={label:job.n,group:'adult',cat:job.cat,tag:job.tag,job,kind:'employed',p:1};P.hb={preg:0,pp:-1,leave:false,bed:null};
 P.household={i:0,mar:'single'};P.familyContext={ownChild:false,youngest:null,children:[],awayChildren:[],grandchild:false,members:[]};
 out.push(situation(P,t).text);}return JSON.stringify(out)})()`));
const OVER=/終電コース|栄養ドリンク|帰り支度を切り出せず|冷めたコンビニ弁当|ちょっといい？|有給休暇の申請画面|昼休みを諦め|「至急」|明日の朝までに|仕事のチャット|上司からのメール|明日からの仕事を思って|スーツのままソファ|「行きたくない」|職場からの電話/;
test('ramen shop staff exist and do ramen shop work',()=>{
 const j=JSON.parse(run(`JSON.stringify(JOB_OBJS.find(j=>j.n==='ラーメン屋の店員'))`));
 assert.ok(j);assert.equal(j.tag,'food');assert.equal(run(`JobLabels.names['ラーメン屋の店員']`),'ラーメン店員');
 const xs=draw({job:'ラーメン屋の店員',d:4,dow:3,h:12.5},800);
 assert.ok(xs.some(x=>/食券|湯切り|替え玉|丼|行列/.test(x)),'no ramen scene');
 assert.ok(!xs.some(x=>/おしぼりを配って|座敷に鍋|年越しそば/.test(x)));
});
test('overworked office scenes appear late on weekdays and on days off',()=>{
 const late=draw({job:'一般事務',d:4,dow:3,h:21.5},1500).filter(x=>OVER.test(x)).length;
 assert.ok(late>15,'late '+late);
 const sunday=draw({job:'システムエンジニア',d:8,dow:0,h:18},1500).filter(x=>OVER.test(x)).length;
 assert.ok(sunday>5,'sunday '+sunday);
});
test('overworked scenes stay away from shop clerks and ramen staff',()=>{
 for(const job of ['スーパーの店員','ラーメン屋の店員'])for(const [d,dow,h] of [[4,3,21.5],[8,0,18]])
  assert.equal(draw({job,d,dow,h},800).filter(x=>OVER.test(x)).length,0,job);
});
