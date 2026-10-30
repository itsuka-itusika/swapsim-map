/* Tower-apartment districts (晴海, 豊洲, 勝どき, ...): some residents at home get a scene of high-rise living mixed into
   the ordinary home scenes. No building is named; the place stays "〇〇 自宅". Centres, radii and shares are game
   assumptions (roughly how many residents live in a tower), not counts of real buildings. */
const TowerHomes=(()=>{
 const M=typeof MapModel!=='undefined'?MapModel:require('./model.js');
 const districts=[
  {name:'晴海',xy:[139.7790,35.6550],radius:650,share:.6},
  {name:'勝どき',xy:[139.7770,35.6590],radius:400,share:.5},
  {name:'月島',xy:[139.7830,35.6640],radius:350,share:.25},
  {name:'豊洲',xy:[139.7960,35.6545],radius:650,share:.55},
  {name:'東雲',xy:[139.8040,35.6440],radius:450,share:.45},
  {name:'有明',xy:[139.7920,35.6370],radius:450,share:.4},
  {name:'芝浦・港南',xy:[139.7500,35.6345],radius:600,share:.35},
  {name:'武蔵小杉',xy:[139.6590,35.5770],radius:600,share:.35}
 ];
 // [text, minimum age, maximum age]. Scenes avoid outside-place words so the place label keeps 自宅.
 const scenes={
  sleep:[['高層階の部屋で、遠くの湾岸の明かりを窓越しに残したまま眠っているところでした',6],['強い海風が窓を鳴らすなか、布団にくるまって眠っているところでした',0],['寝室のカーテンのすき間から、高速道路の明かりが細く差し込むなかで眠っているところでした',0]],
  morning:[['朝のエレベーターがなかなか来ず、出かける前に何度もボタンを見ているところでした',13],['高層階の窓から、朝の東京湾と行き交う船を眺めながらコーヒーを飲んでいるところでした',18],['ベランダに干せないので、浴室乾燥にかけた洗濯物の乾き具合を確かめているところでした',18],['朝の支度をしながら、窓の外に富士山が見えるか確かめたところでした',10]],
  day:[['宅配ボックスの通知を見て、エントランスまで降りるか迷っているところでした',18],['リビングの大きな窓から、湾岸の景色と流れる雲をぼんやり眺めているところでした',10],['ベランダに干せないので、部屋干しの洗濯物にサーキュレーターを当てているところでした',18],['管理組合の大規模修繕のお知らせを、リビングで読み返しているところでした',30],['共用のキッズルームから戻り、子どもを着替えさせているところでした',25,49]],
  evening:[['夕焼けに染まる湾岸のビル群を、リビングの窓から眺めているところでした',8],['夕方の混んだエレベーターで、同じ階の住人とあいさつを交わして部屋に戻ったところでした',10],['高層階の窓から見える夕日の位置で、季節の移り変わりを感じているところでした',15],['夕食の支度をしながら、窓の外の運河の水面が暗くなっていくのを見ているところでした',20]],
  night:[['部屋の明かりを落として、窓いっぱいに広がる夜景を眺めているところでした',12],['夜の窓から、レインボーブリッジや湾岸の明かりをぼんやり眺めているところでした',12],['風が強い夜で、窓のきしむ音を気にしながらリビングで過ごしているところでした',10],['花火大会の日程を調べて、部屋の窓から見えるか家族と話しているところでした',8,79]]
 };
 const xyOf=c=>c.landComponent?.sampleXY||c.landComponent?.xy||c.area?.xy;
 function district(c){let p=xyOf(c);if(!p)return null;return districts.find(d=>M.distance(p,d.xy)<=d.radius)||null}
 function slot(P,t){let h=t.hf??t.h;if(P.sit?.state==='sleep')return 'sleep';return h<10?'morning':h<16?'day':h<19?'evening':'night'}
 function apply(c,P,t){if(!c.resident||P.hb?.bed||P.hb?.leave)return false;let d=district(c);if(!d)return false;
  if(typeof PlaceLabel!=='undefined'&&PlaceLabel.kind(c,P)!=='自宅')return false;
  // Only some residents live in a tower, and even they get an ordinary home scene most of the time.
  if(rnd()>=d.share*.45)return false;
  let pool=scenes[slot(P,t)].filter(([,min,max=120])=>P.age>=min&&P.age<=max);if(!pool.length)return false;
  let text=pool[Math.floor(rnd()*pool.length)][0];P.mapSituation=text;P.sit={...P.sit,text,stateLabel:'自宅で過ごしている',source:'tower-home',p:1};return true}
 return {districts,scenes,district,apply};
})();
if(typeof module!=='undefined')module.exports=TowerHomes;
