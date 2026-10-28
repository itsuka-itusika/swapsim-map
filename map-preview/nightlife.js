/* Condition on the selected visit/work role before selecting existing swapsim text. */
const Nightlife=(()=>{
 const roles=new Set(['area_night','area_night_worker','area_cabaret_worker','area_adult_customer','area_adult_worker']);
 const fallback={
 dining:[12,5,'運ばれてきた料理を取り分けながら、次に何を頼むか友人と話しているところでした',{a:[20,89]}],
 entertainment:[12,5,'カラオケの曲一覧を見ながら、次に歌う曲を迷っているところでした',{a:[20,89]}],
 foodwork:[12,5,'追加の注文を聞き、厨房に伝える前に内容を復唱しているところでした',{a:[20,69]}]
 };
 const extra={
 dining:[
 '居酒屋で、おすすめの一品を尋ね、隣の友人と顔を見合わせたところでした',
 '焼肉の網に置いた肉をひっくり返し、焼けたものから皿に移しているところでした',
 '焼き鳥の串を追加しようとして、友人にも何が欲しいか尋ねているところでした',
 '立ち飲み屋で隣の客と話が弾み、次の一杯を頼もうとしているところでした',
 'バーのメニューを眺め、飲んだことのない一杯を頼むか迷っているところでした',
 '小料理屋のカウンターで料理の話を聞き、次に何を頼むか考えているところでした',
 '締めのラーメンを食べようと並び、まだ入れそうか友人と話しているところでした',
 '会計を分けようとして、小銭が足りるか財布の中をのぞいているところでした',
 '久しぶりに会った友人の話を聞き、思わず声を上げて笑ったところでした',
 '深夜の食堂で温かい定食に箸をつけ、ようやくひと息ついたところでした'
 ],
 entertainment:[
 '友人の歌に手拍子をしながら、次に自分が歌う曲を探しているところでした',
 '歌い終えた曲の採点結果を見て、友人と点数を比べているところでした',
 'ダーツの的を見つめ、次こそ狙った場所に当てようと構えているところでした',
 'ビリヤードの台を回り込み、次の球を狙う角度を考えているところでした',
 '友人の投げた球を見守り、残ったピンを見て声を上げたところでした',
 'クレーンゲームの景品が少し動き、もう一度挑戦するか迷っているところでした',
 'フロアに流れる音楽に合わせ、友人と体を揺らしているところでした',
 'フロアを離れ、飲み物を手に友人とひと休みしているところでした',
 '映画を見終え、印象に残った場面を友人と話しているところでした',
 'ライブが終わり、アンコールを待ちながら拍手を続けているところでした'
 ]
 };
 function extraPool(kind){return extra[kind].map((text,i)=>{let end=kind==='entertainment'&&[4,5,9].includes(i)?24:5;return [18,end,text,{a:[20,89],...(/立ち飲み|次の一杯/.test(text)?{np:1}:{})}]})}
 function handles(c){return roles.has(c.role)}
 function assign(c,P){
  let tags=c.role==='area_night_worker'?['food','izakaya']:c.role==='area_cabaret_worker'?['cabaret']:c.role==='area_adult_worker'?['adultservice']:null;
  if(!tags)return;
  let jobs=JOB_OBJS.filter(j=>tags.includes(j.tag)&&j[P.sex]>0&&P.age>=(j.o.amin||20)&&P.age<=(j.o.amax||69));
  if(!jobs.length)throw Error('No eligible nightlife job: '+c.role);
  let job=pickW(jobs,j=>j[P.sex]).v;
  P.occ={label:job.o.labels?.[P.sex]||job.n,group:'adult',cat:job.cat,tag:job.tag,job,kind:'employed',p:1};
 }
 function choose(c,P,t){
  if(!handles(c))return null;
  if(P.age<20)throw Error('Nightlife visitors must be adults');
  let h=t.hf??t.h,hol=holName(t),we=t.dow===0||t.dow===6||!!hol;
  let ctx={P,t,h,we,hol,brk:isBreak(t),mo:t.mo,vacP:false,vac:false,season:seasonOf(t.mo),wx:wxOf(P.pref,t),eq:eqOf(P.pref,t)};
  let pool=[],backup=null,label=c.label,state='off';
  if(c.role==='area_night'){
   let entertainment=rnd()<.4;label=entertainment?'夜の娯楽客':'夜の飲食客';
   let re=entertainment?/カラオケ|ボウリング|ゲームセンター|映画館|ナイトクラブ|(?:^|[、。「])クラブで|ライブハウス/:/居酒屋|バーで|立ち飲み|大衆酒場|レストラン|焼肉|焼き肉|ラーメン屋|飲食店|二次会|飲みに/;
   const seen=new Set();pool=Object.values(OFF_TX).flat().filter(e=>{let x=textOf(e);if(!re.test(x)||/ホテル|宿泊|お土産|帰国|公民館|囲碁クラブ|自宅|家で|部屋で|アルバイト|バイト|接客|注文を受け|キャバクラ|性風俗|仕事|上司/.test(x)||seen.has(x))return false;seen.add(x);return true});
   pool.push(...extraPool(entertainment?'entertainment':'dining'));
   backup=entertainment?fallback.entertainment:fallback.dining;
  }else if(c.role==='area_adult_customer'){
   pool=c.area?.adultStyle==='sexservice'?ADULT_VENUE_TX.filter(e=>/性風俗店/.test(textOf(e))):ADULT_VENUE_TX;label='成人向け店舗の利用客';
  }else{
   pool=WORK_TX[P.occ.tag]||[];state='work';
   if(c.role==='area_night_worker')backup=fallback.foodwork;
  }
  // Reuse the original adult-service situations after midnight when the venue is modeled open.
  if(h<3&&['area_adult_customer','area_adult_worker'].includes(c.role))pool=pool.filter(e=>e[1]===24).map(e=>[0,3,...e.slice(2)]);
  let pk=fromPool(pool,ctx)||(backup?fromPool([backup],ctx):null);
  if(!pk)throw Error('No matching nightlife situation: '+c.role+' at '+h);
  let text=fillText(textOf(pk.e),P);
  return {text,tpl:textOf(pk.e),state,stateLabel:label,p:pk.p,source:'swapsim-role-pool'};
 }
 return {handles,assign,choose,fallback,extra};
})();
if(typeof module!=='undefined')module.exports=Nightlife;

