/*
 * manga.js: act one's studio drawn as a manga panel.
 *
 * The page's first screen is a manga page (src/page.js) and its big panel is
 * the studio. A spotlit product render in a dark room is a film still, and
 * a film still in a panel reads as a photograph pasted onto a page, so for
 * as long as the page is up the studio is drawn the way the simulator's
 * manga layer draws the town: paper for a ground, the airframe in ink, its
 * shadow as dot screentone, and focus lines converging on it. As act one
 * ends the paper goes back to the studio's own colours and the film carries
 * on exactly as it was, so everything here is a function of one weight, k.
 *
 * THE DIRECT PATH, measured against the alternative. A depth edge pass into
 * a target would ink every part against every other, but it is a full
 * screen pass, and at 3840 by 2160 that is the cost that matters: inverted
 * hulls on the airframe gave the same picture at that size for no target at
 * all. So the frame is the scene as it always was, then one quad of focus
 * lines over it, and nothing else.
 *
 *   ink     inverted hulls on the airframe's toon meshes: the simulator's
 *           core/outline.js shell, pushed along normals averaged over every
 *           face that shares a position, so a box's corner stays closed
 *   paper   the dome, the deck, the fog and the clear colour to paper, the
 *           sakura pool out, and more fill so a shaded side is a band and not
 *           a hole
 *   tone    the cast shadow as a 45 degree dot screentone at the frame
 *           height over 180, the simulator's pitch, never under 4 pixels
 *   lines   focus lines converging on the aircraft, STILL: drawn once from a
 *           seeded hash and moved only by the camera, which the scroll moves,
 *           because a pattern of stripes that changes on its own is a
 *           photosensitivity question. They are held off the aircraft and off
 *           every box a reader has to read (see mask()).
 *
 * Under reduced motion the film is pinned to a frame in act three and none
 * of this is on. Render only: nothing here reads or writes the flight.
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

/* The page's paper and the glass ink, as the simulator's lettering has them
 * (src/sim/ui/lettering.js PAPER and INK) and the stylesheet's --paper. */
export const PAPER_HEX = 0xf7f0dc;
const INK = new THREE.Color(0x0b1116);
const PAPER = new THREE.Color(PAPER_HEX);
const LINE_ALPHA = 0.8;

/* A colour's sRGB numbers, for the page's raw shaders, which write what they
 * are given straight to the canvas. */
function display(c) {
  const out = new THREE.Color();
  c.getRGB(out, THREE.SRGBColorSpace);
  return out;
}
function rawSet(target, c) {
  const d = display(c);
  target.setRGB(d.r, d.g, d.b, THREE.LinearSRGBColorSpace);
  return target;
}

/* A hash with no sine in it, the simulator's: a stroke should be the same
 * stroke on every GPU. */
const HASH = /* glsl */ `
  float mangaHash( float p ) {
    p = fract( p * 0.1031 );
    p *= p + 33.33;
    p *= p + p;
    return fract( p );
  }
`;

/* A 45 degree dot grid at the canvas's own pixels, each dot as big as the
 * amount under it. The simulator's screentone with a larger ceiling: a cast
 * shadow wants to get nearer solid than a shaded face does. */
const DOTS = /* glsl */ `
  float mangaDots( float amount, vec2 fc, float pitch ) {
    vec2 g = fc / pitch;
    vec2 cell = fract( vec2( g.x + g.y, g.x - g.y ) * 0.70710678 ) - 0.5;
    float dist = length( cell ) * pitch;
    float rad = sqrt( clamp( amount, 0.0, 1.0 ) ) * 0.46 * pitch;
    return ( 1.0 - smoothstep( rad - 0.6, rad + 0.6, dist ) ) * step( 0.015, amount );
  }
`;

/*
 * FOCUS LINES, the simulator's speed strokes turned round to face a subject.
 *
 * In the goggles the craft is going wherever the middle of the frame is, so
 * the simulator keeps its strokes out of the centre third. Here the subject
 * is wherever the page put it, so the rule keeps its shape and moves: no
 * stroke starts inside the clear ellipse round the aircraft, each tapers
 * from nothing at its inner end to full weight at the frame's edge, and none
 * is drawn over the rectangles in uMask, the page's type and panels.
 */
