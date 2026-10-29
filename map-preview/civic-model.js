/* Occupancy, demographics and schedules below are game assumptions, not actual staffing or custody counts. */
const CivicModel=(()=>{
 const kinds=['prison','detention','military','government','parliament','court','juvenile','immigration'];
 const kind=c=>['police','courthouse','fire_station'].includes(c.tags?.amenity)?null:kinds.includes(c.civicKind||c.subtype)?c.civicKind||c.subtype:null;
 const texts={custody_read:'居室で本を読んでいるところでした',custody_sleep:'居室で眠っているところでした',custody_meal:'居室で食事をしているところでした',prison_work:'刑務作業に取り組んでいるところでした',officer:'処遇記録を確認しているところでした',counsel:'接見に向けて書類を整理しているところでした',meeting:'面会の受付を待っているところでした',medical:'診療の記録を確認しているところでした',admin:'事務書類を整理しているところでした',guard:'庁舎内を巡回しているところでした',clean:'共用部分を清掃しているところでした',training:'体力づくりの運動をしているところでした',defense_office:'業務資料をまとめているところでした',maintenance:'整備記録を確認しているところでした',supply:'備品の在庫を確認しているところでした',barracks:'隊舎で休んでいるところでした',sleep:'隊舎で眠っているところでした',policy:'政策資料を読み込んでいるところでした',technical:'技術資料を照合しているところでした',counter:'申請書類を確認しているところでした',consult:'窓口で手続きの相談をしているところでした',member:'審議に向けて資料を読んでいるところでした',secretary:'議員の日程を調整しているところでした',diet_staff:'会議資料を準備しているところでした',reporter:'取材メモを整理しているところでした',tour:'見学の説明に耳を傾けているところでした'};
 function roles(c,t){let k=kind(c);if(!k)return null;if(typeof DietModel!=='undefined'){let diet=DietModel.roles(c,t);if(diet)return diet}let h=t.hf??t.h,we=t.dow===0||t.dow===6||t.holiday,day=h>=9&&h<17,night=h>=22||h<6,work=day&&!we,late=!we&&h>=17&&h<21;
 let area=c.area||c.areaM2||10000,scale=Math.max(.05,area/10000),out=[];
 const add=(key,label,n,min,max,female,scene,extra={})=>out.push({role:'civic_'+key,label,w:n,min,max,female,civicScene:scene,civicWorker:true,...extra});
 if(k==='prison'||k==='detention'){
  let count=Number(c.modeledOccupancy)||Math.min(2200,area*.018),prison=k==='prison',meal=h>=7&&h<8||h>=12&&h<13||h>=17&&h<18;
  add(prison?'sentenced':'untried',prison?'受刑者（刑務所で服役中）':'未決拘禁者（拘置所に収容中）',count*(prison?1:.94),18,84,c.custodyFemale??.12,prison?'sentenced':'untried',{civicWorker:false,custody:true,custodyStatus:prison?'sentenced':'untried'});
  // Sentenced people kept at a detention house do its kitchen, laundry and cleaning work (経理作業).
  if(!prison)add('sentenced','受刑者（拘置所で経理作業に従事）',count*.06,18,84,c.custodyFemale??.12,'sentenced_detention',{civicWorker:false,custody:true,custodyStatus:'sentenced'});
  add('officer','刑務官',count*(day?.22:.07),20,64,.22,'officer_schedule');add('custody_admin','矯正施設の事務官',work?count*.025:0,22,64,.5,'admin');add('custody_medical','矯正施設の医療職員',day?count*.012:count*.002,24,69,.55,'medical');
  add('counsel','弁護士',work?count*.018:0,25,79,.35,'counsel');add('meeting','面会に来た家族・知人',work?count*.02:0,18,84,.55,'meeting',{civicWorker:false,visitor:true});
 }else if(k==='military'){
  let base=Math.min(4500,Math.max(80,area*.012)),office=/市ヶ谷|目黒|十条|用賀/.test(c.name||'');
  add('defense_office','自衛官（事務・教育業務）',base*(work?(office?.45:.18):late?.09:.025),20,60,.15,'defense_office');
  add('training','自衛官',work?base*(office?.03:.28):0,18,54,.12,'training');add('maintenance','自衛官（整備業務）',work?base*.1:0,18,59,.1,'maintenance');add('supply','自衛官（補給・輸送業務）',work?base*.1:0,18,59,.12,'supply');
  add('defense_admin','防衛省の事務官・技官',work?base*.18:late?base*.02:0,22,65,.35,'defense_office');add('barracks','自衛官',base*(work?.015:night?.22:.16),18,54,.12,night?'sleep':'barracks',{civicWorker:false});
  add('defense_medical','自衛隊の医療職員',work?base*.02:base*.003,24,64,.5,'medical');add('defense_duty','自衛官（当直勤務）',base*.025,18,59,.12,'defense_office');
 }else if(k==='juvenile'){
  // A juvenile classification home holds minors for assessment, usually about four weeks, before a family-court decision.
  let count=Number(c.modeledOccupancy)||100;
  add('juvenile','少年（少年鑑別所に収容中）',count,14,19,c.custodyFemale??.12,'juvenile',{civicWorker:false,custody:true,custodyStatus:'juvenile'});
  add('juvenile_teacher','法務教官',count*(day?.3:.1),24,64,.35,'juvenile_teacher');add('juvenile_psych','法務技官（心理）',work?count*.08:0,25,64,.55,'juvenile_psych');add('custody_medical','矯正施設の医療職員',day?count*.02:count*.005,24,69,.55,'medical');
  add('juvenile_attendant','付添人の弁護士',work?count*.03:0,26,74,.35,'juvenile_attendant');add('juvenile_family','面会に来た保護者',work?count*.05:0,32,69,.6,'juvenile_family',{civicWorker:false,visitor:true});add('juvenile_investigator','家庭裁判所調査官',work?count*.03:0,26,64,.5,'juvenile_investigator');
 }else if(k==='immigration'){
  // Residence-status applicants fill the counters on weekdays; the detention unit runs around the clock.
  let count=Number(c.modeledOccupancy)||150,base=scale*(work?260:late?20:day?6:2);
  add('imm_detainee','被収容者（出入国在留管理局の収容施設）',count,20,69,.15,'imm_detainee',{civicWorker:false,custody:true,custodyStatus:'immigration',foreign:true});
  add('imm_guard','入国警備官',count*(day?.25:.1),22,59,.25,'imm_guard');add('imm_examiner','入国審査官',work?base*.1:0,24,64,.45,'imm_examiner');add('imm_counter','出入国在留管理局の窓口職員',work?base*.12:0,22,64,.6,'imm_counter');
  add('imm_applicant','在留手続きに来た人',work?base*.6:0,18,74,.48,'imm_applicant',{civicWorker:false,visitor:true,foreign:true});add('imm_scrivener','行政書士',work?base*.06:0,26,74,.4,'imm_scrivener');add('imm_interpreter','通訳',work?base*.02:0,24,69,.6,'imm_interpreter');add('imm_supporter','面会に来た支援者・弁護士',work?count*.04:0,22,79,.5,'imm_supporter',{civicWorker:false,visitor:true});
 }else if(k==='court'){
  // Hearings run on weekdays about 10:00-12:00 and 13:30-17:00; the Supreme Court has few hearings and many visitors.
  let base=scale*(work?140:late?20:day?4:1),supreme=/最高裁/.test(c.name||''),district=/地方裁判所/.test(c.name||''),hearing=work&&(h>=10&&h<12||h>=13.5&&h<17);
  add('judge','裁判官',base*(supreme?.03:.06),30,69,.3,'judge');add('clerk','裁判所書記官',base*.14,24,64,.5,'clerk');add('court_admin','裁判所事務官',base*.16,22,64,.55,'court_admin');
  if(!supreme){add('prosecutor','検察官',hearing?base*.05:0,26,64,.3,'prosecutor');add('lawyer','弁護士',work?base*.12:0,26,79,.3,'lawyer');add('party','裁判の当事者・証人',work?base*.12:0,18,89,.45,'party',{civicWorker:false,visitor:true});add('audience','裁判の傍聴人',hearing?base*.1:0,18,89,.4,'audience',{civicWorker:false,visitor:true});}
  if(district)add('saibanin','裁判員（選任された一般市民）',hearing?base*.04:0,20,74,.5,'saibanin',{civicWorker:false,visitor:true,keepOccupation:true});
  add('court_reporter','司法担当の報道記者',work?base*.03:0,22,64,.4,'court_reporter');if(supreme)add('court_tour','最高裁判所の見学者',work&&h>=9&&h<16?base*.15:0,10,84,.5,'court_tour',{civicWorker:false,visitor:true});
 }else if(k==='government'){
  let base=scale*(work?220:late?45:day?18:4),local=/都庁|都議会|区役所|出張所|市役所/.test(c.name||'');
  add('policy',local?'地方公務員（行政事務）':'国家公務員（行政事務）',base*.55,22,65,.45,'policy');add('technical',local?'地方公務員（技術職）':'国家公務員（技術職）',base*.2,22,65,.3,'technical');add('counter','行政窓口の担当職員',work?base*.1:0,20,65,.6,'counter');add('consult','手続き・相談に来た人',work?base*.12:0,18,89,.5,'consult',{civicWorker:false,visitor:true});
 }else{
  let base=scale*(work?160:late?30:day?18:2);
  add('member_lower','衆議院議員',work?base*.018:late?base*.008:0,25,79,.25,'member');add('member_upper','参議院議員',work?base*.012:late?base*.005:0,30,79,.3,'member');add('secretary','国会議員の秘書',work||late?base*.16:0,22,74,.4,'secretary');add('diet_staff','国会職員',base*.52,22,65,.45,'diet_staff');add('reporter','国会担当の報道記者',work||late?base*.06:0,22,69,.4,'reporter');add('tour','国会の見学者',day?base*.2:0,10,84,.5,'tour',{civicWorker:false,visitor:true});
 }
 if(k!=='juvenile'&&k!=='immigration')add('guard',k==='parliament'?'衛視':k==='military'?'駐屯地の施設管理職員':k==='court'?'法廷警備員':'庁舎の警備員',Math.max(1,scale*(day?2:.7)),20,69,.2,k==='military'?'maintenance':'guard');add('clean','施設の清掃スタッフ',day?scale*3:0,20,74,.55,'clean');return out;
 }
 function assign(c,P){if(!c.role.startsWith('civic_'))return;if(c.visitor){if(['facility','prison'].includes(P.occ.group))P.occ={label:'無職',group:P.age>=65?'senior':'adult',cat:'none',p:1};return}P.occ={label:c.label,group:c.custody?'custody':'adult',cat:c.custody?'custody':'special',kind:c.custody?'institution':'employed',p:1};}
 // Daily routines in the original engine's entry format [start,end,text,options]; wd/we limit to weekdays/holidays.
 // Custody and court routines follow published 法務省・裁判所 guidance in outline; times are simplified game assumptions.
 const SLEEP=[[21,6.75,'消灯後の単独室で、薄い布団にくるまって眠っているところでした'],[21,6.75,'夜中の巡回の足音で目を覚まし、また目を閉じたところでした'],[21,6.75,'消灯後も寝つけず、明日の公判のことを考えているところでした',{w:.5}]];
 const UNTRIED=[
  [6.75,7.25,'起床の合図で布団をたたみ、扉の前に正座して朝の点検を待っているところでした'],
  [7,7.75,'食器口から差し入れられた朝食を、居室の小さな机で食べているところでした'],
  [8,10,'出廷のため、手錠と腰縄をつけられて護送バスに乗り込むところでした',{wd:1,w:.4}],
  [9,16.5,'接見室で、弁護人と次の公判で話すことを確かめているところでした',{wd:1}],
  [8.5,16,'面会室のアクリル板越しに、家族から近況を聞いているところでした',{wd:1}],
  [9,16,'差し入れの本と下着を受け取り、品目を確かめているところでした',{wd:1}],
  [8,16,'自弁購入の申込書に、便箋と切手の数を書き込んでいるところでした',{wd:1}],
  [9,15,'運動の時間に、仕切られた屋上の運動場で体を伸ばしているところでした',{wd:1}],
  [9,16,'決められた15分の入浴時間で、急いで体を洗っているところでした',{wd:1,w:.6}],
  [8,21,'居室で、起訴状の写しを何度も読み返しているところでした'],
  [8,21,'居室の机で、弁護人に宛てた手紙を書いているところでした'],
  [8,21,'官本の目録から、次に借りる本を選んでいるところでした'],
  [11.75,12.5,'昼食の配食を受け、居室で一人で食べているところでした',{w:3}],
  [15,19,'公判から戻り、居室で今日の法廷のやりとりを思い返しているところでした',{wd:1,w:.5}],
  [16.25,17,'早めの夕食を、居室で静かに食べているところでした',{w:3}],
  [17,21,'仮就寝の時間になり、布団を敷いて横になりながら本を読んでいるところでした'],
  [17,21,'居室のスピーカーから流れるラジオ放送を、目を閉じて聞いているところでした'],
  [8,17,'面会のない休日で、居室で一日じゅう本を読んでいるところでした',{we:1}],
  [8,17,'休日の居室で、決められた時間だけテレビを見ているところでした',{we:1}]];
 const KEIRI=[
  [5,16.5,'経理作業の炊場で、大鍋の煮物を焦がさないようかき混ぜているところでした',{st:'work',wd:1}],
  [8,16.5,'経理作業の洗濯場で、収容者の衣類をたたんで仕分けているところでした',{st:'work',wd:1}],
  [8,16.5,'経理作業で、居室棟の廊下をモップで磨いているところでした',{st:'work',wd:1}],
  [7,8,'食事の配膳係として、台車に食器を積み込んでいるところでした',{st:'work'}],
  [16,17,'夕食の配膳係として、居室ごとに食器を配っているところでした',{st:'work'}]];
 const OFFICER=[
  [6.5,7.5,'起床の点検で、視察口から居室を一人ずつ確かめているところでした',{w:2}],
  [7,8,'配食の台車を押し、居室ごとに朝食を配っているところでした'],
  [8,9,'朝の申し送りで、夜間の出来事を当直の職員から引き継いでいるところでした',{wd:1,w:2}],
  [7.5,10,'出廷する人の護送に付き添い、名前と書類を照合しているところでした',{wd:1}],
  [9,15,'運動場の脇に立ち、運動の時間を見守っているところでした',{wd:1}],
  [9,16,'浴場の入口で、入浴の時間を計りながら見守っているところでした',{wd:1}],
  [8.5,16,'面会に立ち会い、会話の内容を記録しているところでした',{wd:1}],
  [9,16,'差し入れの品を一つずつ開けて、検査しているところでした',{wd:1}],
  [8,16.5,'炊場で、経理作業をする受刑者の作業を監督しているところでした',{wd:1}],
  [13,17,'武道の訓練で、柔道の受け身を繰り返しているところでした',{wd:1,w:.3}],
  [17,19,'夕方の点検を終え、処遇の記録を書いているところでした'],
  [0,24,'居室棟の廊下を巡回し、各室の様子を確かめているところでした',{w:2}],
  [21,6.5,'夜勤の巡回で、懐中電灯を手に静かな廊下を歩いているところでした',{w:3}],
  [21,6.5,'夜勤の詰所で、仮眠の交代の時刻を確かめているところでした'],
  [0,24,'申し送りの記録を読み、次の担当者に伝えることを整理しているところでした']];
 const COURT={
  judge:[[9,10,'開廷前の執務室で、今日の事件の記録を読み返しているところでした'],[10,12,'法廷で、証人の答えに耳を傾けながらメモを取っているところでした',{wd:1,w:2}],[13.5,17,'法廷で、当事者双方の主張を確かめているところでした',{wd:1,w:2}],[12,13.5,'裁判官室で、合議の進め方を同僚と相談しているところでした',{wd:1}],[17,21,'判決の起案に向かい、言い回しを何度も直しているところでした']],
  clerk:[[9,17,'法廷の書記官席で、調書のメモを取っているところでした',{wd:1}],[9,17,'窓口で、提出された訴状の形式を確かめているところでした',{wd:1}],[16,20,'期日の調整のため、当事者に電話をかけているところでした']],
  court_admin:[[9,17,'記録庫から、事件の記録を台車で運び出しているところでした'],[9,17,'裁判所の受付で、来庁者に法廷の場所を案内しているところでした',{wd:1}]],
  prosecutor:[[10,17,'法廷で、証拠の写真を示しながら説明しているところでした',{wd:1}],[10,17,'公判の休廷中に、次に尋ねる質問を確かめているところでした',{wd:1}]],
  lawyer:[[9,17,'弁護士控室で、依頼人と尋問の流れを確かめているところでした',{wd:1}],[9,17,'法廷の前の廊下で、開廷の時刻を待っているところでした',{wd:1}],[13.5,17,'証人尋問で、用意した質問を一つずつ投げかけているところでした',{wd:1}]],
  party:[[9,17,'証人として呼ばれ、法廷の外の待合室で順番を待っているところでした',{wd:1}],[9,17,'民事の期日に出廷し、弁護士の隣で緊張しながら座っているところでした',{wd:1}],[9,17,'調停室で、調停委員に事情を説明しているところでした',{wd:1}]],
  audience:[[9.5,17,'開廷表を見て、傍聴する事件を選んでいるところでした',{wd:1}],[10,17,'傍聴席で、メモを取りながら審理を見守っているところでした',{wd:1}],[9,11,'注目の裁判の傍聴券の抽選に、列をつくって並んでいるところでした',{wd:1,w:.4}]],
  saibanin:[[10,17,'裁判員として法廷に入り、被告人の表情を見つめているところでした',{wd:1}],[12,13.5,'評議室で、ほかの裁判員と昼食をとっているところでした',{wd:1}],[13.5,17,'評議室で、量刑について裁判官と意見を交わしているところでした',{wd:1}]],
  court_reporter:[[9,17,'司法記者クラブで、判決の要旨を原稿にまとめているところでした',{wd:1}],[10,17,'判決の言い渡しに合わせ、法廷から駆け出して速報を送ったところでした',{wd:1,w:.4}]],
  court_tour:[[9,16,'見学で大法廷に入り、天井の高い吹き抜けを見上げているところでした',{wd:1}],[9,16,'見学の案内で、裁判の仕組みの説明を聞いているところでした',{wd:1}]]};
 const JUVENILE=[
  [7,7.5,'起床の合図で布団をたたみ、点検で名前を呼ばれたところでした'],[7.25,8,'居室で、朝食を静かに食べているところでした'],
  [9,12,'心理検査の問題用紙に、鉛筆で答えを書き込んでいるところでした',{wd:1}],[9,16,'面接室で、法務技官に家族のことを聞かれているところでした',{wd:1}],
  [9,16,'行動観察の課題で、色紙をちぎって貼り絵を作っているところでした',{wd:1}],[9,16,'作文の課題で、「これからの自分」について書きあぐねているところでした',{wd:1}],
  [9,16,'学習の時間に、中学の数学の問題集を解いているところでした',{wd:1}],[10,15,'運動の時間に、体育館で法務教官とバレーボールをしているところでした'],
  [9,16,'面会室で、保護者と向き合って言葉を探しているところでした',{wd:1,w:.6}],[9,16,'付添人の弁護士と、審判で話すことを確かめているところでした',{wd:1,w:.5}],
  [12,13,'居室で昼食を食べているところでした',{w:3}],[16.5,17.5,'居室で夕食を食べているところでした',{w:3}],
  [17.5,21,'その日の日記に、面接で話したことを書いているところでした'],[17.5,21,'決められた時間だけ、居室でテレビを見ているところでした'],[8,17,'休日の居室で、借りた本を読み進めているところでした',{we:1}]];
 const JUVENILE_SLEEP=[[21,7,'消灯後の居室で、眠れずに天井を見つめているところでした'],[21,7,'消灯後の居室で、静かに眠っているところでした',{w:3}]];
 const IMM_DETAINEE=[
  [7,7.5,'起床の点呼で、名前を呼ばれて返事をしたところでした'],[7.5,8.5,'居室で、配られた朝食を食べているところでした'],
  [9,11.5,'居室の開放時間に、共用の電話で家族に電話をかけているところでした'],[9,16.5,'開放時間に、ほかの被収容者とカードゲームをしているところでした'],
  [9,16.5,'仮放免の申請の結果を、まだかまだかと待っているところでした'],[9,16,'面会室で、支援者に体調を伝えているところでした',{wd:1}],
  [9,16,'面会室で、弁護士と在留特別許可の手続きを確かめているところでした',{wd:1,w:.5}],[10,15,'屋外の運動場で、柵の向こうの空を見上げているところでした'],
  [12,13,'居室で昼食を食べているところでした',{w:3}],[17,18,'居室で夕食を食べているところでした',{w:3}],[18,21,'居室で、母国語の聖書を読んでいるところでした',{w:.5}],[18,21,'居室で、同室の人と小声で話しているところでした']];
 const IMM_SLEEP=[[21,7,'消灯後の居室で、眠りについたところでした',{w:3}],[21,7,'消灯後も寝つけず、家族の写真を見つめているところでした']];
 const STAFF={
  juvenile_teacher:[[7,8,'起床の点検で、居室を一つずつ確かめているところでした'],[9,16,'行動観察の記録に、課題に取り組む様子を書き込んでいるところでした',{wd:1}],[10,15,'運動の時間に、少年たちとバレーボールのボールを追っているところでした'],[0,24,'居室棟を巡回し、少年の様子を確かめているところでした'],[21,7,'夜勤の巡回で、居室の明かりを確かめているところでした',{w:2}]],
  juvenile_psych:[[9,17,'面接室で、少年の話を聞きながらメモを取っているところでした'],[9,17,'心理検査の結果を、鑑別結果通知書にまとめているところでした']],
  juvenile_attendant:[[9,17,'面会室で、少年と審判の見通しについて話しているところでした']],
  juvenile_family:[[9,16,'面会の受付で、差し入れる着替えを渡したところでした'],[9,16,'面会を待つ間、子どもに何を言おうか考えているところでした']],
  juvenile_investigator:[[9,17,'面接室で、少年に生活の様子を尋ねているところでした']],
  imm_guard:[[7,8,'朝の点呼で、居室ごとに人数を確かめているところでした'],[9,16,'面会に立ち会い、時間を確かめているところでした',{wd:1}],[9,16,'送還の護送に向けて、所持品の保管記録を確認しているところでした',{wd:1}],[0,24,'収容場の廊下を巡回し、居室の様子を確かめているところでした',{w:2}],[21,7,'夜勤の巡回で、静かな居室棟を見回っているところでした',{w:2}]],
  imm_examiner:[[9,17,'通訳を介して、違反審査の聞き取りをしているところでした'],[9,17,'在留資格の変更申請の書類を、一件ずつ審査しているところでした']],
  imm_counter:[[9,16,'番号札を呼び、在留カードを申請者に手渡しているところでした'],[9,16,'窓口で、申請書の不備をやさしい日本語で説明しているところでした']],
  imm_applicant:[[9,16,'番号札を手に、待合室の電光掲示板を見上げているところでした'],[9,16,'在留期間の更新の申請書を、窓口に出す前に見直しているところでした'],[9,16,'新しい在留カードを受け取り、写真を確かめているところでした']],
  imm_scrivener:[[9,16,'依頼人の代わりに、申請書類の束を窓口に提出しているところでした']],
  imm_interpreter:[[9,17,'審査の聞き取りで、質問を一文ずつ通訳しているところでした']],
  imm_supporter:[[9,16,'面会の受付で、差し入れの日用品を預けたところでした'],[9,16,'面会室で、被収容者の体調を聞き取っているところでした']]};
 function ctxFor(P,t){let hol=holName(t);return {P,t,h:t.hf??t.h,we:t.dow===0||t.dow===6||!!hol,hol,brk:isBreak(t),mo:t.mo,vacP:false,vac:false,season:seasonOf(t.mo),wx:wxOf(P.pref,t),eq:eqOf(P.pref,t)}}
 function scheduled(key,P,t){if(typeof fromPool!=='function')return null;let ctx=ctxFor(P,t),h=ctx.h,sleeping=(h>=21||h<6.75)&&['untried','sentenced','sentenced_detention'].includes(key);
  if(key==='juvenile'||key==='imm_detainee'){let night=key==='juvenile'?h>=21||h<7:h>=21||h<7,sleepList=key==='juvenile'?JUVENILE_SLEEP:IMM_SLEEP,day=key==='juvenile'?JUVENILE:IMM_DETAINEE;let pk=night&&rnd()<.95?fromPool(sleepList,ctx):fromPool(day,ctx)||fromPool(sleepList,ctx);return pk&&{text:fillText(textOf(pk.e),P),state:sleepList.includes(pk.e)?'sleep':null}}
  if(STAFF[key]){let pk=fromPool(STAFF[key],ctx);return pk&&{text:fillText(textOf(pk.e),P),state:null}}
  if(sleeping&&rnd()<.96){let pk=fromPool(key==='untried'?SLEEP:[...SLEEP,...(typeof PRISON_TX!=='undefined'?PRISON_TX.sleep:[])],ctx);return pk&&{text:fillText(textOf(pk.e),P),state:'sleep'}}
  // Sentenced people reuse the original prison routine; at a detention house factory and vocational lines become 経理作業.
  let prisonDay=typeof PRISON_TX!=='undefined'?PRISON_TX.day:[],list=key==='untried'?UNTRIED:key==='sentenced'?prisonDay:key==='sentenced_detention'?[...prisonDay.filter(e=>!/工場|職業訓練|作業場|刑務作業|運動会|出所/.test(textOf(e))),...KEIRI]:key==='officer_schedule'?OFFICER:COURT[key];
  if(!list)return null;let pk=fromPool(list,ctx);if(!pk&&sleeping)pk=fromPool(SLEEP,ctx);return pk&&{text:fillText(textOf(pk.e),P),state:pk.e[3]?.st==='work'?'work':sleeping&&SLEEP.includes(pk.e)?'sleep':null}}
 function apply(c,P,t){if(!c.role.startsWith('civic_'))return;let s=scheduled(c.civicScene,P,t),pool=typeof MAP_DATA!=='undefined'?MAP_DATA.storyScenes?.civic?.[c.civicScene]:null;let text=s?.text||(pool?.length?pool[Math.floor(rnd()*pool.length)]:texts[c.civicScene]||texts.admin);P.mapSituation=text;P.visitLabel=c.label;P.sit={text,state:s?.state||(['custody_sleep','sleep'].includes(c.civicScene)?'sleep':c.civicWorker?'work':'off'),stateLabel:c.label,p:1};if(c.foreign&&typeof PersonContext!=='undefined'){let nm=PersonContext.anyForeignName(P.sex,rnd);P.surname={k:nm.surname,r:nm.surname,c:100};P.given={k:nm.given,r:nm.given,p:.01,era:{cov:1}};P.nameApproximate=true;}if(c.custody){P.custodyStatus=c.custodyStatus;P.household={label:'施設等の世帯（一般世帯統計の対象外）',marital:'未抽選',code:null};} }
 return {kind,roles,assign,apply,texts};
})();
if(typeof module!=='undefined')module.exports=CivicModel;
