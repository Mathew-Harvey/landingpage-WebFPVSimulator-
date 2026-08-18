/*
 * cel.js: the simulator's rendering look, ported to a page that has none of
 * the simulator's code.
 *
 * The landing page cannot import from the simulator repo, so the recipe is
 * restated here rather than linked. It is a faithful port of
 * WebFPVSimulator/src/render/celmat.js and is deliberately smaller: there is
 * no cloud shadow term and no cloth wave, because this page has no landscape
 * and no flags on poles. What is kept is what makes the picture:
 *
 *   1. Three.js splats the toon gradient map's RED channel to grey before it
 *      reaches a pixel, which throws away the whole point of a ramp whose
 *      shadow and light are different HUES. The chunk is patched once, at
 *      import, so the ramp is sampled in colour. The guard matters: a Three
 *      version bump that rewords the line would otherwise drop the page back
 *      to greyscale with nothing to show for it.
 *
 *   2. A four band ramp, cool shadow to warm light, with uneven steps: a
 *      wide lit band, a narrow warm terminator, then two shadow bands. Most
 *      of a curved surface reads as one flat shape with a crisp edge, which
 *      is what makes it look drawn rather than shaded.
 *
 *   3. A rim term that is a cubed falloff, not a step, and that is scaled by
 *      the luminance of the surface under it, so a rim on a near black
 *      carbon plate does not become the brightest thing in frame.
 *
 *   4. A stepped specular, so a highlight is a shape rather than a smear.
 *
 *   5. An inverted hull outline on hero parts. This page has no depth edge
 *      post pass, so the hull is the only line work and it carries more of
 *      the load here than it does in the simulator.
 *
 * This file is part of the WebFPVSimulator landing page.
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or (at
 * your option) any later version.
 *
 * This program is distributed in the hope that it will be useful, but
 * WITHOUT ANY WARRANTY, without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU
 * General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program. If not, see <https://www.gnu.org/licenses/>.
 */

import * as THREE from 'three';

{
  const before = THREE.ShaderChunk.gradientmap_pars_fragment;
  const after = before.replace(
    'vec3( texture2D( gradientMap, coord ).r )',
    'texture2D( gradientMap, coord ).rgb',
  );
  if (after === before) {
    /* Not fatal on a landing page the way it is in the simulator: a grey
     * hero is worse than a coloured one but it is not a broken page, and a
     * thrown error here would leave a visitor looking at the boot screen
     * forever. Say so loudly and carry on. */
    console.warn(
      'cel: could not patch gradientmap_pars_fragment for RGB toon ramps. '
      + 'Three.js changed the chunk; shading falls back to greyscale bands.',
    );
  } else {
    THREE.ShaderChunk.gradientmap_pars_fragment = after;
  }
}

function celRamp() {
  const stops = [
    [0.30, 0.38, 0.62], /* deep shadow, sky blue bounce */
    [0.42, 0.51, 0.72], /* shadow */
    [0.94, 0.80, 0.62], /* terminator, warm sliver where light wraps */
    [1.00, 0.97, 0.88], /* sunlit */
  ];
  const width = 64;
  const data = new Uint8Array(width * 4);
  for (let i = 0; i < width; i += 1) {
    const t = i / (width - 1);
    let band = 0;
    if (t > 0.36) band = 1;
    if (t > 0.46) band = 2;
    if (t > 0.53) band = 3;
    const c = stops[band];
    data[i * 4 + 0] = Math.round(c[0] * 255);
    data[i * 4 + 1] = Math.round(c[1] * 255);
    data[i * 4 + 2] = Math.round(c[2] * 255);
    data[i * 4 + 3] = 255;
  }
  const tex = new THREE.DataTexture(data, width, 1, THREE.RGBAFormat);
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.needsUpdate = true;
  return tex;
}

let RAMP = null;
export function celRampTexture() {
  if (!RAMP) {
    RAMP = celRamp();
  }
  return RAMP;
}

const RIM_CHUNK = /* glsl */ `
  vec3 celN = normalize(vNormal);
  vec3 celV = normalize(vViewPosition);
  float celRim = 1.0 - max(dot(celN, celV), 0.0);
  celRim = smoothstep(uRimStart, 1.0, celRim);
  celRim = celRim * celRim * celRim;
  float celRimLum = dot(gl_FragColor.rgb, vec3(0.2126, 0.7152, 0.0722));
  float celRimFit = mix(0.30, 1.0, clamp(celRimLum * 1.7, 0.0, 1.0));
  gl_FragColor.rgb += uRimColor * (celRim * uRimStrength * celRimFit);

  float celSpec = max(dot(reflect(-celV, celN), normalize(uSpecDir)), 0.0);
  celSpec = step(0.985 - uSpecWidth, celSpec);
  gl_FragColor.rgb += uSpecColor * celSpec * uSpecStrength;
`;

/*
 * opts: color, rim, rimStart, rimColor, spec, specWidth, specColor, map,
 * side, fog, transparent, opacity, alphaTest, emissive-ish extras are not
 * supported and are not wanted; a cel surface that glows is a basic
 * material, not this one.
 */