const QUAD_VERT = /* glsl */ `
  void main() {
    gl_Position = vec4( position.xy, 0.0, 1.0 );
  }
`;
const LINES_FRAG = /* glsl */ `
  uniform vec3 uLineC;
  uniform float uLineK;
  uniform vec2 uFocus;
  uniform vec2 uClearC;
  uniform vec2 uClearR;
  uniform vec3 uStroke;      /* count, share, weight in pixels */
  uniform vec4 uMask[ 6 ];
  uniform float uMaskSoft;
  ${HASH}
  float mangaRect( vec2 p, vec4 r ) {
    vec2 d = max( r.xy - p, p - r.zw );
    return 1.0 - smoothstep( uMaskSoft * 0.35, uMaskSoft, max( d.x, d.y ) );
  }
  void main() {
    vec2 fc = gl_FragCoord.xy;
    float en = length( ( fc - uClearC ) / uClearR );
    if ( en < 1.0 ) {
      discard;
    }
    vec2 d = fc - uFocus;
    float r = length( d ) + 1e-3;
    float count = uStroke.x;
    float u = ( atan( d.y, d.x ) * 0.15915494 + 0.5 ) * count;
    float i = floor( u );
    float h1 = mangaHash( i * 1.37 );
    float h2 = mangaHash( i * 2.91 );
    float h3 = mangaHash( i * 4.17 );
    float inner = 1.0 + 0.85 * h2 * h2;
    float along = smoothstep( inner, inner + 1.6, en );
    float w = uStroke.z * mix( 0.3, 1.0, h3 ) * along;
    float off = abs( fract( u ) - 0.5 - ( h3 - 0.5 ) * 0.5 );
    float px = off * 6.2831853 / count * r;
    float cov = 1.0 - smoothstep( w * 0.5 - 0.5, w * 0.5 + 0.6, px );
    cov *= step( h1, uStroke.y ) * smoothstep( inner, inner + 0.04, en );
    float m = 0.0;
    for ( int k = 0; k < 6; k++ ) {
      m = max( m, mangaRect( fc, uMask[ k ] ) );
    }
    float a = cov * ( 1.0 - m ) * uLineK;
    if ( a < 0.002 ) {
      discard;
    }
    gl_FragColor = vec4( uLineC, a );
  }
`;

/* The floor plane's patch: ShadowMaterial's one line, replaced, so the
 * shadow is dots rather than a grey. A phone has no shadow map, and gets the
 * page's painted blob as tone instead. */
const FLOOR_HEAD = /* glsl */ `
  varying vec3 vMangaW;
  uniform float uToneK;
  uniform float uPitch;
  uniform vec3 uToneC;
  uniform vec2 uBlobAt;
  uniform vec2 uBlobR;
  ${DOTS}
`;
const FLOOR_LINE = 'gl_FragColor = vec4( color, opacity * ( 1.0 - getShadowMask() ) );';
const FLOOR_BODY = /* glsl */ `
  float mShadow = 1.0 - getShadowMask();
  #ifndef USE_SHADOWMAP
    vec2 bq = ( vMangaW.xz - uBlobAt ) / uBlobR;
    mShadow = 0.8 * ( 1.0 - smoothstep( 0.25, 1.0, length( bq ) ) );
  #endif
  gl_FragColor = vec4( uToneC, mangaDots( mShadow * 0.62 * uToneK, gl_FragCoord.xy, uPitch ) );
`;

/*
 * THE HULL: the simulator's core/outline.js shell (offset along the normal
 * in clip space, so the line is one width on screen) with one change. The
 * normals it is pushed along are averaged over every face that shares a
 * POSITION; the copy in src/sim welds before dropping normals, so a box's
 * corner, whose three faces carry three normals, opens into three plates
 * with a crack between each, a ragged line round every motor bell.
 */
const HULL_VERT = /* glsl */ `
  uniform float uThickness;
  uniform vec2 uResolution;
  attribute vec3 hullNormal;
  void main() {
    vec4 mv = modelViewMatrix * vec4( position, 1.0 );
    vec3 n = normalize( normalMatrix * hullNormal );
    vec4 clip = projectionMatrix * mv;
    vec3 clipN = normalize( ( projectionMatrix * vec4( n, 0.0 ) ).xyz );
    vec2 aspect = vec2( uResolution.y / uResolution.x, 1.0 );
    clip.xy += clipN.xy * aspect * uThickness * clip.w * 0.5;
    gl_Position = clip;
  }
`;
const HULL_FRAG = /* glsl */ `
  uniform vec3 uColor;
  void main() { gl_FragColor = vec4( uColor, 1.0 ); }
`;

