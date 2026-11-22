import * as T from 'three';
import { OrbitControls } from './assets/OrbitControls.js';
import { softwareRenderer } from './software.js';
import { libraryFacade, libraryVolumes } from './facade.js';
import { addBuildingDetails, computingSignColumns } from './building-detail.js';
import { addLandscapeDetails } from './landscape-detail.js';
import { addTreeModels } from './tree-model.js';
import { addWestGate } from './west-gate.js';
import { campusAvenueData, avenueTrees, avenueHedgeRuns } from './avenue.js';
import { fieldGround, entryGap, putFieldTrees, walkingWater } from './field-ground.js';
import { buildingSolids, hallId } from './wenfu.js';
import { steppedIds } from './landmark-wings.js';
import { labId, labPlaque, physicsGroundHeight, physicsCourt } from './physics.js';
import { facultyColors, visibleSigns, facultyHeights } from './faculty-sites.js';
import { publicBlockers,hasMarco,isMarcoRing,marcoHole } from './campus-commons.js';
import { stadiumSign, standId, teachingId, eastGateBlockers, hasEastGate, boundaryLines } from './east-campus.js';
import {standHeight,canStepOnStand,stadiumFence} from './stadium-bowl.js';
import { campusSky, shadeGround, LIGHTING_PRESETS } from './daylight.js';
import { applyGroundSurfaceTextures } from './ground-surfaces.js';
import { createPlayerAvatar } from './avatar.js';

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
function groundShape(points,holes=[]){
  const s=shape(points);for(const h of holes)s.holes.push(shape(h));
  return new T.ShapeGeometry(s);
}

