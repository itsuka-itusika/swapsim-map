/* Estimates for map-only context. Original SwapSim remains the source of domestic profiles. */
const PersonContext=(()=>{
 const names={
 '韓国':[['キム','イ','パク','チェ'],['ジフン','ミンジュン','ソジュン'],['ソヨン','ジウン','ミンジ']],
 '中国':[['ワン','リー','チャン','リウ'],['ウェイ','ハオ','ジュン'],['シュエ','ジン','ファン']],
 '台湾':[['チェン','リン','ホアン','チャン'],['ジエン','ジーハオ','ウェイ'],['イーティン','シューフェン','ヤーティン']],
 '香港':[['チャン','ウォン','リー','ラウ'],['カーホウ','チーワイ','ウェイ'],['メイリン','ホイマン','カイヤン']],
 'タイ':[['スワン','チャイ','シリ'],['アナン','ソムチャイ','ナリン'],['スダー','マリー','ニチャー']],
 'ベトナム':[['グエン','チャン','レ'],['ミン','フン','ナム'],['ラン','リン','フオン']],
 'インド':[['シャルマ','パテル','シン'],['ラーフル','アルジュン','アミット'],['プリヤ','アニタ','ディーピカ']],
 'フランス':[['マルタン','ベルナール','デュボワ'],['ルイ','トマ','ピエール'],['クレール','カミーユ','ジュリー']],
 'ドイツ':[['ミュラー','シュミット','シュナイダー'],['トーマス','ルーカス','マックス'],['アンナ','マリー','レナ']],
 'イタリア':[['ロッシ','ルッソ','フェラーリ'],['マルコ','ルカ','アンドレア'],['ジュリア','サラ','ソフィア']],
 'スペイン':[['ガルシア','ロペス','マルティネス'],['パブロ','ダニエル','アレハンドロ'],['マリア','ルシア','アナ']],
 'メキシコ':[['ガルシア','エルナンデス','ロペス'],['ホセ','ルイス','ミゲル'],['マリア','アナ','ソフィア']],
 'フィリピン':[['サントス','レイエス','クルス'],['ホセ','マーク','ジョン'],['マリア','アン','アンジェラ']],
 'インドネシア':[['プトラ','サントソ','ウィジャヤ'],['アディ','ブディ','リズキ'],['アユ','デウィ','サリ']],
 'マレーシア':[['タン','リム','リー'],['ウェイ','ジエン','ハキム'],['メイ','リン','アイシャ']],
 'シンガポール':[['タン','リム','リー'],['ダニエル','ウェイ','ケン'],['メイ','レイチェル','リン']]
 };
 const english=[['スミス','ジョンソン','ブラウン','テイラー'],['ジェームズ','ダニエル','マイケル','ウィリアム'],['エミリー','エマ','サラ','オリビア']];
 const pick=(a,r)=>a[Math.floor(r()*a.length)];
 function foreignName(market,sex,r=Math.random){let n=names[market]||english,surname=pick(n[0],r),given=pick(n[sex==='f'?2:1],r);return {surname,given,approximated:!names[market]&&!['米国','英国','豪州','カナダ'].includes(market)}}
 function age(c,r=Math.random){let lo=c.min??0,hi=c.max??99;if(c.role==='area_subculture'&&c.area?.subcultureAge)[lo,hi]=c.area.subcultureAge;if(hi<=lo)return lo;let mode=/student/.test(c.role)?Math.min(hi,20):/child/.test(c.role)?Math.min(hi,10):/resident/.test(c.role)?Math.min(hi,85):/idol/.test(c.role)?Math.min(hi,24):/patient/.test(c.role)?Math.min(hi,68):/tourist|inbound|shopping|passenger|visit|spectator/.test(c.role)?Math.min(hi,36):Math.min(hi,Math.max(lo,40));mode=Math.max(lo,mode);let u=r(),f=(mode-lo)/(hi-lo),x=u<f?lo+Math.sqrt(u*(hi-lo)*(mode-lo)):hi-Math.sqrt((1-u)*(hi-lo)*(hi-mode));return Math.max(lo,Math.min(hi,Math.round(x)))}
 function station(P,t,originalSituation){if(P.hb?.leave||P.hb?.bed||originalSituation?.state!=='commute')return null;let h=t.hf??t.h,weekday=t.dow>0&&t.dow<6&&!t.holiday,student=['student','college','kid'].includes(P.occ.group),worker=P.occ.group==='adult'&&!['none','prison','facility'].includes(P.occ.cat),going=h>=5&&h<10,returning=h>=15&&h<23;if(weekday&&(student||worker)&&(going||returning)){let label=student?(going?'通学中':'学校から帰る途中'):(going?'通勤中':'仕事から帰る途中');let pool=student?(going?['通学の電車を待ちながら、今日の授業を思い出しているところでした','改札を通り、友達から届いた連絡を確かめているところでした']:['帰りの電車を待ちながら、友達と今日の出来事を話しているところでした','学校からの帰り道、次の電車の時刻を確かめているところでした']):(going?['通勤の電車を待ちながら、今日の仕事の予定を思い出しているところでした','改札を通り、いつものホームへ足を向けているところでした']:['仕事帰りにホームで電車を待ち、夕食をどうするか考えているところでした','帰りの電車の時刻を見ながら、今日の仕事を思い返しているところでした']);return {label,text:pick(pool,Math.random)}}return null}
 // Original scenes may happen anywhere in Japan; a map person is at the drawn spot inside the 23 wards.
 const AWAY=/バスツアー|紅葉の名所|紅葉狩りに出かけた|山道|山頂|登山|ゲレンデ|スキー場|海水浴|潮干狩り|海沿いの道|ビーチ|高速道路|サービスエリア|道の駅|日帰りの温泉|温泉に向かう|帰省ラッシュ|新幹線の中|新幹線の通路|田んぼ|稲刈り|刈り取った稲|みかん畑|茶畑|牧場|漁に出|漁船|漁港|港から|雪下ろし|宵山|山鉾|横浜スタジアム/,AIR=/機内|保安検査場|着陸|離陸/,SEA=/甲板|船の当直|ブリッジ|網を引|海図/;
 function away(text,c){if(/夢の中で/.test(text))return false;if(AWAY.test(text))return true;let land=c?.landComponent,place=c?.facility?.name||land?.name||'';
  if(AIR.test(text)&&!(['airfield','terminal'].includes(land?.subtype)||/空港/.test(place)))return true;
  if(SEA.test(text)&&land?.type!=='waterfront')return true;
  return /新幹線の運転席/.test(text)&&!/^(東京|品川|上野)駅$/.test(place)}
 return {foreignName,age,station,away};
})();
