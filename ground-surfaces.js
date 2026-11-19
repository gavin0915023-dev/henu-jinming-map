import * as T from 'three';

// World units are metres. These finishes decorate the existing triangles rather
// than adding a second plane, so road/plaza heights and depth ordering stay intact.
const finishNames = ['untreated', 'stone', 'pavers', 'asphalt', 'sport', 'grass', 'concrete'];
const palette = new Map();
const colorKey = (r, g, b) => Math.round(r * 65535) * 4294967296 + Math.round(g * 65535) * 65536 + Math.round(b * 65535);
function register(kind, colors) {
  for (const hex of colors) {
    const c = new T.Color(hex);
    palette.set(colorKey(c.r, c.g, c.b), kind);
  }
}
register(1, ['#a29990','#b1a99b']); // Plazas and broad pedestrian promenades.
register(2, ['#a4aa8b']); // Pedestrian paths.
register(3, ['#777c7b', '#8a8c86']); // Arterial and internal carriageways.
register(4, ['#a96754', '#6b9176', '#b1846d', '#7d9277', '#548183', '#85a29a', '#4e7c84', '#608676', '#b58a67']);
register(5, ['#687e56', '#61784e', '#777f58', '#66875c', '#66895a', '#668c5c', '#719965']);
register(6, ['#c4c2aa']); // Raised concrete kerbs, only their horizontal faces.

