import * as T from 'three';
import { OrbitControls } from './assets/OrbitControls.js';
import { softwareRenderer } from './software.js';
import { libraryFacade, libraryVolumes } from './facade.js';
import { addBuildingDetails, computingSignColumns } from './building-detail.js';
import { addLandscapeDetails } from './landscape-detail.js';
import { addTreeModels } from './tree-model.js';
import { addWestGate } from './west-gate.js';
import { campusAvenueData, avenueTrees, avenueHedgeRuns } from './avenue.js';
import { fieldGround, entryGap, putFieldTrees } from './field-ground.js';
import { campusSky, shadeGround } from './daylight.js';
import { applyGroundSurfaceTextures } from './ground-surfaces.js';

const ground = 0;
const extent = 1400;
const homeOffset = new T.Vector3(-600, 1150, 1050);
const palette = {
  library: ['#c8bea7','#e5ddca'],
  dorm: ['#bbab99','#d5cbb8'],
  school: ['#c4bcaa','#e1dac7'],
  other: ['#a6aea4','#c1c8ba'],
  context: ['#8b998c','#a5b19f']
};

const closed = (points) => points[0][0] === points.at(-1)[0] && points[0][1] === points.at(-1)[1];
const contains = (x, z, ring) => {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [a,b] = ring[i], [c,d] = ring[j];
    if ((b > z) !== (d > z) && x < (c - a) * (z - b) / (d - b) + a) inside = !inside;
  }
  return inside;
};
const bounds = (points) => points.reduce(([a,b,c,d],[x,z]) => [Math.min(a,x),Math.min(b,z),Math.max(c,x),Math.max(d,z)],[Infinity,Infinity,-Infinity,-Infinity]);
const shape = (points) => new T.Shape(points.slice(0, closed(points) ? -1 : undefined).map(([x,z]) => new T.Vector2(x, -z)));

class Batch {
  constructor() { this.positions = []; this.colors = []; this.normals = []; }
  add(geometry, color) {
    const g = geometry.index ? geometry.toNonIndexed() : geometry;
    const p = g.attributes.position.array, n = g.attributes.normal.array;
    const painted=!color&&g.getAttribute('color');
    const light = new T.Color();
    for (let i = 0; i < p.length; i += 3) {
      this.positions.push(p[i],p[i+1],p[i+2]);
      this.normals.push(n[i],n[i+1],n[i+2]);
      if (painted) light.fromBufferAttribute(painted,i/3);
      else if (Array.isArray(color)) light.set(n[i+1] > .7 ? color[1] : color[0]);
      else light.set(color);
      this.colors.push(light.r,light.g,light.b);
    }
    if (g !== geometry) g.dispose();
    geometry.dispose();
  }
  surface(points, y, color) {
    const g = new T.ShapeGeometry(shape(points));
    g.rotateX(-Math.PI / 2);
    g.translate(0,y,0);
    this.add(g,color);
  }
  ribbon(points, width, y, color) {
    const vertices = [];
    for (let i = 0; i < points.length - 1; i++) {
      const [x,z] = points[i], [u,v] = points[i+1];
      const len = Math.hypot(u-x,v-z);
      if (len < .15) continue;
      const dx = (v-z)*width/(2*len), dz = (x-u)*width/(2*len);
      const ax = x+dx, az=z+dz, bx=x-dx, bz=z-dz, cx=u+dx, cz=v+dz, ex=u-dx, ez=v-dz;
      vertices.push(ax,y,az,bx,y,bz,cx,y,cz,bx,y,bz,ex,y,ez,cx,y,cz);
    }
    if (!vertices.length) return;
    const g = new T.BufferGeometry();
    g.setAttribute('position',new T.Float32BufferAttribute(vertices,3));
    g.computeVertexNormals();
    this.add(g,color);
  }
  mesh(options = {}) {
    const g = new T.BufferGeometry();
    g.setAttribute('position',new T.Float32BufferAttribute(this.positions,3));
    g.setAttribute('normal',new T.Float32BufferAttribute(this.normals,3));
    g.setAttribute('color',new T.Float32BufferAttribute(this.colors,3));
    return new T.Mesh(g,new T.MeshStandardMaterial({vertexColors:true,roughness:.94,side:T.DoubleSide,...options}));
  }
}

