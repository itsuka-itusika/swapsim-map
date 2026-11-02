// New situations use explicit relationship/age/hobby requirements.
const PROFILE_NEW_SITUATIONS = [
 [9,24,'本を読みながら、気になった一節に付箋を貼っているところでした',{a:[10,100],profile:{hobby:26}}],
 [9,24,'ゲームの攻略を調べながら、次の装備を選んでいるところでした',{a:[10,100],profile:{hobby:31}}],
 [9,23,'編みかけの作品を広げ、ほどいた目を数え直しているところでした',{a:[10,100],profile:{hobby:18}}],
 [6,18,'鉢植えの葉の裏を確かめ、傷んだ葉を摘んでいるところでした',{a:[10,100],profile:{hobby:20}}],
 [10,20,'ギターの同じ小節を、何度も弾き直しているところでした',{a:[10,100],profile:{hobby:8}}],
 [9,24,'撮った写真を見比べ、残す一枚を選んでいるところでした',{a:[10,100],profile:{hobby:24}}],
 [9,24,'漫画の新刊を読み終え、前の巻を引っ張り出したところでした',{a:[10,100],profile:{hobby:27}}],
 [10,20,'焼き上がったクッキーを、網の上に並べて冷ましているところでした',{a:[10,100],profile:{hobby:19}}],
 [9,23,'囲碁の棋譜を並べ、分からなかった一手を考えているところでした',{a:[10,100],profile:{hobby:28}}],
 [9,23,'将棋の詰め問題で、最後の一手に気づいたところでした',{a:[10,100],profile:{hobby:29}}],
 [16,20,'夫婦で冷蔵庫をのぞき、夕食の献立を相談しているところでした',{a:[18,100],profile:{spouse:true}}],
 [9,22,'夫婦で洗濯物を畳みながら、今日あったことを話しているところでした',{a:[18,100],profile:{spouse:true}}],
 [10,21,'子どもとボードゲームをしていて、思わぬ作戦に負けたところでした',{a:[18,90],profile:{childAge:[5,15]}}],
 [18,22,'子どもの連絡帳を開き、明日の持ち物を一緒に確かめているところでした',{a:[18,80],profile:{childAge:[3,12]}}],
 [0,6,'赤ちゃんにミルクを飲ませ、空になった哺乳瓶を置いたところでした',{a:[18,65],profile:{childAge:[0,1]}}],
 [17,22,'一人分の夕食を作り、余った分を保存容器に移しているところでした',{a:[18,100],profile:{solo:true}}],
 [17,23,'帰宅して届いた荷物を開け、空き箱を片づけているところでした',{a:[18,100],profile:{solo:true}}],
 [18,22,'母と夕食の後片づけをしながら、明日の予定を話しているところでした',{a:[10,75],profile:{parent:'母'}}],
 [10,23,'きょうだいとテレビのチャンネルを譲り合っているところでした',{a:[6,80],profile:{sibling:true}}],
 [18,22,'成人した子どもと夕食を食べながら、仕事の話をしているところでした',{a:[40,100],profile:{childAge:[18,65]}}],
 [10,21,'球場のスタンドで、次の打席を待っているところでした',{a:[10,100],profile:{hobby:0}}],
 [11,21,'劇場の客席で、幕が上がるのを待っているところでした',{a:[10,100],profile:{hobby:2}}],
 [10,23,'自宅のテレビで映画を見返し、好きな場面で再生を止めているところでした',{a:[10,100],profile:{hobby:4}}],
 [13,22,'ライブ会場で、最初の曲が始まるのを待っているところでした',{a:[10,100],profile:{hobby:6}}],
 [9,20,'民謡の歌詞を確かめ、出だしを口ずさんでいるところでした',{a:[10,100],profile:{hobby:9}}],
 [9,21,'合唱の楽譜に、息継ぎの位置を書き込んでいるところでした',{a:[10,100],profile:{hobby:10}}],
 [9,20,'日本舞踊の稽古で、扇の向きを確かめているところでした',{a:[10,100],profile:{hobby:12}}],
 [10,21,'ダンス教室で、鏡を見ながらステップを練習しているところでした',{a:[10,100],profile:{hobby:13}}],
 [9,21,'書道の半紙を並べ、残す一枚を選んでいるところでした',{a:[10,100],profile:{hobby:14}}],
 [9,20,'花を生けながら、枝の向きを少し変えているところでした',{a:[10,100],profile:{hobby:15}}],
 [9,20,'茶道の稽古で、茶筅を持ち直しているところでした',{a:[10,100],profile:{hobby:16}}],
 [9,21,'ミシンの前で、縫い目のずれをほどいているところでした',{a:[10,100],profile:{hobby:17}}],
 [9,21,'スケッチブックに、窓辺の鉢植えを描いているところでした',{a:[10,100],profile:{hobby:22}}],
 [9,20,'陶芸教室で、ろくろの上の器を整えているところでした',{a:[10,100],profile:{hobby:23}}],
 [10,22,'パチンコ店で、台を離れる前に残高を確かめているところでした',{a:[20,100],profile:{hobby:30}}],
 [8,18,'キャンプ場で、テントの張り綱を締め直しているところでした',{a:[10,100],profile:{hobby:33}}],
 [10,18,'子どもとクッキーの型を抜いているところでした',{a:[18,90],profile:{hobby:19,childAge:[3,12]}}],
 [10,22,'きょうだいと協力して、ゲームの難所を越えたところでした',{a:[10,100],profile:{hobby:31,sibling:true}}],
 [10,22,'夫婦で写真を選び、アルバムに並べているところでした',{a:[18,100],profile:{hobby:24,spouse:true}}],
 [18,21,'子どもと二人で、明日の弁当のおかずを決めているところでした',{a:[18,80],profile:{singleParent:true,childCount:1,childAge:[6,17]}}],
 [18,22,'夫婦二人で、週末の行き先を話しているところでした',{a:[18,100],profile:{spouse:true,household:1}}],
 [10,20,'きょうだいと、日用品の買い物を分担しているところでした',{a:[18,100],profile:{siblingsOnly:true,sibling:true}}],
 [9,21,'子どもたちの洗濯物を、持ち主ごとに分けているところでした',{a:[18,100],profile:{childCount:[2,100]}}],
 [18,22,'父と食器を片づけながら、今日の出来事を話しているところでした',{a:[10,75],profile:{parent:'父'}}]
];
OFF_TX.adult.push(...PROFILE_NEW_SITUATIONS);
// Every off-duty role uses the same relationship, age and hobby gates.
for(const key of ['kid','student','college','homemaker','senior'])if(OFF_TX[key])OFF_TX[key].push(...PROFILE_NEW_SITUATIONS);

