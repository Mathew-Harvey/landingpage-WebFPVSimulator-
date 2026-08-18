/*
 * course.js: the track, the ground it stands on, and the way it gets built.
 *
 * The layout is a closed loop with one long straight, two 180s and an S in
 * the middle, which is about the simplest course that is still worth flying:
 * somewhere to be fast, somewhere to be brave, and one place where being
 * fast makes you slow. Seven gates, because seven is countable at a glance
 * from the air and from the page.
 *
 * The gates are NOT placed by typing a yaw for each one. A yaw typed by hand
 * is a yaw that is subtly wrong, and a gate a few degrees off its own racing
 * line is the exact thing that makes a rendered course look drawn rather
 * than surveyed. Instead the plan loop is the source of truth: each gate is
 * placed at a parameter along it and squared to the tangent there. Move a
 * waypoint and every gate downstream re-aims itself.
 *
 * The flight line is then threaded THROUGH the gate centres, so the camera
 * cannot clip a frame: the same curve that positions a gate positions the
 * quad that flies it.
 *
 * The ground is one plane with one shader that crossfades between the track
 * builder's plan grid and a mown race pitch. That crossfade is the moment
 * the page is built around, so it is a uniform rather than two objects being
 * swapped: nothing pops, the grid dissolves into grass under the same gates.
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
import { buildGate, paintGate, CLEAR_H } from './gate.js';
import { celMaterial, PALETTE as P } from './cel.js';
import { SEG } from './quality.js';

/* The plan loop, in metres. Read it as a diagram: the long straight runs
 * along the bottom, the loop turns right at the end, the S bites back
 * through the middle, and the far turn brings it home. */
const PLAN = [
  [-21.5, -14.5],
  [1.5, -18.5],
  [21.5, -11.0],
  [25.5, 1.5],
  [13.0, 12.0],
  [1.5, 6.5],
  [-12.0, 13.5],
  [-25.0, 2.5],
];

/* Where the gates sit along that loop, as a fraction of it. Gate 1 is the
 * start and finish and stands on the straight, so a lap begins pointing at
 * the fastest part of the course. */
const GATE_AT = [0.02, 0.15, 0.29, 0.42, 0.55, 0.70, 0.85];

export const GATE_COUNT = GATE_AT.length;
export const GATE_CENTRE_Y = CLEAR_H * 0.5;

/* Sky as a dome rather than a flat clear colour, because a flat clear
 * colour has no horizon and a course with no horizon has no scale. Golden
 * hour: a warm band on the deck, a deep dusk overhead. It stays dark enough
 * overall for cream type to sit on top of it, which a noon sky does not. */
/*
 * Golden hour, pulled toward the blossom.
 *
 * The band on the deck used to be a sand orange. Sakura is the game's own
 * motif, so the sun goes down through rose rather than through amber, and
 * the top of the sky keeps its blue so the two ends of the gradient still
 * read as sky rather than as a wash.
 */
const SKY_TOP = new THREE.Color(0x2f5d8a);
const SKY_MID = new THREE.Color(0x9aacc2);
const SKY_LOW = new THREE.Color(0xefaea6);
export const HORIZON = new THREE.Color(0xdf9d94);

/*
 * THE STUDIO, as three colours rather than one.
 *
 * It was a flat blue black, and a flat anything is why the opening read as
 * dark: a near black airframe on a near black ground has nowhere to be seen.
 * A product shot is not lit like that. It is lit with a graduated backdrop,
 * dark where the type goes and warm where the subject stands, and the
 * subject reads against the difference.
 *
 * So the backdrop is a plum that lifts to a rose at the deck, and it is
 * sakura rather than slate because that is the game's own colour. The
 * airframe is a GREEN black object, so a rose ground separates it by hue as
 * well as by value, which is worth more than either alone.
 */
export const STUDIO_TOP = new THREE.Color(0x38293a);
export const STUDIO_MID = new THREE.Color(0x5b3a4e);
export const STUDIO_LOW = new THREE.Color(0x835464);

