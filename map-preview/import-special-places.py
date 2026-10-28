import urllib.request,xml.etree.ElementTree as E,json,concurrent.futures
from pathlib import Path
jobs=[('roppongi',139.729,35.6605),('hikarie',139.703,35.659),('skytree',139.8107,35.710),('tokyotower',139.7454,35.6586),('meiji',139.6993,35.6764),('sensoji',139.7967,35.7148),('yasukuni',139.7439,35.6941),('kanda',139.767,35.702),('zojoji',139.748,35.657),('tsukijihonganji',139.7727,35.6654),('tomiioka',139.797,35.673),('nezu',139.760,35.722),('hie',139.740,35.675),('suitengu',139.785,35.682),('ikebukuro',139.716,35.729),('sunshine',139.719,35.729),('tokyostation',139.767,35.681),('ginza',139.765,35.670),('nihonbashi',139.774,35.686),('shinjuku',139.701,35.690),('odaiba',139.775,35.626),('toyosu',139.793,35.655),('ebisu',139.713,35.643),('shinagawa',139.741,35.629),('nishiaraidaishi',139.777,35.779),('sengakuji',139.740,35.638),('gotokuji',139.647,35.654),('kameido',139.825,35.702),('shibamata',139.878,35.758),('soracity',139.764,35.697),('shibuya',139.702,35.658),('tokyomidtown',139.731,35.666),('ariake',139.794,35.638),('gotokuji_temple',139.6474,35.6487),('kameido_shrine',139.8207,35.7030),('isetan',139.7055,35.6914),('takashimaya',139.7024,35.6877)]
cache=Path('/tmp/swapsim-places');cache.mkdir(exist_ok=True)
def get(job):
 name,x,y=job;p=cache/(name+'.xml')
 try:
  if not p.exists():
   if name=='roppongi' and Path('/tmp/swapsim-roppongi.xml').exists():p.write_bytes(Path('/tmp/swapsim-roppongi.xml').read_bytes())
   else:p.write_bytes(urllib.request.urlopen(f'https://api.openstreetmap.org/api/0.6/map?bbox={x-.0025:.6f},{y-.0025:.6f},{x+.0025:.6f},{y+.0025:.6f}',timeout=35).read())
  root=E.parse(p).getroot();nodes={n.get('id'):[float(n.get('lon')),float(n.get('lat'))] for n in root.findall('node')};ways={e.get('id'):e for e in root.findall('way')};out=[]
  def coords(e):return [{'lon':nodes[n.get('ref')][0],'lat':nodes[n.get('ref')][1]} for n in e.findall('nd') if n.get('ref') in nodes]
  for e in root.findall('way')+root.findall('relation'):
   t={a.get('k'):a.get('v') for a in e.findall('tag')};n=t.get('name') or t.get('name:ja');
   if not n:continue
   if not (t.get('amenity')=='place_of_worship' or t.get('shop') in ['mall','department_store'] or t.get('tourism') in ['attraction','viewpoint'] or t.get('building') in ['retail','commercial','office','department_store','cathedral','temple','shrine'] or t.get('landuse') in ['religious','retail','commercial'] or any(a in n for a in ['ヒルズ','ヒカリエ','ソラマチ','スカイツリー','東京タワー','百貨店','パルコ','ルミネ','マルイ','ミッドタウン','サンシャイン','ららぽーと','寺','神社','神宮','稲荷','大師'])):continue
   t['name']=n;z={'type':e.tag,'id':int(e.get('id')),'tags':t}
   if e.tag=='way':z['geometry']=coords(e)
   else:z['members']=[{'type':'way','ref':int(m.get('ref')),'role':m.get('role',''),'geometry':coords(ways[m.get('ref')])} for m in e.findall('member') if m.get('type')=='way' and m.get('ref') in ways]
   out.append(z)
  print(name,len(out),flush=True);return out
 except Exception as e:print(name,'FAILED',str(e),flush=True);return []
with concurrent.futures.ThreadPoolExecutor(max_workers=4) as ex:groups=list(ex.map(get,jobs))
u={(e['type'],e['id']):e for group in groups for e in group}
Path('/tmp/swapsim-places.json').write_text(json.dumps({'elements':list(u.values())},ensure_ascii=False));print('unique',len(u),flush=True)
