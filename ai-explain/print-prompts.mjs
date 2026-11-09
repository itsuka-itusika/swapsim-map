// AI解説に渡しているプロンプトを、例の2人で書き出す（APIキー・通信は不要）。
//   node ai-explain/print-prompts.mjs            外見情報（既定）
//   node ai-explain/print-prompts.mjs swap       入れ替わり直後（デバッグ）
// ページが送るデータ（map-preview/ai-explain.js の payload）を Worker と同じ normalize に通してから組み立てる。
import { createRequire } from 'node:module';
import { LOOK_SYSTEM_PROMPT, LOOK_VERSION, SYSTEM_PROMPT, PROMPT_VERSION, normalize, buildLookPrompt, buildUserPrompt } from './src/explain.js';

const AiExplain = createRequire(import.meta.url)('../map-preview/ai-explain.js');
const X = (o = {}) => ({ surname: { k: '高橋' }, given: { k: '雄一' }, sex: 'm', age: 47, occ: { label: 'トラック運転手（正社員）' }, place: '高速道路', wxText: '晴れ 18度',
  sit: { text: '高速道路を走りながら、次のパーキングエリアで休むか考えているところでした' }, hobbies: [{ label: '釣り', detail: '海釣り' }], health: { text: '腰痛' }, body: { h: 171.2, w: 74.5 }, ...o });
const pair = { kind: 'pair', t: { y: 2026, mo: 11, d: 5, dow: 4, h: 13, mi: 17 }, gap: { stars: 4 }, A: X(),
  B: X({ surname: { k: '稲垣' }, given: { k: '千尋' }, sex: 'f', age: 50, occ: { label: '無職（療養中）' }, hobbies: [{ label: '園芸' }], health: null, body: { h: 156, w: 52 },
    place: '近所の公園', wxText: '晴れ 18度', sit: { text: '久しぶりに会った友人と、公園のベンチで話し込んでいるところでした' } }) };

const swap = process.argv[2] === 'swap';
AiExplain.setMode(swap ? 'swap' : 'look');
const req = normalize(AiExplain.payload(pair));
const [title, version, system, user] = swap ? ['入れ替わり直後（デバッグ）', PROMPT_VERSION, SYSTEM_PROMPT, buildUserPrompt(req)] : ['外見情報（既定）', LOOK_VERSION, LOOK_SYSTEM_PROMPT, buildLookPrompt(req)];
console.log(`===== ${title} ${version} — システムプロンプト =====\n${system}\n\n===== ${title} — ユーザープロンプト（例） =====\n${user}`);
