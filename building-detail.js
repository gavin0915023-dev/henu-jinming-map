import * as T from 'three';
import { hallId, softwareId, reportFacade } from './wenfu.js';
import { physicsModel, labId, coneId } from './physics.js';
import { eastModels, protectedTeachingEdge, teachingId, standId } from './east-campus.js';
import { teachingWingEdge } from './teaching-courts.js';
import { centralModels, axisCustomEdge, teachingFrontId } from './central-axis.js';
import { facultyModels, facultyColors, facultyEdge, civilId } from './faculty-sites.js';

// Architectural embellishments use the supplied footprints and heights. Window
// spacing and rooftop fittings are procedural, rather than surveyed details.
class FacadeBatch {
  constructor() {
    this.positions = [];
    this.normals = [];
    this.colors = [];
    this.indices = [];
    this.colorCache = new Map();
  }
  quad(a, b, c, d, color) {
    const cornerColors = Array.isArray(color) ? color : [color, color, color, color];
    const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2];
    const vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
    const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    const length = Math.hypot(nx, ny, nz) || 1;
    const corners = [a, b, c, d];
    const firstVertex = this.positions.length / 3;
    for (const index of [0, 1, 2, 3]) {
      const p = corners[index], value = cornerColors[index];
      let tint = this.colorCache.get(value);
      if (!tint) {
        tint = new T.Color(value);
        this.colorCache.set(value, tint);
      }
      this.positions.push(...p);
      this.normals.push(nx / length, ny / length, nz / length);
      this.colors.push(tint.r, tint.g, tint.b);
    }
    // Share corners only within this planar quad. Adjacent faces keep separate
    // vertices, preserving their flat normals and per-corner occlusion colors.
    this.indices.push(firstVertex, firstVertex + 1, firstVertex + 2, firstVertex, firstVertex + 2, firstVertex + 3);
  }
  mesh(options = {}, sharedMaterial = null) {
    const { physical = false, ...materialOptions } = options;
    const geometry = new T.BufferGeometry();
    geometry.setAttribute('position', new T.Float32BufferAttribute(this.positions, 3));
    geometry.setAttribute('normal', new T.Float32BufferAttribute(this.normals, 3));
    geometry.setAttribute('color', new T.Float32BufferAttribute(this.colors, 3));
    geometry.setIndex(this.indices);
    geometry.computeBoundingSphere();
    const Material = physical ? T.MeshPhysicalMaterial : T.MeshStandardMaterial;
    const material = sharedMaterial ?? new Material({
      vertexColors: true, roughness: .88, side: T.DoubleSide, ...materialOptions
    });
    return new T.Mesh(geometry, material);
  }
}

class SpatialFacadeBatch {
  constructor(cellSize = 360) {
    this.cellSize = cellSize;
    this.cells = new Map();
  }
  quad(a, b, c, d, color) {
    const cx = (a[0] + b[0] + c[0] + d[0]) * .25;
    const cz = (a[2] + b[2] + c[2] + d[2]) * .25;
    const key = `${Math.floor(cx / this.cellSize)},${Math.floor(cz / this.cellSize)}`;
    let cell = this.cells.get(key);
    if (!cell) {
      cell = new FacadeBatch();
      this.cells.set(key, cell);
    }
    cell.quad(a, b, c, d, color);
  }
  meshes(baseName, options = {}) {
    const { physical = false, ...materialOptions } = options;
    const Material = physical ? T.MeshPhysicalMaterial : T.MeshStandardMaterial;
    const shared = new Material({
      vertexColors: true, roughness: .88, side: T.DoubleSide, ...materialOptions
    });
    const out = [];
    for (const [key, cell] of this.cells) {
      if (!cell.positions.length) continue;
      const m = cell.mesh(options, shared);
      m.name = `${baseName} [${key}]`;
      out.push(m);
    }
    return out;
  }
}

