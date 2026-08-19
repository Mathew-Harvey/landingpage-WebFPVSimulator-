/*
 * stage.js: the renderer, the light and the frame loop. Nothing that knows
 * what is being drawn.
 *
 * Two lighting rigs live here and the page crossfades between them, because
 * the page is two places: a dark studio where a machine is built, and a
 * field at golden hour where it is flown. Doing that with one sun whose
 * colour and intensity move, plus a rim that only exists in the studio, is
 * cheaper and steadier than swapping scenes, and it means the quad that
 * leaves the studio is literally the same object that arrives at the track.
 *
 * The near and far planes MOVE. A studio shot frames a 0.155 m airframe from
 * 0.4 m away and a race shot frames a 60 m course; one clip range that
 * covers both is a depth buffer with nothing left for either. So the caller
 * says which regime it is in and this file sets the planes to suit.
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
import { HORIZON, STUDIO } from './course.js';
import { LITE } from './quality.js';

/*
 * The studio's three lamps.
 *
 * Key: a warm lamp high and to the front right, which is where a product
 * photographer puts one.
 *
 * Rim: low and behind, and it is the light that separates a near black
 * airframe from a dark background. It used to be a cold blue, which is the
 * default choice and the wrong one here: the rim is the brightest edge on
 * the hero for the whole first act, so it is the single best place to put
 * the game's own sakura. Warm rim against cool carbon also does more
 * separating than a cool rim against a cool body did.
 *
 * Kick: high and behind on the opposite side, barely tinted, so the top
 * edges of the arms read without a third hue arriving.
 */
const STUDIO_KEY = new THREE.Color(0xfff0d8);
const STUDIO_RIM = new THREE.Color(0xf0aec0);
const STUDIO_KICK = new THREE.Color(0xe6d4dc);
const SUN_COLOUR = new THREE.Color(0xffcfb4);

