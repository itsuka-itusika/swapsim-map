import urllib.request,xml.etree.ElementTree as E,json,concurrent.futures
from pathlib import Path
jobs=[('小菅',139.813,35.759,.014,.012),('霞が関',139.753,35.672,.012,.012),('永田町',139.743,35.678,.012,.012),('市ヶ谷',139.729,35.693,.014,.012),('練馬東',139.663,35.770,.014,.014),('十条',139.723,35.754,.014,.014),('三宿',139.685,35.646,.014,.014),('目黒',139.708,35.640,.012,.012),('用賀',139.637,35.637,.012,.012),('朝霞南',139.600,35.783,.012,.012),('都庁',139.692,35.690,.009,.009)]
p=Path('/tmp/swapsim-public-osm');p.mkdir(exist_ok=True)
def get(j):
 name,x,y,dx,dy=j;f=p/(name+'.xml')
 if not f.exists():f.write_bytes(urllib.request.urlopen(f'https://api.openstreetmap.org/api/0.6/map?bbox={x-dx/2},{y-dy/2},{x+dx/2},{y+dy/2}',timeout=45).read())
 r=E.parse(f).getroot();ns={n.get('id'):[float(n.get('lon')),float(n.get('lat'))] for n in r.findall('node')};ws={w.get('id'):w for w in r.findall('way')};out=[]
 def coords(w):return [dict(lon=ns[n.get('ref')][0],lat=ns[n.get('ref')][1]) for n in w.findall('nd') if n.get('ref') in ns]
 for e in list(r.findall('way'))+list(r.findall('relation')):
  t={a.get('k'):a.get('v') for a in e.findall('tag')};name=t.get('name') or t.get('name:ja','');t['name']=name
  if not name or not (t.get('amenity') in ['prison','townhall'] or t.get('office')=='government' or t.get('landuse')=='military' or t.get('military') or any(s in name for s in ['拘置所','駐屯地','国会議事堂','中央合同庁舎','外務省','財務省','経済産業省','文部省','内閣府庁舎','法務省旧本館','自衛隊中央病院'])):continue
  z=dict(type=e.tag,id=int(e.get('id')),tags=t)
  if e.tag=='way':z['geometry']=coords(e)
  else:z['members']=[dict(type='way',ref=int(m.get('ref')),role=m.get('role',''),geometry=coords(ws[m.get('ref')])) for m in e.findall('member') if m.get('type')=='way' and m.get('ref') in ws]
  out.append(z)
 print(j[0],len(out),flush=True);return out
with concurrent.futures.ThreadPoolExecutor(max_workers=2) as ex:a=list(ex.map(get,jobs))
u={(e['type'],e['id']):e for g in a for e in g};Path('/tmp/swapsim-public-elements.json').write_text(json.dumps(dict(elements=list(u.values())),ensure_ascii=False))
print([(e['tags']['name'],e['tags'].get('amenity'),e['tags'].get('landuse'),e['tags'].get('office')) for e in u.values()])
