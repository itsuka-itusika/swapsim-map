const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const N=require('./store-names.js'),O=require('./osm-profile.js');
const data=JSON.parse(fs.readFileSync('map-preview/data/large-facilities.json','utf8'));
test('branch tags and Japanese names retain full store identity without duplication',()=>{
 assert.equal(N.fromTags({name:'Bic Camera','name:ja':'ビックカメラ',branch:'渋谷東口店'}),'ビックカメラ 渋谷東口店');
 assert.equal(N.fromTags({name:'ビックカメラ渋谷東口店',branch:'渋谷東口'}),'ビックカメラ渋谷東口店');
 assert.equal(N.fromTags({name:'ビックカメラ',branch:'ビックカメラ渋谷東口店'}),'ビックカメラ渋谷東口店');
 assert.equal(N.fromTags({name:'ビックカメラ',official_name:'ビックカメラ新宿東口店'}),'ビックカメラ新宿東口店');
 assert.equal(N.fromTags({name:'コジマ×ビックカメラコジマ×ビックカメラ池上店'}),'コジマ×ビックカメラ池上店');
 const [parsed]=O.parse({elements:[{type:'node',id:1,lon:139.702083,lat:35.659798,tags:{shop:'electronics',name:'ビックカメラ','branch:ja':'渋谷東口店'}}]});
 assert.equal(parsed.name,'ビックカメラ 渋谷東口店');
});
test('bundled aliases are merged into one full store name at each location',()=>{
 const keys=data.features.map(f=>f.xy.join(',')+'|'+f.placeKind);assert.equal(new Set(keys).size,keys.length);
 for(const [xy,expected] of [[[139.702083,35.659798],'ビックカメラ渋谷東口店'],[[139.698499,35.692499],'ビックカメラ新宿西口店'],[[139.708934,35.730858],'ビックカメラ池袋西口店'],[[139.77252,35.681128],'丸善日本橋店']]){
  const same=data.features.filter(f=>f.xy[0]===xy[0]&&f.xy[1]===xy[1]);assert.equal(same.length,1);assert.equal(same[0].name,expected);
 }
 assert.ok(!data.features.some(f=>/^(ビックカメラ|ヨドバシカメラ|ヤマダデンキ|ノジマ|丸善|三省堂書店)$/.test(f.name)));
});
test('old cached short names resolve to their own branch in notice and list labels',()=>{
 const xy=[139.702083,35.659798],lc={name:'ビックカメラ',xy,type:'mall',subtype:'large_shop',source:'OpenStreetMap',tags:{name:'ビックカメラ',shop:'electronics'}};
 const ctx=vm.createContext({StoreNames:N,MAP_DATA:{specialPlaces:data.features}});vm.runInContext(fs.readFileSync('map-preview/place-label.js','utf8')+';globalThis.L=PlaceLabel;',ctx);
 const c={role:'place_shop_guest',landComponent:lc,region:{name:'渋谷区'}};
 assert.equal(ctx.L.name(c),'ビックカメラ渋谷東口店');assert.equal(ctx.L.label(c,{sit:{state:'off'}},lc.name),'ビックカメラ渋谷東口店');
 assert.equal(N.resolve({...lc,xy:[139.81,35.8]},data.features),'ビックカメラ');
 const near=[{name:'ビックカメラ A店',xy},{name:'ビックカメラ B店',xy:[xy[0]+.00001,xy[1]]}];assert.equal(N.resolve(lc,near),'ビックカメラ');
 assert.equal(ctx.L.label({...c,facility:{name:'別の施設'}},{sit:{}},'別の施設'),'別の施設');
});
