## 本家の画面ソースを直接再利用

`original-ui.mjs` が本家 `shell.html` の判子CSS・通知書HTML・通知書CSS、および `app.js` の整形関数・renderCardFinal・押印・スクロール処理をビルド時に抽出します。通知書の手書き簡略テンプレートは廃止。本家の学年付き所属ラベルも `engine.js` の返却式を再利用。学校敷地の生徒は年齢だけでなく生年月日からの学年が施設段階に合うよう抽選します。地図条件の母集団、場所・天気の扱い、全国抽選と異なる役割確率だけを地図固有として維持。

## 通知書と操作画面の復元

地域ジャンプのプルダウンを削除し、半径と抽選ボタンを地図より前へ配置。境界比較は折り畳み内。通知書は本家と同じ体格・健康生成（settleHealth/bodyOf）、氏名ルビ、生年月日、場所・季節推定の天気、性別・年齢、身長・体重・体格区分、職業/所属、趣味、健康、時刻付き状況、発行番号・日時を表示。家族構成は本家の既定同様非表示。めずらしさは本家の式・閾値を使うが、役割確率を円内の人数比に置換するため「地図条件内」と表記し、全国抽選との同等性は主張しない。コピー・Xへの投稿リンクも追加。

放送拠点はテレビ7局とラジオ3局。制作・照明・美術・衣装・編成・送出・報道デスク等を追加してテレビ17職種、ラジオ10職種。登録点の仮定敷地を一般用途より優先。共有拠点はテレビ・ラジオ双方を保持。緑地への円形敷地の漏れを抑制。位置・滞在定員・職種比は近似であり実在職員の再現ではない。

## 主要ランドマーク・霊園の敷地補完

2026-10-27：OpenStreetMap APIの29範囲から164件の施設・公園・墓地ポリゴンを同梱。水面を除き用途地域や概略工業区域より優先します。全23区の施設を網羅するデータではありません。`data/landmark-audit.json` は各敷地の代表点での新旧判定です（重なる小施設や水面は優先）。

競馬場・ドーム・競技場・アリーナ・霊園は `venue-model.js` を使用。施設の人数・性別比・職員構成・定員未記載時の収容人数はゲーム用仮定です。開催日程とは連動せず、画面で「通常・非開催」「試合・競馬の開催を仮定」「コンサート開催を仮定」を選べます。通常時も厩務員・調教・保守・管理・練習等が発生します。深夜・早朝（22時以降から9時未満）は観客を出しません。霊園は墓参・管理・清掃・植栽・墓石補修・警備。

自然教育園の開園時間・通常休園日は公式案内に基づく補正（臨時開園は未対応）。https://ins.kahaku.go.jp/riyou/nyuen.html

再取得：`python map-preview/import-landmarks.py` → `node map-preview/prepare-landmarks.cjs` → `node map-preview/build-light.mjs`。原典の生データは一時領域に保存し、必要敷地だけ同梱します。OpenStreetMapはOpen Database License 1.0、© OpenStreetMap contributors。

# 土地タイプ別モデルへの移行（R5）

現在の方式・データの収録状況・検証方法は [LAND-MODEL.md](LAND-MODEL.md) を参照してください。以下は旧方式を含む開発履歴です。

# 地図連動型人物生成・検証版

専用ブランチ `codex/map-linked-preview`。本番入口は変更しない。
`npm run build` 後の `dist/map-preview.html` を直接ブラウザで開く。
地図タイルの表示には通信が必要だが、人物抽選や施設検索は外部問い合わせをしない。
Netlifyのブランチプレビューでは `/map-preview.html`。

## 実装済み
- 地理院の実地図、クリック、半径100/300/500/1000m、日時、施設・自治体名検索。
- 1都3県253市区町村の境界判定。隣接自治体をまたぐ円を標本積分。
- 実在施設の位置・種類を事前加工して同梱。閉校コード2は除外。
- 施設を仮の小円として配置。円同士の交差面積で施設人数を按分し、人口メッシュへ均さない。
- 国勢調査2020年の年齢性別、既存職業・名前・趣味・世帯生成を再利用。
- 地点の変更で古い人物結果をクリア。対象外・通信失敗表示、1万回の抽選検証。

