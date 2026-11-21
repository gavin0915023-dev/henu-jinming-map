import { createModel } from './model.js';
import { fieldViews, mountFieldViews, walks } from './field-views.js';
import { imageryLayer, addCampusBasemap } from './satellite.js';
import { cuitingCenter } from './campus-commons.js';
import { createCampusRouter } from './routing.js';
import { createMinimap } from './minimap.js';
import { tours, createTourController, DWELL } from './tour.js';

const $ = selector => document.querySelector(selector);
const icons = {
  camera: '<path d="M3 7h4l2-3h6l2 3h4v13H3Z"/><circle cx="12" cy="13" r="4"/>',
  brand: '<path d="m3 8 9-5 9 5-9 5-9-5Zm0 4 9 5 9-5M3 16l9 5 9-5"/>',
  pin: '<path d="M19 10c0 5-7 10-7 10s-7-5-7-10a7 7 0 1 1 14 0Z"/><circle cx="12" cy="10" r="2.3"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5m0-8h.01"/>',
  search: '<circle cx="10.5" cy="10.5" r="6"/><path d="m15 15 4 4"/>',
  compass: '<circle cx="12" cy="12" r="9"/><path d="m15.5 8.5-2 5-5 2 2-5 5-2Z"/>',
  north: '<path d="m12 3 5 15-5-3-5 3 5-15Z" fill="currentColor"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  minus: '<path d="M5 12h14"/>',
  target: '<circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/><path d="M12 2v4m0 12v4M2 12h4m12 0h4"/>',
  expand: '<path d="M9 4H4v5m11-5h5v5M4 15v5h5m11-5v5h-5"/>',
  cube: '<path d="m12 3 8 4.5v9L12 21l-8-4.5v-9L12 3Zm-8 4.5 8 4.5 8-4.5M12 12v9"/>',
  satellite: '<path d="m8 8 8 8m-7-3-4 4-2-2 4-4m4-4 4-4 2 2-4 4M9 5l10 10-4 4L5 9l4-4Zm7 12 2 2m-3 1c2 1 4 1 6 0"/>',
  walk: '<circle cx="13" cy="4" r="2"/><path d="m7 21 3-6 1-5-3 2-1 3m4-5 3 4 4 1m-7 0 4 3 1 3"/>',
  close: '<path d="m6 6 12 12M18 6 6 18"/>',
  chevron: '<path d="m9 6 6 6-6 6"/>',
  book: '<path d="M12 6c-3-2-6-2-9-1v13c3-1 6-1 9 1 3-2 6-2 9-1V5c-3-1-6-1-9 1Zm0 0v13"/>',
  gate: '<path d="M3 19h18M5 19V9m14 10V9M3 9h18l-3-4H6L3 9Zm5 10v-6h8v6"/>',
  square: '<rect x="4" y="4" width="16" height="16" rx="2"/><circle cx="12" cy="12" r="4"/>',
  lake: '<path d="M3 9c3 0 3-2 6-2s3 2 6 2 3-2 6-2M3 14c3 0 3-2 6-2s3 2 6 2 3-2 6-2M3 19c3 0 3-2 6-2s3 2 6 2 3-2 6-2"/>',
  field: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M12 5v14M3 9h3v6H3m18-6h-3v6h3"/><circle cx="12" cy="12" r="2.6"/>',
  school: '<path d="m3 9 9-5 9 5-9 5-9-5Zm4 3v5c4 3 6 3 10 0v-5m4-3v6"/>',
  meal: '<path d="M5 3v7m3-7v7m3-7v7M5 8c0 4 6 4 6 0m-3 4v9m10-18c-2 1-3 4-3 8h4m0-8v18"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M2 12h2m16 0h2M4.9 19.1l1.4-1.4m11.4-11.4 1.4-1.4"/>',
  share: '<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.6 13.5 6.8 4m0-11-6.8 4"/>',
  route: '<circle cx="6" cy="18" r="2.5"/><circle cx="18" cy="6" r="2.5"/><path d="M8.5 18H13a3 3 0 0 0 0-6h-2a3 3 0 0 1 0-6h4.5"/>',
  swap: '<path d="M7 10h14l-4-4m0 12H3l4 4"/>',
  road: '<path d="M6 20 10 4m8 16L14 4m-2 3v3m0 4v3"/>',
  play: '<circle cx="12" cy="12" r="9"/><path d="m10 8.5 5.5 3.5-5.5 3.5Z" fill="currentColor"/>'
};
const icon = name => '<svg viewBox="0 0 24 24" aria-hidden="true">' + icons[name] + '</svg>';
document.querySelectorAll('[data-icon]').forEach(el => el.innerHTML = icon(el.dataset.icon));

const library = 'https://jjc.henu.edu.cn/info/1004/1002.htm';
const photoItems = [
  ['1704854320368001575', '图书馆正面'],
  ['1704854320368017370', '西门与校园中轴航拍'],
  ['1704854320384040625', '马可广场 · 校方俯拍']
];
const viewer = 'https://www.arcgis.com/apps/mapviewer/index.html?basemapUrl=https%3A%2F%2Fservices.arcgisonline.com%2FArcGIS%2Frest%2Fservices%2FWorld_Imagery%2FMapServer&center=114.30335,34.81805&level=16';

