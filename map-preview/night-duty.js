/* Staff at places that close at night (parks, cemeteries, stadiums, shrines and temples, museums, shops) draw from
   untimed pools, so at 3 a.m. a park guard could be showing visitors the way. After closing, a line that needs visitors
   gives way to a night-duty one. Hotels, cinemas, baths and other places open all night keep their own lines. */
const NightDuty=(()=>{
 const VISITORS=/来園者|来場者|参拝者|参拝に訪れ|訪れた人|道を尋ね|人の流れ|通行する人|通る人|人が通る|客に|客から|客席|お客|利用者|入場を待つ|順路|窓口で|受け付け|貸し出し|調べものの相談|会計/;
 const ROLE=/^(green_|venue_|land_grounds|urban_(shrine|temple|museum|theater|sports|visit)|place_(shrine|temple|museum|theatre|tourist|guide|security|clean|shop|food|library|bank|observation|s109))/;
 const ALL_NIGHT=/hotel|hostel|cinema|bath/;
 const lines={
  green:['閉園後の静かな園内を、懐中電灯を手に巡回しているところでした','門の施錠を一つずつ確かめながら、園内を見回っているところでした','詰所で防犯カメラの映像に目を通し、異常がないか確かめているところでした'],
  shrine:['夜の境内を見回り、戸締まりを確かめているところでした','社務所で明日の準備を整え、明かりを落としたところでした'],
  temple:['夜の境内を見回り、戸締まりを確かめているところでした','本堂の灯りを落とし、静かになった境内を見渡しているところでした'],
  grounds:['人のいなくなった参道を、竹ぼうきで掃き清めているところでした','夜の境内で、明日の掃除の段取りを確かめているところでした'],
  clean:['人のいない通路を、掃除機をかけながら少しずつ進んでいるところでした','閉館後の床を、洗浄機で端から順に磨いているところでした'],
  guard:['人のいない施設内を巡回し、戸締まりを確かめているところでした','防災センターで防犯カメラの映像に目を通しているところでした','巡回を終え、次の担当者に伝えることを記録しているところでした']
 };
 // Parks follow their own opening hours (a park with no visitors at this hour is closed); cemeteries empty at dusk;
 // shrines, temples, museums and other sights close in the early evening, libraries at 20:00, the rest by late evening.
 function closed(c,t){let h=t.hf??t.h,lc=c.landComponent||{},k=lc.placeKind||lc.subtype||'';
  if(c.role.startsWith('green_')&&c.zone&&typeof GreenModel!=='undefined'){let rs=GreenModel.roles(c.zone,t).filter(z=>['green_walk','green_tourist','green_run'].includes(z.role));if(rs.length)return !rs.some(z=>z.density>0)}
  if(c.role.startsWith('venue_')&&typeof VenueModel!=='undefined'&&VenueModel.kind(lc)==='cemetery')return h>=17||h<7;
  if(/shrine|temple|museum|tourist|bank/.test(c.role+' '+k))return h>=18||h<7;
  if(/library/.test(c.role+' '+k))return h>=20||h<9;
  return h>=22||h<6}
 function kind(c){let r=c.role,k=r+' '+(c.landComponent?.placeKind||c.landComponent?.subtype||'');if(r.startsWith('green_'))return 'green';if(/clean/.test(r))return /shrine|temple/.test(k)?'grounds':'clean';if(/shrine/.test(k))return 'shrine';if(/temple/.test(k))return 'temple';return 'guard'}
 function apply(c,P,t){if(P.sit?.state!=='work'||!ROLE.test(c.role))return false;let lc=c.landComponent||{};if(ALL_NIGHT.test(lc.placeKind||lc.subtype||'')||c.facility?.allNight)return false;
  if(!closed(c,t)||!VISITORS.test(P.sit.text))return false;let pool=lines[kind(c)],text=pool[Math.floor(rnd()*pool.length)];P.mapSituation=text;P.sit={...P.sit,text,source:'night-duty'};return true}
 return {VISITORS,closed,apply};
})();
if(typeof module!=='undefined')module.exports=NightDuty;
