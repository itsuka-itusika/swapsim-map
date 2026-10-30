/* Place shown for a person: a specific facility or named place as is; otherwise the district (or ward), with 自宅 for
   people at home and 職場 for people at work (西新宿 自宅, 目黒区 職場, 銀座). No extra data is loaded for this. */
const PlaceLabel=(()=>{
 // OpenStreetMap buildings are not places to show by name: unnamed ones carry only their type (family, apartments,
 // office), apartment names are private, and office or factory names are often just the tenant company (株式会社…).
 // A named building or complex (〇〇ビル, 〇〇タワー) is kept; a company name never is.
 const COMPANY=/株式会社|有限会社|合同会社|合資会社|\(株\)|（株）|\(有\)|（有）|㈱|㈲|Inc\.?|Co\.,?|Ltd|LLC|Corporation|事務所|営業所|支店|本社|支社|出張所/i,BUILDING=/ビル|タワー|ヒルズ|センター|プラザ|スクエア|テラス|ゲート|フォレスト|シティ|会館|工場|倉庫|物流/;
 function privateName(lc){let named=lc.tags?lc.tags.name||lc.tags['name:ja']:lc.name;if(!named||lc.name===lc.subtype)return true;if(lc.type==='residential')return true;return ['office','industrial'].includes(lc.type)&&(COMPANY.test(lc.name)||!BUILDING.test(lc.name))}
 function generic(c){let lc=c.landComponent;if(c.facility||c.road||c.zone)return false;if(c.area)return true;if(!lc)return true;return ['zoning','fallback'].includes(lc.precision)||!lc.name||lc.name===c.region?.name||lc.name===lc.areaTag?.name||lc.source==='OpenStreetMap'&&privateName(lc)}
 // 自宅 and 職場 follow the final scene, not only the drawn role: a resident shopping at the supermarket or a worker
 // on a lunch break at a cafe gets just the district.
 // Clear at-home markers win over outside words; sleeping people are always at home.
 const HOME=/自宅|家で|家の中|部屋|布団|寝室|ベッド|リビング|台所|キッチン|風呂|浴室|湯船|ベランダ|玄関|こたつ|ソファ|夢の中|洗濯物|冷蔵庫|パジャマ|支度|行く準備|メイク|トイレ|出かける直前|出かける前/;
 const OUT=/待合|免許の更新|講習|試験場|運転テスト|スーパー|コンビニ|ホームセンター|公園|散歩|駅|改札|電車|バス|タクシー|店|商店街|銭湯|カフェ|喫茶|図書館|病院|歯医者|クリニック|薬局|銀行|郵便局|役所|公民館|ジム|教室|学校|会社|職場|オフィス|車で|自転車で|ドライブ|河川敷|川沿い|遊歩道|神社|寺|墓|居酒屋|レストラン|ファミレス|映画館|美術館|買い物|出かけ|外出|散策|ランニング|ジョギング|ウォーキング|通勤|通学|帰り道|待ち合わせ|現場|窓口|[^部]屋で|屋の|ドラッグストア|診察|主治医|寿司|定食|テーマパーク|遊園地|習い事|スイミング|プール|美容院|床屋|塾|近所を歩|行列|列に並/;
 // Clearly elsewhere even when a home word also appears (近所の銭湯の湯船, 友達の部屋).
 const ELSEWHERE=/に来て|会場|洗車場|友達の部屋|友人の部屋|銭湯|屋に入|近所の家|車の中|教習所|リハビリ|健診|外科|内科|歯科|眼科|皮膚科|耳鼻科|小児科|帰りに/;
 const AWAY_FROM_WORK=/昼休みに.*(外|カフェ|公園|店|コンビニ)|外回り|営業先|取引先を訪|出張|移動中|帰り道|退勤|通勤/;
 function kind(c,P){let r=c.role,text=P.sit?.text||'',state=P.sit?.state;
  if(c.resident||r==='general'){if(state==='sleep'||/自宅|家で|家の中/.test(text))return '自宅';if(ELSEWHERE.test(text))return '';return HOME.test(text)||!OUT.test(text.replace(/買い物リスト/g,''))?'自宅':''}
  if(state==='work'&&(r==='area_office'||/_worker$|^mesh_|^urban_(?!visit)/.test(r)))return AWAY_FROM_WORK.test(text)?'':'職場';
  return ''}
 // Place name without the 自宅/職場 suffix, for lists and map tooltips.
 function name(c){let own=c.facility?.name||c.landComponent?.name||c.zone?.name||c.area?.name;if(own&&!generic(c))return own;return named(c.area,c)||named(c.landComponent?.areaTag,c)||c.region?.name||own||''}
 // A wide district can be named only near its centre (labelRadius); farther out the ward is shown.
 function named(a,c){if(!a?.name)return null;if(!a.labelRadius)return a.name;let p=c.landComponent?.sampleXY||c.landComponent?.xy;return p&&typeof MapModel!=='undefined'&&MapModel.distance(p,a.xy)>a.labelRadius?null:a.name}
 function label(c,P,fallback){if(!generic(c))return fallback;let lc=c.landComponent,where=(c.area&&/^area_/.test(c.role)&&named(c.area,c))||named(lc?.areaTag,c)||c.region?.name||fallback;let k=kind(c,P);return k?where+' '+k:where}
 return {label,generic,kind,privateName,name};
})();
if(typeof module!=='undefined')module.exports=PlaceLabel;