const places = [
  { id: 'library', osmId: 'plan-library', category: 'academic', featured: true, name: '金明校区图书馆', type: '图书馆', note: '西侧中轴', icon: 'book', color: '#dbbc80', x: -134, z: -73, y: 36, walk: [-251, -72, 1.57], desc: '校区标志性建筑之一。由西大门往东，经明德广场可抵达图书馆。', link: [library, '校方建筑介绍'], photo: 0, main: true },
  { id: 'west', category: 'outdoor', featured: true, name: '西大门', type: '校门', note: '金明大道', icon: 'gate', color: '#c5f276', x: -459, z: -76, y: 4, walk: [-485, -76, Math.PI / 2], desc: '校名石墙朝西，两侧是入校通道。面向金字往东看，后方是明德广场和图书馆。', link: ['https://ganbu.henu.edu.cn/info/1036/4225.htm', '校方校门照片'], photo: 1, main: true },
  { id: 'marco', category: 'outdoor', featured: true, name: '马可广场', type: '广场', note: '图书馆东侧 · 下沉式圆形广场', icon: 'square', color: '#d7a9d0', x: 19.15, z: -76.5, y: 3, walk: [69.2, -76.5, Math.PI * 1.5, -.09], desc: '从东侧沿台阶下到广场中央，脚下是深浅相间的同心石环。回到上面俯看，还能看见台阶如何把弧形草台分成几段。', photo: 2, main: true },
  { id: 'lake', category: 'outdoor', featured: true, name: '粹庭湖', type: '水景', note: '经济学院以北 · 雪垠路东侧', icon: 'lake', color: '#9bdedb', ...cuitingCenter, y: 5, walk: [83.7, -446.3, 1.484, .070], desc: '校方平面图将粹庭湖标在经济学院以北。沿西端小径向东看，垂枝伸到岸边，浅色岸沿随水面转弯。', link: ['https://www.henu.edu.cn/images/jmxq.jpg', '校方平面图'], main: true },
  { id: 'stadium', osmId: '712688893', category: 'outdoor', featured: true, name: '志义体育场', type: '体育场', note: '校园东侧 · 中州路', icon: 'field', color: '#ebb28a', x: 426, z: -220, y: 8, walk: [318.7, -203, 1.484, .076], desc: '西看台面向中州路，宽大的桁架顶棚和黑底红字馆名标出了主入口。', main: true },
  { id: 'cs', osmId: '712688906', category: 'academic', featured: true, name: '计算机与信息工程学院', type: '教学楼', note: '文甫路 · 马可广场以北', icon: 'school', color: '#a9c5ec', x: -24, z: -196, y: 21, walk: [10, -158, -.43, .19], desc: '文甫路一侧的入口在南翼东端，抬头可见竖排院名。沿外墙向西绕到雪垠路，可以看见长条玻璃和设备格栅。' },
  { id: 'north', category: 'outdoor', featured: true, name: '北大门', type: '校门', note: '东京大道 · 校名石墙', icon: 'gate', color: '#c5f276', x: 19.3, z: -600.8, y: 4, walk: [11.9, -633.5, 2.915, .052], desc: '从东京大道朝校园看，低石墙上的金字面向街道。石墙两侧都可进入，走进去回望能看到墙后的绿篱。', link: ['https://ganbu.henu.edu.cn/info/1036/4225.htm', '校方校门照片'], main: true },
  { id: 'autumn', category: 'outdoor', featured: true, name: '访秋湖', type: '水景', note: '公共教学楼以南', icon: 'lake', color: '#9bdedb', x: 91, z: 62, y: 8, walk: [75, 26, 3.14], desc: '位于公共教学楼南侧，是校方平面图标注的校园水系之一。', main: true },
  { id: 'hall', osmId: '712688908', category: 'academic', featured: true, name: '计算机大楼报告厅', type: '报告厅', note: '文甫路 · 两栋教学楼之间', icon: 'school', color: '#d6ad89', x: 19.2, z: -207, y: 12.5, walk: [19.2, -178.5, 0, .10], desc: '从文甫路朝北看，暖色墙面和三组高窗连接两侧白色教学楼。中央通道可步行穿过。' },
  { id: 'software', osmId: '712688905', category: 'academic', featured: true, name: '软件学院', type: '教学楼', note: '文甫路 · 报告厅以东', icon: 'school', color: '#c6a78d', x: 62, z: -197, y: 21, walk: [48.3, -179.3, -.66, .21], desc: '门厅在南翼西端。文甫路边可以看见独立的红字院牌，沿雪垠路可看东北侧的窗带和设备格栅。' },
  { id: 'physics', osmId: '712688931', category: 'academic', featured: true, name: '物理实验楼（物理与电子学院 C 座）', type: '实验楼', note: '普通物理分中心 · 锥形报告厅旁', icon: 'school', color: '#b57961', x: -112, z: 222, y: 21, walk: [-111.2, 250.8, .07, .24], desc: '院内的红砖楼和锥形报告厅由低楼相连。绕到南侧看玻璃门厅，或沿院边到另一侧看砖墙和顶层敞廊。' },
  { id: 'teaching', osmId: '712688928', category: 'academic', featured: true, name: '公共教学楼（综合教学楼）', type: '教学楼', note: '马可广场以东 · 4号教学楼一侧', icon: 'school', color: '#b48e7c', x: 122, z: -76, y: 18, walk: [-63.8, -99, 1.70, .03], desc: '广场一侧是两端红墙夹着的玻璃正面。绕到东侧，红砖楼梯塔的大开口和白色架空走廊都可以看到。' },
  { id: 'east', category: 'outdoor', featured: true, name: '东大门', type: '校门', note: '东门 · 夷山大街', icon: 'gate', color: '#c5ab90', x: 483, z: -77, y: 5, walk: [509.5, -77.9, 4.684, -.012], desc: '从夷山大街向西进入校园。砖墙上的圆洞、小门岗和中间的通道对应 2022 年的街景。' },
  { id: 'pharmacy', osmId: '716761664', category: 'academic', featured: true, name: '药学院', type: '教学楼', note: '南侧院前广场', icon: 'school', color: '#dbcb98', x: -142, z: -503, y: 23, walk: [-166.2, -450.3, .026, .050], desc: '从带菱形石雕的花坛向北看，竖排院名在左，玻璃门厅和教学楼长翼依次向右展开。' },
  { id: 'civil', osmId: '712688937', osmIds: ['712688937', '712688938', '712688939'], category: 'academic', featured: true, name: '土建学院（建筑工程学院）', type: '教学楼', note: '红砖双翼与圆廊', aliases: '土木建筑', icon: 'school', color: '#c28a75', x: -138.7, z: 280.6, y: 16, walk: [-118.6, 286.5, 4.916, -.062], desc: '两栋红砖翼楼夹着白柱支起的圆廊。从圆廊下穿过，或后退几步看上层连桥。' },
  { id: 'zeng', osmId: '712688948', category: 'academic', featured: true, name: '曾宪梓楼', type: '校园建筑', note: '研究生宿舍路口以北', icon: 'school', color: '#d7a48b', x: -314, z: 370, y: 23, walk: [-358.2, 419.9, 6.244, .131], desc: '临广场的白色立面间隔布置橙红墙板和灰色窗带，底层局部架空。对照点可原地转身看 17 号宿舍。' },
  { id: 'dorm17', osmId: '712688830', category: 'dorm', featured: true, name: '17号研究生宿舍（学十七公寓）', type: '宿舍', note: '弯道路口西侧', aliases: '研究生公寓 十七号 17号楼', icon: 'school', color: '#ced1b9', x: -414, z: 419, y: 20, walk: [-358.2, 419.9, 4.433, .140], desc: '从路口向西看，白色端墙的开口集中在几道竖列中；阳台的栏杆与侧面窗带做了区分。' },
  { id: 'clinic', osmId: '716822582', category: 'life', featured: true, name: '河大校医院', type: '校医院', note: '河南大学医院 · 西侧入口', icon: 'pin', color: '#94b6ca', x: -449, z: 604, y: 18, walk: [-469.3, 600.5, 1.839, .045], desc: '西侧入口上有折面玻璃雨棚和连廊，左侧的蓝色玻璃上保留了街景中的竖排院名。' },
  { id: 'jiaoyuan', osmId: '712735066', category: 'life', featured: true, name: '教苑餐厅', type: '餐厅', note: '西侧入口 · 老街景民族餐厅招牌', aliases: '教苑食堂 民族食堂', icon: 'pin', color: '#cf9273', x: -248, z: 431, y: 11, walk: [-283.5, 444.9, 1.204, .157], desc: '三层橙红色窗下墙随着转角折过去，短墙上是蓝色餐厅门牌。绕到南面，底层大窗带金属竖栅。' },
  { id: 'beiyuan', osmId: '716761648', category: 'life', featured: true, name: '北苑餐厅', type: '餐厅', note: '中州路 · 室外楼梯与门廊', aliases: '北苑食堂 canteen', icon: 'meal', color: '#d6c4a6', x: 338, z: -430, y: 11, walk: [306, -396.1, .698, .122], desc: '街景里的北苑餐厅朝向一个开阔前场。左侧外梯升到平台，中段有细柱门廊，东端是一排独立小窗。' },
  { id: 'campus-bridge', category: 'outdoor', featured: true, name: '九章路石桥', type: '桥梁', note: '教学区 · 镂空石栏', aliases: '九章路桥 教学区石桥', icon: 'pin', color: '#d1cbb9', x: 137, z: -229.7, y: 5, walk: [113.6, -229.4, .663, 0], desc: '从桥头向东北看，两侧的石柱和镂空栏板沿桥面排开。粹庭湖在更北面，是另一处水面。' },
  { id: 'office', osmId: '713118048', category: 'life', featured: true, name: '办公楼', type: '办公楼', note: '明德广场以南 · 弧形外廊', icon: 'school', color: '#c8c4b0', x: -359, z: 35.5, y: 22, walk: [-360.4, 81.6, 0, .227], desc: '南面的玻璃雨棚伸到台阶上方，沿曲面绕到北侧后，外廊栏杆和分段挑板比窗更靠近行人。' },
  { id: 'east-courts', category: 'outdoor', featured: true, name: '东南网球场与篮球场', type: '运动场', note: '南运动区 · 高网与矮栏', aliases: '网球场 篮球场 南操场', icon: 'field', color: '#b7c8ad', x: 163, z: 330, y: 4, walk: [111.4, 292, 1.658, .052], desc: '网球场有高网、双头场灯和蓝灰色球区；往南再向东，灰色篮球场的蓝色球架靠近路边，矮围栏在入口断开。' },
  { id: 'nanyuan', osmId: '712735064', category: 'life', featured: true, name: '南苑餐厅', type: '餐厅', note: '南生活区 · 弧形餐厅', aliases: '南苑食堂', icon: 'meal', color: '#cab392', x: -264, z: 597.5, y: 15, walk: [-203.5, 595, 4.678, .157], desc: '从东侧前场看，金色餐厅名落在内收的长廊前。绕到南面是弧形白檐、方柱和通透的屋顶钢架。' },
  { id: 'education', osmId: '712688907', osmIds: ['712688907', '712688911', '712688913'], category: 'academic', featured: true, name: '田家炳教育书院', type: '书院', note: '东西两院 · 钟塔与连廊', aliases: '教育科学学院 教育学院 钟楼', icon: 'school', color: '#bf8975', x: 229, z: -293, y: 36, walk: [211.2, -302.7, 1.745, .192], desc: '从西院仰看红砖钟塔，再走到廊下看顶板的圆形开口。在东院回望，可看见两翼之间的整段架空空间。' },
  { id: 'geography', osmId: '712688940', category: 'academic', featured: true, name: '地理楼', type: '教学楼', note: '原地图标注：地理科学学院', aliases: '环境与规划学院 地理与环境学院', icon: 'school', color: '#bc8c78', x: -70, z: 321, y: 16, walk: [-81.5, 363.7, .262, .175], desc: '红砖楼的南面有弧形玻璃、白色挑台和林带；北侧小路靠墙更近，可看清成对的窗和浅色短饰条。' }
];

