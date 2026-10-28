// ===== 抽選エンジン =====
const rnd = Math.random;

function pickW(arr, wf) {
  let tot = 0;
  const ws = arr.map(x => { const w = Math.max(0, wf(x)); tot += w; return w; });
  if (tot <= 0) return null;
  let r = rnd() * tot;
  for (let i = 0; i < arr.length; i++) { r -= ws[i]; if (r < 0) return { v: arr[i], p: ws[i] / tot }; }
  return { v: arr[arr.length - 1], p: ws[arr.length - 1] / tot };
}
const pickU = arr => arr[Math.floor(rnd() * arr.length)];
function splitKana(tok) {
  const m = tok.match(/^(.*[^ぁ-ゖー])([ぁ-ゖー]+)$/);
  return m ? { k: m[1], r: m[2] } : { k: tok, r: tok };
}
const inWin = (h, s, e) => {
  if (h < 0 || h >= 24) return false;
  if (e - s >= 24) return true;
  if (s < 0 || s >= 24) s = (s % 24 + 24) % 24;
  if (e < 0 || e > 24) e = (e % 24 + 24) % 24;
  return s <= e ? h >= s && h < e : h >= s || h < e;
};

// ---- 都道府県・市区町村 ----
// Source rows: name,type,[male total,female total],male/female single ages,
// male/female occupation counts (17 five-year bands x 11 categories), employment totals.
const CENSUS = REGIONAL_CENSUS;
const CENSUS_CODE_BY_NAME = new Map();
Object.entries(CENSUS).forEach(([code, row]) => CENSUS_CODE_BY_NAME.set(code.slice(0, 2) + '|' + row[0], code));
const CENSUS_CHILDREN = new Map();
Object.entries(CENSUS).forEach(([code, r]) => {
  if (code === '00000') CENSUS_CHILDREN.set(code, Object.keys(CENSUS).filter(c => c !== code && CENSUS[c][1] === 'a'));
  else if (r[1] === 'a') CENSUS_CHILDREN.set(code, Object.keys(CENSUS).filter(c => c.slice(0, 2) === code.slice(0, 2) &&
    ((['1', '2', '3'].includes(CENSUS[c][1]) && c !== '13100') || (c.startsWith('131') && CENSUS[c][1] === '0'))));
  else if (r[1] === '1') CENSUS_CHILDREN.set(code, Object.keys(CENSUS).filter(c => CENSUS[c][1] === '0' && c.slice(0, 2) === code.slice(0, 2) &&
    (code === '13100' ? c.startsWith('131') : CENSUS[c][0].startsWith(r[0]))));
});
const PREFS = PREF_SRC.trim().split('\n').map((line, i) => {
  const [n, , coast, xy] = line.split('|'), code = String(i + 1).padStart(2, '0') + '000';
  const rows = Object.entries(CENSUS).filter(([c, r]) => c.slice(0, 2) === code.slice(0, 2) &&
    ((['1', '2', '3'].includes(r[1]) && c !== '13100') || (c.startsWith('131') && r[1] === '0')));
  const munis = rows.map(([c, r]) => ({ code: c, n: r[0], pop: (r[2][0] + r[2][1]) / 10000,
    w: r[2][0] + r[2][1], town: r[1] === '3' }));
  const [x, y] = xy.split(',').map(Number), pop = (CENSUS[code][2][0] + CENSUS[code][2][1]) / 10000;
  return { n, code, pop, coast: +coast, x, y, munis, wsum: munis.reduce((z, m) => z + m.w, 0) };
});
const PREF_TOTAL = PREFS.reduce((a, p) => a + p.pop, 0);
PREF_LL.split(' ').forEach((s, i) => { PREFS[i].ll = s.split(',').map(Number); PREFS[i].i = i; });
const WARD_LIST = Object.fromEntries(Object.entries(WARDS).map(([k, v]) => [k, v.split(',')]));

function urbOf(pref, muni) {
  if (WARD_LIST[muni.n] || (pref.n === '東京都' && /区$/.test(muni.n))) return 'metro';
  if (muni.pop >= 30) return 'city';
  if (muni.pop >= 10) return 'mid';
  return 'rural';
}

// ---- 刑務所 ----
const PRISONS = PRISON_SRC.trim().split('\n').map(l => {
  const [n, pref, city, cap, sx] = l.split('|');
  return { n, pref, city, cap: +cap, sx };
});
// 服役中の人の収容先：男女で入れる施設から、定員の規模に比例して選ぶ。同じ地方（矯正管区）を出やすくする
function pickPrison(P, prefFixed) {
  const home = P.pref.n, region = KYOSEI_REGION[home];
  let cands = PRISONS.filter(x => x.sx.includes(P.sex));
  if (prefFixed) {
    const same = cands.filter(x => x.pref === home);
    if (same.length) cands = same;
  }
  const r = pickW(cands, x => x.cap * (KYOSEI_REGION[x.pref] === region ? 6 : 1));
  return { prison: r.v, p: r.p };
}

// ---- 名字 ----
const SN = {};
SURNAMES.trim().split(/\s+/).forEach(tok => {
  const m = tok.match(/^(.+?)([ぁ-ゖー]+)([\d.]+)$/);
  if (m) SN[m[1]] = { k: m[1], r: m[2], c: +m[3] };
});
const SN_ALL = Object.values(SN);
const OKI = new Set(PREF_SURNAMES['沖縄県'].split(',').filter(s => s !== '上原'));
const SN_TABLE = {};
function surnameTable(prefN) {
  if (SN_TABLE[prefN]) return SN_TABLE[prefN];
  const isOki = prefN === '沖縄県';
  const local = PREF_SURNAMES[prefN].split(',');
  const localShare = isOki ? .8 : .35;
  const natW = s => s.c * (!isOki && OKI.has(s.k) ? .3 : 1);
  const natZ = SN_ALL.reduce((a, s) => a + natW(s), 0);
  const rankZ = local.reduce((a, _, i) => a + (local.length - i), 0);
  const w = new Map(SN_ALL.map(s => [s.k, (1 - localShare) * natW(s) / natZ]));
  local.forEach((k, i) => w.set(k, (w.get(k) || 0) + localShare * (local.length - i) / rankZ));
  // その地域ならではの名字（全国的にはありふれていないもの）が少なければ、一定の割合まで引き上げる
  const distinct = (PREF_RARE[prefN] || '').split(',').filter(k => SN[k] && SN[k].c < 40);
  const target = Math.min(.2, .035 * distinct.length);
  const cur = distinct.reduce((a, k) => a + w.get(k), 0);
  if (cur < target) {
    const rareW = k => Math.sqrt(SN[k].c) + .4;
    const rareZ = distinct.reduce((a, k) => a + rareW(k), 0);
    const scale = (1 - target) / (1 - cur);
    const dset = new Set(distinct);
    w.forEach((v, k) => { if (!dset.has(k)) w.set(k, v * scale); });
    const extra = target - cur;
    distinct.forEach(k => w.set(k, w.get(k) + extra * rareW(k) / rareZ));
  }
  return (SN_TABLE[prefN] = { list: SN_ALL, w });
}
function pickSurname(prefN) {
  const T = surnameTable(prefN);
  const r = pickW(T.list, s => T.w.get(s.k));
  return { ...r.v, p: r.p };
}

// ---- 名前 ----
const ERAS = NAME_ERAS.map((e, i) => ({
  from: i === 0 ? null : NAME_ERAS[i - 1].to + 1, to: e.to, cov: e.cov,
  m: e.m.split(' ').map(splitKana), f: e.f.split(' ').map(splitKana)
}));
function eraOf(by) { return ERAS.find(e => by <= e.to) || ERAS[ERAS.length - 1]; }
function pickGiven(by, sex) {
  const era = eraOf(by);
  const list = era[sex];
  const r = pickW(list.map((x, i) => ({ ...x, i })), x => 1 / Math.pow(x.i + 1, .7));
  return { k: r.v.k, r: r.v.r, p: r.p, era };
}
function eraLabel(era) {
  if (era.from == null) return `${era.to}年以前`;
  if (era.to > 2090) return `${era.from}年以降`;
  return `${era.from}〜${era.to}年`;
}

// ---- 年齢・性別 ----
const CENSUS_AGE_CACHE = new Map(), CENSUS_MASS_CACHE = new Map();
// Unknown ages are redistributed within the same region/sex in proportion to known ages.
// Census 100+ is split with the existing capped geometric tail; its exact ages are modeled.
function censusAgeCells(code) {
  if (CENSUS_AGE_CACHE.has(code)) return CENSUS_AGE_CACHE.get(code);
  const r = CENSUS[code] || CENSUS['00000'], cells = [];
  const children = CENSUS_CHILDREN.get(code);
  if (children && children.length) {
    const grouped = new Map();
    children.forEach(c => censusAgeCells(c).forEach(v => { const k = v.sex + v.age; const old = grouped.get(k); if (old) old.w += v.w; else grouped.set(k, { ...v }); }));
    const sum = [...grouped.values()]; CENSUS_AGE_CACHE.set(code, sum); return sum;
  }
  ['m', 'f'].forEach((sex, sx) => {
    let raw = r[3 + sx], sum = raw.reduce((a, b) => a + b, 0);
    if (!sum && r[2][sx]) { raw = CENSUS['00000'][3 + sx]; sum = raw.reduce((a, b) => a + b, 0); }
    const scale = sum ? r[2][sx] / sum : 0;
    raw.forEach((n, age) => {
      if (age < 100) cells.push({ sex, age, g: Math.floor(age / 5), w: n * scale });
      else { const q = Math.exp(-1 / 1.8); for (let k = 0; k < 10; k++) cells.push({ sex, age: 100 + k, g: 20, w: n * scale * Math.pow(q, k) * (k === 9 ? 1 : 1 - q) }); }
    });
  });
  CENSUS_AGE_CACHE.set(code, cells); return cells;
}
function ageFilterKey(f) { return (f && f.sex || '') + '|' + (f && f.dec != null ? [].concat(f.dec).slice().sort().join(',') : ''); }
function ageCellOK(c, f) {
  const ds = f && f.dec != null ? [].concat(f.dec) : [];
  return (!f || !f.sex || c.sex === f.sex) && (!ds.length || ds.some(d => d === 9 ? c.age >= 90 : Math.floor(c.age / 10) === d));
}
function censusMass(code, f) {
  const key = code + '|' + ageFilterKey(f);
  if (!CENSUS_MASS_CACHE.has(key)) CENSUS_MASS_CACHE.set(key, censusAgeCells(code).reduce((a, c) => a + (ageCellOK(c, f) ? c.w : 0), 0));
  return CENSUS_MASS_CACHE.get(key);
}
const AGE_CELLS = censusAgeCells('00000');
const AGE_TOTAL = AGE_CELLS.reduce((a, c) => a + c.w, 0);
// Compatibility helper for inspection tools: no heuristic urban or three-band multiplier.
function ageWeights(pref) { return censusAgeCells(pref.code || String(pref.i + 1).padStart(2, '0') + '000').map(c => c.w); }
function pickSexAge(f, pref, urb, code) {
  const cells = censusAgeCells(code || pref && (pref.code || String(pref.i + 1).padStart(2, '0') + '000') || '00000');
  const r = pickW(cells, c => ageCellOK(c, f) ? c.w : 0);
  return { sex: r.v.sex, age: r.v.age, p: r.p };
}
function censusCodeOf(P) {
  if (P.censusCode && CENSUS[P.censusCode]) return P.censusCode;
  const pc = P.pref.code || String(P.pref.i + 1).padStart(2, '0') + '000';
  return CENSUS_CODE_BY_NAME.get(pc.slice(0, 2) + '|' + P.muni.n + (P.ward || '')) ||
    CENSUS_CODE_BY_NAME.get(pc.slice(0, 2) + '|' + P.muni.n) || pc;
}
function pickResidentWard(pref, muni, f) {
  const wards = WARD_LIST[muni.n];
  if (!wards) return { ward: null, code: muni.code, p: 1, exact: true };
  const codes = wards.map(w => CENSUS_CODE_BY_NAME.get(pref.code.slice(0, 2) + '|' + muni.n + w));
  // Hamamatsu's 2024 ward boundaries cannot be reconstructed exactly from ward totals in 2020.
  // Keep the current ward names and use the whole city's age/job distribution for all its wards.
  const exact = codes.every(Boolean), r = pickW(wards, (w) => exact ? censusMass(codes[wards.indexOf(w)], f) : 1);
  return { ward: r.v, code: exact ? codes[wards.indexOf(r.v)] : muni.code, p: r.p, exact };
}
const CENSUS_JOB_CACHE = new Map();
const JOB_PRIOR_COUNT = 100; // 100 classified workers of parent-area prior per sex/age band.
function censusJobShares(code, sex, band) {
  const key = code + '|' + sex + '|' + band;
  if (CENSUS_JOB_CACHE.has(key)) return CENSUS_JOB_CACHE.get(key);
  const row = CENSUS[code], sx = sex === 'm' ? 0 : 1, raw = row[5 + sx][band], n = raw.reduce((a, b) => a + b, 0);
  let parent;
  if (code === '00000') parent = CAT_SHARE[sex][band === 0 ? 'y' : band >= 10 ? 'o' : 'p'];
  else if (row[1] === 'a') parent = censusJobShares('00000', sex, band);
  else {
    const cityCode = row[1] === '0' && !code.startsWith('131') ? CENSUS_CODE_BY_NAME.get(code.slice(0, 2) + '|' + row[0].replace(/[^市]+区$/, '')) : null;
    parent = censusJobShares(cityCode || code.slice(0, 2) + '000', sex, band);
  }
  const ps = parent.reduce((a, b) => a + b, 0), prior = code === '00000' && n ? 0 : JOB_PRIOR_COUNT;
  const shares = raw.map((v, i) => (v + prior * parent[i] / ps) / (n + prior || 1));
  CENSUS_JOB_CACHE.set(key, shares); return shares;
}
function regionalJobShares(P) { return censusJobShares(censusCodeOf(P), P.sex, Math.max(0, Math.min(16, Math.floor(P.age / 5) - 3))); }

// Regional employment correction: keep the existing non-student progression model,
// but apply the census region/nation employment-rate ratio for the same sex/age band.
// This does not claim exact all-resident employment totals (students with part-time jobs are separate).
const CENSUS_EMP_CACHE = new Map();
function censusEmploymentRate(code, sex, band) {
  const key = code + '|' + sex + '|' + band;
  if (CENSUS_EMP_CACHE.has(key)) return CENSUS_EMP_CACHE.get(key);
  const r = CENSUS[code], sx = sex === 'm' ? 0 : 1, from = 15 + band * 5, until = band === 16 ? 110 : from + 5;
  const pop = censusAgeCells(code).reduce((n, c) => n + (c.sex === sex && c.age >= from && c.age < until ? c.w : 0), 0);
  const total = r[7 + sx][band];
  let parent = code === '00000' ? (pop ? total / pop : 0) : censusEmploymentRate(code.slice(2) === '000' ? '00000' : code.slice(0, 2) + '000', sex, band);
  const rate = code === '00000' ? parent : (total + 200 * parent) / (pop + 200);
  CENSUS_EMP_CACHE.set(key, Math.max(0, Math.min(1, rate))); return CENSUS_EMP_CACHE.get(key);
}
function regionalEmploymentRate(P) {
  const band = Math.max(0, Math.min(16, Math.floor(P.age / 5) - 3)), base = lookup(EMP[P.sex], P.age);
  const national = censusEmploymentRate('00000', P.sex, band), local = censusEmploymentRate(censusCodeOf(P), P.sex, band);
  return Math.max(0, Math.min(.995, national ? base * local / national : base));
}

function birthOf(age, t) {
  const end = Date.UTC(t.y - age, t.mo - 1, t.d);
  const start = Date.UTC(t.y - age - 1, t.mo - 1, t.d) + 864e5;
  const days = Math.round((end - start) / 864e5);
  const d = new Date(start + Math.floor(rnd() * (days + 1)) * 864e5);
  return { y: d.getUTCFullYear(), mo: d.getUTCMonth() + 1, d: d.getUTCDate() };
}
function gradeIndex(b, t) {
  const C = (b.mo > 4 || (b.mo === 4 && b.d >= 2)) ? b.y : b.y - 1;
  const F = t.mo >= 4 ? t.y : t.y - 1;
  return F - C - 6;
}

// ---- 職業 ----
// 服役中の割合（年代の上限, 確率）
const PRISON_RATE = {
  m: [[29, .00083], [39, .00088], [49, .00083], [59, .00074], [69, .00051], [200, .00025]],
  f: [[29, .000087], [39, .00009], [49, .000084], [59, .000074], [69, .00005], [200, .00003]]
};
const JOB_OBJS = JOBS.map(([n, cat, m, f, tag, o]) => ({ n, cat, m, f, tag, o: o || {} }));
const EMP = { // 就業率（学生を除く・概算）
  m: [[19, .80], [24, .84], [29, .89], [54, .925], [59, .91], [64, .84], [69, .62], [74, .42], [79, .22], [84, .12], [200, .04]],
  f: [[19, .78], [24, .84], [29, .84], [34, .79], [39, .78], [54, .80], [59, .75], [64, .63], [69, .43], [74, .27], [79, .12], [84, .06], [200, .02]]
};
const NONREG = {
  m: [[24, .45], [34, .14], [54, .09], [59, .11], [64, .45], [200, .68]],
  f: [[24, .45], [34, .35], [44, .48], [54, .55], [64, .62], [200, .80]]
};
const lookup = (tbl, a) => tbl.find(([lim]) => a <= lim)[1];

// 東京23区の追加集計は常住地・同性・5歳階級で参照する。
// 小分類は抽出集計のため、東京都の100人分を混ぜ、倍率を1/4〜4倍に制限。
const TOKYO_FINE_MAJOR = ['B','C','D','E','H','K','J','I','A','F','G'];
const TOKYO_FINE_INDEX = new Map(TOKYO_CENSUS_DETAIL.groups.flatMap((g, i) => g.jobs.map(n => [n, i])));
const TOKYO_DETAIL_CACHE = new Map();
const detailBand = a => Math.max(0, Math.min(16, Math.floor(a / 5) - 3));
const tokyoDetailCode = P => { const c = censusCodeOf(P); return /^131(0[1-9]|1[0-9]|2[0-3])$/.test(c) ? c : null; };
function tokyoDetailRate(kind, code, sex, band, column) {
  const key = [kind,code,sex,band,column].join('|');
  if (TOKYO_DETAIL_CACHE.has(key)) return TOKYO_DETAIL_CACHE.get(key);
  const row = TOKYO_CENSUS_DETAIL[kind][code][sex === 'm' ? 0 : 1][band];
  const parent = code === '00000' ? (row[0] ? row[column] / row[0] : 0)
    : tokyoDetailRate(kind, code === '13000' ? '00000' : '13000', sex, band, column);
  const rate = code === '00000' ? parent : (row[column] + 200 * parent) / (row[0] + 200);
  const value = Math.max(0, Math.min(1, rate)); TOKYO_DETAIL_CACHE.set(key,value); return value;
}
function tokyoFineShare(code, sex, band, group) {
  const key = ['fine',code,sex,band,group].join('|');
  if (TOKYO_DETAIL_CACHE.has(key)) return TOKYO_DETAIL_CACHE.get(key);
  const row = TOKYO_CENSUS_DETAIL.fine[code][sex === 'm' ? 0 : 1][band];
  const major = TOKYO_FINE_MAJOR.indexOf(TOKYO_CENSUS_DETAIL.groups[group].major);
  const parent = code === '00000' ? (row[major] ? row[11 + group] / row[major] : 0)
    : tokyoFineShare(code === '13000' ? '00000' : '13000', sex, band, group);
  const value = Math.max(0,Math.min(1,code === '00000' ? parent : (row[11 + group] + 100 * parent) / (row[major] + 100)));
  TOKYO_DETAIL_CACHE.set(key,value); return value;
}
const boundedDetailFactor = x => Math.max(.25, Math.min(4, x));
function tokyoJobFactor(P, job) {
  const code = tokyoDetailCode(P); if (!code) return 1;
  const band = detailBand(P.age);
  if (job.n === '会社役員') {
    const national = tokyoDetailRate('status','00000',P.sex,band,1);
    const local = tokyoDetailRate('status',code,P.sex,band,1);
    // 大分類「管理職」の地域差は既に反映済み。二重に上乗せしない。
    const natMajor = censusJobShares('00000',P.sex,band)[8], localMajor = censusJobShares(code,P.sex,band)[8];
    return national && localMajor ? boundedDetailFactor(local / national * natMajor / localMajor) : 1;
  }
  const group = TOKYO_FINE_INDEX.get(job.n); if (group == null) return 1;
  const national = tokyoFineShare('00000',P.sex,band,group);
  return national ? boundedDetailFactor(tokyoFineShare(code,P.sex,band,group) / national) : 1;
}
function adjustDetailOdds(base, local, national) {
  if (base <= 0 || base >= 1) return base;
  const odds = p => Math.max(.001,Math.min(.999,p)) / (1 - Math.max(.001,Math.min(.999,p)));
  const factor = boundedDetailFactor(odds(local) / odds(national));
  return base * factor / (1 - base + base * factor);
}
function tokyoSelfProbability(P, base) {
  const code=tokyoDetailCode(P);if (!code) return base;
  const band=detailBand(P.age);
  return adjustDetailOdds(base,tokyoDetailRate('status',code,P.sex,band,2),tokyoDetailRate('status','00000',P.sex,band,2));
}
function tokyoStudentOptions(P, opts) {
  const code=tokyoDetailCode(P); if (!code) return opts;
  const school = o => o[0] !== 'ronin';
  const base=opts.filter(school).reduce((s,o)=>s+o[1],0);if (!base) return opts;
  const band=detailBand(P.age), adjusted=adjustDetailOdds(base,tokyoDetailRate('education',code,P.sex,band,1),tokyoDetailRate('education','00000',P.sex,band,1));
  const other=opts.filter(o=>!school(o)).reduce((s,o)=>s+o[1],0), target=Math.min(1-other,adjusted);
  return opts.map(o=>[o[0],o[1]*(school(o)?target/base:1)]);
}

function nonregForm(sex, a) {
  let opts;
  if (a < 25) opts = [['アルバイト', .8], ['契約社員', .1], ['派遣社員', .1]];
  else if (a >= 60) opts = sex === 'm' ? [['嘱託社員', .35], ['パート', .3], ['アルバイト', .35]] : [['パート', .7], ['アルバイト', .2], ['嘱託社員', .1]];
  else if (sex === 'f') opts = [['パート', .65], ['契約社員', .12], ['派遣社員', .08], ['アルバイト', .15]];
  else opts = [['契約社員', .35], ['アルバイト', .3], ['派遣社員', .2], ['パート', .15]];
  const r = pickW(opts, o => o[1]);
  return { form: r.v[0], p: r.p };
}

function pickJob(P) {
  const { sex, age: a } = P;
  let pp = 1;
  const nonreg = rnd() < lookup(NONREG[sex], a);
  pp *= nonreg ? lookup(NONREG[sex], a) : 1 - lookup(NONREG[sex], a);
  let form = '正社員';
  if (nonreg) { const f = nonregForm(sex, a); form = f.form; pp *= f.p; }
  const band = a < 25 ? 'y' : a >= 65 ? 'o' : 'p';
  const share = regionalJobShares(P); // Same resident area/sex/five-year age band as the population draw.
  const jobW = j => {
    let w = j[sex];
    if (!w) return 0;
    if (j.o.amin && a < j.o.amin) return 0;
    if (j.o.amax != null && a > j.o.amax) return 0;
    if (j.o.ageW) w *= lookup(j.o.ageW, a);
    if (a >= 65 && j.o.old != null) w *= j.o.old;
    if (a < 25 && j.o.yng != null) w *= j.o.yng;
    if (a >= 45 && a < 65 && j.o.mid != null) w *= j.o.mid;
    if (nonreg) w *= (j.o.nr != null ? j.o.nr : 1);
    if (j.o.sea) w *= P.pref.coast ? (P.urb === 'rural' ? 2 : 1) : 0;
    return w * tokyoJobFactor(P,j);
  };
  const catW = CATS.map((c, i) => {
    const sum = JOB_OBJS.filter(j => j.cat === c).reduce((s, j) => s + jobW(j), 0);
    return sum > 0 ? share[i] : 0;
  });
  const cr = pickW(CATS.map((c, i) => i), i => catW[i]);
  const cat = CATS[cr.v];
  pp *= cr.p;
  const jr = pickW(JOB_OBJS.filter(j => j.cat === cat), jobW);
  const job = jr.v;
  pp *= jr.p;
  let kind = nonreg ? 'nonreg' : 'reg';
  if (job.o.self) {
    const selfP = tokyoSelfProbability(P,job.o.self);
    if (rnd() < selfP) { pp *= selfP; kind = 'self'; form = /翻訳|動画|漫画|デザイナー|配信|Tuber/.test(job.n) ? 'フリーランス' : '自営業'; }
    else pp *= 1 - selfP;
  }
  if (job.tag === 'stream' && kind === 'nonreg') form = '契約';
  if (job.o.pub) form = kind === 'reg' ? (job.o.pub === '国家' ? '国家公務員' : '地方公務員') : '非常勤';
  if (job.cat === '管理' && kind === 'reg') form = '';
  if (/住職/.test(job.n)) form = '';
  const name = (job.o.labels && job.o.labels[sex]) || job.n;
  const label = form ? `${name}（${form}）` : name;
  return { label, group: 'adult', job, tag: job.tag, form, kind, cat, p: pp };
}

