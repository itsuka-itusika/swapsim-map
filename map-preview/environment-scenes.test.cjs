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
 assert.ok(has(r.harajuku,/^美容師$/)&&has(r.harajuku,/^アパレル店員$/));assert.ok(has(r.akiba,/^メイドカフェの店員$/));
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
 assert.ok(r.off.length>30&&!r.off.some(x=>/仕事帰り|同僚|上司|職場で|会社で|残業/.test(x)),r.off.filter(x=>/仕事帰り|同僚|上司|職場で|会社で|残業/.test(x)).join('\n'));
});