class Batch {
  constructor() { this.positions = []; this.colors = []; this.normals = []; this.indices = []; }
  add(geometry, color) {
    const p = geometry.attributes.position.array, n = geometry.attributes.normal.array;
    const painted = !color && geometry.getAttribute('color');
    const base = this.positions.length / 3;
    const light = new T.Color();
    const single = !painted && !Array.isArray(color) ? light.set(color) : null;
    const sideCol = Array.isArray(color) ? new T.Color(color[0]) : null;
    const topCol = Array.isArray(color) ? new T.Color(color[1]) : null;
    for (let i = 0; i < p.length; i += 3) {
      this.positions.push(p[i], p[i + 1], p[i + 2]);
      this.normals.push(n[i], n[i + 1], n[i + 2]);
      if (painted) {
        light.fromBufferAttribute(painted, i / 3);
        this.colors.push(light.r, light.g, light.b);
      } else if (single) {
        this.colors.push(single.r, single.g, single.b);
      } else {
        const c = n[i + 1] > .7 ? topCol : sideCol;
        this.colors.push(c.r, c.g, c.b);
      }
    }
    const idx = geometry.index;
    if (idx) {
      const arr = idx.array;
      for (let i = 0; i < arr.length; i++) this.indices.push(base + arr[i]);
    } else {
      for (let i = 0, count = p.length / 3; i < count; i++) this.indices.push(base + i);
    }
    geometry.dispose();
  }
  surface(points, y, color, holes = []) {
    const g = groundShape(points, holes);
    g.rotateX(-Math.PI / 2);
    g.translate(0, y, 0);
    this.add(g, color);
  }
  ribbon(points, width, y, color) {
    const c = new T.Color(Array.isArray(color) ? color[1] : color);
    for (let i = 0; i < points.length - 1; i++) {
      const [x, z] = points[i], [u, v] = points[i + 1];
      const len = Math.hypot(u - x, v - z);
      if (len < .15) continue;
      const dx = (v - z) * width / (2 * len), dz = (x - u) * width / (2 * len);
      const base = this.positions.length / 3;
      this.positions.push(x + dx, y, z + dz, x - dx, y, z - dz, u + dx, y, v + dz, u - dx, y, v - dz);
      this.normals.push(0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0);
      this.colors.push(c.r, c.g, c.b, c.r, c.g, c.b, c.r, c.g, c.b, c.r, c.g, c.b);
      this.indices.push(base, base + 1, base + 2, base + 1, base + 3, base + 2);
    }
  }
  mesh(options = {}) {
    const g = new T.BufferGeometry();
    g.setAttribute('position', new T.Float32BufferAttribute(this.positions, 3));
    g.setAttribute('normal', new T.Float32BufferAttribute(this.normals, 3));
    g.setAttribute('color', new T.Float32BufferAttribute(this.colors, 3));
    g.setIndex(this.indices);
    g.computeBoundingSphere();
    return new T.Mesh(g, new T.MeshStandardMaterial({ vertexColors: true, roughness: .94, side: T.DoubleSide, ...options }));
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
  material.customProgramCacheKey=()=>'campus-shrub-leaf-v1';
  material.onBeforeCompile=shader=>{
    shader.uniforms.leafTone={value:tex};
    shader.vertexShader='varying vec3 shrubPoint;\n'+shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
      vec4 shrubWorld=vec4(transformed,1.0);
      #ifdef USE_INSTANCING
        shrubWorld=instanceMatrix*shrubWorld;
      #endif
      shrubPoint=(modelMatrix*shrubWorld).xyz;`);
    shader.fragmentShader='uniform sampler2D leafTone;\nvarying vec3 shrubPoint;\n'+shader.fragmentShader.replace('#include <color_fragment>',
      '#include <color_fragment>\nvec2 p=(shrubPoint.xz+vec2(.53,.91)*shrubPoint.y)/1.45; diffuseColor.rgb*=.29+texture2D(leafTone,p).rgb*1.16;');
  };
}
function bushTemplate(cushion){
  const g=new T.SphereGeometry(1,8,5),p=g.attributes.position,n=g.attributes.normal,c=[];
  for(let i=0;i<p.count;i++){
    const a=p.getX(i),b=p.getY(i),d=p.getZ(i);
    const noise=Math.sin(a*12.2+d*9.11+b*18.1+4.2)*Math.cos(d*11+b*7.9);
    const f=1+.11*noise;
    const r=v=>cushion?Math.sign(v)*Math.pow(Math.abs(v),.58):v;
    p.setXYZ(i,r(a)*f,(r(b)*f+1)*.50,r(d)*f);
    n.setXYZ(i,a,b,d);
    const shade=Math.max(.45,1+b*.17+noise*.19);
    c.push(shade,shade,shade);
  }
  g.setAttribute('color',new T.Float32BufferAttribute(c,3));
  g.computeBoundingSphere();
  return g;
}
function addTrees(scene,positions,data) {
  addTreeModels(scene,positions);
  // Baidu panorama 01027700001404011238110455G shows low clipped hedges
  // and round shrubs beside internal roads. Placement below is schematic.
  const lowItems=[], tallItems=[], hedgeItems=[], rnd=seeded();
  const tmpColor=new T.Color();
  function pushBush(x,z,rx,h,rz,tone,leaf,lift=0,yaw=0){
    const color=leaf?tmpColor.set(leaf).clone():new T.Color().setRGB(.071+tone*.029,.123+tone*.055,.043+tone*.023);
    (h>1.2?tallItems:lowItems).push({x,y:.17+lift,z,sx:rx,sy:h,sz:rz,yaw,color});
  }
  for(const [x,z,rx,h,rz,t,leaf,lift] of data.field.shrubs){
    const a=t*19.3;
    pushBush(x,z,rx*.82,h,rz*.80,t,leaf,lift,a);
    pushBush(x-rx*.43,z+.27,rx*.68,h*.77,rz*.72,1-t,leaf,lift,a+2.1);
    pushBush(x+rx*.47,z-.35,rx*.66,h*.86,rz*.79,t*.72,leaf,lift,a+4.2);
  }
  for(const [from,to,z] of avenueHedgeRuns(data,contains)){
    // Closely clipped growth still has a changing leaf surface and a few
    // visible stems at its base, rather than a straight opaque green wall.
    const count=Math.ceil((to-from)/1.12),step=(to-from)/count;
    for(let i=0;i<count;i++){
      const x=from+(i+.5)*step;
      pushBush(x,z+(rnd()-.5)*.12,step*.82,.83+rnd()*.24,.58+rnd()*.10,.24+rnd()*.72,null,0,0);
    }
  }
  const blockers=[...data.building.map(([p])=>p),...data.water,...data.sport.map(([p])=>p)].map(p=>[bounds(p),p]);
  const roadSegs=data.road.flatMap(([p,w])=>p.slice(1).map(([u,v],j)=>{
    const [a,b]=p[j],lim=w/2+1;
    return [Math.min(a,u)-lim,Math.min(b,v)-lim,Math.max(a,u)+lim,Math.max(b,v)+lim,a,b,u-a,v-b,lim*lim];
  }));
  const hedgeColor=new T.Color('#567747'), shrubColor=new T.Color('#3e633d');
  for(const road of data.road){
    const [points,width,,kind]=road;
    if(kind!=='service'||width<3||width>14)continue;
    for(let i=1;i<points.length;i++){
      const [ax,az]=points[i-1],[bx,bz]=points[i];
      const length=Math.hypot(bx-ax,bz-az);
      if(length<24)continue;
      const yaw=-Math.atan2(bz-az,bx-ax);
      for(let distance=9;distance<length-6;distance+=6)for(const side of [-1,1]){
        const x=ax+(bx-ax)*distance/length+(bz-az)*(width/2+1.8)*side/length;
        const z=az+(bz-az)*distance/length-(bx-ax)*(width/2+1.8)*side/length;
        if(entryGap(data.field,x,z,2.9) || data.field.forecourts.some(p=>contains(x,z,p)) || Math.hypot(x-116.5,z+231)<6.5)continue;
        if(road===data.avenue?.road && x>=data.avenue.start-3 && x<=data.avenue.end+3)continue;
        if(!contains(x,z,data.boundary)||blockers.some(([[l,t,r,b],p])=>x>=l&&x<=r&&z>=t&&z<=b&&contains(x,z,p)))continue;
        // Avoid junctions and paths crossing the planted verge.
        if(roadSegs.some(([l,t,r,b,a,c,dx,dz,lim2])=>{
          if(x<l||x>r||z<t||z>b)return false;
          const sq=dx*dx+dz*dz,u=sq?T.MathUtils.clamp(((x-a)*dx+(z-c)*dz)/sq,0,1):0;
          const rx=x-a-u*dx,rz=z-c-u*dz;
          return rx*rx+rz*rz<lim2;
        }))continue;
        hedgeItems.push({x,y:.52,z,sx:1,sy:1,sz:1,yaw,color:hedgeColor});
        if(Math.round(distance/6)%3===0){
          tallItems.push({x,y:.25,z,sx:1.15,sy:2,sz:1.15,yaw,color:shrubColor});
        }
      }
    }
  }
  const shrubMaterial=new T.MeshStandardMaterial({vertexColors:true,roughness:.94,side:T.FrontSide});
  finishShrubs(shrubMaterial);
  const helper=new T.Object3D();
  function mountInstanced(geo,items,name){
    if(!items.length){geo.dispose();return;}
    const mesh=new T.InstancedMesh(geo,shrubMaterial,items.length);
    mesh.name=name;
    items.forEach(({x,y,z,sx,sy,sz,yaw,color},i)=>{
      helper.position.set(x,y,z);helper.rotation.set(0,yaw,0);helper.scale.set(sx,sy,sz);helper.updateMatrix();
      mesh.setMatrixAt(i,helper.matrix);
      mesh.setColorAt(i,color);
    });
    mesh.instanceMatrix.needsUpdate=true;
    if(mesh.instanceColor)mesh.instanceColor.needsUpdate=true;
    mesh.castShadow=mesh.receiveShadow=true;
    scene.add(mesh);
  }
  const boxHedgeGeo=new T.BoxGeometry(5.8,.65,1.15);
  boxHedgeGeo.setAttribute('color',new T.Float32BufferAttribute(new Float32Array(boxHedgeGeo.attributes.position.count*3).fill(1),3));
  mountInstanced(bushTemplate(true),lowItems,'Clipped cushion shrubs');
  mountInstanced(bushTemplate(false),tallItems,'Rounded roadside shrubs');
  mountInstanced(boxHedgeGeo,hedgeItems,'Street-view inspired clipped roadside hedges');
}
// The university entrance photo shows three separate gold characters above the canopy.
function librarySign(anisotropy=1) {
  const canvas=document.createElement('canvas');canvas.width=512;canvas.height=96;
  const c=canvas.getContext('2d');
  c.font='bold 78px KaiTi, STKaiti, SimSun, serif';c.textAlign='center';c.textBaseline='middle';
  const gold=c.createLinearGradient(0,10,0,84);
  gold.addColorStop(0,'#ffebae');gold.addColorStop(.48,'#e3bc63');gold.addColorStop(1,'#ba8442');
  for(const [i,ch] of [...'图书馆'].entries()){
    const x=64+i*192;c.fillStyle='#70522f';c.fillText(ch,x+1,52);
    c.fillStyle=gold;c.fillText(ch,x,49);
  }
  const map=new T.CanvasTexture(canvas);map.colorSpace=T.SRGBColorSpace;map.anisotropy=anisotropy;
  const sign=new T.Mesh(new T.PlaneGeometry(13,2.45),new T.MeshStandardMaterial({map,alphaTest:.27,roughness:.56}));
  sign.rotation.y=-Math.PI/2;sign.position.set(-183,9.55,-73);sign.name='Library entrance lettering';return sign;
}
function buildScene(scene, data, trees, anisotropy=1) {
  addWestGate(scene,data,anisotropy);
  for(const {text,width,height,point,yaw,color,horizontal} of visibleSigns(data)){
    const cv=document.createElement('canvas');cv.width=120*(horizontal?text.length:1);cv.height=120*(horizontal?1:text.length);
    const ctx=cv.getContext('2d');ctx.font='bold 92px KaiTi,STKaiti,SimSun,serif';ctx.textAlign='center';ctx.textBaseline='middle';
    [...text].forEach((ch,i)=>{const x=horizontal?(i+.5)*120:60,y=horizontal?60:(i+.5)*120;
      ctx.fillStyle='#6a5b50';ctx.fillText(ch,x+2,y+2);ctx.fillStyle=color;ctx.fillText(ch,x,y);});
    const map=new T.CanvasTexture(cv);map.colorSpace=T.SRGBColorSpace;map.anisotropy=anisotropy;
    const sign=new T.Mesh(new T.PlaneGeometry(width,height),new T.MeshStandardMaterial({map,alphaTest:.20,roughness:.76}));
    sign.position.set(...point);sign.rotation.y=yaw;sign.name=text;scene.add(sign);
  }
  if(data.building.some(b=>b[4]===labId)){
    const {text,width,height,point,yaw}=labPlaque;
    const panel=document.createElement('canvas');panel.width=112;panel.height=560;
    const ctx=panel.getContext('2d');ctx.fillStyle='#c4bca7';ctx.fillRect(0,0,112,560);
    ctx.fillStyle='#373c37';ctx.font='bold 70px SimSun,serif';ctx.textAlign='center';ctx.textBaseline='middle';
    [...text].forEach((ch,i)=>ctx.fillText(ch,56,58+i*72));
    const map=new T.CanvasTexture(panel);map.colorSpace=T.SRGBColorSpace;map.anisotropy=anisotropy;
    const plate=new T.Mesh(new T.PlaneGeometry(width,height),new T.MeshStandardMaterial({map,roughness:.79}));
    plate.position.set(...point);plate.rotation.y=yaw;plate.name='Physics teaching laboratory entrance plaque';scene.add(plate);
  }
  if(data.building.some(b=>b[4]===standId)){
    const {text,width,height,point,yaw,color,background}=stadiumSign;
    const cv=document.createElement('canvas');cv.width=1280;cv.height=144;const ctx=cv.getContext('2d');
    ctx.fillStyle=background;ctx.fillRect(0,0,cv.width,cv.height);
    ctx.fillStyle=color;ctx.font='bold 104px KaiTi,STKaiti,SimSun,serif';ctx.textAlign='center';ctx.textBaseline='middle';
    [...text].forEach((ch,i)=>ctx.fillText(ch,cv.width*(i+.5)/text.length,72));
    const map=new T.CanvasTexture(cv);map.colorSpace=T.SRGBColorSpace;map.anisotropy=anisotropy;
    const plate=new T.Mesh(new T.PlaneGeometry(width,height),new T.MeshStandardMaterial({map,roughness:.82}));
    plate.position.set(...point);plate.rotation.y=yaw;plate.name=text;scene.add(plate);
  }
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
    const map=new T.CanvasTexture(canvas);map.colorSpace=T.SRGBColorSpace;map.anisotropy=anisotropy;
    const letters=new T.Mesh(new T.PlaneGeometry(4.3,11.5),new T.MeshStandardMaterial({map,alphaTest:.25,roughness:.63}));
    letters.position.set(-8,13.8,-190.40);letters.name='Computer college entrance lettering';scene.add(letters);
  }
  const holes=hasMarco(data)?[marcoHole()]:[],extent=2550;
  const baseGeo=groundShape([[-extent,-extent],[extent,-extent],[extent,extent],[-extent,extent]],holes);
  const uv=baseGeo.getAttribute('uv');
  for(let i=0;i<uv.count;i++)uv.setXY(i,.5+uv.getX(i)/(2*extent),.5+uv.getY(i)/(2*extent));
  const base=new T.Mesh(baseGeo,new T.MeshStandardMaterial({color:'#718269',map:terrainTexture()}));
  base.rotation.x=-Math.PI/2;
  base.position.y=ground-.15;
  base.receiveShadow=true;
  scene.add(base);
  const layers=new Batch(), buildings=new Batch();
  layers.surface(data.boundary,.06,'#687e56',holes);
  for(const [ring,kind] of data.green) layers.surface(ring,.16,kind==='farmland'?'#777f58':'#61784e');
  for(const p of data.plaza) layers.surface(p,.45,'#a29990',isMarcoRing(p)?holes:[]);
  for(const [p,y,color] of data.field.surfaces)layers.surface(p,y,color);
  for(const road of data.road){
    const [p,w,,type,bridge]=road;
    const major=['primary','secondary','trunk','tertiary'].includes(type), y=bridge?1:.72;
    const pedestrian=['pedestrian','footway','path','steps'].includes(type);
    layers.ribbon(p,w+(pedestrian?.55:2),y,pedestrian?'#948e80':major?'#56625a':'#73836b');
    layers.ribbon(p,w,y+.03,road===data.avenue?.road?'#aaa092':pedestrian?(w>=5?'#b1a99b':'#a4aa8b'):major?'#777c7b':'#8a8c86');
    if(major)layers.ribbon(p,.48,y+.06,'#b8b6a0');
  }
  for(const line of boundaryLines(data))layers.ribbon(line,1.7,1.03,'#a7be82');
  for(const {p,base,top,record,custom} of buildingSolids(data.building)) {
    if(custom)continue;
    const [,,type,,id,campus]=record;
    const colors=facultyColors[id]??(type==='library'?['#cdcbc2','#c6c4ba']:id===labId?['#a65b46','#b0aba0']:id===hallId?['#b99880','#bfbaa9']:
      id===teachingId||id===standId?['#d8d7ce','#c3c2b9']:campus?(palette[type]??palette.other):palette.context);
    const model = new T.ExtrudeGeometry(shape(p),{depth:top-base,bevelEnabled:false});
    model.rotateX(-Math.PI/2);
    model.translate(0,base,0);
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
  const library=landmark.mesh({roughness:.78,side:T.FrontSide});
  library.name='Photo-informed library entrance and roof';
  library.castShadow=library.receiveShadow=true;
  const libSign=librarySign(anisotropy);
  scene.add(library,libSign);
  let libraryGlassMesh=null;
  if(libraryGlass.positions.length){
    libraryGlassMesh=libraryGlass.mesh({roughness:.26,metalness:0});
    libraryGlassMesh.name='Library curtain wall glass';scene.add(libraryGlassMesh);
  }
  const landscape=layers.mesh({side:T.FrontSide}), architecture=buildings.mesh({side:T.FrontSide}), elevation=front.mesh();
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
  if(buildingDetails.plazaGround)applyGroundSurfaceTextures(buildingDetails.plazaGround);
  if(libraryGlassMesh && buildingDetails.nightGlowUniform){
    const lm=libraryGlassMesh.material;
    lm.customProgramCacheKey=()=>'campus-lib-glass-v1';
    lm.onBeforeCompile=shader=>{
      shader.uniforms.uNightGlow=buildingDetails.nightGlowUniform;
      shader.vertexShader='varying vec3 vWinPos;\n'+shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvWinPos=position;');
      shader.fragmentShader='uniform float uNightGlow;\nvarying vec3 vWinPos;\n'+shader.fragmentShader.replace('#include <emissivemap_fragment>',`#include <emissivemap_fragment>
      if (uNightGlow > 0.01) {
        float floorIdx = floor((vWinPos.y - 1.2) / 3.8);
        float bayIdx = floor(vWinPos.z / 5.5);
        float fh = fract(sin(floorIdx * 127.1 + 19.3) * 43758.5453);
        float bh = fract(sin(dot(vec2(bayIdx, floorIdx), vec2(91.7, 311.7))) * 43758.5453);
        float fy = fract((vWinPos.y - 1.2) / 3.8);
        float band = smoothstep(0.08, 0.26, fy) * (1.0 - smoothstep(0.74, 0.94, fy));
        float lit = mix(0.16, 0.72, step(0.32, fh) * step(0.28, bh)) * band;
        vec3 warm = mix(vec3(1.0, 0.80, 0.46), vec3(0.96, 0.88, 0.70), fract(bh * 7.3));
        totalEmissiveRadiance += warm * lit * uNightGlow * 0.78;
      }`);
    };
  }
  const landscapeDetails=addLandscapeDetails(scene,data,details);
  applyGroundSurfaceTextures(landscapeDetails.group);
  // Warm ground light pools under the 135 campus street lamps (shown at dusk/night).
  let lampHalos=null;
  if(landscapeDetails.lampPositions?.length){
    const c=document.createElement('canvas');c.width=c.height=64;
    const ctx=c.getContext('2d'),g=ctx.createRadialGradient(32,32,0,32,32,32);
    g.addColorStop(0,'rgba(255,212,138,0.68)');g.addColorStop(.45,'rgba(255,194,108,0.22)');g.addColorStop(1,'rgba(255,180,90,0)');
    ctx.fillStyle=g;ctx.fillRect(0,0,64,64);
    const tex=new T.CanvasTexture(c);tex.colorSpace=T.SRGBColorSpace;
    const disc=new T.PlaneGeometry(13.5,13.5);disc.rotateX(-Math.PI/2);
    const mat=new T.MeshBasicMaterial({map:tex,transparent:true,opacity:0,depthWrite:false,blending:T.AdditiveBlending});
    lampHalos=new T.InstancedMesh(disc,mat,landscapeDetails.lampPositions.length);
    lampHalos.name='Street lamp ground pools';lampHalos.visible=false;lampHalos.renderOrder=2;
    const h=new T.Object3D();
    landscapeDetails.lampPositions.forEach(([x,z],i)=>{h.position.set(x,.88,z);h.updateMatrix();lampHalos.setMatrixAt(i,h.matrix);});
    lampHalos.instanceMatrix.needsUpdate=true;
    scene.add(lampHalos);
  }
  addTrees(scene,trees,data);
  return {buildingDetails,landscapeDetails,lampHalos,libSign};
}

export function createModel(stage,data,onFrame,options={}){
  const {onPickBuilding,onWalkCamera,onPointerLock}=options;
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
  const sunOffset=new T.Vector3(-530,750,-620);
  sun.position.copy(sunOffset);
  sun.target.position.set(0,0,60);
  if(context){
    scene.background=scene.environment=campusSky(sun.position.clone().sub(sun.target.position).normalize(),'noon');
    scene.environmentIntensity=.46;
  }
  sun.castShadow=true;
  sun.shadow.mapSize.setScalar(matchMedia('(max-width: 700px)').matches?2048:4096);
  Object.assign(sun.shadow.camera,{left:-920,right:920,top:950,bottom:-950,near:10,far:2400});
  sun.shadow.normalBias=.28;
  sun.shadow.bias=-.00015;
  scene.add(ambient,sun,sun.target);
  const anisotropy=context?Math.min(8,renderer.capabilities.getMaxAnisotropy()):1;
  const details=context?buildScene(scene,data,trees,anisotropy):null;
  const avatar=context?createPlayerAvatar():null;
  if(avatar)scene.add(avatar.root);
  let contextLost=false;
  if(context){
    canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();contextLost=true;},false);
    canvas.addEventListener('webglcontextrestored',()=>{contextLost=false;renderer.shadowMap.needsUpdate=true;lastView='';},false);
  }
  const controls = new OrbitControls(camera,stage);
  controls.enableDamping=true;
  controls.dampingFactor=.12;
  controls.rotateSpeed=.66;
  controls.screenSpacePanning=false;
  controls.minDistance=28;
  controls.maxDistance=2900;
  controls.minPolarAngle=.02;
  controls.maxPolarAngle=Math.PI*.48;
  const direction=new T.Vector3(), projection=new T.Vector3(), raycaster=new T.Raycaster(), ndc=new T.Vector2();
  const walk={
    active:false,yaw:0,pitch:-.02,position:new T.Vector3(),fov:65,horizontal:0,eyeHeight:1.70,
    jumpY:0,velY:0,grounded:true,coyote:0,jumpBuf:0,landDip:0,
    bobPhase:0,bobAmp:0,fovKick:0,speed:0,sprinting:false,
    cameraMode:'fps',avatarYaw:0
  };
  const keys=new Set();
  let drag=null, tapStart=null, tween=null, visible=true, size={w:1,h:1}, last=performance.now(), lastView='';
  let lightingName='noon', waterMotion=!matchMedia('(prefers-reduced-motion: reduce)').matches, lastWaterTick=0;
  let shadowFocusCenter=null, walkDrive=0, walkTurn=0, routeAuto=null, avatarSettle=0;

  // Dynamic focused shadow frustum: 160m x 160m high-precision shadow box in walk mode (~4-8cm/texel),
  // full 1840m x 1900m campus coverage in orbit mode.
  function updateShadowFrustum(force=false){
    if(!context)return;
    if(!walk.active){
      if(!force && shadowFocusCenter===null)return;
      shadowFocusCenter=null;
      sun.target.position.set(0,0,60);
      sun.position.copy(sun.target.position).add(sunOffset);
      Object.assign(sun.shadow.camera,{left:-920,right:920,top:950,bottom:-950,near:10,far:2400});
      sun.shadow.normalBias=.28;
      sun.shadow.bias=-.00015;
      sun.shadow.camera.updateProjectionMatrix();
      sun.target.updateMatrixWorld();
      renderer.shadowMap.needsUpdate=true;
      return;
    }
    const tx=Math.round((walk.position.x+Math.sin(walk.yaw)*28)/2)*2;
    const tz=Math.round((walk.position.z-Math.cos(walk.yaw)*28)/2)*2;
    if(!force && shadowFocusCenter && Math.hypot(tx-shadowFocusCenter[0],tz-shadowFocusCenter[1])<26)return;
    shadowFocusCenter=[tx,tz];
    sun.target.position.set(tx,0,tz);
    sun.position.copy(sun.target.position).add(sunOffset);
    Object.assign(sun.shadow.camera,{left:-85,right:85,top:85,bottom:-85,near:10,far:2200});
    sun.shadow.normalBias=.08;
    sun.shadow.bias=-.0002;
    sun.shadow.camera.updateProjectionMatrix();
    sun.target.updateMatrixWorld();
    renderer.shadowMap.needsUpdate=true;
  }

  function setLighting(name){
    const preset=LIGHTING_PRESETS[name]??LIGHTING_PRESETS.noon;
    lightingName=LIGHTING_PRESETS[name]?name:'noon';
    sunOffset.set(...preset.sunPos);
    sun.color.set(preset.sunColor);
    sun.intensity=preset.sunIntensity;
    ambient.color.set(preset.hemiSky);
    ambient.groundColor.set(preset.hemiGround);
    ambient.intensity=preset.hemiIntensity;
    orbitMist.color.set(preset.orbitFog[0]);orbitMist.density=preset.orbitFog[1];
    walkMist.color.set(preset.walkFog[0]);walkMist.density=preset.walkFog[1];
    if(context){
      renderer.toneMappingExposure=preset.exposure;
      scene.background=scene.environment=campusSky(sunOffset.clone().normalize(),lightingName);
      scene.environmentIntensity=preset.envIntensity;
      if(details?.buildingDetails?.nightGlowUniform)details.buildingDetails.nightGlowUniform.value=preset.windowGlow;
      if(details?.landscapeDetails?.lampMaterial)details.landscapeDetails.lampMaterial.emissiveIntensity=preset.lampEmissive;
      if(details?.lampHalos){
        details.lampHalos.visible=preset.lampHalo>0.01;
        details.lampHalos.material.opacity=preset.lampHalo;
      }
      if(details?.libSign){
        details.libSign.material.emissive.set('#c4963e');
        details.libSign.material.emissiveIntensity=preset.windowGlow*.55;
      }
      updateShadowFrustum(true);
    }else if(renderer.setLighting){
      renderer.setLighting(lightingName);
    }
    lastView='';
  }

  // Exact ray-vs-extruded-polygon picking for all inside campus buildings (<0.2ms, zero triangle scan).
  const campusSolids=[...buildingSolids(data.building)];
  const pickBody=(record,ring,height,base=0)=>{
    const [minX,minZ,maxX,maxZ]=bounds(ring);
    return {record,ring,height,base,box:new T.Box3(new T.Vector3(minX,base,minZ),new T.Vector3(maxX,height+.2,maxZ))};
  };
  const pickTargets=data.building.filter(b=>b[5]&&!steppedIds.has(b[4])).map(r=>pickBody(r,r[0],r[1]));
  for(const {record,p,top,base} of campusSolids)if(record[5]&&steppedIds.has(record[4]))pickTargets.push(pickBody(record,p,top,base));
  function pickBuilding(clientX,clientY){
    const rect=stage.getBoundingClientRect();
    if(!rect.width||!rect.height)return null;
    ndc.set(((clientX-rect.left)/rect.width)*2-1,-((clientY-rect.top)/rect.height)*2+1);
    raycaster.setFromCamera(ndc,camera);
    const ray=raycaster.ray,{origin:o,direction:d}=ray;
    let best=null,bestT=Infinity;
    for(const item of pickTargets){
      if(!ray.intersectsBox(item.box))continue;
      const {ring,height}=item;
      // Roof hit
      if(d.y<-1e-5){
        const t=(height-o.y)/d.y;
        if(t>0&&t<bestT&&contains(o.x+t*d.x,o.z+t*d.z,ring)){bestT=t;best=item.record;}
      }
      // Vertical wall hit
      for(let i=1;i<ring.length;i++){
        const [ax,az]=ring[i-1],[bx,bz]=ring[i];
        const sx=bx-ax,sz=bz-az,denom=d.x*sz-d.z*sx;
        if(Math.abs(denom)<1e-6)continue;
        const rx=ax-o.x,rz=az-o.z;
        const t=(rx*sz-rz*sx)/denom,u=(rx*d.z-rz*d.x)/denom;
        if(t>0&&t<bestT&&u>=0&&u<=1){
          const y=o.y+t*d.y;
          if(y>=item.base&&y<=height+.2){bestT=t;best=item.record;}
        }
      }
    }
    return best;
  }

  // Glowing outline around currently selected building
  let highlightGroup=null;
  function highlightBuilding(id){
    if(highlightGroup){
      highlightGroup.traverse(o=>{o.geometry?.dispose();o.material?.dispose();});
      scene.remove(highlightGroup);
      highlightGroup=null;
    }
    if(!context||!id){lastView='';return;}
    const matches=data.building.filter(b=>b[4]===id);
    if(!matches.length){lastView='';return;}
    highlightGroup=new T.Group();
    highlightGroup.name='Selected building highlight';
    for(const record of matches){
      const [ring,height]=record;
      const sections=steppedIds.has(id)?pickTargets.filter(p=>p.record===record):[{ring,height}];
      const pts=[];
      for(const section of sections){
        const p=section.ring,y=section.height+.35;
        for(let i=1;i<p.length;i++)pts.push(new T.Vector3(p[i-1][0],y,p[i-1][1]),new T.Vector3(p[i][0],y,p[i][1]));
      }
      const topGeo=new T.BufferGeometry().setFromPoints(pts);
      const topLine=new T.LineSegments(topGeo,new T.LineBasicMaterial({color:'#39c996'}));
      const basePts=ring.map(([x,z])=>new T.Vector3(x,.96,z));
      const baseGeo=new T.BufferGeometry().setFromPoints(basePts);
      const baseLine=new T.Line(baseGeo,new T.LineBasicMaterial({color:'#39c996',transparent:true,opacity:.65}));
      highlightGroup.add(topLine,baseLine);
    }
    scene.add(highlightGroup);
    lastView='';
  }

  // 3D glowing walking route ribbon + start/end markers
  let routeGroup=null;
  function setRoute(points){
    if(routeGroup){
      routeGroup.traverse(o=>{o.geometry?.dispose();o.material?.dispose();});
      scene.remove(routeGroup);
      routeGroup=null;
    }
    if(renderer.setRoute)renderer.setRoute(points);
    if(!context||!points||points.length<2){lastView='';return;}
    routeGroup=new T.Group();
    routeGroup.name='Campus walking route';
    const buildRibbon=(width,y,color)=>{
      const verts=[],indices=[];
      for(let i=0;i<points.length-1;i++){
        const [ax,az]=points[i],[bx,bz]=points[i+1];
        const len=Math.hypot(bx-ax,bz-az);
        if(len<.05)continue;
        const dx=(bz-az)*width/(2*len),dz=(ax-bx)*width/(2*len);
        const b=verts.length/3;
        verts.push(ax+dx,y,az+dz,ax-dx,y,az-dz,bx+dx,y,bz+dz,bx-dx,y,bz-dz);
        indices.push(b,b+1,b+2,b+1,b+3,b+2);
      }
      if(!verts.length)return null;
      const g=new T.BufferGeometry();
      g.setAttribute('position',new T.Float32BufferAttribute(verts,3));
      g.setIndex(indices);
      return new T.Mesh(g,new T.MeshBasicMaterial({color,side:T.DoubleSide}));
    };
    const halo=buildRibbon(2.4,0.88,'#143d30');
    const core=buildRibbon(1.5,0.92,'#2ee6a6');
    if(halo)routeGroup.add(halo);
    if(core)routeGroup.add(core);
    // Round joint discs at bends
    const jointGeo=new T.CircleGeometry(.76,12);jointGeo.rotateX(-Math.PI/2);
    const jointMat=new T.MeshBasicMaterial({color:'#2ee6a6'});
    for(const [x,z] of points){
      const d=new T.Mesh(jointGeo,jointMat);d.position.set(x,.93,z);routeGroup.add(d);
    }
    // Start & end beacons
    const [sx,sz]=points[0],[ex,ez]=points[points.length-1];
    for(const [x,z,col] of [[sx,sz,'#27b883'],[ex,ez,'#e25b47']]){
      const pole=new T.Mesh(new T.CylinderGeometry(.35,.35,6,10),new T.MeshBasicMaterial({color:col}));
      pole.position.set(x,4.2,z);
      const orb=new T.Mesh(new T.SphereGeometry(1.25,12,10),new T.MeshBasicMaterial({color:col}));
      orb.position.set(x,7.6,z);
      routeGroup.add(pole,orb);
    }
    scene.add(routeGroup);
    lastView='';
  }

  const footprints=campusSolids.filter(s=>s.base<2.45&&!s.walkSurface).map(({p})=>[bounds(p),p]);
  if(hasEastGate(data))for(const p of eastGateBlockers())footprints.push([bounds(p),p]);
  for(const p of publicBlockers(data))footprints.push([bounds(p),p]);
  const fence=data.building.some(b=>b[4]===standId)&&stadiumFence(data);
  if(fence)footprints.push([bounds(fence),fence]);
  const {onDeck,waterBlocks}=walkingWater(data.field,data.water,contains,bounds),physics=data.building.some(b=>b[4]===labId);
  const obstructed=(x,z)=>footprints.some(([[a,b,c,d],ring])=>x>a&&x<c&&z>b&&z<d&&contains(x,z,ring))||waterBlocks(x,z);
  const facultyHeight=facultyHeights(data),hasStand=data.building.some(b=>b[4]===standId);
  const groundY=(x,z)=>(hasStand?standHeight(x,z):undefined)??(onDeck(x,z)?1.055:physics&&x>-125&&x<-55&&z>200&&z<256?
    (physicsGroundHeight(x,z)??(contains(x,z,physicsCourt)?.94:.75)):(facultyHeight(x,z)??.75));
  const eye=(x,z)=>walk.eyeHeight+groundY(x,z);
  const fromHorizontal=fov=>T.MathUtils.clamp(2*T.MathUtils.radToDeg(Math.atan(Math.tan(T.MathUtils.degToRad(fov)/2)/camera.aspect)),29,112);

  function resize(){
    size={w:Math.max(1,stage.clientWidth),h:Math.max(1,stage.clientHeight)};
    camera.aspect=size.w/size.h;
    if(walk.active&&walk.horizontal)camera.fov=walk.fov=fromHorizontal(walk.horizontal);
    camera.updateProjectionMatrix();
    renderer.setSize(size.w,size.h,false);
  }
  new ResizeObserver(resize).observe(stage);
  resize();

  function setOrbit(target, offset, animate=true){
    controls.autoRotate=false;
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
  function focus(x,z,distance=240){
    const offset=camera.position.clone().sub(controls.target);
    offset.y=Math.max(offset.y,distance*.5);
    offset.setLength(distance);
    setOrbit(new T.Vector3(x,4,z),offset);
  }
  function lookFrom(eyePos,target){
    const center=new T.Vector3(...target),offset=new T.Vector3(...eyePos).sub(center);
    setOrbit(center,offset.multiplyScalar(Math.max(1,.92/camera.aspect)),false);
  }
  function setOrbitPose(eyePos,target){
    const center=new T.Vector3(...target),offset=new T.Vector3(...eyePos).sub(center);
    setOrbit(center,offset,false);
  }
  // Guided-tour camera move: an eased flight that lifts over long hops, then an
  // optional slow orbital drift while the caption is read. Reduced motion cuts directly.
  function flyTo(eyePos,target,{duration=2400,drift=0}={}){
    if(walk.active)return;
    controls.autoRotate=false;
    const center=new T.Vector3(...target);
    const to=new T.Vector3(...eyePos).sub(center).multiplyScalar(Math.max(1,.92/camera.aspect)).add(center);
    if(duration<=0||matchMedia('(prefers-reduced-motion: reduce)').matches){
      tween=null;controls.target.copy(center);camera.position.copy(to);controls.update();return;
    }
    const from=camera.position.clone();
    tween={from,fromTarget:controls.target.clone(),to,target:center,start:performance.now(),duration,lift:Math.min(260,from.distanceTo(to)*.22),drift};
  }
  function stopDrift(){controls.autoRotate=false;}
  function syncAvatar(dt=0){
    const floor=groundY(walk.position.x,walk.position.z);
    if(avatar){
      avatar.setVisible(walk.active);
      if(walk.active){
        avatar.update({
          x:walk.position.x,z:walk.position.z,groundY:floor,
          jumpY:walk.jumpY,velY:walk.velY,landDip:walk.landDip,
          yaw:walk.avatarYaw,speed:walk.speed,sprinting:walk.sprinting,
          grounded:walk.grounded,dt
        });
      }
    }else if(renderer.setAvatar){
      renderer.setAvatar(walk.active?{
        x:walk.position.x,z:walk.position.z,groundY:floor,
        jumpY:walk.jumpY,yaw:walk.avatarYaw,speed:walk.speed,
        grounded:walk.grounded,thirdPerson:walk.cameraMode==='third'
      }:null);
    }
  }
  function face(){
    const floor=groundY(walk.position.x,walk.position.z);
    const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
    const bobOn=walk.cameraMode==='fps'&&!reduced;
    const bobY=bobOn?Math.sin(walk.bobPhase)*(walk.sprinting?.062:.038)*walk.bobAmp:0;
    const bobX=bobOn?Math.cos(walk.bobPhase*.5)*(walk.sprinting?.03:.016)*walk.bobAmp:0;
    const eyeY=floor+walk.eyeHeight+walk.jumpY+walk.landDip+bobY;
    direction.set(Math.sin(walk.yaw)*Math.cos(walk.pitch),Math.sin(walk.pitch),-Math.cos(walk.yaw)*Math.cos(walk.pitch));
    if(walk.cameraMode==='third'){
      const focusY=floor+walk.jumpY+walk.landDip*.65+1.46;
      const pitch=T.MathUtils.clamp(walk.pitch,-.58,.82);
      const idealDist=4.5;
      const backX=-Math.sin(walk.yaw)*Math.cos(pitch);
      const backZ=Math.cos(walk.yaw)*Math.cos(pitch);
      const backY=-Math.sin(pitch);
      let safeDist=idealDist;
      for(let d=.8;d<=idealDist;d+=.35){
        const cx=walk.position.x+backX*d, cz=walk.position.z+backZ*d;
        if(obstructed(cx,cz)){safeDist=Math.max(.9,d-.45);break;}
      }
      const camX=walk.position.x+backX*safeDist;
      const camZ=walk.position.z+backZ*safeDist;
      const camY=Math.max(groundY(camX,camZ)+.45,focusY+backY*safeDist+.52);
      camera.position.set(camX,camY,camZ);
      camera.lookAt(walk.position.x+Math.sin(walk.yaw)*1.8,focusY+Math.sin(pitch)*1.4,walk.position.z-Math.cos(walk.yaw)*1.8);
    }else{
      const rightX=Math.cos(walk.yaw), rightZ=Math.sin(walk.yaw);
      camera.position.set(walk.position.x+rightX*bobX,eyeY,walk.position.z+rightZ*bobX);
      camera.lookAt(camera.position.x+direction.x,camera.position.y+direction.y,camera.position.z+direction.z);
    }
  }
  function jump(){
    if(!walk.active)return false;
    walk.jumpBuf=.14;
    if(walk.grounded||walk.coyote>0){
      walk.velY=7.2;
      walk.grounded=false;
      walk.coyote=0;
      walk.jumpBuf=0;
      avatarSettle=.4;
    }
    lastView='';
    return true;
  }
  function setWalkCamera(camMode){
    const next=camMode==='third'?'third':'fps';
    walk.cameraMode=next;
    avatar?.setFirstPerson(next==='fps');
    if(next==='third'&&document.pointerLockElement===stage)document.exitPointerLock?.();
    if(walk.active){syncAvatar(0);face();}
    lastView='';
    onWalkCamera?.(next);
    return next;
  }
  function setPointerLock(enable){
    if(!walk.active||walk.cameraMode!=='fps')return false;
    if(enable){
      if(document.pointerLockElement!==stage)stage.requestPointerLock?.();
      return true;
    }
    if(document.pointerLockElement===stage)document.exitPointerLock?.();
    return false;
  }
  document.addEventListener('pointerlockchange',()=>{
    const locked=document.pointerLockElement===stage;
    stage.dataset.pointerLock=String(locked);
    onPointerLock?.(locked);
  });
  document.addEventListener('mousemove',e=>{
    if(!walk.active||document.pointerLockElement!==stage)return;
    if(routeAuto)stopRouteWalk(true);
    walk.yaw+=e.movementX*.0022;
    walk.pitch=T.MathUtils.clamp(walk.pitch-e.movementY*.0022,-1.32,1.32);
  });
  function stopRouteWalk(notify=true){
    if(!routeAuto)return;
    const cb=routeAuto.onState;
    routeAuto=null;
    if(notify)cb?.(false);
  }
  function samplePolyline(points,cum,dist){
    const lastIdx=points.length-1, d=T.MathUtils.clamp(dist,0,cum[lastIdx]);
    for(let i=0;i<lastIdx;i++){
      if(cum[i+1]>=d){
        const len=cum[i+1]-cum[i], u=len>1e-6?(d-cum[i])/len:0;
        return [points[i][0]+(points[i+1][0]-points[i][0])*u,points[i][1]+(points[i+1][1]-points[i][1])*u];
      }
    }
    return [points[lastIdx][0],points[lastIdx][1]];
  }
  function routeStartPose(points){
    if(!points||points.length<2)return null;
    const n=points.length, cum=new Float64Array(n);
    for(let i=1;i<n;i++)cum[i]=cum[i-1]+Math.hypot(points[i][0]-points[i-1][0],points[i][1]-points[i-1][1]);
    const total=cum[n-1];
    if(total<1)return [points[0][0],points[0][1],0,.04,65];
    // Start slightly ahead of the start beacon and clear of any building/gate wall footprint.
    let dist=Math.min(total*.15,3.5);
    const maxSkip=Math.min(total,dist+60);
    let [sx,sz]=samplePolyline(points,cum,dist);
    const clear=(x,z)=>!obstructed(x,z)&&!obstructed(x+1.2,z)&&!obstructed(x-1.2,z)&&!obstructed(x,z+1.2)&&!obstructed(x,z-1.2);
    while(dist<maxSkip&&!clear(sx,sz)){
      dist=Math.min(maxSkip,dist+2);
      [sx,sz]=samplePolyline(points,cum,dist);
    }
    const [lx,lz]=samplePolyline(points,cum,Math.min(total,dist+14));
    const yaw=Math.hypot(lx-sx,lz-sz)>.3?Math.atan2(lx-sx,-(lz-sz)):0;
    return [sx,sz,yaw,-.01,65];
  }
  function startRouteWalk(points,{speed=14,startDist=null,onState=null,onArrive=null}={}){
    if(!points||points.length<2)return false;
    const n=points.length, cum=new Float64Array(n);
    for(let i=1;i<n;i++)cum[i]=cum[i-1]+Math.hypot(points[i][0]-points[i-1][0],points[i][1]-points[i-1][1]);
    const total=cum[n-1];
    if(total<1)return false;
    let dist=0;
    if(startDist!==null&&Number.isFinite(startDist)){
      dist=T.MathUtils.clamp(startDist,0,total);
    }else if(walk.active){
      let bestDist=0, bestD2=Infinity;
      for(let i=0;i<n-1;i++){
        const ax=points[i][0],az=points[i][1],bx=points[i+1][0],bz=points[i+1][1];
        const dx=bx-ax,dz=bz-az,len2=dx*dx+dz*dz;
        const t=len2>1e-8?Math.max(0,Math.min(1,((walk.position.x-ax)*dx+(walk.position.z-az)*dz)/len2)):0;
        const px=ax+dx*t,pz=az+dz*t,d2=(walk.position.x-px)**2+(walk.position.z-pz)**2;
        if(d2<bestD2){bestD2=d2;bestDist=cum[i]+t*(cum[i+1]-cum[i]);}
      }
      dist=bestD2<55*55&&bestDist<total-22?bestDist:0;
    }
    if(dist<3.5)dist=Math.min(total*.15,3.5);
    // Skip any short building-center or gate-wall stub so the camera starts cleanly outdoors on the road.
    let [sx,sz]=samplePolyline(points,cum,dist);
    const maxSkip=Math.min(total,dist+60);
    const clear=(x,z)=>!obstructed(x,z)&&!obstructed(x+1.2,z)&&!obstructed(x-1.2,z)&&!obstructed(x,z+1.2)&&!obstructed(x,z-1.2);
    while(dist<maxSkip&&!clear(sx,sz)){
      dist=Math.min(maxSkip,dist+2);
      [sx,sz]=samplePolyline(points,cum,dist);
    }
    const [lx,lz]=samplePolyline(points,cum,Math.min(total,dist+14));
    const initYaw=Math.hypot(lx-sx,lz-sz)>.3?Math.atan2(lx-sx,-(lz-sz)):walk.yaw;
    if(!walk.active){
      enterWalk(sx,sz,initYaw,-.01,65);
    }else{
      stopRouteWalk(false);
      if(Math.hypot(walk.position.x-sx,walk.position.z-sz)>6){
        walk.position.set(sx,eye(sx,sz),sz);
        walk.yaw=initYaw;
        walk.pitch=-.01;
      }
      updateShadowFrustum(true);
      face();
    }
    routeAuto={points,cum,total,dist,speed,onState,onArrive};
    onState?.(true);
    lastView='';
    return true;
  }
  // Smooth wall-sliding movement: if diagonal step hits an obstacle, slide along X or Z independently.
  function step(metres, side=0){
    if(routeAuto)stopRouteWalk(true);
    const prevFloor=groundY(walk.position.x,walk.position.z);
    const dx=Math.sin(walk.yaw)*metres+Math.cos(walk.yaw)*side;
    const dz=-Math.cos(walk.yaw)*metres+Math.sin(walk.yaw)*side;
    const n=Math.max(1,Math.ceil(Math.hypot(dx,dz)/.18));
    const sx=dx/n, sz=dz/n;
    const canWalk=(x,z)=>!obstructed(x,z)&&(!hasStand||canStepOnStand(walk.position.x,walk.position.z,x,z));
    for(let i=0;i<n;i++){
      const curX=walk.position.x, curZ=walk.position.z;
      const nx=T.MathUtils.clamp(curX+sx,-extent,extent), nz=T.MathUtils.clamp(curZ+sz,-extent,extent);
      if(canWalk(nx,nz)){
        walk.position.set(nx,eye(nx,nz),nz);
      }else if(Math.abs(sx)>1e-4 && canWalk(nx,curZ)){
        walk.position.set(nx,eye(nx,curZ),curZ);
      }else if(Math.abs(sz)>1e-4 && canWalk(curX,nz)){
        walk.position.set(curX,eye(curX,nz),nz);
      }else{
        break;
      }
    }
    const nextFloor=groundY(walk.position.x,walk.position.z);
    if(!walk.grounded&&nextFloor!==prevFloor)walk.jumpY=Math.max(0,walk.jumpY+(prevFloor-nextFloor));
    updateShadowFrustum(false);
  }
  function enterWalk(x,z,yaw,pitch=.005,fov=65,lens=null){
    stopRouteWalk(true);
    controls.enabled=false;
    controls.autoRotate=false;
    tween=null;
    walk.active=true;
    walk.eyeHeight=lens?.eye??1.70;walk.horizontal=lens?.horizontal??0;
    walk.position.set(x,eye(x,z),z);
    walk.yaw=yaw;
    walk.avatarYaw=yaw;
    walk.pitch=pitch;
    walk.jumpY=0;walk.velY=0;walk.grounded=true;walk.coyote=.1;walk.jumpBuf=0;walk.landDip=0;
    walk.bobPhase=0;walk.bobAmp=0;walk.fovKick=0;walk.speed=0;walk.sprinting=false;avatarSettle=0;
    walk.fov=walk.horizontal?fromHorizontal(walk.horizontal):fov;
    camera.fov=walk.fov;
    camera.updateProjectionMatrix();
    scene.fog=walkMist;
    avatar?.setFirstPerson(walk.cameraMode==='fps');
    syncAvatar(0);
    updateShadowFrustum(true);
    face();
  }
  function teleportWalk(x,z){
    if(!walk.active)return false;
    stopRouteWalk(true);
    // If clicked spot is obstructed, spiral out gently up to 24m to find nearest walkable spot
    let tx=T.MathUtils.clamp(x,-extent,extent), tz=T.MathUtils.clamp(z,-extent,extent);
    if(obstructed(tx,tz)){
      let found=false;
      for(let r=3;r<=27&&!found;r+=3){
        for(let k=0;k<12;k++){
          const a=k*Math.PI/6, cx=tx+Math.cos(a)*r, cz=tz+Math.sin(a)*r;
          if(!obstructed(cx,cz)){tx=cx;tz=cz;found=true;break;}
        }
      }
      if(!found)return false;
    }
    walk.position.set(tx,eye(tx,tz),tz);
    walk.jumpY=0;walk.velY=0;walk.grounded=true;walk.landDip=0;
    syncAvatar(0);
    updateShadowFrustum(true);
    face();
    lastView='';
    return true;
  }
  function exitWalk(preserveSpot=false){
    stopRouteWalk(true);
    if(document.pointerLockElement===stage)document.exitPointerLock?.();
    if(!walk.active)return;
    const wx=walk.position.x, wz=walk.position.z, wyaw=walk.yaw;
    walk.active=false;
    walk.jumpY=0;walk.velY=0;walk.grounded=true;walk.landDip=0;walk.bobAmp=0;walk.fovKick=0;walk.speed=0;walk.sprinting=false;
    walkDrive=0;
    walkTurn=0;
    keys.clear();
    syncAvatar(0);
    controls.enabled=true;
    camera.fov=46;
    camera.updateProjectionMatrix();
    scene.fog=orbitMist;
    updateShadowFrustum(true);
    if(preserveSpot){
      const offset=new T.Vector3(-Math.sin(wyaw)*95,90,Math.cos(wyaw)*95);
      setOrbit(new T.Vector3(wx,4,wz),offset,true);
    }else{
      home(false);
    }
  }
  stage.addEventListener('pointerdown',event=>{
    stage.focus({preventScroll:true});
    tween=null;
    controls.autoRotate=false;
    if(event.button===0){
      tapStart={id:event.pointerId,x:event.clientX,y:event.clientY,t:performance.now()};
    }
    if(!walk.active||event.button!==0)return;
    if(routeAuto)stopRouteWalk(true);
    drag={id:event.pointerId,x:event.clientX,y:event.clientY};
    stage.setPointerCapture(event.pointerId);
  });
  stage.addEventListener('pointermove',event=>{
    if(!walk.active||!drag||drag.id!==event.pointerId)return;
    walk.yaw-=(event.clientX-drag.x)*.0045;
    walk.pitch=T.MathUtils.clamp(walk.pitch+(event.clientY-drag.y)*.0045,-1.32,1.32);
    drag.x=event.clientX; drag.y=event.clientY;
  });
  stage.addEventListener('pointerup',event=>{
    if(!walk.active && onPickBuilding && tapStart && tapStart.id===event.pointerId &&
       Math.hypot(event.clientX-tapStart.x,event.clientY-tapStart.y)<6 && performance.now()-tapStart.t<450){
      const hit=pickBuilding(event.clientX,event.clientY);
      if(hit)onPickBuilding(hit);
    }
    tapStart=null;
    drag=null;
  });
  for(const type of ['lostpointercapture','pointercancel'])stage.addEventListener(type,()=>{drag=null;tapStart=null;});
  const walkingKeys=['w','s','a','d','q','e','shift','arrowup','arrowdown','arrowleft','arrowright'];
  stage.addEventListener('keydown',e=>{
    const key=e.key.toLowerCase();
    if(walk.active&&(e.code==='Space'||key===' ')){
      e.preventDefault();
      jump();
      return;
    }
    if(walk.active&&walkingKeys.includes(key)){
      if(key!=='shift')e.preventDefault();
      keys.add(key);
    }
  });
  window.addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));
  stage.addEventListener('blur',()=>{keys.clear();walkDrive=0;walkTurn=0;});
  stage.addEventListener('wheel',e=>{
    if(walk.active){e.preventDefault();zoom(e.deltaY<0?1:-1);}
    else {tween=null;controls.autoRotate=false;}
  },{passive:false});
  function zoom(amount){
    if(walk.active){
      const limit=walk.horizontal||walk.fov>92?112:92;
      walk.horizontal=0;walk.fov=T.MathUtils.clamp(walk.fov-amount*8,26,limit);
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
  function getView(){
    return {
      walking:walk.active,
      x:walk.active?walk.position.x:controls.target.x,
      z:walk.active?walk.position.z:controls.target.z,
      yaw:walk.yaw,
      pitch:walk.pitch,
      jumpY:walk.jumpY,
      grounded:walk.grounded,
      cameraMode:walk.cameraMode,
      distance:camera.position.distanceTo(controls.target),
      camera:[camera.position.x,camera.position.y,camera.position.z],
      target:[controls.target.x,controls.target.y,controls.target.z],
      lighting:lightingName
    };
  }
  function frame(time){
    const dt=Math.min(.05,(time-last)/1000);
    last=time;
    if(!visible||contextLost)return;
    let avatarDirty=false;
    if(walk.active){
      const prevX=walk.position.x, prevZ=walk.position.z;
      const has=(a,b)=>keys.has(a)||keys.has(b);
      let move=Number(has('w','arrowup'))-Number(has('s','arrowdown'))+walkDrive;
      let side=Number(has('d','arrowright'))-Number(has('a','arrowleft'));
      const turn=Number(keys.has('e'))-Number(keys.has('q'))+walkTurn;
      if(routeAuto&&(move||side||turn))stopRouteWalk(true);
      if(routeAuto){
        const nextDist=Math.min(routeAuto.total,routeAuto.dist+dt*routeAuto.speed);
        const [nx,nz]=samplePolyline(routeAuto.points,routeAuto.cum,nextDist);
        const nearEnd=routeAuto.total-nextDist<=18;
        if(nearEnd&&(routeAuto.total-nextDist<=1.5||obstructed(nx,nz))){
          const endPt=routeAuto.points[routeAuto.points.length-1];
          if(Math.hypot(endPt[0]-walk.position.x,endPt[1]-walk.position.z)>1){
            walk.yaw=Math.atan2(endPt[0]-walk.position.x,-(endPt[1]-walk.position.z));
          }
          const cb=routeAuto.onArrive;
          stopRouteWalk(true);
          cb?.();
        }else{
          routeAuto.dist=nextDist;
          if(!obstructed(nx,nz)){
            walk.position.set(nx,eye(nx,nz),nz);
            updateShadowFrustum(false);
          }
          const [lx,lz]=samplePolyline(routeAuto.points,routeAuto.cum,Math.min(routeAuto.total,nextDist+14));
          if(Math.hypot(lx-walk.position.x,lz-walk.position.z)>.5){
            const targetYaw=Math.atan2(lx-walk.position.x,-(lz-walk.position.z));
            const diff=Math.atan2(Math.sin(targetYaw-walk.yaw),Math.cos(targetYaw-walk.yaw));
            walk.yaw+=diff*Math.min(1,dt*6.5);
          }
          walk.pitch+=(-.01-walk.pitch)*Math.min(1,dt*3.5);
        }
      }else{
        if(turn)walk.yaw+=turn*dt*1.65;
        const mag=Math.hypot(move,side);
        if(mag>1){move/=mag;side/=mag;}
        const speed=keys.has('shift')?22:12.5;
        if(move||side)step(move*dt*speed,side*dt*speed);
      }

      // Jump physics: gravity, coyote time, input buffer, and tactile landing compression.
      if(walk.jumpBuf>0)walk.jumpBuf=Math.max(0,walk.jumpBuf-dt);
      if(walk.grounded){
        walk.coyote=.10;
        if(walk.jumpBuf>0){
          walk.velY=7.2;
          walk.grounded=false;
          walk.coyote=0;
          walk.jumpBuf=0;
        }
      }else{
        walk.coyote=Math.max(0,walk.coyote-dt);
        walk.velY-=21.5*dt;
        walk.jumpY+=walk.velY*dt;
        if(walk.jumpY<=0){
          const impact=Math.min(1,Math.abs(walk.velY)/9);
          walk.jumpY=0;
          walk.velY=0;
          walk.grounded=true;
          walk.landDip=-.15*impact;
        }
      }
      if(walk.grounded&&Math.abs(walk.landDip)>.0005){
        walk.landDip*=Math.exp(-14*dt);
        if(Math.abs(walk.landDip)<=.0005)walk.landDip=0;
      }

      // Compute real ground speed for stride head-bob, sprint FOV kick & avatar limb cycles.
      const movedDist=Math.hypot(walk.position.x-prevX,walk.position.z-prevZ);
      const instSpeed=dt>1e-4?movedDist/dt:0;
      walk.speed+=(instSpeed-walk.speed)*Math.min(1,dt*14);
      walk.sprinting=Boolean(!routeAuto&&keys.has('shift')&&instSpeed>8);
      const moving=instSpeed>.4;
      const targetBob=walk.grounded&&moving?Math.min(1,instSpeed/12):0;
      walk.bobAmp+=(targetBob-walk.bobAmp)*Math.min(1,dt*10);
      if(walk.grounded&&moving)walk.bobPhase+=dt*(walk.sprinting?11.4:8.2);

      // Dynamic sprint FOV boost in FPS mode (preserves fixed panoramic horizontal lenses).
      const targetKick=!walk.horizontal&&walk.cameraMode==='fps'&&walk.sprinting?5.5:0;
      if(Math.abs(walk.fovKick-targetKick)>.02){
        walk.fovKick+=(targetKick-walk.fovKick)*Math.min(1,dt*8);
        camera.fov=walk.fov+walk.fovKick;
        camera.updateProjectionMatrix();
      }else if(walk.fovKick!==targetKick){
        walk.fovKick=targetKick;
        camera.fov=walk.fov+walk.fovKick;
        camera.updateProjectionMatrix();
      }

      // Smoothly align character facing to walk heading (slight lag in third-person for natural turn look).
      const yawDiff=Math.atan2(Math.sin(walk.yaw-walk.avatarYaw),Math.cos(walk.yaw-walk.avatarYaw));
      walk.avatarYaw+=yawDiff*Math.min(1,dt*(walk.cameraMode==='fps'?28:12));

      if(moving||!walk.grounded||Math.abs(walk.landDip)>.001||Math.abs(yawDiff)>.003)avatarSettle=.35;
      else if(avatarSettle>0)avatarSettle=Math.max(0,avatarSettle-dt);
      avatarDirty=avatarSettle>0;
      if(avatarDirty)syncAvatar(dt);
      face();
    }else{
      if(tween){
        const p=Math.min(1,(time-tween.start)/(tween.duration??540));
        const q=tween.duration?(p<.5?4*p*p*p:1-(-2*p+2)**3/2):1-(1-p)**3;
        camera.position.lerpVectors(tween.from,tween.to,q);
        controls.target.lerpVectors(tween.fromTarget,tween.target,q);
        if(tween.lift)camera.position.y+=Math.sin(Math.PI*q)*tween.lift;
        if(p===1){
          if(tween.drift){controls.autoRotate=true;controls.autoRotateSpeed=tween.drift;}
          tween=null;
        }
      }
      controls.update();
    }
    // Give shallow facade and paving layers enough depth precision at campus scale.
    const near=walk.active?.2:T.MathUtils.clamp(camera.position.distanceTo(controls.target)/30,.75,40);
    if(Math.abs(camera.near-near)>.01){camera.near=near;camera.updateProjectionMatrix();}
    let waterDirty=false;
    if(context && waterMotion && details?.landscapeDetails?.lakeNormals && time-lastWaterTick>40){
      const wdt=Math.min(.1,(time-lastWaterTick)/1000);
      lastWaterTick=time;
      details.landscapeDetails.lakeNormals.offset.x=(details.landscapeDetails.lakeNormals.offset.x+wdt*.024)%1;
      details.landscapeDetails.lakeNormals.offset.y=(details.landscapeDetails.lakeNormals.offset.y+wdt*.015)%1;
      waterDirty=true;
    }
    const view=[camera.position.x,camera.position.y,camera.position.z,camera.quaternion.x,camera.quaternion.y,camera.quaternion.z,camera.quaternion.w,camera.fov,camera.near,size.w,size.h].map(value=>value.toFixed(5)).join(',');
    if(view===lastView && !waterDirty && !avatarDirty)return;
    const cameraMoved=view!==lastView;
    lastView=view;
    renderer.render(scene,camera);
    if(cameraMoved||avatarDirty){
      const bearing=walk.active?-walk.yaw:Math.atan2(camera.position.x-controls.target.x,camera.position.z-controls.target.z);
      const metersPerPixel=2*Math.tan(T.MathUtils.degToRad(camera.fov/2))*camera.position.distanceTo(controls.target)/size.h;
      onFrame(project,bearing,metersPerPixel,size,walk.active,walk.active?{
        x:walk.position.x,z:walk.position.z,yaw:walk.yaw,jumpY:walk.jumpY,
        speed:walk.speed,sprinting:walk.sprinting,grounded:walk.grounded,cameraMode:walk.cameraMode
      }:null);
    }
  }
  home(false);
  renderer.setAnimationLoop(frame);
  return {focus,lookFrom,setOrbitPose,flyTo,stopDrift,home,zoom,north,enterWalk,exitWalk,step,teleportWalk,
    jump,setWalkCamera,getWalkCamera(){return walk.cameraMode;},setPointerLock,isPointerLocked(){return document.pointerLockElement===stage;},
    routeStartPose,startRouteWalk,stopRouteWalk,isRouteWalking(){return Boolean(routeAuto);},
    setLighting,setWaterMotion(on){waterMotion=Boolean(on);lastView='';},
    // dir: forward/back drive (-1..1); turn: yaw rate (-1..1) for the touch joystick.
    setWalkDrive(dir,turn=0){walkDrive=dir;walkTurn=turn;if((dir||turn)&&routeAuto)stopRouteWalk(true);},
    highlightBuilding,setRoute,getView,
    getDiagnostics(){
      let vertices=0,invalid=0;
      scene.traverse(object=>{
        const position=object.geometry?.attributes?.position;
        if(!position)return;
        vertices+=position.count;
        const arr=position.array;
        for(let i=0,n=arr.length;i<n;i++)if(!Number.isFinite(arr[i]))invalid++;
      });
      const treeForms={shade:0,vase:0,spire:0};
      for(const entry of trees)treeForms[entry[3]]++;
      return {renderer:stage.dataset.renderer,vertices,invalid,trees:trees.length,treeForms,
        buildings:details?.buildingDetails?.stats,landscape:details?.landscapeDetails?.stats,
        drawCalls:renderer.info?.render.calls,triangles:renderer.info?.render.triangles};
    },
    setVisible(value){visible=value;keys.clear();walkDrive=0;walkTurn=0;if(!value)stopRouteWalk(true);if(value){lastView='';resize();}}
  };
}