function occupation(P, t) {
  const { age: a, sex } = P;
  const g = P.g;
  const classAge = Math.max(0, g + 5);
  let pp = 1;
  const br = (p) => { const ok = rnd() < p; pp *= ok ? p : 1 - p; return ok; };

  // 乳幼児
  if (g <= -3) {
    const rate = classAge === 0 ? (a === 0 ? .17 : .3) : classAge === 1 ? .55 : .6;
    const nur = br(rate);
    const label = nur ? `保育園の${classAge}歳児クラス` : (a === 0 ? '乳児（家で過ごしている）' : '幼児（家で過ごしている）');
    return { label, group: 'baby', nur, en: nur ? 'hoiku' : null, kindLabel: '所属', p: pp, cat: 'child' };
  }
  if (g <= 0) {
    const r = pickW([['保育園', .40], ['幼稚園', .38], ['認定こども園', .20], ['', .02]], o => o[1]);
    pp *= r.p;
    const cls = ['年少', '年中', '年長'][classAge - 3];
    const label = r.v[0] ? `${r.v[0]}の${cls}さん` : `${cls}の年齢（家で過ごしている）`;
    return { label, group: 'kid', nur: !!r.v[0], en: r.v[0] === '幼稚園' ? 'yochi' : r.v[0] ? 'hoiku' : null, kindLabel: '所属', p: pp, cat: 'child' };
  }
  if (g <= 6) return { label: `小学${g}年生`, group: 'kid', school: 'elem', kindLabel: '所属', p: 1, cat: 'student' };
  if (g <= 9) {
    const priv = br(.075);
    return { label: `${priv ? '私立' : ''}中学${g - 6}年生`, group: 'student', school: 'teen', kindLabel: '所属', p: pp, cat: 'student' };
  }
  if (g <= 12) {
    const n = g - 9;
    const r = pickW([['高校', .885], ['通信制', .08], ['高専', .01], ['支援', .015], ['out', .01]], o => o[1]);
    pp *= r.p;
    const k = r.v[0];
    if (k !== 'out') {
      const label = { 高校: `高校${n}年生`, 通信制: `通信制高校の${n}年生`, 高専: `高専の${n}年生`, 支援: `特別支援学校 高等部${n}年生` }[k];
      return { label, group: 'student', school: 'teen', tsushin: k === '通信制', kindLabel: '所属', p: pp, cat: 'student' };
    }
  }
  // 刑務所で服役中（矯正統計 2023年：受刑者 約3.5万人、女性 約9%、新受刑者の年齢構成から算出）
  if (a >= 20) {
    const pr = PRISON_RATE[sex].find(([lim]) => a <= lim)[1];
    if (br(pr)) return { label: '受刑者（刑務所で服役中）', group: 'prison', kindLabel: '職業', p: pp, cat: 'prison' };
  }
  // 高校卒業後の進路（学年indexで判定）
  if (g >= 13 && g <= 21) {
    const y = g - 12;
    const univ = sex === 'm' ? [0, .60, .60, .58, .55, .07, .03, 0, 0, 0] : [0, .55, .55, .53, .51, .05, .02, 0, 0, 0];
    const tan = sex === 'f' ? [0, .065, .06] : [0, .01, .01];
    const sen = [0, .22, .18, .04];
    const grad = sex === 'm' ? [0, 0, 0, 0, 0, .10, .09, .02, .02, .015] : [0, 0, 0, 0, 0, .045, .04, .01, .01, .008];
    const opts = [];
    if (univ[y]) opts.push(['univ', univ[y]]);
    if (tan[y]) opts.push(['tan', tan[y]]);
    if (sen[y]) opts.push(['sen', sen[y]]);
    if (grad[y]) opts.push(['grad', grad[y]]);
    if (y === 1) opts.push(['ronin', .035]);
    const adjustedOpts = tokyoStudentOptions(P,opts);
    opts.splice(0,opts.length,...adjustedOpts);
    const sum = opts.reduce((s, o) => s + o[1], 0);
    opts.push(['none', Math.max(0, 1 - sum)]);
    const r = pickW(opts, o => o[1]);
    pp *= r.p;
    const k = r.v[0];
    if (k === 'univ') return { label: y <= 4 ? `大学${y}年生` : `大学4年生（${y === 5 ? '2回目' : '3回目'}）`, group: 'college', yr: Math.min(4, y), kindLabel: '所属', p: pp, cat: 'student' };
    if (k === 'tan') return { label: `短期大学の${y}年生`, group: 'college', yr: y, kindLabel: '所属', p: pp, cat: 'student' };
    if (k === 'sen') return { label: `専門学校の${y}年生`, group: 'college', yr: y, senmon: true, kindLabel: '所属', p: pp, cat: 'student' };
    if (k === 'grad') return { label: y <= 6 ? `大学院の修士${y - 4}年生` : `大学院の博士課程${y - 6}年生`, group: 'college', yr: 4, grad: true, kindLabel: '所属', p: pp, cat: 'student' };
    if (k === 'ronin') return { label: '浪人生（予備校に通っている）', group: 'student', ronin: true, kindLabel: '所属', p: pp, cat: 'student' };
  }

  // 高齢者の施設入居
  if (a >= 65) {
    const fr = a < 75 ? .005 : a < 80 ? .02 : a < 85 ? .045 : a < 90 ? .10 : a < 95 ? .20 : .35;
    if (br(fr)) {
      const r = pickW([['特別養護老人ホーム', .45], ['介護老人保健施設', .15], ['有料老人ホーム', .25], ['グループホーム', .15]], o => o[1]);
      pp *= r.p;
      return { label: `なし（${r.v[0]}で暮らしている）`, group: 'facility', p: pp, cat: 'facility' };
    }
  }
  // 働いているか
  const emp = regionalEmploymentRate(P);
  if (br(emp)) {
    const j = pickJob(P);
    j.p *= pp;
    return j;
  }
  // 働いていない
  let opts;
  if (a >= 65) opts = sex === 'm' ? [['無職（年金生活）', 'senior', .94], ['無職（療養中）', 'rest', .06]] : [['主婦（年金生活）', 'senior', .6], ['無職（年金生活）', 'senior', .34], ['無職（療養中）', 'rest', .06]];
  else if (sex === 'f') opts = [['専業主婦', 'homemaker', a < 25 ? .15 : a < 35 ? .6 : .75], ['無職（求職中）', 'jobless', .12], ['無職（療養中）', 'rest', .06], ['家事手伝い', 'homemaker', a < 30 ? .1 : .03], ['無職（資格の勉強中）', 'jobless', a < 35 ? .06 : .02]];
  else opts = [['無職（求職中）', 'jobless', .4], ['無職（療養中）', 'rest', .2], ['専業主夫', 'homemaker', a >= 28 ? .03 : .005], ['家事手伝い', 'homemaker', .1], ['無職（資格の勉強中）', 'jobless', a < 35 ? .12 : .04], ['無職', 'jobless', .12]];
  const r = pickW(opts, o => o[2]);
  pp *= r.p;
  return { label: r.v[0], group: r.v[1], p: pp, cat: 'none' };
}

// ---- 暦（祝日・年末年始・お盆・学校の長期休み・季節）----
const HOL_CACHE = {};
function holidaysOf(y) {
  if (HOL_CACHE[y]) return HOL_CACHE[y];
  const base = new Map();
  const nthMon = (m, n) => { const w = new Date(Date.UTC(y, m - 1, 1)).getUTCDay(); return 1 + ((8 - w) % 7) + 7 * (n - 1); };
  const add = (m, d, n) => base.set(m * 100 + d, n);
  const k = y - 1980;
  add(1, 1, '元日'); add(1, nthMon(1, 2), '成人の日'); add(2, 11, '建国記念の日'); add(2, 23, '天皇誕生日');
  add(3, Math.floor(20.8431 + 0.242194 * k - Math.floor(k / 4)), '春分の日');
  add(4, 29, '昭和の日'); add(5, 3, '憲法記念日'); add(5, 4, 'みどりの日'); add(5, 5, 'こどもの日');
  add(7, nthMon(7, 3), '海の日'); add(8, 11, '山の日'); add(9, nthMon(9, 3), '敬老の日');
  add(9, Math.floor(23.2488 + 0.242194 * k - Math.floor(k / 4)), '秋分の日');
  add(10, nthMon(10, 2), 'スポーツの日'); add(11, 3, '文化の日'); add(11, 23, '勤労感謝の日');
  const H = new Map(base);
  const keyOf = dt => (dt.getUTCMonth() + 1) * 100 + dt.getUTCDate();
  const day = (m, d) => new Date(Date.UTC(y, m - 1, d));
  // 振替休日：日曜の祝日のあと、最初の祝日でない日
  base.forEach((n, key) => {
    const dt = day(Math.floor(key / 100), key % 100);
    if (dt.getUTCDay() !== 0) return;
    const nx = new Date(dt);
    do { nx.setUTCDate(nx.getUTCDate() + 1); } while (H.has(keyOf(nx)));
    if (nx.getUTCFullYear() === y) H.set(keyOf(nx), '振替休日');
  });
  // 国民の休日：祝日に挟まれた平日
  for (let dt = day(1, 2); dt.getUTCFullYear() === y; dt.setUTCDate(dt.getUTCDate() + 1)) {
    const key = keyOf(dt);
    if (H.has(key) || dt.getUTCDay() === 0) continue;
    const pv = new Date(dt); pv.setUTCDate(pv.getUTCDate() - 1);
    const nx = new Date(dt); nx.setUTCDate(nx.getUTCDate() + 1);
    if (base.has(keyOf(pv)) && base.has(keyOf(nx))) H.set(key, '国民の休日');
  }
  return (HOL_CACHE[y] = H);
}
const holName = t => holidaysOf(t.y).get(t.mo * 100 + t.d) || null;
const md = (t) => t.mo * 100 + t.d;
function inMD(t, r) {
  const v = md(t), a = r[0] * 100 + r[1], b = r[2] * 100 + r[3];
  return a <= b ? (v >= a && v <= b) : (v >= a || v <= b);
}
const isBreak = t => inMD(t, [12, 29, 1, 3]);           // 年末年始
const isObon = t => inMD(t, [8, 13, 8, 16]);
const schoolVac = t => inMD(t, [7, 21, 8, 31]) || inMD(t, [12, 25, 1, 7]) || inMD(t, [3, 25, 4, 5]);
const univVac = t => inMD(t, [7, 31, 9, 20]) || inMD(t, [12, 25, 1, 6]) || inMD(t, [2, 10, 3, 31]);
const SNOW_PREFS = new Set(['北海道', '青森県', '岩手県', '秋田県', '山形県', '新潟県', '富山県', '石川県', '福井県', '長野県']);
const seasonOf = mo => (mo >= 3 && mo <= 5 ? 'spring' : mo >= 6 && mo <= 8 ? 'summer' : mo >= 9 && mo <= 11 ? 'autumn' : 'winter');

// 通勤手段の割合（国勢調査の利用交通手段の地域差を参考に丸めた値）
const COMMUTE_MODE = {
  metro: { rail: .62, car: .1, bike: .14, walk: .09, bus: .05 },
  city:  { rail: .3, car: .4, bike: .15, walk: .08, bus: .07 },
  mid:   { rail: .12, car: .66, bike: .11, walk: .07, bus: .04 },
  rural: { rail: .04, car: .84, bike: .05, walk: .05, bus: .02 }
};
// 入浴・シャワー中の割合（起きていて仕事や学校の外にいる人のうち。時刻→確率）
const BATH_H = {
  kid:    { 17: .06, 18: .13, 19: .18, 20: .15, 21: .06 },
  youth:  { 6: .06, 7: .06, 8: .02, 19: .07, 20: .11, 21: .14, 22: .16, 23: .14, 0: .1, 1: .06 },
  adult:  { 6: .03, 7: .04, 8: .02, 17: .03, 18: .06, 19: .11, 20: .14, 21: .15, 22: .14, 23: .1, 0: .07, 1: .03 },
  senior: { 15: .03, 16: .06, 17: .1, 18: .12, 19: .12, 20: .1, 21: .06, 22: .03 }
};
function bathP(P, h) {
  const g = P.age <= 12 ? 'kid' : P.age <= 29 ? 'youth' : P.age <= 64 ? 'adult' : 'senior';
  return BATH_H[g][Math.floor(h) % 24] || 0;
}
// 身じたく（化粧・スキンケア・ひげそりなど）の割合（起きていて仕事や学校の外にいる人のうち）
const GROOM_H = {
  f15: { 6: .07, 7: .12, 8: .09, 9: .05, 20: .03, 21: .05, 22: .07, 23: .06, 0: .03 },
  f70: { 6: .03, 7: .04, 8: .04, 21: .03, 22: .03 },
  f13: { 7: .02, 21: .03, 22: .04 },
  m15: { 6: .03, 7: .04, 8: .02, 22: .02, 23: .02 },
  m50: { 6: .02, 7: .02 }
};
function groomP(P, h, we) {
  const a = P.age;
  const g = P.sex === 'f' ? (a >= 70 ? 'f70' : a >= 15 ? 'f15' : a >= 13 ? 'f13' : null) : (a >= 50 ? 'm50' : a >= 15 ? 'm15' : null);
  if (!g) return 0;
  const hh = Math.floor(h) % 24;
  let p = GROOM_H[g][hh] || 0;
  if (we && hh < 9) p *= .5;                                   // 休日の朝はゆっくり
  if (we && g === 'f15' && hh >= 9 && hh < 11) p = Math.max(p, .05);
  return p;
}
// 晩酌の割合（起きていて仕事や学校の外にいる人のうち）。50〜60代男性を基準に、性別・年代で増減
const DRINK_H = { 16: .01, 17: .02, 18: .06, 19: .11, 20: .13, 21: .12, 22: .09, 23: .05, 0: .02 };
function drinkP(P, h, we) {
  const a = P.age;
  if (a < 20) return 0;
  const k = P.sex === 'm'
    ? (a < 30 ? .35 : a < 40 ? .6 : a < 50 ? .85 : a < 70 ? 1 : a < 80 ? .8 : .45)
    : (a < 40 ? .3 : a < 60 ? .4 : a < 70 ? .25 : .1);
  const hh = Math.floor(h) % 24;
  let p = DRINK_H[hh] || 0;
  if (we) p = hh === 16 ? .03 : hh === 17 ? .06 : p * 1.2;     // 休日は早めから
  return p * k;
}
// 自分の車を運転する場面の出やすさ（地方ほど高い）
const CAR_USE = { metro: .2, city: .55, mid: .85, rural: 1.1 };

// ---- 状況 ----
function sleepP(curve, h, we) {
  const c = SLEEP_CURVE[curve];
  let hh = h;
  if (we && h >= 5 && h < 11) hh = h - 1; // 休日は朝寝坊
  const i = Math.floor(hh), f = hh - i;
  const a = c[(i + 24) % 24], b = c[(i + 25) % 24];
  return a + (b - a) * f;
}
// ---- 天気 ----
// いまの天気（Open-Meteo の県庁所在地の実況）が入っていればそれを使い、
// なければ（取得できない・「ランダムな時刻」）月と地域ごとの気候の傾向から決める。
// 大雨・暴風・大雪など荒れた天気のとき（災害級）は、その県では天気を反映しない。
const WX = { at: 0, byPref: null, raw: null };
const WX_TTL = 90 * 60e3;
const WX_CODES = new Set([0,1,2,3,45,48,51,53,55,56,57,61,63,65,66,67,71,73,75,77,80,81,82,85,86,95,96,99]);
function validWeatherObs(o) {
  const c = o && o.c;
  return !!c && Number.isFinite(c.temperature_2m) && WX_CODES.has(c.weather_code) &&
    ['precipitation', 'snowfall', 'wind_gusts_10m'].every(k => Number.isFinite(c[k]) && c[k] >= 0) &&
    Number.isFinite(o.time) && o.time <= Date.now() + 60e3 && Date.now() - o.time < WX_TTL;
}
function wxFromObs(o) {
  if (!validWeatherObs(o)) return null;
  const c = o.c, code = c.weather_code | 0, pr = c.precipitation || 0, sn = c.snowfall || 0, gust = c.wind_gusts_10m || 0;
  // 降水量・降雪量は直前15分の値（mm・cm）。15分で10mm（1時間40mm相当）以上・最大瞬間風速28m/s以上・15分で1.5cm以上の雪は災害級として扱う
  if (pr >= 10 || gust >= 28 || sn >= 1.5) return { off: true };
  const snow = sn > 0 || (code >= 71 && code <= 77) || code === 85 || code === 86;
  const rain = !snow && (pr >= .1 || (code >= 51 && code <= 67) || (code >= 80 && code <= 82) || code >= 95);
  const sameDay = o.day === new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Tokyo' });
  const tmax = sameDay && Number.isFinite(o.x) ? o.x : c.temperature_2m, tmin = sameDay && Number.isFinite(o.n) ? o.n : c.temperature_2m;
  const windy = gust >= 15;   // 最大瞬間風速15m/s以上（28m/s以上は上で災害級として止める）
  return {
    live: true, rain, snow, windy, storm: windy && (rain || snow), blizzard: windy && snow, gusty: windy && !rain && !snow,
    clear: !rain && !snow && code <= 2,   // 快晴・晴れ
    shower: rain && ((code >= 80 && code <= 82) || code >= 95),
    heavy: rain && (pr >= 2 || code === 65 || code === 82 || code >= 95),
    hot: tmax >= 30, veryhot: tmax >= 35, hotnight: tmin >= 25,
    cold: tmin <= 1 || c.temperature_2m <= 3
  };
}
function setLiveWeather(list, at) {
  WX.at = at || Date.now();
  WX.byPref = Array.isArray(list) && list.length === PREFS.length ? list.map(wxFromObs) : null;
  WX.raw = WX.byPref ? list : null;
}
// 通知書に出す天気（実況は「雨・14℃」、気候の傾向から決めたときは「雨（推定）」）
const WX_WORD = c => c === 0 ? '快晴' : c <= 2 ? '晴れ' : c === 3 ? '曇り' : c === 45 || c === 48 ? '霧' : c <= 57 ? '霧雨' : c === 61 ? '小雨' : c === 63 || c === 66 || c === 67 ? '雨' : c === 65 ? '強い雨' : c === 71 ? '小雪' : c === 73 || c === 77 ? '雪' : c === 75 ? '大雪' : c === 80 || c === 81 ? 'にわか雨' : c === 82 ? '激しいにわか雨' : c === 85 || c === 86 ? 'にわか雪' : c >= 95 ? '雷雨' : '曇り';
// 気温（ゲーム内の値）：東京の月平均を基準に、緯度と季節で補正し、日ごとのぶれと一日の上がり下がりをつける
const TM_TOKYO = [5.4, 6.1, 9.4, 14.3, 18.8, 21.9, 25.7, 26.9, 23.3, 18.0, 12.5, 7.7];
const T_RANGE = [8, 8, 8.5, 8.5, 8, 6.5, 6.5, 7, 6.5, 7, 7.5, 8];
function climateTemp(pref, t, w) {
  const mo = t.mo - 1, winter = (1 + Math.cos(2 * Math.PI * mo / 12)) / 2;
  const mean = TM_TOKYO[mo] - (pref.ll[0] - 35.7) * (.25 + .65 * winter) + (wxHash(pref.i, t, 10) - .5) * 5;
  let tmax = mean + T_RANGE[mo] / 2, tmin = mean - T_RANGE[mo] / 2;
  if (w.rain || w.snow) tmax -= 2;
  if (w.hot) tmax = Math.max(tmax, 30 + 4 * wxHash(pref.i, t, 11));
  if (w.veryhot) tmax = Math.max(tmax, 35 + 2 * wxHash(pref.i, t, 12));
  if (w.hotnight) tmin = Math.max(tmin, 25 + wxHash(pref.i, t, 13));
  if (w.cold) tmin = Math.min(tmin, -1 + 2 * wxHash(pref.i, t, 14));
  if (tmin > tmax - 3) tmin = tmax - 3;
  const h = t.hf != null ? t.hf : t.h;
  // 最低は5時ごろ、最高は14時ごろ
  const v = h >= 5 && h < 14 ? tmin + (tmax - tmin) * (1 - Math.cos(Math.PI * (h - 5) / 9)) / 2
    : tmax - (tmax - tmin) * (1 - Math.cos(Math.PI * ((h < 5 ? h + 24 : h) - 14) / 15)) / 2;
  return w.snow ? Math.min(v, 1) : v;
}
// 通知書の場所に添える天気（例：「晴れ 22度」）。実況がなければ季節と地域の傾向から作ったゲーム内の値
function wxLabel(pref, t) {
  const r = !t.rand && WX.raw && Date.now() - WX.at < WX_TTL ? WX.raw[pref.i] : null;
  if (validWeatherObs(r)) {
    const code = r.c.weather_code | 0;
    let w = WX_WORD(code);
    if ((r.c.precipitation || 0) >= .1 && code < 51) w = '小雨';
    if ((r.c.wind_gusts_10m || 0) >= 15) w += '・強風';
    return `${w} ${Math.round(r.c.temperature_2m)}度`;
  }
  const w = wxClimate(pref, t);
  const word = (w.snow ? (w.windy ? '吹雪' : '雪') : w.heavy ? '強い雨' : w.shower ? 'にわか雨' : w.rain ? '雨' : w.clear ? '晴れ' : '曇り') + (w.windy && !w.snow ? '・強風' : '');
  return `${word} ${Math.round(climateTemp(pref, t, w))}度`;
}
// 気候の傾向（おおよそ）：雨の時間の割合・真夏日・猛暑日・冷え込む日の割合（月別）
const RAIN_P = {
  pac: [.07, .08, .1, .1, .1, .14, .13, .08, .12, .1, .08, .06],
  sea: [.24, .21, .15, .11, .09, .12, .12, .09, .12, .14, .2, .25],
  oki: [.12, .12, .12, .11, .13, .16, .08, .1, .1, .09, .1, .12]
};
const HOT_P = [0, 0, 0, 0, .02, .12, .55, .7, .35, .05, 0, 0];
const VHOT_P = [0, 0, 0, 0, 0, .01, .1, .18, .03, 0, 0, 0];
const COLD_P = [.55, .5, .25, .03, 0, 0, 0, 0, 0, .02, .12, .4];
function wxHash(i, t, k, hourly) {
  let x = (i + 1) * 73856093 ^ t.y * 19349663 ^ t.mo * 83492791 ^ t.d * 2654435761 ^ (hourly ? (Math.floor(t.h / 3) + 1) * 97 : 0) ^ k * 2246822519;
  x = Math.imul(x ^ (x >>> 15), 2246822507); x = Math.imul(x ^ (x >>> 13), 3266489909);
  return ((x ^ (x >>> 16)) >>> 0) / 4294967296;
}
function wxClimate(pref, t) {
  const i = pref.i, mo = t.mo - 1, h = t.h;
  const zone = i === 46 ? 'oki' : SNOW_PREFS.has(pref.n) ? 'sea' : 'pac';
  const north = i <= 6;
  let rain = wxHash(i, t, 1, true) < RAIN_P[zone][mo], snow = false;
  if (rain && [11, 0, 1, 2].includes(mo) && (zone === 'sea' ? wxHash(i, t, 2, true) < (north ? .7 : .45) : zone === 'pac' && mo !== 2 && wxHash(i, t, 2, true) < .05)) { snow = true; rain = false; }
  const hf = zone === 'oki' ? 1.25 : north ? .35 : 1, cf = zone === 'oki' ? 0 : north ? 1.5 : 1;
  const hot = wxHash(i, t, 5) < Math.min(.95, HOT_P[mo] * hf);
  // 風の強い日：夏〜秋の太平洋側・沖縄は台風、冬の日本海側は季節風（雨や雪の日に多い）
  const wet = rain || snow;
  const windP = (mo >= 7 && mo <= 9 && zone !== 'sea') ? (wet ? .3 : .03) : ([11, 0, 1].includes(mo) && zone === 'sea') ? (wet ? .35 : .08) : (wet ? .06 : .02);
  const windy = wxHash(i, t, 11, true) < windP;
  return {
    rain, snow, windy, storm: windy && wet, blizzard: windy && snow, gusty: windy && !wet,
    clear: !wet && wxHash(i, t, 9, true) >= (windy ? .7 : .4),   // 晴れ（通知書の天気の「曇り」と同じ判定）
    shower: rain && mo >= 5 && mo <= 8 && h >= 12 && h < 20 && wxHash(i, t, 3, true) < .45,
    heavy: rain && wxHash(i, t, 4, true) < (mo >= 5 && mo <= 8 ? .2 : .08),
    hot, veryhot: hot && wxHash(i, t, 6) < VHOT_P[mo] / Math.max(.01, HOT_P[mo]) * (zone === 'oki' ? .1 : north ? .15 : 1),
    hotnight: hot && (mo === 6 || mo === 7) && zone !== 'sea' && wxHash(i, t, 7) < .5,
    cold: wxHash(i, t, 8) < Math.min(.95, COLD_P[mo] * cf)
  };
}
function wxOf(pref, t) {
  if (!t.rand && WX.byPref && Date.now() - WX.at < WX_TTL) {
    const w = WX.byPref[pref.i];
    if (w && validWeatherObs(WX.raw && WX.raw[pref.i])) return wxFromObs(WX.raw[pref.i]);
  }
  return wxClimate(pref, t);
}
function wxMatch(w, k) {
  const one = k => k === 'dry' ? !w.rain && !w.snow && !w.off : !!w[k];
  return Array.isArray(k) ? k.some(one) : one(k);
}
// ===== 空・暦の出来事・季節の便り・地震（2026-10-23追加）=====
// 表示の欄は増やさず、状況の文の出し分けに使う。条件のキー：
//   sun（日の出・日の入りから見た明るさ）、moon（月）、ev（暦の出来事）、sakura・koyo（桜・紅葉の時期）、pref（都道府県）、nh（新入社員）、eq（地震の揺れ）

