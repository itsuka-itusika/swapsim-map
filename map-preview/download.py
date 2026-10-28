import urllib.request,zipfile,io,concurrent.futures,json,os
os.makedirs('/tmp/gov',exist_ok=True)
def get(code):
 url='https://nlftp.mlit.go.jp/ksj/gml/data/'+code.split('-')[0]+'/'+code.rsplit('_',2)[0]+'/'+code+'_GML.zip'
 try:
  d=urllib.request.urlopen(url,timeout=90).read();z=zipfile.ZipFile(io.BytesIO(d));z.extractall('/tmp/gov/'+code);print(code,z.namelist()[:6],flush=True)
 except Exception as e:print(code,e,flush=True)
with concurrent.futures.ThreadPoolExecutor(2) as ex:list(ex.map(get,[f'P14-23_{c}' for c in ['11','12','13','14']]+[f'P04-20_{c}' for c in ['11','12','13','14']]+['P29-21_53']))

from pathlib import Path
for p in Path('/tmp/gov/P29-21_53').glob('*.zip'):
 if any('_'+c+'_' in p.name for c in ['11','12','13','14']):zipfile.ZipFile(p).extractall('/tmp/gov/schools')
for c in ['11','12','13','14']:
 u=f'https://raw.githubusercontent.com/kyodo-official/japan-choropleth/main/data/geojson/by-prefecture/{c}/municipalities.geojson'
 Path(f'map-preview/data/boundaries-{c}.json').write_bytes(urllib.request.urlopen(u,timeout=90).read())