## データ上の未完部分（統計完成版ではない）
- 500m人口メッシュは未導入。市区町村人口÷境界から求めた面積の平均密度を利用。山林や区域内の水面も一様になる。
- 施設人数、仮の敷地半径、役割構成、時間帯はモデル値。実際の定員・建物形状ではない。
- 入居者は背景人口からモデル人数を減じて再配置。一般人口の昼残留率65%。通勤・通学・入院の実際の流出入は未校正。
- 学校男女区分は data/school-sex.json の出典付き確認記録を school-policy.js で適用。未照合校は unknown として共学校と区別。学校段階・都県を含む完全一致で照合し、利用者指定により名称の「女子」「女学院」「男子部」等からの推定も採用。幼稚園や母体名だけの附属校は推定対象外とし、判明した共学化を優先する。現在の照合数は data/school-sex-coverage.json。共学校の男女実数・工学系等の男女比・全校照合は未完。
- 駅別の乗降客・工場補正、経済センサス、天候は未導入。商業・オフィスは地域設定で補正。
- 現在行動は既存の状況生成を利用。
- 初版は1都3県の軽量化済み地域データを一括で保持。県別遅延ロードは今後の最適化。

## 出典・利用条件
- 地理院タイル https://maps.gsi.go.jp/development/ichiran.html
- 境界：国土交通省 国土数値情報 行政区域2025年（CC BY 4.0）を共同通信社 japan-choropleth が加工。本版はさらに境界を簡略化し面積を近似。
  https://github.com/kyodo-official/japan-choropleth
- 学校：国土交通省 国土数値情報 P29-21（2021年）を加工。
  https://nlftp.mlit.go.jp/ksj/gml/datalist/KsjTmplt-P29-v2_0.html
- 福祉施設：国土交通省 国土数値情報 P14-23（2023年）を加工。居住型高齢者施設の明示的な分類のみ採用。通所施設、秘匿対象の福祉施設等は含めない。
  https://nlftp.mlit.go.jp/ksj/gml/datalist/KsjTmplt-P14-2023.html
  **神奈川県の高齢者施設データは商用利用に各施設への許可が必要な区分を含む。本版は非商用の検証用。商用化前に該当データを差し替えるか許諾を得る必要がある。**
  https://nlftp.mlit.go.jp/ksj/gml/codelist/R5_Terms_of_Use_WelfareInstitution.xlsx
- 医療機関：国土交通省 国土数値情報 P04-20（2020年）を加工。病院のみ、診療所・歯科医院を除外。
  https://nlftp.mlit.go.jp/ksj/gml/datalist/KsjTmplt-P04-v3_0.html
- 基礎人口・属性：リポジトリの stats/regional-census-sources.json、stats/README.md。
- Leaflet 1.9.4：BSD 2-Clause。vendor/LICENSE に原文を同梱。

取得日：2026-10-26。施設の現在の存続は保証しない。
再生成：`python map-preview/download.py` → `python map-preview/prepare.py` → `node map-preview/build.mjs`。
Python前処理は shapely が必要。原データは `/tmp/gov`、境界は `map-preview/data/boundaries-*.json`。
検証：`node --test map-preview/test.cjs`、`npm run verify`。

## 男女区分の追加資料
神奈川県2026年度私立学校名簿、千葉県2026年私立学校名簿、東京都2026年度私立高校募集資料、埼玉県男女別学校一覧を照合。各記録に資料URLと時点を保存。import-school-sex.py から再生成可能。資料の年度は日時指定による歴史的な在籍構成の再現を意味しない。

名称推定・非公式資料・共学化例外の追加は `python map-preview/extend-school-sex.py`。状況文は専用文を廃止し、swapsimの `situation(P,t)` をそのまま利用（年齢・職業・日時・趣味等を反映）。地図上の施設に行動を固定しない。

Wikipedia「日本の男女別学校一覧」の1都3県を `node map-preview/apply-wiki-schools.cjs` で照合。学校段階・都県の完全一致を維持。桐朋女子高校・宝仙学園高校・星野高校は一部共学として50:50暫定値を使用。高校の出典区分は全日制。再生成順は import → extend → apply-wiki。新旧校名で照合できない施設や地図未収録施設までの完全網羅を保証するものではない。

## 地域来訪者（2026-10-27）
添付 shutoken_area_attributes.md を参考に84地区を設定。areas.jsonの中心座標・半径は概略、タグ0〜4と1500人/km²/タグはすべてゲームモデル。一般滞在者・施設に、勤務、学生、買い物、国内観光、外国人観光、夜間娯楽を追加する。日時別の密度補正と中心からの二次減衰を適用。同じ役割の地区重複はサンプル点ごとに最大値を使用し二重加算を抑える。実際の流出入や観光客数を校正した推計ではない。外国人居住タグから観光客の国籍を推定しない。イベント日は未接続のため幕張に一律のイベント増加を適用しない。

