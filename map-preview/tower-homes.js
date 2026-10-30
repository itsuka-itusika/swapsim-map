/* Tower-apartment districts (晴海, 豊洲, 勝どき, ...): some residents at home get a scene of high-rise living mixed into
   the ordinary home scenes. No building is named; the place stays "〇〇 自宅". Centres, radii and shares are game
   assumptions (roughly how many residents live in a tower), not counts of real buildings. */
const TowerHomes=(()=>{
 const M=typeof MapModel!=='undefined'?MapModel:require('./model.js');
 // bay: the bay can be seen from there (月島 looks onto the river and old streets instead).
 const districts=[
  {name:'晴海',xy:[139.7790,35.6550],radius:650,share:.6,bay:true},
  {name:'勝どき',xy:[139.7770,35.6590],radius:400,share:.5,bay:true},
  {name:'月島',xy:[139.7830,35.6640],radius:350,share:.25,bay:false},
  {name:'豊洲',xy:[139.7960,35.6545],radius:650,share:.55,bay:true},
  {name:'東雲',xy:[139.8040,35.6440],radius:450,share:.45,bay:true},
  {name:'有明',xy:[139.7920,35.6370],radius:450,share:.4,bay:true},
  {name:'芝浦・港南',xy:[139.7500,35.6345],radius:600,share:.35,bay:true}
 ];
 // min/max: ages the line suits; bay: only where the bay can be seen. Scenes avoid outside-place words so the place
 // label keeps 自宅.
 const scenes={
  sleep:[{t:'遠くの湾岸の明かりを窓越しに残したまま眠っているところでした',min:6,bay:true},{t:'強い海風が窓を鳴らすなか、布団にくるまって眠っているところでした',min:0,bay:true}],
  morning:[{t:'朝のエレベーターがなかなか来ず、出かける前に何度もボタンを見ているところでした',min:13},{t:'朝の東京湾と行き交う船を眺めながらコーヒーを飲んでいるところでした',min:18,bay:true},{t:'朝の支度をしながら、窓の外に富士山が見えるか確かめたところでした',min:10}],
  day:[{t:'リビングの大きな窓から、湾岸の景色と流れる雲をぼんやり眺めているところでした',min:10,bay:true},{t:'部屋干しの洗濯物にサーキュレーターを当てているところでした',min:18},{t:'大規模修繕のお知らせを、リビングで読み返しているところでした',min:30},{t:'キッズルームから戻り、子どもを着替えさせているところでした',min:25,max:49}],
  evening:[{t:'夕焼けに染まるビル群を、リビングの窓から眺めているところでした',min:8},{t:'エレベーターで、同じ階の住人とあいさつを交わして部屋に戻ったところでした',min:10},{t:'窓から見える夕日の位置で、季節の移り変わりを感じているところでした',min:15}],
  night:[{t:'部屋の明かりを落として、窓いっぱいに広がる夜景を眺めているところでした',min:12},{t:'夜の窓から、湾岸の明かりをぼんやり眺めているところでした',min:12,bay:true},{t:'風が強い夜で、窓のきしむ音を気にしながらリビングで過ごしているところでした',min:10},{t:'花火大会の日程を調べて、部屋の窓から見えるか家族と話しているところでした',min:8,max:79}]
 };
 const xyOf=c=>c.landComponent?.sampleXY||c.landComponent?.xy||c.area?.xy;
 function district(c){let p=xyOf(c);if(!p)return null;return districts.find(d=>M.distance(p,d.xy)<=d.radius)||null}
 function slot(P,t){let h=t.hf??t.h;if(P.sit?.state==='sleep')return 'sleep';return h<10?'morning':h<16?'day':h<19?'evening':'night'}
 function pool(d,k,age){return scenes[k].filter(e=>age>=e.min&&age<=(e.max??120)&&(d.bay||!e.bay)).map(e=>e.t)}
 function apply(c,P,t){if(!c.resident||P.hb?.bed||P.hb?.leave)return false;let d=district(c);if(!d)return false;
  if(typeof PlaceLabel!=='undefined'&&PlaceLabel.kind(c,P)!=='自宅')return false;
  // Only some residents live in a tower, and even they get an ordinary home scene most of the time.
  if(rnd()>=d.share*.45)return false;
  let list=pool(d,slot(P,t),P.age);if(!list.length)return false;
  let text=list[Math.floor(rnd()*list.length)];P.mapSituation=text;P.sit={...P.sit,text,stateLabel:'自宅で過ごしている',source:'tower-home',p:1};return true}
 return {districts,scenes,district,pool,apply};
})();
if(typeof module!=='undefined')module.exports=TowerHomes;
