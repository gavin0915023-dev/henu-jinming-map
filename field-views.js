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
  {id:'software-entry',place:'software',title:'软件学院 · 文甫路入口',caption:'朝西北看，玻璃门厅在东翼靠报告厅的一端。楼角的敞廊叠在入口上方。旧街景里的路边立牌现已拆除。',camera:[48.3,-179.3,322,12],source:'百度街景',url:baidu('01027700001404011205325675G',12725774.39,4115428.99,322,12)},
  {id:'software-south',place:'software',title:'软件学院 · 南翼窗墙',caption:'正对教学楼能看清两层高的柱和柱后的小窗，四层宽窗下有浅色格栅。',camera:[67.2,-179,2,12],source:'百度街景',url:baidu('01027700001404011205370765G',12725797.23,4115428.54,2,12)},
  {id:'software-return',place:'software',title:'文甫路东段 · 回望两院',caption:'往西回看，近处是软件学院的门厅，远处是计算机学院。两翼入口都朝向文甫路，靠近中间的报告厅。',camera:[73.7,-178.8,298,8],source:'百度街景',url:baidu('01027700001404011205385585G',12725805.27,4115428.35,298,8)},
  {id:'software-xueyin',place:'software',title:'软件学院 · 雪垠路一侧',caption:'绕到东北侧，窗墙变成一层基座上连续的玻璃和设备格栅，两段街景都能看到这条长立面。',camera:[81.5,-252.8,215,10],source:'百度街景',url:baidu('01027700001404011226210565G',12725814.83,4115518.52,215,10)},
  {id:'physics-entry',place:'physics',title:'物理实验楼 C 座 · 正门',caption:'从院子走近，左面是红砖上的五排独立窗，右面是深色玻璃。两根砖柱托住门厅挑檐，柱上可见普通物理分中心的牌子。',camera:[-111.2,250.8,4,14],date:'2014年4月',source:'百度街景',url:baidu('01027700001404011302410375G',12725580.5,4114905.94,4,14)},
  {id:'physics-court',place:'physics',title:'物理实验楼 · 院内转角',caption:'面前是锥形报告厅的弧形台阶，向左转就是实验楼入口；三层连楼把两处接在一起。',camera:[-94.4,240.6,49.91,10.42],date:'2014年4月',source:'百度街景',url:baidu('01027700001404011302455145G',12725600.87,4114918.56,49.91,10.42)},
  {id:'physics-cone',place:'physics',title:'物理实验楼 · 锥形报告厅',caption:'从院子东侧可以看到完整锥顶、玻璃与金属条带、环形平台和右侧折返楼梯。',camera:[-62.5,248.4,333,24],date:'2014年4月',source:'百度街景',url:baidu('01027700001404011302530805G',12725639.78,4114909.29,333,24)},
  {id:'physics-north',place:'physics',title:'物理实验楼 C 座 · 背面',caption:'背面是长排独立窗。底层有浅灰墙裙，顶层是浅色窗带和挑出屋面的白柱。',camera:[-130.5,179.9,165,14],date:'2014年4月',source:'百度街景',url:baidu('01027700001404011247225355G',12725556.88,4114991.75,165,14)},
  {id:'teaching-stair',place:'teaching',title:'公共教学楼 · 东侧楼梯',caption:'红砖墙上有成列方孔。透过大开口可以看到折返楼梯；右侧的白色教学楼架在柱上。',camera:[201.4,-107.3,275.93,4.53],date:'2014年4月',source:'百度街景',url:baidu('01027700001404011230315445G',12725960.85,4115342.81,275.93,4.53)},
  {id:'teaching-23',place:'teaching',wings:['b-712688925','b-712688926'],title:'2、3 号教学楼 · 东侧院口',caption:'面向西北，白色遮阳板和架空柱在左，右边是开方孔的红砖楼梯塔。往前能从二层红色连廊下走进两栋楼之间。',camera:[195.96,-24.06,295.07,8.78],lens:{horizontal:85,eye:2.32},date:'2014年4月',source:'百度街景',url:baidu('01027700001404011230120335G',12725954.35,4115241.98,295.07,8.78)},
  {id:'teaching-56',place:'teaching',wings:['b-712688927','b-712688929'],title:'5、6 号教学楼 · 东侧院口',caption:'从北院口往西看，红砖楼梯塔换到左侧，右侧是带多排遮阳板的白翼。两座院口用相似的构件，开间、步梯和通行位置各有区别。',camera:[200.78,-120.37,279.39,10.33],lens:{horizontal:85,eye:2.32},date:'2014年4月',source:'百度街景',url:baidu('01027700001404011230345435G',12725960.07,4115358.73,279.39,10.33)},
  {id:'east-gate',place:'east',title:'东大门 · 夷山大街',caption:'从街上向西看，两边的砖墙各开一个圆洞，门岗分列在入口两侧，中间可以直行入校。',camera:[509.5,-77.9,268.36,-.7],date:'2022年6月',source:'百度街景',url:baidu('09027700122206231416048065A',12726336.28,4115321.05,268.36,-.7)},
  {id:'stadium-west',place:'stadium',title:'志义体育场 · 西看台正门',caption:'从中州路向东看，黑底红字馆名在两组入口上方，薄顶棚由外露的三角形钢桁架支撑。',camera:[318.7,-203.0,85.05,4.35],date:'2014年4月',source:'百度街景',url:baidu('01027700001404011206425965G',12726103.59,4115459.92,85.05,4.35)},
  {id:'stadium-field',place:'stadium',title:'志义体育场 · 夷山大街望看台',caption:'按分享的方向朝西北看：路树与围栏后面是阶梯，罩棚只盖住中间的深蓝区。左侧从暗红、米黄过渡到绿色，右侧是浅青、紫红和赭黄。',camera:[513.8,-171.5,292.75,5.3],lens:{horizontal:86,eye:2.32},date:'2022年6月',source:'百度街景',url:baidu('09027700122206231415580505A',12726341.44,4115423.69,292.75,5.3)},
  {id:'stadium-field-north',place:'stadium',title:'志义体育场 · 北段斜看罩棚',caption:'沿夷山大街向北换一个位置，透过树间空隙可以分清顶棚前缘、棚下的桁架与细柱，以及一侧顺坡收低的浅色边墙。',camera:[517.2,-237.2,258.5,4],lens:{horizontal:66,eye:2.32},date:'2022年6月',source:'百度街景',url:baidu('09027700122206231415533445A',12726345.53,4115503.26,258.5,4)},
  {id:'stadium-track',place:'stadium',title:'志义体育场 · 跑道边模型近看',caption:'这是场内的模型位置。面前的浅色步阶通向看台上层，向右转可看蓝区上方的桁架。参考照片拍自夷山大街，未使用场内实拍机位。',camera:[393.9,-169.35,269.71,12],lens:{horizontal:93},source:'街外实拍参照',url:baidu('09027700122206231415533445A',12726345.53,4115503.26,258.5,4)},
  {id:'library-rear',place:'library',title:'图书馆 · 东侧后门',caption:'面向西看，两翼夹着较矮的门厅。宽台阶上方是带窄窗的弧形石墙，薄雨棚与它之间留出一条敞口。',camera:[-65.7,-80.8,264.15,9.09],date:'2014年4月',source:'百度街景',url:baidu('01027700001404011228415665G',12725635.32,4115308.36,264.15,9.09)},
  {id:'teaching-front',place:'teaching',title:'公共教学楼 · 广场正面',caption:'隔着广场往东看，教学楼正面是横向玻璃窗带，两端由红色实墙收住；东侧的楼梯在另一面。',camera:[-63.8,-99.0,97.44,1.69],date:'2014年4月',source:'百度街景',url:baidu('01027700001404011228370575G',12725637.67,4115330.44,97.44,1.69)},
  {id:'pharmacy',place:'pharmacy',title:'药学院 · 院前广场',caption:'花坛里的菱形石雕背后，浅色实墙上有竖排的“药学院”。玻璃门厅从它右侧开始，再向右是横向窗带和通透的屋顶框架。',camera:[-166.2,-450.3,1.51,2.87],date:'2014年4月',source:'百度街景',url:baidu('01027700001404011201025605G',12725512.27,4115755.26,1.51,2.87)},
  {id:'civil',place:'civil',title:'土建学院 · 两翼之间的圆廊',caption:'从东侧上弧形台阶，白柱之间可以穿行。仰头能分辨出两层轮廓：近处是圆形砖檐，后上方另有一条横跨两栋楼的玻璃连桥。',camera:[-118.6,286.5,281.66,-3.58],date:'2014年4月',source:'百度街景',url:baidu('01027700001404011302330355G',12725571.55,4114862.64,281.66,-3.58)},
  {id:'zeng',place:'zeng',title:'曾宪梓楼 · 广场一面',caption:'沿弯路向北看，右前方是曾宪梓楼。白色框架包着灰色窗带和橙红色墙板，一段底层退在柱后。下一站在原地转身看研究生宿舍。',camera:[-358.2,419.9,357.77,7.48],date:'2014年4月',source:'百度街景',url:baidu('01027700001404011311010335G',12725279.79,4114698.82,357.77,7.48)},
  {id:'dorm17',place:'dorm17',title:'17 号研究生宿舍 · 路口',caption:'从看曾宪梓楼的位置转向西南。17 号在道路右侧，左侧是相邻宿舍；继续向右转就能正看 17 号楼端墙。',camera:[-358.2,419.9,195.8,-1.08],date:'2014年4月',source:'百度街景',url:baidu('01027700001404011311010335G',12725279.79,4114698.82,195.8,-1.08)},
  {id:'dorm17-end',place:'dorm17',title:'17 号研究生宿舍 · 白色端墙',caption:'同一机位再向右看，近处这栋是学十七公寓。白墙上只有几列开口，可以分清阳台栏杆和普通窗。',camera:[-358.2,419.9,254,8],date:'2014年4月',source:'百度街景',url:baidu('01027700001404011311010335G',12725279.79,4114698.82,254,8)},
  {id:'clinic',place:'clinic',title:'河大校医院 · 西侧入口',caption:'蓝玻璃上是竖排的“河南大学医院”。门前有折面玻璃雨棚、细柱和宽台阶；上方的玻璃走廊连接两翼。',camera:[-469.3,600.5,105.35,2.55],date:'2014年4月',source:'百度街景',url:baidu('01027700001404011307235135G',12725144.68,4114478.87,105.35,2.55)},
  {id:'jiaoyuan-door',place:'jiaoyuan',title:'教苑餐厅 · 西侧转角入口',caption:'从小广场看过去，橙红色窗下墙沿楼角折过去，蓝牌和门却只在朝西的短墙上。2014 年的蓝牌写着“河南大学民族餐厅”。',camera:[-283.5,444.9,69,9],date:'2014年4月',source:'百度街景',url:baidu('01027700001404011312000705G',12725370.81,4114669.20,69,9)},
  {id:'jiaoyuan-side',place:'jiaoyuan',title:'教苑餐厅 · 南侧窗墙',caption:'绕到南侧近看，底层大窗前是金属竖栅，下面保留橙色墙板。这里没有西门的蓝牌或入口。',camera:[-239.4,455.0,5,7],date:'2014年4月',source:'百度街景',url:baidu('01027700001404011314525685G',12725424.55,4114657.30,5,7)},
  {id:'beiyuan-court',place:'beiyuan',title:'北苑餐厅 · 中州路前场',caption:'沿铺地的灰色条带望向浅色餐厅，中段是带细柱的门廊和两层高窗，右侧改成了间隔较大的方窗。',camera:[306,-396.1,40,7],date:'2014年4月',source:'百度街景',url:baidu('01027700001404011207290685G',12726087.78,4115693.87,40,7)},
  {id:'beiyuan-stair',place:'beiyuan',title:'北苑餐厅 · 西侧外梯',caption:'沿中州路再往西北看，常青树后可辨认独立的室外楼梯，向左上方的侧翼平台抬升。两端的屋顶比中段高。',camera:[294.8,-406.8,59,13],date:'2014年4月',source:'百度街景',url:baidu('01027700001404011207330615G',12726074.12,4115706.7,59,13)},
  {id:'education-west',place:'education',title:'田家炳教育书院 · 西院连廊',caption:'白色墙块下面是敞口；旁边两层有栏杆的连廊越过院子。可以走到红砖塔旁，从廊下望向另一面。',camera:[211.2,-302.7,100,11],date:'2014年4月',source:'百度街景',url:baidu('01027700001404011219135535G',12725972.51,4115579.83,100,11)},
  {id:'education-clock',place:'education',title:'田家炳教育书院 · 仰看钟塔',caption:'往后站、抬头看：塔的窄面是深色玻璃，红砖宽面在上部托着一圈单独的刻度和指针。',camera:[197.2,-298.5,92,32],date:'2014年4月',source:'百度街景',url:baidu('01027700001404011219090605G',12725955.44,4115574.5,92,32)},
  {id:'education-east',place:'education',title:'田家炳教育书院 · 东院回望',caption:'从中州路往西看，能同时看到两翼、灰白墙块上的两道窄窗，以及连廊顶板中央让天光落下的开口。',camera:[317.4,-290.7,270,8],date:'2014年4月',source:'百度街景',url:baidu('01027700001404011207030625G',12726101.93,4115566.26,270,8)},
  {id:'geography-south',place:'geography',title:'地理楼 · 南侧林带',caption:'行道树后是成对开窗的红砖长墙。左端能看到弧形玻璃和伸出墙面的白色平台，近处有一排低篱。',camera:[-81.5,363.7,15,10],date:'2014年4月',source:'百度街景',url:baidu('01027700001404011235495215G',12725616.93,4114769.49,15,10)},
  {id:'geography-curve',place:'geography',title:'地理楼 · 西南弧窗',caption:'沿南侧道路往西几步再抬头，楼角连续的玻璃和一层层白色挑台从红砖墙前凸出来。',camera:[-100,363.2,21,9],date:'2014年4月',source:'百度街景',url:baidu('01027700001404011235540925G',12725594.31,4114769.86,21,9)},
  {id:'geography-north',place:'geography',title:'地理楼 · 北侧砖窗',caption:'从北边小路近看，每一组窗之间留着红砖墙，短短的浅色横条和竖条相互断开，底部换成了灰色墙裙。',camera:[-68.4,299.8,175,12],date:'2014年4月',source:'百度街景',url:baidu('01027700001404011302135825G',12725632.79,4114847.04,175,12)},
  {id:'autumn-bank',place:'autumn',title:'访秋湖 · 北侧路缘',caption:'实景从路上朝湖看：近处是树列与低篱，远处树丛遮住水面。',camera:[63,23,154,1],source:'百度街景',url:baidu('01027700001404011243330335G',12725792.37,4115183.62,154,1)},
  {id:'jiuzhang',place:'campus-bridge',title:'九章路 · 教学区石桥',caption:'从桥边向东北看，浅灰色镂空石栏和间隔的方柱勾出桥面边缘。这座教学区石桥与经济学院北面的粹庭湖是两处地点。',camera:[113.6,-229.4,38,0],source:'百度街景',url:baidu('01027700001404011226315395G',12725853.26,4115490.24,38,0)},
  {id:'north-gate',place:'north',title:'北大门 · 东京大道',caption:'站在东京大道朝南看，金色校名在低石墙上，两侧有入校通道。校方校门照片也能看清字色和石墙的比例。',camera:[11.9,-633.5,167,3],date:'2022年6月',source:'百度街景',url:baidu('09027700122206251154436776P',12725728.95,4115978.76,167,3)},
  {id:'north-gate-in',place:'north',title:'北大门 · 入校回望',caption:'从校内往北回望，先看到一小片绿篱，再看到石墙背面。这个方向的原照拍摄较早。',camera:[19,-576.5,355,4],date:'2014年4月',source:'百度街景',url:baidu('01027700001404011213040405G',12725737.78,4115909.74,355,4)},
  {id:'marco-approach',place:'marco',title:'马可广场 · 西侧步道',caption:'从西边穿过绿篱之间的步道，地面上只能望见低处广场的一部分。可选“东侧俯看”看清全貌。',camera:[-61.8,-38.5,64,4],date:'2014年4月',source:'百度街景',url:baidu('01027700001404011228520495G',12725640.17,4115257.02,64,4)},
  {id:'marco-bowl',place:'marco',title:'马可广场 · 东侧俯看',caption:'从东侧高处朝图书馆方向看，放射状深色石带与几圈同心铺地收在下沉广场里。此模型视角参照校方俯拍，拍摄高度为估计。',orbit:[[120,48,-76.5],[4,2,-76.5]],source:'校方俯拍',url:'https://zbcg.henu.edu.cn/uEditorFile/ueditor/upload/image/20240110/1704854320384040625.jpg'},
  {id:'cuiting-bank',place:'lake',title:'粹庭湖 · 西端柳岸',caption:'从雪垠路旁向东看，窄小的岸路夹在树和水面之间。垂枝向水边伸下去，硬质岸沿跟着湖形转弯。',camera:[83.7,-446.3,85,4],date:'2014年4月',source:'百度街景',url:baidu('01027700001404011220385385G',12725816.79,4115752.62,85,4)},
  {id:'cuiting-north',place:'lake',title:'粹庭湖 · 北路望湖',caption:'从北面的路向东南看，中间隔着低篱、行道树和灌木，水面不像西端小径那样一览无余。',camera:[123.4,-481.4,158,5],date:'2014年4月',source:'百度街景',url:baidu('01027700001404011208190505G',12725865.11,4115795.45,158,5)},
  {id:'office-north',place:'office',title:'办公楼 · 北侧外廊',caption:'沿弧形外廊转过去，浅色楼板突出于深色窗带，外面还有一道细栏杆。旁边平直的翼墙则是间隔开的窗。',camera:[-344.3,-13.9,204,8],date:'2014年4月',source:'百度街景',url:baidu('01027700001404011238110455G',12725295.94,4115224.52,204,8)},
  {id:'office-south',place:'office',title:'办公楼 · 南门雨棚',caption:'从正南近看，台阶正对有柱子的门厅，几道突出的挑梁托起薄玻璃雨棚。上面成排的窗格与北面的敞廊不同。',camera:[-360.4,81.6,0,13],date:'2014年4月',source:'百度街景',url:baidu('01027700001404011240515745G',12725276.48,4115108.64,0,13)},
  {id:'tennis-west',place:'east-courts',title:'东南运动区 · 网球场西侧',caption:'隔着绿色高网往东看，蓝灰色球区外留着一圈绿色场地。双头灯高出围网，球场中间的球网低得多。',camera:[111.4,292,95,3],date:'2014年4月',source:'百度街景',url:baidu('01027700001404011258395545G',12725851.8,4114858.13,95,3)},
  {id:'hoops-south',place:'east-courts',title:'东南运动区 · 篮球场南口',caption:'从路边朝北看，蓝色弯臂球架立在灰色场地边缘。近处是水泥矮基上的绿网，右边留有能直接走进球场的开口。',camera:[222.5,401.8,0,3],date:'2014年4月',source:'百度街景',url:baidu('01027700001404011254430805G',12725987.43,4114726.17,0,3)},
  {id:'nanyuan-east',place:'nanyuan',title:'南苑餐厅 · 东侧餐厅名',caption:'前场上能读出二层长廊前的金字“南苑餐厅”。两侧的竖向墙板夹着内收的玻璃和折线屋顶。',camera:[-203.5,595,268,9],date:'2014年4月',source:'百度街景',url:baidu('01027700001404011305475415G',12725468.55,4114488.07,268,9)},
  {id:'nanyuan-south',place:'nanyuan',title:'南苑餐厅 · 南侧弧檐',caption:'绕到南面，弧形白檐几乎占满视野。檐下有独立方柱，上方是露天的细钢架，和东侧的金字长廊不同。',camera:[-259.3,641.1,350,8],date:'2014年4月',source:'百度街景',url:baidu('01027700001404011306165575G',12725400.69,4114431.6,350,8)},
  {id:'economics-west',place:'b-712688902',title:'经济学院 · 西端退台',caption:'从雪垠路向东看，左侧翼楼的白色窗廊逐层退后，红砖侧墙之间的高挑檐留着圆孔。右侧低砖楼是相邻建筑。',camera:[73.6,-394.6,89.4,11],lens:{horizontal:80,eye:2.32},date:'2014年4月',source:'百度街景',url:baidu('01027700001404011220505535G',12725804.6,4115689.82,89.4,11)},
  {id:'economics-east',place:'b-712688902',title:'经济学院 · 东端玻璃立面',caption:'从院子向西回看，楼端高窗夹在两片红砖墙之间；此处没有西端的退台。',camera:[228.9,-376.6,272.4,9],lens:{horizontal:69,eye:2.32},date:'2014年4月',source:'百度街景',url:baidu('01027700001404011218425405G',12725993.95,4115669.54,272.4,9)},
  {id:'math-lake',place:'b-712688900',title:'数学与信息科学学院 · 临水窗带',caption:'透过花树看南立面：中段是按层分开的浅色长窗，左边的暖黄色墙段只开短窗，最上面是一道红檐。',camera:[97.8,-241.4,23.1,9],lens:{horizontal:78,eye:2.32},date:'2014年4月',source:'百度街景',url:baidu('01027700001404011226255645G',12725834.38,4115504.47,23.1,9)},
  {id:'math-west',place:'b-712688900',title:'数学与信息科学学院 · 水渠旁西端',caption:'换到西侧沿渠朝东看，近端的白色露台错开，后面是红墙和窄高的屋顶框架。',camera:[54,-295.3,87.1,12],lens:{horizontal:72,eye:2.32},date:'2014年4月',source:'百度街景',url:baidu('01027700001404011221155915G',12725780.94,4115569.3,87.1,12)},
  {id:'life-door',place:'b-716761653',aliases:'生命科学学院',title:'生命科学院 · 西南侧门',caption:'台阶尽头的侧门退进浅色墙身，上方各层的楼梯间窗也在凹口里。门左是整片实墙，右面才是实验楼的窗列。',camera:[349.6,-485.3,10.9,16],lens:{horizontal:92,eye:2.32},date:'2014年4月',source:'百度街景',url:baidu('01027700001404011217545635G',12726140.76,4115802.39,10.9,16)},
  {id:'life-wing',place:'b-716761653',title:'生命科学院 · 南翼沿路',caption:'向东沿楼看，浅色面砖上间隔开窗，窗下可见分散的设备挑板。楼角的入口和长墙的窗间距不同。',camera:[334.3,-484.7,64.1,11],lens:{horizontal:74,eye:2.32},date:'2014年4月',source:'百度街景',url:baidu('01027700001404011217585645G',12726122.2,4115801.45,64.1,11)},
  {id:'huayuan-roof',place:'b-712688853',title:'华苑餐厅 · 屋面俯看',caption:'中央深色屋面、北侧浅色矩形和东侧窄长屋面在卫星影像上可分辨。附近街景被宿舍和商铺挡住，尚未核实餐厅的门窗。',orbit:[[192,102,504],[154.8,20,463.4]],action:'俯看餐厅模型',reference:'卫星对照',source:'Esri 卫星影像',url:'https://www.arcgis.com/apps/mapviewer/index.html?basemapUrl=https%3A%2F%2Fserver.arcgisonline.com%2FArcGIS%2Frest%2Fservices%2FWorld_Imagery%2FMapServer&center=114.305044,34.813887&level=18'},
  {id:'dongyuan-22',place:'b-712688795',title:'东苑学二十二公寓 · 南侧转角',caption:'从夷山大街向东北看。灰褐色山墙只开一列白框窗；转过楼角，宽阳台窗与带小窗的凸墙交替，楼梯间伸出一片薄顶。前面的低层铺面不是宿舍阳台。',camera:[503.9,301.6,54,23],lens:{horizontal:68,eye:2.32},date:'2022年6月',source:'百度街景',url:baidu('09027700122206231400097765A',12726330.18,4114850.31,54,23)},
  {id:'dongyuan-20',place:'b-712688787',title:'东苑学二十公寓 · 临街山墙',caption:'正对夷山大街的一端，两大片实墙夹着一列窗。沿街店面只占下部，上层外墙没有连成一片的窗带。',camera:[500.7,364.9,78,13],lens:{horizontal:72,eye:2.32},date:'2022年6月',source:'百度街景',url:baidu('09027700122206231400032595A',12726326.39,4114773.5,78,13)},
  {id:'dongyuan-19',place:'b-712688783',title:'东苑学十九公寓 · 北侧窗间',caption:'从街口越过低层铺面，可辨认浅弧形挑檐、成组的阳台窗和中间的窄窗。此处为2014年早春街景；模型的灰褐色外墙参照2022年沿街影像。',camera:[498.7,365.4,127,17],lens:{horizontal:70,eye:2.32},date:'2014年3月',source:'百度街景',url:baidu('01027700001403281306443605N',12726323.93,4114772.92,127,17)},
  {id:'dongyuan-courts',place:'b-712688794',title:'东苑学生公寓 · 两列八栋',caption:'西侧从南往北是学十九至学二十二公寓，东侧是学二十三至学二十六公寓。北排两栋各有错开的两翼；其余楼之间留着横巷。东排屋面的深浅分区可从卫星影像核对，院内立面为近似。',orbit:[[551,204,568],[631,8,338]],action:'俯看东苑八栋',reference:'卫星对照',source:'Esri 卫星影像',url:'https://www.arcgis.com/apps/mapviewer/index.html?basemapUrl=https%3A%2F%2Fserver.arcgisonline.com%2FArcGIS%2Frest%2Fservices%2FWorld_Imagery%2FMapServer&center=114.31025,34.8150&level=18'},
  {id:'west-gate',place:'west',title:'西大门 · 校名墙',caption:'面向校园中轴。金明西门是低矮的校名石墙，两侧留出通道。',camera:[-485,-76,90,0],source:'校方照片',url:uni}
];

