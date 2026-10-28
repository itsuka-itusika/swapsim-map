/* Named OpenStreetMap points of interest; all occupancy and opening defaults are game estimates. */
const PoiModel=(()=>{
 const shop={convenience:['コンビニ','convenience'],supermarket:['スーパー','shop'],bakery:['パン屋','bakery'],chemist:['ドラッグストア','shop'],alcohol:['酒屋','shop'],department_store:['百貨店','shop'],doityourself:['ホームセンター','shop'],variety_store:['雑貨店','shop'],clothes:['衣料品店','shop'],shoes:['靴店','shop'],books:['書店','shop'],electronics:['家電店','shop'],florist:['花屋','shop'],hairdresser:['美容室・理髪店','salon'],beauty:['美容サロン','salon'],laundry:['コインランドリー','laundry'],dry_cleaning:['クリーニング店','laundry'],car_repair:['自動車整備工場','repair']};
 const amenity={cafe:['カフェ','food'],restaurant:['飲食店','food'],fast_food:['ファストフード店','food'],bar:['バー','bar'],pub:['居酒屋・パブ','bar'],food_court:['フードコート','food'],pharmacy:['薬局','pharmacy'],bank:['銀行','bank'],post_office:['郵便局','post'],fuel:['ガソリンスタンド','fuel'],car_wash:['洗車場','repair'],dentist:['歯科医院','clinic'],clinic:['診療所','clinic'],cinema:['映画館','cinema'],library:['図書館','library'],public_bath:['浴場','bath'],police:['警察施設','police'],toilets:['公衆トイレ','toilets'],smoking_area:['喫煙所','smoking']};
 const tourism={hostel:['宿泊施設','hotel'],guest_house:['宿泊施設','hotel'],camp_site:['キャンプ場','camp'],zoo:['動物園','zoo'],aquarium:['水族館','aquarium'],viewpoint:['展望施設','viewpoint']};
 const leisure={bowling_alley:['ボウリング場','bowling'],amusement_arcade:['ゲームセンター','arcade'],fitness_centre:['フィットネスジム','gym']};
 function spec(t){if(!t)return null;let x=shop[t.shop]||amenity[t.amenity]||({dentist:['歯科医院','clinic'],clinic:['診療所','clinic'],physiotherapist:['施術所','clinic']})[t.healthcare]||tourism[t.tourism]||leisure[t.leisure];if(t.cuisine&&x?.[1]==='food'){if(/(^|;)sushi(;|$)/.test(t.cuisine))x=['寿司店','food'];else if(/(^|;)ramen(;|$)/.test(t.cuisine))x=['ラーメン店','food'];}return x?{label:x[0],kind:x[1]}:null}
 function closed(t){return !!(t?.construction||t?.disused==='yes'||t?.abandoned==='yes'||t?.closed==='yes'||t?.shop==='vacant'||Object.keys(t||{}).some(k=>/^(disused|abandoned|demolished|construction):/.test(k)))}
 return {spec,closed};
})();
if(typeof module!=='undefined')module.exports=PoiModel;
