/* Local approximately 100m grid, not a measured 100m census dataset. */
const MeshModel=(()=>{
 const names=['住宅街','学生街','緑地','オフィス街','歓楽街','工業地帯','倉庫街','商業地','水域','特殊施設'];
 const sx=111195*Math.cos(35.7*Math.PI/180),sy=111195,origin=[139,35];let data,index;
 const xy=(x,y)=>[origin[0]+(x+.5)*100/sx,origin[1]+(y+.5)*100/sy];
 const key=p=>[Math.floor((p[0]-origin[0])*sx/100),Math.floor((p[1]-origin[1])*sy/100)];
 function configure(d){data=d;index=new Map(d.cells.map(c=>[c[0]+','+c[1],c]))}
 function cell(p){let k=key(p);return index?.get(k.join(','))}
 function rect(c){let p=xy(c[0],c[1]);return [[p[1]-50/sy,p[0]-50/sx],[p[1]+50/sy,p[0]+50/sx]]}
 function components(p,r,t,regions){let [x,y]=key(p),reach=Math.ceil(r/100)+1,out=[];const h=t.hf??t.h,we=t.dow===0||t.dow===6||t.holiday;
 for(let i=x-reach;i<=x+reach;i++)for(let j=y-reach;j<=y+reach;j++){let c=index.get(i+','+j);if(!c)continue;let center=xy(i,j);if(MapModel.distance(p,center)>r+72)continue;
 // Integrate actual 100m cells using 25 subpoints. Never smear facility mass over the grid.
 let count=0;for(let u=0;u<5;u++)for(let v=0;v<5;v++){let q=[center[0]+(u-2)*20/sx,center[1]+(v-2)*20/sy];if(MapModel.distance(p,q)<=r&&MapModel.locate(q,regions)?.id===regions[c[2]].id)count++}if(!count)continue;
 let area=.01*count/25,region=regions[c[2]],zone=c[5]>=0?data.zones[c[5]]:null;
 if(c[4]===8)continue;
 const add=(role,label,density,min=22,max=64,female=.5,extra={})=>{if(density>0)out.push({role,label,n:density*area,region,min,max,female,mesh:c,...extra})};
 if(!(zone?.kind==='palace'))for(let u of UrbanContext.roles(c,t))add(u.role,u.label,u.density,u.min,u.max,u.female,{jobTag:u.jobTag,urbanTag:u.urbanTag,zone});
 if(zone){let model=zone.model==='green'?GreenModel:LandModel;for(let z of model.roles(zone,t))add(z.role,z.label,z.density,z.min,z.max,z.female,{zone});continue}
 let activity=h>=9&&h<17?(we?.85:.5):h>=7&&h<9||h>=17&&h<21?.8:1;
 add('general',names[c[4]]+'の住民',c[6]*activity);
 if(c[4]===5||c[4]===6){let work=h>=8&&h<18?(we?.3:1):h>=18&&h<23?.3:.12;add(c[4]===5?'mesh_factory':'mesh_logistics',c[4]===5?'製造業の勤務者':'倉庫・物流の勤務者',(c[4]===5?2200:1300)*work,20,69,.25);add('mesh_security','施設警備員',h>=8&&h<20?45:20,22,69,.2)}
 for(let w of c[7]){let a=MAP_DATA.areas[w[0]],k=w[1],def=AreaModel.types[k];if(!def)continue;let density=w[2]*({night:6500,night_worker:1600,cabaret_worker:350,adult_customer:2200,adult_worker:1100}[k]||1500)*AreaModel.activity(k,t);add('area_'+k,def[0],density,def[1],def[2],k==='subculture'?(a.subcultureFemale??.5):k==='shopping'&&c[9]?.fashion>=.6?.62:def[3],{area:a})}
 }
 return out;
 }
 return {names,xy,key,configure,cell,rect,components};
})();
if(typeof module!=='undefined')module.exports=MeshModel;

