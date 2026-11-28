import * as T from './assets/three.module.min.js';

// High-resolution 1024x1024 UV-mapped anime face illustration textures (open + blink)
// plus 256x256 Honkai/Genshin-style Face SDF Shadow Map.
// Uses isotropic 1:1 front-planar UVs:
//   x in [-0.13, +0.13] -> u in [0, 1]  (u=0.5 is center x=0)
//   y in [ 0.01,  0.27] -> v in [0, 1]  (canvas cy = (1 - v) * 1024)
const S = 1024;
const toX = x => S * (.5 + x / .26);
const toY = y => S * (1 - (y - .010) / .26);
const px = m => S * (m / .26);

function drawEye(ctx, side, closed = false) {
  const cx = toX(side * .045);
  const cy = toY(.121);
  const ew = px(.0295);
  const eh = px(.0215);

  ctx.save();
  ctx.translate(cx, cy);
  if (side < 0) ctx.scale(-1, 1);

  if (closed) {
    // Sweet happy curved anime blink arc
    ctx.strokeStyle = '#4c2646';
    ctx.lineWidth = 10.5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-ew * .88, eh * .18);
    ctx.quadraticCurveTo(0, -eh * .32, ew * 1.04, eh * .08);
    ctx.stroke();

    ctx.strokeStyle = '#c86c9f';
    ctx.lineWidth = 4.2;
    ctx.beginPath();
    ctx.moveTo(ew * .58, -eh * .06);
    ctx.quadraticCurveTo(ew * .88, -.02 * eh, ew * 1.12, -eh * .08);
    ctx.stroke();

    ctx.strokeStyle = '#c96f9f';
    ctx.lineWidth = 7.2;
    ctx.beginPath();
    ctx.moveTo(-ew * .78, -eh * 1.48);
    ctx.quadraticCurveTo(ew * .06, -eh * 1.82, ew * .84, -eh * 1.46);
    ctx.stroke();
    ctx.restore();
    return;
  }

  const topY = -eh;
  const botY = eh * .82;

  // 1. Soft upper-eye rosy socket tint
  const sock = ctx.createRadialGradient(0, -eh * .55, eh * .2, 0, -eh * .35, ew * 1.35);
  sock.addColorStop(0, 'rgba(246,178,196,0.34)');
  sock.addColorStop(1, 'rgba(246,178,196,0)');
  ctx.fillStyle = sock;
  ctx.beginPath();
  ctx.ellipse(0, -eh * .3, ew * 1.3, eh * 1.1, 0, 0, Math.PI * 2);
  ctx.fill();

  function eyePath() {
    ctx.beginPath();
    ctx.moveTo(-ew * .94, eh * .20);
    ctx.bezierCurveTo(-ew * .58, topY * 1.24, ew * .48, topY * 1.22, ew * .98, -eh * .06);
    ctx.bezierCurveTo(ew * .64, botY * 1.06, -ew * .42, botY * 1.04, -ew * .94, eh * .20);
    ctx.closePath();
  }

  ctx.save();
  eyePath();
  ctx.clip();

  // 2. Crisp porcelain-white sclera with delicate lavender-pink top shadow
  const sc = ctx.createLinearGradient(0, topY * 1.1, 0, botY);
  sc.addColorStop(0, '#d8c5e8');
  sc.addColorStop(.28, '#f7eefc');
  sc.addColorStop(.60, '#ffffff');
  sc.addColorStop(1, '#fff6fa');
  ctx.fillStyle = sc;
  ctx.fillRect(-ew * 1.2, -eh * 1.4, ew * 2.4, eh * 2.8);

  // 3. Elysia multi-tone crystal iris (deep plum -> orchid violet -> sakura pink -> luminous cyan-ice crescent)
  const ix = -ew * .03, iy = eh * .02, irx = ew * .57, iry = eh * .86;

  ctx.fillStyle = '#4f2664';
  ctx.beginPath();
  ctx.ellipse(ix, iy, irx * 1.05, iry * 1.04, 0, 0, Math.PI * 2);
  ctx.fill();

  const ig = ctx.createLinearGradient(ix, iy - iry, ix, iy + iry);
  ig.addColorStop(0.00, '#4a2366');
  ig.addColorStop(0.24, '#7d49a8');
  ig.addColorStop(0.50, '#be7ce0');
  ig.addColorStop(0.73, '#fface3');
  ig.addColorStop(0.90, '#d7f4ff');
  ig.addColorStop(1.00, '#effcff');
  ctx.fillStyle = ig;
  ctx.beginPath();
  ctx.ellipse(ix, iy, irx * .95, iry * .95, 0, 0, Math.PI * 2);
  ctx.fill();

  // Glowing lower ice-cyan & sakura crystal crescent
  const glow = ctx.createRadialGradient(ix + irx * .08, iy + iry * .48, irx * .05, ix, iy + iry * .36, irx * .86);
  glow.addColorStop(0, 'rgba(218,252,255,0.96)');
  glow.addColorStop(.45, 'rgba(255,192,235,0.78)');
  glow.addColorStop(1, 'rgba(255,192,235,0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.ellipse(ix, iy + iry * .22, irx * .84, iry * .70, 0, 0, Math.PI * 2);
  ctx.fill();

  // Delicate crystalline shimmer arc inside lower iris
  ctx.strokeStyle = 'rgba(255,244,255,0.52)';
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.arc(ix, iy + iry * .04, irx * .56, 0.25, Math.PI - 0.25);
  ctx.stroke();

  // Velvety dark-violet pupil
  const pg = ctx.createRadialGradient(ix, iy - iry * .06, irx * .08, ix, iy - iry * .04, irx * .44);
  pg.addColorStop(0, '#36184c');
  pg.addColorStop(.65, '#592c78');
  pg.addColorStop(1, 'rgba(130,72,168,0)');
  ctx.fillStyle = pg;
  ctx.beginPath();
  ctx.ellipse(ix, iy - iry * .04, irx * .44, iry * .46, 0, 0, Math.PI * 2);
  ctx.fill();

  // Soft translucent upper-lid shadow cast across top of iris
  const lidSh = ctx.createLinearGradient(0, topY * 1.15, 0, topY * .15);
  lidSh.addColorStop(0, 'rgba(65,30,82,0.56)');
  lidSh.addColorStop(1, 'rgba(65,30,82,0)');
  ctx.fillStyle = lidSh;
  ctx.fillRect(-ew * 1.2, topY * 1.3, ew * 2.4, eh * 1.2);

  // 4. Crisp anime catchlights (luminous upper-left oval, pinpoint & bottom-right crystal diamond)
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.ellipse(ix - irx * .46, iy - iry * .42, irx * .28, iry * .25, -.28, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = 'rgba(255,255,255,0.94)';
  ctx.beginPath();
  ctx.ellipse(ix + irx * .42, iy - iry * .22, irx * .12, iry * .11, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = 'rgba(255,244,255,0.92)';
  const gx = ix + irx * .30, gy = iy + iry * .44, gr = irx * .20;
  ctx.beginPath();
  ctx.moveTo(gx, gy - gr * 1.2);
  ctx.lineTo(gx + gr * .65, gy);
  ctx.lineTo(gx, gy + gr * 1.2);
  ctx.lineTo(gx - gr * .65, gy);
  ctx.closePath();
  ctx.fill();

  ctx.restore();

  // 5. Curved dark-plum-to-rose anime upper eyelashes with winged cat-eye flick
  const lashGrad = ctx.createLinearGradient(-ew, topY, ew, topY);
  lashGrad.addColorStop(0, '#5a2e4c');
  lashGrad.addColorStop(.55, '#3f1e3a');
  lashGrad.addColorStop(1, '#7a3d66');
  ctx.fillStyle = lashGrad;
  ctx.beginPath();
  ctx.moveTo(-ew * 1.00, eh * .20);
  ctx.bezierCurveTo(-ew * .62, topY * 1.44, ew * .48, topY * 1.44, ew * 1.14, -eh * .26);
  ctx.bezierCurveTo(ew * 1.06, -eh * .06, ew * 1.02, eh * .02, ew * .96, -eh * .02);
  ctx.bezierCurveTo(ew * .46, topY * 1.08, -ew * .54, topY * 1.12, -ew * .94, eh * .23);
  ctx.closePath();
  ctx.fill();

  // Signature sakura-rose outer lash wing highlight
  ctx.strokeStyle = '#c86c9f';
  ctx.lineWidth = 4.2;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(ew * .62, topY * .84);
  ctx.quadraticCurveTo(ew * .94, topY * .52, ew * 1.16, -eh * .34);
  ctx.stroke();

  // Delicate outer lash flicks
  ctx.strokeStyle = '#5a2f4f';
  ctx.lineWidth = 3.2;
  for (const [fx, fy, tx, ty] of [[.84, -.04, 1.08, -.16], [.72, .34, .92, .42]]) {
    ctx.beginPath();
    ctx.moveTo(ew * fx, eh * fy);
    ctx.lineTo(ew * tx, eh * ty);
    ctx.stroke();
  }

  // Light partial lower lash line
  ctx.strokeStyle = 'rgba(122,68,104,0.75)';
  ctx.lineWidth = 3.4;
  ctx.beginPath();
  ctx.moveTo(-ew * .46, botY * .92);
  ctx.quadraticCurveTo(ew * .26, botY * 1.12, ew * .88, eh * .24);
  ctx.stroke();

  // 6. Fine double-eyelid fold crease
  ctx.strokeStyle = 'rgba(176,108,128,0.68)';
  ctx.lineWidth = 3.0;
  ctx.beginPath();
  ctx.moveTo(-ew * .68, topY * 1.24 - 14);
  ctx.bezierCurveTo(-ew * .20, topY * 1.54 - 16, ew * .48, topY * 1.50 - 15, ew * .88, topY * .96 - 10);
  ctx.stroke();

  // 7. Expressive rose-pink anime eyebrow (positioned so inner/outer arch peeks gracefully through bangs)
  ctx.strokeStyle = '#bf6092';
  ctx.lineWidth = 8.2;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-ew * .82, -eh * 1.24);
  ctx.quadraticCurveTo(ew * .04, -eh * 1.54, ew * .86, -eh * 1.22);
  ctx.stroke();

  ctx.restore();
}

function paintFaceCanvas(closed = false) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = S;
  const ctx = canvas.getContext('2d');

  // 1. Warm luminous anime porcelain skin base
  const bg = ctx.createLinearGradient(0, 0, 0, S);
  bg.addColorStop(0.0, '#fff2eb');
  bg.addColorStop(0.55, '#fff5ef');
  bg.addColorStop(1.0, '#ffe9e1');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, S, S);

  // Subtle rosy forehead bloom
  const fore = ctx.createRadialGradient(S * .5, toY(.185), 20, S * .5, toY(.185), px(.095));
  fore.addColorStop(0, 'rgba(255,204,218,0.22)');
  fore.addColorStop(1, 'rgba(255,204,218,0)');
  ctx.fillStyle = fore;
  ctx.fillRect(0, 0, S, S);

  // 2. Soft airbrushed sakura cheek blush + anime highlight hatches (///)
  for (const s of [-1, 1]) {
    const bx = toX(s * .058), by = toY(.095);
    const bl = ctx.createRadialGradient(bx, by, 8, bx, by, px(.031));
    bl.addColorStop(0, 'rgba(255,134,168,0.56)');
    bl.addColorStop(.55, 'rgba(255,168,194,0.28)');
    bl.addColorStop(1, 'rgba(255,176,198,0)');
    ctx.fillStyle = bl;
    ctx.beginPath();
    ctx.ellipse(bx, by, px(.033), px(.019), 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = 'rgba(255,118,158,0.34)';
    ctx.lineWidth = 3.4;
    ctx.lineCap = 'round';
    for (let k = -1; k <= 1; k++) {
      const hx = bx + k * 15, hy = by + 4;
      ctx.beginPath();
      ctx.moveTo(hx - 6, hy + 10);
      ctx.lineTo(hx + 6, hy - 10);
      ctx.stroke();
    }
  }

  // 3. Delicate tiny anime nose dot + luminous white bridge highlight
  const nx = toX(0), ny = toY(.091);
  ctx.fillStyle = 'rgba(202,118,128,0.62)';
  ctx.beginPath();
  ctx.ellipse(nx + 4, ny + 4, 6.2, 4.0, -.25, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  ctx.beginPath();
  ctx.ellipse(nx - 2, ny - 4, 4.2, 8.0, 0, 0, Math.PI * 2);
  ctx.fill();

  // 4. Sweet playful upturned Elysia smile
  const mx = toX(0), my = toY(.062), mw = px(.020);
  const lip = ctx.createRadialGradient(mx, my + 6, 4, mx, my + 6, mw * 1.18);
  lip.addColorStop(0, 'rgba(250,136,162,0.58)');
  lip.addColorStop(.65, 'rgba(255,172,188,0.24)');
  lip.addColorStop(1, 'rgba(255,184,196,0)');
  ctx.fillStyle = lip;
  ctx.beginPath();
  ctx.ellipse(mx, my + 6, mw * 1.18, mw * .58, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#ea7790';
  ctx.beginPath();
  ctx.moveTo(mx - mw * .92, my - 5);
  ctx.quadraticCurveTo(mx, my + 9, mx + mw * .92, my - 5);
  ctx.quadraticCurveTo(mx, my + 22, mx - mw * .92, my - 5);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#fff5f7';
  ctx.beginPath();
  ctx.moveTo(mx - mw * .66, my - 2);
  ctx.quadraticCurveTo(mx, my + 6, mx + mw * .66, my - 2);
  ctx.quadraticCurveTo(mx, my + 10, mx - mw * .66, my - 2);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = '#99485e';
  ctx.lineWidth = 4.5;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(mx - mw, my - 7);
  ctx.quadraticCurveTo(mx, my + 10, mx + mw, my - 7);
  ctx.stroke();

  ctx.fillStyle = 'rgba(255,245,248,0.75)';
  ctx.beginPath();
  ctx.ellipse(mx, my + 21, mw * .34, 4.0, 0, 0, Math.PI * 2);
  ctx.fill();

  drawEye(ctx, -1, closed);
  drawEye(ctx, 1, closed);
  return canvas;
}

export function createFaceTextures() {
  if (typeof document === 'undefined') {
    const dummy = new T.DataTexture(new Uint8Array([255, 244, 238, 255]), 1, 1, T.RGBAFormat);
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

// Procedural Honkai/Genshin-style 256x256 Face SDF Lightmap:
// Encodes the smooth horizontal shadow sweep threshold across the anime face.
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