inbound.json: 日本政府観光局（Japan National Tourism Organization）、2024年年間訪日外客数・2025年1月15日推計。https://www.jnto.go.jp/news/_files/20250115_1615.pdf 。20市場＋その他の残差で総数36,869,900人。観光以外を含む全国入国フローを外国人観光客の国・地域の代用重みとして使用し、地域別実測・最新値とはしない。年齢・男女比はゲーム設定。外国人観光客は国・地域と旅行者属性を表示し、日本人用氏名・趣味は表示しない。職業の国別モデルは未設定。観光文はvisitor-situations.jsで国内外共用＋訪日専用、昼夜・子ども条件付き。一般人物の状況は既存swapsimを使用。

配布用ファイル: dist/map-preview-20261027-areas.html。学校等の独立した施設人数は地域補正で変更しない。

## 夜の来訪者・就業者（2026-10-27）
91地区。夜の飲食娯楽客をタグ当たり6500人/km²、飲食勤務者1600、成人向け利用客2200、成人向け勤務者1100、キャバクラ勤務者350としてモデル化。中心からの減衰・時刻・円内積分を適用する前の係数であり実測密度ではない。金・土曜夜は1.2倍。成人向けの7地区を添付資料から追加。成人向けタグは明示した地区だけに設定し、一般の歓楽街へ一律適用しない。
夜の客・勤務者は20歳以上。客の通常職業は維持し、勤務者のみ既存JOB_OBJSから該当職種を選ぶ。夜の飲食・娯楽客は既存OFF_TXから目的に合う文、成人向け客はADULT_VENUE_TX、勤務者は職種別WORK_TXから直接選ぶ。entryOK/fromPoolで年齢・性別・日時・職業・体調条件を維持する。成人向け役割は既存文の営業時間に合わせ10〜24時、キャバクラ勤務は18〜24時に限定。深夜の飲食・娯楽に候補がない場合のみmap専用の3文を利用。観光文へのフォールバックは撤廃。
配布用ファイル: dist/map-preview-20261027-nightlife.html。

## 夜間状況拡充 v2
飲食10文・娯楽10文を夜間役割の候補に直接追加。18〜翌5時（ボウリング・ゲームセンター・ライブハウスは24時まで）。酒を明示する2文は既存の妊娠条件npを維持。
Wikipedia「風俗街」https://ja.wikipedia.org/wiki/風俗街 を地域リストの参考にし、現在は風俗街でない★印の地区は追加対象から除外。鶯谷・湯島・道玄坂円山町・八王子三崎町・池袋北西口・福富町・大宮南銀座の7地区を追加し98地区。adultBoostはゲーム用密度倍率（2.5〜3.5倍）で、記事から実際の人数や比率を引用した値ではない。一般歓楽・観光の密度は倍率対象外。役割ごとの最大密度を選ぶ前に適用し、重複地区の加算はしない。吉原・堀之内・南町は性風俗型としてキャバクラ勤務者をその地区から生成せず、客の状況も性風俗店用に限定する。広い円では周辺人口が加わり割合は低下する。
配布ファイル: dist/map-preview-20261027-nightlife-v2.html。

## オタク街・サブカル街
利用者提供の分類に基づく16地区・18ジャンル。乙女ロード・中野ブロードウェイを独立エリアとして追加し計100地区。ジャンルは同人、女性向け、男性向け、アニメ漫画、ゲーム、BL、舞台、声優、アイドル、バーチャル配信者、カード、フィギュア、鉄道、模型、電子工作・自作PC、古書玩具、コスプレ、推し活。ジャンル値で当該来街者の趣味・状況を同時に抽選。地域の全住民の趣味や属性を一律変更しない。年齢・男女比はゲーム仮定、趣味来街者は10〜21時のみ。中野は25〜69歳、他地区は14〜49歳。既存の学校・施設分布は維持。外国人観光客の趣味への接続は未実装。配布: dist/map-preview-20261027-subculture.html。