// Ages 12-18: secretly using a smartphone after the household has gone quiet.
// Duplicate the entries across 22:00-24:00 and 00:00-05:00 because situation windows do not wrap midnight.
const LATE_NIGHT_TEEN_PHONE_SITUATIONS = [
 [22,24,'部屋に鍵をかけ、片耳だけイヤホンを挿してスマホの画面に見入っているところでした',{a:[12,18],w:.8}],
 [0,5,'部屋に鍵をかけ、片耳だけイヤホンを挿してスマホの画面に見入っているところでした',{a:[12,18],w:.8}],
 [22,24,'家族が寝静まったのを確かめ、布団の中でスマホのロックを解除したところでした',{a:[12,18],w:.75}],
 [0,5,'家族が寝静まったのを確かめ、布団の中でスマホのロックを解除したところでした',{a:[12,18],w:.75}],
 [22,24,'廊下の足音に気づき、慌ててスマホを伏せて寝たふりをしたところでした',{a:[12,18],w:.55}],
 [0,5,'廊下の足音に気づき、慌ててスマホを伏せて寝たふりをしたところでした',{a:[12,18],w:.55}],
 [22,24,'画面の明るさを最低まで落とし、布団をかぶってスマホを見ているところでした',{a:[12,18],w:.7}],
 [0,5,'画面の明るさを最低まで落とし、布団をかぶってスマホを見ているところでした',{a:[12,18],w:.7}],
 [22,24,'通知音が鳴らないようスマホを消音にし、家族の気配を気にしながら画面を見ているところでした',{a:[12,18],w:.6}],
 [0,5,'通知音が鳴らないようスマホを消音にし、家族の気配を気にしながら画面を見ているところでした',{a:[12,18],w:.6}],
 [22,24,'枕元にスマホを隠し、部屋の外が静かになってからもう一度取り出したところでした',{a:[12,18],w:.6}],
 [0,5,'枕元にスマホを隠し、部屋の外が静かになってからもう一度取り出したところでした',{a:[12,18],w:.6}]
];
for(const key of ['adult','kid','student','college','homemaker','senior'])if(OFF_TX[key])OFF_TX[key].push(...LATE_NIGHT_TEEN_PHONE_SITUATIONS);

