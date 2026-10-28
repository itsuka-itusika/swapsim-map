// Pilot model: household person counts are observed; hobby cross-region rates are estimates.
let PROFILE_ENABLED = true;
let PROFILE_REGIONAL = true;
const PROFILE_CLAMP = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
function profileCode(P) {
 if(!PROFILE_REGIONAL)return '00000';
 const code=P.censusCode || P.muni.code;
 return PROFILE_DATA.family[code] ? code : PROFILE_DATA.family[P.pref.code] ? P.pref.code : '00000';
}
function familyCell(P, code=profileCode(P)) {
 const age=Math.min(100,Math.floor(P.age/5)*5),exact=Math.min(100,P.age);
 const candidates=[code,code.slice(0,2)+'000','00000'];
 for(const region of [...new Set(candidates)]){
  const single=PROFILE_DATA.familyExact?.[region]?.[P.sex+':'+exact];
  const grouped=PROFILE_DATA.family[region]?.[P.sex+':'+age];
  const row=single || grouped;
  if(row?.total?.some(n=>n>0))return {...row,sourceCode:region,exact:!!single};
 }
 throw Error('Missing household cell');
}
function familyDistribution(P,code) {
 const row=familyCell(P,code);const v=row.total;const total=v.reduce((a,b)=>a+b,0);
 return v.map(x=>x/total);
}
function hobbyRates(P,regional=true) {
 if(P.age<10)return [];
 const h=PROFILE_DATA.hobby;
 const low=Math.min(75,Math.floor(P.age/5)*5);
 const label=low===75?'75歳以上':`${low}～${low+4}歳`;
 const row=h.age[P.sex][label];
 if(!row)throw Error('No hobby age cell: '+label);
 const nat=h.pref[P.sex]['00000'];const pref=h.pref[P.sex][P.pref.code] || nat;
 return row.map((base,i)=>{
  // Prefecture marginals retain age-composition confounding; attenuate and bound correction.
  const factor=regional&&nat[i]>0?PROFILE_CLAMP(Math.sqrt(pref[i]/nat[i]),2/3,1.5):1;
  return {i,label:h.labels[i],base,regional:pref[i],factor,rate:PROFILE_CLAMP(base*factor,0,100)};
 });
}
function assignProfiles(P) {
 if(!PROFILE_ENABLED)return;
 if(['facility','prison'].includes(P.occ.group)){
  P.household={label:'施設等の世帯（一般世帯統計の対象外）',marital:'未抽選',code:null};
  P.hobbies=[];return;
 }
 const code=profileCode(P),cell=familyCell(P),dist=familyDistribution(P);
 const f=pickW(dist.map((p,i)=>({p,i})),x=>x.p);
 const i=f.v.i;
 const weights=['single','married','former'].map(k=>({k,v:cell[k]?.[i]||0}));
 const known=weights.reduce((a,b)=>a+b.v,0);
 weights.push({k:'unknown',v:Math.max(0,cell.total[i]-known)});
 const mar=pickW(weights,x=>x.v)?.v.k || 'unknown';
 P.household={i,sourceCode:cell.sourceCode,ageResolution:cell.exact?'single':'five-year',label:PROFILE_DATA.familyLabels[i],marital:({single:'未婚',married:'有配偶',former:'死別・離別',unknown:P.age<15?'15歳未満（配偶関係の集計対象外）':'配偶関係不詳'})[mar],mar,code,p:f.p};
 if(i===5){
  const key=P.sex+':'+(cell.exact?P.age:Math.min(100,Math.floor(P.age/5)*5));
  const detail=PROFILE_DATA.siblingsOnly?.[cell.exact?'exact':'grouped']?.[cell.sourceCode]?.[key];
  const count=mar==='unknown'?Math.max(0,(detail?.total||0)-['single','married','former'].reduce((sum,k)=>sum+(detail?.[k]||0),0)):detail?.[mar]||0;
  const denominator=mar==='unknown'?Math.max(0,cell.total[5]-known):cell[mar]?.[5]||0;
  P.household.siblingsOnly=denominator>0&&rnd()<count/denominator;
 }
 const candidates=hobbyRates(P,PROFILE_REGIONAL);
 P.hobbies=[];
 if(!candidates.length){P.hobbyNote='-';return;}
 // The survey is multiple-response. This is a representative-hobby model, not an observed joint distribution.
 const lower=Math.min(75,Math.floor(P.age/5)*5);
 const ageLabel=lower===75?'75歳以上':`${lower}～${lower+4}歳`;
 const all=PROFILE_DATA.hobby.overall[P.sex][ageLabel];
 const pr=PROFILE_DATA.hobby.prefOverall[P.sex];
 const overall=PROFILE_CLAMP(all*(PROFILE_REGIONAL?Math.sqrt((pr[P.pref.code]||pr['00000'])/pr['00000']):1),0,100)/100;
 if(rnd()>overall){P.hobbyNote='特になし';P.hobbyP=1-overall;return;}
 const amount=rnd()<.55?1:rnd()<.7?2:3;
 P.hobbyP=overall*([0,.55,.315,.135][amount]);
 for(let k=0;k<amount;k++){
  const r=pickW(candidates.filter(x=>!P.hobbies.some(h=>h.i===x.i)),x=>x.i===30&&P.age<20?0:x.rate);
  if(r){P.hobbies.push(r.v);P.hobbyP*=r.p;}
 }
}
const HOBBY_PATTERNS=[
 [/ゲーム|スマホゲーム|ソーシャルゲーム|オンラインゲーム/,31],
 [/マンガ|漫画/,27], [/読書|小説を読|本を読/,26],
 [/編み物|手芸|刺しゅう/,18], [/園芸|庭いじり|ガーデニング|盆栽/,20],
 [/料理|菓子|ケーキを作/,19], [/囲碁/,28], [/将棋/,29],
 [/カラオケ/,11], [/ギター|ピアノ|楽器/,8],
 [/カメラ|写真を撮/,24], [/映画館/,3], [/キャンプ/,33]
];
function profileEntryWeight(e,P) {
 if(!PROFILE_ENABLED || !P.hobbies?.length)return 1;
 const text=typeof e==='string'?e:e[2];
 const hit=HOBBY_PATTERNS.find(([re])=>re.test(text));
 if(!hit)return 1;
 return P.hobbies.some(x=>x.i===hit[1])?3:.65;
}
// Parent/child roles and child ages are auxiliary model assumptions, not census observations.
function parentRoleChance(P,i,mar){
 if(P.age<18 || i===0 || i===1 || i===7)return 0;
 if(i===2){
  if(mar!=='married')return 0;
  // Married household members may also be children whose spouse lives elsewhere.
  const band=Math.min(65,Math.floor(P.age/5)*5),key=P.sex+':'+band;
  for(const code of [...new Set([P.household?.code,profileCode(P),P.pref.code,'00000'].filter(Boolean))]){
   const rows=PROFILE_DATA.children?.[code]?.[key],peopleRows=PROFILE_DATA.family[code];
   if(!rows||!peopleRows)continue;
   const people=band<65?peopleRows[key]?.married?.[2]:Object.entries(peopleRows).reduce((sum,[k,r])=>sum+(k.startsWith(P.sex+':')&&+k.split(':')[1]>=65?(r.married?.[2]||0):0),0);
   const parents=rows.reduce((sum,r)=>sum+(r[0]>0?r[3]:0),0);
   if(people>0)return PROFILE_CLAMP(parents/people,0,1);
  }
  return 0;
 }
 if(i===3||i===4){
  if(P.sex!==(i===3?'m':'f'))return 0;
  const band=Math.min(65,Math.floor(P.age/5)*5),key=P.sex+':'+band;
  for(const code of [...new Set([P.household?.code,profileCode(P),P.pref.code,'00000'].filter(Boolean))]){
   const parents=PROFILE_DATA.singleParentTotals?.[code]?.[key],rows=PROFILE_DATA.family[code];
   if(parents==null||!rows)continue;
   const people=band<65?rows[key]?.total[i]:Object.entries(rows).reduce((sum,[k,r])=>sum+(k.startsWith(P.sex+':')&&+k.split(':')[1]>=65?r.total[i]:0),0);
   if(people>0)return PROFILE_CLAMP(parents/people,0,1);
  }
  return 0;
 }
 // Non-married extended/non-relative households do not establish personal parenthood.
 return 0;
}
const PROFILE_CHILD_RANGES=[[0,0],[0,0],[1,2],[3,5],[6,8],[9,11],[12,14],[15,17],[18,100]];
function profileChildCountMean(singleParent,code,key,count,y,o){
 if(singleParent?count!==2:count!==4)return count;
 const field=singleParent?'singleParent':'couple',cell=singleParent?String(y):y+':'+o;
 for(const region of [...new Set([code,code?.slice(0,2)+'000','00000'])]){
  const mean=PROFILE_DATA.childCountMeans?.[field]?.[region]?.[key]?.[cell];
  if(Number.isFinite(mean)&&mean>=count)return mean;
 }
 return count;
}
function profileChildCountLimit(singleParent,code,key,count,y,o){
 if(singleParent?count!==2:count!==4)return count;
 const field=singleParent?'singleParent':'couple',cell=singleParent?String(y):y+':'+o;
 for(const region of [...new Set([code,code?.slice(0,2)+'000','00000'])]){
  const mean=PROFILE_DATA.childCountMeans?.[field]?.[region]?.[key]?.[cell];
  if(!Number.isFinite(mean))continue;
  const row=(singleParent?PROFILE_DATA.singleParentChildren:PROFILE_DATA.children)?.[region]?.[key]?.find(r=>r[0]===count&&r[1]===y&&(singleParent||r[2]===o));
  const households=row?.[singleParent?2:3];
  // The observed total children bounds any one household, especially sparse cells.
  if(households>0)return Math.round(households*mean-count*(households-1));
 }
 return count;
}
const PROFILE_COUNT_PMF_CACHE=new Map();
// Only open bins are imputed. Maximum-entropy excess preserves their observed mean.
// For siblings, condition on the number of children eligible to be the sampled person.
function profileConcreteChildCount(minimum,mean,endpoint=1,middle=0,maximum=Infinity){
 const excess=Math.max(0,mean-minimum);if(!excess)return minimum;
 const q=excess/(1+excess),geometric=()=>Math.floor(Math.log1p(-rnd())/Math.log(q));
 if(maximum<=mean+1e-9)return maximum;
 if(Number.isFinite(maximum)&&Math.pow(q,maximum-minimum+1)>1e-12){
  const key=[minimum,mean,maximum].join(':');let pmf=PROFILE_COUNT_PMF_CACHE.get(key);
  if(!pmf){
   const span=maximum-minimum;let lo=0,hi=1;
   for(let k=0;k<45;k++){
    const ratio=(lo+hi)/2;let mass=0,sum=0,w=1;
    for(let n=0;n<=span;n++){mass+=w;sum+=n*w;w*=ratio;}
    if(sum/mass<excess)lo=ratio;else hi=ratio;
   }
   const ratio=(lo+hi)/2;pmf=Array.from({length:span+1},(_,n)=>({n:n+minimum,w:Math.pow(ratio,n)}));PROFILE_COUNT_PMF_CACHE.set(key,pmf);
  }
  return pickW(pmf,r=>r.w*(endpoint+middle*Math.max(0,r.n-2))).v.n;
 }
 const base=endpoint+middle*Math.max(0,minimum-2),extra=middle*excess;
 return minimum+(extra>0&&rnd()*(base+extra)<extra?1+geometric()+geometric():geometric());
}
function profileChildStratum(P,allowNone=false){
 const band=Math.min(65,Math.floor(P.age/5)*5),key=P.sex+':'+band,maxAge=Math.max(0,Math.min(80,P.age-18));
 const field=P.household?.i===5?(P.age<65?4:5):3;
 for(const code of [...new Set([P.household?.code,profileCode(P),P.pref.code,'00000'].filter(Boolean))]){
  const raw=PROFILE_DATA.children?.[code]?.[key]||[];
  const rows=raw.filter(r=>(allowNone||r[0]>0)&&(!r[0]||PROFILE_CHILD_RANGES[r[1]][0]<=maxAge&&PROFILE_CHILD_RANGES[r[2]][0]<=maxAge));
  if(rows.some(r=>r[field]>0))return {rows,field,code};
 }
 return null;
}
function profileChildRows(P){return profileChildStratum(P)?.rows||[];}
function profileMakeChildAges(P,count,y,o){
 const maxAge=Math.max(0,Math.min(80,P.age-18));
 const integer=(lo,hi)=>lo+Math.floor(rnd()*(Math.max(lo,hi)-lo+1));
 const yr=PROFILE_CHILD_RANGES[y],or=PROFILE_CHILD_RANGES[o];
 let youngest=integer(yr[0],Math.min(maxAge,yr[1]));
 if(y===8)youngest=PROFILE_CLAMP(Math.round(P.age-31+gauss()*5),18,maxAge);
 if(count===1)return [{sex:rnd()<.512?'m':'f',age:youngest}];
 const oldest=integer(Math.max(youngest,or[0]),Math.min(maxAge,or[1]));
 return Array.from({length:count},(_,i)=>({sex:rnd()<.512?'m':'f',age:i===0?oldest:i===count-1?youngest:Math.round(oldest-(oldest-youngest)*i/(count-1))}));
}
function sampleProfileChildren(P,allowNone=false){
 const family=P.household?.i,maxAge=Math.max(0,Math.min(80,P.age-18));
 const band=Math.min(65,Math.floor(P.age/5)*5),key=P.sex+':'+band;
 if(family===3||family===4){
  for(const code of [...new Set([P.household?.code,P.pref.code,'00000'].filter(Boolean))]){
   const rows=PROFILE_DATA.singleParentChildren?.[code]?.[key];
   if(!rows?.length)continue;
   const pick=pickW(rows.filter(r=>PROFILE_CHILD_RANGES[r[1]][0]<=maxAge),r=>r[2]);
   if(!pick)continue;
   const [count,y]=pick.v;
   const national=PROFILE_DATA.singleParentOldest?.[key]||[];
   const oldest=pickW(national.filter(r=>r[0]===count&&r[1]===y&&PROFILE_CHILD_RANGES[r[2]][0]<=maxAge),r=>r[3]);
   if(!oldest)continue;
   P.household.childCountLowerBound=count===2?2:null;
   P.household.childSource=code+':single-parent';
   const mean=profileChildCountMean(true,code,key,count,y,oldest.v[2]);
   return profileMakeChildAges(P,profileConcreteChildCount(count,mean,1,0,profileChildCountLimit(true,code,key,count,y,oldest.v[2])),y,oldest.v[2]);
  }
  P.household.childCompositionUnknown=true;return null;
 }
 const stratum=profileChildStratum(P,allowNone);
 const pick=stratum?pickW(stratum.rows,r=>r[stratum.field]):null;
 if(!pick){P.household.childCompositionUnknown=true;return null;}
 const [count,y,o]=pick.v;
 P.household.childCountLowerBound=count===4?4:null;
 P.household.childSource=stratum.code+':couple-household';
 return count?profileMakeChildAges(P,profileConcreteChildCount(count,profileChildCountMean(false,stratum.code,key,count,y,o),1,0,profileChildCountLimit(false,stratum.code,key,count,y,o)),y,o):[];
}
function makeFamilyContext(P){
 const H=P.household;
 if(!H || H.i==null){P.familyContext={ownChild:false,youngest:null,children:[],awayChildren:[],grandchild:false,partner:false,members:[]};return;}
 if(H.siblingsOnly){
  P.familyContext={ownChild:false,youngest:null,children:[],awayChildren:[],grandchild:false,partner:false};makeFamilyMembers(P);return;
 }
 // A married person in an extended household can also have no children.
 const extendedCouple=H.i===5&&H.mar==='married'&&P.age>=18;
 const ownChild=rnd()<parentRoleChance(P,H.i,H.mar);
 const sampled=extendedCouple?sampleProfileChildren(P,true):ownChild?sampleProfileChildren(P,false):[];
 const children=sampled||[];
 const youngest=children.length?Math.min(...children.map(c=>c.age)):null;
 const awayChildren=[];
 // Census co-resident-child tables do not identify the count of children living elsewhere.
 const adultChild=children.concat(awayChildren).some(c=>c.age>=18);
 P.familyContext={ownChild:children.length>0||sampled===null&&ownChild,youngest,children,awayChildren,grandchild:P.age>=50&&adultChild&&rnd()<PROFILE_CLAMP((P.age-45)/40,0,.8),partner:H.mar!=='married'&&P.age>=15&&rnd()<(P.age<35?.35:.2)};
 makeFamilyMembers(P);
}
function postpartumFactor(P){
 if(!P.familyContext?.ownChild)return 0;
 const cell=familyCell(P);let mass=0;
 for(const mar of ['single','married','former'])for(let i=0;i<8;i++)mass+=(cell[mar]?.[i]||0)*parentRoleChance(P,i,mar);
 const total=cell.total.reduce((a,b)=>a+b,0);
 // Redistribute the baseline postpartum chance among plausible mothers, with a bound.
 return Math.min(6,total/(mass||total));
}
function linkFamilyHealth(P){
 if(P.hb?.pp>=0 && P.familyContext?.ownChild){
  P.familyContext.youngest=0;
  const children=P.familyContext.children;
  if(children?.length)children[children.length-1].age=0;
 }
}
function profileFamilyLabel(P){
 if(P.profileDisplay?.family)return P.profileDisplay.family;
 if(!P.household)return '-';
 if(P.occ?.group==='facility')return '本人（施設入所中）';
 if(P.occ?.group==='prison')return '本人（服役中）';
 const F=P.familyContext,H=P.household;
 if(H.i===7)return '本人（家族構成不明）';
 if(!F?.members)return '-';
 if(H.i===0)return F.awayMembers?.length
  ?'本人（単身赴任中）／'+F.awayMembers.join('・'):'本人（一人暮らし中）';
 return F.members.join('・');
}
function profileHobbyLabel(P){
 if(!P || P.age<10)return '-';
 if(P.profileDisplay?.hobby)return P.profileDisplay.hobby;
 return P.hobbies?.map(h=>PROFILE_HOBBY_SHORT[h.i]).join('、')||P.hobbyNote||'-';
}
// Conditional synthetic-household draw: infer sibling count from observed household records,
// weighting by the expected number of children matching the sampled person's age.
function profileSiblingMembers(P){
 const family=P.household.i,sp=family===3||family===4,parentSex=family===3?'m':'f';
 const data=sp?PROFILE_DATA.singleParentChildren:PROFILE_DATA.children;
 let source,sourceCode;
 for(const code of [...new Set([P.household.code,P.pref.code,'00000'])])if(data?.[code]){source=data[code];sourceCode=code;break;}
 if(!source)return [];
 const candidates=[];
 for(const [key,rows] of Object.entries(source)){
  if(!key.startsWith(parentSex+':'))continue;
  const band=+key.split(':')[1],maxParent=band===65?110:band+4;
  if(maxParent<P.age+18)continue;
  for(const row of rows){
   const count=row[0];if(!count)continue;
   const options=sp?(PROFILE_DATA.singleParentOldest?.[key]||[]).filter(n=>n[0]===count&&n[1]===row[1]):[row];
   const norm=sp?options.reduce((sum,n)=>sum+n[3],0):1;
   for(const n of options){
    const yr=PROFILE_CHILD_RANGES[n[1]],or=PROFILE_CHILD_RANGES[n[2]];
    const maxChild=maxParent-18,yhi=Math.min(maxChild,yr[1]),ohi=Math.min(maxChild,or[1]);
    const py=P.age>=yr[0]&&P.age<=yhi?1/(yhi-yr[0]+1):0;
    const po=P.age>=or[0]&&P.age<=ohi?1/(ohi-or[0]+1):0;
    const mean=profileChildCountMean(sp,sourceCode,key,count,n[1],n[2]);
    const middle=P.age>=yr[0]&&P.age<=ohi?1/(ohi-yr[0]+1):0;
    const match=count===1?py:py+po+Math.max(0,mean-2)*middle;
    const weight=sp?row[2]*n[3]/(norm||1):family===2?n[3]:n[4]+n[5];
    if(match>0&&weight>0)candidates.push({count,mean,maximum:profileChildCountLimit(sp,sourceCode,key,count,n[1],n[2]),endpoint:py+po,middle,y:n[1],o:n[2],band,w:weight*match});
   }
  }
 }
 const pick=pickW(candidates,x=>x.w);if(!pick||pick.v.count===1)return [];
 const c=pick.v;
 c.count=profileConcreteChildCount(c.count,c.mean,c.endpoint,c.middle,c.maximum);
 const parentAge=Math.max(P.age+18,c.band===65?Math.min(110,P.age+31):c.band+2);
 const children=profileMakeChildAges({age:parentAge},c.count,c.y,c.o);
 const yr=PROFILE_CHILD_RANGES[c.y],or=PROFILE_CHILD_RANGES[c.o];
 let indices=children.map((_,i)=>i).filter(i=>i===0?P.age>=or[0]&&P.age<=or[1]:i===c.count-1?P.age>=yr[0]&&P.age<=yr[1]:true);
 if(!indices.length)indices=[0];
 const self=pickU(indices);children[self]={sex:P.sex,age:P.age,self:true};children.sort((a,b)=>b.age-a.age);
 const position=children.findIndex(c=>c.self);
 return children.map((c,i)=>c.self?'本人':i<position?(c.sex==='m'?'兄':'姉'):(c.sex==='m'?'弟':'妹'));
}

