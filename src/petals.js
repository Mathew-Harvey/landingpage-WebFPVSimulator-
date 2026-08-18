/*
 * petals.js: sakura on the air.
 *
 * The simulator's freestyle city has a petal system of its own, and sakura
 * runs through the whole product: it is the wordmark's second colour, the
 * canopy the quad wears, the print on the gates, and the chrome on all three
 * pages. This page had it everywhere except in the air, which is the one
 * place it moves.
 *
 * The whole field is ONE draw call and the CPU touches nothing per frame
 * except two uniforms. Every petal's position, drift, sway and tumble is
 * computed in the vertex shader from a per instance seed and a clock, and
 * the field WRAPS inside a box that follows the camera. So the same 180
 * petals serve a 1.6 m studio and a 40 m race field: only the box changes.
 * A JavaScript particle system doing this would be 180 objects, 180 matrix
 * updates and 180 draw calls a frame, for a decoration.
 *
 * They tumble rather than billboard. A field of quads all facing the lens is
 * a field of stickers; a petal that goes edge on and disappears for a moment
 * is the thing that reads as falling.
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
import { LITE } from './quality.js';

const COUNT = LITE ? 70 : 180;

/*
 * One petal, painted. A cherry blossom petal is an oval with a notch cut in
 * its wide end and a slightly darker throat; drawn as a plain ellipse it
 * reads as confetti, and confetti is a birthday rather than a season.
 */
