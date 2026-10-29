/* Hospitals: inpatients, outpatients, emergency patients, dialysis, health checks, visitors and staff, scaled by the bed
   count and type from 国土数値情報 P04. A patient's department and case are drawn first, and the case then becomes part of
   the health status shown on the notice. Shares, hours and stay lengths are game assumptions based on rough national figures. */
const HospitalModel=(()=>{
 const pick=a=>a[Math.floor(rnd()*a.length)];
 const pickW=a=>{let s=a.reduce((x,y)=>x+y[1],0),v=rnd()*s;return (a.find(x=>(v-=x[1])<0)||a.at(-1))[0]};
 const DEPT={i:'内科',k:'循環器内科',j:'腎臓内科',t:'糖尿病・内分泌内科',c:'消化器内科',r:'呼吸器内科',n:'脳神経内科',o:'整形外科',s:'外科',d:'皮膚科',u:'泌尿器科',g:'産婦人科',p:'小児科',e:'眼科',b:'耳鼻咽喉科',m:'精神科',h:'リハビリテーション科',z:'腫瘍内科',w:'歯科口腔外科',L:'療養病棟'};
 // Departments assumed when the source lists none.
 const DEFAULT={general:'ios',univ:'ikcrnosdugpebmzw',cancer:'csrz',child:'p',maternity:'g',psych:'m',rehab:'h',longterm:'L',dental:'w'};
 const OCC={general:.78,univ:.85,cancer:.85,child:.72,maternity:.6,psych:.86,rehab:.88,longterm:.9,dental:.5};
 const OUT={general:1.5,univ:2.2,cancer:2,child:1.5,maternity:1.6,psych:.4,rehab:.3,longterm:.25,dental:12};
 const DOC={general:.14,univ:.3,cancer:.22,child:.25,maternity:.12,psych:.05,rehab:.05,longterm:.04,dental:.6};
 const holiday=t=>t.dow===0||!!t.holiday||(typeof holName==='function'&&!!holName(t));
 function info(f){let type=f.htype||'general',beds=f.beds||(type==='dental'?20:60),d=f.depts||'';if(!d||type==='longterm')d=DEFAULT[type]||'ios';if(type==='psych'&&!d.includes('m'))d+='m';if(type==='rehab'&&!d.includes('h'))d+='h';return {type,beds,depts:d,er:!!f.er,big:beds>=400||type==='univ'&&beds>=200}}
 // Outpatient presence: share of the day's outpatients in the building at once.
 function outShare(h){return h<8.5?0:h<9?.18:h<11?.32:h<12?.28:h<14?.18:h<16?.12:h<17?.06:0}
 function roles(f,t){let h=t.hf??t.h,H=info(f),{type,beds:B}=H,hol=holiday(t),sat=t.dow===6&&!hol,wd=!hol&&!sat,day=h>=8.5&&h<17.5,night=h>=21||h<7;
  let inpat=B*(OCC[type]||.78),daily=B*(OUT[type]||1.5)*(wd?1:sat?(type==='univ'?.25:.55):0),out=daily*outShare(sat&&h>=12.5?0:h);
  let check=wd&&H.big&&h>=8.5&&h<12.5?B*.03:0,dialysis=H.depts.includes('j')&&t.dow>0&&!t.holiday&&h>=8.5&&h<22?B*.04*(h<18?1:.6):0;
  let er=H.er?B*(night?.009:h>=17||hol?.014:.006)+1:0,visit=(h>=13&&h<20||!wd&&h>=11&&h<20)?inpat*(['maternity','child'].includes(type)?.25:.12):0,comp=out*.22+er*.6;
  let nurseR=['psych','longterm'].includes(type)?.25:type==='rehab'?.2:type==='dental'?.1:.42,nurse=B*nurseR*(wd&&day?1:day?.55:h>=17.5&&h<21?.45:.3),
   doc=B*(DOC[type]||.1)*(wd&&day?1:day?.2:h>=17.5&&h<21?.3:.08)+(H.er&&!(wd&&day)?2:0),staff=wd&&day?1:day?.15:0;
  let mid=H.depts.includes('g')&&!['psych','rehab','longterm','dental'].includes(type)?B*(type==='maternity'?.12:.025)*(wd&&day?1:.5):0;
  let teach=type==='univ'||H.big,R=[];
  const add=(key,label,n,min,max,female,extra={})=>{if(n>0)R.push({role:'hosp_'+key,label,n,min,max,female,hosp:true,...extra})};
  const ages={in:{general:[[0,14,3],[15,39,8],[40,64,22],[65,74,22],[75,84,27],[85,99,18]],longterm:[[40,64,5],[65,74,15],[75,84,35],[85,99,45]],psych:[[15,29,10],[30,49,22],[50,64,28],[65,95,40]],rehab:[[20,64,18],[65,74,22],[75,99,60]],child:[[0,0,15],[1,5,35],[6,12,30],[13,17,20]],maternity:[[20,24,6],[25,29,25],[30,34,35],[35,39,25],[40,45,9]],dental:[[15,39,30],[40,64,40],[65,89,30]]},
   out:{general:[[0,14,8],[15,39,17],[40,64,30],[65,74,20],[75,95,25]],psych:[[15,29,20],[30,49,35],[50,64,25],[65,90,20]],child:[[0,0,12],[1,5,38],[6,12,32],[13,17,18]],maternity:[[18,24,8],[25,34,45],[35,44,30],[45,69,17]],dental:[[6,14,10],[15,39,30],[40,64,35],[65,89,25]],rehab:[[20,64,30],[65,90,70]],longterm:[[40,64,20],[65,95,80]]}};
  let kids=H.depts.includes('p'),bands=(k,list)=>{let b=(list[type]||list.general);if(!kids&&type!=='dental')b=b.filter(x=>x[0]>=15);return b.length?b:[[15,99,1]]};
  let inB=bands('in',ages.in),outB=bands('out',ages.out),femaleIn=type==='maternity'?1:.5,femaleOut=type==='maternity'?1:.55;
  add('inpatient','入院患者',inpat,inB[0][0],inB.at(-1)[1],femaleIn,{ageBands:inB,hospCase:'in'});
  add('outpatient','外来患者',out,outB[0][0],outB.at(-1)[1],femaleOut,{ageBands:outB,hospCase:'out'});
  add('dialysis','透析を受けている患者',dialysis,30,89,.33,{ageBands:[[30,49,12],[50,64,28],[65,74,30],[75,89,30]],hospCase:'dialysis'});
  add('checkup','人間ドック・健診の受診者',check,30,74,.45,{ageBands:[[30,39,20],[40,49,30],[50,59,30],[60,74,20]],hospCase:'check'});
  add('emergency','救急外来の患者',er,0,99,.45,{ageBands:kids?[[0,14,18],[15,39,24],[40,64,20],[65,99,38]]:[[15,39,30],[40,64,25],[65,99,45]],hospCase:'er'});
  add('visitor','面会に来た家族',visit,18,85,.6,{ageBands:[[18,29,10],[30,49,30],[50,69,40],[70,85,20]]});
  add('companion','患者の付き添い',comp,20,85,.65,{ageBands:[[20,29,8],[30,49,42],[50,69,35],[70,85,15]]});
  const nurseBands=[[22,29,26],[30,39,26],[40,49,25],[50,59,17],[60,65,6]],docBands=[[27,29,10],[30,39,30],[40,49,26],[50,59,21],[60,72,13]],work=[[22,29,22],[30,39,24],[40,49,24],[50,59,20],[60,65,10]];
  add('nurse','看護師',nurse,22,65,.9,{ageBands:nurseBands,hospStaff:true});
  add('doctor','医師',doc,27,72,type==='maternity'||type==='child'?.4:.25,{ageBands:docBands,hospStaff:true});
  if(teach)add('resident','研修医',B*.035*(wd&&day?1:day?.3:.15),24,30,.38,{ageBands:[[24,26,6],[27,30,4]],hospStaff:true});
  if(type==='univ'&&wd&&day&&t.mo!==8)add('student','医学部の学生（臨床実習）',B*.03,22,27,.38,{ageBands:[[22,24,6],[25,27,4]]});
  add('midwife','助産師',mid,22,64,1,{ageBands:nurseBands,hospStaff:true});
  add('pharmacist','薬剤師',B*.03*(wd&&day?1:.15)+(H.er&&!(wd&&day)?.5:0),24,65,.65,{ageBands:work,hospStaff:true});
  if(type!=='psych')add('lab','臨床検査技師',B*.03*(staff||(H.er?.08:0)),22,65,.7,{ageBands:work,hospStaff:true});
  if(!['psych','maternity','dental'].includes(type))add('radiology','診療放射線技師',B*.02*(staff||(H.er?.08:0)),22,65,.3,{ageBands:work,hospStaff:true});
  add('rehab','リハビリの専門職',B*(type==='rehab'?.3:type==='longterm'?.06:['maternity','dental','psych'].includes(type)?0:.05)*(wd&&day?1:day&&type==='rehab'?.5:0),22,60,.5,{ageBands:[[22,29,40],[30,39,35],[40,49,18],[50,60,7]],hospStaff:true});
  if(H.depts.includes('j')||H.big)add('engineer','臨床工学技士',B*.008*(wd&&day?1:.2),22,60,.25,{ageBands:work,hospStaff:true});
  add('clerk','医療事務',B*.08*(wd&&day?1:sat&&h<13?.4:0)+(H.er&&!(wd&&day)?1:0),20,65,.85,{ageBands:work,hospStaff:true});
  add('aide','看護助手',B*.06*(day?1:.35),20,69,.8,{ageBands:[[20,29,15],[30,39,15],[40,49,22],[50,59,25],[60,69,23]],hospStaff:true});
  add('kitchen','病院の厨房スタッフ',h>=5&&h<19.5?B*.025:0,20,69,.7,{ageBands:[[20,29,12],[30,39,15],[40,49,22],[50,59,26],[60,69,25]],hospStaff:true});
  add('clean','病院の清掃スタッフ',day||h>=6&&h<8.5?B*.02:0,20,74,.6,{ageBands:[[20,39,15],[40,59,35],[60,74,50]],hospStaff:true});
  add('guard','病院の警備員',1+B*.004,20,74,.05,{ageBands:[[20,39,20],[40,59,35],[60,74,45]],hospStaff:true});
  return R}

 // ---- Patient cases. [name, health kind, weight(age,sex), surgery?, days (in-patients) ] ----
 const side=()=>rnd()<.5?'右':'左';
 const OUTC={
  i:[['高血圧','chronic',(a)=>a>=65?3:a>=40?1.5:.2],['糖尿病','chronic',(a)=>a>=40?1:.1],['脂質異常症','chronic',(a)=>a>=40?1:.1],['胃腸の不調','acute',()=>1],['貧血','chronic',(a,s)=>s==='f'?.8:.2],['甲状腺の病気','chronic',(a,s)=>s==='f'?.6:.15]],
  k:[['高血圧','chronic',(a)=>a>=50?2:.5],['心臓病','chronic',(a)=>a>=65?2:a>=40?.8:.1],['不整脈','chronic',(a)=>a>=50?1:.3]],
  j:[['腎臓の病気','chronic',()=>1]],
  t:[['糖尿病','chronic',(a)=>a>=30?3:.5],['甲状腺の病気','chronic',(a,s)=>s==='f'?2:.5]],
  c:[['胃炎','acute',()=>1],['肝臓の病気','chronic',(a)=>a>=40?.6:.2],['大腸ポリープ（検査中）','acute',(a)=>a>=40?1:.2]],
  r:[['ぜんそく','chronic',()=>1],['長引くせき','acute',()=>1],['睡眠時無呼吸症候群','chronic',(a,s)=>s==='m'&&a>=35?1.2:.2]],
  n:[['片頭痛','chronic',(a,s)=>s==='f'&&a>=15&&a<=55?2:.5],['脳梗塞の後遺症','chronic',(a)=>a>=65?1.5:.2],['パーキンソン病','chronic',(a)=>a>=60?.5:0]],
  o:[['腰痛症','chronic',(a)=>a>=15?1.5:0],['ひざの関節症','chronic',(a)=>a>=50?2:.1],['骨粗しょう症','chronic',(a,s)=>s==='f'&&a>=60?1.5:0],['@wrist','injury',()=>.8],['@ankle','injury',(a)=>a<50?1:.4],['五十肩','acute',(a)=>a>=40&&a<=65?1:0],['突き指','injury',(a)=>a>=6&&a<=25?.6:0]],
  s:[['がんの治療中','chronic',(a)=>a>=50?1:.2],['鼠径ヘルニア','acute',(a,s)=>s==='m'?.8:.2],['手術後の経過観察','acute',()=>.6]],
  d:[['アトピー性皮膚炎','chronic',()=>1],['皮膚の湿疹','acute',()=>1],['じんましん','acute',()=>.6],['足のいぼ','acute',()=>.4]],
  u:[['前立腺肥大症','chronic',(a,s)=>s==='m'&&a>=55?3:0],['尿路結石','acute',()=>.6],['膀胱炎','acute',(a,s)=>s==='f'?1.5:.2]],
  g:[['子宮筋腫','chronic',(a)=>a>=30&&a<=55?1:0],['更年期障害','chronic',(a)=>a>=45&&a<=58?1.5:0],['生理不順','acute',(a)=>a<=40?1:0]],
  p:[['@cold','cold',()=>2],['ぜんそく','chronic',()=>.8],['アトピー性皮膚炎','chronic',()=>.6],['中耳炎','acute',(a)=>a<=8?.8:.1],['@infant','none',(a)=>a<=1?2:0],['@shot','none',(a)=>a<=12?.8:0]],
  e:[['白内障','chronic',(a)=>a>=60?2:0],['緑内障','chronic',(a)=>a>=40?1:0],['ドライアイ','acute',()=>1],['ものもらい','acute',()=>.5]],
  b:[['中耳炎','acute',(a)=>a<=12?2:.3],['副鼻腔炎','acute',()=>1],['めまい','acute',(a)=>a>=30?.7:.2]],
  m:[['うつ病','chronic',()=>2],['不眠症','chronic',()=>1.5],['適応障害','chronic',(a)=>a<65?1:.2],['パニック障害','chronic',(a)=>a<60?.6:.1]],
  h:[['脳梗塞の後遺症','chronic',(a)=>a>=60?2:.4],['骨折の後遺症','chronic',()=>1],['ひざの手術後','chronic',(a)=>a>=50?.8:.3]],
  z:[['がんの治療中','chronic',()=>1]],
  w:[['虫歯の治療中','chronic',()=>1.5],['親知らずの抜歯','acute',(a)=>a>=18&&a<=35?2:.1],['歯周病','chronic',(a)=>a>=40?1:.2],['顎関節症','acute',()=>.5]]};
 // In-patient cases: [name, kind, weight, surgery, [min days, max days] or months for long stays].
 const INC={
  i:[['肺炎','acute',(a)=>a>=65?2:a<15?1:.5,0,[5,14]],['誤嚥性肺炎','acute',(a)=>a>=75?2:0,0,[7,21]],['脱水症','acute',(a)=>a>=70?.6:.1,0,[3,7]],['尿路感染症','acute',(a)=>a>=70?.6:.2,0,[5,10]]],
  k:[['心不全','acute',(a)=>a>=65?2:.3,0,[10,21]],['心臓カテーテル治療','acute',(a)=>a>=50?1:.1,1,[2,4]],['不整脈の治療','acute',()=>.5,1,[3,6]]],
  j:[['腎臓の病気','chronic',()=>1,0,[7,20]]],
  t:[['糖尿病の教育入院','chronic',(a)=>a>=30?1:.3,0,[7,14]]],
  c:[['胆石','acute',(a)=>a>=40?.8:.2,1,[4,7]],['大腸ポリープの切除','acute',(a)=>a>=40?.8:.1,1,[2,3]],['胃腸炎','acute',()=>.8,0,[3,6]],['肝臓の病気','chronic',(a)=>a>=40?.5:.1,0,[10,20]]],
  r:[['肺炎','acute',(a)=>a>=65?2:.6,0,[7,14]],['肺がん','chronic',(a)=>a>=55?1:0,1,[7,14]],['ぜんそくの発作','acute',()=>.4,0,[4,8]]],
  n:[['脳梗塞','acute',(a)=>a>=60?2:.2,0,[10,30]],['脳出血','acute',(a)=>a>=50?.7:.1,0,[14,30]],['くも膜下出血','acute',(a)=>a>=35?.2:0,1,[20,40]]],
  o:[['@femur','injury',(a)=>a>=70?3:0,1,[14,30]],['ひざの人工関節','chronic',(a)=>a>=60?1.5:0,1,[14,25]],['腰の椎間板ヘルニア','chronic',(a)=>a>=20&&a<=60?1:0,1,[7,14]],['@arm','injury',(a)=>a<70?1:.4,1,[3,7]],['前十字じん帯の損傷','injury',(a)=>a>=15&&a<=35?1:0,1,[10,21]]],
  s:[['虫垂炎','acute',(a)=>a<40?1.5:.5,1,[3,6]],['胃がん','chronic',(a)=>a>=50?1:0,1,[8,14]],['大腸がん','chronic',(a)=>a>=50?1:0,1,[8,14]],['乳がん','chronic',(a,s)=>s==='f'&&a>=35&&a<=75?1.5:0,1,[5,10]],['鼠径ヘルニア','acute',(a,s)=>s==='m'?1:.2,1,[2,4]]],
  u:[['前立腺の病気','chronic',(a,s)=>s==='m'&&a>=60?1:0,1,[5,10]],['尿路結石','acute',()=>.5,1,[2,5]],['腎盂腎炎','acute',(a,s)=>s==='f'?.7:.2,0,[5,10]]],
  g:[['@birth','pp',(a,s)=>s==='f'&&a>=18&&a<=45?4:0,0,[1,5]],['@cesarean','pp',(a,s)=>s==='f'&&a>=20&&a<=45?1.5:0,1,[1,8]],['@preterm','preg',(a,s)=>s==='f'&&a>=18&&a<=45?1:0,0,[3,40]],['子宮筋腫','chronic',(a,s)=>s==='f'&&a>=35&&a<=60?1:0,1,[5,9]]],
  p:[['RSウイルス感染症','acute',(a)=>a<=2?2:0,0,[4,8]],['肺炎','acute',()=>1.5,0,[5,9]],['ぜんそくの発作','acute',(a)=>a>=2?1:0,0,[3,6]],['胃腸炎','acute',()=>1,0,[3,5]],['@arm','injury',(a)=>a>=4?.5:0,1,[2,5]],['川崎病','acute',(a)=>a<=5?.6:0,0,[10,14]]],
  e:[['白内障','chronic',(a)=>a>=60?1:0,1,[1,3]]],
  b:[['扁桃炎','acute',(a)=>a<40?1:.2,1,[5,9]]],
  m:[['うつ病','chronic',()=>2,0,['m',1,6]],['統合失調症','chronic',()=>2,0,['m',1,24]],['双極性障害','chronic',()=>.7,0,['m',1,6]],['アルコール依存症','chronic',(a,s)=>a>=30?(s==='m'?.8:.3):0,0,['m',1,3]],['認知症','chronic',(a)=>a>=70?1.5:0,0,['m',2,12]]],
  h:[['脳梗塞の後遺症','chronic',(a)=>a>=50?2:.3,0,[20,120]],['@femurRehab','chronic',(a)=>a>=65?2:.2,0,[20,90]],['ひざの手術後','chronic',(a)=>a>=55?1:.2,0,[14,40]]],
  z:[['がんの治療中','chronic',()=>2,0,[3,10]],['がんの緩和ケア','chronic',(a)=>a>=40?1:.2,0,[7,40]]],
  w:[['親知らずの抜歯','acute',(a)=>a>=18&&a<=40?1:.1,1,[1,3]],['顎の骨折','injury',()=>.3,1,[7,14]]],
  L:[['脳梗塞の後遺症','chronic',()=>2,0,['m',2,24]],['誤嚥性肺炎','acute',(a)=>a>=75?1:.2,0,[14,60]],['認知症','chronic',(a)=>a>=70?2:.1,0,['m',2,24]],['パーキンソン病','chronic',(a)=>a>=60?.5:0,0,['m',2,24]],['心不全','chronic',(a)=>a>=70?.5:.1,0,[20,90]]]};
 const OUT_DEPT={i:30,k:8,j:4,t:6,c:8,r:5,n:5,o:15,s:4,d:6,u:4,g:6,p:0,e:7,b:5,m:5,h:3,z:3,w:3};
 const IN_DEPT={i:25,k:10,j:3,t:3,c:12,r:10,n:12,o:12,s:12,u:4,g:4,p:0,e:2,b:1,m:4,h:5,z:8,w:1,L:1};
 const KID_OK='pobdewsi',ADULT_NO='p';
 function deptPick(H,P,table,kind){let a=P.age,list=[...H.depts].filter(k=>table[k]!=null||k==='L').map(k=>{let w=k==='L'?1:table[k];if(a<15)w=k==='p'?60:KID_OK.includes(k)&&k!=='i'?w*.3:0;else if(ADULT_NO.includes(k))w=a<18?3:0;if(k==='g'&&P.sex!=='f')w=0;if(k==='g'&&kind==='in'&&a>=18&&a<=45&&P.sex==='f')w*=6;if(k==='u'&&P.sex==='m'&&a>=55)w*=2;if(['e','o','k','n'].includes(k)&&a>=65)w*=1.6;return [k,w]}).filter(x=>x[1]>0);
  // Type-led hospitals: most patients belong to the main department.
  let main={psych:'m',rehab:'h',longterm:'L',maternity:'g',child:'p',dental:'w',cancer:'z'}[H.type];if(main&&list.some(x=>x[0]===main&&x[1]>0)&&rnd()<(kind==='in'?.9:.6))return main;
  return list.length?pickW(list):(H.depts.includes('i')||!H.depts.includes('p')?'i':'p')}
 function caseOf(list,P){let c=list.map(x=>[x,x[2](P.age,P.sex)]).filter(x=>x[1]>0);return c.length?pickW(c):null}
 function days(r){if(r[0]==='m')return {months:r[1]+Math.floor(rnd()*(r[2]-r[1]+1))};return {days:r[0]+Math.floor(rnd()*(r[1]-r[0]+1))}}
 const ER_CASES=[['熱性けいれん','acute',(a)=>a<=5?1.5:0,'kid'],['頭を打ったけが','injury',(a)=>a<=12?1:.3],['誤飲','acute',(a)=>a<=3?.8:0],['ぜんそくの発作','acute',(a)=>a<=12?.6:a<=40?.25:.1],['急性胃腸炎','acute',()=>1],['@ankleFx','injury',(a)=>a>=10&&a<70?.6:.2],['手の切り傷','injury',(a)=>a>=15?.8:.2],['急性アルコール中毒','acute',(a,s,t)=>a>=20&&a<=35&&((t.hf??t.h)>=21||(t.hf??t.h)<4)?2:0],['ぎっくり腰','injury',(a)=>a>=25&&a<70?.5:0],['尿路結石','acute',(a)=>a>=25?.5:0],['胸の痛み（検査中）','acute',(a)=>a>=50?.8:.1],['脳梗塞の疑い','acute',(a)=>a>=65?1:0],['肺炎','acute',(a)=>a>=70?.8:0],['熱中症','acute',(a,s,t)=>t.mo>=7&&t.mo<=9?(a>=65||a<15?2:1):0],['背骨の圧迫骨折','injury',(a,s)=>a>=70?(s==='f'?.8:.4):0]];

 // ---- Scenes ----
 const S={
  reception:['再来受付機に診察券を入れ、受付票を受け取ったところでした','初診の窓口で、紹介状と保険証を差し出したところでした','総合案内で、何階の何番の受付に行けばいいか尋ねているところでした','受付票を持って、広いロビーで自分の科の案内板を探しているところでした'],
  open:['開院前の玄関で、診察券を手に受付が始まるのを待っているところでした'],
  wait:['待合の表示板を見上げ、自分の番号が出るのを待っているところでした','予約の時間を1時間過ぎ、待合の椅子で座り直したところでした','診察の順番を待ちながら、医師に聞きたいことをスマホのメモで確かめているところでした','待合で呼び出しの端末を握り、震えるのを待っているところでした'],
  test:['採血の受付で番号札を取り、腕まくりをして待っているところでした','検査着に着替えて、レントゲン室の前の椅子に座ったところでした','MRIの検査で、大きな音のする筒の中でじっとしているところでした','CTの検査台に横になり、「息を止めてください」の合図を待っているところでした','心電図の検査で、ベッドに横になり胸に電極を貼られているところでした','採血を終え、腕を押さえながら次の検査室へ向かっているところでした'],
  pay:['会計の番号が表示されるのを待ちながら、次の予約票を眺めているところでした','自動精算機で支払いを済ませ、処方箋を受け取ったところでした','院外処方の処方箋を手に、病院前の薬局へ向かうところでした'],
  exam:{i:['診察室で、医師に聴診器を当てられているところでした','内科の診察で、この数週間の体調の変化を説明しているところでした'],
   k:['心臓のエコー検査で、左を向いて横になっているところでした','循環器内科の診察室で、24時間心電図の結果を聞いているところでした'],
   j:['腎臓内科の診察で、血液検査の数値の説明を受けているところでした'],
   t:['血糖値の記録を見ながら、医師から食事の注意を受けているところでした','栄養指導の部屋で、管理栄養士と一日の食事を振り返っているところでした'],
   c:['胃カメラの検査を終え、のどの麻酔が切れるのを待っているところでした','内視鏡の検査室の前で、名前を呼ばれるのを待っているところでした'],
   r:['呼吸機能の検査で、合図に合わせて思い切り息を吐き出したところでした','胸のレントゲン写真を見ながら、医師の説明を聞いているところでした'],
   n:['脳のMRIの画像を見ながら、医師の説明を聞いているところでした','診察室で、指先で自分の鼻を触る神経の検査を受けているところでした'],
   o:['整形外科の診察室で、レントゲン写真を見ながら骨の具合を聞いているところでした','診察室で、医師に関節の動く範囲を確かめられているところでした'],
   s:['外科の外来で、手術の傷あとを医師に見てもらっているところでした','外科の診察室で、次の検査の日程を相談しているところでした'],
   d:['皮膚科の診察室で、塗り薬の塗り方を教わっているところでした','皮膚科で、患部を拡大鏡でのぞかれているところでした'],
   u:['泌尿器科の待合で、検査用の紙コップを受け取ったところでした','泌尿器科の診察室で、エコーの画像を見ながら説明を聞いているところでした'],
   g:['婦人科の診察室で、検査の結果を聞いているところでした','婦人科の待合で、問診票の記入を終えたところでした'],
   p:['診察室で、聴診器を当てられてくすぐったそうにしているところでした','待合のキッズスペースで、絵本を広げているところでした','注射の順番を待ちながら、親の手をぎゅっと握っているところでした','診察室で、口を大きく開けてのどを見てもらっているところでした'],
   e:['眼科で、目薬をさされて瞳が開くのを待っているところでした','視力検査で、輪の切れ目の向きを答えているところでした','眼科の検査機械に、あごを乗せて光を見つめているところでした'],
   b:['耳鼻咽喉科の診察台で、鼻にスプレーをされているところでした','聴力検査の部屋で、ヘッドホンの音に合わせてボタンを押しているところでした'],
   m:['精神科の診察室で、この2週間の眠りの具合を話しているところでした','心療の外来で、静かな待合の椅子に座って順番を待っているところでした','診察室で、医師に最近の気分の波を聞かれているところでした'],
   h:['外来のリハビリ室で、理学療法士と一緒に脚の筋力トレーニングをしているところでした','リハビリ室で、ゴムバンドを使って肩を動かす練習をしているところでした'],
   z:['外来化学療法室のリクライニングチェアで、抗がん剤の点滴を受けているところでした','放射線治療の台に横になり、位置合わせが終わるのを待っているところでした'],
   w:['歯科口腔外科の診察台で、口を大きく開けているところでした','口腔外科で、歯のレントゲン写真を見ながら説明を聞いているところでした']},
  cond:{'@wrist':['ギプスで固めた手首を見せ、骨のつき具合を診てもらっているところでした'],'@ankle':['足首に巻いた包帯を外してもらい、腫れの具合を診てもらっているところでした'],'突き指':['テーピングした指を、医師に軽く押されて顔をしかめたところでした'],
   '@infant':['乳児健診で、身長と体重を測ってもらっているところでした','乳児健診で、医師に股関節の動きを確かめられているところでした'],'@shot':['予防接種の注射を終え、泣かずに我慢できたとほめられたところでした','予防接種のあと、待合で30分様子を見ているところでした'],
   '人工透析':['透析室のベッドで、4時間の透析が始まったところでした','透析を受けながら、ベッド脇のテレビを眺めているところでした','透析を終え、体重計に乗って水分がどれだけ抜けたか確かめているところでした','透析の針を刺す前に、看護師と腕の血管の具合を確かめているところでした'],
   '親知らずの抜歯':['親知らずを抜いたあと、ガーゼをかんで血が止まるのを待っているところでした'],'白内障':['白内障の手術の説明を受け、どちらの目からにするか相談しているところでした'],
   'がんの治療中':['外来化学療法室で、点滴が落ちるのを眺めながら本を読んでいるところでした','主治医から、次の治療の予定を聞いているところでした'],'高血圧':['診察室で、家で測った血圧の記録を医師に見せているところでした'],'糖尿病':['採血の結果を見ながら、医師からヘモグロビンA1cの数字の説明を受けているところでした']},
  check:['人間ドックで、検査着のまま次の検査の案内を待っているところでした','健診センターで、バリウムを飲み干して検査台に乗ったところでした','人間ドックの最後に、医師から結果の説明を受けているところでした','健診の視力検査で、片目を隠して輪の向きを答えているところでした','健診の腹部エコーで、横になってお腹にゼリーを塗られたところでした'],
  ward:{early:['朝の検温で、看護師に体温計を渡したところでした','起床の時間になり、病室のカーテンを開けたところでした','朝の採血で、まだ眠い腕を差し出したところでした'],
   meal:['配られた病院食のふたを開け、今日の献立を確かめたところでした','薄味の病院食を、時間をかけて食べているところでした','食事のあと、看護師に食べた量を伝えたところでした'],
   morning:['回診に来た医師に、昨夜はよく眠れたか聞かれたところでした','検査に呼ばれ、車いすで検査室へ向かっているところでした','ベッドの上で、テレビカードの残りの度数を確かめているところでした','看護師に、今日の検査と点滴の予定を説明してもらっているところでした'],
   afternoon:['デイルームで、窓の外の景色を眺めているところでした','ベッドで、読みかけの文庫本を開いたところでした','病院の売店で、飲み物と雑誌を買ってきたところでした','同じ病室の人と、窓際のベッドの日当たりの話をしているところでした','シャワーの順番が回ってきて、着替えを用意しているところでした'],
   visit:['面会に来た家族に、着替えとタオルを届けてもらったところでした','面会に来た友人と、デイルームで近況を話しているところでした'],
   evening:['夕食のあと、歯を磨きに洗面所へ向かうところでした','面会時間の終わりを知らせる放送が流れたところでした','消灯の前に、明日の検査の説明を看護師から受けたところでした'],
   night:['消灯後の病室で、眠りについたところでした','夜中に目が覚め、同じ病室のいびきを聞きながら天井を見ているところでした','見回りの看護師の懐中電灯が、カーテン越しに揺れたところでした','眠れずに、ベッドのライトをつけてイヤホンでラジオを聴いているところでした']},
  inCase:{op:['手術の傷を押さえながら、ベッドから起き上がる練習をしているところでした','看護師に支えられ、手術のあとはじめて病棟の廊下を歩いたところでした','点滴のスタンドを押しながら、病棟の廊下をゆっくり歩いているところでした'],opEarly:['手術の翌日で、点滴と管につながれたままベッドで横になっているところでした','手術の前の説明で、麻酔科の医師から注意を聞いているところでした'],
   ortho:['リハビリ室で、歩行器を使って歩く練習をしているところでした','理学療法士と一緒に、手すりにつかまって階段を一段ずつ上っているところでした'],
   stroke:['リハビリ室で、言語聴覚士と声を出す練習をしているところでした','動かしにくくなった手で、お箸を持つ練習をしているところでした','作業療法室で、洗濯ばさみをつまむ練習をしているところでした'],
   cancer:['抗がん剤の点滴を受けながら、ベッドでうとうとしているところでした','緩和ケアの病室で、家族が持ってきた花を眺めているところでした'],
   birth:['新生児室のガラス越しに、自分の赤ちゃんを見つめているところでした','助産師に教わりながら、赤ちゃんのおむつを替えているところでした','病室のベッドの横で、すやすや眠る赤ちゃんの顔をのぞき込んでいるところでした','沐浴の指導で、助産師の手つきを見ながら赤ちゃんを湯につけているところでした'],
   preterm:['お腹の張りを抑える点滴を受けながら、ベッドで安静にしているところでした','モニターのベルトをお腹に巻き、赤ちゃんの心音を聞いているところでした'],
   psych:['デイルームで、ほかの患者と将棋を指しているところでした','作業療法の時間で、ちぎり絵の続きをしているところでした','病棟で決まった時間に、看護師から薬を受け取ったところでした','病棟の中庭を、看護師と一緒にゆっくり散歩しているところでした'],
   kid:['プレイルームで、ほかの入院中の子とブロックで遊んでいるところでした','ベッドの柵につかまって、付き添いの親が戻るのを待っているところでした','点滴の管を気にしながら、ベッドの上でアニメを見ているところでした'],
   school:['院内学級で、先生とプリントの問題を解いているところでした'],
   longterm:['ベッドの上で、看護師に体の向きを変えてもらったところでした','車いすに乗せてもらい、デイルームで音楽を聴いているところでした','病棟のレクリエーションで、風船バレーに参加しているところでした']},
  er:['救急車で運ばれ、処置室のベッドで点滴を受けているところでした','救急外来の待合で、名前が呼ばれるのを待っているところでした','救急外来のベッドで、検査の結果が出るのを待っているところでした'],
  erCase:{'手の切り傷':['処置室で、包丁で切った手の傷を縫ってもらっているところでした'],'頭を打ったけが':['頭を打って、救急外来のベッドで様子を見てもらっているところでした'],'急性アルコール中毒':['飲み会のあとに運ばれ、救急外来のベッドで点滴を受けているところでした'],'@ankleFx':['レントゲンを撮り終え、骨折かどうかの結果を待っているところでした'],'熱性けいれん':['けいれんが治まり、救急外来のベッドで親に手を握られているところでした'],'誤飲':['飲み込んだものを確かめるため、救急外来でレントゲンを撮ってもらったところでした'],'脳梗塞の疑い':['救急外来で、急いでMRIの検査に運ばれているところでした'],'熱中症':['救急外来のベッドで、首と脇を冷やしながら点滴を受けているところでした']},
  fever:['発熱外来の待合で、ほかの患者と離れた席に座っているところでした','発熱外来で、鼻の奥に検査の綿棒を入れられたところでした'],
  visitor:['面会の受付で名前を書き、入館証を首から下げたところでした','病室で、入院中の家族に着替えとタオルを届けたところでした','病院の売店で、お見舞いに何を買うか迷っているところでした','入院中の家族のベッド脇で、家の様子を話しているところでした','デイルームで、入院中の家族と並んでお茶を飲んでいるところでした'],
  visitorEnd:['面会時間の終わりの放送を聞き、病室を出るところでした'],
  visitorBirth:['産科の病棟で、生まれたばかりの孫をガラス越しに眺めているところでした','出産を終えた家族の病室で、赤ちゃんの写真を撮っているところでした'],
  companion:{kid:['子どもの診察に付き添い、待合で順番を待っているところでした','子どもの検査が終わるのを、廊下の椅子で待っているところでした'],old:['高齢の親の通院に付き添い、会計の列に並んでいるところでした','車いすを押して、家族を検査室の前まで連れてきたところでした','付き添った家族の代わりに、医師の説明をメモしているところでした'],er:['救急車に同乗してきて、救急外来の廊下で説明を待っているところでした','救急外来の待合で、運ばれた家族の検査が終わるのを待っているところでした']},
  staff:{
   nurse:{ward:['ナースステーションで、電子カルテに看護記録を入力しているところでした','手術から戻った患者の血圧と脈を測っているところでした','ナースコールが鳴り、病室へ急いでいるところでした','入院してきた患者に、病棟の案内をしているところでした','病室を回り、点滴の残りを確かめているところでした'],
    handover:['申し送りで、夜勤の看護師から患者の様子を聞いているところでした'],outpatient:['外来の診察室の前で、次の患者の名前を呼んだところでした','採血室で、患者の腕にゴムのバンドを巻いているところでした','外来で、患者の体温と血圧を測って問診票に書き込んでいるところでした'],
    or:['手術室で、執刀医に器具を手渡しているところでした','手術室で、ガーゼと器具の数を声に出して数えているところでした'],icu:['ICUで、人工呼吸器の数値を確かめているところでした','ICUのベッドの横で、モニターの心電図の波形を見ているところでした'],
    er:['救急外来で、到着した救急車から患者を受け入れたところでした','救急隊からの受け入れの電話を、医師に取り次いでいるところでした'],
    night:['夜勤の見回りで、懐中電灯を手に病室をのぞいているところでした','夜勤の合間に、ナースステーションで翌朝の点滴を準備しているところでした','深夜のナースコールで、眠れないという患者の話を聞いているところでした','夜勤の仮眠の時間になり、休憩室で目を閉じたところでした'],
    psych:['精神科の病棟で、患者の話にじっと耳を傾けているところでした','病棟で決まった時間に、患者に薬を配っているところでした'],child:['小児病棟で、泣いている子をあやしながら点滴を確かめているところでした'],
    longterm:['寝たきりの患者の体の向きを、同僚と二人で変えているところでした','食事の介助で、患者の口元にスプーンを運んでいるところでした'],dial:['透析室で、患者の腕に透析の針を刺す準備をしているところでした']},
   doctor:{out:['外来の診察室で、次の患者の名前を呼んだところでした','診察室で、検査の結果を見せながら治療の方針を説明しているところでした','外来の合間に、紹介状の返事を書いているところでした'],
    ward:['病棟を回診しながら、患者の傷の具合を確かめているところでした','カンファレンスで、担当の患者の経過を報告しているところでした','医局で、冷めたコーヒーを片手にカルテを書いているところでした','患者の家族に、手術の説明をしているところでした'],
    or:['手術室で、モニターを確認しながら手術を進めているところでした','手術を終え、手術着のまま家族に結果を説明しに向かうところでした'],
    univ:['教授回診の列の後ろについて、病棟を回っているところでした','学会の発表スライドを、医局の机で直しているところでした','医学部の学生に、聴診のコツを教えているところでした'],
    night:['当直室の仮眠ベッドで、院内の電話の呼び出しに飛び起きたところでした','当直の夜、病棟から呼ばれて患者の様子を見に行くところでした'],er:['救急外来で、CTの画像を見ながら次の指示を出しているところでした','当直の夜、救急車で運ばれてきた患者を診ているところでした'],
    psych:['診察室で、患者の話を急かさずに聞いているところでした'],birth:['分娩室で、赤ちゃんが生まれるのを待っているところでした'],dental:['口腔外科の診察台で、親知らずの抜歯を始めたところでした','歯のレントゲン写真を見せながら、治療の計画を説明しているところでした']},
   resident:['研修医として、指導医のあとについて病棟を回っているところでした','当直で、指導医に電話で相談しながら救急の患者を診ているところでした','カルテを書きながら、昼ごはんを食べ損ねたことに気づいたところでした','採血に2回失敗し、指導医に代わってもらったところでした'],
   student:['臨床実習で、白衣のポケットのメモ帳に教授の話を書き取っているところでした','病棟の実習で、担当の患者に話を聞かせてもらっているところでした','手術見学で、術野がよく見える場所を探して背伸びしているところでした'],
   midwife:['分娩室で、陣痛の間隔を測りながら妊婦の腰をさすっているところでした','産後の母親に、赤ちゃんの抱き方を教えているところでした','新生児室で、赤ちゃんの体重を測っているところでした'],
   pharmacist:['薬剤部で、処方どおりに錠剤をそろえているところでした','病棟で、入院中の患者に薬の飲み方を説明しているところでした','抗がん剤の調製で、安全キャビネットの中に手を入れているところでした'],
   lab:['検査室で、届いた血液の検体を分析装置にセットしているところでした','心電図の検査で、患者の胸に電極を貼っているところでした','エコーの検査で、患者のおなかにゼリーを塗ったところでした'],
   radiology:['CT室で、患者に「息を止めてください」と声をかけたところでした','レントゲン室で、撮影の位置を合わせているところでした','MRIの検査の前に、患者が金属を身に着けていないか確かめているところでした'],
   pt:['平行棒につかまって歩く患者に、「あと一往復です」と声をかけたところでした','膝の手術を受けた患者の脚を、ゆっくり曲げ伸ばししているところでした'],ot:['作業療法室で、患者と一緒に洗濯ばさみをつまむ練習をしているところでした'],st:['脳梗塞の患者と、ゆっくり発音する練習をしているところでした','飲み込みの検査で、とろみをつけた水を少しずつ飲んでもらっているところでした'],
   engineer:['透析室で、透析の装置を一台ずつ準備しているところでした','人工呼吸器の点検で、回路を一つずつ確かめているところでした'],
   clerk:['外来の受付で、初診の患者に問診票を渡したところでした','会計の窓口で、診療明細書を患者に手渡したところでした','月初めのレセプトの点検で、画面の数字とにらめっこしているところでした','電話で、診察の予約の変更を受け付けているところでした'],clerkNight:['夜間の救急受付で、保険証を預かっているところでした'],
   aide:['病棟で、シーツの交換をして回っているところでした','車いすの患者を、検査室まで送っているところでした','病室を回り、食事の下膳をしているところでした'],
   kitchen:['病院の厨房で、治療食ごとに分けた配膳車に食事を載せているところでした','厨房で、刻み食とミキサー食をそれぞれの器に盛りつけているところでした'],dietitian:['病棟で、入院中の患者に食事の量や好みを聞いて回っているところでした'],
   clean:['病棟の廊下を、モップで拭き上げているところでした','手術室の清掃で、床を消毒液で拭いているところでした','外来のトイレを、決まった時間どおりに点検しているところでした'],
   guard:['正面玄関で、来院者に受付の場所を案内したところでした','救急車の入口で、誘導灯を振っているところでした'],guardNight:['夜間通用口で、出入りする人の名前を記録しているところでした','夜の病院を、懐中電灯を手に巡回しているところでした']}};

 const JOB={nurse:'看護師',doctor:'医師',resident:'医師',pharmacist:'薬剤師',lab:'臨床検査技師',clerk:'医療事務',aide:'看護助手',clean:'ビル清掃員',guard:'警備員'};
 function assign(c,P){if(!c.role?.startsWith('hosp_'))return false;let k=c.role.slice(5);
  if(c.hospStaff){let label=c.label;if(k==='rehab'){let r=pickW([['理学療法士',.6],['作業療法士',.3],['言語聴覚士',.1]]);label=r}else if(k==='kitchen')label=rnd()<.3?'管理栄養士':'病院の調理員';
   let job=JOB_OBJS.find(j=>j.n===(JOB[k]||label));P.occ={label,group:'adult',cat:job?.cat||'専門',tag:job?.tag||'medical',job,kind:'employed',p:1};P.hospRole=k==='rehab'?{理学療法士:'pt',作業療法士:'ot',言語聴覚士:'st'}[label]:k==='kitchen'&&label==='管理栄養士'?'dietitian':k;return true}
  if(k==='student'){P.occ={label:'医学部'+(P.age>=24?6:5)+'年生',group:'college',cat:'student',kindLabel:'所属',p:1};return true}
  if(['facility','prison'].includes(P.occ.group))P.occ={label:'無職',group:P.age>=65?'senior':'adult',cat:'none',p:1};return true}

 // Draws the case after the base health (妊娠・産後・発熱 decided before the scene) and fits the two together.
 function drawCase(c,P,t,H){let kind=c.hospCase,hb=P.hb||{};if(kind==='check')return {kind,dept:null};
  if(kind==='dialysis')return {kind,dept:'j',name:'人工透析',k:'chronic',known:true};
  if(kind==='er'){if(hb.bed)return {kind,dept:P.age<15?'p':'i',fever:true};let x=caseOf(ER_CASES.map(e=>[e[0],e[1],(a,s)=>e[2](a,s,t)]),P);return {kind,dept:'er',name:x?.[0]||'急性胃腸炎',k:x?.[1]||'acute'}}
  if(kind==='out'){
   // Fever and pregnancy come first: someone feverish goes to the fever clinic, a pregnant woman to her check-up.
   if(hb.bed&&(H.depts.includes('i')||H.depts.includes('p')))return {kind,dept:P.age<15&&H.depts.includes('p')?'p':'i',fever:true};
   if(hb.preg&&H.depts.includes('g')&&rnd()<.75)return {kind,dept:'g',pregCheck:true};
   let dept=deptPick(H,P,OUT_DEPT,'out');if(dept==='L')dept='i';if(dept==='j'&&rnd()<.5)return {kind:'dialysis',dept:'j',name:'人工透析',k:'chronic',known:true};
   // Cancer centres mostly see people in cancer treatment, whatever the department.
  if(H.type==='cancer'&&rnd()<.75)return {kind,dept:dept==='i'?'z':dept,name:'がんの治療中',k:'chronic'};
  let x=caseOf(OUTC[dept]||OUTC.i,P);return {kind,dept,name:x?.[0],k:x?.[1]||'acute'}}
  // In-patients: someone already pregnant or just delivered stays on the maternity ward when the hospital has one.
  if(hb.bed)hb.bed=null;
  let dept=hb.preg&&H.depts.includes('g')?'g':deptPick(H,P,IN_DEPT,'in'),list=INC[dept]||INC.i;
  if(dept==='g'&&hb.preg)list=list.filter(x=>x[0]==='@preterm');else if(dept==='g')list=list.filter(x=>x[0]!=='@preterm');
  if(H.type==='cancer'&&!hb.preg&&rnd()<.8){let c=[['胃がん','chronic',(a)=>1,1,[8,14],'s'],['大腸がん','chronic',(a)=>1,1,[8,14],'s'],['肺がん','chronic',(a)=>1,1,[7,14],'r'],['乳がん','chronic',(a,s)=>s==='f'?1.5:0,1,[5,10],'s'],...INC.z.map(x=>[...x,'z'])],x=caseOf(c,P);dept=x[5];list=[x]}
  let x=caseOf(list,P)||caseOf(INC.i,P)||INC.i[0];if(hb.preg&&x[1]!=='preg'){hb.preg=0;hb.pregD=null;hb.leave=false}
  if(x[1]!=='pp'&&hb.pp>=0&&hb.pp<1&&dept!=='g')hb.pp=-1;
  // A delivery means 産後 in the base status too; a threatened preterm birth needs a pregnancy of 22-36 weeks.
  if(x[1]==='pp'){hb.pp=0;hb.ppP=hb.ppP||.01;hb.mens=0;hb.preg=0;if(P.occ.job&&P.occ.kind!=='self')hb.leave=true}
  if(x[1]==='preg'&&!(hb.pregD>=154&&hb.pregD<=251)){hb.pregD=154+Math.floor(rnd()*98);hb.preg=Math.floor(hb.pregD/7)}
  return {kind,dept,name:x[0],k:x[1],op:!!x[3],...days(x[4])}}
 function sceneIn(P,cs,H,t){let h=t.hf??t.h,ward=S.ward,ic=S.inCase,k=cs.name;
  if(h>=21.5||h<6)return {text:pick(ward.night),state:'sleep'};
  let special=k==='@birth'||k==='@cesarean'?ic.birth:k==='@preterm'?ic.preterm:cs.dept==='m'?ic.psych:cs.dept==='L'?ic.longterm:P.age<13?(P.age>=6&&t.dow>0&&t.dow<6&&h>=9&&h<15&&rnd()<.4?ic.school:ic.kid):/がん/.test(k)?ic.cancer:/脳梗塞|脳出血|くも膜下/.test(k)?ic.stroke:cs.op&&cs.days<=2?ic.opEarly:cs.op&&['o','h'].includes(cs.dept)||/femur/.test(k)?ic.ortho:cs.op?ic.op:null;
  if(special&&rnd()<(['m','L'].includes(cs.dept)?.85:.6))return {text:pick(special),state:'off'};
  let slot=h<7.5?'early':h<8.5||h>=12&&h<13||h>=18&&h<19?'meal':h<12?'morning':h<18?(rnd()<.35?'visit':'afternoon'):'evening';return {text:pick(ward[slot]),state:'off'}}
 function sceneOut(P,cs,H,t){let h=t.hf??t.h;if(cs.kind==='check')return pick(S.check);
  if(cs.kind==='dialysis')return pick(S.cond['人工透析']);
  if(cs.fever)return pick(S.fever);
  if(cs.pregCheck)return pick(['妊婦健診のエコーで、モニターに映る赤ちゃんの動きを見ているところでした','妊婦健診で、お腹まわりと体重を測ってもらっているところでした','妊婦健診の待合で、母子手帳を開いて次の健診日を書き込んでいるところでした']);
  if(cs.kind==='er')return pick([...(S.erCase[cs.name]||[]),...S.er]);
  let phase=pickW(h<9?[['open',.3],['reception',.5],['wait',.2]]:h<10.5?[['reception',.3],['wait',.3],['test',.2],['exam',.2]]:h<13?[['wait',.3],['test',.2],['exam',.35],['pay',.15]]:[['wait',.2],['test',.15],['exam',.35],['pay',.3]]);
  if(phase==='exam'){let own=S.cond[cs.name];return pick(own&&rnd()<.6?own:S.exam[cs.dept]||S.exam.i)}
  return pick(S[phase])}
 function staffScene(c,P,t,H){let h=t.hf??t.h,k=P.hospRole||c.role.slice(5),T=S.staff,hol=holiday(t)||t.dow===6,day=h>=8.5&&h<17.5&&!hol,night=h>=21||h<7;
  if(k==='nurse'){let n=T.nurse,o=[[n.ward,3]];if(night)o=[[n.night,4],[n.ward,1]];else if(h>=8&&h<9||h>=16.5&&h<17)o.push([n.handover,2]);
   if(day&&H.type!=='longterm'&&H.type!=='psych')o.push([n.outpatient,2]);if(H.big&&!night)o.push([n.or,1],[n.icu,1]);if(H.er)o.push([n.er,night?2:1]);if(H.type==='psych')o.push([n.psych,4]);if(H.type==='child'||H.depts.includes('p')&&rnd()<.2)o.push([n.child,1]);if(H.type==='longterm')o.push([n.longterm,3]);if(H.depts.includes('j')&&!night)o.push([n.dial,.5]);return pick(pickW(o))}
  if(k==='doctor'){let d=T.doctor,o=[[d.ward,3]];if(night)o=[[d.night,3]];else{if(day)o.push([d.out,3]);if(H.type!=='psych'&&H.type!=='longterm'&&H.type!=='rehab')o.push([d.or,1.5]);if(H.type==='univ')o.push([d.univ,2]);if(H.type==='psych')o.push([d.psych,3]);if(H.depts.includes('g'))o.push([d.birth,.6]);if(H.type==='dental')o=[[d.dental,4]]}if(H.er&&(night||hol||h>=17.5))o.push([d.er,3]);return pick(pickW(o))}
  if(k==='clerk')return pick(night||hol&&h>=13?T.clerkNight:T.clerk);
  if(k==='guard')return pick(night?T.guardNight:T.guard);
  return pick(T[k]||T.aide)}
 function apply(c,P,t){if(!c.role?.startsWith('hosp_'))return false;let k=c.role.slice(5),f=c.facility||{},H=info(f),h=t.hf??t.h,text,state='off',label=c.label;
  if(c.hospStaff){text=staffScene(c,P,t,H);state='work';label=P.occ.label}
  else if(k==='student'){text=pick(S.staff.student);state='school'}
  else if(k==='visitor'){let birth=H.depts.includes('g')&&['maternity','univ','general'].includes(H.type)&&rnd()<(H.type==='maternity'?.8:.1);text=pick(birth?S.visitorBirth.filter(x=>P.age>=45||!/孫/.test(x)):h>=19?[...S.visitor,...S.visitorEnd]:S.visitor)}
  else if(k==='companion'){let er=H.er&&(h>=17.5||h<8.5||holiday(t));text=pick(er?S.companion.er:H.type==='child'||P.age<45&&rnd()<.5?S.companion.kid:S.companion.old)}
  else{let cs=drawCase(c,P,t,H);P.hospCase=cs;let dept=cs.dept&&DEPT[cs.dept];
   if(cs.kind==='in'){let s=sceneIn(P,cs,H,t);text=s.text;state=s.state;label='入院中'+(dept&&cs.dept!=='L'?'（'+dept+'）':'')}
   else{text=sceneOut(P,cs,H,t);label=cs.kind==='check'?'人間ドック・健診':cs.kind==='dialysis'?'透析中':cs.kind==='er'?'救急外来':cs.fever?'発熱外来':'外来（'+(dept||'内科')+'）'}}
  P.mapSituation=text;P.visitLabel=label;P.sit={...P.sit,text,state,stateLabel:label,p:1,source:'hospital'};return true}

 // ---- Health: the drawn case becomes a health item; the rest of the status (持病・花粉症 ...) stays as drawn. ----
 const ORD={preg:0,pp:0,bed:1,cold:1,acute:1,mens:1,injury:2,chronic:3,allergy:4,pollen:5};
 const pct=x=>x>=.1?`約${Math.round(x*100)}%`:x>=.01?`約${(x*100).toFixed(1)}%`:`約${(x*100).toFixed(2)}%`;
 function caseItem(P,cs){let n=cs.name,k=cs.k;if(!n||k==='none')return null;
  if(n==='@cold')return {n:'風邪気味',k:'cold',p:.05};
  let base={'@wrist':`${side()}手首の骨折（ギプス中）`,'@ankle':`${side()}足首のねんざ`,'@ankleFx':`${side()}足首の骨折`,'@femur':'大腿骨の骨折','@femurRehab':'大腿骨の骨折','@arm':`${side()}腕の骨折`}[n]||n;
  let rate=(typeof chronicRate==='function'&&chronicRate(base,P))||(cs.kind==='in'?(P.age>=75?.006:P.age>=65?.003:.001):.005);
  if(cs.kind!=='in')return {n:base,base,k,p:rate};
  let m=cs.months,stay=m?(m>=12?`入院して${Math.floor(m/12)}年${m%12?m%12+'か月':''}`:`入院して${m}か月`):`入院${cs.days}日目`,text=/治療$|切除$|抜歯$/.test(base)?`${base}のため入院中（${stay}）`:cs.op?`${base}の手術後（${stay}）`:/後遺症|手術後|治療中|ケア|教育入院|人工関節|抜歯/.test(base)?`${base}（${stay}）`:`${base}で入院中（${stay}）`;
  if(n==='@femurRehab')text=`大腿骨の骨折の手術後（リハビリで${stay}）`;
  return {n:text,base:base.replace(/（.*$/,''),k:k==='preg'||k==='pp'?'acute':k,p:rate}}
 function health(P,t){let cs=P.hospCase;if(!cs||!P.health)return;let items=[...(P.health.items||[])],H=P.hb||{},lead=null;
  if(cs.kind==='in'&&(cs.name==='@birth'||cs.name==='@cesarean')){let d=cs.days;items=items.filter(i=>i.k!=='pp');items.unshift({n:`${cs.name==='@cesarean'?'帝王切開で出産':'出産'}のため入院中（産後${d}日目）`,base:'出産後の入院',k:'pp',p:(typeof birthRate==='function'?birthRate(P):.05)*.012||.001,who:typeof birthWho==='function'?birthWho(P):undefined})}
  else if(cs.kind==='in'&&cs.name==='@preterm'){items.unshift({n:`切迫早産で入院中（${cs.days}日目）`,base:'切迫早産',k:'acute',p:.002})}
  else if(!cs.fever&&!cs.pregCheck){let it=caseItem(P,cs);if(it){let same=items.findIndex(i=>i.n===it.base||i.base===it.base||i.n===it.n);if(same>=0)items.splice(same,1);if(it.k==='cold'&&items.some(i=>i.k==='cold'||i.k==='bed'))it=null;if(it){items.unshift(it);lead=it}}}
  // In-patients do not carry an unrelated fresh injury; their stay already explains the status.
  if(cs.kind==='in')items=items.filter((i,ix)=>ix===0||i.k!=='injury');
  items.sort((x,y)=>(ORD[x.k]??3)-(ORD[y.k]??3));
  // The reason for the stay leads the list.
  // The reason for the visit or stay leads the list (after a pregnancy or fever that drew the visit).
  if(cs.kind==='in'){let first=items.findIndex(i=>/入院/.test(i.n));if(first>0)items.unshift(items.splice(first,1)[0])}
  else if(lead&&items[0]!==lead&&!['preg','pp','bed'].includes(items[0].k))items.unshift(items.splice(items.indexOf(lead),1)[0]);
  let shown=items.slice(0,3),text=items.length?shown.map(i=>i.n).join('、')+(items.length>3?'ほか':''):'特になし',p=items.length?items.reduce((s,i)=>s*Math.min(1,Math.max(i.p,1e-4)),1):P.health.p,grp=typeof grpLabel==='function'?grpLabel(P):'';
  let note=items.length?shown.slice(0,2).map(i=>`${(i.base||i.n).replace(/（.*$/,'')}は${i.who||grp}の${pct(i.p)}`).join('、'):P.health.note;
  P.health={...P.health,items,text,p,note}}
 return {roles,assign,apply,health,info,drawCase,caseItem,DEPT};
})();
if(typeof module!=='undefined')module.exports=HospitalModel;
