/* コンテナふ頭 (大井, 青海, 品川, 中央防波堤): crane and yard operators, lashing crews and tally clerks work ships
   around the clock; trailer drivers queue for the gate before it opens and fill the yard in gate hours; gate clerks,
   customs, foreign ship crews, line handlers and guards. Footprints are approximate; densities and hours are game
   assumptions. */
const PortModel=(()=>{
 const pick=a=>a[Math.floor(rnd()*a.length)];
 const work=[[20,29,18],[30,39,24],[40,49,26],[50,59,22],[60,67,10]];
 function roles(z,t){if(z?.kind!=='port')return null;const h=t.hf??t.h,sun=t.dow===0||!!t.holiday,sat=t.dow===6,gate=!sun&&(sat?h>=8.5&&h<12:h>=8.5&&h<16.5),queue=!sun&&h>=6&&h<8.5,ship=h>=6&&h<22?1:.7,out=[];
  const R=(key,label,n,female,bands,extra={})=>{if(n>0)out.push({role:'port_'+key,label,density:n,min:bands[0][0],max:bands.at(-1)[1],female,ageBands:bands,worker:true,...extra})};
  R('crane','ガントリークレーンのオペレーター',14*ship,.04,work);R('yard','ストラドルキャリアの運転士',30*ship,.04,work);R('lashing','コンテナ船の荷役作業員',40*ship,.03,work);
  R('trailer','海上コンテナのトレーラー運転手',gate?140:queue?90:sun?4:14,.03,[[25,39,25],[40,49,30],[50,59,30],[60,69,15]]);
  R('gate','コンテナターミナルの事務員',gate?18:4,.45,work);R('tally','検数員',10*ship,.15,work);R('customs','税関職員',gate?5:0,.3,work);
  R('crew','外航コンテナ船の船員',20,.05,[[20,29,35],[30,39,30],[40,49,20],[50,62,15]],{foreignCrew:true});R('line','綱取りの作業員',3*ship,.03,work);R('guard','ふ頭の警備員',5,.08,[[25,49,35],[50,72,65]]);
  return out}
 const T={
  crane:['ガントリークレーンの運転室から、真下のコンテナをつかむ位置を合わせているところでした','高さ40メートルの運転室から、船の甲板にコンテナを一つ下ろしたところでした','クレーンの運転室で、無線の合図に合わせて巻き上げを止めたところでした'],
  craneNight:['夜通し続く荷役で、照明に照らされたコンテナ船の甲板を見下ろしているところでした'],
  yard:['ストラドルキャリアで、コンテナをまたいで所定の列まで運んでいるところでした','ヤードの端で、次に船へ積むコンテナの番号を画面で確かめているところでした'],
  lashing:['コンテナ船の甲板で、コンテナを固定する金具を外しているところでした','ラッシングバーを担いで、積み上がったコンテナの列の間を歩いているところでした','岸壁の上で、クレーンから下りてくるコンテナの角を手で合図しているところでした'],
  trailer:['ゲートの受付で、運ぶコンテナの番号を書類と照らし合わせてもらっているところでした','シャーシに積んだ40フィートのコンテナを、固定の金具で留めたところでした','空のコンテナを返しに、ヤードの指定の場所へトレーラーを進めているところでした','ふ頭の外の道に連なるトレーラーの列で、少しずつ車を進めているところでした'],
  trailerQueue:['ゲートが開くのを待つトレーラーの長い列で、運転席で仮眠をとっているところでした','開門前の列で、今日の運び先と時間を携帯で確かめているところでした'],
  trailerNight:['ふ頭近くの待機場で、翌朝の搬入に備えてトレーラーを止めたところでした'],
  gate:['ゲートの受付窓口で、搬入票の番号をシステムに打ち込んでいるところでした','本船の荷役計画を、画面の上でコンテナ一つずつ並べ替えているところでした'],
  tally:['検数員として、積み込まれるコンテナの番号を一つずつ記録しているところでした','船から下ろしたコンテナの封印の番号を、書類と見比べているところでした'],
  customs:['税関のX線検査場で、トレーラーごとコンテナの中身を確かめているところでした'],
  crew:['停泊中のコンテナ船の甲板で、荷役の進み具合を見守っているところでした','停泊中の船から下り、ふ頭の近くの店へ歩いているところでした','船室で、次の寄港地までの航海の予定を確かめているところでした'],
  line:['岸壁で、入港するコンテナ船の係留ロープを受け取っているところでした','出港するコンテナ船の係留ロープを、岸壁の柱から外したところでした'],
  guard:['ヤードの入口で、出入りするトレーラーの通行証を確かめているところでした','夜のふ頭を、懐中電灯を手に巡回しているところでした']};
 function assign(c,P){if(!c.role?.startsWith('port_'))return false;const k=c.role.slice(5),job=JOB_OBJS.find(j=>j.n===(k==='trailer'?'トラック運転手':k==='guard'?'警備員':''));
  P.occ={label:c.label,group:'adult',cat:job?.cat||'輸送',tag:job?.tag||'port',job,kind:'employed',p:1};return true}
 function apply(c,P,t){if(!c.role?.startsWith('port_'))return false;const k=c.role.slice(5),h=t.hf??t.h,night=h>=21||h<6;let text;
  // Ship crews are seafarers from abroad: a foreign name, and the occupation stays theirs.
  if(c.foreignCrew&&typeof PersonContext!=='undefined'){const markets=['フィリピン','インドネシア','ベトナム','中国','インド'],m=pick(markets),nm=PersonContext.foreignName(m,P.sex,rnd);if(nm){P.surname={k:nm.surname,r:nm.surname,c:100};P.given={k:nm.given,r:nm.given,p:.01,era:{cov:1}};P.nameApproximate=nm.approximated;P.originMarket=m;P.isInbound=true}}
  if(k==='crane')text=pick(night?[...T.craneNight,...T.crane]:T.crane);
  else if(k==='trailer')text=pick(h>=6&&h<8.5?T.trailerQueue:night?T.trailerNight:T.trailer);
  else if(k==='guard')text=pick(night?T.guard.slice(1):T.guard.slice(0,1));
  else text=pick(T[k]);
  P.mapSituation=text;P.visitLabel=c.label;P.sit={...P.sit,text,state:'work',stateLabel:c.label,p:1,source:'port'};return true}
 return {roles,assign,apply};
})();
if(typeof module!=='undefined')module.exports=PortModel;