let allPlaces = [...places];
let activeCategory = 'featured';
const osmPlaceMap = new Map();
for (const p of places) {
  if (p.osmId) osmPlaceMap.set(p.osmId, p);
  if (p.osmIds) for (const id of p.osmIds) osmPlaceMap.set(id, p);
}

const stage = $('#stage'), fallback = $('#fallback'), labelLayer = $('#labels'), search = $('#search'), detail = $('#detail');
const viewportEl = $('.viewport');
const satelliteHost = document.createElement('div');
satelliteHost.id = 'satellite';
satelliteHost.hidden = true;
stage.after(satelliteHost);

const pinMap = new Map();
let active = null, activeView = null, mode = 'model', model = null, satellite = null, satelliteTiles = null, campus = null;
let router = null, minimap = null, activeRoute = null, satelliteRouteLine = null, satelliteMoved = false;
let currentLighting = 'noon', imageryFrame = 0, noticeTimer;
let tourCtl = null, tourDriving = false, tourPrevLighting = null, resetJoystick = null;

function notice(message, duration = 4500) {
  const box = $('#notice');
  clearTimeout(noticeTimer);
  box.textContent = message;
  box.hidden = false;
  if (duration) noticeTimer = setTimeout(() => box.hidden = true, duration);
}

function classifyBuilding(name, rawType) {
  if (/餐厅|食堂/.test(name)) return { type: '餐厅', category: 'life', icon: 'meal', color: '#cf9b76' };
  if (/公寓|宿舍/.test(name)) return { type: '宿舍', category: 'dorm', icon: 'school', color: '#c6cab0' };
  if (/浴池|锅炉|培训|医院/.test(name)) return { type: '生活服务', category: 'life', icon: 'pin', color: '#9ab6c2' };
  if (/亭|器材/.test(name)) return { type: '校园设施', category: 'outdoor', icon: 'pin', color: '#a8bfa1' };
  if (rawType === 'dorm') return { type: '宿舍', category: 'dorm', icon: 'school', color: '#c6cab0' };
  return { type: /学院|书院/.test(name) ? '学院楼' : /实验/.test(name) ? '实验楼' : '教学楼', category: 'academic', icon: 'school', color: '#a9b9d4' };
}

function enrichCampusPlaces(data) {
  const seenNames = new Set(places.map(p => p.name));
  const extra = [];
  for (const record of data.building) {
    const [ring, height, rawType, name, id, inside] = record;
    if (!inside || !name || osmPlaceMap.has(id) || seenNames.has(name)) continue;
    seenNames.add(name);
    const xs = ring.map(q => q[0]), zs = ring.map(q => q[1]);
    const cx = Number(((Math.min(...xs) + Math.max(...xs)) / 2).toFixed(1));
    const cz = Number(((Math.min(...zs) + Math.max(...zs)) / 2).toFixed(1));
    const meta = classifyBuilding(name, rawType);
    const item = {
      id: 'b-' + id,
      osmId: id,
      featured: false,
      name,
      type: meta.type,
      category: meta.category,
      note: '校内建筑 · 估高约 ' + Math.round(height) + ' 米',
      icon: meta.icon,
      color: meta.color,
      x: cx,
      z: cz,
      y: Math.max(8, Math.round(height)),
      walk: router.streetPoseFor(cx, cz, ring),
      desc: name + '，位于金明校区内（轮廓估高约 ' + Math.round(height) + ' 米）。点击“步行导航”可规划校内路线。'
    };
    extra.push(item);
    osmPlaceMap.set(id, item);
  }
  // Named campus roads (unique by name, inside or bounding campus)
  const roadGroups = new Map();
  for (const [line, width, name] of data.road) {
    if (!name || !line.length) continue;
    if (!roadGroups.has(name)) roadGroups.set(name, []);
    roadGroups.get(name).push({ line, width });
  }
  for (const [name, segs] of roadGroups) {
    if (seenNames.has(name)) continue;
    const pts = segs.flatMap(s => s.line);
    const mid = pts[Math.floor(pts.length / 2)];
    if (!mid || Math.abs(mid[0]) > 620 || mid[1] < -720 || mid[1] > 860) continue;
    const next = pts[Math.min(pts.length - 1, Math.floor(pts.length / 2) + 1)] ?? mid;
    const yaw = Math.hypot(next[0] - mid[0], next[1] - mid[1]) > 0.2 ? Math.atan2(next[0] - mid[0], -(next[1] - mid[1])) : 0;
    extra.push({
      id: 'road-' + name,
      featured: false,
      name,
      type: '道路',
      category: 'outdoor',
      note: '校园道路',
      icon: 'road',
      color: '#a8b5a2',
      x: Number(mid[0].toFixed(1)),
      z: Number(mid[1].toFixed(1)),
      y: 3,
      walk: [Number(mid[0].toFixed(1)), Number(mid[1].toFixed(1)), Number(yaw.toFixed(3)), 0.04],
      desc: '金明校区道路：' + name + '。可直接进入第一人称地面漫游或设为导航起终点。'
    });
  }
  allPlaces = [...places, ...extra];
  populateRouteSelects();
  renderPlaces();
}

const placeMatches = (p, query) => (p.name + p.type + p.note + p.id + (p.aliases ?? '')).replace(/\s/g, '').toLowerCase().includes(query.replace(/\s/g, ''));

