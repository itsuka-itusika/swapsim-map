/* University life through the year: 新歓 in April (club recruiting on campus by day, 新歓コンパ in student towns by
   night), the 卒論 and 修論 crunch from December to early February, and 就職活動 (internships for 3年生 in summer and
   winter, company information sessions from March, interviews for 4年生 from April with the June peak, the 内定式 on
   1 October). Only university undergraduates and master's students; dates, shares and hours are game assumptions. */
const CampusLife=(()=>{
 const pick=a=>a[Math.floor(rnd()*a.length)];
 const weekday=t=>t.dow>0&&t.dow<6&&!t.holiday&&!(typeof holName==='function'&&holName(t));
 // Undergraduate year (1-4), 'm1'/'m2' for master's students, else null.
 function stage(P){let o=P.occ||{},l=o.label||'';if(/^大学院の修士1年/.test(l))return 'm1';if(/^大学院の修士2年/.test(l))return 'm2';let m=l.match(/^大学(\d)年生/);return m?+m[1]:null}
 // 就活 counts master's 1年 as the 3rd undergraduate year and master's 2年 as the 4th.
 const jobYear=s=>s==='m1'?3:s==='m2'?4:s;
 function shinkan(t){if(t.mo!==4)return 0;return t.d<=15?1:t.d<=25?.45:0}
 // 卒論/修論: crunch in December, the deadline in the first weeks of January, presentations to early February.
 function thesis(t){let {mo,d}=t;if(mo===12)return 'crunch';if(mo===1&&d<=20)return 'deadline';if(mo===1||mo===2&&d<=10)return 'defense';return null}
 // 就活 phase for a student in the given year (3 or 4).
 function shukatsu(t,yr){let {mo,d}=t;
  if(yr===3){if(mo===3)return 'setsumei';if(mo===8||mo===9&&d<=20)return 'intern';if(mo===12||mo<=2)return 'winter';if(mo>=6&&mo<=7)return 'apply';return null}
  if(yr===4){if(mo===4||mo===5)return 'early';if(mo===6||mo===7&&d<=15)return 'interview';if(mo===10&&d===1)return 'naiteishiki';return null}return null}
 // Students in office districts on weekdays: information sessions, interviews, internships and the 内定式.
 const officeShare={setsumei:.04,early:.015,interview:.05,intern:.02,winter:.01,naiteishiki:.06};
 function officeRows(t){if(!weekday(t))return [];let h=t.hf??t.h;if(h<9||h>=18)return [];let out=[];
  for(let yr of [3,4]){let ph=shukatsu(t,yr);if(!ph||!officeShare[ph]||ph==='apply')continue;if(ph==='naiteishiki'&&(h<10||h>=17))continue;
   out.push({role:'event_shukatsu',label:ph==='naiteishiki'?'内定式に出席する内定者':/intern|winter/.test(ph)?'インターン中の学生':'就職活動中の学生',w:.9*officeShare[ph],min:yr===3?20:21,max:24,female:.5,ageBands:yr===3?[[20,20,30],[21,21,55],[22,24,15]]:[[21,21,35],[22,22,50],[23,24,15]],jobYear:yr,shukatsu:ph})}return out}
 const S={
  recruit:['キャンパスの並木道で、新入生にサークルのビラを配っているところでした','サークルのブースで、新入生に活動内容を説明しているところでした','着ぐるみ姿で、新入生にサークルの新歓イベントを宣伝しているところでした','ビラを配り終え、ブースで次の勧誘の段取りを話し合っているところでした'],
  fresher:['両手いっぱいにサークルのビラを抱えて、キャンパスを歩いているところでした','先輩に声をかけられ、気になるサークルのブースで話を聞いているところでした','新歓イベントの日程を、スマートフォンのカレンダーに書き込んでいるところでした','履修登録の画面と新歓の予定表を、交互に見比べているところでした'],
  konpa:['新歓コンパで、サークルの先輩に連絡先を聞かれたところでした','新歓コンパの居酒屋で、自己紹介の順番が回ってきたところでした','新歓コンパの二次会に行くか、駅前で迷っているところでした'],
  konpaMinor:['新歓コンパで、未成年なのでソフトドリンクを頼んだところでした'],
  konpaHost:['幹事として、新歓コンパの会費を集めているところでした','新歓コンパの店の前で、新入生の人数を数えているところでした'],
  // {r}: 卒論 or 修論
  crunch:['研究室で、{r}のデータを夜までかかって整理しているところでした','{r}の章立てについて、指導教員の部屋で相談しているところでした','図書館で、{r}に引用する論文を探しているところでした'],
  deadline:['{r}の提出期限を前に、研究室で参考文献の書式をそろえているところでした','{r}の原稿を、指導教員に赤ペンで直されて戻されたところでした','提出窓口で、印刷した{r}を受け付けてもらったところでした'],
  defense:['{r}の発表会のスライドを、研究室の後輩に見てもらっているところでした','{r}の発表会で、質疑応答の質問に言葉を詰まらせたところでした'],
  m2:['研究室に泊まり込み、修論の図を作り直しているところでした','修論審査の口頭試問で、審査の先生の質問に答えているところでした'],
  thesisHome:['自宅の机で、{r}の考察を書いては消しているところでした','締め切りが近づき、深夜まで{r}の文字数を数えているところでした','{r}の参考文献リストを、寝る前にもう一度見直しているところでした'],
  campusJob:['キャリアセンターで、エントリーシートの添削を受けているところでした','学内の合同企業説明会で、企業のブースを回っているところでした','空き教室で、友人と面接の練習をし合っているところでした'],
  homeJob:['エントリーシートの「志望動機」の欄を、何度も書き直しているところでした','自宅からオンライン面接に入り、カメラの角度を直したところでした','就活サイトを眺めながら、説明会の予約を入れているところでした','適性検査のWebテストを、時間を気にしながら解いているところでした','面接の結果の連絡が来ないか、何度もメールを確かめているところでした'],
  homeIntern:['インターンの応募フォームに、自己PRを書き込んでいるところでした','インターンの選考結果のメールを、おそるおそる開いたところでした'],
  setsumei:['会社説明会の会場で、受付の列に並んでいるところでした','リクルートスーツ姿で、説明会の会場のビルを地図アプリで探しているところでした','合同説明会の企業ブースで、人事担当者の話をメモしているところでした'],
  interview:['面接の待合室で、ほかの学生と並んで名前を呼ばれるのを待っているところでした','リクルートスーツ姿で、面接の開始時刻より少し早く受付に着いたところでした','グループディスカッションで、タイムキーパー役を任されたところでした','面接を終えてオフィスビルを出て、ようやく肩の力を抜いたところでした'],
  naitei:['内々定の電話を受け、ビルの前で思わず小さくガッツポーズをしたところでした'],
  intern:['インターンのグループワークで、ホワイトボードに意見をまとめているところでした','インターンの最終日に、配属先の社員にお礼を言っているところでした'],
  internSummer:['サマーインターンで、グループワークの発表を社員に講評されているところでした'],
  naiteishiki:['内定式で、同期になる人たちと初めて顔を合わせているところでした','内定式で、社長から内定通知書を受け取ったところでした','内定式のあとの懇親会で、同期と連絡先を交換しているところでした']
 };
 function assign(c,P){if(c.role!=='event_shukatsu')return false;let yr=c.jobYear;P.occ={label:`大学${yr}年生`,group:'college',yr,kindLabel:'所属',p:1,cat:'student'};return true}
 function set(P,text,label,state){P.mapSituation=text;P.sit={...P.sit,text,state:state||P.sit?.state||'off',...(label?{stateLabel:label}:{}),source:'campus-life',p:1};if(label)P.visitLabel=label}
 function apply(c,P,t){let h=t.hf??t.h,s=stage(P),r=c.role;
  if(r==='event_shukatsu'){let ph=c.shukatsu,pool=ph==='setsumei'?S.setsumei:ph==='naiteishiki'?S.naiteishiki:/intern|winter/.test(ph)?[...S.intern,...(ph==='intern'?S.internSummer:[])]:[...S.interview,...(ph==='interview'?S.naitei:[])];set(P,pick(pool),c.label,'off');return true}
  if(!s||P.hb?.bed||P.hb?.leave)return false;let thesisR=s===4?'卒論':s==='m2'?'修論':null;
  // On campus.
  if(r==='student'&&['university','college'].includes(c.facility?.kind)){let sk=shinkan(t),th=thesis(t),yr=jobYear(s),job=shukatsu(t,yr);
   if(sk&&weekday(t)&&h>=10&&h<18&&[1,2,3].includes(s)&&rnd()<.35*sk){set(P,pick(s===1?S.fresher:S.recruit));return true}
   if(thesisR&&th&&rnd()<(th==='crunch'?.25:th==='deadline'?.45:.35)){set(P,pick([...S[th],...(s==='m2'?S.m2:[])]).replace('{r}',thesisR));return true}
   if(job&&['setsumei','early','interview'].includes(job)&&rnd()<.15){set(P,pick(S.campusJob));return true}return false}
  // At home (residents shown as 自宅, awake).
  if(c.resident&&P.sit?.state!=='sleep'&&(typeof PlaceLabel==='undefined'||PlaceLabel.kind(c,P)==='自宅')){let th=thesis(t),yr=jobYear(s),job=shukatsu(t,yr);
   if(thesisR&&th&&th!=='defense'&&(h>=20||h<2)&&rnd()<.3){set(P,pick(S.thesisHome).replace('{r}',thesisR));return true}
   if(job&&job!=='naiteishiki'&&h>=9&&h<24&&rnd()<.2){set(P,pick(['intern','winter','apply'].includes(job)?S.homeIntern:S.homeJob));return true}return false}
  // 新歓コンパ in student towns on April evenings.
  if(['area_night','area_student','area_shopping'].includes(r)&&shinkan(t)&&h>=18&&h<23.5&&[1,2,3].includes(s)){let student=c.area?.tags?.student||c.landComponent?.areaTag?.tags?.student||0;
   if(student>=2&&rnd()<.5*shinkan(t)){set(P,pick(s===1?[...S.konpa,...(P.age<20?S.konpaMinor:[])]:[...S.konpa,...S.konpaHost]),'新歓コンパ','off');return true}}
  return false}
 return {stage,shinkan,thesis,shukatsu,officeRows,assign,apply,S};
})();
if(typeof module!=='undefined')module.exports=CampusLife;
