/* Hotels by type (高級・シティ・ビジネス・旅館・簡易宿所). Room counts, occupancy, guest mix and staffing are game assumptions. */
const HotelModel=(()=>{
 const STYLE={
  luxury:{rooms:300,guests:{inbound:.45,leisure:.3,business:.25},staff:1.2,banquet:.4},
  city:{rooms:450,guests:{inbound:.3,leisure:.35,business:.35},staff:.6,banquet:.25},
  business:{rooms:200,guests:{inbound:.2,leisure:.25,business:.55},staff:.12,banquet:0},
  ryokan:{rooms:30,guests:{inbound:.6,leisure:.4},staff:.5,banquet:0},
  hostel:{rooms:60,guests:{inbound:.7,leisure:.3},staff:.1,banquet:0}};
 // Share of the staff on duty by job; housekeeping works late morning to afternoon, breakfast staff early.
 const STAFF={
  luxury:[['front','ホテルフロント係',.14],['concierge','コンシェルジュ',.05],['door','ドアマン',.06],['bell','ベルスタッフ',.07],['housekeeping','客室清掃員',.2],['restaurant','ホテルレストラン係',.25],['banquet','宴会サービス係',.13],['security','ホテル警備員',.04]],
  city:[['front','ホテルフロント係',.2],['bell','ベルスタッフ',.06],['housekeeping','客室清掃員',.25],['restaurant','ホテルレストラン係',.25],['banquet','宴会サービス係',.14],['security','ホテル警備員',.04]],
  business:[['front','ホテルフロント係',.45],['housekeeping','客室清掃員',.45],['restaurant','ホテルレストラン係',.1]],
  ryokan:[['front','仲居',.5],['housekeeping','客室清掃員',.25],['restaurant','旅館の調理師',.25]],
  hostel:[['front','ホテルフロント係',.6],['housekeeping','客室清掃員',.4]]};
 const GUEST={inbound:['訪日客','訪日旅行で宿泊中',6,79,.5],leisure:['宿泊客','旅行で宿泊中',6,85,.55],business:['出張中の宿泊客','出張で宿泊中',24,62,.3]};
 function style(c){return c.hotelStyle&&STYLE[c.hotelStyle]?c.hotelStyle:null}
 // People in the building: most guests are out sightseeing or at work during the day.
 function inside(h,s){if(h>=23||h<6.5)return .95;if(h<10)return .75;if(h<15)return s==='luxury'||s==='ryokan'?.35:.2;if(h<19)return .5;return .75}
 function roles(c,t){let s=style(c);if(!s)return null;let d=STYLE[s],h=t.hf??t.h,we=t.dow===0||t.dow===6||t.holiday,rooms=c.rooms||d.rooms,occ=we?.9:.8,guests=rooms*1.5*occ*inside(h,s),rows=[];
  const add=(key,label,n,min,max,female,extra={})=>n>0&&rows.push({role:'place_hotel_'+key,label,w:n,min,max,female,hotelStyle:s,...extra});
  for(let [k,share] of Object.entries(d.guests)){let [label,stay,min,max,female]=GUEST[k];add(k,label,guests*share,min,max,female,{guestType:k,stayLabel:stay,inboundGuest:k==='inbound'})}
  // Weddings and banquets: weekend daytime, weekday evening parties.
  if(d.banquet){let n=we?(h>=11&&h<20?rooms*d.banquet:0):h>=18&&h<21?rooms*d.banquet*.35:0;add('banquet','結婚式・宴会の出席者',n,20,79,.52,{guestType:'banquet'})}
  let staff=rooms*d.staff*(h>=7&&h<21?.45:.12);for(let [key,label,share] of STAFF[s]){let f=key==='housekeeping'?(h>=10&&h<16?1.6:.1):key==='restaurant'?(h>=6.5&&h<22?1:.15):key==='banquet'?(we&&h>=10&&h<21||h>=17&&h<21?1:.1):key==='door'||key==='bell'||key==='concierge'?(h>=7&&h<23?1:.15):1;add('staff_'+key,label,staff*share*f,20,key==='housekeeping'?72:65,key==='door'||key==='security'?.15:key==='housekeeping'?.7:.55,{placeWorker:true,staffKey:key})}
  return rows}
 const pick=a=>a[Math.floor(rnd()*a.length)];
 const T={
  business:{sleep:['出張先のホテルのベッドで、ぐっすり眠っているところでした'],
   morning:['朝食会場で、新聞を広げながらコーヒーを飲んでいるところでした','チェックアウトの列に並び、領収書の宛名を伝えたところでした','ネクタイを締めながら、今日の訪問先までの乗り換えを調べているところでした'],
   day:['部屋のデスクでノートパソコンを開き、オンライン会議に入ったところでした','午後の商談に向けて、ロビーのソファで資料を読み返しているところでした'],
   evening:['取引先との打ち合わせを終え、コンビニの袋を提げてチェックインしたところでした','部屋で、明日のプレゼン資料を最後に見直しているところでした','大浴場で、出張の疲れをほぐしているところでした'],
   night:['部屋の小さな机で、経費精算のアプリに領収書を撮って登録しているところでした','出張先の部屋で、家族とビデオ通話をしているところでした']},
  leisure:{sleep:['旅先のホテルのベッドで、ぐっすり眠っているところでした'],
   morning:['朝食ビュッフェで、和食と洋食のどちらにするか迷っているところでした','チェックアウトを済ませ、荷物をフロントに預けて出かけるところでした'],
   day:['部屋で少し休んでから、次の観光地に向かう準備をしているところでした','ホテルのラウンジで、旅の写真を見返しているところでした'],
   evening:['チェックインを済ませ、部屋の窓から東京の街を眺めているところでした','ライブ遠征のグッズを部屋に広げ、明日の公演の話で盛り上がっているところでした','夕食に出かける前に、近くの店を地図アプリで探しているところでした'],
   night:['旅先のホテルで、明日の予定を家族と話しているところでした','部屋の明かりを落とし、テレビの地元とは違う番組をぼんやり見ているところでした']},
  inbound:{sleep:['ホテルのベッドで、時差ぼけと闘いながら眠っているところでした'],
   morning:['朝食会場で、焼き魚と味噌汁の和朝食に挑戦しているところでした','チェックアウトを済ませ、スーツケースを転がして駅へ向かうところでした'],
   day:['部屋で、次に行く観光地の行き方を翻訳アプリで調べているところでした'],
   evening:['フロントで、近くのおすすめのラーメン店を尋ねているところでした','買い物袋を部屋に置き、ドラッグストアで買ったものをベッドに並べているところでした'],
   night:['部屋で、明日の観光ルートを地図アプリで確かめているところでした','部屋の窓から夜景の写真を撮り、母国の家族に送ったところでした']},
  luxury:['ラウンジで、アフタヌーンティーの三段のスタンドを前にしているところでした','ホテルのバーで、夜景を眺めながらカクテルを頼んだところでした','クラブラウンジで、カナッペをつまみながら一息ついているところでした'],
  banquetWe:['披露宴の受付で、ご祝儀袋を差し出したところでした','宴会場で、乾杯の音頭に合わせてグラスを掲げたところでした','チャペルで、新郎新婦の入場を待っているところでした','披露宴で、新婦の手紙に思わず目頭を押さえたところでした'],
  banquetWd:['立食パーティーで、名刺交換の列に並んでいるところでした','業界団体の懇親会で、乾杯のあいさつを聞いているところでした'],
  staff:{front:{day:['フロントでチェックインの手続きをしているところでした','宿泊客に、最寄り駅までの道順を地図で案内しているところでした','チェックアウトの精算で、領収書を手渡したところでした'],night:['夜勤のフロントで、翌日の予約の一覧を確認しているところでした','深夜に到着した宿泊客を、フロントで迎えたところでした']},
   concierge:['レストランの予約を、宿泊客の代わりに電話で取っているところでした','宿泊客に、観劇のチケットの手配状況を伝えているところでした'],
   door:['エントランスでタクシーのドアを開け、宿泊客を迎えたところでした','到着した車から、宿泊客のスーツケースを降ろしているところでした'],
   bell:['スーツケースを載せたカートを押し、客室まで案内しているところでした','預かった荷物に番号札を付け、クロークの棚に並べたところでした'],
   housekeeping:['チェックアウト後の客室で、ベッドのシーツを手早く張り替えているところでした','清掃の終わった客室で、アメニティの数を確かめているところでした','リネンを積んだワゴンを押して、次の客室へ向かっているところでした'],
   restaurant:{morning:['朝食ビュッフェで、空になった皿を新しい料理と入れ替えているところでした','朝食会場で、宿泊客の部屋番号を確かめて席へ案内しているところでした'],other:['ホテルのレストランで、ワインの注文を受けているところでした','ルームサービスの料理を、ワゴンに載せて客室へ運んでいるところでした']},
   banquet:['宴会場で、円卓にカトラリーを並べているところでした','披露宴の料理を、タイミングを合わせて一斉に運んでいるところでした'],
   security:['ロビーを巡回し、異常がないか確かめているところでした','防災センターで、館内のモニターを見守っているところでした','搬入口で、出入りする業者の名前を確かめているところでした'],securityNight:['深夜のロビーを巡回し、異常がないか確かめているところでした','防災センターで、館内のモニターを見守っているところでした']},
  ryokan:{front:['到着した宿泊客に、お茶とお菓子を出して館内を案内しているところでした','客室に布団を敷きながら、明日の朝食の時間を伝えているところでした'],restaurant:['夕食の懐石料理を、一品ずつ盛り付けているところでした']}};
 function phase(h){return h>=6.5&&h<10?'morning':h>=10&&h<17?'day':h>=17&&h<22?'evening':'night'}
 function assign(c,P){if(!c.hotelStyle||!c.role.startsWith('place_hotel_'))return false;if(c.placeWorker){P.occ={label:c.label,group:'adult',cat:'special',kind:'employed',p:1};return true}
  // Business travelers come from outside Tokyo on company business, so not as local public servants.
  if(c.guestType==='business'){let jobs=JOB_OBJS.filter(j=>['office','sales','it','exec'].includes(j.tag)&&!j.o.pub&&P.age>=(j.o.amin||22)),job=jobs[Math.floor(rnd()*jobs.length)];if(job)P.occ={label:job.n+(job.n==='会社役員'?'':'（正社員）'),group:'adult',cat:job.cat,tag:job.tag,job,kind:'employed',p:1}}
  else if(['prison','facility'].includes(P.occ.group))P.occ={label:'無職',group:P.age>=65?'senior':'adult',cat:'none',p:1};return true}
 function apply(c,P,t){if(!c.hotelStyle||!c.role.startsWith('place_hotel_'))return false;let h=t.hf??t.h,ph=phase(h),text,state='off',label=c.stayLabel||c.label;
  if(c.placeWorker){state='work';label=c.label;let k=c.staffKey;if(c.hotelStyle==='ryokan'&&T.ryokan[k])text=pick(T.ryokan[k]);else if(k==='front')text=pick(h>=22||h<6?T.staff.front.night:T.staff.front.day);else if(k==='security')text=pick(h>=22||h<5?T.staff.securityNight:T.staff.security);else if(k==='restaurant')text=pick(ph==='morning'?T.staff.restaurant.morning:T.staff.restaurant.other);else text=pick(T.staff[k])}
  else if(c.guestType==='banquet'){let we=t.dow===0||t.dow===6||t.holiday;text=pick(we?T.banquetWe:T.banquetWd);label=c.label}
  else{let g=T[c.guestType];if((h>=0&&h<6||h>=23.5)&&rnd()<.85){text=pick(g.sleep);state='sleep'}else{let pool=g[ph];if(c.hotelStyle==='luxury'&&c.guestType!=='business'&&h>=13&&h<23&&rnd()<.35)pool=T.luxury.filter(x=>h>=17||!/バー|カナッペ/.test(x));if(['business','hostel','ryokan'].includes(c.hotelStyle))pool=pool.filter(x=>!/ラウンジ|ロビーのソファ/.test(x))||pool;text=pick(pool.length?pool:g[ph])}}
  // A 旅館 has futons, not beds, for guests and staff alike.
  if(c.hotelStyle==='ryokan')text=text.replace('ホテルのベッド','宿の布団').replace('ベッドに並べ','布団の上に並べ').replace('ベッドのシーツ','布団のシーツ').replace(/ベッド/g,'布団');
  P.mapSituation=text;P.visitLabel=label;P.sit={...P.sit,text,state,stateLabel:label,p:1,source:'hotel'};return true}
 return {roles,assign,apply,style,STYLE};
})();
if(typeof module!=='undefined')module.exports=HotelModel;
