/* Character lines for young people (13-29) at home and out in shopping, subculture and student districts: an otaku, a
   sports-club regular, a gyaru, a mischievous boy, a dependable girl, a flirty party-goer. They replace about a quarter of
   the ordinary lines; scenes tied to a place, a date, a season or a partner are kept.
   Line: [text, sex ('m'/'f'/null), from, to, who] where who is teen (pupils 13-18), univ (university and college
   students), young (18-29 anyone) or adult20 (20-29, drinking or late-night lines). */
const YouthCharacter=(()=>{
 const SHARE=.25;
 const HOME=[
  ['自分の部屋で、推しのアクリルスタンドを並べ替えて写真を撮っているところでした',null,10,22,'teen'],
  ['深夜アニメのリアルタイム視聴に備えて、宿題を急いで片付けているところでした',null,19,22,'teen'],
  ['部屋で、トレーニング動画をまねして体幹を鍛えているところでした','m',16,22,'teen'],
  ['明日の試合に備えて、玄関でスパイクの泥を落としているところでした',null,17,21.5,'teen'],
  ['自分の部屋で、メイク動画を見ながら新しいアイシャドウを試しているところでした','f',15,22,'teen'],
  ['友達とビデオ通話をつなぎっぱなしで、宿題そっちのけで話しているところでした','f',19,22,'teen'],
  ['「宿題やったの」と聞かれ、「今やろうと思ってた」と答えたところでした','m',17,22,'teen'],
  ['リビングのソファを占領して、きょうだいとゲームの順番でもめているところでした','m',15,22,'teen'],
  ['明日の時間割を確かめながら、かばんの中身を入れ替えているところでした','f',19,22,'teen'],
  ['帰りの遅い親の代わりに、きょうだいの夕飯を温めているところでした','f',17,21,'teen'],
  ['部屋で、今夜の合コンに着ていく服を鏡の前で何着も合わせているところでした','m',16,20,'adult20'],
  ['気になる人からのメッセージに、絵文字多めの返信を打っては消しているところでした',null,19,24,'young'],
  ['昨日の飲み会の写真を見返して、自分の酔いっぷりに頭を抱えているところでした',null,10,15,'adult20'],
  ['新作ゲームの発売日で、ダウンロードの進み具合をじっと見守っているところでした',null,10,24,'young'],
  ['推しの配信のコメント欄に、投げ銭を送るか迷っているところでした',null,19,24,'young'],
  ['プロテインをシェイカーで振りながら、今日の筋トレの記録をつけているところでした','m',18,23,'young'],
  ['ネイルチップを並べて、次にサロンでお願いするデザインを考えているところでした','f',13,23,'young'],
  ['来週の分の作り置きを、保存容器に詰め分けているところでした',null,10,21,'young'],
  ['休みの日に一歩も外に出ず、布団の中で漫画を一気読みしているところでした',null,10,20,'young'],
  ['サークルの新歓で使う動画を、ノートパソコンで夜遅くまで編集しているところでした',null,20,24,'univ']];
 const OUT=[
  ['友達とプリクラ機の中で、落書きのスタンプ選びに夢中になっているところでした','f',13,21,'teen'],
  ['ゲームセンターで、クレーンゲームのアームの強さを見極めているところでした','m',13,21,'teen'],
  ['アニメショップで、限定グッズの残りの数を確かめているところでした',null,11,20,'teen'],
  ['部活帰りに、友達とファストフード店でポテトを分け合っているところでした',null,16,21,'teen'],
  ['ショッピングモールで、友達と色違いのTシャツを手に取っているところでした','f',11,20,'teen'],
  ['映える新作ドリンクの列に、友達と並んでいるところでした','f',11,20,'teen'],
  ['スポーツ用品店で、新しいバスケットシューズを試し履きしているところでした','m',11,20,'teen'],
  ['知り合ったばかりの人たちと、二次会のカラオケに向かうところでした',null,19,24,'adult20'],
  ['クラブのイベントの前に、友達と駅前で待ち合わせているところでした',null,21,24,'adult20'],
  ['合コン帰りに、もう一軒行こうと友達をしつこく誘っているところでした','m',21,24,'adult20'],
  ['服屋で、名前で呼び合うほど打ち解けた店員さんと話し込んでいるところでした','m',12,20,'young'],
  ['コラボカフェで、ランダム特典のコースターを開けて一喜一憂しているところでした',null,11,21,'young'],
  ['家電量販店で、新しいゲーミングマウスのクリック感を確かめているところでした',null,11,21,'young'],
  ['友達とお揃いのネイルにしようと、サロンの予約画面を見ているところでした','f',11,21,'young'],
  ['古着屋で、友達に「それ絶対似合う」と言われて試着室へ向かうところでした','f',11,20,'young'],
  ['フットサルの帰りに、仲間とスポーツドリンクを一気飲みしているところでした','m',11,22,'young'],
  ['決めてきた予算を守ろうと、セールの服を何度も値札と見比べているところでした','f',11,20,'young']];
 const OUT_ROLES=['area_shopping','area_subculture','area_student','area_night'];
 const KEEP=new Set([undefined,'swapsim','supplement','swapsim-role-pool']);
 function who(P){let student=P.occ?.group==='student'||P.occ?.group==='college';return {teen:P.age>=13&&P.age<=18&&student,univ:P.age>=18&&P.age<=29&&/大学|短大|専門学校/.test(P.occ?.label||''),young:P.age>=18&&P.age<=29,adult20:P.age>=20&&P.age<=29}}
 function where(c,P){if((c.resident||c.role==='general')&&typeof PlaceLabel!=='undefined'&&PlaceLabel.kind(c,P)==='自宅')return 'home';// Shopping streets and markets people visit for themselves (築地, アメ横) keep their own shopping scenes.
  if(OUT_ROLES.includes(c.role)&&!c.area?.visitOnly)return 'out';return null}
 function candidates(c,P,t){if(P.age<13||P.age>29)return [];let place=where(c,P);if(!place)return [];let h=t.hf??t.h,w=who(P),lines=place==='home'?HOME:OUT;
  // In a night district only the over-20 lines fit.
  if(c.role==='area_night')lines=lines.filter(x=>x[4]==='adult20');
  return lines.filter(([,sex,from,to,k])=>(!sex||sex===P.sex)&&h>=from&&h<to&&w[k]).map(x=>x[0])}
 function apply(c,P,t,random=typeof rnd==='function'?rnd:Math.random){let s=P.sit;if(!s||s.state==='sleep'||s.state==='work'||!KEEP.has(s.source)||/デート中|恋人と過ごしている/.test(s.stateLabel||''))return false;
  let pool=candidates(c,P,t);if(!pool.length||random()>=SHARE)return false;let text=pool[Math.floor(random()*pool.length)];P.mapSituation=text;
  // At home the state follows the new line (ゲームをしている, 身じたく中); out, the visitor label stays.
  let stateLabel=where(c,P)==='home'&&typeof actLabel==='function'?actLabel(text,P.occ?.group):s.stateLabel;P.sit={...s,text,stateLabel,source:'youth-character'};return true}
 return {HOME,OUT,candidates,apply};
})();
if(typeof module!=='undefined')module.exports=YouthCharacter;
