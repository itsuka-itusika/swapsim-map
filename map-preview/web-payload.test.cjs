const fs=require('node:fs'),vm=require('node:vm'),test=require('node:test'),assert=require('node:assert/strict');
const source=JSON.parse(fs.readFileSync('stats/profiles.json','utf8'));
const engine=fs.readFileSync('dist/assets/engine.js','utf8');
const web=JSON.parse(engine.match(/const PROFILE_DATA=(.*);\n/)[1]);
const keep=key=>key==='00000'||key==='13000'||/^131(0[1-9]|1[0-9]|2[0-3])$/.test(key);
function verifyRegions(original,actual){assert.deepEqual(actual,Object.fromEntries(Object.entries(original).filter(([key])=>keep(key))));}
test('published profile data preserves Tokyo and national statistics exactly',()=>{
 for(const key of ['family','familyExact','children','singleParentChildren','singleParentTotals','regions'])verifyRegions(source[key],web[key]);
 for(const key of Object.keys(source.childCountMeans))verifyRegions(source.childCountMeans[key],web.childCountMeans[key]);
 for(const key of Object.keys(source.siblingsOnly))verifyRegions(source.siblingsOnly[key],web.siblingsOnly[key]);
 assert.deepEqual(web.hobby,source.hobby);
 assert.ok(Buffer.byteLength(JSON.stringify(web))<Buffer.byteLength(JSON.stringify(source))*.4);
});
test('published assets generate people in every ward',()=>{
 const data=fs.readFileSync('dist/assets/map-data.js','utf8'),app=fs.readFileSync('dist/assets/map-app.js','utf8');
 const ctx=vm.createContext({console});vm.runInContext(engine+'\n'+data+'\n'+app.slice(0,app.indexOf("'use strict';\nconst el=id")),ctx);
 const n=vm.runInContext(`(()=>{GreenModel.configure(MAP_DATA.greenZones);LandModel.configure(MAP_DATA.waters,MAP_DATA.landZones);let count=0;const t={y:2026,mo:10,d:28,dow:3,h:14,hf:14,mi:0,rand:false};for(const region of MAP_DATA.regions){for(let i=0;i<8;i++){const P=mapPerson({role:'general',label:'住宅内・近隣の滞在者',resident:true,region,min:0,max:99,female:.5,n:100,roleP:1},t);if(!P.surname||!P.sit||!P.household)throw Error(region.name);count++}}return count})()`,ctx);
 assert.equal(n,184);
});
test('published map data keeps land estimates of the full build',()=>{
 const html=fs.readFileSync('dist/map-preview.html','utf8'),data=fs.readFileSync('dist/assets/map-data.js','utf8'),app=fs.readFileSync('dist/assets/map-app.js','utf8');
 const full=vm.createContext({console}),web=vm.createContext({console});
 vm.runInContext(html.slice(html.indexOf('// ===== 統計データ'),html.indexOf("'use strict';\nconst el=id")),full);
 vm.runInContext(engine+'\n'+data+'\n'+app.slice(0,app.indexOf("'use strict';\nconst el=id")),web);
 assert.ok(vm.runInContext('MAP_DATA.waters.length',web)<vm.runInContext('MAP_DATA.waters.length',full));
 const probe=`(()=>{const c=LandProfile.configure(MAP_DATA),out=[];for(const a of MAP_DATA.areas)for(const r of [100,500]){const p=LandProfile.create(c,a.xy,r);out.push({name:a.name,r,weights:p.weights,center:p.classify(a.xy)?.type??null})}return JSON.stringify(out)})()`;
 const a=JSON.parse(vm.runInContext(probe,full)),b=JSON.parse(vm.runInContext(probe,web));
 assert.equal(b.length,a.length);
 a.forEach((x,i)=>{const y=b[i];assert.equal(y.center,x.center,x.name);for(const k of new Set([...Object.keys(x.weights),...Object.keys(y.weights)]))assert.ok(Math.abs((x.weights[k]||0)-(y.weights[k]||0))<=Math.PI*x.r*x.r*.002,x.name+' '+x.r+' '+k)});
});
