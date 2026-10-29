const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const html=fs.readFileSync('dist/map-preview.html','utf8'),ctx=vm.createContext({console});vm.runInContext(html.slice(html.indexOf('// ===== 統計データ'),html.indexOf("'use strict';\nconst el=id")),ctx);let run=s=>vm.runInContext(s,ctx);
run(`for(let f of MAP_DATA.regions){f.density=censusMass(f.id)/f.area;f.residentialDensity=censusMass(f.id)/(MAP_DATA.zoning.residentialAreaKm2[f.id]||f.area)}const envContext=LandProfile.configure(MAP_DATA);`);
test('spring park picks original cherry scenes only in season, not unrelated school or running roles',()=>{let x=run(`(()=>{let xy=[139.773,35.715],t={y:2026,mo:4,d:3,dow:5,h:14,hf:14,mi:0,rand:true},p=LandProfile.create(envContext,xy,50),c=LandEstimator.estimate(p,t).find(x=>x.role==='green_walk'),P=mapPerson(c,t);P.age=35;let spring=EnvironmentScenes.candidates(c,P,t).map(textOf),summer=EnvironmentScenes.candidates(c,P,{...t,mo:8,d:3,dow:1}).map(textOf);return {spring,summer,runner:EnvironmentScenes.category({...c,role:'green_run'})}})()`);assert.ok(x.spring.some(x=>/桜|花見/.test(x)));assert.ok(!x.spring.some(x=>/キャンパス|サークル|学校/.test(x)));assert.ok(!x.summer.some(x=>/桜/.test(x)));assert.equal(x.runner,null)});
test('Sanja festival scenes require both date and nearby location',()=>{let x=run(`(()=>{let t={y:2026,mo:5,d:17,dow:0,h:14,hf:14,mi:0,rand:true},p=LandProfile.create(envContext,[139.7967,35.7148],50),c=LandEstimator.estimate(p,t).find(x=>/place_(temple|shrine)_guest/.test(x.role)),P=mapPerson(c,t);P.age=35;let get=(c,t)=>EnvironmentScenes.candidates(c,P,t).map(textOf).filter(s=>s.includes('三社祭'));return {near:get(c,t),far:get({...c,landComponent:{...c.landComponent,sampleXY:[139.778,35.724]}},t),wrongDate:get(c,{...t,d:24})}})()`);assert.ok(x.near.length);assert.equal(x.far.length,0);assert.equal(x.wrongDate.length,0)});
test('current weather uses validated Tokyo observation and specified dates use climate model',()=>{let x=run(`(()=>{let now=Date.now(),i=PREFS.findIndex(p=>p.n==='東京都'),obs={c:{temperature_2m:18,precipitation:1,snowfall:0,weather_code:61,wind_gusts_10m:3},time:now,day:'',x:20,n:16};let good=MapWeather.accept({at:now,obs}),pref=PREFS[i],t={y:2026,mo:10,d:27,h:14,hf:14};return {good,live:wxOf(pref,{...t,rand:false}),sim:wxOf(pref,{...t,rand:true}),status:MapWeather.status(),bad:MapWeather.accept({at:now,obs:{...obs,c:{...obs.c,weather_code:999}}})}})()`);assert.equal(x.good,true);assert.equal(x.live.live,true);assert.equal(x.live.rain,true);assert.notEqual(x.sim.live,true);assert.equal(x.status,'東京の実況');assert.equal(x.bad,false)});
test('weather fetch, cache and offline fallback',async()=>{let c=vm.createContext({console,AbortController,setTimeout,clearTimeout,Date,fetch:()=>{}});vm.runInContext(html.slice(html.indexOf('// ===== 統計データ'),html.indexOf("'use strict';\nconst el=id")),c);let data=await vm.runInContext(`(async()=>{let mem={},storage={getItem:k=>mem[k]||null,setItem:(k,v)=>mem[k]=v};let stamp=new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Tokyo',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(new Date()).replace(' ','T'),calls=0;let fetcher=async(url)=>{calls++;if(!url.includes('latitude=35.69'))throw Error('wrong location');return {ok:true,json:async()=>({current:{time:stamp,temperature_2m:19,precipitation:1,snowfall:0,weather_code:61,wind_gusts_10m:4},daily:{time:[stamp.slice(0,10)],temperature_2m_max:[23],temperature_2m_min:[17]}})}};let a=await MapWeather.load(storage,fetcher),b=await MapWeather.load(storage,fetcher);return {a,b,calls,status:MapWeather.status(),cache:!!storage.getItem('swapsim-map-tokyo-weather-v1')}})()`,c);assert.equal(data.a,true);assert.equal(data.b,true);assert.equal(data.calls,1);assert.equal(data.status,'東京の実況');assert.equal(data.cache,true)});
test('people drawn in the 23 wards are never placed on distant trips, highways or out-of-town landscapes',()=>{
 const away=run(`['バスツアーで紅葉の名所を訪れ、色づいた山を眺めているところでした','紅葉狩りに出かけた山で、真っ赤に色づいたもみじを見上げているところでした','休みの日に、ドライブがてら道の駅まで車を走らせているところでした','高速道路の合流で、ウインカーを出してタイミングをうかがっているところでした','新幹線の運転席で、速度計の針を見つめているところでした'].map(x=>PersonContext.away(x,{role:'general'}))`);
 assert.deepEqual(Array.from(away),[true,true,true,true,true]);
 assert.equal(run(`PersonContext.away('夢の中で、雪山を、なぜか半袖のまま歩いているところでした',{role:'general'})`),false);
 assert.equal(run(`PersonContext.away('新幹線の運転席で、速度計の針を見つめているところでした',{role:'special_crew',facility:{name:'東京駅'}})`),false);
 // Senior bus-tour koyo scenes are eligible in late November; sample urban points and the full situation pipeline.
 const bad=run(`(()=>{let bad=[],names=['丸の内・大手町','渋谷駅周辺','錦糸町','高円寺','赤坂','池袋'];for(const name of names){let a=MAP_DATA.areas.find(x=>x.name===name),p=LandProfile.create(envContext,a.xy,300);for(const [d,dow] of [[21,6],[25,3]])for(const h of [10,13,16]){let t={y:2026,mo:11,d,dow,h,hf:h+.3,mi:18,rand:false},parts=LandEstimator.estimate(p,t),tot=parts.reduce((s,c)=>s+c.n,0);for(let i=0;i<40;i++){let c=MapModel.pick(parts),P=mapPerson({...c,roleP:c.n/tot},t);if(PersonContext.away(P.sit.text,c))bad.push(name+':'+P.sit.text)}}}return bad})()`);
 assert.deepEqual(Array.from(bad),[]);
});
test('named school-holiday scenes are limited to their own season',()=>{
 const lines=fs.readFileSync('texts2.js','utf8').split('\n').filter(l=>/^\s*\[[\d.]+, [\d.]+, '[^']*(夏休み|冬休み|春休み)/.test(l));
 assert.ok(lines.length>10);
 for(const l of lines)assert.match(l,/\b(m|md): /,l.trim());
});
test('pupils are mostly in class on school-day afternoons but out in the city on Saturdays',()=>{
 const kids=run(`(()=>{let a=MAP_DATA.areas.find(x=>x.name==='渋谷駅周辺'),p=LandProfile.create(envContext,a.xy,300),out=[];for(const [d,dow] of [[28,3],[31,6]]){let t={y:2026,mo:10,d,dow,h:14,hf:14,mi:0,rand:false},parts=LandEstimator.estimate(p,t),tot=parts.reduce((s,c)=>s+c.n,0),n=0;for(let i=0;i<1200;i++){let c=MapModel.pick(parts),P=mapPerson({...c,roleP:c.n/tot},t);if(P.age>=6&&P.age<=17&&!['student','resident','general','area_inbound'].includes(c.role))n++}out.push(n)}return out})()`);
 assert.ok(kids[0]*4<kids[1],String(kids));
});
test('distinctive streets use their own scenes and every subculture area defines genres',()=>{
 assert.deepEqual(Array.from(run(`MAP_DATA.areas.filter(a=>a.tags?.subculture&&!a.genres).map(a=>a.name)`)),[]);
 const x=run(`(()=>{let out={};for(const [name,h] of [['キャットストリート',15],['巣鴨地蔵通り商店街',11],['新宿ゴールデン街',21]]){let a=MAP_DATA.areas.find(x=>x.name===name),p=LandProfile.create(envContext,a.xy,100),t={y:2026,mo:10,d:31,dow:6,h,hf:h+.2,mi:12,rand:false},parts=LandEstimator.estimate(p,t),tot=parts.reduce((s,c)=>s+c.n,0),own=new Set(a.scenes.map(s=>s[2])),n=0,old=0;for(let i=0;i<200;i++){let c=MapModel.pick(parts),P=mapPerson({...c,roleP:c.n/tot},t);if(own.has(P.sit.text))n++;if(name==='巣鴨地蔵通り商店街'&&P.age>=65)old++}out[name]=[n,old]}return JSON.stringify(out)})()`);
 const r=JSON.parse(x);for(const [name,[n]] of Object.entries(r))assert.ok(n>=5,name+' '+n);assert.ok(r['巣鴨地蔵通り商店街'][1]>=50);
 assert.equal(run(`PersonContext.away('海浜公園の砂浜から、レインボーブリッジを眺めているところでした',{role:'area_shopping'})`),false);
});
test('detention house and courts follow daily routines with role-specific scenes',()=>{
 const r=JSON.parse(run(`(()=>{let out={};for(const [name,d,dow,h] of [['東京拘置所',28,3,10],['東京拘置所',28,3,22],['東京高等裁判所・東京地方裁判所・東京簡易裁判所',28,3,14]]){let f=MAP_DATA.publicAreas.find(x=>x.name===name),p=LandProfile.create(envContext,f.xy,40),t={y:2026,mo:10,d,dow,h,hf:h+.2,mi:12,rand:false},parts=LandEstimator.estimate(p,t),tot=parts.reduce((s,c)=>s+c.n,0),labels=new Set(),texts=[];for(let i=0;i<150;i++){let c=MapModel.pick(parts),P=mapPerson({...c,roleP:c.n/tot},t);labels.add(P.occ.label);texts.push(P.sit.text)}out[name+h]={labels:[...labels],texts}}return JSON.stringify(out)})()`));
 const day=r['東京拘置所10'],night=r['東京拘置所22'],court=r['東京高等裁判所・東京地方裁判所・東京簡易裁判所14'];
 assert.ok(day.labels.includes('未決拘禁者（拘置所に収容中）'));assert.ok(new Set(day.texts).size>=6);
 assert.ok(!night.texts.some(x=>/事務書類|運動の時間|面会室/.test(x)),night.texts.join());
 assert.ok(court.labels.includes('裁判官')&&court.labels.includes('裁判所書記官'),court.labels.join());
 // No hearings, parties or tours on a Saturday.
 assert.equal(run(`CivicModel.roles(MAP_DATA.publicAreas.find(x=>x.name==='東京高等裁判所・東京地方裁判所・東京簡易裁判所'),{y:2026,mo:10,d:31,dow:6,h:11,hf:11}).filter(c=>c.w>0&&/prosecutor|lawyer|party|audience|saibanin/.test(c.role)).length`),0);
});
test('juvenile classification home and immigration detention have their own routines',()=>{
 const r=JSON.parse(run(`(()=>{let out={};for(const [name,h] of [['東京少年鑑別所',10],['東京少年鑑別所',23],['東京出入国在留管理局',11]]){let f=MAP_DATA.publicAreas.find(x=>x.name===name),p=LandProfile.create(envContext,f.xy,40),t={y:2026,mo:10,d:28,dow:3,h,hf:h+.2,mi:12,rand:false},parts=LandEstimator.estimate(p,t),tot=parts.reduce((s,c)=>s+c.n,0),rows=[];for(let i=0;i<150;i++){let c=MapModel.pick(parts),P=mapPerson({...c,roleP:c.n/tot},t);rows.push([c.role,P.age,P.surname.k,P.sit.text])}out[name+h]=rows}return JSON.stringify(out)})()`));
 const kids=r['東京少年鑑別所10'].filter(x=>x[0]==='civic_juvenile');assert.ok(kids.length>20);assert.ok(kids.every(x=>x[1]>=14&&x[1]<=19));
 assert.ok(r['東京少年鑑別所23'].filter(x=>x[0]==='civic_juvenile').every(x=>/消灯後/.test(x[3])));
 const held=r['東京出入国在留管理局11'].filter(x=>x[0]==='civic_imm_detainee');assert.ok(held.length>0);assert.ok(held.every(x=>/^[ァ-ヶー・]+$/.test(x[2])),held.map(x=>x[2]).join());
});
test('night-only sleep scenes stay at night and weekday-off explanations stay occasional',()=>{
 assert.equal(run(`entryOK(SLEEP_TX.any.find(e=>/夜中に喉が渇いて/.test(textOf(e))),{h:14,P:{age:40,sex:'m',occ:{}}})`),false);
 const share=run(`(()=>{let a=MAP_DATA.areas.find(x=>x.name==='三軒茶屋'),p=LandProfile.create(envContext,a.xy,500),t={y:2026,mo:10,d:28,dow:3,h:13,hf:13.2,mi:12,rand:false},parts=LandEstimator.estimate(p,t).filter(c=>c.resident),tot=parts.reduce((s,c)=>s+c.n,0),n=0,hit=0;for(let i=0;i<400;i++){let c=MapModel.pick(parts),P=mapPerson({...c,roleP:c.n/tot},t);if(P.occ.group!=='adult')continue;n++;if(/^(今日は仕事が休みで|在宅勤務の昼休みに|夜勤明けで|シフトが休みの日で|有給休暇をとった日で|代休の日で|今日は休みで|平日の休みを使って)、/.test(P.sit.text))hit++}return hit/Math.max(1,n)})()`);
 assert.ok(share>0&&share<.22,String(share));
});
test('street-specific workers, concrete factory jobs, visitors from abroad, libraries and baths',()=>{
 const r=JSON.parse(run(`(()=>{const go=(xy,r,h,dow,d,n=300)=>{let p=LandProfile.create(envContext,xy,r),t={y:2026,mo:10,d,dow,h,hf:h+.2,mi:12,rand:false},parts=LandEstimator.estimate(p,t),tot=parts.reduce((s,c)=>s+c.n,0),out=[];for(let i=0;i<n;i++){let c=MapModel.pick(parts),P=mapPerson({...c,roleP:c.n/tot},t);out.push([c.role,P.occ.label])}return out};const A=n=>MAP_DATA.areas.find(a=>a.name===n).xy,L=n=>MAP_DATA.landmarks.find(a=>a.name===n).xy;
 return JSON.stringify({harajuku:go(A('原宿・表参道'),300,14,6,31),akiba:go(A('秋葉原'),300,15,6,31),factory:go([139.7880,35.6280],200,10,3,28,120),library:go(L('国立国会図書館 東京本館'),40,11,3,28,80),bath:go(L('スパ ラクーア'),30,21,6,31,80)})})()`));
 const has=(rows,re)=>rows.some(x=>re.test(x[1]));
 assert.ok(has(r.harajuku,/^美容師$/)&&has(r.harajuku,/^アパレル店員$/));assert.ok(has(r.akiba,/^メイドカフェ店員$/));
 assert.ok(!has(r.factory,/製造業の勤務者|設備・技術職/));assert.ok(has(r.factory,/工|検査員|職人|オペレーター/));
 assert.ok(r.harajuku.filter(x=>x[0]==='area_inbound').every(x=>x[1]==='観光客'));
 assert.ok(r.library.some(x=>x[0].startsWith('place_library')));assert.ok(r.bath.some(x=>x[0].startsWith('place_bath')));
});
test('Ginza pedestrian zone only on weekends, fictional TV talent, a compact Tsukiji market and school-specific scenes',()=>{
 const r=JSON.parse(run(`(()=>{const ginza=MAP_DATA.areas.find(a=>a.name==='銀座'),hoko=t=>{let n=0;for(let i=0;i<400;i++)if(/歩行者天国/.test(VisitorSituations.local({role:'area_shopping',area:ginza},{},t,Math.random)||''))n++;return n};
 const tv=MAP_DATA.facilities.find(f=>f.kind==='tv'),roles=BroadcastModel.roles(tv,{y:2026,mo:10,d:28,dow:3,h:14,hf:14,mi:0}),people=[];for(let z of roles.filter(z=>['media_talent','media_actor','media_actress','media_announcer'].includes(z.role)))for(let i=0;i<6;i++){let P=mapPerson({...z,region:MapModel.locate(tv.xy,MAP_DATA.regions),facility:tv,roleP:.01},{y:2026,mo:10,d:28,dow:3,h:14,hf:14,mi:0});people.push([z.role,P.occ.label,P.sex,P.sit.text])}
 const school=(name,h)=>{let f=MAP_DATA.facilities.find(f=>f.name===name),t={y:2026,mo:10,d:28,dow:3,h,hf:h+.2,mi:12},c={role:'student',label:'学生',min:f.kind==='high'?15:18,max:f.kind==='high'?18:26,female:.5,facility:f,region:MapModel.locate(f.xy,MAP_DATA.regions),roleP:.01},out=[];for(let i=0;i<40;i++){let P=mapPerson(c,t);out.push(P.sit.source+'|'+P.sit.text)}return out};
 return JSON.stringify({weekday:hoko({y:2026,mo:10,d:28,dow:3,h:14,hf:14,mi:0}),saturday:hoko({y:2026,mo:10,d:31,dow:6,h:14,hf:14,mi:0}),evening:hoko({y:2026,mo:10,d:31,dow:6,h:19,hf:19,mi:0}),people,tsukiji:MAP_DATA.areas.find(a=>a.name==='築地場外').radius,geidai:school('東京芸術大学',10),horikoshi:school('堀越高等学校',12)})})()`));
 assert.equal(r.weekday,0);assert.equal(r.evening,0);assert.ok(r.saturday>0);
 for(let [role,label,sex] of r.people){assert.equal(label,{media_talent:'タレント',media_actor:'俳優',media_actress:'女優',media_announcer:'アナウンサー'}[role]);if(role==='media_actor')assert.equal(sex,'m');if(role==='media_actress')assert.equal(sex,'f')}
 assert.ok(r.people.filter(x=>x[0]==='media_actress').every(x=>!/ジャケット/.test(x[3])));
 assert.ok(r.tsukiji<=200);
 assert.ok(r.geidai.some(x=>x.startsWith('school-special|')&&/デッサン|キャンバス|粘土|五線譜|レッスン室|合奏|講評/.test(x)),r.geidai.join('\n'));
 assert.ok(r.horikoshi.some(x=>x.startsWith('school-special|')),r.horikoshi.join('\n'));
});
test('ward central libraries and more large baths are bundled with their own staff and guests',()=>{
 const r=JSON.parse(run(`(()=>{const go=(name,h,dow,d)=>{let f=MAP_DATA.landmarks.find(a=>a.name===name),p=LandProfile.create(envContext,f.xy,Math.min(20,f.radius/2)),t={y:2026,mo:10,d,dow,h,hf:h+.2,mi:12,rand:false};return LandEstimator.estimate(p,t).filter(c=>c.n>0).map(c=>c.role)};
 return JSON.stringify({libs:MAP_DATA.landmarks.filter(f=>f.placeKind==='library').length,baths:MAP_DATA.landmarks.filter(f=>f.placeKind==='bath').length,setagaya:go('世田谷区立中央図書館',11,3,28),arakawa:go('ゆいの森あらかわ',15,6,31),toyosu:go('東京豊洲 万葉倶楽部',3,6,31),ariake:go('泉天空の湯 有明ガーデン',3,6,31)})})()`));
 assert.ok(r.libs>=25&&r.baths>=14,JSON.stringify(r));
 for(let k of ['setagaya','arakawa'])assert.ok(r[k].includes('place_library_guest')&&r[k].includes('place_library_staff'),k+' '+r[k]);
 assert.ok(r.toyosu.includes('place_bath_guest'));assert.ok(!r.ariake.includes('place_bath_guest'));
});
test('market and shopping streets give their visitors only shopping or sightseeing scenes',()=>{
 const r=JSON.parse(run(`(()=>{let out=[];for(let xy of [[139.7698,35.6655],[139.7745,35.7095]])for(let h of [7,10,15,19]){let p=LandProfile.create(envContext,xy,60),t={y:2026,mo:10,d:28,dow:3,h,hf:h+.2,mi:12,rand:false},parts=LandEstimator.estimate(p,t).filter(c=>['area_shopping','area_tourist','area_inbound'].includes(c.role)&&c.area?.visitOnly),tot=parts.reduce((s,c)=>s+c.n,0);for(let i=0;i<60&&parts.length;i++){let c=MapModel.pick(parts),P=mapPerson({...c,roleP:c.n/tot},t);out.push(P.sit.text)}}return JSON.stringify(out)})()`));
 const pools=run(`JSON.stringify([...Object.values(MAP_DATA.storyScenes.visitor).flat(),...MAP_DATA.areas.flatMap(a=>(a.scenes||[]).map(s=>s[2]))])`);
 assert.ok(r.length>200);for(let text of r)assert.ok(pools.includes(JSON.stringify(text))||/買い物|店|土産|観光|商店街|市場/.test(text),text);
});
test('pupils drawn at an ordinary school are regular students of that school',()=>{
 const r=JSON.parse(run(`(()=>{let out=[];for(let kind of ['high','middle']){let fs=MAP_DATA.facilities.filter(f=>f.kind===kind&&f.code.startsWith('131')).slice(0,30);for(let f of fs)for(let i=0;i<20;i++){let P=mapPerson({role:'student',label:'学生',min:kind==='high'?15:12,max:kind==='high'?18:15,female:.5,facility:f,region:MapModel.locate(f.xy,MAP_DATA.regions),roleP:.01},{y:2026,mo:10,d:28,dow:3,h:10,hf:10.2,mi:12});out.push([kind,P.occ.label,!!P.occ.tsushin])}}return JSON.stringify(out)})()`));
 for(let [kind,label,tsushin] of r){assert.match(label,kind==='high'?/^高校[1-3]年生$/:/^中学[1-3]年生$/);assert.equal(tsushin,false)}
});
test('inherited original pools fit the map spot: schools, kindergartens, teachers, visitors, residents and non-workers',()=>{
 const r=JSON.parse(run(`(()=>{const T=(h,dow=3,d=28)=>({y:2026,mo:10,d,dow,h:Math.floor(h),hf:h,mi:Math.round(h%1*60),rand:false}),fac=k=>MAP_DATA.facilities.filter(f=>f.kind===k&&f.code.startsWith('131')).slice(0,25),reg=f=>MapModel.locate(f.xy,MAP_DATA.regions),out={kinder:[],kteach:[],uteach:[],visit:[],res:[],off:[]};
 for(let f of fac('kindergarten'))for(let h of [10,12.5,14]){out.kinder.push([f.name,mapPerson({role:'student',label:'園児',min:3,max:5,female:.5,facility:f,region:reg(f),roleP:.01},T(h)).occ.label,mapPerson({role:'student',label:'園児',min:3,max:5,female:.5,facility:f,region:reg(f),roleP:.01},T(h)).sit.text]);out.kteach.push(mapPerson({role:'teacher',label:'教員',min:22,max:64,female:.8,facility:f,region:reg(f),roleP:.01},T(h)).sit.text)}
 for(let f of fac('university'))for(let h of [10,12.5,16]){let P=mapPerson({role:'teacher',label:'教員',min:30,max:64,female:.3,facility:f,region:reg(f),roleP:.01},T(h));out.uteach.push([P.occ.label,P.sit.text])}
 for(let f of fac('hospital'))for(let h of [10,15]){let P=mapPerson({role:'urban_visit',label:'患者の付き添い・来訪者',min:18,max:84,female:.55,urbanTag:'medical',facility:f,region:reg(f),roleP:.01},T(h));out.visit.push(P.sit.text)}
 let p=LandProfile.create(envContext,[139.6466,35.6433],150);for(let h of [11,15,20])for(let dow of [3,6]){let t=T(h,dow,dow===6?31:28),parts=LandEstimator.estimate(p,t).filter(c=>c.role==='general'),tot=parts.reduce((s,c)=>s+c.n,0);for(let i=0;i<150;i++){let c=MapModel.pick(parts),P=mapPerson({...c,roleP:c.n/tot},t);out.res.push(P.sit.text);if(['homemaker','senior','jobless','rest'].includes(P.occ.group))out.off.push(P.sit.text)}}
 return JSON.stringify(out)})()`));
 for(let [name,label] of r.kinder)assert.match(label,/保育園/.test(name)?/^保育園の/:/こども園|子ども園|子供園/.test(name)?/^認定こども園の/:/^幼稚園の/,name+' '+label);
 assert.ok(!r.kinder.some(x=>/購買|給食当番|帰りの会|掃除の時間|授業/.test(x[2])),r.kinder.map(x=>x[2]).join('\n'));
 assert.ok(!r.kteach.some(x=>/黒板|答案|授業|生徒/.test(x)));
 assert.ok(r.uteach.every(x=>x[0]==='大学教員'&&!/黒板|生徒|給食/.test(x[1])));
 assert.ok(r.visit.every(x=>/病棟|待合室|会計|面会|売店|入院/.test(x)),r.visit.join('\n'));
 assert.ok(!r.res.some(x=>/球場|スタジアム|コンサート|ショッピングモール|会社で|職場で|教室で|居酒屋|パチンコ|ゲームセンター/.test(x)&&!/夢の中/.test(x)),r.res.filter(x=>/球場|スタジアム|コンサート|ショッピングモール|会社で|職場で|教室で|居酒屋|パチンコ|ゲームセンター/.test(x)).join('\n'));
 assert.ok(r.off.length>30&&!r.off.some(x=>/仕事帰り|同僚|上司|職場で|会社で|残業/.test(x)&&!/夢の中/.test(x)),r.off.filter(x=>/仕事帰り|同僚|上司|職場で|会社で|残業/.test(x)).join('\n'));
});
test('2027 entrance exams bring examinees, parents and proctors to the right schools only on their days',()=>{
 const r=JSON.parse(run(`(()=>{const dowOf=(m,d)=>new Date(Date.UTC(2027,m-1,d)).getUTCDay(),go=(name,m,d,h,y=2027)=>{let f=MAP_DATA.facilities.find(x=>x.name===name),t={y,mo:m,d,dow:dowOf(m,d),h:Math.floor(h),hf:h,mi:Math.round(h%1*60),rand:false},parts=LandEstimator.estimate(LandProfile.create(envContext,f.xy,25),t).filter(c=>c.n>0),tot=parts.reduce((s,c)=>s+c.n,0),out=[];for(let i=0;i<60;i++){let c=MapModel.pick(parts),P=mapPerson({...c,roleP:c.n/tot},t);out.push([c.role,P.occ.label,P.sit.text,P.sit.source||''])}return out};
 return JSON.stringify({kyotsu:go('東京大学',1,16,10),kyotsuOther:go('東京大学',1,20,10),chuju:go('開成中学校',2,1,10),publicMiddle:go('麹町中学校',2,1,10),toritsu:go('日比谷高等学校',2,22,10),result:go('日比谷高等学校',3,2,10),lastYear:go('東京大学',1,17,10,2026)})})()`));
 const takers=x=>x.filter(p=>p[0]==='exam_taker');
 assert.ok(takers(r.kyotsu).length>30&&takers(r.kyotsu).every(p=>/^(高校3年生|浪人生|通信制高校の3年生|特別支援学校 高等部3年生)$/.test(p[1])&&p[3]==='exam'),JSON.stringify(takers(r.kyotsu).slice(0,5)));
 assert.ok(r.kyotsu.filter(p=>p[0]==='teacher').every(p=>/試験|受験生|答案/.test(p[2])));
 assert.equal(takers(r.kyotsuOther).length,0);assert.equal(takers(r.lastYear).length,0);assert.equal(takers(r.publicMiddle).length,0);
 assert.ok(takers(r.chuju).length>20&&takers(r.chuju).every(p=>p[1]==='小学6年生'));assert.ok(r.chuju.some(p=>p[0]==='exam_parent'));
 assert.ok(takers(r.toritsu).every(p=>/中学3年生$/.test(p[1])));assert.ok(takers(r.result).some(p=>/掲示板/.test(p[2])));
});
test('night-work ages, hosts, fewer stay-at-home husbands and concise job names',()=>{
 const r=JSON.parse(run(`(()=>{let xy=MAP_DATA.areas.find(a=>a.name==='歌舞伎町').xy,t={y:2026,mo:10,d:30,dow:5,h:22,hf:22.5,mi:30,rand:false},parts=LandEstimator.estimate(LandProfile.create(envContext,xy,200),t).filter(c=>/cabaret|host|adult_worker/.test(c.role)),tot=parts.reduce((s,c)=>s+c.n,0),night=[];for(let i=0;i<500;i++){let c=MapModel.pick(parts),P=mapPerson({...c,roleP:c.n/tot},t);night.push([P.occ.label,P.age,P.sex])}
 let wife=0,husband=0,labels=[];for(let i=0;i<20000;i++){let P={pref:PREFS.find(p=>p.n==='東京都'),age:28+Math.floor(Math.random()*35),sex:Math.random()<.5?'m':'f',t};P.muni=P.pref.munis[0];P.urb='metro';P.birth=birthOf(P.age,t);P.g=gradeIndex(P.birth,t);let o=occupation(P,t);if(o.label==='専業主婦')wife++;if(o.label==='専業主夫')husband++;if(i<3000)labels.push(JobLabels.short(o.label))}
 return JSON.stringify({night,wife,husband,host:JOB_OBJS.some(j=>j.n==='ホスト'),labels})})()`));
 const f=r.night.filter(x=>/キャバクラ嬢|風俗嬢/.test(x[0]));assert.ok(f.length>200);assert.ok(f.filter(x=>x[1]>=35).length/f.length<.12,String(f.filter(x=>x[1]>=35).length/f.length));
 assert.ok(r.host&&r.night.some(x=>x[0]==='ホスト'&&x[2]==='m'));assert.ok(r.night.filter(x=>x[0]==='ホスト').every(x=>x[1]<40));
 assert.ok(r.husband*20<r.wife,r.husband+' / '+r.wife);
 assert.ok(!r.labels.some(x=>/^(倉庫のピッキングスタッフ|飲食店のホールスタッフ|コンビニの店員|県庁の職員|市役所の職員|自動車部品工場の作業員)/.test(x)));
});
test('night districts skew young: visitors, staff and customers, most of all in youth districts',()=>{
 const r=JSON.parse(run(`(()=>{let out={};for(let n of ['歌舞伎町','新橋・汐留']){let xy=MAP_DATA.areas.find(a=>a.name===n).xy,t={y:2026,mo:10,d:30,dow:5,h:22,hf:22.2,mi:12,rand:false},parts=LandEstimator.estimate(LandProfile.create(envContext,xy,150),t).filter(c=>['area_night','area_night_worker','area_adult_customer'].includes(c.role)),tot=parts.reduce((s,c)=>s+c.n,0),ages={};for(let i=0;i<600;i++){let c=MapModel.pick(parts),P=mapPerson({...c,roleP:c.n/tot},t);(ages[c.role]=ages[c.role]||[]).push(P.age)}out[n]=ages}return JSON.stringify(out)})()`));
 const mean=a=>a.reduce((s,x)=>s+x,0)/a.length,young=a=>a.filter(x=>x<35).length/a.length;
 assert.ok(mean(r['歌舞伎町'].area_night)<37&&young(r['歌舞伎町'].area_night)>.5,String(mean(r['歌舞伎町'].area_night)));
 assert.ok(mean(r['歌舞伎町'].area_night)<mean(r['新橋・汐留'].area_night));
 if(r['歌舞伎町'].area_adult_customer)assert.ok(mean(r['歌舞伎町'].area_adult_customer)<41);
 assert.ok(mean(r['新橋・汐留'].area_night_worker)<39);
});
test('late night and the last train have their own scenes at stations, night districts and offices',()=>{
 const r=JSON.parse(run(`(()=>{const st=MAP_DATA.facilities.find(f=>f.kind==='station'&&/新宿/.test(f.name)),go=(xy,rad,h,role)=>{let t={y:2026,mo:10,d:30,dow:5,h:Math.floor(h),hf:h,mi:Math.round(h%1*60),rand:false},parts=LandEstimator.estimate(LandProfile.create(envContext,xy,rad),t).filter(c=>c.role===role),tot=parts.reduce((s,c)=>s+c.n,0),out=[];for(let i=0;i<80&&parts.length;i++){let c=MapModel.pick(parts);out.push(mapPerson({...c,roleP:c.n/tot},t).sit.text)}return out};const A=n=>MAP_DATA.areas.find(a=>a.name===n).xy;
 return JSON.stringify({evening:go(st.xy,30,19,'special_passenger'),last:go(st.xy,30,0.3,'special_passenger'),first:go(st.xy,30,4.8,'special_passenger'),kabuki:go(A('歌舞伎町'),150,23.8,'area_night'),office:go(A('丸の内・大手町'),150,23.5,'area_office'),dawn:go(A('丸の内・大手町'),150,4.5,'area_office')})})()`));
 const share=(a,re)=>a.filter(x=>re.test(x)).length/Math.max(1,a.length);
 assert.ok(share(r.last,/終電|最終電車/)>.8);assert.equal(share(r.evening,/終電|最終電車|始発/),0);assert.ok(share(r.first,/始発|夜明け/)>.8);
 assert.ok(share(r.kabuki,/終電/)>.2);assert.ok(share(r.office,/終電|深夜|照明の半分/)>.5);assert.equal(share(r.dawn,/終電の時間を気にしながら/),0);
});
test('Tokyo hotels by type: guests, business travelers, visitors from abroad, banquets and hotel staff',()=>{
 const r=JSON.parse(run(`(()=>{const go=(name,h,dow,d)=>{let f=MAP_DATA.specialPlaces.find(x=>x.name===name),t={y:2026,mo:10,d,dow,h:Math.floor(h),hf:h,mi:Math.round(h%1*60),rand:false},parts=LandEstimator.estimate(LandProfile.create(envContext,f.xy,Math.min(15,f.radius/2)),t).filter(c=>c.n>0),tot=parts.reduce((s,c)=>s+c.n,0),out=[];for(let i=0;i<120;i++){let c=MapModel.pick(parts),P=mapPerson({...c,roleP:c.n/tot},t);out.push([c.role,P.occ.label,P.sit.text,P.sit.state,P.place,!!P.isInbound])}return out};
 let hs=MAP_DATA.specialPlaces.filter(f=>f.placeKind==='hotel');
 return JSON.stringify({count:hs.length,styles:[...new Set(hs.map(f=>f.hotelStyle))],teikoku:go('帝国ホテル東京',8,3,28),wedding:go('帝国ホテル東京',14,6,31),night:go('ヒルトン東京',2,3,28),biz:go('京王プレッソイン新宿',13,3,28),ryokan:go('雷門旅館',2,6,31)})})()`));
 assert.ok(r.count>250&&['luxury','city','business','ryokan'].every(s=>r.styles.includes(s)));
 const roles=x=>new Set(x.map(p=>p[0]));
 assert.ok(['place_hotel_inbound','place_hotel_business'].every(k=>roles(r.teikoku).has(k))&&[...roles(r.teikoku)].some(k=>k.startsWith('place_hotel_staff_')));
 assert.ok(r.teikoku.every(p=>p[4]==='帝国ホテル東京'));assert.ok(r.teikoku.filter(p=>p[0]==='place_hotel_inbound').every(p=>p[5]&&p[1]==='観光客'));
 assert.ok(r.teikoku.filter(p=>p[0]==='place_hotel_business').every(p=>/（正社員）$|役員/.test(p[1])&&!/都庁|区役所/.test(p[1])));
 assert.ok(r.wedding.some(p=>p[0]==='place_hotel_banquet'&&/披露宴|宴会場|チャペル/.test(p[2])));
 assert.ok(r.night.filter(p=>p[3]==='sleep').length>r.night.length*.6);
 assert.ok(r.biz.some(p=>p[0]==='place_hotel_staff_housekeeping')&&!r.biz.some(p=>/ラウンジ/.test(p[2])));
 assert.ok(!r.ryokan.some(p=>/ベッド/.test(p[2])));
});
test('roads carry drivers and passengers by road type and hour, and major cinemas have audiences',()=>{
 const r=JSON.parse(run(`(()=>{const T=(h,dow,d)=>({y:2026,mo:10,d,dow,h:Math.floor(h),hf:h,mi:Math.round(h%1*60),rand:false}),at=(k,re=/^131(0[1-9]|1[0-9]|2[0-3])$/)=>{let x=MAP_DATA.roads.find(r=>r.k===k&&r.c.length>=4&&re.test(MapModel.locate([r.c[2],r.c[3]],MAP_DATA.regions)?.id||''));return [x.c[2],x.c[3]]},go=(pt,h,dow,d,rad=40)=>{let t=T(h,dow,d),parts=LandEstimator.estimate(LandProfile.create(envContext,pt,rad),t).filter(c=>c.n>0),tot=parts.reduce((s,c)=>s+c.n,0),out=[];for(let i=0;i<150&&parts.length;i++){let c=MapModel.pick(parts),P=mapPerson({...c,roleP:c.n/tot},t);out.push([c.role,P.occ.label,P.sit.text,P.sit.source||'',P.place,P.age])}return out};
 const cin=MAP_DATA.specialPlaces.find(x=>x.name==='TOHOシネマズ日比谷');
 const shares=(pt,h,dow,d)=>{let rows=LandEstimator.estimate(LandProfile.create(envContext,pt,40),T(h,dow,d)).filter(c=>c.role.startsWith('road_')),tot=rows.reduce((s,c)=>s+c.n,0),g=re=>rows.filter(c=>re.test(c.role)).reduce((s,c)=>s+c.n,0)/tot;return {freight:g(/truck|trailer/),car:g(/car_/),taxi:g(/taxi/)}};
 return JSON.stringify({sx3:shares(at('x'),3,3,28),sx14:shares(at('x'),14,6,31),sn:shares(at('n',/^131(01|02|03|04|13)$/),23.8,5,30),kinds:[...new Set(MAP_DATA.roads.map(r=>r.k))],xNight:go(at('x'),3,3,28),xDay:go(at('x'),14,6,31),nNight:go(at('n',/^131(01|02|03|04|13)$/),23.8,5,30),cinema:go(cin.xy,14,6,31,10),cinemaClosed:go(cin.xy,4,3,28,10),cinemas:MAP_DATA.specialPlaces.filter(f=>f.placeKind==='cinema').length,cinemaStaff:LandEstimator.estimate(LandProfile.create(envContext,cin.xy,10),T(14,6,31)).some(c=>c.role==='place_cinema_staff'&&c.n>0)})})()`));
 assert.deepEqual(r.kinds.sort(),['n','p','x']);
 const road=x=>x.filter(p=>p[0].startsWith('road_'));
 assert.ok(road(r.xNight).length>50&&road(r.xNight).every(p=>p[3]==='road'));
 const share=(x,re)=>road(x).filter(p=>re.test(p[0])).length/Math.max(1,road(x).length);
 assert.ok(r.sx3.freight>r.sx14.freight&&r.sx14.car>r.sx3.car,JSON.stringify([r.sx3,r.sx14]));assert.ok(r.sn.taxi>.2,JSON.stringify(r.sn));
 assert.ok(road(r.xNight).some(p=>p[4]==='首都高速道路'||p[4]==='高速道路'));assert.ok(road(r.nNight).some(p=>/区 道路$/.test(p[4])));
 assert.ok(road(r.xNight).filter(p=>/driver/.test(p[0])).every(p=>p[5]>=18));
 assert.ok(r.cinemas>=30);assert.ok(r.cinema.filter(p=>p[0]==='place_cinema_guest').length>40&&r.cinemaStaff);
 assert.equal(r.cinemaClosed.filter(p=>p[0]==='place_cinema_guest').length,0);
});
test('role age profiles, amusement parks, SHIBUYA109 and station rush hours',()=>{
 const r=JSON.parse(run(`(()=>{const T=(h,dow,d)=>({y:2026,mo:10,d,dow,h:Math.floor(h),hf:h,mi:Math.round(h%1*60),rand:false}),region=MAP_DATA.regions.find(x=>x.id==='13104'),ages=(role,min,max,extra={})=>{let a=[];for(let i=0;i<300;i++)a.push(mapPerson({role,label:extra.label||role,min,max,female:.5,region,roleP:.01,...extra},T(14,3,28)).age);return a.reduce((s,x)=>s+x,0)/a.length};
 const people=(xy,rad,t,role)=>{let parts=LandEstimator.estimate(LandProfile.create(envContext,xy,rad),t).filter(c=>role.test(c.role)),tot=parts.reduce((s,c)=>s+c.n,0),out=[];for(let i=0;i<150&&parts.length;i++){let c=MapModel.pick(parts),P=mapPerson({...c,roleP:c.n/tot},t);out.push([c.role,P.age,P.sex,P.sit.text,P.place])}return out};
 const st=MAP_DATA.facilities.find(x=>x.kind==='station'&&x.name==='新宿駅'),namja=MAP_DATA.facilities.find(x=>x.name==='ナンジャタウン'),arakawa=MAP_DATA.facilities.find(x=>x.name==='あらかわ遊園'),s109=MAP_DATA.specialPlaces.find(x=>x.placeVariant==='shibuya109');
 return JSON.stringify({inbound:ages('area_inbound',6,79,{area:MAP_DATA.areas.find(a=>a.name==='歌舞伎町')}),taxi:ages('road_taxi_driver',28,79,{road:{name:'国道',region},landComponent:{name:'国道',type:'road'},subtype:'n'}),shop:ages('place_shop_staff',18,69,{placeWorker:true,label:'販売員'}),
  rushWd:people(st.xy,30,T(8,3,28),/^special_passenger$/),rushSat:people(st.xy,30,T(8,6,31),/^special_passenger$/),namja:people(namja.xy,20,T(14,6,31),/^special_theme_guest$/),arakawa:people(arakawa.xy,40,T(11,0,1),/^special_theme_guest$/),s109:people(s109.xy,15,T(15,6,31),/^place_s109_guest$/)})})()`));
 assert.ok(r.inbound>30&&r.inbound<40,String(r.inbound));assert.ok(r.taxi>55,String(r.taxi));assert.ok(r.shop<40,String(r.shop));
 const RUSH=/満員|ラッシュ|乗り換え|整列乗車|人波|人だかり|遅延|快速|定期|振替|駅ナカ|部活帰り|塾へ/,share=(x,re)=>x.filter(p=>re.test(p[3])).length/Math.max(1,x.length);
 assert.ok(share(r.rushWd,RUSH)>.5,String(share(r.rushWd,RUSH)));assert.ok(share(r.rushSat,/満員電車から|整列乗車|通学定期|帰宅ラッシュ/)===0);
 assert.ok(r.namja.length>50&&r.namja.every(p=>p[4]==='ナンジャタウン'));assert.ok(r.namja.filter(p=>p[1]<30).length/r.namja.length>.5);
 assert.ok(r.arakawa.filter(p=>p[1]<13).every(p=>!/子どもに|子どもを乗せ|わが子/.test(p[3])));
 assert.ok(r.s109.filter(p=>p[2]==='f').length/r.s109.length>.7&&r.s109.filter(p=>p[1]<30).length/r.s109.length>.7);
});
test('places without a specific name read as district or ward, with 自宅 or 職場',()=>{
 const r=JSON.parse(run(`(()=>{let out=[];for(let xy of [[139.6922,35.6896],[139.7155,35.6339],[139.7035,35.6938]])for(let h of [3,13,22]){let t={y:2026,mo:10,d:28,dow:3,h,hf:h,mi:0,rand:false},parts=LandEstimator.estimate(LandProfile.create(envContext,xy,150),t).filter(c=>c.n>0),tot=parts.reduce((s,c)=>s+c.n,0);for(let i=0;i<60;i++){let c=MapModel.pick(parts),P=mapPerson({...c,roleP:c.n/tot},t);out.push([c.role,!!c.resident,P.place,PlaceLabel.generic(c)])}}return JSON.stringify(out)})()`));
 const generic=r.filter(x=>x[3]);assert.ok(generic.length>100);
 assert.ok(generic.every(x=>!/ (市街地|繁華街|住宅街|オフィス街|工業地帯|緑地|学生街|工場|倉庫)$/.test(x[2])&&(/ (自宅|職場)$/.test(x[2])||!/ /.test(x[2]))),generic.slice(0,3).join(' / '));assert.ok(generic.some(x=>!/ /.test(x[2])));
 const res=generic.filter(x=>x[0]==='general');assert.ok(res.filter(x=>/ 自宅$/.test(x[2])).length/res.length>.6);
 assert.ok(r.filter(x=>!x[3]).every(x=>!/ (自宅|職場)$/.test(x[2])));
});
test('自宅 and 職場 follow the final scene text',()=>{
 const k=(role,state,text,extra={})=>run(`PlaceLabel.kind(${JSON.stringify({role,...extra})},${JSON.stringify({sit:{state,text}})})`);
 for(const t of ['布団の中でスマホを眺めているところでした','昼のワイドショーを見ながら、洗濯物をたたんでいるところでした','自宅で、教わったリハビリの体操を一つずつこなしているところでした','学校に行く準備を終えたところでした','実家の親から電話がかかってきて、近況を話しているところでした'])assert.equal(k('general','off',t),'自宅',t);
 for(const t of ['近所のスーパーの朝市で、特売の卵を手に入れたところでした','公園のベンチで、手作りのおにぎりを広げたところでした','近所の銭湯の湯船で、常連さんと世間話をしているところでした','恋人と大型の家具店に来て、ソファの色で意見が割れているところでした','定食屋で、ご飯の大盛り無料に心が揺れているところでした','整形外科のリハビリで、ひざの曲げ伸ばしを繰り返しているところでした'])assert.equal(k('general','off',t),'',t);
 assert.equal(k('general','sleep','夢の中で、空を飛んでいるところでした'),'自宅');
 assert.equal(k('area_office','work','会議の資料を印刷しているところでした'),'職場');
 assert.equal(k('area_office','work','昼休みに、近くのカフェでサンドイッチを食べているところでした'),'');
 assert.equal(k('area_shopping','off','店先のメニューを見比べているところでした'),'');
});
test('major prep schools are their own facilities with 浪人生 by day and high-school students in the evening',()=>{
 const r=JSON.parse(run(`(()=>{const go=(name,h,dow,d)=>{let f=MAP_DATA.facilities.find(x=>x.name===name),t={y:2026,mo:10,d,dow,h,hf:h+.1,mi:6,rand:false},parts=LandEstimator.estimate(LandProfile.create(envContext,f.xy,20),t).filter(c=>c.n>0),tot=parts.reduce((s,c)=>s+c.n,0),out=[];for(let i=0;i<80;i++){let c=MapModel.pick(parts),P=mapPerson({...c,roleP:c.n/tot},t);out.push([c.role,P.occ.label,P.place])}return out};
 return JSON.stringify({kinds:Object.fromEntries(['代々木ゼミナール本部校','河合塾新宿校','駿台予備学校','駿台電子情報アンドビジネス専門学校','駿台学園高等学校'].map(n=>[n,MAP_DATA.facilities.find(f=>f.name===n)?.kind])),day:go('代々木ゼミナール本部校',11,3,28),evening:go('代々木ゼミナール本部校',19,3,28)})})()`));
 assert.deepEqual(r.kinds,{'代々木ゼミナール本部校':'prep','河合塾新宿校':'prep','駿台予備学校':'prep','駿台電子情報アンドビジネス専門学校':'college','駿台学園高等学校':'high'});
 assert.ok(r.day.filter(p=>p[0]==='prep_ronin').length>40&&r.day.filter(p=>p[0]==='prep_ronin').every(p=>/^浪人生/.test(p[1])));
 assert.ok(r.evening.filter(p=>p[0]==='prep_hs').length>20&&r.evening.filter(p=>p[0]==='prep_hs').every(p=>/^高校[1-3]年生$/.test(p[1])));
 assert.ok(r.day.every(p=>!/専門学校の/.test(p[1])));
});
test('hospitals scale with beds and type, and a patient\'s case becomes part of the health status',()=>{
 const r=JSON.parse(run(`(()=>{const T=(h,dow=3)=>({y:2026,mo:10,d:dow===0?25:28,dow,h,hf:h,mi:0}),fs=MAP_DATA.facilities.filter(f=>f.kind==='hospital'),big=fs.find(f=>/東京大学医学部附属病院/.test(f.name)),small=fs.filter(f=>f.htype==='general'&&f.beds<100)[0],mat=fs.filter(f=>f.htype==='maternity').sort((a,b)=>b.beds-a.beds)[0],psych=fs.find(f=>f.htype==='psych'&&f.beds>=100),reg=f=>MAP_DATA.regions.find(r=>r.id===f.code);
 const sum=(f,t,role)=>MapModel.roles(f,t).filter(c=>c.role===role).reduce((s,c)=>s+c.n,0),out={big:sum(big,T(10),'hosp_inpatient'),small:sum(small,T(10),'hosp_inpatient'),outWd:sum(big,T(10),'hosp_outpatient'),outSun:sum(big,T(10,0),'hosp_outpatient'),docDay:sum(big,T(10),'hosp_doctor'),docNight:sum(big,T(2),'hosp_doctor'),inp:[],mat:[],psych:[],outp:[]};
 const draw=(f,role,h,n)=>{let c=MapModel.roles(f,T(h)).find(c=>c.role===role);let a=[];for(let i=0;i<n;i++){let P=mapPerson({...c,facility:f,region:reg(f),roleP:.01},T(h));a.push({sex:P.sex,age:P.age,label:P.sit.stateLabel,state:P.sit.state,text:P.sit.text,health:P.health.text,first:P.health.items[0]?.n||''})}return a};
 out.inp=[...draw(big,'hosp_inpatient',10,40),...draw(big,'hosp_inpatient',2,20)];out.mat=draw(mat,'hosp_inpatient',15,30);out.psych=draw(psych,'hosp_inpatient',11,20);out.outp=draw(big,'hosp_outpatient',10,60);return JSON.stringify(out)})()`));
 assert.ok(r.big>r.small*8,r.big+' '+r.small);assert.ok(r.outWd>100);assert.equal(r.outSun,0);assert.ok(r.docDay>r.docNight*4);
 for(const p of r.inp){assert.match(p.first,/入院/,p.health);assert.match(p.label,/^入院中/)}
 assert.ok(r.inp.slice(40).every(p=>p.state==='sleep'));
 assert.ok(r.mat.every(p=>p.sex==='f'));assert.ok(r.mat.filter(p=>/出産のため入院中|切迫早産/.test(p.health)).length>=r.mat.length*.6,r.mat.map(p=>p.health).join('\n'));
 assert.ok(r.mat.filter(p=>/赤ちゃん/.test(p.text)).every(p=>/出産|切迫早産/.test(p.health)));
 assert.ok(r.psych.filter(p=>/精神科/.test(p.label)).length>=14);
 // Outpatients carry the condition of their department, and the condition leads unless a pregnancy or fever drew the visit.
 assert.ok(r.outp.filter(p=>p.health!=='特になし').length>=r.outp.length*.85);
 assert.ok(r.outp.filter(p=>/透析中/.test(p.label)).every(p=>/人工透析/.test(p.health)));
});
test('OpenStreetMap buildings never show a company, an apartment name or a bare type as the place',()=>{
 const r=JSON.parse(run(`(()=>{let lc=(type,name,tags)=>({landComponent:{type,subtype:type==='residential'?'family':'office',name,tags,source:'OpenStreetMap',precision:'polygon',areaTag:{name:'西五反田'}},region:{name:'品川区'},role:'general'});
 return JSON.stringify([lc('residential','family',{building:'house'}),lc('residential','Marine',{name:'Marine'}),lc('office','株式会社石野興産',{name:'株式会社石野興産'}),lc('office','(株)バイセル',{name:'(株)バイセル'}),lc('office','office',{}),lc('office','大崎ブライトタワー',{name:'大崎ブライトタワー'})].map(c=>PlaceLabel.name(c)))})()`));
 assert.deepEqual(r,['西五反田','西五反田','西五反田','西五反田','西五反田','大崎ブライトタワー']);
});
test('expressway drivers and passengers never wait at signals or turn at intersections',()=>{
 const r=JSON.parse(run(`(()=>{let comp={id:'r',name:'首都高速道路',type:'road',subtype:'x',region:MAP_DATA.regions[0],toll:true},out=[];
 for(let h of [3,8,13,22])for(let k of ['car_driver','car_passenger','truck_driver','trailer_driver','delivery_driver','dump_driver','taxi_driver','taxi_passenger','bus_driver','bus_passenger'])for(let i=0;i<12;i++){let driver=/driver/.test(k);let P=mapPerson({role:'road_'+k,label:k,min:25,max:65,female:.3,road:comp,region:comp.region,landType:'road',subtype:'x',driver,roadWorker:driver&&k!=='car_driver',landComponent:comp,roleP:.01},{y:2026,mo:10,d:28,dow:3,h,hf:h,mi:0});out.push(P.sit.text)}return JSON.stringify(out)})()`));
 assert.ok(r.length>400);assert.ok(r.every(x=>!/交差点|信号|歩道|右折|停留所|路肩/.test(x)),r.filter(x=>/交差点|信号|歩道|右折|停留所|路肩/.test(x)).join('\n'));
});
test('visitors from abroad take the travel hobby table, not the domestic survey',()=>{
 const r=JSON.parse(run(`(()=>{let a=MAP_DATA.areas.find(x=>x.name==='原宿・表参道'),p=LandProfile.create(envContext,a.xy,300),t={y:2026,mo:10,d:31,dow:6,h:14,hf:14.2,mi:12,rand:false},parts=LandEstimator.estimate(p,t).filter(c=>c.role==='area_inbound'),out=[];for(let i=0;i<40;i++){let P=mapPerson({...parts[0],roleP:.01},t);if(P.age>=10)out.push(profileHobbyLabel(P))}return JSON.stringify(out)})()`));
 const ok=new Set(['旅行','写真撮影','食べ歩き','ショッピング','街歩き','カフェ巡り','美術館巡り','音楽鑑賞','映画鑑賞','読書','料理','アニメ・マンガ','ゲーム','ハイキング','ランニング','ヨガ','サッカー観戦','ガーデニング','温泉巡り']);
 assert.ok(r.length>20);assert.ok(r.every(x=>x.split('、').every(h=>ok.has(h))),r.join(' / '));
});
