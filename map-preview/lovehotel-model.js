/* ホテル街 (districts of short-stay hotels: 円山町, 鶯谷, 湯島 ...): couples staying there and the hotel staff.
   Scenes stay non-explicit. Shares, hours and ages are game assumptions. */
const LoveHotelModel=(()=>{
 const pick=a=>a[Math.floor(rnd()*a.length)];
 // Guests: 休憩 by day, busiest in the evening, 宿泊 overnight, checkout in the morning; more at weekends.
 function activity(k,t){let h=t.hf??t.h,we=t.dow===0||t.dow===6||!!t.holiday||t.dow===5&&h>=18;
  if(k==='guest')return (we?1.3:1)*(h>=18?2.2:h<5?2:h<11?.45:h>=12?.6:.3);
  return h>=10&&h<16?1:.6}
 const AGES={guest:[[20,24,22],[25,29,25],[30,39,27],[40,49,16],[50,64,10]],staff:[[20,29,14],[30,39,18],[40,49,22],[50,59,26],[60,74,20]]};
 function rows(tag,t,row,area){let lv=tag.lovehotel||0;if(lv<=0)return [];
  return [row('area_lovehotel_guest','ホテル街の利用客',lv*.9*activity('guest',t),20,64,.5,{area,ageBands:AGES.guest,loveHotel:true}),
   row('area_lovehotel_staff','ホテル街のホテルの従業員',lv*.14*activity('staff',t),20,74,.62,{area,ageBands:AGES.staff,loveHotel:true,placeWorker:true})]}
 const T={
  day:['部屋の写真が並んだパネルの前で、空いている部屋を選んでいるところでした','休憩料金の看板を見上げ、相手と小声で相談しているところでした','部屋の大きなテレビで、カラオケの曲を選んでいるところでした','備え付けのアメニティを眺めて、入浴剤を一つ選んだところでした','部屋の電話で、フロントに休憩の延長を伝えたところでした'],
  evening:['ホテル街の坂道を、相手と並んで歩いているところでした','満室の表示が続くなか、空室のある看板を探して歩いているところでした','終電を気にしながら、泊まっていくか相手と話しているところでした','ルームサービスのメニューを開き、夜食を何にするか迷っているところでした','部屋の照明のスイッチが多すぎて、どれを押すか迷っているところでした'],
  night:['大きなベッドで、相手より先に眠り込んだところでした','ルームサービスで頼んだラーメンが届き、ドアを開けたところでした','夜中に目が覚め、静かな部屋で冷蔵庫の水を飲んだところでした'],
  sleep:['大きなベッドで、ぐっすり眠っているところでした'],
  morning:['窓のない部屋で、スマホの時計を見て慌てて起きたところでした','延長料金がかからないよう、急いで身支度をしているところでした','チェックアウトの精算機に、千円札を一枚ずつ入れているところでした','ホテルを出て、駅とは別の方向へ時間差で歩き出したところでした'],
  cleaner:['清掃中の部屋で、シーツを手早く張り替えているところでした','ルームメイクのワゴンを押して、次の部屋へ向かっているところでした','タオルの山を、業務用の洗濯機に放り込んだところでした','清掃を終えた部屋で、忘れ物がないかベッドの下をのぞいたところでした'],
  front:['清掃の終わった部屋から、空室表示のパネルを点灯させているところでした','小窓だけのフロントで、部屋の鍵を差し出したところでした','フロントで、延長するかどうかの電話に答えているところでした'],
  frontNight:['深夜のフロントで、防犯カメラのモニターを見ているところでした','フロントで、ルームサービスの注文を厨房に伝えたところでした']};
 function assign(c,P){if(!c.loveHotel)return false;
  if(c.role==='area_lovehotel_staff'){let front=rnd()<.35,job=JOB_OBJS.find(j=>j.n===(front?'ホテルのフロント係':'ビル清掃員'));P.occ={label:front?'ホテルのフロント係':'ホテルの客室清掃スタッフ',group:'adult',cat:job?.cat||'サービス',tag:job?.tag||'hotel',job,kind:'employed',p:1,front};return true}
  if(['student','kid','baby','facility','prison'].includes(P.occ.group))P.occ={label:'会社員',group:'adult',cat:'事務',p:1};return true}
 function apply(c,P,t){if(!c.loveHotel)return false;let h=t.hf??t.h,text,state='off';
  if(c.role==='area_lovehotel_staff'){text=pick(P.occ.front?(h>=22||h<6?[...T.frontNight,...T.front]:T.front):T.cleaner);state='work'}
  else if(h>=1&&h<6&&rnd()<.6){text=pick(T.sleep);state='sleep'}
  else text=pick(h>=18||h<1?T.evening:h<5?T.night:h<11?T.morning:T.day);
  P.mapSituation=text;P.visitLabel=c.label;P.sit={...P.sit,text,state,stateLabel:c.role==='area_lovehotel_staff'?P.occ.label:'ホテル街で過ごしている',p:1,source:'lovehotel'};return true}
 return {rows,assign,apply,activity};
})();
if(typeof module!=='undefined')module.exports=LoveHotelModel;
