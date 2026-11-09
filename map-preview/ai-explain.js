/* 「AI解説」。入れ替わりの構造化データを解説用 Worker（ai-explain/）へ送り、返ってきた文章を表示する。
   既定はプロフィールと場面から考えた外見情報の文章で、人物ごとに見出し「○○の外見情報」の下へ年齢・性別・仕事を添える。デバッグ欄の「AI解説切り替え」で「入れ替わり直後」の描写に切り替えられる（setMode）。
   APIキーはページに置かない。AI_EXPLAIN_ENDPOINT はビルド時に入る Worker の URL で、空ならボタンを出さない。
   ボタンは通知書と「入れ替わった人たち」の各カードで、見出し「入れ替わりのお知らせ」のすぐ後ろに置く。 */
const AiExplain=(()=>{
 const endpoint=()=>typeof AI_EXPLAIN_ENDPOINT==='string'?AI_EXPLAIN_ENDPOINT:'';
 const enabled=()=>!!endpoint()&&typeof document!=='undefined';
 let mode='look';const setMode=m=>{mode=m==='swap'?'swap':'look'};
 const WORDING={look:{busy:'AIが外見を考えています…',note:'AIが考えた外見の一例です。'},swap:{busy:'AIが入れ替わり直後の様子を書いています…',note:'AIが書いた架空の出来事です。'}};
 const hobbyText=X=>(X.hobbies||[]).map(h=>h.detail||String(h.label||'').replace(/[(（].*$/,'')).filter(Boolean).join('、');
 // 家族構成（世帯・同居家族）は通知書で伏せているので送らない。
 const person=X=>({name:X.displayName||X.surname.k+' '+X.given.k,sex:X.sex,age:X.age,job:X.occ?.label,status:X.visitLabel,place:X.place,weather:X.wxText,situation:X.sit?.text,
  hobbies:hobbyText(X),health:X.health?.text,height:X.body?.h,weight:X.body?.w});
 // The Worker accepts only this shape and writes the prompt itself.
 function payload(P){const t=P.t||P.A?.t||{},when={y:t.y,mo:t.mo,d:t.d,dow:t.dow,h:t.h,mi:t.mi};
  return P.kind==='pair'?{v:1,mode,kind:'pair',when,gap:P.gap?.stars,A:person(P.A),B:person(P.B)}:{v:1,mode,kind:'single',when,P:person(P)}}
 // 【見出し】本文 … → [{head,body}]
 function sections(text){const out=[];for(const line of String(text||'').split(/\n+/).map(s=>s.trim()).filter(Boolean)){const m=/^【([^】]{1,20})】\s*(.*)$/.exec(line);if(m)out.push({head:m[1],body:m[2]});else if(out.length){const o=out[out.length-1];o.body+=(o.body?'\n':'')+line}else out.push({head:'',body:line})}return out}
 // 外見の見出し（【氏名】）の下に出す「47歳・男性・トラック運転手（正社員）」。名前で人物を探し、見つからなければ順番で対応させる。
 const sexJa=s=>s==='f'?'女性':s==='m'?'男性':'';
 const profile=X=>X?[Number.isFinite(X.age)&&X.age+'歳',sexJa(X.sex),X.job].filter(Boolean).join('・'):'';
 const bare=s=>String(s||'').replace(/\s+/g,'');
 function whoOf(people,head,i){return people.find(X=>bare(X.name)===bare(head))||people[i]}
 // 外見の見出しは「河野 莉子の外見情報」（AIが付けてきても二重にしない）。
 const lookHead=h=>String(h||'').replace(/の?外見情報$/,'')+'の外見情報';
 const MESSAGES={rate_limited:'続けて解説を頼みすぎています。1分ほど待ってから、もう一度お試しください。',daily_limit:'今日の解説の上限に達しました。明日またお試しください。',refused:'この入れ替わりの解説は作れませんでした。',offline:'解説を取得できませんでした。通信状況を確かめて、もう一度お試しください。'};
 const message=code=>MESSAGES[code]||MESSAGES.offline;
 // Explanations already fetched stay on this device, so reopening a notice or card costs nothing.
 const KEY='swapsim-map-ai-v7',memo=new Map(),open=new Set(),pending=new Map();
 function stored(){try{return JSON.parse(localStorage.getItem(KEY)||'{}')||{}}catch{return {}}}
 function remember(id,text){memo.set(id,text);try{const all=stored();all[id]=text;const ids=Object.keys(all);for(const k of ids.slice(0,Math.max(0,ids.length-30)))delete all[k];localStorage.setItem(KEY,JSON.stringify(all))}catch{}}
 function recall(id){if(memo.has(id))return memo.get(id);const t=stored()[id];if(t)memo.set(id,t);return t}
 async function fetchText(body){const ctl=new AbortController(),timer=setTimeout(()=>ctl.abort(),60000);let r;try{r=await fetch(endpoint().replace(/\/+$/,'')+'/explain',{method:'POST',headers:{'Content-Type':'application/json'},body,signal:ctl.signal})}catch(e){clearTimeout(timer);return {error:'offline'}}
  let o=null;try{o=await r.json()}catch{}clearTimeout(timer);if(!r.ok||!o?.text)return {error:o?.error||'offline'};return {text:o.text}}
 // One request per swap even when the notice and its card ask at the same time.
 function request(body){if(!pending.has(body))pending.set(body,fetchText(body).then(got=>{pending.delete(body);if(got.text)remember(body,got.text);return got}));return pending.get(body)}
 function para(line){const p=document.createElement('p');p.className='ai-para';p.textContent=line;return p}
 // people: 外見のときだけ渡す（payload の人物）。見出しの下に年齢・性別・仕事を出す。
 function render(box,text,m,people){box.replaceChildren();const h=document.createElement('p');h.className='ai-title';h.textContent='AI解説';box.append(h);
  const look=(m||mode)==='look';sections(text).forEach((s,i)=>{if(s.head){const b=document.createElement('h4');b.textContent=look?lookHead(s.head):s.head;box.append(b);
   const meta=look&&people?profile(whoOf(people,String(s.head).replace(/の?外見情報$/,''),i)):'';if(meta){const q=document.createElement('p');q.className='ai-meta';q.textContent=meta;box.append(q)}}
   for(const line of s.body.split('\n').filter(Boolean))box.append(para(line))});
  const n=document.createElement('p');n.className='ai-note';n.textContent=WORDING[m||mode].note;box.append(n);box.hidden=false}
 function status(box,text,err){box.replaceChildren();const p=document.createElement('p');p.className=err?'ai-status ai-err':'ai-status';p.textContent=text;box.append(p);box.hidden=false}
 function chip(id){const b=document.createElement('button');b.type='button';b.className='ai-chip';if(id)b.id=id;b.textContent='AI解説';b.setAttribute('aria-expanded','false');return b}
 // Wires one button to one box for swap P. Open boxes stay open when the notice or the cards are redrawn.
 // The payload is read again at each press, so a mode switched in the debug panel applies to the next press.
 function mount(P,btn,box){let body=JSON.stringify(payload(P)),shown=mode;btn.setAttribute('aria-controls',box.id||'');
  const show=(text,m)=>{const o=JSON.parse(body);render(box,text,m,o.kind==='pair'?[o.A,o.B]:[o.P]);btn.setAttribute('aria-expanded','true')},close=()=>{box.hidden=true;btn.setAttribute('aria-expanded','false');open.delete(body)};
  if(open.has(body)&&recall(body))show(recall(body));
  btn.onclick=async e=>{e.stopPropagation();if(btn.getAttribute('aria-expanded')==='true')return close();body=JSON.stringify(payload(P));shown=mode;open.add(body);
   const have=recall(body);if(have){show(have,shown);return reveal(box)}
   btn.disabled=true;status(box,WORDING[shown].busy);reveal(box);const got=await request(body);btn.disabled=false;
   if(!box.isConnected)return;if(got.text)show(got.text,shown);else{open.delete(body);status(box,message(got.error),true)}}}
 // Pressing AI解説 brings its box into view (once, at the press; the text then fills in below its top).
 function reveal(box){try{const still=typeof matchMedia==='function'&&matchMedia('(prefers-reduced-motion: reduce)').matches;box.scrollIntoView({behavior:still?'auto':'smooth',block:'start'})}catch{}}
 // The notice in #person: the chip follows the title, the box goes under the notice.
 function attach(P){if(!enabled())return;const root=document.getElementById('person'),head=root?.querySelector('.notice-head h2'),notice=root?.querySelector('.notice');if(!head||!notice)return;
  const btn=chip('ai-btn');head.after(btn);const box=document.createElement('section');box.className='ai-box';box.id='ai-box';box.hidden=true;box.setAttribute('aria-live','polite');box.setAttribute('aria-label','AI解説');notice.after(box);mount(P,btn,box)}
 // 「入れ替わった人たち」のカードと「同じ瞬間に入れ替わった人たち」の一覧（各 li に [data-ai] のボタンと .ai-box がある）。
 function cards(list,results){if(!enabled()||typeof list?.querySelectorAll!=='function')return;list.querySelectorAll('[data-ai]').forEach(btn=>{const i=+btn.dataset.ai,R=results[i],box=btn.closest('li')?.querySelector('.ai-box');if(!R||!box)return;btn.hidden=false;mount(R,btn,box)})}
 function disable(on){const b=typeof document!=='undefined'&&document.getElementById('ai-btn');if(b)b.disabled=on}
 return {attach,cards,disable,payload,sections,profile,whoOf,lookHead,message,enabled,setMode,mode:()=>mode};
})();
if(typeof module!=='undefined')module.exports=AiExplain;
