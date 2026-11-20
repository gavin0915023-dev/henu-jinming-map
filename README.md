# 校园精细化模型

在所提供的校园数据和 Three.js 查看器基础上增加程序化建筑与景观细节。模型使用原有建筑轮廓和高度；窗格、屋顶设施、入口与环境小品为示意建模，不代表实测竣工信息。

## 运行

在此目录打开终端，执行：

```powershell
node server.mjs
```

浏览器打开 <http://127.0.0.1:4173>。模型和本地依赖可以离线加载；卫星影像、校方照片和来源链接需要联网。请通过本地 HTTP 服务打开，浏览器直接双击 HTML 可能会拦截模块和 JSON 加载。

## 查看细节

- 在左侧选择图书馆或教学楼，滚轮继续放大。
- 按住鼠标左键旋转，右键平移；工具栏可回到全景。
- 点击“地面漫游”，拖动视野，用 WASD / 方向键行走，也可使用屏幕前进、后退按钮。
- 点击地图右侧的相机可选十二个“实景取景点”。每处都有模型视角和对应的百度全景或校方照片，也可以直接分享地址。文甫路的六站按由西向东排列：“上一站 / 下一站”切换实拍机位，“前进 / 后退”和拖动可在模型中自由走动、环顾。机位与实拍近似对齐。
- 在图书馆前可看两侧内收的玻璃幕墙、雨棚和上方的金色馆名，并与“实景参考”里的校方照片对照。明德广场中轴按原始道路数据作为步行铺地，不设机动车中心线。
- 选“粹庭湖”可俯看绿化布局；在地面漫游中能看到分枝、叶簇和路边刷白的树干。也可单独打开[三种校园树形对照](https://gavin0915023-dev.github.io/henu-jinming-map/verification/tree-study.html)。树形和种植位置是示意，不是逐株测绘。
- 不支持 WebGL 2 的设备会使用二维画布兼容渲染，仅显示基础体块和简化立面。

## 文件

- `model.js`：原场景整合、种植位置、光照与阴影。
- `tree-model.js`：三类树形的分枝、树冠与本地生成的叶簇纹理，同形树共用几何。
- `daylight.js` / `ground-surfaces.js`：生成日光天空、墙脚和树下的柔影，以及近景地面纹理。玻璃和水面的反光来自同一片静态天空，并非实时反射周围楼宇。
- `building-detail.js`：窗框、玻璃、窗台、层间带、女儿墙、屋顶与入口构件。
- `landscape-detail.js`：运动场、道路设施、桥栏、湖岸与水面。
- `avenue.js` / `field-ground.js` / `west-gate.js`：伯襄路的路面和种植、学院门前铺地、湖边灌木、湖桥与西大门校名墙。
- `field-views.js`：实景取景点、步行相机和各自的外部图片来源。
- `wenfu.js`：报告厅的可通行门洞、临街玻璃分组和软件学院独立院牌定位；几何体也供步行碰撞和兼容渲染使用。
- `facade.js` / `software.js`：配套的图书馆西立面与兼容渲染器。
- `assets/`：原始校园 JSON、Three.js、OrbitControls 与地图依赖。
- `index.html` / `viewer.css` / `main.js`：完整的本地查看界面。

若将改动接入原页面，请将上述场景模块与 `model.js` 放在同一目录，并保留 `assets/OrbitControls.js` 和 `three` 的 import map。

## 实拍参考细化

图书馆西入口增加了分段弧形雨棚、细柱、台阶、门框、幕墙分格与屋顶挑檐，构件合批渲染。
参考学校公开的[图书馆建设资料](https://jjc.henu.edu.cn/info/1004/1002.htm)和[校园照片](https://zbcg.henu.edu.cn/xwtz/5707.chtml)。尺寸与细节为照片辅助下的示意建模，未经实地测绘。

| 模型取景点 | 实景支持的细节 |
| --- | --- |
| [伯襄路](https://gavin0915023-dev.github.io/henu-jinming-map/?view=boxiang) | 用户分享的朝东视角。浅灰色路面没有中央隔离带，两侧是刷白的行道树和低篱；路缘在交叉口断开。 |
| 计算机与信息工程学院：[文甫路入口](https://gavin0915023-dev.github.io/henu-jinming-map/?view=cs-entry)、[南翼中段](https://gavin0915023-dev.github.io/henu-jinming-map/?view=cs-south)、[雪垠路侧](https://gavin0915023-dev.github.io/henu-jinming-map/?view=cs-northwest) | 结合多个方向的百度街景和[金明校区平面图](https://www.henu.edu.cn/images/jmxq.jpg)，将入口定位到西侧楼体的南翼东端。入口上方有两列竖排金字，东端是转角敞廊；中段有两层高的柱，雪垠路一侧的底层实墙更多。 |
| [访秋湖北侧路缘](https://gavin0915023-dev.github.io/henu-jinming-map/?view=autumn-bank) | 朝湖看时，近处是沿路树列和低篱。原取景点的水面被植被遮挡。 |
| [九章路 · 粹庭湖桥](https://gavin0915023-dev.github.io/henu-jinming-map/?view=jiuzhang) | 桥缘有浅色镂空石栏和方柱，对岸可辨认的两段坡岸做了浅色护坡。 |
| [西大门](https://gavin0915023-dev.github.io/henu-jinming-map/?view=west-gate) | 参考[校方校门照片](https://ganbu.henu.edu.cn/info/1036/4225.htm)和[西侧中轴航拍](https://zbcg.henu.edu.cn/xwtz/5707.chtml)。低矮校名墙面向金明大道，两边留出通道。 |
| [报告厅 · 楼间通道](https://gavin0915023-dev.github.io/henu-jinming-map/?view=wenfu-hall) | 文甫路正面和向西北回望两处街景显示：靠街部分低于白色教学楼，暖色面砖上分三组高窗，中央下部可望见楼后。模型保留原始轮廓并留出可步行的通道；临街高度、净宽与进深为估计，后部体量沿用原数据的估高。 |
| 软件学院：[入口](https://gavin0915023-dev.github.io/henu-jinming-map/?view=software-entry)、[正看南翼](https://gavin0915023-dev.github.io/henu-jinming-map/?view=software-south)、[向西回望](https://gavin0915023-dev.github.io/henu-jinming-map/?view=software-return)、[雪垠路一侧](https://gavin0915023-dev.github.io/henu-jinming-map/?view=software-xueyin) | 入口靠报告厅，红字院牌在路边。南翼临街上部是窗墙与格栅，下部两层退在柱后；雪垠路侧是一层基座，上面有连续格栅和设备。未核实的内院墙面仍为示意。 |

本次沿文甫路按百度相邻机位依次核对了 `01027700001404011205250795G`、`01027700001404011205270925G`、`01027700001404011205325675G`、`01027700001404011205370765G`、`01027700001404011205385585G`，另从雪垠路 `01027700001404011226210565G` 和 `01027700001404011226255645G` 回看东北侧。七处均为 2014 年 4 月的街景，模型中选取了其中五处作为可分享的取景点。

部分百度街景拍于 2014 年 4 月。尺寸、窗扇数量、植株间距是根据照片与已有轮廓作的估计；没有足够依据的立面仍用简化模型。比如药学院的外观还未与原始建筑轮廓可靠对应，未套用到其他教学楼。模型不包含百度街景图片，原图经取景点的来源链接打开。

## 检查命令

卫星图直接请求 Esri 影像瓦片，单张失败或超时后尝试备用地址，缩放与拖动后仍会自动重试缺失瓦片。缺图区域显示校园平面示意，可继续查询地点；两个地址均失败时可点击“重试影像”。正常网络检查可执行 `$env:CHECK_SATELLITE='1'; node verification/verify.mjs`；将值改为 `faults` 可模拟单个地址失败、部分缺图和服务断开，改为 `deployed` 可检查已发布页面的真实影像请求。

```powershell
node verification/verify.mjs
```

验证脚本使用本机 Chrome 或 Edge 的无界面模式，不需要安装 npm 依赖。结果与全景、建筑近景、漫游、移动端截图保存在 `verification/`。也可通过 `CHROME_PATH` 指定浏览器路径。

浏览器自动检查需要 Node.js 22 或更新版本。只运行查看器可使用 Node.js 18 或更新版本。纯几何检查可单独执行 `node verification/geometry-check.mjs`。

浏览器检查覆盖 WebGL 启动、几何有效性、三种树形、地点搜索、漫游、返回全景、手机控件，以及无 WebGL 时的兼容渲染。可用 `$env:TREE_STUDY='1'; node verification/verify.mjs` 单独生成树形对照图。
