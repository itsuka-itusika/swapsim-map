"""Build map-preview/data/towns.json: town names (町丁目) on a 200 m grid over the 23 wards.

Usage: python3 map-preview/import-towns.py <cache.json>
Looks up each grid point inside the 23 wards with 国土地理院's reverse geocoder
(https://mreversegeocoder.gsi.go.jp/reverse-geocoder/LonLatToAddress), caching answers in <cache.json>
so an interrupted run resumes. Output cells are flat [i, j, nameIndex] triples.
"""
import json,math,sys,os,urllib.request,concurrent.futures as cf,time
geo,out='map-preview/data/geography.json',sys.argv[1]
regs=[r for r in json.load(open(geo))['regions'] if r['id'].startswith('131') and int(r['id'][3:])<=23]
def inside(p,poly):
  x,y=p;c=False
  for ring in poly:
    for i in range(len(ring)):
      a,b=ring[i-1],ring[i]
      if (a[1]>y)!=(b[1]>y) and x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0]: c=not c
  return c
def ward(p):
  for r in regs:
    b=r['bbox']
    if b[0]<=p[0]<=b[2] and b[1]<=p[1]<=b[3]:
      polys=r['geometry']['coordinates'] if r['geometry']['type']=='MultiPolygon' else [r['geometry']['coordinates']]
      if any(inside(p,pl) for pl in polys): return r['id']
STEP=200;lat0,lat1,lon0,lon1=35.50,35.83,139.55,139.93
dy=STEP/111195;dx=STEP/(111195*math.cos(math.radians(35.68)))
pts=[]
j=0
while lat0+j*dy<=lat1:
  i=0
  while lon0+i*dx<=lon1:
    p=(lon0+i*dx,lat0+j*dy)
    if ward(p): pts.append((i,j,p))
    i+=1
  j+=1
print(len(pts),flush=True)
res=json.load(open(out)) if os.path.exists(out) else {}
def get(t):
  i,j,p=t;k=f'{i},{j}'
  if k in res:return
  for a in range(4):
    try:
      r=json.load(urllib.request.urlopen(f'https://mreversegeocoder.gsi.go.jp/reverse-geocoder/LonLatToAddress?lat={p[1]:.6f}&lon={p[0]:.6f}',timeout=20));res[k]=[r['results']['muniCd'],r['results']['lv01Nm']] if r.get('results') else None;return
    except Exception: time.sleep(2*(a+1))
with cf.ThreadPoolExecutor(8) as ex:
  for n,_ in enumerate(ex.map(get,pts)):
    if n%1000==0: json.dump(res,open(out,'w'),ensure_ascii=False);print(n,flush=True)
json.dump(res,open(out,'w'),ensure_ascii=False)
names,cells=[],[]
for k,v in sorted(res.items()):
  if not v: continue
  if v[1] not in names: names.append(v[1])
  i,j=map(int,k.split(','));cells+=[i,j,names.index(v[1])]
json.dump({'source':'国土地理院 逆ジオコーディング（地理院地図）による町丁目名','step':STEP,'lat0':lat0,'lon0':lon0,'dx':dx,'dy':dy,'names':names,'cells':cells},open('map-preview/data/towns.json','w'),ensure_ascii=False,separators=(',',':'))
print('towns',len(names),'cells',len(cells)//3)
