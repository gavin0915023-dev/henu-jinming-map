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
- 不支持 WebGL 2 的设备会使用二维画布兼容渲染，仅显示基础体块和简化立面。

## 文件

- `model.js`：原场景整合、树木、光照与阴影。
- `building-detail.js`：窗框、玻璃、窗台、层间带、女儿墙、屋顶与入口构件。
- `landscape-detail.js`：运动场、道路设施、桥栏、湖岸与水面。
- `facade.js` / `software.js`：配套的图书馆西立面与兼容渲染器。
- `assets/`：原始校园 JSON、Three.js、OrbitControls 与地图依赖。
- `index.html` / `viewer.css` / `main.js`：完整的本地查看界面。

若将改动接入原页面，请同时引入两个新增 detail 模块，保持 `model.js` 与 `software.js`、`facade.js` 同级，并保留 `assets/OrbitControls.js` 和 `three` 的 import map。

## 实拍参考细化

图书馆西入口增加了分段弧形雨棚、细柱、台阶、门框、幕墙分格与屋顶挑檐，构件合批渲染。
参考学校公开的[图书馆建设资料](https://jjc.henu.edu.cn/info/1004/1002.htm)和[校园照片](https://zbcg.henu.edu.cn/xwtz/5707.chtml)。尺寸与细节为照片辅助下的示意建模，未经实地测绘；尚未获得可核验的百度街景全景图，不能视为街景精确复原。

## 检查命令

```powershell
node verification/verify.mjs
```

验证脚本使用本机 Chrome 或 Edge 的无界面模式，不需要安装 npm 依赖。结果与全景、建筑近景、漫游、移动端截图保存在 `verification/`。也可通过 `CHROME_PATH` 指定浏览器路径。

浏览器自动检查需要 Node.js 22 或更新版本。只运行查看器可使用 Node.js 18 或更新版本。纯几何检查可单独执行 `node verification/geometry-check.mjs`。

本次通过 13 项浏览器检查，覆盖 WebGL 启动、几何有效性、地点搜索、漫游、返回全景、手机画布与控件可见性，以及无 WebGL 时的兼容渲染。新增细节合批为 8 个网格；原始 `campus.json` 保持不变。