// Documented external faces of footprint 712688906. On the south front u runs
// west from the report-hall end; on the oblique north-west face it runs north-east.
// The 2014 imagery supports the different facade zones; sizes/counts are estimates.
export const computingSignColumns=[['计算机与',160,36],['信息工程学院',61,100]];
function computingFace(e) {
  return e.nz>.98 && e.length>45?'south':
    e.nx<-.5 && e.nz<-.6 && e.length>70?'northwest':
    e.nx>.99 && e.ax>0 && e.length>8?'east':null;
}
export function observedTeachingFace(id,e){
  if(id==='712688906'){
    const kind=computingFace(e);return kind?{edge:e,kind,software:false}:null;
  }
  if(id!==softwareId)return null;
  // The software entrance is at the WEST end. Measure the west and south
  // bays from the doorway; reverse the winding while keeping the outer normal.
  const kind=e.nz>.99&&e.length>40?'south':e.nx<-.99&&e.ax<42&&e.length>10?'east':
    e.nx>.55&&e.nz<-.72&&e.length>60?'northwest':null;
  if(!kind)return null;
  return {kind,software:true,edge:kind==='northwest'?e:{...e,ax:e.ax+e.tx*e.length,
    az:e.az+e.tz*e.length,tx:-e.tx,tz:-e.tz,sign:-e.sign}};
}
export function computingElevation(e,height,face,{masonry,glass,wall,ledge,box,recessedOpening,stats},software=false) {
  const angle=-Math.atan2(e.tz,e.tx);
  const cream='#e2dccc', ashlar='#d6d0bd', frame='#acaeaa', shade='#626d70', blue='#627884';
  const rect=(batch,a,b,lo,hi,offset,color)=>wall(batch,e,(a+b)/2,(lo+hi)/2,b-a,hi-lo,offset,color);
  function solid(a,b,lo,hi,depth,front,color){
    const u=(a+b)/2, offset=front-depth/2;
    box(e.ax+e.tx*u+e.nx*offset,(lo+hi)/2,e.az+e.tz*u+e.nz*offset,b-a,hi-lo,depth,color,angle);
  }
  const south=face==='south',levels=south?4:5;
  const lower=south?height/3:height/6,fh=(height-lower)/levels;
  if(face==='east'){
    // The southeast view shows the entrance glass and railings turning the
    // corner; toward the back of the short wall the stone face is unpierced.
    const split=e.length*.42;
    rect(masonry,0,split,.1,height,.025,cream);
    rect(glass,split,e.length-.5,.45,height-.2,.055,'#5b6c72');
    for(let j=0;j<=5;j++){
      const u=split+(e.length-split-.45)*j/5;
      rect(masonry,u-.035,u+.035,.45,height-.2,.11,frame);
    }
    const base=height/3,step=(height-base)/4;
    rect(masonry,split,e.length-.5,3.45,3.6,.16,frame);
    for(let f=0;f<4;f++){
      const y=base+f*step;
      ledge(e,y+.08,.92,.26,cream,split,e.length);
      rect(masonry,split,e.length,y+1.05,y+1.12,.78,'#8f9898');
      for(let j=1;j<18;j++){
        const u=split+(e.length-split)*j/18;
        rect(masonry,u-.022,u+.022,y+.07,y+1.08,.77,'#9ba4a3');
      }
    }
    solid(e.length-.5,e.length,.16,height,.87,.89,cream);
    ledge(e,height+.11,.98,.22,cream);
    stats.windows+=5;
    return;
  }
  const bays=software?(south?6:9):(south?8:12),start=south?17.1:12.7,end=e.length-.45,pitch=(end-start)/bays;
  rect(masonry,start,end,.12,lower,.008,ashlar);
  rect(masonry,start,end,.12,.77,.012,'#b5ac95');
  // The south ground and first floor share projecting piers; the north-west
  // wing has just one solid base storey before the screened window bands.
  for(let k=0;k<=bays;k++){
    const u=start+k*pitch;
    if(south)solid(u-.18,u+.18,.14,lower+.06,.86,.89,cream);
    if(k===bays)break;
    const punchedFloors=south?2:1;
    for(let f=0;f<punchedFloors;f++){
      const y=(f+.57)*lower/punchedFloors;
      if(south||software){
        recessedOpening(e,u+pitch*.48,y,pitch*.44,1.87,ashlar,'#837f74','#59676a');
        stats.windows++;
      }
      recessedOpening(e,u+pitch*.84,y,.47,1.87,ashlar,'#837f74','#667475');
      stats.windows++;
      if(software && (k+f)%3===1){
        // Short equipment boxes sit below some of the windows on both roads.
        solid(u+pitch*.42,u+pitch*.42+.72,y-1.48,y-.96,.34,.40,'#b1ada3');
        rect(masonry,u+pitch*.45,u+pitch*.45+.48,y-1.39,y-1.02,.42,'#757c79');
      }
    }
  }
  ledge(e,lower+.09,1.02,.34,cream,start,end);
  for(let f=0;f<levels;f++){
    const y=lower+f*fh;
    for(let k=0;k<bays;k++){
      const a=start+k*pitch,b=a+pitch;
      // Glazing and pierced screens share the pale concrete bay frame. The
      // small unscreened recess and occasional condenser break up the grille.
      rect(glass,a+.13,b-.13,y+1.03,y+fh-.19,.42,blue);
      for(let j=1;j<4;j++){
        const u=a+pitch*j/4;
        rect(masonry,u-.032,u+.032,y+1.03,y+fh-.19,.47,frame);
      }
      rect(masonry,a+.12,b-.12,y+.12,y+1.02,.41,shade);
      const cutRight=(k+f)%3!==0;
      const left=a+(cutRight?.17:1.12),right=b-(cutRight?1.12:.17);
      rect(masonry,left,right,y+.13,y+.22,.62,cream);
      rect(masonry,left,right,y+.85,y+.97,.62,cream);
      for(let j=0;j<=12;j++){
        const u=left+(right-left)*j/12;
        rect(masonry,u-.039,u+.039,y+.21,y+.88,.63,'#c8c9c0');
      }
      if((k+2*f)%4===1){
        const u=cutRight?b-.64:a+.64;
        solid(u-.32,u+.32,y+.16,y+.67,.15,.64,'#bac0b7');
        rect(masonry,u-.19,u+.19,y+.23,y+.56,.66,'#888e8a');
      }
      stats.windows++;
    }
    ledge(e,y+1.05,.74,.12,cream,start,end);
    ledge(e,y+fh,.89,.20,cream,start,end);
  }
  for(let k=0;k<=bays;k++){
    const u=start+k*pitch;
    solid(u-.105,u+.105,lower,height,.42,.90,cream);
  }
  if(!south){
    // The southwest end of the Xueyin Road frontage is visibly plain stone
    // with short, low horizontal windows. No entrance is visible on this side.
    rect(masonry,.02,start,.1,height,.024,'#dbd9d0');
    for(let f=1;f<6;f++){
      const y=(f+.51)*height/6;
      for(const [a,b] of [[2.9,6.4],[7.2,10.8]]){
        rect(glass,a,b,y-.37,y+.37,.052,'#5b7077');
        rect(masonry,(a+b)/2-.04,(a+b)/2+.04,y-.37,y+.37,.09,frame);
        stats.windows++;
      }
    }
    ledge(e,height+.11,.98,.22,cream);
    return;
  }
  // Entrance at the east of this south face. The glass stays behind the two
  // piers and upper storeys; there is no second generic porch or centre door.
  const da=1.1, db=12.7;
  solid(.03,da,.12,lower+.12,.93,.95,cream);
  solid(db,start,.12,lower+.12,.93,.95,ashlar);
  rect(glass,da,db,1.25,lower-.18,.14,'#43545a');
  for(let i=0;i<=8;i++){
    const u=da+(db-da)*i/8;
    rect(masonry,u-.047,u+.047,1.24,lower-.18,.22,frame);
  }
  rect(masonry,da,db,3.53,3.69,.27,frame);
  rect(masonry,da,db,2.61,2.68,.25,'#879390');
  for(let i=0;i<4;i++)solid(da-.05,db+.05,.68,.81+i*.15,2.65-i*.49,2.65-i*.49,'#b9b5a9');
  ledge(e,lower+.16,.98,.43,cream,.03,start);
  // Only the central part is stone (the vertical name is fitted separately).
  // The east return has open balcony fronts and slender railings instead.
  const stoneA=6.40,stoneB=13.25;
  solid(stoneA,stoneB,lower+.08,height,.8,.86,'#e3dfd2');
  for(let f=0;f<4;f++){
    const y=lower+f*fh;
    if(software){
      // The pale wall here has one slim inset opening on each level; the
      // college name is on the freestanding sign, not lettered on the wall.
      rect(glass,stoneB-1.52,stoneB-.85,y+.52,y+fh-.48,.90,'#72838a');
    }
    rect(glass,.58,stoneA,y+.18,y+fh-.27,.06,'#52646b');
    rect(glass,stoneB,start,y+.30,y+fh-.24,.075,'#73848a');
    solid(.03,.56,y,y+fh,.84,.88,cream);
    solid(stoneB+.14,stoneB+.43,y,y+fh,.56,.61,cream);
    ledge(e,y+fh,.96,.26,cream,.04,stoneA);
    ledge(e,y+fh,.78,.32,cream,stoneB,start);
    for(const railY of [y+.36,y+1.11])
      rect(masonry,.55,stoneA,railY-.025,railY+.025,.79,'#8f9898');
    for(let j=0;j<=18;j++){
      const u=.59+(stoneA-.62)*j/18;
      rect(masonry,u-.023,u+.023,y+.32,y+1.11,.78,'#9ba4a3');
    }
    stats.windows+=2;
  }
  ledge(e,height+.11,.98,.22,cream);
  stats.entrances++;
}

