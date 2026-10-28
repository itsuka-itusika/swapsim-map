"""Run after downloading the cited source GeoJSON files to /tmp/gov.
Boundaries are the unmodified by-prefecture files initially downloaded to data/.
Only points representing residential elderly care, schools and hospitals are retained.
"""
import json,glob,math,collections
from pathlib import Path
from shapely.geometry import shape,mapping
out=Path(__file__).parent/'data';regions=[];facilities=[]
for code in ['11','12','13','14']:
 p=json.load(open(out/f'boundaries-{code}.json'))
 for f in p['features']:
  g=shape(f['geometry']);lat=g.centroid.y;area=g.area*111.195**2*math.cos(math.radians(lat))
  regions.append(dict(id=str(f['id']),name=f['properties']['displayName'],geometry=mapping(g.simplify(.0001,preserve_topology=True)),bbox=list(g.bounds),area=area))
 for file in glob.glob(f'/tmp/gov/P14-23_{code}/**/*.geojson',recursive=True):
  for i,f in enumerate(json.load(open(file))['features']):
   p=f['properties'];c=str(p['P14_007'])
   # Explicit residential classes; excludes day care and unspecified care services.
   if c not in ['020101','020102','020201','020202','020203','020204','990701','990702','991001','991002','991003','991004','991006']:continue
   facilities.append(dict(id=f'care-{code}-{i}',name=p['P14_008'],xy=f['geometry']['coordinates'],code=str(p['P14_003']),kind='care',radius=35,source='P14-2023'))
 for file in glob.glob(f'/tmp/gov/schools/P29-21_{code}.geojson'):
  for i,f in enumerate(json.load(open(file))['features']):
   p=f['properties'];k={16001:'primary',16002:'middle',16004:'high',16007:'university',16006:'college',16016:'college',16011:'kindergarten',16013:'kindergarten'}.get(p['P29_003'])
   if not k or p.get('P29_007')==2:continue
   facilities.append(dict(id=f'school-{code}-{i}',name=p['P29_004'],xy=f['geometry']['coordinates'],code=str(p['P29_001']),kind=k,radius=120 if k=='university' else 60,source='P29-2021'))
 for file in glob.glob(f'/tmp/gov/P04-20_{code}/**/*.geojson',recursive=True):
  for i,f in enumerate(json.load(open(file))['features']):
   p=f['properties']
   if p['P04_001']!=1:continue
   facilities.append(dict(id=f'hospital-{code}-{i}',name=p['P04_002'].strip(),xy=f['geometry']['coordinates'],code='',kind='hospital',radius=60,source='P04-2020'))
# Resolve exact wards instead of the school dataset's designated-city codes.
from shapely.geometry import Point
shapes=[(r,shape(r['geometry'])) for r in regions]
for f in facilities:
 q=Point(f['xy']);matches=[r for r,g in shapes if g.contains(q)]
 if matches:f['code']=matches[0]['id']
facilities=[f for f in facilities if any(r['id']==f['code'] for r in regions)]
(out/'geography.json').write_text(json.dumps(dict(regions=regions,facilities=facilities),ensure_ascii=False,separators=(',',':')))
print(len(regions),'regions',len(facilities),'facilities',collections.Counter(f['kind'] for f in facilities))

