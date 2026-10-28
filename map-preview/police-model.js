/* Game assumptions only; no actual personnel, custody, cases or live schedules. */
const PoliceModel=(()=>{
 const scenes={
  patrol:['引き継ぎを受け、担当区域で気をつけることを確認しているところでした','交番から戻り、今日の出来事を記録にまとめているところでした'],
  investigation:['届いた相談の内容を読み返し、同僚と確認事項を整理しているところでした','聞き取った内容を記録にまとめ、次の担当者に引き継いでいるところでした'],
  traffic:['交通に関する届出を確認し、担当者に書類を渡しているところでした','交通相談を受け、地図を見ながら場所を確かめているところでした'],
  desk:['来署者の話を聞き、担当窓口を案内しているところでした','届出の内容を聞き取り、記入した書類を見直しているところでした'],
  clerical:['申請書の記入欄を確認し、必要な書類を案内しているところでした','届いた書類を整理し、次の手続きを進めているところでした'],
  applicant:['手続きの順番を待ちながら、持参した書類を見直しているところでした','窓口で必要な書類を尋ね、鞄から身分証を取り出しているところでした'],
  visitor:['落とし物について窓口で尋ね、心当たりの場所を伝えているところでした','相談したいことを頭の中で整理しながら、受付で順番を待っているところでした'],
  clean:['共用部分を掃除し、通りかかった人に場所を譲っているところでした','清掃用具を片づけ、床に取り残しがないか見直しているところでした']};
 function kind(c){return c.kind==='police'||c.subtype==='police'?'police':null}
 function roles(c,t){if(!kind(c))return null;let h=t.hf??t.h,day=h>=8&&h<18,weekday=t.dow!==0&&t.dow!==6&&!t.holiday,service=weekday&&h>=8.5&&h<17.5,scale=Math.max(.4,Math.min(4,(c.area||Math.PI*(c.radius||20)**2)/1256)),out=[];
 const add=(key,label,n,min,max,female,worker)=>out.push({role:'police_'+key,label,w:n*scale,min,max,female,policeWorker:worker});
 add('patrol','警察官（地域警察）',day?25:10,20,60,.2,true);add('investigation','警察官（捜査）',day?14:4,22,64,.25,true);add('traffic','警察官（交通）',day?8:2,20,60,.2,true);add('desk','警察官（窓口・当直）',day?8:4,20,64,.3,true);add('clerical','警察署の事務職員',service?12:0,20,65,.6,true);add('applicant','手続きに来た人',service?16:0,18,89,.5,false);add('visitor','相談・届出に来た人',day?8:2,16,89,.5,false);add('clean','警察署の清掃スタッフ',day?2:0,20,74,.55,true);return out;}
 function assign(c,P){if(!c.role.startsWith('police_'))return;if(c.policeWorker)P.occ={label:c.label,group:'adult',cat:'special',kind:'employed',p:1};else if(['facility','prison'].includes(P.occ.group))P.occ={label:'無職',group:P.age>=65?'senior':'adult',cat:'none',p:1}}
 function apply(c,P){if(!c.role.startsWith('police_'))return;let pool=scenes[c.role.slice(7)],text=pool[Math.floor(rnd()*pool.length)];P.mapSituation=text;P.visitLabel=c.label;P.sit={text,state:c.policeWorker?'work':'off',stateLabel:c.label,p:1};}
 return {kind,roles,assign,apply,scenes};
})();
if(typeof module!=='undefined')module.exports=PoliceModel;
