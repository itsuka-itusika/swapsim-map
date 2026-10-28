// ===== めずらしさ補正 =====
// 年齢と職業を、名字・名前・状況よりやや強く評価する。
// ただし全体の★が一斉に上がらないよう、一般的な年齢・職業を基準0として
// 「平均との差」だけを追加補正する。

const RARITY_OCC_EXTRA = 0.65;   // 職業の追加倍率（合計1.65倍相当）
const RARITY_AGE_WEIGHT = 1.35; // 年齢の寄与倍率
const RARITY_OCC_REF = 0.10;    // 典型的な職業抽選確率の基準
const RARITY_AGE_REF = 0.010;   // 1歳刻みで人口の約1%を基準

function naturalAgeProbability(P) {
  const cells = censusAgeCells(P.censusCode || censusCodeOf(P));
  let total = 0, sameAge = 0;
  for (const c of cells) {
    total += c.w;
    if (c.age === P.age) sameAge += c.w;
  }
  return total > 0 && sameAge > 0 ? sameAge / total : RARITY_AGE_REF;
}

function applyRarityWeighting(P) {
  if (!P || !P.occ || !P.sit || !P.surname || !P.given) return P;
  const occP = Math.max(1e-9, Number(P.occ.p) || RARITY_OCC_REF);
  const ageP = Math.max(1e-9, naturalAgeProbability(P));

  // engine.js の従来値を土台にする。
  // 職業: p=10% を中立点にし、珍しい職業はより強く★へ反映。
  // 年齢: 1歳あたり1%を中立点にし、若年・高齢など人口の少ない年齢を強く反映。
  const occAdj = RARITY_OCC_EXTRA * Math.log10(occP / RARITY_OCC_REF);
  const ageAdj = RARITY_AGE_WEIGHT * Math.log10(ageP / RARITY_AGE_REF);
  P.logp += occAdj + ageAdj;
  P.stars = RARITY.findIndex(th => P.logp > th) + 1 || 5;
  P.rarityParts = { ...(P.rarityParts || {}), ageP, occP, occAdj, ageAdj };
  return P;
}

const generateBeforeRarityWeighting = generate;
generate = function weightedGenerate(t, lite, f) {
  return applyRarityWeighting(generateBeforeRarityWeighting(t, lite, f));
};

