// ===== 画面 =====
const $ = s => document.querySelector(s);
const POP_JP = 12300; // 万人
const SEX_JA = { m: '男性', f: '女性' };
const reduceMotion = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
const S = { live: new Map(), mode: 'now', current: null, crowd: [], busy: false, token: 0, timers: [], count: 0, history: [], plays: 0, lastMin: -1 };

function store(get, key, val) {
  try {
    if (get) return localStorage.getItem(key);
    localStorage.setItem(key, val);
  } catch (e) { return null; }
}
function loadStore() {
  try {
    const h = JSON.parse(store(true, 'irekawari-history') || '[]');
    S.history = Array.isArray(h) ? h.slice(0, 30) : [];
    S.count = parseInt(store(true, 'irekawari-count') || '0', 10) || 0;
  } catch (e) { S.history = []; S.count = 0; }
}
function saveStore() {
  store(false, 'irekawari-history', JSON.stringify(S.history.slice(0, 30)));
  store(false, 'irekawari-count', String(S.count));
}

// ---- 地図 ----
const MAX_POP = Math.max(...PREFS.map(p => p.pop));
function buildMap() {
  let html = '<path class="divider" d="M0 9.55 H1.55 V11"/>';
  PREFS.forEach((p, i) => {
    const o = (.1 + .9 * Math.sqrt(p.pop / MAX_POP)).toFixed(2);
    html += `<g data-i="${i}"><title>${p.n}</title><rect class="t-base" x="${p.x + .06}" y="${p.y + .06}" width=".88" height=".88" rx=".16"/><rect class="t-fill" x="${p.x + .06}" y="${p.y + .06}" width=".88" height=".88" rx=".16" fill-opacity="${o}"/></g>`;
  });
  $('#map').innerHTML = html;
}
function lightPref(i, j) {
  const svg = $('#map');
  svg.querySelectorAll('g.on, g.on2').forEach(g => g.classList.remove('on', 'on2'));
  if (j != null && j >= 0 && j !== i) svg.querySelector(`g[data-i="${j}"]`).classList.add('on2');
  if (i != null && i >= 0) svg.querySelector(`g[data-i="${i}"]`).classList.add('on');
}
function mapCaption(P) {
  if (!P) { $('#mapcap').textContent = '色が濃いほど、人口が多く入れ替わり先になりやすい都道府県です'; return; }
  if (P.kind === 'pair') {
    $('#mapcap').innerHTML = `<b>${P.A.pref.n}</b> ⇄ <b class="b2">${P.B.pref.n}</b>　${esc(distText(P))}`;
    return;
  }
  $('#mapcap').innerHTML = `<b>${P.pref.n}</b>　人口比 ${fmtP(P.pref.pop / PREF_TOTAL)}`;
}
function distText(R) {
  if (R.A.pref !== R.B.pref) return `約${R.gap.km.toLocaleString('ja-JP')}km`;
  return R.A.muni === R.B.muni ? `同じ${R.A.muni.n}の中` : `同じ${R.A.pref.n}の中`;
}

// ---- 表示用の整形 ----
function fmtP(p) {
  if (p >= .995) return 'ほぼ確実';
  if (p >= .1) return Math.round(p * 100) + '%';
  if (p >= .01) return (p * 100).toFixed(1) + '%';
  if (p >= .001) return (p * 100).toFixed(2) + '%';
  return '約' + Math.round(1 / p).toLocaleString('ja-JP') + '分の1';
}
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const fullName = P => `${P.surname.k} ${P.given.k}`;
const stars = n => '★'.repeat(n) + '<i>' + '☆'.repeat(5 - n) + '</i>';
function nameHTML(P) {
  return `<ruby>${esc(P.surname.k)}<rt>${esc(P.surname.r)}</rt></ruby><ruby>${esc(P.given.k)}<rt>${esc(P.given.r)}</rt></ruby>`;
}
const whereText = P => (P.prison ? `${P.place}の${P.prison.n}にいる` : `${P.place}にいる`);
// 通知書の「場所」：いまいる場所（天気 気温）＋ 服役中は刑務所名
function placeHTML(P) {
  return esc(P.place) + (P.wxText ? `<span class="wx">（${esc(P.wxText)}）</span>` : '') +
    (P.prison ? `<span class="sub">${esc(P.prison.n)}</span>` : '');
}
function openingHTML(P) {
  if (P.prison) return `あなたは、<strong>${esc(P.place)}</strong>の${esc(P.prison.n)}にいる${SEX_JA[P.sex]}、<span class="who">${esc(fullName(P))}</span>さんと入れ替わりました。`;
  return `あなたは、<strong>${esc(P.place)}</strong>にいる${SEX_JA[P.sex]}、<span class="who">${esc(fullName(P))}</span>さんと入れ替わりました。`;
}
// 体格と健康（古い履歴や共有URLには無いことがある）
const f1 = x => x.toFixed(1);
const heightHTML = P => P.body ? `${f1(P.body.h)}cm` : '—';
const weightHTML = P => P.body ? `${f1(P.body.w)}kg<span class="sub">（${esc(bmiText(P))}）</span>` : '—';
const bodyHTML = P => P.body ? `${f1(P.body.h)}cm・${f1(P.body.w)}kg<span class="sub">（${esc(bmiText(P))}）</span>` : '—';
const healthHTML = P => P.health ? esc(P.health.text) : '—';
function ageText(P) {
  return `${P.age}歳<span class="sub">（${P.birth.y}年${P.birth.mo}月${P.birth.d}日生まれ）</span>`;
}

// ---- 時計 ----
function tick() {
  const t = jstNow();
  $('#clock').textContent = fmtWhen(t);
  $('#clock-label').textContent = '日本時間';
  if (S.mode === 'now' && !S.busy && t.mi !== S.lastMin) {
    S.lastMin = t.mi;
    if (!S.current || !S.current.t.rand) renderNow(t);
  }
}

// ---- いまの天気（Open-Meteo）----
// 47都道府県の県庁所在地の実況を1回で取り、30分ためておく。取れないときは気候の傾向で代わりにする
const WX_KEY = 'irekawari-wx-v2';
const WX_URL = 'https://api.open-meteo.com/v1/forecast?latitude=' + PREFS.map(p => p.ll[0]).join(',') + '&longitude=' + PREFS.map(p => p.ll[1]).join(',') +
  '&current=temperature_2m,precipitation,snowfall,weather_code,wind_gusts_10m&daily=temperature_2m_max,temperature_2m_min&forecast_days=1&timezone=Asia%2FTokyo&wind_speed_unit=ms';
