const fs=require('fs'),O=require('./osm-profile.js'),S=require('./spatial.js'),M=require('./model.js');
const payload=JSON.parse(fs.readFileSync('/tmp/swapsim-public-elements.json'));
for(let e of payload.elements){if(/^(?:中央合同庁舎|外務省|財務省|経済産業省|旧文部省|内閣府庁舎|法務省旧本館)/.test(e.tags.name))e.tags.office='government';}
payload.elements=payload.elements.filter(e=>!/内閣総理大臣公邸|JICA|保健センター|住区センター|法務省旧本館/.test(e.tags.name));
const regions=JSON.parse(fs.readFileSync('map-preview/data/geography.json')).regions.filter(r=>/^131(0[1-9]|1[0-9]|2[0-3])$/.test(r.id));
let features=O.parse(payload).filter(f=>f.geometry&&f.area>80&&(['prison','detention','military','government','parliament'].includes(f.subtype))&&regions.some(r=>S.intersects(r.bbox,f.bbox)));
for(let f of features){if(f.type==='public')f.civicKind=f.subtype;f.source='OpenStreetMap API / '+f.id;f.retrievedAt='2026-10-27';f.officialSource=f.subtype==='military'?'https://www.mod.go.jp/gsdf/eae/about/east_camp.html':f.subtype==='detention'?'https://www.moj.go.jp/kyousei1/kyousei05_00113.html':f.subtype==='parliament'?'https://www.shugiin.go.jp/internet/itdb_annai.nsf/html/statics/kokkaimap.htm':undefined;if(f.subtype==='detention')f.modeledOccupancy=1800;}
fs.writeFileSync('map-preview/data/public-areas.json',JSON.stringify({version:1,license:'Open Database License 1.0',attribution:'© OpenStreetMap contributors',notes:'Public OSM footprints. Tokyo 23 wards only at runtime, including clipped cross-boundary camps. Occupancy and demographics are explicit game assumptions, not actual rosters. Prison engine supported; no adult prison footprint has been invented within the 23 wards. Not an exhaustive inventory.',features})+'\n');
console.log(features.map(f=>({name:f.name,kind:f.civicKind,xy:f.xy,area:Math.round(f.area)})));
