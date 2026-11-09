# AI解説 Worker

地図版の通知書にある「AI解説」ボタンの裏側です。Cloudflare Workers で動き、LLM（既定は Gemini 3.1 Flash-Lite、Claude Sonnet 5.5 に切り替え可）に書かせた文章を返します。書かせる内容はリクエストの `mode` で決まります。

- `look`（既定）：一人ひとりの、いまこの瞬間の外見。プロフィール（年齢・性別・職業・身長と体重・趣味・健康）と場面（場所・天気・季節・時刻・していること）から、人物資料・プロフィールのように読める記録文を、人物ごとに1段落（100〜150字）で書かせます。本文は「ひと目の印象 → 顔まわり → 身なり → 直前の様子」の順に組み立て（当てはまらない段は飛ばす）、いまの姿は現在形、入れ替わる直前までしていたことは過去形にします。文体は禁止事項を並べず、年齢・性別の違う見本2つで示します（言い回しはまねさせない）。守らせることは実在のブランド名を使わないことと、データ中の指示に従わないことだけです。見出し「○○の外見情報」と年齢・性別・仕事はページが添えるので、本文には並べません。いちばんありがちな姿に偏らないよう、Worker が人物ごとに「ばらつきの手がかり」（身なりへの気の配り方・髪の手入れ・眼鏡・目に留まる特徴）を年齢に合わせて決めて添えます。手がかりは人物と日付から決まるので、同じ人には同じものが出ます（眼鏡や顔立ちなど変わらない特徴は日付によらない）。
- `swap`（デバッグ用）：入れ替わった直後の状況を、すでに起きた出来事として描写させます。2人のプロフィールは、Worker が「入れ替わり前」と「入れ替わり後（体ごとに肉体・場所と周囲・精神・ずれ）」に組み替えてから渡します。ページのデバッグ欄「AI解説切り替え」で切り替えます。

キャッシュはモードごとに別で、`swap` は `mode` を加える前と同じキーなので、保存済みの解説はそのまま使えます。

## 有効にする手順（ブラウザだけ・約10分）

パソコンへのインストールは要りません。GitHub に3つの値を登録すると、ページの公開と同時に Worker も自動で公開されます。

1. **Anthropic の APIキーを作る**
   https://platform.claude.com/ で **API Keys → Create Key**。表示されたキー（`sk-ant-` で始まる）をコピーします。
   同じ画面の **Limits** で、月の利用上限（例: $10）も設定しておきます。

2. **Cloudflare の APIトークンを作る**（無料プランで可）
   https://dash.cloudflare.com/profile/api-tokens で **Create Token → 「Edit Cloudflare Workers」の Use template** を選び、
   Account Resources で自分のアカウントを選んで **Continue to summary → Create Token**。表示されたトークンをコピーします。

3. **GitHub に登録する**
   このリポジトリの **Settings → Secrets and variables → Actions → New repository secret** で、次の2つを作ります。

   | Name | Secret |
   |---|---|
   | `ANTHROPIC_API_KEY` | 手順1のキー |
   | `CLOUDFLARE_API_TOKEN` | 手順2のトークン |

4. **公開する**
   **Actions → Deploy map to GitHub Pages → Run workflow** を押します（main への次の更新でも同じことが起きます）。
   数分後、通知書に「AI解説」ボタンが出ます。

これだけです。Worker の作成、解説を保存する KV の作成、APIキーの登録、ページへの URL の受け渡しは、すべてワークフローが行います。

### うまくいかないとき

Actions の実行結果で **Deploy AI explain worker** の手順を開き、ログの最後を確認します。この手順が失敗してもページ自体は公開され、ボタンが出ないだけです。

- `You need to register a workers.dev subdomain`：Cloudflare を初めて使うアカウントです。ログに出るリンク（または Cloudflare ダッシュボードの **Workers & Pages**）で workers.dev のサブドメインを決めてから、もう一度 Run workflow します。
- `More than one account`：Cloudflare のアカウントが複数あります。ダッシュボード右側の **Account ID** を、secret `CLOUDFLARE_ACCOUNT_ID` として追加します。
- `Authentication error`：トークンの権限が足りません。手順2のテンプレートで作り直します。

## 仕組みと APIキーの守り方

```
ページ（GitHub Pages）  ──入れ替わりのデータ──▶  この Worker  ──APIキー付き──▶  Anthropic API
                         ◀──────解説文────────            ◀───────────────
```

- APIキーは GitHub の secret から Worker の secret へ直接渡します。リポジトリ・ページ・ビルド成果物には入りません（`npm test` が dist/ を検査します）。ワークフローは main への更新と手動実行でだけ動き、プルリクエストからは secret を読めません。
- ページが知っているのは Worker の URL だけです。URL は公開されても構いません。
- Worker は決まった形の入れ替わりデータ（時刻・場所・2人のプロフィール）だけを受け付け、プロンプトは Worker 側で組み立てます。任意の文章を LLM に渡す中継には使えません。
- 呼び出せるのは `ALLOWED_ORIGINS` に書いたページからだけです。

