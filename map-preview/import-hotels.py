"""Build map-preview/data/hotels.json.

Usage: python3 map-preview/import-hotels.py <Daredemo_Tokyo_accommodation.csv>

Sources:
- 東京都「だれでも東京」宿泊施設 (CC BY 4.0):
  https://www.opendata.metro.tokyo.lg.jp/digitalservice/130001_Daredemo_Tokyo_accommodation.csv
- Major hotels missing from it, positioned with OpenStreetMap Nominatim (ODbL), coordinates below.

The CSV's room counts cover accessibility room types only, so room counts here are game
estimates: known totals for large hotels, otherwise a typical size for the hotel type.
"""
import csv, json, math, re, sys

EXTRA = [  # name, lat, lon
    ('ホテルニューオータニ東京', 35.68091, 139.73397), ('ザ・リッツ・カールトン東京', 35.66633, 139.73136),
    ('パーク ハイアット 東京', 35.68514, 139.69096), ('コンラッド東京', 35.66304, 139.76141),
    ('マンダリン オリエンタル 東京', 35.68715, 139.77289), ('アマン東京', 35.68559, 139.76539),
    ('シャングリ・ラ 東京', 35.68223, 139.76920), ('パレスホテル東京', 35.68450, 139.76124),
    ('ウェスティンホテル東京', 35.64174, 139.71551), ('ザ・プリンス パークタワー東京', 35.65536, 139.74709),
    ('東京プリンスホテル', 35.65902, 139.74814), ('グランドプリンスホテル新高輪', 35.63067, 139.73357),
    ('品川プリンスホテル', 35.62764, 139.73670), ('ホテル雅叙園東京', 35.63240, 139.71322),
    ('セルリアンタワー東急ホテル', 35.65635, 139.69928), ('東京マリオットホテル', 35.62188, 139.73681),
    ('ヒルトン東京お台場', 35.62629, 139.77078), ('東京ドームホテル', 35.70364, 139.75349),
    ('ホテルメトロポリタン', 35.72834, 139.70800), ('サンシャインシティプリンスホテル', 35.72998, 139.71953),
    ('フォーシーズンズホテル東京大手町', 35.68775, 139.76330), ('ANAインターコンチネンタルホテル東京', 35.66801, 139.74068),
    ('インターコンチネンタル東京ベイ', 35.65306, 139.76222), ('ザ・プリンスギャラリー 東京紀尾井町', 35.67962, 139.73693),
    ('ホテルグルーヴ新宿', 35.69592, 139.70080), ('アパホテル〈東新宿 歌舞伎町タワー〉', 35.69803, 139.70384),
    ('新宿ワシントンホテル', 35.68683, 139.69286), ('ドーミーイン秋葉原', 35.70254, 139.77329),
    ('ドーミーイン池袋', 35.73189, 139.71900), ('東横イン品川駅高輪口', 35.62654, 139.73744),
    ('ダイワロイネットホテル西新宿', 35.69432, 139.68930)]

