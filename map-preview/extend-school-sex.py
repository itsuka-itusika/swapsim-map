"""Add source-backed exceptions, secondary sources and explicit name inferences.
Run after import-school-sex.py. Re-running replaces this script's own records.
"""
import json
from pathlib import Path
root=Path(__file__).parent
p=root/'data/school-sex.json'; data=json.loads(p.read_text()); rows=[r for r in data['records'] if not r.get('extension')]
fac=json.loads((root/'data/geography.json').read_text())['facilities']
def add(f,sex,basis,source,**kw):
 rows.append(dict(pref=f['code'][:2],kind=f['kind'],name=f['name'],sex=sex,basis=basis,source=source,asof='2026-10-26',extension=True,**kw))
# Current policy takes precedence over an old name in the 2021 geographic data.
exceptions=[('女子栄養','coed','https://www.eiyo.ac.jp/news/2024/2141/'),('東京女子学院','coed','https://eimei-frontier.ed.jp/about/message/'),('自由学園男子部','coed','https://www.jiyu.ac.jp/jhsh/2024kyogakuka_release.pdf'),('自由学園女子部','coed','https://www.jiyu.ac.jp/jhsh/2024kyogakuka_release.pdf'),('聖徳大学附属女子','coed','https://www.chu-jukennavi.net/cnavi14.html'),('蒲田女子','coed','https://www.ko-jukennavi.net/nyushi/kawaru/nyushi-info/'),('東京女子学園','coed','https://www.rinkaiseminar.co.jp/nyushi/es.html'),('千代田女学園','coed','https://www.chu-jukennavi.net/cnavi14.html'),('文華女子','coed','https://www.bunkagakuen.ac.jp/')]
for f in fac:
 if f['kind'] not in ['middle','high','university','college']:continue
 ex=next((e for e in exceptions if e[0] in f['name']),None)
 if ex:
  # Existing exact override already covers 文華女子 high.
  if not any(r['pref']==f['code'][:2] and r['kind']==f['kind'] and r['name']==f['name'] for r in rows):add(f,ex[1],'source',ex[2])
 elif '日本大学豊山高等学校'==f['name']:
  add(f,'male','secondary','https://www.minkou.jp/hischool/school/3578/')
 elif any(x in f['name'] for x in ['女子','女学院','女学館','女学園','男子部']):
  # Do not classify a generic attached school using its parent university's name.
  if ('附属' in f['name'] or '付属' in f['name']) and not (f['kind']=='high' and f['name']=='お茶の水女子大学附属高等学校') and not any(x in f['name'] for x in ['附属女子','付属女子','女子美術大学付属']):continue
  if '桐朋女子' in f['name'] and f['kind']=='high':continue # music department admits men
  add(f,'male' if '男子部' in f['name'] else 'female','name-inference','名称に基づく推定（利用者指定）')
data['records']=rows
data['notes']=[n for n in data['notes'] if '名称' not in n]+['公式・非公式資料の確認に加え、未照合校は名称からの推定を採用。basisに根拠種別を保存。附属校・共学化の既知例は例外処理。']
p.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n')
print('extension records:',sum(bool(r.get('extension')) for r in rows))