let wxLoading = false;
let wxCheckedAt = 0;
function wxStatus(at) {
  const el = document.getElementById('wx-status');
  if (!el) return;
  el.textContent = at && Date.now() - at < WX_TTL
    ? `（天気：${new Date(at).toLocaleTimeString('ja-JP', { timeZone: 'Asia/Tokyo', hour: '2-digit', minute: '2-digit' })}に取得）`
    : '（天気：取得できず、季節の傾向で表示中）';
}
function acceptWeather(c) {
  if (!c || !Number.isFinite(c.at) || c.at > Date.now() + 60e3 || Date.now() - c.at >= WX_TTL ||
      !Array.isArray(c.data) || c.data.length !== PREFS.length || !c.data.every(validWeatherObs)) return false;
  setLiveWeather(c.data, c.at);
  wxStatus(c.at);
  return true;
}
async function loadWeather() {
  if (wxLoading || Date.now() - wxCheckedAt < 5 * 60e3) return;
  try { if (!WX.raw) acceptWeather(JSON.parse(store(true, WX_KEY) || 'null')); } catch (_) {}
  if (WX.raw && Date.now() - WX.at < 30 * 60e3 && WX.raw.every(validWeatherObs)) { wxStatus(WX.at); return; }
  wxLoading = true;
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 6000);
  try {
    const res = await fetch(WX_URL, { signal: ctl.signal });
    if (!res.ok) throw new Error('weather unavailable');
    const json = await res.json();
    const arr = Array.isArray(json) ? json : [json];
    const c = { at: Date.now(), data: arr.map(o => ({
      c: o && o.current ? Object.fromEntries(['temperature_2m', 'precipitation', 'snowfall', 'weather_code', 'wind_gusts_10m'].map(k => [k, o.current[k]])) : null,
      time: o && o.current && typeof o.current.time === 'string' ? Date.parse(o.current.time + '+09:00') : NaN,
      day: o && o.daily && o.daily.time ? o.daily.time[0] : null,
      x: o && o.daily && o.daily.temperature_2m_max ? o.daily.temperature_2m_max[0] : null,
      n: o && o.daily && o.daily.temperature_2m_min ? o.daily.temperature_2m_min[0] : null
    })) };
    if (!acceptWeather(c)) throw new Error('invalid weather');
    store(false, WX_KEY, JSON.stringify(c));
    if (S.mode === 'now' && !S.busy && (!S.current || !S.current.t.rand)) renderNow(jstNow());
  } catch (_) { wxStatus(WX.at); }
  finally { clearTimeout(timer); wxLoading = false; wxCheckedAt = Date.now(); }
}

// ---- 直近の地震（P2P地震情報）----
// 「いまの日本」のときだけ、震度1〜3の揺れがあった県で「揺れに気づいた」場面を出すために使う（表示の欄は増やさない）。
// 取れないとき・大きな地震のあとは何もしない（判定は engine.js の eqOf）
const EQ_URL = 'https://api.p2pquake.net/v2/history?codes=551&limit=30';
let eqLoading = false, eqTried = 0;
// "2026/10/23 08:12:00" のような日本時間の文字列 → 時刻（ミリ秒）
function jstMs(x) {
  const m = /^(\d{4})\/(\d{1,2})\/(\d{1,2}) (\d{1,2}):(\d{2})(?::(\d{2}))?/.exec(String(x || ''));
  return m ? Date.UTC(+m[1], m[2] - 1, +m[3], m[4] - 9, +m[5], +(m[6] || 0)) : null;
}
async function loadQuakes() {
  if (eqLoading || Date.now() - eqTried < 2 * 60e3) return;
  eqLoading = true; eqTried = Date.now();
  try {
    const ctl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timer = setTimeout(() => ctl && ctl.abort(), 5000);
    const res = await fetch(EQ_URL, ctl ? { signal: ctl.signal } : {});
    clearTimeout(timer);
    if (!res.ok) return;
    const arr = await res.json();
    if (!Array.isArray(arr)) return;
    const list = [];
    arr.forEach(o => {
      if (!o || o.code !== 551 || !o.earthquake) return;
      const t = jstMs(o.earthquake.time);
      if (!t) return;
      const pts = {};
      (o.points || []).forEach(p => { if (p && typeof p.pref === 'string' && p.scale > 0) pts[p.pref] = Math.max(pts[p.pref] || 0, p.scale); });
      list.push({ t, max: o.earthquake.maxScale > 0 ? o.earthquake.maxScale : 0, pts });
    });
    setQuakes(list, Date.now());
  } catch (e) {
    // 通信できないときは、地震の場面を出さないだけ
  } finally { eqLoading = false; }
}

// ---- いまの日本 ----
const STATES = [
  ['sleep', '眠っている', 'var(--c-sleep)'],
  ['work', '仕事中', 'var(--c-work)'],
  ['school', '学校・園にいる', 'var(--c-school)'],
  ['commute', '通勤・通学中', 'var(--c-move)'],
  ['off', '家や街で起きている', 'var(--c-off)']
];
// 起きて家や街にいる人の内訳
const OFF_PARTS = [['eat', '食事中'], ['house', '家事中'], ['fun', '趣味・娯楽中'], ['study', '勉強中'], ['rest', '入浴・休憩中'], ['out', '外出中']]
  .map(([k, l], i) => [k, l, `var(--c-off${i + 1})`]);
let nowRenderRequest = 0;
async function renderNow(t) {
  const request = ++nowRenderRequest;
  const s = await snapshotCached(t, 3000);
  if (!s || request !== nowRenderRequest) return;
  $('#now-title').textContent = t.rand ? `${fmtWhen(t)}の日本` : `${fmtClock(t)}の日本`;
  const main = STATES.filter(([k]) => k !== 'off');
  const parts = OFF_PARTS.map(([k, l, c]) => [l, s.off * s.offBy[k], c]);
  const segs = main.map(([k, , c]) => [s[k], c]).concat(parts.map(([, v, c]) => [v, c]));
  $('#stack').innerHTML = segs.map(([v, c]) => `<span style="flex:0 0 ${(v * 100).toFixed(2)}%;background:${c}"></span>`).join('');
  const ppl = v => {
    const man = Math.round(v * POP_JP);
    return man >= 1 ? `約${man >= 10000 ? (man / 10000).toFixed(1) + '億' : man.toLocaleString('ja-JP') + '万'}人` : '1万人未満';
  };
  const item = (l, v, c) => `<li><span class="sw" style="background:${c}"></span><span>${l}　<b>${Math.round(v * 100)}%</b></span><span class="ppl">${ppl(v)}</span></li>`;
  $('#legend').innerHTML = main.map(([k, l, c]) => item(l, s[k], c)).concat(parts.map(([l, v, c]) => item(l, v, c))).join('');
}

