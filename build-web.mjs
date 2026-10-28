// Build a static GitHub Pages site from the independent map source tree.
import fs from 'node:fs';
import {createHash} from 'node:crypto';
await import('./map-preview/build.mjs');
const html=fs.readFileSync('dist/map-preview.html','utf8'),start=html.indexOf('<script>'),end=html.lastIndexOf('</script>');
if(start<0||end<0)throw Error('Map runtime not found');
const runtime=html.slice(start+8,end),split=runtime.indexOf('// ===== 統計データ'),match=runtime.match(/const MAP_DATA=(.*);\n/);
if(split<0||!match)throw Error('Map data or engine boundary not found');
const data=JSON.parse(match[1]),legacy=data.mesh,legacyHash=createHash('sha256').update(JSON.stringify(legacy)).digest('hex').slice(0,12);data.mesh=null;
// Lakes outside the map bounds can never intersect a selection; drop them from the published payload.
const [west,south,east,north]=[139.48,35.48,139.94,35.86];
data.waters=data.waters.filter(({bbox:[x0,y0,x1,y1]})=>x1>=west&&x0<=east&&y1>=south&&y0<=north);
// Published longitude/latitude keep 6 decimal places (about 0.1 m); other numbers are unchanged.
const coordinate=v=>typeof v==='number'&&(v>=138&&v<=141||v>=34&&v<=37);
const roundCoordinates=(_,v)=>Array.isArray(v)&&v.length>=2&&v.every(coordinate)?v.map(x=>Math.round(x*1e6)/1e6):v;
// The original engine's census data is retained for Japan/prefectures and all Tokyo wards.
let engine=runtime.slice(split,match.index).replace(/const REGIONAL_CENSUS = (.*);/,(_,text)=>{const all=JSON.parse(text),subset=Object.fromEntries(Object.entries(all).filter(([k])=>k.endsWith('000')||/^131(0[1-9]|1[0-9]|2[0-3])$/.test(k)));return 'const REGIONAL_CENSUS = '+JSON.stringify(subset)+';';});
// Map-generated people always use a Tokyo ward; retain its prefecture and national fallbacks.
const retainTokyo=rows=>Object.fromEntries(Object.entries(rows).filter(([code])=>code==='00000'||code==='13000'||/^131(0[1-9]|1[0-9]|2[0-3])$/.test(code)));
engine=engine.replace(/const PROFILE_DATA=(.*)\n?;\n/,(_,text)=>{
 const profile=JSON.parse(text);
 for(const key of ['family','familyExact','children','singleParentChildren','singleParentTotals','regions'])profile[key]=retainTokyo(profile[key]);
 for(const key of Object.keys(profile.childCountMeans))profile.childCountMeans[key]=retainTokyo(profile.childCountMeans[key]);
 for(const key of Object.keys(profile.siblingsOnly))profile.siblingsOnly[key]=retainTokyo(profile.siblingsOnly[key]);
 return 'const PROFILE_DATA='+JSON.stringify(profile)+';\n';
});
let app=runtime.slice(match.index+match[0].length);
// The map is drawn as soon as Leaflet arrives, while engine and map data are still downloading.
let leaflet=runtime.slice(0,split);
for(const file of ['selection-cache.js','map-boot.js']){const text=fs.readFileSync('map-preview/'+file,'utf8').split('\n').filter(l=>!l.startsWith('if (typeof module')).join('\n');if(!app.includes(text))throw Error(file+' not found in map runtime');app=app.replace(text,'');leaflet+='\n'+text;}
leaflet+="\n{let storage=null;try{storage=localStorage}catch{}const s=SelectionCache.load(storage);MapBoot.create(s.point,s.radius);MapBoot.step(1)}\n";
engine+="\nif(typeof MapBoot!=='undefined')MapBoot.step(2);\n";
app=app.replace("'use strict';\nconst el=id",`let legacyLoading;async function loadLegacyMesh(){if(!legacyLoading)legacyLoading=fetch('assets/mesh-legacy.json?v=${legacyHash}').then(r=>{if(!r.ok)throw Error('旧メッシュの取得に失敗しました');return r.json()}).then(data=>{MAP_DATA.mesh=data});return legacyLoading;}\n'use strict';\nconst el=id`);
fs.mkdirSync('dist/assets',{recursive:true});
fs.writeFileSync('dist/assets/leaflet.js',leaflet);
fs.writeFileSync('dist/assets/engine.js',engine);
fs.writeFileSync('dist/assets/map-data.js','const MAP_DATA='+JSON.stringify(data,roundCoordinates)+';\nif(typeof MapBoot!=="undefined")MapBoot.step(3);\n');
fs.writeFileSync('dist/assets/map-app.js',app);
fs.writeFileSync('dist/assets/mesh-legacy.json',JSON.stringify(legacy));
const tags=['leaflet.js','engine.js','map-data.js','map-app.js'].map(f=>{const v=createHash('sha256').update(fs.readFileSync('dist/assets/'+f)).digest('hex').slice(0,12);return `<script defer src="assets/${f}?v=${v}"></script>`}).join('\n');
fs.writeFileSync('dist/index.html',html.slice(0,start)+tags+html.slice(end+9));
console.log('Built dist/index.html and independent static assets');