export function addBuildingDetails(scene, data, { Batch, contains, bounds }) {
  const group = new T.Group();
  group.name = 'campus-architectural-details';
  const masonry = new SpatialFacadeBatch(360), glass = new SpatialFacadeBatch(360);
  const brick = new FacadeBatch(), canopy = new FacadeBatch(), silhouettes = new FacadeBatch();
  const plazaGround = new FacadeBatch(), foliage = new FacadeBatch(), fence = new FacadeBatch();
  const railBases=[];
  const fittings = new Batch();
  const shadeCache = new Map();
  const shadedHex = (hex, factor) => {
    const key = `${hex}|${factor}`;
    let out = shadeCache.get(key);
    if (out === undefined) {
      out = new T.Color(hex).multiplyScalar(factor).getHex();
      shadeCache.set(key, out);
    }
    return out;
  };
  const stats = { buildings: 0, windows: 0, entrances: 0, rooftopUnits: 0, triangles: 0 };
  // Closely related neutral tints avoid a checkerboard of randomly blue panes.
  // The static daylight environment supplies the angle-dependent reflection.
  const glazing = ['#4b626a', '#52686d', '#496168', '#566d72', '#4d656b'];
  const roadSegments = data.road.flatMap(([p]) => p.slice(1).map((q, i) => [p[i], q]));
  const buildingRings = data.building.map(([ring]) => [bounds(ring), ring]);

  function box(x, y, z, width, height, depth, color, angle = 0) {
    const geometry = new T.BoxGeometry(width, height, depth);
    geometry.rotateY(angle);
    geometry.translate(x, y, z);
    fittings.add(geometry, color);
  }
  function distanceToSegment(x, z, a, b) {
    const dx = b[0] - a[0], dz = b[1] - a[1];
    const denominator = dx * dx + dz * dz;
    const t = denominator ? T.MathUtils.clamp(((x - a[0]) * dx + (z - a[1]) * dz) / denominator, 0, 1) : 0;
    return Math.hypot(x - a[0] - t * dx, z - a[1] - t * dz);
  }
  function wall(batch, edge, center, y, width, height, offset, color) {
    const { ax, az, tx, tz, nx, nz, sign } = edge;
    const x = ax + tx * center + nx * offset, z = az + tz * center + nz * offset;
    const a = [x - tx * width / 2, y - height / 2, z - tz * width / 2];
    const b = [x + tx * width / 2, y - height / 2, z + tz * width / 2];
    const c = [b[0], y + height / 2, b[2]], d = [a[0], y + height / 2, a[2]];
    if (sign > 0) batch.quad(a, d, c, b, color);
    else batch.quad(a, b, c, d, color);
  }
  function recessedOpening(edge, center, y, width, height, trim, shadow, tint, door = false) {
    // A full rectangle in front of the glazing would hide it. Four bevelled
    // jamb faces leave a real opening, with the glass 14 cm behind the rim.
    // The underlying footprint remains intact behind this shallow window unit.
    const back = door ? .032 : .026, front = door ? .225 : .17;
    const border = door ? .115 : .10;
    const w = width / 2, h = height / 2;
    const outerW = w + border, outerH = h + border;
    const recessShade = shadedHex(trim, .66);
    const topShade = shadedHex(trim, .52);
    const inner = [
      [-w, -h, back], [w, -h, back], [w, h, back], [-w, h, back]
    ];
    const outer = [
      [-outerW, -outerH, front], [outerW, -outerH, front],
      [outerW, outerH, front], [-outerW, outerH, front]
    ];
    const point = ([u, v, depth]) => [
      edge.ax + edge.tx * (center + u) + edge.nx * depth,
      y + v,
      edge.az + edge.tz * (center + u) + edge.nz * depth
    ];
    wall(masonry, edge, center, y, width + border * 2 + .04, height + border * 2 + .04, .014, shadow);
    for (let side = 0; side < 4; side++) {
      const next = (side + 1) % 4;
      const a = point(outer[side]), b = point(outer[next]);
      const c = point(inner[next]), d = point(inner[side]);
      const shade = side === 2 ? topShade : recessShade;
      if (edge.sign > 0) masonry.quad(a, d, c, b, [trim, shade, shade, trim]);
      else masonry.quad(a, b, c, d, [trim, trim, shade, shade]);
    }
    wall(glass, edge, center, y, width, height, back + .002, tint);
    if (width >= .9) {
      wall(masonry, edge, center, y, door ? .075 : .058, height, back + .055, '#a6b0ad');
    }
  }
  function ledge(edge, y, depth, thickness, color, from = .04, to = edge.length - .04) {
    const width = to - from;
    if (width <= 0) return;
    wall(masonry, edge, (from + to) / 2, y - thickness / 2, width, thickness, depth, color);
    const { ax, az, tx, tz, nx, nz } = edge;
    const a = [ax + tx * from, y, az + tz * from];
    const b = [ax + tx * to, y, az + tz * to];
    const c = [b[0] + nx * depth, y, b[2] + nz * depth];
    const d = [a[0] + nx * depth, y, a[2] + nz * depth];
    if (edge.sign > 0) masonry.quad(a, b, c, d, color);
    else masonry.quad(a, d, c, b, color);
    // Close the soffit: the previous two-sided ribbon had no downward face,
    // so a grazing view could not read the actual thickness of the sill.
    const below = [a, b, c, d].map(p => [p[0], y - thickness, p[2]]);
    const underside = shadedHex(color, .72);
    if (edge.sign > 0) masonry.quad(below[0], below[3], below[2], below[1], underside);
    else masonry.quad(below[0], below[1], below[2], below[3], underside);
  }
  function otherBuildingAt(x, z, current) {
    return buildingRings.some(([b, ring]) => ring !== current && x > b[0] && x < b[2] && z > b[1] && z < b[3] && contains(x, z, ring));
  }

  for(const g of [...physicsModel(data.building),...eastModels(data),...centralModels(data),...facultyModels(data)])for(const [points,color,material,fine] of g.parts){
    const target=material==='brick'?brick:material==='glass'?glass:material==='canopy'?canopy:
      material==='ground'?plazaGround:material==='foliage'?foliage:material==='fence'||material==='rail'?fence:masonry;
    target.quad(...points,color);
    if(target===fence){
      const y=material==='rail'?Math.min(...points.map(p=>p[1])):-1;
      railBases.push(y,y,y,y);
    }
    // Only the broad new surfaces cast shadows: the canopy, curved hall and
    // piers should shade the court without adding every window bar to its map.
    if(material!=='brick'&&material!=='canopy'&&material!=='ground'&&material!=='foliage'&&target!==fence&&material!=='terrace'&&!fine&&Math.hypot(...points[1].map((n,i)=>n-points[0][i]))*Math.hypot(...points[3].map((n,i)=>n-points[0][i]))>3.4)
      silhouettes.quad(...points,'#ffffff');
  }

  for (const [ring, height, type, , id, campus] of data.building) {
    if (!campus || height < 4) continue;
    stats.buildings++;
    if(id===labId||id===coneId||id===civilId||id===standId){ stats.entrances++;continue; }
    if(id===hallId){
      for(const bay of reportFacade(ring))for(const [p,color,isGlass] of bay.parts)
        (isGlass?glass:masonry).quad(...p,color);
      continue;
    }
    const points = ring.slice(0, -1);
    const area = points.reduce((sum, a, i) => {
      const b = points[(i + 1) % points.length];
      return sum + a[0] * b[1] - b[0] * a[1];
    }, 0);
    const sign = area >= 0 ? 1 : -1;
    const isLibrary = type === 'library' || id === 'plan-library';
    const dorm = type === 'dorm';
    const computerCollege = id === '712688906';
    const trim = isLibrary ? '#d8c59c' : dorm ? '#d2c5af' : '#d6d0ba';
    const shadow = dorm ? '#746859' : '#7e7c70';
    const floors = Math.max(1, Math.min(9, Math.round(height / (dorm ? 3.35 : 3.7))));
    const floorHeight = height / floors;
    const edges = [];
    for (let i = 0; i < points.length; i++) {
      const a = points[i], b = points[(i + 1) % points.length];
      const length = Math.hypot(b[0] - a[0], b[1] - a[1]);
      if (length < .12) continue;
      const tx = (b[0] - a[0]) / length, tz = (b[1] - a[1]) / length;
      edges.push({ ax: a[0], az: a[1], tx, tz, nx: tz * sign, nz: -tx * sign, length, sign });
    }

    for (const edge of edges) {
      if(facultyEdge(id,edge)||axisCustomEdge(id,edge)||teachingWingEdge(id,edge)||id===teachingId&&protectedTeachingEdge(edge.ax,edge.az,edge.ax+edge.tx*edge.length,edge.az+edge.tz*edge.length))continue;
      const face=observedTeachingFace(id,edge);
      // A shared wall against the lower report hall still has an exposed roof
      // edge, but cannot carry ordinary windows at the join.
      const sharedWall=(computerCollege||id===softwareId) && [.1,.5,.9].every(t=>otherBuildingAt(
        edge.ax+edge.tx*edge.length*t+edge.nx*.2,edge.az+edge.tz*edge.length*t+edge.nz*.2,ring));
      // The existing photo-derived west library facade remains unobscured.
      const preserveFacade = isLibrary && edge.nx < -.55;
      if (!preserveFacade && !face) {
        if(!sharedWall)wall(masonry, edge, edge.length / 2, .72, edge.length, 1.28, .025, shadow);
        ledge(edge, height + .11, .24, .3, trim);
        for (let floor = 1; floor < floors && !sharedWall; floor++) {
          const y=.08+floor*floorHeight;
          ledge(edge,y,.19,.15,trim);
        }
      }
      // Roof curbs follow every bend instead of filling concave footprints.
      if (edge.length > .4) {
        const curb = new T.BoxGeometry(Math.max(.1, edge.length - .03), .52, .24);
        curb.rotateY(-Math.atan2(edge.tz, edge.tx));
        curb.translate(edge.ax + edge.tx * edge.length / 2 - edge.nx * .15, height + .34, edge.az + edge.tz * edge.length / 2 - edge.nz * .15);
        fittings.add(curb, trim);
      }
      if(face){
        computingElevation(face.edge,height,face.kind,{masonry,glass,wall,ledge,box,recessedOpening,stats},face.software);
        continue;
      }
      if (preserveFacade || sharedWall || edge.length < 3.3) continue;
      // Conservative spacing until each building has a surveyed elevation.
      // Short return walls should not look like continuous curtain walls.
      const endWall = type === 'school' && edge.length < 14;
      const baySpacing = endWall ? edge.length : computerCollege ? 5.6 : dorm ? 3.15 : isLibrary ? 4.1 : type === 'school' ? 6.2 : 3.8;
      const bays = endWall ? (edge.length >= 6 ? 1 : 0) : Math.floor((edge.length - 1.3) / baySpacing);
      if (bays < 1) continue;
      const pitch = (edge.length - 1.3) / bays;
      const width = endWall ? .65 : Math.min(dorm ? 1.62 : isLibrary ? 2.5 : computerCollege ? 2.7 : 2.15, pitch * .61);
      const windowHeight = Math.min(2.15, floorHeight * .55);
      for (let floor = 0; floor < floors; floor++) {
        const y = .08 + floor * floorHeight + floorHeight * .55;
        for (let bay = 0; bay < bays; bay++) {
          const center = .65 + (bay + .5) * pitch;
          const tintIndex = ((bay + floor * 3 + Math.round(edge.ax)) % glazing.length + glazing.length) % glazing.length;
          recessedOpening(edge, center, y, width, windowHeight, trim, shadow, glazing[tintIndex]);
          ledge(edge, y - windowHeight / 2 - .025, .27, .11, trim, center - width / 2 - .16, center + width / 2 + .16);
          stats.windows++;
        }
      }
    }

    // Never superimpose a road-selected porch on either bespoke entrance.
    let entrance=null,entranceScore=Infinity;
    if(!facultyColors[id] && !isLibrary && !computerCollege && id!==softwareId && id!==teachingId && id!==standId && id!==teachingFrontId && height>7)for(const edge of edges){
      if(edge.length<8||teachingWingEdge(id,edge))continue;
      const x=edge.ax+edge.tx*edge.length/2,z=edge.az+edge.tz*edge.length/2;
      if(otherBuildingAt(x+edge.nx*2,z+edge.nz*2,ring))continue;
      const score=Math.min(...roadSegments.map(([a,b])=>distanceToSegment(x,z,a,b)))-Math.min(edge.length,40)*.05;
      if(score<entranceScore){entrance=edge;entranceScore=score;}
    }
    if (entrance) {
      const e = entrance, angle = -Math.atan2(e.tz, e.tx);
      const x = e.ax + e.tx * e.length / 2, z = e.az + e.tz * e.length / 2;
      const width = Math.min(5.4,e.length*.48);
      const doorWidth = Math.min(3.2, width - .6);
      recessedOpening(e, e.length / 2, 1.55, doorWidth, 2.7, '#c2c4b6', '#757c72', '#40575d', true);
      for (const side of [-1, 1]) {
        box(x + e.tx * side * .22 + e.nx * .13, 1.5, z + e.tz * side * .22 + e.nz * .13, .035, .42, .08, '#b4beba', angle);
      }
      const depth = 2.1, canopyY = 3.5;
      box(x + e.nx * depth / 2, canopyY, z + e.nz * depth / 2, width, .22, depth, [shadow, trim], angle);
      for (const side of [-1, 1]) {
        const offset = width / 2 - .42;
        box(x + e.nx * (depth - .4) + e.tx * offset * side, canopyY / 2, z + e.nz * (depth - .4) + e.tz * offset * side, .16, canopyY - .12, .16, trim, angle);
      }
      for (let step = 0; step < 3; step++) {
        const stepDepth = 1.55 - step * .3;
        const stepHeight = .16 + step * .15;
        box(x + e.nx * stepDepth / 2, .4 + stepHeight / 2, z + e.nz * stepDepth / 2, width + .6, stepHeight, stepDepth, [shadow, trim], angle);
      }
      stats.entrances++;
    }

    const [left, top, right, bottom] = bounds(ring);
    if(facultyColors[id])continue;
    let units = 0;
    for (const [u, v] of [[.36, .37], [.64, .63], [.5, .5], [.26, .7], [.73, .3]]) {
      if (units >= (isLibrary ? 3 : right - left > 35 && bottom - top > 20 ? 2 : 1)) break;
      const x = left + (right - left) * u, z = top + (bottom - top) * v;
      if (isLibrary&&x>-144&&z>-96&&z<-49)continue;
      if (![[x - 2.2, z - 1.8], [x + 2.2, z - 1.8], [x + 2.2, z + 1.8], [x - 2.2, z + 1.8]].every(([a, b]) => contains(a, b, ring))) continue;
      if (edges.some(e => distanceToSegment(x, z, [e.ax, e.az], [e.ax + e.tx * e.length, e.az + e.tz * e.length]) < 2.9)) continue;
      box(x, height + .29, z, 4.2, .32, 3.35, '#827f72');
      box(x, height + .69, z, 3.6, .58, 2.7, ['#a4a79d', '#c5c9bc']);
      for (let vent = 0; vent < 4; vent++) box(x - 1.2 + vent * .8, height + .99, z, .35, .025, 2.1, '#697771');
      units++; stats.rooftopUnits++;
    }
  }

  const wallChunks = masonry.meshes('window-frames-and-storey-bands');
  const windowChunks = glass.meshes('recessed-window-glazing', {
    physical: true, roughness: .26, metalness: 0, ior: 1.5,
    envMapIntensity: .8, reflectivity: .45
  });
  const nightGlowUniform = { value: 0 };
  if (windowChunks.length) {
    const winMat = windowChunks[0].material;
    winMat.customProgramCacheKey = () => 'campus-window-glaze-v1';
    winMat.onBeforeCompile = shader => {
      shader.uniforms.uNightGlow = nightGlowUniform;
      shader.vertexShader = 'varying vec3 vWinPos;\n' + shader.vertexShader
        .replace('#include <begin_vertex>', '#include <begin_vertex>\nvWinPos=position;');
      shader.fragmentShader = 'uniform float uNightGlow;\nvarying vec3 vWinPos;\n' + shader.fragmentShader
        .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        if (uNightGlow > 0.01) {
          vec3 cell = floor(vec3(vWinPos.x / 3.8 + vWinPos.z * 0.13, vWinPos.y / 3.45, vWinPos.z / 3.8 - vWinPos.x * 0.11));
          float h = fract(sin(dot(cell, vec3(127.1, 311.7, 74.7))) * 43758.5453);
          float lit = step(0.54, h);
          vec3 warmTone = mix(vec3(1.0, 0.78, 0.45), vec3(0.95, 0.91, 0.80), fract(h * 19.3));
          totalEmissiveRadiance += warmTone * lit * (0.45 + 0.65 * fract(h * 7.7)) * uNightGlow;
        }`);
    };
  }
  const equipment = fittings.mesh({ roughness: .82, side: T.FrontSide });
  equipment.name = 'roof-fittings-and-entrances';
  for (const m of wallChunks) { m.receiveShadow = true; group.add(m); }
  for (const m of windowChunks) { m.receiveShadow = true; group.add(m); }
  equipment.receiveShadow = equipment.castShadow = true;
  group.add(equipment);
  let groundMesh = null;
  if (plazaGround.positions.length) {
    groundMesh = plazaGround.mesh({ roughness: .94 });
    groundMesh.name = 'Surveyed plaza ground';
    groundMesh.receiveShadow = true;
    group.add(groundMesh);
  }
  if (foliage.positions.length) {
    const willowMesh = foliage.mesh({ roughness: .96 });
    willowMesh.name = 'Surveyed lakeside willows';
    willowMesh.castShadow = willowMesh.receiveShadow = true;
    group.add(willowMesh);
  }
  if (fence.positions.length) {
    const enclosure = fence.mesh({ roughness: .72, metalness: .15, transparent: true, depthWrite: false });
    enclosure.name = 'Court chain-link enclosures';
    enclosure.geometry.setAttribute('railBase',new T.Float32BufferAttribute(railBases,1));
    enclosure.material.customProgramCacheKey = () => 'campus-chainlink-and-terrace-v2';
    enclosure.material.onBeforeCompile = shader => {
      shader.vertexShader = 'attribute float railBase;varying float railDatum;varying vec3 fencePoint;varying vec3 fenceNormal;\n' + shader.vertexShader
        .replace('#include <begin_vertex>', '#include <begin_vertex>\nrailDatum=railBase;fencePoint=position;fenceNormal=normal;');
      shader.fragmentShader = 'varying float railDatum;varying vec3 fencePoint;varying vec3 fenceNormal;\n' + shader.fragmentShader
        .replace('#include <color_fragment>', `#include <color_fragment>
        vec2 fn = normalize(fenceNormal.xz + vec2(1e-5, 0.0));
        vec2 ft = vec2(-fn.y, fn.x);
        float fu = dot(fencePoint.xz, ft);
        float fv = fencePoint.y;
        float pitch = 0.13;
        float slope = 1.32;
        float d1 = (fv - slope * fu) / pitch;
        float d2 = (fv + slope * fu) / pitch;
        float aa1 = max(0.002, fwidth(d1));
        float aa2 = max(0.002, fwidth(d2));
        float wireHalf = 0.068;
        float w1 = 1.0 - smoothstep(wireHalf, wireHalf + aa1 * 0.85, abs(fract(d1) - 0.5));
        float w2 = 1.0 - smoothstep(wireHalf, wireHalf + aa2 * 0.85, abs(fract(d2) - 0.5));
        float wire = max(w1, w2);
        float farFade = smoothstep(0.32, 0.95, max(aa1, aa2));
        float coverage = mix(wire, 0.24, farFade);
        if(railDatum >= 0.0){
          // One rectangular panel per terrace edge, with horizontal rails and posts.
          vec2 grid=vec2(fu/1.62,(fv-railDatum-.055)/.28);
          vec2 aa=max(fwidth(grid),vec2(.002));
          vec2 bars=1.0-smoothstep(vec2(.019,.065),vec2(.019,.065)+aa*.78,abs(fract(grid+.5)-.5));
          coverage=mix(max(bars.x,bars.y),.17,smoothstep(.32,1.0,max(aa.x,aa.y)));
        }
        if (coverage < 0.06) discard;
        diffuseColor.a *= coverage;`);
    };
    group.add(enclosure);
  }
  if(canopy.positions.length){
    const pane=canopy.mesh({physical:true,roughness:.17,transparent:true,opacity:.29,depthWrite:false,envMapIntensity:.66});
    pane.name='Glazed entrance canopies';group.add(pane);
  }
  if(brick.positions.length){
    const skin=brick.mesh({roughness:.95});
    skin.name='Street-view brick exteriors';
    skin.castShadow=skin.receiveShadow=true;
    skin.material.customProgramCacheKey=()=>'campus-brick-v1';
    skin.material.onBeforeCompile=shader=>{
      shader.vertexShader='varying vec3 brickPoint;varying vec3 brickNormal;\n'+shader.vertexShader
        .replace('#include <begin_vertex>','#include <begin_vertex>\nbrickPoint=position;brickNormal=normal;');
      shader.fragmentShader='varying vec3 brickPoint;varying vec3 brickNormal;\n'+shader.fragmentShader
        .replace('#include <color_fragment>',`#include <color_fragment>
        vec2 along=vec2(.987,.161), across=vec2(-.161,.987);
        float u=abs(dot(brickNormal.xz,along))>.7?dot(brickPoint.xz,across):dot(brickPoint.xz,along);
        vec2 tile=vec2(u/.255,brickPoint.y/.083);
        tile.x+=.5*mod(floor(tile.y),2.);
        vec2 edge=min(fract(tile),1.-fract(tile));
        vec2 aa=max(vec2(.001),fwidth(vec2(u/.255,brickPoint.y/.083)));
        vec2 joint=1.-smoothstep(vec2(.018,.033),vec2(.018,.033)+aa*.48,edge);
        float visible=1.-smoothstep(.24,.98,max(aa.x,aa.y));
        float shade=fract(sin(dot(floor(tile),vec2(17.123,41.577)))*4375.39);
        if(abs(brickNormal.y)<.7)diffuseColor.rgb=mix(diffuseColor.rgb*(1.+(shade-.5)*.11*visible),
          vec3(.34,.25,.195),max(joint.x,joint.y)*.58*visible);`);
    };
    group.add(skin);
  }
  if(silhouettes.positions.length){
    const caster=silhouettes.mesh({colorWrite:false,depthWrite:false});
    caster.name='Observed roof and facade shadows';caster.castShadow=true;group.add(caster);
  }
  stats.triangles = group.children.reduce((total, mesh) => {
    const geometry = mesh.geometry;
    return total + (geometry.getIndex()?.count ?? geometry.getAttribute('position').count) / 3;
  }, 0);
  group.userData.detailStats = stats;
  scene.add(group);
  return { group, stats, plazaGround: groundMesh, nightGlowUniform };
}
