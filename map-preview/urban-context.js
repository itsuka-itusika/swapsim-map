/* Additional occupational and visitor layers use existing swapsim scenes wherever eligible. */
const UrbanContext=(()=>{
 const specs=[
 ['government','official','行政機関の職員',650,22,65,.5,'office'],['politics','political','議員事務所の職員',100,22,69,.5,'office'],['legal','legal','法律事務所の職員',240,22,69,.5,'office'],['international','international','国際業務の会社員',300,22,65,.5,'office'],['research','research','研究職',450,24,69,.4,'research'],['medical','medical_admin','医療事務職',170,22,65,.7,'office'],['publishing','editor','編集者',220,22,69,.5,'office'],['specialty','specialty_shop','専門店の販売員',160,20,69,.5,'retail'],['wholesale','wholesale','卸売業の勤務者',220,20,69,.4,'sales'],['market','market','市場の卸売・仲卸の勤務者',380,20,69,.3,'warehouse'],['culture','museum','文化施設の職員',65,22,69,.5,'office'],['theater','theater','劇場の運営スタッフ',75,20,65,.5,'office'],['sports','sports','スポーツ施設の運営スタッフ',65,20,65,.5,'gym'],['temple','temple','寺院の職員',22,22,74,.4,'office'],['shrine','shrine','神社の職員',22,22,74,.5,'office'],['hotel','hotel','ホテルの従業員',180,20,65,.5,'hotel'],['books','books','書店員',120,20,69,.5,'retail'],['arcade','local_shop','商店街の店員',160,20,74,.5,'retail']];
 const visitors=[['culture',65,6,84],['theater',80,12,79],['sports',90,12,79],['temple',80,6,89],['shrine',80,6,89],['books',130,14,89],['specialty',110,16,84],['market',50,16,84],['waterfront',90,6,89],['senior_town',190,65,89],['lifestyle',110,16,79],['arcade',150,6,89],['multicultural',100,16,79]];
 function activity(tag,t,visitor=false){let h=t.hf??t.h,we=t.dow===0||t.dow===6||t.holiday;
 if(tag==='market'&&visitor)return h>=5&&h<15?1:0;
 if(tag==='market'||tag==='wholesale')return h>=4&&h<12?1:h>=12&&h<16?.4:h>=1&&h<4?.15:0;
 if(tag==='hotel')return h>=7&&h<23?1:.2;
 if(tag==='theater')return h>=12&&h<22?(we?1.2:1):0;
 if(tag==='sports')return h>=9&&h<21?(we?1.4:1):0;
 if(tag==='temple'||tag==='shrine'||tag==='waterfront')return h>=7&&h<17?(we?1.2:1):0;
 if(['culture','specialty','books','arcade','lifestyle','senior_town','multicultural'].includes(tag))return h>=10&&h<18?(we?1.3:1):h>=18&&h<20?.2:0;
 return h>=9&&h<18?(we?.12:1):h>=7&&h<21?.12:.015;
 }
 function roles(c,t){let out=[];for(let [tag,key,label,density,min,max,female,jobTag]of specs){let w=c[9]?.[tag]||0;if(w<.15)continue;let n=w*density*activity(tag,t);if(n)out.push({role:'urban_'+key,label,density:n,min,max,female,jobTag,urbanTag:tag})}for(let [tag,density,min,max]of visitors){let w=c[9]?.[tag]||0,n=w*density*activity(tag,t,true);if(n)out.push({role:'urban_visit',label:MeshAttributes.definitions[tag][0]+'の来訪者',density:n,min,max,female:.5,urbanTag:tag})}return out}
 function assign(c,P){if(!c.role.startsWith('urban_'))return;if(c.role==='urban_visit'){if(['facility','prison'].includes(P.occ.group))P.occ={label:'無職',group:'adult',cat:'none',p:1};
  // Business visitors to an office hold a job themselves.
  if(c.urbanTag==='office'&&(P.occ.group!=='adult'||P.occ.cat==='none')){let jobs=JOB_OBJS.filter(j=>['office','it','sales'].includes(j.tag)&&P.age>=(j.o.amin||22)),job=jobs[Math.floor(rnd()*jobs.length)];if(job)P.occ={label:job.n,group:'adult',cat:job.cat,tag:job.tag,job,kind:'employed',p:1};}return;}let job=c.jobName&&JOB_OBJS.find(j=>j.n===c.jobName)||JOB_OBJS.find(j=>j.tag===c.jobTag);P.occ={label:c.label,group:'adult',cat:'special',tag:c.jobTag,job,kind:'employed',p:1}}
 const fallback={research:'研究資料に目を通しているところでした',market:'商品の数量と伝票を確認しているところでした',museum:'館内の展示案内を確認しているところでした',theater:'公演の準備状況を確認しているところでした',sports:'利用者に施設の使い方を案内しているところでした',temple:'境内の案内をしているところでした',shrine:'参拝者の案内をしているところでした',visit:'案内板を見ながら、次に向かう場所を確認しているところでした'};
 // Map-only workers whose scenes the original pools do not cover.
 const special={maidcafe:['「おかえりなさいませ」と、常連のお客さんを迎えたところでした','オムライスに、ケチャップでハートの絵を描いているところでした','ドリンクに「おいしくなる魔法」をかけているところでした','駅前の通りで、お店のチラシを配っているところでした','チェキの撮影で、お客さんと一緒にポーズを決めたところでした']};
 // Visitors to hospitals, schools, offices and public buildings are there on that place's business, not shopping.
 const visitScenes={medical:['入院している家族の着替えを、病棟に届けたところでした','診察を待つ家族に付き添い、待合室で番号の表示を見ているところでした','会計の窓口で、名前を呼ばれるのを待っているところでした','お見舞いの花を手に、面会の受付で名前を書いているところでした','院内の売店で、入院中の家族に頼まれた飲み物を買っているところでした'],
  school:['子どもの忘れ物を届けに、学校の受付に寄ったところでした','保護者会の資料を受け取り、教室の後ろの席に座ったところでした','授業参観で、教室の後ろから子どもの様子を見ているところでした','事務室の窓口で、提出書類を渡したところでした'],
  kinder:['お迎えの時間になり、園の門の前で子どもが出てくるのを待っているところでした','園の先生から、今日の子どもの様子を聞いているところでした','送迎の自転車に子どもを乗せ、ヘルメットの留め具を締めたところでした'],
  campus:['公開講座の受付で、名前を告げたところでした','構内の地図を見ながら、打ち合わせのある建物を探しているところでした','学内のカフェで、待ち合わせの相手を待っているところでした'],
  government:['窓口の番号札を取り、呼ばれるのを待っているところでした','記入台で、住民票の請求書を書いているところでした','手続きの書類を、窓口の職員と一緒に確かめているところでした'],
  office:['受付で入館証を受け取り、エレベーターを待っているところでした','打ち合わせの相手に、名刺を差し出したところでした','会議室に通され、資料を机に並べているところでした']};
 function apply(c,P,t){if(!c.role.startsWith('urban_'))return false;if(c.role==='urban_visit'){let k=c.urbanTag==='school'?(c.facility?.kind==='kindergarten'?'kinder':['university','college'].includes(c.facility?.kind)?'campus':'school'):c.urbanTag,pool=visitScenes[k];if(k==='kinder')pool=pool.filter(x=>(t.hf??t.h)<12?/送迎/.test(x):!/送迎/.test(x));if(pool?.length){let text=pool[Math.floor(rnd()*pool.length)];P.mapSituation=text;P.visitLabel=c.label;P.sit={text,state:'off',stateLabel:c.label,p:1,source:'supplement'};return true}}if(special[c.role.slice(6)]){let pool=special[c.role.slice(6)],text=pool[Math.floor(rnd()*pool.length)];P.mapSituation=text;P.visitLabel=c.label;P.sit={text,state:'work',stateLabel:c.label,p:1,source:'supplement'};return true}let h=t.hf??t.h,hol=holName(t),ctx={P,t,h,we:t.dow===0||t.dow===6||!!hol,hol,brk:isBreak(t),mo:t.mo,vacP:false,vac:false,season:seasonOf(t.mo),wx:wxOf(P.pref,t),eq:eqOf(P.pref,t)},visit=c.role==='urban_visit',kind=c.role.slice(6),pool=visit?Object.values(OFF_TX).flat():WORK_TX[P.occ.tag]||[],re=visit?{books:/書店|古本|本屋/,culture:/美術館|博物館|展示/,theater:/劇場|観劇|舞台/,sports:/体育館|スポーツ施設/,temple:/寺|参拝|境内/,shrine:/神社|参拝|境内/,waterfront:/川沿い|遊歩道|水辺/,specialty:/買い物|買物|店で/,arcade:/商店街|買い物|店で/,senior_town:/商店街|買い物|散歩/}[c.urbanTag]||/買い物|店で|街を/:null;
 let pk=fromPool(pool,ctx,e=>(!re||re.test(textOf(e)))&&!/自宅|在宅|家で|満員のスタジアム|試合を観戦/.test(textOf(e))&&!(typeof PersonContext!=='undefined'&&PersonContext.away(textOf(e),c))&&!(kind==='temple'||kind==='shrine'||kind==='museum'||kind==='theater'||kind==='sports'));
 let scenePool=typeof MAP_DATA!=='undefined'?MAP_DATA.storyScenes?.urban?.[kind]||visit&&MAP_DATA.storyScenes?.urban?.visit:null;let text=pk?fillText(textOf(pk.e),P):scenePool?.length?scenePool[Math.floor(rnd()*scenePool.length)]:fallback[kind]||(visit?fallback.visit:(()=>{let p=MAP_DATA.timeSituations[h>=12&&h<13?'work_lunch':'office_work'];return p[Math.floor(rnd()*p.length)]})());
 if(!text)text=MAP_DATA.timeSituations.office_work[0];P.mapSituation=text;P.visitLabel=c.label;P.sit={text,state:visit?'off':'work',stateLabel:c.label,p:1,source:pk?'swapsim':'supplement'};return true}
 return {roles,assign,apply,fallback};
})();
if(typeof module!=='undefined')module.exports=UrbanContext;