export function celMaterial(opts = {}) {
  const mat = new THREE.MeshToonMaterial({
    color: opts.color ?? 0xffffff,
    gradientMap: celRampTexture(),
    map: opts.map ?? null,
    alphaTest: opts.alphaTest ?? 0,
    transparent: opts.transparent ?? false,
    opacity: opts.opacity ?? 1,
    side: opts.side ?? THREE.FrontSide,
    fog: opts.fog ?? true,
  });
  const rimColor = new THREE.Color(opts.rimColor ?? 0x9ec8ff);
  const specColor = new THREE.Color(opts.specColor ?? 0xffffff);
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uRimColor = { value: rimColor };
    shader.uniforms.uRimStrength = { value: opts.rim ?? 0.32 };
    shader.uniforms.uRimStart = { value: opts.rimStart ?? 0.55 };
    shader.uniforms.uSpecColor = { value: specColor };
    shader.uniforms.uSpecStrength = { value: opts.spec ?? 0.0 };
    shader.uniforms.uSpecWidth = { value: opts.specWidth ?? 0.01 };
    shader.uniforms.uSpecDir = { value: new THREE.Vector3(0.45, 0.8, 0.4) };

    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
         uniform vec3 uRimColor;
         uniform float uRimStrength;
         uniform float uRimStart;
         uniform vec3 uSpecColor;
         uniform float uSpecStrength;
         uniform float uSpecWidth;
         uniform vec3 uSpecDir;`,
      )
      .replace(
        '#include <dithering_fragment>',
        `#include <dithering_fragment>
${RIM_CHUNK}`,
      );
  };
  mat.userData.cel = true;
  return mat;
}

/*
 * Inverted hull outline. The hull SHARES the mesh's geometry and is added as
 * a child, so it follows every transform for free and costs one extra draw.
 *
 * It is scaled about the GEOMETRY'S OWN CENTRE, not about the mesh origin,
 * and that distinction is the whole of this function. The simulator scales
 * about the origin, which is right there because every part it hulls is
 * modelled around its own origin. Here an arm is a 110 mm stick whose
 * geometry starts at the airframe centre and ends at a motor: scaling that
 * about the origin does not outline it, it moves it 5 mm outboard and leaves
 * a black crescent hanging past the motor pad. Scaling about the part's own
 * bounding box centre puts the line where the part is.
 *
 * The line is still thicker along a part's long axis than across it, which
 * is inherent to a uniformly scaled hull, so elongated parts take a smaller
 * factor. That is why the numbers at the call sites are per part.
 */
const hullCentre = new THREE.Vector3();
export function outlineHull(mesh, thickness = 1.05, color = 0x0c120e) {
  const geo = mesh.geometry;
  if (!geo.boundingBox) {
    geo.computeBoundingBox();
  }
  geo.boundingBox.getCenter(hullCentre);
  const hull = new THREE.Mesh(
    geo,
    new THREE.MeshBasicMaterial({ color, side: THREE.BackSide, fog: true }),
  );
  hull.scale.setScalar(thickness);
  /* v_world = c + k(v - c), written as a scale plus this offset. */
  hull.position.copy(hullCentre).multiplyScalar(1 - thickness);
  hull.castShadow = false;
  hull.receiveShadow = false;
  hull.userData.isHull = true;
  mesh.add(hull);
  return mesh;
}

/*
 * Every colour the three pages share, as numbers this file's callers can use
 * without importing CSS. Kept beside the material factory because a palette
 * that lives away from the shader is a palette that drifts from it.
 */
export const PALETTE = {
  cream: 0xf3ead4,
  sakura: 0xe8a8b8,
  amber: 0xffd45c,
  mint: 0x7dffb4,
  slate: 0x9db3c8,
  deep: 0x141c16,
  panel: 0x1a241c,
  ink: 0x0c120e,

  /* The airframe, from the simulator's herocraft.js. */
  /* A shade lighter than the simulator's 0x1c241e. There the airframe is
   * seen against grass and sky; here it is seen against a near black studio,
   * and a body the same value as its background is a silhouette. */
  carbon: 0x232c26,
  carbonDeep: 0x121810,
  livery: 0xe8dcc0,
  brass: 0xc4b48a,
  pcb: 0x2a4a38,
  canopy: 0xe8a8b8,
  canopyDeep: 0xc47888,
  bell: 0xd8d0c4,
  stator: 0x2a322c,
  camBody: 0x141c16,
  ring: 0xb8b09e,
  battery: 0x161c18,
  tape: 0xdcd6ca,
  strap: 0x1a241c,
  propFront: 0xe890a8,
  propRear: 0x4a554c,
  xt60: 0xe8c04a,

  /* The course, from the simulator's scene.js. */
  frame: 0x9aa2b0,
  fitting: 0x767f8f,
  /* Deliberately one step BELOW the sky. A pure white banner inverts the
   * whole value structure of the picture and the sky stops being the
   * brightest thing in it. */
  vinyl: 0xdcd6ca,
  hem: 0xe4d9bf,
  numberInk: 0x18202f,
  gateLit: 0xffd45c,
  startLit: 0x7dffb4,
  nextLit: 0x39ff8b,
};