const applied = new WeakMap();
const vertexDeclarations = /* glsl */ `
attribute float campusSurfaceKind;
varying vec3 vCampusSurfacePosition;
varying float vCampusSurfaceKind;
`;
const vertexPosition = /* glsl */ `
vec4 campusGroundWorldPosition = vec4(transformed, 1.0);
#ifdef USE_BATCHING
  campusGroundWorldPosition = batchingMatrix * campusGroundWorldPosition;
#endif
#ifdef USE_INSTANCING
  campusGroundWorldPosition = instanceMatrix * campusGroundWorldPosition;
#endif
vCampusSurfacePosition = (modelMatrix * campusGroundWorldPosition).xyz;
vCampusSurfaceKind = campusSurfaceKind;
`;
const fragmentDeclarations = /* glsl */ `
uniform float uCampusSurfaceStrength;
varying vec3 vCampusSurfacePosition;
varying float vCampusSurfaceKind;

float campusGroundHash(vec2 p) {
  vec3 q = fract(vec3(p.xyx) * .1031);
  q += dot(q, q.yzx + 33.33);
  return fract((q.x + q.y) * q.z);
}
float campusGroundNoise(vec2 p) {
  vec2 cell = floor(p), f = fract(p);
  vec2 t = f * f * (3.0 - 2.0 * f);
  return mix(mix(campusGroundHash(cell), campusGroundHash(cell + vec2(1.0, 0.0)), t.x),
             mix(campusGroundHash(cell + vec2(0.0, 1.0)), campusGroundHash(cell + 1.0), t.x), t.y);
}
// Every octave disappears before its texels become smaller than a pixel. The
// high-frequency aggregate cannot shimmer during a flyover or grazing view.
float campusGroundGrain(vec2 p, float frequency, float footprint) {
  float resolved = 1.0 - smoothstep(.20, .72, footprint * frequency);
  return (campusGroundNoise(p * frequency) - .5) * resolved;
}
// x: luminance multiplier, y: physical bump height (metres), z: roughness delta.
vec3 campusGroundFinish(vec2 p, float kind) {
  vec2 dx = dFdx(p), dy = dFdy(p);
  vec2 edgeAA = max(abs(dx) + abs(dy), vec2(.00001));
  float footprint = max(length(dx), length(dy));
  if (kind < .5) return vec3(1.0, 0.0, 0.0);

  if (kind < 2.5) {
    // Large 600 mm stone slabs on plazas; 300 x 150 mm staggered path pavers.
    vec2 tile = kind < 1.5 ? vec2(.60) : vec2(.30, .15);
    float jointWidth = kind < 1.5 ? .006 : .004;
    vec2 q = p / tile;
    float row = floor(q.y);
    if (kind > 1.5) q.x += mod(row, 2.0) * .5;
    vec2 unit = fract(q);
    vec2 distanceToJoint = min(unit, 1.0 - unit) * tile;
    vec2 joint = 1.0 - smoothstep(vec2(jointWidth * .35) - edgeAA * .5,
                                 vec2(jointWidth * .65) + edgeAA * .5, distanceToJoint);
    float visible = 1.0 - smoothstep(min(tile.x, tile.y) * .08,
                                     min(tile.x, tile.y) * .38, footprint);
    float seam = max(joint.x, joint.y) * visible;
    float slabTone = (campusGroundHash(floor(q)) - .5) * visible;
    float pores = campusGroundGrain(p + 17.0, 115.0, footprint);
    return vec3(1.0 + slabTone * .13 - seam * .28 + pores * .060,
                -seam * .0009 + pores * .00020, seam * .025 + pores * .025);
  }
  if (kind < 3.5) {
    // Asphalt aggregate is roughly 4–12 mm, with no repeated bitmap tile.
    float aggregate = campusGroundGrain(p, 85.0, footprint);
    float fine = campusGroundGrain(p + 41.0, 240.0, footprint);
    return vec3(1.0 + aggregate * .10 + fine * .035,
                aggregate * .00065 + fine * .00020, aggregate * .045 + .015);
  }
  if (kind < 4.5) {
    float rubber = campusGroundGrain(p + 29.0, 145.0, footprint);
    float fine = campusGroundGrain(p, 270.0, footprint);
    return vec3(1.0 + rubber * .040 + fine * .018,
                rubber * .00020, rubber * .025);
  }
  if (kind < 5.5) {
    float soft = campusGroundGrain(p, .9, footprint);
    float blade = campusGroundGrain(p + 3.0, 54.0, footprint);
    return vec3(1.0 + soft * .035 + blade * .028, blade * .00065, .02);
  }
  float sand = campusGroundGrain(p + 7.0, 100.0, footprint);
  return vec3(1.0 + sand * .045, sand * .00018, sand * .025);
}
// Derivative bump mapping uses metre-scale relief. In particular this does not
// displace the ground or interfere with existing court/road marking geometry.
vec3 campusGroundBump(vec3 position, vec3 surfaceNormal, float height, float direction) {
  vec3 sigmaX = dFdx(position), sigmaY = dFdy(position);
  vec3 r1 = cross(sigmaY, surfaceNormal), r2 = cross(surfaceNormal, sigmaX);
  float det = dot(sigmaX, r1) * direction;
  if (abs(det) < .0000000001) return surfaceNormal;
  vec3 gradient = sign(det) * (dFdx(height) * r1 + dFdy(height) * r2);
  return normalize(abs(det) * surfaceNormal - gradient);
}
`;

function inject(source, marker, code, after = true) {
  if (!source.includes(marker)) throw new Error(`Ground finish shader hook unavailable: ${marker}`);
  return source.replace(marker, after ? `${marker}\n${code}` : `${code}\n${marker}`);
}
function decorateMaterial(source, strength) {
  const material = source.clone();
  const previousCompile = source.onBeforeCompile;
  const previousKey = source.customProgramCacheKey();
  material.onBeforeCompile = function (shader, renderer) {
    previousCompile.call(this, shader, renderer);
    shader.uniforms.uCampusSurfaceStrength = strength;
    shader.vertexShader = inject(shader.vertexShader, '#include <common>', vertexDeclarations);
    shader.vertexShader = inject(shader.vertexShader, '#include <project_vertex>', vertexPosition);
    shader.fragmentShader = inject(shader.fragmentShader, '#include <common>', fragmentDeclarations);
    shader.fragmentShader = inject(shader.fragmentShader, '#include <color_fragment>', /* glsl */ `
      vec3 campusFinish = campusGroundFinish(vCampusSurfacePosition.xz, vCampusSurfaceKind);
      diffuseColor.rgb *= max(0.0, 1.0 + (campusFinish.x - 1.0) * uCampusSurfaceStrength);
    `);
    shader.fragmentShader = inject(shader.fragmentShader, '#include <roughnessmap_fragment>', /* glsl */ `
      roughnessFactor = clamp(roughnessFactor + campusFinish.z * uCampusSurfaceStrength, .55, 1.0);
    `);
    shader.fragmentShader = inject(shader.fragmentShader, '#include <normal_fragment_maps>', /* glsl */ `
      normal = campusGroundBump(-vViewPosition, normal, campusFinish.y * uCampusSurfaceStrength, faceDirection);
    `);
  };
  material.customProgramCacheKey = () => `${previousKey}|campus-ground-finishes-v1`;
  material.name = `${source.name || source.type} — campus ground finish`;
  material.needsUpdate = true;
  return material;
}

