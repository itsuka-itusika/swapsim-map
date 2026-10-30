/* Taxi waiting areas (青山公園調整待機所): drivers wait between fares and rest, most of them late at night for
   六本木 and the TV studios nearby, fewer by day. Counts, hours and ages are game assumptions. */
const TaxiModel=(()=>{
 const pick=a=>a[Math.floor(rnd()*a.length)];
 const kind=c=>c?.placeKind==='taxipool'?'taxipool':null;
 // Taxi drivers are older than most workers.
 const bands=[[25,39,8],[40,49,16],[50,59,30],[60,69,32],[70,79,14]];
 function count(t){const h=t.hf??t.h,late=t.dow===5||t.dow===6;return h<4?(late?60:45):h<7?25:h<11?12:h<15?28:h<21?18:late?55:42}
 function roles(c,t){if(!kind(c))return null;return [{role:'taxi_driver',label:'客待ち・休憩中のタクシー運転手',w:count(t),min:25,max:79,female:.04,ageBands:bands,worker:true,taxiPool:c}]}
 const T={any:['客待ちの合間に、車内で缶コーヒーを飲みながらラジオの交通情報を聞いているところでした','公園のトイレに寄ってから、車に戻ったところでした','今日の営業収入を、日報に書き込んでいるところでした','同じ会社の運転手と、車の外で今夜の客足について話しているところでした','配車アプリの画面を見ながら、近くで呼ばれるのを待っているところでした'],
  night:['六本木に戻るか迷いながら、車内で時計を見ているところでした','シートを少し倒して、次の客に備えて目を閉じているところでした','テレビ局の送りの予約まで、車内で時間をつぶしているところでした'],
  dawn:['夜通しの乗務を終える前に、ひと息ついて帰庫の時間を確かめているところでした','明けていく空を見ながら、シートを倒して仮眠をとっているところでした'],
  day:['エンジンを止めた車内で、コンビニの弁当を食べているところでした','木陰に車を停めて、昼休みをとっているところでした']};
 function assign(c,P){if(c.role!=='taxi_driver')return false;const job=typeof JOB_OBJS!=='undefined'?JOB_OBJS.find(j=>j.n==='タクシー運転手'):null;P.occ={label:'タクシー運転手',group:'adult',cat:job?.cat||'輸送',tag:'taxi',job,kind:'employed',p:1};return true}
 function apply(c,P,t){if(c.role!=='taxi_driver')return false;const h=t.hf??t.h,own=h>=21||h<4?T.night:h<7?T.dawn:h>=11&&h<15?T.day:[],text=pick(own.length&&rnd()<.6?own:T.any);
  P.mapSituation=text;P.visitLabel=c.label;P.sit={...P.sit,text,state:'work',stateLabel:c.label,p:1,source:'taxi'};return true}
 return {kind,roles,assign,apply,count};
})();
if(typeof module!=='undefined')module.exports=TaxiModel;
