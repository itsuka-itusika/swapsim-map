/* Place shown for a person: a specific facility or named place as is; otherwise the town (町名) and what kind of
   spot it is, e.g. 西新宿 自宅, 目黒区 職場, 銀座 市街地. Town names come from a 200 m grid of 国土地理院 reverse geocoding. */
const PlaceLabel=(()=>{
 let grid=null;
 function configure(data){let t=data?.towns;if(!t)return;grid={...t,map:new Map()};for(let k=0;k<t.cells.length;k+=3)grid.map.set(t.cells[k]+','+t.cells[k+1],t.names[t.cells[k+2]])}
 // Nearest grid cell within one step; 丁目 and numbers are dropped (西新宿二丁目 → 西新宿).
 function town(p){if(!grid&&typeof MAP_DATA!=='undefined')configure(MAP_DATA);if(!grid||!p)return null;let i=Math.round((p[0]-grid.lon0)/grid.dx),j=Math.round((p[1]-grid.lat0)/grid.dy);for(let [a,b] of [[0,0],[1,0],[-1,0],[0,1],[0,-1]]){let n=grid.map.get((i+a)+','+(j+b));if(n)return n}return null}
 const short=n=>n.replace(/[一二三四五六七八九十]+丁目$/,'').replace(/[0-9０-９]+丁目$/,'')||n;
 function generic(c){let lc=c.landComponent;if(c.facility||c.road||c.zone)return false;if(c.area)return true;if(!lc)return true;return ['zoning','fallback'].includes(lc.precision)||!lc.name||lc.name===c.region?.name||lc.name===lc.areaTag?.name}
 function kind(c,P){let r=c.role,state=P.sit?.state;if(c.resident||r==='general')return '自宅';if(/^area_(night|adult_customer)$/.test(r))return '繁華街';if(r==='area_office'||state==='work'||/_worker$|^mesh_|^urban_(?!visit)/.test(r))return c.landComponent?.type==='industrial'?(c.landComponent.subtype==='warehouse'?'倉庫':'工場'):'職場';if(/^area_student$/.test(r))return '学生街';let t=c.landComponent?.type;return t==='residential'?'住宅街':t==='office'?'オフィス街':t==='industrial'?'工業地帯':t==='green'?'緑地':'市街地'}
 function label(c,P,fallback){if(!generic(c))return fallback;let lc=c.landComponent,p=lc?.sampleXY||lc?.xy||c.area?.xy,t=town(p),where=c.area&&/^area_/.test(c.role)&&c.area.name?c.area.name:t?short(t):lc?.areaTag?.name||c.region?.name||fallback;return where+' '+kind(c,P)}
 return {configure,town,label,generic,kind};
})();
if(typeof module!=='undefined')module.exports=PlaceLabel;