function renderPlaces() {
  const query = search.value.trim().toLowerCase();
  let matches;
  if (query) {
    matches = allPlaces.filter(p => placeMatches(p, query));
  } else if (activeCategory === 'featured') {
    matches = places;
  } else if (activeCategory === 'all') {
    matches = allPlaces;
  } else {
    matches = allPlaces.filter(p => p.category === activeCategory);
  }
  $('#place-count').textContent = matches.length + ' 个地点';
  const list = $('#place-list');
  list.replaceChildren();
  for (const p of matches) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'place';
    b.style.setProperty('--accent', p.color);
    b.setAttribute('aria-current', String(active?.id === p.id));
    b.innerHTML = '<span class="place-icon">' + icon(p.icon) + '</span><span class="rowtext"><b>' + p.name + '</b><small>' + p.type + ' · ' + p.note + '</small></span><span class="row-arrow">' + icon('chevron') + '</span>';
    b.onclick = () => select(p);
    list.append(b);
  }
  if (!matches.length) list.innerHTML = '<div class="empty">没有找到匹配的地点</div>';
}

function renderDetail() {
  detail.hidden = !active || mode === 'walk' || Boolean(tourCtl?.active);
  if (detail.hidden) return;
  const { name, type, desc, link, photo } = active;
  const walkButton = mode === 'walk' ? '' : '<button class="detail-walk">' + icon('walk') + ' 从这里漫游</button>';
  const navButton = router ? '<button type="button" class="detail-walk" data-route>' + icon('route') + ' 步行导航</button>' : '';
  detail.innerHTML = '<div class="detail-top"><b>' + type + '</b><button data-close aria-label="关闭地点详情">' + icon('close') + '</button></div><h2>' + name + '</h2><p>' + desc + '</p>' + walkButton + navButton + (photo !== undefined ? '<button class="detail-walk" data-photo>实拍对照</button>' : '') + (link ? '<a href="' + link[0] + '" target="_blank" rel="noopener">' + link[1] + ' ↗</a>' : '');
  detail.querySelector('[data-close]').onclick = () => {
    active = null;
    model?.highlightBuilding(null);
    renderPlaces();
    renderDetail();
  };
  detail.querySelector('.detail-walk:not([data-photo]):not([data-route]):not([data-field-reference])')?.addEventListener('click', () => setMode('walk'));
  detail.querySelector('[data-route]')?.addEventListener('click', () => openRouteTo(active));
  detail.querySelector('[data-photo]')?.addEventListener('click', () => showPhotos(photo));
  if (fieldViews.some(v => v.place === active.id)) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'detail-walk';
    b.dataset.fieldReference = '';
    b.textContent = '街景对照';
    b.onclick = () => openViews(active.id);
    detail.append(b);
  }
}

function gps(x, z) {
  const [lat, lon] = campus?.origin ?? [34.81805, 114.30335];
  const origin = lat * Math.PI / 180, radius = 6378137 * Math.cos(origin);
  return [lon + x / radius * 180 / Math.PI, Math.atan(Math.sinh(Math.asinh(Math.tan(origin)) - z / radius)) * 180 / Math.PI];
}
function fromGps(lat, lon) {
  const [oLat, oLon] = campus?.origin ?? [34.81805, 114.30335];
  const origin = oLat * Math.PI / 180, radius = 6378137 * Math.cos(origin);
  return [
    (lon - oLon) * Math.PI / 180 * radius,
    (Math.asinh(Math.tan(origin)) - Math.asinh(Math.tan(lat * Math.PI / 180))) * radius
  ];
}

function jumpSatellite(p, zoom) {
  if (!satellite) return;
  satellite.setView((p ? gps(p.x, p.z) : gps(0, 45)).reverse(), zoom ?? (p ? 18 : satelliteHost.clientWidth < 540 ? 15 : 16), { animate: false });
  satelliteMoved = false;
}

function syncSatelliteRoute() {
  if (!satellite || !window.L) return;
  if (satelliteRouteLine) { satellite.removeLayer(satelliteRouteLine); satelliteRouteLine = null; }
  if (activeRoute?.points?.length > 1) {
    satelliteRouteLine = window.L.polyline(activeRoute.points.map(([x, z]) => gps(x, z).reverse()), {
      color: '#1b9e70', weight: 4.5, opacity: 0.92
    }).addTo(satellite);
  }
}

function markView(item) {
  activeView = item;
  const route = walks.find(r => r.stops.includes(item)), i = route ? route.stops.indexOf(item) : -1;
  $('#walk-route').hidden = i < 0;
  if (i >= 0) {
    $('#route-position').textContent = route.label + ' ' + (i + 1) + ' / ' + route.stops.length;
    $('#route-prev').disabled = i === 0;
    $('#route-next').disabled = i === route.stops.length - 1;
  }
  const url = new URL(location.href), current = url.searchParams.get('view');
  if ((item?.id ?? null) === current) return;
  if (item) {
    url.searchParams.set('view', item.id);
    url.searchParams.delete('cam');
    url.searchParams.delete('pos');
  } else {
    url.searchParams.delete('view');
  }
  history.replaceState(null, '', url);
}

function select(p) {
  if (tourCtl?.active && !tourDriving) tourCtl.exit();
  active = p;
  markView(null);
  model?.highlightBuilding(p.osmId ?? null);
  renderPlaces();
  renderDetail();
  if (mode === 'walk') { model?.enterWalk(...p.walk); $('#mode-note').textContent = p.name; }
  else if (mode === 'satellite') jumpSatellite(p);
  else if (model) model.focus(p.x, p.z);
  else notice('当前设备无法显示三维场景。可切换卫星影像查看该地点。');
}

// 3D building direct-click handler
function handlePickBuilding(record) {
  if (tourCtl?.active) tourCtl.exit();
  const [ring, height, rawType, name, id] = record;
  let target = osmPlaceMap.get(id);
  if (!target && name) target = allPlaces.find(p => p.name === name);
  if (!target) {
    const xs = ring.map(q => q[0]), zs = ring.map(q => q[1]);
    const cx = Number(((Math.min(...xs) + Math.max(...xs)) / 2).toFixed(1));
    const cz = Number(((Math.min(...zs) + Math.max(...zs)) / 2).toFixed(1));
    const meta = classifyBuilding(name || '', rawType);
    target = {
      id: 'pick-' + id,
      osmId: id,
      name: name || (meta.type + '（校内建筑）'),
      type: meta.type,
      note: '估高约 ' + Math.round(height) + ' 米',
      icon: meta.icon,
      color: meta.color,
      x: cx,
      z: cz,
      y: Math.max(8, Math.round(height)),
      walk: router ? router.streetPoseFor(cx, cz, ring) : [cx, cz + 25, 0, .14],
      desc: (name ? name + '，' : '校园内轮廓建筑，') + '建筑轮廓估高约 ' + Math.round(height) + ' 米。可直接从周边道路进入地面漫游或规划步行路线。'
    };
  }
  active = target;
  markView(null);
  model?.highlightBuilding(id);
  renderPlaces();
  renderDetail();
}

for (const p of places) {
  const pin = document.createElement('button');
  pin.type = 'button';
  pin.className = 'map-pin';
  pin.hidden = true;
  pin.style.setProperty('--accent', p.color);
  pin.innerHTML = '<span></span>' + p.name;
  pin.onclick = () => select(p);
  labelLayer.append(pin);
  pinMap.set(p.id, pin);
}

