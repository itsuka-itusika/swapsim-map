/* The last draw's map selection is independent of profile data and detailed options. */
const SelectionCache=(()=>{
 const KEY='swapsim-map-last-draw-v1',RADII=[100,300,500,1000],DEFAULT_POINT=[139.701238,35.658871];
 function valid(point,radius){return Array.isArray(point)&&point.length===2&&point.every(Number.isFinite)&&point[0]>=139.48&&point[0]<=139.94&&point[1]>=35.48&&point[1]<=35.86&&RADII.includes(radius)}
 function load(storage){try{const saved=JSON.parse(storage?.getItem(KEY)||'null');if(saved?.version===1&&valid(saved.point,saved.radius))return {point:saved.point.slice(),radius:saved.radius}}catch{}return {point:DEFAULT_POINT.slice(),radius:300}}
 function save(storage,point,radius){if(!valid(point,radius))return false;try{if(!storage)return false;storage.setItem(KEY,JSON.stringify({version:1,point:point.slice(),radius}));return true}catch{return false}}
 return {KEY,DEFAULT_POINT,load,save};
})();
if(typeof module!=='undefined')module.exports=SelectionCache;
