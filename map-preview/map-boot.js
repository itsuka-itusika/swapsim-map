/* Creates the Leaflet map before statistics finish loading; app.js reuses the same instance. */
const MapBoot=(()=>{
 let state=null;
 function create(point,radius){
  if(state)return state;
  const map=L.map('map',{minZoom:10,maxZoom:18,maxBounds:[[35.48,139.48],[35.86,139.94]],maxBoundsViscosity:.8}).setView([point[1],point[0]],15);
  const tiles=L.tileLayer('https://tile.openstreetmap.jp/styles/osm-bright-ja/{z}/{x}/{y}.png',{maxZoom:18,updateWhenIdle:true,updateWhenZooming:false,keepBuffer:1,attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a> | <a href="https://openmaptiles.org/">&copy; OpenMapTiles</a> | <a href="https://www.osm.jp/">OpenStreetMap Japan</a>'}).addTo(map);
  tiles.on('tileerror',()=>{const status=document.getElementById('status');if(status)status.textContent='背景地図の一部を読み込めません。通信状態を確認してください。地域・施設データは引き続き利用できます。'});
  const circle=L.circle([point[1],point[0]],{radius,color:'#2E6A5D',fillOpacity:.12}).addTo(map),pin=L.circleMarker([point[1],point[0]],{radius:6,color:'#fff',fillColor:'#C8371E',fillOpacity:1}).addTo(map);
  state={map,tiles,circle,pin};return state;
 }
 return {create};
})();
