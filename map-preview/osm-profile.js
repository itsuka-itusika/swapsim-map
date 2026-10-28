/* OpenStreetMap geometry adapter. A missing polygon never becomes its bounding rectangle. */
const OSMProfile=(()=>{
 const S=typeof MapSpatial!=='undefined'?MapSpatial:require('./spatial.js');
 function classification(t){
 const a=t.amenity,l=t.landuse,b=t.building,n=t['name:ja']||t.name||'';
 if(['disused','abandoned','construction','demolished'].some(k=>t[k]==='yes'||Object.keys(t).some(x=>x.startsWith(k+':'))))return null;
 if(n&&a==='library')return ['public','library'];
 if(n&&a==='bank')return ['public','bank'];
 if(n&&a==='public_bath'&&/スーパー銭湯|天然温泉|健康ランド|スパ|温浴/i.test(n))return ['tourism','bath'];
 if(n&&['hostel','guest_house'].includes(t.tourism))return ['tourism','hostel'];
 if(n&&['zoo','aquarium','attraction','viewpoint','theme_park'].includes(t.tourism))return ['tourism','tourist'];
 if(n&&(t.shop==='mall'||t.shop==='department_store'||t.shop==='electronics'&&/ヨドバシ|ビックカメラ|ヤマダデンキ|ヤマダ電機|LABI|エディオン|ケーズデンキ|ノジマ/i.test(n)||t.shop==='books'&&/ジュンク堂|紀伊國屋|紀伊国屋|丸善|三省堂書店|八重洲ブックセンター|有隣堂|MARUZEN/i.test(n)||t.shop==='clothes'&&/旗艦|UNIQLO TOKYO|ユニクロ銀座|ユニクロ新宿本店/i.test(n)))return ['mall','large_shop'];
 if(t.shop||['cafe','restaurant','fast_food','bar','pub','food_court'].includes(a))return null;
 if(a==='police'&&/警察署$/.test(t.name||''))return ['public','police'];
 if(a==='fire_station')return ['public','fire_station'];
 if(t.tourism==='hotel')return ['commercial','hotel'];
 if(['museum','gallery'].includes(t.tourism))return ['tourism',t.tourism];
 if(a==='theatre')return ['tourism','theatre'];
 if(a==='prison')return ['public',/拘置/.test(t.name||'')?'detention':'prison'];
 if(l==='military'||t.military==='barracks'||/駐屯地|防衛省市ヶ谷地区/.test(t.name||''))return ['public','military'];
 if(/^(?:国会議事堂|[衆参]議院.*議員会館)$/.test(t.name||''))return ['public','parliament'];
 if(t.natural==='water'||t.waterway==='riverbank'||l==='reservoir')return ['waterfront','water'];
 if(['school','university','college','kindergarten'].includes(a))return ['education',a==='school'?(/高等|高校/.test(t.name||'')?'high':/中学/.test(t.name||'')?'middle':'primary'):a];
 if(['hospital','clinic','doctors','nursing_home','social_facility'].includes(a))return ['medical',a==='nursing_home'||t['social_facility:for']==='senior'?'care':a==='hospital'?'hospital':'clinic'];
 if(t.railway==='station'||t.public_transport==='station'||a==='bus_station'||t.aeroway==='terminal')return ['transport','station'];
 if(l==='cemetery'||a==='grave_yard')return ['religious','cemetery'];
 if(a==='place_of_worship')return ['religious',t.religion==='shinto'?'shrine':'temple'];
 if(t.sport==='horse_racing'||t.leisure==='track'&&/競馬/.test(t.name||''))return ['sports','racecourse'];
 if(t.leisure==='nature_reserve')return ['green','forest'];
 if(a==='events_venue')return ['public','event_hall'];
 if(t.leisure==='pitch'&&/競技場|野球場/.test(t.name||''))return ['sports','sports'];
 if(t.leisure==='horse_riding')return ['sports','sports'];
 if(t.leisure==='sports_centre'&&/プール/.test(t.name||''))return ['sports','sports'];
 if(t.leisure==='stadium'||t.leisure==='sports_centre')return ['sports',/競馬/.test(t.name||'')?'racecourse':/ドーム/.test(t.name||'')?'dome':/アリーナ|体育館|武道館|国技館|コロシアム/.test(t.name||'')?'arena':t.leisure==='sports_centre'?'sports':'stadium'];
 if(t.leisure==='park'||t.leisure==='garden'||t.leisure==='playground'||t.natural==='wood'||l==='forest'||l==='recreation_ground')return ['green',t.natural==='wood'||l==='forest'?'forest':t.leisure==='garden'?'garden':t.leisure==='playground'?'playground':'park'];
 if(l==='farmland'||l==='orchard'||l==='farmyard')return ['agriculture','farmland'];
 if(t.shop==='mall')return ['mall','shopping'];
 if(l==='industrial'||b==='industrial'||b==='warehouse'||t.man_made==='works')return ['industrial',b==='warehouse'?'warehouse':'factory'];
 if(t.office==='government'||['townhall','courthouse','police','fire_station'].includes(a))return ['public','government'];
 if(t.office||b==='office'||l==='commercial')return ['office','office'];
 if(['museum','attraction','theme_park','gallery','zoo','aquarium'].includes(t.tourism))return ['tourism',t.tourism];
 if(['bar','pub','nightclub','karaoke'].includes(a))return ['commercial','night'];
 if(t.shop||['restaurant','cafe','fast_food','food_court','cinema','theatre'].includes(a)||t.tourism==='hotel'||l==='retail')return ['commercial',['restaurant','cafe','fast_food'].includes(a)?'dining':t.shop==='books'?'books':t.tourism==='hotel'?'hotel':'shopping'];
 if(l==='residential'||['apartments','residential','house','detached','dormitory'].includes(b))return ['residential',b==='dormitory'?'student':b==='apartments'?'apartments':'family'];
 return null;
 }
 const same=(a,b)=>a&&b&&Math.abs(a[0]-b[0])<1e-8&&Math.abs(a[1]-b[1])<1e-8;
 function join(parts){let remaining=parts.map(x=>x.slice()),rings=[];while(remaining.length){let r=remaining.shift(),changed=true;while(!same(r[0],r.at(-1))&&changed){changed=false;for(let i=0;i<remaining.length;i++){let p=remaining[i];if(same(r.at(-1),p[0]))r.push(...p.slice(1));else if(same(r.at(-1),p.at(-1)))r.push(...p.slice().reverse().slice(1));else if(same(r[0],p.at(-1)))r.unshift(...p.slice(0,-1));else if(same(r[0],p[0]))r.unshift(...p.slice().reverse().slice(0,-1));else continue;remaining.splice(i,1);changed=true;break;}}if(r.length>=4&&same(r[0],r.at(-1)))rings.push(r)}return rings}
 function geometry(e){const coords=a=>a?.filter(p=>Number.isFinite(p.lon)&&Number.isFinite(p.lat)).map(p=>[p.lon,p.lat]);if(e.type==='way'){let r=coords(e.geometry);return r?.length>=4&&same(r[0],r.at(-1))?{type:'Polygon',coordinates:[r]}:null}if(e.type!=='relation'||!e.members)return null;let outer=join(e.members.filter(m=>m.type==='way'&&m.role!=='inner').map(m=>coords(m.geometry)||[]).filter(a=>a.length)),inner=join(e.members.filter(m=>m.type==='way'&&m.role==='inner').map(m=>coords(m.geometry)||[]).filter(a=>a.length));if(!outer.length)return null;const M=typeof MapModel!=='undefined'?MapModel:require('./model.js');return {type:'MultiPolygon',coordinates:outer.map(o=>[o,...inner.filter(i=>M.inside(i[0],{type:'Polygon',coordinates:[o]}))])}}
 function parse(payload){if(!Array.isArray(payload?.elements)||payload.remark)throw Error('Overpass response incomplete');let out=[],seen=new Set();for(let e of payload.elements){let t=e.tags||{},c=classification(t);if(!c||t.disused==='yes'||t.abandoned==='yes'||t.construction)continue;let id='osm-'+e.type+'-'+e.id;if(seen.has(id))continue;seen.add(id);let g=geometry(e),bb=g?S.bounds(g):null,xy=e.type==='node'?[e.lon,e.lat]:bb?[(bb[0]+bb[2])/2,(bb[1]+bb[3])/2]:e.center?[e.center.lon,e.center.lat]:null;if(!xy?.every(Number.isFinite))continue;let size=g?S.area(g):0;out.push({id,name:t.name||t['name:ja']||c[1],type:c[0],subtype:c[1],xy,geometry:g,bbox:bb||S.box(xy,25),radius:25,area:size,tags:t,source:'OpenStreetMap',precision:g?'polygon':'point',openingHours:t.opening_hours||null})}return out}
 // Only the supported subset is interpreted; unknown expressions remain unknown, never "closed".
 function opening(value,t){if(!value)return null;if(value==='24/7')return true;if(value==='off'||value==='closed')return false;let days=['Su','Mo','Tu','We','Th','Fr','Sa'],result=false,matched=false;for(let rule of value.split(';')){let m=rule.trim().match(/^(?:(Mo|Tu|We|Th|Fr|Sa|Su)(?:-(Mo|Tu|We|Th|Fr|Sa|Su))?\s+)?(off|\d\d:\d\d-\d\d:\d\d(?:,\d\d:\d\d-\d\d:\d\d)*)$/);if(!m)return null;const active=d=>!m[1]||((d-days.indexOf(m[1])+7)%7)<=(m[2]?(days.indexOf(m[2])-days.indexOf(m[1])+7)%7:0);if(m[3]==='off'){if(active(t.dow)){matched=true;result=false}continue}for(let slot of m[3].split(',')){let [a,b]=slot.split('-').map(x=>{let [h,m]=x.split(':').map(Number);return h+m/60}),h=t.hf??t.h;if(b<a){if(active(t.dow)&&h>=a||active((t.dow+6)%7)&&h<b)result=true}else if(active(t.dow)&&h>=a&&h<b)result=true;matched=true}}return matched?result:null}
 return {classification,geometry,parse,opening};
})();
if(typeof module!=='undefined')module.exports=OSMProfile;
