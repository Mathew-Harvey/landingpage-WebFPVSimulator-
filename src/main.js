/*
 * main.js: the timeline. What the page is doing at any point in its scroll,
 * and who gets told about it.
 *
 * ONE clock drives everything. `T` is a continuous number over the whole
 * page: 0 to 1 is the build, 1 to 2 is the track, 2 to 3 is the flight, 3 to
 * 4 is the close. It is measured off the sections' real offsets rather than
 * assumed from their CSS heights, so changing a section's length in the
 * stylesheet re-times the film instead of desynchronising it.
 *
 * Every visual is a pure function of T. That is the rule the whole file
 * obeys, and it is what makes the page scrubbable: drag the scrollbar
 * anywhere and the frame you get is the frame that belongs there, because
 * nothing is accumulating state between frames except the damping.
 *
 * The one exception is the opening. The brief was "I open the page and I see
 * a drone assemble in front of me", so the build has its own clock too, and
 * the value used is whichever of the two is further along. A visitor who
 * does nothing watches it build; a visitor who scrolls immediately scrubs
 * past it. Neither gets a half built quad.
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
import { createStage } from './stage.js';
import { buildDrone, CAMERA_MOUNT_FORWARD, CAMERA_MOUNT_UP } from './drone.js';
import { buildCourse, GATE_COUNT, GATE_CENTRE_Y } from './course.js';
import { destinations } from './config.js';

const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/*
 * ?t=<number> pins the timeline. 0 to 1 is the build, 1 to 2 the track, 2 to
 * 3 the flight, 3 to 4 the close, so ?t=2.5 is the middle of a lap.
 *
 * This exists because the page cannot otherwise be inspected: every frame is
 * a function of a scroll position and an eight second autoplay, and a
 * headless check, a screenshot for a review, or a bug report about "the bit
 * where the gates come up" all need to name a frame. It is one parameter and
 * it changes nothing when it is absent.
 */
const PIN = (() => {
  const raw = new URLSearchParams(window.location.search).get('t');
  if (raw === null) {
    return null;
  }
  const v = Number.parseFloat(raw);
  return Number.isFinite(v) ? Math.max(0, Math.min(4, v)) : null;
})();

const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (t) => t * t * (3 - 2 * t);
/* Normalised position inside a range, 0 before it and 1 after. The whole
 * timeline is written in these. */
const seg = (v, a, b) => clamp01((v - a) / (b - a || 1e-6));
const ease = (v, a, b) => smooth(seg(v, a, b));

/* ------------------------------------------------------------------ copy */

/*
 * The copy that rides the lap, keyed to a fraction of it.
 *
 * The labels used to name gates ("Gate 4"), which put them in an argument
 * with the OSD's own gate counter three feet above them: the beat is pinned
 * to a distance along the line and the counter to the nearest gate plane,
 * and the two do not agree. Naming the SUBJECT instead is both truer and
 * better copy.
 */
const BEATS = [
  {
    at: 0.02,
    k: 'The physics',
    t: 'Betaflight 4.5.1, compiled to WebAssembly, running the real control loop at 1 kHz.',
  },
  {
    at: 0.24,
    k: 'Your tune',
    t: 'Drop your own Betaflight CLI diff on the page and fly your rates, your PIDs, your filters.',
  },
  {
    at: 0.44,
    k: 'Determinism',
    t: 'Fixed timestep physics. A dropped frame changes nothing about where you end up.',
  },
  {
    at: 0.64,
    k: 'Sticks',
    t: 'Plug in a radio in joystick mode, or fly it on the keyboard until one turns up.',
  },
  {
    at: 0.84,
    k: 'The board',
    t: 'Publish the course, post the lap, and let somebody else try to take it off you.',
  },
];

const BOOT_NOTES = [
  'Torquing the arms',
  'Soldering the stack',
  'Balancing props',
  'Checking motor direction',
];

/* ------------------------------------------------------------------- boot */

const canvas = document.getElementById('stage');
const bootEl = document.getElementById('boot');
const bootFill = document.getElementById('boot-fill');
const bootNote = document.getElementById('boot-note');

let bootCleared = false;
function clearBoot() {
  if (bootCleared || !bootEl) {
    return;
  }
  bootCleared = true;
  bootEl.classList.add('gone');
  setTimeout(() => bootEl.remove(), 900);
}

/*
 * The boot screen comes down on the first rendered frame, and failing that
 * after four seconds regardless. The fallback is not paranoia: a background
 * tab does not run requestAnimationFrame, so a page opened in one and read
 * later would otherwise be a permanent loading screen over a finished page.
 */
setTimeout(clearBoot, 4000);

function fail() {
  document.getElementById('nowebgl').classList.add('on');
  clearBoot();
}

if (!canvas || !canvas.getContext) {
  fail();
}

let stage;
try {
  stage = createStage(canvas);
} catch (err) {
  console.error('stage: could not start WebGL', err);
  fail();
  throw err;
}

