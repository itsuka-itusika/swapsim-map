/* Situation selection happens AFTER role and time have been fixed. */
const TimeSituations=(()=>{
 let pools=typeof MAP_DATA!=='undefined'?MAP_DATA.timeSituations:{},last=new Map();function configure(p){pools=p}
 function studentPhase(stage,t){let h=t.hf??t.h,we=t.dow===0||t.dow===6||t.holiday||(typeof schoolVac==='function'&&(stage==='college'?univVac(t):schoolVac(t)));
 if(h<7||h>=21)return 'school_evening';
 if(we){if(h>=15&&h<18&&stage!=='elem')return stage==='college'?'college_after':'teen_after';return 'school_weekend'}
 if(stage==='kindergarten')return h>=11.5&&h<13?'kindergarten_lunch':h>=13?'kindergarten_after':'kindergarten_day';
 let end=stage==='elem'?14.5:stage==='teen'?15.5:16.5,start=stage==='college'?9:8.5;
 if(h<start)return stage==='college'?'college_arrival':'school_arrival';
 if(h>=12&&h<13)return stage+'_lunch';
 if(h>=18.5)return 'school_evening';
 if(h>=end)return stage+'_after';
 if(h>=13&&h<13.5||t.mi>=45&&t.mi<55)return 'school_break';
 return stage+'_class';
 }
 function homeStudent(P,t){let h=t.hf??t.h;if(h<(P.age<12?7:6)||h>=(P.age<10?21:P.age<15?22:24))return 'home_sleep';if(h<9)return 'student_morning';if(P.age<3)return 'infant';if(P.age<6)return 'small_child';return h<15?'student_home_day':h<19?'student_home_after':'student_home_night'}
 function key(c,P,t){let h=t.hf??t.h,role=c.role;
 if(role.startsWith('media_'))return role;
 if(role==='area_student')return null;
 if(role==='student'||role==='area_student'){let kind=c.facility?.kind,stage=kind==='kindergarten'?'kindergarten':kind==='primary'?'elem':['high','middle'].includes(kind)?'teen':'college';let phase=studentPhase(stage,t);return kind==='high'?phase.replace(/^teen_/, 'high_'):phase}
 if(role==='general'&&(P.age<18||['student','college','kid'].includes(P.occ.group)))return homeStudent(P,t);
 if(role==='resident'||role==='patient'){if(h>=21||h<6)return 'facility_sleep';if(h>=7&&h<8||h>=12&&h<13||h>=18&&h<19)return 'facility_meal';return role+'_day'}
 // Kindergarten and university staff have their own pools; the original teacher scenes are set in a 中学・高校 classroom.
 if(role==='teacher'){let st=c.facility?.kind,pre=st==='kindergarten'?'kteacher':['university','college'].includes(st)?'uteacher':'teacher';if(h>=12&&h<13)return pre+'_lunch';if(t.dow===0||t.dow===6||t.holiday||h<8.5||h>=15.5)return pre+'_after';return t.mi>=45&&t.mi<55?pre+'_after':pre+'_work'}
 if(['care','nurse','doctor'].includes(role))return role+'_work';
 if(role==='mesh_factory')return h>=12&&h<13?'work_lunch':'factory_work';
 if(role==='mesh_logistics')return h>=12&&h<13?'work_lunch':'logistics_work';
 if(role==='mesh_security')return 'security_work';
 if(role==='area_office'){if(h>=12&&h<13)return 'work_lunch';return h>=1.5&&h<5?'work_allnight':h>=22.5||h<1.5?'work_midnight':h<9?'work_early':h>=18?'work_late':'office_work'}
 if(role==='general'){
  if(P.sit.state==='sleep')return 'home_sleep';
  if(P.sit.state==='work'){let tag=P.occ.tag||'';return ['factory','build','garage'].includes(tag)?'factory_work':['warehouse','truck','delivery','route'].includes(tag)?'logistics_work':['food','izakaya','bakery','kyushoku'].includes(tag)?'food_work':['retail','shop','sales','hotel','beauty','conveni'].includes(tag)?'service_work':tag==='care'||tag==='helper'?'care_work':tag==='nurse'?'nurse_work':tag==='doctor'?'doctor_work':tag==='teacher'?'teacher_after':'office_work'}
  if(P.sit.state==='commute')return null;
  let prefix=P.occ.group==='homemaker'?'homemaker':P.occ.group==='senior'?'senior':'worker_off';
  // After 23:00 the at-home scenes turn to the late night (終電で帰宅, 夜更かし ...).
  return prefix+'_'+(h>=23||h<4?'late':h<10?'morning':h<16?'day':h<19?'evening':'night');
 }
 return null;
 }

 // Residential components represent people at home or in the immediate neighborhood.
 // A nearby river alone does not establish an accessible fishing spot.
 // Neighborhood shops, cafes, parks and baths fit 住宅内・近隣; venues the map models as their own places
 // (stadiums, malls, offices, schools, stations, hospitals, nightlife) do not.
 function homeCompatible(text){if(/夢の中/.test(text))return true;return !/待合|免許の更新|高齢者講習|運転テスト|運転免許|試験場|教習所|川辺|河原|釣り糸|釣り竿|キャンプ場|テントの|映画館|劇場|コンサート|ライブ会場|美術館|博物館|水族館|動物園|遊園地|ゴルフ場|スキー場|登山|山頂|海水浴|旅行先|空港|新幹線|ホテルに|旅館に|球場|スタジアム|スタンドで|ショッピングモール|デパート|百貨店|物産展|電車に乗|電車の中|電車で|車内で|会社で|職場で|オフィスで|出張|教室で|放課後の教室|キャンパス|学食|学園祭|模擬店|アルバイト先|バイト先|のアルバイトで|居酒屋|キャバクラ|パチンコ|カラオケ|ゲームセンター|ボウリング|病院の|歯医者の待合室|待合室で|ジムで|ジムの|ダンス教室|ヨガの教室|駐車場で|テーマパーク|遊園地|絶叫マシン/.test(text)}
 function reuse(k,c,P,t){
  if(typeof fromPool!=='function')return null;
  // The original school pools have no kindergarten or university-staff scenes.
  if(/^(kindergarten|kteacher|uteacher)_/.test(k))return null;
  // Existing engine already selects the worker's duty, shift and job-specific scene.
  if(c.role==='general'&&P.sit.state==='work')return P.sit.text;
  let ctx={P,t,h:t.hf??t.h,we:t.dow===0||t.dow===6||!!t.holiday,hol:holName(t),brk:isBreak(t),mo:t.mo,vacP:false,vac:schoolVac(t),season:seasonOf(t.mo),wx:wxOf(P.pref,t),eq:eqOf(P.pref,t)};
  let list=[],re=null,tag=P.occ.tag||'';
  if(k==='home_sleep')list=[...(SLEEP_TX.any||[]),...(SLEEP_TX[P.age<6?'baby':P.age<18?'kid':P.age>=65?'senior':'adult']||[])];
  else if(k.startsWith('homemaker_')||k.startsWith('senior_')){list=OFF_TX[k.startsWith('homemaker')?'homemaker':'senior']||[];re=!/night|evening|late/.test(k)?null:/夕|夜|晩|寝|テレビ|食|入浴|風呂|片づけ|洗|準備|読書|本/;}
  else if(k.startsWith('worker_off_')){list=OFF_TX.adult||[];}
  else if(k==='work_lunch'){list=typeof LUNCH_TX!=='undefined'?LUNCH_TX:[];re=/昼|弁当|定食|食|休憩/;}
  else if(k.startsWith('media_'))return null;
  else if(k.endsWith('_work')||['work_early','work_late','teacher_after'].includes(k)){
   list=WORK_TX[tag]||[];
   if(!list.length){let tags={factory_work:'factory',logistics_work:'warehouse',care_work:'care',nurse_work:'nurse',doctor_work:'doctor',teacher_work:'teacher',teacher_after:'teacher',security_work:'security'};list=WORK_TX[tags[k]]||[]}
   re=/./;
  }else if(/_class$|_lunch$|school_break|_after$|school_arrival|college_arrival/.test(k)){
   list=Object.values(SCHOOL_TX).filter(Array.isArray).flat();
   re=k.endsWith('_class')?/授業|講義|黒板|実験|教科書|ノート|小テスト|ゼミ|演習/:k.endsWith('_lunch')?/給食|昼食|昼休み|弁当|学食/:k==='school_break'?/休み時間|次の授業/:k.endsWith('_after')?/放課後|部活|サークル|帰りの会|掃除/:/登校|始業|朝の/;
   // Retain the existing stage-specific entries only, avoiding a high-school scene in elementary school.
   let school=P.occ.school,group=P.occ.group,stage=k.startsWith('elem')?'elem':k.startsWith('teen')||k.startsWith('high')?'teen':k.startsWith('college')?'college':c.facility?.kind==='primary'?'elem':['middle','high'].includes(c.facility?.kind)?'teen':['university','college'].includes(c.facility?.kind)?'college':null;
   if(stage==='college')list=OFF_TX.college||[];else if(stage&&SCHOOL_TX[stage])list=SCHOOL_TX[stage];else if(stage)list=[];
  }
  const forbidden=/学食|給食|昼食|弁当/.test(k)?null:k.endsWith('_class')?/部活|放課後|昼休み|学食|給食/:k==='school_break'?/授業を受|講義を受/:null;
  let pk=fromPool(list,ctx,e=>{let text=textOf(e);if(c.resident&&!homeCompatible(text))return false;if(typeof PersonContext!=='undefined'&&PersonContext.away(text,c))return false;if(text===last.get(k)||re&&!re.test(text)||forbidden&&forbidden.test(text))return false;if(k.startsWith('college')&&/自宅|一人暮らし|布団|部屋で|アルバイト|バイト先|教習所|居酒屋|古着屋|面接/.test(text))return false;if(k.endsWith('_work')&&/自宅|在宅|帰宅|昼食|昼休み|退勤|出勤|通勤/.test(text))return false;if(k.includes('_lunch')&&/授業中|講義中|授業を受|講義を受|早弁|部活/.test(text))return false;if(k.endsWith('_after')&&(t.hf??t.h)<15&&/部活|サークル/.test(text))return false;return true});// A filtered original pool with little total weight (one rare seasonal line, say) gives way to the map's own pool in
  // proportion, so a rare line keeps its rarity.
  if(pk&&pk.tot<3&&rnd()>pk.tot/3)return null;return pk?fillText(textOf(pk.e),P):null;
 }
// The map's own supplement pools hold only two or three lines each, so every student at one campus drew the same few. These
 // add lines by school stage (elem, teen, college) for the phases that were thinnest, and are merged into the supplement
 // pool of that phase. Lines are for the people at school (no home, job or errand elsewhere).
 const MORE={
  teen:{
   school_weekend:['体育館で、部活の練習試合に向けてウォームアップをしているところでした','グラウンドの脇で、部活の仲間と水筒の麦茶を回し飲みしているところでした','休日の教室で、補習の問題を解いているところでした','音楽室で、次のコンクールの課題曲を合わせているところでした','美術室で、文化祭に出す絵の背景を塗っているところでした','図書室の自習席で、来週のテストの範囲を見直しているところでした','部室で、次の大会のメンバー表を見ながら先輩と話しているところでした','校庭で、友達と部活の休憩時間にスマートフォンの画面を見せ合っているところでした','休日の校舎の廊下で、顧問の先生に練習メニューを確かめているところでした','学校のプールの脇で、泳ぐ順番を待ちながらゴーグルを調整しているところでした'],
   school_evening:['部活を終え、部室で着替えながら今日の練習を振り返っているところでした','夕方の教室で、友達と宿題の答えを見せ合っているところでした','下校のチャイムが鳴り、校門で友達と別れの挨拶をしているところでした','居残りの自習室で、明日の小テストの範囲を確かめているところでした','部活のあとの水飲み場で、顔を洗って汗を流しているところでした']
  },
  college:{
   school_weekend:['休日の図書館の自習席で、レポートの参考文献を探しているところでした','サークルの部室で、次の大会の予定を先輩と話し合っているところでした','学園祭の準備で、模擬店の看板の絵を描いているところでした','体育会の練習のあと、グラウンドの脇で水を飲んでいるところでした','休日の研究室で、ゼミの資料をノートパソコンにまとめているところでした','キャンパスのベンチで、友人と次のゼミの発表の分担を決めているところでした','生協の売店で、教科書の売り場を見て回っているところでした','休日のキャンパスの芝生で、友人と持ち寄ったお菓子を広げているところでした','学内の自習室で、資格試験の過去問を解いているところでした','サークルの練習室で、本番前の通し練習の録音を聞き返しているところでした','休日の講義棟で、補講の教室の場所を掲示板で確かめているところでした','語学の課題のために、図書館でDVDを借りようとしているところでした'],
   school_evening:['夜の図書館で、閉館までに課題を仕上げようと画面に向かっているところでした','研究室で、夜遅くまで論文の草稿に目を通しているところでした','サークルの練習を終え、部室の鍵を返しに向かっているところでした','学食の閉店間際に、残り少ない定食を選んでいるところでした','夜のキャンパスで、友人と今日の講義のノートを見せ合っているところでした','最終の講義を終え、帰りの電車の時刻を確かめているところでした','自習室で、明日の小テストの範囲をもう一度読み返しているところでした','夜の講義棟の前で、サークルの飲み会の集合場所を友人と決めているところでした'],
   college_after:['サークルの部室で、新入生のための企画書をまとめているところでした','キャンパスの中庭で、友人と学園祭の出し物の相談をしているところでした','研究室で、先輩に資料の探し方を教わっているところでした','図書館のグループ学習室で、ゼミ発表のスライドを作っているところでした','学内のカフェで、友人と就活の情報を交換しているところでした','体育館で、サークルの練習の準備をしているところでした','講義棟の掲示板で、休講の知らせを見つけて肩を落としたところでした','生協で、新しい教科書を手に取って値段を確かめているところでした'],
   college_arrival:['キャンパスの門をくぐりながら、友人に「間に合った」とメッセージを送ったところでした','朝の学食で、パンとコーヒーを買って講義室へ向かっているところでした','掲示板で、休講の知らせが出ていないか確かめているところでした','自転車を駐輪場に停めて、遅れを取り戻そうと小走りしているところでした','講義室で、前の席に座ろうか後ろにしようか迷っているところでした'],
   college_lunch:['学食の券売機の前で、メニューを見比べて決めかねているところでした','中庭のベンチで、買ってきたお弁当を友人と広げているところでした','サークルの仲間と、部室でカップ麺をすすっているところでした','生協で、おにぎりと飲み物を手に会計の列に並んでいるところでした','昼休みの図書館で、午後の講義の予習をしているところでした','食堂の窓際の席で、午後の講義の持ち物を確かめているところでした'],
   college_class:['演習の授業で、配られたプリントの問題を解きはじめたところでした','語学の授業で、隣の席の人とペアで会話練習をしているところでした','教授の板書を、ノートの余白まで使って書き写しているところでした','演習の授業で、グループに分かれて課題の分担を決めているところでした','講義の途中で、スライドの一枚前に戻して説明し直してもらっているところでした','体育の授業で、準備運動のあとにコートへ向かっているところでした','大教室で、出席登録の画面を慌てて開いているところでした','ゼミの輪読で、自分の担当のページを読み上げているところでした']
  }
 };
 // Schools with their own daily life. Matched by the facility name in the school dataset (東京芸術大学 is spelled with 芸 there).
 // Medical and science/engineering students. Medical and technical universities get these scenes for all their
 // students; at a university with other faculties only its medical or engineering campus does (at: [lon, lat],
 // radius in metres), or a share of the students on a mixed campus.
 const MEDICAL={
  arrival:['白衣を詰めたかばんを抱えて、朝の実習に間に合うよう急いでいるところでした','病院実習の集合時間に合わせて、大学病院の通用口へ向かっているところでした'],
  class:['解剖学実習で、ご遺体に一礼してからメスを手に取ったところでした','生理学の講義で、心電図の波形を一つずつノートに写しているところでした','病院実習で、指導医の回診の後ろについて患者さんの話を聞いているところでした','OSCEの練習で、同級生を患者役に問診の手順を確かめているところでした','薬理学の講義で、覚える薬の名前の多さにため息をついたところでした','病理の実習で、顕微鏡をのぞきながら標本の細胞をスケッチしているところでした'],
  break:['休み時間に、解剖の図譜を広げて筋肉の名前を口の中で唱えているところでした'],
  lunch:['昼休みに、病院の食堂で白衣のまま定食をかき込んでいるところでした','昼休みに、同級生と次の試験範囲を確かめ合っているところでした'],
  after:['放課後の図書館で、国家試験の過去問を解いているところでした','部活の練習を終え、CBTの勉強のために自習室へ向かっているところでした','実習のレポートをまとめながら、明日の担当患者の資料を読み返しているところでした'],
  teacher:['医学部の講義で、スライドの症例について学生に問いかけているところでした','病院実習で、学生に聴診器の当て方を見せているところでした']},ENGINEERING={
  arrival:['徹夜明けの研究室から、そのまま一限の講義に向かっているところでした','ノートパソコンの入った重いリュックを背負って、キャンパスに着いたところでした'],
  class:['数学の講義で、黒板いっぱいの偏微分方程式を書き写しているところでした','プログラミングの演習で、エラーの出る行を探しているところでした','物理実験で、オシロスコープの波形を記録しているところでした','製図の授業で、CADの寸法を一つずつ入れ直しているところでした','材料力学の講義で、はりのたわみの式に首をかしげているところでした','化学実験で、ドラフトの中で試薬を慎重に量っているところでした'],
  break:['休み時間に、実験レポートの締め切りを指折り数えているところでした'],
  lunch:['昼休みに、学食で研究室の先輩と実験の段取りを話しているところでした'],
  after:['研究室で、夜通し回すシミュレーションの設定を確かめているところでした','ロボットコンテストに向けて、サークルの部室でモーターの配線をやり直しているところでした','実験レポートのグラフの軸を、何度も直しているところでした','研究室のゼミで、先週の実験結果を発表しているところでした'],
  teacher:['研究室で、学生の実験データのグラフを一緒にのぞき込んでいるところでした','工学部の講義で、スクリーンに回路図を映しながら説明しているところでした']};
 const schools=[
 [/^(東京医科歯科大学|順天堂大学|日本医科大学|東京慈恵会医科大学|東京医科大学|東京女子医科大学|昭和大学|東邦大学)$/,MEDICAL],
 [/^帝京大学$/,{...MEDICAL,at:[[139.7149,35.759],400]}],
 [/^慶應義塾大学$/,{...MEDICAL,at:[[139.7176,35.6825],400]}],
 [/^日本大学$/,{...MEDICAL,at:[[139.6912,35.7488],400]}],
 [/^東京大学$/,{...MEDICAL,at:[[139.7631,35.7125],400],share:.12}],
 [/^(東京工業大学|芝浦工業大学|工学院大学|東京電機大学|東京都市大学|東京理科大学)$/,ENGINEERING],
 [/^早稲田大学$/,{...ENGINEERING,at:[[139.706,35.706],300]}],
 [/^中央大学$/,{...ENGINEERING,at:[[139.7484,35.7085],300]}],
 [/^東京大学$/,{...ENGINEERING,at:[[139.7631,35.7125],400],share:.25}],
 [/^上智大学$/,{...ENGINEERING,at:[[139.7319,35.6836],300],share:.15}],
 [/^東京[芸藝]術大学$/,{
  arrival:['楽器ケースを背負い、上野公園側の門からキャンパスに入ったところでした','イーゼルを抱えて、朝いちばんのアトリエに入ったところでした','美術学部と音楽学部の間の道で、同じ学科の友達に声をかけられたところでした'],
  class:['石膏像を前に、木炭でデッサンの陰影を重ねているところでした','油絵の課題で、キャンバスに下地の色を塗り広げているところでした','彫刻の実習室で、粘土の塊から人の肩の線を削り出しているところでした','和声の授業で、五線譜に4声の進行を書き込んでいるところでした','レッスン室で、先生の伴奏に合わせて同じフレーズを何度も歌い直しているところでした','合奏の授業で、チューニングの音に耳を澄ませているところでした','講評会の順番を待ちながら、壁に掛けた自分の作品を見直しているところでした'],
  break:['チェロのケースを背負って、次のレッスン室へ急いでいるところでした','絵の具のついた手を洗い、次の講義に向かうところでした'],
  lunch:['学食で定食を受け取り、楽器ケースを足元に置いて座ったところでした','中庭のベンチで、パンをかじりながら楽譜を眺めているところでした','絵の具のついた作業着のまま、学食の列に並んでいるところでした'],
  after:['練習室の予約が取れ、閉館まで個人練習を始めたところでした','アトリエに残り、締め切り前の作品に最後の手を入れているところでした','学内コンサートのポスターを、掲示板に貼っているところでした','学内の画材店で、使い切った絵の具のチューブを買い足しているところでした'],
  season:t=>t.mo===8||t.mo===9&&t.d<=8?['藝祭で担ぐ御輿を、発泡スチロールから削り出しているところでした','藝祭の模擬店で出す料理の段取りを、同じ科の仲間と決めているところでした']:[]}],
 [/^堀越高等学校$/,{
  arrival:['撮影現場から直接来て、2時間目の途中から教室に入ったところでした','校門で先生にあいさつし、友達と並んで登校したところでした'],
  class:['前日の撮影が長引き、眠気をこらえながら数学の授業を受けているところでした','仕事で休んだ分の課題プリントを、先生から受け取ったところでした','国語の授業で、教科書の音読を指名されたところでした','体育の授業で、ダンスの振りを班で合わせているところでした'],
  break:['休み時間に、仕事で抜けた授業のノートを友達に見せてもらっているところでした','次の授業の前に、マネージャーからの連絡をこっそり確かめたところでした'],
  lunch:['昼休みに、教室で友達とお弁当を広げたところでした','午後から仕事が入っているため、昼休みのうちに早退の届けを出しているところでした','同級生が出ているドラマの話で、教室が盛り上がっているところでした'],
  after:['放課後、校門の近くで待っているマネージャーの車に乗り込むところでした','部活の練習で、グラウンドを走り込んでいるところでした','レッスンに向かう前に、駅までの道で台本を読み返しているところでした','撮影で休んだ日の補習を、教室で受けているところでした']}],
 // Music universities: lessons, ensembles and practice rooms.
 [/^(東京音楽大学|武蔵野音楽大学|東邦音楽大学|東邦音楽短期大学)$/,{
  arrival:['楽器ケースを背負い、朝いちばんの練習室の予約を取りに急いでいるところでした','譜面の入ったトートバッグを抱えて、キャンパスの門をくぐったところでした'],
  class:['個人レッスンで、先生の前で練習してきた曲を通して弾いているところでした','ソルフェージュの授業で、聴こえた和音を五線譜に書き取っているところでした','オーケストラの合奏の授業で、指揮者に同じ小節を何度もやり直させられているところでした','声楽のレッスンで、イタリア語の歌詞の発音を直されているところでした','音楽史の講義で、バロック時代の楽譜の写真を見ているところでした'],
  break:['チェロのケースを背負って、次のレッスン室へ急いでいるところでした','練習室の空きを確かめに、予約表の前に並んだところでした'],
  lunch:['学食で、楽器ケースを足元に置いて定食を食べているところでした','中庭のベンチで、パンをかじりながら次の曲の楽譜を眺めているところでした'],
  after:['練習室にこもり、メトロノームに合わせて同じフレーズを繰り返しているところでした','学内演奏会のリハーサルで、舞台袖で出番を待っているところでした','室内楽の仲間と、練習室で入りのタイミングを合わせているところでした','コンクールに向けて、先生に録音を聴いてもらっているところでした'],
  teacher:['個人レッスンで、学生の弓の持ち方をそっと直しているところでした','合奏の授業で、指揮棒を止めて金管の音量を下げるよう伝えたところでした','声楽のレッスンで、ピアノの伴奏を弾きながら学生の息継ぎを聞いているところでした','入試の実技試験の課題曲を、教員の会議で選んでいるところでした']}],
 // Music colleges for popular music: bands, vocals, sound engineering, dance.
 [/^(尚美ミュージックカレッジ専門学校|東京スクールオブミュージック専門学校渋谷|東京スクールオブミュージック＆ダンス専門学校|ミューズモード音楽院|ミューズ音楽院)$/,{
  arrival:['ギターケースを背負い、エレベーターで授業のフロアへ上がったところでした','スタジオの予約表で、今日の空き時間を確かめているところでした'],
  class:['ボーカルの授業で、腹式呼吸の練習を繰り返しているところでした','レコーディング実習で、ミキサーのつまみを少しずつ動かしているところでした','バンドアンサンブルの授業で、ドラムのフィルインに合わせてギターを入れたところでした','作曲の授業で、パソコンの画面にコード進行を打ち込んでいるところでした','ダンスの授業で、鏡の前で振り付けの8カウントを合わせているところでした'],
  break:['休み時間に、廊下でギターのチューニングをしているところでした'],
  lunch:['昼休みに、バンド仲間と次のライブのセットリストを話し合っているところでした'],
  after:['学校のスタジオで、バンドのメンバーとオリジナル曲を合わせているところでした','校内オーディションに向けて、空き教室で歌の練習をしているところでした','デビューを目指して、事務所に送る音源の最終チェックをしているところでした'],
  teacher:['ボーカルの講師として、生徒の高音の出し方を一緒に確かめているところでした','レコーディング実習で、生徒の録った音のバランスを講評しているところでした']}],
 // Music high schools: instrumental and vocal lessons on top of ordinary classes.
 [/^(東京芸術大学音楽学部附属音楽高等学校|東京音楽大学付属高等学校|東邦音楽大学附属東邦高等学校|日本音楽高等学校)$/,{
  arrival:['楽器ケースを抱えて、朝練のために早めに登校したところでした','電車の中で、イヤホンで課題曲の録音を聴きながら登校しているところでした'],
  class:['実技のレッスンで、先生の前で今週の課題曲を弾いているところでした','ソルフェージュの授業で、新曲視唱の楽譜を初見で歌っているところでした','数学の授業で、指の爪が伸びていないか気にしながらノートを取っているところでした','合唱の授業で、自分のパートの音を取り直しているところでした'],
  break:['休み時間に、練習室で少しでも指を動かしておこうとピアノに向かったところでした'],
  lunch:['昼休みに、友達と次の実技試験の曲の話をしているところでした'],
  after:['放課後の練習室で、メトロノームの速さを少しずつ上げているところでした','コンクールに向けて、先生の自宅のレッスンに向かう電車に乗ったところでした'],
  teacher:['実技のレッスンで、生徒の手首の力の抜き方を見せているところでした']}],
 [/^東京[芸藝]術大学$/,{teacher:['実技のレッスンで、学生の演奏を最後まで黙って聴いているところでした','アトリエを回り、学生の制作中の作品に一言ずつ声をかけているところでした','学内演奏会のリハーサルで、客席から響きを確かめているところでした']}]];
 function schoolPool(c,k,t){let name=c.facility?.name||'',xy=c.facility?.xy,own=schools.filter(([re,s])=>re.test(name)&&(!s.at||xy&&MapModel.distance(xy,s.at[0])<=s.at[1])).map(x=>x[1]);
  // On a mixed campus only a share of the people are medical or engineering ones.
  own=own.filter(s=>!s.share||rnd()<s.share);
  // Teachers at a school with its own daily life get its lesson scenes in working hours.
  if(c.role==='teacher'){const s=own.find(x=>x.teacher);return s&&/_work$/.test(k)?s.teacher:null}
  if(c.role!=='student')return null;let s=own.find(x=>x.arrival),phase=/_class$/.test(k)?'class':/_lunch$/.test(k)?'lunch':/_after$/.test(k)?'after':k==='school_break'?'break':/arrival$/.test(k)?'arrival':null;if(!s||!phase)return null;return [...s[phase],...(s.season&&['class','after'].includes(phase)?s.season(t):[])]}
 function apply(c,P,t){let k=key(c,P,t);if(!k)return false;if(c.role==='general'&&P.sit?.text&&!/会社で|職場で|通勤|出勤|退勤|学校で|授業中/.test(P.sit.text))return false;let pool=pools[k];if(!pool?.length)throw Error('Missing time situation '+k);{let kind=c.facility?.kind,st=['university','college'].includes(kind)&&/^college|^school_(weekend|evening)$/.test(k)?'college':['middle','high'].includes(kind)&&/^school_(weekend|evening)$/.test(k)?'teen':null,more=st&&MORE[st][k];if(more)pool=[...pool,...more]}let own=schoolPool(c,k,t);if(own&&rnd()<.75)pool=own;let candidates=pool.filter(x=>x!==last.get(k));let text=pool!==own&&rnd()<.5?reuse(k,c,P,t):null,source=text?'swapsim':pool===own?'school-special':'supplement';if(!text)text=candidates[Math.floor(rnd()*candidates.length)]||pool[0];last.set(k,text);P.mapSituation=text;P.sit={text,state:k==='home_sleep'||k==='facility_sleep'?'sleep':k.includes('lunch')||k==='facility_meal'?'off':c.role==='student'||c.role==='area_student'?'school':c.role==='general'?P.sit.state:c.role==='resident'||c.role==='patient'?'off':'work',stateLabel:c.label,p:1,source};P.timeSituationKey=k;return true}
 return {configure,studentPhase,homeStudent,key,apply,homeCompatible,schoolPool,reuse};
})();
if(typeof module!=='undefined')module.exports=TimeSituations;

