/* Character lines for working adults and seniors: at work in an office, at home, and out in shopping and night districts.
   Ordinary variety (meticulous, caring, health-minded, doting parent, hobbyist) and some with an edge: the cranky one
   (偏屈), the gossip (噂好き), the office veteran who keeps everyone in line (お局), the playboy or party-goer (遊び人).
   They replace a share of the ordinary lines (work 20%, home and out 25%); scenes tied to a place, a date, a season or a
   partner are kept. Line: [text, sex ('m'/'f'/null), from, to, who] where who is worker (22-64), adult (30-64),
   mid (40-64), late (55-64) or senior (65 and over). */
const AdultCharacter=(()=>{
 const SHARE={work:.2,home:.25,out:.25};
 const WORK=[
  ['会議資料のホチキスの位置がそろっているか、一部ずつ確かめているところでした',null,9,18,'worker'],
  ['新人の席に寄って、表計算の関数の使い方をそっと教えているところでした',null,9,18,'adult'],
  ['送信したメールの宛先を、送ってから三回見直しているところでした',null,9,19,'worker'],
  ['会議が脱線しかけたところで、「では論点を整理しますね」と切り出したところでした',null,9,18,'adult'],
  ['朝活の勉強会で聞いた話を、さっそく朝の定例会議で披露したところでした',null,9,11,'worker'],
  ['給湯室で、マグカップを洗わずに置いていった人をそれとなく探しているところでした','f',9,18,'mid'],
  ['新人の電話応対を後ろで聞き、終わるなり「今の言い方はね」と切り出したところでした','f',9,18,'mid'],
  ['共有の備品棚の並びが変わっているのに気づき、黙って元の順に戻しているところでした','f',9,18,'mid'],
  ['若手の服装について、課長に「一言いってくださいね」と念を押したところでした','f',9,18,'mid'],
  ['コピー機の前で、隣の部署の異動の噂を小声で仕入れているところでした',null,9,18,'worker'],
  ['エレベーターで乗り合わせた同期と、役員人事の噂で盛り上がっているところでした',null,9,19,'adult'],
  ['新しい業務システムに文句を言いながら、紙の控えも必ず取っているところでした','m',9,18,'mid'],
  ['「昔はこうだった」と前置きしてから、若手の企画書に赤ペンを入れているところでした','m',9,18,'mid'],
  ['仕事中なのに、今夜の飲み会の二次会の店をこっそり押さえているところでした','m',14,18,'worker'],
  ['打ち合わせの中身より、そのあとの会食の店選びに熱を入れているところでした','m',10,18,'adult'],
  ['定年まであと半年、机の引き出しの中身を少しずつ片付けているところでした','m',9,18,'late'],
  ['自分の昼休みを削ってでも、頼まれた資料を先に仕上げているところでした','f',12,13,'worker']];
 const HOME=[
  ['子どもの寝顔を撮った写真を見返して、一人でにやけているところでした',null,21,24,'adult'],
  ['家計簿アプリに、今日のレシートを一枚ずつ入力しているところでした',null,19,23,'adult'],
  ['スマートウォッチの歩数が足りず、部屋の中をぐるぐる歩き回っているところでした',null,20,23,'adult'],
  ['休日に、ベランダで棚を自作しようと木材の寸法を測っているところでした','m',10,17,'adult'],
  ['コーヒー豆を挽く粗さを変えて、今朝の一杯の味をノートに記録しているところでした',null,7,10,'adult'],
  ['話題のドラマを、止めどころがわからず三話続けて見ているところでした','f',20,24,'adult'],
  ['テレビのニュースに、一人でいちいち反論しているところでした','m',18,23,'mid'],
  ['近所の奥さんから聞いた話を、夕飯の席で家族に披露しているところでした','f',18,21,'mid'],
  ['家族に「接待だから」と言い残し、いそいそとネクタイを締め直しているところでした','m',18,20,'adult'],
  ['学生時代の仲間と、週末のキャンプ道具の分担をグループで決めているところでした',null,20,23,'adult'],
  ['孫に教わったスマートフォンの操作を、「こんなものは要らん」と言いつつ練習しているところでした','m',10,20,'senior'],
  ['回覧板の書き方が気に入らず、余白に意見を書き込んでいるところでした','m',9,18,'senior'],
  ['電話で、町内の誰それの家の話をもう一時間も続けているところでした','f',10,20,'senior'],
  ['一人暮らしのお隣さんに持っていく煮物を、多めに作っているところでした','f',10,18,'senior'],
  ['盆栽の枝ぶりを、角度を変えながらじっと眺めているところでした','m',8,17,'senior'],
  ['新聞の詰め将棋を、昼過ぎからずっと考えているところでした','m',12,17,'senior'],
  ['テレビの健康番組で紹介された体操を、画面に合わせてまねしているところでした',null,9,17,'senior'],
  ['競馬新聞に赤ペンで印をつけ、今週末の予想を練っているところでした','m',13,21,'senior'],
  ['遊びに来た孫に、若いころの武勇伝を三回目なのにまた語っているところでした','m',13,19,'senior'],
  ['新しく始めた絵手紙を、遠くに住む友人に送ろうと宛名を書いているところでした','f',10,17,'senior']];
 const OUT=[
  ['スーパーの前で知り合いに会い、立ち話が三十分を超えたところでした','f',10,18,'mid'],
  ['店員の言葉づかいが気になって、小声でぶつぶつ言っているところでした','m',10,20,'mid'],
  ['買い物リストの順番どおりに、売り場を一筆書きで回っているところでした',null,10,20,'adult'],
  ['テレビで紹介されたばかりの店の行列に、迷わず並んだところでした','f',11,19,'adult'],
  ['同僚の送別会の幹事として、店の予約内容を電話で細かく確かめているところでした','f',12,19,'mid'],
  ['行きつけのバーで、マスターに今夜も新しい恋の話を聞かせているところでした',null,20,24,'adult','night'],
  ['同伴の待ち合わせで、腕時計を何度も見ながら店の前に立っているところでした','m',18,21,'adult','night'],
  ['三軒目の店を探して、「もう一軒だけ」と部下を引き連れて歩いているところでした','m',21,24,'mid','night'],
  ['常連のスナックで、ママに同じ愚痴を三回目なのにまた聞いてもらっているところでした','m',20,24,'mid','night'],
  ['カウンター越しに、店の女の子へ若いころの武勇伝を語っているところでした','m',20,24,'adult','night'],
  ['立ち飲み屋で、隣の見知らぬ客とすっかり意気投合したところでした',null,18,24,'adult','night'],
  ['終電を逃したふりをして、「もう一軒行こうよ」と誘っているところでした','m',22,24,'adult','night'],
  ['二軒目の会計で、さりげなく多めに出して見栄を張ったところでした','m',20,24,'mid','night'],
  ['女子会の二軒目で、ワイングラス片手に職場の噂話に花を咲かせているところでした','f',20,24,'adult','night'],
  ['飲み会の席で、上司の昔話にきっちり三回うなずいて場を回しているところでした',null,19,23,'worker','night'],
  ['デパートの試食コーナーを一周して、もう一度最初の売り場に戻ってきたところでした',null,10,17,'senior'],
  ['店頭で、「昔はこの半分の値段だった」と店の人にこぼしているところでした','f',10,17,'senior'],
  ['商店街の顔なじみの店を一軒ずつ回り、世間話をしているところでした',null,10,17,'senior'],
  ['パチンコ店の開店待ちの列に、今日も一番乗りで並んでいるところでした','m',9,10.5,'senior'],
  ['孫への誕生日プレゼントを選びに来て、店員さんに流行りを熱心に聞いているところでした',null,10,18,'senior'],
  ['若い店員に、自分の若いころの流行りを得意げに語っているところでした','m',11,18,'senior']];
 const OUT_ROLES=['area_shopping','area_night'];
 const KEEP=new Set([undefined,'swapsim','supplement','swapsim-role-pool']);
 function who(P){let a=P.age;return {worker:a>=22&&a<=64,adult:a>=30&&a<=64,mid:a>=40&&a<=64,late:a>=55&&a<=64,senior:a>=65}}
 function where(c,P){let s=P.sit;if(s?.state==='work')return c.role==='area_office'?'work':null;
  if((c.resident||c.role==='general')&&typeof PlaceLabel!=='undefined'&&PlaceLabel.kind(c,P)==='自宅')return 'home';
  if(OUT_ROLES.includes(c.role)&&!c.area?.visitOnly)return 'out';return null}
 function candidates(c,P,t){if(P.age<22)return [];let place=where(c,P);if(!place)return [];let h=t.hf??t.h,w=who(P),lines=place==='work'?WORK:place==='home'?HOME:OUT;
  // Night-out lines (bars, snacks, a third round) only in night districts, and only those there.
  if(place==='out')lines=lines.filter(x=>(x[5]==='night')===(c.role==='area_night'));
  return lines.filter(([,sex,from,to,k])=>(!sex||sex===P.sex)&&h>=from&&h<to&&w[k]).map(x=>x[0])}
 function apply(c,P,t,random=typeof rnd==='function'?rnd:Math.random){let s=P.sit;if(!s||s.state==='sleep'||!KEEP.has(s.source)||/デート中|恋人と過ごしている/.test(s.stateLabel||''))return false;
  let place=where(c,P),pool=candidates(c,P,t);if(!pool.length||random()>=SHARE[place])return false;let text=pool[Math.floor(random()*pool.length)];P.mapSituation=text;
  let stateLabel=place==='home'&&typeof actLabel==='function'?actLabel(text,P.occ?.group):s.stateLabel;P.sit={...s,text,stateLabel,source:'adult-character'};return true}
 return {WORK,HOME,OUT,candidates,apply};
})();
if(typeof module!=='undefined')module.exports=AdultCharacter;
