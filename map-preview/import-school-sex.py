"""Build source-backed school sex overrides from downloaded official snapshots.
Inputs: /tmp/school-sex/kanagawa.xlsx and chiba-{koukou,chuugaku,shougaku}.html.
Output is an auditable match-by-prefecture-and-stage manifest, not a name heuristic.
"""
import json,re,unicodedata,collections
from pathlib import Path
import openpyxl
from bs4 import BeautifulSoup
root=Path(__file__).parent
rows=[]
def add(pref,kind,name,sex,source,asof='2026-05-01',**kw):
 rows.append(dict(pref=pref,kind=kind,name=name,sex=sex,source=source,asof=asof,**kw))
u='https://www.pref.kanagawa.jp/documents/22470/r80501~meibo.xlsx'
w=openpyxl.load_workbook('/tmp/school-sex/kanagawa.xlsx',data_only=True)
for sheet,kind,nc,gc in [('小学校','primary',0,6),('中学校','middle',1,7),('高等学校','high',1,9)]:
 for r in w[sheet].values:
  if len(r)>gc and r[nc] and r[gc] in ['男','女','共','共学']:
   add('14',kind,str(r[nc]),{'男':'male','女':'female','共':'coed','共学':'coed'}[r[gc]],u)
for stage,kind in [('koukou','high'),('chuugaku','middle'),('shougaku','primary')]:
 u=f'https://www.pref.chiba.lg.jp/gakuji/shiritsutou/shiritsugakkou/{stage}-meibo.html'
 s=BeautifulSoup(Path('/tmp/school-sex/chiba-'+stage+'.html').read_text(),'html.parser')
 for tr in s.select('tr'):
  r=[c.get_text('',strip=True) for c in tr.find_all(['td','th'])]
  col=7 if stage=='koukou' else 6
  if len(r)>col and r[col] in ['男子','女子','共学']:
   add('12',kind,r[0],{'男子':'male','女子':'female','共学':'coed'}[r[col]],u,asof='2026-06-15')
# Explicit lists and named rows in the Tokyo FY2026 admissions publication.
u='https://www.metro.tokyo.lg.jp/information/press/2025/10/2025100812'
for sex,names in {
'male':'暁星 麻布 芝 高輪 海城 成城 早稲田 獨協 攻玉社 駒場東邦 東京都市大学付属 本郷 武蔵 京華 佼成学園 聖学院 早稲田大学高等学院',
'female':'大妻 共立女子 女子学院 白百合学園 雙葉 三輪田学園 頌栄女子学院 聖心女子学院 東洋英和女学院 普連土学園 山脇学園 学習院女子 跡見学園 桜蔭 香蘭女学校 品川女子学院 鷗友学園女子 恵泉女学園 昭和女子大学附属昭和 聖ドミニコ学園 田園調布学園 田園調布雙葉 実践女子学園 東京女学館 大妻中野 光塩女子学院 立教女学院 豊島岡女子学園 女子聖学院 富士見 吉祥女子 晃華学園 大妻多摩 神田女学園 麴町学園女子 和洋九段女子 慶應義塾女子 京華女子 文京学院大学女子 中村 品川エトワール女子 トキワ松学園 国本女子 佼成学園女子 下北沢成徳 日本女子体育大学附属二階堂 富士見丘 十文字 北豊島 東京家政大学附属女子 江戸川女子',
'coed':'広尾学園小石川 サレジアン国際学園世田谷 東京農業大学第一 三田国際科学学園 渋谷教育学園渋谷 穎明館 ドルトン東京学園 千代田 開智日本橋学園 芝国際 広尾学園 目白研心 郁文館グローバル 駒込 岩倉 かえつ有明 芝浦工業大学附属 青稜 文教大学付属 朋優学院 八雲学園 日本大学櫻丘 青山学院 関東国際 実践学園 新渡戸文化 宝仙学園 國學院大學久我山 中央大学杉並 文化学園大学杉並 淑徳巣鴨 東京音楽大学付属 サレジアン国際学園 北里大学附属順天 淑徳 帝京 工学院大学附属 聖徳学園 成蹊 啓明学園 桜美林 国際基督教大学 中央大学附属 早稲田実業学校 自由学園 武蔵野大学'
}.items():
 for name in names.split():add('13','high',name,sex,u)
# Stage-specific middle-school lists verified separately from the high-school list.
for sex,names,doc in [('male','暁星 麻布 芝 高輪 海城 成城 早稲田 京華 獨協 日本大学豊山 攻玉社 駒場東邦 世田谷学園 東京都市大学付属 明治大学付属中野 学習院 巣鴨 本郷 立教池袋 聖学院','251008_shigaku_jh01_2425'),('female','大妻 神田女学園 共立女子 麴町学園女子 女子学院 白百合学園 東京家政学院 雙葉 三輪田学園 和洋九段女子 頌栄女子学院','251008_shigaku_jh02_2425')]:
 for name in names.split():add('13','middle',name,sex,'https://www.seikatubunka.metro.tokyo.lg.jp/documents/d/seikatubunka/'+doc)
# Saitama official list: scope is full-time only, do not apply to evening courses.
u='https://www.pref.saitama.lg.jp/f2207/kyougakubetugakukoukousei.html'
for sex,names in {'male':['埼玉県立浦和','埼玉県立川越','埼玉県立熊谷','埼玉県立松山','埼玉県立春日部'],'female':['埼玉県立浦和第一女子','埼玉県立川越女子','埼玉県立熊谷女子','埼玉県立松山女子','埼玉県立春日部女子','埼玉県立鴻巣女子','埼玉県立久喜']}.items():
 for name in names:add('11','high',name,sex,u,asof='2024-05-09',scope='fulltime')
# Explicit changed name: source dataset contains 文華女子, coeducation began April 2026.
add('13','high','文華女子','coed','https://www.bunkagakuen.ac.jp/',asof='2026-04-01',validFrom='2026-04-01',aliases=['東京文華'],displayName='東京文華高等学校')
# Do not use the name 女子 as a rule; university policies need their own records.
add('13','university','お茶の水女子大学','female','https://www.dc.ocha.ac.jp/m/c-cultures/jle/qa/menu/admissions.html',asof='2026-10-26',scope='regular-students')
manifest={'version':1,'checkedOn':'2026-10-26','notes':['共学校で男女実数未取得の場合の女性率0.5は仮定値。','不明校を共学校とは表示しない。','2026年の区分を歴史的な日時の制度再現と解釈しない。','男子校・女子校の区分は生徒学生に限定。職員・来訪者には適用しない。'],'records':rows}
(root/'data/school-sex.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
print(len(rows),'source records',collections.Counter((r['pref'],r['sex']) for r in rows))

