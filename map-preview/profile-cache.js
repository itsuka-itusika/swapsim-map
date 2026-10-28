/* Cache spatial evidence, never time-dependent population or a fixed cell personality. */
const ProfileCache=(()=>{
 const S=typeof MapSpatial!=='undefined'?MapSpatial:require('./spatial.js'),O=typeof OSMProfile!=='undefined'?OSMProfile:require('./osm-profile.js');
 const VERSION=2,TTL=7*86400000,KEY='swapsim-land-profiles-v2',ENDPOINT='https://overpass-api.de/api/interpreter';
 function query(b){const bb=[b[1],b[0],b[3],b[2]].map(n=>n.toFixed(6)).join(',');return `[out:json][timeout:20][maxsize:33554432];(nwr[amenity](${bb});nwr[shop](${bb});nwr[office](${bb});nwr[leisure](${bb});nwr[landuse](${bb});nwr[military](${bb});nwr[natural~"^(wood|water)$"](${bb});nwr[tourism](${bb});nwr[railway=station](${bb});nwr[public_transport=station](${bb});nwr[building~"^(apartments|residential|house|detached|dormitory|office|industrial|warehouse)$"](${bb});)->.nearby;is_in(${((b[1]+b[3])/2).toFixed(6)},${((b[0]+b[2])/2).toFixed(6)})->.containing;(.nearby;way(pivot.containing)[landuse];rel(pivot.containing)[landuse];way(pivot.containing)[leisure];rel(pivot.containing)[leisure];way(pivot.containing)[natural];rel(pivot.containing)[natural];way(pivot.containing)[amenity~"^(school|university|college|hospital|prison)$"];rel(pivot.containing)[amenity~"^(school|university|college|hospital|prison)$"];);out tags geom;`}
 const encloses=(b,a)=>b[0]<=a[0]&&b[1]<=a[1]&&b[2]>=a[2]&&b[3]>=a[3];
 function create({storage=null,fetcher=globalThis.fetch,now=Date.now,seeds=[]}={}){let entries=[],pending=null,blockedUntil=0;
 try{let v=JSON.parse(storage?.getItem(KEY)||'null');if(v?.version===VERSION&&Array.isArray(v.entries))entries=v.entries.filter(e=>Array.isArray(e.features)&&e.features.length<=30000&&e.bbox?.length===4&&Number.isFinite(e.savedAt))}catch{}
 entries.push(...seeds.filter(e=>Array.isArray(e.features)&&e.bbox?.length===4));
 function peek(p,r){let b=S.box(p,r),matches=entries.filter(e=>encloses(e.bbox,b)).sort((a,b)=>b.savedAt-a.savedAt),e=matches[0];return e?{...e,stale:now()-e.savedAt>TTL,status:now()-e.savedAt>TTL?'stale':'cache'}:null}
 function persist(){try{let keep=entries.slice(0,12);while(keep.length&&JSON.stringify(keep).length>2500000)keep.pop();storage?.setItem(KEY,JSON.stringify({version:VERSION,entries:keep}))}catch{}}
 async function get(p,r){if(!p?.every(Number.isFinite)||!Number.isFinite(r)||r<=0||r>2000)throw Error('Invalid profile radius');let old=peek(p,r);if(old&&!old.stale)return old;if(now()<blockedUntil)return {...old,features:old?.features||[],status:old?'stale':'unavailable'};
 if(pending){await pending.promise.catch(()=>{});let hit=peek(p,r);if(hit&&!hit.stale)return hit;return get(p,r)}
 const center=p.map(n=>Math.round(n*200)/200),R=Math.ceil((r+350)/500)*500,bbox=S.box(center,R),controller=new AbortController(),timer=setTimeout(()=>controller.abort(),24000);
 const promise=(async()=>{try{let response=await fetcher(ENDPOINT,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:'data='+encodeURIComponent(query(bbox)),signal:controller.signal});if(!response.ok)throw Error('Overpass '+response.status);let payload=await response.json(),features=O.parse(payload);let e={bbox,features,savedAt:now(),source:'OpenStreetMap / Overpass',osmTimestamp:payload.osm3s?.timestamp_osm_base};entries.unshift(e);entries=entries.slice(0,16);persist();return {...e,status:'live',stale:false}}catch(e){blockedUntil=now()+60000;return {...old,features:old?.features||[],status:old?'stale':'unavailable',error:e.message}}finally{clearTimeout(timer);pending=null}})();pending={promise,bbox};return promise;
 }
 return {get,peek};}
 return {create,query,TTL,VERSION};
})();
if(typeof module!=='undefined')module.exports=ProfileCache;
