/* Place shown for a person: a specific facility or named place as is; otherwise the district (or ward) and what kind
   of spot it is, e.g. 西新宿 自宅, 目黒区 職場, 銀座 市街地. No extra data is loaded for this. */
const PlaceLabel=(()=>{
 function generic(c){let lc=c.landComponent;if(c.facility||c.road||c.zone)return false;if(c.area)return true;if(!lc)return true;return ['zoning','fallback'].includes(lc.precision)||!lc.name||lc.name===c.region?.name||lc.name===lc.areaTag?.name}
 function kind(c,P){let r=c.role,state=P.sit?.state;if(c.resident||r==='general')return '自宅';if(/^area_(night|adult_customer)$/.test(r))return '繁華街';if(r==='area_office'||state==='work'||/_worker$|^mesh_|^urban_(?!visit)/.test(r))return c.landComponent?.type==='industrial'?(c.landComponent.subtype==='warehouse'?'倉庫':'工場'):'職場';if(/^area_student$/.test(r))return '学生街';let t=c.landComponent?.type;return t==='residential'?'住宅街':t==='office'?'オフィス街':t==='industrial'?'工業地帯':t==='green'?'緑地':'市街地'}
 function label(c,P,fallback){if(!generic(c))return fallback;let lc=c.landComponent,where=c.area&&/^area_/.test(c.role)&&c.area.name?c.area.name:lc?.areaTag?.name||c.region?.name||fallback;return where+' '+kind(c,P)}
 return {label,generic,kind};
})();
if(typeof module!=='undefined')module.exports=PlaceLabel;
