import { createModel } from './model.js';

const $=selector=>document.querySelector(selector);
const icons={
  brand:'<path d="m3 8 9-5 9 5-9 5-9-5Zm0 4 9 5 9-5M3 16l9 5 9-5"/>',
  pin:'<path d="M19 10c0 5-7 10-7 10s-7-5-7-10a7 7 0 1 1 14 0Z"/><circle cx="12" cy="10" r="2.3"/>',
  info:'<circle cx="12" cy="12" r="9"/><path d="M12 11v5m0-8h.01"/>',
  search:'<circle cx="10.5" cy="10.5" r="6"/><path d="m15 15 4 4"/>',
  compass:'<circle cx="12" cy="12" r="9"/><path d="m15.5 8.5-2 5-5 2 2-5 5-2Z"/>',
  north:'<path d="m12 3 5 15-5-3-5 3 5-15Z" fill="currentColor"/>',
  plus:'<path d="M12 5v14M5 12h14"/>',
  minus:'<path d="M5 12h14"/>',
  target:'<circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/><path d="M12 2v4m0 12v4M2 12h4m12 0h4"/>',
  expand:'<path d="M9 4H4v5m11-5h5v5M4 15v5h5m11-5v5h-5"/>',
  cube:'<path d="m12 3 8 4.5v9L12 21l-8-4.5v-9L12 3Zm-8 4.5 8 4.5 8-4.5M12 12v9"/>',
  satellite:'<path d="m8 8 8 8m-7-3-4 4-2-2 4-4m4-4 4-4 2 2-4 4M9 5l10 10-4 4L5 9l4-4Zm7 12 2 2m-3 1c2 1 4 1 6 0"/>',
  walk:'<circle cx="13" cy="4" r="2"/><path d="m7 21 3-6 1-5-3 2-1 3m4-5 3 4 4 1m-7 0 4 3 1 3"/>',
  close:'<path d="m6 6 12 12M18 6 6 18"/>',
  chevron:'<path d="m9 6 6 6-6 6"/>',
  book:'<path d="M12 6c-3-2-6-2-9-1v13c3-1 6-1 9 1 3-2 6-2 9-1V5c-3-1-6-1-9 1Zm0 0v13"/>',
  gate:'<path d="M3 19h18M5 19V9m14 10V9M3 9h18l-3-4H6L3 9Zm5 10v-6h8v6"/>',
  square:'<rect x="4" y="4" width="16" height="16" rx="2"/><circle cx="12" cy="12" r="4"/>',
  lake:'<path d="M3 9c3 0 3-2 6-2s3 2 6 2 3-2 6-2M3 14c3 0 3-2 6-2s3 2 6 2 3-2 6-2M3 19c3 0 3-2 6-2s3 2 6 2 3-2 6-2"/>',
  field:'<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M12 5v14M3 9h3v6H3m18-6h-3v6h3"/><circle cx="12" cy="12" r="2.6"/>',
  school:'<path d="m3 9 9-5 9 5-9 5-9-5Zm4 3v5c4 3 6 3 10 0v-5m4-3v6"/>',
  meal:'<path d="M5 3v7m3-7v7m3-7v7M5 8c0 4 6 4 6 0m-3 4v9m10-18c-2 1-3 4-3 8h4m0-8v18"/>'
};
const icon=(name)=>'<svg viewBox="0 0 24 24" aria-hidden="true">'+icons[name]+'</svg>';
document.querySelectorAll('[data-icon]').forEach(el=>el.innerHTML=icon(el.dataset.icon));

