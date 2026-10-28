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
 function homeCompatible(text){if(/夢の中/.test(text))return true;return !/川辺|河原|釣り糸|釣り竿|キャンプ場|テントの|映画館|劇場|コンサート|ライブ会場|美術館|博物館|水族館|動物園|遊園地|ゴルフ場|スキー場|登山|山頂|海水浴|旅行先|空港|新幹線|ホテルに|旅館に|球場|スタジアム|スタンドで|ショッピングモール|デパート|百貨店|物産展|電車に乗|電車の中|電車で|車内で|会社で|職場で|オフィスで|出張|教室で|放課後の教室|キャンパス|学食|学園祭|模擬店|アルバイト先|バイト先|のアルバイトで|居酒屋|キャバクラ|パチンコ|カラオケ|ゲームセンター|ボウリング|病院の|歯医者の待合室|待合室で|ジムで|ジムの|ダンス教室|ヨガの教室|駐車場で/.test(text)}
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
  let pk=fromPool(list,ctx,e=>{let text=textOf(e);if(c.resident&&!homeCompatible(text))return false;if(typeof PersonContext!=='undefined'&&PersonContext.away(text,c))return false;if(text===last.get(k)||re&&!re.test(text)||forbidden&&forbidden.test(text))return false;if(k.startsWith('college')&&/自宅|一人暮らし|布団|部屋で|アルバイト|バイト先|教習所|居酒屋|古着屋|面接/.test(text))return false;if(k.endsWith('_work')&&/自宅|在宅|帰宅|昼食|昼休み|退勤|出勤|通勤/.test(text))return false;if(k.includes('_lunch')&&/授業中|講義中|授業を受|講義を受|早弁|部活/.test(text))return false;if(k.endsWith('_after')&&(t.hf??t.h)<15&&/部活|サークル/.test(text))return false;return true});return pk?fillText(textOf(pk.e),P):null;
 }
 // Schools with their own daily life. Matched by the facility name in the school dataset (東京芸術大学 is spelled with 芸 there).
 const schools=[[/^東京[芸藝]術大学$/,{
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
  after:['放課後、校門の近くで待っているマネージャーの車に乗り込むところでした','部活の練習で、グラウンドを走り込んでいるところでした','レッスンに向かう前に、駅までの道で台本を読み返しているところでした','撮影で休んだ日の補習を、教室で受けているところでした']}]];
 function schoolPool(c,k,t){if(c.role!=='student')return null;let s=schools.find(([re])=>re.test(c.facility?.name||''))?.[1],phase=/_class$/.test(k)?'class':/_lunch$/.test(k)?'lunch':/_after$/.test(k)?'after':k==='school_break'?'break':/arrival$/.test(k)?'arrival':null;if(!s||!phase)return null;return [...s[phase],...(s.season&&['class','after'].includes(phase)?s.season(t):[])]}
 function apply(c,P,t){let k=key(c,P,t);if(!k)return false;if(c.role==='general'&&P.sit?.text&&!/会社で|職場で|通勤|出勤|退勤|学校で|授業中/.test(P.sit.text))return false;let pool=pools[k];if(!pool?.length)throw Error('Missing time situation '+k);let own=schoolPool(c,k,t);if(own&&rnd()<.75)pool=own;let candidates=pool.filter(x=>x!==last.get(k));let text=pool!==own&&rnd()<.5?reuse(k,c,P,t):null,source=text?'swapsim':pool===own?'school-special':'supplement';if(!text)text=candidates[Math.floor(rnd()*candidates.length)]||pool[0];last.set(k,text);P.mapSituation=text;P.sit={text,state:k==='home_sleep'||k==='facility_sleep'?'sleep':k.includes('lunch')||k==='facility_meal'?'off':c.role==='student'||c.role==='area_student'?'school':c.role==='general'?P.sit.state:c.role==='resident'||c.role==='patient'?'off':'work',stateLabel:c.label,p:1,source};P.timeSituationKey=k;return true}
 return {configure,studentPhase,homeStudent,key,apply,homeCompatible,schoolPool};
})();
if(typeof module!=='undefined')module.exports=TimeSituations;

