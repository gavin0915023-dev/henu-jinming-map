import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import * as T from '../assets/three.module.min.js';
import { campusAvenueData, avenueHedgeRuns, avenueTrees } from '../avenue.js';
import { fieldGround, entryGap, putFieldTrees, bridgeDeck, walkingWater } from '../field-ground.js';
import { buildingSolids, hallId, passage, reportFacade } from '../wenfu.js';
import { fieldViews } from '../field-views.js';
import { eastGateBlockers, teachingId } from '../east-campus.js';
import { libraryId } from '../central-axis.js';
import { civilId, zengId, clinicId, facultyHeights, visibleSigns } from '../faculty-sites.js';
import { eduId, beiId, courtSigns } from '../college-courts.js';
import { orientedFrame } from '../survey-mesh.js';
import {photoFrontModels,softwareId,teachingFrontId,softwarePillarPlaque} from '../photo-fronts.js';
import { cuitingCenter, isMarcoRing, marcoHole, publicBlockers, surveyedCourtPlan } from '../campus-commons.js';
import { nanyuanId,officeId } from '../round-buildings.js';
import {standId,standFrame,standHeight,canStepOnStand,stadiumFieldModel,stadiumFence} from '../stadium-bowl.js';
import {runningTracks} from '../running-tracks.js';
import {economicsId,mathsId,lifeId,huayuanId,landmarkModels} from '../landmark-wings.js';
import {residences,residenceModel} from '../dongyuan.js';
import {createCampusRouter,routeProgress} from '../routing.js';
import {bounds,contains,createWalkingSpace,prepareWalkingMap} from '../walking-space.js';
import {campusEntrances,campusWalkLinks} from '../navigation-anchors.js';

// Evaluate the real Batch and footprint helpers without starting the browser renderer.
const root = new URL('../', import.meta.url);
const modelSource = await readFile(new URL('model.js', root), 'utf8');
const start = modelSource.indexOf('const closed =');
const end = modelSource.indexOf('\nfunction seeded()', start);
assert(start >= 0 && end > start, 'Cannot locate the model geometry helpers');
const toolkit = new Function('T','contains','bounds', `${modelSource.slice(start, end)}\nreturn { Batch, contains, bounds, groundShape };`)(T,contains,bounds);
// Two indexed quads must still share each quad's corners after merging. An
// identity index on an expanded triangle stream is not the same optimisation.
{
  const mergeProbe=new toolkit.Batch();
  for(const x of [0,3])mergeProbe.add(new T.PlaneGeometry(1,1).translate(x,0,0),'#ffffff');
  const merged=mergeProbe.mesh(),pos=merged.geometry.getAttribute('position'),idx=merged.geometry.getIndex();
  assert(pos.count===8&&idx?.count===12&&Array.from(idx.array.slice(0,6)).every(i=>pos.getX(i)<1)&&
    Array.from(idx.array.slice(6)).every(i=>pos.getX(i)>2),'Merging two indexed planes retains shared vertices and offsets the second index');
  merged.geometry.dispose();merged.material.dispose();
}