function updateLabels(project, bearing, mpp, { w, h }, walking = false, walkPose = null) {
  const deg = bearing * 180 / Math.PI;
  $('#north').style.setProperty('--bearing', deg + 'deg');
  $('#scale').hidden = walking;
  if (!walking && mpp > 0) {
    const n = [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000, 2000].find(x => x / mpp >= 43) ?? 2000;
    $('#scale-label').textContent = n >= 1000 ? n / 1000 + ' 公里' : n + ' 米';
    $('#scale').style.setProperty('--scale', Math.min(n / mpp, 105) + 'px');
  }
  if (walking && walkPose && minimap) minimap.update(walkPose);
  const occupied = [];
  for (const p of [...places].sort((a, b) => +(b === active) - +(a === active))) {
    const pin = pinMap.get(p.id);
    const s = project(p.x, p.y, p.z);
    const width = 12 + p.name.length * 12;
    const space = occupied.every(v => Math.abs(v.x - s.x) > (v.width + width) / 2 + 5 || Math.abs(v.y - s.y) > 25);
    const visible = !walking && !activeView?.orbit && (p.main || p === active || mpp < 1.6) && s.visible && s.x > width / 2 && s.x < w - width / 2 && s.y > 68 && s.y < h - 50 && space;
    pin.hidden = !visible;
    if (!visible) continue;
    occupied.push({ ...s, width });
    pin.style.left = s.x.toFixed(1) + 'px';
    pin.style.top = s.y.toFixed(1) + 'px';
    pin.classList.toggle('selected', p === active);
  }
}

function displayError(message, link) {
  fallback.replaceChildren(document.createTextNode(message));
  if (link) {
    const a = document.createElement('a');
    a.href = link; a.target = '_blank'; a.rel = 'noopener'; a.textContent = '在 ArcGIS 查看 ↗';
    fallback.append(document.createElement('br'), a);
  }
  fallback.hidden = false;
}

const imageryStatus = $('#imagery-status'), imageryMessage = $('#imagery-message');
$('#imagery-external').href = viewer;
$('#imagery-retry').onclick = () => { satelliteTiles?.redraw(); scheduleImageryStatus(); };

function scheduleImageryStatus() {
  if (mode !== 'satellite' || imageryFrame) return;
  imageryFrame = requestAnimationFrame(() => {
    imageryFrame = 0;
    if (mode !== 'satellite' || !satellite) return;
    const view = satelliteHost.getBoundingClientRect();
    const zoom = String(Math.min(satellite.getZoom(), 19));
    const tiles = [...satelliteHost.querySelectorAll('img[data-imagery]')].filter(tile => {
      if (tile.dataset.zoom !== zoom) return false;
      const r = tile.getBoundingClientRect();
      return r.right > view.left + .5 && r.left < view.right - .5 && r.bottom > view.top + .5 && r.top < view.bottom - .5;
    });
    const ready = tiles.filter(tile => tile.dataset.imagery === 'ready').length;
    const loading = !tiles.length || tiles.some(tile => tile.dataset.imagery === 'pending');
    const failed = tiles.some(tile => tile.dataset.imagery === 'failed');
    imageryStatus.dataset.state = loading ? 'loading' : failed ? (ready ? 'partial' : 'unavailable') : 'ready';
    imageryStatus.hidden = !loading && !failed;
    $('#imagery-actions').hidden = loading || !failed;
    $('#mode-label').textContent = ready || !campus ? '卫星影像' : '校园平面图';
    $('#mode-note').textContent = ready ? 'Esri World Imagery · 实拍底图' : campus ? '校园轮廓 · 示意底图' : 'Esri World Imagery';
    const message = loading ? '正在加载卫星影像…' : failed ? (ready ? '部分卫星影像未能加载。' : campus ? '卫星影像暂时无法加载，已显示校园示意图。' : '卫星影像暂时无法加载。') : '';
    if (imageryMessage.textContent !== message) imageryMessage.textContent = message;
  });
}

let leafletPromise = null;
function ensureLeaflet() {
  if (window.L) return Promise.resolve(window.L);
  if (!leafletPromise) {
    leafletPromise = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = './assets/leaflet.js';
      s.onload = () => window.L ? resolve(window.L) : reject(new Error('Satellite library unavailable'));
      s.onerror = () => reject(new Error('Satellite library failed to load'));
      document.head.append(s);
    }).catch(err => { leafletPromise = null; throw err; });
  }
  return leafletPromise;
}

function loadSatellite() {
  if (satellite) return;
  const L = window.L;
  if (!L) throw new Error('Satellite library unavailable');
  satellite = L.map(satelliteHost, { zoomControl: false, attributionControl: false, zoomAnimation: false, minZoom: 12, maxZoom: 20 });
  satellite.on('dragend zoomend', () => { satelliteMoved = true; });
  satellite.on('move zoom resize', renderSatelliteLabels);
  satellite.on('moveend zoomend resize', scheduleImageryStatus);
  if (campus) addCampusBasemap(L, satellite, campus, (x, z) => gps(x, z).reverse());
  satelliteTiles = imageryLayer(L);
  satelliteTiles.on('loading load tileload tileerror', scheduleImageryStatus);
  satelliteTiles.addTo(satellite);
}

function renderSatelliteLabels() {
  if (mode !== 'satellite' || !satellite) return;
  const project = (x, _y, z) => {
    const p = satellite.latLngToContainerPoint(gps(x, z).reverse());
    return { x: p.x, y: p.y, visible: true };
  };
  const size = satellite.getSize();
  const mpp = satellite.distance(
    satellite.containerPointToLatLng([0, size.y / 2]),
    satellite.containerPointToLatLng([100, size.y / 2])
  ) / 100;
  updateLabels(project, 0, mpp, { w: size.x, h: size.y });
}

function setMode(next, walkPose, item = null) {
  if (next === 'walk' && !model) {
    notice('当前浏览器暂时无法进入三维地面漫游。');
    return;
  }
  if (tourCtl?.active && !tourDriving) tourCtl.exit();
  const prevMode = mode;
  const prev3dView = prevMode !== 'satellite' && model ? model.getView() : null;
  mode = next;
  markView(item);
  document.querySelectorAll('[data-mode]').forEach(b => {
    b.classList.toggle('active', b.dataset.mode === mode);
    b.setAttribute('aria-pressed', String(b.dataset.mode === mode));
  });
  const [title, note] = {
    model: ['三维校园', stage.dataset.renderer === 'canvas' ? '兼容模式 · 基础模型' : '精细化模型 · 建筑高度估算'],
    satellite: ['卫星影像', 'Esri World Imagery · 实拍底图'],
    walk: ['地面漫游', '第一人称 · 模拟街景']
  }[mode];
  $('#mode-label').textContent = title;
  $('#mode-note').textContent = note;
  $('#esri-credit').hidden = mode !== 'satellite';
  $('.orbit-help').hidden = mode === 'walk';
  $('.orbit-help').textContent = mode === 'satellite' ? '拖动平移 · 滚轮缩放' : '点击建筑查看 · 拖动旋转 · 右键平移 · 滚轮缩放';
  stage.setAttribute('aria-label', mode === 'walk' ? '校园地面漫游。拖动环顾，点前进或后退移动；也可用 W A S D 或方向键移动。' : '三维校园，拖动旋转，双指或滚轮缩放。');
  $('#street-help').hidden = mode !== 'walk';
  $('#joystick').hidden = mode !== 'walk';
  resetJoystick?.();
  $('#map-photos').hidden = mode !== 'walk';
  $('#minimap').hidden = mode !== 'walk' || !minimap;
  $('#notice').hidden = true;
  pinMap.forEach(pin => pin.hidden = true);
  satelliteHost.hidden = mode !== 'satellite';
  stage.hidden = mode === 'satellite';
  model?.setVisible(mode !== 'satellite');
  fallback.hidden = true;
  imageryStatus.hidden = true;
  renderDetail();

  if (mode === 'satellite') {
    model?.exitWalk(false);
    imageryStatus.dataset.state = 'loading';
    imageryMessage.textContent = '正在加载卫星影像…';
    $('#imagery-actions').hidden = true;
    imageryStatus.hidden = false;
    ensureLeaflet().then(() => {
      if (mode !== 'satellite') return;
      loadSatellite();
      satellite.invalidateSize();
      if (active) {
        jumpSatellite(active);
      } else if (prev3dView && (prev3dView.walking || prev3dView.distance < 1050)) {
        const z = prev3dView.walking ? 18 : Math.max(16, Math.min(19, Math.round(21 - Math.log2(Math.max(30, prev3dView.distance) / 28))));
        jumpSatellite({ x: prev3dView.x, z: prev3dView.z }, z);
      } else {
        jumpSatellite(null);
      }
      syncSatelliteRoute();
      renderSatelliteLabels();
      scheduleImageryStatus();
    }).catch(() => {
      if (mode === 'satellite') {
        imageryStatus.hidden = true;
        displayError('当前网络未能加载卫星服务。', viewer);
      }
    });
    return;
  }

  if (mode === 'walk') {
    model.enterWalk(...(walkPose ?? (active ?? places[0]).walk));
    const v = model.getView();
    minimap?.update({ x: v.x, z: v.z, yaw: v.yaw });
    stage.focus({ preventScroll: true });
    return;
  }

  if (model) {
    const keepSpot = prevMode === 'walk' && !active && !item?.orbit;
    model.exitWalk(keepSpot);
    if (item?.orbit) {
      model.lookFrom(...item.orbit);
    } else if (active) {
      model.focus(active.x, active.z);
    } else if (prevMode === 'satellite' && satellite && satelliteMoved) {
      const c = satellite.getCenter();
      const [wx, wz] = fromGps(c.lat, c.lng);
      const dist = Math.max(120, Math.min(1800, 32 * 2 ** (21 - satellite.getZoom())));
      model.focus(wx, wz, dist);
      satelliteMoved = false;
    }
  } else {
    displayError('三维场景需要支持 WebGL 的浏览器。可切换卫星影像。');
  }
}

