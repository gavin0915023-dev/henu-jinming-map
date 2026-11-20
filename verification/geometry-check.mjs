import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import * as T from '../assets/three.module.min.js';
import { campusAvenueData, avenueHedgeRuns, avenueTrees } from '../avenue.js';
import { fieldGround, entryGap, putFieldTrees } from '../field-ground.js';
import { buildingSolids, hallId, passage, reportFacade } from '../wenfu.js';
import { fieldViews } from '../field-views.js';
import { eastGateBlockers, teachingId } from '../east-campus.js';
import { libraryId } from '../central-axis.js';
import { civilId, zengId, clinicId, facultyHeights } from '../faculty-sites.js';

// Evaluate the real Batch and footprint helpers without starting the browser renderer.
const root = new URL('../', import.meta.url);
const modelSource = await readFile(new URL('model.js', root), 'utf8');
const start = modelSource.indexOf('const closed =');
const end = modelSource.indexOf('\nfunction seeded()', start);
assert(start >= 0 && end > start, 'Cannot locate the model geometry helpers');
const toolkit = new Function('T', `${modelSource.slice(start, end)}\nreturn { Batch, contains, bounds };`)(T);

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
for(const v of fieldViews.filter(v=>v.date)){
  const [x,z]=v.camera;assert(!solidAt(x,2.45,z),v.id+': field camera starts inside a wall');
}
assert(!solidAt(181,2.45,-133,teachingId)&&solidAt(181,7,-133,teachingId),'White wing has an open ground floor');
assert(!solidAt(-91,2.45,-73,libraryId)&&solidAt(-109,4,-73,libraryId)&&!solidAt(-109,24,-73,libraryId),'The low east lobby must be set back into the higher library wings');
assert(eastGateBlockers().every(p=>!toolkit.contains(482.8,-77,p)),'The eastern entrance must stay open down the middle');
const heightAt=facultyHeights(data);
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
assert.equal(report.landscape.stats.tracks, 2, 'Both running tracks must be generated');
assert.equal(report.landscape.stats.shores, data.water.length, 'All lake shores must be generated');
assert(report.landscape.triangles < 150_000, 'Landscape exceeds its 150,000 triangle budget');
assert(report.landscape.meshes <= 6, 'Landscape batching regressed');
assert.equal(JSON.stringify(data), before, 'Detail modules changed the supplied campus data');
report.sourceDataUnchanged = true;
report.total = { meshes: report.buildings.meshes + report.landscape.meshes, vertices: report.buildings.vertices + report.landscape.vertices, triangles: report.buildings.triangles + report.landscape.triangles };
console.log(JSON.stringify(report, null, 2));
for (const [, result] of results) result.group.traverse(object => { if (object.isMesh) { object.geometry.dispose(); object.material.dispose(); } });