// ---- 通知書 ----
function setField(id, html) { $(id).innerHTML = html; }
function issuedText(P) { return `発行日時　${fmtWhen(P.t)}`; }
function setIssued(P) { $('#issued').innerHTML = `発行日時　<span class="d">${esc(fmtWhen(P.t))}</span>`; }
function sitHTML(P, text) {
  return `<span><span class="when">${fmtClock(P.t)}。</span>${esc(text)}</span>`;
}
function renderCardFinal(P) {
  document.dispatchEvent(new CustomEvent('irekawari:result', { detail: P }));
  setLayout('single');
  setField('#f-place', placeHTML(P));
  setField('#f-name', nameHTML(P));
  setField('#f-sex', SEX_JA[P.sex]);
  setField('#f-age', ageText(P));
  $('#f-jobkey').textContent = P.occ.kindLabel === '所属' ? '所属' : '職業';
  setField('#f-job', esc(P.occ.label));
  setField('#f-height', heightHTML(P));
  setField('#f-weight', weightHTML(P));
  setField('#f-hobby', esc(profileHobbyLabel(P)));
  setField('#f-family', esc(profileFamilyLabel(P)));
  setField('#f-health', healthHTML(P));
  setField('#f-sit', sitHTML(P, P.sit.text + '。'));
  $('#opening').innerHTML = openingHTML(P);
  $('#serial').textContent = String(P.serial).padStart(6, '0');
  setIssued(P);
  const r = $('#rarity');
  r.innerHTML = `めずらしさ <span class="stars">${stars(P.stars)}</span>`;
  r.hidden = false;
  $('#copy').disabled = false;
  lightPref(PREFS.indexOf(P.pref));
  mapCaption(P);
}
// ---- 誰かと誰かを入れ替える ----
const STATE_SHORT = { sleep: '睡眠中', work: '仕事中', school: '学校・園', commute: '移動中', off: 'プライベート' };
const nowLabel = P => (P.sit.stateLabel.length <= 10 ? P.sit.stateLabel : STATE_SHORT[P.sit.state]);
const PP_ROWS = id => `
  <div class="row"><dt>場所</dt><dd id="${id}-place"></dd></div>
  <div class="row name"><dt>氏名</dt><dd id="${id}-name"></dd></div>
  <div class="row"><dt>年齢</dt><dd id="${id}-age"></dd></div>
  <div class="row"><dt>体格</dt><dd id="${id}-body"></dd></div>
  <div class="row"><dt id="${id}-jobkey">職業</dt><dd id="${id}-job"></dd></div>
  <div class="row"><dt>趣味</dt><dd id="${id}-hobby"></dd></div>
  <div class="row" hidden><dt>家族構成</dt><dd id="${id}-family"></dd></div>
  <div class="row"><dt>健康</dt><dd id="${id}-health"></dd></div>
  <div class="row sit"><dt>状況</dt><dd id="${id}-sit"></dd></div>`;
function setLayout(kind) {
  const pair = kind === 'pair';
  $('#single').hidden = pair;
  $('#pair').hidden = !pair;
  $('#after').hidden = true;
  $('#notice-title').textContent = pair ? '入れ替わりのお知らせ' : '入れ替わり先のお知らせ';
}
function blankPair(text) {
  ['pa', 'pb'].forEach(id => {
    ['place', 'name', 'job', 'hobby', 'family', 'health', 'sit'].forEach(f => setField(`#${id}-${f}`, `<span class="blank">${text}</span>`));
    setField(`#${id}-age`, '<span class="blank">—</span>');
    setField(`#${id}-body`, '<span class="blank">—</span>');
  });
}
function fillPerson(id, P) {
  setField(`#${id}-place`, placeHTML(P));
  setField(`#${id}-name`, nameHTML(P));
  setField(`#${id}-age`, `${P.age}歳・${SEX_JA[P.sex]}`);
  $(`#${id}-jobkey`).textContent = P.occ.kindLabel === '所属' ? '所属' : '職業';
  setField(`#${id}-job`, esc(P.occ.label));
  setField(`#${id}-body`, bodyHTML(P));
  setField(`#${id}-hobby`, esc(profileHobbyLabel(P)));
  setField(`#${id}-family`, esc(profileFamilyLabel(P)));
  setField(`#${id}-health`, healthHTML(P));
  setField(`#${id}-sit`, sitHTML(P, P.sit.text + '。'));
}
function pairOpeningHTML(R) {
  return `<strong>${esc(R.A.place)}</strong>の<span class="who">${esc(fullName(R.A))}</span>さんと、<strong>${esc(R.B.place)}</strong>の<span class="who">${esc(fullName(R.B))}</span>さんが入れ替わりました。`;
}
function gapHTML(R) {
  const g = R.gap;
  const items = [
    `年齢差 <b>${g.age}歳</b>`,
    `距離 <b>${esc(distText(R))}</b>`,
    `性別 <b>${g.sexDiff ? 'ちがう' : '同じ'}</b>`
  ];
  return items.map(x => `<li>${x}</li>`).join('');
}
function renderPairFinal(R) {
  document.dispatchEvent(new CustomEvent('irekawari:result', { detail: R }));
  setLayout('pair');
  fillPerson('pa', R.A);
  fillPerson('pb', R.B);
  $('#opening').innerHTML = pairOpeningHTML(R);
  $('#after').hidden = false;
  $('#gap').innerHTML = gapHTML(R);
  $('#serial').textContent = String(R.serial).padStart(6, '0');
  setIssued(R);
  const r = $('#rarity');
  r.innerHTML = `ギャップ <span class="stars">${stars(R.gap.stars)}</span>`;
  r.hidden = false;
  $('#copy').disabled = false;
  lightPref(PREFS.indexOf(R.A.pref), PREFS.indexOf(R.B.pref));
  mapCaption(R);
}
const renderAny = R => (R.kind === 'pair' ? renderPairFinal(R) : renderCardFinal(R));

function stampIt(animate) {
  const st = $('#stamp');
  st.hidden = false;
  st.classList.remove('pressed');
  if (animate) { void st.offsetWidth; st.classList.add('pressed'); }
}

