const fs=require('node:fs'),vm=require('node:vm'),test=require('node:test'),assert=require('node:assert/strict');
const html=fs.readFileSync('dist/map-preview.html','utf8'),ctx=vm.createContext({console});vm.runInContext(html.slice(html.indexOf('// ===== 統計データ'),html.indexOf("'use strict';\nconst el=id")),ctx);const run=s=>vm.runInContext(s,ctx);
run(`GreenModel.configure(MAP_DATA.greenZones);LandModel.configure(MAP_DATA.waters,MAP_DATA.landZones);`);
test('notification markup, seal styles and render function are copied from original source at build time',()=>{const source=fs.readFileSync('shell.html','utf8'),app=fs.readFileSync('app.js','utf8');let start=source.indexOf('<article class="notice"'),end=source.indexOf('</article>',start)+10;const originalNotice=source.slice(start,end).replace(/^\s*<a class="btn btn-x" id="xpost"[^>]*>Xでポスト<\/a>\n/m,'');assert.ok(html.includes(originalNotice));assert.ok(!html.includes('id=\"xpost\"'));assert.ok(!html.includes('twitter.com/intent/tweet'));let css=source.slice(source.indexOf('.seal {'),source.indexOf('.mode {',source.indexOf('.seal {')));assert.ok(html.includes(css));let renderer=app.slice(app.indexOf('function renderCardFinal(P)'),app.indexOf('// ---- 誰かと誰か',app.indexOf('function renderCardFinal(P)')));assert.ok(html.includes(renderer));assert.ok(html.includes('function scrollToNotice(instant)'));});
test('campus pupils retain original school-year labels and eligible birth cohorts across March and April',()=>{let count=run(`(()=>{let count=0;for(let kind of ['primary','middle','high','university','college']){let f=MAP_DATA.facilities.find(f=>f.kind===kind),region=MAP_DATA.regions.find(r=>r.id===f.code);for(let mo of [3,4,10])for(let rep=0;rep<25;rep++){let t={y:2026,mo,d:20,dow:2,h:13,hf:13,mi:0},c=MapModel.roles(f,t).find(c=>c.role==='student'),P=mapPerson({...c,region,facility:f,roleP:.1},t),limits={primary:[1,6],middle:[7,9],high:[10,12],university:[13,21],college:[13,21]}[kind];if(P.g<limits[0]||P.g>limits[1])throw Error('ineligible birth cohort '+kind);if(!/年生|修士|博士課程/.test(P.occ.label))throw Error('school year omitted: '+P.occ.label);if(kind==='university'&&!/大学[1-4]年生|大学院/.test(P.occ.label))throw Error(P.occ.label);count++}}return count})()`);assert.equal(count,375)});

