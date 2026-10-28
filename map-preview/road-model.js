/* People in vehicles on expressways and major roads. Traffic density, vehicle mix and occupancy are game assumptions. */
const RoadModel=(()=>{
 const S=typeof MapSpatial!=='undefined'?MapSpatial:require('./spatial.js'),M=typeof MapModel!=='undefined'?MapModel:require('./model.js');
 let index=null,roads=[];
 // Classes: x = expressway (首都高など), n = national road, p = wide prefectural road.
 const BASE={x:90,n:70,p:45},CENTRAL=new Set(['13101','13102','13103','13104','13113']);
 function configure(data){roads=(data?.roads||[]).map((r,i)=>{let pts=[];for(let j=0;j<r.c.length;j+=2)pts.push([r.c[j],r.c[j+1]]);return {...r,id:'road-'+i,pts,bbox:[Math.min(...pts.map(p=>p[0])),Math.min(...pts.map(p=>p[1])),Math.max(...pts.map(p=>p[0])),Math.max(...pts.map(p=>p[1]))]}});index=new S.Index(roads)}
 const hourly=h=>h<4?.2:h<6?.45:h<7?.8:h<10?1.15:h<17?1:h<20?1.1:h<22?.7:.45;
 function name(r,region){return r.name||(r.k==='x'?(r.toll?'首都高速道路':'高速道路'):(r.k==='n'?'国道':'都道')+(region?'（'+region.name+'）':''))}
 // Vehicle mix: [key, share, occupants]. Night shifts toward trucks and taxis; route buses stop around midnight.
 function mix(k,h,we,central){let night=h>=22||h<5,day=h>=7&&h<19,rush=!we&&(h>=7&&h<9.5||h>=17&&h<19.5);
  let car=k==='x'?.45:.45,truck=k==='x'?.22:.15,trailer=k==='x'?.08:k==='n'?.02:.01,taxi=k==='x'?.06:central?.22:.12,bus=k==='x'?.03:.05,delivery=k==='x'?.05:.12,dump=k==='x'?0:!we&&day?.03:0;
  if(night){truck*=2;trailer*=2.5;taxi*=central?1.8:1.2;car*=.6;delivery*=h<5||h>=21?.1:.5;bus*=k==='x'?1:h>=0.5&&h<5?0:.3}
  if(we){truck*=.5;trailer*=.4;car*=1.3}
  let busLoad=k==='x'?20:rush?32:h>=22||h<6?6:14,carLoad=we?1.8:night?1.15:1.3,taxiLoad=night?.75:.6;
  return [['car',car,carLoad],['truck',truck,1.05],['trailer',trailer,1],['taxi',taxi,1+taxiLoad],['bus',bus,1+busLoad],['delivery',delivery,1],['dump',dump,1]]}
 const ROLE={car:[['car_driver','自家用車の運転者',18,85,.3,1],['car_passenger','自家用車の同乗者',0,89,.55,0]],
  truck:[['truck_driver','トラック運転手',22,69,.03,1]],trailer:[['trailer_driver','トレーラー運転手',25,69,.02,1]],delivery:[['delivery_driver','宅配ドライバー',20,65,.1,1]],dump:[['dump_driver','ダンプカーの運転手',25,69,.02,1]],
  taxi:[['taxi_driver','タクシー運転手',28,79,.05,1],['taxi_passenger','タクシーの乗客',18,89,.45,0]],
  bus:[['bus_driver','路線バスの運転手',25,65,.05,1],['bus_passenger','バスの乗客',6,89,.55,0]]};
 // Length of each road inside the circle, sampled every ~10 m.
 function lengths(p,r){let out=new Map(),sx=111195*Math.cos(p[1]*Math.PI/180);for(let road of index?index.query(S.box(p,r)):[]){let len=0,inside=null;for(let i=1;i<road.pts.length;i++){let a=road.pts[i-1],b=road.pts[i],d=Math.hypot((b[0]-a[0])*sx,(b[1]-a[1])*111195),n=Math.max(1,Math.ceil(d/10));for(let j=0;j<n;j++){let u=(j+.5)/n,q=[a[0]+(b[0]-a[0])*u,a[1]+(b[1]-a[1])*u];if(M.distance(p,q)<=r){len+=d/n;inside=inside||q}}}if(len>0){let key=road.k+'/'+name(road),g=out.get(key)||{road,len:0,at:inside};g.len+=len;out.set(key,g)}}return [...out.values()]}
 function rows(profile,t){if(!index&&typeof MAP_DATA!=='undefined')configure(MAP_DATA);if(!index||!roads.length)return [];let h=t.hf??t.h,we=t.dow===0||t.dow===6||!!t.holiday,regions=profile.context?.data?.regions||(typeof MAP_DATA!=='undefined'?MAP_DATA.regions:[]),out=[];
  for(let {road,len,at} of lengths(profile.point,profile.radius)){let region=M.locate(at,regions)||profile.parts?.[0]?.region;if(!region)continue;let central=CENTRAL.has(region.id),vehicles=len/1000*BASE[road.k]*hourly(h)*(we?.88:1),comp={id:road.id,name:name(road,region),type:'road',subtype:road.k,region,toll:!!road.toll,source:'国土地理院 道路中心線（ベクトルタイル）',precision:'line'};
   for(let [kind,share,load] of mix(road.k,h,we,central)){if(share<=0)continue;let v=vehicles*share;for(let [key,label,min,max,female,driver] of ROLE[kind]){let n=driver?v:v*(load-1);if(n<=0)continue;let lab=kind==='bus'&&road.k==='x'?(driver?'高速バスの運転手':'高速バスの乗客'):label;out.push({role:'road_'+key,label:lab,n,w:n,min,max,female,roadWorker:!!driver&&kind!=='car',roadKind:kind,driver:!!driver,road:comp,region,landType:'road',subtype:road.k,evidence:comp.source,precision:'line',landComponent:comp})}}}
  return out}
 const pick=a=>a[Math.floor(rnd()*a.length)];
 const JOB={truck_driver:'トラック運転手',trailer_driver:'トラック運転手',delivery_driver:'宅配ドライバー',dump_driver:'ダンプカーの運転手',taxi_driver:'タクシー運転手',bus_driver:'路線バスの運転手'};
 function assign(c,P){if(!c.role.startsWith('road_'))return false;if(JOB[c.role.slice(5)]){let job=JOB_OBJS.find(j=>j.n===JOB[c.role.slice(5)]);P.occ={label:c.role==='road_trailer_driver'?'トレーラー運転手':c.label==='高速バスの運転手'?'高速バスの運転手':job?.n||c.label,group:'adult',cat:job?.cat||'運搬清掃',tag:job?.tag,job,kind:'employed',p:1};return true}
  if(['facility','prison'].includes(P.occ.group))P.occ={label:'無職',group:P.age>=65?'senior':'adult',cat:'none',p:1};return true}
 const T={
  car_driver:{x:['首都高の合流で、ウインカーを出して入るタイミングを計っているところでした','渋滞の高速道路で、カーナビの到着予想時刻が延びていくのを見ているところでした','カーブの続く高架の道路で、前の車との距離を保っているところでした'],
   road:['信号待ちの間に、カーナビの目的地を確かめているところでした','幹線道路の渋滞で、ブレーキを踏んだり離したりしているところでした','右折待ちの列で、対向車が途切れるのを待っているところでした'],
   night:['深夜の空いた道路を、制限速度を守って走っているところでした','眠気覚ましに窓を少し開け、冷たい風を入れたところでした'],
   we:['週末の買い出しに向かう車で、駐車場の混み具合を気にしているところでした','家族を乗せて、行楽地へ向かう道を走っているところでした']},
  car_passenger:{kid:['後部座席のチャイルドシートで、窓の外のトラックを数えているところでした','車の中で、着いたら何をするか家族に話しているところでした'],
   adult:['助手席で、カーナビの目的地を入れ直しているところでした','車の後部座席で、うとうとしかけているところでした','助手席で、運転する家族にお茶のボトルを手渡したところでした']},
  truck_driver:{day:['荷物を積んだトラックで、次の納品先までの道を確かめているところでした','荷台を気にしながら、狭い交差点を大きく曲がっているところでした'],night:['深夜の幹線道路を、明け方の納品に向けて走っているところでした','運行記録計を気にしながら、休憩をとる場所を考えているところでした'],x:['高速道路を走りながら、次のパーキングエリアで休むか考えているところでした']},
  trailer_driver:['海上コンテナを積んだトレーラーで、港へ向かう道を走っているところでした','長い車体を気にしながら、交差点を大きく回り込んでいるところでした','トレーラーの運転席から、ミラーで後輪の位置を確かめたところでした'],
  delivery_driver:['宅配の車を路肩に止め、荷台から次の荷物を探しているところでした','時間指定の配達に間に合うよう、信号待ちで次の住所を確かめているところでした'],
  dump_driver:['工事現場へ向かうダンプカーで、荷台の土砂にかけたシートを気にしているところでした','ダンプカーで、現場の入口に誘導されるのを待っているところでした'],
  taxi_driver:{day:['後部座席の客に行き先を確かめ、メーターを入れたところでした','空車の表示で、手を挙げる人がいないか歩道を見ながら走っているところでした','配車アプリの呼び出しに応え、迎えの場所へ向かっているところでした'],night:['終電後の繁華街で、長距離の客を乗せて走り出したところでした','深夜の幹線道路で、配車の呼び出しに応えたところでした','酔った客に、着いたら起こしますと声をかけたところでした']},
  taxi_passenger:{day:['打ち合わせに急ぐタクシーの後部座席で、資料を読み返しているところでした','タクシーの運転手に、到着までの時間を尋ねたところでした','病院へ向かうタクシーで、診察券を財布から出しておいたところでした','大きな買い物袋を抱えて、タクシーの後部座席に乗り込んだところでした'],night:['終電を逃し、タクシーの後部座席で料金メーターを見ないようにしているところでした','飲み会の帰りのタクシーで、うとうとしかけているところでした']},
  bus_driver:{road:['停留所に止まり、降りる客に「ありがとうございました」と声をかけたところでした','バス停で車体を傾け、乗り込む高齢の乗客を待っているところでした','渋滞で遅れが出た路線バスで、次の停留所の案内を流したところでした'],x:['高速バスの運転席で、次の休憩地点までの残り時間を確かめているところでした','空港へ向かうリムジンバスで、首都高の渋滞情報に耳を傾けているところでした'],night:['夜行バスの運転席で、交代の時間まで集中して走っているところでした']},
  bus_passenger:{road:['路線バスのいちばん後ろの席で、次の停留所の案内を聞いているところでした','降車ボタンを押そうとして、ほかの客に先に押されたところでした','混み合うバスの車内で、つり革につかまって揺れに耐えているところでした'],x:['空港行きのリムジンバスで、搭乗時刻をもう一度確かめているところでした','高速バスの窓際の席で、首都高から見えるビル群を眺めているところでした'],night:['夜行バスに乗り込み、リクライニングの角度を調整しているところでした']}};
 function apply(c,P,t){if(!c.role.startsWith('road_'))return false;let h=t.hf??t.h,night=h>=22||h<5,x=c.subtype==='x',we=t.dow===0||t.dow===6||!!t.holiday,k=c.role.slice(5),s=T[k],text;
  if(k==='car_driver')text=pick(night?s.night:x?s.x:we&&h>=9&&h<18&&rnd()<.5?s.we:s.road);
  else if(k==='car_passenger')text=pick(P.age<10?s.kid:s.adult);
  else if(k==='truck_driver')text=pick(x&&rnd()<.4?s.x:night?s.night:s.day);
  else if(k==='taxi_driver'||k==='taxi_passenger')text=pick(night?s.night:s.day);
  else if(k==='bus_driver'||k==='bus_passenger')text=pick(x?(night?s.night:s.x):s.road);
  else text=pick(s);
  let label=c.driver?c.label+'（'+c.road.name+'）':c.label+'（'+c.road.name+'）';
  P.mapSituation=text;P.visitLabel=label;P.sit={...P.sit,text,state:c.roadWorker?'work':'commute',stateLabel:c.driver?'運転中':'移動中',p:1,source:'road'};return true}
 return {configure,rows,assign,apply,lengths,name,mix};
})();
if(typeof module!=='undefined')module.exports=RoadModel;
