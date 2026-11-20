import { createModel } from './model.js';
import { fieldViews, mountFieldViews, walks } from './field-views.js';
import { imageryLayer, addCampusBasemap } from './satellite.js';

const $=selector=>document.querySelector(selector);
const icons={
  camera:'<path d="M3 7h4l2-3h6l2 3h4v13H3Z"/><circle cx="12" cy="13" r="4"/>',
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
  {id:'west',name:'西大门',type:'校门',note:'金明大道',icon:'gate',color:'#c5f276',x:-459,z:-76,y:4,walk:[-485,-76,Math.PI/2],desc:'校名石墙朝西，两侧是入校通道。面向金字往东看，后方是明德广场和图书馆。',link:['https://ganbu.henu.edu.cn/info/1036/4225.htm','校方校门照片'],photo:1,main:true},
  {id:'marco',name:'马可广场',type:'广场',note:'校园中部',icon:'square',color:'#d7a9d0',x:16,z:-77,y:8,walk:[17,-68,-1.45],desc:'校园中部的圆形广场，位于图书馆以东、公共教学楼组团以西。',photo:2,main:true},
  {id:'lake',name:'粹庭湖',type:'水景',note:'教学区北侧',icon:'lake',color:'#9bdedb',x:136.3,z:-238.8,y:8,walk:[130,-176,0],desc:'校园东北部的湖泊之一，邻近经管教学楼。可从地面视角转向湖岸观察周边。',main:true},
  {id:'stadium',name:'志义体育场',type:'体育场',note:'校园东侧 · 中州路',icon:'field',color:'#ebb28a',x:426,z:-220,y:8,walk:[318.7,-203,1.484,.076],desc:'西看台面向中州路，宽大的桁架顶棚和黑底红字馆名标出了主入口。',main:true},
  {id:'cs',name:'计算机与信息工程学院',type:'教学楼',note:'文甫路 · 马可广场以北',icon:'school',color:'#a9c5ec',x:-24,z:-196,y:21,walk:[10,-158,-.43,.19],desc:'文甫路一侧的入口在南翼东端，抬头可见竖排院名。沿外墙向西绕到雪垠路，可以看见长条玻璃和设备格栅。'},
  {id:'north',name:'北大门',type:'校门',note:'东京大道',icon:'gate',color:'#c5f276',x:21,z:-601,y:8,walk:[21,-596,3.14],desc:'校区北侧入口，面向东京大道。模型中的入口为近似定位。',main:true},
  {id:'autumn',name:'访秋湖',type:'水景',note:'公共教学楼以南',icon:'lake',color:'#9bdedb',x:91,z:62,y:8,walk:[75,26,3.14],desc:'位于公共教学楼南侧，是校方平面图标注的校园水系之一。',main:true},
  {id:'canteen',name:'北苑餐厅',type:'餐厅',note:'校园东北部',icon:'meal',color:'#e9ce7b',x:340,z:-434,y:12,walk:[326,-401,.35],desc:'校区东北部的餐厅，邻近生命科学学院与北侧教学区。'},
  {id:'hall',name:'计算机大楼报告厅',type:'报告厅',note:'文甫路 · 两栋教学楼之间',icon:'school',color:'#d6ad89',x:19.2,z:-207,y:12.5,walk:[19.2,-178.5,0,.10],desc:'从文甫路朝北看，暖色墙面和三组高窗连接两侧白色教学楼。中央通道可步行穿过。'},
  {id:'software',name:'软件学院',type:'教学楼',note:'文甫路 · 报告厅以东',icon:'school',color:'#c6a78d',x:62,z:-197,y:21,walk:[48.3,-179.3,-.66,.21],desc:'门厅在南翼西端。文甫路边可以看见独立的红字院牌，沿雪垠路可看东北侧的窗带和设备格栅。'},
  {id:'physics',name:'物理实验楼（物理与电子学院 C 座）',type:'实验楼',note:'普通物理分中心 · 锥形报告厅旁',icon:'school',color:'#b57961',x:-112,z:222,y:21,walk:[-111.2,250.8,.07,.24],desc:'院内的红砖楼和锥形报告厅由低楼相连。绕到南侧看玻璃门厅，或沿院边到另一侧看砖墙和顶层敞廊。'},
  {id:'teaching',name:'公共教学楼（综合教学楼）',type:'教学楼',note:'马可广场以东 · 4号教学楼一侧',icon:'school',color:'#b48e7c',x:122,z:-76,y:18,walk:[-63.8,-99,1.70,.03],desc:'广场一侧是两端红墙夹着的玻璃正面。绕到东侧，红砖楼梯塔的大开口和白色架空走廊都可以看到。'},
  {id:'east',name:'东大门',type:'校门',note:'东门 · 夷山大街',icon:'gate',color:'#c5ab90',x:483,z:-77,y:5,walk:[509.5,-77.9,4.684,-.012],desc:'从夷山大街向西进入校园。砖墙上的圆洞、小门岗和中间的通道对应 2022 年的街景。'},
  {id:'pharmacy',name:'药学院',type:'教学楼',note:'南侧院前广场',icon:'school',color:'#dbcb98',x:-142,z:-503,y:23,walk:[-166.2,-450.3,.026,.050],desc:'从带菱形石雕的花坛向北看，竖排院名在左，玻璃门厅和教学楼长翼依次向右展开。'},
  {id:'civil',name:'土建学院（建筑工程学院）',type:'教学楼',note:'红砖双翼与圆廊',aliases:'土木建筑',icon:'school',color:'#c28a75',x:-138.7,z:280.6,y:16,walk:[-118.6,286.5,4.916,-.062],desc:'两栋红砖翼楼夹着白柱支起的圆廊。从圆廊下穿过，或后退几步看上层连桥。'},
  {id:'zeng',name:'曾宪梓楼',type:'校园建筑',note:'研究生宿舍路口以北',icon:'school',color:'#d7a48b',x:-314,z:370,y:23,walk:[-358.2,419.9,6.244,.131],desc:'临广场的白色立面间隔布置橙红墙板和灰色窗带，底层局部架空。对照点可原地转身看 17 号宿舍。'},
  {id:'dorm17',name:'17号研究生宿舍（学十七公寓）',type:'宿舍',note:'弯道路口西侧',aliases:'研究生公寓 十七号 17号楼',icon:'school',color:'#ced1b9',x:-414,z:419,y:20,walk:[-358.2,419.9,4.433,.140],desc:'从路口向西看，白色端墙的开口集中在几道竖列中；阳台的栏杆与侧面窗带做了区分。'},
  {id:'clinic',name:'河大校医院',type:'校医院',note:'河南大学医院 · 西侧入口',icon:'pin',color:'#94b6ca',x:-449,z:604,y:18,walk:[-469.3,600.5,1.839,.045],desc:'西侧入口上有折面玻璃雨棚和连廊，左侧的蓝色玻璃上保留了街景中的竖排院名。'},
  {id:'jiaoyuan',name:'教苑餐厅',type:'餐厅',note:'西侧入口 · 老街景民族餐厅招牌',aliases:'教苑食堂 民族食堂',icon:'pin',color:'#cf9273',x:-248,z:431,y:11,walk:[-283.5,444.9,1.204,.157],desc:'三层橙红色窗下墙随着转角折过去，短墙上是蓝色餐厅门牌。绕到南面，底层大窗带金属竖栅。'},
  {id:'beiyuan',name:'北苑餐厅',type:'餐厅',note:'中州路 · 室外楼梯与门廊',aliases:'北苑食堂',icon:'pin',color:'#d6c4a6',x:338,z:-430,y:11,walk:[306,-396.1,.698,.122],desc:'街景里的北苑餐厅朝向一个开阔前场。左侧外梯升到平台，中段有细柱门廊，东端是一排独立小窗。'},
  {id:'education',name:'田家炳教育书院',type:'书院',note:'东西两院 · 钟塔与连廊',aliases:'教育科学学院 教育学院 钟楼',icon:'school',color:'#bf8975',x:229,z:-293,y:36,walk:[211.2,-302.7,1.745,.192],desc:'从西院仰看红砖钟塔，再走到廊下看顶板的圆形开口。在东院回望，可看见两翼之间的整段架空空间。'},
  {id:'geography',name:'地理楼',type:'教学楼',note:'原地图标注：地理科学学院',aliases:'环境与规划学院 地理与环境学院',icon:'school',color:'#bc8c78',x:-70,z:321,y:16,walk:[-81.5,363.7,.262,.175],desc:'红砖楼的南面有弧形玻璃、白色挑台和林带；北侧小路靠墙更近，可看清成对的窗和浅色短饰条。'}
];