const photos='https://zbcg.henu.edu.cn/xwtz/5707.chtml';
const library='https://jjc.henu.edu.cn/info/1004/1002.htm';
const photoItems=[
  ['1704854320368001575','图书馆正面'],
  ['1704854320368017370','西门与校园中轴航拍'],
  ['1704854320384040625','校园圆形广场']
];
const viewer='https://www.arcgis.com/apps/mapviewer/index.html?basemapUrl=https%3A%2F%2Fservices.arcgisonline.com%2FArcGIS%2Frest%2Fservices%2FWorld_Imagery%2FMapServer&center=114.30335,34.81805&level=16';
const places=[
  {id:'library',name:'金明校区图书馆',type:'图书馆',note:'西侧中轴',icon:'book',color:'#dbbc80',x:-134,z:-73,y:36,walk:[-251,-72,1.57],desc:'校区标志性建筑之一。由西大门往东，经明德广场可抵达图书馆。',link:[library,'校方建筑介绍'],photo:0,main:true},
  {id:'west',name:'西大门',type:'校门',note:'金明大道',icon:'gate',color:'#c5f276',x:-460,z:-70,y:8,walk:[-457,-70,1.57],desc:'校区西侧入口。沿中轴向东是明德广场和图书馆。模型中的入口为近似定位。',link:[photos,'校方照片来源'],photo:1,main:true},
  {id:'marco',name:'马可广场',type:'广场',note:'校园中部',icon:'square',color:'#d7a9d0',x:16,z:-77,y:8,walk:[17,-68,-1.45],desc:'校园中部的圆形广场，位于图书馆以东、公共教学楼组团以西。',photo:2,main:true},
  {id:'lake',name:'粹庭湖',type:'水景',note:'教学区北侧',icon:'lake',color:'#9bdedb',x:136.3,z:-238.8,y:8,walk:[130,-176,0],desc:'校园东北部的湖泊之一，邻近经管教学楼。可从地面视角转向湖岸观察周边。',main:true},
  {id:'stadium',name:'志义体育场',type:'体育场',note:'校园东侧',icon:'field',color:'#ebb28a',x:426,z:-220,y:8,walk:[390,-219,1.57],desc:'校园东侧的运动地标，设有田径场和足球场。',main:true},
  {id:'cs',name:'计算机与信息工程学院',type:'教学楼',note:'马可广场以北',icon:'school',color:'#a9c5ec',x:-43,z:-212,y:25,walk:[-39,-174,0],desc:'学院所在的建筑组团位于马可广场北面，靠近校园中部道路。'},
  {id:'north',name:'北大门',type:'校门',note:'东京大道',icon:'gate',color:'#c5f276',x:21,z:-601,y:8,walk:[21,-596,3.14],desc:'校区北侧入口，面向东京大道。模型中的入口为近似定位。',main:true},
  {id:'autumn',name:'访秋湖',type:'水景',note:'公共教学楼以南',icon:'lake',color:'#9bdedb',x:91,z:62,y:8,walk:[75,26,3.14],desc:'位于公共教学楼南侧，是校方平面图标注的校园水系之一。',main:true},
  {id:'canteen',name:'北苑餐厅',type:'餐厅',note:'校园东北部',icon:'meal',color:'#e9ce7b',x:340,z:-434,y:12,walk:[326,-401,.35],desc:'校区东北部的餐厅，邻近生命科学学院与北侧教学区。'}
];

const stage=$('#stage'), fallback=$('#fallback'), labelLayer=$('#labels'), search=$('#search'), detail=$('#detail');
const satelliteHost=document.createElement('div');
satelliteHost.id='satellite';
satelliteHost.hidden=true;
stage.after(satelliteHost);
const pinMap=new Map();
let active=null, mode='model', model=null, satellite=null, satelliteLoad=null, campus=null;
let noticeTimer;

function notice(message, duration=4500){
  const box=$('#notice');
  clearTimeout(noticeTimer);
  box.textContent=message;
  box.hidden=false;
  if(duration) noticeTimer=setTimeout(()=>box.hidden=true,duration);
}

function renderPlaces(){
  const query=search.value.trim().toLowerCase();
  const matches=places.filter(p=>(p.name+p.type+p.note+p.id).toLowerCase().includes(query));
  $('#place-count').textContent=matches.length+' 个地点';
  const list=$('#place-list');
  list.replaceChildren();
  for(const p of matches){
    const b=document.createElement('button');
    b.type='button';b.className='place';
    b.style.setProperty('--accent',p.color);
    b.setAttribute('aria-current',String(active?.id===p.id));
    b.innerHTML='<span class="place-icon">'+icon(p.icon)+'</span><span class="rowtext"><b>'+p.name+'</b><small>'+p.type+' · '+p.note+'</small></span><span class="row-arrow">'+icon('chevron')+'</span>';
    b.onclick=()=>select(p);
    list.append(b);
  }
  if(!matches.length)list.innerHTML='<div class="empty">没有找到匹配的地点</div>';
}

