'use strict';
const el=id=>document.getElementById(id),esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let storage=null;try{storage=localStorage}catch{}
const initialSelection=SelectionCache.load(storage);
let selected=initialSelection.point,radius=initialSelection.radius,parts=[],regions=MAP_DATA.regions,facilities=MAP_DATA.facilities,history=[];
// Census is used only by residential components or explicit missing-data fallback.
for(let f of regions){f.density=censusMass(f.id)/f.area;let area=MAP_DATA.zoning.residentialAreaKm2[f.id];f.residentialDensity=area?censusMass(f.id)/area:f.density;}
if(MAP_DATA.mesh)MeshModel.configure(MAP_DATA.mesh); // old visualization/comparison only
const landContext=LandProfile.configure(MAP_DATA);
const profileCache=ProfileCache.create({storage,seeds:MAP_DATA.osmSeeds});
let landProfile=null,currentEvidence=null,refreshSequence=0,profileTimer=null,estimateMinute=null;
const emptyFeatures=[],geometryProfiles=new Map();
GreenModel.configure(MAP_DATA.greenZones);
LandModel.configure(MAP_DATA.waters,MAP_DATA.landZones);
const excluded=p=>LandModel.at(p)||GreenModel.at(p);
const boot=MapBoot.create(selected,radius),map=boot.map;
let tiles=boot.tiles,circle=boot.circle,pin=boot.pin,layer=L.layerGroup().addTo(map);
const clockFormatter=new Intl.DateTimeFormat('ja-JP',{timeZone:'Asia/Tokyo',year:'numeric',month:'long',day:'numeric',weekday:'short',hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false});
function dateNow(){el('clock').textContent=clockFormatter.format(new Date())}
function time(){let t=jstNow();t.rand=false;t.holiday=!!holName(t);t.venueEvent='auto';return t}
function minuteKey(t){return [t.y,t.mo,t.d,t.h,t.mi].join('/')}
async function updateWeather(){await MapWeather.load(storage)}
function facilitiesOnMap(){layer.clearLayers()}
function choose(p){selected=p;circle.setLatLng([p[1],p[0]]).setRadius(radius);pin.setLatLng([p[1],p[0]]);refresh();auraCheck();if(typeof abState==='function')abState()}
// When the whole view lies inside the range, the circle's rim is off screen; the map's edge glows instead.
function auraCheck(){const b=map.getBounds(),c=circle.getLatLng(),r=circle.getRadius(),inside=[b.getNorthWest(),b.getNorthEast(),b.getSouthWest(),b.getSouthEast()].every(q=>map.distance(q,c)<=r);el('map').classList.toggle('in-range',inside)}
map.on('moveend zoomend resize',auraCheck);
function refresh(){
 const seq=++refreshSequence,t=time();clearTimeout(profileTimer);el('draw').disabled=!drawing;parts=[];
 el('test-result').textContent='';
 if(!t){el('status').textContent='有効な日時を入力してください。';return}
 const p=selected.slice(),r=radius,cached=profileCache.peek(p,r);renderEstimate(p,r,t,cached);
 if(cached&&!cached.stale)return;
 profileTimer=setTimeout(async()=>{let evidence=await profileCache.get(p,r);if(seq!==refreshSequence)return;renderEstimate(p,r,t,evidence)},400);
}
// The breakdown shows range A, or range B when it is the active range of the two-range mode.
function renderBreakdown(prof,ps,r){const total=ps.reduce((s,x)=>s+x.n,0)||1;
 const sorted=Object.entries(prof.weights).sort((a,b)=>b[1]-a[1]);
 const cultureLabels={subculture:'サブカル・オタク文化',electronics:'電気街',korean_commerce:'韓国系商業',books:'古書・書店',publishing:'出版',inbound:'外国人観光客',night:'夜型',youth:'若者',fashion:'ファッション'};
 const cultures=Object.entries(prof.tags).filter(([k,v])=>cultureLabels[k]&&v/(Math.PI*r*r)>.3).map(([k])=>cultureLabels[k]);
 const subtypes=[...new Set(prof.parts.filter(x=>x.areaM2>Math.PI*r*r*.03).map(x=>({night:'歓楽街',shopping:'買い物',fashion:'若者・ファッション',subculture:'サブカル',student:'学生居住型',family:'ファミリー型',senior:'高齢者型',suburban:'低層住宅地',forest:'森林',university:'大学',primary:'小学校',middle:'中学校',high:'高校',playground:'児童公園',warehouse:'倉庫・物流',racecourse:'競馬場',dome:'ドーム',stadium:'スタジアム',arena:'アリーナ・体育館',cemetery:'霊園・墓地',books:'書店・古書'}[x.subtype])).filter(Boolean))];
 el('mesh-attributes').innerHTML=sorted.map(([k,v])=>'<span class="district-label" style="border-color:'+LandProfile.colors[k]+'">'+esc(LandProfile.labels[k])+' '+(v*100).toFixed(1)+'%</span>').join('')+'<div class="attribute-chips">'+[...subtypes,...cultures].map(x=>'<span>'+esc(x)+'</span>').join('')+'</div>';
 el('population-scope').textContent='土地の割合は面積から、人物の割合は滞在人数から推定しています。';
 el('details').innerHTML=ps.slice().sort((a,b)=>Number(['large_shop','tourist','library','bank','bath','hotel','hostel'].includes(b.landComponent?.placeKind||b.landComponent?.subtype))-Number(['large_shop','tourist','library','bank','bath','hotel','hostel'].includes(a.landComponent?.placeKind||a.landComponent?.subtype))||b.n-a.n).map(x=>`<p>${esc((x.facility?.schoolPolicy?.displayName||PlaceLabel.name(x))+(x.facility&&x.landType==='education'?'（'+SchoolPolicy.label(x.facility)+'）':''))}・${esc(x.label)} <b>${(x.n/total*100).toFixed(1)}%</b><progress max="100" value="${x.n/total*100}"></progress></p>`).join('');
}
function renderEstimate(p,r,t,evidence){
 const begin=performance.now();currentEvidence=evidence;let key=p.join(',')+'/'+r,features=evidence?.features||emptyFeatures,entry=geometryProfiles.get(key);if(!entry||entry.features!==features){entry={features,profile:LandProfile.create(landContext,p,r,features)};geometryProfiles.set(key,entry);if(geometryProfiles.size>8)geometryProfiles.delete(geometryProfiles.keys().next().value)}landProfile=entry.profile;parts=LandEstimator.estimate(landProfile,t);estimateMinute=minuteKey(t);
 const region=MapModel.locate(p,regions),center=landProfile.classify(p),n=parts.reduce((s,x)=>s+x.n,0);
 if(!(between()&&target==='B'))renderBreakdown(landProfile,parts,r);
 const venues=landProfile.parts.filter(c=>VenueModel.kind(c)&&VenueModel.kind(c)!=='cemetery');el('venue-status').innerHTML=venues.map(c=>{let v=VenueSchedule.resolve(c,t),info=v.event?`${v.event.title}／${v.phase}（終了・退場時刻は推定）`:v.phase||v.basis,link=v.event?.url||v.url;return '<span>'+esc(c.name)+'：'+esc(v.basis)+(v.event?'（2026年10月28日確認）':'')+'・'+esc(info)+(link?' <a href="'+esc(link)+'" target="_blank" rel="noopener">日程出典</a>':'')+'</span>'}).join('<br>');
 const state={live:'施設情報を更新済み',cache:'保存済みの施設情報を使用',stale:'保存済みの旧施設情報を使用',unavailable:'施設情報を取得できないため収録データで推定',busy:'施設情報の取得待ち'}[evidence?.status]||'収録データで推定中・施設情報を確認します';
 el('status').textContent=`${p[1].toFixed(5)}, ${p[0].toFixed(5)} ｜ 半径${r}m ｜ ${state} ｜ 計算 ${Math.round(performance.now()-begin)}ms`;
 // The map covers the 23 wards only: say so when the circle is wholly or partly outside them.
 if(!landProfile.coverage)el('status').textContent+=' ｜ 東京23区の外です。23区内を選んでください';else if(landProfile.coverage<.99)el('status').textContent+=' ｜ 23区外の部分は集計外';
 if(!drawing)el('draw').disabled=!n||between()&&!partsB.length;if(!n&&landProfile.coverage)el('status').textContent+=' ｜ 今の時刻、範囲内に抽選対象者がいません';
 document.querySelectorAll('[data-radius]').forEach(b=>{let active=+b.dataset.radius===r;b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active))});
 if(typeof meshLayer!=='undefined')drawMesh();
}
map.on('click',e=>place([e.latlng.lng,e.latlng.lat]));map.on('moveend',()=>{facilitiesOnMap();drawMesh()});
document.querySelectorAll('[data-radius]').forEach(b=>b.onclick=()=>{radius=+b.dataset.radius;choose(selected);refreshB()});
el('search').onclick=()=>{let q=el('query').value.trim();if(!q){el('results').textContent='';return}let list=[...(currentEvidence?.features||[]).filter(f=>f.tags?.name||f.tags?.['name:ja']),...(MAP_DATA.policeStations||[]),...(MAP_DATA.specialPlaces||[]),...(MAP_DATA.publicAreas||[]),...(MAP_DATA.landmarks||[]),...MAP_DATA.landZones,...MAP_DATA.greenZones,...MAP_DATA.areas,...facilities].filter(f=>f.name.includes(q)||(f.aliases||[]).some(n=>n.includes(q))).filter((f,i,a)=>a.findIndex(x=>x.name===f.name)===i).slice(0,15).map(f=>({name:f.name,xy:f.xy}));if(!list.length)list=regions.filter(f=>f.name.includes(q)).slice(0,10).map(f=>({name:f.name,xy:[(f.bbox[0]+f.bbox[2])/2,(f.bbox[1]+f.bbox[3])/2]}));el('results').innerHTML=list.length?list.map((f,i)=>`<button class="facility" data-result="${i}">${esc(f.name)}</button>`).join(''):'該当する収録施設・地域がありません。';document.querySelectorAll('[data-result]').forEach(b=>b.onclick=()=>{let f=list[+b.dataset.result];map.setView([f.xy[1],f.xy[0]],17);place(f.xy);el('results').innerHTML='';const r=el('map').getBoundingClientRect();if(r.top<0||r.bottom>innerHeight)el('map').scrollIntoView({behavior:reduceMotion?'auto':'smooth',block:'center'})})};el('query').onkeydown=e=>{if(e.key==='Enter')el('search').click()};
// Two ranges (A ⇄ B): range B shares the radius; map taps and search results move whichever range is active.
let selectedB=null,partsB=[],profileB=null,estimateMinuteB=null,refreshSequenceB=0,profileTimerB=null,target='A',circleB=null,pinB=null;
const B_KEY='swapsim-map-range-b';
try{const b=JSON.parse(storage?.getItem(B_KEY)||'null');if(Array.isArray(b)&&b.length===2&&b.every(Number.isFinite))selectedB=b}catch{}
function estimateAt(p,r,t,evidence){let key=p.join(',')+'/'+r,features=evidence?.features||emptyFeatures,entry=geometryProfiles.get(key);if(!entry||entry.features!==features){entry={features,profile:LandProfile.create(landContext,p,r,features)};geometryProfiles.set(key,entry);if(geometryProfiles.size>8)geometryProfiles.delete(geometryProfiles.keys().next().value)}profileB=entry.profile;return LandEstimator.estimate(entry.profile,t)}
function refreshB(){clearTimeout(profileTimerB);if(!selectedB||!between()){partsB=[];abState();return}const seq=++refreshSequenceB,t=time(),p=selectedB.slice(),r=radius,cached=profileCache.peek(p,r);partsB=estimateAt(p,r,t,cached);estimateMinuteB=minuteKey(t);abState();if(cached&&!cached.stale)return;
 profileTimerB=setTimeout(async()=>{const evidence=await profileCache.get(p,r);if(seq!==refreshSequenceB)return;partsB=estimateAt(p,r,time(),evidence);abState()},400)}