LUXURY = r'帝国ホテル|Okura|オークラ|ニューオータニ(?!イン)|リッツ|パーク ハイアット|グランド ハイアット|アンダーズ|コンラッド|マンダリン|ペニンシュラ|フォーシーズンズ|アマン|シャングリ|パレスホテル|ウェスティン|椿山荘|雅叙園|プリンスギャラリー|パークタワー|インターコンチネンタル|東京ステーションホテル|キャピトルホテル|メズム|ハイアットセントリック|セルリアン|東京マリオット|プルマン'
CITY = r'ヒルトン|ハイアットリージェンシー|プリンス|京王プラザ|メトロポリタン|ニッコー|東京ドームホテル|第一ホテル|イースト21|リーガロイヤル|ロイヤルパーク|センチュリーサザンタワー|グルーヴ|ガーデンパレス|都市センター|メルパルク|ダブルツリー|ラビスタ|浅草ビューホテル|東武ホテル|東京グランドホテル|コートヤード|ゲートホテル|メルキュール|ミレニアム|JALシティ|ベルクラシック|モントレ|学士会館|丸の内ホテル|グランドアーク|ルポール|アジア会館|スクエアホテル|ブラッサム|BLOSSOM|京阪|ヴィラフォンテーヌ|MUJI|ノーガ|NOHGA|ONE@|庭のホテル|ワシントンホテル|日本青年館'
RYOKAN = r'旅館|RYOKAN|ほてる|hanare|由縁|かどやホテル'
HOSTEL = r'ユースホステル|BumB|ホステル|BED AND|Ｃ＆Ｊ'
ROOMS = {'京王プラザホテル': 1438, '帝国ホテル東京': 570, 'The Okura Tokyo': 508, 'ホテルニューオータニ東京': 1479, 'ザ・リッツ・カールトン東京': 245,
    'パーク ハイアット 東京': 177, 'グランド ハイアット 東京': 387, 'アンダーズ東京': 164, 'コンラッド東京': 290, 'マンダリン オリエンタル 東京': 179,
    'ザ・ペニンシュラ東京': 314, 'フォーシーズンズホテル丸の内東京': 57, 'フォーシーズンズホテル東京大手町': 190, 'アマン東京': 84, 'シャングリ・ラ 東京': 200,
    'パレスホテル東京': 284, 'ウェスティンホテル東京': 438, 'ホテル椿山荘東京': 267, 'ヒルトン東京': 830, 'ハイアットリージェンシー東京': 746,
    '東京ステーションホテル': 150, 'ザ・プリンス パークタワー東京': 603, 'グランドプリンスホテル新高輪': 908, '品川プリンスホテル': 3560,
    'ホテル雅叙園東京': 60, 'セルリアンタワー東急ホテル': 411, '東京マリオットホテル': 249, 'ヒルトン東京お台場': 453, '東京ドームホテル': 1006,
    'ホテルメトロポリタン': 807, 'サンシャインシティプリンスホテル': 1146, '新宿プリンスホテル': 571, 'グランドニッコー東京台場': 882, '第一ホテル東京': 278,
    'ホテル イースト21東京': 363, 'ザ・キャピトルホテル東急': 251, 'ANAインターコンチネンタルホテル東京': 844, 'インターコンチネンタル東京ベイ': 331,
    'ザ・プリンスギャラリー 東京紀尾井町': 250, 'ホテルグルーヴ新宿': 538, 'アパホテル〈東新宿 歌舞伎町タワー〉': 1003, '新宿ワシントンホテル': 1280,
    '小田急ホテルセンチュリーサザンタワー': 375, 'ホテルメトロポリタンエドモント': 438, 'リーガロイヤルホテル東京': 120}

def style(name):
    for s, pat in (('hostel', HOSTEL), ('ryokan', RYOKAN), ('luxury', LUXURY), ('city', CITY)):
        if re.search(pat, name):
            return s
    return 'business'

def norm(name):
    name = name.replace('株式会社', '').replace('\u3000', ' ').split(' / ')[0]
    return re.sub(r'\s+', ' ', name).strip()

def main(path):
    items = []
    for r in csv.DictReader(open(path, encoding='utf-8-sig')):
        if not r['市区町村名'].endswith('区') or '休業' in r['施設名'] or not r['緯度']:
            continue
        items.append((norm(r['施設名']), float(r['緯度']), float(r['経度']), '東京都「だれでも東京」宿泊施設（CC BY 4.0）'))
    items += [(n, la, lo, 'OpenStreetMap Nominatim による位置（ODbL）') for n, la, lo in EXTRA]
    out = []
    for name, lat, lon, source in items:
        sx = 111195 * math.cos(math.radians(lat))
        # Drop the same hotel listed twice (e.g. a Japanese and an English name at one address).
        if any(math.hypot((lon - f['xy'][0]) * sx, (lat - f['xy'][1]) * 111195) < 25 for f in out):
            continue
        s = style(name)
        rooms = ROOMS.get(name) or {'luxury': 280, 'city': 350, 'business': 180, 'ryokan': 25, 'hostel': 60}[s]
        radius = round(min(70, max(15, 15 + math.sqrt(rooms) * (0.9 if s == 'business' else 1.6))))
        dx, dy = radius / sx, radius / 111195
        out.append({'id': 'hotel-%d' % len(out), 'name': name, 'xy': [round(lon, 6), round(lat, 6)], 'radius': radius,
            'bbox': [round(lon - dx, 6), round(lat - dy, 6), round(lon + dx, 6), round(lat + dy, 6)], 'area': math.pi * radius * radius,
            'type': 'commercial', 'subtype': 'hotel', 'placeKind': 'hotel', 'hotelStyle': s, 'rooms': rooms,
            'roomsApprox': name not in ROOMS, 'source': source, 'precision': 'modeled-footprint'})
    json.dump({'version': 1, 'notes': '客室数は大規模ホテルの公表値の概数、それ以外は種別ごとの仮定。位置から半径を推定した概略円。営業状況・網羅性は保証しない。',
        'features': out}, open('map-preview/data/hotels.json', 'w'), ensure_ascii=False, separators=(',', ':'))
    print(len(out), {s: sum(f['hotelStyle'] == s for f in out) for s in ('luxury', 'city', 'business', 'ryokan', 'hostel')})

if __name__ == '__main__':
    main(sys.argv[1])