// ---- 抽選の内訳 ----
function renderDraws(P) {
  const ol = $('#draws');
  ol.classList.remove('empty');
  const groups = P.kind === 'pair' ? [['1人目', P.A], ['2人目', P.B]] : [[null, P]];
  ol.innerHTML = groups.map(([h, X]) => (h ? `<li class="dh">${h}　${esc(fullName(X))}さん</li>` : '') + X.draws.filter(d => d.key !== '家族構成').map(d => {
    const w = d.fixed ? 1 : Math.max(.02, Math.min(1, (Math.log10(d.p) + 5) / 5));
    // 体重の「（BMI …）」は小さく薄く
    const v = esc(d.value).replace(/（BMI.*）$/, m => `<span class="vs">${m}</span>`);
    return `<li><span class="k">${esc(d.key)}</span><span class="v">${v}</span><span class="p">${d.fixed ? '指定' : fmtP(d.p)}</span>
      <span class="bar" aria-hidden="true"><span style="width:${(w * 100).toFixed(1)}%"></span></span><span class="n">${esc(d.note)}</span></li>`;
  }).join('')).join('');
}

// ---- 同じ瞬間の人たち ----
function renderCrowd() {
  const ul = $('#crowd');
  const pairMode = S.crowd[0] && S.crowd[0].kind === 'pair';
  $('#crowd-title').textContent = pairMode ? '同じ瞬間に入れ替わったほかの2組' : '同じ瞬間に入れ替わった人たち';
  const shown = i => S.current === S.crowd[i] || (S.crowd[i]._pair && S.current === S.crowd[i]._pair);
  const cur = i => (shown(i) ? ' aria-current="true"' : '');
  const tag = i => (shown(i) ? '<span class="showing">通知書に表示中</span>' : '');
  if (pairMode) {
    ul.innerHTML = S.crowd.map((R, i) => `<li><button type="button" data-i="${i}"${cur(i)}>${tag(i)}
      <span class="who pairline fit">${esc(fullName(R.A))}<span class="meta">（${R.A.age}歳 ${SEX_JA[R.A.sex]}）</span><span class="arw" aria-label="と">⇄</span>${esc(fullName(R.B))}<span class="meta">（${R.B.age}歳 ${SEX_JA[R.B.sex]}）</span></span>
      <span class="meta fit">${esc(R.A.place)} ⇄ ${esc(R.B.place)}</span>
      <span class="doing"><span class="mk ma" aria-hidden="true"></span>${esc(R.A.surname.k)}さんは、${esc(R.A.sit.text)}。</span>
      <span class="doing"><span class="mk mb" aria-hidden="true"></span>${esc(R.B.surname.k)}さんは、${esc(R.B.sit.text)}。</span></button></li>`).join('');
  } else {
    ul.innerHTML = S.crowd.map((P, i) => `<li><button type="button" data-i="${i}"${cur(i)}>${tag(i)}
      <span class="who">${esc(fullName(P))}<span class="meta">（${P.age}歳 ${SEX_JA[P.sex]}）</span></span>
      <span class="meta">${esc(P.place)}　${esc(P.occ.label)}</span>
      <span class="doing">${esc(P.sit.text)}。</span></button></li>`).join('');
  }
  fitLines(ul);
}
// 1行に収まるよう、はみ出す行だけ文字を少しずつ小さくする
function fitLines(root) {
  root.querySelectorAll('.fit').forEach(el => {
    el.style.fontSize = '';
    let fs = parseFloat(getComputedStyle(el).fontSize);
    const min = fs * .66;
    while (el.scrollWidth > el.clientWidth + 1 && fs > min) {
      fs -= .5;
      el.style.fontSize = fs + 'px';
    }
  });
}

// ---- 履歴 ----
// 履歴に通知書の中身を保存・復元する（都道府県などは番号や名前に置き換えて小さくする）
function packP(P) {
  const { pref, muni, occ, given, _pair, ...rest } = P;
  return { ...rest, pi: PREFS.indexOf(pref), mn: muni.n, given: { k: given.k, r: given.r, p: given.p }, occ: { ...occ, job: undefined, jn: occ.job ? occ.job.n : null } };
}
function unpackP(o) {
  const pref = PREFS[o.pi];
  const muni = pref.munis.find(m => m.n === o.mn) || { n: o.mn, pop: 0 };
  const job = o.occ.jn ? JOB_OBJS.find(j => j.n === o.occ.jn) || null : null;
  const { pi, mn, ...rest } = o;
  return { ...rest, pref, muni, occ: { ...o.occ, job } };
}
function packResult(R) {
  if (R.kind === 'pair') return { kind: 'pair', A: packP(R.A), B: packP(R.B), t: R.t, gap: R.gap, serial: R.serial };
  return packP(R);
}
function unpackResult(o) {
  if (o.kind === 'pair') return { kind: 'pair', A: unpackP(o.A), B: unpackP(o.B), t: o.t, gap: o.gap, serial: o.serial };
  return unpackP(o);
}
function renderHistory() {
  const ol = $('#hist');
  $('#clear').hidden = !S.history.length;
  if (!S.history.length) {
    ol.innerHTML = '<li><span class="no">—</span><span class="line">まだ記録はありません。記録はこのブラウザの中だけに残ります。</span></li>';
    return;
  }
  const curN = S.current && !S.current.shared && S.current.serial;
  ol.innerHTML = S.history.map((h, k) => {
    const body = `<span class="no">第${String(h.n).padStart(6, '0')}号</span><span class="line">${h.d && h.n === curN ? '<span class="showing">表示中</span>' : ''}${esc(h.when)}　${
      h.line ? esc(h.line) : `${esc(h.place)}の${esc(h.name)}さん（${h.age}歳）・${esc(h.job)}`}</span>`;
    return h.d
      ? `<li><button type="button" class="hrow" data-k="${k}"${h.n === curN ? ' aria-current="true"' : ''}>${body}</button></li>`
      : `<li><div class="hrow">${body}</div></li>`;
  }).join('');
}
function pushHistory(P) {
  let d = null;
  try { d = packResult(P); } catch (e) { d = null; }
  S.live.set(P.serial, P);
  if (P.kind === 'pair') S.history.unshift({ n: P.serial, when: fmtWhen(P.t), d, line: `${P.A.place}の${fullName(P.A)}さん（${P.A.age}歳 ${SEX_JA[P.A.sex]}）⇄ ${P.B.place}の${fullName(P.B)}さん（${P.B.age}歳 ${SEX_JA[P.B.sex]}）` });
  else S.history.unshift({ n: P.serial, when: fmtWhen(P.t), d, place: P.place, name: fullName(P), age: P.age, job: P.occ.label });
  S.history = S.history.slice(0, 30);
  saveStore();
  renderHistory();
}

