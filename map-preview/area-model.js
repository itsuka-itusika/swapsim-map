/* Small, offline visitor-density model. All local densities/ages are game assumptions. */
const AreaModel=(()=>{
 const M=typeof MapModel!=='undefined'?MapModel:require('./model.js');
 const types={subculture:['趣味の来街者',14,49,.5],office:['勤務・業務中',22,64,.45],student:['街の学生',18,24,.5],shopping:['買い物・街歩き',16,69,.55],tourist:['国内観光客',6,79,.52],inbound:['外国人観光客',6,79,.5],night:['夜の飲食・娯楽客',20,64,.4],night_worker:['飲食店の勤務者',20,64,.5],cabaret_worker:['夜の接客業の勤務者',20,55,1],host_worker:['ホストクラブの勤務者',20,44,0],adult_customer:['成人向け店舗の利用客',20,69,0],adult_worker:['成人向け店舗の勤務者',20,55,.9]};
 function activity(k,t){let h=t.hf??t.h,we=t.dow===0||t.dow===6||t.holiday;
 if(k==='office')return we?(h>=9&&h<19?.08:.01):h>=9&&h<18?1:h>=7&&h<21?.35:.02;
 // Customer scenes in the original pool begin at noon; staff prepare from 10:00.
 if(k==='adult_customer')return h>=18?1:h<3?.7:h>=12?.4:0;
 if(k==='adult_worker')return h>=18?1:h<3?.7:h>=10?.4:0;
 if(k==='cabaret_worker')return h>=18&&h<24?1:0;
 // Host clubs open from about 19:00 and close by 1:00.
 if(k==='host_worker')return h>=19||h<1?1:0;
 if(k==='night'||k==='night_worker'){let factor=(t.dow===5||t.dow===6||t.holiday)?1.2:1;return factor*(h>=18?1:h<3?.8:h<5?.2:h>=12?.15:0);}
 if(k==='student')return h>=10&&h<21?(we?.45:h>=15?1:.65):0;
 if(k==='subculture')return h>=10&&h<21?(we?1.3:1):0;
 if(k==='shopping')return h>=10&&h<21?(we?1.25:1):h>=8&&h<23?.15:0;
 return h>=8&&h<21?(we?1.15:1):h>=6&&h<23?.15:.03;
 }
 function components(p,r,t,regions,areas,exclude=()=>false){let buckets=new Map(),N=128;
 const nearby=areas.filter(a=>M.distance(p,a.xy)<r+a.radius);if(!nearby.length)return [];
 for(let i=0;i<N;i++){let ang=i*2.399963229728653,rr=r*Math.sqrt((i+.5)/N),q=[p[0]+Math.cos(ang)*rr/(111195*Math.cos(p[1]*Math.PI/180)),p[1]+Math.sin(ang)*rr/111195],region=M.locate(q,regions);if(!region||exclude(q))continue;
 for(let [role,def]of Object.entries(types)){let winner=null,best=0;for(let a of nearby){let d=M.distance(q,a.xy),v=(a.tags[role==='night_worker'?'night':['cabaret_worker','adult_customer','adult_worker'].includes(role)?'adult':role]||0)*(['cabaret_worker','adult_customer','adult_worker'].includes(role)?(role==='cabaret_worker'&&a.adultStyle==='sexservice'?0:a.adultBoost||1):1)*Math.max(0,1-(d/a.radius)**2);if(v>best){best=v;winner=a}}if(!winner)continue;
 // Use max density per role at each sampled point: overlapping neighborhoods do not stack.
 let n=best*({night:6500,night_worker:1600,cabaret_worker:350,adult_customer:2200,adult_worker:1100}[role]||1500)*activity(role,t)*Math.PI*(r/1000)**2/N;if(!n)continue;let key=winner.id+'/'+role+'/'+region.id;
 if(!buckets.has(key))buckets.set(key,{role:'area_'+role,label:def[0],n:0,min:def[1],max:def[2],female:role==='subculture'?(winner.subcultureFemale??.5):role==='shopping'&&winner.tags.fashion?.62:def[3],region,area:winner});buckets.get(key).n+=n;
 }}return [...buckets.values()];
 }
 function age(c,random=Math.random){if(c.role==='area_subculture'){let [lo,hi]=c.area.subcultureAge||[14,49];return lo+Math.floor(random()*(hi-lo+1))}let youth=c.area?.tags.youth||0;if(['area_shopping','area_tourist','area_inbound','area_night'].includes(c.role)&&random()<youth/5){let lo=c.role==='area_night'?20:16;return lo+Math.floor(random()*(35-lo))}return c.min+Math.floor(random()*(c.max-c.min+1))}
 return {components,activity,age,types};
})();
if(typeof module!=='undefined')module.exports=AreaModel;

