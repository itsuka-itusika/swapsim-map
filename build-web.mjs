// Build a static GitHub Pages site from the independent map source tree.
import fs from 'node:fs';
import {createHash} from 'node:crypto';
await import('./map-preview/build.mjs');
const html=fs.readFileSync('dist/map-preview.html','utf8'),start=html.indexOf('<script>'),end=html.lastIndexOf('</script>');
if(start<0||end<0)throw Error('Map runtime not found');
const runtime=html.slice(start+8,end),split=runtime.indexOf('// ===== 統計データ'),match=runtime.match(/const MAP_DATA=(.*);\n/);
if(split<0||!match)throw Error('Map data or engine boundary not found');
const data=JSON.parse(match[1]),legacy=data.mesh,legacyHash=createHash('sha256').update(JSON.stringify(legacy)).digest('hex').slice(0,12);data.mesh=null;
// The original engine's census data is retained for Japan/prefectures and all Tokyo wards.
let engine=runtime.slice(split,match.index).replace(/const REGIONAL_CENSUS = (.*);/,(_,text)=>{const all=JSON.parse(text),subset=Object.fromEntries(Object.entries(all).filter(([k])=>k.endsWith('000')||/^131(0[1-9]|1[0-9]|2[0-3])$/.test(k)));return 'const REGIONAL_CENSUS = '+JSON.stringify(subset)+';';});
let app=runtime.slice(match.index+match[0].length);
app=app.replace("'use strict';\nconst el=id",`let legacyLoading;async function loadLegacyMesh(){if(!legacyLoading)legacyLoading=fetch('assets/mesh-legacy.json?v=${legacyHash}').then(r=>{if(!r.ok)throw Error('旧メッシュの取得に失敗しました');return r.json()}).then(data=>{MAP_DATA.mesh=data});return legacyLoading;}\n'use strict';\nconst el=id`);
fs.mkdirSync('dist/assets',{recursive:true});
fs.writeFileSync('dist/assets/leaflet.js',runtime.slice(0,split));
fs.writeFileSync('dist/assets/engine.js',engine);
fs.writeFileSync('dist/assets/map-data.js','const MAP_DATA='+JSON.stringify(data)+';\n');
fs.writeFileSync('dist/assets/map-app.js',app);
fs.writeFileSync('dist/assets/mesh-legacy.json',JSON.stringify(legacy));
const tags=['leaflet.js','engine.js','map-data.js','map-app.js'].map(f=>{const v=createHash('sha256').update(fs.readFileSync('dist/assets/'+f)).digest('hex').slice(0,12);return `<script defer src="assets/${f}?v=${v}"></script>`}).join('\n');
fs.writeFileSync('dist/index.html',html.slice(0,start)+tags+html.slice(end+9));
console.log('Built dist/index.html and independent static assets');
