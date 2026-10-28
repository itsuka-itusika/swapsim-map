"""One-off station source import; no API requests in the delivered HTML."""
import urllib.request,urllib.parse,json,concurrent.futures
from pathlib import Path
base='https://express.heartrails.com/api/json?'
def get(**q):return json.load(urllib.request.urlopen(base+urllib.parse.urlencode(q),timeout=20))['response']
lines=get(method='getLines',prefecture='東京都')['line'];print('lines',len(lines),flush=True)
def stations(line):return get(method='getStations',line=line).get('station',[])
rows=[]
with concurrent.futures.ThreadPoolExecutor(max_workers=5) as pool:
 for ss in pool.map(stations,lines):rows.extend(ss)
Path('/tmp/tokyo-stations.json').write_text(json.dumps(rows,ensure_ascii=False));print('source stations',len(rows),flush=True)

