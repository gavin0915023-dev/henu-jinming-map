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
const dist=(a,b)=>Math.hypot(b[0]-a[0],b[1]-a[1]);
const WALK_SPEED=75, ARRIVAL_RADIUS=4, OFF_ROUTE_RADIUS=15;
const freeSpace={blocked:()=>false,clear:()=>true,openSegments:(a,b)=>[[a,b]]};

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

function simplifyPath(points,clear) {
  if (points.length <= 2) return points;
  const out = [points[0]];
  for (let i = 1; i < points.length - 1; i++) {
    const a = out[out.length - 1], b = points[i], c = points[i + 1];
    const d1 = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const d2 = Math.hypot(c[0] - b[0], c[1] - b[1]);
    const cos = ((b[0] - a[0]) * (c[0] - b[0]) + (b[1] - a[1]) * (c[1] - b[1])) / (d1 * d2 + 1e-8);
    if ((d1 < .05 || d2 < .05 || cos > 0.9992) && clear(a,c)) continue;
    out.push(b);
  }
  out.push(points[points.length - 1]);
  return out;
}

export function createCampusRouter(data,{space=freeSpace,walkLinks=[]}={}) {
  let graph = null;

  function buildGraph() {
    if (graph) return graph;
    // Collect segments within campus & perimeter box
    const rawSegs = [];
    for (const [line, , , kind] of [...data.road,...walkLinks.map(p=>[p,0,'','footway'])]) {
      const weight = WALK_WEIGHT[kind] ?? 1.15;
      for (let i = 1; i < line.length; i++) {
        const a = line[i - 1], b = line[i];
        // The eastern halves of the Dongyuan lanes are outside the main box.
        const inResidenceCourt = [a,b].every(([x,z]) => x>=500 && x<=780 && z>=245 && z<=425);
        if ((!inResidenceCourt && Math.min(a[0], b[0]) > 650) || Math.max(a[0], b[0]) < -650 ||
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
            if (d2 < bestD2 && space.clear([x,z],p)) { bestD2 = d2; best = id; }
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
        if (cost < existing.cost) adj[v].find(e=>e.to===u).cost=existing.cost=cost;
        return;
      }
      if (!space.clear(nodes[u],nodes[v])) return;
      adj[u].push({ to: v, cost });
      adj[v].push({ to: u, cost });
    }

    for (const seg of rawSegs) {
      seg.splits.sort((p, q) => p - q);
      let prev = null;
      for (const t of seg.splits) {
        const point=[seg.a[0]+(seg.b[0]-seg.a[0])*t,seg.a[1]+(seg.b[1]-seg.a[1])*t];
        if(prev&&dist(prev,point)>.05){
          for(const [a,b] of space.openSegments(prev,point)){
            const u=getNode(...a),v=getNode(...b),length=dist(nodes[u],nodes[v]);
            addEdge(u,v,length,length*seg.weight);
          }
        }
        prev = point;
      }
    }

    // Join nearby path ends only when the gap is open on the ground.
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
        if (d2 < bestD2 && space.clear(nodes[i],nodes[j])) { bestD2 = d2; best = j; }
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

    const edges=[];
    for(let u=0;u<nodes.length;u++)for(const {to:v,cost} of adj[u])if(u<v){
      edges.push({u,v,cost,length:dist(nodes[u],nodes[v])});
    }
    graph = { nodes, adj, finalMain, edges };
    return graph;
  }

  function projections(p){
    const {nodes,edges}=buildGraph();
    return edges.map(e=>{
      const q=pointToSeg(...p,...nodes[e.u],...nodes[e.v]);
      return {e,p:[q.x,q.z],along:q.t,gap:Math.sqrt(q.d2)};
    }).sort((a,b)=>a.gap-b.gap||a.e.cost/a.e.length-b.e.cost/b.e.length);
  }

  function roadsideFor(x,z){
    const {finalMain}=buildGraph(), nearby=projections([x,z]).filter(s=>s.gap<=80);
    return (nearby.find(s=>finalMain[s.e.u])??nearby[0])?.p??null;
  }

  // Attach to the middle of a path, rather than detouring through its nearest
  // intersection. Only short, unobstructed approaches to the nearest lanes
  // are eligible; internal graph edges keep their original sidewalk weights.
  function attachments(p){
    const candidates=[],nodes=new Map();
    for(const s of projections(p)){
      if(s.gap>65||(candidates.length&&s.gap>candidates[0].gap+8))break;
      if(!space.clear(p,s.p))continue;
      candidates.push(s);
      for(const [id,along] of [[s.e.u,s.along],[s.e.v,1-s.along]]){
        const cost=s.gap*1.2+s.e.cost*along;
        if(!nodes.has(id)||cost<nodes.get(id).cost)nodes.set(id,{to:id,cost,via:[s.p]});
      }
    }
    return {candidates,nodes};
  }

  function findRoute(from, to) {
    if(from?.length!==2||to?.length!==2||!from.every(Number.isFinite)||!to.every(Number.isFinite)||
      space.blocked(...from)||space.blocked(...to))return null;
    const result=raw=>{
      const points=simplifyPath(raw,space.clear),distance=Math.round(cumulativeDistances(points).at(-1));
      return {points,distance,minutes:distance?Math.max(1,Math.round(distance/WALK_SPEED)):0};
    };
    if(dist(from,to)<1&&space.clear(from,to))return result([from,to]);
    const {nodes,adj}=buildGraph(),start=nodes.length,goal=start+1;
    const first=attachments(from),last=attachments(to);
    if(!first.nodes.size||!last.nodes.size)return null;
    const goals=new Map(last.candidates.map(s=>[s.e,s]));
    let sameLane=null;
    for(const a of first.candidates){
      const b=goals.get(a.e);if(!b)continue;
      const cost=(a.gap+b.gap)*1.2+a.e.cost*Math.abs(a.along-b.along);
      if(!sameLane||cost<sameLane.cost)sameLane={to:goal,cost,via:[a.p,b.p]};
    }
    const startEdges=[...first.nodes.values()];
    if(sameLane)startEdges.push(sameLane);
    const score=new Float64Array(nodes.length+2).fill(Infinity),prev=[];
    const heap = new MinHeap();
    score[start]=0;
    heap.push([0,start,0]);
    const relax=(u,e)=>{
      const cost=score[u]+e.cost;
      if(cost>=score[e.to])return;
      score[e.to]=cost;
      prev[e.to]={u,via:e.via};
      const h=e.to===goal?0:dist(nodes[e.to],to)*.95;
      heap.push([cost+h,e.to,cost]);
    };
    while (heap.size) {
      const [,u,cost]=heap.pop();
      if(cost!==score[u])continue;
      if(u===goal){
        const route=[to];
        for(let v=goal;v!==start;){
          const e=prev[v];v=e.u;
          if(e.via)for(let i=e.via.length-1;i>=0;i--)route.push(e.via[i]);
          route.push(v===start?from:nodes[v]);
        }
        return result(route.reverse());
      }
      for(const edge of u===start?startEdges:adj[u])relax(u,edge);
      const end=last.nodes.get(u);
      if(end)relax(u,{...end,to:goal});
    }
    return null;
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

  return { findRoute, roadsideFor, streetPoseFor };
}

const routeLengths=new WeakMap();
export function cumulativeDistances(points){
  if(!routeLengths.has(points)){
    const cum=new Float64Array(points.length);
    for(let i=1;i<points.length;i++)cum[i]=cum[i-1]+dist(points[i-1],points[i]);
    routeLengths.set(points,cum);
  }
  return routeLengths.get(points);
}

// Project a walking pose onto a planned polyline to drive live turn guidance and progress.
export function routeProgress(points, x, z, yaw = 0, clear=freeSpace.clear) {
  if (!points || points.length < 2) return null;
  const n = points.length;
  const cum=cumulativeDistances(points);
  const total = cum[n - 1];
  let bestSeg = 0, bestProj = { x: points[0][0], z: points[0][1], t: 0, d2: Infinity };
  for (let i = 0; i < n - 1; i++) {
    const pr = pointToSeg(x, z, points[i][0], points[i][1], points[i + 1][0], points[i + 1][1]);
    if (pr.d2 < bestProj.d2) { bestProj = pr; bestSeg = i; }
  }
  const segLen = cum[bestSeg + 1] - cum[bestSeg];
  const traveled = cum[bestSeg] + bestProj.t * segLen;
  const end = points[n - 1];
  const directEnd = Math.hypot(end[0] - x, end[1] - z);
  const arrived = directEnd<=ARRIVAL_RADIUS&&clear([x,z],end);
  const deviation=Math.sqrt(bestProj.d2),offCourse=deviation>OFF_ROUTE_RADIUS;
  const remaining=arrived?0:Math.max(1,total-traveled,directEnd);

  // Sample a lookahead target ~14m ahead along the route for stable directional arrows.
  const lookDist = Math.min(total, traveled + 14);
  let lx = end[0], lz = end[1];
  for (let i = 0; i < n - 1; i++) {
    if (cum[i + 1] >= lookDist) {
      const len = cum[i + 1] - cum[i];
      const u = len > 1e-6 ? (lookDist - cum[i]) / len : 0;
      lx = points[i][0] + (points[i + 1][0] - points[i][0]) * u;
      lz = points[i][1] + (points[i + 1][1] - points[i][1]) * u;
      break;
    }
  }
  if (Math.hypot(lx - x, lz - z) < 1.5) { lx = end[0]; lz = end[1]; }
  const targetYaw = Math.atan2(lx - x, -(lz - z));
  const rel = Math.atan2(Math.sin(targetYaw - yaw), Math.cos(targetYaw - yaw));
  let hint;
  if (arrived) hint = '已到达附近';
  else if (Math.abs(rel) < 0.38) hint = '沿路直行';
  else if (rel >= 0.38 && rel < 1.35) hint = '向右前方';
  else if (rel >= 1.35 && rel < 2.35) hint = '向右转';
  else if (rel <= -0.38 && rel > -1.35) hint = '向左前方';
  else if (rel <= -1.35 && rel > -2.35) hint = '向左转';
  else hint = '请掉头';

  return {
    remaining: Math.round(remaining),
    minutes: remaining < WALK_SPEED/2 ? 0 : Math.max(1, Math.round(remaining / WALK_SPEED)),
    progress: arrived?1:offCourse||!total?0:Math.min(.99,traveled/total),
    relDeg: Number((rel * 180 / Math.PI).toFixed(1)),
    hint,
    arrived,
    offRoute: Math.round(deviation),
    offCourse,
    traveled,
    total
  };
}
