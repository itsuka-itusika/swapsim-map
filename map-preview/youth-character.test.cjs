const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const html=fs.readFileSync('dist/map-preview.html','utf8'),ctx=vm.createContext({console});vm.runInContext(html.slice(html.indexOf('// ===== 統計データ'),html.indexOf("'use strict';\nconst el=id")),ctx);const run=s=>vm.runInContext(s,ctx);
test('youth character lines follow age, sex, place and hour',()=>{
 const r=JSON.parse(run(`(()=>{const T=h=>({y:2026,mo:11,d:14,dow:6,h:Math.floor(h),hf:h,mi:0}),home={role:'general',resident:true,landComponent:{type:'residential',precision:'zoning'}},sit={text:'自宅で、テレビを見ているところでした',state:'off',stateLabel:'テレビを見ている'};
  const P=(age,sex,group,label)=>({age,sex,occ:{group,label},sit});const lines=new Map([...YouthCharacter.HOME,...YouthCharacter.OUT].map(x=>[x[0],x]));
  const c=(cc,p,h)=>YouthCharacter.candidates(cc,p,T(h)).map(x=>lines.get(x));
  return JSON.stringify({teenHome:c(home,P(15,'m','student','中学3年生'),20),womanHome:c(home,P(25,'f','adult','会社員'),13),nineteenNight:c({role:'area_night'},P(19,'m','college','大学1年生'),22),adultNight:c({role:'area_night'},P(24,'m','adult','会社員'),22),kid:c(home,P(10,'f','student','小学4年生'),15),senior:c({role:'area_shopping'},P(45,'f','adult','会社員'),14),teenLate:c({role:'area_shopping'},P(16,'f','student','高校1年生'),21.5)})})()`));
 assert.ok(r.teenHome.length&&r.teenHome.every(x=>x[4]==='teen'&&x[1]!=='f'));
 assert.ok(r.womanHome.length&&r.womanHome.every(x=>x[1]!=='m'&&x[4]!=='teen'));
 assert.equal(r.nineteenNight.length,0);assert.ok(r.adultNight.length&&r.adultNight.every(x=>x[4]==='adult20'));
 assert.equal(r.kid.length,0);assert.equal(r.senior.length,0);assert.equal(r.teenLate.length,0);
});
test('students get character lines at lunch and after school; drinking lines only from 20',()=>{
 const r=JSON.parse(run(`(()=>{const ch=(name,age,sex,k)=>TimeSituations.character({role:'student',facility:MAP_DATA.facilities.find(x=>x.name===name)},{age,sex},k);
  return JSON.stringify({lunch:ch('開成高等学校',16,'m','high_lunch'),after:ch('開成中学校',13,'m','teen_after'),u19:ch('早稲田大学',19,'m','college_after'),u21:ch('早稲田大学',21,'m','college_after')})})()`));
 assert.ok(r.lunch.length>3&&r.after.length>2);
 assert.ok(!r.u19.some(x=>/飲み会|クラブ/.test(x)));assert.ok(r.u21.some(x=>/飲み会/.test(x)));
});
test('adult and senior character lines follow age, sex, place and hour; night-out lines stay in night districts',()=>{
 const r=JSON.parse(run(`(()=>{const T=h=>({y:2026,mo:11,d:11,dow:3,h:Math.floor(h),hf:h,mi:0}),home={role:'general',resident:true,landComponent:{type:'residential',precision:'zoning'}};
  const P=(age,sex,state='off')=>({age,sex,occ:{group:age>=65?'senior':'adult',label:'会社員'},sit:{text:'自宅で、テレビを見ているところでした',state,stateLabel:'テレビを見ている'}});
  const all=new Map([...AdultCharacter.WORK,...AdultCharacter.HOME,...AdultCharacter.OUT].map(x=>[x[0],x]));const c=(cc,p,h)=>AdultCharacter.candidates(cc,p,T(h)).map(x=>all.get(x));
  return JSON.stringify({office45f:c({role:'area_office'},P(45,'f','work'),10),office28m:c({role:'area_office'},P(28,'m','work'),10),shop20:c({role:'area_shopping'},P(40,'m'),20),night21:c({role:'area_night'},P(40,'m'),21),senior:c(home,P(75,'m'),14),young:c(home,P(20,'f'),14)})})()`));
 assert.ok(r.office45f.some(x=>/給湯室|備品棚/.test(x[0])));assert.ok(!r.office28m.some(x=>x[4]==='mid'||x[1]==='f'));
 assert.ok(!r.shop20.some(x=>x[5]==='night'));assert.ok(r.night21.length&&r.night21.every(x=>x[5]==='night'));
 assert.ok(r.senior.length&&r.senior.every(x=>x[4]==='senior'&&x[1]!=='f'));assert.equal(r.young.length,0);
});
test('married couples at home late at night sometimes share an intimate night, implied, only with a spouse at home',()=>{
 const r=JSON.parse(run(`(()=>{const P=(age,sex,mar,members)=>({age,sex,household:{mar},familyContext:{members}}),T=(h,dow)=>({hf:h,h:Math.floor(h),dow});
  return JSON.stringify({young:AdultCharacter.couple({},P(30,'m','married',['本人','妻']),T(23,5)),settled:AdultCharacter.couple({},P(55,'f','married',['本人','夫']),T(22,3)),day:AdultCharacter.couple({},P(30,'m','married',['本人','妻']),T(15,6)),single:AdultCharacter.couple({},P(30,'m','single',['本人']),T(23,5)),away:AdultCharacter.couple({},P(30,'m','married',['本人','長男']),T(23,5)),old:AdultCharacter.couple({},P(80,'m','married',['本人','妻']),T(22,3))})})()`));
 assert.equal(r.young.spouse,'妻');assert.ok(r.young.share>r.settled.share);assert.equal(r.settled.spouse,'夫');
 assert.equal(r.day,null);assert.equal(r.single,null);assert.equal(r.away,null);assert.equal(r.old,null);
 for(const t of [...r.young.pool,...r.settled.pool])assert.ok(!/〈/.test(t.replace(/〈配偶者〉/g,'')));
});
