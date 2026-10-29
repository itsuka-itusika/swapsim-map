/* People aboard trains on the tracks inside the circle: passengers, drivers and conductors. Trains run on most
   track only part of the time, so the count is the expected number of trains present scaled down; weekday rush
   hours raise it. Frequencies, speeds, loads and that scaling are game assumptions. */
const RailModel=(()=>{
 const S=typeof MapSpatial!=='undefined'?MapSpatial:require('./spatial.js'),M=typeof MapModel!=='undefined'?MapModel:require('./model.js');
 let index=null,rails=[];
 function configure(data){rails=(data?.rails||[]).map((r,i)=>{let pts=[];for(let j=0;j<r.c.length;j+=2)pts.push([r.c[j],r.c[j+1]]);return {...r,id:'rail-'+i,pts,bbox:[Math.min(...pts.map(p=>p[0])),Math.min(...pts.map(p=>p[1])),Math.max(...pts.map(p=>p[0])),Math.max(...pts.map(p=>p[1]))]}});index=new S.Index(rails)}
 // [trains per hour per direction at rush / day / night, average speed km/h, cars, crew besides the driver]
 const KIND={jr:[22,12,8,35,10,1],metro:[24,12,8,30,9,.4],private:[20,10,7,35,9,1],tram:[10,8,5,13,1,0],agt:[12,8,6,27,6,0],shinkansen:[12,10,6,80,16,2]};
 const rushOf=t=>{let h=t.hf??t.h,we=t.dow===0||t.dow===6||!!t.holiday;return !we&&(h>=7&&h<9.5||h>=17.5&&h<20)};
 const running=h=>h>=4.8||h<.6;
 // Passengers per car: packed at rush, light midday, busy evenings, the last trains full again.
 const perCar=(t,k)=>{let h=t.hf??t.h,we=t.dow===0||t.dow===6||!!t.holiday;if(k==='tram')return h>=7&&h<20?35:15;return rushOf(t)?(h<12?230:180):h<6.5?40:h<10?(we?60:110):h<16?(we?90:60):h<21?(we?80:110):h<23.5?90:110};
 // Track is empty most of the time; only a share of the expected riders is drawn (low, a little higher at rush).
 const SCALE=t=>rushOf(t)?.22:.08;
 function lengths(p,r){let out=new Map(),sx=111195*Math.cos(p[1]*Math.PI/180);for(let rail of index?index.query(S.box(p,r)):[]){let len=0;for(let i=1;i<rail.pts.length;i++){let a=rail.pts[i-1],b=rail.pts[i],d=Math.hypot((b[0]-a[0])*sx,(b[1]-a[1])*111195),n=Math.max(1,Math.ceil(d/10));for(let j=0;j<n;j++){let u=(j+.5)/n,q=[a[0]+(b[0]-a[0])*u,a[1]+(b[1]-a[1])*u];if(M.distance(p,q)<=r)len+=d/n}}if(len>0){for(let s of rail.s){let key=rail.k+'/'+s,g=out.get(key)||{kind:rail.k,service:s,len:0,share:0};g.len+=len/rail.s.length;g.share=Math.max(g.share,1/rail.s.length);out.set(key,g)}}}return [...out.values()]}
 function rows(profile,t){if(!index&&typeof MAP_DATA!=='undefined')configure(MAP_DATA);if(!index||!rails.length)return [];let h=t.hf??t.h;if(!running(h))return [];
  let regions=profile.context?.data?.regions||(typeof MAP_DATA!=='undefined'?MAP_DATA.regions:[]),region=M.locate(profile.point,regions)||profile.parts?.[0]?.region;if(!region)return [];
  let stations=(profile.context?.facilities?.query?profile.context.facilities.query(S.box(profile.point,profile.radius)):[]).filter(f=>f.kind==='station'&&M.distance(f.xy,profile.point)<=profile.radius),rush=rushOf(t),out=[];
  for(let g of lengths(profile.point,profile.radius)){let [fr,fd,fn,speed,cars,crew]=KIND[g.kind]||KIND.private,freq=rush?fr:h<6.5||h>=22?fn:fd,trains=2*freq*(g.len/1000)/speed*SCALE(t);if(trains<=0)continue;
   let at=stations.filter(f=>(f.lines||[]).includes(g.service)),comp={id:'rail/'+g.service,name:g.service,type:'rail',subtype:g.kind,service:g.service,stations:at.map(f=>f.name),region,source:'国土数値情報 鉄道データ（N02）',precision:'line'};
   const add=(key,label,n,min,max,female,extra={})=>{if(n>0)out.push({role:'rail_'+key,label,n,w:n,min,max,female,rail:comp,railKind:g.kind,region,landType:'rail',subtype:g.kind,evidence:comp.source,precision:'line',landComponent:comp,...extra})};
   add('passenger','列車の乗客',trains*cars*perCar(t,g.kind),6,89,.48,{ageBands:rush?[[12,18,14],[19,24,14],[25,34,20],[35,44,18],[45,54,17],[55,64,11],[65,85,6]]:[[6,18,10],[19,29,18],[30,44,20],[45,59,20],[60,74,20],[75,89,12]]});
   add('driver',g.kind==='shinkansen'?'新幹線の運転士':'電車の運転士',trains,22,63,.06,{railWorker:true,driver:true,ageBands:[[22,29,30],[30,39,30],[40,49,22],[50,63,18]]});
   if(crew)add('conductor',g.kind==='shinkansen'?'新幹線の車掌':'電車の車掌',trains*crew,20,63,.2,{railWorker:true,ageBands:[[20,29,40],[30,39,28],[40,49,18],[50,63,14]]})}
  return out}
 const pick=a=>a[Math.floor(rnd()*a.length)];
 const T={
  rushAm:['満員電車でつり革につかまり、揺れのたびに足を踏ん張っているところでした','満員電車で、カバンを胸の前に抱えて身を縮めているところでした','混み合う車内で、イヤホンの音量を少し上げたところでした','電車の遅延のアナウンスを聞いて、会社に連絡するか迷っているところでした'],
  rushPm:['帰りの満員電車で、ドアの横に押しつけられているところでした','帰りの電車でようやく座れて、目を閉じたところでした','混み合う帰りの電車で、夕飯を何にするか考えているところでした'],
  rushStudent:['通学の満員電車で、単語帳を顔の前で開いているところでした','通学の電車で、同じ制服の友達を見つけて手を振ったところでした'],
  day:['空いた電車の座席で、スマホでニュースを読んでいるところでした','電車の座席で、乗り換えの駅を路線図で確かめているところでした','電車に揺られながら、うとうとしかけているところでした','車内の広告を、なんとなく端から読んでいるところでした','ベビーカーのそばの席で、向かいの赤ちゃんに手を振られたところでした'],
  window:['電車の窓から、流れていく街並みを眺めているところでした','電車のドアの窓から、遠くのビル群を眺めているところでした'],
  tunnel:['地下鉄の暗い窓に映った自分の顔と、目が合ったところでした','地下鉄の車内で、次の駅の案内表示を見上げたところでした'],
  night:['終電間際の電車で、乗り過ごさないよう駅名の表示を見つめているところでした','夜の電車で、窓に映る自分の疲れた顔に気づいたところでした','飲み会帰りの電車で、手すりにもたれて立っているところでした'],
  kid:['電車の窓に張りつき、すれ違う電車を数えているところでした','電車のいちばん前の車両で、運転席の窓から線路を見つめているところでした'],
  tram:['路面電車の窓から、沿線のバラを眺めているところでした','一両だけの路面電車で、運転士の後ろの席に座っているところでした'],
  shinkansen:['新幹線の座席で、駅で買った弁当のふたを開けたところでした','新幹線の窓側の席で、品川のビル群が遠ざかるのを見ているところでした'],
  driver:['運転席で、次の駅の停止位置に合わせてブレーキをかけているところでした','運転席で、前方の信号を指さして声に出して確かめたところでした','運転席から、ホームの端の乗客に注意を向けているところでした','雨で滑りやすいレールに、ブレーキを早めにかけているところでした'],
  driverRush:['満員の列車で、遅れを取り戻そうと時刻表と時計を見比べているところでした'],
  conductor:['車掌室から身を乗り出し、ホームの安全を確かめてドアを閉めたところでした','車内放送で、次の駅の乗り換え案内を読み上げたところでした','車内を巡回しながら、忘れ物がないか網棚を見ているところでした'],
  shinkansenCrew:['新幹線の車内で、車内改札の端末を手に通路を歩いているところでした']};
 function assign(c,P){if(!c.role?.startsWith('rail_'))return false;if(c.railWorker){let job=JOB_OBJS.find(j=>j.n==='電車の運転士');P.occ={label:c.label,group:'adult',cat:job?.cat||'輸送',tag:job?.tag||'train',job:c.role==='rail_driver'?job:undefined,kind:'employed',p:1};return true}
  if(['facility','prison'].includes(P.occ.group))P.occ={label:'無職',group:P.age>=65?'senior':'adult',cat:'none',p:1};return true}
 function apply(c,P,t){if(!c.role?.startsWith('rail_'))return false;let h=t.hf??t.h,k=c.railKind,rush=!!(t.dow!==0&&t.dow!==6&&!t.holiday&&(h>=7&&h<9.5||h>=17.5&&h<20)),text,state='commute';
  if(c.role==='rail_driver'){text=pick(rush?[...T.driver,...T.driverRush]:T.driver);state='work'}
  else if(c.role==='rail_conductor'){text=pick(k==='shinkansen'?[...T.conductor.slice(1),...T.shinkansenCrew]:T.conductor);state='work'}
  else{let student=['student','college','kid'].includes(P.occ.group)&&P.age<23;
   text=pick(k==='shinkansen'?T.shinkansen:k==='tram'?[...T.tram,...T.day]:rush?(student&&rnd()<.6?T.rushStudent:h<12?T.rushAm:T.rushPm):h>=22||h<1?T.night:P.age<10?[...T.kid,...T.day]:[...T.day,...(k==='metro'?T.tunnel:T.window)]);
   if(!rush)state='off'}
  // Where: 「〇〇駅 列車内」 when a station on that line is in the circle (trains spend part of their time stopped there).
  let st=c.rail.stations||[],where=st.length&&rnd()<.4?pick(st)+' 列車内':c.rail.service+' 列車内';
  P.railPlace=where;P.mapSituation=text;P.visitLabel=c.label;P.sit={...P.sit,text,state,stateLabel:c.role==='rail_passenger'?'電車で移動中':c.label,p:1,source:'rail'};return true}
 const cap=t=>rushOf(t)?.15:.05;
 return {configure,rows,assign,apply,lengths,cap};
})();
if(typeof module!=='undefined')module.exports=RailModel;
