/* ホテル街 (districts of short-stay hotels: 円山町, 鶯谷, 湯島 ...): guests, visiting adult-service workers and hotel staff.
   Scenes stay non-explicit. Shares, hours and ages are game assumptions. */
const LoveHotelModel=(()=>{
 const pick=a=>a[Math.floor(rnd()*a.length)];
 // Guests: 休憩 by day, busiest in the evening, 宿泊 overnight, checkout in the morning; more at weekends.
 function activity(k,t){let h=t.hf??t.h,we=t.dow===0||t.dow===6||!!t.holiday||t.dow===5&&h>=18;
  if(k==='guest')return (we?1.3:1)*(h>=18?2.2:h<5?2:h<11?.45:h>=12?.6:.3);
  return h>=10&&h<16?1:.6}
 const AGES={guest:[[20,24,22],[25,29,25],[30,39,27],[40,40,2]],staff:[[20,29,14],[30,39,18],[40,49,22],[50,59,26],[60,74,20]]};
 function rows(tag,t,row,area){let lv=tag.lovehotel||0;if(lv<=0)return [];
  return [row('area_lovehotel_guest','ホテル街の利用客',lv*.9*activity('guest',t),20,40,.5,{area,ageBands:AGES.guest,loveHotel:true}),
   ...((t.hf??t.h)>=11||(t.hf??t.h)<3?[row('area_lovehotel_service_worker','ホテル街で働く派遣型風俗店の女性スタッフ',lv*.18*activity('guest',t),20,40,1,{area,ageBands:AGES.guest,loveHotel:true})]:[]),
   row('area_lovehotel_staff','ホテル街のホテルの従業員',lv*.14*activity('staff',t),20,74,.62,{area,ageBands:AGES.staff,loveHotel:true,placeWorker:true})]}
 const T={
  day:['部屋の写真が並んだパネルの前で、空いている部屋を選んでいるところでした','休憩料金の看板を見上げ、相手と小声で相談しているところでした','部屋の大きなテレビで、カラオケの曲を選んでいるところでした','備え付けのアメニティを眺めて、入浴剤を一つ選んだところでした','部屋の電話で、フロントに休憩の延長を伝えたところでした'],
  evening:['ホテル街の坂道を、相手と並んで歩いているところでした','満室の表示が続くなか、空室のある看板を探して歩いているところでした','終電を気にしながら、泊まっていくか相手と話しているところでした','ルームサービスのメニューを開き、夜食を何にするか迷っているところでした','部屋の照明のスイッチが多すぎて、どれを押すか迷っているところでした'],
  night:['大きなベッドで、相手より先に眠り込んだところでした','ルームサービスで頼んだラーメンが届き、ドアを開けたところでした','夜中に目が覚め、静かな部屋で冷蔵庫の水を飲んだところでした'],
  room:['部屋のソファで、パートナーと今日あった出来事を話して笑い合っているところでした','ベッドに並んで寝転び、パートナーと次の旅行の行き先を相談しているところでした','コンビニで買ったお菓子を広げ、パートナーとたわいもない話をしているところでした','お風呂上がりに、パートナーと缶ビールで乾杯したところでした','部屋のカラオケで、パートナーと昔の流行歌をデュエットしているところでした','パートナーの話に笑いすぎて、ベッドから転げ落ちそうになったところでした','パートナーと並んで、スマホで撮った今日の写真を見返しているところでした','パートナーと、初めて会った日のことを思い出して話しているところでした'],
  roomNight:['部屋のテレビの深夜番組に、パートナーと二人でツッコミを入れているところでした','明かりを少し落とした部屋で、パートナーと他愛もない話を続けているところでした'],
  sleep:['大きなベッドで、ぐっすり眠っているところでした','大きなベッドで、パートナーと抱き合ったまま眠っているところでした','パートナーの腕を枕にして、すやすや眠っているところでした','パートナーと手をつないだまま、眠りに落ちているところでした','パートナーの寝息を聞きながら、うとうとしているところでした','スマホの充電を忘れたまま、眠ってしまっているところでした','つけっぱなしのテレビの明かりの中で、眠り込んでいるところでした','空調の音だけが響く部屋で、深く眠っているところでした','広すぎるベッドの端で、丸くなって眠っているところでした','パートナーに布団を取られ、寝返りを打ったところでした','寝相の悪いパートナーに蹴られて、ふと目が覚めたところでした','アラームをセットし忘れていないか、寝ぼけながら確かめたところでした'],
  morning:['窓のない部屋で、スマホの時計を見て慌てて起きたところでした','延長料金がかからないよう、急いで身支度をしているところでした','チェックアウトの精算機に、千円札を一枚ずつ入れているところでした','ホテルを出て、駅とは別の方向へ時間差で歩き出したところでした'],
  waiting:['ホテルの部屋で、店から案内された女性が来るのを待っているところでした','部屋番号を店に伝え、ベッドの端に腰かけて女性の到着を待っているところでした','ホテルの部屋で、派遣型風俗店からの到着連絡をスマホで確かめているところでした','シャワーを済ませ、指名した女性が来るのを待っているところでした'],
  workerPrep:["店から届いたホテル名と部屋番号を確かめ、客の待つ部屋へ向かっているところでした","ホテルの廊下で部屋番号を確かめ、客の部屋のドアをノックしようとしているところでした","客の待つ部屋で、バッグから仕事道具を取り出して準備しているところでした","客に挨拶を済ませ、サービスを始める準備をしているところでした"],
  customerService:["ホテルの部屋で、指名した女性からサービスを受けているところでした","店から来た女性のサービスを受けながら、ホテルの部屋で過ごしているところでした","ホテルの部屋で、延長するか考えながら女性のサービスを受けているところでした"],
  workerService:["ホテルの部屋で、自分を指名した客にサービスをしているところでした","派遣先のホテルの部屋で、客にサービスをしているところでした","終了時刻を気にしながら、ホテルの部屋で客にサービスをしているところでした"],
  cleaner:['清掃中の部屋で、シーツを手早く張り替えているところでした','ルームメイクのワゴンを押して、次の部屋へ向かっているところでした','タオルの山を、業務用の洗濯機に放り込んだところでした','清掃を終えた部屋で、忘れ物がないかベッドの下をのぞいたところでした'],
  front:['清掃の終わった部屋から、空室表示のパネルを点灯させているところでした','小窓だけのフロントで、部屋の鍵を差し出したところでした','フロントで、延長するかどうかの電話に答えているところでした'],
  frontNight:['深夜のフロントで、防犯カメラのモニターを見ているところでした','フロントで、ルームサービスの注文を厨房に伝えたところでした']};
 function assign(c,P){if(!c.loveHotel)return false;
  if(c.role==='area_lovehotel_service_worker'){let job=JOB_OBJS.find(j=>j.tag==='adultservice'&&j.f>0&&P.age>=(j.o.amin||20)&&P.age<=(j.o.amax||59));if(!job)throw Error('No eligible hotel adult-service job');P.occ={label:job.o.labels?.f||job.n,group:'adult',cat:job.cat,tag:job.tag,job,kind:'employed',p:1};return true}
  if(c.role==='area_lovehotel_staff'){let front=rnd()<.35,job=JOB_OBJS.find(j=>j.n===(front?'ホテルのフロント係':'ビル清掃員'));P.occ={label:front?'ホテルのフロント係':'ホテルの客室清掃スタッフ',group:'adult',cat:job?.cat||'サービス',tag:job?.tag||'hotel',job,kind:'employed',p:1,front};return true}
  if(['student','kid','baby','facility','prison'].includes(P.occ.group))P.occ={label:'会社員',group:'adult',cat:'事務',p:1};return true}
 function apply(c,P,t){if(!c.loveHotel)return false;let h=t.hf??t.h,text,state='off';
  if(c.role==='area_lovehotel_staff'){text=pick(P.occ.front?(h>=22||h<6?[...T.frontNight,...T.front]:T.front):T.cleaner);state='work'}
  else if(c.role==='area_lovehotel_service_worker'){text=pick(rnd()<.4?T.workerPrep:T.workerService);state='work'}
  else if(c.role==='area_lovehotel_guest'&&P.sex==='m'&&P.age>=20&&(h>=11||h<3)&&rnd()<.4)text=pick(rnd()<.5?T.waiting:T.customerService);
  else if(h>=1&&h<6&&rnd()<.6){text=typeof DREAMS!=='undefined'&&rnd()<.15?'夢の中で、'+pick(DREAMS)+'ところでした':pick(T.sleep);state='sleep'}
  // About half the time they are simply in the room, talking and laughing together.
  else if(h>=11&&rnd()<.5||(h>=21||h<5)&&rnd()<.5)text=pick(h>=22||h<5?[...T.room,...T.roomNight]:T.room);
  else text=pick(h>=18||h<1?T.evening:h<5?T.night:h<11?T.morning:T.day);
  // Unmarried guests are with a 恋人; パートナー stays for the married.
  if(P.household?.mar!=='married')text=text.replace(/パートナー/g,'恋人');
  P.placeOverride=(c.area?.name||'')+' ホテル街';P.mapSituation=text;P.visitLabel=c.label;P.sit={...P.sit,text,state,stateLabel:c.role==='area_lovehotel_service_worker'?'派遣型風俗店の仕事中':c.role==='area_lovehotel_staff'?P.occ.label:'ホテル街で過ごしている',p:1,source:'lovehotel'};return true}
 return {rows,assign,apply,activity};
})();
if(typeof module!=='undefined')module.exports=LoveHotelModel;
