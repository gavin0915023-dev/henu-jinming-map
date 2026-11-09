import * as T from 'three';

// Architectural embellishments use the supplied footprints and heights. Window
// spacing and rooftop fittings are procedural, rather than surveyed details.
class FacadeBatch {
  constructor() {
    this.positions = [];
    this.normals = [];
    this.colors = [];
    this.colorCache = new Map();
  }
  quad(a, b, c, d, color) {
    let tint = this.colorCache.get(color);
    if (!tint) {
      tint = new T.Color(color);
      this.colorCache.set(color, tint);
    }
    const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2];
    const vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
    const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    const length = Math.hypot(nx, ny, nz) || 1;
    for (const p of [a, b, c, a, c, d]) {
      this.positions.push(...p);
      this.normals.push(nx / length, ny / length, nz / length);
      this.colors.push(tint.r, tint.g, tint.b);
    }
  }
  mesh(options = {}) {
    const geometry = new T.BufferGeometry();
    geometry.setAttribute('position', new T.Float32BufferAttribute(this.positions, 3));
    geometry.setAttribute('normal', new T.Float32BufferAttribute(this.normals, 3));
    geometry.setAttribute('color', new T.Float32BufferAttribute(this.colors, 3));
    geometry.computeBoundingSphere();
    return new T.Mesh(geometry, new T.MeshStandardMaterial({
      vertexColors: true, roughness: .88, side: T.DoubleSide, ...options
    }));
  }
}

export function addBuildingDetails(scene, data, { Batch, contains, bounds }) {
  const group = new T.Group();
  group.name = 'campus-architectural-details';
  const masonry = new FacadeBatch(), glass = new FacadeBatch(), fittings = new Batch();
  const stats = { buildings: 0, windows: 0, entrances: 0, rooftopUnits: 0, triangles: 0 };
  const glazing = ['#405c65', '#536e75', '#36545e', '#6c8588', '#45626b'];
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
        for (let floor = 1; floor < floors; floor++) ledge(edge, .08 + floor * floorHeight, .12, .13, trim);
      }
      // Roof curbs follow every bend instead of filling concave footprints.
      if (edge.length > .4) {
        const curb = new T.BoxGeometry(Math.max(.1, edge.length - .03), .52, .24);
        curb.rotateY(-Math.atan2(edge.tz, edge.tx));
        curb.translate(edge.ax + edge.tx * edge.length / 2 - edge.nx * .15, height + .34, edge.az + edge.tz * edge.length / 2 - edge.nz * .15);
        fittings.add(curb, trim);
      }
      if (preserveFacade || edge.length < 3.3) continue;
      const bays = Math.floor((edge.length - 1.3) / (dorm ? 3.15 : isLibrary ? 4.1 : 3.8));
      if (bays < 1) continue;
      const pitch = (edge.length - 1.3) / bays;
      const width = Math.min(dorm ? 1.62 : isLibrary ? 2.5 : 2.15, pitch * .61);
      const windowHeight = Math.min(2.15, floorHeight * .55);
      for (let floor = 0; floor < floors; floor++) {
        const y = .08 + floor * floorHeight + floorHeight * .55;
        for (let bay = 0; bay < bays; bay++) {
          const center = .65 + (bay + .5) * pitch;
          wall(masonry, edge, center, y, width + .24, windowHeight + .22, .034, shadow);
          wall(masonry, edge, center, y, width + .14, windowHeight + .12, .065, trim);
          const tintIndex = ((bay + floor * 3 + Math.round(edge.ax)) % glazing.length + glazing.length) % glazing.length;
          wall(glass, edge, center, y, width, windowHeight, .072, glazing[tintIndex]);
          wall(masonry, edge, center, y, .064, windowHeight, .085, '#b6b7ab');
          ledge(edge, y - windowHeight / 2 - .025, .22, .11, trim, center - width / 2 - .16, center + width / 2 + .16);
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
    if (entrance && height > 7) {
      const e = entrance, angle = -Math.atan2(e.tz, e.tx);
      const x = e.ax + e.tx * e.length / 2, z = e.az + e.tz * e.length / 2;
      const width = isLibrary ? 13.8 : Math.min(5.4, e.length * .48);
      const doorWidth = isLibrary ? 7.4 : Math.min(3.2, width - .6);
      wall(masonry, e, e.length / 2, 1.55, doorWidth + .35, 2.95, .095, '#a59d85');
      wall(glass, e, e.length / 2, 1.55, doorWidth, 2.7, .11, '#344f57');
      wall(masonry, e, e.length / 2, 1.55, .1, 2.7, .13, '#bcc0b4');
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

  const walls = masonry.mesh(), windows = glass.mesh({ roughness: .28, metalness: .16 });
  const equipment = fittings.mesh({ roughness: .82 });
  walls.name = 'window-frames-and-storey-bands';
  windows.name = 'recessed-window-glazing';
  equipment.name = 'roof-fittings-and-entrances';
  walls.receiveShadow = windows.receiveShadow = equipment.receiveShadow = true;
  equipment.castShadow = true;
  group.add(walls, windows, equipment);
  stats.triangles = Math.round((masonry.positions.length + glass.positions.length + fittings.positions.length) / 9);
  group.userData.detailStats = stats;
  scene.add(group);
  return { group, stats };
}
