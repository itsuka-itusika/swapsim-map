/* Occupancy, demographics and schedules below are game assumptions, not actual staffing or custody counts. */
const CivicModel=(()=>{
 const kinds=['prison','detention','military','government','parliament'];
 const kind=c=>['police','courthouse','fire_station'].includes(c.tags?.amenity)?null:kinds.includes(c.civicKind||c.subtype)?c.civicKind||c.subtype:null;
 const texts={custody_read:'居室で本を読んでいるところでした',custody_sleep:'居室で眠っているところでした',custody_meal:'居室で食事をしているところでした',prison_work:'刑務作業に取り組んでいるところでした',officer:'処遇記録を確認しているところでした',counsel:'接見に向けて書類を整理しているところでした',meeting:'面会の受付を待っているところでした',medical:'診療の記録を確認しているところでした',admin:'事務書類を整理しているところでした',guard:'庁舎内を巡回しているところでした',clean:'共用部分を清掃しているところでした',training:'体力づくりの運動をしているところでした',defense_office:'業務資料をまとめているところでした',maintenance:'整備記録を確認しているところでした',supply:'備品の在庫を確認しているところでした',barracks:'隊舎で休んでいるところでした',sleep:'隊舎で眠っているところでした',policy:'政策資料を読み込んでいるところでした',technical:'技術資料を照合しているところでした',counter:'申請書類を確認しているところでした',consult:'窓口で手続きの相談をしているところでした',member:'審議に向けて資料を読んでいるところでした',secretary:'議員の日程を調整しているところでした',diet_staff:'会議資料を準備しているところでした',reporter:'取材メモを整理しているところでした',tour:'見学の説明に耳を傾けているところでした'};
 function roles(c,t){let k=kind(c);if(!k)return null;let h=t.hf??t.h,we=t.dow===0||t.dow===6||t.holiday,day=h>=9&&h<17,night=h>=22||h<6,work=day&&!we,late=!we&&h>=17&&h<21;
 let area=c.area||c.areaM2||10000,scale=Math.max(.05,area/10000),out=[];
 const add=(key,label,n,min,max,female,scene,extra={})=>out.push({role:'civic_'+key,label,w:n,min,max,female,civicScene:scene,civicWorker:true,...extra});
 if(k==='prison'||k==='detention'){
  let count=Number(c.modeledOccupancy)||Math.min(2200,area*.018),prison=k==='prison',meal=h>=7&&h<8||h>=12&&h<13||h>=17&&h<18;
  add(prison?'sentenced':'untried',prison?'受刑者（刑務所で服役中）':'未決拘禁者（拘置所に収容中）',count*(prison?1:.94),18,84,c.custodyFemale??.12,night?'custody_sleep':meal?'custody_meal':work&&prison?'prison_work':'custody_read',{civicWorker:false,custody:true,custodyStatus:prison?'sentenced':'untried'});
  if(!prison)add('sentenced','受刑者（移送待ち等で拘置所に収容中）',count*.06,18,84,c.custodyFemale??.12,night?'custody_sleep':meal?'custody_meal':'custody_read',{civicWorker:false,custody:true,custodyStatus:'sentenced'});
  add('officer','刑務官',count*(day?.22:.07),20,64,.22,'officer');add('custody_admin','矯正施設の事務官',work?count*.025:0,22,64,.5,'admin');add('custody_medical','矯正施設の医療職員',day?count*.012:count*.002,24,69,.55,'medical');
  add('counsel','弁護士',work?count*.018:0,25,79,.35,'counsel');add('meeting','面会に来た家族・知人',work?count*.02:0,18,84,.55,'meeting',{civicWorker:false,visitor:true});
 }else if(k==='military'){
  let base=Math.min(4500,Math.max(80,area*.012)),office=/市ヶ谷|目黒|十条|用賀/.test(c.name||'');
  add('defense_office','自衛官（事務・教育業務）',base*(work?(office?.45:.18):late?.09:.025),20,60,.15,'defense_office');
  add('training','自衛官',work?base*(office?.03:.28):0,18,54,.12,'training');add('maintenance','自衛官（整備業務）',work?base*.1:0,18,59,.1,'maintenance');add('supply','自衛官（補給・輸送業務）',work?base*.1:0,18,59,.12,'supply');
  add('defense_admin','防衛省の事務官・技官',work?base*.18:late?base*.02:0,22,65,.35,'defense_office');add('barracks','自衛官',base*(work?.015:night?.22:.16),18,54,.12,night?'sleep':'barracks',{civicWorker:false});
  add('defense_medical','自衛隊の医療職員',work?base*.02:base*.003,24,64,.5,'medical');add('defense_duty','自衛官（当直勤務）',base*.025,18,59,.12,'defense_office');
 }else if(k==='government'){
  let base=scale*(work?220:late?45:day?18:4),local=/都庁|都議会|区役所|出張所|市役所/.test(c.name||'');
  add('policy',local?'地方公務員（行政事務）':'国家公務員（行政事務）',base*.55,22,65,.45,'policy');add('technical',local?'地方公務員（技術職）':'国家公務員（技術職）',base*.2,22,65,.3,'technical');add('counter','行政窓口の担当職員',work?base*.1:0,20,65,.6,'counter');add('consult','手続き・相談に来た人',work?base*.12:0,18,89,.5,'consult',{civicWorker:false,visitor:true});
 }else{
  let base=scale*(work?160:late?30:day?18:2);
  add('member_lower','衆議院議員',work?base*.018:late?base*.008:0,25,79,.25,'member');add('member_upper','参議院議員',work?base*.012:late?base*.005:0,30,79,.3,'member');add('secretary','国会議員の秘書',work||late?base*.16:0,22,74,.4,'secretary');add('diet_staff','国会職員',base*.52,22,65,.45,'diet_staff');add('reporter','国会担当の報道記者',work||late?base*.06:0,22,69,.4,'reporter');add('tour','国会の見学者',day?base*.2:0,10,84,.5,'tour',{civicWorker:false,visitor:true});
 }
 add('guard',k==='parliament'?'衛視':k==='military'?'駐屯地の施設管理職員':'庁舎の警備員',Math.max(1,scale*(day?2:.7)),20,69,.2,k==='military'?'maintenance':'guard');add('clean','施設の清掃スタッフ',day?scale*3:0,20,74,.55,'clean');return out;
 }
 function assign(c,P){if(!c.role.startsWith('civic_'))return;if(c.visitor){if(['facility','prison'].includes(P.occ.group))P.occ={label:'無職',group:P.age>=65?'senior':'adult',cat:'none',p:1};return}P.occ={label:c.label,group:c.custody?'custody':'adult',cat:c.custody?'custody':'special',kind:c.custody?'institution':'employed',p:1};}
 function apply(c,P,t){if(!c.role.startsWith('civic_'))return;let pool=typeof MAP_DATA!=='undefined'?MAP_DATA.storyScenes?.civic?.[c.civicScene]:null;let text=pool?.length?pool[Math.floor(rnd()*pool.length)]:texts[c.civicScene];P.mapSituation=text;P.visitLabel=c.label;P.sit={text,state:['custody_sleep','sleep'].includes(c.civicScene)?'sleep':c.civicWorker?'work':'off',stateLabel:c.label,p:1};if(c.custody){P.custodyStatus=c.custodyStatus;P.household={label:'施設等の世帯（一般世帯統計の対象外）',marital:'未抽選',code:null};} }
 return {kind,roles,assign,apply,texts};
})();
if(typeof module!=='undefined')module.exports=CivicModel;