function seeded() {
  let seed = 854812;
  return () => ((seed = (Math.imul(1664525,seed) + 1013904223) >>> 0) / 4294967296);
}
function terrainTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 256;
  const ctx = canvas.getContext('2d'), random = seeded();
  ctx.fillStyle = '#a7ada0';
  ctx.fillRect(0,0,256,256);
  for (let i=0;i<9800;i++) {
    const v = Math.floor(119+random()*82);
    ctx.fillStyle = 'rgba(' + v + ',' + (v+4) + ',' + (v-4) + ',.26)';
    ctx.fillRect(random()*256,random()*256,1+random()*4,1+random()*4);
  }
  const tex = new T.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = T.RepeatWrapping;
  tex.repeat.set(20,20);
  tex.colorSpace = T.SRGBColorSpace;
  return tex;
}
function treePositions(data) {
  const random=seeded();
  const blockers=[...data.building.map(([p])=>p),...data.water,...data.sport.map(([p])=>p),...data.plaza].map(p=>[bounds(p),p]);
  // Replay the established plan first, to avoid shifting distant plantings
  // when the two survey lines become a single rendered avenue.
  const planningRoads=data.avenue?.originalRoad??data.road;
  const edges=planningRoads.flatMap(([p,w])=>p.slice(1).map(([x,z],i)=>[p[i][0],p[i][1],x,z,w/2+4]));
  const positions=[], occupied=new Map(),spacing=8;
  function nearEdge(x,z,a,b,c,d,r){
    if(x<Math.min(a,c)-r||x>Math.max(a,c)+r||z<Math.min(b,d)-r||z>Math.max(b,d)+r)return false;
    const dx=c-a,dz=d-b,l=dx*dx+dz*dz;
    const t=l?Math.max(0,Math.min(1,((x-a)*dx+(z-b)*dz)/l)):0;
    return (x-a-t*dx)**2+(z-b-t*dz)**2<r*r;
  }
  function blocked(x,z,clearance){
    return !contains(x,z,data.boundary)||blockers.some(([[a,b,c,d],p])=>{
      if(x<a-clearance||x>c+clearance||z<b-clearance||z>d+clearance)return false;
      return contains(x,z,p)||(clearance>0&&p.some(([u,v],i)=>{
        const [e,f]=p[(i+1)%p.length];return nearEdge(x,z,u,v,e,f,clearance);
      }));
    })||edges.some(([a,b,c,d,r])=>nearEdge(x,z,a,b,c,d,r));
  }
  function maybeAdd(x,z,form,h,roadside){
    const clearance=h*(form==='shade'?.32:form==='vase'?.25:.2);
    if(blocked(x,z,clearance))return false;
    const col=Math.floor(x/spacing), row=Math.floor(z/spacing);
    for(let i=col-1;i<=col+1;i++)for(let j=row-1;j<=row+1;j++){
      const nearby=occupied.get(i+','+j);
      if(nearby?.some(([u,v])=>(u-x)**2+(v-z)**2<spacing*spacing))return true; // Already planted nearby.
    }
    const key=col+','+row;
    if(!occupied.has(key))occupied.set(key,[]);
    occupied.get(key).push([x,z]);
    positions.push([x,z,h,form,roadside,random(),random()*2*Math.PI,.9+.2*random(),.9+.2*random()]);
    return true;
  }
  // Reserve the regular roadside rows before filling the surrounding open ground.
  for(const [p,w,,type] of planningRoads){
    if(type!=='service'&&type!=='footway')continue;
    const form=random()<(type==='service'?.72:.43)?'shade':'vase';
    const nominal=(form==='shade'?9.4:8.2)+random()*2.4;
    for(let j=1;j<p.length;j++){
      const [a,b]=p[j-1],[c,d]=p[j], l=Math.hypot(c-a,d-b);
      if(l<24||l>750)continue;
      for(let k=14;k<l;k+=24){
        const offset=w/2+8;
        maybeAdd(a+(c-a)*k/l+(d-b)*offset/l,b+(d-b)*k/l-(c-a)*offset/l,form,nominal+(random()-.5)*1.8,true);
      }
    }
  }
  // Replay the established planting plan independently of the trees' new appearance.
  // Its seed advanced once more for height at each plantable point.
  const sample=seeded();
  for(let i=0;i<1350;i++){
    const x=sample()*1000-490,z=sample()*1370-592;
    if(blocked(x,z,0))continue;
    const h=7+sample()*6;
    const choice=random(),form=choice<.54?'shade':choice<.82?'vase':'spire';
    if(maybeAdd(x,z,form,h,false))continue;
    // A larger crown may touch a wall or water at an existing point. Try
    // the nearby verge, never moving a tree across an entire path or plaza.
    const angle=random()*2*Math.PI;
    for(let j=0;j<8;j++){
      const a=angle+j*Math.PI/4;
      if(maybeAdd(x+4*Math.cos(a),z+4*Math.sin(a),form,h,false))break;
    }
  }
  // Replace some of the crowded-out planting only within mapped parkland and lawns.
  const greens=data.green.map(([p])=>[bounds(p),p]);
  const [left,top,right,bottom]=bounds(data.boundary);
  for(let i=0;i<520;i++){
    const x=left+sample()*(right-left),z=top+sample()*(bottom-top);
    if(!greens.some(([[a,b,c,d],p])=>x>=a&&x<=c&&z>=b&&z<=d&&contains(x,z,p)))continue;
    const choice=random();
    maybeAdd(x,z,choice<.54?'shade':choice<.82?'vase':'spire',7+random()*6,false);
  }
  return putFieldTrees(avenueTrees(data,positions,contains),data.field,contains);
}
function finishShrubs(material){
  // Project one small locally drawn leaf pattern in world metres. The mipmaps
  // average it to a neutral shade in distant views; no external images needed.
  const canvas=document.createElement('canvas');canvas.width=canvas.height=256;
  const c=canvas.getContext('2d'),rnd=seeded();
  c.fillStyle='#8f9388';c.fillRect(0,0,256,256);
  for(let i=0;i<3000;i++){
    const x=rnd()*256,y=rnd()*256,a=rnd()*Math.PI,r=1.3+2.7*rnd(),v=Math.round(72+160*rnd());
    c.fillStyle='rgb('+v+','+v+','+Math.round(v*.94)+')';
    for(const dx of (x<5?[0,256]:x>251?[0,-256]:[0]))for(const dy of (y<5?[0,256]:y>251?[0,-256]:[0])){
      c.beginPath();c.ellipse(x+dx,y+dy,r,r*.48,a,0,Math.PI*2);c.fill();
    }
  }
  const tex=new T.CanvasTexture(canvas);tex.wrapS=tex.wrapT=T.RepeatWrapping;
  material.onBeforeCompile=shader=>{
    shader.uniforms.leafTone={value:tex};
    shader.vertexShader='varying vec3 shrubPoint;\n'+shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nshrubPoint=position;');
    shader.fragmentShader='uniform sampler2D leafTone;\nvarying vec3 shrubPoint;\n'+shader.fragmentShader.replace('#include <color_fragment>',
      '#include <color_fragment>\nvec2 p=(shrubPoint.xz+vec2(.53,.91)*shrubPoint.y)/1.45; diffuseColor.rgb*=.29+texture2D(leafTone,p).rgb*1.16;');
  };
}
function addTrees(scene,positions,data) {
  addTreeModels(scene,positions);
  // Baidu panorama 01027700001404011238110455G shows low clipped hedges
  // and round shrubs beside internal roads. Placement below is schematic.
  const planting=new Batch(),rnd=seeded();
  function bush(x,z,rx,h,rz,tone){
    const g=new T.IcosahedronGeometry(1,1),p=g.attributes.position,n=g.attributes.normal,c=[];
    const col=new T.Color();
    for(let i=0;i<p.count;i++){
      const a=p.getX(i),b=p.getY(i),d=p.getZ(i);
      const noise=Math.sin(a*12.2+d*9.11+b*18.1+tone*12)*Math.cos(d*11+b*7.9);
      const f=1+.11*noise;
      const round=v=>h>1.2?v:Math.sign(v)*Math.pow(Math.abs(v),.58);
      p.setXYZ(i,x+round(a)*rx*f,.17+(round(b)*f+1)*h*.50,z+round(d)*rz*f);
      n.setXYZ(i,a,b,d);
      col.setRGB(.071+tone*.029,.123+tone*.055,.043+tone*.023).multiplyScalar(1+b*.17+noise*.19);
      c.push(col.r,col.g,col.b);
    }
    g.setAttribute('color',new T.Float32BufferAttribute(c,3));planting.add(g,null);
  }
  for(const [x,z,rx,h,rz,t] of data.field.shrubs){
    bush(x,z,rx*.82,h,rz*.80,t);bush(x-rx*.43,z+.27,rx*.68,h*.77,rz*.72,1-t);
    bush(x+rx*.47,z-.35,rx*.66,h*.86,rz*.79,t*.72);
  }
  for(const [from,to,z] of avenueHedgeRuns(data,contains)){
    // Closely clipped growth still has a changing leaf surface and a few
    // visible stems at its base, rather than a straight opaque green wall.
    const count=Math.ceil((to-from)/1.12),step=(to-from)/count;
    for(let i=0;i<count;i++){
      const x=from+(i+.5)*step;
      bush(x,z+(rnd()-.5)*.12,step*.78,.83+rnd()*.24,.55+rnd()*.10,.24+rnd()*.72);
    }
  }
  const blockers=[...data.building.map(([p])=>p),...data.water,...data.sport.map(([p])=>p)];
  for(const road of data.road){
    const [points,width,,kind]=road;
    if(kind!=='service'||width<3||width>14)continue;
    for(let i=1;i<points.length;i++){
      const [ax,az]=points[i-1],[bx,bz]=points[i];
      const length=Math.hypot(bx-ax,bz-az);
      if(length<24)continue;
      for(let distance=9;distance<length-6;distance+=6)for(const side of [-1,1]){
        const x=ax+(bx-ax)*distance/length+(bz-az)*(width/2+1.8)*side/length;
        const z=az+(bz-az)*distance/length-(bx-ax)*(width/2+1.8)*side/length;
        if(entryGap(data.field,x,z,2.9) || Math.hypot(x-116.5,z+231)<6.5)continue;
        if(road===data.avenue?.road && x>=data.avenue.start-3 && x<=data.avenue.end+3)continue;
        if(!contains(x,z,data.boundary)||blockers.some(p=>contains(x,z,p)))continue;
        // Avoid junctions and paths crossing the planted verge.
        if(data.road.some(([p,w])=>p.slice(1).some(([u,v],j)=>{
          const [a,b]=p[j],dx=u-a,dz=v-b,l=dx*dx+dz*dz;
          const t=l?T.MathUtils.clamp(((x-a)*dx+(z-b)*dz)/l,0,1):0;
          return Math.hypot(x-a-t*dx,z-b-t*dz)<w/2+1;
        })))continue;
        const hedge=new T.BoxGeometry(5.8,.65,1.15);
        hedge.rotateY(-Math.atan2(bz-az,bx-ax));
        hedge.translate(x,.52,z);planting.add(hedge,'#567747');
        if(Math.round(distance/6)%3===0){
          const shrub=new T.IcosahedronGeometry(1,1);
          shrub.scale(1.15,1,1.15);shrub.translate(x,1.25,z);
          planting.add(shrub,'#3e633d');
        }
      }
    }
  }
  const shrubs=planting.mesh();
  finishShrubs(shrubs.material);
  shrubs.name='Street-view inspired clipped roadside planting';
  shrubs.castShadow=shrubs.receiveShadow=true;scene.add(shrubs);
}
// The university entrance photo shows three separate gold characters above the canopy.
function librarySign() {
  const canvas=document.createElement('canvas');canvas.width=512;canvas.height=96;
  const c=canvas.getContext('2d');
  c.font='bold 78px KaiTi, STKaiti, SimSun, serif';c.textAlign='center';c.textBaseline='middle';
  const gold=c.createLinearGradient(0,10,0,84);
  gold.addColorStop(0,'#ffebae');gold.addColorStop(.48,'#e3bc63');gold.addColorStop(1,'#ba8442');
  for(const [i,ch] of [...'图书馆'].entries()){
    const x=64+i*192;c.fillStyle='#70522f';c.fillText(ch,x+1,52);
    c.fillStyle=gold;c.fillText(ch,x,49);
  }
  const map=new T.CanvasTexture(canvas);map.colorSpace=T.SRGBColorSpace;
  const sign=new T.Mesh(new T.PlaneGeometry(13,2.45),new T.MeshStandardMaterial({map,alphaTest:.27,roughness:.56}));
  sign.rotation.y=-Math.PI/2;sign.position.set(-183,9.55,-73);sign.name='Library entrance lettering';return sign;
}
function buildScene(scene, data, trees) {
  addWestGate(scene,data);
  const cs=data.building.find(b=>b[4]==='712688906');
  if(cs){
    // Two vertical lines of gold characters on the pale wall above the Wenfu Road entrance.
    const canvas=document.createElement('canvas');canvas.width=224;canvas.height=520;
    const c=canvas.getContext('2d');c.textAlign='center';c.textBaseline='middle';
    c.font='bold 66px KaiTi,STKaiti,SimSun,serif';
    for(const [word,x,top] of computingSignColumns){
      for(const [i,ch] of [...word].entries()){const y=top+i*72;
        c.fillStyle='#685136';c.fillText(ch,x+1.5,y+2);c.fillStyle='#ca9e48';c.fillText(ch,x,y);}
    }
    const map=new T.CanvasTexture(canvas);map.colorSpace=T.SRGBColorSpace;
    const letters=new T.Mesh(new T.PlaneGeometry(4.3,11.5),new T.MeshStandardMaterial({map,alphaTest:.25,roughness:.63}));
    letters.position.set(-8,13.8,-190.40);letters.name='Computer college entrance lettering';scene.add(letters);
  }
  const base=new T.Mesh(new T.PlaneGeometry(5100,5100),new T.MeshStandardMaterial({color:'#718269',map:terrainTexture()}));
  base.rotation.x=-Math.PI/2;
  base.position.y=ground-.15;
  base.receiveShadow=true;
  scene.add(base);
  const layers=new Batch(), buildings=new Batch();
  layers.surface(data.boundary,.06,'#687e56');
  for(const [ring,kind] of data.green) layers.surface(ring,.16,kind==='farmland'?'#777f58':'#61784e');
  for(const p of data.plaza) layers.surface(p,.45,'#a29990');
  for(const [p,y,color] of data.field.surfaces)layers.surface(p,y,color);
  for(const road of data.road){
    const [p,w,,type,bridge]=road;
    const major=['primary','secondary','trunk','tertiary'].includes(type), y=bridge?1:.72;
    const pedestrian=['pedestrian','footway','path','steps'].includes(type);
    layers.ribbon(p,w+(pedestrian?.55:2),y,pedestrian?'#948e80':major?'#56625a':'#73836b');
    layers.ribbon(p,w,y+.03,road===data.avenue?.road?'#aaa092':pedestrian?(w>=5?'#b1a99b':'#a4aa8b'):major?'#777c7b':'#8a8c86');
    if(major)layers.ribbon(p,.48,y+.06,'#b8b6a0');
  }
  layers.ribbon(data.boundary,1.7,1.03,'#a7be82');
  for(const [p,h,type,,,campus] of data.building) {
    const colors = campus ? (palette[type]??palette.other) : palette.context;
    const model = new T.ExtrudeGeometry(shape(p),{depth:h,bevelEnabled:false});
    model.rotateX(-Math.PI/2);
    model.translate(0,.08,0);
    buildings.add(model,colors);
  }
  const front=new Batch(), libraryGlass=new Batch();
  for(const [[a,b,c,d],color,finish] of libraryFacade){
    const g=new T.BufferGeometry();
    g.setAttribute('position',new T.Float32BufferAttribute([...a,...b,...c,...a,...c,...d],3));
    g.computeVertexNormals();
    (finish==='glass'?libraryGlass:front).add(g,color);
  }
  const landmark=new Batch();
  for(const {x,y,z,w,h,d,color,material} of libraryVolumes){
    const g=new T.BoxGeometry(w,h,d);
    g.translate(x,y,z);
    (material==='glass'?libraryGlass:landmark).add(g,color);
  }
  const library=landmark.mesh({roughness:.78});
  library.name='Photo-informed library entrance and roof';
  library.castShadow=library.receiveShadow=true;
  scene.add(library,librarySign());
  if(libraryGlass.positions.length){
    const glass=libraryGlass.mesh({roughness:.26,metalness:0});
    glass.name='Library curtain wall glass';scene.add(glass);
  }
  const landscape=layers.mesh(), architecture=buildings.mesh(), elevation=front.mesh();
  applyGroundSurfaceTextures(landscape);
  shadeGround(landscape,data,trees);
  landscape.name='Campus surfaces';architecture.name='Original building footprints';elevation.name='Library west elevation';
  landscape.receiveShadow=architecture.receiveShadow=true;
  // The layered reference elevation sits just ahead of the main shadow caster.
  // It uses directional shading without resampling that nearly coincident wall.
  elevation.receiveShadow=false;
  architecture.castShadow=true;
  scene.add(landscape,architecture,elevation);
  const details={Batch,contains,bounds};
  const buildingDetails=addBuildingDetails(scene,data,details);
  const landscapeDetails=addLandscapeDetails(scene,data,details);
  applyGroundSurfaceTextures(landscapeDetails.group);
  addTrees(scene,trees,data);
  return {buildingDetails,landscapeDetails};
}

