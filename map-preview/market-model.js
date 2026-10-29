/* 東京都中央卸売市場: セリ人, 仲卸, buyers from shops and restaurants, ターレ drivers, the night's delivery trucks,
   market staff and, at 豊洲, visitors. Markets close on Sundays and holidays and on some Wednesdays; counts, hours and
   shares are game assumptions. */
const MarketModel=(()=>{
 const pick=a=>a[Math.floor(rnd()*a.length)];
 const kind=c=>c?.placeKind==='market'?'market':null;
 const day=t=>`${t.y}-${String(t.mo).padStart(2,'0')}-${String(t.d).padStart(2,'0')}`,hash=s=>{let h=0;for(const ch of s)h=(h*31+ch.charCodeAt(0))>>>0;return h};
 // 休市日: Sundays, holidays and about half the Wednesdays.
 const closed=t=>t.dow===0||!!t.holiday||(typeof holName==='function'&&!!holName(t))||t.dow===3&&hash(day(t))%2===0;
 const work=[[20,29,14],[30,39,20],[40,49,24],[50,59,24],[60,74,18]];
 function roles(c,t){if(!kind(c))return null;const h=t.hf??t.h,s=c.scale||.3,shut=closed(t),fish=c.goods?.includes('fish'),out=[];
  const R=(key,label,n,female,bands,extra={})=>{n*=s;if(n>0)out.push({role:'market_'+key,label,w:n,min:bands[0][0],max:bands.at(-1)[1],female,ageBands:bands,market:c,...extra})};
  // The night's deliveries arrive before the markets open, also on the evening before an open day.
  R('truck','市場に荷を運ぶトラック運転手',h>=21||h<5?(shut&&h<5?40:300):h<9?120:30,.03,[[25,39,25],[40,49,30],[50,59,30],[60,69,15]],{worker:true});
  R('guard','市場の警備員',30,.08,[[25,49,35],[50,72,65]],{worker:true});
  if(shut)return out;
  const sale=h>=4.5&&h<10,trade=h>=3&&h<12,day2=h>=6&&h<17;
  R('seri','卸売会社のセリ人',h>=2&&h<9?300:h<15?60:0,.08,work,{worker:true});
  R('nakaoroshi','仲卸業者',trade?1500:h>=12&&h<14?300:0,.15,work,{worker:true});
  R('buyer','市場の買出人',sale?1500:h>=10&&h<12?300:0,.15,work);
  R('turret','ターレの運転手',trade?400:0,.05,work,{worker:true});
  R('staff','市場の職員（東京都）',day2?80:h>=2&&h<6?15:0,.35,[[22,29,20],[30,39,25],[40,49,25],[50,64,30]],{worker:true});
  if(c.visitors){R('visitor','市場の見学者',h>=5&&h<14?800*c.visitors*(t.dow===6?1.4:1):0,.45,[[10,29,25],[30,49,35],[50,79,40]]);R('visitor_inbound','市場の見学者',h>=5&&h<14?500*c.visitors*(t.dow===6?1.4:1):0,.45,[[20,39,50],[40,69,50]],{inboundGuest:true})}
  if(fish||c.visitors)R('food','市場の飲食店スタッフ',h>=4.5&&h<15?300:0,.45,work,{worker:true});
  return out}
 const G={
  fish:{seri:['マグロのセリで、手やりの合図を読み取って値を競り上げているところでした','セリ場に並んだ冷凍マグロの番号を、帳面と照らし合わせているところでした'],
   nakaoroshi:['仲卸の店先で、包丁でマグロを柵に切り分けているところでした','なじみのすし店の主人に、今朝のおすすめの魚を伝えたところでした','発泡スチロールの箱に氷を詰め、注文の魚を並べているところでした','セリ場で、マグロの尾の断面を懐中電灯で照らして身の色を確かめているところでした'],
   buyer:['すし店の仕入れで、仲卸の店先の魚を一尾ずつ見比べているところでした','鮮魚店の仕入れで、今日の相場を仲卸の主人に聞いているところでした'],
   buyerLabel:['すし店の店主','鮮魚店の店主','料理店の仕入れ担当','スーパーの鮮魚の仕入れ担当']},
  produce:{seri:['青果のセリ場で、箱に詰まったキャベツを前に値をつけているところでした','産地から届いたみかんの箱の山を、セリの前に見て回っているところでした'],
   nakaoroshi:['仲卸の店先で、八百屋の店主に今日の葉物の値段を伝えているところでした','段ボール箱を積み上げ、配送先ごとに仕分けているところでした','注文の野菜を、得意先ごとの台車に積み分けているところでした'],
   buyer:['八百屋の仕入れで、仲卸の店先のトマトの色を見比べているところでした','飲食店の仕入れで、今日の葉物の相場を確かめているところでした'],
   buyerLabel:['八百屋の店主','スーパーの青果の仕入れ担当','飲食店の仕入れ担当']},
  flower:{seri:['花きのセリで、電光掲示の値が下がっていくのを見つめているところでした','セリにかける切り花の箱を、等級ごとに並べ替えているところでした'],
   nakaoroshi:['仲卸の店先で、バラの束を水の入ったバケツに移しているところでした','花屋の注文に合わせて、季節の枝ものを束ねているところでした'],
   buyer:['花屋の仕入れで、セリの電光掲示に合わせて押しボタンを押したところでした','花屋の仕入れで、仲卸の店先の菊の束を手に取って見比べているところでした'],
   buyerLabel:['花屋の店主','フラワーデザイナー']},
  meat:{seri:['枝肉のセリで、肉の格付けの表示を確かめているところでした','セリの前に、並んだ枝肉の脂の入り方を見て回っているところでした'],
   nakaoroshi:['仲卸の作業場で、枝肉を部位ごとに切り分けているところでした','精肉店からの注文を、伝票と照らし合わせて箱に詰めているところでした'],
   buyer:['精肉店の仕入れで、セリにかかる枝肉の格付けを確かめているところでした'],
   buyerLabel:['精肉店の店主','食肉加工会社の仕入れ担当']}};
 const T={turret:['ターレを運転して、仲卸の売場の間の通路を縫うように走っているところでした','ターレの荷台に、発泡スチロールの箱を積み上げているところでした','荷を満載したターレで、駐車場の買出人の車まで運んでいるところでした'],
  truck:['夜明け前の市場に、産地から運んだ荷を下ろしているところでした','荷下ろしを終え、市場の駐車場で仮眠をとっているところでした','市場の荷受け場で、運んできた荷の伝票を渡したところでした'],
  staff:['市場の管理事務所で、今朝の入荷量の数字をまとめているところでした','食品衛生の検査で、売場の温度計の記録を確かめているところでした'],
  visitor:['見学者のデッキから、マグロのセリの様子を見下ろしているところでした','市場の飲食店街で、朝からすし店の行列に並んでいるところでした','屋上の緑化広場から、レインボーブリッジを眺めているところでした','見学者通路のガラス越しに、ターレが行き交う売場を眺めているところでした'],
  visitorOther:['市場の見学者通路から、セリ場の様子をのぞいているところでした'],
  food:['市場の食堂で、仕事を終えた仲卸の人に定食を出しているところでした','市場の中のすし店で、開店前の仕込みをしているところでした','行列の客に、席が空くまでのおよその時間を伝えたところでした'],
  guard:['市場の門で、出入りするトラックを誘導しているところでした','休市日の静かな市場を、決まった順路で巡回しているところでした']};
 function goodsOf(c){const x=pick(c.market?.goods||['produce']);return G[x]?x:'produce'}
 function assign(c,P){if(!c.role?.startsWith('market_'))return false;const k=c.role.slice(7);
  if(k==='buyer'){const g=goodsOf(c);P.marketGoods=g;P.occ={label:pick(G[g].buyerLabel),group:'adult',cat:'販売',tag:'shop',kind:'self',p:1};return true}
  if(c.worker){const job=JOB_OBJS.find(j=>j.n===(k==='truck'?'トラック運転手':k==='guard'?'警備員':''));P.occ={label:c.label,group:'adult',cat:job?.cat||'販売',tag:job?.tag||'market',job,kind:'employed',p:1};return true}
  if(['facility','prison'].includes(P.occ.group))P.occ={label:'無職',group:P.age>=65?'senior':'adult',cat:'none',p:1};return true}
 function apply(c,P,t){if(!c.role?.startsWith('market_'))return false;const k=c.role.slice(7),h=t.hf??t.h,g=P.marketGoods||goodsOf(c),toyosu=/豊洲/.test(c.market?.name||'');let text;
  if(['seri','nakaoroshi','buyer'].includes(k))text=pick(G[g][k]);
  else if(k.startsWith('visitor'))text=pick(toyosu?(h>=5&&h<7?T.visitor:T.visitor.slice(1)):T.visitorOther);
  else if(k==='guard')text=pick(T.guard);
  else text=pick(T[k]);
  P.mapSituation=text;P.visitLabel=c.label;P.sit={...P.sit,text,state:c.worker?'work':k==='buyer'?'work':'off',stateLabel:c.label,p:1,source:'market'};return true}
 return {kind,roles,assign,apply,closed};
})();
if(typeof module!=='undefined')module.exports=MarketModel;
