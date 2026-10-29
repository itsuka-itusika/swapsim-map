/* Pure geographic helpers. Coordinates are [longitude, latitude]. */
const MapModel = (() => {
 const R=6371008.8,rad=Math.PI/180;
 function distance(a,b){let p=(b[1]-a[1])*rad,q=(b[0]-a[0])*rad;let h=Math.sin(p/2)**2+Math.cos(a[1]*rad)*Math.cos(b[1]*rad)*Math.sin(q/2)**2;return 2*R*Math.asin(Math.min(1,Math.sqrt(h)))}
 function ring(p,r){let inside=false;for(let i=0,j=r.length-1;i<r.length;j=i++){let a=r[i],b=r[j];if((a[1]>p[1])!==(b[1]>p[1])&&p[0]<(b[0]-a[0])*(p[1]-a[1])/(b[1]-a[1])+a[0])inside=!inside}return inside}
 function inside(p,g){let polys=g.type==='Polygon'?[g.coordinates]:g.coordinates;return polys.some(poly=>ring(p,poly[0])&&!poly.slice(1).some(h=>ring(p,h)))}
 function locate(p,regions){return regions.find(f=>p[0]>=f.bbox[0]&&p[0]<=f.bbox[2]&&p[1]>=f.bbox[1]&&p[1]<=f.bbox[3]&&inside(p,f.geometry))}
 // Disk intersection; point sources are spread over a small modeled facility footprint, never a census mesh.
 function overlap(d,r,s){if(d>=r+s)return 0;if(d<=Math.abs(r-s))return r>=s?1:r*r/(s*s);let a=Math.acos(Math.max(-1,Math.min(1,(d*d+s*s-r*r)/(2*d*s)))),b=Math.acos(Math.max(-1,Math.min(1,(d*d+r*r-s*s)/(2*d*r))));return (s*s*a+r*r*b-.5*Math.sqrt(Math.max(0,(-d+s+r)*(d+s-r)*(d-s+r)*(d+s+r))))/(Math.PI*s*s)}
 function roles(f,t){if(['station','theme'].includes(f.kind))return SpecialFacilities.roles(f,t);if(['tv','radio'].includes(f.kind))return BroadcastModel.roles(f,t);let day=t.h>=8&&t.h<18,school=day&&t.dow>0&&t.dow<6&&!t.holiday&&!(typeof schoolVac==='function'&&schoolVac(t));let female=typeof SchoolPolicy!=='undefined'?SchoolPolicy.femaleRate(f,t):f.sex==='female'?1:f.sex==='male'?0:.5;
 if(f.kind==='prep'&&typeof PrepModel!=='undefined')return PrepModel.roles(f,t);
 if(f.kind==='care')return [{role:'resident',label:'入居者',n:60,min:75,max:99,female:.7},{role:'care',label:'介護職員',n:day?20:5,min:22,max:65,female:.7}];
 if(f.kind==='hospital'&&typeof HospitalModel!=='undefined')return HospitalModel.roles(f,t);
 if(f.kind==='hospital')return [{role:'patient',label:'患者',n:day?120:60,min:0,max:95,female:.55},{role:'nurse',label:'看護師',n:day?45:15,min:22,max:65,female:.85},{role:'doctor',label:'医師',n:day?15:4,min:26,max:70,female:.3}];
 let bands={primary:[6,11,300],middle:[12,14,300],high:[15,17,600],university:[18,24,1500],college:[18,24,300],kindergarten:[3,5,80]};let b=bands[f.kind];if(!b)return [];
 return [{role:'student',label:{primary:'小学生',middle:'中学生',high:'高校生',university:'大学生',college:'専門学校等の学生',kindergarten:'園児'}[f.kind],n:b[2]*(school?1:day&&['high','middle','university'].includes(f.kind)?.08:0),min:b[0],max:b[1],female},{role:'teacher',label:f.kind==='kindergarten'?'保育教諭':'教員',n:school?Math.max(10,b[2]/15):day?4:0,min:23,max:65,female:.5}];
 }
 function components(p,r,t,regions,facilities,exclude=()=>false,water=()=>false){let buckets=new Map(),samples=256;for(let i=0;i<samples;i++){let a=i*2.399963229728653,rr=r*Math.sqrt((i+.5)/samples),q=[p[0]+Math.cos(a)*rr/(111195*Math.cos(p[1]*rad)),p[1]+Math.sin(a)*rr/111195];let f=exclude(q)?null:locate(q,regions);if(f)buckets.set(f.id,(buckets.get(f.id)||0)+1)}let out=[];for(let [id,n]of buckets){let f=regions.find(v=>v.id===id);out.push({role:'general',label:f.name+'の一般滞在者',n:f.density*Math.PI*(r/1000)**2*n/samples*(t.h>=8&&t.h<18?.65:1),region:f})}for(let f of facilities){let d=distance(p,f.xy);if(d>r+f.radius)continue;let q=overlap(d,r,f.radius);let bad=0;for(let i=0;i<64;i++){let a=i*2.399963229728653,rr=f.radius*Math.sqrt((i+.5)/64),pt=[f.xy[0]+Math.cos(a)*rr/(111195*Math.cos(f.xy[1]*rad)),f.xy[1]+Math.sin(a)*rr/111195];if(distance(p,pt)<=r&&water(pt))bad++;}q=Math.max(0,q-bad/64);for(let z of roles(f,t)){if(z.n*q>0)out.push({...z,n:z.n*q,facility:f,region:regions.find(v=>v.id===f.code)||locate(f.xy,regions)})}}return out.filter(z=>z.region&&z.n>0)}
 function pick(a,random=Math.random){let n=a.reduce((s,z)=>s+z.n,0);if(!n)return null;let v=random()*n;return a.find(z=>(v-=z.n)<0)||a[a.length-1]}
 return {distance,inside,locate,overlap,roles,components,pick};
})();
if(typeof module!=='undefined')module.exports=MapModel;

