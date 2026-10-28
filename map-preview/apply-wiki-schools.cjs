// Structured facts transcribed from the user-specified Wikipedia list, 2026-10-27.
// Exact prefecture + stage + normalized name matching only; no substring matches.
const fs=require('node:fs'),S=require('./school-policy.js');
const file=__dirname+'/data/school-sex.json',p=JSON.parse(fs.readFileSync(file)),geo=require('./data/geography.json');
p.records=p.records.filter(r=>!r.wikiList);
const source='https://ja.wikipedia.org/wiki/日本の男女別学校一覧';
let specs=[];
function add(pref,sex,kinds,names){for(let name of names.split(' '))for(let kind of kinds.split(','))specs.push({pref,sex,kind,name})}
add('13','male','middle,high','筑波大学附属駒場 麻布 足立学園 海城 開成 学習院 暁星 京華 攻玉社 佼成学園 駒場東邦 芝 城北 巣鴨 聖学院 成城 世田谷学園 高輪 桐朋 獨協 日本大学豊山 本郷 武蔵 東京都市大学付属 明治大学付属中野 立教池袋 早稲田 早稲田大学高等学院');
add('13','male','middle','サレジオ');add('13','male','high','科学技術学園 正則学園 保善');
add('11','male','high','浦和 熊谷 川越 松山 春日部 川越東 慶應義塾志木 城西大学付属川越');
add('11','male','middle','城西川越');add('11','male','middle,high','城北埼玉 立教新座');
add('14','male','middle,high','浅野 栄光学園 鎌倉学園 サレジオ学院 逗子開成 聖光学院 藤嶺学園藤沢 武相');add('14','male','middle','慶應義塾普通部 横浜');add('14','male','high','慶應義塾 藤沢翔陵');
add('11','female','high','浦和第一女子 川越女子 春日部女子 久喜 熊谷女子 鴻巣女子 松山女子 秋草学園');add('11','female','middle,high','浦和明の星女子 大妻嵐山 淑徳与野');
add('12','female','high','千葉女子 木更津東 愛国学園大学附属四街道 千葉聖心 千葉萌陽 不二女子');add('12','female','middle,high','国府台女子学院 和洋国府台女子');
add('13','female','middle,high','愛国 跡見学園 江戸川女子 桜蔭 鷗友学園女子 大妻 大妻中野 大妻多摩 学習院女子 川村 神田女学園 北豊島 吉祥女子 共立女子 共立女子第二 国本女子 京華女子 恵泉女学園 光塩女子学院 晃華学園 麹町学園女子 佼成学園女子 香蘭女学校 駒沢学園女子 実践女子学園 品川女子学院 十文字 頌栄女子学院 昭和女子大学附属昭和 女子学院 女子聖学院 女子美術大学付属 白百合学園 聖心女子学院 聖ドミニコ学園 瀧野川女子学園 玉川聖学院 田園調布学園 田園調布雙葉 東京家政学院 東京家政大学附属女子 東京純心女子 東京女学館 東洋英和女学院 トキワ松学園 豊島岡女子学園 中村 日本体育大学桜華 日本大学豊山女子 富士見 富士見丘 藤村女子 雙葉 普連土学園 文京学院大学女子 三輪田学園 山脇学園 立教女学院 和洋九段女子');
add('13','female','high','安部学院 慶應義塾女子 品川エトワール女子 下北沢成徳 潤徳女子 白梅学園 成女 立川女子 東洋女子 日本女子体育大学附属二階堂 お茶の水女子大学附属 鶴川');
add('13','female','middle','成女学園 桐朋女子 白梅学園清修');
add('14','female','middle,high','神奈川学園 鎌倉女学院 カリタス女子 函嶺白百合学園 北鎌倉女子学園 相模女子大学 湘南白百合学園 清泉女学院 聖セシリア女子 聖和学院 洗足学園 捜真女学校 日本女子大学附属 フェリス女学院 聖園女学院 緑ヶ丘女子 横浜共立学園 横浜雙葉 横浜女学院');add('14','female','high','英理女子学院 白鵬女子 清心女子');
add('13','male','primary','暁星小学校 立教小学校');
add('13','female','primary','川村小学校 光塩女子学院初等科 白百合学園小学校 聖心女子学院初等科 田園調布雙葉小学校 東京女学館小学校 東洋英和女学院小学部 日本女子大学附属豊明小学校 雙葉小学校 立教女学院小学校');add('12','female','primary','国府台女子学院小学部');add('14','female','primary','湘南白百合学園小学校 横浜雙葉小学校');
add('13','female','kindergarten','白百合学園幼稚園 田園調布雙葉小学校附属幼稚園');
// Institution-level exceptions cannot be represented as a single-sex school.
add('13','mixed','high','桐朋女子 宝仙学園');add('11','mixed','high','星野');
const universities='十文字学園女子大学 愛国学園大学 川村学園女子大学 聖徳大学 和洋女子大学 跡見学園女子大学 大妻女子大学 共立女子大学 恵泉女学園大学 駒沢女子大学 実践女子大学 昭和女子大学 女子美術大学 白百合女子大学 聖心女子大学 清泉女子大学 津田塾大学 東京家政大学 東京女子大学 東京女子医科大学 東京女子体育大学 日本女子大学 日本女子体育大学 鎌倉女子大学 相模女子大学 東洋英和女学院大学 フェリス女学院大学 お茶の水女子大学';
const colleges='秋草学園短期大学 埼玉純真短期大学 埼玉女子短期大学 聖徳大学短期大学部 愛国学園短期大学 大妻女子大学短期大学部 共立女子短期大学 駒沢女子短期大学 女子美術大学短期大学部 創価女子短期大学 戸板女子短期大学 東京家政大学短期大学部 東京歯科大学短期大学 東京女子体育短期大学 目白大学短期大学部 鎌倉女子大学短期大学部 相模女子大学短期大学部 横浜女子短期大学 千葉女子専門学校 羽田幼児教育専門学校 聖徳大学幼児教育専門学校 芳澍女学院情報国際専門学校 東京女子医科大学看護専門学校 東京墨田看護専門学校 東京歯科衛生専門学校 東京立川歯科衛生学院専門学校';
for(let pref of ['11','12','13','14']){add(pref,'female','university',universities);add(pref,'female','college',colleges)}
let matched=new Set();for(let f of geo.facilities){let s=specs.find(s=>s.pref===f.code.slice(0,2)&&s.kind===f.kind&&S.normalize(s.name)===S.normalize(f.name));if(!s)continue;let key=[s.pref,f.kind,f.name].join('/');if(matched.has(key))continue;matched.add(key);p.records.push({...s,name:f.name,basis:'secondary',source,asof:'2026-10-27',wikiList:true,scope:f.kind==='high'?'fulltime':undefined,notes:s.sex==='mixed'?'一部学科・部門が共学。内訳未取得のため男女比は暫定50:50。':'高校は全日制の区分。定時制・通信制への一律適用はしない。'})}
fs.writeFileSync(file,JSON.stringify(p,null,2)+'\n');console.log('Wikipedia matched institution/stage records',matched.size);