export function createModel(stage,data,onFrame){
  data=campusAvenueData(data);
  data={...data,field:fieldGround(data,contains)};
  const scene = new T.Scene();
  const orbitMist=new T.FogExp2('#cad6d6',.00019), walkMist=new T.FogExp2('#dce4e4',.00082);
  scene.fog=orbitMist;
  const camera = new T.PerspectiveCamera(46,1,.5,8000);
  const trees=treePositions(data);
  const canvas=document.createElement('canvas');
  let context=null;
  try { context=canvas.getContext('webgl2',{antialias:true,alpha:false,powerPreference:'high-performance'}); } catch { /* Canvas renderer supports devices without WebGL. */ }
  const renderer=context ? new T.WebGLRenderer({canvas,context,antialias:true}) : softwareRenderer(data,palette,trees,contains);
  renderer.setPixelRatio(Math.min(devicePixelRatio,1.6));
  renderer.outputColorSpace=T.SRGBColorSpace;
  stage.dataset.renderer=context?'webgl':'canvas';
  if(context){
    renderer.toneMapping=T.ACESFilmicToneMapping;
    renderer.toneMappingExposure=1.12;
    renderer.shadowMap.enabled=true;
    renderer.shadowMap.type=T.PCFSoftShadowMap;
    renderer.shadowMap.autoUpdate=false;
    renderer.shadowMap.needsUpdate=true;
  }
  stage.append(renderer.domElement);
  const ambient=new T.HemisphereLight('#e2efff','#a09c8d',1.28);
  const sun=new T.DirectionalLight('#fff0dc',2.55);
  sun.position.set(-530,750,-620);
  sun.target.position.set(0,0,60);
  if(context){
    scene.background=scene.environment=campusSky(sun.position.clone().sub(sun.target.position).normalize());
    scene.environmentIntensity=.46;
  }
  sun.castShadow=true;
  sun.shadow.mapSize.setScalar(matchMedia('(max-width: 700px)').matches?2048:4096);
  Object.assign(sun.shadow.camera,{left:-920,right:920,top:950,bottom:-950,near:10,far:2400});
  sun.shadow.normalBias=.28;
  sun.shadow.bias=-.00015;
  scene.add(ambient,sun,sun.target);
  const details=context?buildScene(scene,data,trees):null;
  const controls = new OrbitControls(camera,stage);
  controls.enableDamping=true;
  controls.dampingFactor=.12;
  controls.rotateSpeed=.66;
  controls.screenSpacePanning=false;
  controls.minDistance=28;
  controls.maxDistance=2900;
  controls.minPolarAngle=.02;
  controls.maxPolarAngle=Math.PI*.48;
  const direction=new T.Vector3(), projection=new T.Vector3();
  const walk={active:false,yaw:0,pitch:-.02,position:new T.Vector3(),fov:65};
  const keys=new Set();
  let drag=null, tween=null, visible=true, size={w:1,h:1}, last=performance.now(), lastView='';
  const footprints=data.building.map(([ring])=>[bounds(ring),ring]);
  const water=data.water.map(ring=>[bounds(ring),ring]);
  const obstructed=(x,z)=>[...footprints,...water].some(([[a,b,c,d],ring])=>x>a&&x<c&&z>b&&z<d&&contains(x,z,ring));

  function resize(){
    size={w:Math.max(1,stage.clientWidth),h:Math.max(1,stage.clientHeight)};
    camera.aspect=size.w/size.h;
    camera.updateProjectionMatrix();
    renderer.setSize(size.w,size.h,false);
  }
  new ResizeObserver(resize).observe(stage);
  resize();

  function setOrbit(target, offset, animate=true){
    if(!animate||matchMedia('(prefers-reduced-motion: reduce)').matches){
      tween=null;
      controls.target.copy(target);
      camera.position.copy(target).add(offset);
      controls.update();
      return;
    }
    tween={from:camera.position.clone(),fromTarget:controls.target.clone(),to:target.clone().add(offset),target,start:performance.now()};
  }
  function home(animate=true){
    const offset=homeOffset.clone().multiplyScalar(camera.aspect<.83?Math.min(1.65,.83/camera.aspect):1);
    setOrbit(new T.Vector3(-10,0,100),offset,animate);
  }
  function focus(x,z){
    const offset=camera.position.clone().sub(controls.target);
    offset.y=Math.max(offset.y,120);
    offset.setLength(240);
    setOrbit(new T.Vector3(x,4,z),offset);
  }
  function face(){
    direction.set(Math.sin(walk.yaw)*Math.cos(walk.pitch),Math.sin(walk.pitch),-Math.cos(walk.yaw)*Math.cos(walk.pitch));
    camera.position.copy(walk.position);
    camera.lookAt(camera.position.clone().add(direction));
  }
  function step(metres, side=0){
    const dx=Math.sin(walk.yaw)*metres+Math.cos(walk.yaw)*side;
    const dz=-Math.cos(walk.yaw)*metres+Math.sin(walk.yaw)*side;
    const x=T.MathUtils.clamp(walk.position.x+dx,-extent,extent), z=T.MathUtils.clamp(walk.position.z+dz,-extent,extent);
    if(!obstructed(x,z)){ walk.position.x=x;walk.position.z=z; }
  }
  function enterWalk(x,z,yaw,pitch=.005,fov=65){
    controls.enabled=false;
    tween=null;
    walk.active=true;
    walk.position.set(x,2.45,z);
    walk.yaw=yaw;
    walk.pitch=pitch;
    walk.fov=fov;
    camera.fov=walk.fov;
    camera.updateProjectionMatrix();
    scene.fog=walkMist;
    face();
  }
  function exitWalk(){
    if(!walk.active)return;
    walk.active=false;
    keys.clear();
    controls.enabled=true;
    camera.fov=46;
    camera.updateProjectionMatrix();
    scene.fog=orbitMist;
    home(false);
  }
  stage.addEventListener('pointerdown',event=>{
    stage.focus({preventScroll:true});
    tween=null;
    if(!walk.active||event.button!==0)return;
    drag={id:event.pointerId,x:event.clientX,y:event.clientY};
    stage.setPointerCapture(event.pointerId);
  });
  stage.addEventListener('pointermove',event=>{
    if(!walk.active||!drag||drag.id!==event.pointerId)return;
    walk.yaw-=(event.clientX-drag.x)*.0045;
    walk.pitch=T.MathUtils.clamp(walk.pitch+(event.clientY-drag.y)*.0045,-1.32,1.32);
    drag.x=event.clientX; drag.y=event.clientY;
  });
  for(const type of ['lostpointercapture','pointerup','pointercancel'])stage.addEventListener(type,()=>{drag=null;});
  const walkingKeys=['w','s','a','d','arrowup','arrowdown','arrowleft','arrowright'];
  stage.addEventListener('keydown',e=>{
    const key=e.key.toLowerCase();
    if(walk.active&&walkingKeys.includes(key)){
      e.preventDefault();keys.add(key);
    }
  });
  window.addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));
  stage.addEventListener('blur',()=>keys.clear());
  stage.addEventListener('wheel',e=>{
    if(walk.active){e.preventDefault();zoom(e.deltaY<0?1:-1);}
    else tween=null;
  },{passive:false});
  function zoom(amount){
    if(walk.active){
      walk.fov=T.MathUtils.clamp(walk.fov-amount*8,26,92);
      camera.fov=walk.fov;
      camera.updateProjectionMatrix();
      return;
    }
    const offset=camera.position.clone().sub(controls.target);
    offset.setLength(T.MathUtils.clamp(offset.length()*(amount>0?.72:1.38),controls.minDistance,controls.maxDistance));
    setOrbit(controls.target.clone(),offset);
  }
  function north(){
    if(walk.active){walk.yaw=0;return;}
    const offset=camera.position.clone().sub(controls.target);
    offset.z=Math.hypot(offset.x,offset.z);
    offset.x=0;
    setOrbit(controls.target.clone(),offset);
  }
  function project(x,y,z){
    projection.set(x,y,z).project(camera);
    return {x:(projection.x/2+.5)*size.w,y:(.5-projection.y/2)*size.h,visible:projection.z>-1&&projection.z<1};
  }
  function frame(time){
    const dt=Math.min(.05,(time-last)/1000);
    last=time;
    if(!visible)return;
    if(walk.active){
      const has=(a,b)=>keys.has(a)||keys.has(b);
      const move=Number(has('w','arrowup'))-Number(has('s','arrowdown'));
      const side=Number(has('d','arrowright'))-Number(has('a','arrowleft'));
      if(move||side)step(move*dt*13,side*dt*13);
      face();
    }else{
      if(tween){
        const p=Math.min(1,(time-tween.start)/540), q=1-(1-p)**3;
        camera.position.lerpVectors(tween.from,tween.to,q);
        controls.target.lerpVectors(tween.fromTarget,tween.target,q);
        if(p===1)tween=null;
      }
      controls.update();
    }
    // Give shallow facade and paving layers enough depth precision at campus scale.
    const near=walk.active?.2:T.MathUtils.clamp(camera.position.distanceTo(controls.target)/30,.75,40);
    if(Math.abs(camera.near-near)>.01){camera.near=near;camera.updateProjectionMatrix();}
    const view=[camera.position.x,camera.position.y,camera.position.z,camera.quaternion.x,camera.quaternion.y,camera.quaternion.z,camera.quaternion.w,camera.fov,camera.near,size.w,size.h].map(value=>value.toFixed(5)).join(',');
    if(view===lastView)return;
    lastView=view;
    renderer.render(scene,camera);
    const bearing=walk.active?-walk.yaw:Math.atan2(camera.position.x-controls.target.x,camera.position.z-controls.target.z);
    const metersPerPixel=2*Math.tan(T.MathUtils.degToRad(camera.fov/2))*camera.position.distanceTo(controls.target)/size.h;
    onFrame(project,bearing,metersPerPixel,size,walk.active);
  }
  home(false);
  renderer.setAnimationLoop(frame);
  return {focus,home,zoom,north,enterWalk,exitWalk,step,
    getDiagnostics(){
      let vertices=0,invalid=0;
      scene.traverse(object=>{
        const position=object.geometry?.attributes?.position;
        if(!position)return;
        vertices+=position.count;
        for(const value of position.array)if(!Number.isFinite(value))invalid++;
      });
      const treeForms={shade:0,vase:0,spire:0};
      for(const entry of trees)treeForms[entry[3]]++;
      return {renderer:stage.dataset.renderer,vertices,invalid,trees:trees.length,treeForms,
        buildings:details?.buildingDetails?.stats,landscape:details?.landscapeDetails?.stats,
        drawCalls:renderer.info?.render.calls,triangles:renderer.info?.render.triangles};
    },
    setVisible(value){visible=value;keys.clear();if(value){lastView='';resize();}}
  };
}