function renderDetail(){
  detail.hidden=!active;
  if(!active)return;
  const {name,type,desc,link,photo}=active;
  const walkButton=mode==='walk'?'':'<button class="detail-walk">'+icon('walk')+' 从这里漫游</button>';
  detail.innerHTML='<div class="detail-top"><b>'+type+'</b><button data-close aria-label="关闭地点详情">'+icon('close')+'</button></div><h2>'+name+'</h2><p>'+desc+'</p>'+walkButton+(photo!==undefined?'<button class="detail-walk" data-photo>实拍对照</button>':'')+(link?'<a href="'+link[0]+'" target="_blank" rel="noopener">'+link[1]+' ↗</a>':'');
  detail.querySelector('[data-close]').onclick=()=>{active=null;renderPlaces();renderDetail();};
  detail.querySelector('.detail-walk:not([data-photo])')?.addEventListener('click',()=>setMode('walk'));
  detail.querySelector('[data-photo]')?.addEventListener('click',()=>showPhotos(photo));
}

function gps(x,z){
  const [lat,lon]=campus?.origin??[34.81805,114.30335];
  const origin=lat*Math.PI/180,radius=6378137*Math.cos(origin);
  return [lon+x/radius*180/Math.PI,Math.atan(Math.sinh(Math.asinh(Math.tan(origin))-z/radius))*180/Math.PI];
}

function jumpSatellite(p,zoom){
  if(!satellite)return;
  satellite.setView((p?gps(p.x,p.z):gps(0,45)).reverse(),zoom??(p?18:satelliteHost.clientWidth<540?15:16),{animate:false});
}

function select(p){
  active=p;
  renderPlaces();
  renderDetail();
  if(mode==='walk')model?.enterWalk(...p.walk);
  else if(mode==='satellite')jumpSatellite(p);
  else if(model)model.focus(p.x,p.z);
  else notice('当前设备无法显示三维场景。可切换卫星影像查看该地点。');
}

for(const p of places){
  const pin=document.createElement('button');
  pin.type='button';pin.className='map-pin';pin.hidden=true;
  pin.style.setProperty('--accent',p.color);
  pin.innerHTML='<span></span>'+p.name;
  pin.onclick=()=>select(p);
  labelLayer.append(pin);
  pinMap.set(p.id,pin);
}
function updateLabels(project, bearing, mpp, {w,h}, walking=false){
  const deg=bearing*180/Math.PI;
  $('#north').style.setProperty('--bearing',deg+'deg');
  $('#scale').hidden=walking;
  if(!walking && mpp>0){
    const n=[1,2,5,10,20,50,100,200,500,1000,2000].find(x=>x/mpp>=43)??2000;
    $('#scale-label').textContent=n>=1000?n/1000+' 公里':n+' 米';
    $('#scale').style.setProperty('--scale',Math.min(n/mpp,105)+'px');
  }
  const occupied=[];
  for(const p of [...places].sort((a,b)=>+(b===active)-+(a===active))){
    const pin=pinMap.get(p.id);
    const s=project(p.x,p.y,p.z);
    const width=12+p.name.length*12;
    const space=occupied.every(v=>Math.abs(v.x-s.x)>(v.width+width)/2+5||Math.abs(v.y-s.y)>25);
    const visible=!walking&&(p.main||p===active||mpp<1.6)&&s.visible&&s.x>width/2&&s.x<w-width/2&&s.y>68&&s.y<h-50&&space;
    pin.hidden=!visible;
    if(!visible)continue;
    occupied.push({...s,width});
    pin.style.left=s.x.toFixed(1)+'px';
    pin.style.top=s.y.toFixed(1)+'px';
    pin.classList.toggle('selected',p===active);
  }
}

function displayError(message, link){
  fallback.replaceChildren(document.createTextNode(message));
  if(link){
    const a=document.createElement('a');
    a.href=link;a.target='_blank';a.rel='noopener';a.textContent='在 ArcGIS 查看 ↗';
    fallback.append(document.createElement('br'),a);
  }
  fallback.hidden=false;
}

