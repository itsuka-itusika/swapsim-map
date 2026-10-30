/* Seasonal events at shrines and cemeteries.
   七五三: from mid-October to early December, mostly on November weekends and around 15 November, families bring
   3- and 7-year-old girls and 5-year-old boys (some 3-year-old boys too) to shrines, with parents and grandparents.
   お彼岸: the equinox week (equinox day ±3 days) fills cemeteries with family grave visits.
   お盆: 13-16 July (Tokyo's own お盆) and 13-16 August (the month-later お盆 most families keep) do the same.
   一般参賀 at 皇居: 2 January (five appearances, 10:10 to 14:20) and 天皇誕生日 23 February (three in the morning);
   about 60,000 and 27,000 people in recent years. The crowd is spread over the palace grounds.
   Shares and hours are game assumptions, not counts. */
const SeasonalEvents=(()=>{
 const weekend=t=>t.dow===0||t.dow===6||!!t.holiday||(typeof holName==='function'&&!!holName(t));
 // Share of the 七五三 peak (a November weekend afternoon) at this time; 0 out of season.
 function shichigosan(t){let h=t.hf??t.h,hour=h>=9&&h<16?1:h>=8&&h<17?.3:0;if(!hour)return 0;let {mo,d}=t,we=weekend(t),f=0;
  if(mo===11)f=d===15?Math.max(we?1:.7,.7):we?1:.3;else if(mo===10&&d>=15)f=we?.5:.1;else if(mo===12&&d<=7)f=we?.2:.05;return f*hour}
 // Same formula as the holiday table: 春分の日 and 秋分の日.
 function equinox(y,mo){let k=y-1980;return Math.floor((mo===3?20.8431:23.2488)+.242194*k-Math.floor(k/4))}
 function higan(t){if(t.mo!==3&&t.mo!==9)return null;let e=equinox(t.y,t.mo);return Math.abs(t.d-e)<=3?(t.mo===3?'spring':'autumn'):null}
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
  if(!text)return false;P.mapSituation=text;P.visitLabel=label;P.sit={...P.sit,text,state:'off',stateLabel:label,source:'seasonal-event',p:1};return true}
 return {shichigosan,higan,obon,sanga,sangaRows,equinox,shichigosanRows,scenes,apply};
})();
if(typeof module!=='undefined')module.exports=SeasonalEvents;
