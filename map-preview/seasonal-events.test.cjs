const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const html=fs.readFileSync('dist/map-preview.html','utf8'),ctx=vm.createContext({console});vm.runInContext(html.slice(html.indexOf('// ===== 統計データ'),html.indexOf("'use strict';\nconst el=id")),ctx);let run=s=>vm.runInContext(s,ctx);
run(`for(let f of MAP_DATA.regions){f.density=censusMass(f.id)/f.area;f.residentialDensity=censusMass(f.id)/(MAP_DATA.zoning.residentialAreaKm2[f.id]||f.area)}const envContext=LandProfile.configure(MAP_DATA);`);
const T=(mo,d,dow,h)=>`{y:2026,mo:${mo},d:${d},dow:${dow},h:${h},hf:${h},mi:0,rand:true}`;
// Ages and scenes of people drawn within 50m of a point.
const draw=(xy,t,n=300)=>run(`(()=>{let t=${t},p=LandProfile.create(envContext,${JSON.stringify(xy)},50),parts=LandEstimator.estimate(p,t),out=[];for(let i=0;i<${n};i++){let c=MapModel.pick(parts);if(!c)break;let P=mapPerson(c,t);out.push({age:P.age,text:P.sit.text,event:P.sit.source==='seasonal-event'})}return JSON.stringify(out)})()`);
const meiji=[139.6993,35.6764],aoyama=[139.7232,35.6672];
test('Equinox days match the holiday table',()=>{assert.equal(run('SeasonalEvents.equinox(2026,3)'),20);assert.equal(run('SeasonalEvents.equinox(2026,9)'),23);assert.equal(run(`SeasonalEvents.higan(${T(9,26,6,11)})`),'autumn');assert.equal(run(`SeasonalEvents.higan(${T(9,27,0,11)})`),null)});
test('七五三 children at a shrine only in season and by day',()=>{let nov=JSON.parse(draw(meiji,T(11,15,0,11))),kids=nov.filter(x=>x.event&&x.age<10);assert.ok(kids.length>10,'too few 七五三 children: '+kids.length);assert.ok(kids.every(x=>[3,5,7].includes(x.age)));
 for(let t of [T(7,12,0,11),T(11,15,0,20)])assert.ok(!JSON.parse(draw(meiji,t)).some(x=>x.event))});
test('彼岸 grave visits fill the equinox week only',()=>{let higan=JSON.parse(draw(aoyama,T(9,23,3,11))).filter(x=>x.event);assert.ok(higan.length>30);assert.ok(higan.every(x=>/彼岸/.test(x.text)));assert.ok(!JSON.parse(draw(aoyama,T(9,5,6,11))).some(x=>x.event))});
const draw2=(xy,t,r=50,n=200)=>JSON.parse(run(`(()=>{let t=${t},p=LandProfile.create(envContext,${JSON.stringify(xy)},${r}),parts=LandEstimator.estimate(p,t),out=[];for(let i=0;i<${n};i++){let c=MapModel.pick(parts);if(!c)break;let P=mapPerson(c,t);out.push({role:c.role,age:P.age,occ:P.occ.label,text:P.sit.text,label:P.visitLabel||''})}return JSON.stringify(out)})()`));
test('お盆 grave visits on 13-16 July and August only',()=>{for(let t of [T(7,13,1,10),T(8,15,6,10)])assert.ok(draw2(aoyama,t).filter(x=>/お盆|盆花|新盆/.test(x.text)).length>30);assert.ok(!draw2(aoyama,T(8,5,3,10)).some(x=>/お盆/.test(x.text)))});
test('一般参賀 crowds the palace on 2 January and 23 February only',()=>{let palace=[139.7535,35.6815];let ny=draw2(palace,'{y:2027,mo:1,d:2,dow:6,h:10.2,hf:10.2,mi:12,rand:true}',300);assert.ok(ny.filter(x=>x.role==='green_sanga').length>100);assert.ok(ny.filter(x=>x.role==='green_sanga').every(x=>/新年の一般参賀/.test(x.text)));
 for(let x of ny.filter(x=>x.role==='green_sanga_guard'))assert.equal(x.occ,'皇宮護衛官');assert.ok(!draw2(palace,T(10,30,5,11),300).some(x=>/一般参賀/.test(x.text)))});
test('Taxi drivers wait at the 青山公園 taxi pool, most late at night',()=>{let night=draw2([139.7239,35.663],'{y:2026,mo:10,d:31,dow:6,h:1,hf:1,mi:0,rand:true}').filter(x=>x.role==='taxi_driver');assert.ok(night.length>40);assert.ok(night.every(x=>x.occ==='タクシー運転手'&&x.age>=25));
 assert.equal(run('TaxiModel.count({dow:5,h:1})')>run('TaxiModel.count({dow:5,h:9})'),true)});