## 皇居・大型公園・緑地（2026-10-27）
41区域を手作業の概略ポリゴンで収録（green-zones.json）。皇居内部・東御苑・外苑・北の丸を区別し、東御苑等の小区域を内部より優先する。代々木、新宿御苑、上野、井の頭、昭和記念、横浜・川崎・さいたま・千葉等の主要公園を収録。全国・1都3県全公園の網羅ではない。ポリゴンは実境界と一致せず、園内の池・建物は未分割。水辺の公園は行政境界の陸域内だけ計算。未収録緑地は従来分布。
円のサンプル点で皇居・緑地内部の一般滞在者と街別来訪者を除き、専用密度へ置換。円外周が街へ出る場合は街側だけ従来分布。学校・病院・介護施設の独立モデル人数は変更しない。
皇居内部: 皇宮護衛官、宮内庁職員、庭園管理作業員、施設管理技術者。実在人物・皇族・実際の職員数や警備配置は生成しない。内部一般参観コースの詳細は未モデルのため一般客を入れない。東御苑と外苑の来園者を別に生成。人口はすべて仮想人数であり公表定員・人員配置ではない。
夜の内部密度は職員を含め16人/km²程度（昼間平日310）。公園は夜間一般利用者を昼間の0.3%、早朝夕方は4%程度に抑え、管理作業員は夜間ゼロ、警備員は4人/km²。閉園施設の一般利用者はゼロ。夜間も皇居警備・公園警備の架空人物は残る。
皇居東御苑は宮内庁の通常公開時刻・月金休園・月曜祝日の翌火曜・年末年始をモデルに反映。臨時休園は未取得。ほかの有料庭園・公園は代表営業時間による近似（季節変更・特別開園・休園日は完全再現しない）。
職務の参考: https://www.npa.go.jp/kougu/outline/index.html および https://www.npa.go.jp/kougu/mission/index.html 。公開ルールの参考: https://www.kunaicho.go.jp/visit/higashigyoen/index.html 、https://sankan.kunaicho.go.jp/guide/koukyo.html 。具体的職務・人数・行動頻度はゲーム設定。
配布: dist/map-preview-20261027-green.html。

## 水域と非住宅地（2026-10-27）
国土交通省「国土数値情報 湖沼データ（2005年）」https://nlftp.mlit.go.jp/ksj/gml/datalist/KsjTmplt-W09-2005.html の全国ZIPから1都3県の29地物を抽出（prepare-land.py）。SHPの外周と穴を維持。水域2005年の現況であり現在の境界ではない。水域の追加12区域は手作業近似で、不忍池・井の頭池等、皇居の主な濠、東京湾中央部、主要6河川の下流を収録。河川は中心線と概略水面幅の近似で全流路を網羅しない。橋上・船上人口はゼロとして扱う。
水域 > 空港等の非住宅地区 > 皇居・公園 > 市街地の順。空港の大区域内でもターミナルを先に照合。市街地と来訪者のサンプルを除外し、公園側にも水面人口を作らない。施設の小円も水面にかかった部分はサンプルで減算。水域上のクリックでも円の陸地側に人がいれば抽選可能。全域水面なら抽選ボタンを無効にする。
17の手作業概略区域: 羽田・成田のターミナルと航空施設用地、横田・入間飛行場、大井ふ頭、大黒ふ頭、東扇島、浮島、蘇我・根岸の臨海工業地区、東京貨物ターミナル、多磨・八柱霊園、狭山丘陵の一部。実境界・実施設密度・実配置・実際の運用体制ではない。ターミナルは夜間に利用客を減らすが、少数の利用客・空港職員・警備員を残す。工場物流も夜勤を少数残す。墓参・山林散策者は夜間ゼロ。未収録区域や干潟等の細部には従来密度が残る。
密度・年齢・男女比はすべてゲーム仮定。職業・状況は専用役割として生成し、実在の施設職員を表さない。配布: dist/map-preview-20261027-landwater.html。

## 2026-10-27: Tokyo 23 wards / local 100m mesh rebuild

