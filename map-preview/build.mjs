import {noticeTemplate,originalStyles,originalRuntime} from './original-ui.mjs';
import fs from 'node:fs';
import vm from 'node:vm';
const read=p=>fs.readFileSync(p,'utf8'),clean=s=>s.split('\n').filter(l=>!l.startsWith('if (typeof module')).join('\n');
let data=JSON.parse(read('map-preview/data/geography.json'));
const policy=JSON.parse(read('map-preview/data/school-sex.json'));
const policyContext=vm.createContext({});vm.runInContext(read('map-preview/school-policy.js')+';globalThis.policy=SchoolPolicy;',policyContext);
data.regions=data.regions.filter(f=>/^131(0[1-9]|1[0-9]|2[0-3])$/.test(f.id));
data.facilities=data.facilities.filter(f=>data.regions.some(r=>r.id===f.code));
const broadcast=[...JSON.parse(read('map-preview/data/broadcast.json')).facilities,...JSON.parse(read('map-preview/data/theme-parks.json')).facilities,...JSON.parse(read('map-preview/data/stations.json')).facilities];
for(let f of broadcast){let geoCtx=vm.createContext({});vm.runInContext(read('map-preview/model.js')+';globalThis.model=MapModel;',geoCtx);let r=geoCtx.model.locate(f.xy,data.regions);f.code=r?.id;}
data.facilities.push(...broadcast);
data.facilities=data.facilities.map(f=>policyContext.policy.apply(f,policy.records));
// 大手予備校 are listed as 各種学校 (kind college) in the school data; give them their own kind.
data.facilities=data.facilities.map(f=>f.kind==='college'&&/予備学校|予備校|河合塾|ゼミナール/.test(f.name)&&!/専門学校|学園/.test(f.name)?{...f,kind:'prep'}:f);
// Hospitals: beds, department families, emergency roles and type (P04). The footprint grows with the bed count.
const hospitals=JSON.parse(read('map-preview/data/hospitals.json')).hospitals;
data.facilities=data.facilities.map(f=>{let h=f.kind==='hospital'&&hospitals[f.id];if(!h)return f;return {...f,beds:h.b,depts:h.d,htype:h.t,er:h.er||0,disaster:h.dis||0,radius:Math.round(Math.min(170,Math.max(45,30+Math.sqrt(h.b||40)*4)))}});
const coverage={totalSchools:data.facilities.filter(f=>!['care','hospital','tv','radio','station','theme'].includes(f.kind)).length,classified:data.facilities.filter(f=>f.schoolPolicy).length,sourceBacked:data.facilities.filter(f=>f.schoolPolicy&&f.schoolPolicy.basis!=='name-inference').length,inferred:data.facilities.filter(f=>f.schoolPolicy?.basis==='name-inference').length};
fs.writeFileSync('map-preview/data/school-sex-coverage.json',JSON.stringify(coverage,null,2)+'\n');
console.log('school policy coverage',coverage);
let parts=['data.js','regional-data.js','texts.js','texts2.js','holiday-specials.js','work-specials.js','youth-social-specials.js','profile-situations.js'];
let bundle=parts.map(p=>clean(read(p))).join('\n')+'\nconst PROFILE_DATA='+read('stats/profiles.json')+';\n'+['engine.js','student-work-specials.js','rarity-weighting.js','hobby-model.js','profile-model.js','hobby-profile-detail.js'].map(p=>clean(read(p))).join('\n');
data.waters=JSON.parse(read('map-preview/data/water.json')).water;
data.landZones=JSON.parse(read('map-preview/data/land-zones.json')).zones;
data.greenZones=JSON.parse(read('map-preview/data/green-zones.json')).zones;
data.mesh=JSON.parse(read('map-preview/data/mesh-23.json'));
data.areas=JSON.parse(read('map-preview/data/areas.json')).areas;
data.zoning=JSON.parse(read('map-preview/data/zoning.json'));
data.policeStations=JSON.parse(read('map-preview/data/police-stations.json')).features;
data.specialPlaces=[...JSON.parse(read('map-preview/data/special-places.json')).features,...JSON.parse(read('map-preview/data/named-venues.json')).features,...JSON.parse(read('map-preview/data/hotels.json')).features,...JSON.parse(read('map-preview/data/cinemas.json')).features,...JSON.parse(read('map-preview/data/large-facilities.json')).features];
data.landmarks=JSON.parse(read('map-preview/data/landmarks.json')).features;
data.roads=JSON.parse(read('map-preview/data/roads.json')).roads;data.rails=JSON.parse(read('map-preview/data/rails.json')).rails;data.dietSchedule=JSON.parse(read('map-preview/data/diet-schedule.json'));
data.publicAreas=JSON.parse(read('map-preview/data/public-areas.json')).features;
data.osmSeeds=fs.existsSync('map-preview/data/osm-seeds.json')?JSON.parse(read('map-preview/data/osm-seeds.json')).entries:[];
const meshIndex=new Map(data.mesh.cells.map(c=>[c[0]+','+c[1],c]));
for(let f of data.facilities){let x=Math.floor((f.xy[0]-139)*111195*Math.cos(35.7*Math.PI/180)/100),y=Math.floor((f.xy[1]-35)*111195/100),c=meshIndex.get(x+','+y);if(!c)continue;let flag=['tv','radio'].includes(f.kind)?8:f.kind==='station'?16:f.kind==='theme'?32:f.kind==='hospital'?2:f.kind==='care'?4:1;c[8]=(c[8]||0)|flag;if(c[4]===0&&flag===1&&['university','college','high'].includes(f.kind))c[4]=1;}

