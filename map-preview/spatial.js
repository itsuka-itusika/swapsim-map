/* Geometry and spatial lookup only. No demographic meaning is assigned to index cells. */
const MapSpatial=(()=>{
 const M=typeof MapModel!=='undefined'?MapModel:require('./model.js');
 const areaCache=new WeakMap();
 const scale=p=>111195*Math.cos(p[1]*Math.PI/180);
 function bounds(g){let pts=g.coordinates.flat(g.type==='MultiPolygon'?2:1);return [Math.min(...pts.map(p=>p[0])),Math.min(...pts.map(p=>p[1])),Math.max(...pts.map(p=>p[0])),Math.max(...pts.map(p=>p[1]))]}
 function box(p,r){return [p[0]-r/scale(p),p[1]-r/111195,p[0]+r/scale(p),p[1]+r/111195]}
 const intersects=(a,b)=>a[0]<=b[2]&&a[2]>=b[0]&&a[1]<=b[3]&&a[3]>=b[1];
 function contains(p,f){let b=f.bbox||box(f.xy,f.radius||25);if(p[0]<b[0]||p[0]>b[2]||p[1]<b[1]||p[1]>b[3])return false;if(f.geometry)return M.inside(p,f.geometry);if(f.line)return typeof LandModel!=='undefined'&&LandModel.contains(p,f);return M.distance(p,f.xy)<=f.radius}
 function area(g){if(areaCache.has(g))return areaCache.get(g);let b=bounds(g),s=scale([0,(b[1]+b[3])/2])*111195,polys=g.type==='Polygon'?[g.coordinates]:g.coordinates;const a=r=>Math.abs(r.reduce((v,p,i)=>{let q=r[(i+1)%r.length];return v+p[0]*q[1]-q[0]*p[1]},0))/2;let result=polys.reduce((v,p)=>v+a(p[0])-p.slice(1).reduce((v,r)=>v+a(r),0),0)*s;areaCache.set(g,result);return result}
 function samples(p,r,n=512){return Array.from({length:n},(_,i)=>{let a=i*2.399963229728653,d=r*Math.sqrt((i+.5)/n);return [p[0]+Math.cos(a)*d/scale(p),p[1]+Math.sin(a)*d/111195]})}
 class Index{constructor(items=[]){this.cells=new Map();for(let f of items){if(!f.bbox)f.bbox=f.geometry?bounds(f.geometry):box(f.xy,f.radius||25);for(let x=Math.floor(f.bbox[0]*100);x<=Math.floor(f.bbox[2]*100);x++)for(let y=Math.floor(f.bbox[1]*100);y<=Math.floor(f.bbox[3]*100);y++){let k=x+','+y;if(!this.cells.has(k))this.cells.set(k,[]);this.cells.get(k).push(f)}}}query(b){let out=new Set();for(let x=Math.floor(b[0]*100);x<=Math.floor(b[2]*100);x++)for(let y=Math.floor(b[1]*100);y<=Math.floor(b[3]*100);y++)for(let f of this.cells.get(x+','+y)||[])if(intersects(b,f.bbox))out.add(f);return [...out]}at(p){return this.query([p[0],p[1],p[0],p[1]]).filter(f=>contains(p,f))}}
 return {bounds,box,intersects,contains,area,samples,Index};
})();
if(typeof module!=='undefined')module.exports=MapSpatial;
