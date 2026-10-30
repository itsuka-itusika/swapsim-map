/* Drunks in the entertainment districts at night: from 20:00 to 5:00 some people in the night-life areas are drunk
   themselves, looking after a drunk friend, or passing one; night-shift staff deal with drunk customers. Shares grow
   toward midnight and on Friday and Saturday; all are game assumptions. */
const Drunks=(()=>{
 const pick=a=>a[Math.floor(rnd()*a.length)];
 const own=['終電を逃したのに気づかないまま、歩道の縁に座り込んでいるところでした','飲み過ぎて足元がおぼつかず、友人に肩を貸してもらって歩いているところでした','千鳥足で、同じ道をもう一度戻ってきたことに気づいていないところでした','ガードレールに寄りかかって、しばらく動けずにいるところでした','自動販売機の前で、水を買おうとして小銭をばらまいてしまったところでした','ネクタイを頭に巻いて、大声で歌いながら歩いているところでした','路上で見知らぬ人に絡んでは、友人に引き離されているところでした','酔いが回って、道端の植え込みの前でしゃがみ込んでいるところでした','友人に「もう帰るぞ」と引っ張られても、もう一軒行こうと駄々をこねているところでした','タクシーを止めようと、車道に身を乗り出して手を振っているところでした','気が大きくなって財布の中身を確かめ、友人に止められているところでした','ベンチで寝込んでしまい、友人に肩を揺すられて起こされているところでした','電柱に向かって、真剣な顔で上司への不満を語りかけているところでした','コンビニの前で、買ったばかりのアイスを食べながら座り込んでいるところでした','ふらついて通行人にぶつかり、何度も頭を下げて謝っているところでした','帰宅後に送るつもりのない長文のメッセージを、必死にスマートフォンで打っているところでした','元恋人に電話をかけようとして、友人にスマートフォンを取り上げられたところでした','路上で踊るまねを始めて、周りの人に拍手されているところでした','酔い覚ましの水のペットボトルを握りしめ、景色がぐるぐる回るのをこらえているところでした','終電の駅へ向かいながら、同じ質問を何度も友人に聞き返しているところでした'];
 const carer=['酔いつぶれた友人の鞄を抱え、背中をさすりながら介抱しているところでした','千鳥足の友人を支えながら、タクシー乗り場まで連れていこうとしているところでした','酔って寝てしまった友人を、タクシーの後部座席に押し込もうとしているところでした','酔った友人が絡んだ相手に、代わりに頭を下げて謝っているところでした','水を買ってきて、座り込んだ友人に飲ませようとしているところでした'];
 const passer=['路上で寝ている酔っ払いに、通行人が声をかけるのを見守っているところでした','酔っ払いに話しかけられ、困ったように愛想笑いで受け流しているところでした','酔っ払いの集団を避けて、歩道の反対側へ移ったところでした','酔って大声で歌う集団の横を、足早に通り過ぎたところでした'];
 const staff=['酔い潰れた客の肩を軽く叩いて、タクシーを呼んであげているところでした','店の前で酔っ払いの客に絡まれ、笑顔で受け流しているところでした','路上で寝てしまった客を、同僚と二人で起こしているところでした','会計を何度も確かめ直す酔った客に、辛抱強く説明しているところでした','酔った客が店の前に吐いてしまった跡を、バケツの水で流しているところでした','客引きの途中、酔っ払いに肩を組まれて、さりげなく外したところでした'];
 const CUSTOMER=/^area_(night|shopping|subculture|inbound|tourist)$/,WORKER=/^area_(night_worker|adult_worker|cabaret_worker)$/;
 // Chance that a person in a night-life area is part of the drunk scenes at this time.
 function share(t){let h=t.hf??t.h;if(h>=5&&h<20)return 0;let base=h>=20&&h<22?.12:h>=22||h<2?.26:.18;return Math.min(.4,base*(t.dow===5||t.dow===6?1.3:1))}
 function apply(c,P,t){let p=share(t);if(!p||P.hb?.bed||P.sit?.state==='sleep')return false;
  let worker=WORKER.test(c.role),customer=CUSTOMER.test(c.role)&&((c.area?.tags?.night||0)>=2||c.role==='area_night');if(!worker&&!customer)return false;
  if(P.age<20||rnd()>=p)return false;let text=worker?pick(staff):(()=>{let r=rnd();return r<.62?pick(own):r<.8?pick(carer):pick(passer)})();
  P.mapSituation=text;P.sit={...P.sit,text,state:worker?'work':'off',source:'drunk',p:1};return true}
 return {own,carer,passer,staff,share,apply};
})();
if(typeof module!=='undefined')module.exports=Drunks;
