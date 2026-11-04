const test=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),vm=require('vm');
const html=fs.readFileSync('dist/map-preview.html','utf8'),ctx=vm.createContext({console});vm.runInContext(html.slice(html.indexOf('// ===== 統計データ'),html.indexOf("'use strict';\nconst el=id")),ctx);const run=s=>vm.runInContext(s,ctx);
run(`GreenModel.configure(MAP_DATA.greenZones);LandModel.configure(MAP_DATA.waters,MAP_DATA.landZones);for(let f of MAP_DATA.regions){f.density=censusMass(f.id)/f.area;f.residentialDensity=censusMass(f.id)/(MAP_DATA.zoning.residentialAreaKm2[f.id]||f.area)}var envContext=LandProfile.configure(MAP_DATA);`);
test('fashion streets have nail salon staff who do nail work',()=>{
 const r=JSON.parse(run(`(()=>{let a=MAP_DATA.areas.find(x=>x.name==='原宿・表参道'),p=LandProfile.create(envContext,a.xy,300),t={y:2026,mo:10,d:31,dow:6,h:14,hf:14.2,mi:12,rand:false},parts=LandEstimator.estimate(p,t),tot=parts.reduce((s,c)=>s+c.n,0),nail=parts.find(c=>c.role==='urban_nailist'),hair=parts.find(c=>c.role==='urban_hairdresser'),out=[];
  for(let i=0;i<60;i++){let P=mapPerson({...nail,roleP:nail.n/tot},t);out.push([P.occ.label,P.sex,P.age,P.sit.text])}
  return JSON.stringify({ratio:nail.n/hair.n,out})})()`));
 assert.ok(r.ratio>.2&&r.ratio<.5,'ratio '+r.ratio);
 assert.ok(r.out.every(([l])=>l==='ネイリスト'));
 assert.ok(r.out.every(([,,a])=>a>=20&&a<=44));
 assert.ok(r.out.filter(([,s])=>s==='f').length>=50);
 const nailWork=/爪|ネイル|ジェル|甘皮|ストーン|指先|ニッパー|色見本|チップ|手のマッサージ/;
 assert.ok(r.out.filter(x=>nailWork.test(x[3])).length>=30,r.out.map(x=>x[3]).join('\n'));
 assert.ok(!r.out.some(x=>/髪|シャンプー|パーマ|カラー剤|ひげ/.test(x[3])));
});
test('residents can be nail technicians, mostly women',()=>{
 const j=JSON.parse(run(`JSON.stringify(JOB_OBJS.find(j=>j.n==='ネイリスト'))`));
 assert.ok(j);assert.equal(j.tag,'salon');assert.ok(j.f>j.m*10&&j.m>0);
});