// Physically ordered along the same street, west to east. A turn of the
// camera at the last station looks back over the route, not into a new road.
export const walks=[
  ['文甫路',['cs-south','cs-entry','wenfu-hall','software-entry','software-south','software-return']],
  ['物理实验楼',['physics-entry','physics-court','physics-cone','physics-north']],
  ['志义体育场',['stadium-field-north','stadium-field','stadium-track','stadium-west']],
  ['教学楼东院',['teaching-23','teaching-stair','teaching-56']],
  ['广场两面',['library-rear','teaching-front']],
  ['原地转身',['zeng','dorm17','dorm17-end']],
  ['教苑餐厅',['jiaoyuan-door','jiaoyuan-side']],
  ['北苑餐厅',['beiyuan-court','beiyuan-stair']],
  ['书院两面',['education-west','education-clock','education-east']],
  ['地理楼',['geography-south','geography-curve','geography-north']],
  ['北门内外',['north-gate','north-gate-in']],['粹庭湖岸',['cuiting-bank','cuiting-north']],
  ['办公楼两面',['office-north','office-south']],['东南运动区',['tennis-west','hoops-south']],
  ['南苑餐厅',['nanyuan-east','nanyuan-south']],
  ['经济学院两端',['economics-west','economics-east']],['数学楼两面',['math-lake','math-west']],['生命科学院南翼',['life-door','life-wing']],
  ['东苑公寓',['dongyuan-22','dongyuan-20','dongyuan-19','dongyuan-courts']]
].map(([label,ids])=>({label,stops:ids.map(id=>fieldViews.find(v=>v.id===id))}));

