/* Non-residential land replaces background/visitor density point by point. */
const GreenModel=(()=>{
 const M=typeof MapModel!=='undefined'?MapModel:require('./model.js');
 let zones=[];
 function configure(z){zones=z}
 function at(p){return zones.find(z=>p[0]>=z.bbox[0]&&p[0]<=z.bbox[2]&&p[1]>=z.bbox[1]&&p[1]<=z.bbox[3]&&M.inside(p,z.geometry))}
 function eastOpen(t){let h=t.hf??t.h,end=t.mo>=11||t.mo<=2?16:t.mo===10?16.5:(t.mo>=5&&t.mo<=8||t.mo===4&&t.d>=15)?18:17;let holiday=t.holiday;
 let dt=new Date(Date.UTC(t.y,t.mo-1,t.d)-86400000),prev=typeof holName==='function'?holName({y:dt.getUTCFullYear(),mo:dt.getUTCMonth()+1,d:dt.getUTCDate(),dow:dt.getUTCDay()}):false;
 let closed=(t.dow===1||t.dow===5)&&!holiday||t.dow===2&&prev&&!holiday||t.mo===12&&t.d>=28||t.mo===1&&t.d<=3||t.mo===2&&t.d===23;return !closed&&h>=9&&h<end}

 function natureOpen(t){let h=t.hf??t.h,end=t.mo>=5&&t.mo<=8?17:16.5,dt=new Date(Date.UTC(t.y,t.mo-1,t.d)-86400000),prev=typeof holName==='function'&&holName({y:dt.getUTCFullYear(),mo:dt.getUTCMonth()+1,d:dt.getUTCDate(),dow:dt.getUTCDay()});return h>=9&&h<end&&!(t.dow===1&&!t.holiday||prev&&![0,6].includes(t.dow)||t.mo===12&&t.d>=28||t.mo===1&&t.d<=4)}
 const row=(role,label,density,min,max,female)=>({role:'green_'+role,label,density,min,max,female});
 function roles(z,t){let h=t.hf??t.h,day=h>=8&&h<18,we=t.dow===0||t.dow===6||t.holiday;
 if(z.kind==='palace'){let area=z.geometry&&typeof MapSpatial!=='undefined'?MapSpatial.area(z.geometry):1e6;return [row('imperial_priest','神職',.5/Math.max(.01,area/1e6),45,80,0),row('guard','皇宮護衛官',day?90:12,20,60,.2),row('official','宮内庁職員',day?(we?35:160):2,22,65,.45),row('gardener','庭園管理作業員',day?35:0,22,69,.3),row('maintenance','施設管理技術者',day?25:2,22,65,.2),...(typeof SeasonalEvents!=='undefined'?SeasonalEvents.sangaRows(t,area):[])];}
 let open=z.calendar==='nature-study'?natureOpen(t):z.kind==='east'?eastOpen(t):h>=(z.open??0)&&h<(z.close??24)&&t.dow!==z.closedDow;
 let visitor=open?(day?(we?1.4:1):h>=6&&h<22?.04:.003):0;
 let base=z.kind==='forest'?220:z.kind==='outer'?850:z.kind==='east'?1400:900;
 let rs=[row('walk','散歩・休憩中',base*.5*visitor,6,89,.55),row('tourist','庭園・公園の来園者',base*.3*visitor,6,79,.52),row('gardener','公園管理作業員',day?18:0,22,69,.35),row('parkguard','公園の警備員',day?10:4,22,69,.2)];
 if(!['garden','east'].includes(z.kind))rs.push(row('run','運動中',base*.2*visitor,16,69,.4));
 if(z.kind==='east')rs.push(row('guard','皇宮護衛官',day?25:5,20,60,.2));
 return rs;
 }
 function components(p,r,t,regions){let out=new Map(),N=256;for(let i=0;i<N;i++){let a=i*2.399963229728653,rr=r*Math.sqrt((i+.5)/N),q=[p[0]+Math.cos(a)*rr/(111195*Math.cos(p[1]*Math.PI/180)),p[1]+Math.sin(a)*rr/111195],z=at(q);if(!z||(typeof LandModel!=='undefined'&&LandModel.at(q)))continue;let region=M.locate(q,regions);if(!region)continue;for(let role of roles(z,t)){if(!role.density)continue;let key=z.id+'/'+role.role+'/'+region.id;if(!out.has(key))out.set(key,{...role,n:0,region,zone:z});out.get(key).n+=role.density*Math.PI*(r/1000)**2/N}}return [...out.values()]}
 const texts={sanga:['一般参賀に訪れているところでした'],sanga_guard:['一般参賀の警備にあたっているところでした'],guard:['皇居の警備に従事しているところでした','警備の引き継ぎ内容を確認しているところでした'],official:['宮内庁の業務資料を確認しているところでした','庁内の連絡事項を整理しているところでした'],gardener:['園内の落ち葉を集めているところでした','植え込みの手入れをしているところでした'],maintenance:['施設の設備を点検しているところでした','設備の点検記録を確認しているところでした'],parkguard:['園内を巡回しているところでした','園内の安全を確認しているところでした'],walk:['園路をゆっくり散歩しているところでした','ベンチでひと休みしているところでした'],tourist:['庭園の景色を写真に収めているところでした','案内板を読みながら園内を巡っているところでした'],run:['園内のコースを走っているところでした','運動の合間に水分を補給しているところでした']};
 function handles(c){return c.role.startsWith('green_')}
 function assign(c,P){if(!handles(c))return;let key=c.role.slice(6);if(['guard','official','gardener','maintenance','parkguard','imperial_priest','sanga_guard'].includes(key))P.occ={label:c.label,group:'adult',cat:'special',p:1};else if(['facility','prison'].includes(P.occ.group))P.occ={label:'無職',group:'adult',cat:'none',p:1};}
 function apply(c,P){if(!handles(c))return false;let key=c.role.slice(6),pool=(typeof MAP_DATA!=='undefined'&&MAP_DATA.storyScenes?.green?.[key])||texts[key];P.mapSituation=pool[Math.floor(rnd()*pool.length)];P.sit={text:P.mapSituation,state:['walk','tourist','run'].includes(key)?'off':'work',stateLabel:c.label,p:1};P.visitLabel=c.zone.name+'／'+c.label;return true}
 return {configure,at,eastOpen,roles,components,handles,assign,apply,texts};
})();
if(typeof module!=='undefined')module.exports=GreenModel;

