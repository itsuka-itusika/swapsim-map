/* 羽田空港: travellers, people seeing them off, the observation deck, airline and airport staff in the terminals,
   and the people who work airside (整備, グランドハンドリング, 給油, 管制 ...). Terminal 3 is international, with
   late-night flights. Densities, hours and shares are game assumptions. */
const AirportModel=(()=>{
 const pick=a=>a[Math.floor(rnd()*a.length)];
 const kindOf=z=>/^羽田空港第3ターミナル/.test(z?.name||'')?'intl':/^羽田空港第1・第2ターミナル/.test(z?.name||'')?'dom':/^羽田空港/.test(z?.name||'')&&z.kind==='airfield'?'field':null;
 // Share of the day's flights at this hour: domestic flights run about 6:00-23:00; international ones peak late.
 const ops=(k,h)=>k==='intl'?(h>=17||h<1?1:h<2?.7:h<5?.25:h<9?.6:.7):(h>=8&&h<20?1:h>=6&&h<8||h>=20&&h<22?.75:h>=22&&h<23.5?.3:h>=5.5&&h<6?.4:.02);
 const B={pax:[[0,5,3],[6,12,5],[13,19,6],[20,29,16],[30,39,18],[40,49,20],[50,59,17],[60,69,10],[70,85,5]],young:[[20,24,30],[25,29,30],[30,39,28],[40,49,12]],work:[[20,29,24],[30,39,26],[40,49,24],[50,59,19],[60,65,7]],pilot:[[26,29,10],[30,39,28],[40,49,28],[50,59,26],[60,64,8]],deck:[[3,12,25],[13,29,18],[30,49,32],[50,79,25]]};
 function roles(z,t){const k=kindOf(z);if(!k)return null;const h=t.hf??t.h,we=t.dow===0||t.dow===6||!!t.holiday,f=ops(k==='field'?'dom':k,h),out=[];
  const R=(key,label,n,female,bands,extra={})=>{if(n>0)out.push({role:'air_'+key,label,density:n,min:bands[0][0],max:bands.at(-1)[1],female,ageBands:bands,airKind:k,...extra})};
  if(k==='field'){
   R('mechanic','航空整備士',30*f+6,.07,B.work,{worker:true});R('ground','グランドハンドリングスタッフ',60*f+3,.25,B.young.concat([[50,59,6]]),{worker:true});R('fuel','航空機の給油作業員',6*f,.05,B.work,{worker:true});
   R('cabinclean','機内清掃スタッフ',12*f,.6,B.work,{worker:true});R('catering','機内食の搭載スタッフ',6*f,.3,B.work,{worker:true});R('control','航空管制官',1.6*(f>.1?1:.5),.25,B.work,{worker:true});
   R('cargo','航空貨物の作業員',15*(h>=6&&h<23?1:.6),.15,B.work,{worker:true});R('guard','空港の警備員',3,.15,[[20,39,30],[40,59,40],[60,72,30]],{worker:true});return out}
  const intl=k==='intl',dep=(intl?3600:5200)*f,arr=(intl?2400:2200)*f;
  R('depart',intl?'国際線の出発客':'国内線の出発客',dep*(intl?.6:1),we?.5:.42,B.pax);
  if(intl)R('depart_inbound','国際線の出発客',dep*.4,.5,B.pax,{inboundGuest:true});
  R('arrive',intl?'国際線の到着客':'国内線の到着客',arr*(intl?.45:1),we?.5:.42,B.pax);
  if(intl)R('arrive_inbound','国際線の到着客',arr*.55,.5,B.pax,{inboundGuest:true});
  R('meet','見送り・出迎えの人',(intl?700:900)*f,.55,[[6,15,10],[16,29,20],[30,59,45],[60,85,25]]);
  if(h>=6.5&&h<22)R('deck','展望デッキの見物客',(we?600:300)*(h>=17?.7:1),.45,B.deck);
  R('gs','航空会社のグランドスタッフ',600*f+40,.78,B.young,{worker:true});R('security','保安検査員',320*f+15,.5,B.work,{worker:true});
  R('ca','客室乗務員',230*f,.85,[[22,29,45],[30,39,35],[40,55,20]],{worker:true});R('pilot','旅客機のパイロット',80*f,.05,B.pilot,{worker:true});
  R('shop','空港の店舗スタッフ',800*(h>=6&&h<21?1:intl&&(h>=21||h<1)?.4:.08),.7,B.work,{worker:true});
  R('clean','空港の清掃スタッフ',h>=23||h<5?260:180,.6,[[25,49,35],[50,74,65]],{worker:true});R('guard','空港の警備員',80,.15,[[20,39,30],[40,59,40],[60,72,30]],{worker:true});
  if(intl){R('customs','税関職員',120*f+10,.35,B.work,{worker:true});R('immigration','入国審査官',100*f+8,.4,B.work,{worker:true});R('quarantine','検疫官',30*f+3,.5,B.work,{worker:true});R('dutyfree','免税店の販売員',150*f,.75,B.young,{worker:true})}
  return out}
 const T={
  depart:['自動チェックイン機で、搭乗券を発行したところでした','保安検査場の列で、ポケットの小銭をトレーに出しているところでした','搭乗口の前の椅子で、優先搭乗のアナウンスを聞いているところでした','出発ロビーの土産物店で、東京土産のお菓子を箱で買い込んでいるところでした','搭乗口近くのカフェで、出発前のコーヒーを飲んでいるところでした','搭乗開始のアナウンスで、ボーディングブリッジへ歩き出したところでした','手荷物を預けるカウンターで、スーツケースの重さを量ってもらっているところでした'],
  departWork:['出張の資料を、搭乗口の前でノートパソコンで直しているところでした'],
  departIntl:['出国審査を抜け、免税店の香水売り場を眺めているところでした','海外旅行の出発前に、両替した外貨を財布に分けて入れているところでした','チェックインカウンターの長い列で、パスポートを手に順番を待っているところでした'],
  departInbound:['帰国便を前に、免税店で日本のお菓子を買い足しているところでした','出発ロビーで、使い残した日本の小銭をどうするか迷っているところでした'],
  departNight:['深夜便を待ちながら、出発ロビーのソファで仮眠をとっているところでした','深夜の出発ロビーで、まだ開いている店を探して歩いているところでした'],
  arrive:['手荷物受取所で、ベルトコンベアから自分のスーツケースを探しているところでした','到着ロビーで、迎えに来た家族に手を振ったところでした','到着ロビーから、モノレールの乗り場へ向かっているところでした','到着便から降り、ボーディングブリッジを歩いているところでした'],
  arriveIntl:['入国審査の列で、パスポートを手に順番を待っているところでした','税関の申告の列で、スマホの申告画面を表示しているところでした'],
  arriveInbound:['入国審査の列に並び、パスポートを手に順番を待っているところでした','到着ロビーで、交通系ICカードを買おうと券売機の前で迷っているところでした','両替所の前で、為替レートの表示を見比べているところでした','到着ロビーで、宿までの行き方をスマホの地図で調べているところでした'],
  meet:['出発口の前で、旅立つ家族に手を振って見送ったところでした','到着口の前で、到着便の表示が「到着済み」に変わるのを待っているところでした','到着口で、名前を書いたボードを掲げて待っているところでした'],
  deck:['展望デッキで、離陸していく飛行機にカメラを向けているところでした','展望デッキのフェンス越しに、子どもと一緒に飛行機を数えているところでした','展望デッキで、着陸してくる飛行機の機体のロゴを見分けているところでした'],
  deckNight:['夜の展望デッキで、滑走路の誘導灯の光を眺めているところでした'],
  gs:['チェックインカウンターで、乗客のスーツケースにタグを付けたところでした','搭乗口で、搭乗開始のアナウンスをしているところでした','乗り継ぎに遅れそうな乗客を、搭乗口まで小走りで案内しているところでした','搭乗口で、車いすの乗客の事前搭乗を手伝っているところでした'],
  security:['保安検査場で、X線の画面に映った荷物の中身を確かめているところでした','金属探知機を鳴らした乗客を、ハンディ型の探知機で確かめているところでした','保安検査の列で、液体物の持ち込みのルールを案内しているところでした'],
  ca:['乗務前の打ち合わせを終え、キャリーバッグを引いて搭乗口へ向かっているところでした','乗務を終え、クルー専用の通路を歩いているところでした','乗務前に、機内アナウンスの原稿をもう一度確かめているところでした'],
  pilot:['飛行前の打ち合わせで、目的地の天気図を確かめているところでした','乗務を終え、制帽をかぶってターミナルを歩いているところでした','操縦室で、出発前の計器の点検を進めているところでした'],
  shop:['空港の土産物店で、売れ筋の菓子の箱を棚に積み上げているところでした','空港のレストランで、出発前の客に急いで料理を出しているところでした','空港のコンビニで、早朝便の客のレジを続けて打っているところでした'],
  clean:['出発ロビーの床を、大きな清掃機で磨いているところでした','手荷物受取所の周りの忘れ物を確かめているところでした'],
  guard:['ターミナルの入口で、置き去りの荷物がないか見回っているところでした','制限区域の入口で、作業員の通行証を確かめているところでした'],
  customs:['税関の検査台で、旅行者のスーツケースの中身を確かめているところでした','税関で、申告の端末の使い方を旅行者に説明しているところでした'],
  immigration:['入国審査のブースで、パスポートの写真と顔を見比べているところでした','入国審査の列を、空いているブースへ順に案内しているところでした'],
  quarantine:['検疫所のカウンターで、体温の表示を確かめているところでした'],
  dutyfree:['免税店で、外国人客に日本酒の味の違いを説明しているところでした','免税店のレジで、搭乗券を見せてもらっているところでした'],
  mechanic:['駐機場で、到着した機体のタイヤの溝を点検しているところでした','格納庫で、エンジンのカバーを開けて点検しているところでした','出発前の機体の周りを一周し、外観を目で確かめているところでした'],
  ground:['トーイングカーで、出発する機体を後ろへ押し出しているところでした','到着機の貨物室から、手荷物をコンテナに積み替えているところでした','駐機場で、到着機を誘導するパドルを振っているところでした','手荷物を積んだカートを連ねて、駐機場を走っているところでした'],
  fuel:['給油車のホースを主翼の下につなぎ、給油を始めたところでした'],
  cabinclean:['到着したばかりの機内で、座席ポケットのごみを手早く回収しているところでした','次の便に間に合うよう、機内のシートベルトを一列ずつそろえているところでした'],
  catering:['機内食を積んだ高床式のトラックを、機体のドアに横付けしたところでした'],
  control:['管制塔で、着陸の許可を無線で伝えたところでした','管制塔の窓から、滑走路の手前で待つ機体を確かめているところでした'],
  cargo:['航空貨物の上屋で、海外へ送るコンテナに荷物を固定しているところでした','フォークリフトで、到着した航空貨物を仕分け場へ運んでいるところでした']};
 const JOB={pilot:'旅客機のパイロット'};
 function assign(c,P){if(!c.role?.startsWith('air_'))return false;const k=c.role.slice(4);
  if(c.worker){let job=JOB_OBJS.find(j=>j.n===JOB[k]);P.occ={label:c.label,group:'adult',cat:job?.cat||'輸送',tag:job?.tag||'airport',job,kind:'employed',p:1};return true}
  if(['facility','prison'].includes(P.occ.group))P.occ={label:'無職',group:P.age>=65?'senior':'adult',cat:'none',p:1};return true}
 function apply(c,P,t){if(!c.role?.startsWith('air_'))return false;const k=c.role.slice(4),h=t.hf??t.h,intl=c.airKind==='intl',wd=t.dow>0&&t.dow<6&&!t.holiday,employed=P.occ?.group==='adult'&&P.occ.cat!=='none';let text;
  if(k==='depart')text=pick(intl?(h>=22||h<3?[...T.departNight,...T.departIntl]:T.departIntl):wd&&employed&&rnd()<.3?T.departWork:T.depart);
  else if(k==='depart_inbound')text=pick(h>=22||h<3?[...T.departNight,...T.departInbound]:T.departInbound);
  else if(k==='arrive')text=pick(intl?[...T.arriveIntl,...T.arrive.slice(0,3)]:T.arrive);
  else if(k==='arrive_inbound')text=pick(T.arriveInbound);
  else if(k==='deck')text=pick(h>=18?[...T.deckNight,T.deck[0]]:P.age<13?T.deck.slice(1):T.deck);
  else text=pick(T[k]||T.guard);
  P.mapSituation=text;P.visitLabel=c.label;P.sit={...P.sit,text,state:c.worker?'work':k==='meet'||k==='deck'?'off':'commute',stateLabel:c.worker?c.label:c.label,p:1,source:'airport'};return true}
 return {kindOf,roles,assign,apply,ops};
})();
if(typeof module!=='undefined')module.exports=AirportModel;
