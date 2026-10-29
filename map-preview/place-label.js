/* Place shown for a person: a specific facility or named place as is; otherwise the district (or ward), with 自宅 for
   people at home and 職場 for people at work (西新宿 自宅, 目黒区 職場, 銀座). No extra data is loaded for this. */
const PlaceLabel=(()=>{
 function generic(c){let lc=c.landComponent;if(c.facility||c.road||c.zone)return false;if(c.area)return true;if(!lc)return true;return ['zoning','fallback'].includes(lc.precision)||!lc.name||lc.name===c.region?.name||lc.name===lc.areaTag?.name}
 function kind(c,P){let r=c.role,state=P.sit?.state;if(c.resident||r==='general')return '自宅';if(r==='area_office'||state==='work'||/_worker$|^mesh_|^urban_(?!visit)/.test(r))return '職場';return ''}
 function label(c,P,fallback){if(!generic(c))return fallback;let lc=c.landComponent,where=c.area&&/^area_/.test(c.role)&&c.area.name?c.area.name:lc?.areaTag?.name||c.region?.name||fallback;let k=kind(c,P);return k?where+' '+k:where}
 return {label,generic,kind};
})();
if(typeof module!=='undefined')module.exports=PlaceLabel;