const weldCache = new WeakMap();
function welded(geo) {
  if (weldCache.has(geo)) {
    return weldCache.get(geo);
  }
  const src = geo.index ? geo.toNonIndexed() : geo;
  const pos = src.attributes.position;
  const acc = new Map();
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const c = new THREE.Vector3();
  const key = (i) => `${Math.round(pos.getX(i) * 2e4)},${Math.round(pos.getY(i) * 2e4)},${Math.round(pos.getZ(i) * 2e4)}`;
  for (let i = 0; i < pos.count; i += 3) {
    a.fromBufferAttribute(pos, i);
    b.fromBufferAttribute(pos, i + 1);
    c.fromBufferAttribute(pos, i + 2);
    /* Area weighted, by leaving the cross product unnormalised. */
    const n = new THREE.Vector3().subVectors(c, b).cross(a.clone().sub(b));
    for (let k = 0; k < 3; k += 1) {
      const id = key(i + k);
      const v = acc.get(id);
      if (v) {
        v.add(n);
      } else {
        acc.set(id, n.clone());
      }
    }
  }
  const hn = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i += 1) {
    const v = acc.get(key(i)).clone().normalize();
    hn[i * 3] = v.x;
    hn[i * 3 + 1] = v.y;
    hn[i * 3 + 2] = v.z;
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', pos);
  out.setAttribute('hullNormal', new THREE.BufferAttribute(hn, 3));
  weldCache.set(geo, out);
  return out;
}

const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
const smooth = (t) => t * t * (3 - 2 * t);
const ease = (v, a, b) => smooth(clamp01((v - a) / (b - a)));

/*
 * The manga studio. `studioY` is the height the hero hovers at; `masks` is
 * a list of selectors the focus lines keep off, measured on measure().
 */
