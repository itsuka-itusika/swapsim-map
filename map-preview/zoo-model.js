/* 恩賜上野動物園: visitors and school trips by day (9:30-17:00, closed on Mondays, or the Tuesday after a Monday
   holiday, and over the New Year), keepers and vets before and after opening hours, shop staff, volunteer guides and
   night guards. Counts and hours are game assumptions. */
const ZooModel=(()=>{
 const pick=a=>a[Math.floor(rnd()*a.length)];
 const kind=c=>/恩賜上野動物園|子供動物園すてっぷ/.test(c?.name||'')?'ueno':null;
 const hol=t=>!!t.holiday||(typeof holName==='function'&&!!holName(t));
 function closed(t){if(t.mo===12&&t.d>=29||t.mo===1&&t.d===1)return true;if(t.dow===1)return !hol(t);if(t.dow===2){const y={...t,d:t.d-1,dow:1};return typeof holName==='function'&&!!holName(y)}return false}
 function roles(c,t){if(!kind(c))return null;const h=t.hf??t.h,shut=closed(t),open=!shut&&h>=9.5&&h<17,we=t.dow===0||t.dow===6||hol(t),school=!we&&!shut&&h>=10&&h<14.5&&[4,5,6,9,10,11].includes(t.mo),out=[];
  const share=Math.min(1,(c.area||40000)/140000),R=(key,label,n,female,bands,extra={})=>{n*=share;if(n>0)out.push({role:'zoo_'+key,label,w:n,min:bands[0][0],max:bands.at(-1)[1],female,ageBands:bands,...extra})};
  R('guest','上野動物園の来園者',open?(we?6000:3000)*(h<11||h>=15.5?.6:1):0,.55,[[0,5,14],[6,12,16],[13,19,8],[20,29,14],[30,44,24],[45,64,14],[65,85,10]]);
  R('school','遠足の子ども',school?350:0,.5,[[4,6,30],[7,12,70]],{schoolTrip:true});
  R('keeper','動物園の飼育員',h>=7.5&&h<18.5?(shut?35:60):3,.45,[[22,29,30],[30,39,30],[40,49,22],[50,62,18]],{worker:true});
  R('vet','動物園の獣医師',h>=8.5&&h<17.5?6:0,.45,[[26,39,40],[40,59,60]],{worker:true});
  R('shop','動物園の売店・飲食スタッフ',open?50:0,.7,[[18,29,40],[30,49,30],[50,69,30]],{worker:true});
  R('guide','動物園のボランティアガイド',open&&we?15:open?6:0,.5,[[55,64,30],[65,80,70]]);
  R('guard','動物園の警備員',h>=17.5||h<9?5:10,.1,[[25,49,35],[50,72,65]],{worker:true});
  return out}
 const T={guest:['ゾウの水浴びを、柵の前で子どもを抱き上げて見せているところでした','ゴリラの森で、背中を向けて座るシルバーバックをじっと見つめているところでした','ハシビロコウの前で、動かない姿を写真に撮ろうと粘っているところでした','ホッキョクグマが水に飛び込むのを見て、思わず声を上げたところでした','いそっぷ橋を渡り、西園へ向かっているところでした','園内の地図を広げ、次はどの動物を見るか家族と相談しているところでした','キリンが首を伸ばして木の葉を食べるのを見上げているところでした','不忍池のそばのベンチで、売店のソフトクリームを食べているところでした'],
  guestKid:['ゾウの大きさに驚いて、親の手を引っ張ったところでした','子ども動物園で、ヤギの背中をそっとなでているところでした','ペンギンが泳ぐのを、ガラスにおでこをつけて見ているところでした'],
  school:['遠足で、班の友達とワークシートの答えを探して回っているところでした','遠足の集合場所で、先生の点呼に元気よく返事をしたところでした','遠足で、ゾウの大きさに驚いて先生を呼んだところでした'],
  keeper:['ゾウの足の裏を、デッキブラシで洗っているところでした','キーパーズトークで、来園者にゴリラの性格を説明しているところでした','ペンギンに一羽ずつ魚を与え、食べた数を記録しているところでした'],
  keeperEarly:['開園前の獣舎で、エサの野菜を切り分けているところでした','開園前の獣舎で、夜のうちの動物の様子を確かめているところでした'],
  keeperLate:['閉園後の獣舎で、今日の動物の様子を日誌に書いているところでした'],
  vet:['動物病院で、カワウソの体重を量って記録しているところでした','治療の準備をして、キリンの蹄を診に向かうところでした','ふんの検査の結果を、顕微鏡でのぞいて確かめているところでした'],
  shop:['園内の売店で、動物のぬいぐるみを並べ直しているところでした','園内のレストランで、お子様ランチを運んでいるところでした'],
  guide:['ボランティアガイドとして、来園者にハシビロコウの話をしているところでした','ボランティアガイドとして、子どもたちにゾウの鼻の働きを説明しているところでした'],
  guard:['開門前の正門で、来園者の列を整理しているところでした','閉園後の静かな園内を、懐中電灯を手に巡回しているところでした']};
 function assign(c,P){if(!c.role?.startsWith('zoo_'))return false;const k=c.role.slice(4);
  if(c.worker){P.occ={label:c.label.replace(/^動物園の/,'動物園の'),group:'adult',cat:'サービス',tag:'zoo',kind:'employed',p:1};if(k==='keeper')P.occ.label='動物園の飼育員';return true}
  if(['facility','prison'].includes(P.occ.group))P.occ={label:'無職',group:P.age>=65?'senior':'adult',cat:'none',p:1};return true}
 function apply(c,P,t){if(!c.role?.startsWith('zoo_'))return false;const k=c.role.slice(4),h=t.hf??t.h;let text;
  if(k==='guest')text=pick(P.age<10?T.guestKid:T.guest);
  else if(k==='keeper')text=pick(h<9.5?T.keeperEarly:h>=17?T.keeperLate:T.keeper);
  else if(k==='guard')text=pick(h>=8.5&&h<9.5?T.guard.slice(0,1):T.guard.slice(1));
  else text=pick(T[k]);
  P.mapSituation=text;P.visitLabel=c.label;P.sit={...P.sit,text,state:c.worker?'work':k==='school'?'school':'off',stateLabel:c.label,p:1,source:'zoo'};return true}
 return {kind,roles,assign,apply,closed};
})();
if(typeof module!=='undefined')module.exports=ZooModel;
