const test=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),vm=require('vm');
const html=fs.readFileSync('dist/map-preview.html','utf8'),ctx=vm.createContext({console});vm.runInContext(html.slice(html.indexOf('// ===== 統計データ'),html.indexOf("'use strict';\nconst el=id")),ctx);const run=s=>vm.runInContext(s,ctx);
run(`for(let f of MAP_DATA.regions){f.density=censusMass(f.id)/f.area;f.residentialDensity=censusMass(f.id)/(MAP_DATA.zoning.residentialAreaKm2[f.id]||f.area)}`);
// Draw the original engine directly with a fixed household and partner flag.
const draw=(opts,n)=>run(`(()=>{const o=${JSON.stringify(opts)},out=[];for(let i=0;i<${n};i++){const pref=PREFS.find(p=>p.n==='東京都'),muni=pref.munis[0],t={y:2026,mo:10,d:24,dow:o.dow,h:Math.floor(o.h),hf:o.h,mi:0,rand:true};
 const P={pref,muni,urb:'metro',age:o.age,sex:o.sex,t};P.birth=birthOf(P.age,t);P.g=gradeIndex(P.birth,t);P.occ={label:'会社員',group:'adult',cat:'事務',tag:'office',p:1};P.hb={preg:0,pp:-1,leave:false,bed:null};
 P.household={i:o.hh,mar:o.mar};P.familyContext={ownChild:false,youngest:null,children:[],awayChildren:[],grandchild:false,partner:o.partner,members:o.hh===0?[]:['母']};
 const s=situation(P,t);out.push([s.text,s.stateLabel]);}return out})()`);
const romance=/恋人|彼氏|彼女|デート|付き合って|付き合い始め/;
test('people with a partner spend part of a weekend afternoon with them',()=>{
 const xs=draw({dow:6,h:14,age:27,sex:'f',hh:0,mar:'single',partner:true},1500);
 const share=xs.filter(([x])=>romance.test(x)).length/xs.length;
 assert.ok(share>.12&&share<.45,'share '+share);
 assert.ok(xs.some(([,l])=>l==='デート中'));assert.ok(xs.some(([,l])=>l==='恋人と過ごしている'));
});
test('partner scenes stay away from married people and people without a partner',()=>{
 for(const o of [{mar:'married',partner:false},{mar:'single',partner:false}]){
  const xs=draw({dow:6,h:15,age:28,sex:'m',hh:0,...o},800);
  assert.equal(xs.filter(([x])=>/恋人|彼女と|彼女の|付き合って|付き合い始め/.test(x)).length,0);
 }
});
test('solo-flat partner scenes need a one-person household',()=>{
 const xs=draw({dow:0,h:15,age:25,sex:'f',hh:1,mar:'single',partner:true},1500);
 assert.equal(xs.filter(([x])=>/一人暮らしの部屋|泊まりに来た|部屋に来た恋人/.test(x)).length,0);
 assert.ok(xs.some(([x])=>/家に(遊びに)?来た恋人/.test(x)));
});
test('teen partners get no overnight or late scenes',()=>{
 const xs=draw({dow:6,h:23,age:16,sex:'m',hh:1,mar:'single',partner:true},800);
 assert.equal(xs.filter(([x])=>/泊まりに来た|居酒屋/.test(x)).length,0);
});