/*
 * The value that backdrop resolves to AT THE HORIZON, computed once by hand
 * from the mix below and then written down.
 *
 * This is the fog colour, the clear colour, and what the ground plane fades
 * to at its far edge, and all three have to be the same thing or there is a
 * hard line across the frame where the deck stops and the dome starts. That
 * line was there: the fog was the middle of the gradient and the sky at the
 * horizon was the warm end of it, so the plan view had a seam through it.
 */
export const STUDIO = new THREE.Color(0x7a4e5e);

/* The plan grid's own ground stays dark, and separately: the seam colour is
 * where the deck ENDS, not what a track builder's diagram is drawn on. */
const DECK = new THREE.Color(0x2a1c26);

/*
 * The dome is SMALL and it does not test depth.
 *
 * It used to be a 420 m sphere, which is the obvious way to build a sky and
 * is wrong the moment the far plane moves: the studio act clips at 22 m, so
 * the whole dome fell outside the frustum and the studio's backdrop was
 * never drawn at all. What showed instead was the flat clear colour, which
 * is why a carefully graduated backdrop looked like a flat one.
 *
 * Ten metres, drawn first, with the depth test off and following the camera.
 * That is a backdrop rather than an object: it is always behind everything
 * because it is painted before everything, not because it is far away.
 */