test('東京駅 has holiday-rush scenes in お盆, 年末年始 and GW only',()=>{let tokyo=[139.7661,35.6814],rush=t=>draw2(tokyo,t,80,300).filter(x=>/帰省ラッシュ|ゴールデンウィーク|正月の東京駅/.test(x.label));
 assert.ok(rush(T(8,12,3,11)).length>50);assert.ok(rush('{y:2027,mo:1,d:3,dow:0,h:15,hf:15,mi:0,rand:true}').every(x=>!/職場|仕事/.test(x.text)||!/学生|年生|浪人|無職|主婦|主夫|家事手伝い|乳児|幼児|未就学/.test(x.occ)));assert.ok(rush('{y:2027,mo:5,d:2,dow:0,h:10,hf:10,mi:0,rand:true}').length>50);assert.equal(rush(T(10,30,5,11)).length,0)});
test('Medical and engineering students at their universities and campuses only',()=>{let st=(xy,h=11)=>draw2(xy,T(11,4,3,h),60,200).filter(x=>x.role==='student').map(x=>x.text),med=/解剖|心電図|病院実習|OSCE|薬理|病理|国家試験|CBT|白衣/,eng=/偏微分|プログラミング|オシロスコープ|CAD|材料力学|ドラフト|シミュレーション|ロボット/;
 assert.ok(st([139.759,35.7215]).filter(x=>med.test(x)).length>40,'日本医科大学');assert.ok(st([139.7176,35.6825]).filter(x=>med.test(x)).length>40,'慶應 信濃町');assert.ok(!st([139.742,35.6492]).some(x=>med.test(x)||eng.test(x)),'慶應 三田');
 assert.ok(st([139.706,35.706]).filter(x=>eng.test(x)).length>40,'早稲田 西早稲田');assert.ok(!st([139.7228,35.7092]).some(x=>eng.test(x)),'早稲田 本部')});
const draw3=(xy,t,r=50,n=300)=>JSON.parse(run(`(()=>{let t=${t},p=LandProfile.create(envContext,${JSON.stringify(xy)},${r}),parts=LandEstimator.estimate(p,t),out=[];for(let i=0;i<${n};i++){let c=MapModel.pick(parts);let P=mapPerson(c,t);out.push({role:c.role,place:P.place,text:P.sit.text,label:P.visitLabel||'',health:P.health?.text||'',case:P.hospCase?.kind||''})}return JSON.stringify(out)})()`));
test('渋谷駅周辺 is named near the station only; the scramble crossing has its own name and scenes',()=>{
 assert.ok(draw3([139.6981,35.6578],T(10,30,5,15)).some(x=>/^渋谷駅周辺/.test(x.place)),'250m');assert.ok(!draw3([139.7065,35.6607],T(10,30,5,15)).some(x=>/渋谷駅周辺/.test(x.place)),'550m');
 let x=draw3([139.7006,35.6595],T(10,30,5,15),50,400);assert.ok(x.filter(p=>/スクランブル交差点/.test(p.place)).length>100);assert.ok(x.filter(p=>/ハチ公|スクランブル交差点の|大型ビジョン/.test(p.text)).length>40)});
test('秋葉原 passers-by get flyers from maids',()=>{assert.ok(draw3([139.7713,35.6984],T(10,31,6,14),120,600).filter(x=>/メイドさん.*ビラ|ビラ.*メイドさん/.test(x.text)).length>20)});
test('Flu jabs at hospitals in October and November only, with no illness of their own',()=>{const xy=JSON.parse(run(`JSON.stringify(MAP_DATA.facilities.find(f=>f.kind==='hospital'&&f.htype==='general'&&(f.beds||0)>=300).xy)`));
 let oct=draw3(xy,T(10,28,3,10),80,800).filter(x=>x.label==='インフルエンザの予防接種');assert.ok(oct.length>15);assert.ok(oct.every(x=>x.case==='check'));
 // The original hospital scenes mention 予防接種 now and then; the season's own lines name the influenza jab.
 assert.equal(draw3(xy,T(12,9,3,10),80,800).filter(x=>x.label==='インフルエンザの予防接種'||/インフルエンザ(の)?(予防接種|ワクチン)/.test(x.text)).length,0)});
test('スクランブル交差点: most people shown there get crossing scenes, some are in a taxi, bus or car',()=>{let a=draw3([139.7006,35.6595],T(11,4,3,15),70,1000).filter(x=>/^渋谷スクランブル交差点$/.test(x.place));assert.ok(a.length>100);
 let own=a.filter(x=>/交差点|ハチ公|信号|大型ビジョン/.test(x.text));assert.ok(own.length>=a.length*.65,own.length+'/'+a.length);assert.ok(a.filter(x=>/タクシー|バス|車の|後部座席|助手席/.test(x.text)).length>=a.length*.07);
 assert.ok(!a.some(x=>/映画館|食堂|ゲームの棚|カラオケ|居酒屋/.test(x.text)))});
test('スクランブル交差点 from midnight to dawn: drawn scenes stay, only indoor ones are replaced',()=>{let a=draw3([139.7006,35.6595],T(11,4,3,3),70,1000).filter(x=>/^渋谷スクランブル交差点$/.test(x.place));assert.ok(a.length>100);
 assert.ok(a.filter(x=>/交差点|ハチ公|信号|大型ビジョン/.test(x.text)).length<a.length*.35);assert.ok(!a.some(x=>/映画館|食堂|ゲームの棚|カラオケ|居酒屋/.test(x.text)))});
