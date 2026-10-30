const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const html=fs.readFileSync('dist/map-preview.html','utf8'),ctx=vm.createContext({console});vm.runInContext(html.slice(html.indexOf('// ===== 統計データ'),html.indexOf("'use strict';\nconst el=id")),ctx);let run=s=>vm.runInContext(s,ctx);
run(`for(let f of MAP_DATA.regions){f.density=censusMass(f.id)/f.area;f.residentialDensity=censusMass(f.id)/(MAP_DATA.zoning.residentialAreaKm2[f.id]||f.area)}const envContext=LandProfile.configure(MAP_DATA);`);
// Everyone drawn within 50m of a point at an hour: their scenes.
const draw=(xy,h)=>run(`(()=>{let t={y:2026,mo:10,d:30,dow:5,h:${h},hf:${h},mi:0,rand:true},p=LandProfile.create(envContext,${JSON.stringify(xy)},50),parts=LandEstimator.estimate(p,t),out=[];for(let i=0;i<300;i++){let c=MapModel.pick(parts);if(!c)break;out.push(mapPerson(c,t).sit.text)}return out})()`);
const places={浜離宮:[139.7635,35.6595],新宿御苑:[139.71,35.6852],青山霊園:[139.7232,35.6672],明治神宮:[139.6993,35.6764],葛西臨海水族園:[139.8622,35.6406]};
test('Staff at closed parks, cemeteries, shrines and sights do not deal with visitors at night',()=>{for(let [name,xy] of Object.entries(places))for(let h of [3,19.5]){let bad=draw(xy,h).filter(s=>run(`NightDuty.VISITORS`).test(s)&&!/ホテル|客室/.test(s));assert.equal(bad.length,0,name+' '+h+'時: '+bad.join(' / '))}});
test('Daytime visitor lines are left alone',()=>{let lines=draw([139.6993,35.6764],11);assert.ok(lines.some(s=>/参拝者|訪れた人|参道|社殿/.test(s)))});
