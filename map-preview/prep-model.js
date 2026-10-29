/* 大手予備校: 浪人生 by day, 現役の高校生 in the evening and at weekends, 講師 and staff. Capacities and hours are game assumptions. */
const PrepModel=(()=>{
 // Prep schools are listed as 各種学校 in the school dataset; these names are reclassified (not 駿台's vocational colleges or 駿台学園).
 const NAME=/予備学校|予備校|河合塾|ゼミナール/;
 function isPrep(f){return f.kind==='college'&&NAME.test(f.name)&&!/専門学校|学園/.test(f.name)}
 function roles(f,t){let h=t.hf??t.h,we=t.dow===0||t.dow===6||t.holiday,big=/本部校|河合塾|駿台予備学校/.test(f.name),cap=big?900:300,open=h>=8.5&&h<21.5;
  let ronin=open&&!we?(h<18?cap*.55:cap*.15):we&&open?cap*.2:0,hs=open?(we?(h<19?cap*.45:cap*.1):h>=16.5?cap*.5:0):0;
  return [{role:'prep_ronin',label:'予備校に通う浪人生',n:ronin,min:18,max:20,female:.4},{role:'prep_hs',label:'予備校に通う高校生',n:hs,min:16,max:18,female:.45},
   {role:'prep_teacher',label:'予備校講師',n:open?cap*.03:0,min:26,max:69,female:.25},{role:'prep_staff',label:'予備校職員',n:open?cap*.03:h>=7.5&&h<23?2:0,min:22,max:64,female:.55}]}
 const pick=a=>a[Math.floor(rnd()*a.length)];
 const T={ronin:{class:['大教室の後ろの席で、人気講師の板書を必死に写しているところでした','講師室の前の質問待ちの列に並んでいるところでした','チューターに、模試の判定を見せて志望校を相談しているところでした','自習室の席を確保し、英単語帳を開いたところでした'],lunch:['昼休みに、自習室の外のベンチでコンビニのおにぎりを食べているところでした','昼休みに、同じクラスの浪人仲間と模試の点数を見せ合っているところでした'],evening:['閉館時間まで自習室に残り、過去問の採点をしているところでした']},
  hs:['学校帰りに、予備校の教室に滑り込んで席に着いたところでした','授業前の教室で、学校の課題を急いで片づけているところでした','模試の解き直しをしながら、自習室の閉館時間を気にしているところでした','授業が終わり、講師に質問しようと教壇の前に並んだところでした'],
  teacher:['大教室のマイクを付け直し、板書を始めたところでした','授業のあと、質問に来た生徒の答案を添削しているところでした','講師室で、次の講習のテキストに書き込みをしているところでした'],
  staff:['受付で、模試の申込書を受け取っているところでした','チューターとして、生徒の志望校の過去問を探しているところでした','掲示板に、次の模試と講習の案内を貼り出しているところでした']};
 function assign(c,P){if(!c.role.startsWith('prep_'))return false;let k=c.role.slice(5);
  if(k==='ronin')P.occ={label:'浪人生（予備校に通っている）',group:'student',ronin:true,kindLabel:'所属',p:1,cat:'student'};
  else if(k==='hs')P.occ={label:'高校'+Math.max(1,Math.min(3,P.g-9))+'年生',group:'student',school:'teen',kindLabel:'所属',p:1,cat:'student'};
  else{let job=JOB_OBJS.find(j=>j.n==='塾講師');P.occ={label:c.label,group:'adult',cat:job?.cat||'専門',tag:job?.tag,job,kind:'employed',p:1}}return true}
 function apply(c,P,t){if(!c.role.startsWith('prep_'))return false;let k=c.role.slice(5),h=t.hf??t.h,text=k==='ronin'?pick(h>=12&&h<13?T.ronin.lunch:h>=18?T.ronin.evening:T.ronin.class):pick(T[k]);P.mapSituation=text;P.visitLabel=c.label;P.sit={...P.sit,text,state:k==='teacher'||k==='staff'?'work':'school',stateLabel:c.label,p:1,source:'prep'};return true}
 return {isPrep,roles,assign,apply};
})();
if(typeof module!=='undefined')module.exports=PrepModel;