function petalTexture() {
  const size = 64;
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d');

  ctx.translate(size * 0.5, size * 0.5);
  const g = ctx.createLinearGradient(0, -size * 0.45, 0, size * 0.45);
  g.addColorStop(0, 'rgba(255, 255, 255, 1)');
  g.addColorStop(0.45, 'rgba(255, 232, 240, 1)');
  g.addColorStop(1, 'rgba(226, 150, 176, 1)');
  ctx.fillStyle = g;

  ctx.beginPath();
  /* Narrow stem end at the bottom, wide notched end at the top. */
  ctx.moveTo(0, size * 0.44);
  ctx.bezierCurveTo(size * 0.30, size * 0.20, size * 0.34, -size * 0.18, size * 0.16, -size * 0.40);
  /* The notch. */
  ctx.quadraticCurveTo(size * 0.06, -size * 0.28, 0, -size * 0.33);
  ctx.quadraticCurveTo(-size * 0.06, -size * 0.28, -size * 0.16, -size * 0.40);
  ctx.bezierCurveTo(-size * 0.34, -size * 0.18, -size * 0.30, size * 0.20, 0, size * 0.44);
  ctx.closePath();
  ctx.fill();

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function buildPetals() {
  const base = new THREE.PlaneGeometry(1, 1);
  const geo = new THREE.InstancedBufferGeometry();
  geo.index = base.index;
  geo.attributes.position = base.attributes.position;
  geo.attributes.uv = base.attributes.uv;
  geo.instanceCount = COUNT;

  /*
   * A fixed stream, so the drift is the same on every load and a screenshot
   * taken today matches one taken tomorrow. x, y, z place the petal in the
   * unit box; w is its personal phase, and everything that should differ
   * between two petals is driven off it.
   */
  const seeds = new Float32Array(COUNT * 4);
  let s = 8675309;
  const rnd = () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
  for (let i = 0; i < COUNT; i += 1) {
    seeds[i * 4 + 0] = rnd();
    seeds[i * 4 + 1] = rnd();
    seeds[i * 4 + 2] = rnd();
    seeds[i * 4 + 3] = rnd();
  }
  geo.setAttribute('aSeed', new THREE.InstancedBufferAttribute(seeds, 4));

  const mat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    fog: false,
    side: THREE.DoubleSide,
    uniforms: {
      uMap: { value: petalTexture() },
      uTime: { value: 0 },
      uCentre: { value: new THREE.Vector3() },
      uBox: { value: new THREE.Vector3(1.6, 1.2, 1.6) },
      uSize: { value: 0.05 },
      uOpacity: { value: 0 },
      /* Almost white. The texture already carries the blossom's own
       * gradient from a white edge to a rose throat, and tinting it again
       * on top pushed the whole field toward plastic pink. */
      uColor: { value: new THREE.Color(0xfff0f5) },
      uNear: { value: 0.4 },
    },
    vertexShader: `
      attribute vec4 aSeed;
      uniform float uTime;
      uniform vec3 uCentre;
      uniform vec3 uBox;
      uniform float uSize;
      uniform float uNear;
      varying vec2 vUv;
      varying float vShade;
      varying float vFade;

      void main() {
        vUv = uv;
        float t = uTime;
        float ph = aSeed.w;

        /*
         * Wrapping in the box. fract() on a value that only ever increases
         * gives an endless fall with no bookkeeping and no respawn: a petal
         * that leaves the bottom is the same petal arriving at the top.
         */
        vec3 cell;
        cell.x = fract(aSeed.x + t * 0.006 * (0.4 + ph));
        cell.y = fract(aSeed.y - t * 0.035 * (0.55 + ph * 0.9));
        cell.z = fract(aSeed.z + t * 0.010 * (0.3 + aSeed.x));
        vec3 world = uCentre + (cell * 2.0 - 1.0) * uBox;

        /* Sway, scaled to the box so it reads the same at 1.6 m and 40 m. */
        world.x += sin(t * 0.9 + ph * 9.0) * uBox.x * 0.035;
        world.z += cos(t * 0.7 + ph * 7.0) * uBox.z * 0.035;

        /* Tumble. Two angles: one spins the petal in its own plane, the
           other turns it edge on and back, which is what makes it flutter
           rather than rotate. */
        float a = t * (0.7 + ph * 1.5) + ph * 12.0;
        float b = t * (0.5 + aSeed.x * 1.2) + aSeed.x * 8.0;
        float ca = cos(a);
        float sa = sin(a);
        vec2 q = position.xy * uSize * (0.65 + ph * 0.7);
        vec2 r = vec2(q.x * ca - q.y * sa, q.x * sa + q.y * ca);
        r.x *= abs(cos(b)) * 0.85 + 0.15;
        vShade = 0.62 + 0.38 * abs(cos(b));

        vec4 view = viewMatrix * vec4(world, 1.0);
        view.xy += r;

        /* A petal against the lens is a smear, so the nearest ones fade out
           rather than filling the frame with pink. */
        vFade = smoothstep(uNear, uNear * 3.0, -view.z);

        gl_Position = projectionMatrix * view;
      }`,
    fragmentShader: `
      uniform sampler2D uMap;
      uniform float uOpacity;
      uniform vec3 uColor;
      varying vec2 vUv;
      varying float vShade;
      varying float vFade;
      void main() {
        vec4 tex = texture2D(uMap, vUv);
        float a = tex.a * uOpacity * vFade;
        if (a < 0.004) discard;
        gl_FragColor = vec4(tex.rgb * uColor * vShade, a);
      }`,
  });

  const mesh = new THREE.Mesh(geo, mat);
  mesh.frustumCulled = false;
  mesh.renderOrder = 4;
  mesh.visible = false;

  let clock = 0;
  let started = false;
  const box = mat.uniforms.uBox.value;

  /*
   * `strength` is how present they are, 0 to 1. `scale` is the half extent
   * of the box in metres, eased toward rather than set, so the act changes
   * do not teleport a petal from one side of a field to the other.
   */
  function update(dt, centre, strength, scale, size) {
    clock += dt;
    mat.uniforms.uTime.value = clock;
    mat.uniforms.uOpacity.value = strength;
    mesh.visible = strength > 0.01;
    if (!mesh.visible) {
      return;
    }
    mat.uniforms.uCentre.value.copy(centre);
    /* Snapped the first time, eased after. Easing from the constructor's
     * placeholder means the opening plays with the field growing into its
     * size, which reads as the petals themselves shrinking. */
    const k = started ? Math.min(1, dt * 1.6) : 1;
    started = true;
    box.x += (scale - box.x) * k;
    box.y += (scale * 0.75 - box.y) * k;
    box.z += (scale - box.z) * k;
    mat.uniforms.uSize.value += (size - mat.uniforms.uSize.value) * k;
    mat.uniforms.uNear.value = Math.max(0.25, scale * 0.14);
  }

  return { mesh, update };
}
