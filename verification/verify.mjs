import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { access, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from '../server.mjs';

const output = dirname(fileURLToPath(import.meta.url));
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
  socket.addEventListener('message', event => {
    const message = JSON.parse(event.data);
    if (message.id) {
      const request = pending.get(message.id);
      if (!request) return;
      pending.delete(message.id);
      if (message.error) request.reject(Error(JSON.stringify(message.error))); else request.resolve(message.result);
    }
    if (message.method === 'Runtime.exceptionThrown') failures.push(message.params.exceptionDetails.exception?.description ?? message.params.exceptionDetails.text);
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
  await call('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
  await call('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
  await call('Page.navigate', { url });
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
