// Lightweight 2D campus radar minimap for first-person walking mode.
// Pre-renders campus geometry once onto an offscreen canvas; click anywhere to teleport.

export function createMinimap(container, campus, onTeleport) {
  const canvas = document.createElement('canvas');
  canvas.className = 'minimap-canvas';
  canvas.setAttribute('aria-label', '校园漫游小地图，点击可快速跳转位置');
  container.replaceChildren(canvas);
  const ctx = canvas.getContext('2d');

  // Compute campus bounding square from boundary ring
  let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
  for (const [x, z] of campus.boundary) {
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (z < minZ) minZ = z;
    if (z > maxZ) maxZ = z;
  }
  const pad = 42;
  minX -= pad; maxX += pad; minZ -= pad; maxZ += pad;
  const span = Math.max(maxX - minX, maxZ - minZ);
  const cx = (minX + maxX) / 2, cz = (minZ + maxZ) / 2;
  const originX = cx - span / 2, originZ = cz - span / 2;

  const baseSize = 320;
  const baseLight = document.createElement('canvas');
  const baseDark = document.createElement('canvas');
  baseLight.width = baseLight.height = baseDark.width = baseDark.height = baseSize;

  const toBase = (x, z) => [(x - originX) / span * baseSize, (z - originZ) / span * baseSize];

  function paintBase(target, dark) {
    const c = target.getContext('2d');
    c.fillStyle = dark ? '#16202b' : '#e8eee4';
    c.fillRect(0, 0, baseSize, baseSize);

    const fillPoly = (ring, fill, stroke = null, lw = 1) => {
      if (!ring.length) return;
      c.beginPath();
      for (let i = 0; i < ring.length; i++) {
        const [px, py] = toBase(ring[i][0], ring[i][1]);
        if (i === 0) c.moveTo(px, py); else c.lineTo(px, py);
      }
      c.closePath();
      c.fillStyle = fill;
      c.fill();
      if (stroke) { c.strokeStyle = stroke; c.lineWidth = lw; c.stroke(); }
    };

    fillPoly(campus.boundary, dark ? '#1f302c' : '#d5e4cc', dark ? '#3c5c52' : '#96b18f', 1.5);
    for (const [ring] of campus.green) fillPoly(ring, dark ? '#243a31' : '#c6dcba');
    for (const ring of campus.plaza) fillPoly(ring, dark ? '#323c42' : '#ded8c8');
    for (const [ring] of campus.sport) fillPoly(ring, dark ? '#2a413b' : '#c5d7b3');
    for (const ring of campus.water) fillPoly(ring, dark ? '#255b6c' : '#85bcc4');

    c.lineCap = 'round';
    c.lineJoin = 'round';
    for (const [line, width] of campus.road) {
      if (line.length < 2) continue;
      c.beginPath();
      for (let i = 0; i < line.length; i++) {
        const [px, py] = toBase(line[i][0], line[i][1]);
        if (i === 0) c.moveTo(px, py); else c.lineTo(px, py);
      }
      c.strokeStyle = dark ? (width > 8 ? '#4a5c6c' : '#3a4b5a') : (width > 8 ? '#fcfaf0' : '#f4f2e8');
      c.lineWidth = Math.max(1, width * baseSize / span * 0.9);
      c.stroke();
    }

    for (const [ring, , type, , , inside] of campus.building) {
      if (!inside) continue;
      fillPoly(
        ring,
        type === 'library'
          ? (dark ? '#7a6d56' : '#bfa882')
          : (dark ? '#435361' : '#b7b3a4')
      );
    }
  }

  paintBase(baseLight, false);
  paintBase(baseDark, true);

  let darkTheme = false;
  let routePoints = null;
  let lastPose = null;
  let cssSize = 160;

  function syncSize() {
    const rect = container.getBoundingClientRect();
    const w = Math.max(88, Math.round(rect.width || cssSize));
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const target = Math.round(w * dpr);
    if (canvas.width !== target || canvas.height !== target) {
      canvas.width = canvas.height = target;
      cssSize = w;
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function toPx(x, z) {
    return [(x - originX) / span * cssSize, (z - originZ) / span * cssSize];
  }

  function draw() {
    if (container.hidden) return;
    syncSize();
    ctx.clearRect(0, 0, cssSize, cssSize);
    ctx.drawImage(darkTheme ? baseDark : baseLight, 0, 0, cssSize, cssSize);

    if (routePoints && routePoints.length > 1) {
      ctx.save();
      ctx.beginPath();
      for (let i = 0; i < routePoints.length; i++) {
        const [px, py] = toPx(routePoints[i][0], routePoints[i][1]);
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.strokeStyle = darkTheme ? '#4fe3b5' : '#1b8a64';
      ctx.lineWidth = 2.6;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.stroke();

      const end = routePoints[routePoints.length - 1];
      const [ex, ey] = toPx(end[0], end[1]);
      ctx.beginPath();
      ctx.arc(ex, ey, 3.6, 0, Math.PI * 2);
      ctx.fillStyle = '#e05745';
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1.2;
      ctx.stroke();
      ctx.restore();
    }

    if (lastPose) {
      const [px, py] = toPx(lastPose.x, lastPose.z);
      // yaw = 0 faces north (-Z = -Y on canvas), positive yaw rotates clockwise (towards +X)
      const dirAngle = lastPose.yaw - Math.PI / 2;
      ctx.save();
      ctx.translate(px, py);
      // Translucent field-of-view wedge
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, 22, dirAngle - 0.56, dirAngle + 0.56);
      ctx.closePath();
      const grad = ctx.createRadialGradient(0, 0, 2, 0, 0, 22);
      grad.addColorStop(0, darkTheme ? 'rgba(94, 234, 188, 0.55)' : 'rgba(36, 122, 88, 0.45)');
      grad.addColorStop(1, darkTheme ? 'rgba(94, 234, 188, 0.0)' : 'rgba(36, 122, 88, 0.0)');
      ctx.fillStyle = grad;
      ctx.fill();

      // Walker marker
      ctx.beginPath();
      ctx.arc(0, 0, 4.2, 0, Math.PI * 2);
      ctx.fillStyle = darkTheme ? '#5eeabc' : '#244b3e';
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.8;
      ctx.stroke();
      ctx.restore();
    }
  }

  canvas.addEventListener('click', e => {
    const rect = canvas.getBoundingClientRect();
    if (!rect.width) return;
    const u = (e.clientX - rect.left) / rect.width;
    const v = (e.clientY - rect.top) / rect.height;
    const wx = originX + u * span;
    const wz = originZ + v * span;
    onTeleport?.(wx, wz);
  });

  return {
    update(pose) {
      lastPose = pose;
      draw();
    },
    setRoute(points) {
      routePoints = points;
      draw();
    },
    setDark(isDark) {
      darkTheme = Boolean(isDark);
      draw();
    },
    redraw: draw
  };
}