function place(p){el('guide').hidden=true;if(between()&&target==='B')chooseB(p);else choose(p)}
function chooseB(p){selectedB=p;try{storage?.setItem(B_KEY,JSON.stringify(p))}catch{}refreshB()}
function abState(){const on=between();el('ab-bar').hidden=!on;
 if(on&&!circleB){circleB=L.circle([0,0],{radius,color:'#E5533D',weight:2,opacity:.85,fillColor:'url(#range-aura-b)',fillOpacity:1,className:'range-aura range-b'});pinB=L.circleMarker([0,0],{radius:6,color:'#fff',fillColor:'#D9402B',fillOpacity:1}).bindTooltip('B',{permanent:true,direction:'right',offset:[6,0],className:'ab-tag'})}
 if(on&&selectedB){circleB.setLatLng([selectedB[1],selectedB[0]]).setRadius(radius);pinB.setLatLng([selectedB[1],selectedB[0]]);if(!circleB._map){circleB.addTo(map);pinB.addTo(map)}
  // Range B's aura: a red copy of range A's blue gradient.
  const a=document.getElementById('range-aura');if(a&&!document.getElementById('range-aura-b')){const g=a.cloneNode(true);g.id='range-aura-b';g.querySelectorAll('stop').forEach(x=>x.setAttribute('stop-color','#FF5438'));a.parentNode.appendChild(g)}}
 else{circleB?.remove();pinB?.remove()}
 pin.setStyle({fillColor:on?'#2F6BFF':'#C8371E'});
 if(on&&!pin.getTooltip())pin.bindTooltip('A',{permanent:true,direction:'right',offset:[6,0],className:'ab-tag'});if(!on&&pin.getTooltip())pin.unbindTooltip();
 document.querySelectorAll('#ab-bar [data-target]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.target===target)));
 el('ab-hint').textContent=!on?'':!selectedB?'地図をタップして範囲Bを選んでください':!partsB.length?'範囲Bには抽選対象者がいません（東京23区内で選んでください）':MapModel.distance(selected,selectedB)<radius*.5?'AとBがほぼ同じ場所です':'';
 beaconCheck();
 // The breakdown follows the switch: range B's when B is active, otherwise range A's.
 el('breakdown-which').textContent=on?(target==='B'?'（範囲B）':'（範囲A）'):'';
 if(on&&target==='B'){if(profileB&&selectedB)renderBreakdown(profileB,partsB,radius);else{el('mesh-attributes').innerHTML='';el('details').innerHTML='<p class="note">範囲Bを選ぶと表示します。</p>'}}else if(landProfile)renderBreakdown(landProfile,parts,radius);
 if(!drawing)el('draw').disabled=!parts.length||on&&!partsB.length}
// During a swap, if the two ranges are only specks at this zoom, each glows and sends out rings (never before the button).
let beacons=null;
function beaconCheck(){const show=!!drawing&&between()&&selectedB&&map.latLngToContainerPoint(map.getCenter()).distanceTo(map.latLngToContainerPoint(L.latLng(map.getCenter().lat,map.getCenter().lng+radius/(111320*Math.cos(map.getCenter().lat*Math.PI/180)))))<14;
 if(!show){beacons?.remove();beacons=null;return}
 if(!beacons){const icon=k=>L.divIcon({className:'',html:`<span class="beacon beacon-${k}"></span>`,iconSize:[16,16],iconAnchor:[8,8]});beacons=L.layerGroup([L.marker([0,0],{icon:icon('a'),interactive:false,keyboard:false}),L.marker([0,0],{icon:icon('b'),interactive:false,keyboard:false})]).addTo(map)}
 const [a,b]=beacons.getLayers();a.setLatLng([selected[1],selected[0]]);b.setLatLng([selectedB[1],selectedB[0]])}
map.on('zoomend',()=>{if(typeof between==='function')beaconCheck()});
// 🎲 for people new to Tokyo: a well-known place (or an ordinary neighborhood) that suits the hour, introduced in a line
// under the map. Places where something is happening right now are favored and say why. In the two-range mode, B
// is usually a contrasting kind of place.
const GUIDE_CALM=new Set(['tourist','shrine','museum','park','garden','residential','campus','hospital','theme']);
function guideWeight(s,t){const h=t.hf??t.h,we=t.dow===0||t.dow===6||!!t.holiday,wd=!we,rush=wd&&(h>=7&&h<9.5||h>=17.5&&h<20),lunch=wd&&h>=11.5&&h<13.5;
 switch(s.time){
  case 'tourist':return h>=9&&h<18?1:h>=18&&h<21?.4:.02;
  case 'shrine':return h>=6&&h<17?1:.02;
  case 'museum':return h>=9.5&&h<17&&t.dow!==1?1:.02;
  case 'park':return h>=8&&h<18?(we?1.3:1):h>=18&&h<21?.2:.02;
  case 'garden':return h>=9&&h<16.5&&t.dow!==1?1:.01;
  case 'market':return h>=6&&h<11?1.3:h>=11&&h<14?.6:.03;
  case 'shop':return h>=10&&h<20?(we?1.3:1):h>=20&&h<22?.3:.02;
  case 'crossing':return h>=8?1:.3;
  case 'dining':return h>=11.5&&h<22?1:.05;
  case 'venue':return .12;
  case 'theme':{const f=MAP_DATA.facilities.find(x=>x.kind==='theme'&&x.name===s.theme);return f&&h>=f.open&&h<f.close?(we?1.3:1):.01}
  case 'night':return h>=18||h<2?1:h>=12?.15:.03;
  case 'late':return h>=21||h<4?1:.03;
  case 'office':return wd&&h>=8&&h<20?(lunch?1.3:1):wd&&h>=20&&h<23?.3:.05;
  case 'office_night':return h>=17||h<1?1.2:wd&&h>=8?.8:.1;
  case 'diet':return wd&&h>=9&&h<17?.5:.05;
  case 'tocho':return h>=9&&h<22?.7:.05;
  case 'station':return h>=5||h<.6?(rush?2:.8):.03;
  case 'airport':return h>=6&&h<22?.9:.1;
  case 'campus':return wd&&h>=9&&h<18?1:.1;
  case 'hospital':return wd&&h>=8.5&&h<17?.8:.2;
  default:return h>=19||h<8?1:.6}}
// Something happening now: [reason, weight factor].
function guideEvent(s,t){const h=t.hf??t.h,day=`${t.y}-${String(t.mo).padStart(2,'0')}-${String(t.d).padStart(2,'0')}`,wd=t.dow>0&&t.dow<6&&!t.holiday;
 if(s.venue){const e=(MAP_DATA.venueSchedules?.events||[]).find(e=>e.venue===s.venue&&e.date===day&&e.mode!=='none'&&h>=(e.opens??e.starts-1)&&h<(e.endsAssumed??e.starts+3));if(e)return [`いま「${e.title}」が開かれています`,8]}
 if(s.time==='diet'&&typeof DietModel!=='undefined'){const D=DietModel.diet(t),e=D.now[0];if(e)return [`いま${e.house==='both'?'衆参両院':e.house+'議院'}で${e.label}が行われています`,8];if(D.plenaryLower||D.plenaryUpper)return ['いま本会議が開かれている時間です',5];if(D.session&&wd&&h>=9&&h<17)return [`${D.session.kind==='臨時会'?'臨時国会':D.session.kind==='常会'?'通常国会':'特別国会'}の会期中です`,1.5]}
 if(s.time==='tocho'&&h>=19&&h<21.5)return ['夜は都庁の壁面でプロジェクションマッピングが上映されています',4];
 if(s.time==='station'&&wd&&h>=7&&h<9.5)return ['いまは通勤・通学ラッシュの時間です',1];
 if(s.time==='station'&&wd&&h>=17.5&&h<20)return ['いまは帰宅ラッシュの時間です',1];
 if(s.time==='market'&&h>=6&&h<10)return ['朝がいちばん活気のある時間です',1];
 if(s.time==='office'&&wd&&h>=12&&h<13)return ['昼休みの会社員が街にあふれる時間です',1];
 if(s.name==='歌舞伎町'&&(h>=22||h<3))return ['「眠らない街」がいちばんにぎわう時間です',1.3];
 return null}
let guideLast=[];
function guidePick(t,group){const list=MAP_DATA.guideSpots.map(s=>{const ev=guideEvent(s,t);return {s,ev,w:guideWeight(s,t)*(ev?ev[1]:1)*(guideLast.includes(s.name)?.05:1)*(group==null?1:GUIDE_CALM.has(s.time)===group?1:.43)}});let v=Math.random()*list.reduce((x,y)=>x+y.w,0);return list.find(x=>(v-=x.w)<0)||list[0]}
function guideLine(g,tag=''){const ward=MapModel.locate(g.s.xy,regions)?.name;return `${tag}🎲 ${g.s.name}${ward?'（'+ward+'）':''}　${g.s.desc}。${g.ev?g.ev[0]+'。':''}`}
el('dice').onclick=()=>{const b=el('dice'),t=time();b.classList.remove('roll');void b.offsetWidth;b.classList.add('roll');
 if(between()){const a=guidePick(t),bb=guidePick(t,!GUIDE_CALM.has(a.s.time));if(bb.s===a.s)return el('dice').onclick();guideLast=[a.s.name,bb.s.name];const pa=a.s.xy,pb=bb.s.xy,box=L.latLngBounds([[pa[1],pa[0]],[pb[1],pb[0]]]).pad(.15);map[reduceMotion?'fitBounds':'flyToBounds'](box,{maxZoom:15,duration:.9,padding:[24,24]});choose(pa);chooseB(pb);el('guide').textContent=guideLine(a,'A ')+'\n'+guideLine(bb,'B ');el('guide').hidden=false;return}
 const g=guidePick(t);guideLast=[g.s.name];map[reduceMotion?'setView':'flyTo']([g.s.xy[1],g.s.xy[0]],Math.max(map.getZoom(),15),{duration:.9});choose(g.s.xy);el('guide').textContent=guideLine(g);el('guide').hidden=false};
el('ab-bar').onclick=e=>{const b=e.target.closest('[data-target]');if(!b)return;target=b.dataset.target;abState()};
let issuedCount=0,currentPerson=null,crowd=[];
const options={sex:null,dec:null,pair:false,pairMode:'within',real:false},optionsKey='swapsim-map-options-v1';
try{const saved=JSON.parse(storage?.getItem(optionsKey)||'null');if(saved){options.sex=['m','f'].includes(saved.sex)?saved.sex:null;options.dec=Array.isArray(saved.dec)?saved.dec.filter(n=>Number.isInteger(n)&&n>=0&&n<=9):null;options.pair=saved.pair===true;options.pairMode=saved.pairMode==='between'?'between':'within';options.real=saved.real===true}}catch{}
function renderOptions(){
 el('opt-sex').innerHTML=[['','指定なし'],['m','男性'],['f','女性']].map(([v,l])=>`<button type="button" data-v="${v}" aria-pressed="${(options.sex||'')===v}">${l}</button>`).join('');
 el('opt-age').innerHTML=[['','指定なし'],...Array.from({length:10},(_,n)=>[String(n),n===9?'90代以上':n*10+'代'])].map(([v,l])=>`<button type="button" data-v="${v}" aria-pressed="${v===''?!options.dec?.length:!!options.dec?.includes(+v)}">${l}</button>`).join('');
 for(const key of ['pair','real'])el('opt-'+key).setAttribute('aria-checked',String(options[key]));
 el('opt-pairmode-row').hidden=!options.pair;el('pair-note').textContent=options.pair&&options.pairMode==='between'?'範囲Aの人と範囲Bの人を入れ替えます。性別・年齢は1人目（範囲A）に使います':'地図の半径内の2人を入れ替えます。性別・年齢は1人目に使います';el('opt-pairmode').innerHTML=[['within','範囲の中で'],['between','2つの範囲で']].map(([v,l])=>`<button type="button" data-v="${v}" aria-pressed="${options.pairMode===v}">${l}</button>`).join('');
 el('real-name').textContent=options.pair?'本当に入れ替える':'本当に入れ替わる';
 setDrawLabel();
 el('opts-cur').textContent=[options.sex?options.sex==='f'?'女性':'男性':'',options.dec?.length?options.dec.map(n=>n===9?'90代以上':n*10+'代').join('・'):'',options.pair&&options.real?'本当に入れ替える':'',options.pair?(options.pairMode==='between'?'2つの範囲で':'範囲の中で'):'',options.real&&!options.pair?'本当に入れ替わる':''].filter(Boolean).join('、');
 el('opt-save-status').textContent='「保存」を押すと、次回もこの設定で開きます。';
 if(typeof abState==='function'){if(between()&&!selectedB)target='B';refreshB()}
}
function between(){return !!options.pair&&options.pairMode==='between'}
el('opt-sex').onclick=e=>{const b=e.target.closest('button');if(b){options.sex=b.dataset.v||null;renderOptions()}};
el('opt-pairmode').onclick=e=>{const b=e.target.closest('button');if(b){options.pairMode=b.dataset.v;renderOptions()}};
el('opt-age').onclick=e=>{const b=e.target.closest('button');if(!b)return;if(b.dataset.v==='')options.dec=null;else{const set=new Set(options.dec||[]),v=+b.dataset.v;set.has(v)?set.delete(v):set.add(v);options.dec=set.size?[...set].sort((a,b)=>a-b):null}renderOptions()};
for(const key of ['pair','real'])el('opt-'+key).onclick=()=>{options[key]=!options[key];renderOptions()};
el('opt-save').onclick=()=>{try{if(!storage)throw Error();storage.setItem(optionsKey,JSON.stringify(options));el('opt-save-status').textContent='条件を保存しました。次回もこの設定で開きます。'}catch{el('opt-save-status').textContent='このブラウザでは設定を保存できません。今回の設定はそのまま使えます。'}};
el('opt-reset').onclick=()=>{Object.assign(options,{sex:null,dec:null,pair:false,pairMode:'within',real:false});try{storage?.removeItem(optionsKey)}catch{}renderOptions()};
// Names the filter in the error, e.g. 「女性・0代」.
function conditionLabel(){return [options.sex?options.sex==='f'?'女性':'男性':'',...(options.dec||[]).map(n=>n===9?'90代以上':n*10+'代')].filter(Boolean).join('・')}
function notFound(){let c=conditionLabel();return Error('今の時刻、この範囲には'+(c?'「'+c+'」の':'抽選できる')+'人物が見つかりません。条件や半径を変更してください。')}
function samplePerson(t,filtered=false,src=parts){
 const eligible=src.filter(c=>(!filtered||!options.sex||(options.sex==='f'?c.female!==0:c.female!==1))&&(!filtered||!options.dec?.length||options.dec.some(d=>(c.max??110)>=d*10&&(c.min??0)<=(d===9?110:d*10+9))));
 const total=eligible.reduce((sum,c)=>sum+c.n,0);if(!total)throw notFound();
 for(let i=0;i<2000;i++){const c=MapModel.pick(eligible);if(!c)break;const P=mapPerson({...c,roleP:c.n/total},t);if(!filtered||((!options.sex||P.sex===options.sex)&&(!options.dec?.length||options.dec.includes(Math.min(9,Math.floor(P.age/10))))))return P}
 throw notFound();
}
// Both people are in the same city, so the gap ignores place: age, sex, state and occupation group only, with
// thresholds at the quintiles of map-drawn pairs (the original thresholds assume nationwide distances).
const MAP_GAP_TH=[1.12,1.76,2.32,3.0];
function mapGap(A,B){const g=pairGap(A,B),score=g.age/25+(g.sexDiff?1:0)+(g.stateDiff?.8:0)+(g.groupDiff?.6:0);return {...g,km:0,score,stars:MAP_GAP_TH.findIndex(x=>score<x)+1||5}}
function samplePair(t,filtered=false,two=false){const A=samplePerson(t,filtered),B=samplePerson(t,false,two?partsB:parts);return {kind:'pair',A,B,t,gap:mapGap(A,B)}}
// A nearly empty range (a park at night, a closed precinct) has too few people for five swaps: one or two pairs only.
function fewPairs(){const total=src=>src.reduce((s,c)=>s+c.n,0),n=between()?Math.min(total(parts),total(partsB)):total(parts);return n<3?1:n<12?2:5}
function sampleResult(t,filtered=false){return options.pair?samplePair(t,filtered,between()):samplePerson(t,filtered)}
function showResult(P){currentPerson=P;el('person').innerHTML=MapNotice.html(P);el('copy').onclick=async()=>{const text=MapNotice.text(P);try{await navigator.clipboard.writeText(text);el('toast').textContent='コピーしました'}catch{const box=document.createElement('textarea');box.value=text;box.readOnly=true;box.className='copybox';el('person').appendChild(box);box.select();el('toast').textContent='表示された文章をコピーしてください'}};stampIt(!reduceMotion);scrollToNotice(true);if(!reduceMotion)el('notice').classList.add('flash')}
function resultLabel(P){const name=X=>X.displayName||X.surname.k+' '+X.given.k;return P.kind==='pair'?`${name(P.A)}（${P.A.age}歳） ⇄ ${name(P.B)}（${P.B.age}歳）`:`${name(P)} ／ ${P.age}歳 ／ ${P.occ.label}`}
function renderCrowd(){
 el('crowd-title').textContent='同じ瞬間に入れ替わった人たち';
 // Sex is shown by name color (male blue, female red); the job replaces it in the brackets.
 const name=P=>P.displayName||P.surname.k+' '+P.given.k,job=P=>P.occ.label.replace(/（[^（）]*）$/,''),who=P=>`<span class="sex-${P.sex==='f'?'f':'m'}">${esc(name(P))}<span class="sr">（${P.sex==='f'?'女性':'男性'}）</span></span><span class="meta">（${P.age}歳 ${esc(job(P))}）</span>`;
 el('crowd').innerHTML=crowd.map((R,i)=>`<li><button type="button" data-crowd="${i}"${currentPerson===R?' aria-current="true"':''}>${currentPerson===R?'<span class="showing">通知書に表示中</span>':''}<span class="who">${who(R.A)}<span class="arw" aria-label="と"> ⇄ </span>${who(R.B)}</span><small>${esc(R.A.place)} ⇄ ${esc(R.B.place)}</small><span class="doing"><span class="mk sex-${R.A.sex==='f'?'f':'m'}" aria-hidden="true"></span>${esc(R.A.surname.k)}さんは、${esc(R.A.sit.text)}。</span><span class="doing"><span class="mk sex-${R.B.sex==='f'?'f':'m'}" aria-hidden="true"></span>${esc(R.B.surname.k)}さんは、${esc(R.B.sit.text)}。</span></button></li>`).join('');
}
el('crowd').onclick=e=>{const b=e.target.closest('[data-crowd]');if(b&&!drawing){showResult(crowd[+b.dataset.crowd]);renderCrowd()}};
// Pair mode: five compact notices first; tapping one opens that pair's full notice.
let pairCards=[];
function pairMode(on){el('pcards-sec').hidden=!on;el('crowd-sec').hidden=on;if(on)el('person').hidden=!currentPerson||!pairCards.includes(currentPerson)}
function renderPairCards(animate){const name=P=>P.displayName||P.surname.k+' '+P.given.k,job=P=>P.occ.label.replace(/（[^（）]*）$/,''),sx=P=>P.sex==='f'?'f':'m',stars=n=>'★'.repeat(n)+'☆'.repeat(5-n),side=P=>`<span class="pc-p"><span class="pc-name sex-${sx(P)}">${esc(name(P))}</span><span class="pc-meta">${P.age}歳・${esc(job(P))}</span><span class="pc-meta">${esc(P.place)}</span></span>`;
 el('pcards').innerHTML=pairCards.map((R,i)=>`<li${animate?' class="enter"':''}><button type="button" class="pcard" data-card="${i}"${currentPerson===R?' aria-current="true"':''} aria-label="第${String(R.serial).padStart(6,'0')}号 ${esc(name(R.A))}さんと${esc(name(R.B))}さんの入れ替わり。押すと詳しい通知書を表示"><span class="pc-head"><b>入れ替わりのお知らせ</b><span>第${String(R.serial).padStart(6,'0')}号</span></span><span class="pc-pair">${side(R.A)}<span class="pc-x" aria-hidden="true">⇄</span>${side(R.B)}</span><p class="pc-sit"><span class="mk sex-${sx(R.A)}" aria-hidden="true"></span>${esc(R.A.surname.k)}さんは、${esc(R.A.sit.text)}。</p><p class="pc-sit"><span class="mk sex-${sx(R.B)}" aria-hidden="true"></span>${esc(R.B.surname.k)}さんは、${esc(R.B.sit.text)}。</p><span class="pc-foot"><span>ギャップ <span class="stars">${R.gap?.stars?stars(R.gap.stars):''}</span></span><span class="pc-open">${currentPerson===R?'表示中':'詳しく見る'}</span></span></button></li>`).join('');
 if(animate)[...el('pcards').children].forEach((li,i)=>setTimeout(()=>li.classList.remove('enter'),reduceMotion?0:120*i+30))}
el('pcards').onclick=e=>{const b=e.target.closest('[data-card]');if(!b||drawing)return;el('person').hidden=false;showResult(pairCards[+b.dataset.card]);renderPairCards(false)};
// Reveal like the original: roam the circle, then fill the notice field by field. Pressing again skips.
let drawing=null,drawToken=0,plays=0,pool={parts:[],center:null,radius:0},poolB=null,roamLayer=null;
function setDrawLabel(){const b=el('draw');b.setAttribute('data-busy',drawing?'1':'0');el('go-label').innerHTML=drawing?'とばす':options.pair?'入れ<br>替える':'入れ<br>替わる';b.setAttribute('aria-label',drawing?'演出をとばす':options.pair?'2人を入れ替える':'入れ替わる')}
function later(ms,tk){return new Promise((res,rej)=>setTimeout(()=>tk===drawToken?res():rej(new Error('skip')),ms))}
const pickOne=a=>a[Math.floor(Math.random()*a.length)],placeName=c=>PlaceLabel.name(c);
function roamPoint(c,pl=pool){if(c.facility?.xy&&MapModel.distance(c.facility.xy,pl.center)<=pl.radius)return c.facility.xy;const [x,y]=pl.center,d=pl.radius*Math.sqrt(Math.random()),a=Math.random()*2*Math.PI;return [x+d*Math.sin(a)/(111320*Math.cos(y*Math.PI/180)),y+d*Math.cos(a)/111320]}
async function roam(count,ms,tk,pools=[]){roamLayer??=L.layerGroup().addTo(map);const marks=Array.from({length:count},(_,i)=>L.circleMarker([(pools[i]||pool).center[1],(pools[i]||pool).center[0]],{radius:7,color:'#fff',weight:2,fillColor:pools.length?(i?'#D9402B':'#2F6BFF'):i?'#2E6A5D':'#C8371E',fillOpacity:1}).bindTooltip('',{permanent:true,direction:'top',offset:[0,-6]}).addTo(roamLayer)),end=performance.now()+ms;let step=50;
 while(performance.now()<end){for(const [i,m] of marks.entries()){const pl=pools[i]||pool,c=MapModel.pick(pl.parts),q=roamPoint(c,pl);m.setLatLng([q[1],q[0]]).setTooltipContent(esc(placeName(c)))}await later(step,tk);step=Math.min(160,step*1.12)}roamLayer.clearLayers()}
async function roll(id,gen,ms,tk){const node=el(id),end=performance.now()+ms;while(performance.now()<end){node.innerHTML=gen();await later(55,tk)}}
async function typeOut(id,html,tk){const node=el(id),box=document.createElement('div');box.innerHTML=html;const plain=box.textContent;for(let i=1;i<=plain.length;i+=2){node.textContent=plain.slice(0,i);await later(28,tk)}node.innerHTML=html}
const SN_KEYS=Object.keys(SN),fakePlace=()=>esc(placeName(MapModel.pick(pool.parts))),fakeName=sex=>esc(pickOne(SN_KEYS)+' '+pickOne(pickOne(ERAS)[sex]).k);
async function reveal(P,tk){const k=plays>1?.6:1;el('person').innerHTML=MapNotice.html(P);currentPerson=P;
 const ids=[...el('person').querySelectorAll('[id]')].map(n=>n.id),final=Object.fromEntries(ids.map(id=>[id,el(id).innerHTML])),put=id=>{el(id).innerHTML=final[id]};
 const fields=P.kind==='pair'?['place','name','age','job','body','hobby','family','health','sit'].flatMap(f=>['pa-'+f,'pb-'+f]):['f-place','f-name','f-job','f-hobby','f-family','f-health','f-sit','f-sex','f-age','f-height','f-weight'];
 for(const id of fields)if(final[id]!==undefined)el(id).innerHTML=/sex|age|height|weight/.test(id)&&P.kind!=='pair'?'<span class="blank">—</span>':'<span class="blank">記入中…</span>';
 for(const id of ['stamp','rarity','gap'])if(el(id))el(id).hidden=true;el('copy').disabled=true;
 el('opening').textContent=P.kind==='pair'?'この範囲の2人を探しています…':'この範囲の誰かを探しています…';
 await roam(P.kind==='pair'?2:1,(P.kind==='pair'?1100:1000)*k,tk);scrollToNotice();
 if(P.kind==='pair'){for(const [id,X] of [['pa',P.A],['pb',P.B]]){await roll(id+'-place',fakePlace,380*k,tk);put(id+'-place');await roll(id+'-name',()=>fakeName(X.sex),460*k,tk);put(id+'-name');put(id+'-age');await roll(id+'-job',()=>esc(pickOne(JOB_OBJS).n),300*k,tk);for(const f of ['job','body','hobby','family','health'])put(id+'-'+f);await typeOut(id+'-sit',final[id+'-sit'],tk)}put('opening');return}
 await roll('f-place',fakePlace,520*k,tk);put('f-place');await roll('f-sex',()=>pickOne(['男性','女性']),220*k,tk);put('f-sex');await roll('f-age',()=>Math.floor(Math.random()*100)+'歳',300*k,tk);put('f-age');
 await roll('f-name',()=>fakeName(P.sex),620*k,tk);put('f-name');put('opening');await roll('f-job',()=>esc(pickOne(JOB_OBJS).n),480*k,tk);put('f-job');
 await roll('f-height',()=>(140+Math.random()*45).toFixed(1)+'cm',220*k,tk);for(const id of ['f-height','f-weight','f-hobby','f-family','f-health'])put(id);await typeOut('f-sit',final['f-sit'],tk)}
// Past swaps open their notice again, like the original's history (kept while this page is open).
function renderHistory(){el('hist-clear').hidden=!history.length;const shown=currentPerson||pairCards[0],pad=n=>String(n).padStart(2,'0'),when=t=>t?`${t.mo}/${t.d} ${pad(t.h)}:${pad(t.mi)}`:'';
 el('history').innerHTML=history.length?history.map((h,k)=>{const cur=h.P===shown||h.P.kind==='pair'&&pairCards[0]===h.P&&!el('pcards-sec').hidden,label=resultLabel(h.P)+(h.P.kind==='pair'&&h.others.length?` ほか${h.others.length}組`:'');return `<button type="button" class="hrow" data-h="${k}"${cur?' aria-current="true"':''}><span class="no">第${String(h.P.serial).padStart(6,'0')}号</span><span class="line">${cur?'<span class="showing">表示中</span>':''}${esc(when(h.P.t||h.P.A?.t))}　${esc(label)}</span></button>`}).join(''):'<p class="note">まだ記録はありません。</p>'}
// History survives a reload: each result is packed like the original's (prefecture and job by reference) into this
// browser's storage, newest 20, along with the notice counter so numbers keep counting up.
const HIST_KEY='swapsim-map-history';
function packP(P){const {pref,muni,given,occ,...rest}=P,era=given.era?Object.fromEntries(Object.entries(given.era).filter(([k,v])=>v==null||typeof v!=='object')):undefined;return {...rest,pi:PREFS.indexOf(pref),mn:muni.n,mc:muni.code,given:{k:given.k,r:given.r,p:given.p,era},occ:{...occ,job:undefined,jn:occ.job?occ.job.n:null}}}
function unpackP(o){const pref=PREFS[o.pi],muni=pref?.munis.find(m=>m.n===o.mn)||{n:o.mn,code:o.mc,pop:0},job=o.occ.jn?JOB_OBJS.find(j=>j.n===o.occ.jn)||null:null,{pi,mn,mc,...rest}=o;return {...rest,pref,muni,occ:{...o.occ,job}}}
const packR=R=>R.kind==='pair'?{...R,A:packP(R.A),B:packP(R.B)}:packP(R),unpackR=o=>o.kind==='pair'?{...o,A:unpackP(o.A),B:unpackP(o.B)}:unpackP(o);
function saveHistory(){if(!storage)return;let list=history.map(h=>({P:packR(h.P),others:h.others.map(packR)}));for(;;){try{storage.setItem(HIST_KEY,JSON.stringify({count:issuedCount,list}));return}catch(e){if(!list.length)return;list=list.slice(0,-1)}}}
function loadHistory(){try{const o=JSON.parse(storage?.getItem(HIST_KEY)||'null');if(!o)return;issuedCount=Math.max(issuedCount,o.count|0);history=(o.list||[]).map(h=>{try{return {P:unpackR(h.P),others:(h.others||[]).map(unpackR)}}catch(e){return null}}).filter(Boolean)}catch(e){history=[]}}
el('hist-clear').onclick=()=>{history=[];try{storage?.removeItem(HIST_KEY)}catch(e){}renderHistory()};
el('history').onclick=e=>{const b=e.target.closest('button[data-h]');if(!b||drawing)return;const h=history[+b.dataset.h];if(!h)return;crowd=h.others;fewNote(h.others);
 if(h.P.kind==='pair'){pairCards=[h.P,...h.others];currentPerson=null;pairMode(true);el('person').hidden=true;renderPairCards(false);el('pcards-sec').scrollIntoView({behavior:reduceMotion?'auto':'smooth',block:'start'})}
 else{pairMode(false);el('person').hidden=false;showResult(h.P);renderCrowd();el('person').scrollIntoView({behavior:reduceMotion?'auto':'smooth',block:'start'})}renderHistory()};
function fewNote(others){const few=others.length<4,msg=few?(others.length?'この範囲では、ほかに入れ替わる人は見つかりませんでした。':'この範囲では、ほかに入れ替わる人はいませんでした。'):'';for(const id of ['pcards-note','crowd-note']){el(id).hidden=!few;el(id).textContent=msg}}
function finishDraw(){const d=drawing;if(!d)return;fewNote(d.others);drawing=null;if(typeof beaconCheck==='function')beaconCheck();drawToken++;roamLayer?.clearLayers();crowd=d.others;if(d.P.kind==='pair'){pairCards=[d.P,...d.others];currentPerson=null;pairMode(true);el('person').hidden=true;renderPairCards(true);el('pcards-sec').scrollIntoView({behavior:reduceMotion?'auto':'smooth',block:'start'})}else{pairMode(false);el('person').hidden=false;showResult(d.P);renderCrowd()}history.unshift({P:d.P,others:d.others});history=history.slice(0,20);saveHistory();renderHistory();setDrawLabel();el('draw').disabled=!parts.length||between()&&!partsB.length}
el('draw').onclick=async()=>{if(drawing){finishDraw();return}if(!parts.length||between()&&!partsB.length)return;SelectionCache.save(storage,selected,radius);el('draw').disabled=true;let P,others;try{updateWeather();const t=time();if(estimateMinute!==minuteKey(t))refresh();if(between()&&estimateMinuteB!==minuteKey(t))refreshB();P=sampleResult(t,true);others=Array.from({length:Math.max(0,fewPairs()-1)},()=>samplePair(t,false,between()));P.serial=++issuedCount;others.forEach(X=>X.serial=++issuedCount)}catch(e){el('status').textContent=e.message;el('opt-save-status').textContent=e.message;el('opts').open=true;console.error(e);el('draw').disabled=!parts.length;return}
 drawing={P,others};pool={parts:parts.slice(),center:selected.slice(),radius};poolB=between()?{parts:partsB.slice(),center:selectedB.slice(),radius}:null;plays++;const tk=++drawToken;el('draw').disabled=false;setDrawLabel();if(reduceMotion){finishDraw();return}
 // Pair mode first brings the map into view (on phones the button sits below it) and roams the circle with the
 // markers, then jumps to the five compact notices.
 try{if(P.kind==='pair'){pairMode(true);el('pcards').innerHTML='';const r=el('map').getBoundingClientRect();if(r.top<0||r.bottom>innerHeight){el('map').scrollIntoView({behavior:reduceMotion?'auto':'smooth',block:'center'});await later(450,tk)}
  // Two ranges: show both circles, one marker roaming in each.
  if(poolB){map.fitBounds(circle.getBounds().extend(circleB.getBounds()),{padding:[24,24],maxZoom:16});await later(500,tk);beaconCheck()}await roam(2,1600*(plays>1?.7:1),tk,poolB?[pool,poolB]:[])}else await reveal(P,tk)}catch(e){if(e.message!=='skip')console.error(e)}if(tk===drawToken)finishDraw()};
renderOptions();
el('test').onclick=()=>{if(!parts.length)return;let n=parts.reduce((s,p)=>s+p.n,0),theory=parts.filter(p=>p.role==='resident').reduce((s,p)=>s+p.n,0)/n,count=0;for(let i=0;i<10000;i++)count+=MapModel.pick(parts).role==='resident';el('test-result').textContent=`施設入居者：理論 ${(theory*100).toFixed(2)}% ／ 1万回の実測 ${(count/100).toFixed(2)}%`};
const meshLayer=L.layerGroup().addTo(map);
let overlaySequence=0,overlaySignature=null;
async function drawMesh(){
 const seq=++overlaySequence;let legacy=el('mesh-mode').value==='legacy';
 el('mesh-legend-title').textContent=legacy?'旧メッシュ分類（比較用・新方式の抽選には不使用）':'土地用途と施設敷地（境界には概略を含みます）';
 el('mesh-legend').innerHTML=Object.entries(LandProfile.labels).map(([k,label])=>'<span><i style="background:'+LandProfile.colors[k]+'"></i>'+esc(label)+'</span>').join('');
 if(!el('mesh-toggle').checked||map.getZoom()<14){meshLayer.clearLayers();overlaySignature=null;return;}
 if(legacy&&!MAP_DATA.mesh&&typeof loadLegacyMesh==='function'){await loadLegacyMesh();if(seq!==overlaySequence)return;MeshModel.configure(MAP_DATA.mesh);}
 if(legacy&&!MAP_DATA.mesh)return;
 let signature=el('mesh-mode').value+'/'+map.getBounds().toBBoxString();if(overlaySignature?.key===signature&&overlaySignature.evidence===currentEvidence)return;overlaySignature={key:signature,evidence:currentEvidence};meshLayer.clearLayers();
 let bounds=map.getBounds();
 if(legacy){let lo=MeshModel.key([bounds.getWest(),bounds.getSouth()]),hi=MeshModel.key([bounds.getEast(),bounds.getNorth()]);for(let x=lo[0];x<=hi[0];x++)for(let y=lo[1];y<=hi[1];y++){let c=MeshModel.cell(MeshModel.xy(x,y));if(c)L.rectangle(MeshModel.rect(c),{color:MeshAttributes.color(c,'district'),weight:.5,fillOpacity:.3,interactive:false}).addTo(meshLayer)}return}
 let bbox=[bounds.getWest(),bounds.getSouth(),bounds.getEast(),bounds.getNorth()],seen=new Set();
 const features=[...landContext.zoning.query(bbox),...landContext.zones.query(bbox),...landContext.waters.query(bbox).map(f=>({...f,type:'waterfront'})),...landContext.landmarks.query(bbox),...landContext.publicAreas.query(bbox),...landContext.police.query(bbox),...landContext.specialPlaces.query(bbox),...(currentEvidence?.features||[]).filter(f=>f.geometry&&MapSpatial.intersects(bbox,f.bbox)).sort((a,b)=>b.area-a.area)];
 for(let f of features){if(!f.geometry||seen.has(f.id))continue;seen.add(f.id);L.geoJSON(f.geometry,{style:{color:LandProfile.colors[f.type]||'#999',weight:1,fillOpacity:.18},interactive:false}).addTo(meshLayer)}
}
el('mesh-toggle').checked=false;el('mesh-toggle').onchange=drawMesh;
el('mesh-mode').innerHTML='<option value="land">土地用途・敷地（標準）</option><option value="legacy">旧100mメッシュ（比較用）</option>';
el('mesh-mode').onchange=drawMesh;
dateNow();setInterval(()=>{dateNow();const t=time();if(t.mi!==lastMinute){lastMinute=t.mi;refresh();refreshB()}},1000);let lastMinute=time().mi;updateWeather();facilitiesOnMap();refresh();drawMesh();MapBoot.done();loadHistory();renderHistory();

