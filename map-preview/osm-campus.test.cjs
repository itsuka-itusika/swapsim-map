const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const html=fs.readFileSync('dist/map-preview.html','utf8'),ctx=vm.createContext({console});vm.runInContext(html.slice(html.indexOf('// ===== 統計データ'),html.indexOf("'use strict';\nconst el=id")),ctx);const run=s=>vm.runInContext(s,ctx);
run(`for(let f of MAP_DATA.regions){f.density=censusMass(f.id)/f.area;f.residentialDensity=censusMass(f.id)/(MAP_DATA.zoning.residentialAreaKm2[f.id]||f.area)}var envContext=LandProfile.configure(MAP_DATA);`);
// A campus drawn in OpenStreetMap as a named site, unnamed university buildings and buildings named after the school.
test('OpenStreetMap campus parts fold into the official school instead of becoming schools named "university"',()=>{
 const r=JSON.parse(run(`(()=>{const f=MAP_DATA.facilities.find(x=>x.name==='東京海洋大学'&&MapModel.distance(x.xy,[139.746881,35.626354])<50),[x,y]=f.xy;
  const box=(cx,cy,dx,dy)=>[[cx-dx,cy-dy],[cx+dx,cy-dy],[cx+dx,cy+dy],[cx-dx,cy+dy],[cx-dx,cy-dy]].map(([lon,lat])=>({lon,lat}));
  const way=(id,tags,g)=>({type:'way',id,tags,geometry:g});
  const payload={elements:[way(1,{amenity:'university',name:'東京海洋大学 品川キャンパス'},box(x,y,.0025,.002)),way(2,{amenity:'university',building:'yes'},box(x+.001,y+.0008,.0001,.0001)),
   way(3,{amenity:'university',name:'東京海洋大学博物館'},box(x-.001,y-.0008,.0001,.0001)),way(4,{amenity:'university'},box(x+.0035,y,.0001,.0001)),{type:'node',id:5,lat:y+.0005,lon:x,tags:{amenity:'university',name:'東京海洋大学（水産学部）'}}]};
  const feats=OSMProfile.parse(payload),p=LandProfile.create(envContext,f.xy,300,feats),t={y:2026,mo:11,d:11,dow:3,h:10,hf:10.3,mi:18,rand:false};
  const edu=p.parts.filter(c=>c.type==='education');let rows=LandEstimator.estimate(p,t),tot=rows.reduce((s,c)=>s+c.n,0),labels=new Set();
  for(let i=0;i<300;i++){let c=MapModel.pick(rows),P=mapPerson({...c,roleP:c.n/tot},t);labels.add(P.place)}
  return JSON.stringify({edu:edu.map(c=>[c.name,(c.facilities||[]).map(x=>x.id)]),labels:[...labels],festival:CampusFestival.festivals(edu[0].facilities[0]).map(x=>x[0])})})()`));
 assert.equal(r.edu.length,1,JSON.stringify(r.edu));assert.equal(r.edu[0][1][0],'school-13-4371');
 assert.ok(!r.labels.some(l=>/university|東京海洋大学博物館|水産学部/.test(l)),r.labels.join());
 assert.ok(r.festival.includes('海鷹祭'));
});
