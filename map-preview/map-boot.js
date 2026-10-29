/* Creates the Leaflet map before statistics finish loading; app.js reuses the same instance. */
const MapBoot=(()=>{
 let state=null;
 function create(point,radius){
  if(state)return state;
  const map=L.map('map',{minZoom:10,maxZoom:18,maxBounds:[[35.48,139.48],[35.86,139.94]],maxBoundsViscosity:.8}).setView([point[1],point[0]],15);
  const tiles=L.tileLayer('https://tile.openstreetmap.jp/styles/osm-bright-ja/{z}/{x}/{y}.png',{maxZoom:18,updateWhenIdle:true,updateWhenZooming:false,keepBuffer:1,attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a> | <a href="https://openmaptiles.org/">&copy; OpenMapTiles</a> | <a href="https://www.osm.jp/">OpenStreetMap Japan</a>'}).addTo(map);
  tiles.on('tileerror',()=>{const status=document.getElementById('status');if(status)status.textContent='背景地図の一部を読み込めません。通信状態を確認してください。地域・施設データは引き続き利用できます。'});
  // The range glows blue like an aura: a radial fill that deepens toward the rim plus a soft outer glow, so it still
  // reads when the whole view is inside the circle.
  const circle=L.circle([point[1],point[0]],{radius,color:'#3D7BFF',weight:2,opacity:.85,fillColor:'url(#range-aura)',fillOpacity:1,className:'range-aura'}).addTo(map),pin=L.circleMarker([point[1],point[0]],{radius:6,color:'#fff',fillColor:'#C8371E',fillOpacity:1}).addTo(map);
  const svg=circle._path?.ownerSVGElement;if(svg&&!svg.querySelector('#range-aura')){const NS='http://www.w3.org/2000/svg',defs=document.createElementNS(NS,'defs'),g=document.createElementNS(NS,'radialGradient');g.id='range-aura';
   for(const [o,a] of [[0,.04],[.55,.09],[.82,.17],[.95,.3],[1,.42]]){const stop=document.createElementNS(NS,'stop');stop.setAttribute('offset',o);stop.setAttribute('stop-color','#4A86FF');stop.setAttribute('stop-opacity',a);g.appendChild(stop)}defs.appendChild(g);svg.insertBefore(defs,svg.firstChild)}
  state={map,tiles,circle,pin};return state;
 }
 // Loading readout under the draw button; each published asset reports its step as it finishes.
 const STEPS=['地図を表示しています','人物生成エンジンを読み込んでいます','地図データを読み込んでいます','滞在人口を推定しています'];
 function step(n){const text=document.getElementById('sysload-text'),bar=document.querySelectorAll('#sysload .sys-bar i');if(!text)return;text.textContent=STEPS[Math.min(n,STEPS.length-1)];bar.forEach((b,i)=>b.classList.toggle('on',i<n))}
 function done(){const box=document.getElementById('sysload');if(!box)return;step(4);document.getElementById('sysload-text').textContent='準備完了';box.classList.add('done');setTimeout(()=>{box.hidden=true},1200)}
 return {create,step,done};
})();