/* --------------------------------------------------------------- the world */

const drone = buildDrone();
const droneRig = new THREE.Group();
droneRig.add(drone.group);
stage.scene.add(droneRig);

const course = buildCourse();
stage.scene.add(course.group);

/*
 * Where each gate sits along the racing line, as an arc length fraction.
 * Measured off the curve rather than assumed from the control point index,
 * because getPointAt is arc length parameterised and the control points are
 * not evenly spaced along it. Done once.
 */
const GATE_S = (() => {
  const N = 1200;
  const pts = [];
  for (let i = 0; i <= N; i += 1) {
    pts.push(course.line.getPointAt(i / N));
  }
  return course.gates.map((g) => {
    let best = 0;
    let bestD = Infinity;
    for (let i = 0; i <= N; i += 1) {
      const p = pts[i];
      const d = (p.x - g.pos.x) ** 2 + (p.z - g.pos.z) ** 2;
      if (d < bestD) {
        bestD = d;
        best = i;
      }
    }
    return best / N;
  });
})();

/*
 * Where the lap begins, as a fraction of the racing line, measured back from
 * gate 1 so the quad has a run up to the start.
 */
const LAP_START = 0.955;

/*
 * The gates again, but on the LAP's clock rather than the curve's: every
 * gate that sits before the start point belongs to the lap that is about to
 * be flown, so it is a whole turn later. Without this the gate counter jumps
 * straight to seven on the first frame of the flight, because gate 1 is at
 * 0.02 and the lap starts at 0.955.
 *
 * NOT sorted. The index into this array is the index into the course's gate
 * meshes, and re-ordering it would light the wrong gate.
 */
const GATE_LAP = GATE_S.map((g) => (g < LAP_START ? g + 1 : g));

/*
 * A speed profile for the lap, from the line's own curvature. This is what
 * the OSD reads, and it is deliberately NOT the scroll's velocity: a page
 * that reports 0 km/h whenever a reader stops moving their finger is a page
 * whose instruments are about the reader rather than about the aircraft.
 * Fast on the straight, slow through the S, exactly like a real lap.
 */
const SPEED = (() => {
  const N = 240;
  const raw = new Float32Array(N);
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  for (let i = 0; i < N; i += 1) {
    course.line.getTangentAt(i / N, a);
    course.line.getTangentAt(((i + 4) % N) / N, b);
    const turn = a.angleTo(b);
    /* 0 rad of turn over that window is a straight, 0.5 is the tightest
     * corner on this layout. */
    raw[i] = lerp(104, 42, clamp01(turn / 0.42));
  }
  /* Smoothed both ways, so the number does not flicker at a control point. */
  const out = new Float32Array(N);
  for (let i = 0; i < N; i += 1) {
    let sum = 0;
    for (let k = -6; k <= 6; k += 1) {
      sum += raw[(i + k + N) % N];
    }
    out[i] = sum / 13;
  }
  return out;
})();

function speedAt(s) {
  const N = SPEED.length;
  const f = ((s % 1) + 1) % 1 * N;
  const i = Math.floor(f);
  return lerp(SPEED[i % N], SPEED[(i + 1) % N], f - i);
}

/* Nominal lap time, integrated from that profile, so the clock and the
 * speedometer cannot disagree. */
const LAP_LENGTH = course.line.getLength();
const LAP_TIME = (() => {
  const N = SPEED.length;
  let t = 0;
  for (let i = 0; i < N; i += 1) {
    t += (LAP_LENGTH / N) / (SPEED[i] / 3.6);
  }
  return t;
})();

/* ---------------------------------------------------------------- the page */

const el = {
  ledger: document.getElementById('ledger'),
  nav: document.getElementById('nav'),
  cue: document.getElementById('cue'),
  veil: document.getElementById('veil'),
  ticker: document.getElementById('ticker'),
  tickRows: document.getElementById('tick-rows'),
  tickCount: document.getElementById('tick-count'),
  tickFill: document.getElementById('tick-fill'),
  builder: document.getElementById('builder'),
  tbGates: document.getElementById('tb-gates'),
  tbLen: document.getElementById('tb-len'),
  tbWarn: document.getElementById('tb-warn'),
  tbSeq: document.getElementById('tb-seq'),
  tbXy: document.getElementById('tb-xy'),
  osd: document.getElementById('osd'),
  osdTimer: document.getElementById('osd-timer'),
  osdGate: document.getElementById('osd-gate'),
  osdSpeed: document.getElementById('osd-speed'),
  osdVolts: document.getElementById('osd-volts'),
  osdThrottle: document.getElementById('osd-throttle'),
  osdBatt: document.getElementById('osd-batt'),
  beats: document.getElementById('beats'),
  cards: document.getElementById('cards'),
  foot: document.getElementById('foot'),
};