// ---- 日の出・日の入り（県庁所在地の緯度経度と日付から計算。NOAA の簡略式で誤差は数分）----
const SUN_MEMO = new Map();
function sunTimes(pref, t) {
  const key = pref.i * 1e8 + t.y * 1e4 + t.mo * 100 + t.d;
  let v = SUN_MEMO.get(key);
  if (v) return v;
  const [lat, lon] = pref.ll, R = Math.PI / 180;
  const n = (Date.UTC(t.y, t.mo - 1, t.d) - Date.UTC(t.y, 0, 1)) / 864e5;
  const g = 2 * Math.PI / 365 * (n - .375);   // 日本の正午ごろ
  const eqt = 229.18 * (.000075 + .001868 * Math.cos(g) - .032077 * Math.sin(g) - .014615 * Math.cos(2 * g) - .040849 * Math.sin(2 * g));
  const dc = .006918 - .399912 * Math.cos(g) + .070257 * Math.sin(g) - .006758 * Math.cos(2 * g) + .000907 * Math.sin(2 * g) - .002697 * Math.cos(3 * g) + .00148 * Math.sin(3 * g);
  const cosH = Math.cos(90.833 * R) / (Math.cos(lat * R) * Math.cos(dc)) - Math.tan(lat * R) * Math.tan(dc);
  const H = Math.acos(Math.max(-1, Math.min(1, cosH))) / R;
  v = { rise: (720 - 4 * (lon + H) - eqt) / 60 + 9, set: (720 - 4 * (lon - H) - eqt) / 60 + 9 };
  SUN_MEMO.set(key, v);
  return v;
}
// light 日の出〜日の入り、dark 日の出の約25分前より前・日の入りの約25分後より後（薄明が終わって暗い）、
// twam 夜明け（空が白む〜日の出直後）、sunrise 朝日（日の出〜2時間）、sunset 夕日・夕焼け（日の入りの1時間前〜直後）、dusk 日暮れ（日の入り前後〜1時間あまり）
const SUN_RULE = {
  light: (h, s) => h >= s.rise && h <= s.set,
  dark: (h, s) => h < s.rise - .4 || h > s.set + .4,
  twam: (h, s) => h >= s.rise - 1 && h <= s.rise + .25,
  sunrise: (h, s) => h >= s.rise - .15 && h <= s.rise + 2,
  sunset: (h, s) => h >= s.set - 1 && h <= s.set + .3,
  dusk: (h, s) => h >= s.set - .3 && h <= s.set + 1.2
};
function sunOK(k, ctx) {
  const s = ctx.sunT || (ctx.sunT = sunTimes(ctx.P.pref, ctx.t));
  return [].concat(k).some(x => SUN_RULE[x] && SUN_RULE[x](ctx.h, s));
}

// ---- 月（満ち欠けは Meeus の式で計算。満月の時刻の誤差は数分）----
function lunarPhaseJDE(k, full) {
  const T = k / 1236.85, R = Math.PI / 180, s = Math.sin;
  const E = 1 - .002516 * T, M = (2.5534 + 29.1053567 * k) * R, Mp = (201.5643 + 385.81693528 * k + .0107582 * T * T) * R;
  const F = (160.7108 + 390.67050284 * k - .0016118 * T * T) * R, Om = (124.7746 - 1.56375588 * k) * R;
  return 2451550.09766 + 29.530588861 * k + .00015437 * T * T
    + (full ? -.40614 : -.4072) * s(Mp) + (full ? .17302 : .17241) * E * s(M) + (full ? .01614 : .01608) * s(2 * Mp) + (full ? .01043 : .01039) * s(2 * F)
    + (full ? .00734 : .00739) * E * s(Mp - M) - (full ? .00515 : .00514) * E * s(Mp + M) + (full ? .00209 : .00208) * E * E * s(2 * M)
    - .00111 * s(Mp - 2 * F) - .00057 * s(Mp + 2 * F) + .00056 * E * s(2 * Mp + M) - .00042 * s(3 * Mp) + .00042 * E * s(M + 2 * F) + .00038 * E * s(M - 2 * F) - .00024 * E * s(2 * Mp - M) - .00017 * s(Om);
}
const jdOf = t => Date.UTC(t.y, t.mo - 1, t.d) / 864e5 + 2440587.5 + ((t.hf != null ? t.hf : t.h) - 9) / 24;
function moonOf(t) {
  const jd = jdOf(t);
  let k = Math.floor((jd - 2451550.09766) / 29.530588861);
  if (lunarPhaseJDE(k, false) > jd) k--;
  else if (lunarPhaseJDE(k + 1, false) <= jd) k++;
  const age = jd - lunarPhaseJDE(k, false);
  const f1 = jd - lunarPhaseJDE(k - .5, true), f2 = jd - lunarPhaseJDE(k + .5, true);
  const dFull = Math.abs(f1) < Math.abs(f2) ? f1 : f2;
  // 南中は新月で正午、満月で真夜中。南中の前後6時間ほど空にある
  const transit = (12 + age / 29.53 * 24) % 24, h = t.hf != null ? t.hf : t.h;
  const dh = Math.abs(((h - transit + 36) % 24) - 12);
  return { age, dFull, up: dh < 6.2 };
}
// full 満月の前後1日で空に出ている、up 半月より明るい月が空に出ている、none 月明かりのない夜
function moonOK(k, ctx) {
  const m = ctx.moonI || (ctx.moonI = moonOf(ctx.t));
  if (evOK('eclipse', ctx)) return false;   // 月食のあいだは、ふだんの月の文は出さない
  return [].concat(k).some(x => x === 'full' ? Math.abs(m.dFull) <= 1 && m.up : x === 'up' ? m.age >= 5 && m.age <= 25 && m.up : x === 'none' ? !(m.up && m.age >= 3 && m.age <= 26.5) : false);
}

// ---- 暦の出来事（スポーツの日程・入試・新年度・天文現象など）----
// 日本シリーズ：試合日と開催地（決まったものだけ。2026年は第5戦以降が未定なので、決まりしだい足す）
const NIHON_S = {
  2025: { games: [[10, 25, '福岡県'], [10, 26, '福岡県'], [10, 28, '兵庫県'], [10, 29, '兵庫県'], [10, 30, '兵庫県']], fans: ['福岡県', '兵庫県', '大阪府'], end: [10, 30], win: ['福岡県'], lose: ['兵庫県', '大阪府'] },
  2026: { games: [[10, 24, '神奈川県'], [10, 25, '神奈川県'], [10, 27, '福岡県'], [10, 28, '福岡県']], fans: ['神奈川県', '福岡県'] }
};
// 日本シリーズの球場と、観に行く人が住んでいる都道府県
const NS_AT = { 神奈川県: ['ys', ['神奈川県', '東京都']], 福岡県: ['pp', ['福岡県', '佐賀県']], 兵庫県: ['kz', ['兵庫県', '大阪府']] };
// 月食（国立天文台の予報。日本で見えるもの）[年, 月, 日, 欠け始め, 終わり, 皆既の始め, 皆既の終わり]（時刻は時の小数）
const LUNAR_EC = [[2025, 9, 8, 1.45, 4.95, 2.5, 3.88], [2026, 3, 3, 18.83, 22.28, 20.07, 21.05]];
// 中秋の名月（旧暦8月15日）
const CHUSHU = { 2025: [10, 6], 2026: [9, 25], 2027: [9, 15], 2028: [10, 3], 2029: [9, 22], 2030: [9, 12] };
// 期間の決まった大会（日本時間の日付）
const EV_SPAN = [
  ['olyW', 2026, [2, 7, 2, 23]],       // ミラノ・コルティナ冬季五輪（日本では夕方〜明け方に中継）
  ['para', 2026, [3, 7, 3, 16]],       // 冬季パラリンピック
  ['wbc', 2026, [3, 5, 3, 18]],        // WBC
  ['wbcTokyo', 2026, [3, 5, 3, 10]],   // WBC 1次ラウンド（東京ドーム）
  ['wcup', 2026, [6, 12, 7, 20]],      // サッカーW杯（北中米。日本では早朝〜昼に中継）
  ['asiad', 2026, [9, 19, 10, 4]],     // アジア大会（愛知・名古屋）
  ['olyS', 2028, [7, 15, 7, 31]]       // ロサンゼルス五輪（日本では早朝〜昼に中継）
];
const nthDow = (y, m, dow, n) => { const w = new Date(Date.UTC(y, m - 1, 1)).getUTCDay(); return 1 + ((dow - w + 7) % 7) + 7 * (n - 1); };
const dayNo = (y, m, d) => Date.UTC(y, m - 1, d) / 864e5;
// ユーザー提供の開催案内画像（2026-10-23）。毎年の固定日として外挿しない。
// コミックマーケット109 / COMIC CITY東京153：いずれも東京ビッグサイト。
// 追加・訂正するときは主催者の案内と照合すること（今回、公式サイトへの接続は不可）。
const DOUJIN_DATES = {
  2026: { comiket: [[12, 29], [12, 30], [12, 31]], akaboo: [[11, 29]] }
};
// 大相撲の本場所：奇数月の第2日曜から15日間（1・5・9月は東京、3月は大阪、7月は名古屋、11月は福岡）
const SUMO_PREF = { 1: '東京都', 3: '大阪府', 5: '東京都', 7: '愛知県', 9: '東京都', 11: '福岡県' };
// 共通テスト：1月13日以降の最初の土曜・日曜
function kyotsuDays(y) { const w = new Date(Date.UTC(y, 0, 13)).getUTCDay(); const s = 13 + ((6 - w + 7) % 7); return [s, s + 1]; }
// 中学受験の解禁日（首都圏・関西）
const CHUJU = { 東京都: [[2, 1, 2, 3]], 神奈川県: [[2, 1, 2, 3]], 埼玉県: [[1, 10, 1, 12]], 千葉県: [[1, 20, 1, 21]] };
const CHUJU_KANSAI = new Set(['大阪府', '兵庫県', '京都府', '奈良県']);
const EV_MEMO = new Map();
function eventsOn(t, pref) {
  const key = (t.y * 10000 + t.mo * 100 + t.d) * 100 + pref.i;
  let E = EV_MEMO.get(key);
  if (E) return E;
  E = new Set();
  const y = t.y, mo = t.mo, d = t.d, v = mo * 100 + d, dow = t.dow, wd = dow >= 1 && dow <= 5 && !holName(t);
  const inR = r => inMD(t, r);
  if (v === 102 || v === 103) E.add('hakone');
  if (v === 1231) E.add('kohaku');
  // 地域の習俗は日付だけここで判定し、対象の市区町村・区は文の muni / ward で絞る。
  if (pref.n === '北海道' && v === 707) E.add('rosokuHakodate');
  if (pref.n === '北海道' && v === 807) E.add('rosokuSapporo');
  if (pref.n === '秋田県' && v === 1231) E.add('namahage');
  if (['山形県', '宮城県'].includes(pref.n) && inR([9, 1, 10, 31]) && !wd) E.add('imoni');
  if (pref.n === '京都府' && mo === 7) {
    if ((d >= 14 && d <= 16) || (d >= 21 && d <= 23)) E.add('gionYoi');
    if (d === 17 || d === 24) E.add('gionJunko');
  }
  // 三社祭の通常日程：5月の第3日曜と、その前の金・土曜。
  if (pref.n === '東京都' && mo === 5) { const s = nthDow(y, 5, 0, 3); if (d >= s - 2 && d <= s) E.add('sanja'); }
  if (pref.n === '高知県' && inR([8, 10, 8, 11])) E.add('yosakoi');
  if (pref.n === '沖縄県' && mo === 4 && (dow === 0 || dow === 6)) E.add('shiimii');
  // 東京湾大華火祭：2026年の公式開催日だけ。時間・区・現在地は各状況で制限。
  // https://tokyo-hanabi-festival.com/about/ （2026-10-24確認、17:30〜19:00）
  if (pref.n === '東京都' && y === 2026 && v === 1024) E.add('tokyoBayFireworks');
  if (inR([10, 25, 10, 31])) E.add('halloween');
  if (v === 1231) E.add('yearEndParty');
  if (v === 101) E.add('newYearParty');
  // 開催日を断定しない、同人活動の日常。即売会の当日・会場の描写には使わない。
  E.add('doujin');
  // 前日・翌日は通算日で比べ、12/31→1/1や月末も正しくつなぐ。
  const today = dayNo(y, mo, d);
  Object.entries(DOUJIN_DATES).forEach(([yy, kinds]) => Object.entries(kinds).forEach(([kind, dates]) => {
    dates.forEach(([m, d]) => {
      const delta = today - dayNo(+yy, m, d);
      if (delta === 0) E.add(kind + 'Day');
      if (delta === -1) E.add(kind + 'Eve');
      if (delta === 1) E.add(kind + 'After');
    });
  }));
  if (mo % 2 === 1) { const s = nthDow(y, mo, 0, 2); if (d >= s && d <= s + 14) { E.add('sumo'); if (SUMO_PREF[mo] === pref.n) E.add('sumoLocal'); if (d === s + 14) E.add('senshuraku'); } }
  if (inR([3, 27, 9, 30]) && dow !== 1) E.add('npb');
  if (inR([10, 10, 10, 21])) E.add('npbcs');
  const js = NIHON_S[y];
  if (js) {
    const g = js.games.find(x => x[0] === mo && x[1] === d);
    if (g) {
      E.add('nihonS'); if (js.fans.includes(pref.n)) E.add('nihonS_fan'); if (g[2] === pref.n) E.add('nihonS_venue');
      const at = NS_AT[g[2]]; if (at && at[1].includes(pref.n)) E.add('nihonS_at_' + at[0]);   // 球場へ観に行ける距離
    }
    if (js.games.some(x => x[0] === mo && x[1] === d - 1)) E.add('nihonS_after');   // 試合の翌日
    if (js.end && js.end[0] === mo && js.end[1] === d) { if ((js.win || []).includes(pref.n)) E.add('nihonS_win'); if ((js.lose || []).includes(pref.n)) E.add('nihonS_lose'); }
  }
  EV_SPAN.forEach(([k, yy, r]) => { if (yy === y && inR(r)) E.add(k); });
  if (E.has('asiad') && pref.n === '愛知県') E.add('asiadLocal');
  if (inR([8, 6, 8, 22])) E.add('koshien');
  if (inR([3, 19, 3, 30])) E.add('senbatsu');
  if (mo === 1) { const [a, b] = kyotsuDays(y); if (d === a || d === b) E.add('kyotsu'); if (d === a - 1) E.add('kyotsuEve'); }
  if (v === 225) E.add('kokkou');
  if (v === 224) E.add('kokkouEve');
  if ((CHUJU[pref.n] || []).some(inR)) E.add('chuju');
  if (CHUJU_KANSAI.has(pref.n) && mo === 1) { const s = nthDow(y, 1, 6, 3); if (d === s || d === s + 1) E.add('chuju'); }
  // 入社式：4月1日（土日なら次の月曜）。新人研修はその翌日から4月末までの平日
  const n1 = (() => { const w = new Date(Date.UTC(y, 3, 1)).getUTCDay(); return w === 6 ? 3 : w === 0 ? 2 : 1; })();
  if (mo === 4 && d === n1) E.add('nyusha');
  if (mo === 4 && d > n1 && wd) E.add('kenshu');
  if (inR([4, 1, 4, 7])) E.add('nendo');
  if (inR([3, 24, 3, 31])) E.add('nendomatsu');
  if (inR([8, 11, 8, 13]) || inR([12, 13, 12, 15])) E.add('meteor');
  const cs = CHUSHU[y];
  if (cs && cs[0] === mo && cs[1] === d) E.add('chushu');
  EV_MEMO.set(key, E);
  return E;
}
// 時刻で決まる出来事（月食）は毎回たしかめる
function evOK(k, ctx) {
  const E = ctx.ev || (ctx.ev = eventsOn(ctx.t, ctx.P.pref));
  return [].concat(k).some(x => {
    if (x === 'eclipse' || x === 'eclipseT') {
      const t = ctx.t, ec = LUNAR_EC.find(e => e[0] === t.y && e[1] === t.mo && e[2] === t.d);
      return !!ec && (x === 'eclipse' ? inWin(ctx.h, ec[3], ec[4]) : inWin(ctx.h, ec[5], ec[6]));
    }
    return E.has(x);
  });
}

// ---- 桜・紅葉の時期（気象庁の生物季節観測の平年値 1991〜2020年。県庁所在地の近くの観測点）----
// 桜（ソメイヨシノ。北海道はエゾヤマザクラ、沖縄はヒカンザクラ）[開花, 満開]（月*100+日）。千葉は銚子より千葉市に近い値にした
const SAKURA_N = [[501, 506], [422, 426], [418, 424], [408, 413], [417, 422], [413, 418], [407, 411], [330, 406], [330, 406], [329, 405], [327, 403], [327, 403], [324, 331], [325, 401],
  [408, 413], [403, 408], [403, 408], [401, 407], [325, 402], [411, 416], [325, 402], [324, 402], [324, 402], [329, 403], [401, 408], [326, 404], [327, 404], [327, 405], [328, 404], [324, 403],
  [329, 405], [329, 405], [328, 404], [325, 403], [326, 404], [328, 404], [327, 404], [324, 403], [322, 330], [322, 331], [324, 402], [323, 402], [322, 401], [324, 404], [323, 402], [326, 405], [118, 208]];
// 紅葉 [かえでの紅葉日, いちょうの黄葉日]。主要都市の平年値をもとに、ほかの県は近い都市から推定（沖縄はなし）
const KOYO_N = [[1028, 1104], [1113, 1102], [1110, 1103], [1121, 1123], [1112, 1105], [1114, 1108], [1118, 1114], [1126, 1122], [1122, 1118], [1122, 1116], [1127, 1124], [1201, 1126], [1128, 1123], [1130, 1125],
  [1122, 1114], [1122, 1112], [1124, 1110], [1124, 1113], [1118, 1112], [1112, 1110], [1126, 1120], [1202, 1127], [1128, 1118], [1130, 1122], [1128, 1120], [1205, 1124], [1201, 1122], [1130, 1122], [1128, 1122], [1206, 1123],
  [1120, 1112], [1122, 1114], [1125, 1118], [1122, 1115], [1128, 1118], [1130, 1120], [1128, 1120], [1130, 1122], [1202, 1115], [1201, 1120], [1201, 1122], [1203, 1125], [1129, 1124], [1128, 1122], [1205, 1128], [1215, 1125], null];
// 日付の差（日）。年をまたぐ前後も考える
const mdDiff = (t, m) => { const a = dayNo(t.y, t.mo, t.d); let b = dayNo(t.y, Math.floor(m / 100), m % 100); if (a - b > 180) b = dayNo(t.y + 1, Math.floor(m / 100), m % 100); else if (b - a > 180) b = dayNo(t.y - 1, Math.floor(m / 100), m % 100); return a - b; };
// bud つぼみ、bloom 咲いている（散り始めまで）、full 満開のころ、hanami 花見どき、fall 散るころ
const SAKURA_RULE = { bud: (k, m) => k >= -12 && k <= -1, bloom: (k, m) => k >= 0 && m <= 7, full: (k, m) => m >= -3 && m <= 4, hanami: (k, m) => k >= 2 && m <= 5, fall: (k, m) => m >= 3 && m <= 10 };
function sakuraOK(c, ctx) {
  const s = SAKURA_N[ctx.P.pref.i];
  const k = mdDiff(ctx.t, s[0]), m = mdDiff(ctx.t, s[1]);
  return [].concat(c).some(x => SAKURA_RULE[x] && SAKURA_RULE[x](k, m));
}
// city 街の紅葉（紅葉日の前後）、mt 紅葉の名所・山（街より3〜5週間早い）、icho イチョウ並木
function koyoOK(c, ctx) {
  const s = KOYO_N[ctx.P.pref.i];
  if (!s) return false;
  const k = mdDiff(ctx.t, s[0]), g = mdDiff(ctx.t, s[1]);
  return [].concat(c).some(x => x === 'city' ? k >= -12 && k <= 10 : x === 'mt' ? k >= -40 && k <= -3 : x === 'icho' ? g >= -7 && g <= 10 : false);
}

// ---- 地震（P2P地震情報の直近の観測。「いまの日本」のときだけ）----
// 揺れた県では、揺れの大きさと経過時間に応じて「揺れに気づいた」場面が出る。
// 大きな地震（全国のどこかで震度5弱以上、またはその県で震度4以上）が24時間以内にあったときは、地震の場面は出さない
const EQ = { at: 0, list: null };
function setQuakes(list, at) { EQ.list = Array.isArray(list) ? list : null; EQ.at = at || Date.now(); }
function eqOf(pref, t) {
  if (t.rand || !EQ.list || Date.now() - EQ.at > 20 * 60e3) return null;
  const now = Date.now();
  if (EQ.list.some(q => now - q.t < 24 * 3600e3 && (q.max >= 45 || (q.pts[pref.n] || 0) >= 40))) return null;
  let best = null;
  for (const q of EQ.list) {
    const m = (now - q.t) / 60e3, sc = q.pts[pref.n] || 0;
    if (m < 0 || m > 60 || sc < 10) continue;
    const s = sc >= 30 ? 3 : sc >= 20 ? 2 : 1;
    if (!best || s > best.s || (s === best.s && m < best.m)) best = { s, m };
  }
  return best;
}
// 揺れに気づいた場面の割合（震度1は気づく人が少ない）。時間がたつと話題にする人は減る
const eqShare = q => q ? (q.s === 3 ? .3 : q.s === 2 ? .08 : .03) * (q.m < 10 ? 1 : q.m < 30 ? .6 : .3) : 0;

// ---- 出来事の場面の割合 ----
// 出来事の文（EV_TX）は、まず「出来事の場面になるか」をこの割合で決めてから選ぶ。文の sh（その出来事にかかわっている人の割合）の、出来事ごとの最大を足す
function evShareOf(e, ctx) {
  const o = e[3];
  if (o.eq) return eqShare(ctx.eq);
  return o.sh != null ? o.sh : .03;
}