// ---- 演出 ----
function later(ms, tk) {
  return new Promise((res, rej) => {
    const id = setTimeout(() => (tk === S.token ? res() : rej(new Error('skip'))), ms);
    S.timers.push(id);
  });
}
async function roll(sel, gen, ms, tk) {
  const el = $(sel);
  const end = performance.now() + ms;
  while (performance.now() < end) {
    el.innerHTML = gen();
    await later(55, tk);
  }
}
const randPick = arr => arr[Math.floor(Math.random() * arr.length)];
const SN_KEYS = Object.keys(SN);
async function rollMap(P, ms, tk) {
  const end = performance.now() + ms;
  let step = 50;
  while (performance.now() < end) {
    const r = pickW(PREFS, p => p.pop);
    lightPref(PREFS.indexOf(r.v));
    $('#mapcap').innerHTML = `<b>${r.v.n}</b>`;
    await later(step, tk);
    step = Math.min(160, step * 1.12);
  }
  lightPref(PREFS.indexOf(P.pref));
  mapCaption(P);
}
async function typeOut(P, tk) {
  const full = P.sit.text + '。';
  const el = $('#f-sit');
  for (let i = 1; i <= full.length; i += 2) {
    el.innerHTML = sitHTML(P, full.slice(0, i));
    await later(28, tk);
  }
  el.innerHTML = sitHTML(P, full);
}
function clearCard() {
  setLayout('single');
  ['#f-place', '#f-name', '#f-job', '#f-hobby', '#f-family', '#f-health', '#f-sit'].forEach(id => setField(id, '<span class="blank">記入中…</span>'));
  ['#f-sex', '#f-age', '#f-height', '#f-weight'].forEach(id => setField(id, '<span class="blank">—</span>'));
  $('#stamp').hidden = true;
  $('#rarity').hidden = true;
  $('#copy').disabled = true;
  document.dispatchEvent(new CustomEvent('irekawari:clear'));
  $('#copyfallback').hidden = true;
  $('#toast').textContent = '';
}
function finish(P, animateStamp) {
  S.timers.forEach(clearTimeout);
  S.timers = [];
  renderAny(P);
  renderHistory();
  stampIt(animateStamp);
  renderDraws(P);
  renderCrowd();
  setBusy(false);
}
function setBusy(b) {
  S.busy = b;
  const go = $('#go');
  go.dataset.busy = b ? '1' : '0';
  const pair = F.pair;
  $('#go-label').innerHTML = b ? 'とばす' : pair ? (S.plays ? '次の<br>二人へ' : '入れ<br>替える') : (S.plays ? '次の<br>誰かへ' : '入れ<br>替わる');
  go.setAttribute('aria-label', b ? '演出をとばす' : pair ? '2人を入れ替える' : '入れ替わる');
}

async function swap() {
  if (S.busy) { // 演出をとばす
    S.token++;
    finish(S.current, true);
    return;
  }
  loadQuakes();   // 次の回のために、直近の地震を取り直しておく（待たない）
  if (F.pair) return swapPair();
  const t = S.mode === 'now' ? jstNow() : randomTime();
  S.count++;
  const P = generate(t, false, F);
  P.serial = S.count;
  S.current = P;
  S.crowd = Array.from({ length: 4 }, () => generate(t));
  S.plays++;
  pushHistory(P);
  renderNow(t);
  if (reduceMotion) { finish(P, false); scrollToNotice(); return; }

  setBusy(true);
  const tk = ++S.token;
  const k = S.plays > 1 ? .6 : 1;
  try {
    clearCard();
    $('#serial').textContent = String(P.serial).padStart(6, '0');
    setIssued(P);
    $('#opening').textContent = '日本のどこかの誰かを探しています…';
    await rollMap(P, 1000 * k, tk);
    scrollToNotice();
    await roll('#f-place', () => { const p = randPick(PREFS); return esc(p.n + randPick(p.munis).n); }, 520 * k, tk);
    setField('#f-place', placeHTML(P));
    await roll('#f-sex', () => randPick(['男性', '女性']), 220 * k, tk);
    setField('#f-sex', SEX_JA[P.sex]);
    await roll('#f-age', () => Math.floor(Math.random() * 100) + '歳', 300 * k, tk);
    setField('#f-age', ageText(P));
    await roll('#f-name', () => esc(randPick(SN_KEYS) + ' ' + randPick(randPick(ERAS)[P.sex]).k), 620 * k, tk);
    setField('#f-name', nameHTML(P));
    $('#opening').innerHTML = openingHTML(P);
    $('#f-jobkey').textContent = P.occ.kindLabel === '所属' ? '所属' : '職業';
    await roll('#f-job', () => esc(randPick(JOB_OBJS).n), 480 * k, tk);
    setField('#f-job', esc(P.occ.label));
    await roll('#f-height', () => (140 + Math.random() * 45).toFixed(1) + 'cm', 220 * k, tk);
    setField('#f-height', heightHTML(P));
    setField('#f-weight', weightHTML(P));
    setField('#f-hobby', esc(profileHobbyLabel(P)));
  setField('#f-family', esc(profileFamilyLabel(P)));
  setField('#f-health', healthHTML(P));
    await typeOut(P, tk);
    finish(P, true);
  } catch (e) { /* とばした */ }
}
async function rollMap2(R, ms, tk) {
  const end = performance.now() + ms;
  let step = 50;
  while (performance.now() < end) {
    const a = pickW(PREFS, p => p.pop).v, b = pickW(PREFS, p => p.pop).v;
    lightPref(PREFS.indexOf(a), PREFS.indexOf(b));
    $('#mapcap').innerHTML = `<b>${a.n}</b> ⇄ <b class="b2">${b.n}</b>`;
    await later(step, tk);
    step = Math.min(160, step * 1.12);
  }
  lightPref(PREFS.indexOf(R.A.pref), PREFS.indexOf(R.B.pref));
  mapCaption(R);
}
async function typeHTML(sel, plain, finalHTML, tk) {
  const el = $(sel);
  for (let i = 1; i <= plain.length; i += 3) {
    el.textContent = plain.slice(0, i);
    await later(22, tk);
  }
  el.innerHTML = finalHTML;
}
async function swapPair() {
  const t = S.mode === 'now' ? jstNow() : randomTime();
  S.count++;
  const R = generatePair(t, F);
  R.serial = S.count;
  S.current = R;
  S.crowd = [generatePair(t, null), generatePair(t, null)];
  S.plays++;
  pushHistory(R);
  renderNow(t);
  if (reduceMotion) { finish(R, false); scrollToNotice(); return; }

  setBusy(true);
  const tk = ++S.token;
  const k = S.plays > 1 ? .6 : 1;
  try {
    clearCard();
    setLayout('pair');
    blankPair('記入中…');
    $('#serial').textContent = String(R.serial).padStart(6, '0');
    setIssued(R);
    $('#opening').textContent = '日本のどこかの2人を探しています…';
    await rollMap2(R, 1100 * k, tk);
    scrollToNotice();
    for (const [id, P] of [['pa', R.A], ['pb', R.B]]) {
      await roll(`#${id}-place`, () => { const p = randPick(PREFS); return esc(p.n + randPick(p.munis).n); }, 380 * k, tk);
      setField(`#${id}-place`, placeHTML(P));
      await roll(`#${id}-name`, () => esc(randPick(SN_KEYS) + ' ' + randPick(randPick(ERAS)[P.sex]).k), 460 * k, tk);
      setField(`#${id}-name`, nameHTML(P));
      setField(`#${id}-age`, `${P.age}歳・${SEX_JA[P.sex]}`);
      $(`#${id}-jobkey`).textContent = P.occ.kindLabel === '所属' ? '所属' : '職業';
      await roll(`#${id}-job`, () => esc(randPick(JOB_OBJS).n), 300 * k, tk);
      setField(`#${id}-job`, esc(P.occ.label));
      setField(`#${id}-body`, bodyHTML(P));
      setField(`#${id}-hobby`, esc(profileHobbyLabel(P)));
  setField(`#${id}-family`, esc(profileFamilyLabel(P)));
  setField(`#${id}-health`, healthHTML(P));
      const full = P.sit.text + '。';
      for (let i = 1; i <= full.length; i += 3) {
        setField(`#${id}-sit`, sitHTML(P, full.slice(0, i)));
        await later(22, tk);
      }
      setField(`#${id}-sit`, sitHTML(P, full));
    }
    $('#opening').innerHTML = pairOpeningHTML(R);
    finish(R, true);
  } catch (e) { /* とばした */ }
}
function scrollToNotice(instant) {
  const n = $('#notice');
  const r = n.getBoundingClientRect();
  if (r.top > window.innerHeight * .55 || r.top < 0) {
    const behavior = instant || reduceMotion ? 'auto' : 'smooth';
    n.scrollIntoView({ behavior, block: 'start' });
    if (instant) { // スクロールが効かない環境向けの予備
      const top = n.getBoundingClientRect().top + window.scrollY - 12;
      if (Math.abs(n.getBoundingClientRect().top) > 40) window.scrollTo(0, top);
    }
  }
}

