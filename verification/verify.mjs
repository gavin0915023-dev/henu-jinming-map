import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { access, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from '../server.mjs';
import { fieldViews } from '../field-views.js';
import { createCampusRouter } from '../routing.js';

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
const failures = [], checks = [], shaderErrors = new Set();
let linkedPrograms = 0;
const shaderError = /THREE\.WebGLProgram: Shader Error|VALIDATE_STATUS:\s*false|(?:shader|program).{0,45}(?:failed to (?:compile|link)|(?:compilation|link) failed)|ERROR:\s*0:\d+:/i;
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
    if (message.method === 'Runtime.bindingCalled' && message.params.name === '__verifyProgramLink') {
      linkedPrograms++;
      if (message.params.payload) shaderErrors.add(message.params.payload);
    }
    if (message.method === 'Runtime.consoleAPICalled') {
      const error=message.params.args.map(a=>a.value??a.description??'').join(' ');
      if(shaderError.test(error))shaderErrors.add(error);
    }
    if(message.method==='Log.entryAdded' && shaderError.test(message.params.entry.text))shaderErrors.add(message.params.entry.text);
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
  const eastDormNames=['十九','二十','二十一','二十二','二十三','二十四','二十五','二十六'].map(n=>'学'+n+'公寓');
  async function eastDormCards(){
    return evaluate(`(()=>{
      const $=s=>document.querySelector(s),s=$('#search'),names=()=>[...document.querySelectorAll('#place-list .rowtext b')].map(e=>e.textContent);
      const search=q=>{s.value=q;s.dispatchEvent(new Event('input'));return names()};
      $('#home').click();$('[data-cat=academic]').click();
      if(search('东苑').sort().join()!==${JSON.stringify([...eastDormNames].sort().join())})return false;
      if(search('东苑25号楼').join()!=='学二十五公寓')return false;
      $('#place-list .place').click();$('#detail [data-field-reference]').click();
      let row=$('#field-dialog [data-current]');const aerial=row?.querySelector('[data-view]').dataset.view==='dongyuan-courts'&&new URL(row.querySelector('a').href).hostname==='www.arcgis.com';
      $('#field-dialog [data-close]').click();search('东苑22号楼');$('#place-list .place').click();
      $('#detail [data-field-reference]').click();row=$('#field-dialog [data-current]');
      const h=new URLSearchParams(new URL(row.querySelector('a').href).hash.slice(1));
      const street=row.querySelector('[data-view]').dataset.view==='dongyuan-22'&&h.get('panoid')==='09027700122206231400097765A'&&h.get('heading')==='54';
      $('#field-dialog [data-close]').click();$('#home').click();search('');$('[data-cat=featured]').click();
      return aerial&&street;
    })()`);
  }
  async function surveyCards(){
    return evaluate(`(()=>{
      const $=s=>document.querySelector(s),s=$('#search');
      $('#home').click();
      for(const [query,title,id,source] of [
        ['华苑餐厅','华苑餐厅','huayuan-roof','www.arcgis.com'],
        ['经济学院','经济学院','economics-west','01027700001404011220505535G'],
        ['数学与信息科学学院','数学与信息科学学院','math-lake','01027700001404011226255645G'],
        ['生命科学学院','生命科学院','life-door','01027700001404011217545635G']]){
        s.value=query;s.dispatchEvent(new Event('input'));const row=[...document.querySelectorAll('#place-list .place')].find(b=>b.querySelector('b').textContent===title);
        if(!row)throw Error('Missing survey place: '+query);
        row.click();$('#detail [data-field-reference]').click();
        const view=$('#field-dialog [data-current] [data-view]'),target=new URL(view.parentElement.querySelector('a').href);
        if(!$('#field-dialog').open||view.dataset.view!==id||(target.hostname!==source&&new URLSearchParams(target.hash.slice(1)).get('panoid')!==source))return false;
        view.click();if($('#mode-note').textContent!==view.parentElement.querySelector('h3').textContent)return false;
        if(id!=='huayuan-roof'){$('#route-next').click();if(!$('#route-position').textContent.includes('2 / 2'))return false;}
        $('[data-mode=model]').click();if($('#detail h2')?.textContent!==title)return false;
        $('#home').click();
      }
      $('[data-cat=featured]').click();return true;
    })()`);
  }
  async function sceneLuminance(){
    await settle();
    const clip=await evaluate(`(()=>{const r=document.querySelector('#stage').getBoundingClientRect();
      return {x:Math.round(r.x+r.width/2-16),y:Math.round(r.y+r.height*.4-16),width:32,height:32,scale:1}})()`);
    const {data}=await call('Page.captureScreenshot',{format:'png',clip});
    return evaluate(`(async()=>{
      const raw=Uint8Array.from(atob(${JSON.stringify(data)}),ch=>ch.charCodeAt(0));
      const im=await createImageBitmap(new Blob([raw],{type:'image/png'}));
      const c=new OffscreenCanvas(im.width,im.height),ctx=c.getContext('2d');ctx.drawImage(im,0,0);im.close();
      const p=ctx.getImageData(0,0,c.width,c.height).data;let sum=0;
      for(let i=0;i<p.length;i+=4)sum+=.2126*p[i]+.7152*p[i+1]+.0722*p[i+2];
      return sum/(p.length/4);
    })()`);
  }
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
  await call('Log.enable');
  await call('Runtime.addBinding', {name:'__verifyProgramLink'});
  // Observe actual driver link status once per program, including documents reloaded
  // by share tests. Install only in this disposable browser, never in the viewer.
  await call('Page.addScriptToEvaluateOnNewDocument', {source:`(() => {
    const gl2=globalThis.WebGL2RenderingContext?.prototype;
    if(gl2){
      const link=gl2.linkProgram;
      gl2.linkProgram=function(program){
        link.call(this,program);
        const ok=this.getProgramParameter(program,this.LINK_STATUS);
        globalThis.__verifyProgramLink(ok?'':(this.getProgramInfoLog(program)||'Program failed to link'));
      };
    }
    Object.defineProperty(navigator,'clipboard',{value:{writeText:async()=>{}}});
  })()`});
  await call('Network.enable');
  await call('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
  await call('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
  if(process.env.TREE_STUDY==='1'){
    await treeStudy();
  }else if(deployedSatellite){
    await call('Page.navigate',{url:satelliteUrl+'?view=stadium-field'});
    const start=Date.now();
    await until(()=>evaluate("document.querySelector('#stage')?.dataset.ready==='true'"),'Published viewer ready',45000);
    check('Published street view matches the shared stadium panorama and bearing',await evaluate(`(()=>{
      const b=document.querySelector('[data-view=stadium-field]'),h=new URLSearchParams(new URL(b.parentElement.querySelector('a').href).hash.slice(1));
      return document.querySelector('#stage').dataset.renderer==='webgl' && document.querySelector('#mode-note').textContent.includes('夷山大街望看台') &&
        document.querySelectorAll('#field-dialog [data-view]').length===${fieldViews.length}&&h.get('panoid')==='09027700122206231415580505A'&&h.get('heading')==='292.75'&&h.get('pitch')==='5.3';
    })()`));
    await capture('published-stadium-field');
    check('Published stadium route visits both street angles, the track and the west door',await evaluate(`(()=>{
      const prev=document.querySelector('#route-prev'),next=document.querySelector('#route-next'),current=()=>new URL(location.href).searchParams.get('view');
      prev.click();const ids=[current()];if(!prev.disabled)return false;
      for(let i=0;i<3;i++){next.click();ids.push(current());}
      return ids.join(',')==='stadium-field-north,stadium-field,stadium-track,stadium-west'&&next.disabled;
    })()`));
    check('Published teaching courts retain both original bearings and the current software entrance',await evaluate(`(()=>{
      const row=id=>document.querySelector('[data-view='+id+']').parentElement;
      const h=id=>new URLSearchParams(new URL(row(id).querySelector('a').href).hash.slice(1));
      return h('teaching-23').get('panoid')==='01027700001404011230120335G'&&h('teaching-56').get('heading')==='279.39'&&row('software-entry').textContent.includes('现已拆除');
    })()`));
    await evaluate("document.querySelector('#field-views').click();document.querySelector('[data-view=teaching-23]').click()");
    check('The published model opens both school courts with the existing route buttons',await evaluate(`(()=>{
      const note=document.querySelector('#mode-note'),next=document.querySelector('#route-next');
      if(!note.textContent.includes('2、3 号教学楼'))return false;
      next.click();next.click();
      return new URL(location.href).searchParams.get('view')==='teaching-56'&&note.textContent.includes('5、6 号教学楼')&&document.querySelector('[data-mode=walk]').getAttribute('aria-pressed')==='true';
    })()`));
    await evaluate("document.querySelector('#field-views').click();document.querySelector('[data-view=tennis-west]').click()");
    await evaluate("document.querySelector('#route-next').click()");
    check('Published sports route reaches the basketball entrance',await evaluate("new URL(location.href).searchParams.get('view')==='hoops-south'"));
    await evaluate("document.querySelector('#map-photos').click();document.querySelector('[data-view=nanyuan-east]').click();document.querySelector('#route-next').click()");
    check('Published dining route reaches the curved south eave',await evaluate("new URL(location.href).searchParams.get('view')==='nanyuan-south' && document.querySelector('#route-position').textContent.includes('2 / 2')"));
    check('Published catalog opens the four surveyed buildings and their original sources',await surveyCards());
    check('Published Dongyuan search opens the correct street photo or courtyard aerial',await eastDormCards());
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
    check('Published scenes link WebGL programs without shader or browser errors',linkedPrograms>0&&shaderErrors.size===0&&failures.length===0);
  } else {
  await call('Page.navigate',{url:url+'/?view=boxiang'});
  await until(() => evaluate("document.querySelector('#stage')?.dataset.ready==='true'"), 'Model ready');
  const stats = await evaluate("JSON.parse(document.querySelector('#stage').dataset.modelStats)");
  check('WebGL model starts', stats.renderer === 'webgl');
  check('All generated geometry is finite', stats.invalid === 0 && stats.vertices > 10000);
  check('All three tree forms populate the model', ['shade','vase','spire'].every(form=>stats.treeForms?.[form]>0) &&
    Object.values(stats.treeForms).reduce((sum,n)=>sum+n,0)===stats.trees);
  check('Default tab opens on exactly 26 featured landmarks before any search',await evaluate(
    "document.querySelector('[data-cat=featured]').getAttribute('aria-selected')==='true' && document.querySelectorAll('#place-list .place').length===26 && document.querySelector('#place-count').textContent==='26 个地点'"));
  check('The featured list and the extended categorized catalog both load', await evaluate(`(()=>{
    const tab=name=>document.querySelector('[data-cat='+name+']'),count=()=>document.querySelectorAll('#place-list .place').length;
    const featured=count();tab('all').click();const all=count();tab('featured').click();
    return featured===26&&all>featured+20&&count()===featured;
  })()`));
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
  check('Named building searches lead to their own shared court in the existing place cards',await evaluate(`(()=>{
    const s=document.querySelector('#search'),find=v=>{s.value=v;s.dispatchEvent(new Event('input'));};
    for(const [name,id] of [['2号教学楼','teaching-23'],['3号教学楼','teaching-23'],['5号教学楼','teaching-56'],['6号教学楼','teaching-56']]){
      find(name);const p=document.querySelector('#place-list .place');if(p?.querySelector('.rowtext b')?.textContent!==name)throw Error('Unexpected result for '+name+': '+p?.textContent);
      p.click();document.querySelector('#detail [data-field-reference]').click();
      const selected=document.querySelector('#field-dialog [data-current] [data-view]')?.dataset.view;
      document.querySelector('#field-dialog [data-close]').click();if(selected!==id)throw Error(name+' links to '+selected+', expected '+id);
    }
    find('');return true;
  })()`));
  await evaluate("document.querySelector('#home').click()");
  await evaluate("document.querySelector('#search').value='计算机';document.querySelector('#search').dispatchEvent(new Event('input'))");
  check('Search finds the college and its neighboring report hall', await evaluate("document.querySelectorAll('#place-list .place').length===2 && document.querySelector('#place-list').textContent.includes('报告厅')"));
  await evaluate("document.querySelector('#place-list .place').click()");
  await capture('teaching-building');
  await evaluate("document.querySelector('#detail [data-field-reference]').click()");
  check('The catalog links to each distinct panorama and both university references',await evaluate(`(()=>{
    const modal=document.querySelector('#field-dialog'),all=[...modal.querySelectorAll('.field-list a')],links=all.map(a=>new URL(a.href));
    const count=items=>new Set(items.filter(l=>l.hostname==='map.baidu.com').map(l=>new URLSearchParams(l.hash.slice(1)).get('panoid')).filter(Boolean)).size;
    const prior=all.filter(a=>a.parentElement.dataset.area!=='东苑学生公寓');
    const old=prior.filter(a=>!['economics-west','economics-east','math-lake','math-west','life-door','life-wing','huayuan-roof'].includes(a.parentElement.querySelector('[data-view]').dataset.view));
    return modal.open && modal.querySelectorAll('[data-view]').length===${fieldViews.length} &&
      count(old.map(a=>new URL(a.href)))===49 && count(prior.map(a=>new URL(a.href)))===55 && count(links)===58 &&
      links.some(l=>l.hostname==='ganbu.henu.edu.cn') && links.some(l=>l.hostname==='zbcg.henu.edu.cn');
  })()`));
  check('The sports filter includes the four stadium positions and the outdoor courts',await evaluate(`(()=>{
    const s=document.querySelector('[data-region]'),pick=v=>{s.value=v;s.dispatchEvent(new Event('change'));return [...document.querySelectorAll('.field-list section:not([hidden]) [data-view]')].map(b=>b.dataset.view)};
    const ids=pick('体育场与球场');return ids.length===6&&['tennis-west','hoops-south','stadium-west','stadium-field','stadium-track','stadium-field-north'].every(id=>ids.includes(id))&&pick('').length===${fieldViews.length};
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
    if(id==='stadium-track'){
      check('The new stadium view keeps the walking minimap and user lighting controls',await evaluate(`(()=>{
        const visible=!document.querySelector('#minimap').hidden&&document.querySelector('#minimap canvas').width>0;
        document.querySelector('#lighting').click();document.querySelector('[data-light=night]').click();
        const night=document.querySelector('.viewport').dataset.lighting==='night';
        document.querySelector('[data-light=noon]').click();if(document.querySelector('#lighting').getAttribute('aria-expanded')==='true')document.querySelector('#lighting').click();
        return visible&&night&&document.querySelector('.viewport').dataset.lighting==='noon';
      })()`));
      await evaluate("for(let i=0;i<6;i++)document.querySelector('#walk-forward').click()");
      const {x,y}=await evaluate("(()=>{const r=document.querySelector('#stage').getBoundingClientRect();return {x:r.x+r.width*.64,y:r.y+r.height*.54}})()");
      await call('Input.dispatchMouseEvent',{type:'mousePressed',x,y,button:'left',buttons:1,clickCount:1});
      await call('Input.dispatchMouseEvent',{type:'mouseMoved',x:x-354,y:y-20,button:'left',buttons:1});
      await call('Input.dispatchMouseEvent',{type:'mouseReleased',x:x-354,y:y-20,button:'left',buttons:0,clickCount:1});
      await capture('field-stadium-aisle');
    }
    await evaluate("document.querySelector('#field-views').click()");
  }
  check('Reference panel selects the photo for the current viewpoint',await evaluate("document.querySelector('#field-dialog section[data-current] [data-view]').dataset.view==='west-gate'"));
  await evaluate("document.querySelector('#field-dialog [data-close]').click();document.querySelector('#home').click()");
  await evaluate("document.querySelector('#search').value='';document.querySelector('#search').dispatchEvent(new Event('input'));document.querySelector('#place-list .place').click()");
  await capture('library');
  await evaluate("document.querySelector('[data-mode=walk]').click()");
  check('Walk mode activates', await evaluate("!document.querySelector('#street-help').hidden && document.querySelector('[data-mode=walk]').getAttribute('aria-pressed')==='true'"));
  await capture('walk');
  {
    const fpsReady=await evaluate("document.querySelector('#stage').dataset.walkCamera==='fps' && !document.querySelector('#fps-crosshair').hidden");
    await evaluate("document.querySelector('#walk-jump').click()");
    await evaluate("new Promise(r=>{let n=0;const f=()=>++n>=3?r():requestAnimationFrame(f);requestAnimationFrame(f)})");
    const airborne=await evaluate("Number(document.querySelector('#stage').dataset.jumpY)>0.2 && document.querySelector('#fps-crosshair').dataset.airborne==='true'");
    await evaluate("document.querySelector('#walk-cam').click()");
    await settle();
    const thirdAir=await evaluate("document.querySelector('#stage').dataset.walkCamera==='third' && document.querySelector('#fps-crosshair').hidden && document.querySelector('#walk-cam').getAttribute('aria-pressed')==='true' && Number(document.querySelector('#stage').dataset.jumpY)>0.2");
    await capture('walk-jump');
    await until(()=>evaluate("Number(document.querySelector('#stage').dataset.jumpY)===0"),'Walker lands cleanly',45000);
    await settle();
    await capture('walk-third');
    await evaluate("document.querySelector('#walk-cam').click()");
    await settle();
    const backFps=await evaluate("document.querySelector('#stage').dataset.walkCamera==='fps' && !document.querySelector('#fps-crosshair').hidden");
    check('FPS mode shows a dynamic reticle, jumps with gravity and toggles to the 3D student avatar',fpsReady&&airborne&&thirdAir&&backFps);
  }
  await evaluate("document.querySelector('#walk-forward').click();document.querySelector('#walk-back').click();document.querySelector('#home').click()");
  check('Home exits walk mode', await evaluate("document.querySelector('#street-help').hidden && document.querySelector('#fps-crosshair').hidden"));
  await evaluate("document.querySelectorAll('#place-list .place')[4].click()");
  check('Existing walking directions can still route from the west gate to the stadium',await evaluate(`(()=>{
    document.querySelector('#detail [data-route]').click();
    const s=document.querySelector('#route-from');s.value='west';s.dispatchEvent(new Event('change'));
    const ok=document.querySelector('#route-to').value==='stadium'&&/步行约 [0-9]+ 米/.test(document.querySelector('#route-summary').textContent);
    document.querySelector('#route-clear').click();return ok&&document.querySelector('#route-bar').hidden;
  })()`));
  await capture('stadium');
  await evaluate("document.querySelectorAll('#place-list .place')[3].click()");
  await capture('lake');
  await evaluate("document.querySelector('#home').click()");
  // ---- Regression coverage: categories, 3D picking, A* routing, lighting, share links, guided tours ----
  const mouse=async(type,x,y,buttons=0)=>call('Input.dispatchMouseEvent',{type,x,y,button:type==='mouseMoved'&&!buttons?'none':'left',buttons,clickCount:type==='mouseMoved'?0:1});
  const clickAt=async(x,y)=>{await mouse('mouseMoved',x,y);await mouse('mousePressed',x,y,1);await mouse('mouseReleased',x,y);};
  const dragBy=async(x,y,dx,dy)=>{await mouse('mousePressed',x,y,1);for(let i=1;i<=6;i++)await mouse('mouseMoved',x+dx*i/6,y+dy*i/6,1);await mouse('mouseReleased',x+dx,y+dy);};
  const centerOf=selector=>evaluate(`(()=>{const r=document.querySelector(${JSON.stringify(selector)}).getBoundingClientRect();return [r.left+r.width/2,r.top+r.height/2]})()`);
  const readyAt=async target=>{await evaluate("document.querySelector('#stage').dataset.ready='false'");await call('Page.navigate',{url:target});await until(()=>evaluate("document.querySelector('#stage')?.dataset.ready==='true'"),'Reloaded '+target);await settle();};
  check('Category tabs filter every campus building and road, then restore the 26 featured places',await evaluate(`(()=>{
    const tab=c=>{document.querySelector('[data-cat='+c+']').click();return [...document.querySelectorAll('#place-list .place')].map(b=>b.textContent)};
    const all=tab('all'),dorm=tab('dorm'),life=tab('life'),outdoor=tab('outdoor'),academic=tab('academic');
    const ok=all.length>60&&dorm.length>=15&&dorm.every(t=>t.includes('宿舍'))&&dorm.some(t=>t.includes('学十八公寓'))&&
      life.some(t=>t.includes('华苑餐厅'))&&outdoor.some(t=>t.includes('道路'))&&academic.some(t=>t.includes('数学与信息科学学院'))&&
      document.querySelector('[data-cat=academic]').getAttribute('aria-selected')==='true';
    const featured=tab('featured');
    return ok&&featured.length===26&&document.querySelector('#place-count').textContent.startsWith('26')&&document.querySelector('[data-cat=featured]').getAttribute('aria-selected')==='true';
  })()`));
  check('Search reaches non-featured dormitories by name',await evaluate(`(()=>{const s=document.querySelector('#search');s.value='学十八';s.dispatchEvent(new Event('input'));
    const hit=[...document.querySelectorAll('#place-list .place')].map(b=>b.textContent);s.value='';s.dispatchEvent(new Event('input'));
    return hit.length===1&&hit[0].includes('学十八公寓')&&document.querySelectorAll('#place-list .place').length===26;})()`));
  const categories=await evaluate(`(()=>{
    const lists={};
    for(const tab of document.querySelectorAll('[data-cat]')){
      tab.click();
      const names=[...document.querySelectorAll('#place-list .rowtext b')].map(b=>b.textContent);
      if(tab.getAttribute('aria-selected')!=='true'||document.querySelectorAll('[data-cat][aria-selected=true]').length!==1||
        document.querySelector('#place-count').textContent!==names.length+' 个地点')throw Error('Wrong selected tab or count: '+tab.textContent);
      lists[tab.dataset.cat]=names;
    }
    return lists;
  })()`);
  const partition=['academic','dorm','life','outdoor'].flatMap(key=>categories[key]);
  const original=categories.all.filter(n=>!eastDormNames.includes(n)),originalPartition=partition.filter(n=>!eastDormNames.includes(n));
  check('The four categories partition all 76 unique places and include the expected landmarks',
    original.length===76 && new Set(original).size===76 && originalPartition.length===76 && new Set(originalPartition).size===76 &&
    originalPartition.every(n=>original.includes(n)) && categories.featured.every(n=>original.includes(n)) &&
    categories.academic.includes('3号教学楼') && categories.dorm.includes('学五公寓') &&
    categories.life.includes('华苑餐厅') && categories.outdoor.includes('志义体育场'));
  check('Exactly eight Dongyuan residences join the original 76 places, all under Dorms',
    categories.all.length===84 && new Set(partition).size===84 && partition.length===84 &&
    eastDormNames.every(n=>categories.dorm.includes(n)&&categories.all.includes(n)&&!categories.featured.includes(n)));
  check('Dongyuan search across categories distinguishes numbered buildings and their source cards',await eastDormCards());
  for(const [tab,query] of [['academic','学五公寓'],['dorm','3号教学楼']]){
    check('Campus-wide search opens '+query+' from a different category and restores that category on Escape',
      await evaluate(`(()=>{
        const tab=document.querySelector('[data-cat=${tab}]'),s=document.querySelector('#search'),names=()=>[...document.querySelectorAll('#place-list .rowtext b')].map(b=>b.textContent);
        tab.click();const before=names();s.value=${JSON.stringify(query)};s.dispatchEvent(new Event('input'));
        const hits=names();s.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true}));
        const card=document.querySelector('#detail'),ok=!card.hidden&&card.querySelector('h2').textContent===s.value&&Boolean(card.querySelector('[data-route]'));
        card.querySelector('[data-close]')?.click();s.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}));
        return !before.includes(${JSON.stringify(query)})&&hits.length===1&&hits[0]===${JSON.stringify(query)}&&ok&&s.value===''&&tab.getAttribute('aria-selected')==='true'&&before.join('|')===names().join('|');
      })()`));
  }
  await evaluate("document.querySelector('[data-cat=featured]').click()");
  check('All four non-featured landmarks open their own reference, model and return card',await surveyCards());
  await evaluate("document.querySelector('#place-list .place').click();document.querySelector('#detail [data-close]').click()");
  await settle();
  const [stageX,stageY]=await centerOf('#stage');
  await clickAt(stageX,stageY);
  await settle();
  check('Clicking a 3D building picks it, opens its card and marks it in the list',await evaluate("!document.querySelector('#detail').hidden && document.querySelector('#detail h2').textContent.includes('图书馆') && (document.querySelector('#place-list .place[aria-current=true]')?.textContent.includes('图书馆')??false)"));
  await evaluate("document.querySelector('#detail [data-route]').click()");
  check('A* routing plans West Gate to the library and re-plans a longer route from the North Gate',await evaluate(`(()=>{
    const bar=document.querySelector('#route-bar'),m=document.querySelector('#route-summary').textContent.match(/步行约 (\\d+) 米 · 约 (\\d+) 分钟/);
    if(bar.hidden||!m||document.querySelector('#route-from').value!=='west'||document.querySelector('#route-to').value!=='library')return false;
    const f=document.querySelector('#route-from');f.value='north';f.dispatchEvent(new Event('change'));
    const n=document.querySelector('#route-summary').textContent.match(/步行约 (\\d+) 米/);
    return +m[1]>300&&+m[1]<900&&+m[2]>=1&&n&&+n[1]>+m[1]+150;
  })()`));
  // The short road costs more on foot than the longer, quieter right-angle path.
  const junction=createCampusRouter({road:[
    [[[0,0],[180,0]],12,'','trunk'], [[[0,0],[0,30],[180,30],[180,0]],3,'','footway']
  ]}).findRoute([0,0],[180,0]);
  check('A* prefers the pedestrian detour, returns its bends and times the walked distance',
    junction?.distance===240 && junction.minutes===3 && junction.points.some(([x,z])=>x===0&&z===30) && junction.points.some(([x,z])=>x===180&&z===30));
  const itinerary=await evaluate("document.querySelector('#route-summary').textContent");
  const duration=itinerary.match(/^步行约 (\d+) 米 · 约 (\d+) 分钟$/);
  check('The cross-campus route card shows walking time consistent with its distance',
    duration && Number(duration[1])>Math.hypot(153.3,527.8) && Number(duration[2])===Math.max(1,Math.round(Number(duration[1])/75)));
  await capture('route');
  await evaluate("document.querySelector('#route-walk').click()");
  await settle();
  check('A route can be walked from its start with the radar minimap',await evaluate("document.querySelector('[data-mode=walk]').getAttribute('aria-pressed')==='true' && document.querySelector('#mode-note').textContent.includes('前往金明校区图书馆') && !document.querySelector('#minimap').hidden && document.querySelector('#minimap canvas').width>0"));
  check('Live walking navigation shows remaining distance and a directional arrow',await evaluate("(()=>{const n=document.querySelector('#route-nav');return !n.hidden && /剩余 \\d+ 米/.test(document.querySelector('#route-live').textContent) && Number(n.dataset.remaining)>200 && document.querySelector('#route-arrow').style.transform.includes('rotate(')})()"));
  await capture('route-nav');
  {
    const remBefore=await evaluate("Number(document.querySelector('#route-nav').dataset.remaining)");
    await evaluate("document.querySelector('#route-autoplay').click()");
    const started=await evaluate("document.querySelector('#route-bar').dataset.auto==='true' && document.querySelector('#route-autoplay').getAttribute('aria-pressed')==='true'");
    await Promise.all([pause(600),evaluate("new Promise(r=>{let n=0;const f=()=>++n>=8?r():requestAnimationFrame(f);requestAnimationFrame(f)})")]);
    const remAfter=await evaluate("Number(document.querySelector('#route-nav').dataset.remaining)");
    await evaluate("document.querySelector('#walk-forward').click()");
    await settle();
    const paused=await evaluate("document.querySelector('#route-bar').dataset.auto==='false' && document.querySelector('#route-autoplay').getAttribute('aria-pressed')==='false'");
    check('Auto-walk advances along the A* route and pauses cleanly on manual takeover',started&&remAfter<remBefore-2&&paused);
  }
  await evaluate("document.querySelector('#route-clear').click();document.querySelector('#home').click()");
  check('Closing navigation removes the route bar',await evaluate("document.querySelector('#route-bar').hidden && document.querySelector('#route-nav').hidden && document.querySelector('#street-help').hidden"));
  await evaluate("document.querySelector('#lighting').click()");
  check('Time-of-day presets switch exclusively between dusk, night and morning',await evaluate(`(()=>{
    if(document.querySelector('#env-panel').hidden||document.querySelector('#lighting').getAttribute('aria-expanded')!=='true')return false;
    const pick=n=>{document.querySelector('[data-light='+n+']').click();return document.querySelector('.viewport').dataset.lighting===n&&document.querySelector('[data-light='+n+']').getAttribute('aria-pressed')==='true'&&document.querySelectorAll('[data-light][aria-pressed=true]').length===1};
    return pick('sunset')&&pick('morning')&&pick('night');
  })()`));
  await capture('night');
  await evaluate("document.querySelector('#zoom-in').click()");
  await settle();
  const orbitShare=await evaluate("(document.querySelector('#share').click(),location.href)");
  const sharedCam=new URL(orbitShare).searchParams.get('cam')?.split(',').map(Number);
  check('Share link records the orbit camera and the night lighting',sharedCam?.length===6&&sharedCam.every(Number.isFinite)&&new URL(orbitShare).searchParams.get('light')==='night');
  await readyAt(orbitShare);
  const restoredCam=new URL(await evaluate("(document.querySelector('#share').click(),location.href)")).searchParams.get('cam')?.split(',').map(Number);
  check('Opening a shared orbit link restores the same camera and lighting',restoredCam?.length===6&&restoredCam.every((v,i)=>Math.abs(v-sharedCam[i])<1.5)&&
    await evaluate("document.querySelector('.viewport').dataset.lighting==='night' && document.querySelector('[data-light=night]').getAttribute('aria-pressed')==='true'"));
  await evaluate("document.querySelector('[data-light=noon]').click();document.querySelector('[data-mode=walk]').click();document.querySelector('#walk-forward').click()");
  const walkShare=await evaluate("(document.querySelector('#share').click(),location.href)");
  const sharedPos=new URL(walkShare).searchParams.get('pos')?.split(',').map(Number);
  await readyAt(walkShare);
  const restoredPos=new URL(await evaluate("(document.querySelector('#share').click(),location.href)")).searchParams.get('pos')?.split(',').map(Number);
  check('Opening a shared walking link restores the walker position and heading',sharedPos?.length===4&&restoredPos?.length===4&&restoredPos.every((v,i)=>Math.abs(v-sharedPos[i])<.05)&&
    await evaluate("document.querySelector('[data-mode=walk]').getAttribute('aria-pressed')==='true' && !new URL(location.href).searchParams.has('light')"));
  // Target the middle of a non-featured roof. No prior selection, sidebar action
  // or pin can supply the identity: the actual pointer event must hit the stage.
  await readyAt(url+'/?cam=-108,98,582,-108,19,578');
  await evaluate("document.querySelector('[data-cat=dorm]').click()");
  const [roofX,roofY]=await centerOf('#stage');
  assert(await evaluate(`Boolean(document.elementFromPoint(${roofX},${roofY})?.closest('#stage')) && document.querySelector('#detail').hidden`));
  await clickAt(roofX,roofY);
  check('A real canvas click on the unlabelled dorm roof opens the correct non-featured detail',
    await evaluate("!document.querySelector('#detail').hidden && document.querySelector('#detail h2').textContent==='学五公寓' && document.querySelector('.place[aria-current=true] .rowtext b')?.textContent==='学五公寓'"));

  await readyAt(url+'/?cam=700,97,322,700,18,318');
  await clickAt(...await centerOf('#stage'));
  check('Picking the detached east-row roof opens building 25 and routes to its courtyard',
    await evaluate(`(()=>{const d=document.querySelector('#detail');if(d.hidden||d.querySelector('h2').textContent!=='学二十五公寓')return false;
      d.querySelector('[data-route]').click();const summary=document.querySelector('#route-summary').textContent;
      return document.querySelector('#route-to').value==='b-712688793'&&/^步行约 [1-9][0-9]+ 米 · 约 [1-9][0-9]* 分钟$/.test(summary);
    })()`));

  const pose=[-287.24,24.36,1.43,1.04]; // A clear piece of Boxiang Road, looking up at the sky.
  await readyAt(url+'/?pos='+pose.join(',')+'&light=sunset');
  const dusk=await sceneLuminance();
  await evaluate("document.querySelector('#lighting').click();document.querySelector('[data-light=night]').click();document.querySelector('#lighting').click()");
  const night=await sceneLuminance();
  check('Changing sunset to night visibly darkens the rendered scene at the same position',night+25<dusk);
  const combined=new URL(await evaluate("(document.querySelector('#share').click(),location.href)"));
  check('A walking share contains all four pose values and the non-default light together',
    combined.searchParams.get('pos')===pose.join(',') && combined.searchParams.get('light')==='night' && !combined.searchParams.has('view') && !combined.searchParams.has('cam'));
  await readyAt(combined.href);
  const roundTrip=new URL(await evaluate(`(()=>{
    history.replaceState(null,'',location.pathname); // Re-serialize the live camera, not the incoming query.
    document.querySelector('#share').click();return location.href;
  })()`));
  check('Reopening the combined link restores position, heading, pitch, night lighting and the walking minimap',
    roundTrip.searchParams.get('pos')===pose.join(',') && roundTrip.searchParams.get('light')==='night' &&
    await evaluate("document.querySelector('[data-mode=walk]').getAttribute('aria-pressed')==='true' && !document.querySelector('#minimap').hidden && document.querySelector('.viewport').dataset.lighting==='night' && document.querySelector('[data-light=night]').getAttribute('aria-pressed')==='true'"));
  await evaluate("document.querySelector('[data-light=noon]').click();document.querySelector('#notice').hidden=true");
  await evaluate("document.querySelector('#home').click();document.querySelector('#tour').click()");
  check('Tour picker offers three story routes from the toolbar and the sidebar',await evaluate(`(()=>{const d=document.querySelector('#tour-dialog'),ids=[...d.querySelectorAll('[data-tour]')].map(b=>b.dataset.tour);
    return d.open&&ids.join(',')==='axis,life,lake'&&document.querySelectorAll('[data-open-tour]').length===2&&[...d.querySelectorAll('[data-tour]')].every(b=>/\\d+ 站/.test(b.textContent));})()`));
  check('Starting the axis tour flies to West Gate with a caption card in morning light',await evaluate(`(()=>{
    document.querySelector('#tour-dialog [data-tour=axis]').click();
    const c=document.querySelector('#tour-card'),u=new URL(location.href).searchParams;
    const started=!document.querySelector('#tour-dialog').open&&!c.hidden&&c.dataset.stop==='1'&&c.dataset.playing==='true'&&document.querySelector('#tour-step').textContent==='1 / 7'&&
      document.querySelector('#tour-title').textContent.includes('西大门')&&document.querySelector('#tour-caption').textContent.length>20&&document.querySelector('#tour-prev').disabled&&
      document.querySelector('#mode-label').textContent==='校园云游'&&document.querySelector('#detail').hidden&&u.get('tour')==='axis'&&u.get('stop')==='1'&&
      document.querySelector('.viewport').dataset.lighting==='morning'&&(document.querySelector('#place-list .place[aria-current=true]')?.textContent.includes('西大门')??false);
    document.querySelector('#tour-toggle').click();return started;})()`));
  // Capturing a frame on a software GPU may take longer than a tour stop.
  // Resume only when the manual navigation assertions are ready to run.
  await capture('tour-axis');
  check('Next and previous move between tour stops and keep the link in step',await evaluate(`(()=>{const n=document.querySelector('#tour-next'),p=document.querySelector('#tour-prev'),c=document.querySelector('#tour-card');
    document.querySelector('#tour-toggle').click();n.click();n.click();const third=c.dataset.stop==='3'&&document.querySelector('#tour-title').textContent.includes('图书馆')&&new URL(location.href).searchParams.get('stop')==='3';
    p.click();return third&&c.dataset.stop==='2'&&document.querySelector('#tour-dots .current')===document.querySelectorAll('#tour-dots i')[1];})()`));
  check('Pause and continue toggle the tour',await evaluate(`(()=>{const t=document.querySelector('#tour-toggle'),c=document.querySelector('#tour-card');
    t.click();const paused=c.dataset.playing==='false'&&t.textContent==='继续';t.click();return paused&&c.dataset.playing==='true'&&t.textContent==='暂停';})()`));
  await dragBy(stageX,stageY,60,10);
  await settle();
  check('Dragging the scene takes over and pauses the tour without leaving it',await evaluate("document.querySelector('#tour-card').dataset.playing==='false' && !document.querySelector('#tour-card').hidden && document.querySelector('#tour-card').dataset.stop==='2'"));
  await evaluate("document.querySelector('#tour-toggle').click()");
  await until(()=>evaluate("document.querySelector('#tour-card').dataset.stop==='3'"),'Tour autoplay advances',25000);
  check('A resumed tour advances to the next stop on its own',true);
  const tourShare=await evaluate("(document.querySelector('#share').click(),location.href)");
  check('Sharing during a tour links to the current tour stop',new URL(tourShare).searchParams.get('tour')==='axis'&&new URL(tourShare).searchParams.get('stop')==='3'&&!new URL(tourShare).searchParams.has('cam'));
  await evaluate("document.querySelector('#tour-exit').click()");
  check('Leaving the tour restores lighting, labels and the place card',await evaluate("document.querySelector('#tour-card').hidden && !new URL(location.href).searchParams.has('tour') && document.querySelector('.viewport').dataset.lighting==='noon' && document.querySelector('#mode-label').textContent==='三维校园' && !document.querySelector('#detail').hidden"));
  await readyAt(url+'/?tour=lake&stop=6');
  check('A shared tour link opens the final lakeside stop at night',await evaluate("document.querySelector('#tour-card').dataset.tour==='lake' && document.querySelector('#tour-step').textContent==='6 / 6' && document.querySelector('#tour-next').textContent.includes('完成') && document.querySelector('.viewport').dataset.lighting==='night' && !document.querySelector('#tour-walk').hidden"));
  await capture('tour-night');
  await evaluate("document.querySelector('#tour-next').click()");
  check('Finishing a tour offers a restart',await evaluate("document.querySelector('#tour-card').dataset.finished==='true' && document.querySelector('#tour-toggle').textContent==='重新开始'"));
  await evaluate("document.querySelector('#tour-toggle').click()");
  check('Restarting returns to the first stop',await evaluate("document.querySelector('#tour-card').dataset.stop==='1' && document.querySelector('#tour-card').dataset.playing==='true'"));
  await evaluate("document.querySelector('#tour-walk').click()");
  check('Going down to the ground leaves the tour for the stop viewpoint',await evaluate("document.querySelector('#tour-card').hidden && document.querySelector('[data-mode=walk]').getAttribute('aria-pressed')==='true' && new URL(location.href).searchParams.get('view')==='pharmacy' && document.querySelector('.viewport').dataset.lighting==='noon'"));
  await readyAt(url+'/?tour=lake&stop=6');
  await evaluate("document.querySelector('#tour-walk').click()");
  check('Descending from a nighttime library tour stop preserves night lighting in walk mode',await evaluate("document.querySelector('#tour-card').hidden && document.querySelector('[data-mode=walk]').getAttribute('aria-pressed')==='true' && document.querySelector('.viewport').dataset.lighting==='night' && document.querySelector('#mode-note').textContent.includes('图书馆')"));
  await evaluate("document.querySelector('[data-light=noon]').click();document.querySelector('#home').click()");
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
  check('Touch joystick appears in walk mode without covering the walk buttons',await evaluate(`(()=>{
    const j=document.querySelector('#joystick');if(j.hidden||!j.getClientRects().length)return false;
    const r=j.getBoundingClientRect(),hit=(a,b)=>a.left<b.right&&b.left<a.right&&a.top<b.bottom&&b.top<a.bottom;
    return r.width>=88&&r.left>=0&&r.right<=innerWidth&&r.top>=0&&r.bottom<=document.querySelector('.viewport').getBoundingClientRect().bottom&&
      j.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2))&&
      ![...document.querySelectorAll('#street-help button,#minimap')].filter(b=>b.getClientRects().length).some(b=>hit(b.getBoundingClientRect(),r));
  })()`));
  await capture('mobile-walk');
  {
    const pose=async()=>new URL(await evaluate("(document.querySelector('#share').click(),location.href)")).searchParams.get('pos').split(',').map(Number);
    const [jx,jy]=await evaluate("(()=>{const r=document.querySelector('#joystick').getBoundingClientRect();return [r.left+r.width/2,r.top+r.height/2]})()");
    const hold=async(dx,dy,ms,frames=6)=>{
      await call('Input.dispatchMouseEvent',{type:'mousePressed',x:jx,y:jy,button:'left',buttons:1,clickCount:1});
      await call('Input.dispatchMouseEvent',{type:'mouseMoved',x:jx+dx,y:jy+dy,button:'left',buttons:1});
      await Promise.all([pause(ms),evaluate(`new Promise(r=>{let n=0;const f=()=>++n>=${frames}?r():requestAnimationFrame(f);requestAnimationFrame(f)})`)]);
      await call('Input.dispatchMouseEvent',{type:'mouseReleased',x:jx+dx,y:jy+dy,button:'left',buttons:0,clickCount:1});
      await settle();
    };
    const start=await pose();
    await hold(0,-44,700,6);
    const moved=await pose();
    await hold(44,0,500,6);
    const turned=await pose();
    check('One-thumb joystick walks forward and turns, then recentres',Math.hypot(moved[0]-start[0],moved[1]-start[1])>2&&Math.abs(turned[2]-moved[2])>.2&&
      await evaluate("document.querySelector('.joystick-knob').style.transform==='' && !document.querySelector('#joystick').classList.contains('engaged')"));
  }
  await evaluate("document.querySelector('[data-mode=model]').click()");
  check('Leaving walk mode restores the selected place',await evaluate("!document.querySelector('#detail').hidden && document.querySelector('#detail h2').textContent.includes('图书馆')"));
  check('Mobile place sheet stays inside the map, clear of the controls, with tappable actions',await evaluate(`(()=>{
    const d=document.querySelector('#detail').getBoundingClientRect(),v=document.querySelector('.viewport').getBoundingClientRect(),c=document.querySelector('.map-controls').getBoundingClientRect();
    const actions=[...document.querySelectorAll('#detail .detail-walk')];
    return d.left>=0&&d.right<=c.left&&d.bottom<=v.bottom&&d.top>=v.top+60&&document.documentElement.scrollWidth<=innerWidth&&
      actions.length>=2&&actions.every(b=>b.getBoundingClientRect().height>=34);
  })()`));
  await capture('mobile-detail');
  await evaluate("document.querySelector('#tour').click();document.querySelector('#tour-dialog [data-tour=life]').click()");
  await settle();
  check('Mobile tour card fits the screen with large controls and no horizontal overflow',await evaluate(`(()=>{
    const c=document.querySelector('#tour-card'),r=c.getBoundingClientRect(),v=document.querySelector('.viewport').getBoundingClientRect();
    const buttons=[...c.querySelectorAll('.tour-actions button')].filter(b=>b.getClientRects().length);
    const home=document.querySelector('#home').getBoundingClientRect();
    return !c.hidden&&r.left>=0&&r.right<=innerWidth&&r.bottom<=v.bottom&&document.documentElement.scrollWidth<=innerWidth&&
      buttons.length>=3&&buttons.every(b=>{const q=b.getBoundingClientRect();return q.height>=44&&b.contains(document.elementFromPoint(q.x+q.width/2,q.y+q.height/2))})&&
      home.bottom<=r.top&&document.querySelector('#home').contains(document.elementFromPoint(home.x+home.width/2,home.y+home.height/2));
  })()`));
  await capture('mobile-tour');
  await evaluate("document.querySelector('#tour-exit').click()");
  {
    const expandedH=await evaluate("document.querySelector('#stage').clientHeight");
    await evaluate("document.querySelector('#sheet-toggle').click()");
    await settle();
    const collapsed=await evaluate("(()=>{const s=document.querySelector('.sidebar'),h=document.querySelector('#sheet-toggle').getBoundingClientRect();return {sheet:s.dataset.sheet,stageH:document.querySelector('#stage').clientHeight,btnH:h.height,overflow:document.documentElement.scrollWidth>window.innerWidth}})()");
    await capture('mobile-collapsed');
    const [sx,sy]=await evaluate("(()=>{const r=document.querySelector('#sheet-toggle').getBoundingClientRect();return [r.left+r.width/2,r.top+r.height/2]})()");
    await call('Input.dispatchMouseEvent',{type:'mousePressed',x:sx,y:sy,button:'left',buttons:1,clickCount:1});
    await call('Input.dispatchMouseEvent',{type:'mouseMoved',x:sx,y:sy-40,button:'left',buttons:1});
    await call('Input.dispatchMouseEvent',{type:'mouseReleased',x:sx,y:sy-40,button:'left',buttons:0,clickCount:1});
    await settle();
    const reopened=await evaluate("document.querySelector('.sidebar').dataset.sheet==='expanded' && document.querySelector('#place-list .place').getClientRects().length>0");
    check('Mobile bottom sheet collapses to expand the 3D viewport and reopens on upward swipe',collapsed.sheet==='collapsed'&&collapsed.stageH>expandedH+90&&collapsed.btnH>=44&&!collapsed.overflow&&reopened);
  }
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
  await evaluate("document.querySelector('#map-photos').click();document.querySelector('[data-view=stadium-field]').click();document.querySelector('#route-next').click()");
  check('Canvas reaches the stand at track level and identifies it as a model viewpoint',await evaluate("document.querySelector('#stage').dataset.renderer==='canvas' && document.querySelector('#mode-note').textContent.includes('跑道边模型近看') && document.querySelector('#route-position').textContent.includes('3 / 4')"));
  await capture('field-fallback-stadium');
  await evaluate("document.querySelector('#map-photos').click();document.querySelector('[data-view=teaching-23]').click()");
  await capture('field-fallback-teaching-23');
  check('Both courts are linked in the original mobile walking controls',await evaluate(`(()=>{
    const next=document.querySelector('#route-next');next.click();next.click();
    return new URL(location.href).searchParams.get('view')==='teaching-56'&&document.querySelector('#stage').dataset.renderer==='canvas'&&next.disabled;
  })()`));
  await evaluate("document.querySelector('#map-photos').click();document.querySelector('[data-view=dongyuan-22]').click()");
  await capture('field-fallback-dongyuan');
  check('Mobile Canvas follows all three Dongyuan street positions into the aerial overview',await evaluate(`(()=>{
    const next=document.querySelector('#route-next'),at=()=>new URL(location.href).searchParams.get('view');
    const stops=[at()];for(let i=0;i<3;i++){next.click();stops.push(at());}
    return stops.join() === 'dongyuan-22,dongyuan-20,dongyuan-19,dongyuan-courts' && next.disabled &&
      document.querySelector('#stage').dataset.renderer==='canvas' && document.querySelector('[data-mode=model]').getAttribute('aria-pressed')==='true';
  })()`));
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
  if(failures.length||shaderErrors.size)console.error({failures,shaderErrors:[...shaderErrors]});
  check('No uncaught browser exceptions', failures.length === 0);
  check('WebGL programs actually linked, with no shader errors across all viewpoints', linkedPrograms>0 && shaderErrors.size===0);
  const diagnostics={linkedPrograms,shaderErrors:[...shaderErrors],failures};
  await writeFile(join(output, 'results.json'), JSON.stringify({ checks, stats, ...diagnostics }, null, 2) + '\n');
  console.log(JSON.stringify({ checks: checks.length, stats, ...diagnostics }, null, 2));
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
