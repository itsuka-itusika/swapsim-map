/* Population, age/sex and occupation estimates are separate, then combined by PERSON count.
   Constants are explicit game assumptions, not measured footfall or worker rosters. */
const LandEstimator=(()=>{
 const M=typeof MapModel!=='undefined'?MapModel:require('./model.js'),S=typeof MapSpatial!=='undefined'?MapSpatial:require('./spatial.js');
 const row=(role,label,w,min=20,max=69,female=.5,extra={})=>({role,label,w,min,max,female,...extra});
 const weekend=t=>t.dow===0||t.dow===6||t.holiday;
 // Game emphasis over the census mix: fashion streets get more hairdressers and apparel staff, Akihabara maid-cafe staff.
 function styleRows(area,t,factor=1){let tag=area?.tags||{},h=t.hf??t.h,open=h>=10&&h<20?1:h>=9&&h<21?.3:0,f=tag.fashion||0,out=[];
  if(f>=1.5&&open)out.push(row('urban_hairdresser','美容師',.12*f*open*factor,20,49,.6,{jobTag:'salon',jobName:'美容師',urbanTag:'hair'}),row('urban_apparel','アパレル店員',.15*f*open*factor,18,44,.65,{jobTag:'shop',jobName:'アパレルの販売員',urbanTag:'apparel'}));
  if(area?.sources?.electronics?.name==='秋葉原'&&h>=11&&h<22)out.push(row('urban_maidcafe','メイドカフェの店員',.5*(tag.electronics||0)/4*factor,18,29,.95,{jobTag:'food',urbanTag:'maidcafe'}));return out}
 function timeFactor(type,subtype,t){let h=t.hf??t.h,we=weekend(t);if(type==='residential'||type==='mixed')return h>=9&&h<17?(we?.85:.5):h>=7&&h<21?.8:1;
 if(type==='office'||type==='public')return h>=9&&h<18?(we?.1:1):h>=7&&h<21?.2:.025;
 if(type==='education')return h>=8&&h<18?(we?.08:1):.01;
 if(type==='industrial')return h>=8&&h<18?(we?.3:1):.16;
 if(type==='commercial'&&subtype==='night')return (t.dow===5||t.dow===6?1.25:1)*(h>=18||h<3?1:h<5?.2:h>=12?.12:.025);
 if(type==='green'||type==='religious'||type==='agriculture'||type==='waterfront')return h>=7&&h<18?(we?1.35:1):h>=6&&h<22?.08:.005;
 if(type==='medical')return h>=8&&h<18?(we?.65:1):.35;
 if(type==='transport')return h>=5&&h<24?(!we&&(h>=7&&h<9||h>=17&&h<20)?1.7:1):.03;
 return h>=10&&h<21?(we?1.25:1):h>=7&&h<23?.15:.02;}
 function syntheticFacility(c){let kind=c.subtype==='school'?'primary':c.subtype==='clinic'?'hospital':c.subtype,area=c.area||c.areaM2,base={primary:300,middle:300,high:600,university:1500,college:300,kindergarten:80,hospital:120,care:60,station:350};return {...c,kind,code:c.region.id,radius:c.radius||60,sex:'unknown',capacity:Number(c.tags?.capacity)||base[kind]||350,scale:Math.max(.2,Math.min(8,area/(kind==='university'?45000:kind==='hospital'?10000:12000)))}}
 function facilityRows(c,t){let fs=c.facilities?.length?c.facilities:['education','medical','transport'].includes(c.type)&&!['airfield','terminal'].includes(c.subtype)?[syntheticFacility(c)]:null;if(!fs)return null;
 let result=[];for(let f of fs){let adjusted={...f};if(f.kind==='station'&&Number.isFinite(f.dailyPassengers))adjusted.capacity=Math.max(1,f.dailyPassengers*(f.dwellMinutes||5)/(19*60));let roles=M.roles(adjusted,t).map(z=>({...z,w:z.n*(f.scale||1),facility:f}));
 if(c.type==='education'){let h=t.hf??t.h,active=h>=8&&h<18&&!weekend(t)&&!(typeof schoolVac==='function'&&schoolVac(t));let students=roles.find(z=>z.role==='student');if(students){let vacation=typeof univVac==='function'&&['university','college'].includes(f.kind)&&univVac(t);if(vacation&&active)students.w*=.15;let ratio=students.w/(students.n||1);roles.push(row('urban_visit','保護者・学校への来訪者',Math.max(0,students.w*.025),25,74,.55,{urbanTag:'school',facility:f}),row('urban_school_admin','学校事務・管理職員',active?Math.max(2,students.w*.02):h>=7&&h<20?1:0,22,69,.5,{jobTag:'office',facility:f}));}}
 if(c.type==='medical'&&roles.length)roles.push(row('urban_visit','患者の付き添い・来訪者',roles.filter(z=>z.role==='patient').reduce((s,z)=>s+z.w,0)*((t.h>=8&&t.h<20)?.25:0),18,84,.55,{urbanTag:'medical',facility:f}),row('urban_medical_admin','医療事務職',t.h>=8&&t.h<18?12:1,22,65,.7,{jobTag:'office',facility:f}));
 if(c.subtype==='clinic'){let open=typeof OSMProfile!=='undefined'?OSMProfile.opening(c.openingHours,t):null;if(open===false||open===null&&(t.h<8||t.h>=19))roles=roles.map(z=>({...z,w:0}));}
 result.push(...roles)}return result;
 }
 function estimateOccupations(c,t){const police=typeof PoliceModel!=='undefined'?PoliceModel.roles(c,t):null;if(police)return police;const place=typeof PlacesModel!=='undefined'?PlacesModel.roles(c,t):null;if(place)return place;const civic=typeof CivicModel!=='undefined'?CivicModel.roles(c,t):null;if(civic)return civic;const venue=typeof VenueModel!=='undefined'?VenueModel.roles(c,t):null;if(venue)return venue;const facility=facilityRows(c,t);if(facility?.length)return facility;
 if(c.kind==='palace'||c.type==='green'){let z={...c,kind:c.subtype==='playground'?'park':c.subtype};let closed=typeof OSMProfile!=='undefined'&&OSMProfile.opening(c.openingHours,t)===false;return GreenModel.roles(z,t).map(z=>({...z,w:closed&&['green_walk','green_tourist','green_run'].includes(z.role)?0:z.density,zone:c}));}
 if(['airfield','terminal','cemetery'].includes(c.subtype))return LandModel.roles({...c,kind:c.subtype},t).map(z=>({...z,w:z.density,zone:c}));
 if(c.type==='waterfront'&&c.subtype==='water')return [];
 // A mixed district can contain both residents and visitors. Distinct facilities above retain their own models.
 if(c.type==='residential'||c.type==='mixed'||c.type==='office'){
  let area=c.areaTag,tag=area?.tags||{},out=c.type==='office'?[row('area_office','勤務・業務中',.9,22,64,.45),row('urban_visit','業務での来訪者',.08,22,69,.5,{urbanTag:'office'}),row('mesh_security','施設警備員',.02,22,69,.2)]:[row('general','住宅内・近隣の滞在者',1,0,99,.5,{resident:true})];
  const coeff=c.type==='office'?.08:c.type==='mixed'?.3:.08;
  for(let k of ['student','tourist','inbound',...(c.type==='mixed'?['shopping','subculture']:[])]){let strength=tag[k]||0,d=AreaModel.types[k],source=area?.sources?.[k];if(strength>0&&source&&d)out.push(row('area_'+k,d[0],strength*coeff*AreaModel.activity(k,t),d[1],d[2],k==='subculture'?(source.subcultureFemale??d[3]):k==='shopping'?(source.shoppingFemale??d[3]):d[3],{area:source}));}
  out.push(...styleRows(area,t,c.type==='mixed'?.6:c.type==='office'?.2:.25));
  return out;
 }
 if(c.type==='industrial')return [row(c.subtype==='warehouse'?'mesh_logistics':'mesh_factory',c.subtype==='warehouse'?'倉庫・物流施設で勤務中':'工場で勤務中',.7,20,69,.25),row('area_office','管理・事務職',.15,22,64,.45),row('urban_technical','機械保全の技術者',.1,22,64,.2,{jobTag:'factory',jobName:'機械保全の技術者'}),row('mesh_security','施設警備員',.05,22,69,.2)];
 if(c.type==='public')return [row('urban_official','公共施設の職員',.85,22,65,.5,{jobTag:'office',urbanTag:'government'}),row('urban_visit','公共施設への来訪者',.15,18,84,.5,{urbanTag:'government'})];
 if(c.type==='religious')return [row('urban_visit','参拝・境内の来訪者',.9,6,89,.52,{urbanTag:c.subtype}),row('urban_'+c.subtype,c.subtype==='shrine'?'神社の職員':'寺院の職員',.1,22,74,.5,{urbanTag:c.subtype,jobTag:'office'})];
 if(c.type==='agriculture')return [row('land_grounds','農地の管理作業員',.9,25,79,.35,{zone:c}),row('land_hike','近隣の散策者',.1,12,79,.5,{zone:c})];
 if(c.type==='sports')return [row('urban_visit','スポーツ施設の利用者',.9,12,79,.5,{urbanTag:'sports'}),row('urban_sports','スポーツ施設の運営スタッフ',.1,20,65,.5,{jobTag:'gym',urbanTag:'sports'})];
 if(c.type==='waterfront')return [row('urban_visit','水辺の散策者',1,6,89,.5,{urbanTag:'waterfront'})];
 const tag=c.areaTag?.tags||{},out=[],area=c.areaTag||{name:c.name,tags:{},id:c.id};
 const add=(k,w)=>{let d=AreaModel.types[k],source=area.sources?.[k]||area;if(w>0&&d)out.push(row('area_'+k,d[0],w*AreaModel.activity(k,t),d[1],d[2],k==='subculture'?(source.subcultureFemale??d[3]):k==='shopping'?(source.shoppingFemale??(tag.fashion>=3?.62:d[3])):d[3],{area:source}))};
 if(tag.student>0)add('student',tag.student*.25);
 if(c.type==='tourism'){add('tourist',3);add('inbound',tag.inbound||1)}else{add('shopping',c.subtype==='night'?.2:2);add('night',c.subtype==='night'?4:(tag.night||0)*.25);add('night_worker',c.subtype==='night'?1:.12);add('subculture',(tag.subculture||0)*.6);add('tourist',(tag.tourist||0)*.3);add('inbound',(tag.inbound||0)*.3);if(area.adultArea&&area.adultWeight>0){let a=area.adultArea,weight=area.adultWeight;for(let [k,factor] of [['adult_customer',.32],['adult_worker',.16],['cabaret_worker',.05]]){if(k==='cabaret_worker'&&a.adultStyle==='sexservice')continue;let d=AreaModel.types[k];out.push(row('area_'+k,d[0],weight*factor*AreaModel.activity(k,t),d[1],d[2],d[3],{area:a}))}}}
 out.push(...styleRows(area,t));
 if(tag.publishing>=2)out.push(row('urban_editor','編集者',.12,22,69,.5,{jobTag:'office',urbanTag:'publishing'}));
 if(c.subtype==='books'||tag.books>=2)out.push(row('urban_books','書店員',.2,20,69,.5,{jobTag:'retail',urbanTag:'books'}));
 if(c.subtype==='hotel')out.push(row('urban_hotel','ホテルの従業員',.5,20,65,.5,{jobTag:'hotel',urbanTag:'hotel'}));
 if(typeof OSMProfile!=='undefined'&&OSMProfile.opening(c.openingHours,t)===false)return out.filter(z=>/worker$/.test(z.role)||z.role.startsWith('urban_'));
 return out.length?out:[row('urban_visit','来訪者',1,6,89,.5,{urbanTag:'culture'})];
 }
 function estimatePopulation(c,t,profile){if(c.type==='waterfront'&&c.subtype==='water')return 0;
 const roles=estimateOccupations(c,t),sum=roles.reduce((s,z)=>s+z.w,0);if(!sum)return 0;
 if(typeof PoliceModel!=='undefined'&&PoliceModel.kind(c))return sum*Math.min(1,c.areaM2/Math.max(1,c.area||(c.geometry?S.area(c.geometry):Math.PI*(c.radius||20)**2)));
 if(typeof PlacesModel!=='undefined'&&PlacesModel.kind(c)||typeof CivicModel!=='undefined'&&CivicModel.kind(c)||typeof VenueModel!=='undefined'&&VenueModel.kind(c))return sum*Math.min(1,c.areaM2/Math.max(1,c.area||(c.geometry?S.area(c.geometry):c.areaM2)));
 if(c.facilities?.length||['education','medical','transport'].includes(c.type)&&!['airfield','terminal'].includes(c.subtype)){let footprint=c.geometry?S.area(c.geometry):Math.PI*(c.facilities?.[0]?.radius||c.radius||60)**2;return sum*Math.min(1,c.areaM2/Math.max(1,footprint));}
 if(c.type==='green'||c.kind==='palace'||['airfield','terminal','cemetery'].includes(c.subtype))return sum*c.areaM2/1e6;
 const density={residential:c.region.residentialDensity||c.region.density||6000,mixed:c.region.density||6000,commercial:14000,office:18000,industrial:2600,medical:7000,tourism:3000,transport:12000,public:3000,mall:16000,sports:1800,religious:900,agriculture:35,waterfront:250}[c.type]||1000;
 let factor=timeFactor(c.type,c.subtype,t),opening=typeof OSMProfile!=='undefined'?OSMProfile.opening(c.openingHours,t):null;
 if(opening===false)factor*=.02;
 // Nearby stations change accessibility modestly; station occupants remain a separate component.
 let traffic=1;if(['office','commercial','mall'].includes(c.type)){let near=profile.context.facilities.query(S.box(c.xy||profile.point,300)).filter(f=>f.kind==='station');if(near.length)traffic+=.12*(!weekend(t)&&(t.h>=7&&t.h<9||t.h>=17&&t.h<20)?1.5:1)}
 const housing=c.type==='residential'?(c.subtype==='family'&&c.precision==='polygon'?.55:c.subtype==='apartments'?1.25:c.housingWeight||1):1;
 return density*c.areaM2/1e6*factor*traffic*housing;
 }
 function estimateDemographics(c,occupation,t){let d={min:occupation.min,max:occupation.max,female:occupation.female};if(occupation.resident){d.resident=true;d.censusCode=c.region.id;d.subtype=c.subtype;d.daytime=t.h>=9&&t.h<17&&!weekend(t)}if(c.type==='green'&&c.subtype==='playground'&&occupation.role==='green_walk')d.ageBands=[[0,11,.5],[25,49,.45],[60,79,.05]];if(c.subtype==='fashion'&&occupation.role==='area_shopping')d.female=.62;return d;}
 function estimateRaw(profile,t){let out=[];for(let c of profile.parts){let n=estimatePopulation(c,t,profile),roles=estimateOccupations(c,t),mass=roles.reduce((s,z)=>s+z.w,0);if(!n||!mass)continue;for(let z of roles){if(z.w<=0)continue;out.push({...z,...estimateDemographics(c,z,t),n:n*z.w/mass,region:c.region,landType:c.type,subtype:c.subtype,evidence:c.source,precision:c.precision,landComponent:c})}}return out;}
 // Reassign existing people rather than adding an independent headcount. All coefficients
 // are simulation assumptions; dedicated populations such as patients, students and sleepers remain intact.
 function redistribute(rows){
  const out=rows.map(x=>({...x}));
  function transfer(donorTest,targetTest,fraction,capMultiplier,perFacilityCap){
   const donors=out.filter(x=>donorTest(x)&&x.n>0),targets=out.filter(x=>targetTest(x)&&x.n>0);
   if(!donors.length||!targets.length)return;
   let requested=donors.reduce((s,x)=>s+x.n,0)*fraction;
   // A facility can be split into several spatial fragments; share one cap across them.
   const groups=new Map();for(const x of targets){let c=x.landComponent||{},key=c.id||x.facility?.id||x.zone?.id||x;let g=groups.get(key);if(!g){g={members:[],base:0};groups.set(key,g)}g.members.push({row:x,base:x.n});g.base+=x.n}
   let active=[...groups.values()].map(g=>({...g,capacity:Math.min(perFacilityCap,Math.max(3,g.base*capMultiplier)),weight:Math.sqrt(g.base)}));
   let amount=Math.min(requested,active.reduce((s,g)=>s+g.capacity,0));if(amount<=0)return;
   const demand=amount;
   while(amount>1e-8&&active.length){const weights=active.reduce((s,g)=>s+g.weight,0);let paid=0;for(const g of active){let add=Math.min(g.capacity,amount*g.weight/weights);for(const x of g.members)x.row.n+=add*x.base/g.base;g.capacity-=add;paid+=add}amount-=paid;active=active.filter(g=>g.capacity>1e-8);if(paid<1e-8)break}

   const moved=demand-amount,donorTotal=donors.reduce((s,x)=>s+x.n,0);for(const x of donors)x.n-=moved*x.n/donorTotal;
  }
  const role=(...names)=>x=>names.includes(x.role);
  transfer(role('area_shopping'),role('place_shop_guest'),.20,5,100);
  transfer(role('area_tourist','area_inbound'),role('place_tourist_guest','place_observation_guest','place_museum_guest','place_theatre_guest','place_shrine_guest','place_temple_guest'),.15,5,80);
  transfer(role('area_inbound','area_tourist'),role('place_hotel_guest'),.06,3,50);
  transfer(x=>x.role==='urban_visit'&&['commercial','mall','public'].includes(x.landType),role('place_bank_guest','place_library_guest','place_bath_guest'),.12,4,40);
  transfer(x=>x.role==='area_office'&&['commercial','mall','mixed','office'].includes(x.landType),role('place_shop_staff','place_food_staff'),.03,3,50);
  transfer(x=>x.role==='area_office'&&['commercial','mall','mixed','office'].includes(x.landType),role('place_museum_staff','place_tourist_staff','place_library_staff','place_bank_staff'),.01,3,30);
  return out.filter(x=>x.n>1e-12);
 }
 function estimate(profile,t){return redistribute(estimateRaw(profile,t));}
 function sampleResident(c,t,pick,random=Math.random){let sa;for(let i=0;i<24;i++){sa=pick();let w=1;if(c.daytime)w=sa.age>=65?1:sa.age<6?.75:sa.age<23?.15:.4;if(c.subtype==='student')w*=sa.age>=18&&sa.age<=29?1:.4;if(c.subtype==='family')w*=sa.age<15||sa.age>=30&&sa.age<50?1:.65;if(c.subtype==='senior')w*=sa.age>=65?1:.35;if(random()<w)return sa}return sa;}
 return {estimatePopulation,estimateDemographics,estimateOccupations,estimateRaw,redistribute,estimate,timeFactor,sampleResident};
})();
if(typeof module!=='undefined')module.exports=LandEstimator;
