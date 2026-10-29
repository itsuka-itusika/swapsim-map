/* Land-use integration. Index cells are lookups only; every integration point is classified geometrically. */
const LandProfile=(()=>{
 const S=typeof MapSpatial!=='undefined'?MapSpatial:require('./spatial.js'),M=typeof MapModel!=='undefined'?MapModel:require('./model.js');
 const labels={residential:'住宅地',commercial:'商業地・繁華街',office:'オフィス・業務地',industrial:'工業・物流地',green:'緑地・公園・森林',education:'教育地',medical:'医療・福祉地',tourism:'観光地',transport:'交通拠点',public:'官公庁・公共施設地',mall:'大規模商業施設',sports:'スポーツ・イベント施設',religious:'宗教施設・墓地',agriculture:'農地',waterfront:'水辺・河川敷',mixed:'混合地域'};
 const colors={residential:'#ddc18b',commercial:'#db7990',office:'#728fca',industrial:'#987aab',green:'#72a875',education:'#ddb954',medical:'#d48070',tourism:'#e49b60',transport:'#777d92',public:'#9b9281',mall:'#d779b9',sports:'#69aca6',religious:'#b6aa83',agriculture:'#a1b965',waterfront:'#7ab8cd',mixed:'#b5ad9a'};
 const kindType=k=>['primary','middle','high','university','college','kindergarten','prep'].includes(k)?'education':['care','hospital'].includes(k)?'medical':k==='station'||k==='terminal'||k==='airfield'?'transport':k==='theme'?'tourism':['tv','radio','palace'].includes(k)?'public':k==='industrial'||k==='port'?'industrial':k==='cemetery'?'religious':'green';
 function configure(data){const zones=[...(data.greenZones||[]).map(z=>({...z,type:kindType(z.kind),subtype:z.kind,precision:'approximate-polygon',source:z.source||'SwapSim概略区域'})),...(data.landZones||[]).map(z=>({...z,type:kindType(z.kind),subtype:z.kind,precision:'approximate-polygon',source:z.source||'SwapSim概略区域'}))];
 return {data,police:new S.Index((data.policeStations||[]).map(f=>({...f,type:'public',subtype:'police',area:Math.PI*f.radius*f.radius}))),specialPlaces:new S.Index(data.specialPlaces||[]),publicAreas:new S.Index(data.publicAreas||[]),landmarks:new S.Index(data.landmarks||[]),zones:new S.Index(zones),waters:new S.Index(data.waters||[]),zoning:new S.Index(data.zoning?.zones||[]),facilities:new S.Index((data.facilities||[]).map(f=>({...f,type:kindType(f.kind),subtype:f.kind,precision:'modeled-footprint'}))),areas:new S.Index(data.areas||[]),regions:new S.Index(data.regions||[])};}
 function normalize(n){return String(n||'').normalize('NFKC').replace(/[\s・･]/g,'').replace(/高校/g,'高等学校')}
 function create(ctx,p,r,features=[]){let bbox=S.box(p,r),expanded=S.box(p,r+450),raw=features.filter(f=>S.intersects(expanded,f.bbox)).map(f=>{if(f.source!=='OpenStreetMap'||!f.tags)return f;let c=OSMProfile.classification(f.tags);return c?{...f,type:c[0],subtype:c[1]}:null}).filter(Boolean),official=ctx.facilities.query(expanded),matched=new Set();
 // Deduplicate official points and OSM footprints. A campus may contain several school stages.
 let osm=raw.map(f=>{let fs=[];if(['education','medical','transport'].includes(f.type)){fs=official.filter(x=>x.type===f.type&&(f.geometry&&S.contains(x.xy,f)||normalize(x.name)===normalize(f.name)&&M.distance(x.xy,f.xy)<800));for(let x of fs)matched.add(x.id)}return {...f,facilities:fs}});
 // Relation/member and tagged node/polygon duplicates must not increase density or capacity.
 osm=osm.filter((f,i,a)=>!a.some((g,j)=>j!==i&&g.geometry&&g.type===f.type&&((!f.geometry&&normalize(f.name)===normalize(g.name)&&S.contains(f.xy,g))||(f.geometry&&g.id.startsWith('osm-relation')&&f.id.startsWith('osm-way')&&normalize(f.name)===normalize(g.name)&&Math.abs(f.area-g.area)<Math.max(10,g.area*.05)))));
 let index=new S.Index(osm),facilities=official.filter(f=>!matched.has(f.id)),facilityIndex=new S.Index(facilities),buckets=new Map(),landWeights={},tagTotals={},N=Math.min(10000,Math.max(384,Math.ceil(Math.PI*r*r/225))),unit=Math.PI*r*r/N;
 const specific=f=>['hotel','hostel','museum','gallery','theatre','fire_station','large_shop','library','bank','bath','tourist'].includes(f.subtype)||!['residential','green','industrial','commercial','office','agriculture','waterfront'].includes(f.type);
 function tagAt(q,type){
  if(['green','education','medical','industrial','waterfront','agriculture'].includes(type))return null;
  let best=null,w=0,adult=null,adultWeight=0,tags={},sources={};
  for(let a of ctx.areas.query(S.box(q,1))){let v=Math.max(0,1-(M.distance(q,a.xy)/a.radius)**2);if(!v)continue;
   if(v>w){best=a;w=v}
   for(let [k,level] of Object.entries(a.tags||{})){let score=v*level;if(score>(tags[k]||0)){tags[k]=score;sources[k]=a}}
   let av=v*(a.tags?.adult||0)*(a.adultBoost||1);if(av>adultWeight){adult=a;adultWeight=av}
  }
  return best?{...best,strength:w,tags,sources,adultArea:adult,adultWeight}:null;
 }
 function classify(q){let region=ctx.regions.at(q)[0];if(!region)return null;// Newer landfill (the 中央防波堤 container terminals) still lies under the older water layer: a port zone wins.
 let water=ctx.waters.at(q)[0];if(water&&ctx.zones.at(q).some(z=>z.subtype==='port'))water=null;if(water)return {...water,type:'waterfront',subtype:'water',region,precision:water.source?.includes('W09')?'polygon':'approximate-polygon'};
 let police=ctx.police.at(q).sort((a,b)=>M.distance(q,a.xy)-M.distance(q,b.xy))[0];if(police)return {...police,region};
 let civic=ctx.publicAreas.at(q).sort((a,b)=>S.area(a.geometry)-S.area(b.geometry))[0];if(civic){if(civic.civicKind==='military'){let hospital=ctx.facilities.at(q).find(f=>f.kind==='hospital'&&/自衛隊中央病院/.test(f.name)&&S.contains(f.xy,civic));if(hospital)return {...hospital,type:'medical',subtype:'hospital',facilities:[hospital],region};}return {...civic,region};}
 let special=ctx.specialPlaces.at(q).sort((a,b)=>(a.area||Infinity)-(b.area||Infinity))[0];if(special){let station=ctx.facilities.at(q).find(f=>f.kind==='station'&&M.distance(q,f.xy)<=Math.min(20,f.radius||20));if(station){let s={...station,radius:Math.min(20,station.radius||20),precision:'modeled-footprint'};return {...s,facilities:[s],region};}
  // Indoor amusement parks inside a building (ナンジャタウン in サンシャインシティ, ジョイポリス in デックス) keep their own visitors.
  let theme=ctx.facilities.at(q).find(f=>f.kind==='theme');if(theme)return {...theme,type:'tourism',subtype:'theme',facilities:[theme],precision:'modeled-footprint',region};return {...special,region};}
 let landmark=ctx.landmarks.at(q).sort((a,b)=>S.area(a.geometry)-S.area(b.geometry))[0];
 let media=ctx.facilities.at(q).filter(f=>['tv','radio'].includes(f.kind));
 // Dedicated broadcast workplaces override generic buildings. Do not spread their circles into protected green footprints.
 if(media.length&&!(landmark?.type==='green'&&!S.contains(media[0].xy,landmark)))return {...media[0],type:'public',subtype:'broadcast',facilities:media,region};
 if(landmark)return {...landmark,region,areaTag:tagAt(q,landmark.type)};
 let base=ctx.zones.at(q).sort((a,b)=>(a.kind==='palace'?-1:0)-(b.kind==='palace'?-1:0)||(S.area(a.geometry)-S.area(b.geometry)))[0];
 if(base?.kind==='palace')return {...base,region};
 let polys=index.at(q).filter(f=>f.geometry).sort((a,b)=>Number(specific(b))-Number(specific(a))||a.area-b.area),f=polys[0];
 if(f&&specific(f))return {...f,region,areaTag:tagAt(q,f.type)};
 let namedPoint=index.query(S.box(q,20)).filter(x=>!x.geometry&&['hotel','hostel','museum','gallery','theatre','fire_station','large_shop','library','bank','bath','tourist'].includes(x.subtype)&&(x.tags?.name||x.tags?.['name:ja'])&&M.distance(q,x.xy)<=15).sort((a,b)=>M.distance(a.xy,q)-M.distance(b.xy,q))[0];if(namedPoint)return {...namedPoint,region,areaTag:tagAt(q,namedPoint.type)};
 if(f&&(f.tags?.building||['green','waterfront'].includes(f.type)))return {...f,region,areaTag:tagAt(q,f.type)};
 if(base)return {...base,region,areaTag:tagAt(q,base.type)};
 let fs=facilityIndex.at(q).sort((a,b)=>M.distance(a.xy,q)-M.distance(b.xy,q));if(fs.length)return {...fs[0],facilities:[fs[0]],region};
 if(f)return {...f,region,areaTag:tagAt(q,f.type)};
 let points=index.query(S.box(q,40)).filter(f=>!f.geometry&&M.distance(q,f.xy)<=35).sort((a,b)=>M.distance(a.xy,q)-M.distance(b.xy,q));if(points.length){let f=points[0];return {...f,region,areaTag:tagAt(q,f.type)}}
 let z=ctx.zoning.at(q)[0],type=z?.type||'mixed',subtype=z?.subtype||'unknown',near=index.query(S.box(q,120)).filter(f=>M.distance(q,f.xy)<120),counts={};for(let f of near)counts[f.type]=(counts[f.type]||0)+1;
 let tag=tagAt(q,type);
 if(type==='commercial'){let off=counts.office||0,shop=counts.commercial||0;if(off>shop||!off&&!shop&&(tag?.tags.office||0)>Math.max(tag?.tags.shopping||0,tag?.tags.night||0))type='office';else if((tag?.tags.night||0)>=3||near.filter(f=>f.subtype==='night').length>=2)subtype='night';else if((tag?.tags.subculture||0)>=2)subtype='subculture';else if((tag?.tags.fashion||0)>=3)subtype='fashion';else subtype='shopping'}
 if(type==='mixed'&&near.length>=2){type=Object.keys(counts).sort((a,b)=>counts[b]-counts[a])[0];subtype=near.find(f=>f.type===type).subtype}
 if(type==='residential'){let schools=official.filter(f=>f.type==='education'&&M.distance(q,f.xy)<350);subtype=schools.some(f=>['university','college'].includes(f.kind))?'student':schools.some(f=>['primary','kindergarten'].includes(f.kind))?'family':near.some(f=>f.subtype==='care')?'senior':z?.subtype==='suburban'?'suburban':'residential'}
 return {id:(z?.id||'fallback-'+region.id)+'-'+type+'-'+subtype+(tag?'-'+tag.id:''),name:tag?.name||region.name,type,subtype,region,areaTag:tag,source:z?.source||'国勢調査・情報不足時の仮定',precision:z?'zoning':'fallback',poiCounts:counts,housingWeight:z?.housingWeight||1};
 }
 for(let q of S.samples(p,r,N)){let f=classify(q);if(!f)continue;let tag=f.areaTag,signature=tag?Object.entries(tag.sources).sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>k+':'+v.id).join(',')+'/'+(tag.adultArea?.id||''):'';let key=f.id+'/'+f.region.id+'/'+(tag?.id||'')+'/'+signature;if(!buckets.has(key))buckets.set(key,{...f,sampleXY:q,areaTag:tag?{...tag,tags:{},adultWeight:0}:null,areaM2:0,samples:0});let b=buckets.get(key);b.areaM2+=unit;b.samples++;landWeights[f.type]=(landWeights[f.type]||0)+unit;if(tag){for(let [k,v] of Object.entries(tag.tags)){b.areaTag.tags[k]=(b.areaTag.tags[k]||0)+v;tagTotals[k]=(tagTotals[k]||0)+unit*v}b.areaTag.adultWeight+=tag.adultWeight;}}
 let parts=[...buckets.values()];for(let b of parts)if(b.areaTag){for(let k of Object.keys(b.areaTag.tags))b.areaTag.tags[k]/=b.samples;b.areaTag.adultWeight/=b.samples;}let total=parts.reduce((s,f)=>s+f.areaM2,0),weights=Object.fromEntries(Object.entries(landWeights).map(([k,v])=>[k,v/(total||1)])),order=Object.keys(weights).sort((a,b)=>weights[b]-weights[a]);
 return {point:p,radius:r,parts,weights,primaryType:order[0]||'mixed',secondaryType:order[1]||null,tags:tagTotals,features:osm,coverage:total/(Math.PI*r*r),sampleCount:N,classify,context:ctx};
 }
 return {configure,create,labels,colors,kindType};
})();
if(typeof module!=='undefined')module.exports=LandProfile;
