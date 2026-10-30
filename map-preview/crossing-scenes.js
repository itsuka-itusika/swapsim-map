/* 渋谷スクランブル交差点: most people shown at the crossing (not those at work) get a scene of the crossing itself.
   About 65% are on foot (crossing, passing each other, waiting for the signal, meeting at ハチ公前) and about 15% are in
   a taxi, bus or car waiting at the light; the rest keep the scene they were drawn with. From midnight to dawn (few people
   on foot) only scenes that cannot happen on the street are replaced. Shares are game assumptions. */
const CrossingScenes=(()=>{
 const NAME='渋谷スクランブル交差点',pick=a=>a[Math.floor(rnd()*a.length)];
 // [text, from hour, to hour (a wrapping range such as 22-5 is allowed), options]: min/max age, job: working adults only.
 const walk=[
  ['青信号に変わった瞬間、四方から一斉に動き出す人の波に押されるように渡り始めたところでした',6,24],
  ['信号が青に変わり、反対側から押し寄せてくる人の波とすれ違いながら渡っているところでした',6,24],
  ['斜めに渡る人にぶつかりそうになり、軽く会釈をしてすれ違ったところでした',6,24],
  ['横断歩道の真ん中で、前から来る外国人観光客の団体をよけて歩いているところでした',8,24],
  ['渡っている途中に信号が点滅し始め、思わず歩く速さを上げたところでした',6,24],
  ['人の波の中で、はぐれないように友達の袖をつかんで渡っているところでした',9,24,{min:12}],
  ['手をつないだ子どもに「すごい人だね」と言われながら、交差点を渡っているところでした',9,21,{min:25}],
  ['手をつないでもらいながら、交差点を埋める人の多さに目を丸くしているところでした',9,21,{max:9}],
  ['交差点の真ん中で、観光客に「写真を撮ってもらえますか」と頼まれたところでした',9,23,{min:14}],
  ['渡りながら、ふと見上げたビルの大型ビジョンの映像に見入ったところでした',9,24],
  ['信号待ちの最前列で、青に変わるのを待ちながら、イヤホンの音楽を止めたところでした',6,24,{min:13}],
  ['四方の信号が全部赤になる一瞬の静けさの中で、渡り出すタイミングをうかがっているところでした',6,24],
  ['赤信号の人混みで、スマートフォンの地図を見て、どの出口に向かうか確かめているところでした',8,24,{min:13}],
  ['信号待ちの人混みで、後ろから押されて一歩前に出てしまったところでした',8,24],
  ['交差点の隅で、渡る人の波を撮ろうとスマートフォンを構え、いい瞬間を待っているところでした',9,23,{min:13}],
  ['渡りながら、歩きスマホの人をよけて、ひらりと体をかわしたところでした',8,24,{min:13}],
  ['交差点の真ん中で立ち止まって写真を撮る外国人を、邪魔にならないよう避けて歩いているところでした',9,24],
  ['ポケットティッシュを差し出されて、軽く会釈をして受け取ったところでした',9,22,{min:16}],
  ['ビラを配る人の列をかわし、足早に交差点を渡っているところでした',9,22,{min:14}],
  ['渡り切ったところで振り返り、もう一度人の流れを眺めたところでした',8,24],
  ['交差点を渡りながら、すれ違う人の多さにあらためて圧倒されたところでした',8,24],
  ['交差点を渡った先で、道に迷った外国人に道を聞かれたところでした',9,22,{min:16}],
  ['ビルの壁面の大型ビジョンを見上げながら、信号が変わるのを待っているところでした',8,24],
  ['109の前の信号待ちで、道玄坂の方へ行くか迷っているところでした',10,22,{min:13}],
  ['ハチ公前で待ち合わせの相手を探して、人混みの中で背伸びをしているところでした',9,23,{min:13}],
  ['ハチ公前で、約束の時間に遅れそうだと連絡しながら小走りしているところでした',9,23,{min:13}],
  ['ハチ公前で待ち合わせの相手に会えて、手を振って一緒に交差点を渡り始めたところでした',9,23,{min:13}],
  ['ハチ公像の前で、観光客と一緒に記念撮影の順番を待っているところでした',9,21],
  ['ハチ公前で、待ち合わせの相手からの「着いたよ」のメッセージを読み返しているところでした',9,23,{min:13}],
  ['ハチ公前で、飲み会の集合時間に遅れている友人にメッセージを送っているところでした',17,24,{min:18}],
  ['二次会の店を探しながら、信号待ちの人混みでスマートフォンの地図を覗き込んでいるところでした',20,24,{min:18}],
  ['飲み会帰りの足取りで、信号待ちの列に並び、一緒にいた友達と声を上げて笑ったところでした',20,24,{min:18}],
  ['終電の時刻を確かめながら、急ぎ足で駅に向かう交差点を渡っているところでした',22,25,{min:16}],
  ['仕事帰りに、同僚と飲みに行く店を相談しながら、信号を待っているところでした',17,22,{job:1}],
  ['終電を逃し、人通りの減った交差点で、タクシーを拾おうか朝まで時間をつぶそうか迷っているところでした',0,5,{min:18}],
  ['深夜の交差点の信号待ちで、赤信号なのに誰も来ない横断歩道を、渡ってしまおうか迷っているところでした',0,5,{min:18}],
  ['人のまばらな交差点を、ネオンの光に照らされながら、ゆっくり渡っているところでした',23,5,{min:18}],
  ['始発までの時間を、交差点のそばで、スマートフォンを眺めながらつぶしているところでした',1,5,{min:18}],
  ['終電後の交差点で、まだ残っている人の流れに混じって、信号が青になるのを待っているところでした',0,4,{min:16}],
  ['人の少ない交差点で、大型ビジョンの映像だけが動き続けるのをぼんやり見上げているところでした',0,5,{min:16}],
  ['朝まで開いている店を探して、信号待ちをしながらスマートフォンで調べているところでした',23,5,{min:18}],
  ['タクシー乗り場の列に並び、順番が来るのを待ちながら交差点の様子を眺めているところでした',0,5,{min:18}],
  ['明け方近くの、人がまばらになった交差点で、信号が青になるのを待っているところでした',3,6,{min:16}]
 ];
 const ride=[
  ['タクシーの後部座席で、赤信号の先頭に止まり、横断歩道を渡る人の波を眺めているところでした',6,24],
  ['タクシーの後部座席で、信号待ちの間に配車アプリの料金を確かめているところでした',6,24,{min:16}],
  ['バスの窓際の席から、青信号で一斉に渡り始める人の波を見下ろしているところでした',6,24],
  ['車の助手席で、スクランブル交差点の信号が変わるのを待ちながら、運転する家族にナビの案内を伝えているところでした',8,24,{min:10}],
  ['後部座席で、窓の外の交差点を埋める人の波に目を丸くしているところでした',8,21,{max:9}],
  ['車で交差点の信号待ちをしながら、渡る人の波が切れるのを待って、右折の機会をうかがっているところでした',7,24,{drive:1}],
  ['車の運転席で、青信号になっても人が渡り切るのを待って、ゆっくりアクセルを踏んだところでした',7,24,{drive:1}],
  ['交差点の赤信号で先頭に止まり、目の前を横切る人の波に、ブレーキを踏み直したところでした',7,24,{drive:1}],
  ['渋滞する交差点の手前で、カーナビの到着予想時刻が延びていくのを見ているところでした',7,24,{drive:1}],
  ['深夜のタクシーの後部座席で、人通りの減った交差点の赤信号を、眠気をこらえて見つめているところでした',0,5,{min:18}],
  ['深夜の交差点の赤信号で止まったタクシーの中から、まだ光り続ける大型ビジョンを眺めているところでした',0,5,{min:18}],
  ['深夜の交差点で、赤信号に止まり、誰もいない横断歩道の前で青に変わるのを待っているところでした',0,5,{drive:1}]
 ];
 // Hours run from s to e; e may pass 24 (22 to 25 means until 1 a.m.).
 const inHour=(s,e,h)=>h>=s&&h<e||h+24>=s&&h+24<e;
 const employed=P=>P.occ?.group==='adult'&&P.occ.cat!=='none'&&!/無職|主婦|主夫|年金|学生/.test(P.occ.label||'');
 function pool(list,P,h){let job=employed(P),driver=P.age>=20&&P.age<80&&P.occ?.group==='adult';
  return list.filter(([,s,e,o={}])=>inHour(s,e,h)&&(o.min==null||P.age>=o.min)&&(o.max==null||P.age<=o.max)&&(!o.job||job)&&(!o.drive||driver))}
 // A drawn scene is kept only when it can happen out on the crossing; scenes set indoors or elsewhere are replaced.
 const INDOORS=/ゲームの棚|採点|立ち飲み|映画館|食堂|店内|店で|ファミレス|カフェ|居酒屋|カラオケ|電車に乗|車内|自宅|部屋|布団|寝|病院|学校|教室|会社|職場|オフィス|ホテル|レジ|厨房|試着|座席|席で|ジム|銭湯|風呂|図書館|美容院|美術館|ライブハウス|ゲームセンター|クレーンゲーム|ネットカフェ|サウナ/;
 // Only people whose place will read スクランブル交差点 (not those at a facility or at work).
 function here(c){return typeof PlaceLabel!=='undefined'&&!c.resident&&PlaceLabel.generic(c)&&PlaceLabel.name(c)===NAME}
 function apply(c,P,t){if(!here(c)||P.sit?.state==='work'||P.sit?.state==='sleep'||P.hb?.bed)return false;let h=t.hf??t.h,r=rnd();
  // Scenes that cannot happen on the street are always replaced. The others are replaced four times in five, except from
  // midnight to dawn, when few people are on foot and the drawn scenes stay as they are.
  let indoors=INDOORS.test(P.sit?.text||'');if(!indoors&&(h<5||r>=.8))return false;let list=r<.66||r>=.8?walk:ride,p=pool(list,P,h);if(!p.length)p=pool(list===walk?ride:walk,P,h);if(!p.length)return false;
  let text=pick(p)[0];P.mapSituation=text;P.sit={...P.sit,text,source:'crossing',p:1};return true}
 return {NAME,walk,ride,pool,here,apply};
})();
if(typeof module!=='undefined')module.exports=CrossingScenes;