// 外で過ごす場面（雨や雪の日は出にくい）
const OUTDOOR_RE = /公園|散歩|洗濯物を干|洗濯物を一気に干|布団を干|ベランダ|庭|畑|田んぼ|グラウンド|校庭|園庭|海水浴|花火|キャッチボール|ジョギング|ランニング|ウォーキング|サイクリング|自転車で|川で|川沿い|川遊び|虫取り|潮干狩り|ブランコ|すべり台|屋台|祭り|花見|バーベキュー|ゴルフ|テニス|野球|サッカー|ゲートボール|グラウンドゴルフ|ラジオ体操|水切り|木に登|秘密基地を作り|空き地|球場|キャンプ場|縁側|洗車|墓参り|お墓参り/;
const OUTDOOR_MEMO = new Map();
const isOutdoor = x => { let v = OUTDOOR_MEMO.get(x); if (v === undefined) { v = OUTDOOR_RE.test(x); OUTDOOR_MEMO.set(x, v); } return v; };
// 天気で過ごし方の種類の割合を変える（雨や雪は外出・運動が減り、家の中が増える。猛暑の昼も外出が減る）
function wxRates(r, w, h) {
  if (!w) return r;
  const m = { meal: 1, house: 1, media: 1, rest: 1, hobby: 1, study: 1, sport: 1, out: 1, social: 1 };
  if (w.rain || w.snow) { const k = w.heavy || w.snow ? 1.5 : 1; m.out = 1 - .4 * k; m.sport = 1 - .5 * k; m.social = 1 - .15 * k; m.media = 1.15; m.rest = 1.1; m.hobby = 1.05; }
  if (w.veryhot && h >= 10 && h < 17) { m.out *= .8; m.sport *= .6; m.media *= 1.1; m.rest *= 1.1; }
  let sum = 0; const o = {};
  for (const c in r) { o[c] = r[c] * (m[c] || 1); sum += o[c]; }
  for (const c in o) o[c] /= sum;
  return o;
}
function entryOK(e, ctx) {
  if (typeof profileEntryOK === 'function' && !profileEntryOK(e, ctx.P)) return false;
  if (typeof e === 'string') return true;
  if (!inWin(ctx.h, e[0], e[1])) return false;
  const o = e[3];
  if (!o) return true;
  const P = ctx.P, oc = P.occ;
  if (o.a && (P.age < o.a[0] || P.age > o.a[1])) return false;
  if (o.wd && (ctx.we || ctx.vacP)) return false;   // 平日（学生は長期休みも除く）
  if (o.we && !ctx.we) return false;                // 休日（土日・祝日・年末年始など）
  if (o.m && !o.m.includes(ctx.mo)) return false;
  if (o.md) {
    const rs = Array.isArray(o.md[0]) ? o.md : [o.md];
    if (!rs.some(r => inMD(ctx.t, r))) return false;
  }
  if (o.hol && !ctx.hol) return false;               // 祝日
  if (o.holn && ctx.hol !== o.holn) return false;    // 特定の祝日
  if (o.dow && !o.dow.includes(ctx.t.dow)) return false;
  if (o.vac && !ctx.vac) return false;               // 学校の長期休み
  if (o.snow && !SNOW_PREFS.has(P.pref.n)) return false;
  if (o.sex && P.sex !== o.sex) return false;
  if (o.city && P.urb === 'rural') return false;
  if (o.mode && ctx.mode !== o.mode) return false;            // 通勤手段
  if (o.tag && oc.tag !== o.tag) return false;                 // 職業の種類
  if (o.jn && !(oc.job && oc.job.n === o.jn)) return false;     // 特定の職業
  if (o.jobs && !(oc.job && o.jobs.includes(oc.job.n))) return false;   // 職業名のどれか（同じタグの中で分ける）
  if (o.biz && !(oc.job && (['管理', '販売'].includes(oc.cat) || ['office', 'sales', 'exec'].includes(oc.tag)))) return false;
  if (o.nur && !oc.nur) return false;
  if (o.gs && !o.gs.includes(P.g)) return false;
  if (o.camp && !ctx.camp) return false;
  if (o.yr && !o.yr.includes(oc.yr)) return false;
  if (o.senmon && !oc.senmon) return false;
  if (o.grad && !oc.grad) return false;
  if (o.rural && !(P.urb === 'rural' || P.urb === 'mid')) return false;
  if (o.ronin && !oc.ronin) return false;
  if (o.sch && !oc.school) return false;
  if (o.wx && !(ctx.wx && wxMatch(ctx.wx, o.wx))) return false;   // 天気
  if ((o.hl || o.np || o.nm || o.lv || o.bt || o.emp) && !hlOK(o, P)) return false;   // 体調（妊娠・産後・寝込んでいる など）
  if (o.pref && !o.pref.includes(P.pref.n)) return false;      // 都道府県
  if (o.muni && !o.muni.includes(P.muni.n)) return false;      // 市区町村（東京23区もここ）
  if (o.ward && !o.ward.includes(P.ward)) return false;        // 指定都市の区
  if (o.sun && !sunOK(o.sun, ctx)) return false;                // 日の出・日の入りから見た明るさ
  if (o.moon && !moonOK(o.moon, ctx)) return false;             // 月
  if (o.ev && !evOK(o.ev, ctx)) return false;                   // 暦の出来事
  if (o.sakura && !sakuraOK(o.sakura, ctx)) return false;       // 桜の時期
  if (o.koyo && !koyoOK(o.koyo, ctx)) return false;             // 紅葉の時期
  if (o.nh && !ctx.nh) return false;                            // 新入社員
  if (o.eq && !(ctx.eq && ctx.eq.s >= o.eq && ctx.eq.m <= (o.eqm || 60))) return false;   // 地震の揺れ（震度の下限・何分以内か）
  return true;
}
const textOf = e => typeof e === 'string' ? e : e[2];
// 仕事・学校の外での過ごし方を、文から大まかな区分に分ける（上から順に判定）
const ACT_CATS = [
  ['寄り道している', /ネオン|看板の店|無料案内所|料金表|向かいの店から|雑居ビル|歓楽街|窓のない店/],
  ['雨宿りしている', /通り雨|ゲリラ豪雨|雨宿り|夕立|ずぶ濡れ|急な雨/],
  ['涼んでいる', /涼んで|涼みがてら/],
  ['仕事中', /シルバー人材|内職/],
  ['仕事を探している', /求人|履歴書|ハローワーク|面接|働き先|就職活動|就活|エントリーシート/],
  ['アルバイト中', /アルバイト|バイト先|バイト中|バイトで/],
  ['料理をしている', /漬け込|ヘタ取り/],
  ['飲みに出ている', /居酒屋|飲み会|はしご酒|スナック|バーで|二次会|立ち飲み|大衆酒場|新年会|忘年会|歓迎会|送別会|打ち上げ|コンパ|飲み屋|飲みに行|ビアガーデン|お花見の缶ビール/],
  ['晩酌している', /晩酌|ビール|お酒|酒を|日本酒|焼酎|ハイボール|チューハイ|ワイン|熱燗|ウイスキー|地酒/],
  ['身じたく中', /化粧|メイク|ひげを|髭/],
  ['入浴中', /湯船|お風呂(?!上がり)|銭湯|サウナ|入浴|シャワー/],
  ['電話している', /電話|通話/],
  ['デート中', /デート|恋人|彼氏|彼女と|彼女の|マッチングアプリ|記念日|指輪|プロポーズ|付き合って|付き合い始め/],
  ['トイレ中', /トイレに|トイレで|トイレの前|トイレの順番|トイレから|トイレへ|補助便座/],
  ['目を覚ましている', /目が覚め|目を覚ま|目覚め|目覚ましをかけず|二度寝|昼寝をし|昼寝から|寝ていたこと|あと5分|起き上が/],
  ['いたずら中', /0点|叱られ|怒られ|ため息をつかれ|ことにして|隠した|穴を開け|逃がして|止められた|ばれた|見つかった|勝手に|描き足し|注意された/],
  ['行事を楽しんでいる', /七夕|短冊|お年玉|クリスマス|サンタ|節分|豆まき|こどもの日|こいのぼり|ひな人形|ひな祭り|月見|中秋|年賀状|新年を迎え|あけまして|初売り|福袋|バレンタイン|友チョコ|ハロウィン|母の日|父の日|敬老|冬至|書き初め|初詣|お盆|迎え火|送り火|盆踊り|花火大会|夏祭り|秋祭り|お祭り|成人式|入学式|卒業式|運動会|花見|紅葉狩り|除夜の鐘|年越し|おせち|お雑煮|鏡開き|七五三|恵方巻/],
  ['孫と過ごしている', /孫たち|孫と|孫が来/],
  ['ラジオを聴いている', /ラジオ番組|ラジオを聴/],
  ['観戦している', /のスタンドで|升席|沿道で小旗/],
  ['配信を見ている', /配信|実況|VTuber|YouTube|動画|ライブ映像/],
  ['テレビを見ている', /テレビ|ドラマ|アニメ|番組|ニュース|録画|中継|紅白歌合戦|再放送|時代劇|特番|ワイドショー/],
  ['通学中', /通学|登校|下校|校門を出|園バス|スクールバス/],
  ['音楽を聴いている', /音楽を聴|音楽をかけ|レコード|CD|クラシック|ジャズ|コンサート|演奏会|曲を聴|聴いている|聴き入/],
  ['ゲームをしている', /ゲーム|ガチャ|対戦/],
  ['部活をしている', /部室|部活|部の練習|部の活動|生徒会|サークル|文化祭|学園祭|新歓|ビラ|吹奏楽|コンクール|朝練/],
  ['教習所に通っている', /教習|仮免許|S字/],
  ['遊んでいる', /トランプ|で遊んで|ハイハイ/],
  ['くつろいでいる', /時間をつぶ|放り出して|倒れ込|うとうと/],
  ['用事を済ませている', /窓口|役所|銀行|郵便局|手続き|美容院|床屋|免許の更新/],
  ['介護をしている', /介護|付き添って|ケアマネ|デイサービスに出かける|手を引いて|一人暮らしの母|一人暮らしの父/],
  ['リハビリ中', /リハビリ|機能訓練/],
  ['通院している', /病院|診察|通院|薬局|待合室|整骨院|デイサービス|歯医者|健康診断|健診|眼科|耳鼻科|整形外科|皮膚科|内科|小児科|予防接種/],
  ['子どもの世話中', /おむつ|授乳|赤ちゃん|子どもを|子どもの|子どもが|子どもと|お迎え|送り迎え/],
  ['勉強している', /勉強|宿題|参考書|問題集|単語|予習|復習|課題|レポート|過去問|模試|卒論|卒業論文|資格|検定|英検|授業|ゼミ|研究室|実習|実験|講義|出席登録|講習|塾|合格発表|自由研究|図鑑|一夜漬け|テスト|学習|試験前日|ノート/],
  ['本を読んでいる', /写真集|本を|読書|漫画|マンガ|小説|雑誌|新聞を|新聞の|朝刊|読ん/],
  ['料理をしている', /料理|自炊|を作ろう|カップ麺|チャーハンを作|炊飯器を開け|茹で|煮て|煮な|焼き上げ|焼き上がったクッキー|下ごしらえ|作り置き|お湯を沸か|干し柿|皮をむ|夕飯の支度|ごはんの支度|食事の支度|準備で|レシピ|弁当を同時|弁当を作|弁当を詰|弁当に|弁当のおかず|隠し味|味見|刻み|アク抜き|焼き始め|焼いて|献立|バーベキュー/],
  ['支度をしている', /支度|身じたく|寝ぐせ|ネクタイ|着ていく服|傘を持って|鍵が見つから|ランドセル|時間割|名前を書|着替え|霜を|靴を履|持ったか|朝の歯みがき|制服/],
  ['ペットの世話中', /えさ|ペット|犬の散歩|犬を|猫に|金魚に/],
  ['家のことをしている', /洗濯|掃除|布団を干|洗い物|皿を|食器|片付け|片づけ|アイロン|ゴミ|ごみ|取り込|積もった雪を|雪かき|雪をかい|雪下ろし|衣替え|押し入れ|タイヤ|洗車|DIY|組み立て|荷物|引っ越し|模様替え/],
  ['買い物をしている', /スーパー|買い物|コンビニ|ドラッグストア|ホームセンター|レジ|特売|百円|100円|ショッピング|商店街|売り場|試着|通販|カート|古着屋|雑貨屋|花屋|デパート|ベビー用品|家電量販店|買い出し|八百屋|買うため|パン屋/],
  ['お参りしている', /仏壇|供えて|墓参り|お墓|参拝|お参り/],
  ['健康管理をしている', /血圧|ピルケース|体重計|熱中症/],
  ['食事をしている', /食べ|ごはん|ご飯|朝食|昼食|夕食|夕飯|弁当|ランチ|ラーメン|そば|うどん|すすっ|おやつ|お菓子|トースト|外食|焼肉|焼き肉|寿司|定食|鍋を|カレー|おにぎり|パン(?!ダ)|ケーキ|アイス|かき氷|カフェ|喫茶店|ファストフード|モーニング|食卓|納豆|みかん|チキン|団子|シリアル|ミルク|離乳食|パスタ|餅|スイカ/],
  ['体調を崩している', /熱を出|花粉症|くしゃみ|冷却シート|風邪|寝込|体調を崩|つわり/],
  ['体を動かしている', /ジム|ランニング|ジョギング|筋トレ|ウォーキング|素振り|自主練|ストレッチ|ヨガ|プール|スイミング|ゲートボール|グラウンドゴルフ|体操|練習|試合|サッカー|野球|バスケ|テニス|スキー|スノーボード|スケートボード|ゴルフ|レクリエーション/],
  ['遊んでいる', /遊ん|遊び|ごっこ|かくれんぼ|ブランコ|すべり台|滑り台|秘密基地|虫|カブトムシ|クワガタ|ザリガニ|カエル|どんぐり|おもちゃ|ブロック|積み木|お絵かき|ままごと|雪だるま|雪合戦|新雪|そり|水鉄砲|花火|カードゲーム|チャンバラ|ケイドロ|水切り|ぬいぐるみ|ロボット|飛び降り|お化け屋敷|遊園地|泥|潮干狩り|ティッシュ|靴下|つかまり立ち|逃げ回|いたずら|ミニカー|写真シール|プリクラ|木に登|水たまり|演奏/],
  ['散歩している', /散歩|ぶらぶら|ぶらつ/],
  ['運転している', /運転|ハンドル|ドライブ|サービスエリア|高速道路|カーナビ|合流|軽トラック/],
  ['帰宅途中', /終電|帰り道|家路|帰宅|帰る途中/],
  ['おしゃべりしている', /話して|話を|話し込|世間話|おしゃべり|昔話|しゃべ|立ち話/],
  ['スマホを見ている', /スマートフォン|スマホ|SNS|LINE|インスタ|ストーリー|投稿|いいね|メッセージ|通知|ネット|サイト|アプリ/],
  ['趣味に没頭している', /手芸|編み物|編みかけ|撮った写真|プラモデル|ギター|ピアノ|楽器|絵を|釣り|カラオケ|将棋|囲碁|麻雀|俳句|盆栽|写真部|カメラ|アルバム|推し|ライブ|映画館|ネイル|書道|民謡|合唱|日本舞踊|花を生け|茶道|ミシン|スケッチブック|陶芸|パチンコ|キャンプ|劇場|塗り絵|ボウリング|ダーツ|ビリヤード|バッティングセンター/],
  ['畑仕事をしている', /畑|田んぼ|草むしり|草取り|家庭菜園|鉢植え|水やり|植木|庭木|柿の木|直売所|花壇/],
  ['出かけている', /電車|バス|駅|新幹線|空港|旅行|帰省|神社|お寺|祭り|紅葉|海|公園|向か|出かけ|飛び出|歩いて|自転車|渋滞|観光|行列|イベント|会場|タクシー|繁華街|動物園|水族館|美術館|博物館/],
  ['寝る支度をしている', /布団|ベッドに入|ベッドの上|ベッドの中|ベッドに横|寝る前|寝床|眠れ|寝つけ|歯を磨|歯みがき|寝かしつけ|子守唄|消灯前/]
];
const ACT_MEMO = new Map();
function actOf(x) {
  let v = ACT_MEMO.get(x);
  if (v === undefined) {
    v = null;
    for (const [label, re] of ACT_CATS) if (re.test(x)) { v = label; break; }
    ACT_MEMO.set(x, v);
  }
  return v;
}
// 区分を大まかな種類にまとめる（時間帯ごとの割合はこの種類で決める）
const ACT_CLASS = {};
[['meal', '食事をしている,昼休み中'],
 ['house', '介護をしている,料理をしている,家のことをしている,買い物をしている,子どもの世話中,ペットの世話中,用事を済ませている,畑仕事をしている,健康管理をしている'],
 ['media', '音楽を聴いている,テレビを見ている,配信を見ている,ラジオを聴いている,スマホを見ている'],
 ['rest', '涼んでいる,トイレ中,くつろいでいる,目を覚ましている,寝る支度をしている,体調を崩している,施設で過ごしている,支度をしている,入浴中,身じたく中,晩酌している'],
 ['hobby', 'ゲームをしている,本を読んでいる,趣味に没頭している,遊んでいる,いたずら中,行事を楽しんでいる'],
 ['study', '勉強している,教習所に通っている'],
 ['sport', 'リハビリ中,体を動かしている,散歩している,部活をしている'],
 ['out', '観戦している,雨宿りしている,出かけている,運転している,帰宅途中,通学中,寄り道している,お参りしている,通院している,仕事を探している,アルバイト中,仕事中'],
 ['social', 'デート中,飲みに出ている,おしゃべりしている,電話している,孫と過ごしている']
].forEach(([c, ls]) => ls.split(',').forEach(l => { ACT_CLASS[l] = c; }));
// 起きていて仕事・学校の外にいる人が、何をしているか（社会生活基本調査・国民生活時間調査の時間帯別の傾向を大づかみにしたもの）
// 食事は時刻ごと、それ以外は時間帯ごとの重み［家事・用事, テレビ・動画, 休養・身のまわり, 趣味・遊び, 勉強, 運動, 外出・移動, 交際］
const MEAL_H = {
  std:      [.01, .01, .01, .01, .01, .02, .1, .25, .18, .07, .04, .08, .35, .15, .04, .04, .03, .05, .15, .28, .2, .08, .04, .02],
  kid:      [.01, .01, .01, .01, .01, .02, .15, .4, .1, .04, .04, .1, .4, .1, .05, .12, .05, .08, .25, .3, .1, .03, .02, .01],
  senior:   [.01, .01, .01, .01, .02, .05, .2, .3, .15, .05, .05, .15, .35, .1, .04, .05, .05, .15, .3, .2, .06, .03, .02, .01],
  facility: [0, 0, 0, 0, 0, 0, .05, .3, .4, .05, .05, .1, .5, .15, .03, .1, .03, .1, .45, .15, .03, 0, 0, 0]
};
const ACT_CLS = ['house', 'media', 'rest', 'hobby', 'study', 'sport', 'out', 'social'];
// 時間帯：深夜(0-5) 朝(5-9) 午前(9-12) 午後(12-17) 夕方〜夜(17-21) 夜遅く(21-24)
const ACT_RATE = {
  baby:      [[0, .05, .85, .1, 0, 0, 0, 0], [0, .15, .4, .35, 0, 0, .1, 0], [0, .15, .15, .45, 0, 0, .25, 0], [0, .15, .15, .45, 0, 0, .25, 0], [0, .25, .3, .4, 0, 0, .05, 0], [0, .1, .75, .15, 0, 0, 0, 0]],
  kid:       [[0, .05, .85, .1, 0, 0, 0, 0], [.02, .25, .35, .1, .05, .03, .2, 0], [.03, .2, .1, .35, .1, .1, .12, 0], [.03, .15, .08, .35, .15, .12, .12, 0], [.03, .35, .15, .2, .2, .02, .05, 0], [0, .2, .55, .1, .15, 0, 0, 0]],
  teen:      [[0, .4, .3, .12, .15, 0, 0, .03], [0, .15, .45, 0, .08, .07, .25, 0], [.02, .25, .12, .2, .15, .1, .12, .04], [.02, .15, .08, .15, .15, .25, .15, .05], [.02, .3, .12, .15, .3, .03, .05, .03], [0, .35, .3, .1, .2, 0, 0, .05]],
  college:   [[0, .4, .3, .15, .08, 0, .03, .04], [.05, .2, .45, 0, .05, .05, .2, 0], [.05, .2, .15, .15, .12, .06, .17, .1], [.05, .15, .1, .15, .1, .05, .25, .15], [.06, .25, .1, .15, .1, .05, .12, .17], [.04, .35, .3, .1, .08, 0, .05, .08]],
  worker:    [[.03, .35, .45, .1, 0, 0, .05, .02], [.15, .2, .45, 0, .01, .05, .14, 0], [.35, .15, .1, .12, .02, .06, .15, .05], [.3, .15, .1, .13, .02, .07, .15, .08], [.25, .3, .12, .1, .02, .05, .08, .08], [.08, .35, .4, .1, .02, .02, .01, .02]],
  homemaker: [[.05, .3, .55, .1, 0, 0, 0, 0], [.5, .18, .22, 0, 0, .02, .08, 0], [.5, .12, .08, .08, 0, .06, .11, .05], [.42, .15, .1, .1, 0, .05, .12, .06], [.5, .25, .1, .05, 0, .02, .03, .05], [.12, .4, .4, .05, 0, 0, 0, .03]],
  senior:    [[.03, .2, .7, .05, 0, 0, 0, .02], [.28, .3, .12, .03, 0, .17, .05, .05], [.3, .22, .1, .1, 0, .08, .14, .06], [.25, .28, .15, .12, 0, .06, .09, .05], [.2, .5, .18, .05, 0, .02, .02, .03], [.05, .4, .5, .03, 0, 0, 0, .02]],
  facility:  [[0, .05, .9, .05, 0, 0, 0, 0], [0, .2, .6, .05, 0, .1, 0, .05], [0, .25, .3, .2, 0, .15, 0, .1], [0, .25, .3, .25, 0, .1, 0, .1], [0, .4, .45, .08, 0, 0, 0, .07], [0, .15, .8, .05, 0, 0, 0, 0]]
};
function actProfile(P) {
  const g = P.occ.group, a = P.age;
  if (g === 'facility') return 'facility';
  if (a <= 5) return 'baby';
  if (g === 'kid') return 'kid';
  if (g === 'student') return 'teen';
  if (g === 'college') return 'college';
  if (a >= 65) return 'senior';
  return g === 'homemaker' ? 'homemaker' : 'worker';
}
function classRates(prof, h) {
  const mk = prof === 'baby' || prof === 'kid' ? 'kid' : prof === 'senior' || prof === 'facility' ? prof : 'std';
  const m = MEAL_H[mk][Math.floor(h) % 24];
  const w = ACT_RATE[prof][h < 5 ? 0 : h < 9 ? 1 : h < 12 ? 2 : h < 17 ? 3 : h < 21 ? 4 : 5];
  const sum = w.reduce((x, y) => x + y, 0);
  const r = { meal: m };
  ACT_CLS.forEach((c, i) => { r[c] = (1 - m) * w[i] / sum; });
  return r;
}
// 区分が決まらない文の受け皿（立場ごと）
const ACT_DEFAULT = { baby: '遊んでいる', facility: '施設で過ごしている' };
const actLabel = (x, g) => actOf(x) || ACT_DEFAULT[g] || 'くつろいでいる';
function entryW(e, ctx) {
  const o = Array.isArray(e) && e[3];
  let w = o && o.w != null ? o.w : 1;
  if (o && o.car) w *= CAR_USE[ctx.P.urb];
  const wx = ctx.wx;
  if (wx && (wx.rain || wx.snow) && !(o && o.wx) && isOutdoor(textOf(e))) w *= wx.heavy || wx.snow ? .12 : .3;
  return w * (typeof profileEntryWeight === 'function' ? profileEntryWeight(e, ctx.P) : 1);
}
function fromPool(list, ctx, filter) {
  const ok = list.filter(e => entryOK(e, ctx) && (!filter || filter(e)));
  if (!ok.length) return null;
  const wf = e => entryW(e, ctx);
  let tot = 0;
  ok.forEach(e => { tot += wf(e); });
  let r = rnd() * tot;
  for (const e of ok) { r -= wf(e); if (r < 0) return { e, n: ok.length, p: wf(e) / tot, ok, wf, tot }; }
  const e = ok[ok.length - 1];
  return { e, n: ok.length, p: wf(e) / tot, ok, wf, tot };
}
function fillText(x, P) {
  return x.replace('{min}', () => 3 + Math.floor(rnd() * 40))
    .replace('{dream}', () => pickU(DREAMS))
    .replace('{kdream}', () => pickU(KID_DREAMS))
    .replace('{friend}', () => {
      const sex = rnd() < .7 ? P.sex : (P.sex === 'm' ? 'f' : 'm');
      const n = pickGiven(P.birth.y, sex).k;
      return P.age <= 12 ? n + (sex === 'm' ? 'くん' : 'ちゃん') : n;
    });
}
// シフト勤務（all）は祝日も働く。平日勤務・月〜土勤務は祝日と年末年始が休み
function isWorkday(d, t, ctx) {
  if (d === 'all') return true;
  if (ctx.hol || ctx.brk) return false;
  return d === 'six' ? t.dow !== 0 : (t.dow >= 1 && t.dow <= 5);
}

// 店舗数からの直接換算ではなく、自由時間の一時点における低率の推定。
// 中高年を中心とし、利用経験率・年間利用率とは区別する。
function adultVenueRate(P, h) {
  if (P.age < 20 || P.age > 79 || P.sex !== 'm' || P.urb === 'rural' || P.occ.school || ['student', 'college', 'facility', 'prison'].includes(P.occ.group)) return 0;
  const age = P.age < 35 ? .35 : P.age < 40 ? .7 : P.age < 65 ? 1 : .45;
  return (h >= 20 && h < 24 ? .006 : h >= 18 && h < 20 ? .003 : h >= 12 && h < 18 ? .001 : 0) * age;
}

// 出勤する時間帯を先に選ぶ。夜勤と日勤、早番と遅番を同時には割り当てない。
function workProfile(P) {
  const job = P.occ.job;
  if (!job) return null;
  let sch = { ...SCHED[job.tag || P.occ.tag], ...(JOB_SCHEDULE[job.n] || {}) }, p = 1;
  const early = SHIFT_ALL_NIGHT.has(job.tag) && job.tag !== 'stream';
  let night = false, earlyDuty = null;
  if (job.o.nt) {
    const r = pickW([false, true], v => v ? job.o.nt : 1 - job.o.nt);
    p *= r.p;
    if (r.v) {
      if (early) { earlyDuty = job.o.nw; sch.d = 'all'; }
      else {
        night = true;
        sch = { d: 'all', h: job.o.nw || [21, 8.5], p: .7, night: true };
      }
    }
  }
  let [start, end] = sch.h;
  if (end < start) end += 24;
  const part = P.occ.form === 'パート';
  // 夜勤・夜の仕事のパートにも、日中の9〜18時制限を適用しない。
  if (part && !sch.night && !sch.evening) { start = Math.max(start, 9); end = Math.max(start, Math.min(end, 18)); }
  if ((sch.sh || part) && end > start) {
    const length = Math.min(part ? 5.5 : sch.sh, end - start);
    const starts = [];
    for (let h = start; h <= end - length + .001; h += .5) starts.push(h);
    if (end - length > starts[starts.length - 1] + .001) starts.push(end - length);
    const r = pickW(starts, h => (h === start ? .5 : 0) + .5 / starts.length);
    p *= r.p; start = r.v; end = start + length;
  }
  let sleep = sch.sleep || null;
  if (night) sleep = [end + 1, end + 8];
  else if (!sleep && end > 23) sleep = [end + 2, end + 10];
  else if (!sleep && start < 7) sleep = [start - 9, start - 1];
  // 早朝の仕込み・配達と日中の仕事は同じ日に両方あり得る。
  if (earlyDuty) sleep = [earlyDuty[0] - 8, earlyDuty[0] - 1];
  return { ...sch, h: [start, end], night, earlyDuty, sleep, p,
    dutyP: sch.p * (part ? .85 : P.occ.kind === 'nonreg' ? .85 : 1) };
}
function workSleepP(profile, curve, h, we, active) {
  if (!profile || !active) return sleepP(curve, h, we);
  if (profile.sleep) return inWin(h, ...profile.sleep) ? .92 : .025;
  return sleepP(curve, h, we);
}