const ACTS = [...document.querySelectorAll('[data-act]')];
const CLOSE = document.getElementById('close');
const COPIES = new Map();
for (const c of document.querySelectorAll('[data-copy]')) {
  COPIES.set(c.dataset.copy, c);
}

/*
 * The launch links.
 *
 * Every one of them is already in the static markup, pointing at production.
 * This does not build them, it RETARGETS them, and only when the page is
 * being served from a loopback address, where the sim is on 8000 and the
 * board on 3100.
 *
 * Built rather than written is the tempting way round and it is the wrong
 * one: it makes three links that are the entire point of the page depend on
 * a module graph, a CDN and a working WebGL context. A visitor whose network
 * ate the three.js request should still be one click from flying.
 */
{
  const byDest = new Map(destinations().map((d) => [d.id, d]));
  for (const a of document.querySelectorAll('[data-dest]')) {
    const d = byDest.get(a.dataset.dest);
    if (d && a.getAttribute('href') !== d.href) {
      a.href = d.href;
    }
  }
}

/* The act ledger down the left edge. */
const LEDGER = [
  { id: 'assemble', label: 'Build' },
  { id: 'build', label: 'Track' },
  { id: 'fly', label: 'Fly' },
  { id: 'close', label: 'Practise' },
];
const ledgerRows = LEDGER.map((r) => {
  const row = document.createElement('div');
  row.className = 'ledger-row';
  row.innerHTML = `<span class="ledger-tick"></span><span>${r.label}</span>`;
  el.ledger.append(row);
  return row;
});

/* The build ticker. */
const tickRows = drone.stages.map((s) => {
  const row = document.createElement('div');
  row.className = 'tick-row';
  row.innerHTML = `<span class="tick-dot"></span><span>${s.label}</span>`;
  el.tickRows.append(row);
  return row;
});

/* The builder's sequence chips. */
const seqNodes = [];
for (let i = 1; i <= GATE_COUNT; i += 1) {
  const n = document.createElement('span');
  n.className = 'tb-node';
  n.textContent = String(i);
  el.tbSeq.append(n);
  seqNodes.push(n);
}

/* The flight beats. */
const beatEls = BEATS.map((b) => {
  const d = document.createElement('div');
  d.className = 'beat';
  d.innerHTML = `<div class="beat-k">${b.k}</div><div class="beat-t">${b.t}</div>`;
  el.beats.append(d);
  return d;
});

/* ------------------------------------------------------------- the timeline */

let bounds = null;
function measure() {
  const vh = window.innerHeight;
  const list = ACTS.map((node) => ({
    id: node.dataset.act,
    top: node.offsetTop,
    height: node.offsetHeight,
  }));
  const closeTop = CLOSE.offsetTop;
  const docEnd = Math.max(
    closeTop + vh,
    document.documentElement.scrollHeight - vh,
  );
  bounds = { list, closeTop, docEnd, vh };
}

/*
 * Scroll to T. Contiguous by construction: an act's progress is measured
 * over its FULL height, so act one reaches 1 exactly where act two starts
 * and the camera never stalls in the handover between two sticky pins.
 */
function timeline(y) {
  const { list, closeTop, docEnd } = bounds;
  for (let i = 0; i < list.length; i += 1) {
    const a = list[i];
    if (y < a.top + a.height || i === list.length - 1) {
      if (y < a.top) {
        return i;
      }
      if (y >= a.top + a.height) {
        break;
      }
      return i + clamp01((y - a.top) / a.height);
    }
  }
  return 3 + clamp01((y - closeTop) / Math.max(1, docEnd - closeTop));
}

/* -------------------------------------------------------------- the camera */

const eye = new THREE.Vector3();
const at = new THREE.Vector3();
const up = new THREE.Vector3(0, 1, 0);
const m4 = new THREE.Matrix4();
const qWant = new THREE.Quaternion();
const qTmp = new THREE.Quaternion();
const qBias = new THREE.Quaternion();
const AXIS_Y = new THREE.Vector3(0, 1, 0);
const AXIS_X = new THREE.Vector3(1, 0, 0);
const vTmp = new THREE.Vector3();
const vTmp2 = new THREE.Vector3();

function lookQuat(from, to, out) {
  m4.lookAt(from, to, up);
  return out.setFromRotationMatrix(m4);
}

/* The studio orbit. Close, low, and turning: a product shot where the
 * subject is 155 mm long has to move or there is nothing to look at. */
/*
 * How high the hero hovers over the studio floor.
 *
 * It is not zero, and that is a bug fix rather than a preference: the world's
 * ground plane lives at y = 0 for the sake of the track, so a quad centred on
 * the origin is cut in half by it and loses its pack, its bottom plate and
 * its underside LEDs to a floor nobody can see. Hovering it clear also gives
 * the shadow something to fall onto.
 */
const STUDIO_Y = 0.105;

