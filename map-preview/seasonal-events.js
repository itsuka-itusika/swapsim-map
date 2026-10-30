/* Seasonal events at shrines and cemeteries.
   七五三: from mid-October to early December, mostly on November weekends and around 15 November, families bring
   3- and 7-year-old girls and 5-year-old boys (some 3-year-old boys too) to shrines, with parents and grandparents.
   お彼岸: the equinox week (equinox day ±3 days) fills cemeteries with family grave visits.
   お盆: 13-16 July (Tokyo's own お盆) and 13-16 August (the month-later お盆 most families keep) do the same.
   一般参賀 at 皇居: 2 January (five appearances, 10:10 to 14:20) and 天皇誕生日 23 February (three in the morning);
   about 60,000 and 27,000 people in recent years. The crowd is spread over the palace grounds.
   インフルエンザの予防接種: in October and November some outpatients at general hospitals and clinics come for the
   flu jab (no illness of their own then), and nurses and doctors give it.
   東京駅 in the holiday rushes (お盆 8-17 August, 年末年始 26 December-4 January, GW 29 April-6 May): travellers
   leave in the first days and come back in the last ones; station staff and shop staff deal with the crowds.
   Shares and hours are game assumptions, not counts. */
const SeasonalEvents=(()=>{
 const weekend=t=>t.dow===0||t.dow===6||!!t.holiday||(typeof holName==='function'&&!!holName(t));
 // Share of the 七五三 peak (a November weekend afternoon) at this time; 0 out of season.
 function shichigosan(t){let h=t.hf??t.h,hour=h>=9&&h<16?1:h>=8&&h<17?.3:0;if(!hour)return 0;let {mo,d}=t,we=weekend(t),f=0;
  if(mo===11)f=d===15?Math.max(we?1:.7,.7):we?1:.3;else if(mo===10&&d>=15)f=we?.5:.1;else if(mo===12&&d<=7)f=we?.2:.05;return f*hour}
 // Same formula as the holiday table: 春分の日 and 秋分の日.
 function equinox(y,mo){let k=y-1980;return Math.floor((mo===3?20.8431:23.2488)+.242194*k-Math.floor(k/4))}
 function higan(t){if(t.mo!==3&&t.mo!==9)return null;let e=equinox(t.y,t.mo);return Math.abs(t.d-e)<=3?(t.mo===3?'spring':'autumn'):null}
 // Holiday rush at 東京駅: which one, and whether people are leaving (out), coming back (back) or in between.
 function travel(t){let {mo,d}=t;
  if(mo===8&&d>=8&&d<=17)return {name:'お盆の帰省ラッシュ',season:'obon',dir:d<=13?'out':'back'};
  if(mo===12&&d>=26||mo===1&&d<=4)return {name:'年末年始の帰省ラッシュ',season:'newyear',dir:mo===12?'out':d===1?'mid':'back'};
  if(mo===4&&d>=29||mo===5&&d<=6)return {name:'ゴールデンウィークの混雑',season:'gw',dir:mo===4||d<=3?'out':'back'};return null}
 // Flu jab season: October and November, in clinic hours (weekdays to 18:00, Saturday mornings).
 function flu(t){if(t.mo!==10&&t.mo!==11)return false;let h=t.hf??t.h;if(t.dow===0||t.holiday||(typeof holName==='function'&&holName(t)))return false;return h>=9&&h<(t.dow===6?12.5:18)}
 function obon(t){return (t.mo===7||t.mo===8)&&t.d>=13&&t.d<=16}
 // 一般参賀: appearance times (hours) and the hours the gates take people in.
 function sanga(t){if(t.mo===1&&t.d===2)return {kind:'new',name:'新年の一般参賀',shows:[10+10/60,11,11+50/60,13.5,14+20/60],open:9.5,close:14+10/60,people:60000};
  if(t.mo===2&&t.d===23)return {kind:'birthday',name:'天皇誕生日の一般参賀',shows:[10+20/60,11+5/60,11+50/60],open:9.5,close:11+20/60,people:27000};return null}
 // People per km² of the palace grounds at this hour: arrivals from the gate opening, each staying about 1.5 hours.
 function sangaRows(t,area){let s=sanga(t);if(!s)return [];let h=t.hf??t.h;if(h<s.open-.5||h>s.close+1.5)return [];let share=Math.min(1,(h-(s.open-.5))/1)*Math.min(1,(s.close+1.5-h)/1),n=s.people*1.5/(s.close-s.open+1)*Math.max(.1,share)/Math.max(.2,area/1e6);
  return [{role:'green_sanga',label:'一般参賀の参賀者',density:n,min:5,max:89,female:.5},{role:'green_sanga_guard',label:'皇宮護衛官',density:n*.01,min:20,max:60,female:.2}]}

 // Families at a shrine, scaled to its ordinary daytime worshippers.
 function shichigosanRows(t,guests){let f=shichigosan(t);if(!f||!(guests>0))return [];let n=guests*f;
  return [{role:'event_753_girl',label:'七五三のお参りの子ども',w:n*.1,min:3,max:7,female:1,ageBands:[[3,3,55],[7,7,45]]},
   {role:'event_753_boy',label:'七五三のお参りの子ども',w:n*.08,min:3,max:5,female:0,ageBands:[[3,3,20],[5,5,80]]},
   {role:'event_753_parent',label:'七五三のお参りの家族',w:n*.3,min:26,max:46,female:.52,ageBands:[[26,32,35],[33,39,45],[40,46,20]]},
   {role:'event_753_grand',label:'七五三のお参りの家族',w:n*.12,min:55,max:80,female:.55,ageBands:[[55,64,45],[65,74,40],[75,80,15]]}]}
 const scenes={
  girl3:['草履が歩きにくくて、親に抱っこをせがんでいるところでした','髪飾りが気になって、何度も頭に手をやっているところでした','被布姿で、参道の玉砂利の上をよちよち歩いているところでした'],
  girl7:['帯を締めた着物姿で、少し大人びた顔をして写真に収まっているところでした','慣れない帯が苦しくて、そっと息を吐いたところでした','振袖の袖を揺らしながら、鳥居の前でくるりと回ってみせたところでした'],
  boy3:['草履が脱げそうになって、親に抱き上げてもらったところでした','髪を整えてもらいながら、早く帰りたいとぐずっているところでした'],
  boy5:['羽織袴姿で、鳥居の前で少し胸を張って写真に写っているところでした','ご祈祷を待ちながら、袴のひもをいじっているところでした','千歳飴の袋を振り回して、親にやんわり止められたところでした'],
  child:['千歳飴の袋を両手で抱えて、記念写真のポーズをとっているところでした','社殿の前で、見よう見まねで手を合わせているところでした'],
  parent:['七五三のお参りで、着物姿の子どもを何枚も写真に撮っているところでした','ご祈祷の受付を済ませ、子どもの草履のずれを直しているところでした','千歳飴を持たせた子どもと、鳥居の前で家族写真を撮ってもらっているところでした','慣れない着物で疲れた子どもを、なだめながら参道を歩いているところでした'],
  grand:['孫の七五三のお参りに付き添い、晴れ着姿に目を細めているところでした','孫の七五三で、家族写真のシャッターを頼まれて構えているところでした','ご祈祷を終えた孫に、千歳飴の袋を持たせてあげたところでした'],
  higan:['お彼岸の墓参りで、墓石を洗ってから花を供えているところでした','お彼岸で、家族とおはぎを供えて手を合わせているところでした','お彼岸の墓参りで、線香の束に火をつけているところでした','お彼岸で混み合う霊園の入口で、手桶とひしゃくを借りたところでした','久しぶりにそろった家族と、お彼岸の墓前で近況を報告しているところでした','お彼岸の墓参りで、墓石のまわりの草をむしっているところでした'],
  higan_spring:['彼岸桜の咲く霊園の通りを、墓参りの帰りに歩いているところでした'],
  higan_autumn:['彼岸花の咲く墓地の道を、手桶を提げて歩いているところでした'],
  obon:['お盆の墓参りで、墓前に盆花を供えているところでした','お盆で帰ってきた家族と、墓石に水をかけているところでした','暑さの中のお盆の墓参りで、帽子をかぶり直して線香に火をつけているところでした','新盆の墓参りで、親戚と一緒に手を合わせているところでした','お盆の墓参りの帰りに、手桶を返しに管理事務所へ向かっているところでした'],
  obon13:['お盆の迎え火にする火を、墓前で提灯に移しているところでした'],
  // {e}: 新年の一般参賀 / 天皇誕生日の一般参賀
  sangaWait:['{e}の列に並び、手荷物検査の順番を待っているところでした','{e}で、正門の石橋を渡る人の流れに乗っているところでした','{e}で、配られた日の丸の小旗を手に、長和殿のベランダを見上げているところでした'],
  sangaShow:['{e}で、長和殿のベランダにお出ましになった両陛下に小旗を振っているところでした','{e}で、おことばに耳を傾けながら、背伸びしてベランダの方を見ているところでした','{e}で、ベランダに並ばれた皇族方の姿をスマートフォンで撮ろうとしているところでした'],
  sangaAfter:['{e}でお出ましを見届け、坂下門へ向かう人の流れに乗って歩いているところでした','{e}の帰りに、宮内庁の庁舎の前を通って出口へ向かっているところでした'],
  // 東京駅 in the holiday rushes.
  travelOut:['帰省ラッシュの東京駅で、お土産の紙袋を両手に新幹線の改札へ急いでいるところでした','新幹線の自由席の列に並び、座れるかどうか前の人数を数えているところでした','新幹線のホームで、指定席の号車の位置を探しているところでした','駅弁売り場の行列に並び、どれにするか迷っているところでした','乗車率の案内表示を見上げて、一本遅らせるか考えているところでした','キャリーケースを引きながら、人の波をよけて新幹線乗り換え口へ向かっているところでした','家族と待ち合わせた銀の鈴の前に、少し早く着いたところでした'],
  travelBack:['帰りの新幹線を降り、実家でもらった野菜の袋を抱えて改札を出たところでした','混み合う新幹線のホームから、在来線の乗り換え口へ人の波に押されて歩いているところでした','旅行帰りに、職場に配るお土産の数を数え直しているところでした','休みの終わりに東京駅に着き、明日からの仕事を思い出してため息をついたところでした'],
  travelMid:['正月の東京駅で、普段より空いたコンコースを不思議そうに見渡しているところでした','初詣帰りに、東京駅の丸の内駅舎を写真に収めているところでした'],
  travelOutKid:['新幹線に乗るのが楽しみで、ホームの先頭車両を見に行こうとしているところでした','おじいちゃんの家に行く新幹線を待ちながら、駅弁を選ばせてもらっているところでした'],
  travelBackKid:['帰りの新幹線で眠ってしまい、抱っこされたままホームに降りたところでした','新幹線を降りて、まだ遊び足りないと親の手を引っ張っているところでした'],
  newyearOut:['年末の帰省で、実家に持っていく東京土産を最後に買い足しているところでした'],
  gwOut:['連休の旅行で、家族と新幹線の出発時刻を確かめ合っているところでした'],
  travelStaff:['帰省ラッシュの新幹線改札で、乗り換えに迷う家族連れを案内しているところでした','新幹線のホームで、自由席の乗車口に並ぶ列を整理しているところでした','「指定席は満席です」の案内を、拡声器で繰り返しているところでした'],
  travelShop:['駅弁売り場で、次々に売れていく人気の駅弁を補充しているところでした','東京土産の売り場で、会計待ちの長い列をさばいているところでした'],
  // Flu jabs, October and November.
  fluAdult:['インフルエンザの予防接種を受けに来て、問診票に今朝の体温を書き込んでいるところでした','腕まくりをして、インフルエンザの予防接種の注射を受けたところでした','インフルエンザの予防接種を終え、待合室で30分ほど様子を見ているところでした','予約していたインフルエンザの予防接種の順番を、待合室で待っているところでした'],
  fluSenior:['公費のインフルエンザ予防接種で、市区町村から届いた予診票を受付に出したところでした'],
  fluKid:['予防接種の注射が怖くて、親の腕にしがみついているところでした','インフルエンザの予防接種をがんばったごほうびに、シールをもらったところでした','注射の順番を待ちながら、待合室の絵本をめくっているところでした'],
  fluTeen:['学校の帰りに、インフルエンザの予防接種を受けに寄ったところでした'],
  fluNurse:['予防接種の問診票を確かめ、腕に消毒綿を当てているところでした','インフルエンザワクチンの在庫を確かめ、午後の予約の人数と照らし合わせているところでした','予防接種を終えた人に、今日は激しい運動を控えるよう伝えているところでした'],
  fluDoctor:['予防接種の問診票に目を通し、接種してよいか一人ずつ確かめているところでした','インフルエンザの予防接種の前に、子どもの胸に聴診器を当てているところでした'],
  sangaGuard:['{e}の参入者を、手荷物検査の列へ誘導しているところでした','{e}で、東庭に向かう人の流れが詰まらないよう声をかけているところでした','{e}で、長和殿の前に集まった人の様子を見渡しているところでした']
 };
 const pick=a=>a[Math.floor(rnd()*a.length)];
 function apply(c,P,t){let r=c.role,text=null,label=null;
  if(r.startsWith('event_753_')){let k=r.slice(10);
   if(k==='girl'||k==='boy'){let own=scenes[k+P.age]||[];text=pick([...own,...own,...scenes.child])}else text=pick(scenes[k]);label='七五三のお参り'}
  else if((r==='venue_grave'||r==='land_grave')&&higan(t)&&rnd()<.75){text=pick([...scenes.higan,...scenes['higan_'+higan(t)]]);label='お彼岸の墓参り'}
  else if((r==='venue_grave'||r==='land_grave')&&obon(t)&&rnd()<.75){text=pick([...scenes.obon,...(t.d===13?scenes.obon13:[])]);label='お盆の墓参り'}
  else if(r==='green_sanga'||r==='green_sanga_guard'){let s=sanga(t),h=t.hf??t.h;if(!s)return false;let showing=s.shows.some(x=>h>=x-.05&&h<x+.15),after=h>s.close||s.shows.some(x=>h>=x+.15&&h<x+.4);
   text=pick(scenes[r==='green_sanga_guard'?'sangaGuard':showing?'sangaShow':after?'sangaAfter':'sangaWait']).replace('{e}',s.name);label=r==='green_sanga_guard'?'一般参賀の警備':s.name;
   P.mapSituation=text;P.visitLabel=label;P.sit={...P.sit,text,state:r==='green_sanga_guard'?'work':'off',stateLabel:label,source:'seasonal-event',p:1};return true}
  else if(c.facility?.name==='東京駅'&&travel(t)){let tr=travel(t),h=t.hf??t.h;if(h<6||h>=22)return false;
   if(r==='special_passenger'&&rnd()<.65){let kid=P.age<12,working=P.occ?.group==='adult'&&P.occ.cat!=='none';
    // Lines about work and the office are for working adults only.
    text=pick(tr.dir==='mid'?scenes.travelMid:kid?scenes[tr.dir==='out'?'travelOutKid':'travelBackKid']:[...scenes[tr.dir==='out'?'travelOut':'travelBack'],...(tr.dir==='out'?scenes[tr.season+'Out']||[]:[])].filter(x=>working||!/職場|仕事/.test(x)));
    if(tr.season!=='newyear'&&tr.season!=='obon')text=text.replace('帰省ラッシュの東京駅で','連休の東京駅で');label=tr.dir==='mid'?'正月の東京駅':tr.name;P.mapSituation=text;P.visitLabel=label;P.sit={...P.sit,text,state:'off',stateLabel:label,source:'seasonal-event',p:1};return true}
   else if(r==='special_station'&&tr.dir!=='mid'&&rnd()<.5)text=pick(scenes.travelStaff).replace('帰省ラッシュの',tr.season==='gw'?'連休の':'帰省ラッシュの');else if(r==='special_station_shop'&&rnd()<.5)text=pick(scenes.travelShop);
   if(text){P.mapSituation=text;P.sit={...P.sit,text,source:'seasonal-event'};return true}return false}
  else if(/^hosp_(outpatient|nurse|doctor)$/.test(r)&&flu(t)){let H=typeof HospitalModel!=='undefined'?HospitalModel.info(c.facility||{}):{type:'general'},k=r.slice(5);
   if(!['general','univ','child'].includes(H.type)||P.hb?.bed)return false;
   if(k==='outpatient'&&rnd()<(P.age<13?.4:.3)){text=pick(P.age<13?scenes.fluKid:P.age<18?[...scenes.fluTeen,...scenes.fluAdult]:[...scenes.fluAdult,...(P.age>=65?scenes.fluSenior:[])]);
    // Here for the jab, not for an illness: no case of their own goes into the health status.
    P.hospCase={kind:'check',dept:null};label='インフルエンザの予防接種';P.mapSituation=text;P.visitLabel=label;P.sit={...P.sit,text,state:'off',stateLabel:label,source:'seasonal-event',p:1};return true}
   if(k!=='outpatient'&&rnd()<(k==='nurse'?.25:.2)){text=pick(k==='nurse'?scenes.fluNurse:scenes.fluDoctor.filter(x=>H.type==='child'||!/子ども/.test(x)||rnd()<.5));P.mapSituation=text;P.sit={...P.sit,text,source:'seasonal-event'};return true}
   return false}
  if(!text)return false;P.mapSituation=text;P.visitLabel=label;P.sit={...P.sit,text,state:'off',stateLabel:label,source:'seasonal-event',p:1};return true}
 return {shichigosan,higan,obon,flu,travel,sanga,sangaRows,equinox,shichigosanRows,scenes,apply};
})();
if(typeof module!=='undefined')module.exports=SeasonalEvents;
