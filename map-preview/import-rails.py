"""Build map-preview/data/rails.json: railway tracks in and around the 23 wards with the services that run on them.

Track geometry: 国土数値情報 鉄道データ（N02, 2023）, RailroadSection. The official line names there differ from the
names riders use (the east side of the 山手線 loop is officially 東北線), so each section takes its service names from
the line lists of the nearest stations in data/stations.json; subway, tram and Shinkansen names come from N02 itself.
Usage: python3 map-preview/import-rails.py <N02-23_RailroadSection.geojson (UTF-8)>
Kinds: jr, metro (underground), private, tram, agt (ゆりかもめ・モノレール・舎人ライナー), shinkansen.
"""
import json, math, re, sys

BBOX = (139.56, 35.52, 139.93, 35.83)
PRIVATE = {'小田急電鉄': '小田急', '京王電鉄': '京王', '東急電鉄': '東急', '京成電鉄': '京成', '京浜急行電鉄': '京急', '東武鉄道': '東武',
           '西武鉄道': '西武', '首都圏新都市鉄道': 'つくばエクスプレス', '東京臨海高速鉄道': 'りんかい', '北総鉄道': '北総', '埼玉高速鉄道': '埼玉高速'}

def dist(a, b):
    sx = 111195 * math.cos(math.radians(35.7))
    return math.hypot((a[0] - b[0]) * sx, (a[1] - b[1]) * 111195)

def simplify(pts, tol=8.0):
    if len(pts) < 3: return pts
    sx = 111195 * math.cos(math.radians(pts[0][1]))
    def d(p, a, b):
        x, y = (p[0] - a[0]) * sx, (p[1] - a[1]) * 111195
        dx, dy = (b[0] - a[0]) * sx, (b[1] - a[1]) * 111195
        u = max(0, min(1, (x * dx + y * dy) / (dx * dx + dy * dy or 1)))
        return math.hypot(x - u * dx, y - u * dy)
    keep = [0, len(pts) - 1]; stack = [(0, len(pts) - 1)]
    while stack:
        i, j = stack.pop(); best, at = 0, None
        for k in range(i + 1, j):
            v = d(pts[k], pts[i], pts[j])
            if v > best: best, at = v, k
        if at is not None and best > tol:
            keep.append(at); stack += [(i, at), (at, j)]
    return [pts[i] for i in sorted(keep)]

def main(path):
    stations = json.load(open('map-preview/data/stations.json'))['facilities']
    out = []
    for f in json.load(open(path, encoding='utf-8'))['features']:
        p, coords = f['properties'], f['geometry']['coordinates']
        if not any(BBOX[0] <= c[0] <= BBOX[2] and BBOX[1] <= c[1] <= BBOX[3] for c in coords): continue
        op, line = p['N02_004'], p['N02_003']
        core = re.sub(r'^\d+号線', '', line)
        mid = coords[len(coords) // 2]
        if '新幹線' in line: kind, names = 'shinkansen', [line]
        elif op == '東京地下鉄': kind, names = 'metro', ['東京メトロ' + core.replace('分岐線', '')]
        elif op == '東京都':
            if core == '荒川線': kind, names = 'tram', ['都電荒川線']
            elif 'ライナー' in core: kind, names = 'agt', [core]
            else: kind, names = 'metro', ['都営' + core]
        elif op in ('ゆりかもめ', '東京モノレール'): kind, names = 'agt', ['ゆりかもめ' if op == 'ゆりかもめ' else '東京モノレール']
        elif op == '東急電鉄' and core == '世田谷線': kind, names = 'tram', ['東急世田谷線']
        else:
            jr = op == '東日本旅客鉄道'
            if not jr and op not in PRIVATE: continue
            kind = 'jr' if jr else 'private'
            match = (lambda n: n.startswith('JR') and '新幹線' not in n) if jr else (lambda n, pre=PRIVATE[op]: pre in n)
            near = sorted((s for s in stations if any(match(n) for n in s.get('lines', []))), key=lambda s: dist(s['xy'], mid))[:2]
            near = [s for s in near if dist(s['xy'], mid) < 2500]
            sets = [set(n for n in s['lines'] if match(n)) for s in near]
            names = sorted(set.intersection(*sets) if len(sets) == 2 and set.intersection(*sets) else set.union(*sets) if sets else set())
            if not jr:
                key = core.replace('本線', '').replace('線', '')
                named = [n for n in names if key and key in n]
                names = named or names
            if not names: names = [('JR' if jr else PRIVATE[op]) + core]
        pts = simplify([[round(c[0], 5), round(c[1], 5)] for c in coords])
        out.append({'k': kind, 's': names, 'c': [v for q in pts for v in q]})
    json.dump({'version': 1, 'source': '国土数値情報 鉄道データ（N02, 2023年）を加工。運行系統名は駅データの路線名から推定',
               'notes': '本数・速度・乗車人数はゲーム用の仮定。', 'rails': out}, open('map-preview/data/rails.json', 'w'), ensure_ascii=False, separators=(',', ':'))
    from collections import Counter
    print(len(out), Counter(r['k'] for r in out))
    print(Counter(n for r in out for n in r['s']).most_common(60))

if __name__ == '__main__':
    main(sys.argv[1])
