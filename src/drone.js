/*
 * drone.js: the airframe, part by part, and the order it goes together in.
 *
 * This is a HERO model, not the game model. The simulator's craft is built
 * to be cheap enough to draw fourteen gates behind it at 144 Hz; this one is
 * the only thing on screen for the first act of the page, so it is built the
 * way a real 5 inch racer is built and it is allowed to cost something.
 *
 * The published envelope still matches the simulator exactly, because the
 * machine on the advert has to be the machine in the product:
 *
 *   0.110 m from centre to motor axis, so a 0.220 m motor to motor diagonal
 *   0.0635 m prop radius, which is half of five inches
 *   camera at 0.080 m forward and 0.018 m up, the simulator's own mount
 *
 * Inside that envelope everything is drawn out: 5 mm carbon arms with bolted
 * motor pads, an M3 standoff stack carrying a 4-in-1 ESC with its low ESR
 * capacitor, a flight controller with a USB port and soft mounting grommets,
 * a video transmitter with a heatsink, twelve motor phase wires routed along
 * the arms, silicone battery leads into an XT60, 2207 motors with vented
 * bells, and tri-blade props lofted from a cambered aerofoil with real
 * washout from root to tip.
 *
 * THE BUILD ORDER is the point of the file. Every part is filed under one of
 * seven stages, in the order a person actually assembles a quad, and carries
 * the offset it flies in FROM and the delay it waits for:
 *
 *   0 frame    bottom plate, arms, camera deck, standoffs. LEFT OPEN: the
 *              top plate is the lid of the stack and cannot go on yet
 *   1 esc      the 4-in-1 board and its capacitor, first into the stack
 *   2 fc       the flight controller, then the video transmitter, then the
 *              top plate bolted down over the lot
 *   3 motors   four 2207s onto four pads, in Betaflight's motor order
 *   4 loom     phase wires, pack, strap, XT60, antenna, LEDs
 *   5 camera   the cage, the camera, the lens, then the canopy over it
 *   6 props    last, always
 *
 * The offsets are directional rather than random: a bolt spins down its own
 * axis, an arm slides out along its own diagonal, a motor drops onto its
 * pad, a wire arrives from the board it is soldered to. Parts flying in from
 * nowhere in particular is what makes an assembly animation read as a
 * screensaver instead of as a build.
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
import { celMaterial, outlineHull, PALETTE as P } from './cel.js';
import { LITE, SEG } from './quality.js';

export const CRAFT_ARM = 0.110;
export const CRAFT_PROP_R = 0.0635;
export const MOTOR_ARM = CRAFT_ARM / Math.SQRT2;
export const CAMERA_MOUNT_FORWARD = 0.080;
export const CAMERA_MOUNT_UP = 0.018;

/* Props-in as seen from above: RR and FL clockwise, FR and RL counter
 * clockwise. Right-hand rotation about +Y is counter clockwise, so clockwise
 * is a negative spin. Betaflight motor order is RR FR RL FL, front at -z. */
export const PROP_SPIN = [-1, 1, 1, -1];

/*
 * The stages, and HOW LONG EACH ONE GETS.
 *
 * The weights are the fix for the thing that made the opening read as a
 * glitch. Seven stages sharing the timeline equally gives the frame the same
 * 1.2 seconds as the flight controller, and the frame is thirty five parts
 * where the controller is one: two plates, four arms, sixteen motor bolts,
 * four standoffs, a top plate and its bolts all arrived inside a single
 * second and the eye read a flicker rather than a build.
 *
 * The frame now takes a third of the whole sequence, on its own, part by
 * part, which is what was asked for and is also how long it takes in real
 * life relative to dropping a stack in.
 */
export const STAGES = [
  { id: 'frame', label: 'Frame', weight: 3.1 },
  { id: 'esc', label: 'ESC', weight: 0.85 },
  { id: 'fc', label: 'Flight controller', weight: 1.75 },
  { id: 'motors', label: 'Motors', weight: 1.5 },
  { id: 'loom', label: 'Wiring', weight: 1.55 },
  { id: 'camera', label: 'Camera', weight: 1.15 },
  { id: 'props', label: 'Props', weight: 0.95 },
];

const STAGE_TOTAL = STAGES.reduce((a, st) => a + st.weight, 0);
const STAGE_AT = (() => {
  const out = [];
  let acc = 0;
  for (const st of STAGES) {
    out.push(acc);
    acc += st.weight;
  }
  return out;
})();

/*
 * How long ONE part takes to fly in, as a fraction of its stage.
 *
 * It used to be "however much of the stage is left after your delay", which
 * meant the first part of a stage drifted in over the whole stage and the
 * last one snapped in over a tenth of it. Parts moving at visibly different
 * speeds inside the same shot is most of what "glitchy" means.
 *
 * Shorter than it was, which makes each part snap into place rather than
 * drift into it. It also buys the delays more room, since a part cannot
 * start later than 1 minus this, so the cascade spreads as the individual
 * moves tighten: the sequence reads quicker at both ends.
 */
const PART_SPAN = 0.28;

const MOTORS = [
  [MOTOR_ARM, MOTOR_ARM],
  [MOTOR_ARM, -MOTOR_ARM],
  [-MOTOR_ARM, MOTOR_ARM],
  [-MOTOR_ARM, -MOTOR_ARM],
];

/*
 * The stack, as heights above the arm centreline. Written once, here, so a
 * board cannot end up inside the plate above it and a standoff cannot end up
 * shorter than the stack it carries.
 */
const Y = {
  armT: 0.005,
  bottom: -0.0048,
  bottomT: 0.0035,
  esc: 0.0086,
  fc: 0.0186,
  vtx: 0.0268,
  top: 0.0348,
  topT: 0.003,
  standoffH: 0.0300,
  prop: 0.0292,
  packTop: -0.0070,
  packH: 0.0235,
};

const lerp = (a, b, t) => a + (b - a) * t;
const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);

/* Overshoot on the settle, so a part arrives with weight instead of gliding
 * to a stop. 1.34 is the classic back-out constant; livelier than that makes
 * a carbon plate look like rubber. */
function backOut(t) {
  const c1 = 1.34;
  const c3 = c1 + 1;
  const u = t - 1;
  return 1 + c3 * u * u * u + c1 * u * u;
}

/* ---------------------------------------------------------------- geometry */

function roundedRect(w, h, r) {
  const s = new THREE.Shape();
  const x = w * 0.5;
  const y = h * 0.5;
  s.moveTo(-x + r, -y);
  s.lineTo(x - r, -y);
  s.quadraticCurveTo(x, -y, x, -y + r);
  s.lineTo(x, y - r);
  s.quadraticCurveTo(x, y, x - r, y);
  s.lineTo(-x + r, y);
  s.quadraticCurveTo(-x, y, -x, y - r);
  s.lineTo(-x, -y + r);
  s.quadraticCurveTo(-x, -y, -x + r, -y);
  return s;
}