// Browser import maps are unavailable in Node; substitute the same bundled Three.js.
const vendorURL = new URL('assets/three.module.min.js', root).href;
async function loadModule(name) {
  const source = await readFile(new URL(name, root), 'utf8');
  assert(source.includes("import * as T from 'three';"), `${name}: expected Three.js import`);
  const transformed = source.replace("import * as T from 'three';", `import * as T from ${JSON.stringify(vendorURL)};`)
    .replace(/from '(\.\/[^']+)'/g,(_,path)=>'from '+JSON.stringify(new URL(path,root).href));
  return import(`data:text/javascript;base64,${Buffer.from(transformed).toString('base64')}`);
}
function freeze(value) {
  if (value && typeof value === 'object') {
    for (const child of Object.values(value)) freeze(child);
    Object.freeze(value);
  }
  return value;
}
const data = JSON.parse(await readFile(new URL('assets/campus.json', root), 'utf8'));
const before = JSON.stringify(data);
freeze(data);
const avenue=campusAvenueData(data);
const rendered={...avenue,field:fieldGround(avenue,toolkit.contains)};
const originalRoads=data.road.filter(r=>r[2]==='伯襄路'&&r[3]==='service'&&!r[4]);
assert.equal(originalRoads.length,2);
assert.equal(rendered.road.filter(r=>r[2]==='伯襄路'&&r[3]==='service'&&!r[4]).length,1);
assert.equal(rendered.road.length,data.road.length-1);
assert(Math.abs(rendered.avenue.road[1]-10.2)<.1,'Both surveyed road edges must be retained');
const {north,south}=rendered.avenue;
const plantings=[...avenueTrees(rendered,[],toolkit.contains).map(t=>t[1]),...avenueHedgeRuns(rendered,toolkit.contains).map(r=>r[2])];
assert(plantings.some(z=>z<north)&&plantings.some(z=>z>south)&&plantings.every(z=>z<north||z>south),'Planted rows must be outside both edges of the avenue');
const details=rendered.field;
const bodies3d=[...buildingSolids(data.building)];
const solidAt=(x,y,z,id)=>bodies3d.some(s=>(!id||s.record[4]===id)&&s.base<y&&y<s.top&&toolkit.contains(x,z,s.p));
function checkPhotoFronts(){
  const portal=orientedFrame(40.7,-191.7,.1,43.6),westFace=orientedFrame(93.1,-73.9,-59,-.2);
  const occupied=(id,d,u,y,v)=>solidAt(...d.at([u,y,v]),id);
  assert(!occupied(softwareId,portal,4,2.45,-1)&&occupied(softwareId,portal,4,2.45,-2.16),'The software threshold is recessed and stops at the glass doors');
  for(const y of [8.62,12.1,15.63,19.19]){
    assert(!occupied(softwareId,portal,3,y,-.9)&&occupied(softwareId,portal,7.2,y,-.9)&&!occupied(softwareId,portal,13.1,y,-.9),'Each open balcony and deep window flank solid stone, not a painted rectangle');
  }
  const signs=visibleSigns(data),softwareSigns=signs.filter(s=>s.id===softwareId);
  assert.deepEqual(softwareSigns.map(s=>s.text),['软件学院','河南省特色化示范性']);
  for(const s of softwareSigns){
    const [x,y,z]=s.point,[u,v]=portal.local([x,z]);
    assert(y-s.height/2>6.9&&v>0&&v<.25&&Math.cos(s.yaw)>.99&&occupied(softwareId,portal,u,y,v-.24),'Software lettering must be mounted on the south wall above the doorway');
  }
  const facadeParts=id=>photoFrontModels({building:data.building.filter(r=>r[4]===id)}).flatMap(g=>g.parts);
  assert(!facadeParts(softwareId).some(([p])=>p.some(([x,y,z])=>portal.local([x,z])[1]>.6&&y>1.45&&y<6.8)),'No board or supporting post stands in front of the software entrance or flower bed');
  assert(softwarePillarPlaque.columns.includes('河南大学软件学院')&&portal.local([softwarePillarPlaque.point[0],softwarePillarPlaque.point[2]])[1]<.15,'The dark pillar plaque sits flush on the left entrance pier');
  assert(!occupied(teachingFrontId,westFace,4,2.45,-.9)&&occupied(teachingFrontId,westFace,4,2.45,-2.2),'The ground floor is behind the upper curtain wall');
  assert(!occupied(teachingFrontId,westFace,-10,18,-2)&&occupied(teachingFrontId,westFace,6,20,-4)&&!occupied(teachingFrontId,westFace,12,19.4,-3.5)&&occupied(teachingFrontId,westFace,12,21,-3.5),'The low roof, raised pavilion and open rectangular roof frame have different silhouettes');
  const roofName=signs.find(s=>s.id===teachingFrontId);
  assert(roofName?.text==='综合教学楼'&&roofName.horizontal&&roofName.point[1]-roofName.height/2>16.9&&Math.sin(roofName.yaw)<-.99,'Five roof characters face the library and clear the parapet');
  const curtain=facadeParts(teachingFrontId).filter(p=>p[2]==='curtain').map(([p])=>p.map(([x,y,z])=>[westFace.local([x,z])[0],y]));
  for(const y of [6,10,14]){
    const spans=curtain.filter(p=>p[0][1]<y&&p[2][1]>y).map(p=>[p[0][0],p[1][0]]).sort((a,b)=>a[0]-b[0]);
    assert(spans.length&&spans[0][0]<-25&&spans.at(-1)[1]>25&&spans.every(([l],i)=>!i||l-spans[i-1][1]<.025),'Glazing is continuous across the square-facing elevation');
  }
}
checkPhotoFronts();
const walkPlan=prepareWalkingMap(data),walkSpace=walkPlan.space;
const campusRouter=createCampusRouter(walkPlan.data,{space:walkSpace,walkLinks:campusWalkLinks});
const westApproach=campusEntrances.west,portalApproach=campusEntrances.software;
for(const [name,point] of Object.entries(campusEntrances)){
  const route=campusRouter.findRoute(westApproach,point);
  assert(route&&route.points.at(-1).every((v,i)=>Math.abs(v-point[i])<.01),name+': the route must reach the outside approach');
  assert(route.points.slice(1).every((p,i)=>walkSpace.clear(route.points[i],p)),name+': the route must stay clear of campus obstacles');
}
const portalRoute=campusRouter.findRoute(westApproach,portalApproach);
const northSide=fieldViews.find(v=>v.id==='north-gate').camera.slice(0,2);
const northProgress=routeProgress(portalRoute.points,...northSide,0,walkSpace.clear);
assert(northProgress.offCourse&&!northProgress.arrived&&northProgress.remaining>400,'A position at North Gate cannot finish a walk to the Software College');
assert(!campusRouter.findRoute(westApproach,[62,-197]),'The software building label is not a walking destination');
assert(!walkSpace.clear([-465,-76],[-450,-76]),'The route cannot take the direct line through the west gate name wall');
{
  const fence=[[4.91,-20],[5.09,-20],[5.09,20],[4.91,20]],space=createWalkingSpace({walls:[fence]});
  const road=[[[[0,0],[10,0]],3,'','footway']];
  assert(!createCampusRouter({road},{space}).findRoute([0,0],[10,0]),'A narrow fence breaks road links and cannot be rejoined by endpoint snapping');
  assert(!routeProgress([[10,0],[5.4,0]],4.6,0,0,space.clear).arrived,'Close on the other side of a fence is not an arrival');
  const pond=[[4,-8],[8,-8],[8,8],[4,8]],deck=[[3,-1],[9,-1],[9,1],[3,1]];
  const shore=createWalkingSpace({water:[pond],deck});
  assert(shore.clear([0,0],[12,0])&&!shore.clear([0,4],[12,4]),'A bridge connects the banks only along the deck');
  const lane=createCampusRouter({road:[[[[0,0],[100,0]],3,'','footway']]});
  assert.equal(lane.findRoute([41,0],[55,0])?.distance,14,'Two mid-block endpoints walk directly along the same lane');
}
const eastern=data.building.filter(r=>residences.has(r[4]));
assert.deepEqual(eastern.map(r=>r[3]).sort(),['十九','二十','二十一','二十二','二十三','二十四','二十五','二十六'].map(s=>'学'+s+'公寓').sort());
const eastRouter=campusRouter,inSolid=(x,z)=>bodies3d.some(s=>s.base<2 && x>500 && toolkit.contains(x,z,s.p));
for(const record of eastern){
  const [ring,h,,,id,inside]=record,[minX,minZ,maxX,maxZ]=toolkit.bounds(ring);
  const own=bodies3d.filter(s=>s.record===record),source=own.filter(s=>s.base<1);
  assert(!inside&&source.length===1&&source[0].p===ring&&own.some(s=>s.base>=h&&s.top>h+.8),id+': retain real ground footprint and raised stair heads');
  const surfaces=residenceModel(record),ends=surfaces.filter(g=>g.normal?.[0]<-.97),side=surfaces.filter(g=>Math.abs(g.normal?.[2])>.97);
  const panes=groups=>groups.flatMap(g=>g.parts.filter(p=>p[2]==='glass').map(([p])=>p));
  assert(panes(side).length>panes(ends).length*4,id+': long fronts and short ends must not share a window grid');
  if(residences.get(id).number<=22){
    const west=panes(ends).filter(p=>p[0][0]<minX+1&&p.every(q=>q[1]>h*.48));
    assert(west.length>=3&&west.every(p=>Math.abs(p.reduce((s,q)=>s+q[2]/4,0)-west[0].reduce((s,q)=>s+q[2]/4,0))<.15),id+': street gable has just one upper window axis');
  }
  const roofs=surfaces.flatMap(g=>g.parts.filter(p=>p[2]==='terrace'));
  assert(roofs.length>0&&roofs.every(([p])=>toolkit.contains(p.reduce((s,q)=>s+q[0]/4,0),p.reduce((s,q)=>s+q[2]/4,0),ring)),id+': roof finish must stay on its own wing');
  const dest=eastRouter.streetPoseFor((minX+maxX)/2,(minZ+maxZ)/2,ring).slice(0,2);
  const route=eastRouter.findRoute([507.9,249.5],dest);
  assert(route&&route.points.at(-1).every((x,i)=>Math.abs(x-dest[i])<.25)&&!inSolid(...dest),id+': route must stop on the adjacent lane');
  for(let i=1;i<route.points.length;i++){
    const [a,b]=route.points.slice(i-1,i+1),n=Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])/2);
    for(let j=0;j<=n;j++)assert(!inSolid(a[0]+(b[0]-a[0])*j/n,a[1]+(b[1]-a[1])*j/n),id+': route cuts through a building');
    if(i>1){
      const [x,z]=route.points[i-2],dx=a[0]-x,dz=a[1]-z,ex=b[0]-a[0],ez=b[1]-a[1];
      assert(dx*ex+dz*ez>-.98*Math.hypot(dx,dz)*Math.hypot(ex,ez),id+': route overshoots the doorway lane and doubles back');
    }
  }
}
for(const v of fieldViews.filter(v=>v.date)){
  const [x,z]=v.camera;assert(!solidAt(x,2.45,z),v.id+': field camera starts inside a wall');
}
assert(!solidAt(181,2.45,-133,teachingId)&&solidAt(181,10,-133,teachingId),'White wing has an open ground floor');
for(const [z,bridgeX,shadeZ,towerZ] of [[-33.8,171.0,-21.0,-44.0],[-121.8,170.6,-134.0,-111.5]]){
  for(let x=155;x<194;x+=.25)assert(!solidAt(x,2.45,z),'An east court must remain open right through to the space between the named wings');
  assert(solidAt(bridgeX,7,z)&&!solidAt(bridgeX,2.45,z),'A red link spans the route overhead');
  assert(solidAt(180,11,shadeZ)&&!solidAt(180,3,shadeZ)&&solidAt(z>-80?183.0:183.7,3.0,towerZ),'The tower and the upper white classrooms occupy different sides of each passage');
}
for(const id of ['teaching-23','teaching-56']){
  const v=fieldViews.find(v=>v.id===id),h=new URLSearchParams(new URL(v.url).hash.slice(1));
  assert(v.wings.length===2&&v.wings.every(w=>data.building.some(b=>w==='b-'+b[4]&&/号教学楼/.test(b[3])))&&
    h.get('panoid')===(id==='teaching-23'?'01027700001404011230120335G':'01027700001404011230345435G')&&+h.get('heading')===v.camera[2]);
}
assert(!solidAt(-91,2.45,-73,libraryId)&&solidAt(-109,4,-73,libraryId)&&!solidAt(-109,24,-73,libraryId),'The low east lobby must be set back into the higher library wings');
assert(eastGateBlockers().every(p=>!toolkit.contains(482.8,-77,p)),'The eastern entrance must stay open down the middle');
const heightAt=facultyHeights(data);
const on=(x,z,q)=>toolkit.contains(x,z,q);
const trackView=fieldViews.find(v=>v.id==='stadium-track'),shared=fieldViews.find(v=>v.id==='stadium-field');
const sharedParams=new URLSearchParams(new URL(shared.url).hash.slice(1));
assert(sharedParams.get('panoid')==='09027700122206231415580505A'&&+sharedParams.get('heading')===shared.camera[2]&&shared.camera[2]===292.75&&+sharedParams.get('pitch')===shared.camera[3]);
const {tracks}=runningTracks(data.sport),oval=tracks.find(t=>on(...trackView.camera.slice(0,2),t.outer));
assert(oval&&!on(...trackView.camera.slice(0,2),oval.inner)&&!on(...shared.camera.slice(0,2),oval.outer)&&trackView.title.includes('模型'),'The street reference and the trackside model are distinct; the near camera stands on a real running lane');
const fence=stadiumFence(data),eastEdge=fence[0].map((a,i)=>(a+fence[2][i])/2);
assert(on(...eastEdge,fence)&&eastEdge[0]<shared.camera[0]&&eastEdge[0]>Math.max(...oval.outer.map(p=>p[0])),'The boundary fence separates the field from both street cameras');
const towards=trackView.camera[2]*Math.PI/180,forward=t=>[trackView.camera[0]+Math.sin(towards)*t,trackView.camera[1]-Math.cos(towards)*t];
let lastHeight=0,risers=0;
for(let t=.15;t<=37.5;t+=.15){
  const a=forward(t-.15),b=forward(t),h=standHeight(...b)??.75;
  assert(canStepOnStand(...a,...b)&&h>=lastHeight,'Visitors can ascend the whole access flight directly from the track viewpoint');
  if(lastHeight&&h>lastHeight+.1)risers++;lastHeight=h;
}
assert(risers>35&&lastHeight>11,'The walk climbs real half-steps all the way to the crest');
const standAt=(u,y,v)=>{const [x,z]=standFrame.world([u,v]);return solidAt(x,y,z,standId);};
assert(!standAt(1,8,-2)&&standAt(1,8,-24)&&!canStepOnStand(...standFrame.world([1,-1]),...standFrame.world([1,-1.1])),'Seating rises away from the track; users cannot climb a vertical seat riser');
const bowl=stadiumFieldModel(data),seats=bowl.filter(g=>g.normal?.[1]>.99&&g.center[1]>4&&g.center[1]<6)
  .flatMap(g=>g.parts.filter(p=>p[2]==='terrace'&&!p[3]).map(p=>p[1]));
