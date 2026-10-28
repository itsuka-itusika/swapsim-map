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

test('named hotel node inside generic building appears in local population and person location',()=>{
 const result=run(`(()=>{let p=[139.7006,35.6595],t={y:2026,mo:10,d:28,dow:3,h:14,hf:14,mi:0,rand:false},box=MapSpatial.box(p,35),ring=[[box[0],box[1]],[box[2],box[1]],[box[2],box[3]],[box[0],box[3]],[box[0],box[1]]],features=OSMProfile.parse({elements:[{type:'node',id:123,lon:p[0],lat:p[1],tags:{tourism:'hotel',name:'テストホテル'}},{type:'way',id:124,tags:{building:'office'},geometry:ring.map(x=>({lon:x[0],lat:x[1]}))}]}),profile=LandProfile.create(LandProfile.configure(MAP_DATA),p,100,features),rows=LandEstimator.estimate(profile,t).filter(x=>x.landComponent?.name==='テストホテル');if(!rows.length)throw Error('hotel missing from area estimate');let c=rows.find(x=>x.role==='place_hotel_guest');if(!c)throw Error('hotel guest missing');let person=mapPerson({...c,roleP:.1},t);return {name:person.place,roles:rows.map(x=>x.label)}})()`);
 assert.equal(result.name,'テストホテル');assert.ok(result.roles.includes('ホテルの宿泊客'));
});

test('bundled real venues generate named local populations without network evidence',()=>{
 const result=run(`(()=>{for(const f of MAP_DATA.regions){f.density=censusMass(f.id)/f.area;f.residentialDensity=censusMass(f.id)/(MAP_DATA.zoning.residentialAreaKm2[f.id]||f.area)}const context=LandProfile.configure(MAP_DATA),t={y:2026,mo:10,d:28,dow:3,h:14,hf:14,mi:0,rand:false},seen=[];for(const kind of ['hotel','museum','theatre','fire_station']){let choices=MAP_DATA.specialPlaces.filter(f=>f.placeKind===kind),found=null;for(const f of choices.slice(0,25)){let p=LandProfile.create(context,f.xy,100,[]),rows=LandEstimator.estimate(p,t).filter(x=>x.landComponent?.id===f.id);if(rows.length){const P=mapPerson({...rows[0],roleP:.1},t);if(P.place!==f.name)throw Error('name mismatch');found=f.name;break}}if(!found)throw Error('no offline venue '+kind);seen.push(found)}return seen})()`);
 assert.equal(result.length,4);
});

test('bundled store and two neighboring OSM tenants are independently eligible',()=>{
 const out=run(`(()=>{for(const f of MAP_DATA.regions){f.density=censusMass(f.id)/f.area;f.residentialDensity=censusMass(f.id)/(MAP_DATA.zoning.residentialAreaKm2[f.id]||f.area)}let f=MAP_DATA.namedStores.find(x=>/店/.test(x.name)),t={y:2026,mo:10,d:28,dow:3,h:14,hf:14,mi:0,rand:false};let features=OSMProfile.parse({elements:[{type:'node',id:1991,lon:f.xy[0],lat:f.xy[1],tags:{amenity:'cafe',name:'試験カフェ',opening_hours:'Mo-Su 09:00-18:00'}},{type:'node',id:1992,lon:f.xy[0]+.00002,lat:f.xy[1],tags:{shop:'books',name:'試験書店'}}]});let profile=LandProfile.create(LandProfile.configure(MAP_DATA),f.xy,100,features),parts=LandEstimator.estimate(profile,t);return [f.name,'試験カフェ','試験書店'].map(n=>{let row=parts.find(x=>x.landComponent?.name===n&&/guest/.test(x.role));if(!row)throw Error('missing '+n);return mapPerson({...row,roleP:.1},t).place})})()`);
 assert.equal(out.length,3);assert.equal(out[1],'試験カフェ');assert.equal(out[2],'試験書店');
});