function situation(P, t) {
  const h = t.hf;
  const oc = P.occ;
  const hol = holName(t), brk = isBreak(t);
  let we = t.dow === 0 || t.dow === 6 || !!hol || brk;
  // 学校の長期休みは、その人の学校の種類で判定する
  const isStudent = !!(oc.school || oc.en === 'yochi' || oc.group === 'college');
  const vacP = oc.group === 'college' ? univVac(t) : (oc.school || oc.en === 'yochi') ? schoolVac(t) : false;
  const ctx = { P, t, h, we, hol, brk, mo: t.mo, vacP, vac: isStudent ? vacP : schoolVac(t), season: seasonOf(t.mo), wx: wxOf(P.pref, t), eq: eqOf(P.pref, t) };
  let sp = 1, xp = 1;
  const br = p => { const ok = rnd() < p; sp *= ok ? p : 1 - p; return ok; };
  // disp：状況の欄に出す割合（ここまでの分岐の確率に掛ける）。label を省くと文の中身から区分を決める
  const done = (state, pick, label, disp) => {
    const tpl = textOf(pick.e);
    const x = fillText(tpl, P);
    const cond = Array.isArray(pick.e) && pick.e[3] ? pick.e[3] : null;
    if (label == null) label = actLabel(tpl, oc.group);
    const stateP = sp * (disp != null ? disp : 1);
    return { state, text: x, tpl, win: Array.isArray(pick.e) ? [pick.e[0], pick.e[1]] : null, cond, p: sp * xp * (pick.p != null ? pick.p : 1 / pick.n), stateP, stateLabel: label };
  };
  const a = P.age;
  const curve = oc.group === 'facility' ? 'senior' : a <= 5 ? 'small' : a <= 12 ? 'kid' : a <= 24 ? 'youth' : a <= 64 ? 'adult' : 'senior';
  const job = oc.job, tag = oc.tag;
  const sch = workProfile(P);
  // 勤務パターン・シフト開始時刻は内部の選択。表示する希少度に重複して掛けない。
  // 通勤手段：住んでいる地域の都会度で決める
  const pickMode = () => {
    const tbl = COMMUTE_MODE[P.urb];
    const wet = ctx.wx && (ctx.wx.rain || ctx.wx.snow);
    const r = pickW(Object.keys(tbl), k => tbl[k] * (h >= 0 && h < 5 && (k === 'rail' || k === 'bus') ? 0 : 1) * (wet && (k === 'bike' || k === 'walk') ? .5 : 1));
    xp *= r.p;
    ctx.mode = r.v;
  };
  const hb = P.hb || HB0;
  let workday = sch ? isWorkday(sch.d, t, ctx) : false;
  // お盆休み：平日勤務・月〜土勤務の人の半分ほどが休み
  if (workday && sch.d !== 'all' && isObon(t) && br(.5)) workday = false;
  if (sch && !workday && !hb.leave) ctx.we = we = true;
  if (hb.leave || hb.bed) workday = false;   // 産休・育休中、寝込んでいる日は働かない
  // 4月の新入社員（高卒・専門卒・大卒・院卒の1年目の正社員）
  if (t.mo === 4 && job && oc.kind !== 'nonreg' && oc.kind !== 'self' && oc.form !== 'パート') {
    const nhP = NEWHIRE_P[P.g];
    if (nhP && br(nhP)) ctx.nh = true;
  }
  // 入試の日（共通テスト・国公立大の前期試験・中学受験）は、受ける人は試験会場にいる
  const ex = !hb.bed && examOf(P, ctx);
  if (ex && inWin(h, ex[0], ex[1]) && br(ex[2])) {
    const pk = fromPool(EXAM_TX, ctx);
    if (pk) return done('school', pk, '入試を受けている');
  }

  // 刑務所で服役中：刑務所の日課どおりに過ごす
  if (oc.group === 'prison') {
    if (inWin(h, 21, 6.75) && br(.96)) return done('sleep', fromPool(PRISON_TX.sleep, ctx), '眠っている');
    const pk = fromPool(PRISON_TX.day, ctx) || { e: PRISON_TX.day[PRISON_TX.day.length - 1], n: 1 };
    const isW = e => !!(e[3] && e[3].st === 'work');
    const isWork = isW(pk.e);
    const share = pk.ok ? pk.ok.reduce((s, e) => s + (isW(e) === isWork ? pk.wf(e) : 0), 0) / pk.tot : 1;
    return done(isWork ? 'work' : 'off', pk, isWork ? '刑務作業中' : '刑務所で過ごしている', share);
  }
  // 寝込んでいる（発熱・インフルエンザ・胃腸炎）：仕事も学校も休んで家で過ごす
  if (hb.bed && oc.group !== 'facility') {
    if (br(Math.max(sleepP(curve, h, true), .4))) {
      const pk = fromPool(SICK_TX.sleep, ctx);
      if (pk) return done('sleep', pk, '眠っている');
    }
    const pk = fromPool(a <= 5 ? SICK_TX.baby : SICK_TX.any, ctx);
    if (pk) return done('off', pk, '体調を崩している');
  }
  // 早朝の配達・仕込み。昼の仕事と両立する職種だけ別枠。
  if (sch && sch.earlyDuty && workday && !hb.leave && inWin(h, ...sch.earlyDuty)) {
    if (br(.7)) {
      const pk = fromPool(NIGHT_TX[tag] || NIGHT_TX.any, ctx) || fromPool(NIGHT_TX.any, ctx);
      if (pk) return done('work', pk, '早朝の仕事中');
    }
  }
  if (sch && sch.earlyDuty && workday && !hb.leave && !NO_COMMUTE.has(tag) && oc.kind !== 'self') {
    const [start, end] = sch.earlyDuty;
    const heading = inWin(h, start - 1, start), returning = inWin(h, end, end + 1);
    if ((heading || returning) && br(.45)) {
      pickMode();
      const pool = heading ? COMMUTE_TX.am : COMMUTE_TX.pm;
      const pk = fromPool(pool, ctx) || fromPool(pool.filter(e => !(e[3] && e[3].mode)), ctx);
      if (pk) return done('commute', pk, heading ? '通勤中' : '帰宅途中');
    }
  }
  // 眠っているか
  if (br(workSleepP(sch, curve, h, we || vacP, workday))) {
    let pool;
    if (sch && sch.night && inWin(h, ...sch.sleep) && workday) pool = SLEEP_TX.dayAfterNight;
    else if (oc.group === 'facility') pool = SLEEP_TX.facility;
    else if (oc.group === 'baby') pool = SLEEP_TX.baby;
    else if (a <= 12) pool = SLEEP_TX.kid;
    else if (a <= 24) pool = SLEEP_TX.youth.concat(SLEEP_TX.any);
    else if (a >= 65) pool = SLEEP_TX.senior.concat(SLEEP_TX.any);
    else pool = SLEEP_TX.any;
    if (h >= 12 && h < 16.5 && a > 24 && ['homemaker', 'senior', 'jobless', 'rest'].includes(oc.group)) pool = SLEEP_TX.nap.concat(SLEEP_TX.senior.filter(e => typeof e !== 'string' && e[0] >= 12));
    const pk = fromPool(pool, ctx) || fromPool(SLEEP_TX.any.filter(e => typeof e === 'string'), ctx);
    return done('sleep', pk, sch && sch.night && workday && inWin(h, ...sch.sleep) ? '夜勤明けで眠っている' : '眠っている');
  }
  // 保育園・幼稚園
  if (oc.en && !we && !(oc.en === 'yochi' && vacP)) {
    const [s, e] = oc.en === 'yochi' ? [9, 14] : [8.5, 17.5];
    if (inWin(h, s, e) && br(.92)) {
      const pk = fromPool(EN_TX, ctx);
      if (pk) return done('school', pk, oc.en === 'yochi' ? '幼稚園にいる' : '保育園にいる');
    }
  }
  // 学校
  if (oc.school && !we && !vacP) {
    const [s, e] = oc.school === 'elem' ? [8, 15.3] : [8.2, 15.6];
    if (inWin(h, s, e) && br(oc.tsushin ? .2 : .96)) {
      const pk = fromPool(SCHOOL_TX[oc.school], ctx);
      if (pk) return done('school', pk, '学校で授業中');
    }
  }
  // 通学（登校・下校）。中高生は部活のあと遅めに帰る人も多い
  if (oc.school && !we && !vacP && !oc.tsushin) {
    const elem = oc.school === 'elem';
    const [s, e] = elem ? [8, 15.3] : [8.2, 15.6];
    let cp = 0;
    if (inWin(h, s - (elem ? .8 : 1.2), s)) cp = .6;
    else if (elem ? inWin(h, e, e + 1) : inWin(h, e, e + 3.5)) cp = elem ? .35 : h - e < 1 ? .25 : .15;
    if (cp && br(cp)) { const pk = schoolCommute(); if (pk) return done('commute', pk, '通学中'); }
  }
  // 入浴・シャワー（施設・刑務所は別の流れ）
  const tryBath = () => {
    const bp = bathP(P, h);
    if (!bp || !br(bp)) return null;
    const pk = fromPool(BATH_TX.concat(ownSpecial('入浴中')), ctx);
    return pk ? done('off', pk, '入浴中') : null;
  };
  const tryGroom = () => {
    const gp = groomP(P, h, ctx.we);
    if (!gp || !br(gp)) return null;
    const pk = fromPool(GROOM_TX.concat(ownSpecial('身じたく中')), ctx);
    return pk ? done('off', pk, '身じたく中') : null;
  };
  const tryDrink = () => {
    const dp = hb.preg ? 0 : drinkP(P, h, ctx.we);
    if (!dp || !br(dp)) return null;
    const pk = fromPool(DRINK_TX.concat(ownSpecial('晩酌している')), ctx);
    return pk ? done('off', pk, '晩酌している') : null;
  };
  // 暦の出来事・空・地震の場面（出来事ごとの割合 sh で、まず出来事の場面になるかを決める）
  // 出来事を割合で選んでから、その出来事の文を重みで選ぶ
  const tryEvent = () => {
    const list = evPoolOf(oc.group).filter(e => entryOK(e, ctx));
    if (!list.length) return null;
    const by = new Map();
    list.forEach(e => {
      const o = e[3], k = o.eq ? 'eq' : [].concat(o.ev || o.sakura || o.koyo || o.moon || o.sun)[0];
      const b = by.get(k) || { sh: 0, l: [] };
      b.sh = Math.max(b.sh, evShareOf(e, ctx)); b.l.push(e); by.set(k, b);
    });
    const ks = [...by.keys()];
    const ep = Math.min(.6, ks.reduce((x, k) => x + by.get(k).sh, 0));
    if (!(ep > 0) || !br(ep)) return null;
    const kr = pickW(ks, k => by.get(k).sh);
    const pk = fromPool(by.get(kr.v).l, ctx);
    return pk ? done('off', { e: pk.e, p: kr.p * pk.p }, pk.e[3].lb) : null;
  };
  // 自分の立場の自由時間の文のうち、入浴・身じたく・晩酌にあたるもの
  function ownSpecial(label) {
    const key = oc.group + '|' + label;
    if (!SPECIAL_MEMO[key]) SPECIAL_MEMO[key] = offPoolsOf(oc.group).flatMap(([, list, f]) => list.filter(e => (!f || f(e)) && actLabel(textOf(e), oc.group) === label));
    return SPECIAL_MEMO[key];
  }
  // 通学の文（自分の立場の自由時間の文のうち「通学中」にあたるもの）
  function schoolCommute() {
    return fromPool(offPoolsOf(oc.group).flatMap(([, list, f]) => list.filter(e => (!f || f(e)) && actLabel(textOf(e), oc.group) === '通学中')), ctx);
  }
  // 大学・専門学校
  if (oc.group === 'college') {
    if (!we && !vacP) {
      const cp = inWin(h, 7.5, 9.5) ? .35 : inWin(h, 16, 19) ? .2 : 0;
      if (cp && br(cp)) { const pk = schoolCommute(); if (pk) return done('commute', pk, '通学中'); }
    }
    if (!we && !vacP && inWin(h, 9, 18) && br(.55)) {
      ctx.camp = true;
      const pk = fromPool(OFF_TX.college, ctx, e => e[3] && (e[3].camp || e[3].yr || e[3].senmon || e[3].grad));
      if (pk) return done('school', pk, 'キャンパスにいる');
    }
    const bath = tryEvent() || tryBath() || tryGroom() || tryDrink();
    if (bath) return bath;
    return pickOff(offPoolsOf('college')) || done('off', { e: FALLBACK.college, n: 1 });
  }
  // 仕事
  if (job && workday) {
    const [st, en] = sch.h;
    const part = oc.form === 'パート';
    const shift = !!sch.sh || part || sch.night;
    let working = inWin(h, st, en) ? sch.dutyP : 0;
    if (!working && sch.ot && !part && inWin(h, sch.ot[0], sch.ot[1])) {
      const elapsed = (h - sch.ot[0] + 24) % 24;
      working = sch.ot[2] * (oc.kind === 'nonreg' ? .5 : 1) * Math.pow(1 - elapsed / (sch.ot[1] - sch.ot[0]), 1.5);
    }
    if (working && br(working)) {
      // 昼休み（12〜13時）
      if (inWin(h, 12, 13) && !shift && br(.45)) {
        const lp = fromPool(LUNCH_TX, ctx);
        if (lp) return done('off', lp, '昼休み中');
      }
      if (ctx.nh) {   // 入社式・新人研修
        const nk = fromPool(NEWHIRE_TX, ctx);
        if (nk && br(.65)) return done('work', nk, (nk.e[3] && nk.e[3].lb) || '仕事中');
      }
      const nightPool = NIGHT_JOB_TX[job.n] || (job.o.nightUseWork ? WORK_TX[tag] : NIGHT_TX[tag]);
      const pk = sch.night ? fromPool(nightPool || NIGHT_TX.any, ctx) || fromPool(NIGHT_TX.any, ctx) : fromPool(WORK_TX[tag] || [], ctx) || (tag === 'it' ? fromPool(WORK_TX.office, ctx) : null);
      if (pk) return done('work', pk, sch.night ? '夜勤・早朝の仕事中' : '仕事中');
      return done('work', { e: '職場で、目の前の仕事を黙々と片付けているところでした', n: 1 }, '仕事中');
    }
    if (!NO_COMMUTE.has(tag) && oc.kind !== 'self') {
      // 通勤・帰宅の割合（シフト勤務は出勤・退勤の時刻がばらける。定時の仕事は帰りが遅くなるほど少ない）
      const amP = inWin(h, st - 1, st) ? .65 * sch.dutyP : 0;
      const ot = !!sch.ot && !part;
      const dh = (h - en + 24) % 24;
      const pmP = dh < 1 ? (shift ? .5 * sch.dutyP : .45) : dh < 2 ? (ot ? .22 : .12) : ot && dh < 3.5 ? .1 : ot && dh < 5 ? .05 : 0;
      if (amP && br(amP)) { pickMode(); return done('commute', fromPool(COMMUTE_TX.am, ctx) || fromPool(COMMUTE_TX.am.filter(e => !(e[3] && e[3].mode)), ctx), '通勤中'); }
      if (pmP && br(pmP)) { pickMode(); return done('commute', fromPool(COMMUTE_TX.pm, ctx) || fromPool(COMMUTE_TX.pm.filter(e => !(e[3] && e[3].mode)), ctx), '帰宅途中'); }
    }
  }
  // 学校の外・家
  const g = oc.group;
  // 利用者は仕事・学校・睡眠の判定後だけ。文を増やしても合計の選択確率は変えない。
  const avRate = adultVenueRate(P, h);
  if (avRate && br(avRate)) {
    const pk = fromPool(ADULT_VENUE_TX, ctx);
    if (pk) return done('off', pk, pk.e[3].lb);
  }
  const evp = tryEvent();
  if (evp) return evp;
  if (g !== 'facility') { const bath = tryBath() || tryGroom() || tryDrink(); if (bath) return bath; }
  return pickOff(offPoolsOf(g)) || done('off', { e: FALLBACK[g] || FALLBACK.adult, n: 1 });

  // 過ごし方の種類（食事・家事・テレビ…）を時間帯の割合で選び、その種類の文から1つ選ぶ。
  // 欄に出す割合は「種類の割合 × その種類のうち同じ区分の文の割合」
  function pickOff(pools) {
    const rates = wxRates(classRates(actProfile(P), h), ctx.wx, h);
    const byC = {};
    const sep = oc.group !== 'facility';   // 入浴・身じたく・晩酌は別の割合で決めるので、ここでは選ばない
    const sepC = !!(oc.school || oc.group === 'college');   // 学生の通学も別に決める
    for (const [pw, list, filter] of pools) {
      const ok = list.filter(e => entryOK(e, ctx) && (!filter || filter(e)) && !(sep && SPECIAL_LABELS.has(actLabel(textOf(e), oc.group))) && !(sepC && actLabel(textOf(e), oc.group) === '通学中'));
      let tot = 0;
      ok.forEach(e => { tot += entryW(e, ctx); });
      ok.forEach(e => {
        const lb = actLabel(textOf(e), oc.group);
        const c = ACT_CLASS[lb] || 'rest';
        const w = pw * entryW(e, ctx) / tot;
        const b = byC[c] = byC[c] || { w: 0, list: [] };
        b.w += w; b.list.push([e, w, lb]);
      });
    }
    const cs = Object.keys(byC);
    if (!cs.length) return null;
    const rw = c => Math.max(rates[c] || 0, .01);
    const cr = pickW(cs, rw);
    const B = byC[cr.v];
    const tr = pickW(B.list, x => x[1]);
    const lb = tr.v[2];
    const share = B.list.reduce((s, x) => s + (x[2] === lb ? x[1] : 0), 0) / B.w;
    return done('off', { e: tr.v[0], p: cr.p * tr.p }, lb, rw(cr.v) * share);
  }
}
// 自由時間の文の出どころ（主婦・主夫や高齢者などは、自分向けの文7割・大人全般の文3割）
function offPoolsOf(g) {
  if (g === 'college') return [[1, OFF_TX.college, e => !(e[3] && e[3].camp)]];
  const own = OFF_TX[g];
  if (!own) return [[1, OFF_TX.adult]];
  // 大人全般の文のうち、勤め先があることを前提にした文（仕事帰り・同僚・上司など）は除く
  return ['homemaker', 'senior', 'jobless', 'rest'].includes(g) ? [[.7, own], [.3, OFF_TX.adult, e => !/仕事帰り|仕事のあと|仕事終わり|同僚|上司|職場|会社|出勤|退勤|残業|取引先|始業前|昼休み|休憩時間|有給|代休|仕事の話/.test(textOf(e))]] : [[1, own]];
}
// 出来事の場面の文の出どころ（立場ごと。主婦・主夫や高齢者などは大人全般の文も）
const EV_POOL_MEMO = {};
function evPoolOf(g) {
  if (EV_POOL_MEMO[g]) return EV_POOL_MEMO[g];
  const O = EV_TX.off, own = O[g] || [];
  const extra = ['homemaker', 'senior', 'jobless', 'rest'].includes(g) ? O.adult : [];
  return (EV_POOL_MEMO[g] = own.concat(extra, g === 'baby' || g === 'facility' ? [] : O.all));
}
// 新入社員の割合（4月の1年目の正社員のうち。学年index 13：高卒、15：専門卒、17：大卒、19：院卒）
const NEWHIRE_P = { 13: .85, 15: .45, 17: .7, 19: .6 };
// 中学受験をする小6の割合（首都圏・関西）
const CHUJU_P = { 東京都: .22, 神奈川県: .15, 埼玉県: .12, 千葉県: .1, 大阪府: .09, 兵庫県: .1, 京都府: .1, 奈良県: .1 };
// 入試を受けている時間帯と割合 [始め, 終わり, 割合]
function examOf(P, ctx) {
  const oc = P.occ, E = ctx.ev || (ctx.ev = eventsOn(ctx.t, P.pref));
  const hs3 = oc.school === 'teen' && P.g === 12 && !oc.tsushin && /高校|高等/.test(oc.label);
  if (E.has('kyotsu') && (hs3 || oc.ronin)) return [8.4, 18.3, oc.ronin ? .8 : .45];
  if (E.has('kokkou') && (hs3 || oc.ronin)) return [9, 17, oc.ronin ? .45 : .22];
  if (E.has('chuju') && oc.school === 'elem' && P.g === 6) return [8, 15, CHUJU_P[P.pref.n] || .08];
  return null;
}
const SPECIAL_LABELS = new Set(['入浴中', '身じたく中', '晩酌している']);
const SPECIAL_MEMO = {};
const FALLBACK = {
  baby: '親のひざの上で、きょろきょろとあたりを見回しているところでした',
  kid: '家のリビングで、ごろごろしながらテレビを見ているところでした',
  student: '自分の部屋で、ぼんやりスマートフォンを眺めているところでした',
  college: '部屋で、ぼんやりスマートフォンを眺めているところでした',
  facility: '施設の自室で、静かに窓の外を眺めているところでした',
  adult: '家で、なんとなくスマートフォンを眺めているところでした'
};

// ---- 時刻 ----
const DOW_JA = ['日', '月', '火', '水', '木', '金', '土'];
function jstNow() {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Tokyo', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', weekday: 'short', hourCycle: 'h23' }).formatToParts(new Date());
  const o = {}; parts.forEach(p => o[p.type] = p.value);
  const t = { y: +o.year, mo: +o.month, d: +o.day, h: +o.hour % 24, mi: +o.minute, dow: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(o.weekday) };
  t.hf = t.h + t.mi / 60;
  return t;
}
// 「ランダムな時刻」：この1年のうちの、ある日のある時刻
function randomTime() {
  const now = jstNow();
  const dt = new Date(Date.UTC(now.y, now.mo - 1, now.d) - Math.floor(rnd() * 365) * 864e5);
  const t = { y: dt.getUTCFullYear(), mo: dt.getUTCMonth() + 1, d: dt.getUTCDate(), dow: dt.getUTCDay(), h: Math.floor(rnd() * 24), mi: Math.floor(rnd() * 60), rand: true };
  t.hf = t.h + t.mi / 60;
  return t;
}
function fmtClock(t) {
  const ap = t.h < 12 ? '午前' : '午後';
  return `${ap}${t.h % 12}時${String(t.mi).padStart(2, '0')}分`;
}
function fmtWhen(t) {
  const dw = `${DOW_JA[t.dow]}${holName(t) ? '・祝' : ''}`;
  return `${t.rand ? 'ある年の' : ''}${t.mo}月${t.d}日（${dw}）${fmtClock(t)}`;
}