// Concrete relatives are generated once and kept with the person (including history).
function makeFamilyMembers(P){
 const F=P.familyContext,H=P.household;
 if(!F || H?.i==null)return;
 const spouse=P.sex==='m'?'妻':'夫';
 F.children=F.children||[];
 const labels=children=>{
  const rank={m:0,f:0},order=['長','二','三','四','五','六','七','八','九','十'];
  return children.map(c=>{const n=++rank[c.sex];return (order[n-1]||'第'+n)+(c.sex==='m'?'男':'女');});
 };
 const children=H.childCompositionUnknown?['子（人数不明）']:labels(F.children);
 const siblings=parents=>{
  const inferred=profileSiblingMembers(P);
  F.siblingMembers=inferred.filter(x=>x!=='本人');
  return [...parents,...(inferred.includes('本人')?inferred:['本人',...inferred])];
 };
 if(H.siblingsOnly){
  const sizes=PROFILE_DATA.siblingsOnly?.sizes?.[H.code]||PROFILE_DATA.siblingsOnly?.sizes?.[P.pref.code]||PROFILE_DATA.siblingsOnly?.sizes?.['00000'];
  const row=pickW(sizes||[],r=>r[1]*r[2])?.v;
  const count=row?profileConcreteChildCount(row[0],row[2],2,1,row[3]):2;
  const youngestPosition=Math.max(0,count-1-Math.floor(P.age/2));
  const self=youngestPosition+Math.floor(rnd()*(count-youngestPosition));
  F.members=Array.from({length:count},(_,i)=>i===self?'本人':i<self?(rnd()<.512?'兄':'姉'):(rnd()<.512?'弟':'妹'));
  F.siblingMembers=F.members.filter(x=>x!=='本人');H.syntheticSize=count;
 }else if(H.i===0){
  F.members=['本人'];
 }else if(H.i===1)F.members=['本人',spouse];
 else if(H.i===2)F.members=F.ownChild?['本人',spouse,...children]:siblings(['父','母']);
 else if(H.i===3 || H.i===4)F.members=F.ownChild?['本人',...children]:siblings([H.i===3?'父':'母']);
 else if(H.i===5){
  const parent=P.age<65?['親']:[];
  if(F.ownChild||H.mar==='married'){
   F.members=[...parent,'本人',...(H.mar==='married'?[spouse]:[]),...children];
   if(!parent.length)F.members.push(F.grandchild?'孫':F.children[0]?.age>=18?(F.children[0].sex==='m'?'長男の妻':'長女の夫'):'姉');
  }
  else if(P.age<25)F.members=['親族',...siblings([])];
  else F.members=['親族','本人',...(H.mar==='married'?[spouse]:[])];
 }else if(H.i===6)F.members=['本人',...(H.mar==='married'?[spouse]:[]),...children,'同居人'];
 else F.members=['本人'];
}
const PROFILE_HOBBY_SHORT=['スポーツ観戦','美術鑑賞','演劇・舞踊鑑賞','映画鑑賞（映画館）','映画鑑賞（自宅など）','クラシックのコンサート','ライブ・コンサート','音楽鑑賞','楽器演奏','邦楽','合唱・声楽','カラオケ','日本舞踊','ダンス','書道','華道','茶道','裁縫','編み物・手芸','料理・お菓子作り','園芸','日曜大工','絵画・彫刻','陶芸・工芸','写真撮影','詩・小説などの創作','読書','漫画','囲碁','将棋','パチンコ','ゲーム','遊園地・動植物園・水族館','キャンプ','その他'];
// All personal relationship gates run before text selection. Professional scenes are separate.
const PROFILE_WORK_ENTRIES=new Set();
function registerProfileWork(pool){
 if(typeof pool==='string'){PROFILE_WORK_ENTRIES.add(pool);return;}
 if(!pool||typeof pool!=='object')return;
 if(Array.isArray(pool)&&typeof pool[0]==='number'&&typeof pool[2]==='string'){PROFILE_WORK_ENTRIES.add(pool);PROFILE_WORK_ENTRIES.add(pool[2]);return;}
 Object.values(pool).forEach(registerProfileWork);
}
[WORK_TX,NIGHT_TX,EV_TX.work,SCHOOL_TX,EN_TX].forEach(registerProfileWork);
const PROFILE_SPOUSE_RE=/夫婦|妻|夫[とのにがを]|奥さん|旦那/;
const PROFILE_SEEKING_RE=/マッチングアプリ|婚活|合コン|お見合い/;
const PROFILE_ROMANCE_RE=/彼氏|彼女|恋人|デート|プロポーズ/;
const PROFILE_CHILD_RE=/わが子|子ども[のをとがには]|赤ちゃん|乳児|夜泣き|ベビーカー|抱っこひも|離乳食|沐浴/;
function profileChildAgeRule(text){
 if(/成人式|成人の日/.test(text))return [18,20];
 if(/夜泣き|赤ちゃん|乳児|授乳|ミルク|ベビーカー|抱っこひも|離乳食|沐浴/.test(text))return [0,2];
 if(/保育園|幼稚園|連絡帳/.test(text))return [0,12];
 if(/寝かしつけ|寝顔|蹴られ|一緒に寝|寝落ち|布団をかけ/.test(text))return [0,10];
 if(/入学式|学校|受験|塾|宿題|起きなさい|朝練/.test(text))return [6,18];
 if(/運動会|習い事|工作|キャッチボール|サッカー|夏休み/.test(text))return [3,17];
 if(/おもちゃ|クリスマス|プレゼントを置/.test(text))return [0,12];
 return [0,100];
}
function profileEntryOK(e,P){
 if(!PROFILE_ENABLED)return true;
 const text=typeof e==='string'?e:e[2],o=Array.isArray(e)?e[3]||{}:{},r=o.profile||{},F=P.familyContext,H=P.household,health=P.hb||{};
 if(r.hobby!=null&&!P.hobbies?.some(h=>h.i===r.hobby))return false;
 if(!F||!H)return !Object.keys(r).some(k=>k!=='hobby');
 if(PROFILE_WORK_ENTRIES.has(e))return true;
 const hasAge=(lo,hi)=>F.children?.some(c=>c.age>=lo&&c.age<=hi);
 const members=F.members||[];
 if(r.spouse&&(H.mar!=='married'||!members.some(x=>x==='妻'||x==='夫')))return false;
 if(r.solo&&H.i!==0)return false;
 if(r.parent&&!members.some(x=>r.parent===true?x==='父'||x==='母':x===r.parent))return false;
 if(r.sibling&&!members.some(x=>['兄','姉','弟','妹'].includes(x)||/^きょうだい/.test(x)))return false;
 if(r.awayChild&&!F.awayChildren?.length)return false;
 if(r.childAge&&!hasAge(...r.childAge))return false;
 if(r.household!=null&&H.i!==r.household)return false;
 if(r.siblingsOnly&&!H.siblingsOnly)return false;
 if(r.singleParent&&(![3,4].includes(H.i)||!F.ownChild))return false;
 if(r.childCount!=null){
  const range=Array.isArray(r.childCount)?r.childCount:[r.childCount,r.childCount];
  const count=F.children?.length||0;
  if(!F.ownChild||H.childCompositionUnknown||count<range[0]||count>range[1])return false;
 }
 // Dream content and references to other people's children do not describe the household.
 if(/夢の中|夢で|初夢|子どもの頃|子どものころ|親戚の子|子ども神輿/.test(text))return true;
 const spouse=PROFILE_SPOUSE_RE.test(text),seeking=PROFILE_SEEKING_RE.test(text);
 if(spouse&&H.mar!=='married')return false;
 const married=H.mar==='married'||members.some(x=>x==='妻'||x==='夫');
 if(seeking&&(married||H.mar==='unknown'||F.partner||P.age<18))return false;
 if(!spouse&&!seeking&&PROFILE_ROMANCE_RE.test(text)&&(!F.partner||married||H.mar==='unknown'))return false;
 if(/孫/.test(text)&&!F.grandchild)return false;
 if(/一人暮らしの母/.test(text)&&members.includes('母'))return false;
 if(/帰省|実家に帰/.test(text)&&members.some(x=>['父','母','親'].includes(x)))return false;
 const away=/遠くに住む子ども|離れて暮らす子ども|独立した子ども/.test(text);
 if(away&&!F.awayChildren?.length)return false;
 if(!away&&P.age>=13&&PROFILE_CHILD_RE.test(text)){
  if(!F.ownChild||!hasAge(...profileChildAgeRule(text)))return false;
  if(health.bed)return false;
 }
 if(P.age>=13&&/授乳/.test(text)&&!(P.sex==='f'&&health.pp>=0&&hasAge(0,0)))return false;
 if(health.preg&&/飲酒|ビールを|酒を飲|日本酒を|ワインを|喫煙|タバコ|たばこ|マラソン|全力疾走/.test(text))return false;
 if(health.pp>=0&&health.pp<2&&/マラソン|全力疾走|筋トレ|登山|飲酒|ビールを|酒を飲|ワインを/.test(text))return false;
 return true;
};

