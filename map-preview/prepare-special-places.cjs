/* Offline OSM geometry from bounded extracts; named sites, not exhaustive. */
const fs=require('fs'),O=require('./osm-profile.js'),S=require('./spatial.js'),M=require('./model.js');
const data=JSON.parse(fs.readFileSync('/tmp/swapsim-places.json','utf8')),regions=JSON.parse(fs.readFileSync('map-preview/data/geography.json')).regions.filter(r=>/^131(0[1-9]|1[0-9]|2[0-3])$/.test(r.id));
let features=[];
for(let e of data.elements){let t=e.tags||{},name=t['name:ja']||t.name||'',kind=null;
 if(t.amenity==='place_of_worship'||t.building==='shrine'||t.building==='temple'||t.landuse==='religious'){if(t.religion==='shinto'||/神社|神宮|稲荷/.test(name))kind='shrine';else if(t.religion==='buddhist'||/寺|大師/.test(name))kind='temple'}
 if(['mall','department_store'].includes(t.shop))kind='mall';
 if(/^(東京スカイツリー|東京タワー)$/.test(name))kind='observation';
 if(/^(六本木ヒルズ|六本木ヒルズ森タワー|渋谷ヒカリエ|東京ミッドタウン|東京ミッドタウン八重洲|サンシャインシティ|東京ソラマチ|渋谷スクランブルスクエア)$/.test(name))kind='complex';
 if(!kind)continue;
 let geometry=O.geometry(e);if(!geometry)continue;let area=S.area(geometry);if(area<80||area>250000)continue;
 let bbox=S.bounds(geometry),xy=[(bbox[0]+bbox[2])/2,(bbox[1]+bbox[3])/2];if(!regions.some(r=>S.intersects(r.bbox,bbox)))continue;
 if(!M.inside(xy,geometry)){let r=Math.max((bbox[2]-bbox[0])*90000,(bbox[3]-bbox[1])*111195);xy=S.samples(xy,r,2048).find(p=>M.inside(p,geometry))||xy}
 let aliases=name==='タカシマヤタイムズスクエア'?['新宿高島屋','高島屋']:name==='神田明神'?['神田神社']:[];features.push({aliases,id:'place-'+e.type+'-'+e.id,name,xy,bbox,geometry,area,type:kind==='shrine'||kind==='temple'?'religious':kind==='observation'?'tourism':'mall',subtype:kind,placeKind:kind,source:'OpenStreetMap',precision:'polygon',tags:t});
}
// Avoid relation/way duplicates of the same footprint without suppressing distinct buildings.
features=features.filter((f,i,a)=>!a.some((g,j)=>j!==i&&f.name===g.name&&f.id.includes('-way-')&&g.id.includes('-relation-')&&Math.abs(f.area-g.area)<g.area*.15));
// The main worship precinct is a conservative approximation inside the forest, not the whole wooded grounds.
let xy=[139.6993,35.6764],radius=55;features.push({id:'place-meiji-sanctuary',name:'明治神宮（社殿付近）',xy,radius,bbox:S.box(xy,radius),area:Math.PI*radius*radius,type:'religious',subtype:'shrine',placeKind:'shrine',source:'明治神宮公式案内・社殿付近の概略円',precision:'modeled-footprint'});
fs.writeFileSync('map-preview/data/special-places.json',JSON.stringify({version:1,source:'https://api.openstreetmap.org/api/0.6/map',license:'Open Database License 1.0',attribution:'© OpenStreetMap contributors',notes:'Named polygon extracts around selected sites in Tokyo 23 wards; not exhaustive. Meiji Jingu shrine core is an approximate 55m circle, keeping surrounding forest separate. Occupancy is modeled.',features})+'\n');
console.log('special places',features.length);console.log(features.filter(x=>/六本木ヒルズ|ヒカリエ|スカイツリー|ソラマチ|東京タワー|明治神宮|浅草寺|靖国神社|神田明神|神田神社|浅草神社|築地本願寺|根津神社|日枝神社|西新井大師|サンシャイン|ららぽーと|GINZA SIX/.test(x.name)).map(x=>x.name+' '+x.placeKind+' '+Math.round(x.area)));