test('map layout follows the requested order and removes editable time controls',()=>{
 const source=fs.readFileSync('map-preview/index.html','utf8');
 const ids=['clock','draw','opts','map','radii','query','person','crowd'];
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

test('large facilities are bundled while convenience and individual restaurants are not',()=>{
 const result=run(`(()=>{const counts={large:MAP_DATA.specialPlaces.filter(x=>x.id.startsWith('large-osm-')&&x.placeKind==='large_shop').length,tourist:MAP_DATA.specialPlaces.filter(x=>x.id.startsWith('large-osm-')&&x.placeKind==='tourist').length};let types=[{shop:'convenience',name:'テスト店'},{amenity:'restaurant',name:'テスト食堂'},{shop:'mall',name:'テストモール'},{shop:'department_store',name:'テスト百貨店'},{shop:'electronics',name:'ヨドバシカメラ新宿'},{shop:'books',name:'紀伊國屋書店新宿'},{shop:'clothes',name:'ユニクロ銀座店'},{tourism:'hostel',name:'テストホステル'},{amenity:'library',name:'テスト図書館'},{amenity:'bank',name:'テスト銀行'},{amenity:'public_bath',name:'テストスーパー銭湯'},{tourism:'zoo',name:'テスト動物園'}].map(t=>OSMProfile.classification(t)?.[1]||null);return {counts,types}})()`);
 assert.ok(result.counts.large>100);assert.ok(result.counts.tourist>5);assert.equal(result.types[0],null);assert.equal(result.types[1],null);assert.deepEqual(Array.from(result.types.slice(2)),['large_shop','large_shop','large_shop','large_shop','large_shop','hostel','library','bank','bath','tourist']);
});

test('bundled large store and tourist spot generate named local results without OSM requests',()=>{
 const result=run(`(()=>{for(const f of MAP_DATA.regions){f.density=censusMass(f.id)/f.area;f.residentialDensity=censusMass(f.id)/(MAP_DATA.zoning.residentialAreaKm2[f.id]||f.area)}let ctx=LandProfile.configure(MAP_DATA),t={y:2026,mo:10,d:28,dow:3,h:14,hf:14,mi:0,rand:false},out=[];for(let kind of ['large_shop','tourist']){let found;for(let f of MAP_DATA.specialPlaces.filter(x=>x.id.startsWith('large-osm-')&&x.placeKind===kind).slice(0,25)){let parts=LandEstimator.estimate(LandProfile.create(ctx,f.xy,100,[]),t),c=parts.find(x=>x.landComponent?.id===f.id);if(c){found=[f.name,mapPerson({...c,roleP:.1},t).place];break}}if(!found)throw Error(kind+' missing');out.push(found)}return out})()`);
 for(const pair of result)assert.equal(pair[0],pair[1]);
});

test('older cached OSM entries are reclassified and small stores stay excluded',()=>{
 const out=run(`(()=>{const p=[139.7006,35.6595],mk=(id,name,tags)=>({id,name,xy:p,bbox:MapSpatial.box(p,25),radius:25,area:0,type:'commercial',subtype:'poi',source:'OpenStreetMap',precision:'point',tags}),features=[mk('old-cafe','小さな喫茶店',{name:'小さな喫茶店',amenity:'cafe'}),mk('old-bank','銀行',{name:'銀行',amenity:'bank'})],profile=LandProfile.create(LandProfile.configure(MAP_DATA),p,100,features);return [profile.features.map(x=>x.name),profile.features.find(x=>x.id==='old-bank')?.subtype]})()`);
 assert.ok(!out[0].includes('小さな喫茶店'));assert.ok(out[0].includes('銀行'));assert.equal(out[1],'bank');
});

test('redistribution conserves people, protects residents and caps fragmented facility allocations',()=>{
 const result=run(`(()=>{let base=[{role:'area_shopping',n:1000},{role:'area_office',n:1000,landType:'office'},{role:'general',n:300,resident:true},{role:'patient',n:60},{role:'place_shop_guest',n:2,landComponent:{id:'one'}},{role:'place_shop_guest',n:2,landComponent:{id:'one'}},{role:'place_shop_staff',n:2,landComponent:{id:'one'}}],next=LandEstimator.redistribute(base),sum=x=>x.reduce((a,v)=>a+v.n,0);return {before:sum(base),after:sum(next),shopping:next[0].n,office:next[1].n,resident:next[2].n,patient:next[3].n,guests:next[4].n+next[5].n,staff:next[6].n}})()`);
 assert.ok(Math.abs(result.before-result.after)<1e-8);assert.ok(result.guests>4&&result.guests<=24+1e-8);assert.ok(result.staff>2);assert.equal(result.resident,300);assert.equal(result.patient,60);assert.ok(result.shopping>=0&&result.office>=0);
});

test('no eligible facility means no change, and closed retail receives no visitors',()=>{
 const result=run(`(()=>{const rows=[{role:'area_shopping',n:100},{role:'place_shop_guest',n:0,landComponent:{id:'closed'}},{role:'general',n:200}],r=LandEstimator.redistribute(rows);return [r.find(x=>x.role==='area_shopping').n,r.some(x=>x.role==='place_shop_guest'),r.find(x=>x.role==='general').n]})()`);
 assert.equal(result[0],100);assert.equal(result[1],false);assert.equal(result[2],200);
});

test('real Shibuya map increases store visitors while preserving total population',()=>{
 const result=run(`(()=>{for(const f of MAP_DATA.regions){f.density=censusMass(f.id)/f.area;f.residentialDensity=censusMass(f.id)/(MAP_DATA.zoning.residentialAreaKm2[f.id]||f.area)}let p=LandProfile.create(LandProfile.configure(MAP_DATA),[139.7006,35.6595],300,[]),t={y:2026,mo:10,d:28,dow:3,h:14,hf:14,mi:0},before=LandEstimator.estimateRaw(p,t),after=LandEstimator.estimate(p,t),sum=(a,fn)=>a.filter(fn).reduce((v,x)=>v+x.n,0);return {totalBefore:sum(before,()=>true),totalAfter:sum(after,()=>true),storeBefore:sum(before,x=>x.role==='place_shop_guest'),storeAfter:sum(after,x=>x.role==='place_shop_guest'),streetBefore:sum(before,x=>x.role==='area_shopping'),streetAfter:sum(after,x=>x.role==='area_shopping')}})()`);
 assert.ok(Math.abs(result.totalBefore-result.totalAfter)<1e-7);assert.ok(result.storeAfter>result.storeBefore);assert.ok(result.streetAfter<result.streetBefore);console.log('Shibuya retail visitors',result.storeBefore.toFixed(1),'→',result.storeAfter.toFixed(1));
});

test('redistribution stays finite and conserves population across locations and times',()=>{
 const n=run(`(()=>{for(const f of MAP_DATA.regions){f.density=censusMass(f.id)/f.area;f.residentialDensity=censusMass(f.id)/(MAP_DATA.zoning.residentialAreaKm2[f.id]||f.area)}const ctx=LandProfile.configure(MAP_DATA);let checked=0;for(const p of [[139.7006,35.6595],[139.7706,35.7148],[139.7454,35.6586]])for(const [h,dow] of [[2,3],[14,3],[14,0],[21,6]]){let t={y:2026,mo:10,d:28,dow,h,hf:h,mi:0},profile=LandProfile.create(ctx,p,300,[]),a=LandEstimator.estimateRaw(profile,t),b=LandEstimator.estimate(profile,t),sum=arr=>arr.reduce((s,x)=>s+x.n,0);if(b.some(x=>!Number.isFinite(x.n)||x.n<0)||Math.abs(sum(a)-sum(b))>1e-7)throw Error('invalid population '+p+' '+h);checked++}return checked})()`);
 assert.equal(n,12);
});

test('crowd pairs are independently generated in both modes and display both people',()=>{
 const result=run(`(()=>{let dom={};globalThis.el=id=>dom[id]||(dom[id]={innerHTML:'',textContent:'',setAttribute(){}});globalThis.esc=s=>String(s).replace(/[&<>"']/g,'');const f=MAP_DATA.facilities.find(f=>f.kind==='station'),region=MAP_DATA.regions.find(r=>r.id===f.code),t={y:2026,mo:10,d:28,dow:3,h:12,hf:12,mi:0,rand:false};parts=MapModel.roles(f,t).map(c=>({...c,region,facility:f,n:100}));options.sex=null;options.dec=null;options.pair=false;const main=sampleResult(t,true);crowd=Array.from({length:4},()=>samplePair(t));currentPerson=crowd[0];renderCrowd();const html=dom.crowd.innerHTML,first=crowd[0];if(main.kind==='pair')throw Error('single main result changed');if(crowd.some(x=>x.kind!=='pair'||x.A===x.B||x.A.t!==t||x.B.t!==t))throw Error('bad single-mode crowd pair');if(!html.includes(first.A.sit.text)||!html.includes(first.B.sit.text)||!html.includes(first.A.place)||!html.includes(first.B.place)||!html.includes('通知書に表示中'))throw Error('pair details absent');MapNotice.html(first);options.pair=true;const mainPair=sampleResult(t,true);crowd=Array.from({length:4},()=>samplePair(t));renderCrowd();if(mainPair.kind!=='pair'||crowd.some(x=>x.kind!=='pair'))throw Error('bad pair mode');return [dom['crowd-title'].textContent,html.match(/data-crowd=/g).length,dom.crowd.innerHTML.match(/data-crowd=/g).length]})()`);
 assert.equal(result[0],'同じ瞬間に入れ替わった人たち');assert.equal(result[1],4);assert.equal(result[2],4);
 const source=fs.readFileSync('map-preview/app.js','utf8');const draw=source.slice(source.indexOf("el('draw').onclick="),source.indexOf('renderOptions();',source.indexOf("el('draw').onclick=")));assert.match(draw,/Array\.from\(\{length:Math\.max\(0,fewPairs\(\)-1\)\}/);assert.match(draw,/estimateMinute!==minuteKey\(t\)/);
});
test('two-range pair mode always swaps someone from range A with someone from range B',()=>{
 const source=fs.readFileSync('map-preview/app.js','utf8');
 run(`globalThis.el=id=>({innerHTML:'',textContent:'',setAttribute(){}});globalThis.storage=null;globalThis.parts=[];globalThis.partsB=[];`);
 if(run('typeof samplePair')!=='function')run(source.slice(source.indexOf('let issuedCount='),source.indexOf("el('test').onclick")));
 const result=JSON.parse(run(`(()=>{const st=MAP_DATA.facilities.filter(f=>f.kind==='station'),fa=st.find(f=>f.name==='新宿駅'),fb=st.find(f=>f.name==='上野駅'),t={y:2026,mo:10,d:28,dow:3,h:12,hf:12,mi:0,rand:false},rows=f=>MapModel.roles(f,t).map(c=>({...c,region:MAP_DATA.regions.find(r=>r.id===f.code),facility:f,n:100}));parts=rows(fa);partsB=rows(fb);options.sex=null;options.dec=null;options.pair=true;options.pairMode='between';let out=[];for(let i=0;i<10;i++){const R=sampleResult(t,true),O=samplePair(t,false,between());out.push([R.A.place,R.B.place,O.A.place,O.B.place])}options.pairMode='within';const W=sampleResult(t,true);out.push(['within',W.B.place]);return JSON.stringify(out)})()`));
 for(const [a,b,oa,ob] of result.slice(0,10)){assert.equal(a,'新宿駅');assert.equal(b,'上野駅');assert.equal(oa,'新宿駅');assert.equal(ob,'上野駅')}
 assert.equal(result[10][1],'新宿駅');
});
test('a nearly empty range swaps only one or two pairs',()=>{
 const source=fs.readFileSync('map-preview/app.js','utf8');
 run(`globalThis.el=id=>({innerHTML:'',textContent:'',setAttribute(){}});globalThis.storage=null;globalThis.parts=[];globalThis.partsB=[];`);
 if(run('typeof samplePair')!=='function')run(source.slice(source.indexOf('let issuedCount='),source.indexOf("el('test').onclick")));
 const r=JSON.parse(run(`(()=>{options.pair=true;options.pairMode='within';const at=n=>{parts=[{n}];return fewPairs()};return JSON.stringify([at(.1),at(2.9),at(5),at(11.9),at(12),at(5000)])})()`));
 assert.deepEqual(r,[1,1,2,2,6,6]);
});