export function createManga({ stage, drone, course, studioY, masks = [], reduced = false }) {
  const { renderer, scene, camera } = stage;
  const buf = new THREE.Vector2();

  /* ------------------------------------------------------------ the tone */
  const floorU = {
    uToneK: { value: 0 },
    uPitch: { value: 6 },
    uToneC: { value: INK.clone() },
    uBlobAt: { value: new THREE.Vector2(-0.05, 0.03) },
    uBlobR: { value: new THREE.Vector2(0.26, 0.22) },
  };
  const floorMat = new THREE.ShadowMaterial({ opacity: 1 });
  floorMat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, floorU);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vMangaW;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvMangaW = ( modelMatrix * vec4( transformed, 1.0 ) ).xyz;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>\n${FLOOR_HEAD}`)
      .replace(FLOOR_LINE, FLOOR_BODY);
  };
  floorMat.customProgramCacheKey = () => 'manga-floor';
  floorMat.depthWrite = false;
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1.6), floorMat);
  floor.rotation.x = -Math.PI * 0.5;
  floor.position.y = 0.0016;
  floor.receiveShadow = true;
  floor.renderOrder = -0.5;
  floor.visible = false;
  scene.add(floor);

  /* ------------------------------------------------------------ the ink */
  /* Made on the first frame rather than here, so every part the build will
   * show is already in the group. */
  const shells = [];
  const ownHulls = [];
  const hullColour = display(INK);
  let inked = false;
  function ink() {
    inked = true;
    const targets = [];
    drone.group.traverse((o) => {
      /* The page's own scale hulls, where it has them, stand down while the
       * ink is on: two outlines round one part is a double line. */
      if (o.userData.isHull) {
        ownHulls.push(o);
        return;
      }
      const m = o.material;
      if (o.isMesh && !o.userData.isOutline && m && !m.transparent && m.isMeshToonMaterial) {
        targets.push(o);
      }
    });
    for (const o of targets) {
      const mat = new THREE.ShaderMaterial({
        uniforms: {
          uThickness: { value: 0.004 },
          uResolution: { value: new THREE.Vector2(1920, 1080) },
          uColor: { value: hullColour },
        },
        vertexShader: HULL_VERT,
        fragmentShader: HULL_FRAG,
        side: THREE.BackSide,
      });
      const shell = new THREE.Mesh(welded(o.geometry), mat);
      shell.castShadow = false;
      shell.receiveShadow = false;
      shell.renderOrder = (o.renderOrder || 0) - 1;
      shell.userData.isOutline = true;
      o.add(shell);
      shells.push(shell);
    }
    sized = '';
  }

  /* ---------------------------------------------------------- the lines */
  const maskU = [];
  for (let i = 0; i < 6; i += 1) {
    maskU.push(new THREE.Vector4(0, 0, -1, -1));
  }
  const linesMat = new THREE.ShaderMaterial({
    uniforms: {
      uLineC: { value: display(INK) },
      uLineK: { value: 0 },
      uFocus: { value: new THREE.Vector2() },
      uClearC: { value: new THREE.Vector2() },
      uClearR: { value: new THREE.Vector2(1, 1) },
      uStroke: { value: new THREE.Vector3(170, 0.44, 5) },
      uMask: { value: maskU },
      uMaskSoft: { value: 24 },
    },
    vertexShader: QUAD_VERT,
    fragmentShader: LINES_FRAG,
    transparent: true,
    depthTest: false,
    depthWrite: false,
  });
  linesMat.toneMapped = false;
  const linesQuad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), linesMat);
  linesQuad.frustumCulled = false;
  const quadCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

  /* ------------------------------------------------------- the backdrop */
  const paperRaw = rawSet(new THREE.Color(), PAPER);
  const fill = new THREE.Color(0xf6ecd8);
  const fillLow = new THREE.Color(0xb8a890);
  let saved = null;

  function applyBackdrop(k) {
    const su = course.sky.material.uniforms;
    const du = course.deck.material.uniforms;
    if (k <= 0) {
      if (saved) {
        su.uStudioTop.value.copy(saved.top);
        su.uStudioMid.value.copy(saved.mid);
        su.uStudioLow.value.copy(saved.low);
        du.uDeck.value.copy(saved.deck);
        saved = null;
      }
      return;
    }
    if (!saved) {
      saved = {
        top: su.uStudioTop.value.clone(),
        mid: su.uStudioMid.value.clone(),
        low: su.uStudioLow.value.clone(),
        deck: du.uDeck.value.clone(),
      };
    }
    /* The fog and the clear colour as three expects them; the dome and the
     * deck as the raw numbers they write. setRegime puts all of these back
     * every frame before this runs, so each is a lerp from the studio's. */
    scene.fog.color.lerp(PAPER, k);
    scene.background.lerp(PAPER, k);
    renderer.setClearColor(scene.background, 1);
    su.uStudioTop.value.copy(saved.top).lerp(paperRaw, k);
    su.uStudioMid.value.copy(saved.mid).lerp(paperRaw, k);
    su.uStudioLow.value.copy(saved.low).lerp(paperRaw, k);
    du.uDeck.value.copy(saved.deck).lerp(paperRaw, k);
    du.uFogColor.value.lerp(paperRaw, k);
    if (k > 0.02) {
      stage.pool.visible = false;
      stage.shadowCatcher.visible = false;
    }
    stage.hemi.intensity += 0.9 * k;
    stage.hemi.color.lerp(fill, 0.7 * k);
    stage.hemi.groundColor.lerp(fillLow, 0.7 * k);
  }

  /* ------------------------------------------------------- measurement */
  const cornerBox = [];
  for (let i = 0; i < 8; i += 1) {
    cornerBox.push(new THREE.Vector3());
  }
  const p = new THREE.Vector3();
  let sized = '';
  let dirty = true;

  /* The boxes the lines keep off, in canvas pixels with y up. Once per size
   * or layout change, never per frame. */
  function mask() {
    const cw = renderer.domElement.clientWidth || 1;
    const sx = buf.x / cw;
    const H = buf.y;
    for (let i = 0; i < 6; i += 1) {
      const n = masks[i] ? document.querySelector(masks[i]) : null;
      const r = n && n.getBoundingClientRect();
      if (!r || r.width < 2 || getComputedStyle(n).display === 'none') {
        maskU[i].set(0, 0, -1, -1);
        continue;
      }
      /* With a margin, so a line never comes up to a word's edge. */
      const pad = Math.max(10, Math.min(buf.x, buf.y) * 0.018);
      maskU[i].set(r.left * sx - pad, H - r.bottom * sx - pad, r.right * sx + pad, H - r.top * sx + pad);
    }
    linesMat.uniforms.uMaskSoft.value = 22 * sx;
  }

  function size() {
    renderer.getDrawingBufferSize(buf);
    const key = `${buf.x}x${buf.y}`;
    if (key !== sized) {
      sized = key;
      dirty = true;
    }
    if (!dirty) {
      return;
    }
    dirty = false;
    mask();
    const frame = Math.min(buf.x, buf.y) / 1080;
    const tall = buf.y / 1080;
    floorU.uPitch.value = Math.max(4, 6 * tall);
    linesMat.uniforms.uStroke.value.z = Math.max(2, 5 * frame);
    /* The line's weight: 3.2 px at 1080 lines, never under 1.5. NDC units,
     * so 0.004 is 1.1 px at 1080. */
    const thick = (Math.max(1.5, 3.2 * tall) / (buf.y / 4)) * 1.15;
    for (const sh of shells) {
      sh.material.uniforms.uThickness.value = thick;
      sh.material.uniforms.uResolution.value.set(buf.x, buf.y);
    }
  }

  /* Where the aircraft is on the canvas, and the ellipse the lines keep
   * clear round it and its shadow. */
  function subject() {
    camera.updateMatrixWorld();
    const W = buf.x;
    const H = buf.y;
    p.set(0, studioY, 0).project(camera);
    linesMat.uniforms.uFocus.value.set((p.x * 0.5 + 0.5) * W, (p.y * 0.5 + 0.5) * H);
    const R = 0.235;
    let x0 = Infinity;
    let y0 = Infinity;
    let x1 = -Infinity;
    let y1 = -Infinity;
    let i = 0;
    for (const x of [-R, R]) {
      for (const y of [0, studioY + 0.07]) {
        for (const z of [-R, R]) {
          cornerBox[i].set(x, y, z).project(camera);
          const px = (cornerBox[i].x * 0.5 + 0.5) * W;
          const py = (cornerBox[i].y * 0.5 + 0.5) * H;
          x0 = Math.min(x0, px);
          x1 = Math.max(x1, px);
          y0 = Math.min(y0, py);
          y1 = Math.max(y1, py);
          i += 1;
        }
      }
    }
    linesMat.uniforms.uClearC.value.set((x0 + x1) * 0.5, (y0 + y1) * 0.5);
    linesMat.uniforms.uClearR.value.set(Math.max(8, (x1 - x0) * 0.62), Math.max(8, (y1 - y0) * 0.62));
  }

  let k = 0;
  /*
   * Once a frame, after the film has set the stage and before it is drawn.
   * The look is act one's: full while the page is up, gone by the time the
   * builder's plan has the frame.
   */
  function update(T) {
    /* Quick, because paper and the studio's maroon have a muddy grey
     * between them that should only be passed through. */
    k = reduced ? 0 : 1 - ease(T, 0.9, 0.965);
    if (!inked && k > 0) {
      ink();
    }
    size();
    const on = k > 0.01;
    for (const sh of shells) {
      sh.visible = on;
    }
    for (const h of ownHulls) {
      h.visible = !on;
    }
    floor.visible = on;
    floorU.uToneK.value = k;
    applyBackdrop(k);
    if (on) {
      subject();
    }
    linesMat.uniforms.uLineK.value = k * LINE_ALPHA;
    return k;
  }

  function render() {
    renderer.render(scene, camera);
    if (k > 0.001) {
      const ac = renderer.autoClear;
      renderer.autoClear = false;
      renderer.render(linesQuad, quadCam);
      renderer.autoClear = ac;
    }
  }

  return {
    update,
    render,
    /* A layout or size change: the masks are measured again next frame. */
    measure() {
      dirty = true;
    },
    get k() {
      return k;
    },
    /* Where the aircraft is, in CSS pixels, for the page's lettering. */
    subjectCss() {
      const cw = renderer.domElement.clientWidth || 1;
      const s = cw / Math.max(1, buf.x);
      const f = linesMat.uniforms.uFocus.value;
      const c = linesMat.uniforms.uClearC.value;
      const r = linesMat.uniforms.uClearR.value;
      return {
        x: f.x * s,
        y: (buf.y - f.y) * s,
        cx: c.x * s,
        cy: (buf.y - c.y) * s,
        rx: r.x * s,
        ry: r.y * s,
      };
    },
  };
}
