"""stdlib-only conversion of downloaded W09-05_GML.zip shapefile; national source is never shipped.
Usage: python map-preview/prepare-land.py /tmp/lakes.zip
"""
import zipfile,struct,json,sys
from pathlib import Path
z=zipfile.ZipFile(sys.argv[1]);db=z.read('W09-05-g_Lake.dbf');n=struct.unpack_from('<I',db,4)[0];hl,rl=struct.unpack_from('<HH',db,8);fields=[]
for i in range(32,hl-1,32):
 b=db[i:i+32]
 if b[0]==13:break
 fields.append((b[:11].split(b'\0')[0].decode(),b[16]))
rows=[]
for i in range(n):
 b=db[hl+i*rl:hl+(i+1)*rl];pos=1;r={}
 for k,l in fields:r[k]=b[pos:pos+l].decode('cp932',errors='replace').strip();pos+=l
 rows.append(r)
shp=z.read('W09-05-g_Lake.shp');pos=100;features=[];idx=0
while pos<len(shp):
 size=struct.unpack_from('>I',shp,pos+4)[0]*2;b=shp[pos+8:pos+8+size];pos+=8+size;r=rows[idx];idx+=1
 if r.get('W09_002','')[:2] not in ['11','12','13','14']:continue
 if struct.unpack_from('<I',b)[0]!=5:continue
 bbox=list(struct.unpack_from('<4d',b,4));np,nt=struct.unpack_from('<2I',b,36);parts=list(struct.unpack_from('<'+str(np)+'I',b,44))+[nt];pts=[list(struct.unpack_from('<2d',b,44+np*4+j*16)) for j in range(nt)];rings=[pts[parts[k]:parts[k+1]] for k in range(np)]
 # SHP clockwise exteriors, counterclockwise holes. Assign holes by point-in-ring.
 def area(a):return sum(p[0]*q[1]-q[0]*p[1] for p,q in zip(a,a[1:]))
 def inside(p,a):
  v=False
  for x,y in zip(a,a[1:]):
   if (x[1]>p[1])!=(y[1]>p[1]) and p[0]<(y[0]-x[0])*(p[1]-x[1])/(y[1]-x[1])+x[0]:v=not v
  return v
 outer=[a for a in rings if area(a)<0];holes=[a for a in rings if area(a)>=0];polys=[[a]+[h for h in holes if inside(h[0],a)] for a in outer]
 if not polys:continue
 features.append(dict(id='lake'+str(idx),name=r.get('W09_001') or '湖沼',kind='water',bbox=bbox,geometry={'type':'MultiPolygon','coordinates':polys},source='国土数値情報 湖沼 W09-2005'))
Path('map-preview/data/water.json').write_text(json.dumps({'source':'https://nlftp.mlit.go.jp/ksj/gml/datalist/KsjTmplt-W09-2005.html','year':2005,'water':features},ensure_ascii=False,separators=(',',':'))+'\n');print(len(features),'lake polygons')

