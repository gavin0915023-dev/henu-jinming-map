// Camera positions are approximate local metres. Bearings are clockwise from north.
const uni='https://ganbu.henu.edu.cn/info/1036/4225.htm';
function baidu(id,x,y,bearing,pitch){
  return 'https://map.baidu.com/@'+x+','+y+',21z#panoid='+id+'&panotype=street&heading='+bearing+'&pitch='+pitch+'&l=21&tn=B_NORMAL_MAP&sc=0&newmap=1&shareurl=1&pid='+id;
}
export const fieldViews=[
  {id:'boxiang',title:'伯襄路 · 林荫道',caption:'沿路向东看：两侧是刷白的树干和贴着路缘的低绿篱。',camera:[-287,24,81.85,0],source:'百度街景',url:'https://map.baidu.com/@12725365.899999999,4115179.56,21z,87t,-81.85h#panoid=01027700001404011242060655G&panotype=street&heading=81.85&pitch=0&l=21&tn=B_NORMAL_MAP&sc=0&newmap=1&shareurl=1&pid=01027700001404011242060655G'},
  {id:'cs-entry',place:'cs',title:'计算机学院 · 文甫路入口',caption:'从东南看南翼东端。竖排院名下是玻璃门厅，右手边是转角敞廊。',camera:[12.4,-178.5,313,10],source:'百度街景',url:baidu('01027700001404011205235975G',12725730,4115427,313,10)},
  {id:'cs-south',place:'cs',title:'计算机学院 · 南翼中段',caption:'低层的窗墙退在柱后，上层宽窗下有浅色设备格栅。',camera:[-28.7,-178.2,0,10],source:'百度街景',url:baidu('01027700001404011205135615G',12725680,4115426,0,10)},
  {id:'cs-northwest',place:'cs',title:'计算机学院 · 雪垠路侧',caption:'斜向长立面上是连续的玻璃和格栅，底层保留较多实墙。',camera:[-66.6,-237.1,130,10],source:'百度街景',url:baidu('01027700001404011224035415G',12725634,4115497,130,10)},
  {id:'wenfu-hall',place:'hall',title:'报告厅 · 楼间通道',caption:'两栋白楼之间是暖色墙面和三组高窗。中间的窗下留出了通道，从这里可以走到楼后。',camera:[18.4,-178.5,4,10],source:'百度街景',url:baidu('01027700001404011205250795G',12725738.07,4115427.99,4,10)},
  {id:'software-entry',place:'software',title:'软件学院 · 文甫路入口',caption:'朝西北看，玻璃门厅在东翼靠报告厅的一端。楼角的敞廊叠在入口上方，院牌在路边。',camera:[48.3,-179.3,322,12],source:'百度街景',url:baidu('01027700001404011205325675G',12725774.39,4115428.99,322,12)},
  {id:'software-south',place:'software',title:'软件学院 · 南翼窗墙',caption:'正对教学楼能看清两层高的柱和柱后的小窗，四层宽窗下有浅色格栅。',camera:[67.2,-179,2,12],source:'百度街景',url:baidu('01027700001404011205370765G',12725797.23,4115428.54,2,12)},
  {id:'software-return',place:'software',title:'文甫路东段 · 回望两院',caption:'往西回看，近处是软件学院的路牌和门厅，远处是计算机学院。两翼入口都朝向文甫路，靠近中间的报告厅。',camera:[73.7,-178.8,298,8],source:'百度街景',url:baidu('01027700001404011205385585G',12725805.27,4115428.35,298,8)},
  {id:'software-xueyin',place:'software',title:'软件学院 · 雪垠路一侧',caption:'绕到东北侧，窗墙变成一层基座上连续的玻璃和设备格栅，两段街景都能看到这条长立面。',camera:[81.5,-252.8,215,10],source:'百度街景',url:baidu('01027700001404011226210565G',12725814.83,4115518.52,215,10)},
  {id:'physics-entry',place:'physics',title:'物理实验楼 C 座 · 正门',caption:'从院子走近，左面是红砖上的五排独立窗，右面是深色玻璃。两根砖柱托住门厅挑檐，柱上可见普通物理分中心的牌子。',camera:[-111.2,250.8,4,14],date:'2014年4月',source:'百度街景',url:baidu('01027700001404011302410375G',12725580.5,4114905.94,4,14)},
  {id:'physics-court',place:'physics',title:'物理实验楼 · 院内转角',caption:'面前是锥形报告厅的弧形台阶，向左转就是实验楼入口；三层连楼把两处接在一起。',camera:[-94.4,240.6,49.91,10.42],date:'2014年4月',source:'百度街景',url:baidu('01027700001404011302455145G',12725600.87,4114918.56,49.91,10.42)},
  {id:'physics-cone',place:'physics',title:'物理实验楼 · 锥形报告厅',caption:'从院子东侧可以看到完整锥顶、玻璃与金属条带、环形平台和右侧折返楼梯。',camera:[-62.5,248.4,333,24],date:'2014年4月',source:'百度街景',url:baidu('01027700001404011302530805G',12725639.78,4114909.29,333,24)},
  {id:'physics-north',place:'physics',title:'物理实验楼 C 座 · 背面',caption:'背面是长排独立窗。底层有浅灰墙裙，顶层是浅色窗带和挑出屋面的白柱。',camera:[-130.5,179.9,165,14],date:'2014年4月',source:'百度街景',url:baidu('01027700001404011247225355G',12725556.88,4114991.75,165,14)},
  {id:'teaching-stair',place:'teaching',title:'公共教学楼 · 东侧楼梯',caption:'红砖墙上有成列方孔。透过大开口可以看到折返楼梯；右侧的白色教学楼架在柱上。',camera:[201.4,-107.3,275.93,4.53],date:'2014年4月',source:'百度街景',url:baidu('01027700001404011230315445G',12725960.85,4115342.81,275.93,4.53)},
  {id:'east-gate',place:'east',title:'东大门 · 夷山大街',caption:'从街上向西看，两边的砖墙各开一个圆洞，门岗分列在入口两侧，中间可以直行入校。',camera:[509.5,-77.9,268.36,-.7],date:'2022年6月',source:'百度街景',url:baidu('09027700122206231416048065A',12726336.28,4115321.05,268.36,-.7)},
  {id:'stadium-west',place:'stadium',title:'志义体育场 · 西看台正门',caption:'从中州路向东看，黑底红字馆名在两组入口上方，薄顶棚由外露的三角形钢桁架支撑。',camera:[318.7,-203.0,85.05,4.35],date:'2014年4月',source:'百度街景',url:baidu('01027700001404011206425965G',12726103.59,4115459.92,85.05,4.35)},
  {id:'library-rear',place:'library',title:'图书馆 · 东侧后门',caption:'面向西看，两翼夹着较矮的门厅。宽台阶上方是带窄窗的弧形石墙，薄雨棚与它之间留出一条敞口。',camera:[-65.7,-80.8,264.15,9.09],date:'2014年4月',source:'百度街景',url:baidu('01027700001404011228415665G',12725635.32,4115308.36,264.15,9.09)},
  {id:'teaching-front',place:'teaching',title:'公共教学楼 · 广场正面',caption:'隔着广场往东看，教学楼正面是横向玻璃窗带，两端由红色实墙收住；东侧的楼梯在另一面。',camera:[-63.8,-99.0,97.44,1.69],date:'2014年4月',source:'百度街景',url:baidu('01027700001404011228370575G',12725637.67,4115330.44,97.44,1.69)},
  {id:'pharmacy',place:'pharmacy',title:'药学院 · 院前广场',caption:'花坛里的菱形石雕背后，浅色实墙上有竖排的“药学院”。玻璃门厅从它右侧开始，再向右是横向窗带和通透的屋顶框架。',camera:[-166.2,-450.3,1.51,2.87],date:'2014年4月',source:'百度街景',url:baidu('01027700001404011201025605G',12725512.27,4115755.26,1.51,2.87)},
  {id:'civil',place:'civil',title:'土建学院 · 两翼之间的圆廊',caption:'从东侧上弧形台阶，白柱之间可以穿行。仰头能分辨出两层轮廓：近处是圆形砖檐，后上方另有一条横跨两栋楼的玻璃连桥。',camera:[-118.6,286.5,281.66,-3.58],date:'2014年4月',source:'百度街景',url:baidu('01027700001404011302330355G',12725571.55,4114862.64,281.66,-3.58)},
  {id:'zeng',place:'zeng',title:'曾宪梓楼 · 广场一面',caption:'沿弯路向北看，右前方是曾宪梓楼。白色框架包着灰色窗带和橙红色墙板，一段底层退在柱后。下一站在原地转身看研究生宿舍。',camera:[-358.2,419.9,357.77,7.48],date:'2014年4月',source:'百度街景',url:baidu('01027700001404011311010335G',12725279.79,4114698.82,357.77,7.48)},
  {id:'dorm17',place:'dorm17',title:'17 号研究生宿舍 · 路口',caption:'从看曾宪梓楼的位置转向西南。17 号在道路右侧，左侧是相邻宿舍；继续向右转就能正看 17 号楼端墙。',camera:[-358.2,419.9,195.8,-1.08],date:'2014年4月',source:'百度街景',url:baidu('01027700001404011311010335G',12725279.79,4114698.82,195.8,-1.08)},
  {id:'dorm17-end',place:'dorm17',title:'17 号研究生宿舍 · 白色端墙',caption:'同一机位再向右看，近处这栋是学十七公寓。白墙上只有几列开口，可以分清阳台栏杆和普通窗。',camera:[-358.2,419.9,254,8],date:'2014年4月',source:'百度街景',url:baidu('01027700001404011311010335G',12725279.79,4114698.82,254,8)},
  {id:'clinic',place:'clinic',title:'河大校医院 · 西侧入口',caption:'蓝玻璃上是竖排的“河南大学医院”。门前有折面玻璃雨棚、细柱和宽台阶；上方的玻璃走廊连接两翼。',camera:[-469.3,600.5,105.35,2.55],date:'2014年4月',source:'百度街景',url:baidu('01027700001404011307235135G',12725144.68,4114478.87,105.35,2.55)},
  {id:'autumn-bank',place:'autumn',title:'访秋湖 · 北侧路缘',caption:'实景从路上朝湖看：近处是树列与低篱，远处树丛遮住水面。',camera:[63,23,154,1],source:'百度街景',url:baidu('01027700001404011243330335G',12725792.37,4115183.62,154,1)},
  {id:'jiuzhang',place:'lake',title:'九章路 · 粹庭湖桥',caption:'从桥边向东北看，浅灰色镂空石栏和间隔的方柱勾出桥面边缘。',camera:[113.6,-229.4,38,0],source:'百度街景',url:baidu('01027700001404011226315395G',12725853.26,4115490.24,38,0)},
  {id:'west-gate',place:'west',title:'西大门 · 校名墙',caption:'面向校园中轴。金明西门是低矮的校名石墙，两侧留出通道。',camera:[-485,-76,90,0],source:'校方照片',url:uni}
];

