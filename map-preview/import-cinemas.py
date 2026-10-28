"""Build map-preview/data/cinemas.json: major cinemas in the 23 wards.

Positions: OpenStreetMap Nominatim (ODbL), looked up by name. Seat counts are approximate
published totals and are game assumptions; 700 seats or more counts as a multiplex.
Usage: python3 map-preview/import-cinemas.py
"""
import json, math

CINEMAS = [  # name, lat, lon, seats
    ('TOHOシネマズ日比谷', 35.67307, 139.75941, 2800), ('TOHOシネマズ シャンテ', 35.67343, 139.76050, 600),
    ('TOHOシネマズ新宿', 35.69515, 139.70196, 2300), ('TOHOシネマズ六本木ヒルズ', 35.65952, 139.72923, 2100),
    ('TOHOシネマズ渋谷', 35.65919, 139.69888, 1400), ('TOHOシネマズ池袋', 35.73236, 139.71549, 1700),
    ('TOHOシネマズ上野', 35.70687, 139.77316, 1600), ('TOHOシネマズ日本橋', 35.68698, 139.77490, 1800),
    ('新宿バルト9', 35.69012, 139.70591, 1800), ('109シネマズプレミアム新宿', 35.69585, 139.70056, 750),
    ('109シネマズ木場', 35.66661, 139.80412, 1800), ('グランドシネマサンシャイン 池袋', 35.73088, 139.71640, 2400),
    ('池袋HUMAXシネマズ', 35.72990, 139.71589, 1100), ('ユナイテッド・シネマ豊洲', 35.65456, 139.79244, 2000),
    ('イオンシネマ板橋', 35.77033, 139.66064, 1900), ('T・ジョイ PRINCE品川', 35.62839, 139.73591, 1800),
    ('角川シネマ有楽町', 35.67511, 139.76268, 240), ('ヒューマントラストシネマ有楽町', 35.67412, 139.76319, 230),
    ('ヒューマントラストシネマ渋谷', 35.66197, 139.70272, 400), ('新宿武蔵野館', 35.69120, 139.70196, 250),
    ('テアトル新宿', 35.69232, 139.70517, 220), ('シネマート新宿', 35.69193, 139.70576, 300),
    ('シネクイント', 35.66087, 139.69985, 200), ('ユーロスペース', 35.65931, 139.69538, 240),
    ('早稲田松竹', 35.71162, 139.70823, 150), ('目黒シネマ', 35.63498, 139.71482, 120),
    ('池袋シネマ・ロサ', 35.73248, 139.70917, 300), ('新文芸坐', 35.73258, 139.71371, 270),
    ('下高井戸シネマ', 35.66594, 139.64279, 120), ('ポレポレ東中野', 35.70652, 139.68457, 100),
    ('シネマ・チュプキ・タバタ', 35.74115, 139.76175, 20)]

def main():
    out = []
    for i, (name, lat, lon, seats) in enumerate(CINEMAS):
        r = 25 if seats >= 700 else 12
        sx = 111195 * math.cos(math.radians(lat)); dx, dy = r / sx, r / 111195
        out.append({'id': 'cinema-%d' % i, 'name': name, 'xy': [lon, lat], 'radius': r,
            'bbox': [round(lon - dx, 6), round(lat - dy, 6), round(lon + dx, 6), round(lat + dy, 6)], 'area': math.pi * r * r,
            'type': 'commercial', 'subtype': 'cinema', 'placeKind': 'cinema', 'cinemaStyle': 'multiplex' if seats >= 700 else 'mini',
            'seats': seats, 'source': 'OpenStreetMap Nominatim による位置（ODbL）', 'precision': 'modeled-footprint'})
    json.dump({'version': 1, 'notes': '座席数は公表規模の概数（ゲーム用の仮定）。位置は名称検索による。網羅性は保証しない。', 'features': out},
        open('map-preview/data/cinemas.json', 'w'), ensure_ascii=False, separators=(',', ':'))
    print(len(out))

if __name__ == '__main__':
    main()
