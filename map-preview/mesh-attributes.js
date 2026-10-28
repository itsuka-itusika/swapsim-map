/* Multiple independent attributes; a land-use label never replaces cultural/visitor tags. */
const MeshAttributes=(()=>{
 const definitions={residential:['住宅地','#9c978d'],student:['学生街','#bc941d'],green:['公園・緑地','#23834b'],forest:['森林・自然緑地','#15613c'],office:['業務・オフィス','#396eac'],night:['夜の飲食・娯楽','#ae5576'],adult:['風俗街','#a32252'],industrial:['工業地帯','#8068a7'],warehouse:['倉庫・物流','#927143'],shopping:['商業・買い物','#c18a36'],fashion:['ファッション・おしゃれな街','#cf648c'],tourist:['国内観光','#d36c32'],inbound:['外国人観光','#4d9ab0'],subculture:['オタク・サブカル','#8556c0'],youth:['若者の来街','#bd704d'],water:['水域','#4b96bd'],school:['学校','#b49d32'],hospital:['病院','#c26363'],care:['高齢者施設','#916b98'],media:['テレビ・ラジオ局','#7750a1'],station:['駅','#536778'],theme:['テーマパーク','#e37543'],cemetery:['墓地・霊園','#777c74'],palace:['皇居内部','#46634f'],special:['空港などの特殊区域','#a15f34']};
 Object.assign(definitions,{multicultural:['多文化商業地区','#92769d'],government:['行政機関街','#536ba0'],politics:['政治・議会地区','#665f97'],legal:['司法・法律事務','#65669a'],international:['国際業務地区','#379296'],research:['大学・研究集積','#6a7d36'],medical:['医療集積','#b65d69'],books:['書店・古書街','#976c3e'],publishing:['出版・編集集積','#8f7553'],specialty:['専門商店街','#b38735'],wholesale:['卸売・問屋街','#977b46'],market:['卸売市場・市場街','#9e8743'],culture:['博物館・美術館','#9674a2'],theater:['劇場・ライブ','#b34b88'],sports:['スポーツ施設','#55924b'],temple:['寺院・門前町','#967342'],shrine:['神社・参道','#b37c46'],hotel:['ホテル・宿泊拠点','#7a74a2'],waterfront:['水辺・遊歩道','#459aab'],senior_town:['高齢者の来街','#9e7c81'],lifestyle:['生活・雑貨商業','#a29367'],arcade:['地域の商店街','#ba984b']});
 const base=['residential','student','green','office','night','industrial','warehouse','shopping','water','special'];
 function enrich(mesh,districts=[]){for(let c of mesh.cells){let attributes={},genres={},p=MeshModel.xy(c[0],c[1]),z=c[5]>=0?mesh.zones[c[5]]:null,b=base[c[4]];if(z?.kind==='cemetery')b='cemetery';if(z?.kind==='palace')b='palace';if(z?.kind==='forest'||z?.kind==='wildland')b='forest';attributes[b]=['student','office','night','shopping'].includes(b)?0:4;
 for(let a of mesh.areas){let influence=Math.max(0,1-(MapModel.distance(p,a.xy)/a.radius)**2);if(influence<=0)continue;for(let [tag,value]of Object.entries(a.tags)){let v=Math.round(value*influence*100)/100;if(v>=.15)attributes[tag]=Math.max(attributes[tag]||0,v)}for(let [tag,value]of Object.entries(a.genres||{})){let v=Math.round(value*influence*100)/100;if(v>=.15)genres[tag]=Math.max(genres[tag]||0,v)}}
 for(let a of districts){let influence=Math.max(0,1-(MapModel.distance(p,a.xy)/a.radius)**2);if(influence<=0)continue;for(let [tag,value]of Object.entries(a.tags)){let v=Math.round(value*influence*100)/100;if(v>=.15)attributes[tag]=Math.max(attributes[tag]||0,v)}}
 for(let [flag,tag]of [[1,'school'],[2,'hospital'],[4,'care'],[8,'media'],[16,'station'],[32,'theme']])if((c[8]||0)&flag)attributes[tag]=4;
 c[9]=attributes;c[10]=genres;c[11]=b;
 }return mesh}
 function label(c){if(!c)return '';return Object.entries(c[9]||{}).filter(([k,v])=>definitions[k]&&v>=.6).sort((a,b)=>b[1]-a[1]).map(([k,v])=>definitions[k][0]).join('・')}

 const groups={
 residential:['住宅街',['residential'],'#a39b8e'],office:['オフィス街',['office','international'],'#3266b5'],shopping:['商業・ショッピング街',['shopping','fashion','lifestyle','arcade'],'#df9620'],student:['学校・学生街',['student','school'],'#bba600'],night:['歓楽街・夜の飲食街',['night'],'#c34c86'],adult:['風俗街',['adult'],'#a01444'],subculture:['オタク・サブカル街',['subculture'],'#8043c5'],tourism:['観光地',['tourist','inbound'],'#ef6528'],industrial:['工業地帯',['industrial'],'#6266a5'],warehouse:['倉庫・物流地区',['warehouse'],'#8b683c'],market:['市場・問屋街',['market','wholesale'],'#b7803c'],specialty:['古書・専門商店街',['books','specialty','publishing'],'#986017'],culture:['美術館・博物館・劇場',['culture','theater'],'#b25bb0'],research:['大学・研究地区',['research'],'#748a23'],medical:['病院・医療福祉地区',['hospital','care','medical'],'#c85f68'],government:['行政・政治・司法地区',['government','politics','legal'],'#535b92'],religion:['神社・寺院・門前町',['shrine','temple'],'#b16a31'],sports:['スポーツ施設地区',['sports'],'#658a30'],hotel:['ホテル・宿泊地区',['hotel'],'#657ec3'],multicultural:['多文化商業地区',['multicultural'],'#a77aab'],green:['公園・緑地',['green'],'#33a15b'],forest:['森林',['forest'],'#125b35'],waterfront:['水辺・遊歩道',['waterfront'],'#32a0a3'],station:['駅・交通拠点',['station'],'#485d77'],theme:['テーマパーク',['theme'],'#ec754c'],media:['テレビ・ラジオ局',['media'],'#7954a3'],water:['水域',['water'],'#42a4d2'],palace:['皇居内部',['palace'],'#345246'],cemetery:['墓地・霊園',['cemetery'],'#79796f'],special:['空港等の特殊区域',['special'],'#8e693e']};
 function score(c,k){return Math.max(0,...groups[k][1].map(tag=>c[9]?.[tag]||0))}
 function category(c){
  let b=c[11]||base[c[4]];
  if(c[5]>=0){if(['water','forest','green','palace','cemetery','warehouse','industrial','special'].includes(b))return b}
  for(let k of ['theme','media','station','medical'])if(groups[k][1].some(tag=>['theme','media','station','hospital','care'].includes(tag)&&(c[9]?.[tag]||0)>=4))return k;
  let candidates=Object.keys(groups).filter(k=>!['residential','water','green','forest','palace','cemetery','special'].includes(k)&&score(c,k)>=1.2);
  const boost={adult:1.65,subculture:1.5,religion:1.4,specialty:1.35,culture:1.25,market:1.3,government:1.2,research:1.2,medical:1.2,multicultural:1.15};
  candidates.sort((a,b)=>score(c,b)*(boost[b]||1)-score(c,a)*(boost[a]||1));return candidates[0]||b;
 }
 function prominent(c){let selected=category(c),keys=Object.keys(groups).filter(k=>score(c,k)>=1.2);if(!keys.includes(selected))keys.unshift(selected);return [selected,...keys.filter(k=>k!==selected).sort((a,b)=>score(c,b)-score(c,a))]}
 function color(c,mode='district'){if(mode==='district')return groups[category(c)][2];if(mode==='land')return definitions[c[11]||base[c[4]]][1];if(groups[mode])return score(c,mode)>=.6?groups[mode][2]:null;return null}
 return {definitions,enrich,label,color,groups,score,category,prominent};
})();
if(typeof module!=='undefined')module.exports=MeshAttributes;

