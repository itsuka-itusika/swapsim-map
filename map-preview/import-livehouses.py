"""Build map-preview/data/livehouses.json: major live houses, idol theatres and jazz clubs in the 23 wards.

Positions: OpenStreetMap Nominatim (ODbL) by name, or the GSI address search (国土地理院) by street address where
OpenStreetMap has no entry. Capacities are approximate published standing (seated for jazz clubs) figures and are game
assumptions. Style: hall (1,000 or more), club, idol (idol theatre) or jazz (dinner-show club).
Usage: python3 map-preview/import-livehouses.py
"""
import json, math

VENUES = [  # name, lat, lon, capacity, style, position source
    ('Zepp Haneda(TOKYO)', 35.547326, 139.756625, 2900, 'hall', 'osm'),
    ('Zepp DiverCity(TOKYO)', 35.624813, 139.774410, 2400, 'hall', 'osm'),
    ('豊洲PIT', 35.649676, 139.788313, 3100, 'hall', 'osm'),
    ('Zepp Shinjuku(TOKYO)', 35.695623, 139.700740, 1500, 'hall', 'osm'),
    ('EX THEATER ROPPONGI', 35.661210, 139.727266, 1700, 'hall', 'osm'),
    ('Spotify O-EAST', 35.658647, 139.695517, 1300, 'hall', 'osm'),
    ('Spotify O-WEST', 35.658477, 139.695324, 600, 'club', 'osm'),
    ('duo MUSIC EXCHANGE', 35.658715, 139.695525, 700, 'club', 'osm'),
    ('LIQUIDROOM', 35.649357, 139.710770, 900, 'club', 'gsi'),
    ('渋谷CLUB QUATTRO', 35.661114, 139.697586, 750, 'club', 'gsi'),
    ('WWW・WWW X', 35.661543, 139.698750, 1200, 'club', 'osm'),
    ('代官山UNIT', 35.647051, 139.702382, 600, 'club', 'osm'),
    ('新宿LOFT', 35.695522, 139.702606, 550, 'club', 'gsi'),
    ('新宿ReNY', 35.692986, 139.693329, 700, 'club', 'gsi'),
    ('東京キネマ倶楽部', 35.720760, 139.780060, 600, 'club', 'gsi'),
    ('下北沢GARDEN', 35.660453, 139.668342, 500, 'club', 'osm'),
    ('下北沢SHELTER', 35.661529, 139.669503, 250, 'club', 'osm'),
    ('渋谷eggman', 35.664391, 139.699066, 350, 'club', 'gsi'),
    ('高円寺HIGH', 35.703589, 139.651066, 300, 'club', 'osm'),
    ('AKB48劇場', 35.700807, 139.771962, 250, 'idol', 'osm'),
    ('Blue Note Tokyo', 35.661217, 139.716191, 300, 'jazz', 'osm'),
    ('Billboard Live TOKYO', 35.666023, 139.732208, 300, 'jazz', 'gsi'),
]
SOURCE = {'osm': 'OpenStreetMap Nominatim による位置（ODbL）', 'gsi': '国土地理院 住所検索による位置'}

def main():
    out = []
    for i, (name, lat, lon, cap, style, src) in enumerate(VENUES):
        r = 25 if style == 'hall' else 12
        sx = 111195 * math.cos(math.radians(lat)); dx, dy = r / sx, r / 111195
        out.append({'id': 'livehouse-%d' % i, 'name': name, 'xy': [lon, lat], 'radius': r,
            'bbox': [round(lon - dx, 6), round(lat - dy, 6), round(lon + dx, 6), round(lat + dy, 6)], 'area': math.pi * r * r,
            'type': 'commercial', 'subtype': 'livehouse', 'placeKind': 'livehouse', 'liveStyle': style, 'capacity': cap,
            'source': SOURCE[src], 'precision': 'modeled-footprint'})
    json.dump({'version': 1, 'notes': '収容人数は公表規模の概数（ゲーム用の仮定）。公演日・時刻は日付から決まる仮定で、実際の公演予定ではない。網羅性は保証しない。', 'features': out},
        open('map-preview/data/livehouses.json', 'w'), ensure_ascii=False, separators=(',', ':'))
    print(len(out))

if __name__ == '__main__':
    main()
