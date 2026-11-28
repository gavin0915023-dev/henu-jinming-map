import * as T from './assets/three.module.min.js';

// Warm, relaxed 1024x1024 anime Elysia face texture (gentle half-lidded smile
// inspired by Reference 2 — never staring or ghostly pale) + 256x256 Face SDF.
const S = 1024;
const toX = x => S * (.5 + x / .26);
const toY = y => S * (1 - (y - .010) / .26);
const px = m => S * (m / .26);

function drawEye(ctx, side, closed = false) {
  const cx = toX(side * .044);
  const cy = toY(.119);
  const ew = px(.0285);
  const eh = px(.0165); // Gentle relaxed almond height (no wide-open staring eyes!)

  ctx.save();
  ctx.translate(cx, cy);
  if (side < 0) ctx.scale(-1, 1);

  if (closed) {
    ctx.strokeStyle = '#6c3e5a';
    ctx.lineWidth = 9.0;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-ew * .86, eh * .22);
    ctx.quadraticCurveTo(0, -eh * .26, ew * .98, eh * .12);
    ctx.stroke();

    ctx.strokeStyle = '#c5779d';
    ctx.lineWidth = 6.4;
    ctx.beginPath();
    ctx.moveTo(-ew * .76, -eh * 1.62);
    ctx.quadraticCurveTo(ew * .06, -eh * 1.92, ew * .82, -eh * 1.56);
    ctx.stroke();
    ctx.restore();
    return;
  }

  // Relaxed gentle half-lidded Elysia almond (Ref 2): soft gently arching upper lid,
  // slightly smiling lower lid curve so eyes look warm & friendly.
  const topY = -eh * .96;
  const botY = eh * .86;

  // Soft warm rosy-peach eyeshadow around upper lid
  const sock = ctx.createRadialGradient(0, -eh * .45, eh * .2, 0, -eh * .25, ew * 1.35);
  sock.addColorStop(0, 'rgba(232,160,174,0.38)');
  sock.addColorStop(1, 'rgba(232,160,174,0)');
  ctx.fillStyle = sock;
  ctx.beginPath();
  ctx.ellipse(0, -eh * .22, ew * 1.28, eh * 1.25, 0, 0, Math.PI * 2);
  ctx.fill();

  function eyePath() {
    ctx.beginPath();
    ctx.moveTo(-ew * .92, eh * .26);
    ctx.bezierCurveTo(-ew * .52, topY * 1.15, ew * .48, topY * 1.16, ew * .98, -eh * .04);
    ctx.bezierCurveTo(ew * .62, botY * .96, -ew * .38, botY * .92, -ew * .92, eh * .26);
    ctx.closePath();
  }

  ctx.save();
  eyePath();
  ctx.clip();

  // Warm natural sclera (slightly soft cream-lavender top shade — never blinding neon white)
  const sc = ctx.createLinearGradient(0, topY, 0, botY);
  sc.addColorStop(0, '#d8c5dc');
  sc.addColorStop(.32, '#f5ecf5');
  sc.addColorStop(1, '#fcf5f8');
  ctx.fillStyle = sc;
  ctx.fillRect(-ew * 1.2, -eh * 1.5, ew * 2.4, eh * 3.0);

  // Warm soft amethyst-pink Elysia iris gently tucked under upper eyelid
  const ix = -ew * .02, iy = -eh * .04, irx = ew * .52, iry = eh * .96;

  ctx.fillStyle = '#623b78';
  ctx.beginPath();
  ctx.ellipse(ix, iy, irx * 1.04, iry * 1.04, 0, 0, Math.PI * 2);
  ctx.fill();

  const ig = ctx.createLinearGradient(ix, iy - iry, ix, iy + iry);
  ig.addColorStop(0.00, '#5c3673');
  ig.addColorStop(0.28, '#8d5db0');
  ig.addColorStop(0.58, '#cc90dc');
  ig.addColorStop(0.84, '#f7bce0');
  ig.addColorStop(1.00, '#e3f1fc');
  ctx.fillStyle = ig;
  ctx.beginPath();
  ctx.ellipse(ix, iy, irx * .94, iry * .94, 0, 0, Math.PI * 2);
  ctx.fill();

  // Soft lower rosy-lavender luminous crescent
  const glow = ctx.createRadialGradient(ix, iy + iry * .44, irx * .06, ix, iy + iry * .36, irx * .82);
  glow.addColorStop(0, 'rgba(240,248,255,0.88)');
  glow.addColorStop(.55, 'rgba(252,198,232,0.62)');
  glow.addColorStop(1, 'rgba(252,198,232,0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.ellipse(ix, iy + iry * .22, irx * .82, iry * .68, 0, 0, Math.PI * 2);
  ctx.fill();

  // Soft muted violet pupil (not harsh staring black!)
  const pg = ctx.createRadialGradient(ix, iy - iry * .04, irx * .08, ix, iy - iry * .02, irx * .40);
  pg.addColorStop(0, '#4a2862');
  pg.addColorStop(.68, '#724692');
  pg.addColorStop(1, 'rgba(130,84,166,0)');
  ctx.fillStyle = pg;
  ctx.beginPath();
  ctx.ellipse(ix, iy - iry * .02, irx * .40, iry * .42, 0, 0, Math.PI * 2);
  ctx.fill();

  // Soft upper-eyelid shadow creating gentle relaxed gaze
  const lidSh = ctx.createLinearGradient(0, topY * 1.15, 0, topY * .05);
  lidSh.addColorStop(0, 'rgba(78,44,92,0.52)');
  lidSh.addColorStop(1, 'rgba(78,44,92,0)');
  ctx.fillStyle = lidSh;
  ctx.fillRect(-ew * 1.2, topY * 1.3, ew * 2.4, eh * 1.3);

  // Subtle warm catchlights
  ctx.fillStyle = 'rgba(255,252,255,0.94)';
  ctx.beginPath();
  ctx.ellipse(ix - irx * .42, iy - iry * .36, irx * .24, iry * .21, -.25, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = 'rgba(255,245,252,0.85)';
  ctx.beginPath();
  ctx.ellipse(ix + irx * .34, iy + iry * .38, irx * .15, iry * .13, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();

  // Soft plum-brown arched upper eyelashes (softer & warmer, never harsh black ink)
  const lashGrad = ctx.createLinearGradient(-ew, topY, ew, topY);
  lashGrad.addColorStop(0, '#6e405b');
  lashGrad.addColorStop(.55, '#55304a');
  lashGrad.addColorStop(1, '#8c4c72');
  ctx.fillStyle = lashGrad;
  ctx.beginPath();
  ctx.moveTo(-ew * .98, eh * .26);
  ctx.bezierCurveTo(-ew * .56, topY * 1.36, ew * .46, topY * 1.38, ew * 1.10, -eh * .20);
  ctx.bezierCurveTo(ew * 1.04, -eh * .02, ew * 1.00, eh * .04, ew * .95, -.02 * eh);
  ctx.bezierCurveTo(ew * .46, topY * 1.02, -ew * .50, topY * 1.04, -ew * .92, eh * .28);
  ctx.closePath();
  ctx.fill();

  // Gentle rose outer lash highlight
  ctx.strokeStyle = '#c4729e';
  ctx.lineWidth = 3.5;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(ew * .64, topY * .78);
  ctx.quadraticCurveTo(ew * .94, topY * .46, ew * 1.12, -eh * .24);
  ctx.stroke();

  // Very subtle soft lower lid line
  ctx.strokeStyle = 'rgba(148,96,120,0.52)';
  ctx.lineWidth = 2.8;
  ctx.beginPath();
  ctx.moveTo(-ew * .32, botY * .88);
  ctx.quadraticCurveTo(ew * .28, botY * 1.02, ew * .86, eh * .24);
  ctx.stroke();

  // Fine soft double-eyelid crease
  ctx.strokeStyle = 'rgba(182,120,132,0.52)';
  ctx.lineWidth = 2.6;
  ctx.beginPath();
  ctx.moveTo(-ew * .64, topY * 1.18 - 13);
  ctx.bezierCurveTo(-ew * .18, topY * 1.46 - 15, ew * .44, topY * 1.42 - 14, ew * .84, topY * .90 - 9);
  ctx.stroke();

  // Soft rose-pink eyebrows
  ctx.strokeStyle = '#c5779d';
  ctx.lineWidth = 6.8;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-ew * .78, -eh * 1.46);
  ctx.quadraticCurveTo(ew * .04, -eh * 1.78, ew * .84, -eh * 1.40);
  ctx.stroke();

  ctx.restore();
}

function paintFaceCanvas(closed = false) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = S;
  const ctx = canvas.getContext('2d');

  // Warm healthy anime peach-cream skin (NOT ghostly flat white paper!)
  const bg = ctx.createLinearGradient(0, 0, 0, S);
  bg.addColorStop(0.00, '#f8dfd2');
  bg.addColorStop(0.32, '#fce5d9');
  bg.addColorStop(0.74, '#f8ddd0');
  bg.addColorStop(1.00, '#ecc9bc');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, S, S);

  // Subtle warm volumetric cheek/chin/forehead shading baked softly so face feels 3D & alive
  const centerGlow = ctx.createRadialGradient(S * .5, toY(.112), 40, S * .5, toY(.112), px(.098));
  centerGlow.addColorStop(0, 'rgba(255,242,234,0.65)');
  centerGlow.addColorStop(.70, 'rgba(255,232,220,0.18)');
  centerGlow.addColorStop(1, 'rgba(222,170,162,0.22)');
  ctx.fillStyle = centerGlow;
  ctx.fillRect(0, 0, S, S);

  // Soft natural airbrushed peach-sakura cheek blush (no harsh scratch lines)
  for (const s of [-1, 1]) {
    const bx = toX(s * .055), by = toY(.096);
    const bl = ctx.createRadialGradient(bx, by, 8, bx, by, px(.034));
    bl.addColorStop(0, 'rgba(244,148,166,0.44)');
    bl.addColorStop(.55, 'rgba(248,172,184,0.20)');
    bl.addColorStop(1, 'rgba(248,172,184,0)');
    ctx.fillStyle = bl;
    ctx.beginPath();
    ctx.ellipse(bx, by, px(.035), px(.022), 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // Subtle soft anime nose shading
  const nx = toX(0), ny = toY(.091);
  ctx.fillStyle = 'rgba(196,130,126,0.42)';
  ctx.beginPath();
  ctx.ellipse(nx + 3, ny + 4, 6.0, 3.6, -.22, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,248,244,0.52)';
  ctx.beginPath();
  ctx.ellipse(nx - 2, ny - 4, 4.0, 8.5, 0, 0, Math.PI * 2);
  ctx.fill();

  // Warm gentle natural smile
  const mx = toX(0), my = toY(.063), mw = px(.0185);
  const lip = ctx.createRadialGradient(mx, my + 5, 4, mx, my + 5, mw * 1.20);
  lip.addColorStop(0, 'rgba(236,134,148,0.50)');
  lip.addColorStop(.65, 'rgba(244,168,176,0.18)');
  lip.addColorStop(1, 'rgba(244,168,176,0)');
  ctx.fillStyle = lip;
  ctx.beginPath();
  ctx.ellipse(mx, my + 5, mw * 1.20, mw * .55, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = '#a86170';
  ctx.lineWidth = 4.2;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(mx - mw, my - 5);
  ctx.quadraticCurveTo(mx, my + 8, mx + mw, my - 5);
  ctx.stroke();

  ctx.fillStyle = 'rgba(255,236,238,0.58)';
  ctx.beginPath();
  ctx.ellipse(mx, my + 14, mw * .32, 3.5, 0, 0, Math.PI * 2);
  ctx.fill();

  drawEye(ctx, -1, closed);
  drawEye(ctx, 1, closed);
  return canvas;
}

export function createFaceTextures() {
  if (typeof document === 'undefined') {
    const dummy = new T.DataTexture(new Uint8Array([250, 226, 214, 255]), 1, 1, T.RGBAFormat);
    dummy.needsUpdate = true;
    return { openMap: dummy, closedMap: dummy, openCanvas: null };
  }
  const openCanvas = paintFaceCanvas(false);
  const closedCanvas = paintFaceCanvas(true);
  const wrap = c => {
    const t = new T.CanvasTexture(c);
    t.colorSpace = T.SRGBColorSpace;
    t.anisotropy = 4;
    t.needsUpdate = true;
    return t;
  };
  return { openMap: wrap(openCanvas), closedMap: wrap(closedCanvas), openCanvas };
}

export function createFaceSdfTexture() {
  const n = 256;
  const bytes = new Uint8Array(n * n * 4);
  for (let y = 0; y < n; y++) {
    const v = 1 - y / (n - 1);
    for (let x = 0; x < n; x++) {
      const u = x / (n - 1);
      const dx = (u - .5) * 2;
      const cheekCurve = .14 * Math.exp(-(((v - .36) / .24) ** 2));
      const nosePinch = .16 * Math.exp(-(((v - .32) / .13) ** 2)) * Math.exp(-((dx / .22) ** 2));
      const browCurve = -.09 * Math.exp(-(((v - .60) / .16) ** 2));
      const chinRound = .12 * Math.max(0, .25 - v) * 4;
      let val = .5 + .46 * dx + cheekCurve * (dx > 0 ? 1 : -1) - nosePinch + browCurve + chinRound * (dx > 0 ? .5 : -.5);
      val = Math.max(0, Math.min(1, val));
      const b = Math.round(val * 255);
      const i = (y * n + x) * 4;
      bytes[i] = bytes[i + 1] = bytes[i + 2] = b;
      bytes[i + 3] = 255;
    }
  }
  const tex = new T.DataTexture(bytes, n, n, T.RGBAFormat);
  tex.magFilter = T.LinearFilter;
  tex.minFilter = T.LinearFilter;
  tex.needsUpdate = true;
  return tex;
}
