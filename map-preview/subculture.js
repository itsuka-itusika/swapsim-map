/* Genres describe visit purpose, not every resident of a neighborhood. */
const Subculture=(()=>{
 const genres={
 anime:['アニメ・漫画','専門店で、好きな作品のグッズを探しているところでした'],
 game:['ゲーム','ゲーム専門店で、新作の紹介映像を見ているところでした'],
 doujin:['同人誌','同人ショップで、気になる作家の新刊を探しているところでした'],
 women:['漫画・アニメ（女性向け）','好きな作品のグッズを手に取り、絵柄を見比べているところでした'],
 men:['アニメ・漫画','キャラクターグッズの棚で、買うものを選んでいるところでした'],
 bl:['漫画（BL）','書店で、気になっていた漫画の新刊を探しているところでした'],
 theater:['舞台鑑賞','舞台の出演者を確認しながら、公演の案内を読んでいるところでした'],
 voice:['声優','声優のイベント告知を見て、開催日を確認しているところでした'],
 idol:['アイドル','アイドルのグッズを見ながら、買い物かごに品物を入れているところでした'],
 vtuber:['バーチャル配信者の応援','配信者のグッズを見つけて、手に取っているところでした'],
 card:['カードゲーム','カードショップで、対戦に使うカードを選んでいるところでした'],
 figure:['フィギュア収集','ショーケースに並んだフィギュアを眺めているところでした'],
 railway:['鉄道','鉄道模型の売り場で、車両の細かな違いを見比べているところでした'],
 model:['模型製作','模型店で、組み立てたいキットを探しているところでした'],
 pc:['電子工作・自作パソコン','部品店で、探していた部品の型番を確かめているところでした'],
 collector:['古書・玩具収集','中古ショップで、探していた品物の状態を確かめているところでした'],
 cosplay:['コスプレ','衣装の売り場で、布の色や小物を見比べているところでした'],
 oshi:['推し活','推しのグッズを並べて、購入するものを選んでいるところでした']
 };
 function apply(c,P){if(c.role!=='area_subculture')return false;let gs=c.area.genres||{},keys=Object.keys(gs).filter(k=>genres[k]&&gs[k]>0),key=pickW(keys,k=>gs[k]).v;P.subcultureGenre=key;P.profileDisplay={...P.profileDisplay,hobby:genres[key][0]};let pool=typeof MAP_DATA!=='undefined'?MAP_DATA.storyScenes?.subculture?.[key]:null;P.mapSituation=pool?.length?pool[Math.floor(rnd()*pool.length)]:genres[key][1];P.sit={state:'off',stateLabel:'趣味の買い物・街歩き',text:P.mapSituation,p:1};P.visitLabel='趣味の来街者：'+genres[key][0];return true;}
 return {genres,apply};
})();
if(typeof module!=='undefined')module.exports=Subculture;

