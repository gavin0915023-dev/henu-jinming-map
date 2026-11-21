// Lightweight campus walking router (A* over the surveyed campus road network).
// Lazily built on first route request so initial page startup stays unaffected.

const WALK_WEIGHT = {
  pedestrian: 0.95,
  footway: 1.0,
  path: 1.0,
  cycleway: 1.02,
  service: 1.04,
  unclassified: 1.08,
  residential: 1.1,
  tertiary: 1.35,
  secondary: 1.45,
  primary: 1.55,
  trunk: 1.8
};

function pointToSeg(px, pz, ax, az, bx, bz) {
  const dx = bx - ax, dz = bz - az;
  const len2 = dx * dx + dz * dz;
  const t = len2 > 1e-8 ? Math.max(0, Math.min(1, ((px - ax) * dx + (pz - az) * dz) / len2)) : 0;
  const x = ax + dx * t, z = az + dz * t;
  return { x, z, t, d2: (px - x) ** 2 + (pz - z) ** 2 };
}

function segIntersect(a, b, c, d) {
  const rX = b[0] - a[0], rZ = b[1] - a[1];
  const sX = d[0] - c[0], sZ = d[1] - c[1];
  const denom = rX * sZ - rZ * sX;
  if (Math.abs(denom) < 1e-7) return null;
  const qpX = c[0] - a[0], qpZ = c[1] - a[1];
  const t = (qpX * sZ - qpZ * sX) / denom;
  const u = (qpX * rZ - qpZ * rX) / denom;
  if (t > 0.002 && t < 0.998 && u > 0.002 && u < 0.998) {
    return { t, u, x: a[0] + t * rX, z: a[1] + t * rZ };
  }
  return null;
}

class MinHeap {
  constructor() { this.items = []; }
  push(item) {
    const a = this.items;
    a.push(item);
    let i = a.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (a[p][0] <= a[i][0]) break;
      [a[p], a[i]] = [a[i], a[p]];
      i = p;
    }
  }
  pop() {
    const a = this.items;
    if (!a.length) return null;
    const top = a[0], last = a.pop();
    if (a.length) {
      a[0] = last;
      let i = 0;
      const n = a.length;
      while (true) {
        let l = (i << 1) + 1, r = l + 1, m = i;
        if (l < n && a[l][0] < a[m][0]) m = l;
        if (r < n && a[r][0] < a[m][0]) m = r;
        if (m === i) break;
        [a[i], a[m]] = [a[m], a[i]];
        i = m;
      }
    }
    return top;
  }
  get size() { return this.items.length; }
}

function simplifyPath(points) {
  if (points.length <= 2) return points;
  const out = [points[0]];
  for (let i = 1; i < points.length - 1; i++) {
    const a = out[out.length - 1], b = points[i], c = points[i + 1];
    const d1 = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const d2 = Math.hypot(c[0] - b[0], c[1] - b[1]);
    if (d1 < 0.6) continue;
    const cos = ((b[0] - a[0]) * (c[0] - b[0]) + (b[1] - a[1]) * (c[1] - b[1])) / (d1 * d2 + 1e-8);
    if (cos > 0.9992) continue;
    out.push(b);
  }
  out.push(points[points.length - 1]);
  return out;
}

