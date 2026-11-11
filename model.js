import * as T from 'three';
import { OrbitControls } from './assets/OrbitControls.js';
import { softwareRenderer } from './software.js';
import { libraryFacade, libraryVolumes } from './facade.js';
import { addBuildingDetails } from './building-detail.js';
import { addLandscapeDetails } from './landscape-detail.js';

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
    const light = new T.Color();
    for (let i = 0; i < p.length; i += 3) {
      this.positions.push(p[i],p[i+1],p[i+2]);
      this.normals.push(n[i],n[i+1],n[i+2]);
      if (Array.isArray(color)) light.set(n[i+1] > .7 ? color[1] : color[0]);
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
  const edges=data.road.flatMap(([p,w])=>p.slice(1).map(([x,z],i)=>[p[i][0],p[i][1],x,z,w/2+4]));
  const positions=[];
  function maybeAdd(x,z){
    if (!contains(x,z,data.boundary) || blockers.some(([[a,b,c,d],p])=>x>a-4&&x<c+4&&z>b-4&&z<d+4&&contains(x,z,p))) return;
    if(edges.some(([a,b,c,d,r])=>{
      if(x<Math.min(a,c)-r||x>Math.max(a,c)+r||z<Math.min(b,d)-r||z>Math.max(b,d)+r)return false;
      const l=(c-a)**2+(d-b)**2;
      const t=l?T.MathUtils.clamp(((x-a)*(c-a)+(z-b)*(d-b))/l,0,1):0;
      return Math.hypot(x-a-t*(c-a),z-b-t*(d-b))<r;
    })) return;
    positions.push([x,z,3.5+random()*4.5]);
  }
  for(let i=0;i<1350;i++) maybeAdd(random()*1000-490,random()*1370-592);
  for(const [p,w,,type] of data.road){
    if(type!=='service'&&type!=='footway')continue;
    for(let j=1;j<p.length;j++){
      const [a,b]=p[j-1],[c,d]=p[j], l=Math.hypot(c-a,d-b);
      if(l<24||l>750)continue;
      for(let k=14;k<l;k+=24){
        const offset=w/2+8;
        maybeAdd(a+(c-a)*k/l+(d-b)*offset/l,b+(d-b)*k/l-(c-a)*offset/l);
      }
    }
  }
  return positions;
}
function addTrees(scene,positions,data) {
  const random=seeded();
  const stem=new T.InstancedMesh(new T.CylinderGeometry(.19,.35,3.8,7),new T.MeshStandardMaterial({color:'#786e55',roughness:1}),positions.length);
  const crown=new T.InstancedMesh(new T.IcosahedronGeometry(1,1),new T.MeshStandardMaterial({roughness:.96}),positions.length*4);
  const whitewash=new T.InstancedMesh(new T.CylinderGeometry(.292,.36,1.3,7),new T.MeshStandardMaterial({color:'#e0dfce',roughness:1}),positions.length);
  const canopy=['#5d7b49','#739052','#52774b','#84995b','#648351'];
  const helper=new T.Object3D();
  positions.forEach(([x,z,h],i)=>{
    helper.position.set(x,1.9,z);
    helper.scale.setScalar(1);
    helper.rotation.set(0,0,0);
    helper.updateMatrix();
    stem.setMatrixAt(i,helper.matrix);
    helper.position.y=.65;
    helper.updateMatrix();
    whitewash.setMatrixAt(i,helper.matrix);
    const color=new T.Color(canopy[i%canopy.length]);
    for(let lobe=0;lobe<4;lobe++){
      const angle=lobe*Math.PI*2/3+random()*.5;
      const spread=lobe===3?0:h*.21;
      helper.position.set(x+Math.cos(angle)*spread,h*(lobe===3?1.05:.73)+1.3,z+Math.sin(angle)*spread);
      helper.scale.set(h*.38,h*(lobe===3?.43:.45),h*.38);
      helper.rotation.y=random()*Math.PI;
      helper.updateMatrix();
      crown.setMatrixAt(i*4+lobe,helper.matrix);
      crown.setColorAt(i*4+lobe,color.clone().multiplyScalar(.92+random()*.15));
    }
  });
  stem.name='Tree trunks';crown.name='Layered tree canopies';
  stem.castShadow=crown.castShadow=true;
  stem.receiveShadow=crown.receiveShadow=true;
  whitewash.name='Street-view reference whitewashed tree bases';
  whitewash.receiveShadow=true;
  scene.add(stem,crown,whitewash);
  // Baidu panorama 01027700001404011238110455G shows low clipped hedges
  // and round shrubs beside internal roads. Placement below is schematic.
  const planting=new Batch();
  const blockers=[...data.building.map(([p])=>p),...data.water,...data.sport.map(([p])=>p)];
  for(const [points,width,,kind] of data.road){
    if(kind!=='service'||width<3||width>14)continue;
    for(let i=1;i<points.length;i++){
      const [ax,az]=points[i-1],[bx,bz]=points[i];
      const length=Math.hypot(bx-ax,bz-az);
      if(length<24)continue;
      for(let distance=9;distance<length-6;distance+=6)for(const side of [-1,1]){
        const x=ax+(bx-ax)*distance/length+(bz-az)*(width/2+1.8)*side/length;
        const z=az+(bz-az)*distance/length-(bx-ax)*(width/2+1.8)*side/length;
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
  shrubs.name='Street-view inspired clipped roadside planting';
  shrubs.castShadow=shrubs.receiveShadow=true;scene.add(shrubs);
}
function buildScene(scene, data, trees) {
  const base=new T.Mesh(new T.PlaneGeometry(5100,5100),new T.MeshStandardMaterial({color:'#718269',map:terrainTexture()}));
  base.rotation.x=-Math.PI/2;
  base.position.y=ground-.15;
  base.receiveShadow=true;
  scene.add(base);
  const layers=new Batch(), buildings=new Batch();
  layers.surface(data.boundary,.06,'#687e56');
  for(const [ring,kind] of data.green) layers.surface(ring,.16,kind==='farmland'?'#777f58':'#61784e');
  for(const p of data.plaza) layers.surface(p,.45,'#969684');
  for(const [p,w,,type,bridge] of data.road){
    const major=['primary','secondary','trunk','tertiary'].includes(type), y=bridge?1:.72;
    layers.ribbon(p,w+2,y,major?'#56625a':'#73836b');
    layers.ribbon(p,w,y+.03,major?'#8e9288':w>3?'#a5a58d':'#a4aa8b');
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
  const front=new Batch();
  for(const [[a,b,c,d],color] of libraryFacade){
    const g=new T.BufferGeometry();
    g.setAttribute('position',new T.Float32BufferAttribute([...a,...b,...c,...a,...c,...d],3));
    g.computeVertexNormals();
    front.add(g,color);
  }
  const landmark=new Batch();
  for(const {x,y,z,w,h,d,color} of libraryVolumes){
    const g=new T.BoxGeometry(w,h,d);
    g.translate(x,y,z);
    landmark.add(g,color);
  }
  const library=landmark.mesh({roughness:.78});
  library.name='Photo-informed library entrance and roof';
  library.castShadow=library.receiveShadow=true;
  scene.add(library);
  const landscape=layers.mesh(), architecture=buildings.mesh(), elevation=front.mesh();
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
  addTrees(scene,trees,data);
  return {buildingDetails,landscapeDetails};
}

export function createModel(stage,data,onFrame){
  const scene = new T.Scene(), sky = new T.Color('#b8c9c8');
  scene.background = new T.Color('#53695d');
  scene.fog = new T.FogExp2('#53695d',.00028);
  const camera = new T.PerspectiveCamera(46,1,.5,8000);
  const trees=treePositions(data);
  const canvas=document.createElement('canvas');
  let context=null;
  try { context=canvas.getContext('webgl2',{antialias:true,alpha:false,powerPreference:'high-performance'}); } catch { /* Canvas renderer supports devices without WebGL. */ }
  const renderer=context ? new T.WebGLRenderer({canvas,context,antialias:true}) : softwareRenderer(data,palette,trees);
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
  const ambient=new T.HemisphereLight('#eaf3fa','#778264',1.65);
  const sun=new T.DirectionalLight('#fff0d7',2.5);
  sun.position.set(-470,830,-380);
  sun.target.position.set(0,0,60);
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
  function enterWalk(x,z,yaw){
    controls.enabled=false;
    tween=null;
    walk.active=true;
    walk.position.set(x,2.45,z);
    walk.yaw=yaw;
    walk.pitch=.005;
    walk.fov=65;
    camera.fov=walk.fov;
    camera.updateProjectionMatrix();
    scene.background=sky;
    scene.fog=new T.FogExp2(sky,.00105);
    face();
  }
  function exitWalk(){
    if(!walk.active)return;
    walk.active=false;
    keys.clear();
    controls.enabled=true;
    camera.fov=46;
    camera.updateProjectionMatrix();
    scene.background=new T.Color('#53695d');
    scene.fog=new T.FogExp2('#53695d',.00028);
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
      return {renderer:stage.dataset.renderer,vertices,invalid,trees:trees.length,
        buildings:details?.buildingDetails?.stats,landscape:details?.landscapeDetails?.stats,
        drawCalls:renderer.info?.render.calls,triangles:renderer.info?.render.triangles};
    },
    setVisible(value){visible=value;keys.clear();if(value){lastView='';resize();}}
  };
}
