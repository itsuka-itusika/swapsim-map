/* Large university campuses (a circle of 150 m or more, see campus-radius.json) are open grounds: neighbours walking, parents
   with small children, joggers and dog walkers, people cutting across, visitors on a campus tour and, at the famous campuses,
   tourists. They come on top of the students and grow with the campus. Counts and shares are game assumptions. */
const CampusVisitors=(()=>{
 const pick=a=>a[Math.floor(rnd()*a.length)];
 const weekend=t=>t.dow===0||t.dow===6||!!t.holiday||(typeof holName==='function'&&!!holName(t));
 // Share of the visitors who are tourists: the campuses people come to see.
 const famous=[[/東京大学/,.3,'redgate'],[/早稲田大学/,.1],[/慶應義塾大学/,.1],[/東京工業大学|東京科学大学/,.05]];
 function rows(f,t){if(f.kind!=='university'||(f.radius||0)<150)return [];let h=t.hf??t.h,we=weekend(t),
  hour=we?(h>=8&&h<18?1:h>=6&&h<8||h>=18&&h<19?.1:0):(h>=9&&h<17?1:h>=7&&h<9||h>=17&&h<19?.03:0);if(!hour)return [];
  // A weekday: about 8% of the students, more at a bigger campus; a weekend: about 90 at 300 m, as the students thin out.
  let size=Math.min(1.6,f.radius/300),base=(we?90:120)*size*hour,fam=famous.find(x=>x[0].test(f.name)),tour=fam?fam[1]:.03;
  return [{role:'campus_visitor',label:'キャンパスを散歩・見学に来た人',w:base*(1-tour),n:base*(1-tour),min:0,max:89,female:.52,ageBands:[[0,9,10],[10,19,8],[20,39,22],[40,64,30],[65,89,30]],campusVisitor:true},
   {role:'campus_tourist',label:'キャンパスを訪れた観光客',w:base*tour,n:base*tour,min:3,max:84,female:.52,ageBands:[[3,19,12],[20,39,38],[40,64,35],[65,84,15]],campusVisitor:true,inboundGuest:true}]}
 const general=[
  ['キャンパスの並木道を、ゆっくり散歩しているところでした',9,18],['日課の散歩で、キャンパスの木陰の道を歩いているところでした',7,18,{min:60}],
  ['キャンパスのベンチで、本を開いたまま木漏れ日の下でうとうとしているところでした',10,17,{min:16}],['芝生に敷物を広げて、お弁当を食べているところでした',11,14,{min:16}],
  ['犬を連れて、キャンパスの外周の道を散歩しているところでした',6,9,{min:12}],['犬を連れて、夕方のキャンパスの外周を歩いているところでした',16,19,{min:12}],
  ['ジョギングで、キャンパスの外周を一周しているところでした',6,9,{min:15,max:65}],['夕方のランニングで、キャンパスの周りの坂道を駆け上がっているところでした',16,19,{min:15,max:65}],
  ['キャンパスを通り抜けて、駅へ向かう近道をしているところでした',8,19,{min:16}],['学内の売店で、大学のロゴ入りの文具を手に取っているところでした',10,17,{min:12}],
  ['一般にも開かれた学食で、安くておいしい定食を食べているところでした',11,14,{min:16}],['学内の博物館で、展示の説明文を読んでいるところでした',10,17,{min:8}],
  ['学内の図書館の入口の掲示を見て、一般の人も入れるか確かめているところでした',10,17,{min:18}],['キャンパスの広場で、友人と待ち合わせて写真を撮っているところでした',10,17,{min:12}],
  ['大学見学で、受験を考えている子と一緒に、校舎を見て回っているところでした',10,16,{min:35,max:65}],['キャンパス見学で、学生ガイドの説明を聞きながら歩いているところでした',10,16,{min:14,max:19}],
  ['ベビーカーを押しながら、キャンパスの広場で子どもを遊ばせているところでした',10,16,{min:24,max:45}],['学内の掲示板で、公開講座のポスターを眺めているところでした',10,17,{min:30}],
  ['キャンパスの池のほとりで、水面を泳ぐ鯉を眺めているところでした',10,17,{min:8}],['近所の人たちと、キャンパスの桜並木の下を歩きながら立ち話をしているところでした',10,16,{min:50}],
  ['スケッチブックを広げて、キャンパスの古い建物を描いているところでした',10,16,{min:14}],['休日のキャンパスの静けさの中で、ベンチに座ってぼんやりしているところでした',9,17,{min:20}]];
 const kids=[['親と一緒に、キャンパスの広い芝生を走り回っているところでした',9,17,{max:9}],['親と一緒に、池のそばで鯉にパンくずをやろうとして止められているところでした',10,16,{max:9}],['親に手を引かれて、大きな古い建物を見上げているところでした',9,17,{max:12}],['お父さんに肩車してもらって、並木道を進んでいるところでした',9,17,{max:7}],['親と一緒に、キャンパスの中のカフェでジュースを選んでいるところでした',10,17,{min:3,max:12}]];
 const tourist=[['ガイドブックを片手に、キャンパスの案内図を見ているところでした',9,17],['キャンパスの象徴的な建物の前で、順番に記念写真を撮っているところでした',9,17],['有名な門の前で、家族に頼まれて記念写真を撮っているところでした',9,17],['学内の売店で、お土産にする大学のグッズを選んでいるところでした',10,17],['日本の大学の雰囲気を、並木道を歩きながら見て回っているところでした',9,17]];
 // Campus-specific scenes: [text, from, to, options, month range]
 const special={'東京大学':[['赤門の前で、記念写真を撮ってもらっているところでした',9,17],['三四郎池のほとりのベンチで、池を眺めているところでした',9,17],['安田講堂の前で、建物を見上げて写真を撮っているところでした',9,17],['銀杏並木の黄色く色づいた葉を見上げながら歩いているところでした',9,17,{mo:[11,12]}],['総合研究博物館で、標本の展示をゆっくり見て回っているところでした',10,17,{min:8}]],'早稲田大学':[['大隈講堂の前で、時計台を見上げているところでした',9,17],['演劇博物館の展示を、順路に沿って見て回っているところでした',10,17,{min:10}]],'慶應義塾大学':[['三田のキャンパスの旧図書館の前で、赤れんがの建物を見上げているところでした',9,17]],'東京工業大学':[['正門の先の桜並木を、写真を撮りながら歩いているところでした',9,17,{mo:[3,4]}]]};
 // 東京大学 is the 本郷 campus only within 600 m of its 赤門 (駒場 is 6 km away): scenes of one campus must not reach another.
 const HONGO=[139.7631,35.7125],near=(f)=>f?.xy&&typeof MapModel!=='undefined'&&MapModel.distance(f.xy,HONGO)<600;
 function pool(c,P,t){let h=t.hf??t.h,mo=t.mo,name=c.facility?.name||'',tour=c.role==='campus_tourist',base=tour?[...tourist,...general.filter(x=>!/犬|ジョギング|ランニング|日課/.test(x[0]))]:[...general,...(P.age<13?kids:[])];
  let sp=Object.entries(special).filter(([k])=>name.includes(k)&&(k!=='東京大学'||near(c.facility))).flatMap(([,v])=>v);
  return [...base,...sp].filter(([,s,e,o={}])=>h>=s&&h<e&&(o.min==null||P.age>=o.min)&&(o.max==null||P.age<=o.max)&&(!o.mo||o.mo.includes(mo)))}
 function apply(c,P,t){if(!c.campusVisitor||P.hb?.bed)return false;let p=pool(c,P,t);if(!p.length)return false;let text=pick(p)[0];
  P.mapSituation=text;P.visitLabel=c.label;P.sit={...P.sit,text,state:'off',stateLabel:c.label,source:'campus-visitor',p:1};return true}
 return {rows,pool,apply,general,kids,tourist,special};
})();
if(typeof module!=='undefined')module.exports=CampusVisitors;
