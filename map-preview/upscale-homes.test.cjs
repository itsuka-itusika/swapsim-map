const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const html=fs.readFileSync('dist/map-preview.html','utf8'),ctx=vm.createContext({console});vm.runInContext(html.slice(html.indexOf('// ===== 統計データ'),html.indexOf("'use strict';\nconst el=id")),ctx);let run=s=>vm.runInContext(s,ctx);
run(`for(let f of MAP_DATA.regions){f.density=censusMass(f.id)/f.area;f.residentialDensity=censusMass(f.id)/(MAP_DATA.zoning.residentialAreaKm2[f.id]||f.area)}const envContext=LandProfile.configure(MAP_DATA);`);
const T=(mo,d,dow,h)=>`{y:2026,mo:${mo},d:${d},dow:${dow},h:${h},hf:${h},mi:0,rand:true}`;
// Residents drawn around a point: place, occupation, age and scene.
const draw=(xy,t,n=600)=>JSON.parse(run(`(()=>{let t=${t},p=LandProfile.create(envContext,${JSON.stringify(xy)},100),parts=LandEstimator.estimate(p,t).filter(c=>c.resident),out=[];for(let i=0;i<${n};i++){let c=MapModel.pick(parts);if(!c)break;let P=mapPerson(c,t);out.push({place:P.place,occ:P.occ.label,age:P.age,text:P.sit.text,src:P.sit.source||''})}return JSON.stringify(out)})()`));
const rich=/医師|役員|経営|教授|弁護士/;
test('High-end districts have more doctors, executives and professors, and their own home scenes',()=>{let a=draw([139.6935,35.6602],T(11,4,3,21)),b=draw([139.6337,35.6466],T(11,4,3,21));
 const share=x=>x.filter(p=>p.age>=30&&p.age<65&&rich.test(p.occ)).length/x.filter(p=>p.age>=30&&p.age<65).length;
 assert.ok(share(a)>.15,'松濤 '+share(a));assert.ok(share(b)<.08,'ordinary '+share(b));assert.ok(a.every(p=>/^松濤/.test(p.place)));
 let sp=a.filter(p=>p.src==='upscale-home');assert.ok(sp.length>30);assert.ok(!b.some(p=>p.src==='upscale-home'));
 // Lifestyle lines go to those households only, not to residents in other jobs.
 for(const p of sp)assert.ok(p.age<18||rich.test(p.occ)||/専業主婦|専業主夫|主婦（年金|年金生活|家事手伝い/.test(p.occ),p.occ+' '+p.text);
 for(const p of sp.filter(p=>/役員会/.test(p.text)))assert.match(p.occ,/役員|経営/)});
test('Children in high-end districts get tutors and private music lessons',()=>{let a=draw([139.6935,35.6602],T(11,4,3,17),3000).filter(p=>p.age>=5&&p.age<18&&p.src==='upscale-home');
 assert.ok(a.some(p=>/家庭教師/.test(p.text)));assert.ok(a.some(p=>/ピアノ|バイオリン/.test(p.text)));for(const p of a.filter(p=>/中学受験/.test(p.text)))assert.ok(p.age>=10&&p.age<=12)});
