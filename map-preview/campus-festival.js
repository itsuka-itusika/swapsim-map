/* University festivals (学園祭) at major campuses in the 23 wards. 2026 dates are the published ones (checked 2026-11-02:
   gakkou.net 学園祭一覧, resemom.jp 日東駒専 2026, iko-yo.net 東京の学園祭 2026, science-university-sakurasaku.com 国公立 2026);
   other years keep each date's month and weekday, moved to the nearest such day. Daily visitor numbers are rough game
   assumptions from typical published totals, not counts. A festival runs 10:00-18:00 (17:00 on its last day); the day
   before, students set up in the afternoon and evening. */
const CampusFestival=(()=>{
 const AUDIENCE=.4;
 // [festival, university name, campus point [lon,lat] (nearest facility of that name within 600 m), 2026 days, daily visitors, campus key]
 const D=(mo,a,b=a)=>Array.from({length:b-a+1},(_,i)=>[mo,a+i]);
 const LIST=[
  ['五月祭','東京大学',[139.7631,35.7125],D(5,16,17),70000,'hongo'],['五月祭','東京大学',[139.7603,35.7168],D(5,16,17),15000,'hongo'],
  ['駒場祭','東京大学',[139.6848,35.6598],D(11,21,23),45000,'komaba'],
  ['早稲田祭','早稲田大学',[139.7228,35.7092],D(11,7,8),40000,'waseda'],['早稲田祭','早稲田大学',[139.7187,35.7098],D(11,7,8),15000,'waseda'],
  ['早稲田祭','早稲田大学',[139.7182,35.7052],D(11,7,8),20000,'waseda'],['早稲田祭','早稲田大学',[139.7213,35.7049],D(11,7,8),10000,'waseda'],
  ['理工展','早稲田大学',[139.7060,35.7060],D(11,7,8),20000,''],
  ['三田祭','慶應義塾大学',[139.7420,35.6492],D(11,20,23),50000,'mita'],['四谷祭','慶應義塾大学',[139.7176,35.6825],D(10,3,4),2000,''],
  ['芝共薬祭','慶應義塾大学',[139.7516,35.6588],D(10,10,11),2000,''],
  ['明大祭','明治大学',[139.6483,35.6711],[[10,30],[10,31],[11,1]],20000,''],
  ['St. Paul\'s Festival','立教大学',[139.7023,35.7301],[[11,2],[11,3],[11,4]],15000,''],
  ['ソフィア祭','上智大学',[139.7319,35.6836],D(11,1,4),20000,''],
  ['青山祭','青山学院大学',[139.7108,35.6596],[[10,30],[10,31],[11,1]],20000,''],
  ['自主法政祭','法政大学',[139.7412,35.6953],[[10,31],[11,1],[11,2],[11,3]],15000,''],
  ['理工白門祭','中央大学',[139.7484,35.7085],[[10,31],[11,1]],3000,''],
  ['法桜祭・三崎祭','日本大学',[139.7562,35.7003],[[10,31],[11,1]],5000,''],['法桜祭・三崎祭','日本大学',[139.7543,35.6997],[[10,31],[11,1]],5000,''],
  ['法桜祭・三崎祭','日本大学',[139.7548,35.6996],[[10,31],[11,1]],3000,''],
  ['駿河台桜理祭','日本大学',[139.7639,35.6982],[[10,11]],4000,''],['桜歯祭','日本大学',[139.7636,35.6976],[[10,30],[10,31]],2000,''],
  ['桜麗祭','日本大学',[139.6343,35.6623],[[10,31],[11,1]],8000,''],['砧祭','日本大学',[139.6090,35.6355],[[11,1],[11,2]],4000,''],
  ['日芸祭','日本大学',[139.6754,35.7371],D(11,1,3),10000,'nichigei'],['翠心祭','日本大学',[139.6912,35.7488],[[11,2],[11,3]],3000,''],
  ['三茶祭','日本大学',[139.6744,35.6377],D(10,17,18),4000,''],
  ['白山祭','東洋大学',[139.7504,35.7237],[[10,31],[11,1]],15000,''],['赤羽台祭','東洋大学',[139.7156,35.7807],[[10,31],[11,1]],4000,''],
  ['オータムフェスティバル','駒澤大学',[139.6585,35.6294],[[10,31],[11,1]],5000,''],['オータムフェスティバル','駒澤大学',[139.6552,35.6252],[[10,31],[11,1]],3000,''],
  ['桜凛祭','学習院大学',[139.7088,35.7188],D(11,1,3),10000,''],
  ['理大祭','東京理科大学',[139.7408,35.6989],D(11,20,21),6000,''],['理大祭','東京理科大学',[139.7459,35.6964],D(11,20,21),4000,''],
  ['理大祭','東京理科大学',[139.8643,35.7715],D(11,20,21),5000,''],
  ['工大祭','東京工業大学',[139.6841,35.6046],D(10,10,11),15000,'kodai'],['お茶の水祭','東京医科歯科大学',[139.7640,35.7019],D(10,17,18),5000,''],
  ['徽音祭','お茶の水女子大学',[139.7326,35.7188],D(11,7,8),5000,''],['藝祭','東京芸術大学',[139.7723,35.7202],D(9,4,6),25000,'geisai'],
  ['目白祭','日本女子大学',[139.7201,35.7169],D(10,17,18),5000,''],['芝浦祭','芝浦工業大学',[139.7951,35.6613],[[10,31],[11,1]],8000,''],
  ['海鷹祭','東京海洋大学',[139.7469,35.6264],D(11,1,3),8000,'kaiyo',{open:9,close:17,lastClose:13}],['海王祭','東京海洋大学',[139.7918,35.6679],D(5,16,17),6000,'kaio',{open:9,close:18}],['収穫祭','東京農業大学',[139.6322,35.6409],[[10,30],[10,31],[11,1]],40000,'nodai'],
  ['柳祭','成城大学',[139.6011,35.6426],[[11,2],[11,3]],8000,''],['白雉祭','武蔵大学',[139.6676,35.7370],[[10,31],[11,1]],5000,''],
  ['秋桜祭','昭和女子大学',[139.6761,35.6441],D(11,14,15),8000,''],['VERA祭','東京女子大学',[139.5900,35.7111],D(11,14,15),5000,''],
  ['白金祭','明治学院大学',[139.7307,35.6375],D(11,1,3),8000,''],['新宿祭','工学院大学',[139.6956,35.6905],D(11,20,22),5000,''],
  ['大東祭','大東文化大学',[139.6680,35.7826],[[10,31],[11,1]],5000,'']];
 function dist(a,b){const rad=Math.PI/180,dx=(a[0]-b[0])*Math.cos((a[1]+b[1])/2*rad),dy=a[1]-b[1];return Math.hypot(dx,dy)*111195}
 const dowOf=(y,m,d)=>new Date(Date.UTC(y,m-1,d)).getUTCDay();
 // The same month and weekday as the 2026 date, nearest to its day of the month.
 function shift([m,d],y){if(y===2026)return [m,d];let w=dowOf(2026,m,d),best=null;for(let k=-3;k<=3;k++){let dd=d+k,last=new Date(Date.UTC(y,m,0)).getUTCDate();if(dd<1||dd>last)continue;if(dowOf(y,m,dd)===w&&(!best||Math.abs(k)<Math.abs(best[1]-d)))best=[m,dd]}return best||[m,d]}
 function festivals(f){if(f?.kind!=='university')return [];return LIST.filter(x=>x[1]===f.name&&dist(x[2],f.xy)<=600&&!LIST.some(y=>y!==x&&y[1]===f.name&&y[0]===x[0]&&dist(y[2],f.xy)<dist(x[2],f.xy)))}
 // Today's festival at this campus: {fest, day (0-based), last, prep (the day before)}.
 function on(f,t){let key=(m,d)=>m*100+d,today=key(t.mo,t.d);for(const x of festivals(f)){let days=x[3].map(md=>shift(md,t.y)),ks=days.map(([m,d])=>key(m,d)),i=ks.indexOf(today);
   if(i>=0)return {fest:x,day:i,last:i===ks.length-1};let [m,d]=days[0],prev=new Date(Date.UTC(t.y,m-1,d-1));if(prev.getUTCMonth()+1===t.mo&&prev.getUTCDate()===t.d)return {fest:x,prep:true}}return null}
 function rows(f,t,student){let s=on(f,t);if(!s)return [];let h=t.hf??t.h,x=s.fest,out=[];
  if(s.prep){if(h>=14&&h<21.5&&student)out.push({...student,w:x[4]*.012*AUDIENCE,n:x[4]*.012*AUDIENCE,festival:x,festivalPrep:true});return out}
  let hours=x[6]||{},open=hours.open??(x[5]==='hongo'||x[5]==='komaba'?9:10),close=s.last?hours.lastClose??((hours.close??18)-1):hours.close??18,curve=h<open-1||h>=close+1.5?0:h<open?.15:h<open+1?.5:h<close-2?1:h<close-1?.8:h<close?.5:.08;if(!curve)return out;
  let present=x[4]*.3*curve*AUDIENCE;
  out.push({role:'festival_visitor',label:x[0]+'の来場者',w:present,n:present,min:0,max:84,female:.52,ageBands:[[0,9,8],[10,17,15],[18,24,32],[25,39,20],[40,64,21],[65,84,4]],festival:x,campusVisitor:false});
  if(student){let n=x[4]*.3*Math.max(curve,h>=close&&h<close+1.5?.4:0)*.18*AUDIENCE;out.push({...student,w:n,n,festival:x})}
  return out}
 const pick=a=>a[Math.floor(rnd()*a.length)];
 const VISIT=['模擬店の列に並び、焼きそばができあがるのを待っているところでした','パンフレットを広げて、見たい企画の時間を確かめているところでした','サークルの展示を見て回り、手作りの作品に感心しているところでした',
  '野外ステージの前で、学生バンドの演奏を聴いているところでした','呼び込みの学生に声をかけられ、たこ焼きを買ったところでした','人混みの中で、はぐれた友達に電話をかけているところでした',
  'お笑いライブの整理券をもらう列に並んでいるところでした','キャンパスのベンチで、模擬店で買ったクレープを食べているところでした','研究室の公開展示で、学生の説明に聞き入っているところでした'];
 const SPECIAL={waseda:['大隈講堂前の人波に押されながら、パンフレットを受け取ったところでした'],komaba:['銀杏並木の下に並ぶ模擬店を、端から順に見て回っているところでした'],hongo:['安田講堂前の広場で、模擬店の行列の長さに驚いているところでした'],
  mita:['三田の坂を上り、正門前の混雑に驚いているところでした'],geisai:['藝祭の神輿の行列を、スマホで撮影しているところでした','アートマーケットで、学生が作った器を手に取っているところでした'],
  nodai:['収穫祭の農産物の即売会で、新鮮な野菜を袋いっぱいに買ったところでした'],kodai:['ロボットの実演展示を、身を乗り出して見ているところでした'],nichigei:['学生が撮った映画の上映会で、エンドロールを見届けたところでした'],
  kaiyo:['マグロの解体ショーの人だかりの後ろから、背伸びしてのぞいているところでした','海産物の販売所で、大学で作った缶詰を手に取っているところでした','ウミガメの子どもの水槽の前で、小さなひれの動きに見入っているところでした','研究室の展示で、深海の生き物の標本を学生に説明してもらっているところでした'],
  kaio:['明治丸の特別公開で、船長室の古い航海道具を眺めているところでした','操船シミュレーターの体験で、大きな船の舵を握ったところでした','海事講演会の会場で、海運会社の人の話をメモしているところでした']};
 const STUDENT=['模擬店の鉄板で、焼きそばを手際よく焼いているところでした','サークルの法被を着て、通りがかる人にチラシを配っているところでした','展示教室の受付で、来場者にアンケートをお願いしているところでした',
  '野外ステージの袖で、自分たちの出番を待っているところでした','実行委員のスタッフTシャツを着て、迷子の案内をしているところでした','模擬店の売上を数えながら、仕込みの量を相談しているところでした'];
 const STUDENT_LATE=['模擬店のテントを片付けながら、サークルの仲間と打ち上げの店を決めているところでした','後夜祭の盛り上がりの中で、サークルの仲間と写真を撮っているところでした'];
 const PREP=['明日からの学園祭に向けて、模擬店のテントを組み立てているところでした','教室の展示パネルを、仲間と夜遅くまで貼り付けているところでした','実行委員会の最終打ち合わせで、当日の動線を確かめているところでした'];
 // Middle and high school festivals (文化祭) from data/school-festivals.json (2026 dates). A middle school shares the festival of the
 // high school with the same name (中高一貫). Open about 9:00-16:00 (15:30 on the last day); the whole school takes part,
 // and visitors are mostly pupils hoping to apply, their parents, friends and alumni. Visitor numbers are game assumptions.
 const FAMOUS=/^(開成|麻布|桜蔭|女子学院|雙葉|海城|駒場東邦|早稲田|渋谷教育学園渋谷|広尾学園|豊島岡女子学園|巣鴨|本郷|慶應義塾女子|青山学院|学習院女子|頌栄女子学院|鴎友学園女子|攻玉社|城北|芝|世田谷学園|明治大学付属明治|立教池袋|暁星|白百合学園|東洋英和女学院|品川女子学院)$/;
 const stem=n=>String(n||'').replace(/鷗/g,'鴎').replace(/(高等学校|高等部|高等科|中学校|中等部|中等科|中学部|高校)$/,'');
 let byStem=null;
 function schoolFestival(f){if(!['middle','high'].includes(f?.kind))return null;if(!byStem){byStem=new Map();for(const x of (typeof MAP_DATA!=='undefined'&&MAP_DATA.schoolFestivals)||[])byStem.set(stem(x.name),x)}return byStem.get(stem(f.name))||null}
 function schoolOn(f,t){let x=schoolFestival(f);if(!x)return null;let key=(m,d)=>m*100+d,days=x.days.map(md=>shift(md,t.y)),ks=days.map(([m,d])=>key(m,d)),i=ks.indexOf(key(t.mo,t.d));
  if(i>=0)return {fest:x,day:i,last:i===ks.length-1};let [m,d]=days[0],prev=new Date(Date.UTC(t.y,m-1,d-1));return prev.getUTCMonth()+1===t.mo&&prev.getUTCDate()===t.d?{fest:x,prep:true}:null}
 // enroll(): the school's pupils on an ordinary weekday morning.
 function schoolRows(f,t,student,enroll){let s=schoolOn(f,t);if(!s||!student)return [];let h=t.hf??t.h,x=s.fest,name=stem(x.name),out=[];
  if(s.prep){if(h>=13&&h<18.5){let n=enroll()*.5;out.push({...student,w:n,n,schoolFestival:x,festivalPrep:true})}return out}
  let close=s.last?15.5:16,curve=h<8.5||h>=close+1?0:h<9?.2:h<10?.6:h<close-1?1:h<close?.6:.05,on=h>=8&&h<close+1?(h>=close?.5:1):0;
  if(on){let n=enroll()*.9*on;out.push({...student,w:n,n,schoolFestival:x})}
  if(curve){let daily=FAMOUS.test(name)?8000:3000,n=daily*.35*curve*AUDIENCE;out.push({role:'school_festival_visitor',label:name+'の文化祭の来場者',w:n,n,min:6,max:79,female:.55,ageBands:[[6,12,22],[13,15,14],[16,18,12],[19,29,10],[30,59,37],[60,79,5]],schoolFestival:x})}
  return out}
 const SCHOOL_PUPIL=['クラスのお化け屋敷で、驚かす役として暗がりに隠れているところでした','教室の入口で、クラス展示の呼び込みをしているところでした','部活の展示の受付で、来場者に部誌を手渡しているところでした',
  '体育館のステージ袖で、有志バンドの出番を待っているところでした','文化祭実行委員の腕章をつけて、来場者に順路を案内しているところでした','見学に来た小学生に、学校の様子を聞かれて答えているところでした','クラスの劇の本番前に、舞台袖で台詞を確かめているところでした'];
 const SCHOOL_HIGH=['模擬店で、焼きそばのパックに輪ゴムをかけているところでした','模擬店の行列を、最後尾の札を持って整理しているところでした'];
 const SCHOOL_LATE=['片付けの合間に、クラスのみんなで打ち上げの集合写真を撮っているところでした','教室の飾りを外しながら、文化祭が終わったことを惜しんでいるところでした'];
 const SCHOOL_PREP=['明日の文化祭に向けて、段ボールの看板に色を塗っているところでした','教室の飾りつけで、天井から紙の花をつるしているところでした','クラスの劇の通し稽古で、最後の場面を何度も合わせているところでした'];
 function schoolApply(c,P,t){let x=c.schoolFestival,h=t.hf??t.h,name=stem(x.name),pool;
  if(c.role==='school_festival_visitor'){if(['facility','prison'].includes(P.occ.group))P.occ={label:'無職',group:P.age>=65?'senior':'adult',cat:'none',p:1};
   pool=P.age<=9?['親と一緒に、在校生のきょうだいのクラスの出し物を見に来たところでした','親に手を引かれて、お化け屋敷の入口でおじけづいているところでした']:P.age<=12?['志望校の文化祭に来て、在校生の案内で校舎を回っているところでした','親と一緒に、部活の展示で在校生の説明を聞いているところでした','文化祭のパンフレットを、記念に大事にかばんへしまったところでした']
    :P.age<=18?['友達の学校の文化祭に遊びに来て、お化け屋敷の列に並んでいるところでした','部活の展示を見て回り、自分の学校との違いを話しているところでした',...(P.age<=15&&c.facility?.kind==='high'?['志望校の文化祭に来て、在校生の案内で校舎を回っているところでした']:[])]
    :P.age<=30?['母校の文化祭に来て、恩師にあいさつしたところでした','後輩のクラスの出し物に、差し入れを持って顔を出したところでした']
    :['子どもの志望校の文化祭で、校舎の雰囲気を確かめているところでした','わが子のクラスの劇を、後ろの席から見守っているところでした','パンフレットを片手に、部活の展示を見て回っているところでした']}
  else pool=c.festivalPrep?SCHOOL_PREP:h>=15.5?SCHOOL_LATE:[...SCHOOL_PUPIL,...(c.facility?.kind==='high'?SCHOOL_HIGH:[])];
  let text=pick(pool);P.mapSituation=text;P.visitLabel=c.label;P.sit={text,state:'off',stateLabel:c.role==='school_festival_visitor'?c.label:'文化祭'+(c.festivalPrep?'の準備をしている生徒':'に参加している生徒'),p:1,source:'festival'};return true}
 function apply(c,P,t){if(c.schoolFestival)return schoolApply(c,P,t);if(!c.festival)return false;let x=c.festival,h=t.hf??t.h,pool;
  if(c.role==='festival_visitor'){if(['facility','prison'].includes(P.occ.group))P.occ={label:'無職',group:P.age>=65?'senior':'adult',cat:'none',p:1};
   pool=[...VISIT,...(SPECIAL[x[5]]||[])];if(P.age<=12)pool=['親と一緒に、学生の出し物のスーパーボールすくいをしているところでした','親に手を引かれて、模擬店のわたあめを買ってもらったところでした','学生が作った迷路の出口で、親を待っているところでした'];
   else if(P.age>=15&&P.age<=18)pool.push('受験を考えている大学の雰囲気を見に来て、校舎を見上げているところでした');else if(P.age>=26)pool.push('卒業生として、久しぶりのキャンパスを懐かしく歩いているところでした')}
  else pool=c.festivalPrep?PREP:h>=17?STUDENT_LATE:STUDENT;
  let text=pick(pool);P.mapSituation=text;P.visitLabel=c.label;P.sit={text,state:'off',stateLabel:c.role==='festival_visitor'?c.label:x[0]+(c.festivalPrep?'の準備をしている学生':'に参加している学生'),p:1,source:'festival'};return true}
 return {LIST,festivals,on,rows,apply,schoolFestival,schoolOn,schoolRows};
})();
if(typeof module!=='undefined')module.exports=CampusFestival;