assert(new Set(seats).size>=8,'The exposed seats, covered centre and access aisles retain distinct finishes');
const roof=bowl.filter(g=>g.normal?.[1]>.99&&g.center[1]>18).map(g=>standFrame.local([g.center[0],g.center[2]]));
assert(roof.length&&roof.every(([u])=>Math.abs(u)<32)&&roof.some(([,v])=>v> -12)&&roof.some(([,v])=>v< -29),'The roof spans both sides of the central stand and leaves the end sections open');
assert(data.water.findIndex(p=>on(cuitingCenter.x,cuitingCenter.z,p))===0&&fieldViews.find(v=>v.id==='jiuzhang').place==='campus-bridge','The named lake is north of Economics; the old stone bridge keeps its separate viewpoint');
const deck=bridgeDeck(details);
assert(on(137,-229.7,deck)&&data.water.some(p=>on(137,-229.7,p))&&!on(cuitingCenter.x,cuitingCenter.z,deck),'Only the surveyed bridge deck permits walking over open water');
const {waterBlocks}=walkingWater(details,data.water,toolkit.contains,toolkit.bounds),mix2=(a,b,t)=>a.map((v,i)=>v+(b[i]-v)*t);
for(const k of [.12,.5,.88])for(let t=-.4;t<1.4;t+=.04){
  const [x,z]=mix2(mix2(deck[0],deck[3],k),mix2(deck[1],deck[2],k),t);
  assert(!waterBlocks(x,z)&&!solidAt(x,2.45,z),'Both approaches and the whole Jiuzhang crossing are walkable');
}
assert(waterBlocks(cuitingCenter.x,cuitingCenter.z)&&data.water[1].some(([x,z])=>waterBlocks(x+1,z+1)),'Open water remains blocked away from the bridge');
const square=data.plaza.find(isMarcoRing),hole=marcoHole();
const withHole=toolkit.groundShape(square,[hole]),pos=withHole.attributes.position,idx=withHole.index.array;
for(let i=0;i<idx.length;i+=3){
  const tri=[idx[i],idx[i+1],idx[i+2]].map(j=>[pos.getX(j),-pos.getY(j)]);
  assert(!on(19.15,-76.51,tri)&&!on(52.72,-78.1,tri),'Original plaza pavement must not cover the lowered floor or steps');
}
withHole.dispose();
assert(!details.surfaces.some(([p])=>on(19.15,-76.5,p))&&!details.trees.some(([x,z])=>Math.hypot(x-19.15,z+76.5)<51),'The circular space is not covered by landscaping');
const treadHeights=Array.from({length:12},(_,j)=>heightAt(19.15+37+(j+.5)*1.2,-76.5));
assert(heightAt(19.15,-76.5)<-1.8 && treadHeights.every((h,i)=>!i||(h>treadHeights[i-1]+.18&&h<treadHeights[i-1]+.21))&&Math.abs(treadHeights.at(-1)-.45)<.001,'A radial flight has twelve walkable risers between the square floor and rim');
const obstructions=publicBlockers(data),blocked=(x,z)=>obstructions.some(p=>on(x,z,p));
assert(blocked(19.3,-600.8)&&!blocked(8.2,-600.8)&&!blocked(30,-600.8),'The gate wall is solid and neither approach road centreline is obstructed');
assert(blocked(222.5,399.15)&&!blocked(226.5,399.23)&&blocked(114.7,292),'Only the opening in the basketball curb is passable; the tennis net is separate');
for(const v of fieldViews.filter(v=>['lake','north','office','east-courts','nanyuan'].includes(v.place))){
  const [x,z]=v.camera;assert(!blocked(x,z)&&!data.water.some(p=>on(x,z,p)),v.id+': camera must be on dry, accessible ground');
}
const dining=orientedFrame(-240.8,598.85,1,0),[doorX,doorZ]=dining.world([2,-1.2]);
assert(!solidAt(doorX,2.4,doorZ,nanyuanId)&&solidAt(doorX,6.2,doorZ,nanyuanId),'Nanyuan entrance is recessed under its upper gallery');
assert(!solidAt(-361.2,2.6,69.0,officeId)&&solidAt(-361.2,6.0,69,officeId)&&solidAt(-359.2,2.6,71.76,officeId)&&!solidAt(-357.4,2.6,35.3,officeId),
  'The office south lobby opens behind its round columns, without filling the middle of the horseshoe');
