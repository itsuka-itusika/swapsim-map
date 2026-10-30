const LandModel=(()=>{
 const M=typeof MapModel!=='undefined'?MapModel:require('./model.js');let waters=[],lands=[];
 function configure(w,l){waters=w;lands=l}
 function near(p,z){return p[0]>=z.bbox[0]&&p[0]<=z.bbox[2]&&p[1]>=z.bbox[1]&&p[1]<=z.bbox[3]}
 function contains(p,z){if(!near(p,z))return false;if(z.geometry)return M.inside(p,z.geometry);let sx=111195*Math.cos(p[1]*Math.PI/180),sy=111195;return z.line.slice(1).some((b,i)=>{let a=z.line[i],x=(a[0]-p[0])*sx,y=(a[1]-p[1])*sy,dx=(b[0]-a[0])*sx,dy=(b[1]-a[1])*sy,u=Math.max(0,Math.min(1,-(x*dx+y*dy)/(dx*dx+dy*dy||1)));return Math.hypot(x+u*dx,y+u*dy)<z.width/2})}
 function water(p){return waters.find(z=>contains(p,z))}
 function at(p){return water(p)||lands.find(z=>contains(p,z))}
 const R=(key,label,n,min=22,max=64,female=.4)=>({role:'land_'+key,label,density:n,min,max,female});
 function roles(z,t){let h=t.hf??t.h,day=h>=7&&h<20;if(z.kind==='water')return [];
 if(typeof AirportModel!=='undefined'){let air=AirportModel.roles(z,t);if(air)return air}
 if(typeof PortModel!=='undefined'){let port=PortModel.roles(z,t);if(port)return port}
 if(z.kind==='terminal')return [R('passenger','空港利用客',day?2400:h>=5&&h<24?400:40,6,79,.5),R('airport','空港係員',day?500:50),R('security','施設警備員',day?70:25,22,64,.2)];
 if(z.kind==='airfield')return [R('maintenance','航空施設の整備・管理職員',day?35:6,22,64,.2),R('security','施設警備員',day?12:6,22,64,.2)];
 if(z.kind==='industrial')return [R('logistics','物流・工場勤務者',day?350:55,20,69,.25),R('security','施設警備員',day?12:5,22,69,.2)];
 if(z.kind==='cemetery')return [R('grave','墓参りの来訪者',h>=8&&h<17?150*(typeof SeasonalEvents!=='undefined'&&SeasonalEvents.higan(t)?3:1):0,6,89,.5),R('grounds','霊園管理作業員',h>=8&&h<17?15:0)];
 return [R('hike','緑地の散策者',h>=7&&h<17?35:0,12,79,.45),R('grounds','緑地管理作業員',h>=8&&h<17?3:0)];
 }
 function components(p,r,t,regions){let N=256,b=new Map();for(let i=0;i<N;i++){let a=i*2.399963229728653,rr=r*Math.sqrt((i+.5)/N),q=[p[0]+Math.cos(a)*rr/(111195*Math.cos(p[1]*Math.PI/180)),p[1]+Math.sin(a)*rr/111195],z=at(q);if(!z||z.kind==='water')continue;let region=M.locate(q,regions);if(!region)continue;for(let role of roles(z,t)){if(role.density<=0)continue;let k=z.id+'/'+role.role+'/'+region.id;if(!b.has(k))b.set(k,{...role,zone:z,region,n:0});b.get(k).n+=role.density*Math.PI*(r/1000)**2/N}}return [...b.values()]}
 const texts={passenger:'空港の案内表示で、搭乗口を確認しているところでした',airport:'空港の窓口で、利用客の案内をしているところでした',maintenance:'施設の設備を点検しているところでした',security:'施設内を巡回しているところでした',logistics:'作業場で、荷物や資材を確認しているところでした',grave:'墓前で手を合わせているところでした',grounds:'敷地内の清掃をしているところでした',hike:'緑地の散策路を歩いているところでした'};
 function assign(c,P){if(!c.role.startsWith('land_'))return;let key=c.role.slice(5);if(!['passenger','grave','hike'].includes(key))P.occ={label:c.label,group:'adult',cat:'special',p:1};else if(['facility','prison'].includes(P.occ.group))P.occ={label:'無職',group:'adult',cat:'none',p:1};}
 function apply(c,P){if(!c.role.startsWith('land_'))return;let key=c.role.slice(5),pool=typeof MAP_DATA!=='undefined'?MAP_DATA.storyScenes?.land?.[key]:null;P.mapSituation=pool?.length?pool[Math.floor(rnd()*pool.length)]:texts[key];P.sit={text:P.mapSituation,state:['land_passenger','land_grave','land_hike'].includes(c.role)?'off':'work',stateLabel:c.label,p:1};P.visitLabel=c.zone.name+'／'+c.label;}
 return {configure,contains,water,at,components,roles,assign,apply};
})();
if(typeof module!=='undefined')module.exports=LandModel;