function poseStudio(t, outPos, outQuat) {
  const az = lerp(-1.25, 0.42, smooth(t));
  const r = lerp(1.78, 1.30, smooth(clamp01(t * 1.08)));
  const h = STUDIO_Y + lerp(0.80, 0.40, smooth(t));
  outPos.set(Math.sin(az) * r, h, Math.cos(az) * r);
  at.set(0, STUDIO_Y + lerp(0.012, 0.020, t), 0);
  lookQuat(outPos, at, outQuat);
  applyBias(outQuat);
}

/*
 * Turning the camera to its own left slides the subject right; tilting it up
 * slides the subject down. Both are applied in the camera's LOCAL frame, so
 * they compose with whatever the pose already decided to look at.
 */
function applyBias(q, yawScale = 1, pitchScale = 1) {
  const b = stage.composeBias();
  const yaw = b.yaw * yawScale;
  const pitch = b.pitch * pitchScale;
  if (yaw) {
    qBias.setFromAxisAngle(AXIS_Y, yaw);
    q.multiply(qBias);
  }
  if (pitch) {
    qBias.setFromAxisAngle(AXIS_X, pitch);
    q.multiply(qBias);
  }
}

/* The builder view. High, three quarters on, drifting: an architect's
 * model being walked around, not a turntable. */
function poseBuilder(t, outPos, outQuat) {
  const az = lerp(-0.58, 0.20, smooth(t));
  const dist = lerp(88, 62, smooth(t));
  const h = lerp(47, 26, smooth(t));
  outPos.set(Math.sin(az) * dist, h, Math.cos(az) * dist - 1);
  at.set(0, lerp(4.0, 1.6, smooth(t)), -1);
  lookQuat(outPos, at, outQuat);
  /* Only a touch of it here. The hero shot can afford to sit the subject in
   * a corner; a 31 m course framed to one side just falls off the screen. */
  applyBias(outQuat, 0.55, 0.30);
}

/* Chase: behind and above the quad, the camera a spotter would hold. */
function poseChase(pos, quat, back, high, outPos, outQuat) {
  vTmp.set(0, 0, 1).applyQuaternion(quat).multiplyScalar(back);
  outPos.copy(pos).add(vTmp);
  outPos.y += high;
  /* Aimed four and a half metres ahead rather than six: looking further out
   * tips the camera down and pushes the quad off the bottom of the frame,
   * which it was doing on exactly the shot the page builds to. */
  vTmp2.set(0, 0, -4.5).applyQuaternion(quat).add(pos);
  lookQuat(outPos, vTmp2, outQuat);
}

/*
 * FPV. The camera sits where the camera sits: 80 mm forward of the airframe
 * centre and 18 mm up, tilted 30 degrees up from the airframe, which are the
 * simulator's own mount and its default angle. The airframe is pitched nose
 * down to fly, so the net view is about 12 degrees above level, which is
 * what an FPV feed actually looks like.
 */
const CAM_TILT = THREE.MathUtils.degToRad(30);
const qTilt = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), CAM_TILT);
function poseFPV(pos, quat, outPos, outQuat) {
  vTmp.set(0, CAMERA_MOUNT_UP, -CAMERA_MOUNT_FORWARD).applyQuaternion(quat);
  outPos.copy(pos).add(vTmp);
  outQuat.copy(quat).multiply(qTilt);
}

/*
 * The close. The machine hovering over its own start gate with the course
 * and the low sun behind it, pulling back and up as the headline arrives.
 *
 * It orbits the PARKED QUAD rather than the world origin, which is the whole
 * of the fix here: the origin is the middle of an empty infield, so a hero
 * shot framed on it was a photograph of some grass with the subject somewhere
 * off to the left.
 */
/*
 * The close: the whole course at golden hour, seen from high and behind,
 * pulling further out as the headline lands.
 *
 * It frames the COURSE, not the quad, and that is a decision the layout
 * forces. The closing line is centred and the three launch cards span most
 * of the width beneath it, so the only clear areas are the sky and the
 * margins: a 0.35 m airframe placed in either is a speck or a crop. What the
 * last frame of the page should say is "here is the thing you get", and the
 * thing you get is a race track. The quad is still there, hovering over its
 * start gate, as the detail that tells you the scale of the rest.
 */
function poseHero(t, outPos, outQuat) {
  const az = lerp(0.42, 0.96, smooth(t));
  const dist = lerp(46, 72, smooth(t));
  const h = lerp(25, 37, smooth(t));
  outPos.set(Math.sin(az) * dist, h, Math.cos(az) * dist);
  at.set(0, 2.0, 0);
  lookQuat(outPos, at, outQuat);
}

/* ------------------------------------------------------------ the aircraft */

const dronePos = new THREE.Vector3();
const droneQuat = new THREE.Quaternion();
const parked = new THREE.Vector3();

/* Where the quad ends up for the close: over the start and finish gate,
 * a little above its opening, turned across the course. */
