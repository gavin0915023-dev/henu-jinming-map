import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { access, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from '../server.mjs';
import { fieldViews } from '../field-views.js';

const output = dirname(fileURLToPath(import.meta.url));
const deployedSatellite = process.env.CHECK_SATELLITE === 'deployed';
const satelliteUrl = 'https://gavin0915023-dev.github.io/henu-jinming-map/';
const browsers = [process.env.CHROME_PATH, 'C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].filter(Boolean);
let browserPath;
for (const candidate of browsers) {
  try { await access(candidate); browserPath = candidate; break; } catch {}
}
assert(browserPath, 'Set CHROME_PATH to a local Chrome or Edge executable.');
const server = serve(0);
await new Promise(resolve => server.once('listening', resolve));
const url = `http://127.0.0.1:${server.address().port}`;
console.log(`Checking local server ${url}`);
assert.equal((await fetch(url, { signal: AbortSignal.timeout(5000) })).status, 200);
const temporaryRoot = resolve(tmpdir());
const profile = await mkdtemp(join(temporaryRoot, 'campus-refined-browser-'));
const browser = spawn(browserPath, ['--headless=new', '--no-first-run', '--no-default-browser-check', '--disable-background-networking', '--disable-extensions', '--remote-debugging-port=0', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', `--user-data-dir=${profile}`, '--window-size=1440,1000', 'about:blank'], { windowsHide: true, stdio: ['ignore', 'ignore', 'pipe'] });
let log = '';
browser.stderr.on('data', chunk => { log += chunk.toString(); });
console.log('Launching headless browser');
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
async function until(fn, label, timeout = 90000) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) { const result = await fn(); if (result) return result; await pause(100); }
  throw Error(`Timed out: ${label}\n${log.slice(-1000)}`);
}
let socket;
const failures = [], checks = [];
function check(name, value) { assert(value, name); checks.push(name); console.log(`PASS ${name}`); }
try {
  const endpoint = await until(() => log.match(/DevTools listening on (ws:\/\/[^\s]+)/)?.[1], 'Browser debugging endpoint');
  const port = new URL(endpoint).port;
  const tab = await (await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: 'PUT' })).json();
  socket = new WebSocket(tab.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { socket.addEventListener('open', resolve, { once: true }); socket.addEventListener('error', reject, { once: true }); });
  let nextId = 0;
  const pending = new Map();
  const imageryRequests = new Map();
  const imageryHosts = ['services.arcgisonline.com','server.arcgisonline.com'];
  let tileScenario = 'alternate';
  const succeededHosts = new Set();
  const transparentPng='iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jG1sAAAAASUVORK5CYII=';
  socket.addEventListener('message', event => {
    const message = JSON.parse(event.data);
    if (message.id) {
      const request = pending.get(message.id);
      if (!request) return;
      pending.delete(message.id);
      if (message.error) request.reject(Error(JSON.stringify(message.error))); else request.resolve(message.result);
    }
    if (message.method === 'Runtime.exceptionThrown') failures.push(message.params.exceptionDetails.exception?.description ?? message.params.exceptionDetails.text);
    if (message.method === 'Runtime.consoleAPICalled' && message.params.type==='error') {
      const error=message.params.args.map(a=>a.value??a.description??'').join(' ');
      if(/THREE\.WebGLProgram: Shader Error|VALIDATE_STATUS: false/.test(error))failures.push(error);
    }
    if (message.method === 'Network.requestWillBeSent') {
      const { requestId, request } = message.params;
      const {hostname, pathname} = new URL(request.url);
      if (imageryHosts.includes(hostname) && pathname.includes('/World_Imagery/MapServer/tile/')) imageryRequests.set(requestId,{host:hostname,result:'pending'});
    }
    if (message.method === 'Network.loadingFailed' || message.method === 'Network.responseReceived') {
      const {requestId,errorText,response} = message.params;
      const entry=imageryRequests.get(requestId);
      if(entry)entry.result=errorText??response.status;
    }
    if(message.method==='Fetch.requestPaused'){
      const {requestId,request}=message.params;
      const {hostname,pathname}=new URL(request.url);
      const x=Number(pathname.split('/').at(-1));
      const pass=tileScenario==='healthy'||tileScenario==='alternate'&&hostname===imageryHosts[0]||tileScenario==='partial'&&x%2===0;
      if(pass)succeededHosts.add(hostname);
      const operation=pass?call('Fetch.fulfillRequest',{requestId,responseCode:200,responseHeaders:[{name:'Content-Type',value:'image/png'},{name:'Cache-Control',value:'no-store'}],body:transparentPng}):call('Fetch.failRequest',{requestId,errorReason:'ConnectionFailed'});
      operation.catch(error=>failures.push(error.message));
    }
  });
  function call(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = ++nextId;
      const timeout=setTimeout(()=>{pending.delete(id);reject(Error(`CDP timeout: ${method}`));},60000);
      pending.set(id, { resolve(value){clearTimeout(timeout);resolve(value);}, reject(error){clearTimeout(timeout);reject(error);} });
      socket.send(JSON.stringify({ id, method, params }));
    });
  }
  async function evaluate(expression) {
    const result = await call('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
    if (result.exceptionDetails) throw Error(result.exceptionDetails.exception?.description ?? result.exceptionDetails.text);
    return result.result.value;
  }
  const settle = () => evaluate('new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve(true))))');
  const selectedCaptures=new Set((process.env.CAPTURE_VIEWS??'').split(',').filter(Boolean));
  async function capture(name) {
    if(selectedCaptures.size&&!selectedCaptures.has(name))return;
    await settle();
    const result = await call('Page.captureScreenshot', { format: 'png' });
    await writeFile(join(output, `${name}.png`), Buffer.from(result.data, 'base64'));
  }
  async function treeStudy() {
    await call('Emulation.setDeviceMetricsOverride', { width: 1100, height: 670, deviceScaleFactor: 1, mobile: false });
    await call('Page.navigate', {url:url+'/verification/tree-study.html'});
    await until(()=>evaluate("document.title.includes('三种校园树形') && document.querySelector('#stage')?.dataset.ready==='true'"),'Tree profiles rendered');
    await capture('trees');
  }
  await call('Page.enable');
  await call('Runtime.enable');
  await call('Network.enable');
  await call('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
  await call('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
  if(process.env.TREE_STUDY==='1'){
    await treeStudy();
  }else if(deployedSatellite){
    await call('Page.navigate',{url:satelliteUrl+'?view=marco-bowl'});
    const start=Date.now();
    await until(()=>evaluate("document.querySelector('#stage')?.dataset.ready==='true'"),'Published viewer ready',45000);
    check('Published deep link opens the plaza in orbit with the new viewpoints',await evaluate("document.querySelector('#mode-note').textContent.includes('东侧俯看') && document.querySelector('[data-mode=model]').getAttribute('aria-pressed')==='true' && document.querySelectorAll('#field-dialog [data-view]').length===49"));
    await capture('published-marco-bowl');
    await evaluate("document.querySelector('#field-views').click();document.querySelector('[data-view=tennis-west]').click()");
    await evaluate("document.querySelector('#route-next').click()");
    check('Published sports route reaches the basketball entrance',await evaluate("new URL(location.href).searchParams.get('view')==='hoops-south'"));
    await evaluate("document.querySelector('#map-photos').click();document.querySelector('[data-view=nanyuan-east]').click();document.querySelector('#route-next').click()");
    check('Published dining route reaches the curved south eave',await evaluate("new URL(location.href).searchParams.get('view')==='nanyuan-south' && document.querySelector('#route-position').textContent.includes('2 / 2')"));
    await evaluate("document.querySelector('[data-mode=satellite]').click()");
    const getTiles=()=>evaluate("(()=>{const tiles=[...document.querySelectorAll('#satellite img.leaflet-tile')];return {loaded:tiles.filter(t=>t.complete&&t.naturalWidth>0).length,total:tiles.length,message:document.querySelector('#fallback').hidden?'':document.querySelector('#fallback').innerText}})()");
    try {
      await until(async()=>{const s=await getTiles();return s.total>=4&&s.loaded===s.total;},'Published imagery viewport',45000);
      await capture('satellite-online');
    } finally {
      const requests={};
      for(const {host,result} of imageryRequests.values()){const key=`${host}: ${result}`;requests[key]=(requests[key]??0)+1;}
      console.log(JSON.stringify({viewport:await getTiles(),elapsedSeconds:(Date.now()-start)/1000,requests,failures},null,2));
    }
  } else {
  await call('Page.navigate',{url:url+'/?view=boxiang'});
  await until(() => evaluate("document.querySelector('#stage')?.dataset.ready==='true'"), 'Model ready');
  const stats = await evaluate("JSON.parse(document.querySelector('#stage').dataset.modelStats)");
  check('WebGL model starts', stats.renderer === 'webgl');
  check('All generated geometry is finite', stats.invalid === 0 && stats.vertices > 10000);
  check('All three tree forms populate the model', ['shade','vase','spire'].every(form=>stats.treeForms?.[form]>0) &&
    Object.values(stats.treeForms).reduce((sum,n)=>sum+n,0)===stats.trees);
  check('All twenty-six campus places load', await evaluate("document.querySelectorAll('#place-list .place').length===26"));
  check('Beiyuan search has one entrance and the two waterside places remain distinct',await evaluate(`(()=>{
    const s=document.querySelector('#search'),names=q=>{s.value=q;s.dispatchEvent(new Event('input'));return [...document.querySelectorAll('#place-list .place')].map(b=>b.textContent)};
    const b=names('北苑餐厅'),l=names('粹庭湖'),j=names('九章路石桥');names('');
    return b.length===1&&b[0].includes('室外楼梯')&&l.length===1&&l[0].includes('雪垠路')&&j.length===1&&j[0].includes('镂空石栏');
  })()`));
  check('Model error panel is hidden', await evaluate("document.querySelector('#fallback').hidden"));
  check('Shared street link opens on Boxiang Road in walking mode',await evaluate("document.querySelector('[data-mode=walk]').getAttribute('aria-pressed')==='true' && document.querySelector('#mode-note').textContent.includes('伯襄路')"));
  await capture('field-boxiang');
  await evaluate("document.querySelector('#home').click()");
  await capture('overview');
  await evaluate("document.querySelector('#search').value='计算机';document.querySelector('#search').dispatchEvent(new Event('input'))");
  check('Search finds the college and its neighboring report hall', await evaluate("document.querySelectorAll('#place-list .place').length===2 && document.querySelector('#place-list').textContent.includes('报告厅')"));
  await evaluate("document.querySelector('#place-list .place').click()");
  await capture('teaching-building');
  await evaluate("document.querySelector('#detail [data-field-reference]').click()");
  check('Forty-nine viewpoints link to forty-five panoramas and both university references',await evaluate(`(()=>{
    const modal=document.querySelector('#field-dialog'),links=[...modal.querySelectorAll('.field-list a')].map(a=>new URL(a.href));
    return modal.open && modal.querySelectorAll('[data-view]').length===49 &&
      new Set(links.filter(l=>l.hostname==='map.baidu.com').map(l=>new URLSearchParams(l.hash.slice(1)).get('panoid')).filter(Boolean)).size===45 &&
      links.some(l=>l.hostname==='ganbu.henu.edu.cn') && links.some(l=>l.hostname==='zbcg.henu.edu.cn');
  })()`));
  check('Region filter shows only the three sports viewpoints and restores the full list',await evaluate(`(()=>{
    const s=document.querySelector('[data-region]'),pick=v=>{s.value=v;s.dispatchEvent(new Event('change'));return [...document.querySelectorAll('.field-list section:not([hidden]) [data-view]')].map(b=>b.dataset.view)};
    const ids=pick('体育场与球场');return ids.length===3&&ids.includes('tennis-west')&&ids.includes('hoops-south')&&ids.includes('stadium-west')&&pick('').length===49;
  })()`));
  await evaluate("document.querySelector('[data-view=cs-south]').click()");
  check('Wenfu walk keeps geographic order, stops at each end and reverses',await evaluate(`(()=>{
    const current=()=>new URL(location.href).searchParams.get('view'),prev=document.querySelector('#route-prev'),next=document.querySelector('#route-next');
    const ids=[current()];if(!prev.disabled)return false;
    for(let i=0;i<5;i++){next.click();ids.push(current());}
    if(!next.disabled)return false;prev.click();
    return ids.join(',')==='cs-south,cs-entry,wenfu-hall,software-entry,software-south,software-return' && current()==='software-south' && document.querySelector('#route-position').textContent.includes('5 / 6');
  })()`));
  await evaluate("document.querySelector('#map-photos').click()");
  for(const {id,orbit} of fieldViews.filter(v=>v.id!=='boxiang')){
    await evaluate(`document.querySelector('#field-dialog [data-view="${id}"]').click()`);
    check((orbit?'Aerial viewpoint ':'Walking viewpoint ')+id,await evaluate(`new URL(location.href).searchParams.get('view')==='${id}' && document.querySelector('[data-mode="${orbit?'model':'walk'}"]').getAttribute('aria-pressed')==='true' && !document.querySelector('#field-dialog').open && document.querySelector('#mode-note').textContent===document.querySelector('#field-dialog [data-view="${id}"]').parentElement.querySelector('h3').textContent`));
    await capture('field-'+id);
    await evaluate("document.querySelector('#field-views').click()");
  }
  check('Reference panel selects the photo for the current viewpoint',await evaluate("document.querySelector('#field-dialog section[data-current] [data-view]').dataset.view==='west-gate'"));
  await evaluate("document.querySelector('#field-dialog [data-close]').click();document.querySelector('#home').click()");
  await evaluate("document.querySelector('#search').value='';document.querySelector('#search').dispatchEvent(new Event('input'));document.querySelector('#place-list .place').click()");
  await capture('library');
  await evaluate("document.querySelector('[data-mode=walk]').click()");
  check('Walk mode activates', await evaluate("!document.querySelector('#street-help').hidden && document.querySelector('[data-mode=walk]').getAttribute('aria-pressed')==='true'"));
  await capture('walk');
  await evaluate("document.querySelector('#walk-forward').click();document.querySelector('#walk-back').click();document.querySelector('#home').click()");
  check('Home exits walk mode', await evaluate("document.querySelector('#street-help').hidden"));
  await evaluate("document.querySelectorAll('#place-list .place')[4].click()");
  await capture('stadium');
  await evaluate("document.querySelectorAll('#place-list .place')[3].click()");
  await capture('lake');
  await evaluate("document.querySelector('#home').click()");
  if(process.env.CHECK_SATELLITE==='1'){
    await evaluate("document.querySelector('[data-mode=satellite]').click()");
    await until(()=>evaluate("document.querySelector('#fallback').hidden && (()=>{const tiles=[...document.querySelectorAll('#satellite img.leaflet-tile')];return tiles.length>=4 && tiles.every(t=>t.complete && t.naturalWidth>0)})()"),'Satellite imagery loads',50000);
    check('Satellite imagery tiles load',true);
    await capture('satellite');
    await evaluate("document.querySelector('[data-mode=model]').click()");
  }
  if(process.env.CHECK_SATELLITE==='faults'){
    await call('Network.setCacheDisabled',{cacheDisabled:true});
    await call('Fetch.enable',{patterns:imageryHosts.map(host=>({urlPattern:`https://${host}/*/World_Imagery/MapServer/tile/*`}))});
    const waitState=async state=>{
      try{await until(()=>evaluate(`document.querySelector('#imagery-status').dataset.state===${JSON.stringify(state)}`),`Satellite state: ${state}`,20000);}
      catch(error){console.log(await evaluate("[document.querySelector('#imagery-status').dataset.state,[...document.querySelectorAll('#satellite img[data-imagery]')].reduce((a,t)=>(a[t.dataset.imagery]=(a[t.dataset.imagery]??0)+1,a),{})]"));throw error;}
    };
    await evaluate("document.querySelector('[data-mode=satellite]').click()");
    await waitState('ready');
    check('Tiles switch hosts when the first host fails',succeededHosts.size===1&&succeededHosts.has(imageryHosts[0]));
    tileScenario='partial';
    await evaluate("document.querySelector('#zoom-in').click()");
    await waitState('partial');
    check('Zoom reports missing tiles instead of treating one tile as success',await evaluate("!document.querySelector('#imagery-status').hidden && !document.querySelector('#imagery-actions').hidden"));
    tileScenario='offline';
    await evaluate("document.querySelectorAll('#place-list .place')[4].click()");
    await waitState('unavailable');
    await settle();
    check('Campus outline and labels stay visible when both imagery hosts fail',await evaluate(`(()=>{
      const canvas=document.querySelector('#satellite canvas');
      if(!canvas||!document.querySelector('#labels .map-pin:not([hidden])')||document.querySelector('#mode-label').textContent!=='校园平面图')return false;
      const {width,height}=canvas;
      const rgba=canvas.getContext('2d').getImageData(0,0,width,height).data;
      let painted=0;
      for(let i=3;i<rgba.length;i+=4*97)if(rgba[i]>0)painted++;
      return painted>width*height*.1/97;
    })()`));
    await capture('satellite-fallback');
    tileScenario='healthy';
    await evaluate("document.querySelector('#imagery-retry').click()");
    await waitState('ready');
    check('Retry restores imagery in place',await evaluate(`document.querySelector('#imagery-status').hidden && document.querySelector('#satellite img[data-zoom="18"][data-imagery=ready]')!==null`));
    await evaluate("document.querySelector('[data-mode=model]').click()");
    await call('Fetch.disable');
  }
  await treeStudy();
  await call('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await evaluate("document.querySelector('#stage').dataset.ready='false'");
  await call('Page.navigate', { url });
  await until(() => evaluate("document.querySelector('#stage')?.dataset.ready==='true'"), 'Mobile model ready');
  await settle();
  check('Mobile viewport uses device width', await evaluate('window.innerWidth===390'));
  check('Mobile layout stays within viewport', await evaluate('document.documentElement.scrollWidth<=window.innerWidth'));
  check('Mobile canvas remains usable', await evaluate("document.querySelector('#stage').clientWidth>200&&document.querySelector('#stage').clientHeight>250"));
  await capture('mobile');
  await evaluate("document.querySelector('#field-views').click()");
  check('Mobile reference panel fits the screen and has a usable view selector',await evaluate(`(()=>{
    const dialog=document.querySelector('#field-dialog'),r=dialog.getBoundingClientRect(),b=dialog.querySelector('[data-view]').getBoundingClientRect();
    return dialog.open && r.left>=0 && r.right<=innerWidth && r.bottom<=innerHeight && b.height>=32 && dialog.contains(document.elementFromPoint(b.x+b.width/2,b.y+b.height/2));
  })()`));
  await evaluate("document.querySelector('#field-dialog [data-close]').click()");
  const mobileLayout=await evaluate("Object.fromEntries(['.viewport','#stage','.mode-switch','#home'].map(selector=>{const r=document.querySelector(selector).getBoundingClientRect();return [selector,{left:r.left,right:r.right,top:r.top,bottom:r.bottom}]}))");
  console.log('Mobile layout',JSON.stringify(mobileLayout));
  check('Mobile view controls remain visible', await evaluate("[...document.querySelectorAll('.mode-switch,#home')].every(el=>{const r=el.getBoundingClientRect();return r.left>=0&&r.right<=window.innerWidth&&r.top>=0&&r.bottom<=window.innerHeight})"));
  await evaluate("document.querySelector('#place-list .place').click();document.querySelector('#detail .detail-walk').click()");
  await settle();
  check('Mobile walking controls accept taps after choosing a place',await evaluate(`document.querySelector('#detail').hidden &&
    [...document.querySelectorAll('#street-help button')].filter(b=>b.getClientRects().length).every(b=>{const r=b.getBoundingClientRect();return r.height>=44 && b.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2))})`));
  await evaluate("document.querySelector('[data-mode=model]').click()");
  check('Leaving walk mode restores the selected place',await evaluate("!document.querySelector('#detail').hidden && document.querySelector('#detail h2').textContent.includes('图书馆')"));
  await call('Page.addScriptToEvaluateOnNewDocument', { source: "const originalGetContext=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){return type==='webgl2'?null:originalGetContext.call(this,type,...args)}" });
  await evaluate("document.querySelector('#stage').dataset.ready='false'");
  await call('Page.navigate', { url:url+'/?view=cs-entry' });
  await until(() => evaluate("document.querySelector('#stage')?.dataset.ready==='true'"), 'Canvas fallback ready');
  check('Canvas fallback starts without WebGL', await evaluate("document.querySelector('#stage').dataset.renderer==='canvas' && document.querySelector('#fallback').hidden"));
  check('Canvas fallback opens the requested entrance',await evaluate("document.querySelector('#mode-note').textContent.includes('文甫路入口') && document.querySelector('[data-mode=walk]').getAttribute('aria-pressed')==='true'"));
  await capture('field-fallback-entry');
  await evaluate("document.querySelector('#route-next').click()");
  check('Mobile Canvas walk reaches the passage and its reference',await evaluate("!document.querySelector('#walk-route').hidden && document.querySelector('#mode-note').textContent.includes('楼间通道') && document.querySelector('#route-prev').getBoundingClientRect().height>=44"));
  await capture('field-fallback-hall');
  await evaluate("document.querySelector('#map-photos').click();document.querySelector('[data-view=physics-entry]').click()");
  await evaluate("document.querySelector('#route-next').click();document.querySelector('#route-next').click()");
  check('Mobile physics route reaches the cone in Canvas mode',await evaluate("new URL(location.href).searchParams.get('view')==='physics-cone' && document.querySelector('#route-position').textContent.includes('3 / 4')"));
  await capture('field-fallback-cone');
  await evaluate("document.querySelector('#map-photos').click();document.querySelector('[data-view=library-rear]').click();document.querySelector('#route-next').click()");
  check('The two faces of the square keep their own original reference',await evaluate(`(()=>{
    document.querySelector('#map-photos').click();const row=document.querySelector('#field-dialog [data-current]');
    return row.querySelector('[data-view]').dataset.view==='teaching-front' && new URL(row.querySelector('a').href).hash.includes('01027700001404011228370575G');
  })()`));
  await evaluate("document.querySelector('[data-view=zeng]').click();document.querySelector('#route-next').click();document.querySelector('#map-photos').click()");
  check('Turning at the dorm crossroads keeps its panorama and changes the bearing',await evaluate(`(()=>{
    const read=id=>new URLSearchParams(new URL(document.querySelector('[data-view='+id+']').parentElement.querySelector('a').href).hash.slice(1));
    return document.querySelector('[data-current] [data-view]').dataset.view==='dorm17' && read('zeng').get('panoid')===read('dorm17').get('panoid') &&
      read('zeng').get('heading')==='357.77' && read('dorm17').get('heading')==='195.8';
  })()`));
  await evaluate("document.querySelector('[data-view=civil]').click()");
  await capture('field-fallback-civil');
  await evaluate("document.querySelector('#map-photos').click();document.querySelector('[data-view=education-clock]').click();document.querySelector('#route-next').click()");
  check('Mobile Canvas crosses to the opposite side of the education court',await evaluate("document.querySelector('#stage').dataset.renderer==='canvas' && new URL(location.href).searchParams.get('view')==='education-east' && document.querySelector('#route-position').textContent.includes('3 / 3')"));
  await capture('field-fallback-education');
  await evaluate("document.querySelector('#map-photos').click();document.querySelector('[data-view=marco-bowl]').click()");
  check('Mobile Canvas opens the plaza aerial and can descend to the ground',await evaluate(`(()=>{
    if(document.querySelector('[data-mode=model]').getAttribute('aria-pressed')!=='true'||!document.querySelector('#mode-note').textContent.includes('东侧俯看'))return false;
    document.querySelector('#detail .detail-walk').click();document.querySelector('#walk-forward').click();
    return document.querySelector('[data-mode=walk]').getAttribute('aria-pressed')==='true'&&document.querySelector('#stage').dataset.renderer==='canvas';
  })()`));
  await evaluate("document.querySelector('#map-photos').click()");
  await evaluate("document.querySelector('#field-dialog [data-close]').click()");
  await evaluate("document.querySelector('#home').click()");
  await capture('fallback');
  check('No uncaught browser exceptions', failures.length === 0);
  await writeFile(join(output, 'results.json'), JSON.stringify({ checks, stats, failures }, null, 2) + '\n');
  console.log(JSON.stringify({ checks: checks.length, stats }, null, 2));
  }
} finally {
  socket?.close();
  browser.kill();
  await new Promise(resolve => server.close(resolve));
  await pause(600);
  // The absolute deletion target must be the unique directory created above, inside the OS temp directory.
  const verified = resolve(profile);
  assert(verified.startsWith(temporaryRoot + sep) && verified.slice(temporaryRoot.length + 1).startsWith('campus-refined-browser-'));
  await rm(verified, { recursive: true, force: true, maxRetries: 4, retryDelay: 250 }).catch(() => {});
}