// Physically ordered along the same street, west to east. A turn of the
// camera at the last station looks back over the route, not into a new road.
export const walks=[
  ['文甫路',['cs-south','cs-entry','wenfu-hall','software-entry','software-south','software-return']],
  ['物理实验楼',['physics-entry','physics-court','physics-cone','physics-north']],
  ['广场两面',['library-rear','teaching-front']],
  ['原地转身',['zeng','dorm17','dorm17-end']]
].map(([label,ids])=>({label,stops:ids.map(id=>fieldViews.find(v=>v.id===id))}));

export function mountFieldViews(dialog,visit){
  const list=dialog.querySelector('.field-list');
  for(const item of fieldViews){
    const row=document.createElement('section'),title=document.createElement('h3'),note=document.createElement('p');
    title.textContent=item.title;note.textContent=item.caption;
    const go=document.createElement('button'),source=document.createElement('a');
    go.type='button';go.dataset.view=item.id;go.textContent='到这里看模型';
    go.onclick=()=>{dialog.close();visit(item);};
    source.textContent=item.source+(item.date?' · '+item.date:'')+' ↗';source.href=item.url;source.target='_blank';source.rel='noopener';
    row.append(title,note,go,source);list.append(row);
  }
  dialog.querySelector('[data-close]').onclick=()=>dialog.close();
  return (place,id)=>{
    dialog.showModal();
    const index=fieldViews.findIndex(v=>id?v.id===id:place&&v.place===place);
    for(const [i,row] of [...list.children].entries())row.toggleAttribute('data-current',i===index);
    list.scrollTop=0;
    if(index>=0)list.children[index].scrollIntoView({block:'start'});
  };
}
