import * as T from 'three';

// Procedural articulated campus student avatar for walk mode.
// Built from lightweight Three.js primitives (no external textures/models).
// Local forward is -Z (matching walk.yaw = 0 facing north).

function capsuleMesh(radius, length, mat) {
  const mesh = new T.Mesh(new T.CapsuleGeometry(radius, length, 5, 10), mat);
  mesh.castShadow = false;
  mesh.receiveShadow = true;
  return mesh;
}

function boxMesh(w, h, d, mat) {
  const mesh = new T.Mesh(new T.BoxGeometry(w, h, d), mat);
  mesh.castShadow = false;
  mesh.receiveShadow = true;
  return mesh;
}

function makeContactShadowTexture() {
  const size = 64;
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = (x + .5) / size * 2 - 1, v = (y + .5) / size * 2 - 1;
      const r = Math.hypot(u, v);
      const a = Math.max(0, 1 - r);
      const alpha = Math.round(a * a * (3 - 2 * a) * 255);
      const idx = (y * size + x) * 4;
      data[idx] = 20; data[idx + 1] = 34; data[idx + 2] = 26; data[idx + 3] = alpha;
    }
  }
  const tex = new T.DataTexture(data, size, size, T.RGBAFormat);
  tex.needsUpdate = true;
  return tex;
}

