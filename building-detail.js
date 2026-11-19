import * as T from 'three';

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
  mesh(options = {}) {
    const { physical = false, ...materialOptions } = options;
    const geometry = new T.BufferGeometry();
    geometry.setAttribute('position', new T.Float32BufferAttribute(this.positions, 3));
    geometry.setAttribute('normal', new T.Float32BufferAttribute(this.normals, 3));
    geometry.setAttribute('color', new T.Float32BufferAttribute(this.colors, 3));
    geometry.setIndex(this.indices);
    geometry.computeBoundingSphere();
    const Material = physical ? T.MeshPhysicalMaterial : T.MeshStandardMaterial;
    return new T.Mesh(geometry, new Material({
      vertexColors: true, roughness: .88, side: T.DoubleSide, ...materialOptions
    }));
  }
}

export function addBuildingDetails(scene, data, { Batch, contains, bounds }) {
  const group = new T.Group();
  group.name = 'campus-architectural-details';
  const masonry = new FacadeBatch(), glass = new FacadeBatch(), fittings = new Batch();
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
    const recessShade = new T.Color(trim).multiplyScalar(.66).getHex();
    const topShade = new T.Color(trim).multiplyScalar(.52).getHex();
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
    const underside = new T.Color(color).multiplyScalar(.72).getHex();
    if (edge.sign > 0) masonry.quad(below[0], below[3], below[2], below[1], underside);
    else masonry.quad(below[0], below[1], below[2], below[3], underside);
  }
  function otherBuildingAt(x, z, current) {
    return buildingRings.some(([b, ring]) => ring !== current && x > b[0] && x < b[2] && z > b[1] && z < b[3] && contains(x, z, ring));
  }

  for (const [ring, height, type, , id, campus] of data.building) {
    if (!campus || height < 4) continue;
    stats.buildings++;
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
      // The existing photo-derived west library facade remains unobscured.
      const preserveFacade = isLibrary && edge.nx < -.55;
      if (!preserveFacade) {
        wall(masonry, edge, edge.length / 2, .72, edge.length, 1.28, .025, shadow);
        ledge(edge, height + .11, .24, .3, trim);
        for (let floor = 1; floor < floors; floor++) ledge(edge, .08 + floor * floorHeight, .19, .15, trim);
      }
      // Roof curbs follow every bend instead of filling concave footprints.
      if (edge.length > .4) {
        const curb = new T.BoxGeometry(Math.max(.1, edge.length - .03), .52, .24);
        curb.rotateY(-Math.atan2(edge.tz, edge.tx));
        curb.translate(edge.ax + edge.tx * edge.length / 2 - edge.nx * .15, height + .34, edge.az + edge.tz * edge.length / 2 - edge.nz * .15);
        fittings.add(curb, trim);
      }
      if (preserveFacade || edge.length < 3.3) continue;
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

    let entrance = null, entranceScore = Infinity;
    for (const edge of edges) {
      if (edge.length < 8 || isLibrary && edge.nx > -.8) continue;
      const x = edge.ax + edge.tx * edge.length / 2, z = edge.az + edge.tz * edge.length / 2;
      if (otherBuildingAt(x + edge.nx * 2, z + edge.nz * 2, ring)) continue;
      const score = isLibrary ? Math.abs(z + 73) - edge.length * .1 : Math.min(...roadSegments.map(([a, b]) => distanceToSegment(x, z, a, b))) - Math.min(edge.length, 40) * .05;
      if (score < entranceScore) { entrance = edge; entranceScore = score; }
    }
    // The library already has a reference-informed curved canopy and stair in
    // facade.js; a second generic canopy intersected those existing elements.
    if (entrance && height > 7 && !isLibrary) {
      const e = entrance, angle = -Math.atan2(e.tz, e.tx);
      const x = e.ax + e.tx * e.length / 2, z = e.az + e.tz * e.length / 2;
      const width = isLibrary ? 13.8 : computerCollege ? Math.min(10.8,e.length*.6) : Math.min(5.4, e.length * .48);
      const doorWidth = isLibrary ? 7.4 : Math.min(3.2, width - .6);
      recessedOpening(e, e.length / 2, 1.55, doorWidth, 2.7, '#c2c4b6', '#757c72', '#40575d', true);
      for (const side of [-1, 1]) {
        box(x + e.tx * side * .22 + e.nx * .13, 1.5, z + e.tz * side * .22 + e.nz * .13, .035, .42, .08, '#b4beba', angle);
      }
      if(computerCollege){
        // Photo reference: a tall pale entrance frame surrounding dark glazing.
        // Entrance location still follows the road-facing footprint heuristic.
        const portalHeight=Math.min(8.5,height*.45);
        wall(glass,e,e.length/2,portalHeight/2+.3,width-1.1,portalHeight,.018,'#52666b');
        for(const side of [-1,1])box(x+e.tx*side*(width/2-.25)+e.nx*.22,portalHeight/2+.3,z+e.tz*side*(width/2-.25)+e.nz*.22,.5,portalHeight,.5,'#dadbd0',angle);
        box(x+e.nx*.22,portalHeight+.3,z+e.nz*.22,width,.55,.5,'#dadbd0',angle);
      }
      const depth = isLibrary ? 6.5 : 2.1, canopyY = isLibrary ? 4.45 : 3.5;
      box(x + e.nx * depth / 2, canopyY, z + e.nz * depth / 2, width, .22, depth, [shadow, trim], angle);
      for (const side of [-1, 1]) {
        const offset = width / 2 - .42;
        box(x + e.nx * (depth - .4) + e.tx * offset * side, canopyY / 2, z + e.nz * (depth - .4) + e.tz * offset * side, isLibrary ? .5 : .16, canopyY - .12, isLibrary ? .5 : .16, trim, angle);
      }
      for (let step = 0; step < 3; step++) {
        const stepDepth = (isLibrary ? 3.3 : 1.55) - step * (isLibrary ? .65 : .3);
        const stepHeight = .16 + step * .15;
        box(x + e.nx * stepDepth / 2, .4 + stepHeight / 2, z + e.nz * stepDepth / 2, width + .6, stepHeight, stepDepth, [shadow, trim], angle);
      }
      stats.entrances++;
    }

    const [left, top, right, bottom] = bounds(ring);
    let units = 0;
    for (const [u, v] of [[.36, .37], [.64, .63], [.5, .5], [.26, .7], [.73, .3]]) {
      if (units >= (isLibrary ? 3 : right - left > 35 && bottom - top > 20 ? 2 : 1)) break;
      const x = left + (right - left) * u, z = top + (bottom - top) * v;
      if (![[x - 2.2, z - 1.8], [x + 2.2, z - 1.8], [x + 2.2, z + 1.8], [x - 2.2, z + 1.8]].every(([a, b]) => contains(a, b, ring))) continue;
      if (edges.some(e => distanceToSegment(x, z, [e.ax, e.az], [e.ax + e.tx * e.length, e.az + e.tz * e.length]) < 2.9)) continue;
      box(x, height + .29, z, 4.2, .32, 3.35, '#827f72');
      box(x, height + .69, z, 3.6, .58, 2.7, ['#a4a79d', '#c5c9bc']);
      for (let vent = 0; vent < 4; vent++) box(x - 1.2 + vent * .8, height + .99, z, .35, .025, 2.1, '#697771');
      units++; stats.rooftopUnits++;
    }
  }

  const walls = masonry.mesh(), windows = glass.mesh({
    physical: true, roughness: .26, metalness: 0, ior: 1.5,
    envMapIntensity: .8, reflectivity: .45
  });
  const equipment = fittings.mesh({ roughness: .82 });
  walls.name = 'window-frames-and-storey-bands';
  windows.name = 'recessed-window-glazing';
  equipment.name = 'roof-fittings-and-entrances';
  walls.receiveShadow = windows.receiveShadow = equipment.receiveShadow = true;
  equipment.castShadow = true;
  group.add(walls, windows, equipment);
  stats.triangles = [walls, windows, equipment].reduce((total, mesh) => {
    const geometry = mesh.geometry;
    return total + (geometry.getIndex()?.count ?? geometry.getAttribute('position').count) / 3;
  }, 0);
  group.userData.detailStats = stats;
  scene.add(group);
  return { group, stats };
}