const PARK = new THREE.Vector3(
  course.gates[0].pos.x,
  GATE_CENTRE_Y + 1.15,
  course.gates[0].pos.z,
);
const PARK_YAW = course.gates[0].yaw + Math.PI + 0.55;
const eul = new THREE.Euler(0, 0, 0, 'YXZ');

/*
 * Where the quad is while the track is being drawn: held in camera space as
 * a foreground object, so a 155 mm airframe stays readable in a shot framing
 * a 31 m course.
 *
 * HELD_IN is deliberately the exact spot the quad already occupies when the
 * studio orbit ends, which is 0.395 m straight down the lens. Blending from
 * there to HELD_OUT means the hero never jumps: it simply drifts into the
 * corner of frame as the camera pulls away from it.
 */
/*
 * Bottom right of frame and well down the lens. The act 2 copy owns the left
 * and the builder's inspector owns the top right, so this is the corner that
 * is actually free. 2.2 m at the plan view's 46 degree lens makes the quad
 * about a fifth of the frame's width: foreground, clearly nearer than the
 * course, and not competing with it. It has to be measured against THAT
 * lens rather than the hero's, or the same offset that reads as foreground
 * at 24 degrees reads as a bug sitting on the track at 46.
 */
const HELD_OUT = new THREE.Vector3(0.46, -0.50, -2.2);
const held = new THREE.Vector3();
const qInv = new THREE.Quaternion();
const refPos = new THREE.Vector3();
const refQuat = new THREE.Quaternion();

/*
 * Where the hero sits in CAMERA space while the track is being drawn.
 *
 * The near end is where the STUDIO left it, and it is measured against the
 * studio's own final camera rather than against the live one. That
 * distinction is a bug: the live camera is in the middle of retreating from
 * 1.3 m to 86 m, so measuring against it made the offset grow with the
 * retreat and the quad was dragged 28 m out into the world, shrinking to a
 * speck, before being hauled back into the foreground. Measured against the
 * fixed studio pose the offset is a constant and the quad simply rides
 * along.
 *
 * It is computed rather than typed because the composition bias rotates the
 * camera by an amount that depends on the window's aspect, so a typed
 * constant would jump on every window but the one it was measured on.
 */
function heldOffset(k, out) {
  poseStudio(1, refPos, refQuat);
  out.set(0, STUDIO_Y, 0).sub(refPos).applyQuaternion(qInv.copy(refQuat).invert());
  return out.lerp(HELD_OUT, k);
}

function flightPose(s, outPos, outQuat, bobPhase) {
  course.line.getPointAt(((s % 1) + 1) % 1, outPos);
  course.line.getTangentAt(((s % 1) + 1) % 1, vTmp);
  const yaw = Math.atan2(vTmp.x, vTmp.z) + Math.PI;

  /* Bank from how fast the heading is changing, which is the only honest
   * source for it: a roll angle picked per gate would fight the curve. */
  course.line.getTangentAt(((s + 0.012) % 1 + 1) % 1, vTmp2);
  const yaw2 = Math.atan2(vTmp2.x, vTmp2.z) + Math.PI;
  let dyaw = yaw2 - yaw;
  while (dyaw > Math.PI) dyaw -= Math.PI * 2;
  while (dyaw < -Math.PI) dyaw += Math.PI * 2;
  /* Banked, but not knife edge. 0.85 rad is 49 degrees of roll, which put
   * the horizon on the diagonal for a third of the lap and made every
   * screenshot of the flight look like a crash in progress. */
  const roll = THREE.MathUtils.clamp(dyaw * 2.0, -0.52, 0.52);

  /* Nose down to go, and more of it where the line is fast. */
  const fast = clamp01((speedAt(s) - 42) / 62);
  const pitch = -lerp(0.16, 0.40, fast);

  eul.set(pitch, yaw, roll);
  outQuat.setFromEuler(eul);
  /* A little vertical float, because a quad on a line is still a quad. */
  outPos.y += Math.sin(bobPhase) * 0.035;
}

/* ------------------------------------------------------------------ update */

let scrollTarget = 0;
let scrollNow = 0;
let autoBuild = 0;
let clock = 0;
let lastT = -1;
let bootDone = false;

const camPos = new THREE.Vector3();
const camQuat = new THREE.Quaternion();
const pos2 = new THREE.Vector3();
const quat2 = new THREE.Quaternion();

function setCopy(id, on) {
  const c = COPIES.get(id);
  if (c) {
    c.classList.toggle('on', on);
  }
}

function fmtTime(s) {
  return s.toFixed(2);
}