function skyDome() {
  const geo = new THREE.SphereGeometry(10, SEG.sky, Math.round(SEG.sky * 0.68));
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    depthTest: false,
    fog: false,
    uniforms: {
      uTop: { value: SKY_TOP.clone() },
      uMid: { value: SKY_MID.clone() },
      uLow: { value: SKY_LOW.clone() },
      uWorld: { value: 0 },
      uStudioTop: { value: STUDIO_TOP.clone() },
      uStudioMid: { value: STUDIO_MID.clone() },
      uStudioLow: { value: STUDIO_LOW.clone() },
    },
    vertexShader: `
      varying vec3 vPos;
      void main() {
        vPos = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: `
      varying vec3 vPos;
      uniform vec3 uTop;
      uniform vec3 uMid;
      uniform vec3 uLow;
      uniform vec3 uStudioTop;
      uniform vec3 uStudioMid;
      uniform vec3 uStudioLow;
      uniform float uWorld;
      void main() {
        float h = normalize(vPos).y;
        vec3 sky = mix(uLow, uMid, smoothstep(-0.02, 0.20, h));
        sky = mix(sky, uTop, smoothstep(0.18, 0.72, h));

        /* The studio backdrop: dark overhead where the wordmark sits, warm
           at the deck where the subject stands. The band is tight around
           the horizon so it reads as a lit sweep behind the hero rather
           than as a second sunset. */
        vec3 studio = mix(uStudioMid, uStudioTop, smoothstep(0.05, 0.60, h));
        /* A WIDE band. Over 0.16 to -0.10 the rose came and went inside
           nine degrees, which does not read as a lit backdrop, it reads as
           a stripe with an edge on it. Spread over most of the lower sky it
           becomes the sweep a photographer actually gets. */
        studio = mix(studio, uStudioLow, smoothstep(0.42, -0.15, h));

        /* Below the deck the world's dome keeps the studio's own dark, so
           the reveal reads as light arriving rather than a lid lifting. */
        sky = mix(sky, uStudioMid * 1.1, smoothstep(0.0, -0.16, h));
        gl_FragColor = vec4(mix(studio, sky, uWorld), 1.0);
      }`,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.frustumCulled = false;
  mesh.renderOrder = -1000;
  return mesh;
}

/*
 * The ground. One plane, one shader, two states.
 *
 * uWorld 0 is the track builder: near black, a 1 m hairline grid, a brighter
 * line every 5 m, and the origin cross picked out. uWorld 1 is a mown race
 * pitch: cut stripes, a warm edge, and the grid gone. Between them the grid
 * fades out from the horizon inward, so the world arrives at your feet
 * first, which is the way a fog lifts.
 */
function ground() {
  const geo = new THREE.PlaneGeometry(700, 700, 1, 1);
  geo.rotateX(-Math.PI * 0.5);
  const mat = new THREE.ShaderMaterial({
    uniforms: {
      uWorld: { value: 0 },
      uReveal: { value: 0 },
      uGrid: { value: new THREE.Color(0x5c4152) },
      uGridHot: { value: new THREE.Color(P.sakura) },
      /* EXACTLY the fog's own colour, not a shade above it. The deck beyond
         the grid's fade is only ever partly fogged, so a lighter value left
         a hard horizontal step where the plane's far edge met the sky: a
         seam across the whole frame in the plan act. All the lift the plan
         needs comes from the grid lines themselves. */
      uDeck: { value: DECK.clone() },
      /* The simulator's own turf, taken down a stop and warmed. Its
         0x4c8b38 and 0x63a949 are lit by a noon sun; under this page's low
         one they read as a fluorescent lawn under a sunset, which is the
         one combination that says video game rather than evening. */
      uGrass: { value: new THREE.Color(0x456f31) },
      uGrassCut: { value: new THREE.Color(0x53853c) },
      uDirt: { value: new THREE.Color(0x7d7a4e) },
      uSun: { value: new THREE.Color(0xffd0a0) },
      /*
       * The ground's fog is OURS, not the renderer's.
       *
       * Spreading THREE.UniformsLib.fog hands the material the library's
       * shared uniform objects and trusts the renderer to refresh them. It
       * does refresh the distances, but the colour that arrived did not
       * match the one on scene.fog: it held the raw sRGB numbers where the
       * scene held them converted, which is a whole stop of difference on
       * the exact value the horizon has to match. Rather than depend on
       * renderer internals for the one colour that has to agree with the
       * sky, the fog is passed in explicitly.
       */
      uFogColor: { value: new THREE.Color(0xffffff) },
      uFogNear: { value: 1 },
      uFogFar: { value: 2000 },
    },
    vertexShader: `
      varying vec3 vWorld;
      void main() {
        vWorld = (modelMatrix * vec4(position, 1.0)).xyz;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: `
      varying vec3 vWorld;
      uniform vec3 uFogColor;
      uniform float uFogNear;
      uniform float uFogFar;
      uniform float uWorld;
      uniform float uReveal;
      uniform vec3 uGrid;
      uniform vec3 uGridHot;
      uniform vec3 uDeck;
      uniform vec3 uGrass;
      uniform vec3 uGrassCut;
      uniform vec3 uDirt;
      uniform vec3 uSun;

      float lineAt(vec2 p, float spacing, float w) {
        vec2 g = abs(fract(p / spacing - 0.5) - 0.5) * spacing;
        vec2 d = fwidth(p) * w;
        vec2 l = smoothstep(d, vec2(0.0), g);
        return max(l.x, l.y);
      }

      void main() {
        vec2 p = vWorld.xz;
        float r = length(p);

        /* Builder plan. The grid is drawn out to a radius that grows with
           uReveal, so the plan lays itself out from the origin rather than
           appearing everywhere at once. The 1 m grid is faded out with
           distance: at 40 m away its lines land closer together than the
           pixels drawing them, and an unfaded fine grid at a grazing angle
           is a moire pattern, not a floor. */
        float fine = lineAt(p, 1.0, 1.0) * 0.22 * smoothstep(46.0, 16.0, r);
        float major = lineAt(p, 5.0, 1.2) * 0.55;
        float axis = lineAt(p, 200.0, 2.0);
        /* Nothing at all until the plan is being laid out, or the studio act
           gets a pair of faint sakura axis lines crossing a shot that is
           supposed to be a lit void. */
        float within = smoothstep(uReveal * 82.0 + 6.0, uReveal * 82.0 - 24.0, r)
                     * smoothstep(0.0, 0.05, uReveal);
        vec3 plan = uDeck;
        plan = mix(plan, uGrid, (fine + major) * within);
        plan = mix(plan, uGridHot, axis * 0.22 * within);
        /*
         * No radius fade here. There used to be one, mixing the deck toward
         * the horizon colour between 72 and 175 m from the origin, and it
         * was a workaround for the broken vertex fog above. It made its own
         * seam: a hundred metres of radius compresses into a few pixels
         * near the horizon, so the "soft" fade landed as a hard line across
         * the frame. Distance from the CAMERA is what should fade a ground
         * plane out, and the fog below does exactly that, correctly.
         */

        /* The pitch. Mown stripes at 6 m, a scuffed apron beyond the
           marked area, nothing regular enough to read as a texture. */
        float stripe = step(0.5, fract(vWorld.z / 7.5));
        vec3 turf = mix(uGrass, uGrassCut, stripe);
        float wear = smoothstep(48.0, 110.0, r);
        turf = mix(turf, uDirt, wear * 0.55);
        turf *= 0.92 + 0.08 * sin(vWorld.x * 0.37) * sin(vWorld.z * 0.41);
        /* A low sun does not light a field evenly: it rakes it. Warm on the
           near ground, cooling into the distance, which is most of what
           makes a flat plane read as a field at all. */
        turf *= mix(vec3(1.0), uSun, 0.30 - smoothstep(20.0, 120.0, r) * 0.20);

        vec3 c = mix(plan, turf, uWorld);

        /*
         * Fog computed PER FRAGMENT from the world position, not from the
         * stock chunk's interpolated vertex depth.
         *
         * This plane is one quad, 700 m on a side, so its fog depth is
         * interpolated from four corners across the entire visible world.
         * That is not an approximation, it is nonsense: the horizon sits in
         * the middle of an edge and gets whatever the linear blend of two
         * corner distances happens to be, so the far ground stayed unfogged
         * and left a hard line where it met the sky. Subdividing the plane
         * would fix it too and cost vertices; this costs one length().
         */
        float fogD = length(vWorld - cameraPosition);
        c = mix(c, uFogColor, smoothstep(uFogNear, uFogFar, fogD));
        gl_FragColor = vec4(c, 1.0);
      }`,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.receiveShadow = false;
  mesh.position.y = 0;
  return mesh;
}

function planCurve() {
  const pts = PLAN.map(([x, z]) => new THREE.Vector3(x, 0, z));
  const c = new THREE.CatmullRomCurve3(pts, true, 'centripetal', 0.5);
  return c;
}

/*
 * The gates, and then the racing line threaded through them.
 *
 * The line alternates a gate centre with a control point lifted between
 * gates, which is what gives a real racing line its shape: low and level
 * through the hole, higher and looser in the transit. Because the gate
 * centres are literally control points of the curve, a quad flown along it
 * cannot clip a frame.
 */
function layout() {
  const plan = planCurve();
  const gates = [];
  for (let i = 0; i < GATE_AT.length; i += 1) {
    const u = GATE_AT[i];
    const p = plan.getPointAt(u);
    const t = plan.getTangentAt(u);
    gates.push({
      index: i + 1,
      u,
      pos: p,
      yaw: Math.atan2(t.x, t.z),
      isStart: i === 0,
    });
  }

  const linePts = [];
  for (let i = 0; i < gates.length; i += 1) {
    const g = gates[i];
    linePts.push(new THREE.Vector3(g.pos.x, GATE_CENTRE_Y, g.pos.z));
    const next = gates[(i + 1) % gates.length];
    let mid = (g.u + next.u) * 0.5;
    if (next.u < g.u) {
      mid = (g.u + next.u + 1) * 0.5 % 1;
    }
    const mp = plan.getPointAt(mid);
    /* Lifted, and pushed a little to the outside of the turn, which is
     * where a racing line actually goes. */
    const t = plan.getTangentAt(mid);
    /* Only a little. Pushed hard to the outside the curve overshoots
      * through a corner, and the tangent at the gate before it ends up
      * pointing at the scenery instead of at the gate after it: the pilot
      * arrives with the next target off the side of the frame. */
    const out = new THREE.Vector3(-t.z, 0, t.x).multiplyScalar(0.9);
    linePts.push(new THREE.Vector3(mp.x + out.x, GATE_CENTRE_Y + 0.55, mp.z + out.z));
  }
  const line = new THREE.CatmullRomCurve3(linePts, true, 'centripetal', 0.5);
  return { plan, gates, line };
}

/*
 * A teardrop banner flag, the thing that actually says "race course".
 *
 * Without them a lap is a quad, seven gates and a lawn, and the eye has
 * nothing to measure speed against between the gates. A course is dressed:
 * flags line the transits, and their poles ticking past the camera are most
 * of what makes the flight read as fast rather than as a slow pan over a
 * field. Painted from the same kit as the gates, so the whole course wears
 * one print.
 */
function sailTexture(accent) {
  const c = document.createElement('canvas');
  c.width = 192;
  c.height = 512;
  const ctx = c.getContext('2d');
  const w = 192;
  const h = 512;
  ctx.fillStyle = '#dcd6ca';
  ctx.fillRect(0, 0, w, h);

  /* The sweep down the leading edge, widening toward the head, which is what
   * gives a teardrop flag its shape before it is even cut out. */
  ctx.fillStyle = accent;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(w * 0.30, 0);
  ctx.quadraticCurveTo(w * 0.16, h * 0.42, w * 0.34, h * 0.86);
  ctx.lineTo(w * 0.40, h);
  ctx.lineTo(0, h);
  ctx.closePath();
  ctx.fill();

  /* A chequer band across the waist, and the mark above it. */
  const bandY = h * 0.52;
  const cells = 7;
  const cw = (w - w * 0.36) / cells;
  for (let i = 0; i < cells; i += 1) {
    for (let j = 0; j < 2; j += 1) {
      ctx.fillStyle = (i + j) % 2 === 0 ? '#23272f' : '#eae6dd';
      ctx.fillRect(w * 0.36 + i * cw, bandY + j * 14, cw + 0.5, 14.5);
    }
  }

  ctx.save();
  ctx.translate(w * 0.66, h * 0.30);
  ctx.rotate(-Math.PI / 2);
  ctx.font = '800 44px system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const wt = ctx.measureText('WEB').width;
  const wu = ctx.measureText('FPV').width;
  ctx.fillStyle = '#1a1f2b';
  ctx.fillText('WEB', -(wu * 0.5), 0);
  ctx.fillStyle = '#c4677f';
  ctx.fillText('FPV', wt * 0.5, 0);
  ctx.restore();

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

const SAIL_W = 0.92;
const SAIL_H = 2.35;
function sailGeometry() {
  const s = new THREE.Shape();
  s.moveTo(0, 0);
  s.lineTo(0, SAIL_H);
  s.quadraticCurveTo(SAIL_W * 1.18, SAIL_H * 0.88, SAIL_W, SAIL_H * 0.44);
  s.quadraticCurveTo(SAIL_W * 0.74, SAIL_H * 0.07, 0, 0);
  const geo = new THREE.ShapeGeometry(s, SEG.round + 2);
  /* ShapeGeometry gives UVs in shape units, not 0..1, so the print would be
   * sampled at a fraction of one texel without this. */
  const uv = geo.getAttribute('uv');
  for (let i = 0; i < uv.count; i += 1) {
    uv.setXY(i, uv.getX(i) / (SAIL_W * 1.06), uv.getY(i) / SAIL_H);
  }
  uv.needsUpdate = true;
  return geo;
}

function tube(curve, radius, segments, mat) {
  const geo = new THREE.TubeGeometry(curve, segments, radius, SEG.tube, true);
  const mesh = new THREE.Mesh(geo, mat);
  mesh.frustumCulled = false;
  return mesh;
}

export function buildCourse() {
  const group = new THREE.Group();
  group.name = 'course';

  const sky = skyDome();
  const deck = ground();
  group.add(sky, deck);

  const { plan, gates, line } = layout();

  /* The plan ribbon, flat on the deck, the way the builder draws it. */
  const planFlat = new THREE.CatmullRomCurve3(
    plan.getSpacedPoints(240).map((p) => new THREE.Vector3(p.x, 0.03, p.z)),
    true, 'centripetal', 0.5,
  );
  const planMat = new THREE.MeshBasicMaterial({
    color: P.sakura, transparent: true, opacity: 0.9, fog: true,
  });
  const planLine = tube(planFlat, 0.105, SEG.planTube, planMat);
  group.add(planLine);

  /* The node handles the builder puts on every control point. */
  const nodeMat = new THREE.MeshBasicMaterial({ color: P.cream, transparent: true, opacity: 0.9 });
  const nodes = [];
  for (const [x, z] of PLAN) {
    const n = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.06, 0.75), nodeMat);
    n.position.set(x, 0.05, z);
    n.rotation.y = Math.PI * 0.25;
    n.visible = false;
    nodes.push(n);
    group.add(n);
  }

  /* The racing line, lifted off the deck. It is the thing the plan ribbon
   * becomes, and the thing the quad then flies. */
  const raceMat = new THREE.MeshBasicMaterial({
    color: P.mint, transparent: true, opacity: 0, fog: true,
  });
  const raceLine = tube(line, 0.065, SEG.raceTube, raceMat);
  group.add(raceLine);

  /*
   * The dress: flags down both sides of the transits, and a treeline.
   *
   * Both arrive with the daylight rather than with the plan, because they
   * are the FIELD, not the course. A track builder's plan view is a diagram
   * and a diagram does not have trees in it.
   */
  const dress = new THREE.Group();
  group.add(dress);
  /* Every flag, so each can be grown about its OWN base. */
  const flagGroups = [];

  const sailGeo = sailGeometry();
  const poleGeo = new THREE.CylinderGeometry(0.026, 0.030, 3.15, SEG.tube);
  const poleMat = celMaterial({ color: 0xb8bcc0, rim: 0.26, spec: 0.4 });
  const footGeo = new THREE.CylinderGeometry(0.16, 0.20, 0.09, SEG.round);
  /* Navy, red and sakura. The first two are the simulator's own flag
   * accents; the third is the product's, and having it in the run down the
   * course is what stops the theme stopping at the chrome. */
  const sailMats = [
    celMaterial({ color: 0xffffff, map: sailTexture('#1e3566'), rim: 0.20, side: THREE.DoubleSide }),
    celMaterial({ color: 0xffffff, map: sailTexture('#c4677f'), rim: 0.20, side: THREE.DoubleSide }),
    celMaterial({ color: 0xffffff, map: sailTexture('#b8332c'), rim: 0.20, side: THREE.DoubleSide }),
  ];

  const FLAGS = SEG.flags;
  for (let i = 0; i < FLAGS; i += 1) {
    const u = (i + 0.5) / FLAGS;
    const p = plan.getPointAt(u);
    const t = plan.getTangentAt(u);
    /* Alternating sides of the line, well clear of it: a flag on the racing
     * line is an obstacle, and this course does not have those. */
    const side = i % 2 === 0 ? 1 : -1;
    const nx = -t.z * side;
    const nz = t.x * side;
    const off = 4.6 + (i % 3) * 0.5;

    const flag = new THREE.Group();
    flag.position.set(p.x + nx * off, 0, p.z + nz * off);
    flag.rotation.y = Math.atan2(t.x, t.z) + (i % 2 === 0 ? 0.3 : -0.3);

    const pole = new THREE.Mesh(poleGeo, poleMat);
    pole.position.y = 1.575;
    pole.castShadow = true;
    flag.add(pole);
    const foot = new THREE.Mesh(footGeo, poleMat);
    foot.position.y = 0.045;
    flag.add(foot);
    const sail = new THREE.Mesh(sailGeo, sailMats[i % 3]);
    sail.position.set(0.02, 0.62, 0);
    sail.rotation.y = Math.PI * 0.5;
    sail.castShadow = true;
    flag.add(sail);
    dress.add(flag);
    flagGroups.push(flag);
  }

  /*
   * The treeline. One instanced cone mesh at the edge of the field, far
   * enough out to be scenery and close enough to be a horizon: the fog eats
   * most of it, which is the point. A field with nothing at its edge has no
   * size, and a course with no size has no speed.
   */
  /*
   * A three tier conifer, as a lathe.
   *
   * A cone is not a tree. A ring of 240 cones on a horizon is a sawtooth,
   * and a sawtooth reads as a mountain range made of triangles: it was the
   * single thing most obviously wrong with the flight act. The stepped
   * profile below gives each one a skirt, a middle and a crown, so the
   * silhouette breaks up and the line of them reads as woodland. It is one
   * lathe, so it still instances into a single draw call.
   */
  const treeGeo = new THREE.LatheGeometry([
    new THREE.Vector2(0.00, 0.000),
    new THREE.Vector2(1.00, 0.030),
    new THREE.Vector2(0.54, 0.300),
    new THREE.Vector2(0.82, 0.330),
    new THREE.Vector2(0.40, 0.620),
    new THREE.Vector2(0.62, 0.650),
    new THREE.Vector2(0.00, 1.000),
  ], SEG.round - 1);
  /* Basic, not cel. A distant treeline at golden hour is a SILHOUETTE: it
   * has no lit band and no rim, it just gets bluer and paler with distance,
   * which is exactly what scene fog does to an unlit flat colour. Shaded
   * like a hero prop instead, 240 cones with a bright sunlit face read as a
   * range of pyramids standing round the field. */
  const treeMat = new THREE.MeshBasicMaterial({ color: 0x24391f, fog: true });
  const TREES = SEG.trees;
  const trees = new THREE.InstancedMesh(treeGeo, treeMat, TREES);
  const treeBase = [];
  {
    /* A fixed stream, so the treeline is the same treeline on every load
     * and a screenshot taken today matches one taken tomorrow. */
    let seed = 20260818;
    const rnd = () => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 4294967296;
    };
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const pos = new THREE.Vector3();
    const scl = new THREE.Vector3();
    for (let i = 0; i < TREES; i += 1) {
      /* Clumped rather than evenly spaced. Even spacing at even heights is
       * a sawtooth, and a sawtooth on the horizon reads as a mountain range
       * made of triangles, which is exactly what it is. */
      const a = (i / TREES) * Math.PI * 2 + (rnd() - 0.5) * 0.09;
      /* Far enough out to be a horizon rather than an obstacle: the nearest
       * is 75 m from the middle of a course that is 51 m across, so nothing
       * on the racing line is ever near one. The far ones sit inside the fog
       * and dissolve, which is what gives the field its depth. */
      const r = 66 + Math.pow(rnd(), 0.65) * 78;
      const hgt = 5.5 + rnd() * rnd() * 11;
      const wid = hgt * (0.44 + rnd() * 0.20);
      pos.set(Math.cos(a) * r, -0.4, Math.sin(a) * r * 0.88);
      scl.set(wid, hgt, wid);
      q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), rnd() * Math.PI);
      m.compose(pos, q, scl);
      trees.setMatrixAt(i, m);
      treeBase.push({ pos: pos.clone(), quat: q.clone(), scale: scl.clone() });
    }
    trees.instanceMatrix.needsUpdate = true;
  }
  trees.castShadow = false;
  dress.add(trees);
  dress.visible = false;

  const gateGroups = gates.map((g) => {
    const mesh = buildGate(g.index, { isStart: g.isStart });
    mesh.position.set(g.pos.x, 0, g.pos.z);
    mesh.rotation.y = g.yaw;
    mesh.visible = false;
    group.add(mesh);
    return mesh;
  });

  /* Distance along the plan, for the builder's readout. */
  const planLength = plan.getLength();

  const planIndexCount = planLine.geometry.index.count;
  const raceIndexCount = raceLine.geometry.index.count;

  /*
   * Scrub the build. Four overlapping phases inside one 0 to 1:
   *
   *   0.00 - 0.22   the grid lays out from the origin
   *   0.10 - 0.52   the plan ribbon draws, nodes drop in behind it
   *   0.40 - 0.86   gates rise in order, in place, one at a time
   *   0.80 - 1.00   the ribbon lifts into the racing line
   */
  function setBuild(t) {
    const p = Math.max(0, Math.min(1, t));

    const grid = Math.min(1, p / 0.22);
    deck.material.uniforms.uReveal.value = grid;

    const draw = Math.max(0, Math.min(1, (p - 0.10) / 0.42));
    planLine.visible = draw > 0;
    planLine.geometry.setDrawRange(0, Math.max(6, Math.floor(planIndexCount * draw)));
    for (let i = 0; i < nodes.length; i += 1) {
      const at = i / nodes.length;
      nodes[i].visible = draw > at;
      const k = Math.max(0, Math.min(1, (draw - at) * 8));
      nodes[i].scale.setScalar(0.3 + k * 0.7);
    }

    const rise = Math.max(0, Math.min(1, (p - 0.40) / 0.46));
    let raised = 0;
    for (let i = 0; i < gateGroups.length; i += 1) {
      const at = i / gateGroups.length;
      const k = Math.max(0, Math.min(1, (rise - at) * (gateGroups.length + 1)));
      const g = gateGroups[i];
      g.visible = k > 0;
      if (k > 0) {
        /* Up out of the deck, with the last of the travel eased so it
         * settles rather than stops. */
        const e = 1 - (1 - k) * (1 - k) * (1 - k);
        g.position.y = -CLEAR_H * 1.35 * (1 - e);
        if (k > 0.98) {
          raised += 1;
        }
      }
      paintGate(g, 0, false);
    }

    const lift = Math.max(0, Math.min(1, (p - 0.80) / 0.20));
    raceMat.opacity = lift * 0.85;
    raceLine.visible = lift > 0;
    raceLine.geometry.setDrawRange(0, Math.max(6, Math.floor(raceIndexCount * Math.min(1, lift * 1.4))));
    planMat.opacity = 0.9 * (1 - lift * 0.86);
    nodeMat.opacity = 0.9 * (1 - lift);

    return {
      gridDone: grid,
      drawn: draw,
      gatesUp: raised,
      metres: planLength * draw,
      lifted: lift,
    };
  }

  /* The world arriving: grid to grass, studio dark to golden hour. */
  const treeM = new THREE.Matrix4();
  const treeScale = new THREE.Vector3();
  let lastDress = 0;
  function setWorld(w) {
    const v = Math.max(0, Math.min(1, w));
    deck.material.uniforms.uWorld.value = v;
    sky.material.uniforms.uWorld.value = v;
    /*
     * The dress grows in with the daylight, and it grows PER OBJECT.
     *
     * Scaling the parent group is the obvious way to do it and it is wrong:
     * a group scale multiplies positions as well as sizes, so at half scale
     * a tree standing 100 m out stands 50 m out, and the whole treeline
     * marches into the middle of the course and out again. Each flag is
     * scaled about its own base, and the trees are recomposed from their
     * stored matrices, which is 240 composes and only while it is moving.
     *
     * Scaling rather than fading because the materials are shared: fading
     * one flag fades all eighteen and the treeline with them.
     */
    dress.visible = v > 0.02;
    const raw = Math.min(1, v * 1.35);
    const k = raw * raw * (3 - 2 * raw);
    /* Recomposed only when the number actually moved, which is a handful of
     * frames per visit, and correctly on the way back UP the page as well:
     * latching on "done" left the dress stuck at full size while the world
     * behind it faded back to a studio. */
    if (dress.visible && Math.abs(k - lastDress) > 0.0005) {
      lastDress = k;
      for (const f of flagGroups) {
        f.scale.setScalar(k);
      }
      for (let i = 0; i < treeBase.length; i += 1) {
        const b = treeBase[i];
        treeScale.copy(b.scale).multiplyScalar(k);
        treeM.compose(b.pos, b.quat, treeScale);
        trees.setMatrixAt(i, treeM);
      }
      trees.instanceMatrix.needsUpdate = true;
    }
    return v;
  }

  /* The renderer's fog, handed to the ground shader verbatim, so the deck's
   * far edge and the dome behind it resolve to the same value. */
  function setFog(fog) {
    deck.material.uniforms.uFogColor.value.copy(fog.color);
    deck.material.uniforms.uFogNear.value = fog.near;
    deck.material.uniforms.uFogFar.value = fog.far;
  }

  /* Which gate the run wants next, lit the way the simulator lights it. */
  function setRun(nextIndex, pulse) {
    for (let i = 0; i < gateGroups.length; i += 1) {
      const isNext = i === nextIndex;
      const gain = isNext ? 0.55 + 0.45 * pulse : 0.0;
      paintGate(gateGroups[i], gain, i < nextIndex);
    }
  }

  function hideLines(hide) {
    planLine.visible = !hide && planMat.opacity > 0.02;
    raceLine.visible = !hide && raceMat.opacity > 0.02;
    for (const n of nodes) {
      n.visible = !hide && nodeMat.opacity > 0.02;
    }
  }

  return {
    group,
    gates,
    gateGroups,
    line,
    plan,
    planLength,
    setBuild,
    setWorld,
    setFog,
    setRun,
    hideLines,
    deck,
    sky,
  };
}