/* Walking Route Planner UI */
function populateRouteSelects() {
  const fromSel = $('#route-from'), toSel = $('#route-to');
  const buildOpts = (sel, includeCurrent) => {
    const prev = sel.value;
    sel.replaceChildren();
    if (includeCurrent) sel.add(new Option('当前漫游位置', '__current__'));
    for (const p of allPlaces) {
      if (p.type === '道路') continue;
      sel.add(new Option(p.name, p.id));
    }
    if (prev && [...sel.options].some(o => o.value === prev)) sel.value = prev;
  };
  buildOpts(fromSel, true);
  buildOpts(toSel, false);
  if (!fromSel.value) fromSel.value = 'west';
}

function resolveRouteEndpoint(val) {
  if (val === '__current__' && model) {
    const v = model.getView();
    return { x: v.x, z: v.z, name: '当前位置' };
  }
  return allPlaces.find(p => p.id === val) ?? null;
}

function updateActiveRoute(frameResult = false) {
  if (!router) return;
  const from = resolveRouteEndpoint($('#route-from').value);
  const to = resolveRouteEndpoint($('#route-to').value);
  if (!from || !to) return;
  const result = router.findRoute([from.x, from.z], [to.x, to.z]);
  if (!result) {
    $('#route-summary').textContent = '暂未找到连通的步行路线';
    return;
  }
  activeRoute = { ...result, from, to };
  $('#route-summary').textContent = `步行约 ${result.distance} 米 · 约 ${result.minutes} 分钟`;
  model?.setRoute(result.points);
  minimap?.setRoute(result.points);
  syncSatelliteRoute();
  if (frameResult && model && mode === 'model') {
    const xs = result.points.map(p => p[0]), zs = result.points.map(p => p[1]);
    const mx = (Math.min(...xs) + Math.max(...xs)) / 2, mz = (Math.min(...zs) + Math.max(...zs)) / 2;
    const span = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...zs) - Math.min(...zs));
    model.focus(mx, mz, Math.max(220, Math.min(1400, span * 1.45)));
  }
}

function openRouteTo(dest) {
  if (!router) { notice('路网数据加载中，请稍候。'); return; }
  const fromSel = $('#route-from'), toSel = $('#route-to');
  if (![...toSel.options].some(o => o.value === dest.id)) {
    toSel.add(new Option(dest.name, dest.id));
    fromSel.add(new Option(dest.name, dest.id));
  }
  toSel.value = dest.id;
  if (mode === 'walk') fromSel.value = '__current__';
  else if (!fromSel.value || fromSel.value === dest.id || fromSel.value === '__current__') {
    fromSel.value = dest.id === 'west' ? 'library' : 'west';
  }
  $('#route-bar').hidden = false;
  updateActiveRoute(true);
}

function clearRoute() {
  activeRoute = null;
  $('#route-bar').hidden = true;
  model?.setRoute(null);
  minimap?.setRoute(null);
  syncSatelliteRoute();
}

$('#route-from').onchange = () => updateActiveRoute(true);
$('#route-to').onchange = () => updateActiveRoute(true);
$('#route-swap').onclick = () => {
  const f = $('#route-from'), t = $('#route-to');
  if (f.value === '__current__') { notice('当前位置暂不支持作为终点交换'); return; }
  [f.value, t.value] = [t.value, f.value];
  updateActiveRoute(true);
};
$('#route-clear').onclick = clearRoute;
$('#route-walk').onclick = () => {
  if (!activeRoute?.points?.length) return;
  const p0 = activeRoute.points[0], p1 = activeRoute.points[1] ?? p0;
  const yaw = Math.atan2(p1[0] - p0[0], -(p1[1] - p0[1]));
  setMode('walk', [p0[0], p0[1], yaw, 0.04, 65]);
  $('#mode-note').textContent = `步行导航 · 前往${activeRoute.to.name}`;
};

/* Lighting & Atmosphere Controls */
function applyLighting(name) {
  currentLighting = ['morning', 'noon', 'sunset', 'night'].includes(name) ? name : 'noon';
  model?.setLighting(currentLighting);
  viewportEl.dataset.lighting = currentLighting;
  minimap?.setDark(currentLighting === 'night');
  document.querySelectorAll('[data-light]').forEach(b => {
    const on = b.dataset.light === currentLighting;
    b.classList.toggle('active', on);
    b.setAttribute('aria-pressed', String(on));
  });
}

$('#lighting').onclick = () => {
  const panel = $('#env-panel');
  const open = panel.hidden;
  panel.hidden = !open;
  $('#lighting').classList.toggle('active-tool', open);
  $('#lighting').setAttribute('aria-expanded', String(open));
};
document.querySelectorAll('[data-light]').forEach(b => b.onclick = () => applyLighting(b.dataset.light));
const waterBox = $('#water-motion');
waterBox.checked = !matchMedia('(prefers-reduced-motion: reduce)').matches;
waterBox.onchange = () => model?.setWaterMotion(waterBox.checked);

// Close env-panel when clicking outside it
document.addEventListener('pointerdown', e => {
  const panel = $('#env-panel');
  if (!panel.hidden && !panel.contains(e.target) && !$('#lighting').contains(e.target)) {
    panel.hidden = true;
    $('#lighting').classList.remove('active-tool');
    $('#lighting').setAttribute('aria-expanded', 'false');
  }
});