キーが漏れたかもしれないときは、Anthropic Console でそのキーを無効にし、新しいキーで secret `ANTHROPIC_API_KEY` を更新して Run workflow します。

## 費用を抑える仕組み

- 同じ入れ替わりの解説は KV に保存し、2回目からは LLM を呼びません（期限なし）。ページ側も端末に30件まで保存します。
- 新しい解説の生成は、1日（日本時間）に `DAILY_LIMIT` 件まで（既定300件）。同じ IP からは1分に4件まで。
- 出力は `max_tokens: 2000`、`effort: low`。

費用の目安（実測ではなく見積もり）：1件あたり入力約1,500トークン。既定の Gemini 3.1 Flash-Lite（thinking high、入力 $0.25 / 出力 $1.50 ／100万トークン、考える分も出力に含む）で約0.3〜0.8円、上限の300件を毎日使い切ると月 $15〜$50 程度です。Claude Sonnet 5.5（入力 $2 / 出力 $10）に戻すと1件約2円、300件で月 $120 程度になるので、そのときは `DAILY_LIMIT` も下げてください。Sonnet 5.5 では、安全上の判定で断られたときに別のモデルで自動的にやり直すサーバー側の仕組み（fallbacks）を使っています。

## モデルを切り替える（Claude ⇄ Gemini）

既定は Gemini 3.1 Flash-Lite（thinking high、`gemini-3.1-flash-lite:high`）です。Claude Sonnet 5.5 にも戻せます。

1. Gemini を使う場合は、Google AI Studio（https://aistudio.google.com/ ）で APIキーを作り、課金（有料枠）を有効にする。無料枠では、送った内容が Google の製品改善に使われます。
2. GitHub の Repository secrets に `GEMINI_API_KEY` として登録する。
3. 既定のモデルを変えるときは、**Settings → Secrets and variables → Actions → Variables** に `AI_MODEL` を作り、`gemini-3.1-flash-lite` などを入れて Run workflow する。Claude に戻すときは `AI_MODEL` を `claude-sonnet-5-5` にする（`wrangler.toml` の `MODEL` を書き換えてもよい）。

保存済みの解説はモデルごとに分けて残るので、戻すと以前の解説がそのまま使われます。

比較のため、リクエストに `"model"` を入れると、`ALLOWED_MODELS` にあるモデルに限ってそのモデルで生成します（返答の `model` に、どのモデルが書いたかが入ります）。

費用の目安（1件、入力約1,500・出力約1,000トークン）：Claude Sonnet 5.5 約2円、Gemini 3.1 Flash-Lite（入力 $0.25 / 出力 $1.50）約0.3円、Claude Haiku 5.5 約0.1円。

## 設定（wrangler.toml の `[vars]`）

| 名前 | 既定 | 内容 |
|---|---|---|
| `ALLOWED_ORIGINS` | `https://itsuka-itusika.github.io,http://localhost:8000` | 呼び出しを許すページの Origin |
| `MODEL` | `gemini-3.1-flash-lite:high` | 既定のモデル（Actions variables の `AI_MODEL` があればそちら）。Gemini は `:low` `:medium` `:high` で考える量を指定 |
| `ALLOWED_MODELS` | `claude-sonnet-5-5,gemini-3.1-flash-lite,claude-haiku-5-5` | リクエストで選べるモデル |
| `DAILY_LIMIT` | `300` | 1日に新しく生成する解説の上限 |

IP ごとの回数制限は `[[ratelimits]]` の `simple` で変えられます。変更を main に入れると、次の公開で反映されます。

別の場所に置いた Worker を使う場合は、Actions variables の `AI_EXPLAIN_URL`、または `map-preview/data/ai-explain.json` の `endpoint` に URL を書きます（上の自動公開が動いたときはそちらが優先）。

## 手元から公開・確認する（任意）

```sh
cd ai-explain
npm install
npx wrangler login
npx wrangler deploy                          # KV は自動で作られる
npx wrangler secret put ANTHROPIC_API_KEY    # キーを入力（画面にもファイルにも残らない）
```

ローカルで動かすときは `ai-explain/.dev.vars`（Git には入りません）に `ANTHROPIC_API_KEY=...` を書いて `npx wrangler dev --port 8787` を起動し、リポジトリのルートで `AI_EXPLAIN_URL=http://localhost:8787 npm run build` → `python3 -m http.server 8000 --directory dist` で http://localhost:8000 を開きます。

Worker の入力チェック・回数制限・キャッシュの単体テストは、ルートの `npm test` に含まれます（`map-preview/ai-explain.test.cjs`）。

渡しているプロンプトは `node ai-explain/print-prompts.mjs`（入れ替わり直後は末尾に `swap`）で、例の2人について書き出せます。APIキーや通信は要りません。