function loadSatellite(){
  if(satellite)return Promise.resolve(satellite);
  if(satelliteLoad)return satelliteLoad;
  satelliteLoad=new Promise((resolve,reject)=>{
    const L=window.L;
    if(!L){reject(new Error('Satellite library unavailable'));return;}
    const map=L.map(satelliteHost,{zoomControl:false,attributionControl:false,minZoom:12,maxZoom:20});
    map.setView(gps(0,45).reverse(),satelliteHost.clientWidth<540?15:16);
    // Standard XYZ tiles avoid a blocking service-metadata request.
    const hosts=['services.arcgisonline.com','server.arcgisonline.com'];
    let attempt=0,layer,timer,finished=false;
    function start(){
      const current=L.tileLayer(`https://${hosts[attempt]}/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}`,{
        maxZoom:20,maxNativeZoom:19,noWrap:true,crossOrigin:false
      });
      layer=current;
      const retry=()=>{
        if(finished||layer!==current)return;
        clearTimeout(timer);current.off();map.removeLayer(current);
        if(++attempt<hosts.length){start();return;}
        finished=true;map.remove();reject(new Error('Imagery tiles unavailable on both hosts'));
      };
      current.once('tileload',()=>{
        if(finished||layer!==current)return;
        finished=true;clearTimeout(timer);satellite=map;
        map.on('move zoom resize',renderSatelliteLabels);resolve(map);
      });
      // Individual missing tiles are tolerated; retry on a failed viewport.
      current.once('load',()=>{if(!finished)retry();});
      timer=setTimeout(retry,20000);
      current.addTo(map);
    }
    start();
  }).catch(error=>{satelliteLoad=null;throw error;});
  return satelliteLoad;
}

function renderSatelliteLabels(){
  if(mode!=='satellite'||!satellite)return;
  const project=(x,_y,z)=>{
    const p=satellite.latLngToContainerPoint(gps(x,z).reverse());
    return {x:p.x,y:p.y,visible:true};
  };
  const size=satellite.getSize();
  const mpp=satellite.distance(satellite.containerPointToLatLng([0,size.y/2]),
    satellite.containerPointToLatLng([100,size.y/2]))/100;
  updateLabels(project,0,mpp,{w:size.x,h:size.y});
}

async function setMode(next){
  if(next==='walk'&&!model){
    notice('当前浏览器暂时无法进入三维地面漫游。');
    return;
  }
  mode=next;
  document.querySelectorAll('[data-mode]').forEach(b=>{
    b.classList.toggle('active',b.dataset.mode===mode);
    b.setAttribute('aria-pressed',String(b.dataset.mode===mode));
  });
  const [title,note]={
    model:['三维校园',stage.dataset.renderer==='canvas'?'兼容模式 · 基础模型':'精细化模型 · 建筑高度估算'],
    satellite:['卫星影像','Esri World Imagery · 实拍底图'],
    walk:['地面漫游','第一人称 · 模拟街景']
  }[mode];
  $('#mode-label').textContent=title;
  $('#mode-note').textContent=note;
  $('#esri-credit').hidden=mode!=='satellite';
  $('#street-help').hidden=mode!=='walk';
  $('#map-photos').hidden=mode!=='walk';
  $('#notice').hidden=true;
  pinMap.forEach(pin=>pin.hidden=true);
  satelliteHost.hidden=mode!=='satellite';
  stage.hidden=mode==='satellite';
  model?.setVisible(mode!=='satellite');
  fallback.hidden=true;
  renderDetail();
  if(mode==='satellite'){
    model?.exitWalk();
    if(!satellite)displayError('正在加载卫星影像…');
    try{
      await loadSatellite();
      if(mode!=='satellite')return;
      fallback.hidden=true;
      satellite.invalidateSize();
      jumpSatellite(active);
      renderSatelliteLabels();
    }catch{
      if(mode==='satellite')displayError('当前网络未能加载卫星服务。',viewer);
    }
    return;
  }
  if(mode==='walk'){
    model.enterWalk(...(active??places[0]).walk);
    stage.focus({preventScroll:true});
    return;
  }
  if(model){
    model.exitWalk();
    if(active)model.focus(active.x,active.z);
  }else displayError('三维场景需要支持 WebGL 的浏览器。可切换卫星影像。');
}

