// ===== 趣味の細分類・人物条件による重み付け =====
// 「趣味」という時間帯別の統計カテゴリ自体の割合は変えず、趣味カテゴリが選ばれた後の文だけを
// 年齢・性別・都市度・地域・職業に応じて重み付けする。

const HOBBY_KIND_RULES = [
  ['game', /ゲーム|ガチャ|対戦/],
  ['readingComic', /漫画|マンガ|コミック/],
  ['readingBook', /小説|読書|本を|文庫/],
  ['fan', /推し|ライブ|コンサート|アーティスト|アイドル|VTuber/],
  ['musicPlay', /ギター|ピアノ|楽器|民謡|合唱|演奏/],
  ['karaoke', /カラオケ/],
  ['creative', /絵を|イラスト|スケッチブック|俳句|書道|陶芸/],
  ['craft', /手芸|編み物|ミシン/],
  ['photo', /カメラ|撮った写真|写真部/],
  ['model', /プラモデル/],
  ['fishing', /釣り/],
  ['camp', /キャンプ/],
  ['traditional', /将棋|囲碁|茶道|日本舞踊|花を生け|盆栽/],
  ['movieStage', /映画館|劇場/],
  ['beauty', /ネイル/],
  ['bowlingDarts', /ボウリング|ダーツ|ビリヤード|バッティングセンター/],
  ['mahjong', /麻雀/],
  ['gambling', /パチンコ/]
];

const HOBBY_AGE_W = {
  game:         [1.45, 1.65, 1.45, 1.20, .95, .70, .45, .30],
  readingComic: [1.35, 1.55, 1.35, 1.10, .90, .65, .45, .30],
  readingBook:  [1.00, 1.10, 1.15, 1.15, 1.15, 1.20, 1.20, 1.15],
  fan:          [1.25, 1.55, 1.45, 1.15, .85, .60, .40, .30],
  musicPlay:    [1.15, 1.25, 1.20, 1.15, 1.10, 1.05, .95, .80],
  karaoke:      [1.10, 1.35, 1.35, 1.20, 1.05, .85, .65, .55],
  creative:     [1.20, 1.30, 1.25, 1.15, 1.05, .95, .85, .75],
  craft:        [.75, .90, 1.00, 1.10, 1.20, 1.30, 1.35, 1.25],
  photo:        [.75, .95, 1.15, 1.25, 1.30, 1.25, 1.10, .90],
  model:        [.80, 1.00, 1.20, 1.35, 1.35, 1.25, 1.00, .75],
  fishing:      [.60, .75, 1.00, 1.25, 1.40, 1.55, 1.55, 1.35],
  camp:         [.70, 1.00, 1.25, 1.40, 1.40, 1.25, .95, .65],
  traditional:  [.55, .65, .80, 1.00, 1.20, 1.45, 1.70, 1.85],
  movieStage:   [1.00, 1.25, 1.30, 1.20, 1.05, .90, .75, .60],
  beauty:       [1.05, 1.40, 1.40, 1.25, 1.05, .80, .55, .40],
  bowlingDarts: [.85, 1.20, 1.30, 1.25, 1.10, .90, .65, .45],
  mahjong:      [.45, .65, .90, 1.15, 1.30, 1.35, 1.25, 1.05],
  gambling:     [.20, .35, .65, 1.00, 1.25, 1.35, 1.20, .90]
};

function hobbyKindOf(text) {
  for (const [kind, re] of HOBBY_KIND_RULES) if (re.test(text)) return kind;
  return null;
}

function hobbyAgeBand(age) {
  if (age < 13) return 0;
  if (age < 20) return 1;
  if (age < 30) return 2;
  if (age < 40) return 3;
  if (age < 50) return 4;
  if (age < 60) return 5;
  if (age < 70) return 6;
  return 7;
}

function hobbySexWeight(kind, sex) {
  const male = {
    game: 1.25, model: 1.55, fishing: 1.65, camp: 1.20, photo: 1.15,
    traditional: 1.10, mahjong: 1.35, gambling: 1.45, bowlingDarts: 1.15,
    craft: .55, beauty: .18, fan: .82
  };
  const female = {
    game: .82, model: .45, fishing: .55, camp: .85, photo: .95,
    traditional: .95, mahjong: .65, gambling: .45, bowlingDarts: .90,
    craft: 1.65, beauty: 2.50, fan: 1.45, creative: 1.20, readingBook: 1.12
  };
  return ((sex === 'm' ? male : female)[kind] || 1);
}

function hobbyRegionWeight(kind, P) {
  let w = 1;
  const urb = P.urb;
  if (kind === 'fishing') {
    if (P.pref && P.pref.coast) w *= 1.35;
    if (urb === 'rural' || urb === 'mid') w *= 1.20;
    if (urb === 'metro') w *= .82;
  }
  if (kind === 'camp') {
    if (urb === 'rural' || urb === 'mid') w *= 1.25;
    if (urb === 'metro') w *= .90;
  }
  if (kind === 'traditional' && (urb === 'rural' || urb === 'mid')) w *= 1.08;
  if (kind === 'movieStage' || kind === 'fan' || kind === 'karaoke' || kind === 'bowlingDarts') {
    if (urb === 'metro') w *= 1.18;
    else if (urb === 'rural') w *= .82;
  }
  if (kind === 'photo' && (urb === 'metro' || urb === 'city')) w *= 1.08;
  return w;
}

