import * as T from './assets/three.module.min.js';
import { GLTFLoader } from './assets/GLTFLoader.js';

// Lightweight real 3D character loader (.glb / .gltf / .vrm) for campus roam.
// Auto-scales to 1.68m, grounds feet at y=0, plays embedded AnimationClips if
// present, or smoothly drives standard Humanoid / VRM / Mixamo / MMD bones.
const DB_NAME = 'henu-campus-avatar-v1', STORE = 'models', KEY = 'custom';
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));

function openDb() {
  if (typeof indexedDB === 'undefined') return Promise.resolve(null);
  return new Promise(resolve => {
    try {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => { if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE); };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch { resolve(null); }
  });
}

export async function saveCachedModel(name, buffer) {
  const db = await openDb();
  if (!db) return;
  return new Promise(resolve => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put({ name, buffer }, KEY);
    tx.oncomplete = tx.onerror = () => resolve();
  });
}

export async function loadCachedModel() {
  const db = await openDb();
  if (!db) return null;
  return new Promise(resolve => {
    const tx = db.transaction(STORE, 'readonly');
    const req = tx.objectStore(STORE).get(KEY);
    req.onsuccess = () => resolve(req.result ?? null);
    req.onerror = () => resolve(null);
  });
}

export async function clearCachedModel() {
  const db = await openDb();
  if (!db) return;
  return new Promise(resolve => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).delete(KEY);
    tx.oncomplete = tx.onerror = () => resolve();
  });
}

function findBone(scene, patterns) {
  let hit = null;
  scene.traverse(obj => {
    if (hit || !obj.name) return;
    const n = obj.name.toLowerCase();
    if (patterns.some(re => re.test(n))) hit = obj;
  });
  return hit;
}

function makeShadowDisk() {
  const n = 48, bytes = new Uint8Array(n * n * 4);
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    const r = Math.max(0, 1 - Math.hypot((x + .5) * 2 / n - 1, (y + .5) * 2 / n - 1)), i = (y * n + x) * 4;
    bytes.set([38, 34, 54, Math.round(255 * r * r * (3 - 2 * r))], i);
  }
  const tex = new T.DataTexture(bytes, n, n, T.RGBAFormat);
  tex.needsUpdate = true; tex.magFilter = T.LinearFilter;
  const shadow = new T.Mesh(new T.PlaneGeometry(.88, .66), new T.MeshBasicMaterial({
    map: tex, transparent: true, opacity: .34, depthWrite: false,
    polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2
  }));
  shadow.geometry.rotateX(-Math.PI / 2);
  shadow.position.y = .032;
  return shadow;
}

