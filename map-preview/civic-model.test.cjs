const fs=require('node:fs'),vm=require('node:vm'),test=require('node:test'),assert=require('node:assert/strict');
const html=fs.readFileSync('dist/map-preview.html','utf8'),ctx=vm.createContext({console});vm.runInContext(html.slice(html.indexOf('// ===== 統計データ'),html.indexOf("'use strict';\nconst el=id")),ctx);const run=s=>vm.runInContext(s,ctx);
run(`GreenModel.configure(MAP_DATA.greenZones);LandModel.configure(MAP_DATA.waters,MAP_DATA.landZones);for(let f of MAP_DATA.regions){f.density=censusMass(f.id)/f.area;f.residentialDensity=censusMass(f.id)/(MAP_DATA.zoning.residentialAreaKm2[f.id]||f.area)}const context=LandProfile.configure(MAP_DATA),T={y:2026,mo:10,d:27,dow:2,h:13,hf:13,mi:0,venueEvent:'none'};`);
test('offline footprints classify major institutions, with no nearby residential spill',()=>{
 const result=run(`(()=>{let out=[];for(let name of ['東京拘置所','練馬駐屯地','十条駐屯地','三宿駐屯地','目黒地区','用賀駐屯地','市ヶ谷地区','国会議事堂','中央合同庁舎第2号館','東京都庁舎 第一本庁舎']){let f=MAP_DATA.publicAreas.find(f=>f.name.includes(name));if(!f)throw Error(name);let p=[f.xy,...MapSpatial.samples(f.xy,250,1024)].find(p=>MapSpatial.contains(p,f)&&MapModel.locate(p,MAP_DATA.regions));let profile=LandProfile.create(context,p,20);let z=profile.classify(p);if(z.civicKind!==f.civicKind)throw Error(name+' '+z.name);let outside=[f.bbox[2]+.0003,f.bbox[3]+.0003];if(profile.classify(outside)?.id===f.id)throw Error('spill');out.push(z.civicKind)}return out})()`);
 assert.equal(result.length,10);
});
test('each dedicated role produces a full person, correct custody status and situation',()=>{
 const count=run(`(()=>{let n=0;for(let kind of ['detention','military','government','parliament','prison']){let f=MAP_DATA.publicAreas.find(f=>f.civicKind===(kind==='prison'?'detention':kind)),region=MapModel.locate(f.xy,MAP_DATA.regions);let c={...f,subtype:kind,civicKind:kind,region,areaM2:f.area};for(let h of [2,13,19])for(let dow of [0,2]){let t={...T,h,hf:h,dow};for(let z of CivicModel.roles(c,t).filter(z=>z.w>0)){let P=mapPerson({...z,region,landComponent:c,landType:'public'},t);if(!P.body||!P.health||!P.birth||!P.surname||!P.given)throw Error('profile');if(!MAP_DATA.storyScenes.civic[z.civicScene]?.includes(P.sit.text))throw Error('scene');if(!z.visitor&&P.occ.label!==JobLabels.short(z.label))throw Error('occupation');if(z.role==='civic_untried'&&/受刑|服役/.test(P.occ.label))throw Error('presumption');if(z.role==='civic_member_upper'&&P.age<30)throw Error('age');n++}}}return n})()`);
 console.log('civic role profiles',count);assert.ok(count>100);
});
test('weekends and nights reduce work, retain custody and duty staff, and scale by clipped area',()=>{
 assert.equal(run(`CivicModel.roles({subtype:'detention',area:100000}, {...T,h:2,hf:2}).find(x=>x.role==='civic_untried').w>0`),true);
 assert.equal(run(`CivicModel.roles({subtype:'government',area:10000}, {...T,h:2,hf:2}).find(x=>x.role==='civic_consult').w`),0);
 assert.equal(run(`CivicModel.roles({subtype:'military',area:10000}, {...T,dow:0}).find(x=>x.role==='civic_training').w`),0);
 const ratio=run(`(()=>{let c={subtype:'detention',area:100000,areaM2:10000};return LandEstimator.estimatePopulation(c,T,{})/LandEstimator.estimatePopulation({...c,areaM2:100000},T,{})})()`);assert.ok(Math.abs(ratio-.1)<1e-9);
 const O=require('./osm-profile.js');assert.equal(O.classification({amenity:'prison',name:'刑務所'})[1],'prison');assert.equal(O.classification({amenity:'prison',name:'拘置所'})[1],'detention');assert.notEqual(O.classification({building:'yes',tourism:'hotel',name:'アパホテルプライド国会議事堂前'})?.[1],'parliament');
});