function hobbyJobWeight(kind, P) {
  const oc = P.occ || {};
  const tag = oc.tag || '';
  const name = oc.job && oc.job.n || '';
  let w = 1;
  if (kind === 'game' && (tag === 'it' || tag === 'stream')) w *= tag === 'stream' ? 1.45 : 1.20;
  if ((kind === 'fan' || kind === 'photo' || kind === 'creative') && tag === 'stream') w *= 1.35;
  if (kind === 'readingBook' && /教員|教師|講師|研究|大学/.test(name)) w *= 1.18;
  if (kind === 'beauty' && /美容|理容|モデル|アパレル|スタイリスト/.test(name)) w *= 1.35;
  if (kind === 'photo' && /写真|カメラ|デザイナー|記者/.test(name)) w *= 1.30;
  if (kind === 'musicPlay' && /音楽|演奏|講師/.test(name)) w *= 1.25;
  return w;
}

function hobbyEntryWeight(e, ctx) {
  const text = textOf(e);
  const label = actLabel(text, ctx.P.occ.group);
  if (ACT_CLASS[label] !== 'hobby') return 1;
  const kind = hobbyKindOf(text);
  if (!kind) return 1;
  const P = ctx.P;
  const ageW = HOBBY_AGE_W[kind] ? HOBBY_AGE_W[kind][hobbyAgeBand(P.age)] : 1;
  return Math.max(.08, Math.min(4, ageW * hobbySexWeight(kind, P.sex) * hobbyRegionWeight(kind, P) * hobbyJobWeight(kind, P)));
}

// entryW は自由時間内の文の相対重みに使われる。カテゴリ選択は ACT_RATE 側なので、
// ここを補正しても「趣味」そのものが選ばれる統計割合は変わらない。
const BASE_ENTRY_W_FOR_HOBBY = entryW;
entryW = function (e, ctx) {
  return BASE_ENTRY_W_FOR_HOBBY(e, ctx) * hobbyEntryWeight(e, ctx);
};

// 細分類を見せるための追加文。既存の ACT_CATS で hobby に分類される語を含める。
OFF_TX.student.push(
  [15, 24, '家庭用ゲーム機で、友達とオンライン対戦をしているところでした'],
  [15, 24, '好きな漫画を、最初の巻から読み返しているところでした'],
  [15, 23, 'スケッチブックに、思いついたキャラクターの絵を描いているところでした'],
  [16, 23, 'ギターで、好きな曲のコードを繰り返し練習しているところでした'],
  [15, 23, '推しのライブBlu-rayを見ながら、手元のグッズを並べ直しているところでした']
);

OFF_TX.college.push(
  [13, 25, 'PCゲームで、友人とボイスチャットをつないで対戦しているところでした'],
  [10, 21, 'カメラを持って街を歩き、気になった建物の写真を撮っているところでした'],
  [12, 23, '気になっていた小説を、一気に読み進めているところでした'],
  [12, 23, 'プラモデルの細かい部品に、慎重に色を塗っているところでした'],
  [10, 23, '映画館で、見たかった映画の上映を待っているところでした']
);

OFF_TX.adult.push(
  [6, 18, '川辺で、釣り糸の先をじっと見つめているところでした', { a: [20, 79] }],
  [8, 19, 'キャンプ場で、テントの張り綱を調整しているところでした', { a: [20, 69] }],
  [9, 24, 'プラモデルの小さな部品を、ピンセットで組み立てているところでした', { a: [20, 69] }],
  [8, 22, 'カメラの写真を見返し、残す一枚を選んでいるところでした', { a: [20, 79] }],
  [9, 23, 'ギターを手に、昔よく聴いた曲を弾いているところでした', { a: [20, 79] }],
  [9, 23, '読みかけの小説を開き、しおりを挟んだ先から読み始めたところでした', { a: [20, 89] }],
  [10, 23, '映画館で、上映前の予告編を眺めているところでした', { a: [20, 79] }],
  [9, 23, '推しのライブBlu-rayを見返しているところでした', { a: [20, 59] }],
  [9, 22, '編み物をしながら、少しずつ形になっていくのを確かめているところでした', { a: [20, 89] }],
  [10, 23, '将棋盤を前に、次の一手を長く考えているところでした', { a: [20, 89] }]
);

OFF_TX.senior.push(
  [8, 21, '囲碁盤を前に、相手の次の一手を待っているところでした'],
  [7, 18, '盆栽の枝ぶりを眺め、伸びた枝を一本だけ切ったところでした'],
  [8, 21, '俳句帳を開き、季語をどれにするか考えているところでした'],
  [8, 20, 'カメラを持って近所を歩き、季節の花の写真を撮っているところでした']
);

