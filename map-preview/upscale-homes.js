/* High-end residential districts (松濤, 田園調布3丁目, 成城, 白金台, 元麻布, 南麻布). Residents are drawn as in any
   residential area, but more working adults are doctors, company executives and owners, professors and lawyers, and
   some at home get scenes of that life (a driver, the gardener, the wine cellar, 外商, a housekeeper; tutors and
   private music lessons for children). The place reads 〇〇 自宅. Centres, radii and shares are game assumptions. */
const UpscaleHomes=(()=>{
 const M=typeof MapModel!=='undefined'?MapModel:require('./model.js');
 const districts=[
  {name:'松濤',xy:[139.6935,35.6602],radius:350},
  {name:'田園調布',xy:[139.6655,35.5985],radius:380},
  {name:'成城',xy:[139.5985,35.6425],radius:650},
  {name:'白金台',xy:[139.7255,35.6372],radius:450},
  {name:'元麻布',xy:[139.7282,35.6548],radius:380},
  {name:'南麻布',xy:[139.7262,35.6478],radius:420}
 ];
 const pick=a=>a[Math.floor(rnd()*a.length)];
 const xyOf=c=>c.landComponent?.sampleXY||c.landComponent?.xy;
 function district(c){let p=xyOf(c);if(!p)return null;return districts.find(d=>M.distance(p,d.xy)<=d.radius)||null}
 // Occupations made more common here: [label, job name in the original list (or null), tag, cat, kind, weight].
 const JOBS=[['医師（開業医）','医師','doctor','専門','self',.22],['医師（勤務医）','医師','doctor','専門','reg',.12],['会社役員','会社役員','exec','管理','reg',.24],['会社経営者','会社役員','exec','管理','self',.2],['大学教授',null,'office','専門','reg',.12],['弁護士（自営業）','弁護士','office','専門','self',.1]];
 function assign(c,P){if(!c.resident||!district(c))return false;
  // About four in ten working adults (and some retirees still on a board) hold one of these jobs.
  let working=P.occ?.group==='adult'&&P.occ.cat!=='none',retired=P.age>=65&&P.age<80&&/年金/.test(P.occ?.label||'')&&P.sex==='m';
  if(!(working&&P.age>=30&&rnd()<.4||retired&&rnd()<.15))return false;
  let pool=JOBS.filter(j=>!(j[0]==='大学教授'&&(P.age<40||P.age>70))),total=pool.reduce((s,j)=>s+j[5],0),v=rnd()*total,j=pool.find(x=>(v-=x[5])<0)||pool[0];
  let job=j[1]&&typeof JOB_OBJS!=='undefined'?JOB_OBJS.find(x=>x.n===j[1])||null:null;P.occ={label:j[0],group:'adult',job,tag:j[2],cat:j[3],kind:j[4],form:'',p:1};return true}
 // who: exec / doctor / prof / work (any of those three or a lawyer) / parent; age limits per line. Lines without one go to
 // those households (the earners, homemakers, retirees and children); residents in other jobs keep ordinary home scenes.
 const scenes={
  morning:[{t:'運転手付きの車が門の前に着き、かばんを渡して後部座席に乗り込むところでした',who:'exec'},{t:'ハウスキーパーさんに、今日の夕食の献立を伝えているところでした',min:30},{t:'庭師さんが来る日で、手入れしてほしい松の枝を指さしているところでした',min:40},{t:'大型犬を連れて、朝の散歩から屋敷町の坂道を戻ってきたところでした',min:16},{t:'迎えのハイヤーを待ちながら、玄関先でネクタイを締め直しているところでした',who:'exec'}],
  day:[{t:'百貨店の外商の担当者を応接間に迎え、新作の時計を見せてもらっているところでした',min:35},{t:'資産管理会社の担当者と、応接間で不動産の運用について打ち合わせているところでした',min:40},{t:'庭の手入れに来た植木職人さんに、冷たいお茶を出しているところでした',min:35},{t:'ハウスキーパーさんが磨いた窓から、手入れの行き届いた庭を眺めているところでした',min:30},{t:'大型犬を連れて、静かな屋敷町をゆっくり散歩しているところでした',min:16},{t:'外商の担当者が持ってきた着物の反物を、ゆっくり見比べているところでした',min:60}],
  evening:[{t:'ハイヤーで帰宅し、運転手にお礼を言って門をくぐったところでした',who:'work'},{t:'大型犬の夕方の散歩から戻り、足を拭いてやっているところでした',min:16},{t:'子どものピアノのレッスンが終わり、先生を玄関まで見送ったところでした',who:'parent'},{t:'ハウスキーパーさんが帰ったあとの台所で、夕食を温め直しているところでした',min:30}],
  night:[{t:'ワインセラーから一本選び、ラベルの年号を確かめているところでした',min:25},{t:'海外出張から帰宅し、スーツケースを玄関に置いたままソファに沈み込んだところでした',who:'work'},{t:'ハイヤーで帰宅し、静かな家の明かりをつけたところでした',who:'work'},{t:'書斎で、明日の役員会の資料に目を通しているところでした',who:'exec'},{t:'書斎で、学会で発表する論文の原稿に赤を入れているところでした',who:'prof'},{t:'書斎で、明日の手術の手順を頭の中でたどっているところでした',who:'doctor'}],
  kid:[{t:'家庭教師の先生と、中学受験の算数の問題に取り組んでいるところでした',min:10,max:12},{t:'家庭教師の先生に、英語の長文の読み方を教わっているところでした',min:13,max:17},{t:'自宅のピアノの前で、個人レッスンの先生に指の形を直されているところでした',min:5,max:17},{t:'バイオリンの個人レッスンで、先生と一緒に弓の動きを確かめているところでした',min:5,max:17},{t:'ハウスキーパーさんが作ってくれたおやつを食べながら、宿題を広げているところでした',min:6,max:12},{t:'庭で、大型犬とボールを投げ合って遊んでいるところでした',min:5,max:12}],
  small:[{t:'ベビーシッターさんと、庭でシャボン玉を飛ばしているところでした',min:2,max:5},{t:'ピアノの先生に、小さな手で覚えたての曲を弾いて見せているところでした',min:4,max:5}]
 };
 function who(P){let l=P.occ?.label||'';if(/役員|経営/.test(l))return 'exec';if(/医師/.test(l))return 'doctor';if(/教授/.test(l))return 'prof';if(/弁護士/.test(l))return 'lawyer';if(P.age<18||/専業主婦|専業主夫|主婦（年金|年金生活|家事手伝い/.test(l))return 'home';return 'other'}
 function fits(e,P,role){if(role==='other')return false;if(e.min!=null&&P.age<e.min||e.max!=null&&P.age>e.max)return false;if(!e.who)return true;if(e.who==='parent')return P.age>=30&&P.age<60;if(e.who==='work')return ['exec','doctor','prof','lawyer'].includes(role);return e.who===role}
 function apply(c,P,t){if(!c.resident)return false;let d=district(c);if(!d)return false;
  let kind=typeof PlaceLabel!=='undefined'?PlaceLabel.kind(c,P):'自宅';
  if(kind==='自宅'&&P.sit?.state!=='sleep'&&!P.hb?.bed&&!P.hb?.leave&&rnd()<.4){let h=t.hf??t.h,role=who(P),
   key=P.age<6?'small':P.age<18?(h>=15&&h<21||(t.dow===0||t.dow===6)&&h>=10&&h<18?'kid':null):h>=6&&h<10?'morning':h<16&&h>=10?'day':h>=16&&h<19?'evening':h>=19?'night':null,
   pool=key?scenes[key].filter(e=>fits(e,P,role)):[];
   if(pool.length){let text=pick(pool).t;P.mapSituation=text;P.sit={...P.sit,text,stateLabel:'自宅で過ごしている',source:'upscale-home',p:1};kind=typeof PlaceLabel!=='undefined'?PlaceLabel.kind(c,P):kind}}
  // The district's name instead of the ward: 松濤 自宅, 成城.
  P.placeOverride=d.name+(kind?' '+kind:'');return true}
 return {districts,district,assign,apply,scenes};
})();
if(typeof module!=='undefined')module.exports=UpscaleHomes;