search.addEventListener('input',renderPlaces);
search.addEventListener('keydown',e=>{
  if(e.key==='Enter')$('#place-list .place')?.click();
  if(e.key==='Escape'){search.value='';renderPlaces();search.blur();}
});
document.addEventListener('keydown',e=>{
  if(e.key==='/'&&!e.ctrlKey&&!e.metaKey&&!e.altKey&&!(e.target instanceof HTMLInputElement)){
    e.preventDefault();search.focus();
  }
});
document.querySelectorAll('[data-mode]').forEach(b=>b.onclick=()=>setMode(b.dataset.mode));
$('#zoom-in').onclick=()=>mode==='satellite'?satellite?.zoomIn():model?.zoom(1);
$('#zoom-out').onclick=()=>mode==='satellite'?satellite?.zoomOut():model?.zoom(-1);
$('#north').onclick=()=>mode==='satellite'?notice('卫星影像采用正北朝上。'):model?.north();
$('#home').onclick=()=>{
  if(mode==='satellite'){active=null;jumpSatellite(null);renderPlaces();renderDetail();return;}
  const wasWalk=mode==='walk';
  active=null;
  renderPlaces();renderDetail();
  if(wasWalk)setMode('model');
  model?.home();
};
$('#walk-forward').onclick=()=>{model?.step(5);stage.focus({preventScroll:true});};
$('#walk-back').onclick=()=>{model?.step(-5);stage.focus({preventScroll:true});};
$('#fullscreen').onclick=async()=>{
  try{
    if(document.fullscreenElement)await document.exitFullscreen();
    else if($('.viewport').requestFullscreen)await $('.viewport').requestFullscreen();
    else notice('当前浏览器不支持网页全屏。');
  }catch{notice('当前浏览器无法进入全屏。');}
};
function setPhoto(index){
  const [id,title]=photoItems[index];
  const image=$('#campus-photo');
  const status=$('#photo-status');
  status.textContent='正在加载校方照片…';
  status.hidden=false;
  image.hidden=true;
  image.onload=()=>{image.hidden=false;status.hidden=true;};
  image.onerror=()=>{image.hidden=true;status.textContent='当前网络无法加载照片，可打开校方来源。';};
  image.alt=title;
  image.src='https://zbcg.henu.edu.cn/uEditorFile/ueditor/upload/image/20240110/'+id+'.jpg';
  $('#photo-title').textContent=title;
  document.querySelectorAll('[data-photo-tab]').forEach((b,i)=>b.setAttribute('aria-pressed',String(i===index)));
}
function showPhotos(index=0){
  $('#photo-dialog').showModal();
  setPhoto(index);
}
$('#map-photos').onclick=()=>showPhotos(active?.photo??0);
$('#close-photos').onclick=()=>$('#photo-dialog').close();
document.querySelectorAll('[data-photo-tab]').forEach((b,i)=>b.onclick=()=>setPhoto(i));
$('#sources').onclick=()=>$('#about').showModal();
$('#close-about').onclick=()=>$('#about').close();
$('#about').addEventListener('click',e=>{if(e.target===e.currentTarget)e.currentTarget.close();});
renderPlaces();

try{
  const response=await fetch('./assets/campus.json');
  if(!response.ok)throw new Error('Campus data missing');
  campus=await response.json();
  model=createModel(stage,campus,(...args)=>{if(mode!=='satellite')updateLabels(...args);});
  model.setVisible(mode!=='satellite');
  if(stage.dataset.renderer==='canvas')$('#mode-note').textContent='兼容模式 · 基础模型';
  requestAnimationFrame(()=>{
    stage.dataset.modelStats=JSON.stringify(model.getDiagnostics());
    stage.dataset.ready='true';
  });
  if(mode==='model')fallback.hidden=true;
}catch(error){
  console.warn('Campus model failed',error);
  if(mode==='model')displayError('三维场景无法启动。可切换卫星影像，或在支持 WebGL 的浏览器中重试。');
}
