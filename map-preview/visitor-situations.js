// Shared domestic/inbound travel situations, constrained by hour and visit purpose.
const VisitorSituations=(()=>{
 const daytime=[
 '街並みを写真に収めているところでした',
 '地図を見ながら、次に立ち寄る場所を探しているところでした',
 '土産物を手に取り、誰に渡すか考えているところでした',
 '店先のメニューを見比べているところでした',
 '歩き疲れて、飲み物を飲みながら休んでいるところでした',
 '同行者と、次の行き先を相談しているところでした',
 '案内板を読んで、街の歴史を知ったところでした',
 '気になっていた店の前で、入店の順番を待っているところでした'
 ];
 const evening=[
 '夜景を撮ろうと、スマートフォンを構えているところでした',
 '夕食を食べる店を探しているところでした'
 ];
 const late=[
 '宿泊先へ戻る道を地図で確認しているところでした',
 'ホテルのロビーで、翌日の予定を調べているところでした'
 ];
 const inbound=[
 '翻訳アプリで、店のメニューを読んでいるところでした',
 '海外の家族に、旅先で撮った写真を送っているところでした',
 '帰国後に渡すお土産を選んでいるところでした'
 ];
 function text(c,P,t,random=Math.random){let h=t.hf??t.h,stories=typeof MAP_DATA!=='undefined'?MAP_DATA.storyScenes?.visitor:null;
 if(!stories){let pool=h>=22||h<6?late:h>=18?evening:daytime;return pool[Math.floor(random()*pool.length)];}
 let pool=P.age<12?stories.child:h>=22||h<6?stories.late:h>=18?stories.evening:stories.day;
 if(P.age>=12&&c.role==='area_inbound'&&h>=8&&h<21)pool=[...pool,...stories.inbound];return pool[Math.floor(random()*pool.length)];
 }
 // Street-specific scenes from areas.json: [start,end,text] for visitors, with "night" for evening revelers
 // and "weekend" for scenes held only on weekends and holidays (銀座の歩行者天国).
 function local(c,P,t,random=Math.random){let scenes=c.area?.scenes,h=t.hf??t.h,night=c.role==='area_night',we=t.dow===0||t.dow===6||!!t.holiday||(typeof holName==='function'&&!!holName(t));if(!scenes||!['area_shopping','area_tourist','area_inbound','area_night'].includes(c.role)||random()>=(c.area.visitOnly?1:.6))return null;
  // Workplace lines (同僚, 取引先 ...) only for people with a job; an area with few lines of its own uses them less often.
  const employed=P.occ?.group==='adult'&&P.occ.cat!=='none'&&!/無職|主婦|主夫|年金|学生/.test(P.occ.label||'');
  let pool=scenes.filter(([s,e,text,kind])=>(kind==='night')===night&&(kind!=='weekend'||we)&&(s<=e?h>=s&&h<e:h>=s||h<e)&&(employed||!/同僚|上司|部下|取引先|会社|接待|仕事帰り/.test(text)));
  if(!pool.length||!c.area.visitOnly&&random()>=Math.min(1,pool.length/5))return null;return pool[Math.floor(random()*pool.length)][2]}
 return {text,local,daytime,evening,late,inbound};
})();
if(typeof module!=='undefined')module.exports=VisitorSituations;