- Scope: only municipality codes 13101–13123. 62,279 cells, approximately 100m square, using a local equirectangular grid at latitude 35.7. This is NOT Japan's standard regional mesh or measured 100m census population.
- `prepare-mesh.cjs` builds offline attributes: residential (provisional default), student, green, office, nightlife, industrial, warehouse, shopping/tourism, water, special. Existing neighborhood tags and approximated land polygons determine attributes; eight extra manual industrial/logistics rectangles. School/medical/care/media/station/theme flags are added at build time. Center-based classification loses subcell detail. Unclassified residential land may need correction.
- Residents are normalized to each ward's census total minus assumed care-home residents. Occupancy falls during weekday daytime. Employment and visitors are added separately, not a population-conserving origin/destination model. Industrial, warehouse, green and airport cells use dedicated day/night roles.
- Facility populations remain independent disk sources; school gender policies apply only to pupils. Existing all-day facility capacities remain game assumptions. No real people generated.
- Broadcasting: NHK broadcast center, TBS television/radio, Nippon Television, Fuji Television, TV Asahi, TV Tokyo, Bunka Hoso, J-WAVE. Official company addresses are linked in `data/broadcast.json`; approximate points and footprints, fictional occupancy and professions. Shared-building office population remains in mesh. Sources verified 2026-10-27.
- Stations: `download-stations.py` fetches HeartRails Express line/station data once (88 lines, 1,708 source line-station records), `prepare-stations.cjs` clips to 23 wards and merges same-name stations within 450m, producing 493 stations. Attribution: **HeartRails Express https://express.heartrails.com/**. Capacities model simultaneous presence, not ridership. Morning/evening peaks; passenger zero between 01:00–04:30; representative schedule, not actual train timetables. No runtime station service requests. Source may include stale line/station records, no claim of exhaustive current network.
- Theme parks: Tokyo Dome City Attractions, Hanayashiki, Arakawa Yuen, Tokyo Joypolis, KidZania Tokyo, Warner Bros. Studio Tour Tokyo. Source links in `data/theme-parks.json`. Representative hours, manual points/footprints, no daily operating calendar; Arakawa Tuesday closure applied. KidZania children aged 3–15 get experience scenes and accompanying adults get supervision scenes; studio tour uses exhibition scenes, not ride scenes. Outside operating hours only workers; ride/retail/food workers get preparation/cleanup scenes.
- Situation pipeline: occupation/role first, clock/day/school vacation second, eligible existing swapsim pool third, supplement fourth. Reuse retains existing age/sex/job/season/health predicates. School class/lunch/afterschool pools separated; no morning club or cafeteria lunch. Teachers, medical/care, office, manufacturing, logistics, household, seniors and shift workers use separate context. Gender-neutral acts shared; existing gender-conditioned text retains original conditions. Immediate repeat avoidance in timed pools. `situation-text-review.md` lists every new supplement verbatim.
- Files: `dist/map-preview-tokyo23-100m.html` is the verification deliverable; branch remains `codex/map-linked-preview`. Production not deployed.

## Correction: independent overlapping mesh attributes

A land-use class is now distinct from independent cultural/visitor/employment layers. `mesh-attributes.js` retains EVERY existing area tag (shopping, fashion, tourist, inbound, youth, office, student, night, adult, subculture), including every weighted subculture genre. A 100m cell can therefore be office + shopping + domestic tourism + foreign tourism + fashion, etc. Adult/subculture/tourist distributions were already in cell role weights; they are now explicit selectable map overlays and labeled cell attributes. Residential and green have distinct labels and colors. Industrial/logistics overrides no longer erase neighborhood role weights.

`data/mesh-districts.json` adds modeled characteristic districts: government, politics, legal, international business, research, medical, publishing, books, specialty shops, wholesale, market, museum/culture, theater/live performance, sports facilities, temples, shrines, hotel, waterfront, senior visitors, lifestyle commerce, local shopping arcades, multicultural commerce. Approximate manually chosen centers/radii; not authoritative zoning or ethnicity inference. `urban-context.js` connects these layers to fictional jobs and visitors with time/weekday rates; market workers peak early, cultural/retail visitors operate in daytime, hotels retain overnight staff. Sports does not assert that a match is occurring. Multicultural commerce does not assign nationality or ethnicity to residents. Existing swapsim job/time/sex/age conditions still gate reused text. Geographic coverage remains provisional and unclassified cells retain a residential default.

## R3 forest boundary / version identification

Fixed the undersized approximate Meiji Jingu polygon that classified northern forest cells as residential. Meiji Jingu uses the lower-density forest profile rather than garden profile. Geometry remains a manual approximation; official precinct guide: https://www.meijijingu.or.jp/guide/ . The UI now shows an R3 build label, a unique download filename and the selected zone's modeled subtotal alongside the whole-circle total, so surrounding residents are not presented as shrine attendees.

## R4: make the default district display match the classification

