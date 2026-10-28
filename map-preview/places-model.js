/* Game assumptions: projected occupancy, not measured visitor counts or schedules. */
const PlacesModel=(()=>{
 const scenes={
 hotel_guest:['客室で荷物を整理し、次の予定を確認しているところでした','ロビーで待ち合わせの相手を探しているところでした'],
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
 function kind(c){if(['mall','complex','observation','shrine','temple','hotel','museum','theatre','fire_station'].includes(c.placeKind))return c.placeKind;if(c.source==='OpenStreetMap'&&c.name&&c.name!==c.subtype&&['hotel','museum','gallery','theatre','fire_station'].includes(c.subtype))return c.subtype==='gallery'?'museum':c.subtype;return null}
 function roles(c,t){let k=kind(c);if(!k)return null;let h=t.hf??t.h,we=t.dow===0||t.dow===6||t.holiday,day=h>=10&&h<20,open=h>=9&&h<21,work=h>=8&&h<22,scale=Math.max(.05,Math.min(20,(c.area||c.areaM2||10000)/10000)),factor=we?1.35:1,rows=[];
 let add=(key,label,n,min,max,female,worker=false)=>rows.push({role:'place_'+key,label,w:n,min,max,female,placeWorker:worker});
 if(k==='hotel'){add('hotel_guest','ホテルの宿泊客',scale*(h>=21||h<8?55:25),6,89,.5);add('hotel_staff','ホテル従業員',scale*(day?14:5),18,69,.55,true)}
 if(k==='museum'||k==='theatre'){let open=typeof OSMProfile!=='undefined'?OSMProfile.opening(c.openingHours,t):null,active=open===true||open===null&&(k==='museum'?h>=10&&h<17:h>=12&&h<21);add(k+'_guest',k==='museum'?'文化施設の来場者':'劇場の来場者',active?scale*50*factor:0,6,89,.55);add(k+'_staff',k==='museum'?'文化施設の職員':'劇場の職員',active?scale*8:scale*.3,20,69,.5,true)}
 if(k==='fire_station')add('fire_staff','消防職員',scale*(day?22:10),20,64,.15,true);
 if(k==='mall'||k==='complex'){add('shop_guest','買い物客',scale*(day?95*factor:open?25:0),6,84,.56);add('shop_staff','商業施設の販売員',scale*(open?15:work?3:0),18,69,.6,true);add('food_staff','飲食店の従業員',scale*(open?12:work?2:0),18,69,.55,true);if(k==='complex')add('office_staff','オフィス勤務者',scale*(h>=9&&h<18?(we?4:70):work?8:1),22,69,.45,true)}
 if(k==='observation'){add('observation_guest','展望施設の来場者',scale*(day?80*factor:open?25:0),6,84,.52);add('guide','展望施設の案内係',scale*(open?9:0),20,65,.55,true)}
 if(k==='shrine'||k==='temple'){let newyear=t.mo===1&&t.d<=3?4:1;add(k+'_guest','参拝者',scale*(h>=7&&h<18?25*factor*newyear:0),6,89,.52);add(k+'_worker',k==='shrine'?'神職・神社職員':'僧侶・寺院職員',scale*(h>=7&&h<18?3:.2),22,79,.4,true)}
 add('security','施設警備員',scale*(open?1.5:.4),20,69,.25,true);add('clean','施設の清掃スタッフ',scale*(work?2:.2),20,74,.55,true);return rows;}
 function assign(c,P){if(!c.role.startsWith('place_'))return;if(c.placeWorker)P.occ={label:c.label,group:'adult',cat:'special',kind:'employed',p:1};else if(['prison','facility'].includes(P.occ.group))P.occ={label:'無職',group:P.age>=65?'senior':'adult',cat:'none',p:1}}
 function apply(c,P){if(!c.role.startsWith('place_'))return;let pool=scenes[c.role.slice(6)];let text=pool[Math.floor(rnd()*pool.length)];P.mapSituation=text;P.visitLabel=c.label;P.sit={text,state:c.placeWorker?'work':'off',stateLabel:c.label,p:1}}
 return {kind,roles,assign,apply,scenes};
})();
if(typeof module!=='undefined')module.exports=PlacesModel;
