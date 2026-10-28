# SwapSim 地図版の開発環境

- 対象: https://github.com/itsuka-itusika/swapsim-map
- このリポジトリは本家 SwapSim から独立している。本家の変更や取得は不要。
- Node.js 20以上を使う。既存の GitHub Actions は Node.js 22。
- 外部 npm パッケージへの依存はなく、通常のビルドに npm install は不要。
- 作業前に現在のブランチと未コミットの変更を確認する。
- 主な地図版ソースとデータは map-preview/、共通人物生成コードはルートにある。
- 確認手順: npm run build、その後 npm test。テストは dist/map-preview.html を参照するので、先にビルドする。
- 公開用の出力は dist/index.html と dist/assets/。dist/ は生成物なので直接編集しない。
- ローカル表示: ビルド後に python3 -m http.server 8000 --directory dist を実行する。
- 背景地図、施設補完、天気は外部通信を使う。オフライン時の挙動と取得成功時の挙動を区別して確認する。
- main への更新は GitHub Pages の公開につながる。ローカル環境設定だけの依頼では push や公開を行わない。

- ユーザーの継続指示: 明示的な停止指示がない限り、依頼された変更は検証後に main へ反映し、GitHub Pages の公開完了まで確認する。
