/* Store labels: preserve branch metadata and resolve old short labels against nearby named records. */
const StoreNames=(()=>{
 const chains=['コジマ×ビックカメラ','ビックカメラ','ヨドバシカメラ','ヤマダデンキ','ヤマダ電機','LABI','ノジマ','ケーズデンキ','エディオン','紀伊國屋書店','紀伊国屋書店','ジュンク堂書店','三省堂書店','八重洲ブックセンター','有隣堂','丸善','高島屋','小田急百貨店','京王百貨店','三越','伊勢丹','松坂屋','マルイ','無印良品','ダイソー','イオンスタイル','イオンフードスタイル','イオンタウン','アトレ','アトレヴィ','atre vie','PARCO','パルコ','NeWoMan','ニュウマン'];
 const key=s=>String(s||'').normalize('NFKC').toLowerCase().replace(/[\s・･×✕+＋]/g,'');
 const short=s=>chains.some(c=>key(c)===key(s));
 function clean(s){s=String(s||'').trim();for(const c of chains)while(s.startsWith(c+c))s=s.slice(c.length);return s}
 function fromTags(t={},fallback=''){
  let name=clean(t['name:ja']||t.name||t['brand:ja']||t.brand||fallback),branch=clean(t['branch:ja']||t.branch);
  const official=clean(t['official_name:ja']||t.official_name);
  if(short(name)&&official&&!short(official)&&key(official).includes(key(name)))name=official;
  if(branch&&!key(name).includes(key(branch).replace(/店$/,'')))name=key(branch).includes(key(name))?branch:name+' '+branch;
  return name;
 }
 function distance(a,b){const rad=Math.PI/180,dx=(a[0]-b[0])*Math.cos((a[1]+b[1])/2*rad),dy=a[1]-b[1];return Math.hypot(dx,dy)*111195}
 function resolve(feature,refs=[]){
  if(!feature)return '';
  const raw=clean(feature.name),tagged=fromTags(feature.tags,raw);
  let name=raw&&!short(raw)?raw:tagged;
  if(!short(name)||!feature.xy)return name;
  const candidates=refs.filter(r=>r.xy&&r.name&&!short(r.name)&&(key(r.name).includes(key(name))||(r.aliases||[]).some(a=>key(a)===key(name)))&&distance(feature.xy,r.xy)<=45).map(r=>({r,d:distance(feature.xy,r.xy)})).sort((a,b)=>a.d-b.d);
  if(candidates.length&&(!candidates[1]||key(candidates[0].r.name)===key(candidates[1].r.name)||candidates[1].d-candidates[0].d>=10))return candidates[0].r.name;
  return name;
 }
 return {fromTags,resolve,short,clean,key};
})();
if(typeof module!=='undefined')module.exports=StoreNames;
