import * as T from 'three';

// All furniture and markings are merged by material. No per-lamp lights or meshes.
export function addLandscapeDetails(scene, data, { Batch, contains, bounds }) {
  const group = new T.Group();
  group.name = 'Campus landscape details';
  const surfaces = new Batch(), details = new Batch(), metal = new Batch();
  const water = new Batch(), light = new Batch();
  const stats = { courts: 0, goals: 0, hoops: 0, lamps: 0, benches: 0, bridges: 0, shores: 0, tracks: 0 };
  const ink = '#e5e6d1';
  let seed = 197307;
  const random = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296);
  const open = ring => ring.length > 1 && ring[0][0] === ring.at(-1)[0] && ring[0][1] === ring.at(-1)[1] ? ring.slice(0, -1) : ring.slice();
  const closed = ring => [...open(ring), open(ring)[0]];
  const signedArea = ring => open(ring).reduce((sum, p, i, a) => sum + p[0] * a[(i + 1) % a.length][1] - a[(i + 1) % a.length][0] * p[1], 0) / 2;
  const center = ring => {
    const [x, z, u, v] = bounds(ring);
    return [(x + u) / 2, (z + v) / 2];
  };
  const box = (batch, x, y, z, w, h, d, angle, color) => {
    const g = new T.BoxGeometry(w, h, d);
    if (angle) g.rotateY(angle);
    g.translate(x, y, z);
    batch.add(g, color);
  };
  const beam = (batch, a, b, y, width, height, color) => {
    const dx = b[0] - a[0], dz = b[1] - a[1], length = Math.hypot(dx, dz);
    if (length < .05) return;
    box(batch, (a[0] + b[0]) / 2, y, (a[1] + b[1]) / 2, length, height, width, -Math.atan2(dz, dx), color);
  };
  const post = (batch, x, z, bottom, height, radius, color) => {
    const g = new T.CylinderGeometry(radius * .86, radius, height, 6);
    g.translate(x, bottom + height / 2, z);
    batch.add(g, color);
  };
  const arc = (cx, cz, rx, rz, start = 0, end = Math.PI * 2, steps = 40) => Array.from({ length: steps + 1 }, (_, i) => {
    const a = start + (end - start) * i / steps;
    return [cx + Math.cos(a) * rx, cz + Math.sin(a) * rz];
  });
  // Insets preserve the surveyed perimeter, including rotated and uneven shores.
  const inset = (ring, amount) => {
    const a = open(ring), sign = signedArea(a) > 0 ? 1 : -1;
    return a.map((p, i) => {
      const before = a[(i + a.length - 1) % a.length], after = a[(i + 1) % a.length];
      const l1 = Math.hypot(p[0] - before[0], p[1] - before[1]) || 1;
      const l2 = Math.hypot(after[0] - p[0], after[1] - p[1]) || 1;
      const n1 = [sign * (before[1] - p[1]) / l1, sign * (p[0] - before[0]) / l1];
      const n2 = [sign * (p[1] - after[1]) / l2, sign * (after[0] - p[0]) / l2];
      let nx = n1[0] + n2[0], nz = n1[1] + n2[1];
      const len = Math.hypot(nx, nz) || 1;
      nx /= len; nz /= len;
      const m = Math.min(Math.abs(amount) * 3, Math.abs(amount / Math.max(.35, nx * n2[0] + nz * n2[1]))) * Math.sign(amount);
      return [p[0] + nx * m, p[1] + nz * m];
    });
  };
  const clippedLine = (points, width, y, color, allowed) => {
    let run = [];
    const flush = () => { if (run.length > 1) details.ribbon(run, width, y, color); run = []; };
    for (let i = 1; i < points.length; i++) {
      const a = points[i - 1], b = points[i], n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1])));
      for (let j = 0; j <= n; j++) {
        const p = [a[0] + (b[0] - a[0]) * j / n, a[1] + (b[1] - a[1]) * j / n];
        if (allowed(p[0], p[1])) run.push(p); else flush();
      }
    }
    flush();
  };

  function frame(ring) {
    const p = open(ring);
    let edge = 0, shortest = Infinity;
    p.forEach((v, i) => {
      const q = p[(i + 1) % p.length], length = Math.hypot(q[0] - v[0], q[1] - v[1]);
      if (length > 1 && length < shortest) { shortest = length; edge = i; }
    });
    const a = p[edge], b = p[(edge + 1) % p.length];
    const u = [(b[0] - a[0]) / shortest, (b[1] - a[1]) / shortest], v = [-u[1], u[0]];
    const pu = p.map(q => q[0] * u[0] + q[1] * u[1]), pv = p.map(q => q[0] * v[0] + q[1] * v[1]);
    const x = (Math.min(...pu) + Math.max(...pu)) / 2, z = (Math.min(...pv) + Math.max(...pv)) / 2;
    const c = [u[0] * x + v[0] * z, u[1] * x + v[1] * z];
    return { c, u, v, width: Math.max(...pu) - Math.min(...pu), length: Math.max(...pv) - Math.min(...pv), angle: -Math.atan2(u[1], u[0]) };
  }
  const point = (f, x, z) => [f.c[0] + f.u[0] * x + f.v[0] * z, f.c[1] + f.u[1] * x + f.v[1] * z];
  const rectangle = (f, l, t, r, b) => [point(f, l, t), point(f, r, t), point(f, r, b), point(f, l, b), point(f, l, t)];
  const line = (f, points, width = .12, y = .705, color = ink) => details.ribbon(points.map(p => point(f, ...p)), width, y, color);
  const ringLine = (f, x, z, rx, rz = rx, start = 0, end = Math.PI * 2, width = .12) => line(f, arc(x, z, rx, rz, start, end), width);
  const localBox = (batch, f, x, y, z, w, h, d, color) => {
    const p = point(f, x, z);
    box(batch, p[0], y, p[1], w, h, d, f.angle, color);
  };
  const localPost = (f, x, z, h, r, color) => {
    const p = point(f, x, z);
    post(metal, p[0], p[1], .67, h, r, color);
  };

  const unknownTracks = data.sport.filter(([p, kind, sport]) => kind === 'pitch' && !sport && p.length > 20);
  const tracks = unknownTracks.filter(([p]) => !unknownTracks.some(([q]) => {
    const a = center(p), b = center(q);
    return Math.hypot(a[0] - b[0], a[1] - b[1]) < 20 && Math.abs(signedArea(q)) > Math.abs(signedArea(p)) * 1.1;
  })).map(([p]) => {
    const c = center(p);
    const inner = unknownTracks.find(([q]) => q !== p && Math.hypot(...center(q).map((v, i) => v - c[i])) < 20 && Math.abs(signedArea(q)) < Math.abs(signedArea(p)) * .85)?.[0] || inset(p, 6.8);
    return { outer: p, inner, c };
  });

  // Stadium apron, track, then infield: the running lanes never cover the turf.
  for (const [p, kind] of data.sport) if (kind === 'sports_centre') surfaces.surface(p, .24, '#72806c');
  for (const track of tracks) {
    stats.tracks++;
    surfaces.surface(track.outer, .50, '#a96754');
    surfaces.surface(track.inner, .57, '#66875c');
    const [x, z, u, v] = bounds(track.outer);
    const count = u - x > 90 ? 7 : 5;
    for (let k = 0; k <= count; k++) {
      const path = inset(track.outer, .55 + k * 1.22);
      clippedLine(closed(path), .13, .69, '#edd9c2', (a, b) => contains(a, b, track.outer) && !contains(a, b, track.inner));
    }
    // A short finish line stays within the straight part of the existing track.
    const path = [[x + .8, (z + v) / 2 + 20], [x + Math.min(11, (u - x) * .15), (z + v) / 2 + 20]];
    clippedLine(path, .20, .695, '#f0e2cb', (a, b) => contains(a, b, track.outer) && !contains(a, b, track.inner));
  }

  function net(f, width, height, bottom = .25) {
    const span = width + .6;
    localPost(f, -span / 2, 0, height + .12, .075, '#69766f');
    localPost(f, span / 2, 0, height + .12, .075, '#69766f');
    localBox(metal, f, 0, .67 + height, 0, span, .07, .045, '#e2ddc5');
    for (let y = bottom; y < height; y += .22) localBox(metal, f, 0, .67 + y, 0, span, .018, .026, '#526963');
    for (let x = -span / 2; x <= span / 2; x += .45) localBox(metal, f, x, .67 + (height + bottom) / 2, 0, .018, height - bottom, .026, '#526963');
  }
  function hoop(f, sign, halfLength) {
    const z = sign * (halfLength + .8), board = sign * (halfLength - .15), rim = sign * (halfLength - .75);
    localPost(f, 0, z, 3.8, .115, '#68766d');
    const a = point(f, 0, z), b = point(f, 0, board);
    beam(metal, a, b, 3.93, .11, .11, '#718077');
    localBox(details, f, 0, 4.0, board, 1.8, 1.05, .10, '#d8ded3');
    localBox(metal, f, 0, 3.74, board - sign * .064, .62, .44, .035, '#81948a');
    const p = point(f, 0, rim), torus = new T.TorusGeometry(.23, .038, 4, 14);
    torus.rotateX(Math.PI / 2); torus.translate(p[0], 3.72, p[1]);
    metal.add(torus, '#ba7650');
    for (let i = 0; i < 6; i++) {
      const a = i * Math.PI / 3;
      post(metal, p[0] + .18 * Math.cos(a), p[1] + .18 * Math.sin(a), 3.34, .36, .012, '#e5dfc9');
    }
    stats.hoops++;
  }
  function goal(f, sign, halfLength, width) {
    const mouth = Math.min(7.32, width * .18), height = Math.min(2.44, mouth * .34), z = sign * halfLength;
    localPost(f, -mouth / 2, z, height, .07, '#e3e1d2');
    localPost(f, mouth / 2, z, height, .07, '#e3e1d2');
    localBox(metal, f, 0, .67 + height, z, mouth, .12, .12, '#e3e1d2');
    const back = z + sign * 1.7;
    localPost(f, -mouth / 2, back, height * .65, .045, '#bec7b6');
    localPost(f, mouth / 2, back, height * .65, .045, '#bec7b6');
    localBox(metal, f, 0, .67 + height * .65, back, mouth, .055, .055, '#b8c6b4');
    for (let x = -mouth / 2; x <= mouth / 2; x += .55) localBox(metal, f, x, .67 + height * .32, back, .025, height * .65, .025, '#c8d0bd');
    for (let y = .4; y < height * .65; y += .4) localBox(metal, f, 0, .67 + y, back, mouth, .025, .025, '#c8d0bd');
    for (const side of [-1, 1]) beam(metal, point(f, side * mouth / 2, z), point(f, side * mouth / 2, back), .83, .045, .045, '#c5cdbb');
    stats.goals++;
  }
  function soccer(f, track) {
    let width = Math.min(68, f.width - 5), length = Math.min(105, f.length - 6);
    if (track) {
      const [x, , u] = bounds(track.outer);
      width = Math.min(width, (u - x) < 90 ? 50 : 62);
      length = Math.min(length, (u - x) < 90 ? 96 : 100);
    }
    const l = -width / 2, r = width / 2, t = -length / 2, b = length / 2;
    // Alternating mowing bands are clipped to the infield when a running track exists.
    for (let i = 0; i < 10; i++) {
      const stripe = rectangle(f, l - 1, t + length * i / 10, r + 1, t + length * (i + 1) / 10);
      if (!track || stripe.every(p => contains(p[0], p[1], track.inner))) surfaces.surface(stripe, .63, i % 2 ? '#668c5c' : '#719965');
    }
    line(f, [[l, t], [r, t], [r, b], [l, b], [l, t]], .18);
    line(f, [[l, 0], [r, 0]], .18);
    ringLine(f, 0, 0, Math.min(9.15, width * .16), undefined, 0, Math.PI * 2, .16);
    const penaltyWidth = width * .60, penaltyDepth = Math.min(16.5, length * .16), goalWidth = width * .27;
    for (const sign of [-1, 1]) {
      const z = sign * length / 2, pz = z - sign * penaltyDepth;
      line(f, [[-penaltyWidth / 2, z], [-penaltyWidth / 2, pz], [penaltyWidth / 2, pz], [penaltyWidth / 2, z]], .16);
      line(f, [[-goalWidth / 2, z], [-goalWidth / 2, z - sign * 5.5], [goalWidth / 2, z - sign * 5.5], [goalWidth / 2, z]], .16);
      ringLine(f, 0, z - sign * Math.min(11, length * .11), .22);
      goal(f, sign, length / 2, width);
    }
    ringLine(f, 0, 0, .22);
    stats.courts++;
  }
  function court(f, sport) {
    if (sport === 'basketball' || sport === 'multi') {
      const w = Math.min(15, f.width - 2.3), len = Math.min(28, f.length - 3.0), l = -w / 2, r = w / 2, t = -len / 2, b = len / 2;
      surfaces.surface(rectangle(f, l - .8, t - .8, r + .8, b + .8), .63, '#548183');
      for (const sign of [-1, 1]) {
        const z = sign * len / 2, end = z - sign * Math.min(5.8, len * .21);
        surfaces.surface(rectangle(f, -2.45, Math.min(z, end), 2.45, Math.max(z, end)), .65, '#85a29a');
        line(f, [[-2.45, z], [-2.45, end], [2.45, end], [2.45, z]]);
        ringLine(f, 0, end, 1.8, 1.8, sign < 0 ? 0 : Math.PI, sign < 0 ? Math.PI : Math.PI * 2);
        const basket = z - sign * 1.3;
        ringLine(f, 0, basket, Math.min(6.25, w * .41), Math.min(6.25, w * .41), sign < 0 ? 0 : Math.PI, sign < 0 ? Math.PI : Math.PI * 2);
        hoop(f, sign, len / 2);
      }
      line(f, [[l, t], [r, t], [r, b], [l, b], [l, t]]);
      line(f, [[l, 0], [r, 0]]);
      ringLine(f, 0, 0, 1.8);
    } else if (sport === 'tennis') {
      const w = Math.min(10.97, f.width - 2), len = Math.min(23.77, f.length - 3.0), l = -w / 2, r = w / 2, t = -len / 2, b = len / 2;
      surfaces.surface(rectangle(f, l - 1.2, t - 1.7, r + 1.2, b + 1.7), .63, '#4e7c84');
      line(f, [[l, t], [r, t], [r, b], [l, b], [l, t]]);
      const singles = w * .75 / 2, service = Math.min(6.4, len * .27);
      line(f, [[-singles, t], [-singles, b]]); line(f, [[singles, t], [singles, b]]);
      line(f, [[-singles, -service], [singles, -service]]); line(f, [[-singles, service], [singles, service]]);
      line(f, [[0, -service], [0, service]]);
      net(f, w, 1.07, .22);
    } else {
      const badminton = sport === 'badminton';
      const w = Math.min(badminton ? 6.1 : 9, f.width - 1.8), len = Math.min(badminton ? 13.4 : 18, f.length - 2.4);
      const l = -w / 2, r = w / 2, t = -len / 2, b = len / 2;
      surfaces.surface(rectangle(f, l - .6, t - .6, r + .6, b + .6), .63, badminton ? '#608676' : '#b58a67');
      line(f, [[l, t], [r, t], [r, b], [l, b], [l, t]]);
      line(f, [[l, 0], [r, 0]]);
      if (badminton) {
        for (const z of [-1.98, 1.98]) line(f, [[l, z], [r, z]]);
        line(f, [[0, t], [0, -1.98]]); line(f, [[0, b], [0, 1.98]]);
      } else for (const z of [-3, 3]) line(f, [[l, z], [r, z]]);
      net(f, w, badminton ? 1.55 : 2.43, badminton ? .8 : 1.5);
    }
    stats.courts++;
  }

  for (const [p, kind, sport] of data.sport) {
    if (kind === 'sports_centre' || unknownTracks.some(([q]) => p === q)) continue;
    if (open(p).length !== 4 || !sport) {
      surfaces.surface(p, .60, '#7d9277');
      continue;
    }
    const f = frame(p);
    if (sport.includes('soccer') || sport.includes('football')) {
      const track = tracks.find(t => Math.hypot(t.c[0] - f.c[0], t.c[1] - f.c[1]) < 35);
      // The surveyed southern field reaches into its track: leave the actual track visible.
      if (track) surfaces.surface(track.inner, .615, '#66895a');
      else surfaces.surface(p, .60, '#66895a');
      soccer(f, track);
      continue;
    }
    surfaces.surface(p, .60, sport === 'tennis' ? '#6b9176' : sport === 'basketball' ? '#b1846d' : '#7d9277');
    const cellWidth = sport === 'basketball' ? 18 : sport === 'volleyball' ? 12 : sport === 'badminton' ? 8 : 99;
    const cellLength = sport === 'basketball' ? 31 : sport === 'volleyball' ? 22 : sport === 'badminton' ? 16 : 99;
    const columns = Math.max(1, Math.floor(f.width / cellWidth)), rows = Math.max(1, Math.floor(f.length / cellLength));
    for (let x = 0; x < columns; x++) for (let z = 0; z < rows; z++) {
      const c = point(f, (x + .5) * f.width / columns - f.width / 2, (z + .5) * f.length / rows - f.length / 2);
      court({ ...f, c, width: f.width / columns, length: f.length / rows }, sport);
    }
  }

  const blockers = [...data.building.map(([p]) => p), ...data.water, ...data.sport.map(([p]) => p)].map(p => [bounds(p), p]);
  const clear = (x, z, margin = .7) => contains(x, z, data.boundary) && !blockers.some(([[a, b, c, d], p]) =>
    x > a - margin && x < c + margin && z > b - margin && z < d + margin &&
    [[x, z], [x - margin, z], [x + margin, z], [x, z - margin], [x, z + margin]].some(q => contains(q[0], q[1], p)));
  const placed = [];
  function bench(x, z, angle) {
    const f = { c: [x, z], u: [Math.cos(-angle), Math.sin(-angle)], v: [-Math.sin(-angle), Math.cos(-angle)], angle };
    for (const x of [-.77, .77]) {
      localBox(metal, f, x, .43, 0, .10, .65, .62, '#57675c');
      localBox(metal, f, x, .99, .29, .09, .8, .09, '#57675c');
    }
    for (let i = 0; i < 4; i++) localBox(details, f, 0, .79, -.25 + i * .16, 2.12, .09, .12, '#a58c63');
    for (let i = 0; i < 3; i++) localBox(details, f, 0, 1.04 + i * .14, .31, 2.12, .10, .09, '#a58c63');
    stats.benches++;
  }
  function lamp(x, z, nx, nz) {
    post(metal, x, z, .77, 4.9, .115, '#61716a');
    post(metal, x, z, .77, .32, .22, '#7b8274');
    beam(metal, [x, z], [x - nx * 1.1, z - nz * 1.1], 5.52, .095, .095, '#61716a');
    const angle = -Math.atan2(nz, nx);
    box(metal, x - nx * 1.05, 5.49, z - nz * 1.05, .88, .15, .40, angle, '#556b61');
    box(light, x - nx * 1.05, 5.39, z - nz * 1.05, .68, .04, .28, angle, '#f0dcad');
    stats.lamps++;
  }
  for (const [p, width, , kind, bridge] of data.road) {
    const insideRoad = ['service', 'unclassified', 'pedestrian'].includes(kind);
    for (let j = 1; j < p.length; j++) {
      const a = p[j - 1], b = p[j], dx = b[0] - a[0], dz = b[1] - a[1], length = Math.hypot(dx, dz);
      if (length < 3) continue;
      const nx = -dz / length, nz = dx / length;
      const mid = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
      if (insideRoad && !bridge && contains(...mid, data.boundary)) {
        for (const side of [-1, 1]) {
          const offset = side * (width / 2 + .22);
          beam(details, [a[0] + nx * offset, a[1] + nz * offset], [b[0] + nx * offset, b[1] + nz * offset], .80, .30, .18, '#c4c2aa');
        }
        // Mark only wide campus carriageways; narrow service lanes stay unmarked.
        if (width >= 7) for (let s = 6; s < length - 6; s += 12) {
          details.ribbon([[a[0] + dx * s / length, a[1] + dz * s / length], [a[0] + dx * Math.min(s + 4, length) / length, a[1] + dz * Math.min(s + 4, length) / length]], .14, .82, '#d9d3aa');
        }
      }
      if (bridge && contains(...mid, data.boundary)) {
        stats.bridges++;
        for (const side of [-1, 1]) {
          const offset = side * (width / 2 - .12), aa = [a[0] + nx * offset, a[1] + nz * offset], bb = [b[0] + nx * offset, b[1] + nz * offset];
          for (const y of [1.58, 2.16]) beam(metal, aa, bb, y, .09, .09, '#b1b6a5');
          for (let s = 0; s <= length; s += 2.4) post(metal, aa[0] + dx * s / length, aa[1] + dz * s / length, 1.03, 1.18, .075, '#aab3a1');
        }
      }
      if (!insideRoad || bridge || length < 28 || width < 4 || stats.lamps >= 135) continue;
      for (let s = 16; s < length - 8 && stats.lamps < 135; s += 47) {
        const sign = stats.lamps % 2 ? 1 : -1, offset = sign * (width / 2 + 1.6);
        const x = a[0] + dx * s / length + nx * offset, z = a[1] + dz * s / length + nz * offset;
        if (!clear(x, z, .9) || placed.some(q => Math.hypot(q[0] - x, q[1] - z) < 27)) continue;
        placed.push([x, z]);
        lamp(x, z, nx * sign, nz * sign);
        const bx = x + dx / length * 4.5 + nx * sign * .5, bz = z + dz / length * 4.5 + nz * sign * .5;
        if (stats.lamps % 3 === 0 && clear(bx, bz, 1.3)) bench(bx, bz, -Math.atan2(dz, dx));
      }
    }
  }

  // Subtle stone joints and reeds make the water edge readable at pedestrian height.
  for (const p of data.water) {
    water.surface(p, .40, '#4b8987');
    details.ribbon(closed(p), 2.2, .41, '#9ca68b');
    details.ribbon(closed(p), .65, .48, '#c6c7ad');
    stats.shores++;
    const ring = open(p), sign = signedArea(p) > 0 ? 1 : -1;
    for (let i = 0; i < ring.length; i++) {
      const a = ring[i], b = ring[(i + 1) % ring.length], dx = b[0] - a[0], dz = b[1] - a[1], length = Math.hypot(dx, dz);
      if (length < .1) continue;
      const nx = sign * dz / length, nz = sign * -dx / length;
      for (let s = 2; s < length; s += 7.5) {
        const x = a[0] + dx * s / length, z = a[1] + dz * s / length;
        beam(details, [x - nx * .42, z - nz * .42], [x + nx * .42, z + nz * .42], .50, .07, .055, '#87917c');
        if (random() > .38 || !clear(x + nx * 1.1, z + nz * 1.1, .2)) continue;
        for (let k = 0; k < 4; k++) {
          const rx = x + nx * (1.0 + random()) + (random() - .5), rz = z + nz * (1.0 + random()) + (random() - .5), height = .6 + random() * .7;
          const g = new T.BufferGeometry();
          g.setAttribute('position', new T.Float32BufferAttribute([rx - .10, .24, rz, rx + .10, .24, rz, rx + nx * .20, height, rz + nz * .20], 3));
          g.computeVertexNormals(); details.add(g, k % 2 ? '#7c8d54' : '#8c9a5b');
        }
      }
    }
    // Broken highlights are clipped against the real shoreline, including narrow channels.
    const [x, z, u, v] = bounds(p);
    for (let zz = z + 5; zz < v; zz += 7.5) {
      for (let xx = x + random() * 7; xx < u; xx += 19) {
        const a = [xx, zz], b = [xx + 4 + random() * 7, zz + .35];
        if ([a, b, [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]].every(q => contains(q[0], q[1], p))) details.ribbon([a, b], .10, .415, '#72aaa1');
      }
    }
  }

  // Retain the existing plaza shapes; add paving joints to circular gathering spaces.
  for (const p of data.plaza) {
    const [x, z, u, v] = bounds(p), width = u - x, height = v - z;
    if (p.length < 20 || width / height < .8 || width / height > 1.2) continue;
    const c = center(p), radius = Math.min(width, height) * .47;
    for (let r = 6; r < radius; r += 8) clippedLine(arc(c[0], c[1], r, r), .15, .49, '#b2b3a0', (a, b) => contains(a, b, p));
    for (let a = 0; a < Math.PI * 2; a += Math.PI / 6) clippedLine([[c[0] + Math.cos(a) * 6, c[1] + Math.sin(a) * 6], [c[0] + Math.cos(a) * radius, c[1] + Math.sin(a) * radius]], .13, .49, '#b2b3a0', (a, b) => contains(a, b, p));
  }

  const add = (batch, name, options) => {
    if (!batch.positions.length) return;
    const mesh = batch.mesh(options);
    mesh.name = name; mesh.receiveShadow = true;
    mesh.castShadow = name === 'Campus furniture and sport equipment';
    group.add(mesh);
  };
  add(surfaces, 'Sport surfaces', { roughness: .92 });
  add(details, 'Paving and markings', { roughness: .88 });
  add(metal, 'Campus furniture and sport equipment', { roughness: .68, metalness: .14 });
  add(water, 'Lake water', { roughness: .27, metalness: .18 });
  add(light, 'Lamp diffusers', { emissive: '#f4dab0', emissiveIntensity: .25, roughness: .60 });
  scene.add(group);
  return { group, stats };
}