function frame(ms) {
  const now = ms * 0.001;
  const dt = Math.min(0.05, now - clock || 0.016);
  clock = now;

  scrollTarget = window.scrollY || window.pageYOffset || 0;
  /* Critically damped enough to feel like film and not like syrup. A raw
   * scroll value makes a 3D camera judder on every wheel notch. */
  scrollNow += (scrollTarget - scrollNow) * Math.min(1, dt * 9.5);
  if (Math.abs(scrollTarget - scrollNow) < 0.4) {
    scrollNow = scrollTarget;
  }

  const T = REDUCED ? 2.55 : (PIN !== null ? PIN : timeline(scrollNow));

  /* ---------------------------------------------------------------- build */
  /* Pinned, the build is the pin's business alone: an autoplay would race
   * the parameter and the frame would not be reproducible. */
  /* Thirteen and a half seconds, not eight. The frame alone is a third of
   * the sequence and thirty five parts; at the old pace it went by in about
   * a second and read as a flicker rather than as a build. */
  autoBuild = PIN !== null ? 0 : Math.min(1, autoBuild + dt / 13.5);
  const scrubBuild = ease(T, 0.015, 0.80);
  const built = REDUCED ? 1 : Math.max(autoBuild, scrubBuild);
  /* The scrubber reports a fractional stage index, because the stages are no
   * longer equal lengths and the ticker cannot infer it from `built`. */
  const landed = drone.setBuild(built);
  drone.setArmed(built > 0.999);

  /* ---------------------------------------------------------------- track */
  const courseT = REDUCED ? 1 : ease(T, 1.01, 1.90);
  const state = course.setBuild(courseT);

  /* --------------------------------------------------------------- regime */
  const scale = ease(T, 0.94, 1.16);
  const world = REDUCED ? 1 : ease(T, 1.97, 2.19);
  course.setWorld(world);
  stage.setRegime(scale, world);
  /*
   * Three lenses, and the page changes between them rather than crossfading
   * one long one into one wide one.
   *
   *   24 deg  the hero. A long lens makes a 0.35 m machine read as a
   *           machine; a wide one makes it a toy on a table.
   *   46 deg  the plan. A 31 m course does not fit in a telephoto: at 24
   *           degrees and 46 m out the frame is 19.6 m across and two thirds
   *           of the track is off the sides of it.
   *   104 deg the lap, which is what an FPV camera actually is.
   *
   * The contrast between the first and the last is the payoff of the piece.
   */
  stage.setFov(
    T < 1.0 ? 24
      : T < 1.98 ? lerp(24, 46, ease(T, 1.0, 1.34))
        : T < 2.9 ? lerp(46, 104, ease(T, 1.98, 2.24))
          : lerp(104, 58, ease(T, 2.92, 3.20)),
  );

  /* ------------------------------------------------------------- aircraft */
  const flying = ease(T, 2.06, 2.92);
  /*
   * The lap starts SHORT of gate 1, not on it.
   *
   * Starting on it put the quad in the gate's own opening at the moment the
   * flight began, which meant the chase camera two and a half metres behind
   * it was inside the frame, and the union, the shot the whole page builds
   * to, was a close up of the back of a printed banner. Beginning six metres
   * out means the quad drops onto the line, and the first thing that happens
   * is that it flies through the start gate.
   */
  const sRaw = LAP_START + flying;
  const s = sRaw % 1;
  const inWorld = T >= 1.98;

  if (T < 1.02 && !REDUCED) {
    /* Studio: on the turntable, a shade nose down so it reads as a machine
     * and not as a diagram. */
    dronePos.set(0, STUDIO_Y, 0);
    eul.set(-0.10, lerp(0.35, -0.55, smooth(clamp01(T))), 0.04);
    droneQuat.setFromEuler(eul);
  }

  /* --------------------------------------------------------------- camera */
  if (REDUCED) {
    flightPose(0.30, dronePos, droneQuat, 0);
    poseChase(dronePos, droneQuat, 7.5, 2.6, camPos, camQuat);
  } else if (T < 1.0) {
    poseStudio(clamp01(T), camPos, camQuat);
  } else if (T < 2.0) {
    const t = clamp01(T - 1);
    /* The pull out. One blend from the studio orbit to the builder view,
     * eased hard at the start so the hero holds the frame for a beat
     * before the world opens up under it. */
    poseStudio(1, camPos, camQuat);
    poseBuilder(t, pos2, quat2);
    const k = ease(T, 1.0, 1.30);
    camPos.lerp(pos2, k);
    camQuat.slerp(quat2, k);
    /* Held in shot: the quad rides the camera so it stays readable while a
     * 31 m course draws itself behind it. Its offset starts exactly where
     * the studio left it, so the handover has no jump in it. */
    heldOffset(ease(T, 1.0, 1.30), held).applyQuaternion(camQuat);
    dronePos.copy(camPos).add(held);
    dronePos.y += Math.sin(now * 1.6) * 0.012;
    /* Turning slowly on the spot, keeping the nose roughly down the lens so
     * the shot is of a machine waiting to be flown. */
    vTmp.set(0, 0, -1).applyQuaternion(camQuat);
    eul.set(-0.13, Math.atan2(vTmp.x, vTmp.z) + Math.PI + Math.sin(now * 0.42) * 0.34, 0.05);
    quat2.setFromEuler(eul);
    droneQuat.slerp(quat2, Math.min(1, dt * 2.2));
  } else if (T < 3.0) {
    /* The union, then the lap. The quad leaves the camera's hand, lands on
     * the line, and the camera follows it down into the airframe. */
    flightPose(s, pos2, quat2, now * 2.1);
    const join = ease(T, 2.0, 2.09);
    if (join < 1) {
      poseBuilder(1, camPos, camQuat);
      heldOffset(1, held).applyQuaternion(camQuat);
      dronePos.copy(camPos).add(held);
      vTmp.set(0, 0, -1).applyQuaternion(camQuat);
      eul.set(-0.13, Math.atan2(vTmp.x, vTmp.z) + Math.PI, 0.05);
      droneQuat.setFromEuler(eul);
      dronePos.lerp(pos2, join);
      droneQuat.slerp(quat2, join);
    } else {
      dronePos.copy(pos2);
      droneQuat.copy(quat2);
    }

    poseBuilder(1, camPos, camQuat);
    poseChase(dronePos, droneQuat, 3.1, 0.72, pos2, quat2);
    const toChase = ease(T, 2.00, 2.08);
    camPos.lerp(pos2, toChase);
    camQuat.slerp(quat2, toChase);

    poseFPV(dronePos, droneQuat, pos2, quat2);
    const toFpv = ease(T, 2.07, 2.15);
    camPos.lerp(pos2, toFpv);
    camQuat.slerp(quat2, toFpv);

    /* Out of the airframe again for the close, so the last thing seen from
     * inside the quad is the finish gate. */
    const out = ease(T, 2.90, 3.0);
    if (out > 0) {
      poseChase(dronePos, droneQuat, lerp(3.1, 14, out), lerp(0.72, 5.5, out), pos2, quat2);
      camPos.lerp(pos2, out);
      camQuat.slerp(quat2, out);
    }
  } else {
    const t = clamp01(T - 3);
    /*
     * Parked over the start and finish gate, hovering, nose across the
     * course so the shot has the track running away behind it.
     *
     * Eased into from wherever the lap ended rather than snapped to. The lap
     * finishes at the gate 1 plane, 1.15 m below this and pointing down the
     * straight; setting the park pose directly teleported the quad up and
     * spun it on the exact frame the closing act began.
     */
    const parkK = ease(T, 3.0, 3.18);
    flightPose(LAP_START + 1, pos2, quat2, now * 2.1);
    parked.set(PARK.x, PARK.y + Math.sin(now * 1.1) * 0.07, PARK.z);
    dronePos.copy(pos2).lerp(parked, parkK);
    eul.set(-0.05, PARK_YAW + Math.sin(now * 0.55) * 0.10, Math.sin(now * 0.7) * 0.045);
    droneQuat.setFromEuler(eul);
    droneQuat.copy(quat2).slerp(droneQuat, parkK);

    poseChase(dronePos, droneQuat, 14, 5.5, camPos, camQuat);
    poseHero(t, pos2, quat2);
    const k = ease(T, 3.0, 3.30);
    camPos.lerp(pos2, k);
    camQuat.slerp(quat2, k);
  }

  droneRig.position.copy(dronePos);
  droneRig.quaternion.copy(droneQuat);

  /* Props: still while it is being built, spooling as it arms, working once
   * it is flying. */
  let throttle = 0;
  if (built > 0.999) {
    throttle = lerp(0.0, 0.30, ease(T, 0.92, 1.16));
  }
  if (inWorld) {
    throttle = lerp(0.34, 0.86, ease(T, 2.0, 2.14));
  }
  if (T >= 3.0) {
    throttle = 0.42;
  }
  /* Reduced motion means the props are stopped too. A spinning rotor is
   * the single most animated thing on the page. */
  drone.spin(dt, REDUCED ? 0 : throttle);

  stage.camera.position.copy(camPos);
  stage.camera.quaternion.copy(camQuat);

  /* The one shadow the page draws follows the subject. */
  if (T < 1.02) {
    stage.aimLight(dronePos, 0.22);
    /* Where there is no shadow map, the studio hero still needs something
     * under it or it is a cutout floating on a gradient. */
    stage.aimBlob(dronePos, stage.shadowsOn ? 0 : 0.85, 0.30);
  } else if (T < 2.0) {
    stage.aimLight(vTmp.set(0, 0, -2), 46);
    stage.aimBlob(dronePos, 0, 1);
  } else {
    stage.aimLight(dronePos, 16);
    stage.aimBlob(dronePos, world, 1.05);
  }

  /* -------------------------------------------------------------- the run */
  if (inWorld) {
    let next = GATE_LAP.length - 1;
    for (let i = 0; i < GATE_LAP.length; i += 1) {
      if (GATE_LAP[i] >= sRaw - 0.004) {
        next = i;
        break;
      }
    }
    /* The gate ahead pulses; the ones behind go mint. */
    const pulse = 0.5 + 0.5 * Math.sin(now * 5.2);
    course.setRun(next, pulse);
    course.hideLines(true);

    const kmh = speedAt(s);
    el.osdSpeed.textContent = `${Math.round(kmh)} km/h`;
    el.osdTimer.textContent = fmtTime((sRaw - LAP_START) * LAP_TIME);
    el.osdGate.textContent = `Gate ${Math.min(GATE_COUNT, next + 1)} of ${GATE_COUNT}`;
    el.osdThrottle.style.width = `${Math.round(clamp01((kmh - 30) / 80) * 100)}%`;
    const volts = lerp(16.6, 15.0, flying);
    el.osdVolts.textContent = `${volts.toFixed(1)} V`;
    el.osdBatt.style.width = `${Math.round(lerp(96, 34, flying))}%`;
  } else {
    course.setRun(-1, 0);
    course.hideLines(false);
  }

  /* ------------------------------------------------------------ the panels */
  const stageCount = drone.stages.length;
  for (let i = 0; i < tickRows.length; i += 1) {
    const done = landed >= i + 0.985;
    const live = !done && landed > i;
    tickRows[i].classList.toggle('done', done);
    tickRows[i].classList.toggle('live', live);
  }
  el.tickCount.textContent = `${Math.min(stageCount, Math.floor(landed + 0.015))} / ${stageCount}`;
  el.tickFill.style.width = `${(built * 100).toFixed(1)}%`;

  el.tbGates.textContent = String(state.gatesUp);
  el.tbLen.textContent = `${Math.round(state.metres)} m`;
  el.tbWarn.textContent = state.gatesUp >= GATE_COUNT ? 'none' : 'building';
  for (let i = 0; i < seqNodes.length; i += 1) {
    seqNodes[i].classList.toggle('on', i < state.gatesUp);
  }
  {
    const p = course.plan.getPointAt(clamp01(state.drawn) * 0.999);
    el.tbXy.textContent = `${p.x.toFixed(2)}, ${p.z.toFixed(2)} m`;
  }

  /* --------------------------------------------------------------- the DOM */
  if (Math.abs(T - lastT) > 0.0005) {
    lastT = T;
    el.ticker.classList.toggle('on', !REDUCED && T < 1.06);
    el.builder.classList.toggle('on', !REDUCED && T > 1.04 && T < 2.02);
    el.osd.classList.toggle('on', !REDUCED && T > 2.12 && T < 2.95);
    el.cue.style.opacity = T > 0.35 ? '0' : '1';
    el.veil.style.opacity = String(lerp(1, 0.55, world));

    setCopy('assemble', T > 0.04 && T < 0.90);
    setCopy('build', T > 1.06 && T < 1.90);
    setCopy('fly', T > 2.0 && T < 2.2);

    const act = T < 1 ? 0 : T < 2 ? 1 : T < 3 ? 2 : 3;
    for (let i = 0; i < ledgerRows.length; i += 1) {
      ledgerRows[i].classList.toggle('on', i === act);
    }

    for (let i = 0; i < beatEls.length; i += 1) {
      const b = BEATS[i];
      const nextAt = i + 1 < BEATS.length ? BEATS[i + 1].at : 1.02;
      const on = inWorld && T < 2.95 && flying >= b.at && flying < nextAt - 0.02;
      beatEls[i].classList.toggle('on', on);
    }
  }

  stage.render();

  if (!bootDone) {
    bootDone = true;
    clearBoot();
  }

  requestAnimationFrame(frame);
}

/* --------------------------------------------------------------- start up */

measure();
window.addEventListener('resize', () => {
  measure();
  lastT = -1;
}, { passive: true });
window.addEventListener('load', measure);

/* A short, honest boot: the modules are already here, the textures are
 * painted on a canvas, and there is nothing to download. The bar is the
 * first compile of the cel shaders, which is real work. */
{
  let n = 0;
  const tick = setInterval(() => {
    /*
     * The clear is in a finally, and the elements are checked.
     *
     * An exception thrown inside a setInterval callback does not stop the
     * interval: it fires again, throws again, and keeps going for the life
     * of the page. One transient error in here produced fifty six identical
     * console entries before it was noticed, which is fifty five more than
     * any error needs to report itself.
     */
    try {
      n += 1;
      if (bootFill) {
        bootFill.style.width = `${Math.min(100, 18 + n * 26)}%`;
      }
      if (bootNote) {
        bootNote.textContent = BOOT_NOTES[n % BOOT_NOTES.length];
      }
    } finally {
      if (n > 3) {
        clearInterval(tick);
      }
    }
  }, 220);
}

requestAnimationFrame(frame);
