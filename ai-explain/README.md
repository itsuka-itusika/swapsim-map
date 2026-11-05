# AI解説 Worker

地図版の通知書にある「AI解説」ボタンの裏側です。Cloudflare Workers で動き、入れ替わりの直後に起こりそうな状況と混乱を LLM（既定は Claude Haiku 5.5）に予測させて返します。

## 仕組みと APIキーの守り方

```
ページ（GitHub Pages）  ──入れ替わりのデータ──▶  この Worker  ──APIキー付き──▶  Anthropic API
                         ◀──────解説文────────            ◀───────────────
```

- APIキーは Worker の secret（`ANTHROPIC_API_KEY`）にだけ置きます。リポジトリ・ページ・ビルド成果物には入りません（`npm test` が dist/ を検査します）。
- ページが知っているのは Worker の URL だけです。URL は公開されても構いません。
- Worker は決まった形の入れ替わりデータ（時刻・場所・2人のプロフィール）だけを受け付け、プロンプトは Worker 側で組み立てます。任意の文章を LLM に渡す中継には使えません。
- 呼び出せるのは `ALLOWED_ORIGINS` に書いたページからだけです。

## 費用を抑える仕組み

- 同じ入れ替わりの解説は KV に保存し、2回目からは LLM を呼びません（期限なし）。ページ側も端末に30件まで保存します。
- 新しい解説の生成は、1日（日本時間）に `DAILY_LIMIT` 件まで（既定300件）。同じ IP からは1分に4件まで。
- 出力は `max_tokens: 2000`、`effort: low`。

費用の目安（実測ではなく見積もり）：1件あたり入力約1,100トークン・出力約1,100トークンで、Claude Haiku 5.5（入力 $0.10 / 出力 $0.50 ／100万トークン）なら約 $0.0007（0.1円ほど）。上限の300件を毎日使い切っても月 $6 程度です。Cloudflare Workers と KV は無料枠の範囲に収まります（KV の書き込みは1件の生成で2回、無料枠は1日1,000回）。

念のため、Anthropic Console の **Limits** で月の利用上限も設定してください。

## 初回セットアップ

Node.js 20 以上と Cloudflare アカウント（無料プランで可）を用意します。

1. Anthropic Console（https://platform.claude.com/ ）で APIキーを作り、月の利用上限を設定する。
2. 依存パッケージを入れる。

   ```sh
   cd ai-explain
   npm install
   npx wrangler login
   ```

3. 解説を保存する KV を作り、表示された `id` を `wrangler.toml` の `REPLACE_WITH_KV_NAMESPACE_ID` と置き換える。

   ```sh
   npx wrangler kv namespace create EXPLAIN_KV
   ```

4. APIキーを secret として登録する（入力したキーは画面にもファイルにも残りません）。

   ```sh
   npx wrangler secret put ANTHROPIC_API_KEY
   ```

5. 公開する。最後に `https://swapsim-ai-explain.<あなたのサブドメイン>.workers.dev` の URL が表示されます。

   ```sh
   npx wrangler deploy
   ```

6. ページに Worker の URL を教える。どちらか一方で構いません。
   - GitHub のリポジトリで **Settings → Secrets and variables → Actions → Variables** に `AI_EXPLAIN_URL` を作り、手順5の URL を入れる。そのあと **Actions → Deploy map to GitHub Pages → Run workflow** で再公開する。
   - `map-preview/data/ai-explain.json` の `endpoint` に URL を書いてコミットする。

   URL が空のあいだ、ページに「AI解説」ボタンは出ません。

## 設定（wrangler.toml の `[vars]`）

| 名前 | 既定 | 内容 |
|---|---|---|
| `ALLOWED_ORIGINS` | `https://itsuka-itusika.github.io,http://localhost:8000` | 呼び出しを許すページの Origin |
| `MODEL` | `claude-haiku-5-5` | 使う Claude のモデル |
| `DAILY_LIMIT` | `300` | 1日に新しく生成する解説の上限 |

IP ごとの回数制限は `[[ratelimits]]` の `simple` で変えられます。変更後は `npx wrangler deploy` で反映します。

## キーが漏れたかもしれないとき

Anthropic Console でそのキーを無効にし、新しいキーを `npx wrangler secret put ANTHROPIC_API_KEY` で登録し直してください。ページの再公開は不要です。

## ローカルで確かめる

`ai-explain/.dev.vars`（Git には入りません）に `ANTHROPIC_API_KEY=...` を書き、`npx wrangler dev --port 8787` を起動します。別の端末でリポジトリのルートから `AI_EXPLAIN_URL=http://localhost:8787 npm run build` を実行し、`python3 -m http.server 8000 --directory dist` で http://localhost:8000 を開きます。

Worker の入力チェック・回数制限・キャッシュの単体テストは、ルートの `npm test` に含まれます（`map-preview/ai-explain.test.cjs`）。
