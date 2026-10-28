/* Reuse original dated/weather entries only where their activity fits the selected map role. */
const EnvironmentScenes=(()=>{
 const conditioned=e=>Array.isArray(e)&&e[3]&&['wx','sakura','koyo','ev','md','m','hol','holn'].some(k=>e[3][k]);
 function category(c){let r=c.role;
  if(['green_walk','green_tourist'].includes(r))return 'park';
  if(['place_shrine_guest','place_temple_guest'].includes(r))return 'shrine';
  if(['place_shop_guest','area_shopping'].includes(r))return 'shopping';
  if(['area_tourist','area_inbound','urban_visit'].includes(r))return 'visitor';
  if(r==='special_passenger')return 'station';
  if(r==='venue_grave')return 'grave';
  if(r==='student')return 'school';
  if(['area_office','teacher','nurse','doctor','care','mesh_factory','mesh_logistics','mesh_security','green_gardener','green_parkguard','place_shop_staff','place_food_staff','place_office_staff','place_security','place_clean','special_station','special_crew','special_station_clean','special_station_shop','special_theme_food','special_theme_shop','special_theme_clean','special_theme_security','venue_security','venue_clean'].includes(r))return 'work';
  return null;
 }
 const patterns={park:/公園|桜|花見|お花見|花びら|イチョウ|紅葉|散歩|歩いて/,shrine:/初詣|神社|寺|参拝|おみくじ|絵馬|三社祭/,shopping:/買い物|買物|店先|商店街|ショッピング|初売り|福袋/,visitor:/観光|街並み|三社祭|桜並木|初詣|神社|参拝|商店街|花見|お花見/,station:/駅|改札|ホーム|電車/,grave:/墓参り|お墓参り|墓前/,school:/教室|授業|学校|校庭|登校|先生|給食|学食|講義|ゼミ/,work:/職場|仕事|勤務|作業|会社|学校|園内|店|患者|工場|倉庫|配送|警備/};
 function ctxFor(P,t){let hol=holName(t),brk=isBreak(t),vacP=P.occ.group==='college'?univVac(t):P.occ.school||P.occ.en==='yochi'?schoolVac(t):false;return {P,t,h:t.hf??t.h,we:t.dow===0||t.dow===6||!!hol||brk,hol,brk,mo:t.mo,vacP,vac:vacP,season:seasonOf(t.mo),wx:wxOf(P.pref,t),eq:eqOf(P.pref,t)}}
 function compatible(e,c,P,kind){let o=e[3]||{},text=textOf(e),p=c.landComponent?.sampleXY||c.landComponent?.xy||c.area?.xy;
  if(!patterns[kind].test(text))return false;
  if(/自宅|家で|自分の部屋|友達の部屋|実家|マンション|ベランダ|窓から|テレビで|テレビを|録画|宿泊先|帰宅後|バスツアー|山で|山へ/.test(text))return false;
  if(o.at&&((o.at[0]&&o.at[0]!==P.pref.n)||(o.at[1]&&o.at[1]!==P.muni.n)))return false;
  if(o.ev&&[].concat(o.ev).includes('sanja')&&(!p||MapModel.distance(p,[139.7967,35.7148])>800))return false;
  // A city's event or venue is not automatically happening at every point in that city.
  if(o.at||o.ev&&[].concat(o.ev).some(x=>/tokyoBayFireworks|doujin.*Day|nihonS_venue/.test(x)))return false;
  if(kind==='park'&&/神社|境内|駅|店内|商店街|学校|教室|キャンパス|大学|サークル|庭に|花火大会|夏祭り/.test(text))return false;
  if(kind==='shrine'&&/店先|店内|自宅|家で/.test(text))return false;
  if(kind==='station'&&/通勤|通学|出勤|退勤|出社|仕事帰り|学校帰り|登校|下校/.test(text))return false;
  if(kind==='school'&&/帰宅|通学|通勤|下校|自宅|放課後に外/.test(text))return false;
  if(kind==='work'&&/帰宅|通勤|帰り道|休みの日|休暇|自宅/.test(text))return false;
  return true;
 }
 function candidates(c,P,t){let kind=category(c);if(!kind)return [];let ctx=ctxFor(P,t),pool=[];
  if(kind==='school'){let stage=c.facility?.kind;pool=stage==='university'||stage==='college'?(OFF_TX.college||[]):stage==='primary'?(SCHOOL_TX.elem||[]):(SCHOOL_TX.teen||[]);}
  else if(kind==='work'){let tag=P.occ.tag||({green_gardener:'garden',green_parkguard:'security',place_shop_staff:'retail',place_food_staff:'food',place_office_staff:'office',place_security:'security',place_clean:'clean',venue_security:'security',venue_clean:'clean'})[c.role];pool=WORK_TX[tag]||[];}
  else{pool=[...(typeof evPoolOf==='function'?evPoolOf(P.occ.group):[]),...(OFF_TX[P.occ.group]||OFF_TX.adult||[])];}
  let seen=new Set();return pool.filter(e=>{if(!conditioned(e)||!entryOK(e,ctx)||!compatible(e,c,P,kind))return false;let text=textOf(e);if(seen.has(text))return false;seen.add(text);return true});
 }
 function apply(c,P,t){let pool=candidates(c,P,t);if(!pool.length)return false;let ctx=ctxFor(P,t),event=pool.filter(e=>e[3].sh!=null),other=pool.filter(e=>e[3].sh==null),groups=new Map();for(let e of event){let o=e[3],k=[].concat(o.ev||o.sakura||o.koyo||o.moon||o.sun)[0],g=groups.get(k)||{share:0,entries:[]};g.share=Math.max(g.share,evShareOf(e,ctx));g.entries.push(e);groups.set(k,g)}let keys=[...groups.keys()],chance=Math.min(.6,keys.reduce((s,k)=>s+groups.get(k).share,0)),chosen=null;if(chance>0&&rnd()<chance){let k=pickW(keys,k=>groups.get(k).share).v;chosen=fromPool(groups.get(k).entries,ctx)}else if(other.length&&rnd()<.18)chosen=fromPool(other,ctx);if(!chosen)return false;let text=fillText(textOf(chosen.e),P);P.mapSituation=text;P.sit={...P.sit,text,tpl:textOf(chosen.e),cond:chosen.e[3],source:'swapsim-environment',p:chosen.p||1};return true;}
 return {category,candidates,apply};
})();
if(typeof module!=='undefined')module.exports=EnvironmentScenes;
