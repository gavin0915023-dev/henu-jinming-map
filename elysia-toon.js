import * as T from './assets/three.module.min.js';

// Real miHoYo / Honkai Impact 3rd NPR (Non-Photorealistic Rendering) shader
// pipeline for Three.js:
//   1. Face SDF Toon Material (1024px UV anime face + Honkai SDF shadow sweep + smooth blink)
//   2. Hair Anisotropic Angel-Ring Toon Material (view-dependent silk halo)
//   3. Stepped 2-Tone Cel + Sharp Anime Rim + Crystal Specular Material
//   4. Distance-Adaptive Colored Inverted-Hull Anime Outline Pass

const SHARED_UNIFORMS = {
  uLightDir: { value: new T.Vector3(-.42, .74, -.52).normalize() },
  uSunTint: { value: new T.Color(0xfffaf7) }
};

export function setToonLighting(lightingName = 'noon') {
  const presets = {
    noon:    { dir: [-.42, .74, -.52], tint: 0xfffaf8 },
    morning: { dir: [-.64, .54, -.54], tint: 0xfff2e4 },
    sunset:  { dir: [ .68, .38, -.62], tint: 0xffd7c4 },
    night:   { dir: [-.32, .80, -.50], tint: 0xbac5f5 }
  };
  const p = presets[lightingName] ?? presets.noon;
  SHARED_UNIFORMS.uLightDir.value.set(...p.dir).normalize();
  SHARED_UNIFORMS.uSunTint.value.setHex(p.tint);
}