// ---- 出かけている人のいる場所 ----
// 飲み・遊び・デートなどで出かけている人は、いる場所をその地域の中心街にする（住まいは別に残す）
// 「都道府県」: [[行き先の都道府県（同じなら空）, 市区町村, 区, 重み], ...]
const HUBS = {
  北海道: [['', '札幌市', '中央区', 1]], 青森県: [['', '青森市', '', .5], ['', '八戸市', '', .3], ['', '弘前市', '', .2]], 岩手県: [['', '盛岡市', '', 1]],
  宮城県: [['', '仙台市', '青葉区', 1]], 秋田県: [['', '秋田市', '', 1]], 山形県: [['', '山形市', '', 1]],
  福島県: [['', '郡山市', '', .45], ['', '福島市', '', .3], ['', 'いわき市', '', .25]],
  茨城県: [['', '水戸市', '', .45], ['', 'つくば市', '', .35], ['東京都', '台東区', '', .2]], 栃木県: [['', '宇都宮市', '', 1]],
  群馬県: [['', '高崎市', '', .55], ['', '前橋市', '', .45]],
  埼玉県: [['', 'さいたま市', '大宮区', .35], ['', '川越市', '', .15], ['東京都', '豊島区', '', .3], ['東京都', '新宿区', '', .2]],
  千葉県: [['', '千葉市', '中央区', .35], ['', '船橋市', '', .2], ['', '柏市', '', .15], ['東京都', '新宿区', '', .15], ['東京都', '中央区', '', .15]],
  東京都: [['', '新宿区', '', .25], ['', '渋谷区', '', .2], ['', '豊島区', '', .15], ['', '港区', '', .15], ['', '中央区', '', .1], ['', '台東区', '', .1], ['', '千代田区', '', .05]],
  神奈川県: [['', '横浜市', '西区', .3], ['', '横浜市', '中区', .2], ['', '川崎市', '川崎区', .15], ['', '藤沢市', '', .05], ['東京都', '渋谷区', '', .15], ['東京都', '港区', '', .15]],
  新潟県: [['', '新潟市', '中央区', 1]], 富山県: [['', '富山市', '', 1]], 石川県: [['', '金沢市', '', 1]], 福井県: [['', '福井市', '', 1]], 山梨県: [['', '甲府市', '', 1]],
  長野県: [['', '長野市', '', .5], ['', '松本市', '', .5]], 岐阜県: [['', '岐阜市', '', .6], ['愛知県', '名古屋市', '中村区', .4]],
  静岡県: [['', '静岡市', '葵区', .5], ['', '浜松市', '中央区', .5]], 愛知県: [['', '名古屋市', '中区', .55], ['', '名古屋市', '中村区', .45]],
  三重県: [['', '四日市市', '', .4], ['', '津市', '', .3], ['愛知県', '名古屋市', '中村区', .3]], 滋賀県: [['', '大津市', '', .3], ['', '草津市', '', .3], ['京都府', '京都市', '下京区', .4]],
  京都府: [['', '京都市', '中京区', .5], ['', '京都市', '下京区', .5]], 大阪府: [['', '大阪市', '北区', .45], ['', '大阪市', '中央区', .45], ['', '大阪市', '浪速区', .1]],
  兵庫県: [['', '神戸市', '中央区', .55], ['', '姫路市', '', .2], ['大阪府', '大阪市', '北区', .25]], 奈良県: [['', '奈良市', '', .5], ['大阪府', '大阪市', '中央区', .5]],
  和歌山県: [['', '和歌山市', '', 1]], 鳥取県: [['', '鳥取市', '', .5], ['', '米子市', '', .5]], 島根県: [['', '松江市', '', .6], ['', '出雲市', '', .4]],
  岡山県: [['', '岡山市', '北区', .8], ['', '倉敷市', '', .2]], 広島県: [['', '広島市', '中区', .8], ['', '福山市', '', .2]],
  山口県: [['', '下関市', '', .4], ['', '山口市', '', .3], ['', '周南市', '', .3]], 徳島県: [['', '徳島市', '', 1]], 香川県: [['', '高松市', '', 1]], 愛媛県: [['', '松山市', '', 1]], 高知県: [['', '高知市', '', 1]],
  福岡県: [['', '福岡市', '中央区', .5], ['', '福岡市', '博多区', .35], ['', '北九州市', '小倉北区', .15]], 佐賀県: [['', '佐賀市', '', .6], ['福岡県', '福岡市', '中央区', .4]],
  長崎県: [['', '長崎市', '', .6], ['', '佐世保市', '', .4]], 熊本県: [['', '熊本市', '中央区', 1]], 大分県: [['', '大分市', '', .7], ['', '別府市', '', .3]],
  宮崎県: [['', '宮崎市', '', 1]], 鹿児島県: [['', '鹿児島市', '', 1]], 沖縄県: [['', '那覇市', '', 1]]
};
const OUTING_RE = /キャバクラ|性風俗店|居酒屋|飲み会|二次会|スナック|バーで|ダーツバー|立ち飲み|ビアガーデン|はしご酒|飲みに行|繁華街|歓楽街|ネオン|無料案内所|雑居ビル|看板の店|窓のない店|向かいの店から|カラオケ|ボウリング|ビリヤード|ライブハウス|映画館|コンサート|ゲームセンター|デート|新年会|忘年会|歓迎会|送別会|打ち上げ|コンパ|デパート|初売り|福袋|イルミネーション|美術館/;
const OUTING_NOT = /公民館|カラオケ喫茶|オンライン飲み会|彼氏の部屋|家族で出かけた|わが子|アルバイト/;
// 仕事・学校で住まいの外にいる人（国勢調査の通勤・通学の傾向を大づかみに）
// 住まいの市区町村の外へ通う割合（都市度ごと）
const OUT_P = {
  work: { metro: .76, city: .67, mid: .57, rural: .48 },
  high: { metro: .45, city: .4, mid: .35, rural: .5 },
  junior: { metro: .1, city: .06, mid: .04, rural: .03 },
  exam: { metro: .7, city: .7, mid: .75, rural: .85 },
  exam6: { metro: .6, city: .5, mid: .5, rural: .5 },
  univ: { metro: .75, city: .75, mid: .8, rural: .85 }
};
// 都道府県をまたぐ通勤・通学（外へ通う人のうちの割合）。国勢調査2020の従業地・通学地集計の県外就業率（埼玉・千葉・神奈川は東京へ約23〜26%、奈良27%のうち8割が大阪 など）に合うよう tools/commute.js で調整
const CROSS = {
  埼玉県: { work: [['東京都', .5]], high: [['東京都', .12]], univ: [['東京都', .5]] },
  千葉県: { work: [['東京都', .5]], high: [['東京都', .1]], univ: [['東京都', .5]] },
  神奈川県: { work: [['東京都', .42]], high: [['東京都', .1]], univ: [['東京都', .4]] },
  東京都: { work: [['神奈川県', .045], ['埼玉県', .02], ['千葉県', .02]], univ: [['神奈川県', .08], ['埼玉県', .03], ['千葉県', .03]] },
  茨城県: { work: [['東京都', .2], ['千葉県', .1]], univ: [['東京都', .25], ['千葉県', .05]] },
  栃木県: { work: [['茨城県', .03], ['群馬県', .02], ['東京都', .02]], univ: [['東京都', .15]] },
  群馬県: { work: [['埼玉県', .05], ['栃木県', .025], ['東京都', .02]], univ: [['東京都', .15], ['埼玉県', .08]] },
  山梨県: { work: [['東京都', .05]], univ: [['東京都', .15]] },
  奈良県: { work: [['大阪府', .44], ['京都府', .19]], high: [['大阪府', .1], ['京都府', .04]], univ: [['大阪府', .3], ['京都府', .2]] },
  兵庫県: { work: [['大阪府', .3]], high: [['大阪府', .03]], univ: [['大阪府', .25]] },
  京都府: { work: [['大阪府', .17], ['滋賀県', .04]], univ: [['大阪府', .15], ['滋賀県', .05]] },
  大阪府: { work: [['兵庫県', .07], ['京都府', .03], ['奈良県', .015]], univ: [['京都府', .12], ['兵庫県', .08], ['奈良県', .02]] },
  滋賀県: { work: [['京都府', .3], ['大阪府', .1]], univ: [['京都府', .4], ['大阪府', .1]] },
  和歌山県: { work: [['大阪府', .15]], univ: [['大阪府', .3]] },
  岐阜県: { work: [['愛知県', .36]], high: [['愛知県', .05]], univ: [['愛知県', .35]] },
  三重県: { work: [['愛知県', .25]], univ: [['愛知県', .2]] },
  愛知県: { work: [['岐阜県', .02], ['三重県', .015]] },
  鳥取県: { work: [['島根県', .05]] },
  山口県: { work: [['福岡県', .03]], univ: [['福岡県', .15]] },
  佐賀県: { work: [['福岡県', .25]], univ: [['福岡県', .3]] }
};
// 職場が集まる場所（都心・駅前）と、大学が集まる場所。なければ HUBS（中心街）で代わりにする
const BIZ = {
  東京都: [['千代田区', '', .2], ['中央区', '', .15], ['港区', '', .2], ['新宿区', '', .15], ['渋谷区', '', .1], ['品川区', '', .1], ['豊島区', '', .05], ['江東区', '', .05]],
  大阪府: [['大阪市', '北区', .35], ['大阪市', '中央区', .35], ['大阪市', '西区', .1], ['大阪市', '淀川区', .1], ['大阪市', '福島区', .1]],
  愛知県: [['名古屋市', '中区', .4], ['名古屋市', '中村区', .4], ['名古屋市', '東区', .2]],
  京都府: [['京都市', '下京区', .4], ['京都市', '中京区', .4], ['京都市', '南区', .2]],
  福岡県: [['福岡市', '博多区', .5], ['福岡市', '中央区', .5]]
};
const UNIV = {
  東京都: [['新宿区', '', .2], ['千代田区', '', .15], ['文京区', '', .15], ['港区', '', .1], ['渋谷区', '', .1], ['世田谷区', '', .1], ['豊島区', '', .1], ['八王子市', '', .1]],
  大阪府: [['大阪市', '北区', .2], ['吹田市', '', .3], ['大阪市', '住吉区', .2], ['枚方市', '', .15], ['堺市', '中区', .15]],
  京都府: [['京都市', '左京区', .35], ['京都市', '上京区', .25], ['京都市', '北区', .2], ['京都市', '伏見区', .2]],
  愛知県: [['名古屋市', '千種区', .35], ['名古屋市', '昭和区', .25], ['名古屋市', '天白区', .2], ['豊田市', '', .2]],
  福岡県: [['福岡市', '西区', .35], ['福岡市', '城南区', .25], ['福岡市', '中央区', .2], ['北九州市', '小倉北区', .2]]
};
// 生活圏（通勤・通学・遊びに出かける範囲）。広い道県や離島で、行き先が遠くなりすぎないようにする
// 都道府県ごとに [市区町村（空白区切り）, 都道府県をまたぐ通勤・通学の倍率（CROSS に掛ける）]。書いていない市区町村は最初の圏。
// 倍率を省くと、最初の圏は1、ほかの圏は0（またがない）。1つだけの圏は、その市町村の中で働き・学び・遊ぶ
const ZONES = {
  北海道: [['札幌市 江別市 小樽市 千歳市 岩見沢市 余市町 石狩市 北広島市 恵庭市 苫小牧市 滝川市'], ['室蘭市 登別市 伊達市'], ['倶知安町 ニセコ町'], ['函館市'], ['旭川市 美瑛町 富良野市 名寄市'], ['帯広市 音更町'], ['釧路市'], ['根室市 中標津町'], ['北見市 網走市'], ['紋別市'], ['稚内市'], ['留萌市']],
  青森県: [['青森市 弘前市 黒石市 五所川原市 つがる市 平川市 鰺ヶ沢町 深浦町'], ['八戸市 十和田市 三沢市 おいらせ町 七戸町 三戸町 六ヶ所村'], ['むつ市 大間町']],
  岩手県: [['盛岡市 滝沢市 雫石町 紫波町 花巻市'], ['北上市 奥州市 一関市 平泉町'], ['宮古市'], ['釜石市 大槌町 大船渡市 陸前高田市 遠野市'], ['久慈市 二戸市']],
  宮城県: [['仙台市 名取市 多賀城市 塩竈市 富谷市 岩沼市 利府町 松島町 大河原町 角田市 白石市 蔵王町 大崎市 石巻市 登米市 栗原市'], ['気仙沼市 南三陸町']],
  秋田県: [['秋田市 潟上市 男鹿市 八郎潟町 由利本荘市 にかほ市 能代市'], ['横手市 大仙市 湯沢市 美郷町 仙北市'], ['大館市 鹿角市 北秋田市']],
  山形県: [['山形市 天童市 東根市 寒河江市 上山市 村山市 尾花沢市 大石田町'], ['米沢市 南陽市 長井市'], ['鶴岡市 酒田市 庄内町'], ['新庄市']],
  福島県: [['郡山市 福島市 須賀川市 白河市 二本松市 伊達市 本宮市 田村市'], ['いわき市'], ['南相馬市 相馬市'], ['会津若松市 喜多方市 猪苗代町 南会津町 会津美里町']],
  茨城県: [['つくば市 土浦市 取手市 牛久市 守谷市 龍ケ崎市 常総市 坂東市 古河市 結城市 筑西市 石岡市'], ['水戸市 ひたちなか市 日立市 那珂市 笠間市 大洗町'], ['神栖市 鹿嶋市 鉾田市']],
  群馬県: [['高崎市 前橋市 太田市 伊勢崎市 桐生市 館林市 渋川市 藤岡市 安中市 みどり市 富岡市 沼田市 中之条町 大泉町 吉岡町'], ['草津町']],
  埼玉県: [['さいたま市'], ['秩父市']],
  千葉県: [['千葉市'], ['銚子市 香取市'], ['館山市 鴨川市'], ['茂原市 大網白里市 九十九里町 一宮町', .3]],
  東京都: [['新宿区'], ['大島町'], ['八丈町'], ['奥多摩町'], ['檜原村']],
  神奈川県: [['横浜市'], ['小田原市 箱根町 真鶴町 南足柄市 開成町', .3]],
  新潟県: [['新潟市 新発田市 三条市 燕市 見附市 五泉市 村上市'], ['長岡市 柏崎市 十日町市 南魚沼市 魚沼市 湯沢町'], ['上越市 糸魚川市 妙高市'], ['佐渡市']],
  石川県: [['金沢市'], ['七尾市 輪島市 珠洲市 能登町']],
  福井県: [['福井市'], ['敦賀市 小浜市 美浜町 高浜町']],
  山梨県: [['甲府市 甲斐市 南アルプス市 笛吹市 北杜市 山梨市 中央市 韮崎市 身延町', .3], ['富士吉田市 都留市 富士河口湖町 大月市', 2]],
  長野県: [['長野市 須坂市 千曲市 中野市'], ['上田市 佐久市 軽井沢町'], ['松本市 安曇野市 塩尻市 白馬村 木曽町'], ['諏訪市 茅野市'], ['飯田市 伊那市 駒ヶ根市']],
  岐阜県: [['岐阜市'], ['高山市 下呂市 白川村'], ['郡上市']],
  静岡県: [['静岡市 藤枝市 焼津市 島田市'], ['浜松市 磐田市 掛川市 袋井市 湖西市 菊川市'], ['沼津市 富士市 富士宮市 三島市 御殿場市 裾野市 熱海市 伊豆市 伊東市'], ['下田市']],
  愛知県: [['名古屋市'], ['豊橋市 豊川市 蒲郡市']],
  三重県: [['四日市市 鈴鹿市 桑名市 亀山市 いなべ市 菰野町'], ['津市 松阪市 伊勢市 鳥羽市 志摩市'], ['伊賀市 名張市'], ['尾鷲市 熊野市']],
  滋賀県: [['大津市'], ['彦根市 長浜市 米原市']],
  京都府: [['京都市'], ['舞鶴市 福知山市 綾部市'], ['京丹後市 宮津市 与謝野町']],
  兵庫県: [['神戸市'], ['姫路市 たつの市 赤穂市'], ['豊岡市 香美町'], ['洲本市 淡路市']],
  奈良県: [['奈良市'], ['十津川村']],
  和歌山県: [['和歌山市 橋本市 紀の川市 岩出市 海南市 有田市 高野町'], ['御坊市 みなべ町 田辺市 白浜町'], ['新宮市 那智勝浦町']],
  鳥取県: [['鳥取市 岩美町 八頭町', .1], ['倉吉市 湯梨浜町 北栄町 琴浦町', 0], ['米子市 境港市 大山町', 4]],
  島根県: [['松江市 出雲市 安来市 雲南市 奥出雲町 大田市'], ['浜田市 益田市 江津市 津和野町'], ['隠岐の島町']],
  岡山県: [['岡山市'], ['津山市 真庭市 美作市']],
  広島県: [['広島市 呉市 東広島市 廿日市市 海田町 府中町 江田島市 竹原市'], ['福山市 尾道市 三原市 府中市 世羅町'], ['三次市 庄原市'], ['大崎上島町']],
  山口県: [['山口市 防府市 宇部市 山陽小野田市 美祢市', .4], ['下関市', 4], ['周南市 下松市 光市 岩国市 柳井市 周防大島町', 0], ['萩市 長門市', 0]],
  徳島県: [['徳島市'], ['美馬市 三好市']],
  香川県: [['高松市'], ['小豆島町']],
  愛媛県: [['松山市 伊予市 東温市 松前町 砥部町 内子町'], ['今治市 新居浜市 西条市 四国中央市'], ['宇和島市 大洲市 八幡浜市 西予市']],
  高知県: [['高知市 南国市 香南市 土佐市 香美市 いの町 須崎市'], ['安芸市 室戸市'], ['四万十市 四万十町 梼原町']],
  福岡県: [['福岡市 春日市 筑紫野市 糸島市 大野城市 宗像市 太宰府市 福津市 古賀市 那珂川市 篠栗町 飯塚市 久留米市 小郡市 朝倉市'], ['北九州市 行橋市 中間市 直方市 田川市'], ['大牟田市 柳川市 八女市 筑後市']],
  佐賀県: [['佐賀市 鳥栖市 小城市 神埼市 基山町 多久市'], ['唐津市 伊万里市 有田町', .5], ['武雄市 鹿島市 嬉野市']],
  長崎県: [['長崎市 諫早市 大村市 長与町 時津町'], ['佐世保市 平戸市'], ['島原市 雲仙市 南島原市'], ['五島市'], ['対馬市'], ['壱岐市']],
  熊本県: [['熊本市'], ['八代市 水俣市'], ['人吉市'], ['天草市']],
  大分県: [['大分市 別府市 臼杵市 由布市 杵築市 日出町'], ['中津市 宇佐市 豊後高田市 国東市'], ['日田市'], ['佐伯市'], ['竹田市']],
  宮崎県: [['宮崎市'], ['延岡市 日向市 門川町 高千穂町'], ['都城市 三股町 小林市 えびの市']],
  鹿児島県: [['鹿児島市'], ['鹿屋市 志布志市'], ['出水市'], ['奄美市'], ['屋久島町'], ['徳之島町']],
  沖縄県: [['那覇市'], ['宮古島市'], ['石垣市 竹富町']]
};
// 市区町村 → 圏の番号（0が最初の圏）
const ZONE_IX = {};
Object.entries(ZONES).forEach(([pn, zs]) => {
  const m = ZONE_IX[pn] = {};
  zs.forEach(([list], i) => list.split(' ').forEach(n => { m[n] = i; }));
});
const zoneOf = (pref, mn) => (ZONE_IX[pref.n] && ZONE_IX[pref.n][mn]) || 0;
const zoneCx = (pref, z) => { const zs = ZONES[pref.n]; const c = zs && zs[z] && zs[z][1]; return c != null ? c : z === 0 ? 1 : 0; };
const RELOC_NOTE = { outing: '飲みや遊びで、近くの繁華街に出かけている', work: '職場のある場所（通勤の傾向から）', high: '通っている高校のある場所', junior: '通っている中学校のある場所', univ: '通っている大学・専門学校のある場所', exam: '入試の会場（大学など）のある場所', exam6: '受験する中学校のある場所', venue: '観戦などで出かけている場所（状況の文から）' };
// 状況の文に出てくる会場（現在地をそこにする）[文の決め手, 都道府県, 市区町村, 区]
const VENUES = [
  [/横浜スタジアム/, '神奈川県', '横浜市', '中区'], [/PayPayドーム/, '福岡県', '福岡市', '中央区'], [/甲子園のアルプス|甲子園球場の/, '兵庫県', '西宮市', ''],
  [/国技館/, '東京都', '墨田区', ''], [/東京ドーム/, '東京都', '文京区', ''], [/アジア大会の会場/, '愛知県', '名古屋市', '瑞穂区']
];
// いまいる場所の種類（住まいのまま＝null）
function placeKind(P) {
  const st = P.sit.state, oc = P.occ, x = P.sit.text;
  if (P.prison) return null;
  if (st === 'off' && P.sit.cond && P.sit.cond.stay) return null;
  if (st === 'off' && P.sit.cond && P.sit.cond.at) return 'event';
  if (P.sit.stateLabel === '入試を受けている') return oc.school === 'elem' ? 'exam6' : 'exam';
  if (st === 'off' && VENUES.some(v => v[0].test(x))) return 'venue';
  if (st === 'off' && OUTING_RE.test(x) && !OUTING_NOT.test(x)) return 'outing';
  if (oc.job && (st === 'work' || P.sit.stateLabel === '昼休み中')) return NO_COMMUTE.has(oc.tag) || oc.kind === 'self' ? null : 'work';
  if (st === 'school' && oc.group === 'college') return 'univ';
  const atSchool = st === 'school' || (P.sit.stateLabel === '部活をしている' && !/帰り|向かう|向かって/.test(x));
  if (oc.school === 'teen' && atSchool && !oc.tsushin) return /高校/.test(oc.label) ? 'high' : 'junior';
  return null;
}
const findMuni = (pref, n) => pref && pref.munis.find(m => m.n === n);
// 行き先の候補表 [[市区町村, 区, 重み]] から選ぶ（z を渡すと、その圏の中だけ）
function pickFromList(pref, list, z) {
  const ok = list.filter(([mn]) => findMuni(pref, mn) && (z == null || zoneOf(pref, mn) === z));
  if (!ok.length) return null;
  const r = pickW(ok, x => x[2]);
  return { pref, muni: findMuni(pref, r.v[0]), ward: r.v[1] || null, p: r.p };
}
// 人口に比例して、住まい以外の市区町村から選ぶ（指定都市は区もランダム）
function pickByPop(pref, notMuni, pow, z) {
  const ok = pref.munis.filter(m => m !== notMuni && (z == null || zoneOf(pref, m.n) === z));
  if (!ok.length) return null;
  // 通勤・通学は大きい町へ向かう流れが多い。住まいより小さい町へは少なく、圏でいちばん大きい町に住む人はあまり外へ出ない
  const hw = notMuni && notMuni.w || 0;
  if (hw && !ok.some(m => m.w >= hw) && rnd() < .65) return null;
  const big = ok.some(m => !m.town);   // 町村の代表は、圏にほかの市がないときだけ選ぶ
  const r = pickW(ok, m => (big && m.town) ? 0 : Math.pow(m.w, pow || 1) * (hw && m.w < hw ? m.w / hw : 1));
  if (!r || !(r.p > 0)) return null;
  const wards = WARD_LIST[r.v.n];
  return { pref, muni: r.v, ward: wards ? pickU(wards) : null, p: r.p * (wards ? 1 / wards.length : 1) };
}
function relocate(P, draws) {
  const kind = placeKind(P);
  if (!kind) return;
  let dest = null;
  const z = zoneOf(P.pref, P.muni.n), cx = zoneCx(P.pref, z);
  // 同じ圏の中心街（HUBS のうち圏の中にあるもの。なければ圏でいちばん大きい市）
  const zoneHubs = () => {
    const l = (HUBS[P.pref.n] || []).filter(x => x[0] ? cx > 0 : zoneOf(P.pref, x[1]) === z).map(x => x[0] ? [x[0], x[1], x[2], x[3] * Math.min(1, cx)] : x);
    if (l.length) return l;
    const ms = P.pref.munis.filter(m => zoneOf(P.pref, m.n) === z);
    const top = ms.reduce((b, m) => (!b || m.w > b.w ? m : b), null);
    return top ? [['', top.n, WARD_LIST[top.n] ? null : '', 1]] : [];
  };
  if (kind === 'event') {
    const [pn, mn, ward] = P.sit.cond.at;
    const pref = PREFS.find(p => p.n === pn);
    dest = { pref, muni: findMuni(pref, mn), ward: ward || null, p: 1 };
  } else if (kind === 'venue') {
    const v = VENUES.find(x => x[0].test(P.sit.text));
    const pref = PREFS.find(p => p.n === v[1]);
    dest = { pref, muni: findMuni(pref, v[2]), ward: v[3] || null, p: 1 };
  } else if (kind === 'outing') {
    const list = zoneHubs();
    if (!list.length) return;
    const r = pickW(list.concat([['', null, null, list.reduce((s, x) => s + x[3], 0) * .25]]), x => x[3]);   // 2割ほどは地元のまま
    if (!r.v[1]) return;
    const pref = r.v[0] ? PREFS.find(p => p.n === r.v[0]) : P.pref;
    const muni = findMuni(pref, r.v[1]);
    if (!muni) return;
    dest = { pref, muni, ward: r.v[2] || null, p: r.p };
  } else {
    let pOut = OUT_P[kind][P.urb] || .4;
    const exam = kind === 'exam' || kind === 'exam6';
    if (kind === 'work' && P.occ.form === 'パート') pOut *= .6;
    if (kind === 'junior' && P.pref.n === '東京都') pOut = .2;
    if (rnd() >= pOut) return;
    // 都道府県をまたぐか
    const cross = exam ? [] : (CROSS[P.pref.n] && CROSS[P.pref.n][kind === 'junior' ? 'high' : kind]) || [];   // 入試は県内の会場
    let pref = P.pref, pc = 1;
    for (const [pn, share] of cross) { const sh = Math.min(.9, share * cx); if (sh && rnd() < sh) { pref = PREFS.find(p => p.n === pn); pc = sh; break; } }
    const other = pref !== P.pref;
    const zz = other ? 0 : z;   // ほかの都道府県へは、その中心の圏へ
    const hubList = n => (HUBS[n] || []).filter(x => !x[0]).map(x => [x[1], x[2], x[3]]);
    const fromList = list => pickFromList(pref, list, zz) || pickFromList(pref, hubList(pref.n), zz);
    if (kind === 'work') dest = (other || rnd() < .5) ? fromList(BIZ[pref.n] || hubList(pref.n)) || pickByPop(pref, P.muni, 1, zz) : pickByPop(pref, P.muni, 1, zz);
    else if (kind === 'univ' || kind === 'exam') dest = rnd() < .65 ? fromList(UNIV[pref.n] || hubList(pref.n)) || pickByPop(pref, P.muni, 1.5, zz) : pickByPop(pref, P.muni, 1.5, zz);
    else dest = pickByPop(pref, P.muni, 1.2, zz);
    if (dest) dest.p *= pc * pOut;
  }
  if (!dest || !dest.muni || (dest.pref === P.pref && dest.muni === P.muni && (!dest.ward || dest.ward === P.ward))) return;
  if (P.sit.cond?.wx && !wxMatch(wxOf(dest.pref, P.t), P.sit.cond.wx)) return;
  P.home = { pref: P.pref, place: dest.pref === P.pref ? P.placeShort : P.place };
  P.pref = dest.pref; P.muni = dest.muni; P.ward = dest.ward;
  P.place = dest.pref.n + dest.muni.n + (dest.ward || ''); P.placeShort = dest.muni.n + (dest.ward || '');
  draws.push({ key: '現在地', value: (dest.pref.n !== P.home.pref.n ? dest.pref.n : '') + P.placeShort, p: dest.p, note: kind === 'event' ? '祭りなどで出かけている場所' : RELOC_NOTE[kind] });
}

