/* Who fills a venue on a given day. Sex ratios and age bands follow published fan surveys and industry
   reports in outline (e.g. racing and boat-racing fans are mostly men in their 40s-70s, male idol concerts
   are mostly women); exact shares, event mixes and per-day assignments are game assumptions.
   Known recurring calendars (baseball season, sumo tournaments, university ceremonies, year-end and
   mid-August doujin fairs, JRA weekends) are used where they exist; other days get a fixed assumed event.
   Scenes avoid proper nouns. */
const VenueAudience=(()=>{
 const B=(...rows)=>rows;
 // label, female share, age bands [min,max,weight], crowd scale relative to venue capacity
 const profiles={
  baseball:['野球観戦の観客',.38,B([6,12,6],[13,19,8],[20,29,18],[30,39,18],[40,49,20],[50,59,17],[60,79,13]),.85],
  soccer:['サッカー観戦の観客',.4,B([6,12,8],[13,19,10],[20,29,20],[30,39,20],[40,49,20],[50,69,22]),.7],
  rugby:['ラグビー観戦の観客',.3,B([10,19,8],[20,29,14],[30,39,18],[40,49,24],[50,69,36]),.6],
  athletics:['競技会の出場者・観客',.45,B([10,15,20],[16,22,30],[23,39,15],[40,59,35]),.25],
  amateur:['大会の出場者・応援の家族',.45,B([8,15,35],[16,22,25],[30,54,40]),.3],
  tennis:['テニス観戦の観客',.5,B([15,29,25],[30,49,40],[50,74,35]),.6],
  skate:['アイスショーの観客',.85,B([15,29,20],[30,49,40],[50,74,40]),.8],
  extreme:['競技観戦の観客',.3,B([13,24,40],[25,34,30],[35,49,30]),.5],
  combat:['格闘技観戦の観客',.25,B([20,29,20],[30,39,25],[40,59,45],[60,74,10]),.7],
  sumo:['大相撲の観客',.45,B([20,39,20],[40,59,35],[60,84,45]),.9],
  male_idol:['ライブの来場者',.9,B([13,19,20],[20,29,35],[30,39,25],[40,59,20]),.95],
  female_idol:['ライブの来場者',.15,B([18,29,25],[30,39,30],[40,59,45]),.85],
  kpop_boy:['ライブの来場者',.9,B([13,19,30],[20,29,45],[30,49,25]),.95],
  kpop_girl:['ライブの来場者',.5,B([13,19,25],[20,29,50],[30,44,25]),.9],
  rock:['ライブの来場者',.55,B([15,24,30],[25,39,45],[40,54,25]),.9],
  veteran:['ライブの来場者',.62,B([20,34,20],[35,49,50],[50,64,30]),.95],
  anime_live:['ライブの来場者',.4,B([16,24,35],[25,39,50],[40,49,15]),.9],
  enka:['公演の来場者',.65,B([40,59,25],[60,84,75]),.8],
  stage:['舞台公演の観客',.78,B([18,29,25],[30,49,45],[50,74,30]),.85],
  awards:['音楽イベントの観客',.7,B([13,29,60],[30,49,40]),.9],
  ceremony:['式典の出席者',.52,B([18,23,70],[45,59,30]),.8],
  doujin:['同人誌即売会の来場者',.45,B([16,24,30],[25,39,50],[40,59,20]),3],
  trade:['展示会の来場者',.3,B([23,34,30],[35,49,40],[50,64,30]),.8],
  hobby:['趣味の展示会の来場者',.25,B([20,39,40],[40,69,60]),1],
  handmade:['手作り市の来場者',.8,B([20,39,40],[40,74,60]),.9],
  anime_expo:['アニメイベントの来場者',.5,B([13,24,45],[25,39,45],[40,49,10]),1.4],
  quilt:['手芸の展示会の来場者',.9,B([40,59,30],[60,84,70]),.7],
  horse:['競馬観戦客',.18,B([20,29,12],[30,39,15],[40,49,22],[50,59,24],[60,69,17],[70,84,10]),.3],
  boat:['ボートレースの観客',.1,B([20,29,6],[30,39,10],[40,49,18],[50,59,26],[60,69,24],[70,84,16]),.6],
  boat_offtrack:['場外発売に来た客',.08,B([30,49,25],[50,69,50],[70,84,25]),.2],
  offtrack_horse:['場外馬券売り場の客',.12,B([20,39,15],[40,59,40],[60,84,45]),.7],
  keirin:['場外車券売り場の客',.07,B([20,39,10],[40,59,40],[60,84,50]),.6]};
 const kindOf={baseball:'sports',soccer:'sports',rugby:'sports',athletics:'sports',amateur:'sports',tennis:'sports',skate:'sports',extreme:'sports',combat:'sports',sumo:'sports',ceremony:'event',doujin:'expo',trade:'expo',hobby:'expo',handmade:'expo',anime_expo:'expo',quilt:'expo',horse:'race',boat:'race',boat_offtrack:'bet',offtrack_horse:'bet',keirin:'bet'};
 const scenes={
  baseball:['外野席で、応援歌に合わせてメガホンを打ち鳴らしているところでした','内野席で、ビールの売り子を呼び止めて一杯頼んだところでした','打球の行方を追って、思わず立ち上がったところでした','スコアブックに、いまの打席の結果を書き込んでいるところでした'],
  soccer:['ゴール裏で、チャントに合わせて手拍子をしているところでした','ユニフォームを着て、選手の入場を待っているところでした','惜しいシュートに、思わず頭を抱えたところでした'],
  rugby:['スクラムが組まれるたびに、身を乗り出して見ているところでした','トライの瞬間に、隣の観客と手を叩き合ったところでした'],
  athletics:['招集所で、ゼッケンの番号を確かめているところでした','スタンドから、子どもの走るレーンを目で追っているところでした','競技を終え、記録の掲示を見上げているところでした'],
  amateur:['控え場所で、チームの仲間と円陣を組んでいるところでした','観客席から、子どもの試合に声援を送っているところでした','試合の合間に、おにぎりをほおばっているところでした'],
  tennis:['ラリーの行方を、首を左右に振って追っているところでした','チェンジコートの合間に、日陰で水を飲んでいるところでした'],
  skate:['リンクの冷気に、膝掛けを掛け直したところでした','華やかなジャンプに、思わず息をのんだところでした'],
  extreme:['空中で回転する技に、歓声を上げたところでした','スマートフォンで、トリックの瞬間を動画に撮っているところでした'],
  combat:['リングサイドに近い席で、パンチの音に身をすくめたところでした','入場曲が流れ、選手の登場に拳を突き上げたところでした'],
  sumo:['升席で、焼き鳥をつまみながら取組を見ているところでした','土俵入りの化粧まわしを、双眼鏡でじっくり見ているところでした','番付表を広げ、贔屓の力士の取組を確かめているところでした'],
  male_idol:['うちわを胸の前に掲げ、推しのメンバーを目で追っているところでした','ペンライトの色を、推しのメンバーカラーに合わせたところでした','開演前に、同じ推しの人とグッズを交換しているところでした'],
  female_idol:['ペンライトを両手に、コールのタイミングを待っているところでした','推しのメンバーの名前を叫び、手を振ったところでした'],
  kpop_boy:['公式のペンライトを振りながら、掛け声を合わせているところでした','開演前に、トレーディングカードの交換相手を探しているところでした'],
  kpop_girl:['ダンスのキレに、思わず歓声を上げたところでした','ペンライトを振りながら、サビを一緒に口ずさんでいるところでした'],
  rock:['スタンディングの最前列で、拳を突き上げているところでした','ライブのタオルを首にかけ、イントロに歓声を上げたところでした'],
  veteran:['昔から聴いている曲のイントロに、胸が熱くなったところでした','学生時代の友人と、久しぶりに並んで歌っているところでした'],
  anime_live:['キャラクターのイメージカラーに、ペンライトを切り替えたところでした','好きな作品の主題歌に、思わず一緒に歌っているところでした'],
  enka:['客席で、歌い手の着物の柄に見とれているところでした','持参したうちわで、歌に合わせてゆっくり拍子を取っているところでした'],
  stage:['幕間の休憩で、パンフレットの配役表を読み返しているところでした','カーテンコールで、立ち上がって拍手を送っているところでした'],
  awards:['受賞の発表に、客席から大きな拍手を送っているところでした','次々に登場する出演者に、スマートフォンを構えたところでした'],
  ceremony:['式典の席で、名前を呼ばれるのを待っているところでした','式典が終わり、家族と記念写真を撮っているところでした','袴姿の友人と、会場の前で写真を撮り合っているところでした'],
  doujin:['サークルの机の前で、新刊の値段を確かめているところでした','カタログに付けた印を頼りに、ホールの通路を急いでいるところでした','コスプレの撮影エリアで、カメラを構えているところでした'],
  trade:['出展ブースで、名刺を交換しているところでした','展示された機械の説明を、メモを取りながら聞いているところでした','セミナー会場で、講演のスライドを撮影しているところでした'],
  hobby:['展示された車の内装を、運転席からのぞき込んでいるところでした','模型の展示ブースで、細かな塗装に見入っているところでした'],
  handmade:['作家のブースで、手作りのアクセサリーを手に取ったところでした','布小物の店で、作り手と素材の話をしているところでした'],
  anime_expo:['新作アニメの発表ステージに、歓声を上げたところでした','限定グッズの抽選券を握りしめ、列に並んでいるところでした'],
  quilt:['大きなキルトの作品に近寄り、縫い目の細かさに見入っているところでした','手芸材料の売り場で、布の柄を選んでいるところでした'],
  horse:['パドックで、気になる馬の歩き方をじっと見ているところでした','スタンドで、新聞の馬柱に赤ペンで印をつけているところでした','最後の直線で、握りしめた馬券を振りながら叫んでいるところでした'],
  boat:['スタンドで、展示航走のタイムを手元の紙に書き写しているところでした','第1ターンマークの攻防に、思わず身を乗り出したところでした','舟券の締め切り前に、マークシートを塗りつぶしているところでした'],
  boat_offtrack:['大型モニターで、ほかの会場のレースを見上げているところでした','場外発売の窓口で、払い戻しを受けているところでした'],
  offtrack_horse:['大型モニターの前で、レースの発走を待っているところでした','マークシートを塗りつぶし、発売機に通したところでした','的中した馬券を、払い戻し機に差し込んだところでした'],
  keirin:['モニターで、最終周回の追い込みを見つめているところでした','予想紙を広げ、ラインの組み立てを考えているところでした']};
 const pre={sports:['入場ゲートで、チケットの二次元コードを見せたところでした','開始前に、売店の列に並んでいるところでした'],concert:['グッズ売り場の長い列に並んでいるところでした','入場ゲートで、チケットの二次元コードを見せたところでした'],expo:['入場の待機列で、開場の時刻を待っているところでした'],event:['受付で、名前を告げて席を案内されたところでした']};
 const post={sports:['試合が終わり、駅までの人波をゆっくり進んでいるところでした'],concert:['終演後、感想を話しながら駅へ向かっているところでした'],expo:['戦利品の紙袋を提げて、会場を出たところでした'],event:['式典を終え、会場の外で記念写真を撮っているところでした']};
 const hash=k=>{let h=2166136261;for(let i=0;i<k.length;i++)h=Math.imul(h^k.charCodeAt(i),16777619);return (h>>>0)/4294967296};
 const pick=(w,v)=>{let tot=Object.values(w).reduce((s,x)=>s+x,0),r=v*tot;for(let [k,x] of Object.entries(w)){r-=x;if(r<0)return k}return Object.keys(w)[0]};
 const md=(t,a,b)=>{let x=t.mo*100+t.d;return a<=b?x>=a&&x<=b:x>=a||x<=b};
 const weekend=t=>t.dow===0||t.dow===6||t.holiday;
 // Grand sumo tournaments at 国技館 open on the second Sunday of January, May and September and run 15 days.
 function sumoDay(t){if(![1,5,9].includes(t.mo))return false;let first=new Date(Date.UTC(t.y,t.mo-1,1)).getUTCDay(),start=1+((7-first)%7)+7;return t.d>=start&&t.d<start+15}
 // Returns {audience,mode,opens,starts,ends} for a venue/day, or null when no public event is assumed.
 function plan(name,kind,t){let ds=t.y+'-'+t.mo+'-'+t.d,v=hash(name+'/'+ds),g=hash(name+'/'+ds+'/genre'),we=weekend(t),A=(audience,opens,starts,ends,mode)=>({audience,mode:mode||(kindOf[audience]==='sports'||kindOf[audience]==='race'?'event':kindOf[audience]==='expo'||kindOf[audience]==='bet'||kindOf[audience]==='event'?'event':'concert'),opens,starts,ends,estimated:true});
  const night=we?[12.5,14,17.5]:[16.5,18,21.5],show=we?[15,17,20.5]:[16.5,18.5,21.5];
  if(kind==='boatrace'){let race=v<.5;return race?A('boat',9.5,10.5,16.75):A('boat_offtrack',9.5,10.5,16.75)}
  if(kind==='betting'){if(/車券|ラ・ピスタ/.test(name))return A('keirin',10,10.5,21);return we?A('offtrack_horse',9.25,9.75,16.75):null}
  if(kind==='racecourse')return v<(we?.28:.08)?A('horse',13,14.5,21):null;
  if(kind==='exhibition'){if(md(t,1230,1231)||t.mo===8&&t.d>=8&&t.d<=18&&we)return A('doujin',10,10.5,16);if(!we)return v<.7?A('trade',10,10,17):null;return v<.75?A(pick({anime_expo:2,hobby:2,handmade:2,trade:1},g),10,10,17):null}
  if(/両国国技館/.test(name)){if(sumoDay(t))return A('sumo',8,13,18);return v<(we?.4:.1)?A(pick({combat:5,enka:2,stage:1},g),...show):null}
  if(/日本武道館/.test(name)){if(t.mo===3&&t.d>=10&&t.d<=26&&!we||t.mo===4&&t.d>=1&&t.d<=8)return v<.85?A('ceremony',9,10,15.5):null;return v<(we?.75:.45)?A(pick({rock:3,veteran:3,male_idol:1,female_idol:1,anime_live:1,combat:1},g),...show):null}
  if(/東京ドーム/.test(name)){if(md(t,327,930)&&t.dow!==1)return v<.8?A('baseball',...night):null;if(t.mo===1&&t.d>=20&&t.d<=27)return A('quilt',10,10,17.5);return v<(we?.64:.3)?A(pick({male_idol:3,kpop_boy:2,veteran:2,rock:1,female_idol:1},g),...show):null}
  if(/神宮野球場/.test(name)){if(md(t,327,930)&&t.dow!==1)return v<.7?A('baseball',...night):null;return v<(we?.3:.05)?A('amateur',8.5,9,16):null}
  if(/国立競技場|MUFG/.test(name)){let p=we?.45:.08;if(v>=p)return null;let w=t.mo>=6&&t.mo<=9?{rock:2,male_idol:2,soccer:2,athletics:1}:t.mo<=2||t.mo===12?{rugby:3,soccer:2}:{soccer:3,athletics:2,rugby:1};let key=pick(w,g);return A(key,...(kindOf[key]==='sports'?night:show))}
  if(/有明コロシアム/.test(name)){if(t.mo===9&&t.d>=28||t.mo===10&&t.d<=6)return A('tennis',10,11,21);return v<(we?.4:.12)?A(pick({combat:2,rock:1,amateur:1},g),...show):null}
  if(/有明アリーナ/.test(name))return v<(we?.6:.25)?A(pick({kpop_boy:2,kpop_girl:2,male_idol:2,rock:2,anime_live:1,extreme:1,skate:1},g),...show):null;
  if(/東京体育館/.test(name))return v<(we?.55:.15)?A(pick({amateur:4,athletics:1,skate:1,combat:1},g),8.5,9.5,17):null;
  if(kind==='dome')return v<(we?.6:.3)?A(pick({male_idol:2,rock:1,baseball:1},g),...show):null;
  if(kind==='arena')return v<(we?.5:.15)?A(pick({amateur:3,rock:1,combat:1},g),...show):null;
  return v<(we?.35:.08)?A(pick({amateur:3,soccer:1,athletics:1},g),8.5,10,17):null}
 // Official schedule entries carry an audience key; titles stay out of situations.
 function profile(key){let p=profiles[key];return p&&{key,label:p[0],female:p[1],ageBands:p[2],scale:p[3],kind:kindOf[key]||'concert'}}
 function scene(key,phase,random=Math.random){let k=kindOf[key]||'concert',pool=phase==='pre'?pre[k]:phase==='post'?post[k]:null;if(!pool||random()<.35)pool=scenes[key];return pool[Math.floor(random()*pool.length)]}
 return {plan,profile,scene,profiles,sumoDay};
})();
if(typeof module!=='undefined')module.exports=VenueAudience;