const attrContext=vm.createContext({});for(let p of ['model.js','mesh-model.js','mesh-attributes.js'])vm.runInContext(read('map-preview/'+p),attrContext);attrContext.mesh=data.mesh;attrContext.districts=JSON.parse(read('map-preview/data/mesh-districts.json')).districts;vm.runInContext('MeshAttributes.enrich(mesh,districts)',attrContext);
data.storyScenes=JSON.parse(read('map-preview/data/story-scenes.json'));
data.venueSchedules=JSON.parse(read('map-preview/data/venue-schedules.json'));
data.specialSituations=JSON.parse(read('map-preview/data/special-situations.json'));
data.timeSituations=JSON.parse(read('map-preview/data/time-situations.json'));
// Keep original polygon geometry; mesh classifications are legacy comparison data only.

data.inbound=JSON.parse(read('map-preview/data/inbound.json'));
let extra='const MAP_DATA='+JSON.stringify(data)+';\n'+['school-policy.js','broadcast-model.js','special-facilities.js','model.js','land-model.js','green-model.js','area-model.js','visitor-situations.js','nightlife.js','subculture.js','mesh-model.js','mesh-attributes.js','urban-context.js','time-situations.js','spatial.js','osm-profile.js','profile-cache.js','land-profile.js','land-estimator.js','venue-audience.js','venue-schedule.js','venue-model.js','civic-model.js','prep-model.js','hospital-model.js','rail-model.js','lovehotel-model.js','diet-model.js','hotel-model.js','road-model.js','place-label.js','places-model.js','police-model.js','person-context.js','environment-scenes.js','job-labels.js','exam-schedule.js','map-weather.js','selection-cache.js','map-boot.js','adapter.js','app.js'].map(p=>p==='adapter.js'?originalRuntime+'\n'+clean(read('map-preview/'+p)):clean(read('map-preview/'+p))).join('\n');
let template=read('map-preview/index.html').replace('<!--ORIGINAL_NOTICE-->',()=>noticeTemplate).replace('/* ORIGINAL_STYLES */',()=>originalStyles);let scripts='<script>'+read('map-preview/vendor/leaflet.js')+'\n'+bundle+'\n'+extra+'<\/script>';
let html=template.replace('<link rel="stylesheet" href="vendor/leaflet.css">','<style>'+read('map-preview/vendor/leaflet.css')+'</style>').replace('<!--SCRIPTS-->',()=>scripts);
fs.mkdirSync('dist',{recursive:true});fs.writeFileSync('dist/map-preview.html',html);console.log('dist/map-preview.html',Buffer.byteLength(html));

fs.writeFileSync('dist/map-preview-20261027-areas.html',html);

fs.writeFileSync('dist/map-preview-20261027-nightlife.html',html);

fs.writeFileSync('dist/map-preview-20261027-nightlife-v2.html',html);

fs.writeFileSync('dist/map-preview-20261027-subculture.html',html);

fs.writeFileSync('dist/map-preview-20261027-green.html',html);

fs.writeFileSync('dist/map-preview-20261027-landwater.html',html);

fs.writeFileSync('dist/map-preview-swapsim-ui.html',html);

fs.writeFileSync('dist/map-preview-tokyo23-100m.html',html);

fs.writeFileSync('dist/map-preview-20261027-r3-forest-fix.html',html);

fs.writeFileSync('dist/map-preview-20261027-r4-districts.html',html);

