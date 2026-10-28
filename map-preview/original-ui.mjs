// Build-time reuse of the original source. No second hand-maintained notification template.
import fs from 'node:fs';
const shell=fs.readFileSync('shell.html','utf8'),app=fs.readFileSync('app.js','utf8'),engine=fs.readFileSync('engine.js','utf8');
const between=(s,a,b)=>{let i=s.indexOf(a),j=s.indexOf(b,i);if(i<0||j<0)throw Error('Original UI source marker missing: '+a);return s.slice(i,j)};
export const noticeTemplate=(between(shell,'<article class="notice"','</article>')+'</article>').replace(/^\s*<a class="btn btn-x" id="xpost"[^>]*>Xでポスト<\/a>\n/m,'');
export const originalStyles=between(shell,'/* 詳細設定 */','/* ステージ：地図とボタン */')+'\n'+between(shell,'.seal {','.mode {')+'\n'+between(shell,'/* 通知書 */','.toast {')+shell.slice(shell.indexOf('.toast {'),shell.indexOf('\n',shell.indexOf('.toast {')))+'\n';
const helpers=between(app,'function nameHTML(P)','// ---- 時計 ----');
const render=between(app,'function setField(id, html)','// ---- 誰かと誰かを入れ替える ----');
const pair=between(app,'// ---- 誰かと誰かを入れ替える ----','function stampIt(animate)');
const distance=between(app,'function distText(R)','// ---- 表示用の整形 ----');
const copy=between(app,'function resultText(P)','function copyResult()');
const behavior=between(app,'function scrollToNotice(instant)','function showPerson(P)');
const stamp=between(app,'function stampIt(animate)','// ---- 抽選の内訳 ----');
const college=['univ','tan','sen','grad'].map(k=>{let line=engine.split('\n').find(s=>s.includes(`if (k === '${k}') return`));if(!line)throw Error('Original college formatter missing');return line}).join('\n');
export const originalRuntime=`const OriginalStudent=(()=>{function college(k,y,pp=1){${college}}return {college};})();\nconst MapNotice=(()=>{let root;const $=s=>root.querySelector(s),SEX_JA={m:'男性',f:'女性'},esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])),fullName=P=>P.displayName||P.surname.k+' '+P.given.k,stars=n=>'★'.repeat(n)+'<i>'+'☆'.repeat(5-n)+'</i>';\n${helpers}\nfunction lightPref(){}function mapCaption(){}\n${render}\n${distance}\n${pair}\n${copy}\nfunction html(P){root=document.createElement('div');root.innerHTML=${JSON.stringify(noticeTemplate)};$('#pa').innerHTML=PP_ROWS('pa');$('#pb').innerHTML=PP_ROWS('pb');renderAny(P);if(P.displayName)$('#f-name').textContent=P.displayName;$('#rarity').title='地図条件内の名前・役割・状況による指標';$('#f-place').title=P.t.rand?'天気・気温は季節モデルによる推定':'天気は通知書の表示を参照';return root.innerHTML;}return {html,text:resultText};})();\nconst reduceMotion=typeof window!=='undefined'&&window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;const $=s=>document.querySelector(s);\n${behavior}\n${stamp}\n`;