The previous 47 figure counted internal tags; it did not mean 47 mutually exclusive map classes. R4 provides 30 readable map classes, plus overlapping tags. Default display is now district character (not the old ten land-use classes), and its legend is generated from exactly the same definitions as rectangle colors and selected-cell labels. Synthetic maximum-strength office/shopping/night/student labels no longer conceal the measured neighborhood weight. Specific adult/subculture/specialty settings are considered when choosing a readable representative class; all underlying generation roles remain weighted independently. Attribute filters have their own live legend. A unique R4 filename and page label identify this correction.

Coverage limitation: 47,500 of 62,279 cells still use the residential default, not a separately verified residential-land-use survey. District circles are manually modeled, incomplete and approximate. Do not describe all 23 wards or every 100m cell as verified classification. The 47 internal tags and 30 map classes must not be conflated in reports.


### 矯正・防衛・行政・国会の特殊エリア

`public-areas.json` は公開OSMの敷地・建物ポリゴン（東京拘置所、市ヶ谷・練馬・十条・三宿・目黒・用賀・朝霞、主要合同庁舎・省庁、都庁、国会議事堂・議員会館）。水域・行政境界の判定後、一般用途地域や周辺施設より優先する。朝霞の区外部分は既存の23区境界で除外。三宿の自衛隊中央病院は既存の病院モデルを残す。ポリゴン同士は小さいものを優先し二重加算せず、選択円との重なり面積で人数を配分する。

`CivicModel` は刑務所／拘置所／駐屯地／官庁／国会を別モデルにする。拘置所の未決拘禁者を服役中とは表記しない。被収容者、刑務官、医療・事務職、弁護士、面会者、自衛官の事務・訓練・整備・補給・当直・休息、防衛省事務官・技官、行政事務・技術・窓口職、議員・秘書・国会職員・衛視・報道・見学者などを分ける。夜間も被収容者と当直等は残し、行政窓口・訓練・面会等は時間・休日で減らす。衆議院議員は25歳以上、参議院議員は30歳以上。

人数・性別比・勤務割合・見学時間はゲーム用の推定設定で、実在の収容人数、配置人員、開庁・接見・見学予定ではない。国会の実際の開会予定は取得しない。刑務所エンジンは実装済みだが、現在の23区内に区外の刑務所を創作配置していない。主要施設の収録であり全官庁・全施設の網羅ではない。再取得は `python3 map-preview/import-public-areas.py` → `node map-preview/prepare-public-areas.cjs`。

### 地図版の状況文

時間別の補助文と、駅・テーマパーク・放送局・矯正施設・駐屯地・官庁・国会・競技場・霊園・緑地などの状況を役割別に見直した。高校生は中学生と分け、授業・昼休み・放課後を別プールから選ぶ。学校の学年、日時、場所、施設の役割に合わせる。本家の条件付き文章も活用し、補助文とは抽選で併用する。街中の学生には教室内の状況を割り当てず、観光客の文章は通知書の状況にも反映する。新しい補助文の全文は `situation-review.md` を参照。

### お遊び人物

皇居の内側のみ「神職」（皇室を連想する架空の人物）、霊園のみ「幽霊」（夜間に重み増）、テレビ局のみ「アイドル」（18〜35歳、ラジオ局では出現しない）を低い重みで追加。神職の期待人数は皇居の全体で0.5人相当に抑え、円との重なり面積で配分。幽霊は生身の健康状態を生成結果に表示せず、身長・体重など本家の通知書の項目は維持する。

### 開催予定と自動推定

2026年10月28日確認の公開日程を `data/venue-schedules.json` に収録。大井競馬場、有明アリーナ、東京ドームの確認できた日程・施設・開場時刻を優先し、終了や退場の時刻は仮定。日程未収録を非開催扱いにせず施設ごと・日付ごとの固定された推定を使用。大井競馬の2026年10〜12月は公式の年間開催日以外を競馬非開催として扱う。公式掲載の更新を単体HTML自身が自動取得するものではない。日程データは再確認・更新が必要。

### 警察署

警察庁「全国警察施設名称位置等」2026年4月1日時点から23区内の警察署を抽出し、国土地理院の住所検索等で地点化。正確な敷地ではなく半径20mの概略円。地域・捜査・交通・窓口の警察官、事務職員、手続きや相談の来署者、清掃スタッフを別役割で抽選。夜間にも当直や相談の役割を残す。人数や勤務割合はゲーム上の仮定で、実際の職員配置や事件情報ではない。交番は警察署とは区別。
