"""Build map-preview/data/roads.json from 国土地理院 道路中心線 vector tiles (experimental_rdcl, z16).

Usage: python3 map-preview/import-roads.py <directory of filtered tile JSON>
The tile files are lists of {c: coordinates, ctg: 道路分類, m: motorway flag, toll: 有料/無料} produced while
downloading https://cyberjapandata.gsi.go.jp/xyz/experimental_rdcl/16/{x}/{y}.geojson for the 23 wards,
keeping expressways, national roads and prefectural roads 13 m wide or more.
Classes: x = expressway, n = national road, p = wide prefectural road.
"""
import glob, json, math, sys
from collections import defaultdict

def cls(s):
    return 'x' if s['m'] == 1 or s['ctg'] == '高速自動車国道等' else 'n' if s['ctg'] == '国道' else 'p'

def key(p):
    return (round(p[0], 6), round(p[1], 6))

def simplify(pts, tol=8.0):
    if len(pts) < 3:
        return pts
    sx = 111195 * math.cos(math.radians(pts[0][1]))
    def dist(p, a, b):
        x, y = (p[0] - a[0]) * sx, (p[1] - a[1]) * 111195
        dx, dy = (b[0] - a[0]) * sx, (b[1] - a[1]) * 111195
        u = max(0, min(1, (x * dx + y * dy) / (dx * dx + dy * dy or 1)))
        return math.hypot(x - u * dx, y - u * dy)
    keep = [0, len(pts) - 1]; stack = [(0, len(pts) - 1)]
    while stack:
        i, j = stack.pop(); best, at = 0, None
        for k in range(i + 1, j):
            d = dist(pts[k], pts[i], pts[j])
            if d > best: best, at = d, k
        if at is not None and best > tol:
            keep.append(at); stack += [(i, at), (at, j)]
    return [pts[i] for i in sorted(keep)]

def main(folder):
    segs = defaultdict(set)
    for f in glob.glob(folder + '/*.json'):
        for s in json.load(open(f)):
            c = [key(p) for p in s['c']]
            if len(c) > 1:
                segs[(cls(s), s['toll'] == '有料')].add(tuple(c))
    roads = []
    for (k, toll), lines in segs.items():
        # Chain fragments that share endpoints into longer polylines.
        by_start = defaultdict(list)
        for ln in lines: by_start[ln[0]].append(ln)
        used = set()
        for ln in lines:
            if ln in used: continue
            used.add(ln); chain = list(ln)
            while True:
                nxt = next((x for x in by_start.get(chain[-1], []) if x not in used), None)
                if not nxt: break
                used.add(nxt); chain += list(nxt[1:])
            pts = simplify(chain)
            roads.append({'k': k, 'toll': 1 if toll else 0, 'c': [round(v, 5) for p in pts for v in p]})
    json.dump({'version': 1, 'source': '国土地理院ベクトルタイル 道路中心線（experimental_rdcl）を加工',
        'notes': '高速道路・国道・幅員13m以上の都道府県道。交通量・車種構成はゲーム用の仮定。', 'roads': roads},
        open('map-preview/data/roads.json', 'w'), ensure_ascii=False, separators=(',', ':'))
    print(len(roads), {k: sum(r['k'] == k for r in roads) for k in 'xnp'})

if __name__ == '__main__':
    main(sys.argv[1])
