// Standalone review artifact. Compressed assets are embedded, with legacy mesh decoded only on demand.
import fs from 'node:fs';
import {gzipSync} from 'node:zlib';
await import('./build.mjs');
let html=fs.readFileSync('dist/map-preview.html','utf8');
const start=html.indexOf('<script>'),end=html.lastIndexOf('</script>');
let js=html.slice(start+8,end);
const match=js.match(/const MAP_DATA=(.*);\n/),data=JSON.parse(match[1]),legacy=data.mesh;
data.mesh=null;
js=js.replace(match[0],'const MAP_DATA='+JSON.stringify(data)+';\n');
// The map covers Tokyo wards. Preserve national/prefecture aggregates for engine fallbacks.
js=js.replace(/const REGIONAL_CENSUS = (.*);/,(_,text)=>{let all=JSON.parse(text),subset=Object.fromEntries(Object.entries(all).filter(([k])=>k.endsWith('000')||/^131(0[1-9]|1[0-9]|2[0-3])$/.test(k)));return 'const REGIONAL_CENSUS = '+JSON.stringify(subset)+';'});
const zip=text=>gzipSync(Buffer.from(text),{level:9}).toString('base64');
const legacyPayload=zip(JSON.stringify(legacy));
js=js.replace("'use strict';\nconst el=id",`let legacyLoading;async function loadLegacyMesh(){if(!legacyLoading)legacyLoading=decodeEmbedded('${legacyPayload}').then(text=>{MAP_DATA.mesh=JSON.parse(text)});return legacyLoading;}\n'use strict';\nconst el=id`);
const payload=zip(js);
const loader=`<script>
async function decodeEmbedded(b64){const bytes=Uint8Array.from(atob(b64),c=>c.charCodeAt(0));return new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))).text();}
(async()=>{try{if(typeof DecompressionStream==='undefined')throw Error('最新のChrome・Edge・Safariで開いてください。');const text=await decodeEmbedded(document.getElementById('runtime-data').textContent.trim());const script=document.createElement('script');script.textContent=text;document.body.appendChild(script);document.getElementById('runtime-data').remove();}catch(e){document.getElementById('status').textContent='起動できませんでした：'+e.message;console.error(e)}})();
</script><script type="application/octet-stream" id="runtime-data">${payload}</script>`;
// Put the data before its loader so the asynchronous bootstrap can read it immediately.
const split=loader.indexOf('</script>')+9;
const reordered=loader.slice(split)+loader.slice(0,split);
html=html.slice(0,start)+reordered+html.slice(end+9);
html=html.replace('検証版 2026-10-27 R5 ／ 土地タイプ別モデル','軽量確認版 ／ 土地タイプ別モデル');
fs.writeFileSync('dist/swapsim-map-light.html',html);
console.log('standalone light bytes',Buffer.byteLength(html),'previous bytes',fs.statSync('dist/map-preview.html').size);
