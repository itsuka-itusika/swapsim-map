// The notice shows the hobby right above the scene, so a scene of a distinctive pastime (将棋, 編み物, 楽器 ...) needs that
// hobby; the original only lowers such scenes to 0.65. Everyday activities (reading, cooking, films) are left as they are.
const MAP_STRICT_HOBBY=[[/囲碁/,28],[/将棋/,29],[/編み物|手芸|刺しゅう/,18],[/ギター|ピアノ|楽器|バイオリン|ウクレレ/,8],[/キャンプ/,33],[/盆栽/,20],[/書道|筆を/,14],[/茶道|お点前/,16],[/華道|生け花/,15],[/陶芸|ろくろ/,23],[/日本舞踊/,12],[/俳句/,25]];
// It filters entries (not weights): the original picks an activity class first, so a zero weight could not stop a class
// whose only line is that pastime.
if(typeof entryOK==='function'){const original=entryOK;entryOK=function(e,ctx){if(!original(e,ctx))return false;const P=ctx?.P,text=typeof e==='string'?e:e?.[2];if(!P||typeof text!=='string')return true;const hit=MAP_STRICT_HOBBY.find(([re])=>re.test(text));if(hit&&!(P.hobbies||[]).some(x=>x.i===hit[1]))return false;
 // Scenes that show an injury (crutches, a cast) give the person that injury; most draws skip them to keep it rare.
 return !(/松葉杖|ギプス|ぎっくり腰/.test(text)&&rnd()<.75)}}