// 1. Face SDF Toon Material (1024px UV anime face + Honkai SDF shadow sweep + blink blend)
export function createFaceToonMaterial(openMap, closedMap, sdfMap) {
  return new T.ShaderMaterial({
    name: 'Elysia · Face SDF Toon',
    uniforms: {
      uMap: { value: openMap },
      uClosedMap: { value: closedMap },
      uSdf: { value: sdfMap },
      uBlink: { value: 0.0 },
      uLightDir: SHARED_UNIFORMS.uLightDir,
      uSunTint: SHARED_UNIFORMS.uSunTint,
      uShadowColor: { value: new T.Color(0xf6c6c0) }
    },
    vertexShader: `
      varying vec2 vUv;
      varying vec3 vWorldFwd;
      varying vec3 vWorldRight;
      varying vec3 vViewPos;
      varying vec3 vViewNorm;
      void main() {
        vUv = uv;
        vWorldFwd = normalize(mat3(modelMatrix) * vec3(0.0, 0.0, -1.0));
        vWorldRight = normalize(mat3(modelMatrix) * vec3(1.0, 0.0, 0.0));
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vViewPos = -mv.xyz;
        vViewNorm = normalize(normalMatrix * normal);
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: `
      uniform sampler2D uMap;
      uniform sampler2D uClosedMap;
      uniform sampler2D uSdf;
      uniform float uBlink;
      uniform vec3 uLightDir;
      uniform vec3 uSunTint;
      uniform vec3 uShadowColor;
      varying vec2 vUv;
      varying vec3 vWorldFwd;
      varying vec3 vWorldRight;
      varying vec3 vViewPos;
      varying vec3 vViewNorm;
      void main() {
        vec3 base = mix(texture2D(uMap, vUv).rgb, texture2D(uClosedMap, vUv).rgb, uBlink);
        // Horizontal light direction in head space sweeps the Honkai Face SDF
        vec2 L = normalize(vec2(dot(uLightDir, vWorldRight), dot(uLightDir, vWorldFwd)) + 1e-4);
        float isRight = step(0.0, L.x);
        vec2 sdfUv = vec2(mix(1.0 - vUv.x, vUv.x, isRight), vUv.y);
        float sdf = texture2D(uSdf, sdfUv).r;
        // Soft warm anime face shading with gentle natural 3D depth (never flat paper mask)
        float frontDot = clamp(L.y * 0.5 + 0.5, 0.0, 1.0);
        float threshold = mix(0.78, 0.28, frontDot);
        float lit = smoothstep(threshold - 0.14, threshold + 0.14, sdf);
        float nShade = smoothstep(-0.35, 0.65, dot(normalize(vViewNorm), normalize(vec3(-0.22, 0.35, 0.91))));
        float lum = dot(base, vec3(0.299, 0.587, 0.114));
        float shadowAmt = ((1.0 - lit) * 0.32 + (1.0 - nShade) * 0.18) * smoothstep(0.32, 0.80, lum);
        vec3 col = mix(base * 0.95, base * uShadowColor * 0.94, shadowAmt);
        gl_FragColor = vec4(col * uSunTint, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `
  });
}

// 2. Stepped 2-Tone Cel + Hair Angel Ring + Sharp Anime Rim + Crystal Specular
export function createCelToonMaterial({
  name = 'Elysia · Cel Toon',
  shadowTint = 0xcbbbe8,
  rimTint = 0xfff0fa,
  rimStrength = 0.26,
  angelRing = false,
  specular = 0.0,
  emissive = 0.0,
  side = T.DoubleSide
} = {}) {
  return new T.ShaderMaterial({
    name,
    side,
    uniforms: {
      uLightDir: SHARED_UNIFORMS.uLightDir,
      uSunTint: SHARED_UNIFORMS.uSunTint,
      uShadowTint: { value: new T.Color(shadowTint) },
      uRimTint: { value: new T.Color(rimTint) },
      uRimStrength: { value: rimStrength },
      uAngelRing: { value: angelRing ? 1.0 : 0.0 },
      uSpecular: { value: specular },
      uEmissive: { value: emissive }
    },
    vertexShader: `
      attribute vec3 color;
      varying vec3 vColor;
      varying vec3 vWorldNormal;
      varying vec3 vViewNormal;
      varying vec3 vViewPos;
      varying vec3 vLocalPos;
      void main() {
        vColor = color;
        vLocalPos = position;
        vWorldNormal = normalize(mat3(modelMatrix) * normal);
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vViewPos = -mv.xyz;
        vViewNormal = normalize(normalMatrix * normal);
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: `
      uniform vec3 uLightDir;
      uniform vec3 uSunTint;
      uniform vec3 uShadowTint;
      uniform vec3 uRimTint;
      uniform float uRimStrength;
      uniform float uAngelRing;
      uniform float uSpecular;
      uniform float uEmissive;
      varying vec3 vColor;
      varying vec3 vWorldNormal;
      varying vec3 vViewNormal;
      varying vec3 vViewPos;
      varying vec3 vLocalPos;
      void main() {
        vec3 N = normalize(vWorldNormal);
        vec3 VN = normalize(vViewNormal);
        vec3 V = normalize(vViewPos);
        if (!gl_FrontFacing) { N = -N; VN = -VN; }

        // Soft harmonious 2-tone cel ramp (avoid harsh paper-cutout blowout)
        float ndl = dot(N, normalize(uLightDir));
        float cel = smoothstep(-0.14, 0.16, ndl);
        float midBand = smoothstep(-0.42, 0.40, ndl);
        vec3 shadowCol = vColor * uShadowTint * 0.96;
        vec3 litCol = vColor * mix(vec3(0.92, 0.91, 0.95), vec3(1.00, 0.99, 1.00), midBand);
        vec3 col = mix(shadowCol, litCol, cel);

        // Soft horizontal Hair Angel Ring highlight (subtle, not blinding white spots)
        if (uAngelRing > 0.5) {
          vec3 VL = normalize((viewMatrix * vec4(uLightDir, 0.0)).xyz);
          vec3 H = normalize(V + VL);
          float strandZig = sin(vLocalPos.x * 95.0 + vLocalPos.z * 65.0) * 0.012;
          float crownBand = exp(-pow((vLocalPos.y - 0.205 + strandZig) / 0.036, 2.0));
          float specEnv = smoothstep(0.45, 0.78, dot(VN, H));
          float ring = smoothstep(0.38, 0.68, crownBand * specEnv);
          col = mix(col, vec3(1.0, 0.92, 0.96), ring * 0.32);
        }

        // Crisp jewelry / crystal specular sparkle
        if (uSpecular > 0.01) {
          vec3 VL = normalize((viewMatrix * vec4(uLightDir, 0.0)).xyz);
          vec3 H = normalize(V + VL);
          float sp = smoothstep(0.85, 0.94, max(0.0, dot(VN, H)));
          col += vec3(1.0, 0.97, 0.94) * sp * uSpecular;
        }

        // Sharp anime backlit rim band
        float fresnel = 1.0 - max(0.0, dot(VN, V));
        float rim = smoothstep(0.56, 0.70, fresnel) * smoothstep(-0.35, 0.45, ndl + 0.38);
        col += uRimTint * rim * uRimStrength;

        // Luminous crystal emissive boost (for Elysia's floating crystal blossom)
        col += vColor * uEmissive;

        gl_FragColor = vec4(col * uSunTint, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `
  });
}

// 3. Smoothed-normal Inverted-Hull Colored Anime Outline Mesh
// Welds coincident vertex positions for crack-free smooth extrusion normals,
// and shares the live position buffer so dynamic cloth/hair outlines move in lockstep.
export function buildOutlineMesh(sourceMesh, outlineColor = 0x7c496f, width = 0.0020) {
  const src = sourceMesh.geometry;
  const pos = src.attributes.position.array;
  const norm = src.attributes.normal.array;
  const count = src.attributes.position.count;
  const smooth = new Float32Array(pos.length);
  const buckets = new Map();

  for (let i = 0; i < count; i++) {
    const j = i * 3;
    const key = `${Math.round(pos[j] * 2500)},${Math.round(pos[j + 1] * 2500)},${Math.round(pos[j + 2] * 2500)}`;
    let acc = buckets.get(key);
    if (!acc) { acc = [0, 0, 0]; buckets.set(key, acc); }
    acc[0] += norm[j]; acc[1] += norm[j + 1]; acc[2] += norm[j + 2];
  }
  for (let i = 0; i < count; i++) {
    const j = i * 3;
    const key = `${Math.round(pos[j] * 2500)},${Math.round(pos[j + 1] * 2500)},${Math.round(pos[j + 2] * 2500)}`;
    const a = buckets.get(key);
    const l = Math.hypot(a[0], a[1], a[2]) || 1;
    smooth[j] = a[0] / l; smooth[j + 1] = a[1] / l; smooth[j + 2] = a[2] / l;
  }

  const g = new T.BufferGeometry();
  g.setAttribute('position', src.attributes.position);
  g.setAttribute('aOutlineNormal', new T.BufferAttribute(smooth, 3));
  g.setIndex(src.index);
  g.boundingSphere = src.boundingSphere.clone();

  const mat = new T.ShaderMaterial({
    name: 'Elysia · Anime Outline',
    side: T.BackSide,
    uniforms: {
      uColor: { value: new T.Color(outlineColor) },
      uWidth: { value: width },
      uSunTint: SHARED_UNIFORMS.uSunTint
    },
    vertexShader: `
      attribute vec3 aOutlineNormal;
      uniform float uWidth;
      void main() {
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        float dist = max(0.30, -mv.z);
        float w = uWidth * clamp(dist * 0.40, 0.50, 2.1);
        vec3 extruded = position + aOutlineNormal * w;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(extruded, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 uColor;
      uniform vec3 uSunTint;
      void main() {
        gl_FragColor = vec4(uColor * uSunTint, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `
  });

  const outline = new T.Mesh(g, mat);
  outline.name = sourceMesh.name + ' · outline';
  outline.userData.isOutline = true;
  outline.frustumCulled = true;
  return outline;
}
