/* Live houses, idol theatres and jazz clubs (data/livehouses.json). Whether there is a show that day follows a fixed
   hash of the venue and the date, so a venue is either on or dark all day. A show day runs: setup and rehearsal from
   midday, the entry queue an hour before the doors, the show, then merchandise and leaving. Weekends start an hour
   earlier. Counts are capacity x fill, scaled like cinema audiences (AUDIENCE) to the district population.
   All times, fills and show-day rates are game assumptions, not real schedules. */
const LiveHouseModel=(()=>{
 const AUDIENCE=.4;
 // A full house is the exception: many weekday bills (対バン, small names) play to a half-empty floor, and smaller clubs
 // stay dark some weekdays. These keep the venues from outweighing the streets around them.
 const SHOW_RATE={hall:[.5,.8],club:[.75,.9],idol:[.85,.85],jazz:[.9,.95]},FILL={hall:.6,club:.4,idol:.9,jazz:.5};
 const CREW={hall:[14,35],club:[16,8],idol:[16,10],jazz:[5,15]};
 const LABEL={hall:['ライブの観客','ミュージシャン','ライブハウスのスタッフ'],club:['ライブの観客','バンドマン','ライブハウスのスタッフ'],idol:['アイドル劇場の観客','アイドル','劇場のスタッフ'],jazz:['ジャズクラブの客','ジャズミュージシャン','ジャズクラブのスタッフ']};
 const GUEST_AGES={hall:[[13,17,8],[18,24,30],[25,34,30],[35,44,20],[45,59,12]],club:[[15,17,5],[18,24,35],[25,34,32],[35,44,18],[45,59,10]],idol:[[16,19,10],[20,29,30],[30,39,25],[40,49,22],[50,64,13]],jazz:[[20,29,8],[30,39,15],[40,49,22],[50,59,25],[60,69,20],[70,79,10]]};
 const kind=c=>c?.placeKind==='livehouse'?'livehouse':null;
 const style=c=>c?.liveStyle||'club';
 const weekend=t=>t.dow===0||t.dow===6||!!t.holiday;
 function hash(s){let x=2166136261;for(let i=0;i<s.length;i++){x^=s.charCodeAt(i);x=Math.imul(x,16777619)>>>0}x^=x>>>16;x=Math.imul(x,2246822507)>>>0;x^=x>>>13;x=Math.imul(x,3266489909)>>>0;x^=x>>>16;return (x>>>0)/4294967296}
 function showDay(c,t){let r=SHOW_RATE[style(c)]||SHOW_RATE.club;return hash(c.id+'/'+t.y+'-'+t.mo+'-'+t.d)<r[weekend(t)?1:0]}
 // Show slots [doors, start, end] for the day.
 function slots(c,t){let s=style(c),we=weekend(t);if(s==='jazz')return we?[[15.5,16,17.5],[18.5,19,20.5]]:[[16.5,17,18.5],[19,19.5,21]];
  if(s==='idol')return we?[[12.5,13,15],[17,17.5,19.5]]:[[18,18.5,20.5]];let start=we?18:19;return [[start-1,start,start+2.5]]}
 // Phase at hour h: setup, queue (outside before the doors), entry (doors open), show, after (merchandise, leaving), off.
 function phase(c,t){let h=t.hf??t.h;if(!showDay(c,t))return 'dark';let ss=slots(c,t),first=ss[0][0];
  for(const [doors,start,end] of ss){if(h>=doors-1&&h<doors)return 'queue';if(h>=doors&&h<start)return 'entry';if(h>=start&&h<end)return 'show';if(h>=end&&h<end+.75)return 'after'}
  if(h>=12&&h<first-1)return 'setup';let last=ss[ss.length-1][2];if(h>=last+.75&&h<last+1.5)return 'close';if(h>=first&&h<last)return 'between';return 'off'}
 function roles(c,t){if(!kind(c))return null;let s=style(c),p=phase(c,t),cap=c.capacity||500,[artists,staff]=CREW[s]||CREW.club,[gl,al,sl]=LABEL[s]||LABEL.club,h=t.hf??t.h,rows=[];
  let guest={queue:s==='jazz'?.3:.35,entry:.8,show:1,after:s==='idol'?.4:.3,between:s==='jazz'?.2:0}[p]||0;
  let crewOn=['setup','queue','entry','show','after','between','close'].includes(p),artistOn=crewOn&&p!=='close'&&(p!=='setup'||h>=14);
  rows.push({role:'live_guest',label:gl,w:cap*(FILL[s]||.7)*guest*AUDIENCE,min:s==='jazz'?20:13,max:s==='jazz'?84:64,female:s==='idol'?.15:s==='jazz'?.5:.55,ageBands:GUEST_AGES[s]});
  rows.push({role:'live_artist',label:al,w:artistOn?artists*AUDIENCE:0,min:s==='idol'?16:s==='jazz'?25:18,max:s==='idol'?25:s==='jazz'?69:49,female:s==='idol'?1:s==='jazz'?.3:.25,placeWorker:true});
  rows.push({role:'live_staff',label:sl,w:(crewOn?staff:p==='dark'&&h>=11&&h<18?2:0)*AUDIENCE,min:18,max:s==='jazz'?59:49,female:s==='jazz'?.5:.35,placeWorker:true});
  return rows}
 function assign(c,P){if(!c.role.startsWith('live_'))return;if(c.placeWorker)P.occ={label:c.label,group:'adult',cat:'special',kind:'employed',p:1};else if(['prison','facility'].includes(P.occ.group))P.occ={label:'無職',group:P.age>=65?'senior':'adult',cat:'none',p:1}}
 const GUEST={
  queue:['整理番号順の入場待ちの列で、自分の番号が呼ばれるのを待っているところでした','開場前の物販の列に並び、ツアーTシャツのサイズを迷っているところでした','ドリンク代の小銭を用意しながら、入場の列に並んでいるところでした','会場の前で、一緒に入る友達と合流したところでした'],
  entry:['入口でドリンク代を払い、ドリンクチケットを受け取ったところでした','フロアに入り、ステージがよく見える場所を探しているところでした','コインロッカーに荷物を預け、身軽になってフロアへ向かうところでした'],
  show:['開演直後のイントロに、思わず歓声を上げたところでした','ステージ前方で、好きな曲のサビに合わせて手を挙げているところでした','フロア後方の段差から、ステージ全体を見渡しているところでした','アンコールを求めて、周りと一緒に手拍子をしているところでした','MCで笑いながら、次の曲が始まるのを待っているところでした'],
  after:['終演後、ドリンクチケットを交換して一息ついているところでした','終演後の物販で、ライブの記念にタオルを買ったところでした','会場を出て、一緒に来た友達と今日のセットリストを振り返っているところでした']};
 const CLUB_SHOW=['対バンのイベントで、初めて見るバンドの演奏に引き込まれているところでした','転換の合間に、次に出るバンドのメンバーを確かめているところでした'];
 const IDOL={queue:['開演前に、推しメンの名前が入ったうちわを用意しているところでした','入場待ちの列で、今日の抽選の入場順を確かめているところでした'],entry:['客席に入り、ペンライトの電池を確かめているところでした'],
  show:['ペンライトを推しメンの色に合わせて振っているところでした','周りとコールを合わせながら、ステージを見つめているところでした','推しメンと目が合った気がして、思わず手を振り返したところでした'],
  after:['公演後の握手会の列で、伝えたいことを頭の中で練習しているところでした','劇場を出て、今日の公演の感想をSNSに書き込んでいるところでした']};
 const JAZZ={queue:['開場を待つ間、ロビーで今夜のメンバー表を眺めているところでした'],entry:['席に着き、料理とワインを注文したところでした','ステージ近くの席に案内され、ピアノの位置を確かめているところでした'],
  show:['ピアノトリオの演奏に、グラスを置いて聴き入っているところでした','ベースのソロが終わり、客席から拍手を送ったところでした','演奏の合間に、連れとカクテルを飲みながら話しているところでした'],
  after:['ステージの余韻にひたりながら、会計を済ませたところでした'],between:['1stステージの後、デザートを頼んで2ndステージを待っているところでした']};
 const ARTIST={setup:['リハーサルで、モニターの返しの音量をPAさんに伝えているところでした','サウンドチェックで、ギターのチューニングを確かめているところでした','リハーサルを終え、楽屋で弁当を食べているところでした'],
  queue:['楽屋で、セットリストの紙をどこに貼るかメンバーと確認しているところでした','開演前の楽屋で、衣装に着替えているところでした'],entry:['開演前の楽屋で、メンバーと円陣を組んだところでした','袖から、埋まっていくフロアをのぞいているところでした'],
  show:['ステージから客席に向かって、「最後の曲です」と告げたところでした','ソロを弾き終え、客席の歓声を浴びているところでした','曲の合間に、水を飲みながら客席に話しかけているところでした'],
  after:['終演後、物販のブースに立ち、ファンと話しているところでした','機材を片づけ、次の会場までの移動を確認しているところでした'],between:['楽屋で、次のステージの曲順を確かめているところでした']};
 const IDOL_ARTIST={setup:['ダンスのフォーメーションを、本番前に通しで確認しているところでした','楽屋で、メイクを直してもらっているところでした'],queue:['楽屋で、今日のMCで話すことをメンバーと決めているところでした'],entry:['袖で、メンバーと「よろしくお願いします」と声をかけ合ったところでした'],
  show:['ステージで、客席のペンライトに手を振っているところでした','センターに立ち、曲の始まりのポーズを決めたところでした'],after:['握手会で、ファンの話に笑顔でうなずいているところでした'],between:['楽屋で、次の公演に向けて水分をとっているところでした']};
 const JAZZ_ARTIST={setup:['リハーサルで、ピアノのタッチとドラムの音量を合わせているところでした'],queue:['楽屋で、今夜の曲目の譜面を並べているところでした'],entry:['楽屋で、楽器を温めながら開演を待っているところでした'],
  show:['サックスのソロを吹き終え、客席の拍手に会釈したところでした','ピアノの前に座り、客席の照明が落ちるのを待っているところでした'],after:['ステージを終え、客席で常連のお客さんと話しているところでした'],between:['1stステージを終え、楽屋で譜面をめくっているところでした']};
 const STAFF={setup:['PA卓で、ボーカルマイクの音量を調整しているところでした','照明の色とタイミングを、卓で一つずつ確かめているところでした','ステージに機材を運び込み、配線をまとめているところでした'],
  queue:['整理番号を読み上げ、入場の列を誘導しているところでした','入口で、電子チケットの画面を確かめているところでした'],entry:['入口で、ドリンク代を受け取っているところでした','フロアの前方が詰まりすぎないよう、案内しているところでした'],
  show:['ドリンクカウンターで、ドリンクチケットを受け取っているところでした','フロア後方で、押し合いになっていないか見回っているところでした','PA卓で、演奏に合わせて音のバランスを整えているところでした'],
  after:['終演後のフロアで、落とし物がないか見て回っているところでした','物販のブースで、売れ残ったグッズの数を数えているところでした'],close:['撤収作業で、ケーブルを巻いてケースにしまっているところでした','閉館前に、フロアにモップをかけているところでした'],
  between:['次のステージに向けて、客席の準備を整えているところでした'],dark:['公演のない日、事務所で次の公演の告知を準備しているところでした','公演のない日に、ステージの機材を点検しているところでした']};
 const JAZZ_STAFF={entry:['お客さんを席に案内し、メニューを手渡したところでした'],show:['演奏の邪魔にならないよう、テーブルにそっと料理を運んでいるところでした'],between:['ステージの合間に、テーブルの空いたグラスを下げているところでした']};
 function pool(c,t,P){let s=style(c.landComponent),p=phase(c.landComponent,t),r=c.role;
  if(r==='live_guest'){let src=s==='idol'?IDOL:s==='jazz'?JAZZ:GUEST,out=[...(src[p]||GUEST[p]||GUEST.show)];if(s==='club'&&p==='show')out.push(...CLUB_SHOW);return out}
  if(r==='live_artist'){let src=s==='idol'?IDOL_ARTIST:s==='jazz'?JAZZ_ARTIST:ARTIST;return src[p]||ARTIST[p]||ARTIST.show}
  // Jazz clubs are seated dinner shows: no crowd control or drink tickets.
  let staff=STAFF[p]||STAFF.dark;if(s==='jazz')staff=[...(JAZZ_STAFF[p]||[]),...staff.filter(x=>!/押し合い|ドリンクチケット|ドリンク代|フロア|整理番号|物販/.test(x))];return staff.length?staff:STAFF.dark}
 function apply(c,P,t){if(!c.role.startsWith('live_'))return false;let ps=pool(c,t,P),text=ps[Math.floor(rnd()*ps.length)];P.mapSituation=text;P.visitLabel=c.label;P.sit={text,state:c.placeWorker?'work':'off',stateLabel:c.label,p:1};return true}
 return {kind,style,showDay,slots,phase,roles,assign,apply};
})();
if(typeof module!=='undefined')module.exports=LiveHouseModel;
