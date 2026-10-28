/* Game assumptions: projected occupancy, not measured visitor counts or schedules. */
const PlacesModel=(()=>{
 const scenes={
 library_guest:['図書館の本棚から本を選んでいるところでした','閲覧席で資料に目を通しているところでした','予約していた本を、カウンターで受け取ったところでした','学習席で、資格試験の問題集を解いているところでした','新聞コーナーで、各紙の見出しを読み比べているところでした','郷土資料の棚で、昔の地図を広げているところでした','雑誌の最新号を手に取り、ソファ席に腰を下ろしたところでした'],
 library_staff:['本の貸し出しを受け付けているところでした','返却された本を棚に戻しているところでした','レファレンスの窓口で、調べものの相談に乗っているところでした','新しく入った本に、ラベルとフィルムを貼っているところでした','児童書コーナーで、おはなし会の準備をしているところでした'],
 bank_guest:['銀行の窓口で手続きの順番を待っているところでした'],
 bank_staff:['銀行の窓口で手続きの書類を確認しているところでした'],
 bath_guest:['浴場で入浴を終え、休憩しているところでした','サウナで、12分計の針を見つめているところでした','水風呂から上がり、外気浴の椅子で目を閉じているところでした','露天風呂で、肩までつかって空を見上げているところでした','休憩処のリクライニングチェアで、漫画を読んでいるところでした','風呂上がりに、食事処で冷えた飲み物を頼んだところでした','岩盤浴の部屋で、じんわり汗をかいているところでした'],
 bath_staff:['浴場の受付で来館者を案内しているところでした','受付で、館内着とタオルのセットを渡しているところでした','浴場の床を、デッキブラシで磨いているところでした','サウナ室で、熱した石に水をかけて蒸気を立てているところでした'],
 tourist_guest:['施設の案内板を読み、見どころを探しているところでした','施設を見て回りながら、写真を撮っているところでした'],
 tourist_staff:['来場者に施設の案内をしているところでした'],
 hotel_guest:['客室で荷物を整理し、次の予定を確認しているところでした','ロビーで待ち合わせの相手を探しているところでした'],
 // SHIBUYA109: a fashion building for teens and twenties.
 s109_guest:['店頭で、店員さんのコーディネートを参考に新作を手に取っているところでした','試着室の前で、友達に二着のどちらが似合うか聞いているところでした','エスカレーターで上の階へ向かいながら、気になるブランドの場所を確かめているところでした','109の前で、待ち合わせの友達を探しているところでした','ショッパーの袋を提げて、プリクラ機のあるフロアへ向かうところでした','韓国コスメの売り場で、新色のリップを手の甲に試しているところでした'],
 s109_staff:['店頭のマネキンの着こなしを、新作に替えているところでした','レジで会計をしながら、今日のコーデを客に褒められたところでした','SNSに載せる新作の写真を、店の奥で撮っているところでした','セール品の棚を整え、サイズ別に並べ直しているところでした'],
 cinema_guest:['発券機で、真ん中の列の空席を探しているところでした','売店でポップコーンを塩とキャラメルのどちらにするか迷っているところでした','予告編が始まり、スマートフォンの電源を切ったところでした','暗いシアターで、スクリーンの展開に息をのんだところでした','上映中、隣の席の人と同時に笑ってしまったところでした','エンドロールが終わるまで、席を立たずに見届けているところでした','上映が終わり、ロビーで連れと感想を言い合っているところでした'],
 cinema_mini:['上映後のトークイベントで、監督の話に聞き入っているところでした','名作の特集上映で、古いフィルムの色合いを味わっているところでした','小さなロビーで、次回上映のチラシを一枚ずつ手に取っているところでした'],
 cinema_kid:['アニメ映画の上映前に、入場者特典のカードを開けているところでした','ポップコーンを抱えて、スクリーンの前の席で足をぶらぶらさせているところでした'],
 cinema_staff:['入場口で、チケットのQRコードを読み取っているところでした','売店で、ポップコーンを大きなカップに詰めているところでした','上映後のシアターで、座席の下のごみを拾っているところでした','映写室で、次の回の上映データを確かめているところでした'],
 hotel_staff:['フロントで宿泊客の案内をしているところでした','宿泊の予約内容を確認しているところでした'],
 museum_guest:['展示の説明を読み、作品を眺めているところでした','展示室を歩き、気になった資料の前で立ち止まっているところでした'],
 museum_staff:['来場者に展示室の場所を案内しているところでした','展示や施設の準備をしているところでした'],
 theatre_guest:['開演を待ちながら、手元のプログラムを読んでいるところでした','会場で自分の座席を探しているところでした'],
 theatre_staff:['来場者に座席の場所を案内しているところでした','公演の準備をしているところでした'],
 fire_staff:['消防署で車両や装備を点検しているところでした','出動に備え、署内で業務をしているところでした'],
 shop_guest:['売り場で商品を手に取り、色違いを見比べているところでした','買い物の合間に案内図を開き、次に行く店を探しているところでした'],
 shop_staff:['客に商品の場所を尋ねられ、棚まで案内しているところでした','会計を終えた品を袋に入れ、客に手渡しているところでした'],
 food_staff:['注文票を確かめ、できあがった料理を客席へ運んでいるところでした','客から追加の注文を聞き、厨房に伝えているところでした'],
 office_staff:['資料を読み返し、同僚に確認したいことを尋ねているところでした','会議に向かう途中、次の予定をスマートフォンで確認しているところでした'],
 observation_guest:['展望窓から街を見下ろし、見覚えのある建物を探しているところでした','景色を写真に収め、同行者に画面を見せているところでした'],
 guide:['来場者に順路を尋ねられ、案内表示を指しながら説明しているところでした','入場を待つ人に声をかけ、順番を案内しているところでした'],
 shrine_guest:['参道を歩き、手水を済ませてから社殿に向かっているところでした','社殿の前で手を合わせ、静かに願いごとをしているところでした'],
 temple_guest:['本堂の前で手を合わせ、しばらく静かに目を閉じているところでした','境内を歩き、立ち止まって案内板を読んでいるところでした'],
 shrine_worker:['授与所で参拝者からの質問を聞き、説明しているところでした','境内を整え、訪れた人に挨拶しているところでした'],
 temple_worker:['境内を掃きながら、参拝に訪れた人を迎えているところでした','本堂の準備を終え、使った道具を片づけているところでした'],
 security:['施設内を巡回し、次の担当者に伝えることを記録しているところでした','出入口の様子を見ながら、道を尋ねた人に案内しているところでした'],
 clean:['通路を掃除し、人が通るのを待ってから作業を再開したところでした','施設内のごみを集め、清掃道具を片づけているところでした']};
 function kind(c){if(['mall','complex','observation','shrine','temple','hotel','hostel','cinema','museum','theatre','fire_station','large_shop','library','bank','bath','tourist'].includes(c.placeKind))return c.placeKind;if(c.source==='OpenStreetMap'&&c.name&&c.name!==c.subtype&&['hotel','hostel','museum','gallery','theatre','fire_station','large_shop','library','bank','bath','tourist'].includes(c.subtype))return c.subtype==='gallery'?'museum':c.subtype;return null}
 function roles(c,t){let k=kind(c);if(!k)return null;let h=t.hf??t.h,we=t.dow===0||t.dow===6||t.holiday,day=h>=10&&h<20,open=h>=9&&h<21,work=h>=8&&h<22,scale=Math.max(.05,Math.min(20,(c.area||c.areaM2||10000)/10000)),factor=we?1.35:1,rows=[];
 let add=(key,label,n,min,max,female,worker=false)=>rows.push({role:'place_'+key,label,w:n,min,max,female,placeWorker:worker});
 if(k==='hostel')k='hotel';
 if(k==='hotel'&&typeof HotelModel!=='undefined'&&HotelModel.style(c))return HotelModel.roles(c,t);
 if(['library','bank','bath','tourist'].includes(k)){let actual=typeof OSMProfile!=='undefined'?OSMProfile.opening(c.openingHours,t):null,active=actual===null?(k==='bank'?h>=9&&h<15&&!we:k==='bath'?(c.allNight||h>=10):k==='library'?h>=9&&h<(we?17:20):h>=9&&h<18):actual;let labels={library:['図書館の利用者','図書館職員'],bank:['銀行の利用者','銀行員'],bath:['温浴施設の利用者','温浴施設の従業員'],tourist:['観光施設の来場者','観光施設の職員']}[k];add(k+'_guest',labels[0],active?scale*(k==='bath'?(h>=18||h<2?90:60)*(we?1.4:1):50):0,k==='bath'?12:6,89,k==='bath'?.45:.5);add(k+'_staff',labels[1],active?scale*8:scale*.2,20,69,.5,true)}
 if(k==='large_shop'&&c.placeVariant==='shibuya109'){let hours=typeof OSMProfile!=='undefined'?OSMProfile.opening(c.openingHours,t):null,active=hours===null?h>=10&&h<21:hours;rows.push({role:'place_s109_guest',label:'SHIBUYA109の買い物客',w:active?scale*(day?120*factor:30):0,min:12,max:64,female:.85,ageBands:[[12,17,24],[18,24,46],[25,29,17],[30,44,10],[45,64,3]]});add('s109_staff','ショップ店員',scale*(active?18:work?3:0),18,39,.9,true);add('security','施設警備員',scale*(active?1.5:.4),20,69,.25,true);add('clean','施設の清掃スタッフ',scale*(work?2:.2),20,74,.55,true);return rows}
 if(k==='large_shop'){let hours=typeof OSMProfile!=='undefined'?OSMProfile.opening(c.openingHours,t):null,active=hours===null?open:hours;add('shop_guest','大型店舗の買い物客',active?scale*(day?80*factor:20):0,6,89,.52);add('shop_staff','大型店舗の販売員',scale*(active?14:work?2:0),18,69,.55,true)}
 if(k==='hotel'){add('hotel_guest','ホテルの宿泊客',scale*(h>=21||h<8?55:25),6,89,.5);add('hotel_staff','ホテル従業員',scale*(day?14:5),18,69,.55,true)}
 if(k==='museum'||k==='theatre'){let open=typeof OSMProfile!=='undefined'?OSMProfile.opening(c.openingHours,t):null,active=open===true||open===null&&(k==='museum'?h>=10&&h<17:h>=12&&h<21);add(k+'_guest',k==='museum'?'文化施設の来場者':'劇場の来場者',active?scale*50*factor:0,6,89,.55);add(k+'_staff',k==='museum'?'文化施設の職員':'劇場の職員',active?scale*8:scale*.3,20,69,.5,true)}
 // Cinemas: shows from morning to past midnight at multiplexes; weekend daytime is busiest, late shows are adults.
 if(k==='cinema'){let mini=c.cinemaStyle==='mini',seats=c.seats||(mini?150:1500),open=mini?h>=10&&h<22.5:h>=8.5||h<1,occ=!open?0:we?(h<12?.2:h<18?.45:h<22?.35:.12):(h<12?.05:h<17?.1:h<22?.22:.08);add('cinema_guest','映画館の観客',seats*occ,h>=21||h<1?18:4,84,.52);add('cinema_staff','映画館スタッフ',open?Math.max(2,seats/120):h>=7&&h<9?1:0,18,64,.55,true);return rows}
 if(k==='fire_station')add('fire_staff','消防職員',scale*(day?22:10),20,64,.15,true);
 if(k==='mall'||k==='complex'){add('shop_guest','買い物客',scale*(day?95*factor:open?25:0),6,84,.56);add('shop_staff','商業施設の販売員',scale*(open?15:work?3:0),18,69,.6,true);add('food_staff','飲食店の従業員',scale*(open?12:work?2:0),18,69,.55,true);if(k==='complex')add('office_staff','オフィス勤務者',scale*(h>=9&&h<18?(we?4:70):work?8:1),22,69,.45,true)}
 if(k==='observation'){add('observation_guest','展望施設の来場者',scale*(day?80*factor:open?25:0),6,84,.52);add('guide','展望施設の案内係',scale*(open?9:0),20,65,.55,true)}
 if(k==='shrine'||k==='temple'){let newyear=t.mo===1&&t.d<=3?4:1;add(k+'_guest','参拝者',scale*(h>=7&&h<18?25*factor*newyear:0),6,89,.52);add(k+'_worker',k==='shrine'?'神職・神社職員':'僧侶・寺院職員',scale*(h>=7&&h<18?3:.2),22,79,.4,true)}
 add('security','施設警備員',scale*(open?1.5:.4),20,69,.25,true);add('clean','施設の清掃スタッフ',scale*(work?2:.2),20,74,.55,true);return rows;}
 function assign(c,P){if(!c.role.startsWith('place_'))return;if(typeof HotelModel!=='undefined'&&HotelModel.assign(c,P))return;if(c.placeWorker)P.occ={label:c.label,group:'adult',cat:'special',kind:'employed',p:1};else if(['prison','facility'].includes(P.occ.group))P.occ={label:'無職',group:P.age>=65?'senior':'adult',cat:'none',p:1}}
 function apply(c,P,t){if(!c.role.startsWith('place_'))return;if(typeof HotelModel!=='undefined'&&HotelModel.apply(c,P,t))return;let pool=scenes[c.role.slice(6)];if(c.role==='place_cinema_guest')pool=P.age<12?scenes.cinema_kid:c.landComponent?.cinemaStyle==='mini'&&rnd()<.4?scenes.cinema_mini:scenes.cinema_guest;let text=pool[Math.floor(rnd()*pool.length)];P.mapSituation=text;P.visitLabel=c.label;P.sit={text,state:c.placeWorker?'work':'off',stateLabel:c.label,p:1}}
 return {kind,roles,assign,apply,scenes};
})();
if(typeof module!=='undefined')module.exports=PlacesModel;
