/* Children visiting a district with their family: tourists and shoppers under 13 take scenes with a parent or relative
   (holding a hand, a piggyback, choosing a souvenir, waiting while the parents check the map), foreign tourists
   included. Children are not shown wandering a street on their own. Shares are game assumptions. */
const FamilyVisits=(()=>{
 const pick=a=>a[Math.floor(rnd()*a.length)];
 // [text, from hour, to hour, options]: min/max age, foreign: foreign tourists only.
 const scenes=[
  ['親に手を引かれて、人混みの中をはぐれないように歩いているところでした',9,21],
  ['お父さんに肩車してもらい、通りの景色を高いところから眺めているところでした',9,19,{max:8}],
  ['お母さんと一緒に、お土産の店先でぬいぐるみを選んでいるところでした',10,20],
  ['歩き疲れて「もう歩けない」と言い、親にベンチで休ませてもらっているところでした',9,20],
  ['ベビーカーを押す親のそばを歩きながら、気になる看板を指さしているところでした',9,19,{max:6}],
  ['親に手を引かれながら、初めて見る街の景色に目を丸くしているところでした',9,21],
  ['親がガイドブックの地図を確かめている横で、おとなしく待っているところでした',9,20],
  ['家族の記念写真を撮るため、親に言われて笑顔をつくっているところでした',9,20],
  ['親に買ってもらったお菓子を、歩きながら少しずつ食べているところでした',9,20],
  ['両親の間に挟まれて手をつなぎ、通りのにぎわいに見入っているところでした',9,21],
  ['親と一緒に飲食店の行列に並び、メニューの写真を眺めているところでした',11,21],
  ['親に連れられて入った店で、メニューの絵を見て食べたいものを探しているところでした',11,21],
  ['親に手を引かれて、信号が青になるのを待っているところでした',9,21],
  ['親にトイレの場所を聞かれて、案内板を一緒に探しているところでした',9,21,{min:6}],
  ['祖父母に連れられて、ゆっくり歩く二人の少し先を走り出し、呼び止められたところでした',9,19,{min:4}],
  ['夕食の店を探す親について歩きながら、「おなかすいた」とつぶやいたところでした',17,21],
  ['親と一緒に夕食の席につき、メニューを眺めているところでした',17,21],
  ['歩き疲れて、親におんぶしてもらっているところでした',16,22,{max:7}],
  ['眠くなって、親に抱っこされながらホテルへ向かっているところでした',19,24,{max:7}],
  ['うとうとしながら、親に手を引かれてホテルへ戻るところでした',20,24,{min:8}],
  ['親の通訳がわりに、覚えた日本語で「ありがとう」と店員さんに言ったところでした',9,21,{foreign:1,min:6}],
  ['家族でホテルへ戻る道を、親のスマートフォンの地図をのぞき込んで確かめているところでした',9,23,{foreign:1,min:7}],
  ['親と一緒に、見たことのないお菓子を手に取り、裏の写真をじっと見ているところでした',9,21,{foreign:1}],
  ['親が店員さんと身ぶりで話している間、そばで待ちながら周りの看板を眺めているところでした',9,21,{foreign:1}]
 ];
 const inHour=(s,e,h)=>h>=s&&h<e;
 const KIND=/^area_(inbound|tourist|shopping)$/;
 function pool(P,h){return scenes.filter(([,s,e,o={}])=>inHour(s,e,h)&&(o.min==null||P.age>=o.min)&&(o.max==null||P.age<=o.max)&&(!o.foreign||P.isInbound))}
 // Under 10 always with family; 10 to 12 mostly (a Japanese child of that age may be out with friends).
 function apply(c,P,t){if(!KIND.test(c.role)||P.age>=13||P.sit?.state==='work'||P.sit?.state==='sleep'||P.hb?.bed)return false;
  if(P.age>=10&&rnd()<(P.isInbound?.1:.3))return false;let p=pool(P,t.hf??t.h);if(!p.length)return false;
  let text=pick(p)[0];P.mapSituation=text;P.sit={...P.sit,text,source:'family-visit',p:1};return true}
 return {scenes,pool,apply};
})();
if(typeof module!=='undefined')module.exports=FamilyVisits;