function showPerson(P) {
  if (S.busy) { S.token++; S.timers.forEach(clearTimeout); S.timers = []; setBusy(false); }
  if (!P.serial) { S.count++; P.serial = S.count; pushHistory(P); }
  S.current = P;
  renderAny(P);
  stampIt(!reduceMotion);
  renderDraws(P);
  renderCrowd();
  renderHistory();
  scrollToNotice(true);
  const n = $('#notice');
  n.classList.remove('flash');
  if (!reduceMotion) { void n.offsetWidth; n.classList.add('flash'); }
}

// ---- コピー ----
function resultText(P) {
  if (P.kind === 'pair') {
    const g = P.gap;
    return `【集団入れ替わりシミュレーター β版】\n${P.A.place}の${fullName(P.A)}さん（${P.A.age}歳・${P.A.occ.label}）と、${P.B.place}の${fullName(P.B)}さん（${P.B.age}歳・${P.B.occ.label}）が入れ替わりました。\n${P.A.surname.k}さんの趣味：${profileHobbyLabel(P.A)}\n${P.B.surname.k}さんの趣味：${profileHobbyLabel(P.B)}\n状況（${fmtClock(P.t)}）\n・${P.A.surname.k}さんは、${P.A.sit.text}。\n・${P.B.surname.k}さんは、${P.B.sit.text}。\nギャップ：${'★'.repeat(g.stars)}${'☆'.repeat(5 - g.stars)}（年齢差${g.age}歳・${distText(P)}）` + (window.SHARE_SUFFIX ? window.SHARE_SUFFIX(P) : '');
  }
  return `【集団入れ替わりシミュレーター β版】\nあなたは、${P.place}${P.wxText ? `（${P.wxText}）` : ''}${P.prison ? `の${P.prison.n}` : ''}にいる${SEX_JA[P.sex]}、${fullName(P)}さん（${P.age}歳）と入れ替わりました。\n${P.occ.kindLabel === '所属' ? '所属' : '職業'}：${P.occ.label}${P.body ? `\n身長・体重：${f1(P.body.h)}cm・${f1(P.body.w)}kg（${bmiText(P)}）` : ''}${P.health ? `\n健康：${P.health.text}` : ''}\n趣味：${profileHobbyLabel(P)}\n状況：${fmtClock(P.t)}。${P.sit.text}。\nめずらしさ：${'★'.repeat(P.stars)}${'☆'.repeat(5 - P.stars)}` + (window.SHARE_SUFFIX ? window.SHARE_SUFFIX(P) : '');
}
function copyResult() {
  const P = S.current;
  if (!P) return;
  const text = resultText(P);
  const fallback = () => {
    $('#copyfallback').hidden = false;
    const ta = $('#copytext');
    ta.value = text;
    ta.focus();
    ta.select();
    $('#toast').textContent = '下の枠から選んでコピーしてください';
  };
  try {
    navigator.clipboard.writeText(text).then(() => { $('#toast').textContent = 'コピーしました'; }, fallback);
  } catch (e) { fallback(); }
}

function setMode(m) {
  S.mode = m;
  $('#mode-now').setAttribute('aria-pressed', String(m === 'now'));
  $('#mode-rand').setAttribute('aria-pressed', String(m === 'rand'));
  $('#hint').textContent = m === 'now'
    ? '「いまの日本」では、日本時間の現在時刻にその人が何をしているかまで決まります。'
    : '曜日と時刻もくじで決めます。真夜中の誰かや、日曜の昼下がりの誰かに入れ替わるかもしれません。';
}