const stage=$('#stage'), fallback=$('#fallback'), labelLayer=$('#labels'), search=$('#search'), detail=$('#detail');
const satelliteHost=document.createElement('div');
satelliteHost.id='satellite';
satelliteHost.hidden=true;
stage.after(satelliteHost);
const pinMap=new Map();
let active=null, activeView=null, mode='model', model=null, satellite=null, satelliteTiles=null, campus=null;
let imageryFrame=0;
let noticeTimer;

function notice(message, duration=4500){
  const box=$('#notice');
  clearTimeout(noticeTimer);
  box.textContent=message;
  box.hidden=false;
  if(duration) noticeTimer=setTimeout(()=>box.hidden=true,duration);
}

const placeMatches=(p,query)=>(p.name+p.type+p.note+p.id+(p.aliases??'')).replace(/\s/g,'').toLowerCase().includes(query.replace(/\s/g,''));
function renderPlaces(){
  const query=search.value.trim().toLowerCase();
  const matches=places.filter(p=>placeMatches(p,query));
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
  detail.hidden=!active||mode==='walk';
  if(detail.hidden)return;
  const {name,type,desc,link,photo}=active;
  const walkButton=mode==='walk'?'':'<button class="detail-walk">'+icon('walk')+' 从这里漫游</button>';
  detail.innerHTML='<div class="detail-top"><b>'+type+'</b><button data-close aria-label="关闭地点详情">'+icon('close')+'</button></div><h2>'+name+'</h2><p>'+desc+'</p>'+walkButton+(photo!==undefined?'<button class="detail-walk" data-photo>实拍对照</button>':'')+(link?'<a href="'+link[0]+'" target="_blank" rel="noopener">'+link[1]+' ↗</a>':'');
  detail.querySelector('[data-close]').onclick=()=>{active=null;renderPlaces();renderDetail();};
  detail.querySelector('.detail-walk:not([data-photo])')?.addEventListener('click',()=>setMode('walk'));
  detail.querySelector('[data-photo]')?.addEventListener('click',()=>showPhotos(photo));
  if(fieldViews.some(v=>v.place===active.id)){const b=document.createElement('button');b.type='button';b.className='detail-walk';b.dataset.fieldReference='';b.textContent='街景对照';b.onclick=()=>openViews(active.id);detail.append(b);}
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

function markView(item){
  activeView=item;
  const route=walks.find(r=>r.stops.includes(item)),i=route?route.stops.indexOf(item):-1;
  $('#walk-route').hidden=i<0;
  if(i>=0){
    $('#route-position').textContent=route.label+' '+(i+1)+' / '+route.stops.length;
    $('#route-prev').disabled=i===0;$('#route-next').disabled=i===route.stops.length-1;
  }
  const url=new URL(location.href),current=url.searchParams.get('view');
  if((item?.id??null)===current)return;
  if(item)url.searchParams.set('view',item.id);else url.searchParams.delete('view');
  history.replaceState(null,'',url);
}
function select(p){
  active=p;markView(null);
  renderPlaces();
  renderDetail();
  if(mode==='walk'){model?.enterWalk(...p.walk);$('#mode-note').textContent=p.name;}
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

const imageryStatus=$('#imagery-status'), imageryMessage=$('#imagery-message');
$('#imagery-external').href=viewer;
$('#imagery-retry').onclick=()=>{satelliteTiles?.redraw();scheduleImageryStatus();};

function scheduleImageryStatus(){
  if(mode!=='satellite'||imageryFrame)return;
  imageryFrame=requestAnimationFrame(()=>{
    imageryFrame=0;
    if(mode!=='satellite'||!satellite)return;
    const view=satelliteHost.getBoundingClientRect();
    const zoom=String(Math.min(satellite.getZoom(),19));
    const tiles=[...satelliteHost.querySelectorAll('img[data-imagery]')].filter(tile=>{
      if(tile.dataset.zoom!==zoom)return false;
      const r=tile.getBoundingClientRect();
      return r.right>view.left+.5&&r.left<view.right-.5&&r.bottom>view.top+.5&&r.top<view.bottom-.5;
    });
    const ready=tiles.filter(tile=>tile.dataset.imagery==='ready').length;
    const loading=!tiles.length||tiles.some(tile=>tile.dataset.imagery==='pending');
    const failed=tiles.some(tile=>tile.dataset.imagery==='failed');
    imageryStatus.dataset.state=loading?'loading':failed?(ready?'partial':'unavailable'):'ready';
    imageryStatus.hidden=!loading&&!failed;
    $('#imagery-actions').hidden=loading||!failed;
    $('#mode-label').textContent=ready||!campus?'卫星影像':'校园平面图';
    $('#mode-note').textContent=ready?'Esri World Imagery · 实拍底图':campus?'校园轮廓 · 示意底图':'Esri World Imagery';
    const message=loading?'正在加载卫星影像…':failed?(ready?'部分卫星影像未能加载。':campus?'卫星影像暂时无法加载，已显示校园示意图。':'卫星影像暂时无法加载。'):'';
    if(imageryMessage.textContent!==message)imageryMessage.textContent=message;
  });
}

function loadSatellite(){
  if(satellite)return;
  const L=window.L;
  if(!L)throw new Error('Satellite library unavailable');
  satellite=L.map(satelliteHost,{zoomControl:false,attributionControl:false,zoomAnimation:false,minZoom:12,maxZoom:20});
  satellite.on('move zoom resize',renderSatelliteLabels);
  satellite.on('moveend zoomend resize',scheduleImageryStatus);
  if(campus)addCampusBasemap(L,satellite,campus,(x,z)=>gps(x,z).reverse());
  satelliteTiles=imageryLayer(L);
  satelliteTiles.on('loading load tileload tileerror',scheduleImageryStatus);
  satelliteTiles.addTo(satellite);
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

function setMode(next,walkPose,item=null){
  if(next==='walk'&&!model){
    notice('当前浏览器暂时无法进入三维地面漫游。');
    return;
  }
  mode=next;markView(item);
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
  $('.orbit-help').hidden=mode==='walk';
  $('.orbit-help').textContent=mode==='satellite'?'拖动平移 · 滚轮缩放':'拖动旋转 · 右键平移 · 滚轮缩放';
  stage.setAttribute('aria-label',mode==='walk'?'校园地面漫游。拖动环顾，点前进或后退移动；也可用 W A S D 或方向键移动。':'三维校园，拖动旋转，双指或滚轮缩放。');
  $('#street-help').hidden=mode!=='walk';
  $('#map-photos').hidden=mode!=='walk';
  $('#notice').hidden=true;
  pinMap.forEach(pin=>pin.hidden=true);
  satelliteHost.hidden=mode!=='satellite';
  stage.hidden=mode==='satellite';
  model?.setVisible(mode!=='satellite');
  fallback.hidden=true;
  imageryStatus.hidden=true;
  renderDetail();
  if(mode==='satellite'){
    model?.exitWalk();
    try{
      loadSatellite();
      satellite.invalidateSize();
      jumpSatellite(active);
      renderSatelliteLabels();
      scheduleImageryStatus();
    }catch{
      if(mode==='satellite')displayError('当前网络未能加载卫星服务。',viewer);
    }
    return;
  }
  if(mode==='walk'){
    model.enterWalk(...(walkPose??(active??places[0]).walk));
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
function visitView(item){
  if(!model){notice('三维场景暂未就绪，可以先打开实拍。');return;}
  active=places.find(p=>p.id===item.place)??null;
  if(!active||!placeMatches(active,search.value.trim().toLowerCase()))search.value='';
  renderPlaces();
  const [x,z,bearing,pitch]=item.camera;
  setMode('walk',[x,z,bearing*Math.PI/180,pitch*Math.PI/180,78],item);
  $('#mode-note').textContent=item.title;
}
const openViews=mountFieldViews($('#field-dialog'),visitView);
for(const [id,delta] of [['route-prev',-1],['route-next',1]])$('#'+id).onclick=()=>{
  const route=walks.find(r=>r.stops.includes(activeView));if(!route)return;
  const item=route.stops[route.stops.indexOf(activeView)+delta];if(item)visitView(item);
};
$('#field-views').onclick=()=>openViews(active?.id,activeView?.id);
$('#map-photos').onclick=()=>!activeView&&active?.photo!==undefined?showPhotos(active.photo):openViews(active?.id,activeView?.id);
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
  if(satellite)addCampusBasemap(window.L,satellite,campus,(x,z)=>gps(x,z).reverse());
  model=createModel(stage,campus,(...args)=>{if(mode!=='satellite')updateLabels(...args);});
  const requested=fieldViews.find(v=>v.id===new URLSearchParams(location.search).get('view'));
  if(requested)visitView(requested);
  model.setVisible(mode!=='satellite');
  if(!requested&&mode==='model'&&stage.dataset.renderer==='canvas')$('#mode-note').textContent='兼容模式 · 基础模型';
  requestAnimationFrame(()=>{
    stage.dataset.modelStats=JSON.stringify(model.getDiagnostics());
    stage.dataset.ready='true';
  });
  if(mode==='model')fallback.hidden=true;
}catch(error){
  console.warn('Campus model failed',error);
  if(mode==='model')displayError('三维场景无法启动。可切换卫星影像，或在支持 WebGL 的浏览器中重试。');
}
