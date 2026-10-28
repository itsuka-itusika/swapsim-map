// ===== 学生アルバイトの追加勤務状況 =====
// 大学生・短大生・専門学校生・大学院生は、所属とは別にアルバイトをしていることがある。
// 通常の situation() で「自由時間」になった場合だけ、時間帯に応じた低率で仕事へ置き換える。

const STUDENT_PART_TIME_TX = [
  [16.5, 21.5, '家庭教師のアルバイトで、中学生の数学の問題を一緒に解いているところでした', { w: 1.5, a: [18, 25] }],
  [16.5, 21.5, '家庭教師のアルバイトで、教え子の宿題の間違いを一つずつ見直しているところでした', { w: 1.0, a: [18, 25] }],
  [16, 22, '個別指導塾のアルバイトで、生徒の答案を見ながら解き方を説明しているところでした', { w: 1.5, a: [18, 27] }],
  [16, 22, '塾講師のアルバイトで、授業前に今日使う問題をホワイトボードへ書いているところでした', { w: 1.1, a: [18, 27] }],
  [7, 22, 'カフェのアルバイトで、注文された飲み物をカウンターに並べているところでした', { w: 1.8, a: [18, 29] }],
  [10, 23, '飲食店のアルバイトで、料理をテーブルへ運んでいるところでした', { w: 1.8, a: [18, 29] }],
  [6, 24, 'コンビニのアルバイトで、レジに並んだお客さんの会計をしているところでした', { w: 1.5, a: [18, 29] }],
  [8, 22, 'スーパーのアルバイトで、売り場の商品を棚に補充しているところでした', { w: 1.2, a: [18, 29] }],
  [8, 22, '書店のアルバイトで、入荷した本を棚へ並べているところでした', { w: .8, a: [18, 29] }],
  [8, 20, '試験監督のアルバイトで、教室を見回りながら残り時間を確認しているところでした', { w: .7, a: [18, 29], we: 1 }],
  [8, 22, 'イベントスタッフのアルバイトで、来場者を案内しているところでした', { w: .9, a: [18, 29], we: 1 }],
  [7, 23, 'イベント会場のアルバイトで、開演前の客席や備品を整えているところでした', { w: .7, a: [18, 29], we: 1 }],
  [8, 22, '倉庫のアルバイトで、配送先ごとに荷物を仕分けているところでした', { w: .9, a: [18, 29] }],
  [9, 22, 'ホテルの宴会場のアルバイトで、次の料理を出す準備をしているところでした', { w: .7, a: [18, 29] }],
  [9, 21, '採点のアルバイトで、答案の丸付けを一枚ずつ進めているところでした', { w: .8, a: [18, 29] }],
  [9, 21, '事務のアルバイトで、資料の数字をパソコンへ入力しているところでした', { w: .8, a: [18, 29] }]
];

function studentPartTimeChance(P, t) {
  if (!P || !P.occ || P.occ.group !== 'college' || P.age < 18 || P.age > 29) return 0;
  const h = t.hf;
  const dayOff = t.dow === 0 || t.dow === 6 || !!holName(t) || isBreak(t) || univVac(t);
  let p = 0;
  if (h >= 9 && h < 12) p = dayOff ? .08 : .025;
  else if (h >= 12 && h < 16) p = dayOff ? .14 : .045;
  else if (h >= 16 && h < 18) p = dayOff ? .20 : .11;
  else if (h >= 18 && h < 21) p = dayOff ? .24 : .19;
  else if (h >= 21 && h < 22.5) p = dayOff ? .13 : .11;
  // 大学院生は学部生よりやや低め。ただしゼロにはしない。
  if (P.occ.grad) p *= .7;
  return p;
}

function studentPartTimeCandidates(P, t) {
  const h = t.hf;
  const dayOff = t.dow === 0 || t.dow === 6 || !!holName(t) || isBreak(t) || univVac(t);
  return STUDENT_PART_TIME_TX.filter(e => {
    const o = e[3] || {};
    if (!inWin(h, e[0], e[1])) return false;
    if (o.a && (P.age < o.a[0] || P.age > o.a[1])) return false;
    if (o.we && !dayOff) return false;
    return true;
  });
}

const BASE_SITUATION_WITHOUT_STUDENT_JOB = situation;
situation = function(P, t) {
  const base = BASE_SITUATION_WITHOUT_STUDENT_JOB(P, t);
  if (!base || base.state !== 'off') return base;
  const chance = studentPartTimeChance(P, t);
  if (!(chance > 0) || rnd() >= chance) return base;
  const cands = studentPartTimeCandidates(P, t);
  if (!cands.length) return base;
  const r = pickW(cands, e => (e[3] && e[3].w != null) ? e[3].w : 1);
  const tpl = r.v[2];
  const stateP = (base.stateP != null ? base.stateP : 1) * chance;
  return {
    state: 'work',
    text: tpl,
    tpl,
    win: [r.v[0], r.v[1]],
    cond: { ...(r.v[3] || {}), studentPartTime: true },
    p: stateP * r.p,
    stateP,
    stateLabel: 'アルバイト中'
  };
};

