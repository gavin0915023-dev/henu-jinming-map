// Guided campus tours: preset story routes that fly the orbit camera from stop
// to stop with a caption card. Pure data + a small controller; no dependencies.

// Each stop frames a place from `angle` degrees (0 = from the south, 90 = from the east),
// `dist` metres away horizontally and `height` metres up. `view` is an optional
// field viewpoint id used by "下到地面"; `light` optionally changes the time of day.
export const tours = [
  {
    id: 'axis', title: '中轴经典线', subtitle: '西门入校 · 一路向东到体育场', light: 'morning',
    stops: [
      { place: 'west', title: '西大门 · 从这里出发', caption: '校名石墙面向金明大道，两侧是入校通道。穿过它，便踏上了金明校区的东西中轴。', angle: -112, dist: 150, height: 85, view: 'west-gate' },
      { place: 'office', title: '办公楼 · 弧形外廊', caption: '中轴南侧的弧形楼体环抱内院。南门的玻璃雨棚伸到台阶上方，北面是一圈外廊挑板。', angle: 35, dist: 190, height: 120, view: 'office-south' },
      { place: 'library', title: '金明校区图书馆', caption: '中轴尽头的标志性建筑。两侧玻璃幕墙内收，雨棚上方是三个金色的馆名大字。', angle: -95, dist: 230, height: 120 },
      { place: 'marco', title: '马可广场 · 下沉的圆', caption: '图书馆东侧，同心石环与放射铺地层层下沉。十二级台阶把弧形草台分成几段。', angle: 85, dist: 120, height: 90, view: 'marco-approach' },
      { place: 'teaching', title: '公共教学楼', caption: '两端红墙夹着横向玻璃正面。许多人的第一节大课，就从这里开始。', angle: -70, dist: 210, height: 110, view: 'teaching-front' },
      { place: 'stadium', title: '志义体育场', caption: '西看台的三角桁架和红字馆名标出主入口。中轴在这里迎来最开阔的一片天空。', angle: -80, dist: 280, height: 150, view: 'stadium-west', light: 'noon' },
      { place: 'east', title: '东大门 · 终点', caption: '圆洞砖墙与门房分列两侧。从西门到东门，你已走完整条校园中轴。', angle: 95, dist: 150, height: 80, view: 'east-gate' }
    ]
  },
  {
    id: 'life', title: '南北生活线', subtitle: '北门到南苑 · 一天的校园日常', light: 'noon',
    stops: [
      { place: 'north', title: '北大门 · 清晨入校', caption: '东京大道一侧的石墙金字面向街道，墙后的绿篱和两侧通道把人引进校园。', angle: 180, dist: 170, height: 95, view: 'north-gate' },
      { place: 'beiyuan', title: '北苑餐厅 · 早餐', caption: '开阔的前场、西侧逐级升起的室外楼梯和细柱门廊，是北区一天的起点。', angle: -140, dist: 170, height: 95, view: 'beiyuan-court' },
      { place: 'hall', title: '文甫路 · 上课路上', caption: '报告厅连接两侧白色教学楼，中央通道可以直接穿过。沿街一路都是赶课的人。', angle: 10, dist: 200, height: 110, view: 'wenfu-hall' },
      { place: 'autumn', title: '访秋湖 · 课间', caption: '公共教学楼南侧的一片水面。下课铃响后，湖边的小路最热闹。', angle: 160, dist: 210, height: 120, view: 'autumn-bank' },
      { place: 'east-courts', title: '东南球场 · 傍晚', caption: '深绿高网的网球场和蓝色球架的篮球场相邻。太阳偏西时，这里座无虚席。', angle: -40, dist: 190, height: 110, view: 'tennis-west', light: 'sunset' },
      { place: 'jiaoyuan', title: '教苑餐厅 · 晚饭', caption: '三层橙红色窗下墙随转角折过去，西侧短墙上是蓝色的餐厅门牌。', angle: -60, dist: 160, height: 90, view: 'jiaoyuan-door' },
      { place: 'nanyuan', title: '南苑餐厅 · 夜色', caption: '弧形白檐和通透的钢架亮起灯来，南生活区的一天在这里收尾。', angle: 70, dist: 180, height: 100, view: 'nanyuan-east', light: 'night' }
    ]
  },
  {
    id: 'lake', title: '湖畔学院线', subtitle: '湖、桥与书院 · 一路走到夜色', light: 'noon',
    stops: [
      { place: 'pharmacy', title: '药学院 · 院前广场', caption: '花坛里的菱形石雕前，竖排院名和玻璃门厅依次展开。', angle: 10, dist: 170, height: 95, view: 'pharmacy' },
      { place: 'lake', title: '粹庭湖 · 柳岸', caption: '经济学院以北的湖面。垂枝伸到岸边，浅色岸沿随水面转弯。', angle: -120, dist: 200, height: 95, view: 'cuiting-bank' },
      { place: 'campus-bridge', title: '九章路石桥', caption: '镂空石栏和方柱沿桥面排开，桥下是教学区的另一片水面。', angle: -130, dist: 120, height: 60, view: 'jiuzhang' },
      { place: 'education', title: '田家炳教育书院 · 钟塔', caption: '红砖钟塔立在两院之间，连廊顶板上留出圆形天井。', angle: -100, dist: 200, height: 120, view: 'education-west', light: 'sunset' },
      { place: 'cs', title: '计算机与信息工程学院', caption: '南翼东端的入口上方，两列竖排金字落在浅色墙面上。', angle: 20, dist: 200, height: 110, view: 'cs-entry' },
      { place: 'library', title: '图书馆 · 灯火', caption: '天色暗下来，幕墙后的阅览层一层层亮起。这是金明校区最安静的时刻。', angle: -95, dist: 260, height: 130, light: 'night' }
    ]
  }
];