/*
 * A carbon plate. The shape is drawn in XY with +Y as the NOSE, extruded,
 * then laid flat: ExtrudeGeometry pushes along +Z, and rotating -90 degrees
 * about X sends +Z to +Y and +Y to -Z, which is the drone's forward.
 *
 * The small bevel is not decoration. A 4 mm plate with a square edge reads
 * as a rectangle of paint; real carbon has a chamfer, and the chamfer
 * catching the key light is most of what you actually see of a plate.
 */
function plate(shape, thickness, bevel = 0.00055, curveSegments = 8) {
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: Math.max(0.0002, thickness - bevel * 2),
    bevelEnabled: bevel > 0,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelOffset: 0,
    bevelSegments: 1,
    curveSegments,
  });
  geo.rotateX(-Math.PI * 0.5);
  geo.translate(0, -thickness * 0.5 + bevel, 0);
  geo.computeVertexNormals();
  return geo;
}

/* The arm: a tapered carbon stick with a round motor pad on the end, drawn
 * pointing at the nose and then turned onto its own diagonal. */
const PAD_R = 0.0154;
const ARM_HALF = 0.0134;
function armShape() {
  /* Where the straight side meets the pad's circle. Solved rather than
   * eyeballed, so the tangent is clean at any width. */
  /* cos(phi) = halfWidth / padRadius puts the tangent point on the circle,
   * so the straight side runs into the pad without a kink at any width. */
  const phi = Math.acos(ARM_HALF / PAD_R);
  const s = new THREE.Shape();
  s.moveTo(0.0112, 0.002);
  s.lineTo(0.0098, 0.052);
  s.quadraticCurveTo(ARM_HALF, 0.074, ARM_HALF, CRAFT_ARM - PAD_R * Math.sin(phi));
  s.absarc(0, CRAFT_ARM, PAD_R, -phi, Math.PI + phi, false);
  s.lineTo(-0.0098, 0.052);
  s.lineTo(-0.0112, 0.002);
  s.closePath();
  return s;
}

/* Rotation about Y that sends the arm's own -Z axis onto the diagonal a
 * motor sits on. */
function armYaw(mx, mz) {
  const l = Math.hypot(mx, mz);
  return Math.atan2(-mx / l, -mz / l);
}

/*
 * A tri-blade, lofted rather than extruded.
 *
 * The simulator's blade is a flat plate, which is correct at the silhouette
 * and at the size a race gate is drawn from is the whole of what it needs to
 * be. Here the prop is 200 pixels across for the first act of the page, and
 * a flat plate at that size is a paddle. So the blade is built as a real
 * one: a cambered section swept from root to tip, the chord swelling to the
 * middle of the span and rounding off at the tip, and with WASHOUT, the
 * twist coming out from a coarse root to a fine tip. That twist is the thing
 * the eye actually reads as "propeller".
 */
const AEROFOIL = [
  /* Chord fraction, thickness fraction. Upper surface first, from the
   * leading edge, then back along the lower. */
  [0.000, 0.000],
  [0.055, 0.048],
  [0.180, 0.072],
  [0.380, 0.070],
  [0.620, 0.050],
  [0.840, 0.026],
  [1.000, 0.004],
  [0.840, -0.006],
  [0.620, -0.014],
  [0.380, -0.018],
  [0.180, -0.016],
  [0.055, -0.009],
];

