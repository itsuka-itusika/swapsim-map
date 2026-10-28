'use strict';
const el=id=>document.getElementById(id),esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let selected=[139.7006,35.6595],radius=300,parts=[],regions=MAP_DATA.regions,facilities=MAP_DATA.facilities,history=[],nowMode=true;
// Census is used only by residential components or explicit missing-data fallback.
for(let f of regions){f.density=censusMass(f.id)/f.area;let area=MAP_DATA.zoning.residentialAreaKm2[f.id];f.residentialDensity=area?censusMass(f.id)/area:f.density;}
if(MAP_DATA.mesh)MeshModel.configure(MAP_DATA.mesh); // old visualization/comparison only
const landContext=LandProfile.configure(MAP_DATA);
let storage=null;try{storage=localStorage}catch{}
const profileCache=ProfileCache.create({storage,seeds:MAP_DATA.osmSeeds});
let landProfile=null,currentEvidence=null,refreshSequence=0,profileTimer=null;
const emptyFeatures=[],geometryProfiles=new Map();
GreenModel.configure(MAP_DATA.greenZones);
LandModel.configure(MAP_DATA.waters,MAP_DATA.landZones);
const excluded=p=>LandModel.at(p)||GreenModel.at(p);
const map=L.map('map',{minZoom:10,maxZoom:18,maxBounds:[[35.48,139.48],[35.86,139.94]],maxBoundsViscosity:.8}).setView([selected[1],selected[0]],15);
let tiles=L.tileLayer('https://tile.openstreetmap.jp/styles/osm-bright-ja/{z}/{x}/{y}.png',{maxZoom:18,updateWhenIdle:true,updateWhenZooming:false,keepBuffer:1,attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a> | <a href="https://openmaptiles.org/">&copy; OpenMapTiles</a> | <a href="https://www.osm.jp/">OpenStreetMap Japan</a>'}).addTo(map);
tiles.on('tileerror',()=>{el('status').textContent='背景地図の一部を読み込めません。通信状態を確認してください。地域・施設データは引き続き利用できます。'});
let circle=L.circle([selected[1],selected[0]],{radius,color:'#2E6A5D',fillOpacity:.12}).addTo(map),pin=L.circleMarker([selected[1],selected[0]],{radius:6,color:'#fff',fillColor:'#C8371E',fillOpacity:1}).addTo(map),layer=L.layerGroup().addTo(map);
function dateNow(){let t=jstNow();el('date').value=`${t.y}-${String(t.mo).padStart(2,'0')}-${String(t.d).padStart(2,'0')}T${String(t.h).padStart(2,'0')}:${String(t.mi).padStart(2,'0')}`}
function time(){if(nowMode){dateNow();let t=jstNow();t.rand=false;t.holiday=!!holName(t);t.venueEvent='auto';return t}let d=new Date(el('date').value+'+09:00');if(!Number.isFinite(+d))return null;let [y,mo,day,h,mi]=el('date').value.match(/\d+/g).map(Number);let dow=new Date(Date.UTC(y,mo-1,day)).getUTCDay();let t={y,mo,d:day,h,mi,hf:h+mi/60,dow,rand:true};t.holiday=!!holName(t);t.venueEvent='auto';return t}
function weatherStatus(){el('weather-status').textContent=nowMode?'天気：'+MapWeather.status():'天気：指定日時の季節から推定'}
async function updateWeather(){await MapWeather.load(storage);weatherStatus()}
function facilitiesOnMap(){layer.clearLayers();let bounds=map.getBounds();if(map.getZoom()<13)return;let list=facilities.filter(f=>['station','tv','radio','theme'].includes(f.kind)&&bounds.contains([f.xy[1],f.xy[0]])).slice(0,180);for(let f of list){let color='#3b809d';L.circleMarker([f.xy[1],f.xy[0]],{radius:4,color,weight:1,fillOpacity:.8}).bindTooltip(esc(f.name)).on('click',e=>{L.DomEvent.stopPropagation(e);choose(f.xy)}).addTo(layer)}if(map.getZoom()>=15){let landmarks=[...(MAP_DATA.policeStations||[]),...(MAP_DATA.specialPlaces||[])].filter(f=>bounds.contains([f.xy[1],f.xy[0]])).filter((f,i,a)=>a.findIndex(x=>x.name===f.name)===i).slice(0,120);for(let f of landmarks)L.circleMarker([f.xy[1],f.xy[0]],{radius:5,color:'#fff',weight:1,fillColor:f.type==='religious'?'#ad7354':'#855894',fillOpacity:.9}).bindTooltip(esc(f.name)).on('click',e=>{L.DomEvent.stopPropagation(e);choose(f.xy)}).addTo(layer)}}
function choose(p){selected=p;circle.setLatLng([p[1],p[0]]).setRadius(radius);pin.setLatLng([p[1],p[0]]);refresh()}
function refresh(){
 const seq=++refreshSequence,t=time();clearTimeout(profileTimer);el('draw').disabled=true;parts=[];
 el('test-result').textContent='';
 if(!t){el('status').textContent='有効な日時を入力してください。';return}
 const p=selected.slice(),r=radius,cached=profileCache.peek(p,r);renderEstimate(p,r,t,cached);
 if(cached&&!cached.stale)return;
 profileTimer=setTimeout(async()=>{let evidence=await profileCache.get(p,r);if(seq!==refreshSequence)return;renderEstimate(p,r,t,evidence)},400);
}
function renderEstimate(p,r,t,evidence){
 const begin=performance.now();currentEvidence=evidence;let key=p.join(',')+'/'+r,features=evidence?.features||emptyFeatures,entry=geometryProfiles.get(key);if(!entry||entry.features!==features){entry={features,profile:LandProfile.create(landContext,p,r,features)};geometryProfiles.set(key,entry);if(geometryProfiles.size>8)geometryProfiles.delete(geometryProfiles.keys().next().value)}landProfile=entry.profile;parts=LandEstimator.estimate(landProfile,t);
 const region=MapModel.locate(p,regions),center=landProfile.classify(p),n=parts.reduce((s,x)=>s+x.n,0);
 el('place').textContent=center?.name||region?.name||'東京23区の対象外';
 const sorted=Object.entries(landProfile.weights).sort((a,b)=>b[1]-a[1]);
 const cultureLabels={subculture:'サブカル・オタク文化',electronics:'電気街',korean_commerce:'韓国系商業',books:'古書・書店',publishing:'出版',inbound:'外国人観光客',night:'夜型',youth:'若者',fashion:'ファッション'};
 const cultures=Object.entries(landProfile.tags).filter(([k,v])=>cultureLabels[k]&&v/(Math.PI*r*r)>.3).map(([k])=>cultureLabels[k]);
 const subtypes=[...new Set(landProfile.parts.filter(x=>x.areaM2>Math.PI*r*r*.03).map(x=>({night:'歓楽街',shopping:'買い物',fashion:'若者・ファッション',subculture:'サブカル',student:'学生居住型',family:'ファミリー型',senior:'高齢者型',suburban:'低層住宅地',forest:'森林',university:'大学',primary:'小学校',middle:'中学校',high:'高校',playground:'児童公園',warehouse:'倉庫・物流',racecourse:'競馬場',dome:'ドーム',stadium:'スタジアム',arena:'アリーナ・体育館',cemetery:'霊園・墓地',books:'書店・古書'}[x.subtype])).filter(Boolean))];
 el('mesh-attributes').innerHTML=sorted.map(([k,v])=>'<span class="district-label" style="border-color:'+LandProfile.colors[k]+'">'+esc(LandProfile.labels[k])+' '+(v*100).toFixed(1)+'%</span>').join('')+'<div class="attribute-chips">'+[...subtypes,...cultures].map(x=>'<span>'+esc(x)+'</span>').join('')+'</div>';
 el('total').textContent=n>0&&n<1?'1人未満':`約 ${Math.round(n<100?n:n/10)*(n<100?1:10)} 人`;
 el('population-scope').textContent='土地の割合は面積から、人物の割合は滞在人数から推定しています。';
 const venues=landProfile.parts.filter(c=>VenueModel.kind(c)&&VenueModel.kind(c)!=='cemetery');el('venue-status').innerHTML=venues.map(c=>{let v=VenueSchedule.resolve(c,t),info=v.event?`${v.event.title}／${v.phase}（終了・退場時刻は推定）`:v.phase||v.basis,link=v.event?.url||v.url;return '<span>'+esc(c.name)+'：'+esc(v.basis)+(v.event?'（2026年10月28日確認）':'')+'・'+esc(info)+(link?' <a href="'+esc(link)+'" target="_blank" rel="noopener">日程出典</a>':'')+'</span>'}).join('<br>');
 const state={live:'施設情報を更新済み',cache:'保存済みの施設情報を使用',stale:'保存済みの旧施設情報を使用',unavailable:'施設情報を取得できないため収録データで推定',busy:'施設情報の取得待ち'}[evidence?.status]||'収録データで推定中・施設情報を確認します';
 el('status').textContent=`${p[1].toFixed(5)}, ${p[0].toFixed(5)} ｜ 半径${r}m ｜ ${state} ｜ 計算 ${Math.round(performance.now()-begin)}ms`;
 if(landProfile.coverage<.99)el('status').textContent+=' ｜ 対象区域内の部分のみ集計';
 el('details').innerHTML=parts.slice().sort((a,b)=>b.n-a.n).map(x=>`<p>${esc((x.facility?.schoolPolicy?.displayName||x.facility?.name||x.area?.name||x.zone?.name||x.landComponent?.name||x.region.name)+(x.facility&&x.landType==='education'?'（'+SchoolPolicy.label(x.facility)+'）':''))}・${esc(x.label)} <b>${(x.n/n*100).toFixed(1)}%</b><progress max="100" value="${x.n/n*100}"></progress></p>`).join('');
 el('draw').disabled=!n;if(!n)el('status').textContent+=' ｜ 範囲内に抽選対象者がいません';
 document.querySelectorAll('[data-radius]').forEach(b=>{let active=+b.dataset.radius===r;b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active))});
 if(typeof meshLayer!=='undefined')drawMesh();
}
map.on('click',e=>choose([e.latlng.lng,e.latlng.lat]));map.on('moveend',()=>{facilitiesOnMap();drawMesh()});
document.querySelectorAll('[data-radius]').forEach(b=>b.onclick=()=>{radius=+b.dataset.radius;choose(selected)});
el('date').onchange=()=>{nowMode=false;weatherStatus();refresh()};el('now').onclick=()=>{nowMode=true;dateNow();weatherStatus();updateWeather();refresh()};
el('search').onclick=()=>{let q=el('query').value.trim();if(!q){el('results').textContent='施設名か市区町村名を入力してください。';return}let list=[...(MAP_DATA.policeStations||[]),...(MAP_DATA.specialPlaces||[]),...(MAP_DATA.publicAreas||[]),...(MAP_DATA.landmarks||[]),...MAP_DATA.landZones,...MAP_DATA.greenZones,...MAP_DATA.areas,...facilities].filter(f=>f.name.includes(q)||(f.aliases||[]).some(n=>n.includes(q))).filter((f,i,a)=>a.findIndex(x=>x.name===f.name)===i).slice(0,15).map(f=>({name:f.name,xy:f.xy}));if(!list.length)list=regions.filter(f=>f.name.includes(q)).slice(0,10).map(f=>({name:f.name,xy:[(f.bbox[0]+f.bbox[2])/2,(f.bbox[1]+f.bbox[3])/2]}));el('results').innerHTML=list.length?list.map((f,i)=>`<button class="facility" data-result="${i}">${esc(f.name)}</button>`).join(''):'該当する収録施設・地域がありません。';document.querySelectorAll('[data-result]').forEach(b=>b.onclick=()=>{let f=list[+b.dataset.result];map.setView([f.xy[1],f.xy[0]],17);choose(f.xy);el('results').innerHTML=''})};el('query').onkeydown=e=>{if(e.key==='Enter')el('search').click()};
let issuedCount=0,currentPerson=null;
el('draw').onclick=()=>{if(nowMode)updateWeather();let c=MapModel.pick(parts);if(!c)return;try{let total=parts.reduce((s,x)=>s+x.n,0),P=mapPerson({...c,roleP:c.n/total},time());P.serial=++issuedCount;currentPerson=P;el('person').innerHTML=MapNotice.html(P,c);el('copy').onclick=async()=>{let text=MapNotice.text(P);try{await navigator.clipboard.writeText(text);el('toast').textContent='コピーしました'}catch{let box=document.createElement('textarea');box.value=text;box.readOnly=true;box.className='copybox';el('person').appendChild(box);box.select();el('toast').textContent='表示された文章をコピーしてください'}};let name=P.displayName||P.surname.k+' '+P.given.k;history.unshift(`${name} ／ ${P.age}歳 ／ ${P.occ.label}`);history=history.slice(0,12);el('history').innerHTML=history.map(s=>`<p>${esc(s)}</p>`).join('');stampIt(!reduceMotion);el('go-label').innerHTML='次の<br>誰かへ';scrollToNotice(true);el('notice').classList.remove('flash');if(!reduceMotion){void el('notice').offsetWidth;el('notice').classList.add('flash')}}catch(e){el('person').textContent='人物生成に失敗しました：'+e.message;console.error(e)}};
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
dateNow();weatherStatus();updateWeather();facilitiesOnMap();refresh();drawMesh();

