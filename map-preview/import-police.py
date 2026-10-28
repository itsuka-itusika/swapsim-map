"""Import NPA station addresses and geocode them with GSI, preserving approximate point accuracy."""
import csv,urllib.request,urllib.parse,json,concurrent.futures,unicodedata
from pathlib import Path
src='https://www.npa.go.jp/about/overview/kankatsu/R08_keisatusyo.csv'
raw=Path('/tmp/swapsim-npa-police.csv')
if not raw.exists(): raw.write_bytes(urllib.request.urlopen(src,timeout=35).read())
with raw.open(encoding='cp932',newline='') as f: data=list(csv.DictReader(f))
rows=[x for x in data if x['全国地方公共団体コード'][:3]=='131' and 1<=int(x['全国地方公共団体コード'][3:5])<=23]
for r in rows:
 if r['名称']=='?町警察署':r['名称']='麹町警察署';r['町又は大字以降']=r['町又は大字以降'].replace('?町','麹町')
def geocode(r):
 q='東京都'+r['市区町村']+r['町又は大字以降'];u='https://msearch.gsi.go.jp/address-search/AddressSearch?q='+urllib.parse.quote(q)
 try:
  req=urllib.request.Request(u,headers={'User-Agent':'SwapSim/preview (non-commercial)'});result=json.load(urllib.request.urlopen(req,timeout=35));best=next((x for x in result if r['市区町村'] in x.get('properties',{}).get('title','')),None)
  if not best: return {'name':r['名称'],'query':q,'error':'住所の候補なし'}
  title=best['properties']['title']
  def nums(s):
   import re
   s=unicodedata.normalize('NFKC',s);digits={'一':1,'二':2,'三':3,'四':4,'五':5,'六':6,'七':7,'八':8,'九':9,'十':10}
   def convert(m):
    v=m.group();return str((digits.get(v.split('十')[0],1)*10+digits.get(v.split('十')[-1],0)) if '十' in v else digits[v])
   s=re.sub(r'[一二三四五六七八九十]+',convert,s);return ''.join(c for c in s if c.isdecimal())
  if nums(r['町又は大字以降']) and nums(r['町又は大字以降']) not in nums(title):return {'name':r['名称'],'query':q,'error':'番地まで一致せず','candidate':title}
  lon,lat=best['geometry']['coordinates'];return {'id':'police-'+r['警察署番号'],'name':r['名称'],'xy':[lon,lat],'radius':20,'kind':'police','address':q,'source':'警察庁2026年4月・国土地理院住所検索','precision':'住所点を中心とする概略円'}
 except Exception as e:return {'name':r['名称'],'query':q,'error':str(e)}
with concurrent.futures.ThreadPoolExecutor(max_workers=5) as ex:out=list(ex.map(geocode,rows))
valid=[x for x in out if 'xy' in x];invalid=[x for x in out if 'error' in x]
Path('map-preview/data/police-stations.json').write_text(json.dumps({'source':src,'geocoder':'https://msearch.gsi.go.jp/','asOf':'2026-04-01','license':'CC BY 4.0','features':valid,'unmatched':invalid},ensure_ascii=False,indent=2)+'\n')
print('matched',len(valid),'unmatched',len(invalid),flush=True);print(invalid,flush=True)