// ===== 体格・健康（2026-10-22追加）=====
// 健康は2段階で決める。状況の前に「状況を左右するもの」（妊娠・産後・寝込むほどの病気）、状況のあとに残り（持病・ケガなど）と、状況の文との突き合わせ
const HB0 = { preg: 0, pp: -1, leave: false, bed: null, pNone: 1 };
const bandOf = a => Math.min(8, Math.floor(a / 10));
// 年齢別出生率（1年あたり。人口動態統計 2022年の5歳階級の値を、平均が合うように1歳刻みにならしたもの。18歳未満は扱わない）
const ASFR1 = [.003, .0055,                                  // 18, 19歳
  .009, .013, .018, .025, .032, .043, .053, .063, .073, .082,  // 20〜29歳
  .088, .091, .091, .088, .084, .077, .066, .055, .045, .036,  // 30〜39歳
  .025, .018, .012, .007, .004, .0015, .0007, .0003, .0001, .0001];   // 40〜49歳
const asfrOf = a => (a >= 18 && a <= 49 ? ASFR1[a - 18] : 0);
// 立場による違い：学生はまれ、子どもが小さいうちは仕事を離れる人も多いので専業主婦に多い（子育て中の母親の就業率から）
const BIRTH_F = { student: .03, college: .06, grad: .3, adult: .72, homemaker: 2.5, jobless: 1, rest: .5 };
// 年齢ごとに、立場の倍率の平均が1になるようにする補正（node tools/birthnorm.js で計算。18〜49歳）
const BIRTH_NORM = [9.24, 4.73, 3.27, 2.34, 1.58, 1.22, 1.17, 1.07, 1.08, 1.09, 1.07, 1.08, 1, 1.01, 1, 1, 1, .96, .95, .95, .98, .98, .97, .99, 1, 1, .99, .99, .98, .98, 1, .99];
const birthGroup = oc => oc.group === 'college' ? (oc.grad ? 'grad' : 'college') : oc.group;
const BIRTH_WHO = { student: '歳の高校生の女性', college: '歳の学生の女性', grad: '歳の大学院生の女性', adult: '歳で働いている女性', homemaker: '歳の専業主婦の女性', jobless: '歳で仕事をしていない女性', rest: '歳で療養中の女性' };
// その人の「1年に出産する割合」
function birthRate(P) {
  const a = P.age;
  if (P.sex !== 'f' || a < 18 || a > 49) return 0;
  const f = BIRTH_F[birthGroup(P.occ)];
  return asfrOf(a) * (f != null ? f : 0) * BIRTH_NORM[a - 18];
}
const birthWho = P => P.age + (BIRTH_WHO[birthGroup(P.occ)] || '歳の女性');
// 生理中の割合。月経は3〜7日（平均5日）、周期は25〜38日（平均29日前後）なので、月経のある人のうち約17%。
// 初経は平均12.2歳（ばらつき約1.1歳。日本の調査）、初経から2年ほどは周期が不規則で少なめ。閉経は平均50.5歳で、45歳ごろから周期が乱れて減る
function mensRate(P, t) {
  const a = P.age;
  if (a < 9 || a > 55) return 0;
  if (a < 16) {
    const x = a + monthsOld(P, t) % 12 / 12;   // 月齢まで入れた年齢
    const had = phi((x - 12.2) / 1.1);           // 初経を迎えている割合
    return .17 * had * (a < 15 ? .85 : 1);
  }
  return a <= 44 ? .17 : a <= 49 ? .13 : a === 50 ? .08 : a === 51 ? .05 : a === 52 ? .03 : .01;
}
// いまかかっている人の割合（月別）。風邪は熱のある人が約4分の1
const COLD_M = [0, .045, .04, .03, .025, .02, .02, .015, .015, .02, .025, .035, .045];
const FLU_M = [0, .012, .01, .004, .001, 0, 0, 0, 0, 0, 0, .001, .003];
const GAS_M = [0, .003, .003, .002, .001, .001, .001, .001, .001, .001, .001, .002, .003];
const coldAgeF = a => a <= 5 ? 2.5 : a <= 12 ? 1.6 : a <= 19 ? 1.1 : a <= 64 ? 1 : .7;
const fluAgeF = a => a <= 5 ? 1.5 : a <= 14 ? 2.5 : a <= 19 ? 1.2 : a <= 59 ? .8 : .5;
function healthBase(P, t) {
  const g = P.occ.group, a = P.age, hb = { preg: 0, pp: -1, leave: false, bed: null, pNone: 1 };
  const emp = !!P.occ.job && P.occ.kind !== 'self';
  if (P.sex === 'f' && g !== 'prison' && g !== 'facility') {
    const f = birthRate(P);
    if (f) {
      const pg = f * .75, pp = Math.min(.7, f * (typeof postpartumFactor === 'function' ? postpartumFactor(P) : 1)), r = rnd();
      if (r < pg) {
        // 妊娠日数：4週0日〜39週6日。予定日（40週0日）を過ぎてまだ生まれていない人はわずか
        hb.pregD = rnd() < .99 ? 28 + Math.floor(rnd() * 252) : 280 + Math.floor(rnd() * 11);
        hb.preg = Math.floor(hb.pregD / 7); hb.pregP = pg;
        if (hb.pregD >= 238 && emp) hb.leave = true;   // 産前休業は予定日の6週前（34週0日）から
      }
      else if (r < pg + pp) { hb.pp = Math.floor(rnd() * 12); hb.ppP = pp; if (emp && rnd() < .9) hb.leave = true; }
      hb.pNone *= 1 - pg - pp;
    }
    // 生理中。妊娠中は来ない。産後は悪露の時期（〜2か月）は来ず、授乳中は戻るのが遅れる
    let mr = mensRate(P, t);
    if (hb.preg || (hb.pp >= 0 && hb.pp < 2)) mr = 0; else if (hb.pp >= 2) mr *= hb.pp < 6 ? .35 : .65;
    // 何日目か（1〜5日目、ときどき6〜7日目）。生理痛は1〜2日目に多く、10代のほうが多い
    if (mr && rnd() < mr) { hb.mens = rnd() < .9 ? 1 + Math.floor(rnd() * 5) : 6 + Math.floor(rnd() * 2); hb.mensP = mr; hb.mensPain = hb.mens <= 2 && rnd() < (a < 20 ? .5 : .4); }
    hb.pNone *= 1 - mr;
  }
  if (g !== 'prison' && g !== 'facility') {
    const flu = FLU_M[t.mo] * fluAgeF(a), gas = GAS_M[t.mo] * (a <= 12 ? 2.5 : 1), fev = COLD_M[t.mo] * coldAgeF(a) * .25;
    const r = rnd();
    hb.bed = r < flu ? 'flu' : r < flu + gas ? 'gas' : r < flu + gas + fev ? 'fever' : null;
    if (hb.bed) hb.bedP = hb.bed === 'flu' ? flu : hb.bed === 'gas' ? gas : fev;
    hb.pNone *= 1 - flu - gas - fev;
  }
  return hb;
}
// 文の健康条件（hl・pw・pm・lv・bt・emp・np）
function hlOK(o, P) {
  const hb = P.hb || HB0;
  if (o.np && hb.preg) return false;
  if (o.hl === 'preg' && !(hb.preg && (!o.pw || (hb.preg >= o.pw[0] && hb.preg <= o.pw[1])))) return false;
  if (o.hl === 'pp' && !(hb.pp >= 0 && (!o.pm || (hb.pp >= o.pm[0] && hb.pp <= o.pm[1])))) return false;
  if (o.lv && !hb.leave) return false;
  if (o.hl === 'mens' && !(hb.mens && (!o.pain || hb.mensPain))) return false;
  if (o.nm && hb.mens) return false;
  if (o.bt && !(hb.bed && [].concat(o.bt).includes(hb.bed))) return false;
  if (o.emp && !(P.occ.job && P.occ.kind !== 'self')) return false;
  return true;
}
// 持病（年代別の割合。国民生活基礎調査の通院者率などを丸めた値）[名前, 男性(0〜9歳, 10代, …, 80歳以上), 女性]
const CHRONIC = [
  ['高血圧', [0, 0, .003, .02, .08, .2, .33, .45, .5], [0, 0, .001, .01, .04, .13, .27, .42, .52]],
  ['糖尿病', [0, .001, .003, .01, .04, .09, .15, .17, .15], [0, .001, .002, .006, .02, .04, .07, .1, .1]],
  ['脂質異常症', [0, 0, .005, .02, .05, .09, .12, .13, .1], [0, 0, .003, .01, .03, .1, .18, .2, .16]],
  ['腰痛症', [0, .005, .015, .025, .035, .045, .06, .08, .09], [0, .005, .02, .03, .04, .05, .07, .1, .12]],
  ['ひざの関節症', [0, 0, 0, 0, .005, .01, .025, .05, .07], [0, 0, 0, .002, .01, .03, .06, .1, .13]],
  ['骨粗しょう症', [0, 0, 0, 0, 0, .002, .008, .02, .03], [0, 0, 0, 0, .003, .015, .05, .1, .15]],
  ['白内障', [0, 0, 0, 0, .003, .012, .05, .13, .18], [0, 0, 0, 0, .003, .018, .07, .17, .22]],
  ['緑内障', [0, 0, 0, .002, .005, .015, .03, .05, .06], [0, 0, 0, .002, .005, .015, .03, .05, .06]],
  ['心臓病', [0, .002, .003, .006, .012, .03, .06, .1, .13], [0, .002, .003, .005, .008, .015, .035, .07, .11]],
  ['脳梗塞の後遺症', [0, 0, 0, .001, .003, .008, .02, .035, .05], [0, 0, 0, 0, .002, .005, .01, .02, .035]],
  ['がんの治療中', [0, .001, .001, .003, .006, .013, .028, .045, .05], [0, .001, .002, .006, .012, .018, .022, .03, .035]],
  ['痛風', [0, 0, .003, .01, .02, .03, .03, .025, .02], [0, 0, 0, 0, 0, .001, .002, .003, .003]],
  ['甲状腺の病気', [0, 0, .001, .002, .003, .004, .004, .004, .003], [0, .002, .006, .012, .018, .02, .02, .02, .015]],
  ['ぜんそく', [.05, .04, .025, .02, .02, .02, .025, .03, .03], [.04, .04, .025, .02, .02, .02, .025, .03, .03]],
  ['アトピー性皮膚炎', [.07, .05, .03, .02, .01, .005, .003, .002, .002], [.07, .05, .03, .02, .01, .005, .003, .002, .002]],
  ['うつ病', [0, .003, .015, .02, .02, .015, .01, .01, .01], [0, .005, .025, .03, .03, .025, .015, .015, .015]],
  ['片頭痛', [0, .007, .013, .017, .013, .007, .003, .002, 0], [0, .02, .04, .05, .04, .02, .01, .005, 0]],
  ['虫歯の治療中', [.05, .04, .035, .04, .045, .05, .055, .055, .045], [.05, .04, .035, .04, .045, .05, .055, .055, .045]],
  ['人工透析', [0, 0, 0, .0005, .0015, .004, .008, .01, .008], [0, 0, 0, .0003, .0008, .002, .004, .005, .004]]
];
const CHRONIC_OF = Object.fromEntries(CHRONIC.map(c => [c[0], c]));
// 持病のない人の割合の目安（国民生活基礎調査の通院者率から。0〜9歳, 10代, …, 80歳以上）
const NO_CHRONIC = [.84, .86, .83, .78, .7, .57, .41, .3, .27];
// 持病のない人の割合が target になるよう、最初から持病のない人 h を決める（足りていれば h = 0）
function chronicFree(rs, target) {
  const f = h => h + (1 - h) * rs.reduce((x, r) => x * (1 - Math.min(.95, r / (1 - h))), 1);
  if (f(0) >= target) return { h: 0, none: f(0) };
  let lo = 0, hi = target;
  for (let i = 0; i < 18; i++) { const m = (lo + hi) / 2; if (f(m) < target) lo = m; else hi = m; }
  return { h: lo, none: f(lo) };
}
const chronicRate = (name, P) => { const c = CHRONIC_OF[name]; return c ? c[P.sex === 'm' ? 1 : 2][bandOf(P.age)] : 0; };
const dementiaRate = a => a < 65 ? 0 : a < 70 ? .008 : a < 75 ? .02 : a < 80 ? .045 : a < 85 ? .085 : a < 90 ? .16 : .26;
const allergyRate = a => a <= 5 ? .06 : a <= 12 ? .045 : a <= 19 ? .03 : .015;
const ALLERGY_KID = [['卵', .35], ['牛乳', .2], ['小麦', .1], ['ピーナッツ', .1], ['えび', .1], ['そば', .08], ['くるみ', .07]];
const ALLERGY_ADULT = [['えび', .3], ['かに', .15], ['小麦', .15], ['そば', .15], ['果物', .15], ['魚卵', .1]];
// 花粉症（症状が出ている人）。スギ・ヒノキは2〜5月、北海道はシラカバ、秋はブタクサ
function pollenOf(P, t) {
  const mo = t.mo, a = P.age, n = P.pref.n;
  const ageF = a <= 4 ? .03 : a <= 9 ? .3 : a <= 19 ? .5 : a <= 59 ? .47 : a <= 69 ? .33 : .18;
  if (n === '北海道') return mo === 5 || mo === 6 ? [.25 * ageF, 'シラカバ'] : mo === 9 ? [.1 * ageF, 'ブタクサ'] : [0];
  if (n === '沖縄県') return [0];
  const north = ['青森県', '岩手県', '秋田県'].includes(n) ? .7 : 1;
  if (mo >= 2 && mo <= 5) return [[0, 0, .7, 1, .85, .25][mo] * ageF * north, mo <= 3 ? 'スギ' : 'ヒノキ'];
  if (mo === 9) return [.1 * ageF, 'ブタクサ'];
  return [0];
}
// ケガ（いま治療中の人）
const injuryRate = a => a <= 5 ? .002 : a <= 12 ? .004 : a <= 19 ? .005 : a <= 64 ? .003 : .004;
function injuryOf(a) {
  const side = () => (rnd() < .5 ? '右' : '左');
  const L = a <= 12 ? [[() => `${side()}腕の骨折（ギプス中）`, .35], [() => `${side()}足首のねんざ`, .35], [() => '指の骨折', .2], [() => '鎖骨の骨折', .1]]
    : a <= 64 ? [[() => `${side()}足首のねんざ`, .3], [() => (a >= 25 ? 'ぎっくり腰' : `${side()}足首のねんざ`), .25], [() => `${side()}手首の骨折（ギプス中）`, .15], [() => '足の指の骨折', .12], [() => '肋骨のひび', .08], [() => '突き指', .1]]
      : [[() => `${side()}手首の骨折（ギプス中）`, .3], [() => '背骨の圧迫骨折', .3], [() => 'ぎっくり腰', .2], [() => `${side()}足首のねんざ`, .2]];
  return pickW(L, x => x[1]).v[0]();
}
// 体を使う仕事（ケガをしている人は休んでいることにする）
const PHYS_TAGS = new Set(['build', 'factory', 'warehouse', 'farm', 'orchard', 'dairy', 'sea', 'forest', 'garden', 'clean', 'move', 'garbage', 'care', 'helper', 'truck', 'dump', 'delivery', 'route', 'police', 'fire', 'sdf', 'ship', 'gym', 'kyushoku', 'food', 'bakery', 'tofu', 'nursery', 'garage', 'post', 'news']);
// 療養中・施設で暮らす人のおもな病気
const REST_ILL = [['うつ病', .3], ['適応障害', .08], ['がんの治療中', .15], ['椎間板ヘルニア', .12], ['心臓病', .1], ['脳梗塞の後遺症', .08], ['糖尿病', .07], ['肝臓の病気', .05], ['腎臓の病気', .05]];
const FACILITY_ILL = [['認知症', .62], ['脳梗塞の後遺症', .2], ['骨折の後遺症', .1], ['パーキンソン病', .08]];
// 状況の文から読み取れる体調（その場面なら当然そうであるもの）
const IMPLY = [
  [/妊婦健診|産婦人科|母子手帳|つわり|マタニティ/, (H, P) => H.preg()],
  [/授乳/, (H, P) => P.sex === 'f' && P.age >= 18 && H.pp()],
  [/花粉|くしゃみ/, (H, P) => H.pollen()],
  [/血圧の薬|血圧を測/, (H, P) => H.add('高血圧', 'chronic')],
  [/ピルケース|朝の薬|薬局で薬|かかりつけ|定期の診察|主治医/, (H, P) => H.anyChronic()],
  [/腰のレントゲン|腰痛|湿布/, (H, P) => H.add('腰痛症', 'chronic')],
  [/手術したひざ/, (H, P) => H.add('ひざの手術後', 'chronic', .005)],
  [/ひざの曲げ伸ばし/, (H, P) => H.add('ひざの関節症', 'chronic')],
  [/リハビリの体操|機能訓練|平行棒/, (H, P) => H.has('脳梗塞の後遺症', '骨折の後遺症', 'ひざの関節症', 'ひざの手術後', 'パーキンソン病') || H.add(P.age >= 60 && rnd() < .5 ? '脳梗塞の後遺症' : '骨折の後遺症', 'chronic', .01)],
  [/歯医者/, (H, P) => H.add('虫歯の治療中', 'chronic')],
  [/松葉杖/, (H, P) => H.add(`${rnd() < .5 ? '右' : '左'}足の骨折`, 'injury', .002)],
  [/ギプスで固めた右腕/, (H, P) => H.add('右腕の骨折（ギプス中）', 'injury', .002)],
  [/ギプスに/, (H, P) => H.add(`${rnd() < .5 ? '右' : '左'}腕の骨折（ギプス中）`, 'injury', .003)],
  [/ギプスを外して/, (H, P) => H.add('骨折（もうすぐ完治）', 'injury', .002)],
  [/ぎっくり腰/, (H, P) => H.add('ぎっくり腰', 'injury', .002)],
  [/足首のねんざ/, (H, P) => H.add('足首のねんざ', 'injury', .003)],
  [/二日酔い/, (H, P) => H.add('二日酔い', 'acute', .02)],
  [/熱を出|冷却シート|体調を崩して/, (H, P) => H.has('風邪気味') ? H.rename('風邪気味', '風邪で発熱') : H.cold(true)],
  [/熱を測ったら37度/, (H, P) => H.cold(false)],
  [/小児科の待合室|鼻水の吸引/, (H, P) => H.cold(false)]
];
// 通院の場面なのに病気がないときに足すもの（付き添い・健診・予防接種などは除く）
const VISIT_SKIP = /付き添|お見舞い|予防接種|健康診断|健診|視力検査|バリウム|人間ドック|迎え|売店|動物病院|ペット/;
function settleHealth(P, t) {
  const hb = P.hb || HB0, a = P.age, sit = P.sit, g = P.occ.group, items = [];
  let pNone = hb.pNone;
  const find = n => items.find(i => i.n === n || i.base === n);
  const H = {
    add(n, k, p) { if (!find(n)) items.push({ n, k, p: p != null ? p : chronicRate(n, P) || .01 }); return true; },
    has(...ns) { return ns.some(n => !!find(n)); },
    rename(a1, b1) { const i = find(a1); if (i) { i.n = b1; i.base = b1; } return true; },
    preg() { if (!hb.preg && !items.some(i => i.k === 'preg')) items.push({ n: pregText(56 + Math.floor(rnd() * 190), false), base: '妊娠中', k: 'preg', p: birthRate(P) * .75 || .01, who: birthWho(P) }); return true; },
    pp() { if (hb.pp < 0 && !items.some(i => i.k === 'pp')) items.push({ n: `産後${1 + Math.floor(rnd() * 8)}か月`, base: '産後', k: 'pp', p: birthRate(P) || .01, who: birthWho(P) }); return true; },
    pollen() { if (!items.some(i => i.k === 'pollen')) { const [r, kind] = pollenOf(P, t); items.push({ n: `花粉症（${kind || 'スギ'}）`, base: '花粉症', k: 'pollen', p: r || .2 }); } return true; },
    cold(fever) { if (!items.some(i => i.k === 'cold' || i.k === 'bed')) items.push(fever ? { n: '風邪で発熱', k: 'cold', p: COLD_M[t.mo] * coldAgeF(a) * .25 } : { n: '風邪気味', k: 'cold', p: COLD_M[t.mo] * coldAgeF(a) * .75 }); return true; },
    anyChronic() {
      if (items.some(i => i.k === 'chronic')) return true;
      const cs = CHRONIC.filter(c => c[0] !== '虫歯の治療中').map(c => [c[0], c[P.sex === 'm' ? 1 : 2][bandOf(a)]]).filter(c => c[1] > 0);
      if (cs.length) { const r = pickW(cs, c => c[1]).v; items.push({ n: r[0], k: 'chronic', p: r[1] }); }
      return true;
    }
  };
  // 妊娠・産後
  if (hb.preg) items.push({ n: pregText(hb.pregD != null ? hb.pregD : hb.preg * 7, hb.leave), base: '妊娠中', k: 'preg', p: hb.pregP, who: birthWho(P) });
  if (hb.pp >= 0) items.push({ n: (hb.pp ? `産後${hb.pp}か月` : '産後まもなく') + (hb.leave ? '（育休中）' : ''), base: '産後1年以内', k: 'pp', p: hb.ppP, who: birthWho(P) });
  if (hb.mens) items.push({ n: `生理中（${hb.mens}日目${hb.mensPain ? '・生理痛' : ''}）`, base: '生理中', k: 'mens', p: hb.mensP });
  // 寝込むほどの病気・風邪気味
  if (hb.bed) {
    const deg = (lo, hi) => (lo + rnd() * (hi - lo)).toFixed(1);
    items.push(hb.bed === 'flu' ? { n: `インフルエンザ（${deg(38, 39.8)}度）`, base: 'インフルエンザ', k: 'bed', p: hb.bedP }
      : hb.bed === 'gas' ? { n: '胃腸炎', k: 'bed', p: hb.bedP } : { n: `風邪で発熱（${deg(37.6, 38.8)}度）`, base: '風邪で発熱', k: 'bed', p: hb.bedP });
  } else {
    const cr = COLD_M[t.mo] * coldAgeF(a) * (g === 'prison' || g === 'facility' ? 1 : .75);
    if (rnd() < cr) items.push({ n: '風邪気味', k: 'cold', p: cr });
    pNone *= 1 - cr;
  }
  // 持病。病気は同じ人に重なりやすいので、「持病のない人」の割合（通院者率から）を先に決め、残りの人に割合を寄せる
  const cl = CHRONIC.map(([n, m, f]) => {
    let r = (P.sex === 'm' ? m : f)[bandOf(a)];
    if (n === 'ぜんそく' && a <= 1) r = 0;
    if (hb.preg && /がん|透析/.test(n)) r = 0;
    return [n === 'アトピー性皮膚炎' && a === 0 ? '乳児湿疹' : n, r];
  }).concat([['認知症', dementiaRate(a) * (g === 'facility' ? 0 : 1)]]).filter(c => c[1] > 0);
  const { h: hShare, none: cNone } = chronicFree(cl.map(c => c[1]), NO_CHRONIC[bandOf(a)]);
  if (rnd() >= hShare) cl.forEach(([n, r]) => { if (rnd() < Math.min(.95, r / (1 - hShare))) items.push({ n, k: 'chronic', p: r }); });
  pNone *= cNone;
  const ar = allergyRate(a);
  if (rnd() < ar) { const f = pickW(a <= 12 ? ALLERGY_KID : ALLERGY_ADULT, x => x[1]).v[0]; items.push({ n: `${f}アレルギー`, k: 'allergy', p: ar }); }
  pNone *= 1 - ar;
  const [pr, pk] = pollenOf(P, t);
  if (pr && rnd() < pr) items.push({ n: `花粉症（${pk}）`, base: '花粉症', k: 'pollen', p: pr });
  pNone *= 1 - pr;
  // 療養中・施設で暮らしている人は、おもな病気を必ず持つ
  const forced = g === 'rest' ? REST_ILL.map(([n, w]) => [n, w * (a < 40 && /がん|脳梗塞|心臓/.test(n) ? .3 : 1)]) : g === 'facility' ? FACILITY_ILL : null;
  if (forced && !items.some(i => forced.some(([n]) => n === i.n))) { const r = pickW(forced, x => x[1]); items.unshift({ n: r.v[0], k: 'chronic', p: r.p }); }
  // ケガ（体を動かす場面・体を使う仕事の最中なら付けない）
  const lb = sit.stateLabel, cls = ACT_CLASS[lb];
  const busy = (sit.state === 'work' && PHYS_TAGS.has(P.occ.tag)) || (cls === 'sport' && lb !== 'リハビリ中') || lb === '遊んでいる' || lb === '部活をしている' || !!hb.bed || /運転|ハンドル|自転車で|バイクで/.test(sit.text);
  const ir = injuryRate(a);
  if (!busy && rnd() < ir) items.push({ n: injuryOf(a), k: 'injury', p: ir });
  pNone *= 1 - ir;
  // 状況の文から読み取れる体調を足す（仕事中の文は、患者さんの話などがあるので見ない）
  if (sit.state !== 'work') {
    IMPLY.forEach(([re, fn]) => { if (re.test(sit.text)) fn(H, P); });
    if (lb === '通院している' && !VISIT_SKIP.test(sit.text) && !items.some(i => ['chronic', 'bed', 'cold', 'injury', 'preg', 'pp', 'pollen'].includes(i.k))) {
      if (a <= 12) H.cold(false);
      else if (a < 40) { const r = pickW([['風邪気味', .6], ['胃腸の不調', .2], ['皮膚の湿疹', .2]], x => x[1]).v[0]; r === '風邪気味' ? H.cold(false) : H.add(r, 'acute', .01); }
      else H.anyChronic();
    }
    if (lb === 'リハビリ中' && !items.some(i => i.k === 'chronic' || i.k === 'injury')) H.add(a >= 60 && rnd() < .5 ? '脳梗塞の後遺症' : '骨折の後遺症', 'chronic', .01);
  }
  // 表示の順：妊娠・産後 → 体調不良 → ケガ → 持病 → アレルギー → 花粉症
  const ORD = { preg: 0, pp: 0, bed: 1, cold: 1, acute: 1, mens: 1, injury: 2, chronic: 3, allergy: 4, pollen: 5 };
  items.sort((x, y) => ORD[x.k] - ORD[y.k]);
  const shown = items.slice(0, 3);
  const text = items.length ? shown.map(i => i.n).join('、') + (items.length > 3 ? 'ほか' : '') : '特になし';
  const p = items.length ? items.reduce((s, i) => s * Math.min(1, Math.max(i.p, 1e-4)), 1) : pNone;
  const grp = grpLabel(P);
  const pct = x => x >= .1 ? `約${Math.round(x * 100)}%` : x >= .01 ? `約${(x * 100).toFixed(1)}%` : `約${(x * 100).toFixed(2)}%`;
  const note = items.length
    ? shown.slice(0, 2).map(i => `${(i.base || i.n).replace(/（.*$/, '')}は${i.who || grp}の${pct(i.p)}`).join('、')
    : `${grp}で、持病や体調不良・ケガのない人の割合`;
  return { items, text, p, note };
}
// 妊娠の書き方：15週までは週数、16週（5か月）からは月数、36週からは臨月（10か月）。予定日は40週0日
function pregText(d, leave) {
  const w = Math.floor(d / 7), ex = [];
  let s;
  if (w < 16) s = `妊娠${w}週`;
  else if (w < 36) s = `妊娠${Math.floor(w / 4) + 1}か月`;
  else { s = '妊娠10か月'; ex.push(d === 280 ? '臨月・出産予定日' : d > 280 ? `臨月・予定日を${d - 280}日過ぎ` : '臨月'); }
  if (leave) ex.push('産休中');
  return s + (ex.length ? `（${ex.join('・')}）` : '');
}
function grpLabel(P) {
  const a = P.age, kid = a <= 12;
  const sx = kid ? (P.sex === 'm' ? '男の子' : '女の子') : (P.sex === 'm' ? '男性' : '女性');
  if (a <= 12) return `${a}歳の${sx}`;
  if (a < 20) return `10代の${sx}`;
  return a >= 80 ? `80歳以上の${sx}` : `${Math.floor(a / 10) * 10}代の${sx}`;
}
// 体格：身長は正規分布、体重は BMI（対数正規分布）から。学校保健統計（2022年度）・国民健康・栄養調査（2019年）・乳幼児身体発育調査（2010年）の値を丸めたもの
const BABY_HW = [[0, 49.5, 3.1], [1, 54, 4.3], [2, 57.5, 5.4], [3, 61, 6.2], [4, 63.5, 6.8], [6, 67, 7.8], [9, 70.5, 8.6], [12, 74.5, 9.2], [18, 80.5, 10.5], [24, 86, 11.8], [30, 90.5, 12.9], [36, 94, 14], [48, 101.5, 15.9], [60, 108.5, 17.9], [72, 114.5, 20.2]];
const KID_HW = {
  m: [[116.7, 21.7], [122.6, 24.5], [128.3, 28], [133.9, 31.5], [139.4, 35.5], [145.9, 39.6], [153.6, 45.3], [160.6, 50], [165.8, 54.7], [168.6, 59], [169.9, 60.7], [170.6, 62.5]],
  f: [[115.8, 21.3], [121.8, 24], [127.6, 27.3], [133.5, 31], [140.1, 34.9], [146.7, 39.6], [151.9, 44.5], [154.8, 47.9], [156.5, 50.2], [157.3, 51.2], [157.7, 52.1], [158, 52.5]]
};
const KID_HSD = { m: [5, 5.1, 5.3, 5.6, 6.2, 7.2, 7.9, 7.4, 6.6, 5.9, 5.8, 5.8], f: [5, 5.1, 5.3, 5.8, 6.5, 6.7, 5.8, 5.4, 5.3, 5.3, 5.3, 5.3] };
const ADULT_H = { m: [171.0, 171.5, 171.5, 171.6, 170.6, 167.5, 164.0, 160.8], f: [158.0, 158.0, 158.2, 158.0, 156.6, 153.9, 150.3, 146.9] };   // 18〜19歳, 20代, …, 70代, 80歳以上
const ADULT_BMI = { m: [21.3, 22.5, 23.2, 24.0, 24.0, 23.6, 23.3, 22.7], f: [20.4, 20.7, 21.0, 21.6, 22.2, 22.6, 22.5, 21.9] };   // 真ん中の値（肥満・やせの割合が合うように）
const gauss = () => { let u = 0; while (!u) u = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rnd()); };
function phi(x) {   // 標準正規分布の累積
  const t = 1 / (1 + .3275911 * Math.abs(x) / Math.SQRT2);
  const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - .284496736) * t + .254829592) * t * Math.exp(-x * x / 2);
  return .5 * (1 + (x >= 0 ? y : -y));
}
function monthsOld(P, t) {
  const b = P.birth;
  return Math.max(0, (t.y - b.y) * 12 + (t.mo - b.mo) - (t.d < b.d ? 1 : 0));
}
// 体型の区分。大人（18歳以上）は日本肥満学会のBMIの基準。6〜17歳はBMIではなく、学校保健の肥満度（身長別標準体重との差）で判定する。
// 標準体重＝a×身長(cm)−b（文部科学省・日本学校保健会の係数）。乳幼児と妊娠中は区分を出さない
const STD_W = {
  m: [[.461, 32.382], [.513, 38.878], [.592, 48.804], [.687, 61.39], [.752, 70.461], [.782, 75.106], [.783, 75.642], [.815, 81.348], [.832, 83.695], [.766, 70.989], [.656, 51.822], [.672, 53.642]],
  f: [[.458, 32.079], [.508, 38.367], [.561, 45.006], [.652, 56.992], [.73, 68.091], [.803, 78.846], [.796, 76.934], [.655, 54.234], [.594, 43.264], [.56, 37.002], [.578, 39.057], [.598, 42.339]]
};
function bodyClass(P) {
  const b = P.body;
  if (!b || P.age < 6) return '';
  if ((P.hb && P.hb.preg) || (P.health && /妊娠/.test(P.health.text || ''))) return '';
  if (P.age >= 18) return b.bmi < 18.5 ? 'やせ' : b.bmi < 25 ? '普通' : b.bmi < 30 ? '肥満1度' : b.bmi < 35 ? '肥満2度' : b.bmi < 40 ? '肥満3度' : '肥満4度';   // 低体重はやせと表記
  const [k, c] = STD_W[P.sex][P.age - 6], std = k * b.h - c;
  const d = (b.w - std) / std * 100;
  return d <= -30 ? '高度やせ' : d <= -20 ? 'やせ' : d < 20 ? '普通' : d < 30 ? '軽度肥満' : d < 50 ? '中等度肥満' : '高度肥満';
}
// 「BMI 22.3・普通体重」
const bmiText = P => P.body ? `BMI ${P.body.bmi.toFixed(1)}` + (bodyClass(P) ? `・${bodyClass(P)}` : '') : '';
function bodyOf(P, t) {
  const a = P.age, s = P.sex;
  let mean, sd, bmiMed, lsd;
  if (a < 6) {
    const m = Math.min(71.9, monthsOld(P, t));
    let i = 0;
    while (i < BABY_HW.length - 2 && BABY_HW[i + 1][0] <= m) i++;
    const [m0, h0, w0] = BABY_HW[i], [m1, h1, w1] = BABY_HW[i + 1], k = (m - m0) / (m1 - m0);
    mean = h0 + (h1 - h0) * k + (s === 'm' ? .7 : -.7);
    const wm = w0 + (w1 - w0) * k + (s === 'm' ? .25 : -.25);
    sd = m < 12 ? 2.4 : m < 36 ? 3.2 : 4.2;
    bmiMed = wm / (mean / 100) ** 2; lsd = .1;
  } else if (a < 18) {
    const [h0, w0] = KID_HW[s][a - 6];
    mean = h0; sd = KID_HSD[s][a - 6];
    bmiMed = w0 / (h0 / 100) ** 2 * .97; lsd = s === 'm' ? [.11, .15] : [.11, .13];   // 子どもは重いほうに裾が長い（学校保健統計の肥満傾向児・痩身傾向児の割合に合わせる）
  } else {
    const i = a < 20 ? 0 : Math.min(7, Math.floor(a / 10) - 1);
    mean = ADULT_H[s][i]; sd = s === 'm' ? 5.8 : 5.4;
    bmiMed = ADULT_BMI[s][i]; lsd = s === 'm' ? .13 : .14;
  }
  const items = P.health ? P.health.items : [];
  const hasI = re => items.some(x => re.test(x.n));
  if (hasI(/糖尿病|高血圧|脂質異常症|痛風/)) bmiMed *= 1.03;
  if (hasI(/認知症|がん|パーキンソン/) || P.occ.group === 'facility') bmiMed *= .94;
  const zh = Math.max(-3.5, Math.min(3.5, gauss())), zb = Math.max(-3.2, Math.min(3.5, gauss()));
  const ls = Array.isArray(lsd) ? (zb < 0 ? lsd[0] : lsd[1]) : lsd;
  const h = mean + sd * zh, bmi0 = bmiMed * Math.exp(ls * zb);
  let w = bmi0 * (h / 100) ** 2;
  const preg = P.hb && P.hb.preg;
  if (preg) w += preg <= 12 ? .5 : .5 + (preg - 12) / 28 * 10;
  const r1 = x => Math.round(x * 10) / 10;
  const H1 = r1(h), W1 = r1(w);
  return { h: H1, w: W1, bmi: r1(W1 / (H1 / 100) ** 2), hMean: mean, hp: zh >= 0 ? 1 - phi(zh) : phi(zh), hiH: zh >= 0, bmiMed, bp: zb >= 0 ? 1 - phi(zb) : phi(zb), hiB: zb >= 0, preg: !!preg };
}