// Visitors from abroad: a foreign name and origin, and no domestic occupation or school grade.
function makeInbound(P){
 let markets=MAP_DATA.inbound.markets,total=markets.reduce((s,x)=>s+x.weight,0),v=rnd()*total,market=markets.find(x=>(v-=x.weight)<0)||markets.at(-1);
 P.isInbound=true;P.originMarket=market.name;let nm=PersonContext.foreignName(market.name,P.sex,rnd);P.surname={k:nm.surname,r:nm.surname,c:100};P.given={k:nm.given,r:nm.given,p:.01,era:{cov:1}};P.nameApproximate=nm.approximated;
 P.occ={label:'観光客',group:'visitor',cat:'visitor',kind:'visitor',p:1};
 P.visitLabel='外国人観光客／国・地域：'+market.name;
 // Visitors from abroad get a mild, travel-friendly hobby table instead of the domestic survey (game assumption).
 const H=[['旅行',(a)=>4],['写真撮影',(a)=>3],['食べ歩き',(a)=>3],['ショッピング',(a)=>a<60?2.5:1.5],['街歩き',(a)=>2],['カフェ巡り',(a)=>a<45?2:.8],['美術館巡り',(a)=>a>=30?1.5:.8],['音楽鑑賞',(a)=>1.5],['映画鑑賞',(a)=>1.5],['読書',(a)=>1.2],['料理',(a)=>a>=25?1.2:.5],['アニメ・マンガ',(a)=>a<40?2:.3],['ゲーム',(a)=>a<35?1.5:.3],['ハイキング',(a)=>a>=25?1:.5],['ランニング',(a)=>a>=20&&a<60?1:.3],['ヨガ',(a)=>a>=20&&a<60?.8:.3],['サッカー観戦',(a)=>a<60?.8:.4],['ガーデニング',(a)=>a>=50?1:.1],['温泉巡り',(a)=>a>=30?.8:.4]];
 let pickH=list=>{let w=list.map(([n,f])=>f(P.age)),v=rnd()*w.reduce((x,y)=>x+y,0);return list[w.findIndex(x=>(v-=x)<0)]||list[0]};
 let first=pickH(H),second=rnd()<.45?pickH(H.filter(x=>x!==first)):null;
 P.hobbies=[];P.profileDisplay={...(P.profileDisplay||{}),hobby:first[0]+(second?'、'+second[0]:'')};P.hobbyP=.1;
}
// Reuse existing demographic, occupation, name, hobby and household generators.
function mapPerson(c,t){
 const f=c.region,pref=PREFS.find(p=>p.code.slice(0,2)===f.id.slice(0,2));
 const muni=pref.munis.find(m=>m.code===f.id)||pref.munis.find(m=>f.name.startsWith(m.n))||{n:f.name,code:f.id};
 let sa=c.resident?LandEstimator.sampleResident(c,t,()=>pickSexAge(null,pref,'metro',f.id),rnd):pickSexAge(null,pref,'metro',f.id);if(c.role!=='general')sa={age:PersonContext.age(c,rnd),sex:rnd()<c.female?'f':'m'};
 const bandAge=()=>{let total=c.ageBands.reduce((s,b)=>s+b[2],0),v=rnd()*total,b=c.ageBands.find(b=>(v-=b[2])<0)||c.ageBands.at(-1);return b[0]+Math.floor(rnd()*(b[1]-b[0]+1))};
 if(c.ageBands)sa.age=bandAge();
 // Hostesses, hosts and sex workers are concentrated in their twenties; past the mid-thirties they are rare.
 // Night-district visitors, restaurant staff and customers also skew young, more so in youth-tagged districts (歌舞伎町, 渋谷, 池袋 ...).
 const youth=(c.area?.tags?.youth||0)>=3,nightBands=c.role==='area_cabaret_worker'&&sa.sex==='f'?[[20,24,10],[25,29,7],[30,34,2],[35,39,.5],[40,45,.1]]:c.role==='area_host_worker'?[[20,24,10],[25,29,6],[30,34,1.5],[35,39,.3]]:c.role==='area_adult_worker'&&sa.sex==='f'?[[20,24,8],[25,29,8],[30,34,3.5],[35,39,1.2],[40,49,.3]]
  :c.role==='area_adult_worker'||c.role==='area_cabaret_worker'?[[20,24,24],[25,29,18],[30,34,13],[35,39,10],[40,44,9],[45,49,8],[50,54,7],[55,59,6]]
  :c.role==='area_night_worker'?[[20,24,24],[25,29,18],[30,34,13],[35,39,10],[40,44,9],[45,49,8],[50,54,7],[55,59,6],[60,64,5]]
  :c.role==='area_night'?(youth?[[20,24,24],[25,29,22],[30,34,16],[35,39,11],[40,44,9],[45,49,7],[50,54,5],[55,59,4],[60,64,2]]:[[20,24,15],[25,29,16],[30,34,14],[35,39,12],[40,44,11],[45,49,10],[50,54,9],[55,59,7],[60,64,6]])
  :c.role==='area_adult_customer'?(youth?[[20,24,12],[25,29,17],[30,34,16],[35,39,14],[40,44,12],[45,49,10],[50,54,8],[55,59,6],[60,69,5]]:[[20,24,9],[25,29,14],[30,34,15],[35,39,14],[40,44,13],[45,49,12],[50,54,10],[55,59,7],[60,69,6]]):null;
 // Late at night in youth districts (渋谷, 新宿, 池袋 ...) people out on the street skew young; hotel guests, staff and drivers keep their own mix.
 if(!nightBands&&youth&&!c.resident&&((t.hf??t.h)>=21||(t.hf??t.h)<5)){if(['general','area_shopping','area_tourist','urban_visit','rail_passenger','special_passenger','special_station','area_inbound'].includes(c.role)&&rnd()<.45){let b=[[18,24,30],[25,29,26],[30,34,18],[35,39,11],[40,49,10]],v=rnd()*95,x=b.find(q=>(v-=q[2])<0)||b[0];sa.age=x[0]+Math.floor(rnd()*(x[1]-x[0]+1))}}
 if(nightBands){let v=rnd()*nightBands.reduce((s,b)=>s+b[2],0),b=nightBands.find(b=>(v-=b[2])<0)||nightBands[0];sa.age=b[0]+Math.floor(rnd()*(b[1]-b[0]+1))}
 // Jobs and visitor groups whose age profile differs clearly from the resident population (approximate national statistics).
 else if(!c.ageBands&&c.role!=='general'){if(/^place_hotel_/.test(c.role)){let xy=c.landComponent?.sampleXY||c.landComponent?.xy;c.youthArea=!!xy&&(MAP_DATA.areas||[]).some(a=>(a.tags?.youth||0)>=3&&a.xy&&MapModel.distance(xy,a.xy)<=(a.radius||300))}let bands=PersonContext.roleBands(c);if(bands){bands=bands.map(([a,b,w])=>[Math.max(a,c.min??0),Math.min(b,c.max??99),w]).filter(b=>b[0]<=b[1]);if(bands.length){let v=rnd()*bands.reduce((s,b)=>s+b[2],0),b=bands.find(b=>(v-=b[2])<0)||bands[0];sa.age=b[0]+Math.floor(rnd()*(b[1]-b[0]+1))}}}
 // During class hours most domestic pupils are at school; keep about one in ten of those drawn elsewhere.
 if(!c.resident&&!c.custody&&!c.hospCase&&!c.schoolTrip&&!['general','student','area_student','resident','patient','area_inbound','exam_taker'].includes(c.role)&&PersonContext.schoolTime(t))for(let i=0;i<32;i++){let g=gradeIndex(birthOf(sa.age,t),t);if(g<1||g>12||rnd()<.1)break;sa.age=c.ageBands?bandAge():PersonContext.age(c,rnd)}
 const P={pref,muni,censusCode:f.id,ward:null,urb:urbOf(pref,muni),age:sa.age,sex:sa.sex,t};P.birth=birthOf(P.age,t);P.g=gradeIndex(P.birth,t);
 const stage=c.facility?.kind;
 // Exam takers are drawn in the grade that sits the exam (高3・浪人, 中3, 小6).
 if(c.role==='exam_taker'){let gs=ExamSchedule.grades[c.exam.who],v=rnd(),target=(gs.find(g=>(v-=g[1])<0)||gs[0])[0];for(let i=0;i<64&&P.g!==target;i++){P.age=c.min+Math.floor(rnd()*(c.max-c.min+1));P.birth=birthOf(P.age,t);P.g=gradeIndex(P.birth,t);}}
 if(c.role==='student'||c.role==='area_student'){let bounds=c.role==='area_student'?[13,21]:{primary:[1,6],middle:[7,9],high:[10,12],university:[13,21],college:[13,21],kindergarten:[-2,0]}[stage];for(let i=0;bounds&&(P.g<bounds[0]||P.g>bounds[1])&&i<64;i++){P.age=c.min+Math.floor(rnd()*(c.max-c.min+1));P.birth=birthOf(P.age,t);P.g=gradeIndex(P.birth,t);}}
 P.occ=occupation(P,t);
 if(c.role==='resident')P.occ={label:'無職（高齢者施設で暮らしている）',group:'facility',cat:'facility',p:1};
 if(c.role==='exam_taker'){if(P.g>=13)P.occ={label:'浪人生',group:'student',ronin:true,kindLabel:'所属',p:1,cat:'student'};else for(let i=0;i<32&&(!P.occ.school||/高専/.test(P.occ.label));i++)P.occ=occupation(P,t);}
 if(c.role==='exam_parent'&&['student','college','kid','baby','facility','prison'].includes(P.occ.group))P.occ={label:'会社員',group:'adult',cat:'事務',p:1};
 if(c.role==='student'){
  if(['university','college'].includes(stage)){if(!(P.occ.group==='college'&&(stage==='university'?(!P.occ.senmon&&!/^短期/.test(P.occ.label)):(/短期/.test(c.facility.name)?/^短期/.test(P.occ.label):!!P.occ.senmon)))){let y=P.g-12,k=stage==='college'?(/短期/.test(c.facility.name)?'tan':'sen'):y>=5?'grad':'univ';P.occ=OriginalStudent.college(k,k==='tan'?Math.max(1,Math.min(2,y)):k==='sen'?Math.max(1,Math.min(3,y)):Math.max(1,y));}}
  else if(stage==='primary'||['middle','high'].includes(stage)){/* occupation() already uses the original school-year labels for the corrected birth cohort. */if(!P.occ.school){for(let i=0;i<32&&!P.occ.school;i++)P.occ=occupation(P,t);}
   // The school dataset lists ordinary full-time schools only, so pupils drawn there are not 通信制, 高専 or 特別支援学校 students.
   // It has no founder, so a random 私立 prefix could contradict the named school; the school name is shown instead.
   if(stage==='high'&&P.occ.school)P.occ={...P.occ,label:'高校'+(P.g-9)+'年生',tsushin:false};
   if(stage==='middle'&&P.occ.school)P.occ={...P.occ,label:'中学'+(P.g-6)+'年生'};}
  else if(stage==='kindergarten'){if(!P.occ.en){for(let i=0;i<32&&!P.occ.en;i++)P.occ=occupation(P,t);}
   // A child drawn at a 幼稚園 attends that 幼稚園, not a randomly chosen 保育園 or こども園.
   let type=/保育園/.test(c.facility.name)?'保育園':/こども園|子ども園|子供園/.test(c.facility.name)?'認定こども園':'幼稚園',cls=P.occ.label.match(/(年少|年中|年長)さん/);if(cls)P.occ={...P.occ,label:type+'の'+cls[0],en:type==='幼稚園'?'yochi':'hoiku',nur:true};}
 }
 if(['care','nurse','doctor','teacher'].includes(c.role)){let tag={care:'care',nurse:'nurse',doctor:'doctor',teacher:'teacher'}[c.role],job=JOB_OBJS.find(j=>j.tag===tag)||JOB_OBJS.find(j=>j.n.includes(c.label));P.occ={label:c.label,group:'adult',cat:job?.cat||'prof',tag:job?.tag||tag,job,p:1};
  // Teachers take the title of the school they are drawn at.
  if(c.role==='teacher'){let name=c.facility?.name||'',label={primary:'小学校の先生',middle:'中学校の先生',high:'高校の先生',university:'大学教員',college:/短期大学/.test(name)?'短期大学の教員':'専門学校の講師',kindergarten:/保育園/.test(name)?'保育士':/こども園|子ども園|子供園/.test(name)?'保育教諭':'幼稚園の先生'}[stage];if(label)P.occ.label=label;}}
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
 if(typeof LoveHotelModel!=='undefined')LoveHotelModel.assign(c,P);
 if(typeof VenueModel!=='undefined')VenueModel.assign(c,P);
 if(typeof PlacesModel!=='undefined')PlacesModel.assign(c,P);
 if(typeof RoadModel!=='undefined')RoadModel.assign(c,P);
 if(typeof RailModel!=='undefined')RailModel.assign(c,P);
 if(typeof PrepModel!=='undefined')PrepModel.assign(c,P);
 if(typeof HospitalModel!=='undefined')HospitalModel.assign(c,P);
 if(typeof PoliceModel!=='undefined')PoliceModel.assign(c,P);
 if(typeof CivicModel!=='undefined')CivicModel.assign(c,P);
 if(typeof DietModel!=='undefined')DietModel.assign(c,P);
 if(typeof AirportModel!=='undefined')AirportModel.assign(c,P);
 if(typeof PortModel!=='undefined')PortModel.assign(c,P);
 if(typeof MarketModel!=='undefined')MarketModel.assign(c,P);
 if(typeof TaxiModel!=='undefined')TaxiModel.assign(c,P);
 if(typeof CampusLife!=='undefined')CampusLife.assign(c,P);
 if(typeof UpscaleHomes!=='undefined')UpscaleHomes.assign(c,P);
 if(typeof ZooModel!=='undefined')ZooModel.assign(c,P);
 if(c.custody){P.household={label:'施設等の世帯（一般世帯統計の対象外）',marital:'未抽選',code:null};P.hobbies=[];}else assignProfiles(P);makeFamilyContext(P);P.surname=pickSurname(pref.n);P.given=pickGiven(P.birth.y,P.sex);
 // Condition health on actually being at the sampled workplace or outside, without erasing leave status.
 const activeWork=c.worker&&/^(diet|air|port|market|zoo|taxi)_/.test(c.role)||c.roadWorker||c.railWorker||c.hospStaff||['prep_teacher','prep_staff'].includes(c.role)||c.role.endsWith('_worker')||c.role.startsWith('media_')||c.venueWorker||c.civicWorker&&!c.custody||c.placeWorker||c.policeWorker||['area_office','teacher','doctor','nurse','care','mesh_factory','mesh_logistics','mesh_security'].includes(c.role)||c.role.startsWith('urban_')&&c.role!=='urban_visit'||c.role.startsWith('special_')&&!['special_passenger','special_theme_guest','special_theme_child'].includes(c.role)||c.role.startsWith('green_')&&!['green_walk','green_tourist','green_run'].includes(c.role)||c.role.startsWith('land_')&&!['land_passenger','land_grave','land_hike'].includes(c.role);
 const outside=c.role!=='general'&&!['resident','patient'].includes(c.role)&&!c.custody&&!(c.hospCase&&c.hospCase!=='check');
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
   P.mapSituation=ok()&&!(/松葉杖|ギプス|ぎっくり腰/.test(P.sit.text)&&rnd()<.65)?P.sit.text:VisitorSituations.text({...c,role:'area_shopping'},P,t,rnd);
  }
  if(c.role==='area_inbound')makeInbound(P);
  if(!Nightlife.handles(c)&&P.mapSituation!==P.sit.text)P.sit={...P.sit,text:P.mapSituation,state:c.role==='area_office'?'work':'off',stateLabel:c.label};
  const local=VisitorSituations.local(c,P,t,rnd);if(local){P.mapSituation=local;P.sit={...P.sit,text:local,state:'off',stateLabel:c.label,source:'area-scene'};}
 }

 if(c.inboundGuest)makeInbound(P);
 // Residential occupants are present at home/in the neighborhood, not at an off-site workplace.
 if(c.resident&&['work','commute','school'].includes(P.sit.state)){
  // A resident drawn at home cannot simultaneously be at a workplace or school.
  // Draw from the original at-home scenes (filtered to the home and its neighborhood) before the short supplement pool.
  let h=t.hf??t.h,student=P.age<18||['student','college','kid'].includes(P.occ.group),key=student?TimeSituations.homeStudent(P,t):h<6||h>=23?'home_sleep':h<10?'worker_off_morning':h<16?'worker_off_day':h<19?'worker_off_evening':'worker_off_night',pool=MAP_DATA.timeSituations[key];
  P.sit={...P.sit,state:'off'};let text=(rnd()<.8?TimeSituations.reuse(key,c,P,t):null)||pool[Math.floor(rnd()*pool.length)];P.sit={text,state:key==='home_sleep'?'sleep':'off',stateLabel:'自宅で過ごしている',p:1};P.mapSituation=text;
 }
 TimeSituations.apply(c,P,t);
 SpecialFacilities.apply(c,P,t);
 if(c.role==='special_passenger'){let trip=PersonContext.station(P,t,originalSituation);if(trip){P.visitLabel=trip.label;P.sit={...P.sit,text:trip.text,state:'commute',stateLabel:trip.label};P.mapSituation=trip.text;}
  // Weekday rush hours: crowded trains and transfer corridors, most often at stations served by several lines.
  let h=t.hf??t.h,weekday=t.dow>0&&t.dow<6&&!t.holiday&&!holName(t),am=h>=7&&h<9.5,pm=h>=17.5&&h<20,lines=c.facility?.lines?.length||1;
  if(weekday&&(am||pm)&&!P.hb?.leave&&!P.hb?.bed&&P.age>=12&&rnd()<(lines>=3?.75:lines>=2?.55:.35)){let student=['student','college','kid'].includes(P.occ.group),pool=MAP_DATA.specialSituations[(am?'rush_am':'rush_pm')+(student&&rnd()<.6?'_student':'')],text=pool[Math.floor(rnd()*pool.length)];if(student&&/会社/.test(text))text=pool[0];P.visitLabel=am?(student?'通学ラッシュの駅':'通勤ラッシュの駅'):'帰宅ラッシュの駅';P.sit={...P.sit,text,state:'commute',stateLabel:P.visitLabel};P.mapSituation=text}}
 UrbanContext.apply(c,P,t);
 if(c.resident&&P.occ.group==='adult'&&P.occ.cat!=='none'&&t.dow>0&&t.dow<6&&!t.holiday&&t.h>=9&&t.h<17&&P.sit.state==='off'&&!P.hb.bed&&!P.hb.leave){
  // Explain a weekday at home only sometimes and in varied words; scenes that already say why are left alone.
  let shift=['medical','care','retail','food','transport','security','factory','clean','hotel'].includes(P.occ.tag),h=t.hf??t.h,prefix=null;
  if(!/休み|休日|在宅|有給|夜勤|非番|代休|夢の中|眠|寝/.test(P.sit.text)&&rnd()<.1)prefix=['office','it'].includes(P.occ.tag)&&rnd()<.5?'在宅勤務の昼休みに、':shift?(h<13&&rnd()<.5?'夜勤明けで、':'シフトが休みの日で、'):['有給休暇をとった日で、','代休の日で、','今日は休みで、','平日の休みを使って、'][Math.floor(rnd()*4)];
  if(prefix){P.sit={...P.sit,text:prefix+P.sit.text};P.mapSituation=P.sit.text;}}
 if(typeof VenueModel!=='undefined')VenueModel.apply(c,P,t);
 if(typeof CivicModel!=='undefined')CivicModel.apply(c,P,t);
 if(typeof DietModel!=='undefined')DietModel.apply(c,P,t);
 if(typeof AirportModel!=='undefined')AirportModel.apply(c,P,t);
 if(typeof PortModel!=='undefined')PortModel.apply(c,P,t);
 if(typeof MarketModel!=='undefined')MarketModel.apply(c,P,t);
 if(typeof TaxiModel!=='undefined')TaxiModel.apply(c,P,t);
 if(typeof ZooModel!=='undefined')ZooModel.apply(c,P,t);
 if(typeof PlacesModel!=='undefined')PlacesModel.apply(c,P,t);
 if(typeof RoadModel!=='undefined')RoadModel.apply(c,P,t);
 if(typeof RailModel!=='undefined')RailModel.apply(c,P,t);
 if(typeof LoveHotelModel!=='undefined')LoveHotelModel.apply(c,P,t);
 if(typeof PrepModel!=='undefined')PrepModel.apply(c,P,t);
 if(typeof HospitalModel!=='undefined')HospitalModel.apply(c,P,t);
 if(typeof PoliceModel!=='undefined')PoliceModel.apply(c,P,t);
 if(typeof EnvironmentScenes!=='undefined')EnvironmentScenes.apply(c,P,t);
 if(typeof ExamSchedule!=='undefined')ExamSchedule.apply(c,P,t);
 if(typeof TowerHomes!=='undefined')TowerHomes.apply(c,P,t);
 if(typeof UpscaleHomes!=='undefined')UpscaleHomes.apply(c,P,t);
 if(typeof SeasonalEvents!=='undefined')SeasonalEvents.apply(c,P,t);
 if(typeof CampusLife!=='undefined')CampusLife.apply(c,P,t);
 if(typeof FamilyVisits!=='undefined')FamilyVisits.apply(c,P,t);
 if(typeof CampusVisitors!=='undefined')CampusVisitors.apply(c,P,t);
 if(typeof CrossingScenes!=='undefined')CrossingScenes.apply(c,P,t);
 if(typeof Drunks!=='undefined')Drunks.apply(c,P,t);
 if(typeof NightDuty!=='undefined')NightDuty.apply(c,P,t);
 // Later map modules reuse original pools too; never leave the person somewhere other than the drawn spot.
 // A reroll must also stay plausible for the spot: at home for residents, away from home for everyone else.
 const fits=s=>!PersonContext.away(s.text,c)&&(c.resident?TimeSituations.homeCompatible(s.text):c.role==='general'||!/自宅|家で|布団|寝室|ソファ|リビング|自分の部屋/.test(s.text));
 if(PersonContext.away(P.sit.text,c)){for(let i=0;i<32&&!fits(P.sit);i++)P.sit=situation(P,t);if(!fits(P.sit))P.sit={text:c.resident?'自宅で、ひと息ついているところでした':'近くを歩きながら、次に行く場所を考えているところでした',state:'off',stateLabel:c.label,p:1};P.mapSituation=P.sit.text}
 P.occ={...P.occ,label:JobLabels.short(P.occ.label)};
 P.health=settleHealth(P,t);if(typeof HospitalModel!=='undefined')HospitalModel.health(P,t);if(c.role==='venue_ghost'){P.hb.preg=false;P.health={text:'幽霊のため健康状態は不明',items:[],p:1,note:'お遊び要素'};}P.body=bodyOf(P,t);
 P.place=(c.facility?.name||c.landComponent?.name||c.zone?.name||c.area?.name||f.name);
 // Without a specific facility or named place, show the town and the kind of spot (西新宿 自宅, 銀座 市街地).
 if(typeof PlaceLabel!=='undefined')P.place=PlaceLabel.label(c,P,P.place);if(P.placeOverride||P.railPlace)P.place=P.placeOverride||P.railPlace;P.placeShort=P.place;
 P.wxText=wxLabel(P.pref,t)+(t.rand||typeof MapWeather==='undefined'||MapWeather.status()!=='東京の実況'?'（推定）':'');
 P.logp=Math.log10(Math.max(1e-12,P.surname.c/12300))+Math.log10(Math.max(1e-12,P.given.p*P.given.era.cov))+Math.log10(Math.max(1e-12,c.roleP||P.occ.p||1))+Math.log10(Math.max(1e-12,P.sit.p||1))-SIT_MED[t.h%24];
 P.stars=RARITY.findIndex(th=>P.logp>th)+1||5;
 return P;
}