export function mountFieldViews(dialog,visit){
  const list=dialog.querySelector('.field-list'),select=dialog.querySelector('[data-region]');
  const areas=[
    ['中轴与校门',['west','north','east','library','marco','office']],
    ['北部学院与湖区',['pharmacy','education','beiyuan','lake','campus-bridge','b-712688902','b-712688900','b-716761653']],
    ['文甫路与公共教学区',['cs','hall','software','teaching','autumn']],
    ['体育场与球场',['stadium','east-courts']],
    ['南部学院与生活区',['physics','civil','geography','zeng','dorm17','clinic','jiaoyuan','nanyuan','b-712688853']],
    ['东苑学生公寓',['b-712688795','b-712688787','b-712688783','b-712688794']]
  ];
  const area=v=>areas.find(([,ids])=>ids.includes(v.place))?.[0]??areas[0][0];
  for(const name of ['',...areas.map(a=>a[0])])select.add(new Option((name||'全校')+'（'+fieldViews.filter(v=>!name||name===area(v)).length+'）',name));
  for(const item of fieldViews){
    const row=document.createElement('section'),title=document.createElement('h3'),note=document.createElement('p');
    title.textContent=item.title;note.textContent=item.caption;
    const go=document.createElement('button'),source=document.createElement('a');
    row.dataset.area=area(item);go.type='button';go.dataset.view=item.id;go.textContent=item.action??(item.orbit?'俯看广场模型':'到这里看模型');
    go.onclick=()=>{dialog.close();visit(item);};
    source.textContent=item.source+(item.date?' · '+item.date:'')+' ↗';source.href=item.url;source.target='_blank';source.rel='noopener';
    row.append(title,note,go,source);list.append(row);
  }
  const filter=()=>{for(const row of list.children)row.hidden=Boolean(select.value)&&select.value!==row.dataset.area;list.scrollTop=0;};
  select.onchange=filter;
  dialog.querySelector('[data-close]').onclick=()=>dialog.close();
  return (place,id)=>{
    select.value='';filter();dialog.showModal();
    const index=fieldViews.findIndex(v=>id?v.id===id:place&&(v.place===place||v.wings?.includes(place)));
    for(const [i,row] of [...list.children].entries())row.toggleAttribute('data-current',i===index);
    list.scrollTop=0;
    if(index>=0)list.children[index].scrollIntoView({block:'start'});
  };
}
