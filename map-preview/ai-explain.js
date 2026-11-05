/* 通知書の「AI解説」。入れ替わりの構造化データを解説用 Worker（ai-explain/）へ送り、返ってきた文章を表示する。
   APIキーはページに置かない。AI_EXPLAIN_ENDPOINT はビルド時に入る Worker の URL で、空ならボタンを出さない。 */
const AiExplain=(()=>{
 const endpoint=()=>typeof AI_EXPLAIN_ENDPOINT==='string'?AI_EXPLAIN_ENDPOINT:'';
 const hobbyText=X=>(X.hobbies||[]).map(h=>h.detail||String(h.label||'').replace(/[(（].*$/,'')).filter(Boolean).join('、');
 const person=X=>({name:X.displayName||X.surname.k+' '+X.given.k,sex:X.sex,age:X.age,job:X.occ?.label,status:X.visitLabel,place:X.place,weather:X.wxText,situation:X.sit?.text,
  household:X.household?.label,family:(X.familyContext?.members||[]).filter(m=>m!=='本人').join('・'),hobbies:hobbyText(X),health:X.health?.text,height:X.body?.h,weight:X.body?.w});
 // The Worker accepts only this shape and writes the prompt itself.
 function payload(P){const t=P.t||P.A?.t||{},when={y:t.y,mo:t.mo,d:t.d,dow:t.dow,h:t.h,mi:t.mi};
  return P.kind==='pair'?{v:1,kind:'pair',when,gap:P.gap?.stars,A:person(P.A),B:person(P.B)}:{v:1,kind:'single',when,P:person(P)}}
 // 【見出し】本文 … → [{head,body}]
 function sections(text){const out=[];for(const line of String(text||'').split(/\n+/).map(s=>s.trim()).filter(Boolean)){const m=/^【([^】]{1,20})】\s*(.*)$/.exec(line);if(m)out.push({head:m[1],body:m[2]});else if(out.length)out[out.length-1].body+=line;else out.push({head:'',body:line})}return out}
 const MESSAGES={rate_limited:'続けて解説を頼みすぎています。1分ほど待ってから、もう一度お試しください。',daily_limit:'今日の解説の上限に達しました。明日またお試しください。',refused:'この入れ替わりの解説は作れませんでした。',offline:'解説を取得できませんでした。通信状況を確かめて、もう一度お試しください。'};
 const message=code=>MESSAGES[code]||MESSAGES.offline;
 // Explanations already fetched stay on this device, so reopening a notice costs nothing.
 const KEY='swapsim-map-ai-v1',memo=new Map();
 function stored(){try{return JSON.parse(localStorage.getItem(KEY)||'{}')||{}}catch{return {}}}
 function remember(id,text){memo.set(id,text);try{const all=stored();all[id]=text;const ids=Object.keys(all);for(const k of ids.slice(0,Math.max(0,ids.length-30)))delete all[k];localStorage.setItem(KEY,JSON.stringify(all))}catch{}}
 function recall(id){if(memo.has(id))return memo.get(id);const t=stored()[id];if(t)memo.set(id,t);return t}
 async function fetchText(body,signal){let r;try{r=await fetch(endpoint().replace(/\/+$/,'')+'/explain',{method:'POST',headers:{'Content-Type':'application/json'},body,signal})}catch(e){return {error:'offline'}}
  let o=null;try{o=await r.json()}catch{}if(!r.ok||!o?.text)return {error:o?.error||'offline'};return {text:o.text}}
 function render(box,text){box.replaceChildren();const h=document.createElement('h3');h.className='ai-title';h.textContent='AI解説';box.append(h);
  for(const s of sections(text)){if(s.head){const b=document.createElement('h4');b.textContent=s.head;box.append(b)}const p=document.createElement('p');p.textContent=s.body;box.append(p)}
  const n=document.createElement('p');n.className='ai-note';n.textContent='AIによる架空の予測です。人物・出来事はすべて架空です。';box.append(n);box.hidden=false}
 function status(box,text,err){box.replaceChildren();const p=document.createElement('p');p.className=err?'ai-status ai-err':'ai-status';p.textContent=text;box.append(p);box.hidden=false}
 // Adds the button next to 画像で共有 in the notice currently shown in #person.
 function attach(P){if(!endpoint()||typeof document==='undefined')return;const root=document.getElementById('person'),actions=root?.querySelector('.actions');if(!actions)return;
  const btn=document.createElement('button');btn.type='button';btn.className='btn btn-ai';btn.id='ai-btn';btn.textContent='AI解説';
  const anchor=actions.querySelector('#shareimg:not([hidden])')||actions.querySelector('#copy');(anchor?anchor.after(btn):actions.prepend(btn));
  const box=document.createElement('section');box.className='ai-box';box.id='ai-box';box.hidden=true;box.setAttribute('aria-live','polite');box.setAttribute('aria-label','AI解説');(actions.closest('.notice')||actions).after(box);
  const body=JSON.stringify(payload(P)),done=recall(body);if(done){render(box,done);btn.textContent='AI解説を閉じる'}
  let busy=false;btn.onclick=async()=>{if(busy)return;if(!box.hidden&&box.querySelector('.ai-title')){box.hidden=true;btn.textContent='AI解説';return}
   const have=recall(body);if(have){render(box,have);btn.textContent='AI解説を閉じる';return}
   busy=true;btn.disabled=true;status(box,'AIが入れ替わり直後の様子を考えています…');const ctl=new AbortController(),timer=setTimeout(()=>ctl.abort(),40000);
   const got=await fetchText(body,ctl.signal);clearTimeout(timer);busy=false;btn.disabled=false;
   if(!box.isConnected)return;if(got.text){remember(body,got.text);render(box,got.text);btn.textContent='AI解説を閉じる'}else status(box,message(got.error),true)}}
 function disable(on){const b=typeof document!=='undefined'&&document.getElementById('ai-btn');if(b)b.disabled=on}
 return {attach,disable,payload,sections,message};
})();
if(typeof module!=='undefined')module.exports=AiExplain;
