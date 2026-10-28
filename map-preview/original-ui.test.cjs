const fs=require('node:fs'),vm=require('node:vm'),test=require('node:test'),assert=require('node:assert/strict');
const html=fs.readFileSync('dist/map-preview.html','utf8'),ctx=vm.createContext({console});vm.runInContext(html.slice(html.indexOf('// ===== 統計データ'),html.indexOf("'use strict';\nconst el=id")),ctx);const run=s=>vm.runInContext(s,ctx);
run(`GreenModel.configure(MAP_DATA.greenZones);LandModel.configure(MAP_DATA.waters,MAP_DATA.landZones);`);
test('notification markup, seal styles and render function are copied from original source at build time',()=>{const source=fs.readFileSync('shell.html','utf8'),app=fs.readFileSync('app.js','utf8');let start=source.indexOf('<article class="notice"'),end=source.indexOf('</article>',start)+10;assert.ok(html.includes(source.slice(start,end)));let css=source.slice(source.indexOf('.seal {'),source.indexOf('.mode {',source.indexOf('.seal {')));assert.ok(html.includes(css));let renderer=app.slice(app.indexOf('function renderCardFinal(P)'),app.indexOf('// ---- 誰かと誰か',app.indexOf('function renderCardFinal(P)')));assert.ok(html.includes(renderer));assert.ok(html.includes('function scrollToNotice(instant)'));});
test('campus pupils retain original school-year labels and eligible birth cohorts across March and April',()=>{let count=run(`(()=>{let count=0;for(let kind of ['primary','middle','high','university','college']){let f=MAP_DATA.facilities.find(f=>f.kind===kind),region=MAP_DATA.regions.find(r=>r.id===f.code);for(let mo of [3,4,10])for(let rep=0;rep<25;rep++){let t={y:2026,mo,d:20,dow:2,h:13,hf:13,mi:0},c=MapModel.roles(f,t).find(c=>c.role==='student'),P=mapPerson({...c,region,facility:f,roleP:.1},t),limits={primary:[1,6],middle:[7,9],high:[10,12],university:[13,21],college:[13,21]}[kind];if(P.g<limits[0]||P.g>limits[1])throw Error('ineligible birth cohort '+kind);if(!/年生|修士|博士課程/.test(P.occ.label))throw Error('school year omitted: '+P.occ.label);if(kind==='university'&&!/大学[1-4]年生|大学院/.test(P.occ.label))throw Error(P.occ.label);count++}}return count})()`);assert.equal(count,375)});

test('map layout follows the requested order and removes editable time controls',()=>{
 const source=fs.readFileSync('map-preview/index.html','utf8');
 const ids=['map','query','radii','clock','draw','opts','person','crowd'];
 const positions=ids.map(id=>source.indexOf(`id="${id}"`));
 assert.ok(positions.every((p,i)=>p>=0&&(!i||p>positions[i-1])));
 assert.ok(source.includes('Mass Body-Swap Simulator'));
 assert.ok(!source.includes('datetime-local'));
});

test('single and pair notification renderers and share text work for map-generated people',()=>{
 run(`globalThis.window={};globalThis.document={dispatchEvent(){},createElement(){const fields=new Map();return {innerHTML:'',querySelector(id){if(!fields.has(id))fields.set(id,{innerHTML:'',textContent:'',hidden:false,removeAttribute(){}});return fields.get(id)}}}};globalThis.CustomEvent=function(){};`);
 const result=run(`(()=>{const f=MAP_DATA.facilities.find(f=>f.kind==='station'),region=MAP_DATA.regions.find(r=>r.id===f.code),t={y:2026,mo:10,d:28,dow:3,h:12,hf:12,mi:0,rand:false},c={...MapModel.roles(f,t)[0],region,facility:f,roleP:.1},A=mapPerson(c,t),B=mapPerson(c,t);A.serial=1;const R={kind:'pair',A,B,t,serial:2,gap:pairGap(A,B)};MapNotice.html(A);MapNotice.html(R);return [MapNotice.text(A),MapNotice.text(R)]})()`);
 assert.ok(result[0].includes('あなたは'));
 assert.ok(result[1].includes('入れ替わりました'));
});

test('map filters preserve requested sex and age and both pair participants use local components',()=>{
 const source=fs.readFileSync('map-preview/app.js','utf8');
 run(`globalThis.el=id=>({innerHTML:'',textContent:'',setAttribute(){}});globalThis.storage=null;globalThis.parts=[];`);
 run(source.slice(source.indexOf('let issuedCount='),source.indexOf("el('test').onclick")));
 const result=run(`(()=>{const f=MAP_DATA.facilities.find(f=>f.kind==='station'),region=MAP_DATA.regions.find(r=>r.id===f.code),t={y:2026,mo:10,d:28,dow:3,h:12,hf:12,mi:0,rand:false};parts=MapModel.roles(f,t).map(c=>({...c,region,facility:f,n:100}));options.sex='f';options.dec=[2,3];options.pair=true;for(let i=0;i<20;i++){const R=sampleResult(t,true);if(R.A.sex!=='f'||R.A.age<20||R.A.age>=40)throw Error('filter mismatch');if(R.A.pref!==region.pref&&R.A.pref.n!=='東京都')throw Error('outside Tokyo');if(R.A.t!==R.B.t)throw Error('different instant')}return true})()`);
 assert.equal(result,true);
});

test('residential occupants cannot inherit fishing and other distant leisure venues',()=>{
 assert.equal(run(`TimeSituations.homeCompatible('川辺で、釣り糸の先をじっと見つめているところでした')`),false);
 assert.equal(run(`TimeSituations.homeCompatible('釣りの雑誌を自宅で読んでいるところでした')`),true);
 const count=run(`(()=>{const f=MAP_DATA.regions.find(r=>r.name==='目黒区')||MAP_DATA.regions[0],t={y:2026,mo:10,d:28,dow:3,h:10,hf:10.32,mi:19,rand:false};let checked=0;for(let i=0;i<300;i++){const P=mapPerson({role:'general',label:'住宅内・近隣の滞在者',resident:true,region:f,min:0,max:99,female:.5,n:100,roleP:1},t);if(!TimeSituations.homeCompatible(P.sit.text))throw Error(P.sit.text);checked++}return checked})()`);
 assert.equal(count,300);
});

test('named hotels, cultural facilities and fire stations have matching roles and scenes',()=>{
 const count=run(`(()=>{const t={y:2026,mo:10,d:28,dow:3,h:14,hf:14,mi:0,rand:false},region=MAP_DATA.regions[0];let count=0;for(const [tags,kind] of [[{tourism:'hotel',name:'試験ホテル'},'hotel'],[{tourism:'museum',name:'試験博物館'},'museum'],[{amenity:'theatre',name:'試験劇場'},'theatre'],[{amenity:'fire_station',name:'試験消防署'},'fire_station']]){let type=OSMProfile.classification(tags);let c={type:type[0],subtype:type[1],name:tags.name,tags,source:'OpenStreetMap',area:10000,areaM2:10000,region};if(PlacesModel.kind(c)!==kind)throw Error(kind);for(const role of PlacesModel.roles(c,t).filter(x=>x.w>0)){let p=mapPerson({...role,region,landType:c.type,landComponent:c,roleP:.1},t);if(p.place!==c.name||!p.sit.text)throw Error(role.role);count++}}return count})()`);
 assert.ok(count>=10);
});
