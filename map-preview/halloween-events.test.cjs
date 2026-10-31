const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const html=fs.readFileSync('dist/map-preview.html','utf8'),ctx=vm.createContext({console});vm.runInContext(html.slice(html.indexOf('// ===== 統計データ'),html.indexOf("'use strict';\nconst el=id")),ctx);let run=s=>vm.runInContext(s,ctx);
const T=(y,mo,d,dow,h)=>`{y:${y},mo:${mo},d:${d},dow:${dow},h:${h},hf:${h},mi:0,rand:true}`;

test('Halloween window is Oct 31 plus the immediately preceding weekend',()=>{
 // 2026-10-31 is Saturday, so the preceding weekend is Oct 24-25.
 assert.equal(run(`SeasonalEvents.halloweenDay(${T(2026,10,31,6,18)})`),'day');
 assert.equal(run(`SeasonalEvents.halloweenDay(${T(2026,10,24,6,18)})`),'weekend');
 assert.equal(run(`SeasonalEvents.halloweenDay(${T(2026,10,25,0,18)})`),'weekend');
 assert.equal(run(`SeasonalEvents.halloweenDay(${T(2026,10,30,5,18)})`),null);
 assert.equal(run(`SeasonalEvents.halloweenDay(${T(2026,11,1,0,1)})`),null);
});

test('Halloween hotspots include Shibuya, Ikebukuro, Kawasaki, Harajuku, Shinjuku and Akihabara',()=>{
 const spots=[
  [[139.7006,35.6595],'渋谷'],[[139.7111,35.7295],'池袋'],[[139.6974,35.5313],'川崎'],
  [[139.7027,35.6702],'原宿'],[[139.7003,35.6938],'新宿'],[[139.7731,35.6984],'秋葉原']
 ];
 for(const [xy,name] of spots){let got=JSON.parse(run(`JSON.stringify(SeasonalEvents.halloweenSpot({area:{xy:${JSON.stringify(xy)}}}))`));assert.equal(got.name,name)}
 assert.equal(run(`SeasonalEvents.halloweenSpot({area:{xy:[139.6500,35.6500]}})`),null);
});

test('Ikebukuro preceding-weekend daytime is stronger than Oct 31, and ordinary dates are inactive',()=>{
 let c='{role:"area_tourist",area:{xy:[139.7111,35.7295]}}',p='{age:22,sit:{state:"off"},hb:{}}';
 let we=run(`(()=>{let c=${c},P=${p},t=${T(2026,10,24,6,14)},s=SeasonalEvents.halloweenSpot(c);return SeasonalEvents.halloweenChance(c,P,t,s,SeasonalEvents.halloweenDay(t))})()`);
 let day=run(`(()=>{let c=${c},P=${p},t=${T(2026,10,31,6,14)},s=SeasonalEvents.halloweenSpot(c);return SeasonalEvents.halloweenChance(c,P,t,s,SeasonalEvents.halloweenDay(t))})()`);
 assert.ok(we>day);assert.ok(we>0);
 assert.equal(run(`SeasonalEvents.halloweenDay(${T(2026,10,23,5,14)})`),null);
});

test('Halloween street scenes do not override workers, residents or facility occupants',()=>{
 let t=T(2026,10,31,6,19),s='{name:"渋谷",key:"shibuya",start:15,end:25,peak:[18,23],p:.13}';
 assert.equal(run(`SeasonalEvents.halloweenChance({role:'area_tourist'},{age:22,sit:{state:'work'},hb:{}},${t},${s},'day')`),0);
 assert.equal(run(`SeasonalEvents.halloweenChance({role:'general',resident:true},{age:22,sit:{state:'off'},hb:{}},${t},${s},'day')`),0);
 assert.equal(run(`SeasonalEvents.halloweenChance({role:'hosp_outpatient'},{age:22,sit:{state:'off'},hb:{}},${t},${s},'day')`),0);
});