export async function loadCustomAvatar(source, label = '自定义角色') {
  const loader = new GLTFLoader();
  let gltf;
  if (source instanceof ArrayBuffer) {
    gltf = await new Promise((resolve, reject) => loader.parse(source, '', resolve, reject));
  } else {
    gltf = await loader.loadAsync(source);
  }

  const root = new T.Group();
  root.name = 'Custom Avatar · ' + label;
  const body = new T.Group();
  body.name = 'custom body';
  root.add(body);
  const shadow = makeShadowDisk();
  root.add(shadow);

  const model = gltf.scene;
  const meshes = [];
  model.traverse(obj => {
    if (obj.isMesh) {
      obj.frustumCulled = false;
      obj.castShadow = true;
      meshes.push(obj);
    }
  });

  // Normalize height to 1.68m, center X/Z, and plant soles cleanly at y = 0.
  model.updateMatrixWorld(true);
  const box = new T.Box3().setFromObject(model);
  const size = new T.Vector3(); box.getSize(size);
  const center = new T.Vector3(); box.getCenter(center);
  const scale = size.y > .01 ? 1.68 / size.y : 1;
  const holder = new T.Group();
  // Most VRM/MMD-to-GLB models face +Z (or standard glTF +Z); rotate 180° so character faces -Z forward.
  const isVrm = Boolean(gltf.parser?.json?.extensions?.VRM || gltf.parser?.json?.extensions?.VRMC_vrm);
  model.scale.setScalar(scale);
  model.position.set(-center.x * scale, -box.min.y * scale, -center.z * scale);
  holder.rotation.y = isVrm ? 0 : Math.PI;
  holder.add(model);
  body.add(holder);

  // Embedded animation clips (if exported with idle/walk/run/jump)
  const clips = gltf.animations ?? [];
  const mixer = clips.length ? new T.AnimationMixer(model) : null;
  const pickClip = re => clips.find(c => re.test(c.name.toLowerCase()));
  const actions = mixer ? {
    idle: pickClip(/idle|stand|wait|待机/) ?? clips[0],
    walk: pickClip(/walk|jog|走|步/) ?? null,
    run: pickClip(/run|sprint|dash|跑/) ?? null,
    jump: pickClip(/jump|air|fall|跳/) ?? null
  } : null;
  let activeAction = null;
  const actionCache = new Map();
  function playClip(clip, rate = 1) {
    if (!mixer || !clip) return;
    let act = actionCache.get(clip);
    if (!act) { act = mixer.clipAction(clip); actionCache.set(clip, act); }
    act.timeScale = rate;
    if (activeAction === act) return;
    act.reset().play();
    if (activeAction) act.crossFadeFrom(activeAction, .18, false);
    activeAction = act;
  }

  // Procedural humanoid / VRM / Mixamo / MMD bone fallback when no clips are bundled
  const bones = {
    hips: findBone(model, [/hips|pelvis|center|センター|腰/]),
    spine: findBone(model, [/spine|upper.?body|上半身/]),
    head: findBone(model, [/^head$|j_bip_c_head|mixamorig.*head|頭/]),
    lLeg: findBone(model, [/left.?up.?leg|l.?thigh|j_bip_l_upperleg|左足$/]),
    rLeg: findBone(model, [/right.?up.?leg|r.?thigh|j_bip_r_upperleg|右足$/]),
    lKnee: findBone(model, [/left.?leg$|left.?lower.?leg|l.?calf|j_bip_l_lowerleg|左ひざ/]),
    rKnee: findBone(model, [/right.?leg$|right.?lower.?leg|r.?calf|j_bip_r_lowerleg|右ひざ/]),
    lArm: findBone(model, [/left.?arm$|left.?upper.?arm|j_bip_l_upperarm|左腕/]),
    rArm: findBone(model, [/right.?arm$|right.?upper.?arm|j_bip_r_upperarm|右腕/]),
    lFore: findBone(model, [/left.?fore.?arm|left.?lower.?arm|j_bip_l_lowerarm|左ひじ/]),
    rFore: findBone(model, [/right.?fore.?arm|right.?lower.?arm|j_bip_r_lowerarm|右ひじ/])
  };
  const restRot = new Map();
  for (const b of Object.values(bones)) if (b) restRot.set(b, b.rotation.clone());

  let fps = false, time = 0, phase = 0, motion = 0, run = 0;
  function setFirstPerson(value) {
    fps = Boolean(value);
    body.visible = !fps;
  }
  function reset() {
    time = phase = motion = run = 0;
    for (const [b, r] of restRot) b.rotation.copy(r);
    holder.position.set(0, 0, 0);
    holder.rotation.x = holder.rotation.z = 0;
  }
  function update(p) {
    const dt = clamp(p.dt ?? 0, 0, .16);
    if (!p.still) time += dt;
    root.position.set(p.x, p.groundY, p.z);
    root.rotation.y = -(p.yaw ?? 0);
    body.position.y = p.jumpY ?? 0;
    shadow.scale.setScalar(Math.max(.52, 1 - (p.jumpY ?? 0) * .24));
    shadow.material.opacity = .34 / (1 + (p.jumpY ?? 0) * .74);
    if (fps) return;

    const speed = p.speed ?? 0;
    const grounded = p.grounded !== false;
    motion += (clamp(speed / 1.4) - motion) * Math.min(1, dt * 10);
    run += ((p.sprinting || speed > 10 ? 1 : 0) - run) * Math.min(1, dt * 8);
    const stride = 1.25 + .6 * run;
    if (grounded && speed > .05) phase = (phase + clamp(p.distance ?? speed * dt, 0, .6) / stride) % 1;

    if (mixer) {
      const clip = !grounded && actions.jump ? actions.jump
        : run > .5 && actions.run ? actions.run
        : motion > .2 && actions.walk ? actions.walk
        : actions.idle;
      playClip(clip, motion > .2 ? (1 + .35 * run) : 1);
      mixer.update(dt);
    } else {
      const w = Math.sin(phase * Math.PI * 2), c = Math.cos(phase * Math.PI * 2);
      const amp = motion * (grounded ? 1 : .25);
      const bob = grounded ? Math.abs(w) * (.035 + .035 * run) * amp : 0;
      holder.position.y = bob + (p.landDip ?? 0) * .4;
      holder.rotation.x = -(0.06 + 0.08 * run) * amp;
      holder.rotation.z = clamp(-(p.turnRate ?? 0) * .045, -.16, .16) * amp;

      const setR = (b, dx = 0, dy = 0, dz = 0) => {
        if (!b) return;
        const r = restRot.get(b);
        b.rotation.set(r.x + dx, r.y + dy, r.z + dz);
      };
      // Lower arms cleanly out of T-pose into natural anime stance + stride swing
      const armDown = .95;
      const legSwing = (.52 + .35 * run) * amp;
      const armSwing = (.42 + .36 * run) * amp;
      setR(bones.spine, -.03 * Math.sin(time * 2) * (1 - amp) - .06 * run * amp, w * .08 * amp, 0);
      setR(bones.head, .02 * Math.sin(time * 1.8) * (1 - amp), Math.sin(time * .7) * .06 * (1 - amp), 0);
      setR(bones.lLeg, grounded ? w * legSwing : .32, 0, 0);
      setR(bones.rLeg, grounded ? -w * legSwing : -.24, 0, 0);
      setR(bones.lKnee, grounded ? Math.max(0, -c) * (.55 + .45 * run) * amp : .65, 0, 0);
      setR(bones.rKnee, grounded ? Math.max(0, c) * (.55 + .45 * run) * amp : .35, 0, 0);
      setR(bones.lArm, -w * armSwing, 0, armDown - .12 * amp);
      setR(bones.rArm, w * armSwing, 0, -armDown + .12 * amp);
      setR(bones.lFore, -.18 - Math.max(0, w) * .35 * amp, 0, 0);
      setR(bones.rFore, -.18 - Math.max(0, -w) * .35 * amp, 0, 0);
    }
  }

  return {
    root, meshes, label, isCustom: true,
    setFirstPerson, reset, update,
    setVisible(v) { root.visible = Boolean(v); },
    dispose() {
      root.traverse(o => {
        if (o.isMesh) {
          o.geometry?.dispose?.();
          const mats = Array.isArray(o.material) ? o.material : [o.material];
          for (const m of mats) m?.dispose?.();
        }
      });
    }
  };
}
