/* 2027年度（2027年1〜3月）の入試日程。共通テストは公表日程、ほかは例年の傾向に合わせた仮想日程。
   Which schools are private or national is guessed from the name; the school dataset has no founder. */
const ExamSchedule=(()=>{
 const days=(mo,a,b=a)=>Array.from({length:b-a+1},(_,i)=>[mo,a+i]);
 const EXAMS=[
  {id:'kyotsu',name:'大学入学共通テスト',days:days(1,16,17),kind:'university',who:'univ',hours:[8.5,18.3],lunch:[12,13.3],n:.8},
  {id:'suisen',name:'都立高校の推薦入試',days:days(1,26,27),kind:'high',side:'public',who:'hs',hours:[8.5,15],lunch:[12,13],n:.25},
  {id:'chuju',name:'私立中学の入試',days:days(2,1,3),kind:'middle',side:'private',who:'ms',hours:[8,17],lunch:[12,13.5],n:.9,parents:.5},
  {id:'shidai',name:'私立大学の一般選抜',days:days(2,1,13),kind:'university',side:'private',who:'univ',hours:[8.5,17.5],lunch:[12,13],n:.5},
  {id:'shiko',name:'私立高校の一般入試',days:days(2,10,12),kind:'high',side:'private',who:'hs',hours:[8.5,15],lunch:[12,13],n:.6},
  {id:'toritsu',name:'都立高校の一般入試',days:[[2,22]],kind:'high',side:'public',who:'hs',hours:[8.5,15.5],lunch:[12,13],n:.5},
  {id:'zenki',name:'国公立大学の前期試験',days:days(2,25,26),kind:'university',side:'public',who:'univ',hours:[9,17.5],lunch:[12,13],n:.6},
  {id:'kouki',name:'国公立大学の後期試験',days:[[3,12]],kind:'university',side:'public',who:'univ',hours:[9,17],lunch:[12,13],n:.2},
  {id:'toritsu_result',name:'都立高校の合格発表',days:[[3,2]],kind:'high',side:'public',who:'hs',hours:[9,12],result:true,n:.12,parents:.4},
  {id:'zenki_result',name:'国公立大学の合格発表',days:[[3,10]],kind:'university',side:'public',who:'univ',hours:[12,15],result:true,n:.06,parents:.2}];
 const NATIONAL=/^(東京大学|東京医科歯科大学|東京科学大学|東京工業大学|東京芸術大学|東京藝術大学|お茶の水女子大学|東京海洋大学|首都大学東京|東京都立大学)$/,NO_EXAM=/大学院大学|専門職大学|通信|ビジネス・ブレークスルー/;
 let stems=null;const stem=n=>n.replace(/(高等学校|中学校|高等科|中等科)$/,'');
 // Private middle schools almost always share their name with an attached high school; national 附属 schools also hold entrance exams.
 function side(f){if(f.kind==='university')return NO_EXAM.test(f.name)?null:NATIONAL.test(f.name)?'public':'private';
  if(!stems&&typeof MAP_DATA!=='undefined'){stems={middle:new Set(),high:new Set()};for(let x of MAP_DATA.facilities)if(stems[x.kind])stems[x.kind].add(stem(x.name))}
  let other=f.kind==='middle'?'high':'middle',paired=stems?.[other]?.has(stem(f.name)),priv=paired||/学園|学院|女子|附属|付属|義塾|高等科|中等科/.test(f.name);
  return f.kind==='middle'?(priv?'private':null):priv?'private':'public'}
 function on(f,t){if(t.y!==2027)return null;let h=t.hf??t.h;return EXAMS.find(e=>e.kind===f.kind&&e.days.some(([m,d])=>m===t.mo&&d===t.d)&&(!e.side||side(f)===e.side)&&h>=e.hours[0]-.5&&h<e.hours[1])||null}
 const grades={univ:[[12,.75],[13,.25]],hs:[[9,1]],ms:[[6,1]]},ages={univ:[17,20],hs:[14,15],ms:[11,12]};
 // Extra rows for one school on an exam day; regular pupils are off (入試日は休校・入構制限).
 function rows(f,t,base){let e=on(f,t);if(!e)return null;let n=base*e.n,[min,max]=ages[e.who],out=[{role:'exam_taker',label:e.result?'合格発表を見に来た受験生':'受験生',n,min,max,female:.5,exam:e,facility:f}];if(e.parents)out.push({role:'exam_parent',label:'受験生の保護者',n:n*e.parents,min:36,max:58,female:.65,exam:e,facility:f});return {exam:e,rows:out}}
 const T={
  univ:{before:['試験会場の掲示板で、自分の受験番号の教室を探しているところでした','受験票と鉛筆を机に並べ、試験開始の合図を待っているところでした','会場の入口で、高校の先生から使い捨てカイロを手渡されたところでした'],
   during:['問題冊子をめくり、最初の大問に目を通しているところでした','マークシートの塗り残しがないか、見直しているところでした','時計を見ながら、残りの大問に取りかかっているところでした','見たことのある形の問題に、少しだけ肩の力が抜けたところでした'],
   lunch:['昼休みに、教室の机で弁当を食べながら単語帳をめくっているところでした','答え合わせはしないと決め、黙ってお茶を飲んでいるところでした'],
   after:['試験を終え、会場を出る受験生の列に並んでいるところでした','試験を終え、校門の前で同じ高校の友達と合流したところでした']},
  hs:{before:['試験教室の席に着き、受験票を机の右上に置いたところでした','校門の前で、中学校の先生に送り出されたところでした'],
   during:['数学の大問を解き終え、見直しに戻ったところでした','英語のリスニングに、耳を澄ませているところでした','国語の作文で、字数を数えながら書き進めているところでした','理科の実験の問題で、図の目盛りを読み直しているところでした'],
   lunch:['昼休みに、持ってきたお弁当を食べながら社会のノートを見返しているところでした'],
   after:['試験を終え、同じ中学の友達と答えを確かめ合いながら校門を出たところでした']},
  ms:{before:['校門の前で、塾の先生に握手で送り出されたところでした','控室で受験票を首から下げ、鉛筆の芯を確かめているところでした'],
   during:['算数の図形の問題で、補助線を一本引いたところでした','国語の物語文を読み、登場人物の気持ちに線を引いているところでした','理科の問題で、てこのつり合いを図に書き込んでいるところでした'],
   lunch:['午前の試験を終え、控室でおにぎりを食べながら午後の試験に備えているところでした'],
   after:['試験を終えて校門を出て、待っていた家族に駆け寄ったところでした']},
  parent:{before:['校門の前で、子どもの背中が見えなくなるまで見送ったところでした','保護者控室で、ほかの保護者と目が合い、小さく会釈したところでした'],
   during:['保護者控室で、本を開いたまま何度も時計を見ているところでした','保護者控室で、温かいお茶を飲みながら子どもの試験が終わるのを待っているところでした'],
   lunch:['控室で子どもと昼食をとりながら、午後の試験の話はしないよう気をつけているところでした'],
   after:['試験を終えて出てきた子どもに、まず「おつかれさま」と声をかけたところでした']},
  result:['合格発表の掲示板で、自分の受験番号を探しているところでした','掲示板に自分の番号を見つけ、思わず声を上げたところでした','掲示板の前で、番号が見つからずに何度も見直しているところでした','合格した友達と、掲示板の前で写真を撮っているところでした'],
  resultParent:['合格発表の掲示板の前で、子どもと一緒に番号を探しているところでした','番号を見つけた子どもに肩をたたかれ、掲示板を見上げたところでした'],
  staff:['試験監督として、問題冊子を受験生の机に配っているところでした','試験監督として、教室の後ろから受験生の様子を見守っているところでした','受験生の誘導係として、廊下で試験教室を案内しているところでした','試験本部で、答案用紙の枚数を確かめているところでした'],
  resultStaff:['合格発表の掲示板の前で、入学手続きの書類を配っているところでした']};
 const special={kyotsu:{before:['大学入学共通テストの会場で、試験開始の合図を待って深呼吸しているところでした'],during:['共通テストのマークシートに、受験番号を一桁ずつ塗っているところでした']},
  suisen:{during:['推薦入試の面接の順番を待ちながら、志望理由をもう一度頭の中で確かめているところでした','集団討論で、ほかの受験生の意見にうなずきながらメモを取っているところでした','小論文の課題を読み、書き出しの一文を考えているところでした']},
  shidai:{after:['試験を終え、明日受ける別の大学の会場を地図で確かめているところでした']},zenki:{during:['二次試験の数学で、答案用紙に途中式を書き込んでいるところでした','論述問題の下書きを、問題用紙の余白に書いているところでした']},kouki:{during:['後期試験の小論文で、最後の段落を書き終えたところでした']}};
 function phase(e,h){return h<e.hours[0]+.6?'before':h>=e.lunch?.[0]&&h<e.lunch?.[1]?'lunch':h>=e.hours[1]-.6?'after':'during'}
 const pick=a=>a[Math.floor(rnd()*a.length)];
 function apply(c,P,t){let e=c.exam||(c.role==='teacher'&&c.facility?on(c.facility,t):null);if(!e||!['exam_taker','exam_parent','teacher'].includes(c.role))return false;let h=t.hf??t.h,ph=phase(e,h),pool;
  if(c.role==='teacher')pool=e.result?T.resultStaff:T.staff;
  else if(e.result)pool=c.role==='exam_parent'?T.resultParent:T.result;
  else if(c.role==='exam_parent')pool=T.parent[ph];
  else pool=e.id==='suisen'&&ph==='during'?special.suisen.during:[...T[e.who][ph],...(special[e.id]?.[ph]||[])];
  let text=pick(pool);P.mapSituation=text;P.visitLabel=e.name;P.sit={...P.sit,text,state:c.role==='teacher'?'work':'off',stateLabel:e.name+(c.role==='teacher'?'の担当':c.role==='exam_parent'?'の付き添い':'を受けている'),p:1,source:'exam'};return true}
 return {EXAMS,on,side,rows,apply,grades};
})();
if(typeof module!=='undefined')module.exports=ExamSchedule;