function bladeGeometry(stations = SEG.blade) {
  const ring = AEROFOIL.length;
  const rootR = 0.0082;
  const pos = new Float32Array(stations * ring * 3);
  const idx = [];

  for (let i = 0; i < stations; i += 1) {
    const t = i / (stations - 1);
    const r = lerp(rootR, CRAFT_PROP_R, t);
    const swell = 0.42 + 0.80 * Math.sin(Math.PI * Math.pow(t, 0.58));
    const round = Math.sqrt(Math.max(0, 1 - Math.pow(t, 9)));
    const chord = 0.0186 * swell * round;
    const twist = lerp(0.56, 0.155, Math.pow(t, 0.72));
    /* A little leading edge sweep, which every modern race prop has and
     * which is what stops the blade reading as a rectangle from above. */
    const sweep = Math.pow(t, 1.8) * 0.0054;
    const ct = Math.cos(twist);
    const st = Math.sin(twist);

    for (let j = 0; j < ring; j += 1) {
      const cf = AEROFOIL[j][0];
      const tf = AEROFOIL[j][1];
      /* Pitch axis at 30 percent chord, which is where a prop's is. */
      const c = (cf - 0.30) * chord + sweep;
      const n = tf * chord;
      const o = (i * ring + j) * 3;
      pos[o + 0] = r;
      pos[o + 1] = c * st + n * ct;
      pos[o + 2] = c * ct - n * st;
    }
  }

  for (let i = 0; i < stations - 1; i += 1) {
    for (let j = 0; j < ring; j += 1) {
      const a = i * ring + j;
      const b = i * ring + ((j + 1) % ring);
      const c = (i + 1) * ring + ((j + 1) % ring);
      const d = (i + 1) * ring + j;
      idx.push(a, b, c, a, c, d);
    }
  }
  for (let j = 1; j < ring - 1; j += 1) {
    idx.push(0, j + 1, j);
    const base = (stations - 1) * ring;
    idx.push(base, base + j, base + j + 1);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  return geo;
}

/* The 2207 bell, as a lathe. Its proportions are a real motor's: 27.6 mm
 * across, 18 mm of it above the base. */
function bellLathe(segments = SEG.bell) {
  const pts = [
    new THREE.Vector2(0.0021, 0.0182),
    new THREE.Vector2(0.0058, 0.0182),
    new THREE.Vector2(0.0112, 0.0176),
    new THREE.Vector2(0.0132, 0.0158),
    new THREE.Vector2(0.0138, 0.0126),
    new THREE.Vector2(0.0138, 0.0034),
    new THREE.Vector2(0.0126, 0.0010),
    new THREE.Vector2(0.0086, 0.0006),
  ];
  return new THREE.LatheGeometry(pts, segments);
}

/* A routed wire. Three or four control points and a tube, which is all a
 * silicone lead needs to be and infinitely more than a straight line looks
 * like. */
function wireGeometry(points, radius, segments = LITE ? 12 : 24) {
  const curve = new THREE.CatmullRomCurve3(
    points.map((p) => new THREE.Vector3(p[0], p[1], p[2])),
    false, 'catmullrom', 0.4,
  );
  return new THREE.TubeGeometry(curve, segments, radius, 7, false);
}

/* The prop blur, as a ring that is brightest where the blade carries its
 * area. A flat translucent disc reads as a plate of glass. */
function blurTexture(hex) {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 128;
  const ctx = c.getContext('2d');
  const col = `#${hex.toString(16).padStart(6, '0')}`;
  const g = ctx.createRadialGradient(64, 64, 5, 64, 64, 63);
  g.addColorStop(0.00, 'rgba(0,0,0,0)');
  g.addColorStop(0.28, `${col}1a`);
  g.addColorStop(0.70, `${col}59`);
  g.addColorStop(0.93, `${col}8c`);
  g.addColorStop(1.00, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/* --------------------------------------------------------------- the build */

export function buildDrone() {
  const group = new THREE.Group();
  group.name = 'drone';

  /*
   * Every material on the airframe takes a SAKURA rim unless it says
   * otherwise. The rim is the edge light that describes a shape against its
   * background, so on the one object the page stares at for a whole act it
   * is the highest leverage place the theme has. Cel's own default is a cold
   * sky blue, which is right for a gate standing in daylight and wrong for a
   * hero in a rose lit studio.
   */
  const cel = (o) => celMaterial({ rimColor: 0xf0b0c2, ...o });
  const mat = {
    carbon: cel({ color: P.carbon, rim: 0.30, spec: 0.24, specWidth: 0.012 }),
    carbonDeep: cel({ color: P.carbonDeep, rim: 0.18, spec: 0.12 }),
    alu: cel({ color: 0x8d9690, rim: 0.30, spec: 0.62, specWidth: 0.016 }),
    brass: cel({ color: P.brass, rim: 0.30, spec: 0.58, specWidth: 0.018 }),
    steel: cel({ color: 0x707a75, rim: 0.28, spec: 0.72, specWidth: 0.012 }),
    pcb: cel({ color: P.pcb, rim: 0.20, spec: 0.26 }),
    pcbDark: cel({ color: 0x1b2422, rim: 0.20, spec: 0.30 }),
    chip: cel({ color: 0x0e1412, rim: 0.18, spec: 0.36 }),
    gold: cel({ color: 0xc9a24a, rim: 0.24, spec: 0.65, specWidth: 0.016 }),
    silver: cel({ color: 0xc8ccc6, rim: 0.28, spec: 0.80, specWidth: 0.014 }),
    capBody: cel({ color: 0x12181a, rim: 0.22, spec: 0.40 }),
    capTop: cel({ color: 0xa8b0ac, rim: 0.26, spec: 0.68 }),
    bell: cel({ color: P.bell, rim: 0.32, spec: 0.74, specWidth: 0.020 }),
    stator: cel({ color: P.stator, rim: 0.24, spec: 0.22 }),
    copper: cel({ color: 0xb0763c, rim: 0.26, spec: 0.42 }),
    wire: cel({ color: 0x333c39, rim: 0.24, spec: 0.42, specWidth: 0.02 }),
    wireRed: cel({ color: 0x9c3038, rim: 0.24, spec: 0.42, specWidth: 0.02 }),
    wireBlack: cel({ color: 0x15191b, rim: 0.24, spec: 0.42, specWidth: 0.02 }),
    xt60: cel({ color: P.xt60, rim: 0.24, spec: 0.36 }),
    battery: cel({ color: P.battery, rim: 0.22, spec: 0.18 }),
    label: cel({ color: P.tape, rim: 0.24, spec: 0.30 }),
    strap: cel({ color: 0x1e2724, rim: 0.20 }),
    canopy: cel({ color: P.canopy, rim: 0.42, spec: 0.48, specWidth: 0.016 }),
    canopyDeep: cel({ color: P.canopyDeep, rim: 0.28, spec: 0.22 }),
    camBody: cel({ color: P.camBody, rim: 0.26, spec: 0.35 }),
    lens: cel({
      color: 0x0e1410,
      rim: 0.40,
      spec: 0.95,
      specWidth: 0.03,
      specColor: P.cream,
      side: THREE.DoubleSide,
    }),
    ring: cel({ color: P.ring, rim: 0.28, spec: 0.55 }),
    propFront: cel({ color: P.propFront, rim: 0.32, spec: 0.34, specWidth: 0.014 }),
    propRear: cel({ color: P.propRear, rim: 0.28, spec: 0.26 }),
    livery: cel({ color: P.livery, rim: 0.26, spec: 0.28 }),
  };
  const ink = P.ink;

  const parts = STAGES.map(() => []);
  const dummy = new THREE.Object3D();

  const add = (stage, obj, opts = {}) => {
    parts[stage].push({
      obj,
      pos: obj.position.clone(),
      quat: obj.quaternion.clone(),
      from: opts.from ?? new THREE.Vector3(0, 0.10, 0),
      spin: opts.spin ?? null,
      delay: opts.delay ?? 0,
    });
    group.add(obj);
    return obj;
  };

  const mesh = (geo, material, x = 0, y = 0, z = 0, hull = 0) => {
    const m = new THREE.Mesh(geo, material);
    m.position.set(x, y, z);
    m.castShadow = true;
    if (hull) {
      outlineHull(m, hull, ink);
    }
    return m;
  };

  /* An M3 button head bolt: a hex socket cap on a short shank. Twelve of
   * them is what stops the frame looking like a render of a frame. */
  const boltHead = new THREE.CylinderGeometry(0.0029, 0.0031, 0.0016, SEG.round);
  const boltSocket = new THREE.CylinderGeometry(0.0014, 0.0014, 0.0006, 6);
  function bolt(x, y, z, mFace = mat.steel) {
    const g = new THREE.Group();
    const head = new THREE.Mesh(boltHead, mFace);
    head.castShadow = true;
    g.add(head);
    const socket = new THREE.Mesh(boltSocket, mat.chip);
    socket.position.y = 0.0007;
    g.add(socket);
    g.position.set(x, y, z);
    return g;
  }

  /* ================================================================ 0 FRAME
   * Bottom plate down, arms out along their own diagonals, motor pads
   * bolted on, camera deck at the nose, standoffs in. Reading order, and
   * also build order: this is the sequence that says "carbon" before it
   * says "electronics". The top plate is NOT here, see stage 2.
   */

  const bottom = mesh(
    plate(roundedRect(0.060, 0.088, 0.010), Y.bottomT),
    mat.carbon, 0, Y.bottom, 0.002, 1.055,
  );
  add(0, bottom, { from: new THREE.Vector3(0, -0.11, 0), delay: 0 });

  const armGeo = armShape();
  const arms = [];
  for (let i = 0; i < 4; i += 1) {
    const [mx, mz] = MOTORS[i];
    const g = plate(armGeo, Y.armT, 0.0006, 10);
    g.rotateY(armYaw(mx, mz));
    const arm = mesh(g, mat.carbon, 0, 0, 0, 1.014);
    arms.push(arm);
    add(0, arm, {
      from: new THREE.Vector3(mx, 0, mz).normalize().multiplyScalar(0.085),
      delay: 0.16 + i * 0.16,
    });

    /* Four bolts through each motor pad, and the pad's own washer. */
    for (let b = 0; b < 4; b += 1) {
      const a = (Math.PI * 0.25) + b * Math.PI * 0.5;
      const bx = mx + Math.cos(a) * 0.0113;
      const bz = mz + Math.sin(a) * 0.0113;
      add(0, bolt(bx, Y.armT * 0.5 + 0.0008, bz), {
        from: new THREE.Vector3(0, 0.035, 0),
        spin: new THREE.Euler(0, Math.PI * 2.4, 0),
        delay: 0.16 + i * 0.16 + 0.055 + b * 0.012,
      });
    }
  }

  /*
   * No side plates. A race quad is a TRUE X: a bottom plate, four arms,
   * four standoffs and a top plate, and nothing standing up between them.
   * The vertical walls that were here belong on a cinewhoop or an old H
   * frame, and putting them on a 5 inch racer is the kind of detail that
   * only ever gets noticed by the people the page is for.
   */

  /* The camera deck. Without it the camera hangs 40 mm off the front of the
   * frame on nothing at all, which is the sort of thing nobody consciously
   * notices and everybody feels. */
  add(0, mesh(
    plate(roundedRect(0.030, 0.042, 0.008), 0.0026),
    mat.carbon, 0, Y.bottom + 0.0006, -0.0575, 1.05,
  ), { from: new THREE.Vector3(0, -0.06, -0.03), delay: 0.075 });

  /* M3 standoffs, hex, in the four corners of the stack. */
  const standAt = [[0.01525, 0.01525], [0.01525, -0.01525], [-0.01525, 0.01525], [-0.01525, -0.01525]];
  const standGeo = new THREE.CylinderGeometry(0.0031, 0.0031, Y.standoffH, 6);
  standAt.forEach(([sx, sz], i) => {
    add(0, mesh(standGeo, mat.brass, sx, Y.armT * 0.5 + Y.standoffH * 0.5 - 0.0005, sz), {
      from: new THREE.Vector3(0, 0.07, 0),
      spin: new THREE.Euler(0, Math.PI * 1.6, 0),
      delay: 0.84 + i * 0.045,
    });
  });

  const top = mesh(
    plate(roundedRect(0.052, 0.062, 0.009), Y.topT),
    mat.carbon, 0, Y.top, 0.004, 1.055,
  );
  /*
   * The top plate is NOT added here, and that is the point of this comment.
   *
   * It used to be, and it was wrong: the plate is the LID of the stack, and
   * the stack is the ESC and the flight controller sitting on the standoffs
   * underneath it. Fitting it at the end of the frame stage meant the page
   * showed a closed airframe and then slid two boards in through the top of
   * it, which anybody who has built one of these spots immediately. It goes
   * on in stage 2, after the controller, which is where a builder puts it.
   */

  /* ================================================================== 1 ESC
   * Into the stack from underneath, because that is where it goes: the
   * 4-in-1 sits below the flight controller on the same four standoffs. Its
   * capacitor arrives after it, the way it is soldered on after it.
   */
  const escBoard = mesh(
    plate(roundedRect(0.036, 0.036, 0.004), 0.0018, 0.0003, 5),
    mat.pcbDark, 0, Y.esc, 0.003,
  );
  add(1, escBoard, { from: new THREE.Vector3(0, -0.07, 0), spin: new THREE.Euler(0, 0.6, 0), delay: 0 });

  /* Eight motor pads round the edge, gold, two per corner. */
  for (let i = 0; i < 4; i += 1) {
    const a = Math.PI * 0.25 + i * Math.PI * 0.5;
    for (let k = -1; k <= 1; k += 2) {
      const px = Math.cos(a) * 0.0136 - Math.sin(a) * k * 0.0038;
      const pz = Math.sin(a) * 0.0136 + Math.cos(a) * k * 0.0038;
      add(1, mesh(new THREE.CylinderGeometry(0.0016, 0.0016, 0.0004, 8), mat.gold,
        px, Y.esc + 0.0011, pz + 0.003), {
        from: new THREE.Vector3(0, -0.02, 0),
        delay: 0.22 + i * 0.02 + (k + 1) * 0.008,
      });
    }
  }

  /* Four MOSFET packages, one per motor. */
  for (let i = 0; i < 4; i += 1) {
    const a = Math.PI * 0.25 + i * Math.PI * 0.5;
    add(1, mesh(new THREE.BoxGeometry(0.0072, 0.0016, 0.0052), mat.chip,
      Math.cos(a) * 0.0084, Y.esc + 0.0017, Math.sin(a) * 0.0084 + 0.003), {
      from: new THREE.Vector3(0, 0.02, 0),
      delay: 0.30 + i * 0.025,
    });
  }

  const cap = new THREE.Group();
  const capBody = new THREE.Mesh(new THREE.CylinderGeometry(0.0053, 0.0053, 0.0125, 16), mat.capBody);
  capBody.castShadow = true;
  cap.add(capBody);
  const capTop = new THREE.Mesh(new THREE.CylinderGeometry(0.0049, 0.0049, 0.0009, 16), mat.capTop);
  capTop.position.y = 0.0067;
  cap.add(capTop);
  cap.position.set(0, Y.esc + 0.0080, 0.0248);
  cap.rotation.x = Math.PI * 0.5;
  cap.updateMatrix();
  outlineHull(capBody, 1.05, ink);
  add(1, cap, { from: new THREE.Vector3(0, 0.02, 0.055), spin: new THREE.Euler(0, 0, Math.PI), delay: 0.46 });

  /* ================================================================== 2 FC
   * "Lands into place" was the brief, so it lands: straight down the
   * standoffs with a quarter turn taken out on the way, onto its four soft
   * mounting grommets.
   */
  standAt.forEach(([sx, sz], i) => {
    add(2, mesh(new THREE.CylinderGeometry(0.0034, 0.0034, 0.0032, 10), mat.strap, sx, Y.fc - 0.0016, sz), {
      from: new THREE.Vector3(0, 0.03, 0),
      delay: i * 0.02,
    });
  });

  const fcBoard = mesh(
    plate(roundedRect(0.036, 0.036, 0.004), 0.0018, 0.0003, 5),
    mat.pcb, 0, Y.fc, 0.003,
  );
  add(2, fcBoard, { from: new THREE.Vector3(0, 0.075, 0), spin: new THREE.Euler(0, -Math.PI * 0.5, 0), delay: 0.14 });

  /* The processor, the gyro, the USB port, a pin header and two status
   * lamps. These are the details that make a green rectangle read as a
   * flight controller. */
  add(2, mesh(new THREE.BoxGeometry(0.0088, 0.0013, 0.0088), mat.chip, -0.0035, Y.fc + 0.0016, 0.0055), {
    from: new THREE.Vector3(0, 0.018, 0), delay: 0.44,
  });
  add(2, mesh(new THREE.BoxGeometry(0.0042, 0.0011, 0.0042), mat.chip, 0.0068, Y.fc + 0.0015, -0.0018), {
    from: new THREE.Vector3(0, 0.018, 0), delay: 0.50,
  });
  add(2, mesh(new THREE.BoxGeometry(0.0090, 0.0031, 0.0072), mat.silver, 0, Y.fc + 0.0025, -0.0142), {
    from: new THREE.Vector3(0, 0, -0.03), delay: 0.56,
  });
  add(2, mesh(new THREE.BoxGeometry(0.0195, 0.0026, 0.0025), mat.chip, 0, Y.fc + 0.0022, 0.0142), {
    from: new THREE.Vector3(0, 0.02, 0.02), delay: 0.62,
  });

  const lamps = [];
  [[-0.0128, P.mint], [-0.0128 + 0.0042, P.amber]].forEach(([lx, hex], i) => {
    const lm = new THREE.MeshBasicMaterial({ color: hex });
    const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.0016, 0.0008, 0.0022), lm);
    lamp.position.set(lx, Y.fc + 0.0013, -0.0088);
    lamps.push({ mat: lm, base: new THREE.Color(hex) });
    add(2, lamp, { from: new THREE.Vector3(0, 0.012, 0), delay: 0.72 + i * 0.04 });
  });

  /* The video transmitter and its heatsink, the last thing into the stack
   * before the lid goes on over it. */
  add(2, mesh(plate(roundedRect(0.0268, 0.0268, 0.003), 0.0016, 0.0003, 5), mat.pcbDark, 0, Y.vtx, 0.004), {
    from: new THREE.Vector3(0, 0.05, 0), spin: new THREE.Euler(0, 0.7, 0), delay: 0.90,
  });
  for (let f = 0; f < 5; f += 1) {
    add(2, mesh(new THREE.BoxGeometry(0.0016, 0.0038, 0.0140), mat.alu,
      -0.0072 + f * 0.0036, Y.vtx + 0.0028, 0.004), {
      from: new THREE.Vector3(0, 0.03, 0), delay: 0.98 + f * 0.022,
    });
  }

  /* And the lid. Down the standoffs, four bolts into them, then the livery
   * that is painted on top of it. */
  add(2, top, { from: new THREE.Vector3(0, 0.10, 0), delay: 1.22 });

  standAt.forEach(([sx, sz], i) => {
    add(2, bolt(sx, Y.top + Y.topT * 0.5 + 0.0008, sz, mat.brass), {
      from: new THREE.Vector3(0, 0.045, 0),
      spin: new THREE.Euler(0, Math.PI * 2.4, 0),
      delay: 1.38 + i * 0.05,
    });
  });

  /* The livery: a cream stripe down the spine and a sakura nose flash, the
   * same two marks the simulator's craft wears. */
  add(2, mesh(new THREE.BoxGeometry(0.0075, 0.0012, 0.044), mat.livery, 0, Y.top + Y.topT * 0.5 + 0.0004, 0.006), {
    from: new THREE.Vector3(0, 0.03, 0),
    delay: 1.66,
  });
  add(2, mesh(new THREE.BoxGeometry(0.018, 0.0012, 0.008), mat.canopy, 0, Y.top + Y.topT * 0.5 + 0.0004, -0.021), {
    from: new THREE.Vector3(0, 0.03, -0.01),
    delay: 1.72,
  });

  /* =============================================================== 3 MOTORS
   * Four bells onto four pads, from above and slightly outboard, one after
   * another in Betaflight's own motor order.
   */
  const motorGroups = [];
  const bellGeo = bellLathe(SEG.bell);
  const baseGeo = new THREE.CylinderGeometry(0.0142, 0.0148, 0.0026, SEG.lathe);
  const statorGeo = new THREE.CylinderGeometry(0.0112, 0.0112, 0.0072, SEG.lathe);
  const windGeo = new THREE.BoxGeometry(0.0026, 0.0064, 0.0034);
  const nutGeo = new THREE.CylinderGeometry(0.0042, 0.0046, 0.0034, 6);
  const bellScrew = new THREE.CylinderGeometry(0.0011, 0.0011, 0.0012, 6);
  const ventGeo = new THREE.BoxGeometry(0.0030, 0.0062, 0.0016);

  for (let m = 0; m < 4; m += 1) {
    const [mx, mz] = MOTORS[m];
    const motor = new THREE.Group();
    motor.position.set(mx, Y.armT * 0.5, mz);

    const base = new THREE.Mesh(baseGeo, mat.stator);
    base.position.y = 0.0013;
    base.castShadow = true;
    motor.add(base);

    /* The windings, visible in the gap between base and bell, which is
     * exactly where you see them on a real motor. */
    const stator = new THREE.Mesh(statorGeo, mat.stator);
    stator.position.y = 0.0062;
    motor.add(stator);
    /* The windings and the vent slots are 21 extra meshes per motor, 84 in
     * all, on parts that are 12 mm across. They are the first thing to go. */
    const coils = LITE ? 0 : 12;
    for (let w = 0; w < coils; w += 1) {
      const a = (w / coils) * Math.PI * 2;
      const coil = new THREE.Mesh(windGeo, mat.copper);
      coil.position.set(Math.cos(a) * 0.0112, 0.0062, Math.sin(a) * 0.0112);
      coil.rotation.y = -a;
      motor.add(coil);
    }

    const bell = new THREE.Mesh(bellGeo, mat.bell);
    bell.position.y = 0.0038;
    bell.castShadow = true;
    outlineHull(bell, 1.055, P.carbonDeep);
    motor.add(bell);

    /* Vent slots round the skirt, and three screws in the top. */
    const vents = LITE ? 0 : 9;
    for (let v = 0; v < vents; v += 1) {
      const a = (v / vents) * Math.PI * 2;
      const slot = new THREE.Mesh(ventGeo, mat.chip);
      slot.position.set(Math.cos(a) * 0.0132, 0.0128, Math.sin(a) * 0.0132);
      slot.rotation.y = -a;
      motor.add(slot);
    }
    for (let sN = 0; sN < 3; sN += 1) {
      const a = (sN / 3) * Math.PI * 2 + 0.4;
      const scr = new THREE.Mesh(bellScrew, mat.steel);
      scr.position.set(Math.cos(a) * 0.0078, 0.0222, Math.sin(a) * 0.0078);
      motor.add(scr);
    }

    const nut = new THREE.Mesh(nutGeo, m % 2 === 0 ? mat.ring : mat.brass);
    nut.position.y = 0.0234;
    motor.add(nut);

    motorGroups.push(motor);
    add(3, motor, {
      from: new THREE.Vector3(mx * 0.5, 0.085, mz * 0.5),
      spin: new THREE.Euler(0, Math.PI * 0.8 * PROP_SPIN[m], 0),
      delay: m * 0.16,
    });
  }

  /* ================================================================= 4 LOOM
   * Everything that carries current, in the order it gets soldered: phase
   * wires out to the motors, pack underneath, strap over it, XT60 at the
   * tail, video transmitter and antenna last.
   */

  /* Twelve motor phase wires, three per arm, leaving the ESC's corner pads
   * and running out along the arm to the motor. */
  for (let i = 0; i < 4; i += 1) {
    const [mx, mz] = MOTORS[i];
    const nx = mx / Math.hypot(mx, mz);
    const nz = mz / Math.hypot(mx, mz);
    for (let w = -1; w <= 1; w += 1) {
      const off = w * 0.0026;
      const px = -nz * off;
      const pz = nx * off;
      const geo = wireGeometry([
        [nx * 0.0132 + px, Y.esc + 0.0016, nz * 0.0132 + pz + 0.003],
        [nx * 0.030 + px * 1.2, Y.esc - 0.0016, nz * 0.030 + pz],
        [nx * 0.068 + px, Y.armT * 0.5 + 0.0016, nz * 0.068 + pz],
        [mx - nx * 0.014 + px, Y.armT * 0.5 + 0.0034, mz - nz * 0.014 + pz],
      ], 0.00115, LITE ? 10 : 20);
      add(4, mesh(geo, mat.wire), {
        from: new THREE.Vector3(-nx * 0.02, 0.03, -nz * 0.02),
        delay: i * 0.035 + (w + 1) * 0.012,
      });
    }
  }

  /* The pack, under the bottom plate. */
  const packY = Y.packTop - Y.packH * 0.5;
  const pack = mesh(
    plate(roundedRect(0.0355, 0.075, 0.004), Y.packH, 0.0008, 5),
    mat.battery, 0, packY, 0.008, 1.045,
  );
  add(4, pack, { from: new THREE.Vector3(0, -0.10, 0.02), delay: 0.22 });

  add(4, mesh(new THREE.BoxGeometry(0.0362, 0.0092, 0.030), mat.label, 0, packY + 0.0025, 0.006), {
    from: new THREE.Vector3(0, -0.05, 0), delay: 0.32,
  });
  add(4, mesh(new THREE.BoxGeometry(0.0364, 0.0022, 0.0052), mat.canopy, 0, packY + 0.0092, -0.008), {
    from: new THREE.Vector3(0, -0.05, 0), delay: 0.35,
  });

  /* The strap over the top of the stack and round the pack, with a buckle. */
  add(4, mesh(new THREE.BoxGeometry(0.0135, 0.0016, 0.052), mat.strap, 0, Y.top + Y.topT * 0.5 + 0.0011, 0.006), {
    from: new THREE.Vector3(0, 0.05, 0), delay: 0.40,
  });
  for (const sx of [-1, 1]) {
    add(4, mesh(new THREE.BoxGeometry(0.0016, 0.0700, 0.0135), mat.strap, sx * 0.0225, 0.0035, 0.006), {
      from: new THREE.Vector3(sx * 0.04, 0.02, 0), delay: 0.43,
    });
  }
  add(4, mesh(new THREE.BoxGeometry(0.0125, 0.0038, 0.0155), mat.alu, 0, packY - Y.packH * 0.5 - 0.0012, 0.006), {
    from: new THREE.Vector3(0, -0.04, 0), delay: 0.47,
  });

  /* Battery leads and the XT60. Red and black, 12 AWG silicone, curving up
   * from the plug into the ESC the way they actually route. */
  add(4, mesh(new THREE.BoxGeometry(0.0158, 0.0082, 0.0122), mat.xt60, 0, packY + 0.004, 0.0512), {
    from: new THREE.Vector3(0, 0, 0.06), delay: 0.52,
  });
  add(4, mesh(new THREE.BoxGeometry(0.0138, 0.0062, 0.0016), mat.chip, 0, packY + 0.004, 0.0574), {
    from: new THREE.Vector3(0, 0, 0.06), delay: 0.53,
  });
  add(4, mesh(wireGeometry([
    [0.0036, packY + 0.005, 0.0455],
    [0.0072, Y.esc - 0.006, 0.0300],
    [0.0060, Y.esc + 0.0004, 0.0195],
  ], 0.0022, 18), mat.wireRed), { from: new THREE.Vector3(0, -0.02, 0.04), delay: 0.57 });
  add(4, mesh(wireGeometry([
    [-0.0036, packY + 0.005, 0.0455],
    [-0.0072, Y.esc - 0.006, 0.0300],
    [-0.0060, Y.esc + 0.0004, 0.0195],
  ], 0.0022, 18), mat.wireBlack), { from: new THREE.Vector3(0, -0.02, 0.04), delay: 0.59 });

  /* Balance lead: a white JST and a thin ribbon, tucked along the side. */
  add(4, mesh(new THREE.BoxGeometry(0.0132, 0.0042, 0.0048), mat.label, 0.010, packY + 0.0125, 0.0362), {
    from: new THREE.Vector3(0.03, 0, 0.02), delay: 0.62,
  });

  /* The antenna: a coax pigtail out of the back of the stack, then the
   * sleeve, with a live mint tip. */
  add(4, mesh(wireGeometry([
    [-0.0090, Y.vtx + 0.0018, 0.0102],
    [-0.0150, Y.vtx + 0.0060, 0.0250],
    [-0.0166, Y.vtx + 0.0135, 0.0330],
  ], 0.0014, 16), mat.wireBlack), { from: new THREE.Vector3(0, -0.03, 0.03), delay: 0.76 });

  const mast = mesh(new THREE.CylinderGeometry(0.0026, 0.0026, 0.0225, 10), mat.strap, -0.0172, Y.vtx + 0.0250, 0.0355);
  mast.rotation.z = 0.22;
  mast.rotation.x = -0.24;
  mast.updateMatrix();
  add(4, mast, { from: new THREE.Vector3(0, -0.04, 0.04), delay: 0.80 });

  const tipMat = new THREE.MeshBasicMaterial({ color: P.mint });
  const tip = new THREE.Mesh(new THREE.SphereGeometry(0.0031, 12, 10), tipMat);
  tip.position.set(-0.0198, Y.vtx + 0.0362, 0.0326);
  add(4, tip, { from: new THREE.Vector3(0, -0.04, 0.04), delay: 0.83 });
  lamps.push({ mat: tipMat, base: new THREE.Color(P.mint) });

  /* Under-arm LEDs, the last thing on the loom and the first thing that
   * tells you the pack is in. */
  const leds = [];
  for (let m = 0; m < 4; m += 1) {
    const [mx, mz] = MOTORS[m];
    const front = mz < 0;
    const hex = front ? P.canopy : P.mint;
    const lm = new THREE.MeshBasicMaterial({ color: hex });
    const led = new THREE.Mesh(new THREE.BoxGeometry(0.0058, 0.0016, 0.0125), lm);
    dummy.position.set(mx * 0.66, -Y.armT * 0.5 - 0.0008, mz * 0.66);
    dummy.lookAt(mx, -Y.armT * 0.5 - 0.0008, mz);
    dummy.updateMatrix();
    led.position.copy(dummy.position);
    led.quaternion.copy(dummy.quaternion);
    leds.push({ mat: lm, base: new THREE.Color(hex) });
    add(4, led, {
      from: new THREE.Vector3(mx, 0, mz).normalize().multiplyScalar(0.04),
      delay: 0.86 + m * 0.03,
    });
  }

  /* =============================================================== 5 CAMERA
   * The cage goes on the nose, the camera pushes back into it, the lens
   * screws on, then the canopy comes down over the lot. Order matters here
   * and it is the order a builder uses.
   */
  const cameraMount = new THREE.Group();
  cameraMount.position.set(0, CAMERA_MOUNT_UP, -CAMERA_MOUNT_FORWARD);

  const housing = new THREE.Mesh(new THREE.BoxGeometry(0.0192, 0.0192, 0.0212), mat.camBody);
  housing.position.set(0, 0, -0.0022);
  housing.castShadow = true;
  outlineHull(housing, 1.06, ink);
  cameraMount.add(housing);

  /* A lens barrel is three rings, not one cylinder: the mount, the focus
   * ring and the front element's collar. */
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.0092, 0.0098, 0.0068, 18), mat.camBody);
  barrel.rotation.x = Math.PI * 0.5;
  barrel.position.set(0, 0, -0.0152);
  cameraMount.add(barrel);
  const focus = new THREE.Mesh(new THREE.CylinderGeometry(0.0086, 0.0086, 0.0052, 22), mat.chip);
  focus.rotation.x = Math.PI * 0.5;
  focus.position.set(0, 0, -0.0206);
  cameraMount.add(focus);
  const collar = new THREE.Mesh(new THREE.TorusGeometry(0.0084, 0.0014, 8, 20), mat.ring);
  collar.position.set(0, 0, -0.0234);
  cameraMount.add(collar);
  const glass = new THREE.Mesh(new THREE.SphereGeometry(0.0076, 18, 12, 0, Math.PI * 2, 0, Math.PI * 0.42), mat.lens);
  glass.rotation.x = -Math.PI * 0.5;
  glass.position.set(0, 0, -0.0238);
  cameraMount.add(glass);

  add(5, cameraMount, { from: new THREE.Vector3(0, 0, -0.075), delay: 0.10 });

  /* The cage ears that hold the camera and set its tilt. */
  for (const sx of [-1, 1]) {
    const ear = mesh(
      plate(roundedRect(0.026, 0.024, 0.005), 0.0022, 0.0004, 6),
      mat.carbon, sx * 0.0118, CAMERA_MOUNT_UP - 0.0008, -CAMERA_MOUNT_FORWARD + 0.001, 1.05,
    );
    ear.rotation.set(Math.PI * 0.5, 0, -Math.PI * 0.5);
    ear.updateMatrix();
    add(5, ear, { from: new THREE.Vector3(sx * 0.04, 0, -0.01), delay: sx > 0 ? 0 : 0.05 });
  }

  /* Camera signal lead, back into the stack. */
  add(5, mesh(wireGeometry([
    [0.0052, CAMERA_MOUNT_UP - 0.0026, -CAMERA_MOUNT_FORWARD + 0.010],
    [0.0090, Y.fc + 0.0060, -0.040],
    [0.0128, Y.fc + 0.0022, -0.0142],
  ], 0.0012, 18), mat.wire), { from: new THREE.Vector3(0, 0.02, -0.03), delay: 0.26 });

  /* The canopy. A printed TPU shell, faceted, over the camera. */
  const podGeo = new THREE.IcosahedronGeometry(0.0292, 1);
  podGeo.computeVertexNormals();
  const pod = new THREE.Mesh(podGeo, mat.canopy);
  pod.scale.set(1.06, 0.74, 1.46);
  pod.position.set(0, 0.0242, -0.0555);
  pod.castShadow = true;
  outlineHull(pod, 1.07, 0x1a1214);
  add(5, pod, { from: new THREE.Vector3(0, 0.095, 0), delay: 0.40 });

  add(5, mesh(new THREE.BoxGeometry(0.0305, 0.0125, 0.0072), mat.canopyDeep, 0, 0.0242, -0.0818), {
    from: new THREE.Vector3(0, 0.06, -0.03), delay: 0.60,
  });
  add(5, mesh(new THREE.BoxGeometry(0.0225, 0.0042, 0.0038), mat.strap, 0, 0.0132, -0.0862), {
    from: new THREE.Vector3(0, 0, -0.04), delay: 0.70,
  });

  /* ================================================================ 6 PROPS
   * Last, always. They drop on spinning, which is the one place in this
   * build where the flourish is also the truth: a prop nut goes on with a
   * twist.
   */
  const bladeGeo = bladeGeometry(SEG.blade);
  const hubGeo = new THREE.CylinderGeometry(0.0082, 0.0090, 0.0052, SEG.lathe);
  const hubBore = new THREE.CylinderGeometry(0.0026, 0.0026, 0.0058, SEG.round);
  const rotors = [];
  const discs = [];
  const blurFront = blurTexture(P.propFront);
  const blurRear = blurTexture(0x8f9a8c);

  for (let m = 0; m < 4; m += 1) {
    const [mx, mz] = MOTORS[m];
    const front = mz < 0;
    const propMat = front ? mat.propFront : mat.propRear;

    const rotor = new THREE.Group();
    rotor.position.set(mx, Y.prop, mz);
    const hub = new THREE.Mesh(hubGeo, propMat);
    hub.castShadow = true;
    rotor.add(hub);
    rotor.add(new THREE.Mesh(hubBore, mat.chip));
    for (let b = 0; b < 3; b += 1) {
      const blade = new THREE.Mesh(bladeGeo, propMat);
      /* Mirror the blade for the two counter rotating props, so the
       * aerofoil faces the way it turns. A prop that pushes the wrong way
       * is the single most common thing a viewer who flies will spot. */
      blade.scale.z = PROP_SPIN[m] > 0 ? 1 : -1;
      blade.rotation.y = (b * Math.PI * 2) / 3;
      blade.castShadow = true;
      rotor.add(blade);
    }
    rotors.push(rotor);
    add(6, rotor, {
      from: new THREE.Vector3(0, 0.072, 0),
      spin: new THREE.Euler(0, Math.PI * 1.5 * PROP_SPIN[m], 0),
      delay: m * 0.13,
    });

    const disc = new THREE.Mesh(
      new THREE.PlaneGeometry(CRAFT_PROP_R * 2.06, CRAFT_PROP_R * 2.06),
      new THREE.MeshBasicMaterial({
        map: front ? blurFront : blurRear,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
    );
    disc.rotation.x = -Math.PI * 0.5;
    disc.position.set(mx, Y.prop, mz);
    disc.renderOrder = 2;
    disc.visible = false;
    group.add(disc);
    discs.push(disc);
  }

  /* ================================================================ scrubber
   *
   * `progress` is 0 to 1 across the whole build. Which stage is landing and
   * how far through it we are both fall out of one multiply, and every part
   * is placed from that, so the build is a pure function of its input and
   * can be dragged backwards as happily as forwards.
   */
  const tmpQ = new THREE.Quaternion();
  const fromQ = new THREE.Quaternion();

  /*
   * Fit each stage's delays into the room its parts actually have.
   *
   * A part written with a delay of 1.06 and a span of 0.34 would still be
   * two thirds through its travel when its stage ended, and would then be
   * frozen there while the next stage played. Rather than hand balance every
   * number against every other, the delays are written in whatever order
   * reads well and are normalised here so the last one lands exactly as its
   * stage finishes.
   */
  for (const list of parts) {
    let maxDelay = 0;
    for (const rec of list) {
      maxDelay = Math.max(maxDelay, rec.delay);
    }
    const room = 1 - PART_SPAN;
    const k = maxDelay > room ? room / maxDelay : 1;
    for (const rec of list) {
      rec.delayN = rec.delay * k;
    }
  }

  /*
   * Returns how far it has got as a FRACTIONAL STAGE INDEX. The page's build
   * ticker reads that: with unequal stage weights the caller can no longer
   * work it out from the progress alone.
   */
  function setBuild(progress) {
    const scaled = clamp01(progress) * STAGE_TOTAL;
    let reached = 0;
    for (let sIdx = 0; sIdx < STAGES.length; sIdx += 1) {
      const local = clamp01((scaled - STAGE_AT[sIdx]) / STAGES[sIdx].weight);
      reached += local;
      const list = parts[sIdx];
      for (let i = 0; i < list.length; i += 1) {
        const rec = list[i];
        const t = clamp01((local - rec.delayN) / PART_SPAN);
        if (t <= 0) {
          rec.obj.visible = false;
          continue;
        }
        rec.obj.visible = true;
        const e = t >= 1 ? 1 : backOut(t);
        rec.obj.position.copy(rec.pos).addScaledVector(rec.from, 1 - e);
        if (rec.spin) {
          fromQ.setFromEuler(rec.spin);
          tmpQ.copy(rec.quat).multiply(fromQ);
          rec.obj.quaternion.copy(tmpQ).slerp(rec.quat, clamp01(e));
        }
      }
    }
    /* Which props are actually fitted, recorded so spin() can hide a blurred
     * rotor without also revealing three that have not arrived yet. */
    for (let m = 0; m < 4; m += 1) {
      rotorBuilt[m] = rotors[m].visible;
    }
    return reached;
  }

  /*
   * Spin the props. Above a certain throttle the blades stop being drawn and
   * the blur ring takes over, because a tri-blade at 26 000 rpm sampled at
   * 60 Hz is a strobe, and a strobe is a less honest picture of a spinning
   * prop than a blur is.
   */
  let spinPhase = 0;
  /* Which props have been fitted, PER ROTOR, recorded by the scrubber. Not
   * one flag for all four: a single flag made every prop appear the instant
   * the props stage began, which threw away the one at a time cascade that
   * the stage exists for. */
  const rotorBuilt = [false, false, false, false];
  function spin(dt, throttle) {
    spinPhase += dt * throttle * 240;
    const blurred = throttle > 0.42;
    for (let m = 0; m < 4; m += 1) {
      rotors[m].rotation.y = spinPhase * PROP_SPIN[m];
      rotors[m].visible = rotorBuilt[m] && !blurred;
      /* The blur only exists once the prop is actually moving. Drawn at an
       * idle it is a grey plate hanging round a stationary blade. */
      discs[m].visible = rotorBuilt[m] && throttle > 0.30;
      if (discs[m].visible) {
        discs[m].material.opacity = Math.min(0.92, Math.max(0, (throttle - 0.30) * 1.9));
        /*
         * The disc does NOT get spun, and that is a fix rather than an
         * omission.
         *
         * It was being turned with rotation.y. The disc is a plane laid flat
         * by rotation.x = -PI/2, and Three composes Euler XYZ as Rx.Ry.Rz,
         * so a y term is applied BEFORE the plate is laid down: it tilted
         * the disc up onto its edge instead of turning it in its own plane.
         * Four blur discs standing vertically beside the motors is exactly
         * what "the props are spinning on the wrong axis" looks like.
         *
         * The correct axis here would be z, which spins the plane before it
         * is laid flat. But the texture is a radial gradient and is
         * symmetric about its own centre, so turning it is invisible work.
         * The disc stays still and stays flat.
         */
      }
    }
  }

  /* The lamps: off while it is being built, live once there is a pack in
   * it. */
  function setArmed(on) {
    for (const l of lamps) {
      l.mat.color.copy(l.base).multiplyScalar(on ? 1 : 0.30);
    }
    for (const l of leds) {
      l.mat.color.copy(l.base).multiplyScalar(on ? 1 : 0.22);
    }
  }

  setBuild(0);
  setArmed(false);

  return {
    group,
    cameraMount,
    setBuild,
    spin,
    setArmed,
    stages: STAGES,
  };
}
