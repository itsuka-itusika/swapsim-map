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