// ---- 詳細設定 ----
const F = { pref: null, tokyoWard: null, sex: null, dec: null, pair: false, real: false };
const OPTIONS_KEY = 'irekawari-options-v1';
function loadOptions() {
  try {
    const saved = JSON.parse(store(true, OPTIONS_KEY) || 'null');
    if (!saved || saved.version !== 1 || !saved.options || typeof saved.options !== 'object') return;
    const o = saved.options;
    F.pref = Number.isInteger(o.pref) && o.pref >= 0 && o.pref < PREFS.length ? o.pref : null;
    F.tokyoWard = F.pref != null && PREFS[F.pref].n === '東京都' &&
      (o.tokyoWard === '23' || TOKYO_WARDS.some(w => w.code === o.tokyoWard)) ? o.tokyoWard : null;
    F.sex = ['m', 'f'].includes(o.sex) ? o.sex : null;
    const decs = Array.isArray(o.dec) ? [...new Set(o.dec.filter(d => Number.isInteger(d) && d >= 0 && d <= 9))].sort((a, b) => a - b) : [];
    F.dec = decs.length && decs.length < 10 ? decs : null;
    F.pair = o.pair === true;
    F.real = o.real === true;
  } catch (e) { /* 壊れた保存データは初期値のまま起動する */ }
}
function saveOptions() {
  const result = store(false, OPTIONS_KEY, JSON.stringify({ version: 1, options: F }));
  $('#opt-save-status').textContent = result === null
    ? 'このブラウザでは設定を保存できません。今回の設定はそのまま使えます。'
    : '条件を保存しました。次回もこの設定で開きます。';
}
function resetOptions() {
  Object.assign(F, { pref: null, tokyoWard: null, sex: null, dec: null, pair: false, real: false });
  try { localStorage.removeItem(OPTIONS_KEY); return true; }
  catch (e) { return false; }
}
const decLabel = d => d === 9 ? '90代以上' : `${d * 10}代`;
function chipHTML(opts, cur) {
  return opts.map(([v, l]) => `<button type="button" data-v="${v}" aria-pressed="${String(String(cur ?? '') === String(v))}">${l}</button>`).join('');
}
// 年代は複数選べる（F.dec は選んだ年代の配列。何も選ばなければ null）
function decChipHTML() {
  const sel = new Set(F.dec || []);
  return `<button type="button" data-v="" aria-pressed="${String(!sel.size)}">指定なし</button>` +
    [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(d => `<button type="button" data-v="${d}" aria-pressed="${String(sel.has(d))}">${decLabel(d)}</button>`).join('');
}
// 選んだ年代の表示（続いている年代は「10〜30代」のようにまとめる）
function decSummary(decs) {
  const ds = [...decs].sort((x, y) => x - y), runs = [];
  ds.forEach(d => { const r = runs[runs.length - 1]; if (r && r[1] === d - 1) r[1] = d; else runs.push([d, d]); });
  return runs.map(([s, e]) => s === e ? decLabel(s) : e === 9 ? `${s * 10}代以上` : `${s * 10}〜${e * 10}代`).join('・');
}
function renderOpts() {
  $('#opt-sex').innerHTML = chipHTML([['', '指定なし'], ['m', '男性'], ['f', '女性']], F.sex);
  $('#opt-age').innerHTML = decChipHTML();
  const tokyo = F.pref != null && PREFS[F.pref].n === '東京都';
  if (!tokyo) F.tokyoWard = null;
  const individualWard = tokyo && F.tokyoWard != null;
  const prefValue = F.pref == null ? '' : individualWard ? 'tokyo-wards' : String(F.pref);
  $('#opt-pref-val').textContent = F.pref == null ? '指定なし' : tokyo ? (individualWard ? '23区個別' : '東京都全域') : PREFS[F.pref].n;
  document.querySelectorAll('#pref-list [role="option"]').forEach(li => li.setAttribute('aria-selected', String(li.dataset.v === prefValue)));
  $('#opt-tokyo-ward').hidden = !individualWard;
  $('#opt-tokyo-ward-val').textContent = F.tokyoWard && F.tokyoWard !== '23' ? TOKYO_WARDS.find(m => m.code === F.tokyoWard).n : '23区内（区指定なし）';
  document.querySelectorAll('#ward-list [role="option"]').forEach(li => li.setAttribute('aria-selected', String(li.dataset.v === (F.tokyoWard || ''))));
  if (!individualWard) { $('#ward-list').hidden = true; $('#opt-tokyo-ward-select').setAttribute('aria-expanded', 'false'); }
  const parts = [];
  if (F.pair && !F.real) parts.push('2人を入れ替え');
  if (F.pref != null) parts.push(PREFS[F.pref].n + (F.tokyoWard === '23' ? '23区内' : F.tokyoWard ? TOKYO_WARDS.find(m => m.code === F.tokyoWard).n : tokyo ? '全域' : ''));
  if (F.sex) parts.push(SEX_JA[F.sex]);
  if (F.dec) parts.push(decSummary(F.dec));
  const realLabel = F.real ? (F.pair ? '本当に入れ替える' : '本当に入れ替わる') : '';
  const summary = parts.join('・') + (parts.length && realLabel ? ' ' : '') + realLabel;
  $('#opts-cur').textContent = summary ? `（${summary}）` : '';
  $('#opt-save-status').textContent = '「保存」を押すと、次回もこの設定で開きます。';
}
function buildOpts() {
  $('#opt-pair').setAttribute('aria-checked', String(F.pair));
  $('#opt-real').setAttribute('aria-checked', String(F.real));
  const REGIONS = [['北海道・東北', 0, 7], ['関東', 7, 14], ['中部', 14, 23], ['近畿', 23, 30], ['中国', 30, 35], ['四国', 35, 39], ['九州・沖縄', 39, 47]];
  $('#pref-list').innerHTML = '<li role="option" id="po-x" data-v="">指定なし</li>' + REGIONS.map(([rn, a, z]) =>
    `<li class="grp" role="presentation">${rn}</li>` + PREFS.slice(a, z).map((p, j) => `<li role="option" id="po-${a + j}" data-v="${a + j}">${p.n === '東京都' ? '東京都全域' : p.n}</li>` + (p.n === '東京都' ? '<li role="option" id="po-tokyo-wards" data-v="tokyo-wards">23区個別</li>' : '')).join('')).join('');
  $('#ward-list').innerHTML = '<li role="option" id="wo-23" data-v="23">23区内（区指定なし）</li>' + TOKYO_WARDS.map(m => `<li role="option" id="wo-${m.code}" data-v="${m.code}">${m.n}</li>`).join('');
  initLocationDropdown('#dd-tokyo-ward', '#opt-tokyo-ward-select', '#ward-list', li => { F.tokyoWard = li.dataset.v || null; });
  initPrefDropdown();
  $('#opt-sex').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; F.sex = b.dataset.v || null; renderOpts(); });
  $('#opt-age').addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.v === '') F.dec = null;
    else {
      const d = +b.dataset.v, sel = new Set(F.dec || []);
      if (sel.has(d)) sel.delete(d); else sel.add(d);
      F.dec = sel.size && sel.size < 10 ? [...sel].sort((x, y) => x - y) : null;   // 全部選んだら指定なしと同じ
    }
    renderOpts();
  });
  $('#opt-save').addEventListener('click', saveOptions);
  const applyPair = () => {
    F.pair = $('#opt-pair').getAttribute('aria-checked') === 'true';
    $('#real-name').textContent = F.pair ? '本当に入れ替える' : '本当に入れ替わる';
    renderOpts();
    if (!S.busy) setBusy(false);
    if (!S.current) { // まだ遊んでいなければ、空の通知書を切り替える
      setLayout(F.pair ? 'pair' : 'single');
      if (F.pair) blankPair('未記入');
      $('#opening').textContent = F.pair ? '印のボタンを押すと、ここに入れ替わる2人が記入されます。' : '印のボタンを押すと、ここに入れ替わり先が記入されます。';
    }
  };
  $('#opt-pair').addEventListener('click', e => {
    const sw = e.currentTarget;
    sw.setAttribute('aria-checked', String(sw.getAttribute('aria-checked') !== 'true'));
    applyPair();
  });
  $('#opt-reset').addEventListener('click', () => {
    const cleared = resetOptions();
    $('#opt-pair').setAttribute('aria-checked', 'false');
    $('#opt-real').setAttribute('aria-checked', 'false');
    applyPair();
    $('#opt-save-status').textContent = cleared
      ? '条件と保存済みの設定をクリアしました。'
      : '条件をリセットしましたが、保存済みの設定を削除できませんでした。';
  });
  applyPair();
  $('#opt-real').addEventListener('click', toggleReal);
  renderOpts();
}
// 都道府県と区で同じ見た目・操作のドロップダウンを使う。
function initPrefDropdown() {
  initLocationDropdown('#dd-pref', '#opt-pref', '#pref-list', li => {
    if (li.dataset.v === 'tokyo-wards') {
      F.pref = PREFS.findIndex(p => p.n === '東京都');
      F.tokyoWard = F.tokyoWard || '23';
    } else {
      F.pref = li.dataset.v === '' ? null : +li.dataset.v;
      F.tokyoWard = null;
    }
  });
}
function initLocationDropdown(root, button, menu, onChoose) {
  const btn = $(button), list = $(menu);
  const opts = () => [...list.querySelectorAll('[role="option"]')];
  let act = -1;
  const setAct = i => {
    const o = opts();
    act = Math.max(0, Math.min(o.length - 1, i));
    o.forEach((li, k) => li.classList.toggle('act', k === act));
    list.setAttribute('aria-activedescendant', o[act].id);
    o[act].scrollIntoView({ block: 'nearest' });
  };
  const open = () => {
    document.querySelectorAll('.dd-btn[aria-expanded="true"]').forEach(other => {
      if (other === btn) return;
      other.setAttribute('aria-expanded', 'false');
      document.getElementById(other.getAttribute('aria-controls')).hidden = true;
    });
    list.hidden = false;
    btn.setAttribute('aria-expanded', 'true');
    const o = opts();
    const sel = o.findIndex(li => li.getAttribute('aria-selected') === 'true');
    setAct(sel < 0 ? 0 : sel);
    const sl = o[act];
    list.scrollTop = Math.max(0, sl.offsetTop - list.clientHeight / 2 + sl.offsetHeight / 2);
    list.focus({ preventScroll: true });
    const r = list.getBoundingClientRect();
    if (r.bottom > window.innerHeight) window.scrollBy({ top: r.bottom - window.innerHeight + 16, behavior: reduceMotion ? 'auto' : 'smooth' });
  };
  const close = (refocus) => {
    if (list.hidden) return;
    list.hidden = true;
    btn.setAttribute('aria-expanded', 'false');
    if (refocus) btn.focus();
  };
  const choose = li => {
    onChoose(li);
    renderOpts();
    close(true);
  };
  btn.addEventListener('click', () => (list.hidden ? open() : close(true)));
  list.addEventListener('click', e => { const li = e.target.closest('[role="option"]'); if (li) choose(li); });
  list.addEventListener('keydown', e => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setAct(act + 1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setAct(act - 1); }
    else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); choose(opts()[act]); }
    else if (e.key === 'Escape' || e.key === 'Tab') { close(e.key === 'Escape'); }
  });
  btn.addEventListener('keydown', e => { if (e.key === 'ArrowDown' && list.hidden) { e.preventDefault(); open(); } });
  document.addEventListener('pointerdown', e => { if (!$(root).contains(e.target)) close(false); });
}

