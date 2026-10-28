"""Fetch bounded OpenStreetMap extracts serially in two lanes; retain only land/landmark polygons.
Raw responses stay in scratch. Re-run to update bundled offline evidence.
"""
import urllib.request,xml.etree.ElementTree as E,json,time,math,concurrent.futures
from pathlib import Path
jobs=[('大田球場追加',139.7491,35.5796,.006,.006),('江戸川陸上競技場',139.880,35.663,.008,.008),('自然教育園',139.719,35.638,.006,.006),('大井競馬場',139.7428,35.5939,.009,.008),('東京ドーム',139.752,35.7056,.005,.004),('神宮外苑',139.7155,35.677,.008,.008),('日本武道館',139.75,35.6933,.004,.004),('有明',139.793,35.640,.009,.008),('両国国技館',139.7932,35.6969,.004,.004),('大田スタジアム',139.755,35.579,.005,.005),('夢の島',139.829,35.651,.009,.009),('青山霊園',139.722,35.667,.008,.008),('谷中霊園',139.772,35.723,.007,.006),('雑司ヶ谷霊園',139.721,35.722,.006,.005),('染井霊園',139.741,35.736,.006,.005),('林試の森',139.700,35.622,.008,.006),('駒沢公園',139.661,35.625,.009,.009),('砧公園',139.622,35.630,.012,.010),('馬事公苑',139.633,35.638,.008,.008),('小石川植物園',139.745,35.718,.008,.008),('旧古河庭園',139.746,35.742,.005,.005),('浜町公園',139.788,35.689,.005,.005),('猿江恩賜公園',139.817,35.688,.007,.009),('舎人公園',139.772,35.796,.012,.012),('城北中央公園',139.679,35.758,.010,.009),('平和島',139.736,35.586,.007,.009),('上野動物園',139.771,35.716,.009,.007),('葛西臨海水族園',139.862,35.640,.008,.007),('新木場公園群',139.838,35.644,.013,.012)]
cache=Path('/tmp/swapsim-osm-landmarks');cache.mkdir(exist_ok=True)
def get(job):
 name,x,y,dx,dy=job;p=cache/(name+'.xml')
 try:
  if not p.exists():
   if name=='自然教育園' and Path('/tmp/swapsim-landmark-osm.xml').exists():p.write_bytes(Path('/tmp/swapsim-landmark-osm.xml').read_bytes())
   else:
    u=f'https://api.openstreetmap.org/api/0.6/map?bbox={x-dx/2:.6f},{y-dy/2:.6f},{x+dx/2:.6f},{y+dy/2:.6f}'
    p.write_bytes(urllib.request.urlopen(u,timeout=35).read())
  r=E.parse(p).getroot();nodes={n.get('id'):[float(n.get('lon')),float(n.get('lat'))] for n in r.findall('node')};ways={w.get('id'):w for w in r.findall('way')};out=[]
  def coords(w):return [dict(lon=nodes[n.get('ref')][0],lat=nodes[n.get('ref')][1]) for n in w.findall('nd') if n.get('ref') in nodes]
  def tags(e):return {t.get('k'):t.get('v') for t in e.findall('tag')}
  for e in list(r.findall('way'))+list(r.findall('relation')):
   t=tags(e);name=t.get('name') or t.get('name:ja','');t['name']=name
   relevant=t.get('landuse')=='cemetery' or t.get('leisure') in ['park','garden','nature_reserve','stadium','sports_centre','track','pitch'] or t.get('tourism') in ['zoo','aquarium','museum'] or t.get('amenity') in ['grave_yard','events_venue'] or t.get('sport')=='horse_racing'
   if not relevant or not name:continue
   item=dict(type=e.tag,id=int(e.get('id')),tags=t)
   if e.tag=='way':item['geometry']=coords(e)
   else:
    item['members']=[dict(type='way',ref=int(m.get('ref')),role=m.get('role',''),geometry=coords(ways[m.get('ref')])) for m in e.findall('member') if m.get('type')=='way' and m.get('ref') in ways]
   out.append(item)
  print(job[0],len(out),flush=True);return out
 except Exception as e:print(job[0],type(e).__name__,str(e),flush=True);return []
if __name__=='__main__':
 with concurrent.futures.ThreadPoolExecutor(max_workers=2) as ex:result=list(ex.map(get,jobs))
 unique={(e['type'],e['id']):e for group in result for e in group}
 Path('/tmp/swapsim-landmark-elements.json').write_text(json.dumps(dict(elements=list(unique.values())),ensure_ascii=False))
 print('unique',len(unique),flush=True)
