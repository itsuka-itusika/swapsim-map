/* Broadcasting-specific staff. Capacities, role shares and shifts are modeling assumptions. */
const BroadcastModel=(()=>{
 const labels={announcer:'アナウンサー',reporter:'放送記者',director:'テレビ番組ディレクター',camera:'テレビカメラスタッフ',audio:'放送音声スタッフ',editor:'映像編集者',performer:'番組出演者',idol:'アイドル',makeup:'ヘアメイク',radio_host:'ラジオパーソナリティ',radio_director:'ラジオ番組ディレクター',broadcast:'放送技術者',producer:'番組プロデューサー',assistant:'番組制作アシスタント',lighting:'テレビ照明スタッフ',art:'美術・大道具スタッフ',wardrobe:'衣装スタッフ',programming:'番組編成担当',master:'マスター送出監視スタッフ',desk:'報道デスク'};
 const shares={announcer:.025,reporter:.11,director:.15,camera:.1,audio:.065,editor:.1,performer:.025,idol:.006,makeup:.02,radio_host:.06,radio_director:.2,broadcast:.1,producer:.06,assistant:.08,lighting:.05,art:.045,wardrobe:.02,programming:.035,master:.045,desk:.035};
 function roles(f,t){let h=t.hf??t.h,day=h>=9&&h<21,early=h>=5&&h<9,radio=f.kind==='radio',keys=radio?['radio_host','radio_director','audio','reporter','broadcast','producer','assistant','programming','master','desk']:Object.keys(labels).filter(k=>!k.startsWith('radio_')),sum=keys.reduce((s,k)=>s+shares[k],0);return keys.map(k=>{let continuous=['reporter','audio','broadcast','announcer','radio_host','radio_director','master','desk'].includes(k),n=f.capacity*shares[k]/sum*(day?1:early?(continuous?.45:.12):continuous?.16:.025);return {role:'media_'+k,label:labels[k],n,min:k==='idol'||k==='assistant'?18:k==='performer'?20:22,max:k==='idol'?35:k==='performer'?74:65,female:['makeup','wardrobe'].includes(k)?.7:['camera','lighting','art'].includes(k)?.3:.5}})}
 function assign(c,P){if(!c.role.startsWith('media_'))return;P.occ={label:c.label,group:'adult',cat:'media',kind:'employed',p:1}}
 return {roles,assign,labels};
})();
if(typeof module!=='undefined')module.exports=BroadcastModel;
