/* 国会議事堂, 議員会館 and 東京都庁: members, secretaries, Diet staff, 衛視, officials answering in committee,
   reporters, petitioners, visitors and Tokyo government staff, following the known session calendar
   (data/diet-schedule.json). Single-holder offices (首相, 大臣, 都知事) are never drawn. Counts, hours and attendance
   are game assumptions. */
const DietModel=(()=>{
 let S=typeof MAP_DATA!=='undefined'?MAP_DATA.dietSchedule:null;function configure(s){S=s}
 const pick=a=>a[Math.floor(rnd()*a.length)];
 const day=t=>`${t.y}-${String(t.mo).padStart(2,'0')}-${String(t.d).padStart(2,'0')}`;
 const hash=s=>{let h=0;for(const ch of s)h=(h*31+ch.charCodeAt(0))>>>0;return h};
 function kindOf(c){const n=c?.name||'';if(/^国会議事堂$/.test(n))return 'diet';if(/議員会館/.test(n))return 'kaikan';if(/東京都議会議事堂/.test(n))return 'togikai';if(/東京都庁舎/.test(n))return 'tocho';if(/^東京都庁$/.test(n))return 'tochoPlaza';return null}
 // What the Diet is doing on this date and hour.
 function diet(t){const d=day(t),h=t.hf??t.h,wd=t.dow>0&&t.dow<6&&!t.holiday,sess=(S?.diet?.sessions||[]).find(s=>d>=s.start&&d<=s.end),events=(S?.diet?.events||[]).filter(e=>e.d===d);
  const now=events.filter(e=>h>=e.h[0]&&h<e.h[1]),regular=house=>wd&&sess&&!events.some(e=>e.house===house||e.house==='both')&&(house==='衆'?[2,4,5]:[1,3,5]).includes(t.dow)&&hash(d+house)%2===0&&h>=13&&h<14.5;
  const plenary=house=>now.some(e=>['plenary','opening','dissolution'].includes(e.kind)&&(e.house===house||e.house==='both'))||regular(house);
  return {session:sess,wd,events,now,plenaryLower:plenary('衆'),plenaryUpper:plenary('参'),budget:now.some(e=>e.kind==='budget'),committee:!!sess&&wd&&h>=9&&h<17}}
 function tokyo(t){const d=day(t),h=t.hf??t.h,sess=(S?.tokyo?.sessions||[]).find(s=>d>=s.start&&d<=s.end);return {session:sess,plenary:!!sess&&sess.plenary.includes(d)&&h>=13&&h<18}}
 const B={member:[[25,39,10],[40,49,20],[50,59,30],[60,69,28],[70,85,12]],work:[[22,29,22],[30,39,24],[40,49,24],[50,59,22],[60,65,8]],sec:[[22,29,20],[30,39,25],[40,49,22],[50,59,18],[60,74,15]],visit:[[10,15,38],[16,22,10],[23,64,32],[65,85,20]],petition:[[30,49,30],[50,64,40],[65,80,30]],obs:[[6,15,12],[16,29,30],[30,49,28],[50,64,18],[65,85,12]]};
 function roles(c,t){const k=kindOf(c);if(!k)return null;const h=t.hf??t.h,wd=t.dow>0&&t.dow<6&&!t.holiday,office=h>=9&&h<18,late=h>=18&&h<22,night=h>=22||h<7,out=[];
  const add=(key,label,n,female,bands,extra={})=>{if(n>0)out.push({role:'diet_'+key,label,w:n,min:bands[0][0],max:bands.at(-1)[1],female,ageBands:bands,dietKind:k,...extra})};
  if(k==='diet'||k==='kaikan'){const D=diet(t),on=!!D.session;
   if(k==='diet'){
    const mem=(base,plen)=>wd&&office?(on?base+(plen?1:0)*base*3:base*.06):late&&on?base*.15:0;
    add('member_lower','衆議院議員',mem(100,D.plenaryLower),.17,B.member,{worker:true});add('member_upper','参議院議員',mem(60,D.plenaryUpper),.28,B.member,{worker:true,upper:true});
    add('official','中央省庁の職員（政府参考人・答弁補佐）',wd&&office&&on?(D.budget?160:70):0,.25,B.work,{worker:true});
    add('secretary','国会議員の秘書',wd&&office&&on?40:0,.42,B.sec,{worker:true});
    add('staff','国会職員',wd&&office?(on?560:380):late?(on?120:20):night?12:wd?40:20,.45,B.work,{worker:true});
    add('guard','衛視',wd&&office?110:late?50:30,.12,[[20,29,30],[30,39,25],[40,49,25],[50,60,20]],{worker:true});
    add('reporter','国会担当の記者',wd&&office&&on?(D.budget||D.plenaryLower||D.plenaryUpper?220:110):late&&on?30:0,.38,B.work,{worker:true});
    add('gallery','国会の傍聴人',wd&&on&&(D.plenaryLower||D.plenaryUpper||D.budget)?90:wd&&office&&on?25:0,.45,[[18,29,15],[30,49,30],[50,69,35],[70,85,20]]);
    // 参観: weekdays all year; the 衆議院 also on weekends and holidays (about 9:30-15:00).
    add('tour','国会の見学者',(wd?h>=9&&h<16:h>=9.5&&h<15)?(on?160:260)*(wd?1:.5):0,.5,B.visit,{schoolTrip:true});
    add('clean','議事堂の清掃スタッフ',h>=7&&h<18?30:0,.6,[[30,49,30],[50,74,70]],{worker:true});
   }else{const upper=/参議院/.test(c.name),plen=upper?D.plenaryUpper:D.plenaryLower,away=t.dow===1&&h<11||t.dow===5&&h>=13;
    // 議員会館: members' offices. Members head back to their districts at weekends (金帰月来).
    add(upper?'member_upper':'member_lower',upper?'参議院議員':'衆議院議員',wd&&office?(on?(plen?6:away?12:38):8):late&&on?10:0,upper?.28:.17,B.member,{worker:true,upper,kaikan:true});
    add('secretary','国会議員の秘書',wd&&office?(on?300:190):late?(on?70:20):0,.42,B.sec,{worker:true,kaikan:true});
    add('petition','陳情・面会に来た人',wd&&h>=9.5&&h<17.5?(on?110:45):0,.35,B.petition,{kaikan:true});
    add('rally','院内集会の参加者',wd&&on&&h>=11&&h<16?40:0,.5,[[20,39,30],[40,64,45],[65,80,25]],{kaikan:true});
    add('official','中央省庁の職員（議員への説明）',wd&&office&&on?45:wd&&office?15:0,.3,B.work,{worker:true,kaikan:true});
    add('reporter','国会担当の記者',wd&&office&&on?20:0,.38,B.work,{worker:true,kaikan:true});
    add('guard','衛視',wd&&office?18:8,.12,[[20,29,30],[30,39,25],[40,49,25],[50,60,20]],{worker:true,kaikan:true});
   }
   return out}
  if(k==='togikai'){const T=tokyo(t);
   add('member_tokyo','都議会議員',wd&&office?(T.plenary?115:T.session?45:12):late&&T.session?8:0,.3,B.member,{worker:true});
   add('tostaff','都議会局の職員',wd&&office?160:late?(T.session?40:10):0,.5,B.work,{worker:true});
   add('gallery_tokyo','都議会の傍聴人',T.plenary?45:0,.45,[[18,29,15],[30,49,30],[50,69,35],[70,85,20]]);
   add('reporter','都政担当の記者',wd&&office?(T.session?30:8):0,.4,B.work,{worker:true});
   add('guard','庁舎の警備員',wd&&office?12:5,.15,[[20,39,30],[40,59,40],[60,72,30]],{worker:true});return out}
  if(k==='tocho'){const T=tokyo(t),first=/第一本庁舎/.test(c.name);
   add('tostaff','都庁職員',wd?(office?(first?5600:3800):late?(first?900:600):night?40:0):(office?120:20),.42,B.work,{worker:true});
   add('visitor_tocho','都庁への来庁者',wd&&h>=9&&h<17.5?(first?500:300):0,.5,[[18,29,15],[30,49,35],[50,69,32],[70,89,18]]);
   // 第一本庁舎45階の展望室 (9:30-22:00, free): domestic visitors and visitors from abroad.
   if(first&&h>=9.5&&h<22){const v=(h>=17?260:330)*(wd?1:1.4);add('observatory','都庁展望室の見学者',v*.5,.55,B.obs);add('observatory_inbound','都庁展望室の見学者',v*.5,.5,B.obs,{inboundGuest:true})}
   add('guard','庁舎の警備員',wd&&office?40:16,.15,[[20,39,30],[40,59,40],[60,72,30]],{worker:true});
   add('clean','庁舎の清掃スタッフ',h>=6&&h<10||h>=17&&h<21?60:wd&&office?25:6,.62,[[30,49,30],[50,74,70]],{worker:true});
   if(T.session)add('reporter','都政担当の記者',wd&&office?15:0,.4,B.work,{worker:true});return out}
  // 都民広場 and the walkways around the towers: passers-by, and the projection mapping on the 第一本庁舎 at night.
  add('plaza','都庁周辺を歩く人',h>=7&&h<22?90:10,.48,[[16,29,25],[30,49,35],[50,69,25],[70,85,15]]);
  if(h>=19&&h<21.5)add('mapping','都庁のプロジェクションマッピングの見物客',140,.55,B.obs);
  return out}
 const JOB={member_lower:'衆議院議員',member_upper:'参議院議員',member_tokyo:'都議会議員',secretary:'国会議員の秘書',staff:'国会職員',guard:null,official:'国家公務員',reporter:'新聞記者',tostaff:'都庁職員',clean:'ビル清掃員'};
 function assign(c,P){if(!c.role?.startsWith('diet_'))return false;const k=c.role.slice(5);
  if(c.worker){let label=k==='guard'?(c.dietKind==='diet'||c.dietKind==='kaikan'?'衛視':'庁舎の警備員'):k==='official'?'国家公務員（中央省庁）':k==='reporter'?(c.dietKind==='togikai'||c.dietKind==='tocho'?'都政担当の記者':'国会担当の記者'):k==='staff'?'国会職員':k==='tostaff'?(c.dietKind==='togikai'?'都議会局の職員':'都庁職員'):k==='clean'?'清掃スタッフ':c.label;
   let job=JOB_OBJS.find(j=>j.n===(JOB[k]||'警備員'));P.occ={label,group:'adult',cat:job?.cat||'公務',tag:job?.tag||'office',job,kind:'employed',p:1};return true}
  // Visitors keep their own occupation; school groups on a 国会見学 are pupils.
  if(['facility','prison'].includes(P.occ.group))P.occ={label:'無職',group:P.age>=65?'senior':'adult',cat:'none',p:1};return true}
 const T={
  member:{plenary:['本会議場の自席で、登壇した同僚の演説に耳を傾けているところでした','本会議の採決で、起立の合図に合わせて立ち上がったところでした','本会議場に入る前に、廊下で議員バッジの位置を直したところでした'],
   opening:['開会式に向かう列に並び、参議院の本会議場へ歩いているところでした','本会議場の自席で、首相の所信表明演説を聞きながらメモを取っているところでした'],
   question:['本会議の代表質問で、自党の質問者が登壇するのを見守っているところでした','代表質問への首相の答弁を、本会議場の自席でじっと聞いているところでした'],
   budget:['予算委員会の質疑で、首相に向けて質問のパネルを掲げたところでした','予算委員会の後方の席で、自分の質問の順番を待っているところでした','予算委員会の中継カメラを意識しつつ、資料の付箋を確かめているところでした'],
   committee:['委員会室で、法案の説明に耳を傾けながら赤ペンを走らせているところでした','委員会の質疑で、政府参考人の答弁に重ねて質問したところでした','委員会の理事会で、次の審議日程について与野党と協議しているところでした'],
   dissolution:['衆議院の解散が告げられ、本会議場で万歳をしているところでした'],
   office:['議員会館の事務所で、地元からの陳情団と名刺を交換したところでした','議員会館で、省庁の担当者から法案の説明を受けているところでした','党本部の部会に向かう前に、秘書から資料を受け取ったところでした','議員会館の事務所で、地元の会合で話す挨拶を考えているところでした'],
   recess:['閉会中の議員会館で、地元の後援会に送る国会報告に目を通しているところでした','閉会中審査の日程を、事務所で秘書と確認しているところでした'],
   recessDiet:['閉会中審査の委員会に出るため、議事堂の議員玄関から入ったところでした','閉会中の静かな議事堂の廊下で、事務局の職員と打ち合わせをしているところでした'],
   late:['国会対策の打ち合わせを終え、夜の議員会館を出るところでした','翌日の質問に向け、事務所で答弁の想定を練り直しているところでした'],
   tokyo:['都議会の本会議で、知事の答弁に耳を傾けているところでした','都議会の控室で、会派の打ち合わせをしているところでした','都議会の委員会で、局長に質問しているところでした'],
   tokyoOff:['都議会の控室で、地域から寄せられた要望を整理しているところでした','議事堂の会派控室で、次の定例会に出す質問を練っているところでした']},
  secretary:['議員会館の事務所で、陳情に来た地元の方にお茶を出したところでした','委員会の質問通告の文案を、議員に確認してもらっているところでした','議員の日程表を、分刻みで組み直しているところでした','院内集会の会場で、参加者の受付をしているところでした','地元事務所からの電話で、週末の会合の段取りを相談しているところでした'],
  secretaryLate:['翌日の委員会の資料を、夜遅くまでまとめているところでした'],
  official:['委員会室の後ろの席で、答弁のメモを前の席へそっと差し入れたところでした','政府参考人として、委員会で答弁に立ったところでした','国会の廊下で、質問通告の内容を省に電話で伝えているところでした'],
  officialKaikan:['議員会館の事務所で、議員に法案の要点を説明しているところでした','議員会館の廊下で、次に説明に回る事務所の部屋番号を確かめているところでした'],
  officialLate:['質問通告を受け、答弁の案を急いで書いているところでした'],
  staff:['委員会室で、発言者の名前を記録の用紙に書き込んでいるところでした','本会議の議事進行の原稿を、議長席の横で確かめているところでした','法案の条文の照合に、何度も目を通しているところでした','見学者の案内係として、本会議場の天井のステンドグラスを説明しているところでした'],
  guard:['本会議場の出入口で、議員バッジを確かめているところでした','議事堂の正面玄関で、見学者の列を誘導しているところでした','傍聴席の後ろに立ち、傍聴人の様子に目を配っているところでした'],
  guardKaikan:['議員会館の面会受付で、来訪者の通行証を確かめているところでした'],
  guardNight:['夜の議事堂を、懐中電灯を手に巡回しているところでした'],
  guardTokyo:['庁舎の入口で、来庁者の入館証を確かめているところでした','夜の庁舎を、決まった順路で巡回しているところでした'],
  reporter:['国会の廊下で、会議を終えた議員を囲んで話を聞いているところでした','記者クラブの席で、委員会の中継を見ながら原稿を打っているところでした','本会議の記者席から、議場の様子をメモしているところでした'],
  reporterTokyo:['都庁の記者クラブで、都の発表資料を読み込んでいるところでした','都議会の記者席で、質疑のやりとりをメモしているところでした'],
  gallery:['本会議の傍聴席から、議場を見下ろしているところでした','傍聴の受付で、記名用紙に名前を書いたところでした','傍聴席で、手荷物を預けた身軽さに少し落ち着かずにいるところでした'],
  galleryTokyo:['都議会の傍聴席で、知事の答弁を聞いているところでした'],
  tour:['国会見学で、本会議場の天井のステンドグラスを見上げているところでした','国会見学の列で、中央広間の銅像についての説明を聞いているところでした','国会見学の最後に、議事堂の正面で記念写真を撮っているところでした'],
  tourKid:['社会科見学で、議事堂の正面に並んで集合写真を撮っているところでした','国会見学で、本会議場の広さに思わず声を上げたところでした'],
  petition:['地元の陳情団の一人として、議員会館の事務所で要望書を手渡したところでした','議員会館の面会受付で、通行証を受け取ったところでした','議員の事務所の前で、約束の時間まで廊下で待っているところでした'],
  rally:['議員会館の会議室で開かれた院内集会で、発言の順番を待っているところでした','院内集会で、議員の挨拶に拍手を送ったところでした'],
  tostaff:['都庁の執務室で、議会答弁の資料を作っているところでした','都庁の会議室で、区市町村の担当者とオンライン会議をしているところでした','第一本庁舎の高層階で、窓の外の新宿の街を一瞬眺めたところでした','都庁の執務室で、補助金の申請書類を一件ずつ確かめているところでした'],
  tostaffLunch:['都庁の職員食堂で、日替わりの定食を受け取ったところでした'],
  tostaffLate:['残業で、照明が半分消えた都庁のフロアに残っているところでした'],
  togikaiStaff:['都議会の本会議場で、議事進行の準備をしているところでした','都議会局の執務室で、委員会の記録をまとめているところでした'],
  visitor:['都庁の窓口で、申請書類を提出しているところでした','パスポートの窓口で、受け取りの番号札を握っているところでした','都庁の案内表示を見上げ、目当ての局のフロアを探しているところでした'],
  observatory:['都庁の展望室で、遠くに富士山が見えないか目をこらしているところでした','都庁の展望室で、新宿の高層ビル群を見下ろしているところでした','都庁の展望室で、置かれたピアノを誰かが弾く音に耳を傾けているところでした'],
  observatoryNight:['都庁の展望室から、夜景にスマホを向けているところでした'],
  plaza:['都民広場を横切り、都庁の足元のビル風に髪を押さえたところでした','都庁の足元のベンチで、ひと休みしているところでした'],
  mapping:['都庁の壁面に映るプロジェクションマッピングを見上げ、思わず歓声を上げたところでした','プロジェクションマッピングの始まりを、都民広場で待っているところでした'],
  clean:['ワゴンを押して、廊下のゴミ箱を順に回っているところでした','会議室の机を、次の会議に備えて拭き上げているところでした']};
 function apply(c,P,t){if(!c.role?.startsWith('diet_'))return false;const k=c.role.slice(5),h=t.hf??t.h,lunch=h>=12&&h<13,D=diet(t),TK=tokyo(t);let text,state=c.worker?'work':'off';
  if(k==='member_lower'||k==='member_upper'){const M=T.member,plen=k==='member_upper'?D.plenaryUpper:D.plenaryLower,ev=D.now.find(e=>e.house==='both'||e.house===(k==='member_upper'?'参':'衆'));
   text=pick(!D.session?(c.kaikan?M.recess:M.recessDiet):h>=18?M.late:c.kaikan?M.office:ev?.kind==='dissolution'?M.dissolution:ev?.kind==='opening'?(h<12?M.opening.slice(0,1):M.opening.slice(1)):plen&&ev?.label==='代表質問'?M.question:plen?M.plenary:ev?.kind==='budget'?M.budget:M.committee)}
  else if(k==='member_tokyo')text=pick(TK.plenary?T.member.tokyo:TK.session?[...T.member.tokyo.slice(1),...T.member.tokyoOff]:T.member.tokyoOff);
  else if(k==='secretary')text=pick(h>=18?T.secretaryLate:T.secretary);
  else if(k==='official')text=pick(h>=18?T.officialLate:c.kaikan?T.officialKaikan:T.official);
  else if(k==='staff')text=pick(T.staff);
  else if(k==='guard')text=pick(c.dietKind==='diet'?(h>=19||h<7?T.guardNight:T.guard):c.dietKind==='kaikan'?T.guardKaikan:T.guardTokyo);
  else if(k==='reporter')text=pick(c.dietKind==='togikai'||c.dietKind==='tocho'?T.reporterTokyo:T.reporter);
  else if(k==='gallery')text=pick(T.gallery);else if(k==='gallery_tokyo')text=pick(T.galleryTokyo);
  else if(k==='tour')text=pick(P.age<16?T.tourKid:T.tour);
  else if(k==='petition')text=pick(T.petition);else if(k==='rally')text=pick(T.rally);
  else if(k==='tostaff')text=pick(c.dietKind==='togikai'?T.togikaiStaff:lunch?T.tostaffLunch:h>=18?T.tostaffLate:TK.session?T.tostaff:T.tostaff.slice(1));
  else if(k==='visitor_tocho')text=pick(T.visitor);
  else if(k.startsWith('observatory'))text=pick(h>=17.5?[...T.observatoryNight,...T.observatory.slice(1)]:T.observatory);
  else if(k==='plaza')text=pick(T.plaza);else if(k==='mapping')text=pick(T.mapping);
  else text=pick(T.clean);
  P.mapSituation=text;P.visitLabel=c.label;P.sit={...P.sit,text,state,stateLabel:c.worker?P.occ.label:c.label,p:1,source:'diet'};return true}
 return {configure,kindOf,roles,assign,apply,diet,tokyo};
})();
if(typeof module!=='undefined')module.exports=DietModel;
