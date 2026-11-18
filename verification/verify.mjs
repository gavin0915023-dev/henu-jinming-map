import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { access, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from '../server.mjs';

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
  async function capture(name) {
    await settle();
    const result = await call('Page.captureScreenshot', { format: 'png' });
    await writeFile(join(output, `${name}.png`), Buffer.from(result.data, 'base64'));
  }
  await call('Page.enable');
  await call('Runtime.enable');
  await call('Network.enable');
  await call('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
  await call('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
  await call('Page.navigate', { url: deployedSatellite ? satelliteUrl : url });
  if(deployedSatellite){
    const start=Date.now();
    await until(()=>evaluate("document.querySelector('#place-list .place')!==null"),'Published viewer ready',45000);
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
  await until(() => evaluate("document.querySelector('#stage')?.dataset.ready==='true'"), 'Model ready');
  const stats = await evaluate("JSON.parse(document.querySelector('#stage').dataset.modelStats)");
  check('WebGL model starts', stats.renderer === 'webgl');
  check('All generated geometry is finite', stats.invalid === 0 && stats.vertices > 10000);
  check('Nine places load', await evaluate("document.querySelectorAll('#place-list .place').length===9"));
  check('Model error panel is hidden', await evaluate("document.querySelector('#fallback').hidden"));
  await capture('overview');
  await evaluate("document.querySelector('#search').value='计算机';document.querySelector('#search').dispatchEvent(new Event('input'))");
  check('Search filters places', await evaluate("document.querySelectorAll('#place-list .place').length===1"));
  await evaluate("document.querySelector('#place-list .place').click()");
  await capture('teaching-building');
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
  await call('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await evaluate("document.querySelector('#stage').dataset.ready='false'");
  await call('Page.navigate', { url });
  await until(() => evaluate("document.querySelector('#stage')?.dataset.ready==='true'"), 'Mobile model ready');
  await settle();
  check('Mobile viewport uses device width', await evaluate('window.innerWidth===390'));
  check('Mobile layout stays within viewport', await evaluate('document.documentElement.scrollWidth<=window.innerWidth'));
  check('Mobile canvas remains usable', await evaluate("document.querySelector('#stage').clientWidth>200&&document.querySelector('#stage').clientHeight>250"));
  await capture('mobile');
  const mobileLayout=await evaluate("Object.fromEntries(['.viewport','#stage','.mode-switch','#home'].map(selector=>{const r=document.querySelector(selector).getBoundingClientRect();return [selector,{left:r.left,right:r.right,top:r.top,bottom:r.bottom}]}))");
  console.log('Mobile layout',JSON.stringify(mobileLayout));
  check('Mobile view controls remain visible', await evaluate("[...document.querySelectorAll('.mode-switch,#home')].every(el=>{const r=el.getBoundingClientRect();return r.left>=0&&r.right<=window.innerWidth&&r.top>=0&&r.bottom<=window.innerHeight})"));
  await call('Page.addScriptToEvaluateOnNewDocument', { source: "const originalGetContext=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){return type==='webgl2'?null:originalGetContext.call(this,type,...args)}" });
  await evaluate("document.querySelector('#stage').dataset.ready='false'");
  await call('Page.navigate', { url });
  await until(() => evaluate("document.querySelector('#stage')?.dataset.ready==='true'"), 'Canvas fallback ready');
  check('Canvas fallback starts without WebGL', await evaluate("document.querySelector('#stage').dataset.renderer==='canvas' && document.querySelector('#fallback').hidden"));
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