export function createCampusRouter(data) {
  let graph = null;

  function buildGraph() {
    if (graph) return graph;
    // Collect segments within campus & perimeter box
    const rawSegs = [];
    for (const [line, , , kind] of data.road) {
      const weight = WALK_WEIGHT[kind] ?? 1.15;
      for (let i = 1; i < line.length; i++) {
        const a = line[i - 1], b = line[i];
        if (Math.min(a[0], b[0]) > 650 || Math.max(a[0], b[0]) < -650 ||
            Math.min(a[1], b[1]) > 920 || Math.max(a[1], b[1]) < -760) continue;
        if (Math.hypot(b[0] - a[0], b[1] - a[1]) < 0.2) continue;
        rawSegs.push({ a, b, weight, splits: [0, 1] });
      }
    }

    // Spatial hash (32m cells) to find true segment intersections quickly
    const cell = 32;
    const grid = new Map();
    for (let i = 0; i < rawSegs.length; i++) {
      const { a, b } = rawSegs[i];
      const x0 = Math.floor(Math.min(a[0], b[0]) / cell), x1 = Math.floor(Math.max(a[0], b[0]) / cell);
      const z0 = Math.floor(Math.min(a[1], b[1]) / cell), z1 = Math.floor(Math.max(a[1], b[1]) / cell);
      for (let gx = x0; gx <= x1; gx++) {
        for (let gz = z0; gz <= z1; gz++) {
          const k = gx + ',' + gz;
          let bucket = grid.get(k);
          if (!bucket) { bucket = []; grid.set(k, bucket); }
          bucket.push(i);
        }
      }
    }

    const checked = new Set();
    for (const bucket of grid.values()) {
      for (let m = 0; m < bucket.length; m++) {
        const i = bucket[m];
        for (let n = m + 1; n < bucket.length; n++) {
          const j = bucket[n];
          const pair = i < j ? i * 65536 + j : j * 65536 + i;
          if (checked.has(pair)) continue;
          checked.add(pair);
          const s1 = rawSegs[i], s2 = rawSegs[j];
          const hit = segIntersect(s1.a, s1.b, s2.a, s2.b);
          if (hit) {
            s1.splits.push(hit.t);
            s2.splits.push(hit.u);
          } else {
            // Also detect near T-junctions (endpoint within 2.4m of another segment)
            for (const pt of [s1.a, s1.b]) {
              const pr = pointToSeg(pt[0], pt[1], s2.a[0], s2.a[1], s2.b[0], s2.b[1]);
              if (pr.d2 < 2.4 * 2.4 && pr.t > 0.01 && pr.t < 0.99) s2.splits.push(pr.t);
            }
            for (const pt of [s2.a, s2.b]) {
              const pr = pointToSeg(pt[0], pt[1], s1.a[0], s1.a[1], s1.b[0], s1.b[1]);
              if (pr.d2 < 2.4 * 2.4 && pr.t > 0.01 && pr.t < 0.99) s1.splits.push(pr.t);
            }
          }
        }
      }
    }

    // Snap nodes within 2.5m using spatial grid
    const snapDist = 2.5, snap2 = snapDist * snapDist, nodeCell = 4;
    const nodes = [];
    const nodeGrid = new Map();
    const adj = [];

    function getNode(x, z) {
      const gx = Math.floor(x / nodeCell), gz = Math.floor(z / nodeCell);
      let best = -1, bestD2 = snap2;
      for (let dx = -1; dx <= 1; dx++) {
        for (let dz = -1; dz <= 1; dz++) {
          const bucket = nodeGrid.get((gx + dx) + ',' + (gz + dz));
          if (!bucket) continue;
          for (const id of bucket) {
            const p = nodes[id];
            const d2 = (p[0] - x) ** 2 + (p[1] - z) ** 2;
            if (d2 < bestD2) { bestD2 = d2; best = id; }
          }
        }
      }
      if (best >= 0) return best;
      const id = nodes.length;
      nodes.push([x, z]);
      adj.push([]);
      const k = gx + ',' + gz;
      let bucket = nodeGrid.get(k);
      if (!bucket) { bucket = []; nodeGrid.set(k, bucket); }
      bucket.push(id);
      return id;
    }

    function addEdge(u, v, dist, cost) {
      if (u === v || dist < 0.05) return;
      const existing = adj[u].find(e => e.to === v);
      if (existing) {
        if (cost < existing.cost) { existing.cost = cost; existing.dist = dist; }
        return;
      }
      adj[u].push({ to: v, dist, cost });
      adj[v].push({ to: u, dist, cost });
    }

    for (const seg of rawSegs) {
      seg.splits.sort((p, q) => p - q);
      let prev = null;
      for (const t of seg.splits) {
        const x = seg.a[0] + (seg.b[0] - seg.a[0]) * t;
        const z = seg.a[1] + (seg.b[1] - seg.a[1]) * t;
        const id = getNode(x, z);
        if (prev !== null && prev !== id) {
          const dist = Math.hypot(nodes[id][0] - nodes[prev][0], nodes[id][1] - nodes[prev][1]);
          addEdge(prev, id, dist, dist * seg.weight);
        }
        prev = id;
      }
    }

    // Bridge any tiny remaining sidewalk gaps (< 9m) between disconnected components
    const comp = new Int32Array(nodes.length).fill(-1);
    const compSizes = [];
    let compId = 0;
    for (let i = 0; i < nodes.length; i++) {
      if (comp[i] !== -1) continue;
      const q = [i];
      comp[i] = compId;
      for (let h = 0; h < q.length; h++) {
        for (const e of adj[q[h]]) {
          if (comp[e.to] === -1) { comp[e.to] = compId; q.push(e.to); }
        }
      }
      compSizes.push(q.length);
      compId++;
    }
    const mainComp = compSizes.indexOf(Math.max(...compSizes));
    for (let i = 0; i < nodes.length; i++) {
      if (comp[i] === mainComp) continue;
      const [x, z] = nodes[i];
      let best = -1, bestD2 = 16 * 16;
      for (let j = 0; j < nodes.length; j++) {
        if (comp[j] !== mainComp) continue;
        const d2 = (nodes[j][0] - x) ** 2 + (nodes[j][1] - z) ** 2;
        if (d2 < bestD2) { bestD2 = d2; best = j; }
      }
      if (best >= 0) {
        const d = Math.sqrt(bestD2);
        addEdge(i, best, d, d * 1.25);
      }
    }

    // Recompute final main component after bridges
    const finalMain = new Uint8Array(nodes.length);
    const seedNode = comp.findIndex(c => c === mainComp);
    if (seedNode >= 0) {
      const q = [seedNode];
      finalMain[seedNode] = 1;
      for (let h = 0; h < q.length; h++) {
        for (const e of adj[q[h]]) {
          if (!finalMain[e.to]) { finalMain[e.to] = 1; q.push(e.to); }
        }
      }
    }

    graph = { nodes, adj, finalMain };
    return graph;
  }

  function nearestNode(x, z, requireMain = true) {
    const { nodes, finalMain } = buildGraph();
    let best = -1, bestD2 = Infinity;
    for (let i = 0; i < nodes.length; i++) {
      if (requireMain && !finalMain[i]) continue;
      const d2 = (nodes[i][0] - x) ** 2 + (nodes[i][1] - z) ** 2;
      if (d2 < bestD2) { bestD2 = d2; best = i; }
    }
    return { id: best, dist: Math.sqrt(bestD2) };
  }

  function findRoute(from, to) {
    const { nodes, adj } = buildGraph();
    const start = nearestNode(from[0], from[1], true);
    const goal = nearestNode(to[0], to[1], true);
    if (start.id < 0 || goal.id < 0) return null;

    if (start.id === goal.id) {
      const pts = simplifyPath([from, nodes[start.id], to]);
      const d = Math.hypot(to[0] - from[0], to[1] - from[1]);
      return { points: pts, distance: Math.round(d), minutes: Math.max(1, Math.round(d / 75)) };
    }

    const n = nodes.length;
    const gScore = new Float64Array(n).fill(Infinity);
    const prev = new Int32Array(n).fill(-1);
    const closed = new Uint8Array(n);
    const gx = nodes[goal.id][0], gz = nodes[goal.id][1];
    const heap = new MinHeap();
    gScore[start.id] = 0;
    heap.push([Math.hypot(gx - nodes[start.id][0], gz - nodes[start.id][1]), start.id]);

    let found = false;
    while (heap.size) {
      const [, cur] = heap.pop();
      if (cur === goal.id) { found = true; break; }
      if (closed[cur]) continue;
      closed[cur] = 1;
      const baseG = gScore[cur];
      for (const e of adj[cur]) {
        if (closed[e.to]) continue;
        const ng = baseG + e.cost;
        if (ng < gScore[e.to]) {
          gScore[e.to] = ng;
          prev[e.to] = cur;
          const h = Math.hypot(gx - nodes[e.to][0], gz - nodes[e.to][1]) * 0.95;
          heap.push([ng + h, e.to]);
        }
      }
    }

    if (!found) return null;
    const chain = [];
    for (let u = goal.id; u !== -1; u = prev[u]) chain.push(nodes[u]);
    chain.reverse();

    // Only prepend/append endpoints if they are visibly off the road node
    const raw = [];
    if (Math.hypot(from[0] - chain[0][0], from[1] - chain[0][1]) > 2) raw.push([from[0], from[1]]);
    for (const p of chain) raw.push(p);
    const last = chain[chain.length - 1];
    if (Math.hypot(to[0] - last[0], to[1] - last[1]) > 2) raw.push([to[0], to[1]]);

    const points = simplifyPath(raw);
    let distance = 0;
    for (let i = 1; i < points.length; i++) {
      distance += Math.hypot(points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1]);
    }
    return {
      points,
      distance: Math.round(distance),
      minutes: Math.max(1, Math.round(distance / 75))
    };
  }

  // Pick a clean road-side standing point looking toward (x, z) for any campus building.
  function streetPoseFor(x, z, ring) {
    const inside = (px, pz) => {
      if (!ring) return false;
      let ok = false;
      for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
        const [a, b] = ring[i], [c, d] = ring[j];
        if ((b > pz) !== (d > pz) && px < (c - a) * (pz - b) / (d - b) + a) ok = !ok;
      }
      return ok;
    };
    let best = null, bestD2 = Infinity;
    for (const [line, , , kind] of data.road) {
      if (kind === 'trunk' || kind === 'primary') continue;
      for (let i = 1; i < line.length; i++) {
        const a = line[i - 1], b = line[i];
        const pr = pointToSeg(x, z, a[0], a[1], b[0], b[1]);
        if (pr.d2 < bestD2 && pr.d2 > 4 * 4 && !inside(pr.x, pr.z)) {
          bestD2 = pr.d2;
          best = pr;
        }
      }
    }
    if (!best) return [x, z + 26, 0, 0.14];
    const yaw = Math.atan2(x - best.x, -(z - best.z));
    return [Number(best.x.toFixed(1)), Number(best.z.toFixed(1)), Number(yaw.toFixed(3)), 0.14];
  }

  return { findRoute, streetPoseFor };
}