/* Shareable exact viewpoint link */
$('#share').onclick = async () => {
  const url = new URL(location.href);
  url.searchParams.delete('cam');
  url.searchParams.delete('pos');
  url.searchParams.delete('light');
  url.searchParams.delete('tour');
  url.searchParams.delete('stop');
  if (currentLighting !== 'noon') url.searchParams.set('light', currentLighting);
  if (tourCtl?.active) {
    url.searchParams.delete('view');
    url.searchParams.delete('light');
    url.searchParams.set('tour', tourCtl.state.id);
    url.searchParams.set('stop', String(tourCtl.state.index + 1));
  } else if (activeView) {
    url.searchParams.set('view', activeView.id);
  } else if (model) {
    url.searchParams.delete('view');
    const v = model.getView();
    if (v.walking) {
      url.searchParams.set('pos', [v.x, v.z, v.yaw, v.pitch].map(n => Number(n.toFixed(2))).join(','));
    } else {
      url.searchParams.set('cam', [...v.camera, ...v.target].map(n => Number(n.toFixed(1))).join(','));
    }
  }
  const shareUrl = url.toString();
  history.replaceState(null, '', shareUrl);
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(shareUrl);
      notice('已复制当前视角链接，可直接分享给朋友');
    } else {
      notice('视角链接已更新到地址栏，直接复制即可分享');
    }
  } catch {
    notice('视角链接已更新到地址栏，直接复制即可分享');
  }
};

/* Category tabs & search */
document.querySelectorAll('[data-cat]').forEach(btn => {
  btn.onclick = () => {
    activeCategory = btn.dataset.cat;
    search.value = '';
    document.querySelectorAll('[data-cat]').forEach(b => {
      const on = b.dataset.cat === activeCategory;
      b.classList.toggle('active', on);
      b.setAttribute('aria-selected', String(on));
    });
    renderPlaces();
  };
});

search.addEventListener('input', renderPlaces);
search.addEventListener('keydown', e => {
  if (e.key === 'Enter') $('#place-list .place')?.click();
  if (e.key === 'Escape') { search.value = ''; renderPlaces(); search.blur(); }
});
document.addEventListener('keydown', e => {
  if (e.key === '/' && !e.ctrlKey && !e.metaKey && !e.altKey && !(e.target instanceof HTMLInputElement) && !(e.target instanceof HTMLSelectElement)) {
    e.preventDefault(); search.focus();
  }
});

document.querySelectorAll('[data-mode]').forEach(b => b.onclick = () => setMode(b.dataset.mode));
$('#zoom-in').onclick = () => mode === 'satellite' ? satellite?.zoomIn() : model?.zoom(1);
$('#zoom-out').onclick = () => mode === 'satellite' ? satellite?.zoomOut() : model?.zoom(-1);
$('#north').onclick = () => mode === 'satellite' ? notice('卫星影像采用正北朝上。') : model?.north();
$('#home').onclick = () => {
  if (tourCtl?.active) tourCtl.exit();
  if (mode === 'satellite') { active = null; jumpSatellite(null); renderPlaces(); renderDetail(); return; }
  const wasWalk = mode === 'walk';
  active = null;
  model?.highlightBuilding(null);
  renderPlaces(); renderDetail();
  if (wasWalk) setMode('model');
  model?.home();
};

// Tap steps 5m (preserves click tests); press-and-hold walks smoothly continuously.
function bindWalkButton(selector, dir) {
  const btn = $(selector);
  let holdTimer = null, holding = false;
  btn.addEventListener('pointerdown', e => {
    if (e.button !== 0) return;
    holding = false;
    clearTimeout(holdTimer);
    holdTimer = setTimeout(() => { holding = true; model?.setWalkDrive(dir); }, 230);
  });
  const stopHold = () => {
    clearTimeout(holdTimer);
    if (holding) { model?.setWalkDrive(0); }
  };
  for (const ev of ['pointerup', 'pointercancel', 'pointerleave']) btn.addEventListener(ev, stopHold);
  btn.onclick = () => {
    if (holding) { holding = false; return; }
    model?.step(dir * 5);
    stage.focus({ preventScroll: true });
  };
}
bindWalkButton('#walk-forward', 1);
bindWalkButton('#walk-back', -1);

$('#fullscreen').onclick = async () => {
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
    else if ($('.viewport').requestFullscreen) await $('.viewport').requestFullscreen();
    else notice('当前浏览器不支持网页全屏。');
  } catch { notice('当前浏览器无法进入全屏。'); }
};

function setPhoto(index) {
  const [id, title] = photoItems[index];
  const image = $('#campus-photo');
  const status = $('#photo-status');
  status.textContent = '正在加载校方照片…';
  status.hidden = false;
  image.hidden = true;
  image.onload = () => { image.hidden = false; status.hidden = true; };
  image.onerror = () => { image.hidden = true; status.textContent = '当前网络无法加载照片，可打开校方来源。'; };
  image.alt = title;
  image.src = 'https://zbcg.henu.edu.cn/uEditorFile/ueditor/upload/image/20240110/' + id + '.jpg';
  $('#photo-title').textContent = title;
  document.querySelectorAll('[data-photo-tab]').forEach((b, i) => b.setAttribute('aria-pressed', String(i === index)));
}
function showPhotos(index = 0) {
  $('#photo-dialog').showModal();
  setPhoto(index);
}
function visitView(item) {
  if (!model) { notice('三维场景暂未就绪，可以先打开实拍。'); return; }
  active = places.find(p => p.id === item.place) ?? null;
  if (!active || !placeMatches(active, search.value.trim().toLowerCase())) search.value = '';
  model?.highlightBuilding(null);
  renderPlaces();
  if (item.orbit) setMode('model', null, item);
  else {
    const [x, z, bearing, pitch] = item.camera;
    setMode('walk', [x, z, bearing * Math.PI / 180, pitch * Math.PI / 180, 78], item);
  }
  $('#mode-note').textContent = item.title;
}
const openViews = mountFieldViews($('#field-dialog'), visitView);
for (const [id, delta] of [['route-prev', -1], ['route-next', 1]]) $('#' + id).onclick = () => {
  const route = walks.find(r => r.stops.includes(activeView)); if (!route) return;
  const item = route.stops[route.stops.indexOf(activeView) + delta]; if (item) visitView(item);
};
$('#field-views').onclick = () => openViews(active?.id, activeView?.id);
$('#map-photos').onclick = () => !activeView && active?.photo !== undefined ? showPhotos(active.photo) : openViews(active?.id, activeView?.id);
$('#close-photos').onclick = () => $('#photo-dialog').close();
document.querySelectorAll('[data-photo-tab]').forEach((b, i) => b.onclick = () => setPhoto(i));
$('#sources').onclick = () => $('#about').showModal();
$('#close-about').onclick = () => $('#about').close();
for (const id of ['#about', '#field-dialog', '#photo-dialog', '#tour-dialog']) {
  $(id).addEventListener('click', e => { if (e.target === e.currentTarget) e.currentTarget.close(); });
}