/**
 * Finish an existing ground mesh or landscape-detail group in place.
 *
 *   applyGroundSurfaceTextures(landscape);
 *   applyGroundSurfaceTextures(landscapeDetails.group);
 *
 * Uses the established ground vertex colours to select a finish. Horizontal
 * paving/roads/lawns/courts are treated; white markings, water, benches and lamp
 * fittings retain their materials. No meshes, triangles, texture images, UVs or
 * extra draw calls are introduced. Calling again updates strength without
 * stacking shader hooks. The return value contains plain verification stats.
 */
export function applyGroundSurfaceTextures(target, { strength = 1 } = {}) {
  if (!target?.traverse) throw new TypeError('Ground finish target must be a Three.js mesh or group.');
  const amount = Math.max(0, Math.min(2, Number.isFinite(strength) ? strength : 1));
  const stats = { meshes: 0, vertices: 0, texturedVertices: 0, triangles: 0, categories: {} };
  target.updateWorldMatrix(true, true);
  target.traverse(mesh => {
    if (!mesh.isMesh || mesh.isInstancedMesh) return;
    const existing = applied.get(mesh);
    if (existing) {
      existing.strength.value = amount;
      accumulate(existing.stats);
      return;
    }
    const geometry = mesh.geometry, position = geometry?.getAttribute('position');
    const color = geometry?.getAttribute('color'), normal = geometry?.getAttribute('normal');
    const sourceMaterials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    if (!position || !color || !normal || !sourceMaterials.every(m => m?.isMeshStandardMaterial)) return;
    const kinds = new Uint8Array(position.count), counts = new Array(finishNames.length).fill(0);
    const normalMatrix = new T.Matrix3().getNormalMatrix(mesh.matrixWorld), n = new T.Vector3();
    let selected = 0;
    for (let i = 0; i < position.count; i++) {
      n.fromBufferAttribute(normal, i).applyNormalMatrix(normalMatrix);
      // A hard per-vertex tag leaves vertical kerb/furniture faces untouched.
      const kind = Math.abs(n.y) > .85 ? palette.get(colorKey(color.getX(i), color.getY(i), color.getZ(i))) || 0 : 0;
      kinds[i] = kind;
      if (kind) { selected++; counts[kind]++; }
    }
    if (!selected) return;
    geometry.setAttribute('campusSurfaceKind', new T.Uint8BufferAttribute(kinds, 1, false));
    const uniform = { value: amount };
    const materials = sourceMaterials.map(material => decorateMaterial(material, uniform));
    mesh.material = Array.isArray(mesh.material) ? materials : materials[0];
    const result = {
      meshes: 1, vertices: position.count, texturedVertices: selected,
      triangles: (geometry.index ? geometry.index.count : position.count) / 3,
      categories: Object.fromEntries(counts.map((count, i) => [finishNames[i], count]).filter(([name, count]) => name !== 'untreated' && count))
    };
    applied.set(mesh, { strength: uniform, stats: result });
    accumulate(result);
  });
  return stats;

  function accumulate(result) {
    stats.meshes += result.meshes;
    stats.vertices += result.vertices;
    stats.texturedVertices += result.texturedVertices;
    stats.triangles += result.triangles;
    for (const [kind, count] of Object.entries(result.categories)) stats.categories[kind] = (stats.categories[kind] || 0) + count;
  }
}