const baskets=data.sport.filter(([p,,s])=>s==='basketball'&&surveyedCourtPlan(p,s)).flatMap(([p,,s])=>surveyedCourtPlan(p,s).cells);
assert(baskets.length>20&&baskets.every(f=>f.v[1]>.99),'The surveyed courts face the street to the south');
for(let offset=-8;offset<=8;offset+=2)
  assert(!solidAt(-138.7+offset*.982,2.8,280.6+offset*.189,civilId),'Civil court should be traversable between the columns');
assert(heightAt(-138.7,280.6)>1.5 && solidAt(-143.3,16,279.7,civilId),'Civil approach must rise under a separate high bridge');
const zfront=(u,v)=>[-361.3+.807*u-.591*v,344.6+.591*u+.807*v];
const [zx,zz]=zfront(59,-1.25);
assert(!solidAt(zx,2.45,zz,zengId)&&solidAt(zx,7,zz,zengId),'Zeng forecourt has a recessed ground floor and an occupied upper storey');
assert(!solidAt(-457,2.45,604,clinicId)&&solidAt(-451.7,5,604,clinicId)&&heightAt(-463,604)>1.4,'Hospital entrance must be recessed behind its front steps');
const spin=['zeng','dorm17','dorm17-end'].map(id=>fieldViews.find(v=>v.id===id));
assert(spin.every(v=>v.camera[0]===spin[0].camera[0]&&v.camera[1]===spin[0].camera[1]&&
  new URLSearchParams(new URL(v.url).hash.slice(1)).get('panoid')==='01027700001404011311010335G'&&+new URLSearchParams(new URL(v.url).hash.slice(1)).get('heading')===v.camera[2])&&
  spin[0].camera[2]===357.77&&spin[1].camera[2]===195.8,'Both user bearings must stay at one real station; the third looks directly at 17');
