/* Source records and explicit, auditable name-inference records. */
const SchoolPolicy=(()=>{
 function normalize(s){return s.normalize('NFKC').replace(/[\s・･]/g,'').replace(/髙/g,'高').replace(/﨑/g,'崎').replace(/麴/g,'麹').replace(/鷗/g,'鴎').replace(/高校/g,'高等学校').replace(/(?:高等学校|高等部|高等科|中学校|中学部|中等科|小学校|小学部)$/,'').replace(/学校$/,'')}
 function match(f,records){let nameKind=/(?:小学校|小学部)$/.test(f.name)?'primary':/(?:中学校|中学部|中等科)$/.test(f.name)?'middle':/(?:高等学校|高校|高等部|高等科)$/.test(f.name)?'high':null;if(nameKind&&nameKind!==f.kind)return null;let names=[normalize(f.name)];let candidates=records.filter(r=>r.pref===f.code.slice(0,2)&&r.kind===f.kind&&[r.name,...(r.aliases||[])].some(n=>names.includes(normalize(n))));if(candidates.length>1&&!candidates.some(r=>r.basis==='source'||r.wikiList)&&new Set(candidates.map(r=>r.sex)).size>1)throw Error('Conflicting school policy: '+f.name);return candidates.find(r=>r.wikiList)||candidates.find(r=>r.basis==='source')||candidates.find(r=>r.basis==='secondary')||candidates.find(r=>!r.basis)||candidates[0]||null}
 function apply(f,records){let p=match(f,records);return {...f,sex:p?.sex||'unknown',schoolPolicy:p||null}}
 function femaleRate(f,t){let p=f.schoolPolicy,date=`${t.y}-${String(t.mo).padStart(2,'0')}-${String(t.d).padStart(2,'0')}`;if(p?.validFrom&&date<p.validFrom)return .5;return f.sex==='female'?1:f.sex==='male'?0:Number.isFinite(f.femaleRatio)?f.femaleRatio:.5}
 function label(f){return {female:'女子校',male:'男子校',coed:'共学校',mixed:'男女別学・一部共学',unknown:'男女区分未確認'}[f.sex]+(f.schoolPolicy?.basis==='name-inference'?'（名称推定）':'')||'男女区分未確認'}
 return {normalize,match,apply,femaleRate,label};
})();
if(typeof module!=='undefined')module.exports=SchoolPolicy;