// ジョーク機能：本当に入れ替わる（スイッチは形だけ切り替わる。動きは変わらない）
function toggleReal() {
  const sw = $('#opt-real');
  F.real = sw.getAttribute('aria-checked') !== 'true';
  sw.setAttribute('aria-checked', String(F.real));
  renderOpts();
}

// ---- 起動 ----
$('#pa').innerHTML = PP_ROWS('pa');
$('#pb').innerHTML = PP_ROWS('pb');
loadOptions();
buildOpts();
loadStore();
buildMap();
renderHistory();
tick();
setInterval(tick, 15000);
loadWeather();
loadQuakes();
setInterval(loadWeather, 10 * 60e3);
$('#go').addEventListener('click', swap);
$('#mode-now').addEventListener('click', () => setMode('now'));
$('#mode-rand').addEventListener('click', () => setMode('rand'));
$('#copy').addEventListener('click', copyResult);
// 1人モードの一覧は「その人と、ランダムなもう1人」が入れ替わった通知書にする（相手は一度決めたら固定）
function pairFrom(P) {
  if (!P._pair) {
    const B = generate(P.t, false, null);
    P._pair = { kind: 'pair', A: P, B, t: P.t, gap: pairGap(P, B) };
  }
  return P._pair;
}
$('#crowd').addEventListener('click', e => {
  const b = e.target.closest('button[data-i]');
  if (!b) return;
  const item = S.crowd[+b.dataset.i];
  showPerson(item.kind === 'pair' ? item : pairFrom(item));
});
let fitTimer = 0;
window.addEventListener('resize', () => { clearTimeout(fitTimer); fitTimer = setTimeout(() => fitLines($('#crowd')), 120); });
if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => fitLines($('#crowd')));
$('#hist').addEventListener('click', e => {
  const b = e.target.closest('button[data-k]');
  if (!b) return;
  const h = S.history[+b.dataset.k];
  if (!h || !h.d) return;
  let R = S.live.get(h.n);
  if (!R) {
    try { R = unpackResult(h.d); } catch (err) { return; }
    S.live.set(h.n, R);
  }
  showPerson(R);
});
$('#clear').addEventListener('click', () => { S.history = []; saveStore(); renderHistory(); });