const education=orientedFrame(238.4,-288.5,-.965,-.262),beiyuan=orientedFrame(329.75,-409.15,-.612,.791);
const occupiedLocal=(d,id,u,y,v)=>{const [x,z]=d.world([u,v]);return solidAt(x,y,z,id);};
for(const [id,x,z] of [[economicsId,102.8,-398.2],[mathsId,78.1,-302.75]]){
  const d=orientedFrame(x,z,-.25,.968);
  assert(occupiedLocal(d,id,3,5,0)&&!occupiedLocal(d,id,3,10,0)&&occupiedLocal(d,id,10,9,0)&&
    !occupiedLocal(d,id,10,13,0)&&occupiedLocal(d,id,22,15,0),'Both college ends must step back in section');
  const v=id===mathsId?-8.2:8.2,bridge=id===mathsId?id:'712688897',[laneX,laneZ]=d.world([14.25,v]);
  assert(!solidAt(laneX,2.45,laneZ)&&solidAt(laneX,5.4,laneZ,bridge)&&details.forecourts.some(p=>on(laneX,laneZ,p)),
    'The surveyed courtyard lane passes under the low enclosed bridge');
  const panels=landmarkModels(data.building.find(b=>b[4]===id)).flatMap(g=>g.parts);
  const roof=Math.max(...panels.flatMap(([q])=>q.map(p=>p[1])));
  const lid=panels.filter(([q])=>q.every(p=>Math.abs(p[1]-roof)<.001)).map(([q])=>q.map(([x,,z])=>[x,z]));
  assert(lid.some(p=>on(...d.world([6.5,1.46]),p))&&!lid.some(p=>on(...d.world([6.5,0]),p)),
    'The roof blade has material around its oculus but none through its centre');
}
assert(!solidAt(351.65,2.4,-496.6,lifeId)&&solidAt(351.65,2.4,-498.4,lifeId)&&solidAt(347.2,2.4,-496.6,lifeId),
  'The life sciences stair door is set back between real solid jambs');