// ---- 1人を抽選 ----
// 東京23区は統計上も市区町村として持つ。区の指定は居住地の抽選に使う。
const TOKYO_WARDS = PREFS.find(p => p.n === '東京都').munis.filter(m => /^131(0[1-9]|1[0-9]|2[0-3])$/.test(m.code));
function tokyoWardSelection(f, pref) {
  if (!f || pref.n !== '東京都') return null;
  return f.tokyoWard === '23' || TOKYO_WARDS.some(m => m.code === f.tokyoWard) ? f.tokyoWard : null;
}

function generate(t, lite, f) {
  const draws = [];
  const prefFixed = !!(f && f.pref != null);
  const pr = prefFixed ? { v: PREFS[f.pref], p: 1 } : pickW(PREFS, p => censusMass(p.code, f));
  const pref = pr.v;
  const wardSelection = tokyoWardSelection(f, pref);
  const wardFixed = !!wardSelection && wardSelection !== '23';
  const mr = wardFixed ? { v: TOKYO_WARDS.find(m => m.code === wardSelection), p: 1 }
    : pickW(wardSelection === '23' ? TOKYO_WARDS : pref.munis, m => censusMass(m.code, f));
  const muni = mr.v;
  const wr = pickResidentWard(pref, muni, f), ward = wr.ward;
  const sa = pickSexAge(f, pref, urbOf(pref, muni), wr.code);
  const P = { pref, muni, ward, censusCode: wr.code, urb: urbOf(pref, muni), sex: sa.sex, age: sa.age, t };
  P.birth = birthOf(P.age, t);
  P.g = gradeIndex(P.birth, t);
  P.occ = occupation(P, t);
  if (typeof assignProfiles === 'function') { assignProfiles(P); makeFamilyContext(P); }
  P.hb = healthBase(P, t);
  if (typeof linkFamilyHealth === 'function') linkFamilyHealth(P);
  P.sit = situation(P, t);
  if (lite) return P;

  P.surname = pickSurname(pref.n);
  P.given = pickGiven(P.birth.y, P.sex);
  P.place = pref.n + muni.n + (ward || '');
  P.placeShort = muni.n + (ward || '');

  draws.push({ key: '都道府県', value: pref.n, p: pr.p, fixed: prefFixed, note: prefFixed ? '詳細設定で指定' : '国勢調査（2020年）の人口比（性別・年代指定時は対象人口で再計算）' });
  draws.push({ key: '市区町村', value: muni.n + (ward ? ` ${ward}` : ''), p: mr.p * wr.p, fixed: wardFixed,
    note: wardFixed ? '詳細設定で指定' : (wardSelection === '23' ? '東京23区内の対象人口比' : `国勢調査（2020年）の市区町村別人口比`) + (ward ? wr.exact ? '、区も人口比' : '。区再編のため区名は等確率・分布は市全体' : '') });
  draws.push({ key: '性別・年齢', value: `${P.sex === 'm' ? '男性' : '女性'}・${P.age}歳`, p: sa.p,
    note: '国勢調査（2020年）の地域・男女・各歳人口（年齢不詳は同性内で按分、100歳以上の各歳は推定）' });
  draws.push({ key: '名字', value: P.surname.k, p: P.surname.p, note: `全国に約${fmtCount(P.surname.c)}。${pref.n}で多い名字を上乗せ` });
  draws.push({ key: '名前', value: P.given.k, p: P.given.p, note: `${eraLabel(P.given.era)}生まれの${P.sex === 'm' ? '男の子' : '女の子'}に多い名前から` });
  draws.push({ key: P.occ.kindLabel === '所属' ? '所属' : '職業', value: P.occ.label, p: P.occ.p, note: occNote(P) });
  if (P.household) draws.push({ key: '家族構成', value: profileFamilyLabel(P), p: P.household.p || 1, fixed: P.household.i == null, note: '国勢調査2020年の地域・男女・年齢別一般世帯人員。親子の立場は親の実数で補正。2人以上等の人数内訳・子の年齢や性別・続き柄は推定' });
  if (P.hobbies) draws.push({ key: '趣味', value: profileHobbyLabel(P), p: P.hobbyP || 1, fixed: P.age < 10, note: '社会生活基本調査2021年の行動者率から代表趣味を抽選。地域補正・複数趣味の組合せはモデル値' });
  draws.push({ key: '状況', value: P.sit.stateLabel, p: P.sit.stateP, note: `${fmtClock(t)}に、この年代・この立場の人のうち「${P.sit.stateLabel}」にあたる人の割合` });
  // 服役中は、住所の代わりに刑務所の所在地を出す（名字は元の住所の地域のまま）
  if (P.occ.group === 'prison') {
    const { prison, p } = pickPrison(P, prefFixed);
    const ppref = PREFS.find(x => x.n === prison.pref);
    P.homePref = P.pref;
    P.prison = { n: prison.n };
    P.pref = ppref;
    P.muni = ppref.munis.find(m => m.n === prison.city) || { n: prison.city, pop: 0 };
    P.ward = null;
    P.place = ppref.n + prison.city;
    P.placeShort = prison.city;
    draws[0] = { key: '都道府県', value: ppref.n, p, note: '収容先の刑務所（定員の規模と、元の住所と同じ地方かどうかで抽選）' };
    draws[1] = { key: '収容先', value: prison.n, p: 1, fixed: true, note: `${prison.city}にある施設` };
  }
  relocate(P, draws);
  // 体格・健康
  P.health = settleHealth(P, t);
  P.body = bodyOf(P, t);
  const bd = P.body, grp = grpLabel(P);
  draws.push({ key: '身長', value: `${bd.h.toFixed(1)}cm`, p: bd.hp, note: `${grp}の平均は${bd.hMean.toFixed(1)}cm。これより${bd.hiH ? '高い' : '低い'}人の割合` });
  draws.push({ key: '体重', value: `${bd.w.toFixed(1)}kg（${bmiText(P)}）`, p: bd.bp, note: `${grp}のBMIの真ん中は${bd.bmiMed.toFixed(1)}。これより${bd.hiB ? '高い' : '低い'}人の割合` + (bd.preg ? '（体重は妊娠による増加を含む）' : '') });
  draws.push({ key: '健康', value: P.health.text, p: P.health.p, note: P.health.note });
  P.draws = draws;
  P.wxText = wxLabel(P.pref, t);   // 通知書に出す天気（服役中は刑務所のある県）
  // めずらしさ（名字・名前・職業・状況の出にくさ）
  // 状況の確率は時間帯で水準が違う（夜は過ごし方がばらけて低く出る）ので、時刻ごとの中央値でならす
  P.logp = Math.log10(P.surname.c / 12300) + Math.log10(P.given.p * P.given.era.cov) + Math.log10(P.occ.p) + Math.log10(P.sit.p) - SIT_MED[t.h % 24];
  P.stars = RARITY.findIndex(th => P.logp > th) + 1 || 5;
  return P;
}
// 状況の確率（log10）の時刻ごとの中央値（Nodeで計算）
const SIT_MED = [-1.65, -1.67, -1.66, -1.67, -1.7, -1.72, -1.72, -1.58, -1.44, -1.33, -1.36, -1.29, -1.4, -1.44, -1.42, -1.41, -1.49, -1.43, -1.53, -1.79, -1.89, -1.88, -1.84, -1.77];
const RARITY = [-4.61, -5.83, -6.89, -7.83]; // Nodeで分位点を計算して設定（★1〜★5）
function fmtCount(c) {
  if (c >= 1) return `${Math.round(c * 10) / 10}万人`;
  return `${(Math.round(c * 10000 / 100) * 100).toLocaleString('ja-JP')}人`;
}
function occNote(P) {
  const c = P.occ.cat;
  if (c === 'child') return '保育所等利用率を参考';
  if (c === 'student') return tokyoDetailCode(P) && P.g >= 13 && P.g <= 21 ? '学校基本調査の進学率に、国勢調査（2020年）の区別・男女・5歳階級別の在学率の差を反映' : '学校基本調査の進学率を参考';
  if (c === 'facility') return '年齢別の施設入所率を参考';
  if (c === 'prison') return '矯正統計の受刑者数と年齢構成を参考';
  if (c === 'none') return '年齢別就業率を国勢調査（2020年）の地域・男女・5歳階級別の就業率比で補正';
  return `国勢調査（2020年）の居住地域・男女・5歳階級別の${CAT_LABEL[P.occ.cat]}構成比（小人数は上位地域と混合）。${tokyoDetailCode(P) ? '東京23区は職業小分類・役員・自営の地域差も補正' : '細職種・雇用形態はモデル配分'}`;
}

// ---- 誰かと誰かを入れ替える ----
const SEXN = { m: '男性', f: '女性' };
function distKm(a, b) {
  const R = 6371, rad = Math.PI / 180;
  const dLat = (b[0] - a[0]) * rad, dLng = (b[1] - a[1]) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a[0] * rad) * Math.cos(b[0] * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
// 「18歳の高校3年生」のような、その人を一言で表す言い方
function whoOf(P) {
  const oc = P.occ, a = P.age;
  const sexN = a <= 17 ? (P.sex === 'm' ? '男の子' : '女の子') : SEXN[P.sex];
  const strip = s => s.replace(/（.*$/, '');
  if (oc.group === 'baby') return a === 0 ? '0歳の赤ちゃん' : `${a}歳の${sexN}`;
  if (oc.cat === 'child') return `${a}歳の${sexN}`;
  if (oc.cat === 'student') return `${strip(oc.label)}の${sexN}`;
  if (oc.job) return `${a}歳の${oc.job.n}`;
  const l = strip(oc.label);
  if (/主婦|主夫|家事手伝い/.test(l)) return `${a}歳の${l}`;
  return `${a}歳の${sexN}`;
}
const GAP_TH = [2.7, 3.8, 4.7, 5.65]; // Nodeで分位点を計算して設定（★1〜★5）
function pairGap(A, B) {
  const age = Math.abs(A.age - B.age);
  const km = A.pref === B.pref ? 0 : Math.round(distKm(A.pref.ll, B.pref.ll) / 10) * 10;
  const sexDiff = A.sex !== B.sex;
  const stateDiff = A.sit.state !== B.sit.state;
  const groupDiff = A.occ.group !== B.occ.group;
  const score = age / 25 + km / 600 + (sexDiff ? 1 : 0) + (stateDiff ? .8 : 0) + (groupDiff ? .6 : 0);
  let stars = GAP_TH.findIndex(th => score < th) + 1;
  if (!stars) stars = 5;
  return { age, km, sexDiff, stateDiff, groupDiff, score, stars };
}
function afterText(X, Y) {
  return `${X.surname.k}さん（${whoOf(X)}）は、${Y.place}で${whoOf(Y)}として、${Y.sit.text}。`;
}
function generatePair(t, f) {
  const A = generate(t, false, f);
  const B = generate(t, false, null);
  return { kind: 'pair', A, B, t, gap: pairGap(A, B) };
}

// いまの日本（モンテカルロ推定）
// 起きて家や街にいる人の内訳（大まかな種類）
const OFF_GROUP_OF = { meal: 'eat', house: 'house', media: 'fun', hobby: 'fun', sport: 'fun', study: 'study', rest: 'rest', out: 'out', social: 'out' };
function snapshot(t, n) {
  const c = { sleep: 0, work: 0, school: 0, commute: 0, off: 0 };
  const by = { eat: 0, house: 0, fun: 0, study: 0, rest: 0, out: 0 };
  for (let i = 0; i < n; i++) {
    const s = generate(t, true).sit;
    c[s.state]++;
    if (s.state === 'off') by[OFF_GROUP_OF[ACT_CLASS[s.stateLabel]] || 'rest']++;
  }
  return finishSnapshot(c, by, n);
}
function finishSnapshot(c, by, n) {
  Object.keys(by).forEach(k => { by[k] = c.off ? by[k] / c.off : 0; });
  Object.keys(c).forEach(k => { c[k] /= n; });
  c.offBy = by;
  return c;
}

// Keep the 3,000-person estimate off the button's synchronous path.
// Same-minute requests share work; a newer time cancels obsolete work.
const SNAPSHOT_CACHE = new Map();
let SNAPSHOT_JOB = null;
function snapshotKey(t, n) {
  return [t.y, t.mo, t.d, t.h, t.mi, t.hf, t.dow, !!t.rand, n,
    t.rand ? 0 : WX.at, t.rand ? 0 : EQ.at,
    t.rand ? 0 : Math.floor(Date.now() / 60000)].join(':');
}
async function snapshotAsync(t, n, keepGoing = () => true) {
  const c = { sleep: 0, work: 0, school: 0, commute: 0, off: 0 };
  const by = { eat: 0, house: 0, fun: 0, study: 0, rest: 0, out: 0 };
  let done = 0;
  while (done < n) {
    // Yield before the first batch too, so startup can bind the controls and paint.
    await new Promise(resolve => setTimeout(resolve, 0));
    if (!keepGoing()) return null;
    const deadline = Date.now() + 8;
    do {
      const s = generate(t, true).sit;
      c[s.state]++;
      if (s.state === 'off') by[OFF_GROUP_OF[ACT_CLASS[s.stateLabel]] || 'rest']++;
      done++;
    } while (done < n && Date.now() < deadline);
  }
  return finishSnapshot(c, by, n);
}
function snapshotCached(t, n) {
  const key = snapshotKey(t, n);
  if (SNAPSHOT_JOB && SNAPSHOT_JOB.key !== key) SNAPSHOT_JOB.cancelled = true;
  if (SNAPSHOT_CACHE.has(key)) return Promise.resolve(SNAPSHOT_CACHE.get(key));
  if (SNAPSHOT_JOB?.key === key && !SNAPSHOT_JOB.cancelled) return SNAPSHOT_JOB.promise;
  const job = { key, cancelled: false };
  SNAPSHOT_JOB = job;
  job.promise = snapshotAsync(t, n, () => !job.cancelled).then(result => {
    if (result && !job.cancelled) {
      SNAPSHOT_CACHE.set(key, result);
      if (SNAPSHOT_CACHE.size > 4) SNAPSHOT_CACHE.delete(SNAPSHOT_CACHE.keys().next().value);
      return result;
    }
    return null;
  }).finally(() => { if (SNAPSHOT_JOB === job) SNAPSHOT_JOB = null; });
  return job.promise;
}

if (typeof module !== 'undefined') module.exports = { setQuakes, sunTimes, moonOf, eventsOn, holidaysOf, holName, generate, generatePair, whoOf, afterText, pairGap, snapshot, jstNow, randomTime, fmtWhen, fmtClock, PREFS, PREF_TOTAL, SN, ERAS, JOB_OBJS, OFF_TX, WORK_TX, situation, occupation };




