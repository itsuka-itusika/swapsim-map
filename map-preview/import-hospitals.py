"""Build map-preview/data/hospitals.json: beds, departments and emergency roles of the hospitals in geography.json.

Source: 国土数値情報 医療機関データ（P04, 2020）. The facility ids in geography.json are hospital-<pref>-<feature index>,
so the same files line up one to one (prepare.py keeps only P04_001 == 1, 病院).
Usage: python3 map-preview/import-hospitals.py <folder holding P04-20_11..14 geojson files>
"""
import glob, json, re, sys

# Department families (one letter each) used for patient scenes and conditions.
DEPT = [
    ('k', r'循環器|心臓'), ('j', r'腎臓|透析'), ('t', r'糖尿病|内分泌|代謝'), ('c', r'消化器|胃腸|肝臓|肛門'),
    ('r', r'呼吸器'), ('n', r'神経内科|脳神経|脳外科'), ('o', r'整形外科'), ('s', r'^外科|呼吸器外科|心臓血管外科|乳腺外科|消化器外科|小児外科'),
    ('d', r'皮膚'), ('u', r'泌尿器'), ('g', r'産婦人科|産科|婦人科'), ('p', r'小児科'), ('e', r'眼科'), ('b', r'耳鼻'),
    ('m', r'精神|心療内科'), ('h', r'リハビリ'), ('x', r'放射線'), ('z', r'腫瘍|緩和ケア'), ('w', r'歯科|口腔'), ('i', r'内科'),
]

def depts(text):
    out = set()
    for d in re.split(r'[\s　]+', text or ''):
        for k, pat in DEPT:
            if d and re.search(pat, d):
                out.add(k); break
    return ''.join(k for k, _ in DEPT if k in out)

def kind(p, d):
    name, beds = p['P04_002'], p['P04_008'] or 0
    if re.search(r'歯科病院|歯学部|歯科大学', name): return 'dental'
    if re.search(r'大学.*(病院|医院|医療センター)|医科大学|医療研究センター', name): return 'univ'
    if re.search(r'がん|癌', name): return 'cancer'
    if re.search(r'小児|こども|子ども|成育', name): return 'child'
    if re.search(r'産院|産婦人科|母子|周産期|レディース', name) or d in ('g', 'gi', 'gp', 'gip'): return 'maternity'
    if 'm' in d and (re.search(r'精神|メンタル|こころ', name) or len(d.replace('i', '').replace('w', '')) <= 2): return 'psych'
    if re.search(r'リハビリ', name) or d in ('h', 'hi', 'ho', 'hio'): return 'rehab'
    if p['P04_009'] != 1 and set(d) <= set('ihnkrw'): return 'longterm'
    return 'general'

def main(folder):
    out = {}
    for code in ['11', '12', '13', '14']:
        path = [f for f in glob.glob(folder + '/**/*.geojson', recursive=True) if 'P04-20_' + code in f][0]
        for i, f in enumerate(json.load(open(path, encoding='utf-8'))['features']):
            p = f['properties']
            if p['P04_001'] != 1: continue
            d = depts(p['P04_004'])
            t = kind(p, d)
            # Fill in the departments the type implies when the source lists none.
            if t == 'child' and 'p' not in d: d = 'p' + d
            row = {'b': p['P04_008'] or 0, 'd': d, 't': t}
            if p['P04_009'] == 1: row['er'] = 1
            if p['P04_010'] in (1, 2): row['dis'] = p['P04_010']
            out['hospital-%s-%d' % (code, i)] = row
    json.dump({'version': 1, 'source': '国土数値情報 医療機関データ（P04, 2020年）', 'notes': 'b=病床数, d=診療科の系統, er=救急告示病院, dis=災害拠点病院（1基幹・2地域）, t=病院の種類（名称・診療科からの推定）',
        'hospitals': out}, open('map-preview/data/hospitals.json', 'w'), ensure_ascii=False, separators=(',', ':'))
    from collections import Counter
    print(len(out), Counter(r['t'] for r in out.values()))

if __name__ == '__main__':
    main(sys.argv[1])
