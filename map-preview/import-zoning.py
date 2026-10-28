"""Build compact geographic evidence from MLIT A29-2019 Tokyo ZIP.
Requires pyshp and shapely. Input is the original downloaded archive; no credentials.
"""
import sys, zipfile, tempfile, json, math
from pathlib import Path
import shapefile
from shapely.geometry import shape, mapping
from shapely.ops import unary_union
SOURCE='https://nlftp.mlit.go.jp/ksj/gml/data/A29/A29-19/A29-19_13_GML.zip'
regions=json.load(open('map-preview/data/geography.json'))['regions']
wards={r['id']:shape(r['geometry']) for r in regions if r['id'].startswith('131') and int(r['id'][3:])<=23}
zones=[];areas={}
with tempfile.TemporaryDirectory() as d:
 with zipfile.ZipFile(sys.argv[1]) as z:z.extractall(d)
 for code,boundary in wards.items():
  p=next(Path(d).rglob('A29-19_'+code+'.shp'),None)
  if not p:continue
  groups={}
  for sr in shapefile.Reader(str(p),encoding='cp932').iterShapeRecords():
   r=sr.record.as_dict();kind=r['A29_004'];g=shape(sr.shape.__geo_interface__)
   if not g.is_valid:g=g.buffer(0)
   g=g.intersection(boundary)
   if not g.is_empty:groups.setdefault((kind,r['A29_005']),[]).append(g)
  for (kind,name),shapes in groups.items():
   g=unary_union(shapes).simplify(.000025,preserve_topology=True)
   if g.geom_type not in ['Polygon','MultiPolygon']:continue
   typ='commercial' if kind in [8,9] else 'industrial' if kind in [10,11,12] else 'residential'
   ar=g.area*111195**2*math.cos(math.radians(g.centroid.y));housing=.45 if kind in [1,2] else .9 if kind in [3,4] else 1.1
   weight=housing if typ=='residential' else .15 if typ=='commercial' else .03
   areas[code]=areas.get(code,0)+ar/1e6*weight
   zones.append(dict(id='A29-'+code+'-'+str(kind),code=code,name=name,type=typ,subtype='suburban' if kind in [1,2] else 'zoning',housingWeight=housing,geometry=mapping(g),bbox=list(g.bounds),xy=[g.centroid.x,g.centroid.y],source='国土数値情報 A29-2019',precision='zoning',area=ar,residentialWeight=weight))
result=dict(version=1,source=SOURCE,year=2019,license='国土数値情報利用規約',notes='用途地域は許容用途であり実際の建物用途ではない。敷地・施設を優先。概略図由来の誤差を含む。',residentialAreaKm2=areas,zones=zones)
Path('map-preview/data/zoning.json').write_text(json.dumps(result,ensure_ascii=False,separators=(',',':'))+'\n')
print(len(zones),'zoning polygons;',Path('map-preview/data/zoning.json').stat().st_size,'bytes')
