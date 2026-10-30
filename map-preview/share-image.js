/* Share images (1080×1350 PNG) drawn on a canvas in the notice's style: one person, one pair, or every pair of one
   swap on a 2×3 grid. Drawn rather than captured, so web fonts and the map never break the picture. Light colours
   only, whatever the page theme. */
const ShareImage=(()=>{
 const W=1080,H=1350,C={paper:'#E8EEEB',sheet:'#F8FAF8',ink:'#17231F',ink2:'#4D5E57',rule:'#2E6A5D',soft:'#C9D6D0',shu:'#C8371E',m:'#1F4C8F',f:'#A82A14'};
 const MIN="'Shippori Mincho B1','Hiragino Mincho ProN','Yu Mincho',serif",GO="'BIZ UDPGothic','Hiragino Sans','Yu Gothic','Meiryo',sans-serif";
 const SEX={m:'男性',f:'女性'},name=P=>P.displayName||P.surname.k+' '+P.given.k,job=P=>P.occ.label.replace(/（[^（）]*）$/,''),stars=n=>'★'.repeat(n)+'☆'.repeat(5-n);
 const pad=n=>String(n).padStart(2,'0'),serial=n=>'第'+String(n||0).padStart(6,'0')+'号';
 const date=t=>`${t.y}年${t.mo}月${t.d}日（${'日月火水木金土'[t.dow]}）`,clock=t=>typeof fmtClock==='function'?fmtClock(t):`${t.h}時${pad(t.mi)}分`;
 // Japanese wraps at any character; a closing mark never starts a line. Overflow ends in "…".
 function wrap(g,text,width,max=99){const lines=[];let line='';for(const ch of String(text)){if(g.measureText(line+ch).width>width&&line){if(/[、。）」』！？ー…]/.test(ch)){line+=ch;continue}lines.push(line);line=ch}else line+=ch}if(line)lines.push(line);
  if(lines.length>max){lines.length=max;let last=lines[max-1];while(last&&g.measureText(last+'…').width>width)last=last.slice(0,-1);lines[max-1]=last+'…'}return lines}
 // A name shrinks to fit its width down to a floor, then breaks onto two lines (shrinking again if a line still
 // overflows), then ends in "…": long foreign names never run into the stamp or the next column.
 function fitName(g,s,width,start,floor){let size=start,font=()=>`800 ${size}px ${MIN}`;g.font=font();while(size>floor&&g.measureText(s).width>width){size-=2;g.font=font()}
  if(g.measureText(s).width<=width)return {size,lines:[s]};let parts=s.split(' '),lines=parts.length>1?[parts[0],parts.slice(1).join(' ')]:wrap(g,s,width,2);
  while(size>floor*.6&&lines.some(l=>g.measureText(l).width>width)){size-=2;g.font=font()}
  // Still too wide at the smallest size: break by character over two lines instead of at the space.
  if(lines.some(l=>g.measureText(l).width>width))lines=wrap(g,s,width,2);return {size,lines}}
 function drawName(g,P,x,y,width,start,floor){const f=fitName(g,name(P),width,start,floor),lh=f.size*1.08;f.lines.forEach((l,i)=>text(g,l,x,y+i*lh,`800 ${f.size}px ${MIN}`,C[P.sex]||C.ink));return y+(f.lines.length-1)*lh}
 const hobbyOf=P=>typeof profileHobbyLabel==='function'?profileHobbyLabel(P):(P.hobbies||[]).map(h=>h.n||h).join('、');
 const bodyOf=(P,bmi=true)=>P.body?`${P.body.h.toFixed(1)}cm・${P.body.w.toFixed(1)}kg`+(bmi&&typeof bmiText==='function'?`（${bmiText(P)}）`:''):'';
 function text(g,s,x,y,font,color,align='left'){g.font=font;g.fillStyle=color;g.textAlign=align;g.fillText(s,x,y)}
 function para(g,s,x,y,width,font,color,lh,max){g.font=font;g.fillStyle=color;g.textAlign='left';const lines=wrap(g,s,width,max);lines.forEach((l,i)=>g.fillText(l,x,y+i*lh));return y+lines.length*lh}
 function sheet(g,x,y,w,h,bar=14){g.fillStyle=C.sheet;g.strokeStyle=C.soft;g.lineWidth=2;g.beginPath();g.roundRect(x,y,w,h,8);g.fill();g.stroke();g.fillStyle=C.shu;g.beginPath();g.roundRect(x,y,w,bar,[8,8,0,0]);g.fill()}
 function rule(g,x1,x2,y,dash){g.strokeStyle=C.soft;g.lineWidth=2;g.setLineDash(dash?[8,8]:[]);g.beginPath();g.moveTo(x1,y);g.lineTo(x2,y);g.stroke();g.setLineDash([])}
 function stamp(g,x,y,scale=1){g.save();g.translate(x,y);g.scale(scale,scale);g.rotate(-.2);g.globalAlpha=.85;g.strokeStyle=C.shu;g.lineWidth=6;g.beginPath();g.arc(0,0,86,0,Math.PI*2);g.stroke();g.lineWidth=2;g.beginPath();g.arc(0,0,74,0,Math.PI*2);g.stroke();
  text(g,'入替',0,-6,`800 50px ${MIN}`,C.shu,'center');text(g,'済',0,50,`800 50px ${MIN}`,C.shu,'center');g.restore()}
 function frame(g,title,R,t){g.fillStyle=C.paper;g.fillRect(0,0,W,H);sheet(g,40,40,W-80,H-80);
  text(g,title,90,140,`800 50px ${MIN}`,C.ink);if(R)text(g,serial(R.serial),W-90,140,`700 28px ${MIN}`,C.ink2,'right');
  text(g,date(t)+clock(t),90,195,`400 28px ${GO}`,C.ink2);rule(g,90,W-90,230);
  text(g,'集団入れ替わりシミュレーター 地図版（β）',90,H-82,`700 26px ${MIN}`,C.rule);text(g,'生成される人物はすべて架空です',W-90,H-82,`400 22px ${GO}`,C.ink2,'right')}
 function single(g,P){frame(g,'入れ替わり先のお知らせ',P,P.t);let y=310;
  y=para(g,`あなたは、${P.place}にいる${SEX[P.sex]||''}、`,90,y,W-180,`400 34px ${GO}`,C.ink,50,3);
  // The stamp sits right of the name; a long name shrinks (or breaks) to leave it room.
  stamp(g,W-190,y+70);let ny=drawName(g,P,90,y+100,640,100,56);text(g,'さんと入れ替わりました。',90,ny+62,`400 32px ${GO}`,C.ink);y=ny+130;
  const row=(label,value)=>{if(!value||value==='-')return;text(g,label,90,y,`700 26px ${MIN}`,C.rule);y=para(g,value,230,y,W-320,`400 31px ${GO}`,C.ink,42,2)+12};
  row('年齢',`${P.age}歳・${SEX[P.sex]||''}`);row(P.occ.kindLabel==='所属'?'所属':'職業',P.occ.label);row('体格',bodyOf(P));row('趣味',hobbyOf(P));row('健康',P.health?.text);
  rule(g,90,W-90,y+2,true);y+=58;text(g,'状況',90,y,`700 30px ${MIN}`,C.rule);// The situation stops above the stars.
  y=para(g,`${clock(P.t)}。${P.sit.text}。`,90,y+52,W-180,`400 34px ${GO}`,C.ink,50,Math.max(2,Math.floor((1125-(y+52))/50)+1));
  text(g,'めずらしさ',90,H-170,`700 28px ${MIN}`,C.rule);text(g,stars(P.stars||1),260,H-168,`400 40px ${GO}`,C.shu)}
 function pair(g,R){frame(g,'入れ替わりのお知らせ',R,R.t);
  // Each column: name, age and job, place, then 体格, 趣味 and 健康 (blank ones left out).
  const col=(P,x)=>{let ny=drawName(g,P,x,320,400,62,40);let y=para(g,`${P.age}歳・${job(P)}`,x,ny+56,400,`400 28px ${GO}`,C.ink,38,2);y=para(g,P.place,x,y,400,`400 24px ${GO}`,C.ink2,32,2)+10;
   for(const [label,value] of [['体格',bodyOf(P,false)],['趣味',hobbyOf(P)],['健康',P.health?.text]]){if(!value||value==='-')continue;text(g,label,x,y,`700 22px ${MIN}`,C.rule);y=para(g,value,x+64,y,336,`400 24px ${GO}`,C.ink,32,2)+6}return y};
  let end=Math.max(col(R.A,90),col(R.B,590));text(g,'⇄',W/2,320,`400 50px ${GO}`,C.rule,'center');const ry=end+8;rule(g,90,W-90,ry,true);
  let y=ry+58;text(g,'状況',90,y,`700 28px ${MIN}`,C.rule);text(g,clock(R.t),164,y,`400 24px ${GO}`,C.ink2);y+=52;
  // The two situations share the room left above the gap row and the stamp.
  const lines=Math.max(1,Math.min(3,Math.floor(((1070-y)/2-16)/44)+1));
  for(const P of [R.A,R.B]){g.fillStyle=C[P.sex]||C.ink;g.beginPath();g.arc(100,y-10,7,0,Math.PI*2);g.fill();y=para(g,`${P.surname.k}さんは、${P.sit.text}。`,120,y,W-210,`400 30px ${GO}`,C.ink,44,lines)+16}
  text(g,'ギャップ',90,H-170,`700 28px ${MIN}`,C.rule);text(g,stars(R.gap?.stars||1),220,H-168,`400 40px ${GO}`,C.shu);if(R.gap)text(g,`年齢差${R.gap.age}歳`,450,H-170,`400 26px ${GO}`,C.ink2);stamp(g,W-170,H-200,.72)}
 function group(g,list){const t=list[0].t;g.fillStyle=C.paper;g.fillRect(0,0,W,H);text(g,'入れ替わった人たち',60,100,`800 48px ${MIN}`,C.ink);text(g,date(t)+clock(t),W-60,100,`400 26px ${GO}`,C.ink2,'right');
  const cw=468,ch=350,gx=24,gy=22,x0=60,y0=140;
  list.slice(0,6).forEach((R,i)=>{const x=x0+(i%2)*(cw+gx),y=y0+Math.floor(i/2)*(ch+gy);sheet(g,x,y,cw,ch,6);
   text(g,'入れ替わりのお知らせ',x+20,y+44,`700 20px ${MIN}`,C.ink);text(g,serial(R.serial),x+cw-20,y+44,`400 18px ${MIN}`,C.ink2,'right');
   const who=(P,px)=>{let size=28;g.font=`700 ${size}px ${MIN}`;while(size>20&&g.measureText(name(P)).width>190){size-=1;g.font=`700 ${size}px ${MIN}`}
     // A name that does not fit at 20px goes on two smaller lines above the age.
     if(g.measureText(name(P)).width<=190)text(g,name(P),px,y+92,`700 ${size}px ${MIN}`,C[P.sex]||C.ink);else{const f=fitName(g,name(P),190,18,14);f.lines.forEach((l,i)=>text(g,l,px,y+76+i*(f.size+3),`800 ${f.size}px ${MIN}`,C[P.sex]||C.ink))}para(g,`${P.age}歳・${job(P)}`,px,y+124,190,`400 18px ${GO}`,C.ink2,24,1);para(g,P.place,px,y+150,190,`400 17px ${GO}`,C.ink2,24,1)};
   who(R.A,x+20);who(R.B,x+256);text(g,'⇄',x+cw/2,y+92,`400 26px ${GO}`,C.rule,'center');
   let sy=y+194;for(const P of [R.A,R.B]){g.fillStyle=C[P.sex]||C.ink;g.beginPath();g.arc(x+26,sy-7,5,0,Math.PI*2);g.fill();sy=para(g,`${P.surname.k}さんは、${P.sit.text}。`,x+40,sy,cw-60,`400 19px ${GO}`,C.ink,27,2)+8}
   rule(g,x+20,x+cw-20,y+ch-48,true);text(g,'ギャップ',x+20,y+ch-18,`400 18px ${GO}`,C.ink2);text(g,stars(R.gap?.stars||1),x+104,y+ch-17,`400 22px ${GO}`,C.shu)});
  text(g,'集団入れ替わりシミュレーター 地図版（β）',60,H-36,`700 24px ${MIN}`,C.rule);text(g,'生成される人物はすべて架空です',W-60,H-36,`400 20px ${GO}`,C.ink2,'right')}
 // Web fonts load only the glyphs a page has used: ask for every character first.
 async function fonts(chars){if(typeof document==='undefined'||!document.fonts?.load)return;try{await Promise.all(['800 40px "Shippori Mincho B1"','700 40px "Shippori Mincho B1"','400 40px "BIZ UDPGothic"','700 40px "BIZ UDPGothic"'].map(f=>document.fonts.load(f,chars)))}catch{}}
 async function render(kind,value){const people=kind==='group'?value.flatMap(R=>[R.A,R.B]):kind==='pair'?[value.A,value.B]:[value];
  await fonts('入れ替わり先のお知らせ人たちあなたは、にいる男性女性さんと入れ替わりました。年齢所属職業体格趣味健康状況めずらしさギャップ差歳第号集団シミュレーター地図版（β）生成される物はすべて架空です入替済⇄0123456789.cmkgBMI・（）年月日火水木金土午前後時分…'+people.map(P=>name(P)+P.place+P.occ.label+P.sit.text+(P.health?.text||'')+P.surname.k+(typeof profileHobbyLabel==='function'?profileHobbyLabel(P):'')+(typeof bmiText==='function'?bmiText(P):'')).join(''));
  const c=document.createElement('canvas');c.width=W;c.height=H;const g=c.getContext('2d');g.textBaseline='alphabetic';
  if(kind==='group')group(g,value);else if(kind==='pair')pair(g,value);else single(g,value);
  return new Promise((ok,fail)=>c.toBlob(b=>b?ok(b):fail(Error('画像を作成できませんでした')),'image/png'))}
 return {render,wrap,W,H};
})();
if(typeof module!=='undefined')module.exports=ShareImage;
