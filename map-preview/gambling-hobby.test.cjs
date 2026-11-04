const test=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),vm=require('vm');
const html=fs.readFileSync('dist/map-preview.html','utf8'),ctx=vm.createContext({console});vm.runInContext(html.slice(html.indexOf('// ===== 統計データ'),html.indexOf("'use strict';\nconst el=id")),ctx);const run=s=>vm.runInContext(s,ctx);
run(`for(let f of MAP_DATA.regions){f.density=censusMass(f.id)/f.area;f.residentialDensity=censusMass(f.id)/(MAP_DATA.zoning.residentialAreaKm2[f.id]||f.area)}`);
// Draw the original engine with a fixed gambling sub-hobby.
const draw=(o,n)=>run(`(()=>{const o=${JSON.stringify(o)},out=[];for(let i=0;i<${n};i++){const pref=PREFS.find(p=>p.n==='東京都'),muni=pref.munis[0],t={y:2026,mo:10,d:o.d,dow:o.dow,h:Math.floor(o.h),hf:o.h,mi:0,rand:true};
 const P={pref,muni,urb:'metro',age:o.age,sex:'m',t};P.birth=birthOf(P.age,t);P.g=gradeIndex(P.birth,t);P.occ={label:'会社員',group:'adult',cat:'事務',tag:'office',p:1};P.hb={preg:0,pp:-1,leave:false,bed:null};
 P.household={i:0,mar:'single'};P.familyContext={ownChild:false,youngest:null,children:[],awayChildren:[],grandchild:false,members:[]};P.hobbies=[{i:30,detail:o.detail,detailP:1}];
 out.push(situation(P,t).text);}return out})()`);
const KIND={keiba:/馬券|競馬|重賞|あの馬/,kyotei:/競艇|舟券|ボートレース|モーター/,hall:/パチンコ店|パチスロ|ドル箱|景品交換所/};
test('gambling sub-hobbies include horse and boat racing',()=>{
 const names=run(`PROFILE_HOBBY_DETAILS[30].map(x=>x[0])`);
 for(const n of ['パチンコ','パチスロ','競馬','競艇'])assert.ok(names.includes(n),n);
});
test("gambling scenes follow the person's sub-hobby",()=>{
 for(const [detail,own] of [['競馬','keiba'],['競艇','kyotei'],['パチンコ','hall']]){
  const xs=[...draw({detail,age:45,dow:0,d:25,h:14},1500),...draw({detail,age:45,dow:3,d:21,h:20},1500)];
  for(const [k,re] of Object.entries(KIND))if(k!==own)assert.equal(xs.filter(x=>re.test(x)).length,0,detail+' got '+k+': '+xs.find(x=>re.test(x)));
  assert.ok(xs.some(x=>KIND[own].test(x)),detail+' never showed its own scene');
 }
});
test('horse racing scenes stay on weekends and holidays',()=>{
 const xs=draw({detail:'競馬',age:45,dow:3,d:21,h:14},2000);
 assert.equal(xs.filter(x=>/馬券|競馬場|場外馬券/.test(x)).length,0);
});
