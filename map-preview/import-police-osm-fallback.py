import json,urllib.request,urllib.parse,xml.etree.ElementTree as E,math,concurrent.futures
from pathlib import Path
p=Path('map-preview/data/police-stations.json');d=json.loads(p.read_text())
def run(x):
 q=x['query'].replace('新宿区新宿区','新宿区');url='https://msearch.gsi.go.jp/address-search/AddressSearch?q='+urllib.parse.quote(q)
 try:
  j=json.load(urllib.request.urlopen(url,timeout=20));city=q.split('都',1)[1].split('区',1)[0]+'区';g=next((y for y in j if city in y['properties']['title']),None)
  if not g:return None
  lon,lat=g['geometry']['coordinates'];dx=.003;dy=.0025;u=f'https://api.openstreetmap.org/api/0.6/map?bbox={lon-dx},{lat-dy},{lon+dx},{lat+dy}'
  root=E.fromstring(urllib.request.urlopen(u,timeout=30).read());nodes={n.get('id'):[float(n.get('lon')),float(n.get('lat'))] for n in root.findall('node')};target=x['name'];candidates=[]
  for e in root.findall('node')+root.findall('way'):
   t={a.get('k'):a.get('v') for a in e.findall('tag')};name=t.get('name','')
   if target not in name or '交番' in name or '駐車' in name:continue
   if e.tag=='node':xy=nodes[e.get('id')]
   else:
    pts=[nodes[n.get('ref')] for n in e.findall('nd') if n.get('ref') in nodes]
    if not pts:continue
    xy=[sum(z[0] for z in pts)/len(pts),sum(z[1] for z in pts)/len(pts)]
   candidates.append((name,xy,e.get('id'),e.tag))
  if not candidates:return {'name':target,'error':'OpenStreetMapに署の位置を確認できず','query':q,'candidate':g['properties']['title']}
  name,xy,oid,typ=candidates[0];return {'id':'police-osm-'+typ+'-'+oid,'name':target,'xy':xy,'radius':20,'kind':'police','address':q,'source':'警察庁2026年4月・OpenStreetMap','precision':'OpenStreetMap位置を中心とする概略円'}
 except Exception as e:return {'name':x['name'],'error':str(e),'query':q}
with concurrent.futures.ThreadPoolExecutor(max_workers=3) as ex:out=list(ex.map(run,d['unmatched']))
d['features'] += [x for x in out if x and x.get('xy')];d['unmatched']=[x for x in out if not x or not x.get('xy')];p.write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n');print('total',len(d['features']),'remaining',d['unmatched'],flush=True)
