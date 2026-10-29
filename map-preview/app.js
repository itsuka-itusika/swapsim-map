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
function choose(p){selected=p;circle.setLatLng([p[1],p[0]]).setRadius(radius);pin.setLatLng([p[1],p[0]]);refresh()}
function refresh(){
 const seq=++refreshSequence,t=time();clearTimeout(profileTimer);el('draw').disabled=!drawing;parts=[];
 el('test-result').textContent='';
 if(!t){el('status').textContent='有効な日時を入力してください。';return}
 const p=selected.slice(),r=radius,cached=profileCache.peek(p,r);renderEstimate(p,r,t,cached);
 if(cached&&!cached.stale)return;
 profileTimer=setTimeout(async()=>{let evidence=await profileCache.get(p,r);if(seq!==refreshSequence)return;renderEstimate(p,r,t,evidence)},400);
}
function renderEstimate(p,r,t,evidence){
 const begin=performance.now();currentEvidence=evidence;let key=p.join(',')+'/'+r,features=evidence?.features||emptyFeatures,entry=geometryProfiles.get(key);if(!entry||entry.features!==features){entry={features,profile:LandProfile.create(landContext,p,r,features)};geometryProfiles.set(key,entry);if(geometryProfiles.size>8)geometryProfiles.delete(geometryProfiles.keys().next().value)}landProfile=entry.profile;parts=LandEstimator.estimate(landProfile,t);estimateMinute=minuteKey(t);
 const region=MapModel.locate(p,regions),center=landProfile.classify(p),n=parts.reduce((s,x)=>s+x.n,0);
 const sorted=Object.entries(landProfile.weights).sort((a,b)=>b[1]-a[1]);
 const cultureLabels={subculture:'サブカル・オタク文化',electronics:'電気街',korean_commerce:'韓国系商業',books:'古書・書店',publishing:'出版',inbound:'外国人観光客',night:'夜型',youth:'若者',fashion:'ファッション'};
 const cultures=Object.entries(landProfile.tags).filter(([k,v])=>cultureLabels[k]&&v/(Math.PI*r*r)>.3).map(([k])=>cultureLabels[k]);
 const subtypes=[...new Set(landProfile.parts.filter(x=>x.areaM2>Math.PI*r*r*.03).map(x=>({night:'歓楽街',shopping:'買い物',fashion:'若者・ファッション',subculture:'サブカル',student:'学生居住型',family:'ファミリー型',senior:'高齢者型',suburban:'低層住宅地',forest:'森林',university:'大学',primary:'小学校',middle:'中学校',high:'高校',playground:'児童公園',warehouse:'倉庫・物流',racecourse:'競馬場',dome:'ドーム',stadium:'スタジアム',arena:'アリーナ・体育館',cemetery:'霊園・墓地',books:'書店・古書'}[x.subtype])).filter(Boolean))];
 el('mesh-attributes').innerHTML=sorted.map(([k,v])=>'<span class="district-label" style="border-color:'+LandProfile.colors[k]+'">'+esc(LandProfile.labels[k])+' '+(v*100).toFixed(1)+'%</span>').join('')+'<div class="attribute-chips">'+[...subtypes,...cultures].map(x=>'<span>'+esc(x)+'</span>').join('')+'</div>';
 el('population-scope').textContent='土地の割合は面積から、人物の割合は滞在人数から推定しています。';
 const venues=landProfile.parts.filter(c=>VenueModel.kind(c)&&VenueModel.kind(c)!=='cemetery');el('venue-status').innerHTML=venues.map(c=>{let v=VenueSchedule.resolve(c,t),info=v.event?`${v.event.title}／${v.phase}（終了・退場時刻は推定）`:v.phase||v.basis,link=v.event?.url||v.url;return '<span>'+esc(c.name)+'：'+esc(v.basis)+(v.event?'（2026年10月28日確認）':'')+'・'+esc(info)+(link?' <a href="'+esc(link)+'" target="_blank" rel="noopener">日程出典</a>':'')+'</span>'}).join('<br>');
 const state={live:'施設情報を更新済み',cache:'保存済みの施設情報を使用',stale:'保存済みの旧施設情報を使用',unavailable:'施設情報を取得できないため収録データで推定',busy:'施設情報の取得待ち'}[evidence?.status]||'収録データで推定中・施設情報を確認します';
 el('status').textContent=`${p[1].toFixed(5)}, ${p[0].toFixed(5)} ｜ 半径${r}m ｜ ${state} ｜ 計算 ${Math.round(performance.now()-begin)}ms`;
 if(landProfile.coverage<.99)el('status').textContent+=' ｜ 対象区域内の部分のみ集計';
 el('details').innerHTML=parts.slice().sort((a,b)=>Number(['large_shop','tourist','library','bank','bath','hotel','hostel'].includes(b.landComponent?.placeKind||b.landComponent?.subtype))-Number(['large_shop','tourist','library','bank','bath','hotel','hostel'].includes(a.landComponent?.placeKind||a.landComponent?.subtype))||b.n-a.n).map(x=>`<p>${esc((x.facility?.schoolPolicy?.displayName||PlaceLabel.name(x))+(x.facility&&x.landType==='education'?'（'+SchoolPolicy.label(x.facility)+'）':''))}・${esc(x.label)} <b>${(x.n/n*100).toFixed(1)}%</b><progress max="100" value="${x.n/n*100}"></progress></p>`).join('');
 el('draw').disabled=!n&&!drawing;if(!n)el('status').textContent+=' ｜ 範囲内に抽選対象者がいません';
 document.querySelectorAll('[data-radius]').forEach(b=>{let active=+b.dataset.radius===r;b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active))});
 if(typeof meshLayer!=='undefined')drawMesh();
}
map.on('click',e=>choose([e.latlng.lng,e.latlng.lat]));map.on('moveend',()=>{facilitiesOnMap();drawMesh()});
document.querySelectorAll('[data-radius]').forEach(b=>b.onclick=()=>{radius=+b.dataset.radius;choose(selected)});
el('search').onclick=()=>{let q=el('query').value.trim();if(!q){el('results').textContent='';return}let list=[...(currentEvidence?.features||[]).filter(f=>f.tags?.name||f.tags?.['name:ja']),...(MAP_DATA.policeStations||[]),...(MAP_DATA.specialPlaces||[]),...(MAP_DATA.publicAreas||[]),...(MAP_DATA.landmarks||[]),...MAP_DATA.landZones,...MAP_DATA.greenZones,...MAP_DATA.areas,...facilities].filter(f=>f.name.includes(q)||(f.aliases||[]).some(n=>n.includes(q))).filter((f,i,a)=>a.findIndex(x=>x.name===f.name)===i).slice(0,15).map(f=>({name:f.name,xy:f.xy}));if(!list.length)list=regions.filter(f=>f.name.includes(q)).slice(0,10).map(f=>({name:f.name,xy:[(f.bbox[0]+f.bbox[2])/2,(f.bbox[1]+f.bbox[3])/2]}));el('results').innerHTML=list.length?list.map((f,i)=>`<button class="facility" data-result="${i}">${esc(f.name)}</button>`).join(''):'該当する収録施設・地域がありません。';document.querySelectorAll('[data-result]').forEach(b=>b.onclick=()=>{let f=list[+b.dataset.result];map.setView([f.xy[1],f.xy[0]],17);choose(f.xy);el('results').innerHTML=''})};el('query').onkeydown=e=>{if(e.key==='Enter')el('search').click()};
let issuedCount=0,currentPerson=null,crowd=[];
const options={sex:null,dec:null,pair:false,real:false},optionsKey='swapsim-map-options-v1';
try{const saved=JSON.parse(storage?.getItem(optionsKey)||'null');if(saved){options.sex=['m','f'].includes(saved.sex)?saved.sex:null;options.dec=Array.isArray(saved.dec)?saved.dec.filter(n=>Number.isInteger(n)&&n>=0&&n<=9):null;options.pair=saved.pair===true;options.real=saved.real===true}}catch{}
function renderOptions(){
 el('opt-sex').innerHTML=[['','指定なし'],['m','男性'],['f','女性']].map(([v,l])=>`<button type="button" data-v="${v}" aria-pressed="${(options.sex||'')===v}">${l}</button>`).join('');
 el('opt-age').innerHTML=[['','指定なし'],...Array.from({length:10},(_,n)=>[String(n),n===9?'90代以上':n*10+'代'])].map(([v,l])=>`<button type="button" data-v="${v}" aria-pressed="${v===''?!options.dec?.length:!!options.dec?.includes(+v)}">${l}</button>`).join('');
 for(const key of ['pair','real'])el('opt-'+key).setAttribute('aria-checked',String(options[key]));
 el('real-name').textContent=options.pair?'本当に入れ替える':'本当に入れ替わる';
 setDrawLabel();
 el('opts-cur').textContent=[options.sex?options.sex==='f'?'女性':'男性':'',options.dec?.length?options.dec.map(n=>n===9?'90代以上':n*10+'代').join('・'):'',options.pair&&options.real?'本当に入れ替える':options.pair?'2人を入れ替え':'',options.real&&!options.pair?'本当に入れ替わる':''].filter(Boolean).join('・');
 el('opt-save-status').textContent='「保存」を押すと、次回もこの設定で開きます。';
}
el('opt-sex').onclick=e=>{const b=e.target.closest('button');if(b){options.sex=b.dataset.v||null;renderOptions()}};
el('opt-age').onclick=e=>{const b=e.target.closest('button');if(!b)return;if(b.dataset.v==='')options.dec=null;else{const set=new Set(options.dec||[]),v=+b.dataset.v;set.has(v)?set.delete(v):set.add(v);options.dec=set.size?[...set].sort((a,b)=>a-b):null}renderOptions()};
for(const key of ['pair','real'])el('opt-'+key).onclick=()=>{options[key]=!options[key];renderOptions()};
el('opt-save').onclick=()=>{try{if(!storage)throw Error();storage.setItem(optionsKey,JSON.stringify(options));el('opt-save-status').textContent='条件を保存しました。次回もこの設定で開きます。'}catch{el('opt-save-status').textContent='このブラウザでは設定を保存できません。今回の設定はそのまま使えます。'}};
el('opt-reset').onclick=()=>{Object.assign(options,{sex:null,dec:null,pair:false,real:false});try{storage?.removeItem(optionsKey)}catch{}renderOptions()};
function samplePerson(t,filtered=false){
 const eligible=parts.filter(c=>(!filtered||!options.sex||(options.sex==='f'?c.female!==0:c.female!==1))&&(!filtered||!options.dec?.length||options.dec.some(d=>(c.max??110)>=d*10&&(c.min??0)<=(d===9?110:d*10+9))));
 const total=eligible.reduce((sum,c)=>sum+c.n,0);if(!total)throw Error('この範囲には指定条件の人物が見つかりません。条件や半径を変更してください。');
 for(let i=0;i<2000;i++){const c=MapModel.pick(eligible);if(!c)break;const P=mapPerson({...c,roleP:c.n/total},t);if(!filtered||((!options.sex||P.sex===options.sex)&&(!options.dec?.length||options.dec.includes(Math.min(9,Math.floor(P.age/10))))))return P}
 throw Error('この範囲には指定条件の人物が見つかりません。条件や半径を変更してください。');
}
// Both people are in the same city, so the gap ignores place: age, sex, state and occupation group only, with
// thresholds at the quintiles of map-drawn pairs (the original thresholds assume nationwide distances).
const MAP_GAP_TH=[1.12,1.76,2.32,3.0];
function mapGap(A,B){const g=pairGap(A,B),score=g.age/25+(g.sexDiff?1:0)+(g.stateDiff?.8:0)+(g.groupDiff?.6:0);return {...g,km:0,score,stars:MAP_GAP_TH.findIndex(x=>score<x)+1||5}}
function samplePair(t,filtered=false){const A=samplePerson(t,filtered),B=samplePerson(t);return {kind:'pair',A,B,t,gap:mapGap(A,B)}}
function sampleResult(t,filtered=false){return options.pair?samplePair(t,filtered):samplePerson(t,filtered)}
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
let drawing=null,drawToken=0,plays=0,pool={parts:[],center:null,radius:0},roamLayer=null;
function setDrawLabel(){const b=el('draw');b.setAttribute('data-busy',drawing?'1':'0');el('go-label').innerHTML=drawing?'とばす':options.pair?'入れ<br>替える':'入れ<br>替わる';b.setAttribute('aria-label',drawing?'演出をとばす':options.pair?'2人を入れ替える':'入れ替わる')}
function later(ms,tk){return new Promise((res,rej)=>setTimeout(()=>tk===drawToken?res():rej(new Error('skip')),ms))}
const pickOne=a=>a[Math.floor(Math.random()*a.length)],placeName=c=>PlaceLabel.name(c);
function roamPoint(c){if(c.facility?.xy&&MapModel.distance(c.facility.xy,pool.center)<=pool.radius)return c.facility.xy;const [x,y]=pool.center,d=pool.radius*Math.sqrt(Math.random()),a=Math.random()*2*Math.PI;return [x+d*Math.sin(a)/(111320*Math.cos(y*Math.PI/180)),y+d*Math.cos(a)/111320]}
async function roam(count,ms,tk){roamLayer??=L.layerGroup().addTo(map);const marks=Array.from({length:count},(_,i)=>L.circleMarker([pool.center[1],pool.center[0]],{radius:7,color:'#fff',weight:2,fillColor:i?'#2E6A5D':'#C8371E',fillOpacity:1}).bindTooltip('',{permanent:true,direction:'top',offset:[0,-6]}).addTo(roamLayer)),end=performance.now()+ms;let step=50;
 while(performance.now()<end){for(const m of marks){const c=MapModel.pick(pool.parts),q=roamPoint(c);m.setLatLng([q[1],q[0]]).setTooltipContent(esc(placeName(c)))}await later(step,tk);step=Math.min(160,step*1.12)}roamLayer.clearLayers()}
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
function finishDraw(){const d=drawing;if(!d)return;drawing=null;drawToken++;roamLayer?.clearLayers();crowd=d.others;if(d.P.kind==='pair'){pairCards=[d.P,...d.others];currentPerson=null;pairMode(true);el('person').hidden=true;renderPairCards(true);el('pcards-sec').scrollIntoView({behavior:reduceMotion?'auto':'smooth',block:'start'})}else{pairMode(false);el('person').hidden=false;showResult(d.P);renderCrowd()}history.unshift(resultLabel(d.P));history=history.slice(0,12);el('history').innerHTML=history.map(s=>`<p>${esc(s)}</p>`).join('');setDrawLabel();el('draw').disabled=!parts.length}
el('draw').onclick=async()=>{if(drawing){finishDraw();return}if(!parts.length)return;SelectionCache.save(storage,selected,radius);el('draw').disabled=true;let P,others;try{updateWeather();const t=time();if(estimateMinute!==minuteKey(t))refresh();P=sampleResult(t,true);others=Array.from({length:4},()=>samplePair(t));P.serial=++issuedCount;others.forEach(X=>X.serial=++issuedCount)}catch(e){el('status').textContent=e.message;el('opt-save-status').textContent=e.message;el('opts').open=true;console.error(e);el('draw').disabled=!parts.length;return}
 drawing={P,others};pool={parts:parts.slice(),center:selected.slice(),radius};plays++;const tk=++drawToken;el('draw').disabled=false;setDrawLabel();if(reduceMotion){finishDraw();return}
 // Pair mode first brings the map into view (on phones the button sits below it) and roams the circle with the
 // markers, then jumps to the five compact notices.
 try{if(P.kind==='pair'){pairMode(true);el('pcards').innerHTML='';const r=el('map').getBoundingClientRect();if(r.top<0||r.bottom>innerHeight){el('map').scrollIntoView({behavior:reduceMotion?'auto':'smooth',block:'center'});await later(450,tk)}await roam(2,1600*(plays>1?.7:1),tk)}else await reveal(P,tk)}catch(e){if(e.message!=='skip')console.error(e)}if(tk===drawToken)finishDraw()};
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
dateNow();setInterval(()=>{dateNow();const t=time();if(t.mi!==lastMinute){lastMinute=t.mi;refresh()}},1000);let lastMinute=time().mi;updateWeather();facilitiesOnMap();refresh();drawMesh();MapBoot.done();