export const DWELL = 9000;
export const FLIGHT = 2600;

export function stopCamera(stop, place) {
  const a = stop.angle * Math.PI / 180;
  const target = [place.x, Math.min(12, (place.y ?? 8) * .3), place.z];
  return { eye: [place.x + Math.sin(a) * stop.dist, stop.height, place.z + Math.cos(a) * stop.dist], target };
}

// hooks: enter(tour, stop, index, place), exit(tour), fly(eye, target, flightMs), stopDrift(), reducedMotion()
export function createTourController(card, findPlace, hooks) {
  const $ = s => card.querySelector(s);
  let tour = null, index = 0, playing = false, timer = 0, started = 0, remaining = DWELL;

  function render() {
    if (!tour) return;
    const stop = tour.stops[index], last = index === tour.stops.length - 1, place = findPlace(stop.place);
    card.dataset.tour = tour.id;
    card.dataset.stop = String(index + 1);
    card.dataset.playing = String(playing);
    $('#tour-route').textContent = tour.title;
    $('#tour-step').textContent = (index + 1) + ' / ' + tour.stops.length;
    $('#tour-title').textContent = stop.title;
    $('#tour-caption').textContent = stop.caption;
    $('#tour-prev').disabled = index === 0;
    $('#tour-next').textContent = last ? '完成 ✓' : '下一站 ›';
    $('#tour-toggle').textContent = playing ? '暂停' : '继续';
    $('#tour-toggle').setAttribute('aria-pressed', String(!playing));
    $('#tour-walk').hidden = !stop.view && !place?.walk;
    $('#tour-dots').replaceChildren(...tour.stops.map((_, i) => {
      const d = document.createElement('i');
      if (i < index) d.className = 'done'; else if (i === index) d.className = 'current';
      return d;
    }));
  }
  function restartBar(ms) {
    const old = $('.tour-bar i'), bar = document.createElement('i');
    bar.style.animationDuration = ms + 'ms';
    old.replaceWith(bar);
  }
  function schedule(ms) {
    clearTimeout(timer);
    if (!playing) return;
    started = performance.now();
    remaining = ms;
    timer = setTimeout(() => (index < tour.stops.length - 1 ? go(index + 1) : finish()), ms);
  }
  function go(i) {
    index = Math.max(0, Math.min(tour.stops.length - 1, i));
    const stop = tour.stops[index], place = findPlace(stop.place);
    hooks.enter(tour, stop, index, place);
    const flight = hooks.reducedMotion() ? 0 : FLIGHT;
    if (place) { const { eye, target } = stopCamera(stop, place); hooks.fly(eye, target, flight); }
    render();
    restartBar(DWELL + flight);
    schedule(DWELL + flight);
  }
  function finish() {
    playing = false;
    clearTimeout(timer);
    hooks.stopDrift();
    render();
    $('#tour-toggle').textContent = '重新开始';
    card.dataset.finished = 'true';
  }
  function pause() {
    if (!tour || !playing) return;
    playing = false;
    clearTimeout(timer);
    remaining = Math.max(0, remaining - (performance.now() - started));
    hooks.stopDrift();
    render();
  }
  function resume() {
    if (!tour) return;
    if (card.dataset.finished === 'true') { delete card.dataset.finished; playing = true; go(0); return; }
    playing = true;
    render();
    schedule(remaining > 600 ? remaining : 1600);
  }
  function start(id, at = 0) {
    const next = tours.find(t => t.id === id);
    if (!next) return false;
    tour = next;
    playing = true;
    delete card.dataset.finished;
    card.hidden = false;
    go(at);
    return true;
  }
  function exit(options) {
    if (!tour) return;
    const was = tour;
    clearTimeout(timer);
    tour = null; playing = false;
    hooks.stopDrift();
    card.hidden = true;
    delete card.dataset.tour; delete card.dataset.stop; delete card.dataset.finished;
    hooks.exit(was, options);
  }
  $('#tour-prev').onclick = () => { delete card.dataset.finished; go(index - 1); };
  $('#tour-next').onclick = () => { if (index === tour.stops.length - 1) finish(); else { delete card.dataset.finished; go(index + 1); } };
  $('#tour-toggle').onclick = () => (playing ? pause() : resume());
  $('#tour-exit').onclick = () => exit();
  return {
    start, exit, pause, resume,
    get active() { return Boolean(tour); },
    get state() { return tour ? { id: tour.id, index, playing, stop: tour.stops[index] } : null; }
  };
}