// Adults 18+: private late-night self-care situations at home.
const LATE_NIGHT_ADULT_PRIVATE_SITUATIONS = [
 [22,24,'部屋の明かりを落とし、スマホの画面の明かりだけを頼りに一人で致しているところでした',{a:[18,100],w:.35}],
 [0,5,'部屋の明かりを落とし、スマホの画面の明かりだけを頼りに一人で致しているところでした',{a:[18,100],w:.35}],
 [22,24,'スマホの画面に目を落としながら浅い息を吐き、ひとり熱を鎮めようとしているところでした',{a:[18,100],w:.3}],
 [0,5,'スマホの画面に目を落としながら浅い息を吐き、ひとり熱を鎮めようとしているところでした',{a:[18,100],w:.3}],
 [22,24,'スマホを脇に置き、丸めたティッシュをゴミ箱に放ってひと息ついているところでした',{a:[18,100],w:.25}],
 [0,5,'スマホを脇に置き、丸めたティッシュをゴミ箱に放ってひと息ついているところでした',{a:[18,100],w:.25}]
];
for(const key of ['adult','student','college','homemaker','senior'])if(OFF_TX[key])OFF_TX[key].push(...LATE_NIGHT_ADULT_PRIVATE_SITUATIONS);

// Secondary-school break-time scenes. These are intentionally narrow: male junior/high-school students
// while they are actually at school on a normal school day. They add personality without turning every
// school scene into a generic "class in progress" description.
const MALE_TEEN_BREAK_SITUATIONS = [
 [8.2,15.6,'休み時間に、友達から回ってきた漫画を机の下で読んでいるところでした',{a:[12,18],w:.8,profile:{sex:'m'}}],
 [8.2,15.6,'休み時間に、数人で一冊の漫画を回し読みしながら感想を言い合っているところでした',{a:[12,18],w:.75,profile:{sex:'m'}}],
 [8.2,15.6,'休み時間に、友達が持ってきた漫画の新刊を借り、続きが気になって読みふけっているところでした',{a:[12,18],w:.65,profile:{sex:'m',hobby:27}}],
 [8.2,15.6,'休み時間に、友達が持ち込んだグラビア写真集を数人で囲んで見ているところでした',{a:[13,18],w:.32,profile:{sex:'m'}}],
 [8.2,15.6,'休み時間に、友達が持ってきたグラビア写真集を興味津々でめくっているところでした',{a:[14,18],w:.22,profile:{sex:'m'}}],
 [8.2,15.6,'休み時間に、友達のスマホで話題の動画を見せてもらい、周囲と笑っているところでした',{a:[12,18],w:.7,profile:{sex:'m'}}],
 [8.2,15.6,'休み時間に、机を囲んでカードゲームをしながら勝敗で盛り上がっているところでした',{a:[12,18],w:.48,profile:{sex:'m'}}],
 [8.2,15.6,'休み時間に、窓際で友達とくだらない話をしながら笑っているところでした',{a:[12,18],w:.9,profile:{sex:'m'}}],
 [8.2,15.6,'休み時間に、次の授業の宿題を忘れていたことに気づき、友達のノートを見せてもらっているところでした',{a:[12,18],w:.45,profile:{sex:'m'}}],
 [8.2,15.6,'休み時間に、廊下で友達とふざけ合い、先生が来て慌てて教室へ戻ったところでした',{a:[12,18],w:.6,profile:{sex:'m'}}]
];

// profileEntryOK predates sex-specific situation gates, so extend it here without touching the core model.
if(typeof profileEntryOK==='function'){
 const profileEntryOKBase=profileEntryOK;
 profileEntryOK=function(e,P){
  const o=Array.isArray(e)?e[3]||{}:{},r=o.profile||{};
  if(r.sex&&P.sex!==r.sex)return false;
  return profileEntryOKBase(e,P);
 };
}
if(SCHOOL_TX?.teen)SCHOOL_TX.teen.push(...MALE_TEEN_BREAK_SITUATIONS);
