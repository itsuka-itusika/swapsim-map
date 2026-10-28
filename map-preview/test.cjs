const assert=require('node:assert/strict'),test=require('node:test'),M=require('./model.js');
test('施設は小さい円に完全包含されても500mへ均されない',()=>{assert.equal(M.overlap(0,100,35),1);assert.equal(M.overlap(200,100,35),0);assert.ok(M.overlap(100,100,35)>0);assert.equal(M.overlap(0,10,20),.25)});
test('高校の昼夜と女子校・職員の区別',()=>{let f={kind:'high',sex:'female'};assert.equal(M.roles(f,{h:12,dow:1})[0].female,1);assert.equal(M.roles(f,{h:12,dow:1})[1].female,.5);assert.equal(M.roles(f,{h:22,dow:1})[0].n,0)});
test('水面と穴を人口範囲に含めない',()=>{let g={type:'Polygon',coordinates:[[[0,0],[2,0],[2,2],[0,2],[0,0]],[[.5,.5],[1.5,.5],[1.5,1.5],[.5,1.5],[.5,.5]]]};assert.equal(M.inside([1,1],g),false);assert.equal(M.inside([.1,.1],g),true)});
test('施設分布と周囲の一般人口が一つの抽選母集団',()=>{let region={id:'1',name:'test',density:1000,bbox:[139,35,141,37],geometry:{type:'Polygon',coordinates:[[[139,35],[141,35],[141,37],[139,37],[139,35]]]}};let f={code:'1',xy:[140,36],kind:'care',radius:35};let a=M.components([140,36],100,{h:12,dow:1},[region],[f]);assert.equal(a.find(x=>x.role==='resident').n,60);assert.ok(a.find(x=>x.role==='general').n>0);assert.equal(M.pick([]),null)});
const S=require('./school-policy.js'),data=require('./data/geography.json'),policies=require('./data/school-sex.json');
test('出典付き女子校男子校を生徒だけに適用し、不明と共学を混同しない',()=>{
 for(let [name,kind,code,sex] of [['白鵬女子高等学校','high','14101','female'],['慶應義塾高等学校','high','14109','male'],['横浜雙葉小学校','primary','14104','female']]){
  let f=S.apply({name,kind,code},policies.records);assert.equal(f.sex,sex,name);assert.ok(f.schoolPolicy.source.startsWith('https://'));let r=M.roles(f,{y:2026,mo:10,d:26,h:12,dow:1});assert.equal(r[0].female,sex==='female'?1:0);assert.equal(r[1].female,.5);
 }
 assert.equal(S.apply({name:'架空女子高等学校',kind:'high',code:'13101'},policies.records).sex,'unknown');
 assert.equal(S.apply({name:'横浜雙葉小学校',kind:'high',code:'14104'},policies.records).sex,'unknown');
});
test('学校・老人ホーム・病院とも完全包含では人数を減らさない。部分交差だけ按分',()=>{
 let region={id:'14109',name:'test',density:1000,bbox:[139,35,141,37],geometry:{type:'Polygon',coordinates:[[[139,35],[141,35],[141,37],[139,37],[139,35]]]}},t={h:12,dow:1};
 for(let kind of ['high','care','hospital']){let f={code:'14109',xy:[140,36],kind,radius:60};for(let radius of [100,300,500,1000]){let a=M.components(f.xy,radius,t,[region],[f]);for(let r of M.roles(f,t))assert.equal(a.find(z=>z.role===r.role).n,r.n,kind+radius)}}
});
test('女子校の同名別都県・別学校段階へ区分が漏れず、検証済み実データに反映できる',()=>{
 let a=data.facilities.map(f=>S.apply(f,policies.records));assert.ok(a.filter(f=>f.sex==='female').length>=100);assert.ok(a.filter(f=>f.sex==='male').length>=30);assert.ok(a.filter(f=>f.sex==='coed').length>=200);assert.equal(S.apply({name:'大妻',kind:'high',code:'14109'},policies.records).sex,'unknown');
});
test('一覧の男子校・女子小学校と一部共学を施設へ反映',()=>{
 for(const [name,kind,code,sex] of [['開成高等学校','high','13101','male'],['筑波大学附属駒場中学校','middle','13101','male'],['立教新座高等学校','high','11230','male'],['立教小学校','primary','13101','male'],['川村小学校','primary','13101','female'],['桐朋女子高等学校','high','13101','mixed']]){
 const f=S.apply({name,kind,code},policies.records);assert.equal(f.sex,sex,name);assert.equal(M.roles(f,{y:2026,mo:10,d:27,h:12,dow:2})[0].female,sex==='male'?0:sex==='female'?1:.5);
 }
 assert.equal(S.apply({name:'開成小学校',kind:'primary',code:'14366'},policies.records).sex,'unknown');
});