export function createStage(canvas) {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    powerPreference: 'high-performance',
    alpha: false,
  });
  renderer.setClearColor(STUDIO, 1);
  /*
   * No shadow map on a phone. It is the single most expensive thing here:
   * the drone alone is around 180 casters, and a shadow pass draws all of
   * them a second time before a single lit pixel exists. The painted blob
   * below covers the two shots where the quad's own shadow is actually seen,
   * and nothing else in the scene casts one worth the pass.
   */
  renderer.shadowMap.enabled = !LITE;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  /* Two is enough on a retina panel and four is a phone catching fire for
   * no visible gain. A phone gets 1.5: at 3x the fill rate alone is most of
   * the frame budget. */
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, LITE ? 1.5 : 2));

  const scene = new THREE.Scene();
  scene.background = STUDIO.clone();
  scene.fog = new THREE.Fog(STUDIO.clone(), 0.5, 2.6);

  const camera = new THREE.PerspectiveCamera(34, 1, 0.01, 20);

  const key = new THREE.DirectionalLight(STUDIO_KEY, 3.25);
  key.position.set(0.42, 0.70, 0.55);
  key.castShadow = !LITE;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.camera.near = 0.02;
  key.shadow.camera.far = 4;
  key.shadow.bias = -0.0009;
  key.shadow.normalBias = 0.004;
  scene.add(key);
  scene.add(key.target);

  const rim = new THREE.DirectionalLight(STUDIO_RIM, 2.15);
  rim.position.set(-0.7, 0.28, -0.62);
  scene.add(rim);

  /* The kicker: high, behind, and on the opposite side to the key. It is
   * what puts a bright edge along the top of every arm, and it is the
   * difference between a product shot and a photograph of a shadow. */
  const kick = new THREE.DirectionalLight(STUDIO_KICK, 1.55);
  kick.position.set(0.25, 0.82, -0.72);
  scene.add(kick);

  /* Rose from above, plum from below: the studio backdrop bouncing back
   * onto the subject, which is what stops the shadowed faces going flat
   * black on a body this dark. */
  const hemi = new THREE.HemisphereLight(0x6a4a58, 0x2a1c22, 0.95);
  scene.add(hemi);

  /* The studio's floor is a pool of light, not a plane: a soft radial
   * gradient under the hero so it has something to stand on. It is a
   * texture rather than geometry-plus-shadow because the shadow of a
   * 5 inch quad at this scale is a smudge, and a smudge on nothing reads
   * as a bug. */
  const pool = (() => {
    const c = document.createElement('canvas');
    c.width = 256;
    c.height = 256;
    const ctx = c.getContext('2d');
    /* The pool the hero stands in. Sakura, and brighter than it was: it is
     * the warmest thing in the studio and the reason the airframe has a
     * ground to sit against rather than a void to float in. */
    const g = ctx.createRadialGradient(128, 128, 4, 128, 128, 126);
    g.addColorStop(0, 'rgba(226, 158, 176, 0.52)');
    g.addColorStop(0.40, 'rgba(140, 84, 102, 0.30)');
    g.addColorStop(1, 'rgba(51, 34, 45, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 256, 256);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(1.55, 1.55),
      new THREE.MeshBasicMaterial({
        map: tex, transparent: true, depthWrite: false, fog: false,
      }),
    );
    mesh.rotation.x = -Math.PI * 0.5;
    mesh.position.y = 0.0022;
    mesh.renderOrder = -1;
    scene.add(mesh);
    return mesh;
  })();

  /* The floor the shadow lands on. A ShadowMaterial draws the shadow and
   * nothing else, so the studio keeps its void and the hero still has
   * weight under it. Without this the quad is a cutout. */
  const shadowCatcher = new THREE.Mesh(
    new THREE.PlaneGeometry(1.4, 1.4),
    new THREE.ShadowMaterial({ opacity: 0.42 }),
  );
  shadowCatcher.rotation.x = -Math.PI * 0.5;
  /* A hair above the world's own ground plane. Co-planar with it they
   * z-fight, and a flickering floor is worse than no floor. */
  shadowCatcher.position.y = 0.0012;
  shadowCatcher.receiveShadow = true;
  shadowCatcher.visible = !LITE;
  scene.add(shadowCatcher);

  /*
   * A blob shadow for the world acts.
   *
   * The ground out there is a raw ShaderMaterial, and teaching a custom
   * shader to receive Three's shadow map is a lot of plumbing for a shadow
   * that is only ever seen in two shots: the union and the close. For the
   * rest of the flight the quad IS the camera. So it gets a painted blob,
   * sized and faded by how high it is off the deck, which is what the shadow
   * of a hovering quad looks like anyway.
   */
  const blob = (() => {
    const c = document.createElement('canvas');
    c.width = 128;
    c.height = 128;
    const ctx = c.getContext('2d');
    const g = ctx.createRadialGradient(64, 64, 2, 64, 64, 62);
    g.addColorStop(0, 'rgba(8, 14, 8, 0.62)');
    g.addColorStop(0.55, 'rgba(8, 14, 8, 0.26)');
    g.addColorStop(1, 'rgba(8, 14, 8, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 128, 128);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(1, 1),
      new THREE.MeshBasicMaterial({
        map: tex, transparent: true, depthWrite: false, fog: true,
      }),
    );
    mesh.rotation.x = -Math.PI * 0.5;
    mesh.position.y = 0.02;
    mesh.visible = false;
    scene.add(mesh);
    return mesh;
  })();

  function aimBlob(at, strength, baseRadius) {
    if (strength <= 0.01) {
      blob.visible = false;
      return;
    }
    /* Wider and weaker the higher it is, which is the only thing a soft
     * shadow does that says how far off the ground something is. */
    const alt = Math.max(0.04, at.y);
    blob.visible = true;
    blob.position.set(at.x, 0.02, at.z);
    blob.scale.setScalar(baseRadius * (1 + alt * 0.75));
    blob.material.opacity = Math.min(1, strength) * Math.max(0.12, 1 - alt * 0.18);
  }

  /* 0 is "never sized". It has to be a value the measurement below cannot
     produce, or the first call short circuits and the canvas keeps the
     300 by 150 the HTML spec gives it. Its fallback bottoms out at 1. */
  let width = 0;
  let height = 0;

  /*
   * The canvas's OWN box, not the window's.
   *
   * `window.innerWidth` includes the classic scrollbar; the canvas is
   * `position: fixed; inset: 0`, so its box is the layout viewport and does
   * not. On Windows that is a 15 px disagreement, and it costs twice: the
   * drawing buffer is rendered 15 px wider than the box it is displayed in,
   * so the whole frame is squeezed horizontally, and `camera.aspect` and the
   * composition bias are both computed for a frame that is not the one on
   * screen. Measuring the element settles it by construction, whatever the
   * platform puts around it.
   *
   * The fallback matters: a display:none or not yet laid out canvas reports
   * zero, and a zero width camera is a NaN projection and a black page.
   */
  /*
   * Cheap enough to call every frame, and it is: sizing once and waiting for
   * a resize event is how the stage ended up rendering for a frame that was
   * not on screen. The event does not fire when a scrollbar appears, and it
   * does not fire when a viewport that measured zero at module evaluation
   * later gets a size. Both leave a camera composed for the wrong frame with
   * nothing to correct it. Comparing two integers per frame does.
   *
   * Returns whether anything moved, so the caller can re-measure with it.
   */
  function resize() {
    const w = canvas.clientWidth || window.innerWidth || 1;
    const h = canvas.clientHeight || window.innerHeight || 1;
    if (w === width && h === height) {
      return false;
    }
    width = w;
    height = h;
    renderer.setSize(width, height, false);
    camera.aspect = width / Math.max(1, height);
    applyFov();
    return true;
  }
  window.addEventListener('resize', resize, { passive: true });

  /*
   * `scale` is 0 for the studio and 1 for the field: it moves the clip
   * planes, the fog distances and the shadow frustum together, because they
   * are one decision. `world` is how much daylight has arrived, and it only
   * moves colour.
   */
  const fogColour = new THREE.Color();
  function setRegime(scale, world) {
    const s = Math.max(0, Math.min(1, scale));
    const w = Math.max(0, Math.min(1, world));

    camera.near = 0.02 + s * 0.06;
    camera.far = 22 + s * 780;
    camera.updateProjectionMatrix();

    fogColour.copy(STUDIO).lerp(HORIZON, w * 0.92);
    scene.fog.color.copy(fogColour);
    scene.background.copy(fogColour);
    renderer.setClearColor(fogColour, 1);
    /*
     * Far enough back that a 51 m course seen from 70 m is not already half
     * dissolved. The old 22 to 175 put a 45 percent haze over the middle of
     * the track in the closing shot and turned the whole field peach.
     *
     * And in the STUDIO the near plane is 2.5 m, not 0.5. The hero sits
     * 1.4 m from the lens; at 0.5 to 2.6 it was picking up a third of a
     * fog's worth of backdrop, which is exactly the contrast the opening
     * could least afford to give away.
     */
    scene.fog.near = 2.5 + s * 32;
    scene.fog.far = 16 + s * 286;

    /* Studio lamps out as the sun comes up, and the shadow camera grows
     * with the subject: 4 m around a hero, 90 m around a course. */
    key.intensity = 3.25 - w * 1.75;
    key.color.copy(STUDIO_KEY).lerp(SUN_COLOUR, w);
    rim.intensity = 2.15 * (1 - w * 0.86);
    kick.intensity = 1.55 * (1 - w * 0.78);
    hemi.intensity = 0.95 + w * 0.28;
    hemi.color.setHex(0x6a4a58).lerp(new THREE.Color(0x9ec4e8), w);
    hemi.groundColor.setHex(0x2a1c22).lerp(new THREE.Color(0x3f5b3a), w);

    pool.material.opacity = 1 - s;
    pool.visible = s < 0.98;
    shadowCatcher.visible = !LITE && s < 0.98;
  }

  /* The key light follows the subject, so the one shadow the page can
   * afford always lands under the thing being looked at. */
  const keyOffset = new THREE.Vector3(0.42, 0.70, 0.55);
  const rimOffset = new THREE.Vector3(-0.7, 0.28, -0.62);
  const kickOffset = new THREE.Vector3(0.25, 0.82, -0.72);
  function aimLight(at, radius) {
    key.target.position.copy(at);
    key.position.copy(at).addScaledVector(keyOffset, radius * 2.4);
    rim.position.copy(at).addScaledVector(rimOffset, radius * 2.4);
    kick.position.copy(at).addScaledVector(kickOffset, radius * 2.4);
    const half = Math.max(0.35, radius * 1.35);
    key.shadow.camera.left = -half;
    key.shadow.camera.right = half;
    key.shadow.camera.top = half;
    key.shadow.camera.bottom = -half;
    key.shadow.camera.near = Math.max(0.02, radius * 0.2);
    key.shadow.camera.far = radius * 8 + 2;
    key.shadow.camera.updateProjectionMatrix();
  }
  aimLight(new THREE.Vector3(0, 0, 0), 0.22);

  /*
   * FOV is specified HORIZONTALLY and converted, because the page is framed
   * on the width of things. Three's `fov` is vertical, so on a tall narrow
   * window a vertical angle that framed the quad nicely at 16:9 crops it off
   * both sides: measured at 1092 by 1109, a 34 degree vertical lens put a
   * 0.347 m airframe across 95 percent of the frame. Locking the horizontal
   * angle keeps the composition the same shape on every window.
   */
  /*
   * ...but the VERTICAL angle is still capped, because a lock in one axis is
   * a runaway in the other. On a portrait phone at 0.46 aspect, the flight
   * act's 104 degree horizontal lens converts to 140 degrees vertical, which
   * is not a wide angle, it is a fisheye with the horizon bent round it.
   * Above the cap the horizontal angle gives way instead.
   */
  const MAX_V_FOV = 112;
  let hFov = 30;
  function applyFov() {
    const aspect = width / Math.max(1, height);
    const v = 2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(hFov) * 0.5) / aspect);
    camera.fov = Math.min(MAX_V_FOV, THREE.MathUtils.radToDeg(v));
    camera.updateProjectionMatrix();
  }
  function setFov(fov) {
    if (Math.abs(hFov - fov) > 0.01) {
      hFov = fov;
      applyFov();
    }
  }

  /*
   * Where the subject sits relative to the centre of frame, as two camera
   * rotations in radians. Read by the poses in main.js.
   *
   * A wide window puts the copy down the left, so the hero yaws right out of
   * its way. A square or tall window has no room to do that: the copy is as
   * wide as the frame and the headline lands straight across the airframe.
   * There the hero drops instead, and the copy takes the top of the frame.
   * Both at once is what makes the layout survive being 1535 by 1559.
   */
  const bias = { yaw: 0, pitch: 0 };
  function composeBias() {
    const aspect = width / Math.max(1, height);
    bias.yaw = THREE.MathUtils.clamp((aspect - 1.12) * 0.20, 0, 0.15);
    bias.pitch = THREE.MathUtils.clamp((1.42 - aspect) * 0.20, 0, 0.15);
    return bias;
  }

  resize();

  function render() {
    renderer.render(scene, camera);
  }

  return {
    renderer,
    scene,
    camera,
    key,
    rim,
    hemi,
    setRegime,
    setFov,
    composeBias,
    aimLight,
    aimBlob,
    shadowsOn: !LITE,
    render,
    resize,
    get size() {
      return { width, height };
    },
  };
}
