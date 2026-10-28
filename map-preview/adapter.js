// Reuse existing demographic, occupation, name, hobby and household generators.
function mapPerson(c,t){
 const f=c.region,pref=PREFS.find(p=>p.code.slice(0,2)===f.id.slice(0,2));
 const muni=pref.munis.find(m=>m.code===f.id)||pref.munis.find(m=>f.name.startsWith(m.n))||{n:f.name,code:f.id};
 let sa=c.resident?LandEstimator.sampleResident(c,t,()=>pickSexAge(null,pref,'metro',f.id),rnd):pickSexAge(null,pref,'metro',f.id);if(c.role!=='general')sa={age:PersonContext.age(c,rnd),sex:rnd()<c.female?'f':'m'};
 const bandAge=()=>{let total=c.ageBands.reduce((s,b)=>s+b[2],0),v=rnd()*total,b=c.ageBands.find(b=>(v-=b[2])<0)||c.ageBands.at(-1);return b[0]+Math.floor(rnd()*(b[1]-b[0]+1))};
 if(c.ageBands)sa.age=bandAge();
 // During class hours most domestic pupils are at school; keep about one in ten of those drawn elsewhere.
 if(!c.resident&&!c.custody&&!['general','student','area_student','resident','patient','area_inbound'].includes(c.role)&&PersonContext.schoolTime(t))for(let i=0;i<32;i++){let g=gradeIndex(birthOf(sa.age,t),t);if(g<1||g>12||rnd()<.1)break;sa.age=c.ageBands?bandAge():PersonContext.age(c,rnd)}
 const P={pref,muni,censusCode:f.id,ward:null,urb:urbOf(pref,muni),age:sa.age,sex:sa.sex,t};P.birth=birthOf(P.age,t);P.g=gradeIndex(P.birth,t);
 const stage=c.facility?.kind;
 if(c.role==='student'||c.role==='area_student'){let bounds=c.role==='area_student'?[13,21]:{primary:[1,6],middle:[7,9],high:[10,12],university:[13,21],college:[13,21],kindergarten:[-2,0]}[stage];for(let i=0;bounds&&(P.g<bounds[0]||P.g>bounds[1])&&i<64;i++){P.age=c.min+Math.floor(rnd()*(c.max-c.min+1));P.birth=birthOf(P.age,t);P.g=gradeIndex(P.birth,t);}}
 P.occ=occupation(P,t);
 if(c.role==='resident')P.occ={label:'無職（高齢者施設で暮らしている）',group:'facility',cat:'facility',p:1};
 if(c.role==='student'){
  if(['university','college'].includes(stage)){if(!(P.occ.group==='college'&&(stage==='university'?(!P.occ.senmon&&!/^短期/.test(P.occ.label)):(/短期/.test(c.facility.name)?/^短期/.test(P.occ.label):!!P.occ.senmon)))){let y=P.g-12,k=stage==='college'?(/短期/.test(c.facility.name)?'tan':'sen'):y>=5?'grad':'univ';P.occ=OriginalStudent.college(k,k==='tan'?Math.max(1,Math.min(2,y)):k==='sen'?Math.max(1,Math.min(3,y)):Math.max(1,y));}}
  else if(stage==='primary'||['middle','high'].includes(stage)){/* occupation() already uses the original school-year labels for the corrected birth cohort. */if(!P.occ.school){for(let i=0;i<32&&!P.occ.school;i++)P.occ=occupation(P,t);}
   // The school dataset lists ordinary full-time schools only, so pupils drawn there are not 通信制, 高専 or 特別支援学校 students.
   // It has no founder, so a random 私立 prefix could contradict the named school; the school name is shown instead.
   if(stage==='high'&&P.occ.school)P.occ={...P.occ,label:'高校'+(P.g-9)+'年生',tsushin:false};
   if(stage==='middle'&&P.occ.school)P.occ={...P.occ,label:'中学'+(P.g-6)+'年生'};}
  else if(stage==='kindergarten'&&!P.occ.en){for(let i=0;i<32&&!P.occ.en;i++)P.occ=occupation(P,t);}
 }
 if(['care','nurse','doctor','teacher'].includes(c.role)){let tag={care:'care',nurse:'nurse',doctor:'doctor',teacher:'teacher'}[c.role],job=JOB_OBJS.find(j=>j.tag===tag)||JOB_OBJS.find(j=>j.n.includes(c.label));P.occ={label:c.label,group:'adult',cat:job?.cat||'prof',tag:job?.tag||tag,job,p:1}}
 if(c.role==='general'&&['facility','prison'].includes(P.occ.group))P.occ={label:'無職',group:'senior',cat:'none',p:1};
 if(c.role==='area_student'&&P.occ.group!=='college'){for(let i=0;i<64&&P.occ.group!=='college';i++)P.occ=occupation(P,t);if(P.occ.group!=='college'){let y=Math.max(1,P.g-12);P.occ=OriginalStudent.college(y>=5?'grad':'univ',y);}}
 if(c.role==='area_office'){let jobs=JOB_OBJS.filter(j=>['office','it'].includes(j.tag)&&P.age>=(j.o.amin||22));let job=jobs[Math.floor(rnd()*jobs.length)];P.occ={label:job.n,group:'adult',cat:job.cat,tag:job.tag,job,p:1};}
 if(c.area&&['facility','prison'].includes(P.occ.group))P.occ={label:'無職',group:P.age>=65?'senior':'adult',cat:'none',p:1};
 UrbanContext.assign(c,P);
 SpecialFacilities.assign(c,P);
 BroadcastModel.assign(c,P);
 // Factory and warehouse workers take a concrete original-engine job (溶接工, 倉庫のピッキングスタッフ, ...).
 if(c.role==='mesh_factory'||c.role==='mesh_logistics'){let tag=c.role==='mesh_factory'?'factory':'warehouse',jobs=JOB_OBJS.filter(j=>j.tag===tag&&j.cat!=='管理'&&P.age>=(j.o.amin||18)),job=jobs[Math.floor(rnd()*jobs.length)];P.occ=job?{label:job.n,group:'adult',cat:job.cat,tag:job.tag,job,kind:'employed',p:1}:{label:c.label,group:'adult',cat:'special',kind:'employed',p:1};}
 if(c.role==='mesh_security')P.occ={label:c.label,group:'adult',cat:'special',kind:'employed',p:1};
 LandModel.assign(c,P);
 GreenModel.assign(c,P);
 Nightlife.assign(c,P);
 if(typeof VenueModel!=='undefined')VenueModel.assign(c,P);
 if(typeof PlacesModel!=='undefined')PlacesModel.assign(c,P);
 if(typeof PoliceModel!=='undefined')PoliceModel.assign(c,P);
 if(typeof CivicModel!=='undefined')CivicModel.assign(c,P);
 if(c.custody){P.household={label:'施設等の世帯（一般世帯統計の対象外）',marital:'未抽選',code:null};P.hobbies=[];}else assignProfiles(P);makeFamilyContext(P);P.surname=pickSurname(pref.n);P.given=pickGiven(P.birth.y,P.sex);
 // Condition health on actually being at the sampled workplace or outside, without erasing leave status.
 const activeWork=c.role.endsWith('_worker')||c.role.startsWith('media_')||c.venueWorker||c.civicWorker&&!c.custody||c.placeWorker||c.policeWorker||['area_office','teacher','doctor','nurse','care','mesh_factory','mesh_logistics','mesh_security'].includes(c.role)||c.role.startsWith('urban_')&&c.role!=='urban_visit'||c.role.startsWith('special_')&&!['special_passenger','special_theme_guest','special_theme_child'].includes(c.role)||c.role.startsWith('green_')&&!['green_walk','green_tourist','green_run'].includes(c.role)||c.role.startsWith('land_')&&!['land_passenger','land_grave','land_hike'].includes(c.role);
 const outside=c.role!=='general'&&!['resident','patient'].includes(c.role)&&!c.custody;
 for(let i=0;i<64;i++){P.hb=healthBase(P,t);if(!(activeWork&&P.hb.leave)&&!(outside&&P.hb.bed))break;if(i===63)throw Error('勤務・健康状態の抽選に失敗しました');}
 if(typeof linkFamilyHealth==='function')linkFamilyHealth(P);
 const pickSituation=()=>Nightlife.handles(c)?Nightlife.choose(c,P,t):situation(P,t);P.sit=pickSituation();
 for(let i=0;i<32&&PersonContext.away(P.sit.text,c);i++)P.sit=pickSituation();
 // Keep at-home samples from inheriting distant recreational venues from the national pool.
 if(c.resident&&!TimeSituations.homeCompatible(P.sit.text)){
  for(let i=0;i<32&&!TimeSituations.homeCompatible(P.sit.text);i++)P.sit=situation(P,t);
  if(!TimeSituations.homeCompatible(P.sit.text))P.sit={text:'自宅で、ひと息ついているところでした',state:'off',stateLabel:'自宅で過ごしている',p:1};
 }
 const originalSituation=P.sit;
 P.mapSituation=P.sit.text;
 GreenModel.apply(c,P);
 LandModel.apply(c,P);
 if(c.area){
  P.visitLabel=c.label;
  if(Subculture.apply(c,P)){}
  else if(Nightlife.handles(c)){P.mapSituation=P.sit.text;P.visitLabel=P.sit.stateLabel;}
  // Market and shopping streets (アメ横, 築地場外, ...) only show shopping or sightseeing, never an unrelated everyday scene.
  else if(['area_tourist','area_inbound'].includes(c.role)||c.role==='area_shopping'&&c.area.visitOnly)P.mapSituation=VisitorSituations.text(c,P,t,rnd);
  else {
   // Retain swapsim text while excluding sleeping/home scenes for people drawn as visitors.
   const ok=()=>c.role==='area_office'?['work','commute'].includes(P.sit.state):['off','commute','school'].includes(P.sit.state)&&/店|街|駅|カフェ|買い物|買い|歩|待ち合わせ|友人|友達|飲食|居酒屋/.test(P.sit.text)&&! /自宅|家で|部屋|眠|寝|授業/.test(P.sit.text);
   for(let i=0;i<12&&!ok();i++)P.sit=situation(P,t);
   P.mapSituation=ok()?P.sit.text:VisitorSituations.text({...c,role:'area_shopping'},P,t,rnd);
  }
  if(c.role==='area_inbound'){
   let markets=MAP_DATA.inbound.markets,total=markets.reduce((s,x)=>s+x.weight,0),v=rnd()*total,market=markets.find(x=>(v-=x.weight)<0)||markets.at(-1);
   P.isInbound=true;P.originMarket=market.name;let nm=PersonContext.foreignName(market.name,P.sex,rnd);P.surname={k:nm.surname,r:nm.surname,c:100};P.given={k:nm.given,r:nm.given,p:.01,era:{cov:1}};P.nameApproximate=nm.approximated;if(['facility','prison'].includes(P.occ.group))P.occ={label:'職業不詳',group:'visitor',cat:'visitor',p:1};
   // Visitors from abroad do not live in Japan, so domestic occupations and school grades do not apply.
   P.occ={label:'観光客',group:'visitor',cat:'visitor',kind:'visitor',p:1};
   P.visitLabel='外国人観光客／国・地域：'+market.name;
  }
  if(!Nightlife.handles(c)&&P.mapSituation!==P.sit.text)P.sit={...P.sit,text:P.mapSituation,state:c.role==='area_office'?'work':'off',stateLabel:c.label};
  const local=VisitorSituations.local(c,P,t,rnd);if(local){P.mapSituation=local;P.sit={...P.sit,text:local,state:'off',stateLabel:c.label,source:'area-scene'};}
 }

 // Residential occupants are present at home/in the neighborhood, not at an off-site workplace.
 if(c.resident&&['work','commute','school'].includes(P.sit.state)){
  // A resident drawn at home cannot simultaneously be at a workplace or school.
  let h=t.hf??t.h,pool=MAP_DATA.timeSituations[h<6||h>=23?'home_sleep':h<10?'worker_off_morning':h<16?'worker_off_day':h<19?'worker_off_evening':'worker_off_night'];
  let text=pool[Math.floor(rnd()*pool.length)];P.sit={text,state:h<6||h>=23?'sleep':'off',stateLabel:'自宅で過ごしている',p:1};P.mapSituation=text;
 }
 TimeSituations.apply(c,P,t);
 SpecialFacilities.apply(c,P,t);
 if(c.role==='special_passenger'){let trip=PersonContext.station(P,t,originalSituation);if(trip){P.visitLabel=trip.label;P.sit={...P.sit,text:trip.text,state:'commute',stateLabel:trip.label};P.mapSituation=trip.text;}}
 UrbanContext.apply(c,P,t);
 if(c.resident&&P.occ.group==='adult'&&P.occ.cat!=='none'&&t.dow>0&&t.dow<6&&!t.holiday&&t.h>=9&&t.h<17&&P.sit.state==='off'&&!P.hb.bed&&!P.hb.leave){
  // Explain a weekday at home only sometimes and in varied words; scenes that already say why are left alone.
  let shift=['medical','care','retail','food','transport','security','factory','clean','hotel'].includes(P.occ.tag),h=t.hf??t.h,prefix=null;
  if(!/休み|休日|在宅|有給|夜勤|非番|代休|夢の中|眠|寝/.test(P.sit.text)&&rnd()<.15)prefix=['office','it'].includes(P.occ.tag)&&rnd()<.5?'在宅勤務の昼休みに、':shift?(h<13&&rnd()<.5?'夜勤明けで、':'シフトが休みの日で、'):['有給休暇をとった日で、','代休の日で、','今日は休みで、','平日の休みを使って、'][Math.floor(rnd()*4)];
  if(prefix){P.sit={...P.sit,text:prefix+P.sit.text};P.mapSituation=P.sit.text;}}
 if(typeof VenueModel!=='undefined')VenueModel.apply(c,P,t);
 if(typeof CivicModel!=='undefined')CivicModel.apply(c,P,t);
 if(typeof PlacesModel!=='undefined')PlacesModel.apply(c,P,t);
 if(typeof PoliceModel!=='undefined')PoliceModel.apply(c,P,t);
 if(typeof EnvironmentScenes!=='undefined')EnvironmentScenes.apply(c,P,t);
 // Later map modules reuse original pools too; never leave the person somewhere other than the drawn spot.
 if(PersonContext.away(P.sit.text,c)){for(let i=0;i<32&&PersonContext.away(P.sit.text,c);i++)P.sit=situation(P,t);if(PersonContext.away(P.sit.text,c))P.sit={text:c.resident?'自宅で、ひと息ついているところでした':'近くを歩きながら、次に行く場所を考えているところでした',state:'off',stateLabel:c.label,p:1};P.mapSituation=P.sit.text}
 if(P.occ.job?.n==='MR（医薬情報担当者）')P.occ.label=P.occ.label.replace('MR（医薬情報担当者）','MR');
 P.health=settleHealth(P,t);if(c.role==='venue_ghost'){P.hb.preg=false;P.health={text:'幽霊のため健康状態は不明',items:[],p:1,note:'お遊び要素'};}P.body=bodyOf(P,t);
 P.place=(c.facility?.name||c.landComponent?.name||c.zone?.name||c.area?.name||f.name);P.placeShort=P.place;
 P.wxText=wxLabel(P.pref,t)+(t.rand||typeof MapWeather==='undefined'||MapWeather.status()!=='東京の実況'?'（推定）':'');
 P.logp=Math.log10(Math.max(1e-12,P.surname.c/12300))+Math.log10(Math.max(1e-12,P.given.p*P.given.era.cov))+Math.log10(Math.max(1e-12,c.roleP||P.occ.p||1))+Math.log10(Math.max(1e-12,P.sit.p||1))-SIT_MED[t.h%24];
 P.stars=RARITY.findIndex(th=>P.logp>th)+1||5;
 return P;
}