const labSteps=[-493.05,-493.5,-493.95,-494.4,-494.9].map(z=>heightAt(351.65,z));
assert(labSteps.every((h,i)=>h>.75&&(!i||h>labSteps[i-1])),'The five entrance treads rise towards the inset door');
assert(details.forecourts.some(p=>on(351.65,-491.4,p)),'The lab entrance opens onto pavement rather than lawn or a generated tree');
const diningRoof=landmarkModels(data.building.find(b=>b[4]===huayuanId)).flatMap(g=>g.parts);
assert(diningRoof.some(([p])=>p.every(q=>q[1]>23.8))&&!diningRoof.some(([, ,kind])=>kind==='glass'),
  'Huayuan models the roof relief without inventing street-facing glazing');
for(const u of [-9.0,10.7])for(let v=-26;v<2.6;v+=1.35){
  const [x,z]=education.world([u,v]);assert(!solidAt(x,2.45,z),'Visitors must be able to cross on either side of the brick tower');}
assert(!occupiedLocal(education,eduId,3.25,13.8,-11.9)&&occupiedLocal(education,eduId,-8.0,13.8,-11.9),'The roof must surround a real hole at its centre');
assert(solidAt(231,34,-291.7,eduId)&&!solidAt(231,41,-291.7,eduId),'The brick clock tower is a separate taller solid');
const atTread=(u,v)=>heightAt(...beiyuan.world([u,v]));
assert(atTread(-21.9,2.0)>4.3&&atTread(-13.0,2.0)<1.1&&atTread(-23.1,2.0)===4.53,'The external Beiyuan stair must rise from the square into the western landing');
assert(occupiedLocal(beiyuan,beiId,27,10.9,1)&&!occupiedLocal(beiyuan,beiId,13,10.9,-1),'Not every part of the dining hall has the height of its end pavilions');
assert.equal(courtSigns.find(s=>s.id==='712735066').text,'河南大学民族餐厅','Keep the photographed sign distinct from the building name');
const hall=data.building.find(b=>b[4]===hallId);
const bodies=[...buildingSolids([hall])],cx=(passage.left+passage.right)/2;
const occupied=(x,y,z)=>bodies.some(b=>y>=b.base&&y<=b.top&&toolkit.contains(x,z,b.p));
for(let z=passage.rear+1;z<passage.front;z+=2.7){
  assert(!occupied(cx,2.45,z)&&occupied(passage.left-.5,2.45,z)&&occupied(passage.right+.5,2.45,z)&&occupied(cx,6,z),'The passage must stay open below the hall and between its piers');
}
assert(!reportFacade(hall[0]).flatMap(b=>b.parts).some(([p])=>Math.min(...p.map(q=>q[0]))<cx&&Math.max(...p.map(q=>q[0]))>cx&&Math.min(...p.map(q=>q[1]))<passage.clear),'Finish panels must not close the opening');
assert(details.bridge.sides.length===2 && details.bridge.spans.length===2,'One bridge deck requires two outer parapets');
assert(entryGap(details,-7,-181.6)&&!entryGap(details,-28,-181.6),'The gateway must line up with the east-end doors');
assert(putFieldTrees([[-7,-185,7]],details,toolkit.contains).every(([x,z])=>x!==-7||z!==-185),'Clear the path to the entrance');
assert(details.shrubs.length>0 && details.shrubs.every(([x,z])=>!data.water.some(p=>toolkit.contains(x,z,p))),'Bank planting must stay on land');
const building = await loadModule('building-detail.js');
const landscape = await loadModule('landscape-detail.js');
const scene = new T.Scene();
const results = [
  ['buildings', building.addBuildingDetails(scene, rendered, toolkit)],
  ['landscape', landscape.addLandscapeDetails(scene, rendered, toolkit)]
];
const report = {};
for (const [name, result] of results) {
  assert(result.group && result.group.parent === scene, `${name}: group must be attached to scene`);
  let meshes = 0, vertices = 0, triangles = 0, bytes = 0;
  const meshReport = [];
  result.group.traverse(object => {
    if (!object.isMesh) return;
    meshes++;
    const geometry = object.geometry, position = geometry.getAttribute('position');
    assert(position && position.count > 0, `${object.name}: empty geometry`);
    for (const [attributeName, attribute] of Object.entries(geometry.attributes)) {
      if (attributeName !== 'uv') assert.equal(attribute.count, position.count, `${object.name}: ${attributeName} count`);
      for (let i = 0; i < attribute.array.length; i++) assert(Number.isFinite(attribute.array[i]), `${object.name}: ${attributeName}[${i}] is not finite`);
      bytes += attribute.array.byteLength;
    }
    const index = geometry.getIndex();
    if(name==='buildings'){
      assert(index,`${object.name}: architectural batches must retain indices`);
      if(/^(?:window-frames-and-storey-bands|recessed-window-glazing) \[/.test(object.name)){
        const cell=object.name.match(/\[(-?\d+),(-?\d+)\]$/).slice(1).map(Number);
        assert.equal(index.count*2,position.count*3,`${object.name}: four vertices per facade quad`);
        for(let i=0;i<position.count;i+=4){
          let x=0,z=0;for(let j=i;j<i+4;j++){x+=position.getX(j);z+=position.getZ(j);}
          // Rounded GPU floats can straddle a cell boundary by a few micrometres.
          assert(Math.abs(x/4-cell[0]*360)<=180.001&&Math.abs(z/4-cell[1]*360)<=180.001,
            `${object.name}: quad lies outside its 360 m cell`);
        }
      }
      if(object.name==='Court chain-link enclosures'){
        const base=geometry.getAttribute('railBase').array;
        assert(base.some(y=>y<0)&&base.some(y=>y>5)&&base.filter(y=>y>=0).length<=96,'Terrace rails share the original court shader in whole indexed panels');
        assert(base.filter(y=>y===-2).length===4*4&&base.includes(-3)&&base.includes(-4),'Four balcony fronts, equipment screens and roof louvers use indexed panels, not separate bars');
      }
    }
    if (index) {
      for (const i of index.array) assert(Number.isInteger(i) && i >= 0 && i < position.count, `${object.name}: index outside vertex buffer`);
      bytes += index.array.byteLength;
    }
    const count = index ? index.count : position.count;
    assert.equal(count % 3, 0, `${object.name}: incomplete triangles`);
    const meshTriangles = count / 3;
    vertices += position.count; triangles += meshTriangles;
    geometry.computeBoundingBox(); geometry.computeBoundingSphere();
    for (const value of [...geometry.boundingBox.min, ...geometry.boundingBox.max, ...geometry.boundingSphere.center, geometry.boundingSphere.radius]) assert(Number.isFinite(value), `${object.name}: invalid geometry bounds`);
    for (const value of object.matrix.elements) assert(Number.isFinite(value), `${object.name}: invalid object transform`);
    meshReport.push({ name: object.name, vertices: position.count, triangles: meshTriangles });
  });
  assert(meshes > 0 && vertices > 0, `${name}: no geometry generated`);
  report[name] = { stats: result.stats, meshes, vertices, triangles, bufferMiB: +(bytes / 1024 ** 2).toFixed(2), geometryFinite: true, meshReport };
}
assert.equal(report.buildings.stats.triangles, report.buildings.triangles, 'Building triangle statistics disagree with actual buffers');
assert(report.buildings.meshes<=42&&report.buildings.triangles<510_000,'Architecture exceeds its mesh or triangle budget');
for(const prefix of ['window-frames-and-storey-bands [','recessed-window-glazing [','Court chain-link enclosures']){
  assert(report.buildings.meshReport.some(m=>m.name.startsWith(prefix)),prefix+' must be present in the rendered scene');
}
assert.equal(report.landscape.stats.tracks, 2, 'Both running tracks must be generated');
assert.equal(report.landscape.stats.shores, data.water.length, 'All lake shores must be generated');
assert(report.landscape.triangles < 150_000, 'Landscape exceeds its 150,000 triangle budget');
assert(report.landscape.meshes <= 6, 'Landscape batching regressed');
assert.equal(JSON.stringify(data), before, 'Detail modules changed the supplied campus data');
report.sourceDataUnchanged = true;
report.total = { meshes: report.buildings.meshes + report.landscape.meshes, vertices: report.buildings.vertices + report.landscape.vertices, triangles: report.buildings.triangles + report.landscape.triangles };
console.log(JSON.stringify(report, null, 2));
for (const [, result] of results) result.group.traverse(object => { if (object.isMesh) { object.geometry.dispose(); object.material.dispose(); } });