/* Guided campus tours */
const tourCard = $('#tour-card'), tourDialog = $('#tour-dialog');
function tourUrl(state) {
  const url = new URL(location.href);
  url.searchParams.delete('tour'); url.searchParams.delete('stop');
  if (state) {
    for (const k of ['view', 'cam', 'pos', 'light']) url.searchParams.delete(k);
    url.searchParams.set('tour', state.id);
    url.searchParams.set('stop', String(state.index + 1));
  }
  history.replaceState(null, '', url);
}
tourCtl = createTourController(tourCard, id => places.find(p => p.id === id), {
  enter(tour, stop, index, place) {
    tourDriving = true;
    try {
      if (mode !== 'model') setMode('model');
      if (tourPrevLighting === null) tourPrevLighting = currentLighting;
      const light = tour.stops.slice(0, index + 1).reduce((l, s) => s.light ?? l, tour.light ?? 'noon');
      if (light !== currentLighting) applyLighting(light);
      active = place ?? null;
      markView(null);
      model?.highlightBuilding(place?.osmId ?? null);
      renderPlaces();
      renderDetail();
      $('#place-list .place[aria-current=true]')?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
      viewportEl.classList.add('touring');
      $('#mode-label').textContent = '校园云游';
      $('#mode-note').textContent = tour.title + ' · ' + stop.title.split(' · ')[0];
      tourUrl({ id: tour.id, index });
    } finally { tourDriving = false; }
  },
  exit() {
    viewportEl.classList.remove('touring');
    applyLighting(tourPrevLighting ?? 'noon');
    tourPrevLighting = null;
    tourUrl(null);
    if (mode === 'model') {
      $('#mode-label').textContent = '三维校园';
      $('#mode-note').textContent = stage.dataset.renderer === 'canvas' ? '兼容模式 · 基础模型' : '精细化模型 · 建筑高度估算';
    }
    renderDetail();
  },
  fly(eye, target, duration) { model?.flyTo(eye, target, { duration, drift: .3 }); },
  stopDrift() { model?.stopDrift(); },
  reducedMotion: () => matchMedia('(prefers-reduced-motion: reduce)').matches
});
$('#tour-walk').onclick = () => {
  const view = fieldViews.find(v => v.id === tourCtl.state?.stop.view);
  tourCtl.exit();
  if (view) visitView(view);
};
// Any direct manipulation of the scene pauses the tour so the visitor can take over.
const takeOver = () => {
  if (!tourCtl.active || !tourCtl.state.playing) return;
  tourCtl.pause();
  notice('云游已暂停，可自由拖动查看；点「继续」回到路线', 2600);
};
stage.addEventListener('pointerdown', takeOver, true);
stage.addEventListener('wheel', takeOver, { capture: true, passive: true });
document.addEventListener('keydown', e => {
  if (!tourCtl.active || e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) return;
  if (e.key === 'Escape') tourCtl.exit();
  else if (e.key === ' ' && !(e.target instanceof HTMLButtonElement)) { e.preventDefault(); tourCtl.state.playing ? tourCtl.pause() : tourCtl.resume(); }
  else if (e.key === 'ArrowRight' && e.target !== stage) $('#tour-next').click();
  else if (e.key === 'ArrowLeft' && e.target !== stage) $('#tour-prev').click();
});
const tourList = tourDialog.querySelector('.tour-list');
for (const t of tours) {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'tour-option';
  b.dataset.tour = t.id;
  const minutes = Math.round(t.stops.length * (DWELL + 2600) / 60000);
  b.innerHTML = '<span class="tour-option-icon">' + icon('play') + '</span><span class="rowtext"><b></b><small></small></span><span class="tour-option-meta"></span>';
  b.querySelector('b').textContent = t.title;
  b.querySelector('small').textContent = t.subtitle + ' · ' + t.stops.map(s => s.title.split(' · ')[0]).join(' → ');
  b.querySelector('.tour-option-meta').textContent = t.stops.length + ' 站 · 约 ' + minutes + ' 分钟';
  b.onclick = () => {
    tourDialog.close();
    if (!model) { notice('三维场景暂未就绪，请稍候再开始云游。'); return; }
    if (tourCtl.active) tourCtl.exit();
    tourCtl.start(t.id);
  };
  tourList.append(b);
}
tourDialog.querySelector('[data-close]').onclick = () => tourDialog.close();
document.querySelectorAll('[data-open-tour]').forEach(b => b.onclick = () => {
  for (const o of tourList.children) o.toggleAttribute('data-current', o.dataset.tour === tourCtl.state?.id);
  tourDialog.showModal();
});

/* One-thumb virtual joystick for touch walking (front/back buttons stay available). */
{
  const pad = $('#joystick'), knob = pad.querySelector('.joystick-knob');
  let pointer = null;
  resetJoystick = () => {
    if (pointer !== null) model?.setWalkDrive(0, 0);
    pointer = null;
    knob.style.transform = '';
    pad.classList.remove('engaged');
  };
  const move = e => {
    const r = pad.getBoundingClientRect(), radius = r.width / 2 - 10;
    let dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
    const len = Math.hypot(dx, dy);
    if (len > radius) { dx *= radius / len; dy *= radius / len; }
    knob.style.transform = `translate(${dx.toFixed(1)}px, ${dy.toFixed(1)}px)`;
    const dead = v => (Math.abs(v) < .16 ? 0 : (v - Math.sign(v) * .16) / .84);
    model?.setWalkDrive(-dead(dy / radius), dead(dx / radius) * .85);
  };
  pad.addEventListener('pointerdown', e => {
    if (pointer !== null || mode !== 'walk') return;
    e.preventDefault();
    pointer = e.pointerId;
    pad.setPointerCapture(e.pointerId);
    pad.classList.add('engaged');
    move(e);
  });
  pad.addEventListener('pointermove', e => { if (e.pointerId === pointer) move(e); });
  for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) pad.addEventListener(type, e => { if (e.pointerId === pointer) resetJoystick(); });
}
renderPlaces();

try {
  const response = await fetch('./assets/campus.json');
  if (!response.ok) throw new Error('Campus data missing');
  campus = await response.json();
  router = createCampusRouter(campus);
  enrichCampusPlaces(campus);
  minimap = createMinimap($('#minimap'), campus, (wx, wz) => {
    if (model?.teleportWalk(wx, wz)) notice('已跳转到小地图指定位置', 1800);
    else notice('该位置无法落脚，请点击道路或空地', 1800);
  });
  if (satellite) addCampusBasemap(window.L, satellite, campus, (x, z) => gps(x, z).reverse());
  model = createModel(
    stage,
    campus,
    (...args) => { if (mode !== 'satellite') updateLabels(...args); },
    { onPickBuilding: handlePickBuilding }
  );

  const params = new URLSearchParams(location.search);
  const reqLight = params.get('light');
  if (reqLight && ['morning', 'noon', 'sunset', 'night'].includes(reqLight)) applyLighting(reqLight);

  const requested = fieldViews.find(v => v.id === params.get('view'));
  const reqPos = params.get('pos')?.split(',').map(Number);
  const reqCam = params.get('cam')?.split(',').map(Number);
  if (requested) {
    visitView(requested);
  } else if (tours.some(t => t.id === params.get('tour'))) {
    const t = tours.find(t => t.id === params.get('tour'));
    const at = Math.max(1, Math.min(t.stops.length, parseInt(params.get('stop'), 10) || 1)) - 1;
    tourCtl.start(t.id, at);
  } else if (reqPos?.length === 4 && reqPos.every(Number.isFinite)) {
    setMode('walk', [...reqPos, 65]);
  } else if (reqCam?.length === 6 && reqCam.every(Number.isFinite)) {
    model.setOrbitPose(reqCam.slice(0, 3), reqCam.slice(3, 6));
  }
  model.setVisible(mode !== 'satellite');
  if (!requested && mode === 'model' && stage.dataset.renderer === 'canvas') $('#mode-note').textContent = '兼容模式 · 基础模型';
  requestAnimationFrame(() => {
    stage.dataset.modelStats = JSON.stringify(model.getDiagnostics());
    stage.dataset.ready = 'true';
  });
  if (mode === 'model') fallback.hidden = true;
} catch (error) {
  console.warn('Campus model failed', error);
  if (mode === 'model') displayError('三维场景无法启动。可切换卫星影像，或在支持 WebGL 的浏览器中重试。');
}