export function createPlayerAvatar() {
  const root = new T.Group();
  root.name = 'player-avatar';
  root.visible = false;

  // Separate actor body (lifts on jump) from ground contact shadow (stays pinned to terrain
  // and softens/shrinks with jump height, giving real-time depth cues with zero shadow-map stalls).
  const body = new T.Group();
  root.add(body);

  const shadowMat = new T.MeshBasicMaterial({
    map: makeContactShadowTexture(),
    transparent: true,
    opacity: .38,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2
  });
  const shadowGeo = new T.PlaneGeometry(1.05, 1.05);
  shadowGeo.rotateX(-Math.PI / 2);
  const contactShadow = new T.Mesh(shadowGeo, shadowMat);
  contactShadow.position.y = .04;
  root.add(contactShadow);

  const jacketMat = new T.MeshStandardMaterial({ color: '#244b3e', roughness: .82, metalness: .04 });
  const trimMat = new T.MeshStandardMaterial({ color: '#ece6d4', roughness: .84 });
  const badgeMat = new T.MeshStandardMaterial({ color: '#d4af55', roughness: .42, metalness: .35 });
  const packMat = new T.MeshStandardMaterial({ color: '#465850', roughness: .88 });
  const packFlapMat = new T.MeshStandardMaterial({ color: '#c4ae84', roughness: .86 });
  const headSkinMat = new T.MeshStandardMaterial({ color: '#f1cfb4', roughness: .76 });
  const hairMat = new T.MeshStandardMaterial({ color: '#262428', roughness: .82 });
  const eyeMat = new T.MeshStandardMaterial({ color: '#1b2024', roughness: .4 });

  const sleeveMat = new T.MeshStandardMaterial({ color: '#ebe6d6', roughness: .84 });
  const cuffMat = new T.MeshStandardMaterial({ color: '#244b3e', roughness: .82 });
  const handSkinMat = new T.MeshStandardMaterial({ color: '#f1cfb4', roughness: .76 });
  const pantsMat = new T.MeshStandardMaterial({ color: '#2e3946', roughness: .88 });
  const shoeMat = new T.MeshStandardMaterial({ color: '#f0f1ea', roughness: .72 });
  const shoeAccentMat = new T.MeshStandardMaterial({ color: '#244b3e', roughness: .75 });
  const soleMat = new T.MeshStandardMaterial({ color: '#39403e', roughness: .92 });

  const upperMats = [jacketMat, trimMat, badgeMat, packMat, packFlapMat, headSkinMat, hairMat, eyeMat];

  // Pelvis (hip center at y = 0.88m)
  const pelvis = new T.Group();
  pelvis.position.set(0, .88, 0);
  body.add(pelvis);

  const hipBlock = capsuleMesh(.145, .07, pantsMat);
  hipBlock.rotation.z = Math.PI / 2;
  hipBlock.scale.set(1, 1, .82);
  pelvis.add(hipBlock);

  // Torso group (extends up from pelvis to shoulder y +0.48 -> world 1.36m)
  const torso = new T.Group();
  torso.position.set(0, .06, 0);
  pelvis.add(torso);

  const chest = capsuleMesh(.165, .24, jacketMat);
  chest.position.set(0, .23, 0);
  chest.scale.set(1.06, 1, .76);
  torso.add(chest);

  // Varsity collar, hem & chest crest
  const collar = new T.Mesh(new T.CylinderGeometry(.088, .102, .06, 12), trimMat);
  collar.position.set(0, .43, 0);
  torso.add(collar);

  const hem = new T.Mesh(new T.CylinderGeometry(.155, .15, .05, 12), trimMat);
  hem.position.set(0, .03, 0);
  hem.scale.set(1.06, 1, .76);
  torso.add(hem);

  const placket = boxMesh(.028, .36, .02, trimMat, false);
  placket.position.set(0, .22, -.126);
  torso.add(placket);

  const crest = boxMesh(.048, .052, .016, badgeMat, false);
  crest.position.set(-.07, .30, -.128);
  torso.add(crest);

  // Campus backpack (on back, +Z local)
  const pack = new T.Group();
  pack.position.set(0, .23, .16);
  torso.add(pack);
  const packBody = boxMesh(.27, .34, .13, packMat);
  pack.add(packBody);
  const packTop = capsuleMesh(.065, .14, packFlapMat);
  packTop.rotation.z = Math.PI / 2;
  packTop.position.set(0, .145, .005);
  pack.add(packTop);
  const packPocket = boxMesh(.21, .14, .045, packFlapMat);
  packPocket.position.set(0, -.06, .072);
  pack.add(packPocket);
  for (const s of [-1, 1]) {
    const strap = boxMesh(.038, .36, .03, packMat, false);
    strap.position.set(s * .105, .02, -.15);
    pack.add(strap);
  }

  // Head & sculpted hair (neck base at torso y +0.46 -> world ~1.40..1.72m)
  const headGroup = new T.Group();
  headGroup.position.set(0, .46, 0);
  torso.add(headGroup);

  const neck = new T.Mesh(new T.CylinderGeometry(.052, .058, .09, 10), headSkinMat);
  neck.position.set(0, .04, 0);
  headGroup.add(neck);

  const head = new T.Mesh(new T.SphereGeometry(.122, 14, 12), headSkinMat);
  head.position.set(0, .17, 0);
  head.scale.set(.94, 1.04, .98);
  head.receiveShadow = true;
  headGroup.add(head);

  // Sculpted hair cap + fringe + back volume
  const hairCap = new T.Mesh(new T.SphereGeometry(.129, 14, 10, 0, Math.PI * 2, 0, Math.PI * .62), hairMat);
  hairCap.position.set(0, .185, .012);
  hairCap.rotation.x = .18;
  headGroup.add(hairCap);

  const hairBack = new T.Mesh(new T.SphereGeometry(.112, 12, 10), hairMat);
  hairBack.position.set(0, .155, .045);
  hairBack.scale.set(1.02, .92, .85);
  headGroup.add(hairBack);

  const bangs = boxMesh(.17, .045, .05, hairMat, false);
  bangs.position.set(0, .245, -.095);
  bangs.rotation.x = .22;
  headGroup.add(bangs);

  for (const s of [-1, 1]) {
    const eye = new T.Mesh(new T.SphereGeometry(.014, 8, 6), eyeMat);
    eye.position.set(s * .042, .175, -.112);
    headGroup.add(eye);
  }

  // Articulated arms (attached to torso at shoulders)
  function makeArm(side) {
    const shoulder = new T.Group();
    shoulder.position.set(side * .192, .385, 0);
    torso.add(shoulder);

    const cap = new T.Mesh(new T.SphereGeometry(.056, 10, 8), sleeveMat);
    shoulder.add(cap);

    const upper = capsuleMesh(.048, .20, sleeveMat);
    upper.position.set(0, -.13, 0);
    shoulder.add(upper);

    const elbow = new T.Group();
    elbow.position.set(0, -.255, 0);
    shoulder.add(elbow);

    const elbowCap = new T.Mesh(new T.SphereGeometry(.044, 10, 8), sleeveMat);
    elbow.add(elbowCap);

    const forearm = capsuleMesh(.041, .18, sleeveMat);
    forearm.position.set(0, -.115, 0);
    elbow.add(forearm);

    const cuff = new T.Mesh(new T.CylinderGeometry(.043, .04, .045, 10), cuffMat);
    cuff.position.set(0, -.215, 0);
    elbow.add(cuff);

    const hand = new T.Mesh(new T.SphereGeometry(.044, 10, 8), handSkinMat);
    hand.position.set(0, -.265, -.005);
    hand.scale.set(.86, 1.15, .75);
    elbow.add(hand);

    return { shoulder, elbow };
  }
  const leftArm = makeArm(-1);
  const rightArm = makeArm(1);

  // Articulated legs (attached to pelvis)
  function makeLeg(side) {
    const hip = new T.Group();
    hip.position.set(side * .092, -.02, 0);
    pelvis.add(hip);

    const thigh = capsuleMesh(.068, .295, pantsMat);
    thigh.position.set(0, -.195, 0);
    hip.add(thigh);

    const knee = new T.Group();
    knee.position.set(0, -.395, 0);
    hip.add(knee);

    const kneeCap = new T.Mesh(new T.SphereGeometry(.060, 10, 8), pantsMat);
    knee.add(kneeCap);

    const shin = capsuleMesh(.056, .285, pantsMat);
    shin.position.set(0, -.19, 0);
    knee.add(shin);

    const foot = new T.Group();
    foot.position.set(0, -.40, 0);
    knee.add(foot);

    const sneaker = boxMesh(.098, .078, .235, shoeMat);
    sneaker.position.set(0, -.005, -.042);
    foot.add(sneaker);

    const toe = new T.Mesh(new T.SphereGeometry(.047, 10, 8), shoeMat);
    toe.position.set(0, -.01, -.155);
    toe.scale.set(1.02, .78, .92);
    foot.add(toe);

    const accent = boxMesh(.102, .032, .085, shoeAccentMat, false);
    accent.position.set(0, -.002, .01);
    foot.add(accent);

    const sole = boxMesh(.104, .026, .25, soleMat, false);
    sole.position.set(0, -.046, -.044);
    foot.add(sole);

    return { hip, knee, foot };
  }
  const leftLeg = makeLeg(-1);
  const rightLeg = makeLeg(1);

  let stridePhase = 0;
  let idleTime = 0;
  let smoothSpeed = 0;
  let firstPerson = true;

  function setFirstPerson(isFps) {
    firstPerson = Boolean(isFps);
    for (const m of upperMats) {
      m.colorWrite = !firstPerson;
      m.depthWrite = !firstPerson;
    }
  }
  setFirstPerson(true);

  function update({ x, z, groundY, jumpY, velY, landDip, yaw, speed, sprinting, grounded, dt }) {
    idleTime += dt;
    const targetNorm = Math.min(1.6, speed / 12);
    smoothSpeed += (targetNorm - smoothSpeed) * Math.min(1, dt * 11);

    // Offset slightly behind eye in FPS so looking straight down frames sneakers cleanly
    // without torso/knees intruding into horizontal forward view.
    const backOffset = firstPerson ? .20 : 0;
    root.position.set(x - Math.sin(yaw) * backOffset, groundY, z + Math.cos(yaw) * backOffset);
    root.rotation.y = -yaw;
    body.position.y = jumpY;
    const shadowScale = Math.max(.52, 1 - jumpY * .26);
    contactShadow.scale.set(shadowScale, 1, shadowScale * 1.15);
    shadowMat.opacity = .38 / (1 + jumpY * .75);

    if (grounded) {
      const freq = sprinting ? 11.4 : 8.2;
      if (smoothSpeed > .04) stridePhase += dt * freq * Math.min(1.25, .45 + smoothSpeed * .65);
    } else {
      stridePhase += dt * 2.2;
    }

    const amp = grounded ? Math.min(1, smoothSpeed) : 0;
    const s = Math.sin(stridePhase);
    const c = Math.cos(stridePhase);

    // Pelvis vertical bounce + landing squash + forward sprint lean
    const runBounce = grounded ? Math.abs(c) * .048 * amp : 0;
    const idleBreath = grounded ? Math.sin(idleTime * 2.4) * .008 * (1 - amp) : 0;
    pelvis.position.y = .88 + runBounce + idleBreath + landDip * .85;
    torso.rotation.x = grounded ? -(sprinting ? .16 : .07) * amp + landDip * .45 : -.11;
    torso.rotation.y = grounded ? -s * .08 * amp : 0;
    headGroup.rotation.x = -torso.rotation.x * .55;

    if (grounded) {
      // Natural alternating gait with knee flexion on trailing/lifting leg
      const legSwing = (sprinting ? .78 : .54) * amp;
      const lAngle = s * legSwing;
      const rAngle = -s * legSwing;
      leftLeg.hip.rotation.x = lAngle;
      rightLeg.hip.rotation.x = rAngle;
      leftLeg.knee.rotation.x = -Math.max(0, -c) * (sprinting ? .98 : .62) * amp - Math.max(0, -landDip) * 2.1;
      rightLeg.knee.rotation.x = -Math.max(0, c) * (sprinting ? .98 : .62) * amp - Math.max(0, -landDip) * 2.1;
      leftLeg.foot.rotation.x = -leftLeg.hip.rotation.x * .35 - leftLeg.knee.rotation.x * .45;
      rightLeg.foot.rotation.x = -rightLeg.hip.rotation.x * .35 - rightLeg.knee.rotation.x * .45;

      // Opposite arm swing (slightly lifted in sprint so forearms flash subtly at FPS edges)
      const armSwing = (sprinting ? .86 : .52) * amp;
      leftArm.shoulder.rotation.x = -s * armSwing + (sprinting ? .12 * amp : 0);
      rightArm.shoulder.rotation.x = s * armSwing + (sprinting ? .12 * amp : 0);
      leftArm.shoulder.rotation.z = -(.08 + .05 * amp);
      rightArm.shoulder.rotation.z = .08 + .05 * amp;
      leftArm.elbow.rotation.x = .16 + (sprinting ? .78 : .34) * amp + Math.max(0, -s) * .28 * amp;
      rightArm.elbow.rotation.x = .16 + (sprinting ? .78 : .34) * amp + Math.max(0, s) * .28 * amp;
    } else {
      // Expressive mid-air jump pose: knees tucked, arms lifted for balance
      const rise = T.MathUtils.clamp(velY / 7.2, -1, 1);
      leftLeg.hip.rotation.x = .52 + rise * .18;
      rightLeg.hip.rotation.x = -.18 + rise * .14;
      leftLeg.knee.rotation.x = -.95 - Math.max(0, rise) * .25;
      rightLeg.knee.rotation.x = -.62 - Math.max(0, rise) * .22;
      leftLeg.foot.rotation.x = -.25;
      rightLeg.foot.rotation.x = -.32;

      leftArm.shoulder.rotation.x = .52 + rise * .35;
      rightArm.shoulder.rotation.x = .38 + rise * .32;
      leftArm.shoulder.rotation.z = -.26;
      rightArm.shoulder.rotation.z = .26;
      leftArm.elbow.rotation.x = .72;
      rightArm.elbow.rotation.x = .68;
    }
  }

  return {
    root,
    setFirstPerson,
    update,
    setVisible(v) { root.visible = Boolean(v); }
  };
}
