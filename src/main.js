/*
 * main.js: the timeline. What the page is doing at any point in its scroll,
 * and who gets told about it.
 *
 * ONE clock drives everything. `T` is a continuous number over the whole
 * page: 0 to 1 is the build, 1 to 2 is the track, 2 to 3 is the lap, 3 to 4
 * is the freestyle city, and 4 to 5 is the reason and the close together.
 * It is measured off the sections' real offsets rather than assumed from
 * their CSS heights, so changing a section's length in the stylesheet
 * re-times the film instead of desynchronising it.
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
import { buildCourse, GATE_COUNT } from './course.js';
import { buildCity, flightLine, CITY_ORIGIN, BUILT_R, TREE_R } from './city.js';
import { buildPetals } from './petals.js';
import { destinations } from './config.js';

const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* How long the opening assembly takes to play itself, in seconds. */
const BUILD_SECONDS = 9;

/*
 * ?t=<number> pins the timeline. 0 to 1 is the build, 1 to 2 the track, 2 to
 * 3 the lap, 3 to 4 the city, 4 to 5 the close, so ?t=2.5 is the middle of a
 * lap and ?t=3.5 is somewhere in the shopping street.
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
  return Number.isFinite(v) ? Math.max(0, Math.min(5, v)) : null;
})();

const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (t) => t * t * (3 - 2 * t);
/* Normalised position inside a range, 0 before it and 1 after. The whole
 * timeline is written in these. */
const seg = (v, a, b) => clamp01((v - a) / (b - a || 1e-6));
const ease = (v, a, b) => smooth(seg(v, a, b));

/*
 * ease(), but with the two ends separately negotiable.
 *
 * THIS EXISTS BECAUSE TWO ACTS NOW HAND AN AIRCRAFT TO EACH OTHER. A
 * smoothstep has zero slope at BOTH ends, which is exactly right for a
 * camera move that starts and stops, and exactly wrong for a lap that runs
 * straight into a freestyle line: the quad decelerated to a standstill at
 * T = 3, hung there for the half screen it took to cross the act boundary,
 * and set off again. Written down it sounds like a stall because it is one.
 *
 * So the lap eases IN and finishes at speed, and the city line starts at
 * speed and eases OUT into the close. `inF` and `outF` are the fractions of
 * the range given over to accelerating and decelerating; the rest is flown at
 * a constant rate. The result is renormalised so the range still covers
 * exactly 0 to 1, which is what makes it a drop in replacement.
 *
 * It is the integral of a trapezoid, which is the same shape a motion control
 * rig uses to move a camera and for the same reason.
 */
function ramp(v, a, b, inF, outF) {
  const t = seg(v, a, b);
  const area = 1 - inF * 0.5 - outF * 0.5;
  let x;
  if (inF > 0 && t < inF) {
    x = (t * t) / (2 * inF);
  } else if (outF > 0 && t > 1 - outF) {
    const w = (t - (1 - outF)) / outF;
    x = (1 - outF) - inF * 0.5 + outF * (w - (w * w) * 0.5);
  } else {
    x = t - inF * 0.5;
  }
  return clamp01(x / area);
}

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
    k: 'Your rates',
    /* This used to promise a CLI diff dropped on the page, editing your own
     * PIDs and filters. The simulator took that out: it offers two tunes and
     * lets you set your rates, so the copy says that instead. Marketing a
     * screen that is not there is the one bug this page can ship. */
    t: 'Two tunes, stock Betaflight or a 6S race setup. Set your rates and fly the curve your sticks will actually follow.',
  },
  {
    at: 0.44,
    k: 'Determinism',
    t: 'Fixed timestep physics. A dropped frame changes nothing about where you end up.',
  },
  {
    at: 0.64,
    k: 'Sticks',
    t: 'Plug in a radio in joystick mode, or the Xbox pad already on the desk. Sticks are the skill, and a keyboard has none.',
  },
  {
    at: 0.84,
    k: 'The board',
    t: 'Publish the track, post the lap, and let somebody else try to take it off you.',
  },
];

/*
 * The freestyle act's own beats.
 *
 * Fewer and shorter than the lap's, because the lap is an argument and the
 * city is a demonstration: the copy over a race line can afford to talk
 * about determinism, and the copy over a nine metre street should get out of
 * the way of the street. Three beats over the whole act, each one naming the
 * thing that is actually in frame when it appears.
 *
 * THE FIRST ONE STARTS LATE ON PURPOSE. The act's own copy block runs from
 * T 3.02 to 3.16, and a beat is a second column of type in the middle of the
 * same frame: at 0.06 the two were on screen together for a quarter of the
 * act, which is not two pieces of copy, it is a paragraph with somebody
 * else's headline sitting on it. 0.19 of the act is T 3.172, which is after
 * the copy has gone. The other two are spaced the same way against each
 * other, by the 0.03 tail every beat already carries.
 */
const CITY_BEATS = [
  {
    at: 0.19,
    k: 'Freestyle',
    t: 'The same aircraft, the same control loop, somewhere with walls. A gate tells you where to go. A town does not.',
  },
  {
    at: 0.42,
    k: 'The city',
    t: 'A Japanese railway town, drawn to its own dimensions. Six metre shopping street, a level crossing, and a cable web at head height.',
  },
  {
    at: 0.64,
    /*
     * ...and this one says when it LEAVES, which the others do not need to.
     *
     * A beat normally runs until the next one is due. This is the last, so
     * it would run to the end of the act, and the end of the act is the
     * climb out: twenty metres of empty air over the north end of the
     * street with the district behind the aircraft and nothing in frame but
     * trees. Three lines of copy about flying close, over a photograph of
     * nothing to be close to.
     *
     * So it stops at 0.82, and the last fifth of the act carries no type at
     * all. That is not a gap, it is the shot: the town opening out as the
     * camera leaves the airframe, which is the thing the closing act then
     * arrives on.
     */
    until: 0.82,
    k: 'Proximity',
    t: 'Nothing here is scored. Fly the line you can see, at the height you dare, and put it back on the roof you started from.',
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
 * THE BOOT SCREEN COMES DOWN WHEN THE TOWN IS BUILT, not on the first frame.
 *
 * It used to go on the first rendered frame, which is right for a page whose
 * whole world is a quad and a course. The freestyle act's town is the
 * simulator's own and it is seconds of synchronous work: eleven and a half
 * thousand meshes with every sign painted on a canvas as it goes. Built
 * after the boot screen had gone, that work landed as a freeze on a page the
 * visitor was already scrolling, which is exactly the hitch this replaces.
 *
 * A loading screen is the one place on a page where seconds are honest. So
 * the first frame renders under the boot screen, the town is built, and only
 * then does the screen lift, onto a page that never stalls again.
 *
 * The fallback is not paranoia and it is longer than it was: a background tab
 * does not run requestAnimationFrame, so a page opened in one and read later
 * would otherwise be a permanent loading screen over a finished page. Twelve
 * seconds is past any machine this has been measured on and still short of a
 * visitor deciding the page is broken.
 */
setTimeout(clearBoot, 12000);

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
 * The town, which is the simulator's own and is therefore expensive.
 *
 * It builds itself after the first paint rather than at import: see the
 * comment on buildCity. Until it is ready its group is empty and invisible,
 * and every act before the fourth is unaffected, which is the whole point.
 * The page does not wait for it and does not break without it.
 */
const city = buildCity({
  onReady: (stats) => {
    /*
     * The deck stops where the town's own ground starts, and it can only be
     * told once the town has been built and measured. Before that the cut is
     * zero sized and the deck is the whole world, which is exactly right for
     * every act that runs before the town arrives.
     */
    course.setCut(city.groundBox() && city.groundBox().min, city.groundBox() && city.groundBox().max);
    if (DEBUG) {
      console.info('city:', JSON.stringify(stats));
    }
  },
});
stage.scene.add(city.group);

const petals = buildPetals();
stage.scene.add(petals.mesh);

/*
 * A handle on the scene, but only when the timeline is pinned.
 *
 * ?t= already exists so a frame can be named; this is the other half of the
 * same affordance, so a frame can be interrogated. Without it, working out
 * why a horizon has a line across it means reading three shaders and
 * guessing, which is exactly how an afternoon goes. No ?t=, no global.
 */
/*
 * ?debug as well as ?t=, because the two QA needs are different: ?t= freezes
 * a frame so it can be looked at, and the heading state can only be watched
 * while the page is actually being scrolled, which a frozen frame is not.
 */
const DEBUG = PIN !== null
  || new URLSearchParams(window.location.search).has('debug');

if (DEBUG) {
  window.__wf = {
    stage, course, drone, petals,
    /* The flight helpers, so the turn around can be checked as maths rather
     * than only watched: pose the aircraft at any point on the line at any
     * heading and read the numbers back. */
    flight: (sAt, flipAt) => {
      const p = new THREE.Vector3();
      const q = new THREE.Quaternion();
      flightPose(sAt, p, q, 0, flipAt);
      const e = new THREE.Euler().setFromQuaternion(q, 'YXZ');
      return { pos: p.toArray(), pitch: e.x, yaw: e.y, roll: e.z };
    },
    heading: () => flyFlip,
    /*
     * THE TOWN'S OWN COLLIDERS, and its own ground.
     *
     * The freestyle line was drawn against a hand built portrait of this
     * town and then the real one replaced it, so "does the line still fit"
     * is the question the whole port turns on. It is not answered by
     * looking at screenshots: a 104 degree lens fills with a wall about a
     * metre before it hits one, and a near miss and a hit look the same in
     * a still.
     *
     * world.colliders is the list the SIMULATOR flies against, axis aligned
     * boxes with a top and an optional bottom, and world.heightAt is the
     * ground under a point. Checking the line against those two is checking
     * it against the same thing the game checks a quad against.
     */
    solids: () => {
      const w = city.ready ? city.stats : null;
      if (!city.ready) {
        return null;
      }
      return { stats: w, count: city.world().colliders.length };
    },
    /* Minimum clearance along the whole line, in metres, against the town's
     * own colliders, plus the lowest the line ever gets over its ground. */
    clearance: (samples = 900) => {
      if (!city.ready) {
        return null;
      }
      const world = city.world();
      const p = new THREE.Vector3();
      let worstBox = Infinity;
      let worstBoxAt = null;
      let worstGround = Infinity;
      let worstGroundAt = null;
      for (let i = 0; i <= samples; i += 1) {
        const roam = i / samples;
        cityLine.getPointAt(cityAt(roam), p);
        const x = p.x - CITY_ORIGIN.x;
        const y = p.y - CITY_ORIGIN.y;
        const z = p.z - CITY_ORIGIN.z;
        const over = y - world.heightAt(x, z);
        if (over < worstGround) {
          worstGround = over;
          worstGroundAt = roam;
        }
        for (const c of world.colliders) {
          /* Only boxes the line is inside vertically can be hit at all. */
          const bottom = c.bottom === undefined ? -1e9 : c.bottom;
          if (y > c.top || y < bottom) {
            continue;
          }
          const dx = Math.max(c.x0 - x, 0, x - c.x1);
          const dz = Math.max(c.z0 - z, 0, z - c.z1);
          const d = Math.hypot(dx, dz);
          if (d < worstBox) {
            worstBox = d;
            worstBoxAt = roam;
          }
        }
      }
      /* Every sample that is inside something, with the box it is inside, so
       * a breach can be fixed rather than only detected. */
      const hits = [];
      for (let i = 0; i <= samples; i += 1) {
        const roam = i / samples;
        cityLine.getPointAt(cityAt(roam), p);
        const x = p.x - CITY_ORIGIN.x;
        const y = p.y - CITY_ORIGIN.y;
        const z = p.z - CITY_ORIGIN.z;
        for (const c of world.colliders) {
          const bottom = c.bottom === undefined ? -1e9 : c.bottom;
          if (y > c.top || y < bottom) {
            continue;
          }
          if (x > c.x0 && x < c.x1 && z > c.z0 && z < c.z1) {
            hits.push({
              roam: +roam.toFixed(3),
              at: [+x.toFixed(1), +y.toFixed(1), +z.toFixed(1)],
              box: [+c.x0.toFixed(1), +c.x1.toFixed(1), +c.z0.toFixed(1), +c.z1.toFixed(1)],
              top: +c.top.toFixed(1),
              bottom: c.bottom === undefined ? null : +c.bottom.toFixed(1),
            });
            break;
          }
        }
      }
      return {
        minSolid: +worstBox.toFixed(2),
        minSolidAt: worstBoxAt,
        minGround: +worstGround.toFixed(2),
        minGroundAt: worstGroundAt,
        hitCount: hits.length,
        hits: hits.slice(0, 12),
      };
    },
    /*
     * The freestyle line, as numbers. Same affordance as flight() above and
     * added for the same reason: the first pass of the city act flew the
     * aircraft into a shopfront, and working out WHICH shopfront from a
     * screenshot of a wall is an afternoon. Ask the curve instead.
     */
    city,
    /* Accessors, not the values. `cityLine` is a const declared further down
     * the file, and naming it in this object literal evaluates it HERE, in
     * its temporal dead zone, which throws at module load and leaves the page
     * on its boot screen forever. A debug handle that breaks the page it is
     * meant to debug is a special kind of unhelpful. */
    line: () => cityLine,
    cityAt,
    cityRoam: (t) => ramp(t, 3.0, 3.97, 0, 0.13),
    cityWhere: (roam) => {
      const u = cityAt(roam);
      const p = cityLine.getPointAt(u);
      const t = cityLine.getTangentAt(u);
      return {
        u,
        world: p.toArray(),
        local: [p.x - CITY_ORIGIN.x, p.y - CITY_ORIGIN.y, p.z - CITY_ORIGIN.z],
        tangent: t.toArray(),
        climb: Math.asin(Math.max(-1, Math.min(1, t.y))),
      };
    },
    /* The closing shot's own numbers, so the cap can be read rather than
     * inferred from a screenshot of a hazy town. */
    close: () => ({
      want: CLOSE_WANT, far: CLOSE_FAR, dist: CLOSE_DIST, high: CLOSE_HIGH,
      fog: stage.fogFor(1, 1),
    }),
    /* Where the camera and the aircraft actually ended up on the last frame. */
    live: () => ({
      cam: stage.camera.position.toArray(),
      drone: dronePos.toArray(),
      quat: droneQuat.toArray(),
    }),
    /* Force the aircraft onto a heading, 0 pointing down the line and 1
     * pointing back up it. The turn is a half second of animation that only
     * happens while somebody is scrolling the other way, which is precisely
     * the state a still frame cannot be put into. */
    setHeading: (v) => { flyWant = v; flyFlip = v; },
  };
}

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
 * NOT sorted. The index into this array is the index into the track's gate
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

/* ----------------------------------------------------------- the city line */

/*
 * Where the lap ends, which is where the freestyle line begins.
 *
 * Computed rather than typed, because it is a point ON A CURVE and the curve
 * is generated from a plan loop. Type it and the first time somebody moves a
 * waypoint the quad teleports at the handover.
 */
const CITY_ENTRY = course.line.getPointAt(LAP_START).clone();
const CITY_EXIT_DIR = course.line.getTangentAt(LAP_START).clone().normalize();
const cityLine = flightLine(CITY_ENTRY, CITY_EXIT_DIR, CITY_ORIGIN);
const CITY_LENGTH = cityLine.getLength();

/*
 * THE PACING OF THE FREESTYLE ACT, and it is not uniform.
 *
 * The line is two things end to end: about a hundred and forty metres of
 * transit over the wood between the field and the town, and about a hundred
 * and thirty metres of town. Flown at one pace they get one share of the
 * scroll each, which means half the act is spent watching trees go past at
 * the speed of a shopping street. Nobody scrolls through that twice.
 *
 * So the transit is flown at about two and a half times the pace of the
 * streets. That is not a cheat, it is what a pilot does: you get somewhere
 * fast and then you slow down for the bit with walls in it. The dash also
 * does the transition's work, because speed is what makes an arrival read as
 * an arrival.
 *
 * It is a TABLE rather than a formula, integrated once at start up, for the
 * same reason SPEED above is: the mapping has to be monotonic and smooth in
 * its derivative, and a piecewise formula that is both is harder to read
 * than the integral of an obvious one. `PACE` is speed against act progress;
 * CITY_S is its normalised integral, so scrubbing anywhere lands on the
 * frame that belongs there.
 */
const CITY_S = (() => {
  const N = 256;
  const out = new Float32Array(N + 1);
  /* The dash is shorter and gentler than it was, because the crossing is:
   * the town moved in from 138 m to 96, so the transit is about forty metres
   * of a hundred and ninety metre line rather than a hundred and forty of two
   * hundred and sixty. A 2.55x dash over a third of the act was the right
   * answer to a long empty leg and is the wrong answer to a short one. */
  const pace = (t) => lerp(2.0, 1.0, smooth(clamp01((t - 0.06) / 0.14)));
  let sum = 0;
  for (let i = 1; i <= N; i += 1) {
    sum += pace((i - 0.5) / N);
    out[i] = sum;
  }
  for (let i = 0; i <= N; i += 1) {
    out[i] /= sum;
  }
  return out;
})();

function cityAt(p) {
  const N = CITY_S.length - 1;
  const f = clamp01(p) * N;
  const i = Math.min(N - 1, Math.floor(f));
  return lerp(CITY_S[i], CITY_S[i + 1], f - i);
}

/*
 * How fast the aircraft is actually going, in km/h, for the instrument.
 *
 * Differentiated from the same table the position comes from, so the number
 * on the OSD and the motion on the screen cannot disagree. The scale factor
 * turns "fraction of the line per unit of act" into metres per second by way
 * of the line's own length and the act's nominal duration, and the duration
 * is a decision rather than a measurement: the act is not on a clock, it is
 * on a scrollbar, so what is displayed is the speed the line would be flown
 * at, which is what a pilot's OSD shows anyway.
 */
/*
 * How long the freestyle line would take to fly, in seconds.
 *
 * NOT a duration the page obeys: the act is on a scrollbar, not a clock. It
 * is the number that turns "fraction of the line per unit of act" into a
 * speed, and what it is really setting is how fast the aircraft is meant to
 * be going, which is a decision about the flying rather than a measurement.
 *
 * About 190 m in 15 s is 45 km/h on average, which comes out as roughly 40
 * down the streets and 80 across the gap. Those are the right numbers for
 * what is on screen: 40 km/h is a quad flying a street with intent and not
 * hooning. It was 26 s at first, which read 25 km/h in the street, and
 * 25 km/h is a quad being flown by somebody nervous.
 */
const CITY_SECONDS = 15;
function citySpeed(p) {
  const d = 0.004;
  const a = cityAt(Math.max(0, p - d));
  const b = cityAt(Math.min(1, p + d));
  const per = (b - a) / (Math.min(1, p + d) - Math.max(0, p - d));
  return (per * CITY_LENGTH / CITY_SECONDS) * 3.6;
}

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
  osdLabel: document.getElementById('osd-label'),
  osdTimer: document.getElementById('osd-timer'),
  osdGate: document.getElementById('osd-gate'),
  osdSpeed: document.getElementById('osd-speed'),
  osdVolts: document.getElementById('osd-volts'),
  osdThrottle: document.getElementById('osd-throttle'),
  osdBatt: document.getElementById('osd-batt'),
  beats: document.getElementById('beats'),
  progress: document.querySelector('#progress i'),
  cards: document.getElementById('cards'),
  foot: document.getElementById('foot'),
};

const ACTS = [...document.querySelectorAll('[data-act]')];
/*
 * Where the last stretch of the timeline begins. NOT the close: the reason
 * section sits above it, and if T only started moving at the close then the
 * camera held one still frame for the whole of the reading. It is the same
 * pull-out either way, just given the scroll length it always wanted.
 */
const FINAL = document.getElementById('why') || document.getElementById('close');
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
  { id: 'city', label: 'Freestyle' },
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
function makeBeats(list) {
  return list.map((b) => {
    const d = document.createElement('div');
    d.className = 'beat';
    d.innerHTML = `<div class="beat-k">${b.k}</div><div class="beat-t">${b.t}</div>`;
    el.beats.append(d);
    return d;
  });
}
const beatEls = makeBeats(BEATS);
const cityBeatEls = makeBeats(CITY_BEATS);

/* ------------------------------------------------------------- the timeline */

let bounds = null;
function measure() {
  const vh = window.innerHeight;
  const list = ACTS.map((node) => ({
    id: node.dataset.act,
    top: node.offsetTop,
    height: node.offsetHeight,
  }));
  composeLayout();
  const closeTop = FINAL.offsetTop;
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
  /* `list.length` rather than a typed 3. The tail of the timeline begins
   * where the acts end, and an act inserted into <main> moves it: with the
   * number written down, adding the city act made the close start at 3 while
   * the city act was still running and the whole page fought itself. */
  return list.length + clamp01((y - closeTop) / Math.max(1, docEnd - closeTop));
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

/*
 * Act one's composition, in one place, because the lens, the orbit and the
 * bias are one decision and were previously three.
 *
 * The shot has to share a 16:9 frame with a copy column that owns the left
 * 52 percent of it. That is the constraint everything here answers to: a
 * subject filling 79 percent of the frame width CANNOT also sit clear of
 * that column, and the old orbit closed to exactly that. Pushed right by a
 * bias that knew about the window's aspect but nothing about the subject's
 * size, the quad ran off the right hand edge for the whole act, by 5 percent
 * of the frame at the top of the page and 18 percent by the bottom of it.
 *
 * So the orbit backs off and the lens opens a little. The MOVE is unchanged:
 * the camera still closes on the hero by the same ratio over the act, and
 * the subject still grows. It grows from 29 to 46 percent of the frame
 * instead of from 50 to 79, which is the room the layout was always asking
 * for.
 *
 * SUBJECT_R is half the airframe's horizontal diagonal, props included. It
 * is the worst case: the quad turns on its axis through the act, so its
 * projected width is this only at the corners of the spin.
 */
const STUDIO_FOV = 30;
const STUDIO_HALF = THREE.MathUtils.degToRad(STUDIO_FOV) * 0.5;
const STUDIO_R = [2.44, 1.78];
const STUDIO_H = [1.10, 0.55];
const SUBJECT_R = 0.225;
/* How much of the half frame stays clear at the edge, as a fraction. */
const FRAME_EDGE = 0.05;

/*
 * The most the camera may yaw before the subject falls off the edge.
 *
 * The bias is what the LAYOUT wants; this is what the FRAME can give. It is
 * a function of the orbit radius because the subject's angular size is, and
 * that is precisely what the bias on its own does not know: the same offset
 * that reads as a composition at 2.44 m is a crop at 1.78 m.
 *
 * Computed against the studio's OWN lens angle rather than the live one.
 * The live angle is mid lerp to 46 degrees for the whole of act two, and
 * heldOffset() measures the act two hand over against poseStudio(1): a cap
 * that moved with the lens would make that reference drift and the held
 * quad would slide across the frame while the track drew itself.
 */
function studioYawCap(r) {
  const subject = Math.atan(SUBJECT_R / Math.max(0.01, r));
  return Math.max(0, STUDIO_HALF * (1 - FRAME_EDGE) - subject);
}

function poseStudio(t, outPos, outQuat) {
  const az = lerp(-1.25, 0.42, smooth(t));
  const r = lerp(STUDIO_R[0], STUDIO_R[1], smooth(clamp01(t * 1.08)));
  const h = STUDIO_Y + lerp(STUDIO_H[0], STUDIO_H[1], smooth(t));
  outPos.set(Math.sin(az) * r, h, Math.cos(az) * r);
  at.set(0, STUDIO_Y + lerp(0.012, 0.020, t), 0);
  lookQuat(outPos, at, outQuat);
  applyBias(outQuat, 1, 1, studioYawCap(r));
}

/*
 * Where the hero belongs across the frame, as a camera yaw in radians.
 *
 * This was a curve fitted to the window's aspect, and a curve fitted to the
 * aspect cannot know where the copy actually is. It also saturated: past
 * about 1.87 it pinned at its ceiling, so EVERY window wider than that
 * composed the shot identically. The copy column stayed the 30 em the
 * stylesheet gives it, the frame kept growing, and the hero stayed clamped
 * against the right hand edge with all the new width opening up as a hole in
 * the middle. Measured at 1280, 1920 and 2560 the copy ended at 52, 35 and
 * 26 percent of the frame while the quad sat at 74, 78 and 78.
 *
 * Dragging a window wider is exactly when that reads as broken, because
 * everything else on the page re-flows and the quad does not.
 *
 * So it is measured off the layout instead: the hero is centred in whatever
 * the copy column leaves it. That is one DOM read per actual size change,
 * not per frame, because measure() is the only caller.
 *
 * The ramp is for the narrow end. Below about 900 px the stylesheet gives
 * the copy the full width, and there is no beside to be centred in: the
 * midpoint of what is left would jam the quad into the right margin. As the
 * free space closes the offset fades out with it and the shot centres, which
 * is where composePitch() takes over and drops the hero under the type.
 */
const HERO_ROOM = [0.34, 0.44];
let heroYaw = 0;

function composeLayout() {
  const w = stage.size.width;
  const copy = COPIES.get('assemble');
  if (!copy || w < 2) {
    heroYaw = 0;
    return;
  }
  const right = copy.getBoundingClientRect().right;
  const room = clamp01(1 - right / w);
  /* The middle of the free space, as a signed fraction of the half frame,
   * then through the studio lens into an angle. */
  const ndc = clamp01(((right + w) * 0.5 / w) * 2 - 1);
  const want = Math.atan(ndc * Math.tan(STUDIO_HALF));
  heroYaw = want * clamp01((room - HERO_ROOM[0]) / (HERO_ROOM[1] - HERO_ROOM[0]));
}

/*
 * Turning the camera to its own left slides the subject right; tilting it up
 * slides the subject down. Both are applied in the camera's LOCAL frame, so
 * they compose with whatever the pose already decided to look at.
 */
function applyBias(q, yawScale = 1, pitchScale = 1, yawCap = Infinity) {
  const yaw = Math.min(heroYaw * yawScale, yawCap);
  const pitch = stage.composePitch() * pitchScale;
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
   * a corner; a 31 m track framed to one side just falls off the screen. */
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
 * The lap is FPV and stays FPV, including through the turn.
 *
 * There was a third person shot here that cut outside for the half second
 * the aircraft took to come round. It looked like a replay, and a replay is
 * the one thing this page is not: the whole argument of the flight act is
 * that this is what you see from the goggles. Leaving them to admire the
 * aircraft breaks it. The turn now happens where the pilot is, so what sells
 * it is the sweep of the horizon rather than a view of the airframe.
 *
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
 * The close: the whole town at golden hour, seen from the south east, pulling
 * further out and further up as the headline lands.
 *
 * IT FRAMES THE DISTRICT, AND ONLY THE DISTRICT. The closing line is centred
 * and the three launch cards span most of the width beneath it, so the only
 * clear areas are the sky and the margins. What the last frame of the page
 * should say is "here is the thing you get", and the thing you get is a
 * place to fly.
 *
 * The quad is not in it, and saying so is the honest version of a comment
 * that used to claim it was "the detail that tells you the scale". At 150 m
 * through a 58 degree lens a 0.35 m airframe is about two pixels. That was
 * true of the old close, which framed a 51 m track from 72 m and had the
 * machine hovering over its own start gate at a readable size; it is not
 * true of this one. The aircraft is still parked where the freestyle line
 * left it, over the roofs, because it has to be somewhere and that is the
 * only place it could honestly be. It is simply too far away to see, and a
 * composition that pretended otherwise would be one that had never been
 * looked at.
 *
 * HOW FAR IT MAY GO IS A MEASURED NUMBER. The brief on this shot was that it
 * must not pull back so far that the colour runs out of the city, and that is
 * a piece of trigonometry rather than a taste. At the last frame the lens is
 * 58 degrees across and the camera is 150 m out, so the frame is
 * 2 * 150 * tan(29) = 166 m wide where the town is. The built district is
 * about 92 m across and the woodland around it reaches 227 m, so the town
 * fills the middle of the frame and the trees fill every corner of the rest.
 * Nothing in shot is further than about 210 m, which at the reach below is
 * eighteen percent haze: still coloured, still legible, still obviously
 * further away than the near roofs.
 *
 * Any further and the frame grows faster than the district does. The first
 * thing to arrive in the corners would be bare ground, and after that the
 * haze, and at that point the last frame of the page is a photograph of some
 * weather with a town in the middle of it.
 *
 * The air is opened up to match: over the town the fog reaches 620 m rather
 * than 302, so the far side of the district at about 140 m carries six
 * percent haze instead of forty. See setRegime's `reach` in stage.js. Both
 * halves of that are the same instruction and neither works alone.
 */
/*
 * HOW FAR THE CLOSE MAY PULL BACK, as a clamp rather than as a comment.
 *
 * The brief on this shot was "not so far as to have the colour go out of the
 * city", and that is a measurable thing rather than a taste, so it is
 * measured. Two constraints bound the pull back and the tighter one wins:
 *
 *   THE HAZE. At the far side of the district the fog must still be leaving
 *   most of the colour in. Solved by inverting the smoothstep the fog runs
 *   on, against the actual distances stage.js will be using at that point,
 *   which is why it asks rather than assumes.
 *
 *   THE FRAME. The lens must not open wider than the town's own woodland at
 *   the town's distance, or the first thing to arrive in the corners is bare
 *   ground and after that the sky.
 *
 * At 150 m neither binds: the haze cap sits near 200 and the frame cap far
 * past that. That is the point of writing them down. The number can be tuned
 * for the composition without anybody having to remember why it was 150, and
 * if a future tune goes past what the air or the trees can support, the
 * clamp pulls it back instead of the last frame of the page quietly turning
 * into a photograph of some weather.
 */
const CLOSE_FOV = 58;
const CLOSE_HAZE_MAX = 0.28;
/*
 * 145 m, and the orbit swings further EAST than it used to, which is the
 * same decision twice.
 *
 * The town is 96 m from the field now rather than 138. On the old azimuth,
 * which was nearly due south of the district, a camera 145 m out ends up
 * behind the race field looking over it, and the last frame of the page
 * becomes a field with a town behind it rather than a town. Pulled in to 112
 * to stay clear of that, it was too close the other way: a photograph of
 * rooftops rather than of a district.
 *
 * Swinging round to the south east buys the distance back. At 145 m on this
 * arc the lens sits east of the town and still north of the field, so the
 * district fills the frame with its own hills behind it and nothing of the
 * race field in shot.
 */
const CLOSE_WANT = 145;
const CLOSE_FAR = (() => {
  const fog = stage.fogFor(1, 1);
  /* smoothstep inverted: the t at which 3t^2 - 2t^3 equals CLOSE_HAZE_MAX. */
  const t = 0.5 - Math.sin(Math.asin(1 - 2 * CLOSE_HAZE_MAX) / 3);
  const byHaze = fog.near + t * (fog.far - fog.near) - BUILT_R;
  const byFrame = TREE_R / Math.tan(THREE.MathUtils.degToRad(CLOSE_FOV) * 0.5);
  return Math.min(CLOSE_WANT, byHaze, byFrame);
})();

const CLOSE_DIST = [78, CLOSE_FAR];
const CLOSE_HIGH = [34, 60];
function poseCity(t, outPos, outQuat) {
  const az = lerp(0.66, 1.00, smooth(t));
  const dist = lerp(CLOSE_DIST[0], CLOSE_DIST[1], smooth(t));
  const h = lerp(CLOSE_HIGH[0], CLOSE_HIGH[1], smooth(t));
  outPos.set(
    city.heart.x + Math.sin(az) * dist,
    h,
    city.heart.z + Math.cos(az) * dist,
  );
  /* Aimed at the roofs rather than at the ground, so the district sits in the
   * middle of the frame instead of along the bottom of it. */
  at.set(city.heart.x, 7.0, city.heart.z);
  lookQuat(outPos, at, outQuat);
}

/* ------------------------------------------------------------ the aircraft */

const dronePos = new THREE.Vector3();
const droneQuat = new THREE.Quaternion();
const parked = new THREE.Vector3();

/*
 * Where the quad ends up for the close: hovering over the town's roofs at
 * the end of the freestyle line, turned back across the district.
 *
 * It used to be over the race field's start gate, which is where the page
 * used to end. It is taken from the city line's own last point rather than
 * typed, so moving the line moves the parked quad with it and the close can
 * never be framed on an aircraft that is somewhere else.
 */
const PARK = cityLine.getPointAt(1).clone();
const PARK_YAW = (() => {
  const t = cityLine.getTangentAt(1);
  return Math.atan2(t.x, t.z) + Math.PI + 0.4;
})();
const eul = new THREE.Euler(0, 0, 0, 'YXZ');

/*
 * Where the quad is while the track is being drawn: held in camera space as
 * a foreground object, so a 155 mm airframe stays readable in a shot framing
 * a 31 m track.
 *
 * HELD_IN is deliberately the exact spot the quad already occupies when the
 * studio orbit ends, wherever that is. Blending from
 * there to HELD_OUT means the hero never jumps: it simply drifts into the
 * corner of frame as the camera pulls away from it.
 */
/*
 * Bottom right of frame and well down the lens. The act 2 copy owns the left
 * and the builder's inspector owns the top right, so this is the corner that
 * is actually free. 2.2 m at the plan view's 46 degree lens makes the quad
 * about a fifth of the frame's width: foreground, clearly nearer than the
 * track, and not competing with it. It has to be measured against THAT
 * lens rather than the hero's, or the same offset that reads as foreground
 * at 30 degrees reads as a bug sitting on the track at 46.
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

/*
 * `flip` is 0 when the quad is pointing along the line and 1 when it has
 * turned around to fly back down it, and it is a continuous number so the
 * half turn can be watched rather than jumped.
 */
function flightPose(s, outPos, outQuat, bobPhase, flip = 0, turnBank = 0) {
  course.line.getPointAt(((s % 1) + 1) % 1, outPos);
  course.line.getTangentAt(((s % 1) + 1) % 1, vTmp);
  const yawBase = Math.atan2(vTmp.x, vTmp.z) + Math.PI;
  const yaw = yawBase + flip * Math.PI;

  /* Bank from how fast the heading is changing, which is the only honest
   * source for it: a roll angle picked per gate would fight the curve.
   * Measured off the UNFLIPPED heading, because it is a property of the
   * line and the line does not turn round when the aircraft does. */
  course.line.getTangentAt(((s + 0.012) % 1 + 1) % 1, vTmp2);
  let dyaw = (Math.atan2(vTmp2.x, vTmp2.z) + Math.PI) - yawBase;
  while (dyaw > Math.PI) dyaw -= Math.PI * 2;
  while (dyaw < -Math.PI) dyaw += Math.PI * 2;
  /*
   * Banked, but not knife edge. 0.85 rad is 49 degrees of roll, which put
   * the horizon on the diagonal for a third of the lap and made every
   * screenshot of the flight look like a crash in progress.
   *
   * The cosine inverts the bank as the quad turns around, and it has to.
   * Curvature is a property of the LINE and does not care which way anybody
   * is travelling along it, but which side of the pilot the corner is on
   * does: a left hander flown backwards is a right hander. Rolling about a
   * body axis that has just been spun 180 degrees would otherwise bank the
   * quad out of every corner on the way home. At the half way point of the
   * turn the cosine is zero and the quad is level, which is also right: it
   * is pointing sideways and going neither way.
   */
  const roll = THREE.MathUtils.clamp(dyaw * 2.0, -0.52, 0.52) * Math.cos(flip * Math.PI)
    + turnBank;

  /* Nose down to go, and more of it where the line is fast. Still nose down
   * when reversed, because the nose is now the way it is going. */
  const fast = clamp01((speedAt(s) - 42) / 62);
  const pitch = -lerp(0.16, 0.40, fast);

  eul.set(pitch, yaw, roll);
  outQuat.setFromEuler(eul);
  /* A little vertical float, because a quad on a line is still a quad. */
  outPos.y += Math.sin(bobPhase) * 0.035;
}

/*
 * The same job on the freestyle line, and it is a second function rather
 * than an argument to the first.
 *
 * flightPose above is about a LAP: the curve is closed so it wraps, the
 * attitude is level because a race line is level, and the nose down angle
 * comes from a speed profile computed off the track's own curvature. None of
 * those three things is true here. The freestyle line is open, it dives into
 * a corridor and climbs out over the roofs, and its pace comes from the act
 * rather than from the shape of the line. Four arguments and three
 * conditionals would let one function do both, and the result would be a
 * function that is about neither of them.
 *
 * THE ATTITUDE IS ABOUT THE CAMERA, NOT ABOUT THE AIRCRAFT, and getting that
 * the wrong way round cost the first version of this act.
 *
 * The lens is mounted on the airframe and tilted THIRTY DEGREES UP, because
 * that is where a real FPV camera sits. So an airframe flying level shows you
 * thirty degrees of sky, and the only thing that puts a horizon in the middle
 * of the frame is the aircraft being nose down. flightPose knows this: its
 * pitch is between -0.16 and -0.40 rad, which nets out to a view between 7
 * and 21 degrees above level, and that is what an FPV feed looks like.
 *
 * The first draft of this function forgot it. It followed the flight path at
 * three quarters with a token -0.15 of trim, so a line climbing at 22 degrees
 * put the nose UP and the camera 38 degrees into the sky. The screenshots of
 * the transit are a photograph of some clouds.
 *
 * So the trim is -0.34, which is where the lap sits, and the path angle is
 * added at half weight ON TOP of it and clamped. Half rather than none,
 * because a quad diving into a six metre corridor should look down the dive
 * and a quad climbing out over the roofs should show you the roofs coming.
 * Clamped, because a spline through a waypoint can be locally much steeper
 * than the leg it belongs to, and one steep control point should not throw
 * the horizon out of the frame for the two hundred milliseconds it takes to
 * pass it.
 */
const CITY_TRIM = -0.34;
/*
 * ...and one more term, which is about ALTITUDE.
 *
 * A trim that composes a street at three metres does not compose a district
 * at twenty. The lens sits 30 degrees up, so an aircraft at street height
 * shows you the shopfronts and a bit of sky, which is right; the same
 * attitude twenty metres up shows you two thirds sky and a strip of roofs
 * along the bottom edge, which is what the transit and the climb out both
 * looked like. A pilot who has climbed to look at something looks DOWN at
 * it, and so does this.
 *
 * Nothing under six metres is touched, so the streets are exactly as they
 * were. From there to twenty two it winds in another twenty degrees of nose
 * down, which puts the camera axis a few degrees below level at the top of
 * the transit and the town where the eye already is.
 */
const CITY_LOOK_LOW = 6;
const CITY_LOOK_HIGH = 22;
const CITY_LOOK_DOWN = 0.34;
const cityTan = new THREE.Vector3();
const cityTan2 = new THREE.Vector3();
function cityPose(u, outPos, outQuat, bobPhase, flip = 0, turnBank = 0) {
  const c = clamp01(u);
  cityLine.getPointAt(c, outPos);
  cityLine.getTangentAt(c, cityTan);
  const yawBase = Math.atan2(cityTan.x, cityTan.z) + Math.PI;
  const yaw = yawBase + flip * Math.PI;

  cityLine.getTangentAt(clamp01(c + 0.008), cityTan2);
  let dyaw = (Math.atan2(cityTan2.x, cityTan2.z) + Math.PI) - yawBase;
  while (dyaw > Math.PI) dyaw -= Math.PI * 2;
  while (dyaw < -Math.PI) dyaw += Math.PI * 2;
  /* A little harder than the lap's 0.52, because a freestyle line through a
   * town is flown on its side and a race line is not. Not much harder: 0.72
   * put the horizon on the diagonal for most of the street and every frame
   * of it looked like the moment before a crash. */
  const roll = THREE.MathUtils.clamp(dyaw * 2.0, -0.56, 0.56) * Math.cos(flip * Math.PI)
    + turnBank;

  const climb = THREE.MathUtils.clamp(
    Math.asin(THREE.MathUtils.clamp(cityTan.y, -1, 1)), -0.62, 0.30,
  );
  const high = clamp01((outPos.y - CITY_LOOK_LOW) / (CITY_LOOK_HIGH - CITY_LOOK_LOW));
  const pitch = CITY_TRIM + climb * 0.5 - high * CITY_LOOK_DOWN;

  eul.set(pitch, yaw, roll);
  outQuat.setFromEuler(eul);
  outPos.y += Math.sin(bobPhase) * 0.03;
}

/*
 * WHICH WAY THE QUAD IS POINTING, and the only state on the page that is not
 * a pure function of T.
 *
 * Scrolling back up used to fly the quad down the track backwards, still
 * facing forwards, like a car in reverse. A quad does not do that. It yaws
 * around and flies home nose first, and the turn itself is most of what
 * makes it read as an aircraft rather than a camera on a rail.
 *
 * The hysteresis is the point. Direction comes from the RATE of change of
 * the lap parameter, not its sign, so the damping settling by a hundredth
 * after a flick does not spin the aircraft round; and once a turn starts it
 * finishes, because a real one does.
 */
/*
 * Longer than it was, and eased, because it is now flown from inside.
 *
 * Half a second was fine watched from outside. Through a 104 degree lens
 * with your eye at the camera it is a whip pan: the horizon crosses the
 * frame faster than it can be read and it lands as a glitch rather than as a
 * manoeuvre. At 1.3 s, eased in and out, the world sweeps past.
 */
const TURN_SECONDS = 1.3;
const TURN_DEADBAND = 0.05;
/* How hard it lays over mid turn. 0.42 rad is 24 degrees, which is a quad
 * whipping round rather than a quad pirouetting on the spot. */
const TURN_BANK = 0.42;
let flyFlip = 0;
let flyWant = 0;
let flyDir = 1;
let lastFlying = null;

function updateHeading(flying, dt, active) {
  if (!active) {
    /* Leaving the act resets the intent but not the angle, so scrolling out
     * mid turn and back in again picks up where it was rather than snapping
     * to a heading it was not at. */
    flyWant = 0;
    lastFlying = null;
  } else {
    if (lastFlying !== null && dt > 1e-4) {
      const v = (flying - lastFlying) / dt;
      if (Math.abs(v) > TURN_DEADBAND) {
        flyWant = v < 0 ? 1 : 0;
      }
    }
    lastFlying = flying;
  }
  /* Which way round it is going, so the bank leans into the turn on the way
   * out AND on the way home. Without the sign it laid over the same way in
   * both directions, which is a quad banking out of one of them. */
  if (Math.abs(flyWant - flyFlip) > 1e-4) {
    flyDir = flyWant > flyFlip ? 1 : -1;
  }
  /* NB the value returned below is the eased one, and everything downstream
   * uses it: the bank has to lean on the same curve the nose swings on, or
   * the quad rolls before it turns. */
  const step = dt / TURN_SECONDS;
  flyFlip += THREE.MathUtils.clamp(flyWant - flyFlip, -step, step);
  /*
   * Eased, not linear. The driver above ramps at a constant rate, which
   * means the yaw starts and stops instantly: from the goggles that is two
   * jolts with a smooth bit in between. Smoothstep takes the angular
   * velocity to zero at both ends, so the aircraft rolls into the turn,
   * sweeps, and settles out of it.
   */
  return flyFlip * flyFlip * (3 - 2 * flyFlip);
}

/* The extra roll a turn puts on, zero at either heading and hardest through
 * the middle of it. Signed, so it leans the right way round. */
function turnBankNow(flip) {
  return TURN_BANK * Math.sin(flip * Math.PI) * flyDir;
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

  /* The frame the stage is drawing for, checked against the frame on
   * screen. It almost never changes; when it does, the timeline has to be
   * re-measured with it, because every act's length is in vh. */
  if (stage.resize()) {
    measure();
    lastT = -1;
  }

  scrollTarget = window.scrollY || window.pageYOffset || 0;
  /* Critically damped enough to feel like film and not like syrup. A raw
   * scroll value makes a 3D camera judder on every wheel notch. */
  /*
   * Softer than it was. A wheel does not deliver scroll, it delivers steps,
   * and at 9.5 each notch arrived at the camera almost intact: the flight
   * act twitched a gate at a time. At 6.5 the notches are smeared into a
   * move, which is what a camera does.
   */
  scrollNow += (scrollTarget - scrollNow) * Math.min(1, dt * 6.5);
  if (Math.abs(scrollTarget - scrollNow) < 0.4) {
    scrollNow = scrollTarget;
  }

  const T = REDUCED ? 2.55 : (PIN !== null ? PIN : timeline(scrollNow));

  /* ---------------------------------------------------------------- build */
  /* Pinned, the build is the pin's business alone: an autoplay would race
   * the parameter and the frame would not be reproducible. */
  /*
   * BUILD_SECONDS is the one number to turn if the opening feels wrong.
   *
   * It has been both ends of wrong already. At 8.2 the frame's thirty five
   * parts went by in about a second and read as a flicker; at 13.5 the whole
   * thing dawdled. Ten is brisk enough to hold attention and slow enough
   * that an arm and its four bolts are separate events.
   */
  autoBuild = PIN !== null ? 0 : Math.min(1, autoBuild + dt / BUILD_SECONDS);
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
  /*
   * The country beyond the field arrives with the daylight, not with the
   * city act. It is a property of the WORLD rather than of an act: the
   * ground past the treeline was never a mown pitch, and the whole change
   * happens outside the ring of trees where no shot can see it happen.
   */
  course.setWild(world, 105);
  /*
   * The town is drawn from the moment there is daylight to see it in, and
   * that is a composition decision rather than a saving.
   *
   * It could be shown only when the city act starts. It is shown from the
   * top of the field instead, so that during the lap there is a town on the
   * northern horizon, half in the haze, over the treeline. Then the flight
   * act is not followed by a new place, it is followed by THAT place, and
   * the transition has been motivated for ten screens before it happens.
   * The cost is about thirty draw calls behind a treeline.
   */
  city.setShown(world > 0.02);
  /*
   * The town's own clock: the train, the crossing sequence that lowers the
   * barriers for it, and the blossom coming off its trees. Only while it is
   * on screen, because a level crossing cycling behind a studio backdrop is
   * work nobody can see. See update() in city.js for why this one thing is
   * on a clock when the rest of the page is on a scrollbar.
   */
  city.update(dt);
  /*
   * How far the air is clear. The field wants its haze close so the
   * treeline dissolves; the town wants it far so the district keeps its
   * colour. It opens up across the dash between the two, which is the one
   * stretch of the page where nothing is close enough to notice.
   */
  const reach = REDUCED ? 0 : ease(T, 3.02, 3.34);
  stage.setRegime(scale, world, reach);
  course.setFog(stage.scene.fog);
  /* ------------------------------------------------------------- aircraft */
  /* Eased in off the union, then flat out to the handover: the lap does not
   * slow down at the end of itself any more, it is overtaken by the dash. */
  const flying = ramp(T, 2.06, 3.0, 0.16, 0);
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

  /*
   * The freestyle act's own parameter, and the point on its line.
   *
   * `roaming` is progress through the act, 0 to 1, and `cityU` is where that
   * puts the aircraft on the curve. They are two numbers rather than one
   * because the mapping between them is not linear: see CITY_S. The beats,
   * the train and the instrument all read `roaming`, because they are about
   * the ACT; only the aircraft reads `cityU`, because it is about the line.
   */
  const roaming = ramp(T, 3.0, 3.97, 0, 0.13);
  const cityU = cityAt(roaming);
  const inCity = T >= 2.995 && T < 4.0;

  /*
   * Which way it is pointing. Live across BOTH flying acts, and driven by
   * whichever of the two is running, so scrolling back up the page turns the
   * aircraft round in the city exactly the way it does on the lap. Handing it
   * only the lap's parameter would have left the quad flying backwards
   * through the shopping street with its nose still pointing at the roofs.
   */
  const heading = inCity ? roaming : flying;
  const flip = updateHeading(heading, dt, T >= 2.0 && T < 4.0);
  /* How far outside the aircraft the camera is: nothing at either heading,
   * everything at the half way point of a turn. */
  const turnBank = turnBankNow(flip);

  /*
   * Three lenses, and the page changes between them rather than crossfading
   * one long one into one wide one.
   *
   *   30 deg  the hero. A long lens makes a 0.35 m machine read as a
   *           machine; a wide one makes it a toy on a table. It was 24, and
   *           24 was too long to share a frame with the copy: see
   *           STUDIO_FOV.
   *   46 deg  the plan. A 31 m track does not fit in a telephoto: at 30
   *           degrees and 46 m out the frame is 24.6 m across and a fifth
   *           of the track is off the sides of it.
   *   104 deg the lap, which is what an FPV camera actually is.
   *
   * The contrast between the first and the last is the payoff of the piece.
   */
  /*
   * ...and it stays at 104 for the whole of the city, because the city act is
   * the same argument the lap is making. The only change is at the very end,
   * where the page leaves the airframe for the last time and the lens comes
   * back to something a landscape can be composed in.
   */
  stage.setFov(
    T < 1.0 ? STUDIO_FOV
      : T < 1.98 ? lerp(STUDIO_FOV, 46, ease(T, 1.0, 1.34))
        : T < 3.78 ? lerp(46, 104, ease(T, 1.98, 2.24))
          : lerp(104, CLOSE_FOV, ease(T, 3.80, 4.20)),
  );

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
     * 31 m track draws itself behind it. Its offset starts exactly where
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
    flightPose(s, pos2, quat2, now * 2.1, flip, turnBank);
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

    /*
     * There is no pull out here any more. The lap used to leave the airframe
     * over its last ten hundredths so the closing shot could inherit a third
     * person camera; the lap now hands over to a freestyle line that is also
     * flown from inside, so the page stays in the goggles from the union all
     * the way to the roofs of the town. That unbroken stretch is the single
     * longest thing the film does and it is the point of it.
     */
  } else if (T < 4.0) {
    /*
     * THE FREESTYLE ACT. Off the field, over the wood, and down into the town.
     *
     * Still FPV, still the same aircraft, and the camera does not cut. What
     * changes is the pace: see CITY_S. The first third of the line is flown
     * at two and a half times the speed of the last two thirds, which is what
     * turns a hundred and forty metres of empty field into an arrival rather
     * than a commute.
     */
    cityPose(cityU, dronePos, droneQuat, now * 2.1, flip, turnBank);

    /*
     * The join, and it is a blend rather than a cut.
     *
     * The two lines meet at exactly the same point in space, because the city
     * line's first control point IS the lap's last one, and they leave it
     * pointing the same way, because it is handed the lap's own exit
     * direction. What they do NOT agree about is attitude: the lap is level
     * and nose down at 20 degrees, and the freestyle line is already climbing
     * away at 22. Snapped, that is a 42 degree flick on one frame, through a
     * 104 degree lens, at the exact moment the page changes acts. Blended
     * over six hundredths it is the aircraft pulling up.
     */
    const join = ease(T, 3.0, 3.06);
    if (join < 1) {
      flightPose(LAP_START, pos2, quat2, now * 2.1, flip, turnBank);
      dronePos.lerp(pos2, 1 - join);
      quat2.slerp(droneQuat, join);
      droneQuat.copy(quat2);
    }

    poseFPV(dronePos, droneQuat, camPos, camQuat);

    /*
     * Out of the airframe for the close, and it starts EARLY.
     *
     * It is a long pull rather than the lap's old short one, because what it
     * is pulling back to is a hundred and fifty metre wide landscape rather
     * than a parked quad, and a camera that leaves an airframe and arrives at
     * a town in a tenth of a second has cut rather than craned.
     *
     * The other reason is the copy. The reason section is the last thing
     * before the close and it starts inside this act, so its four lines of
     * lede land over whatever is in frame. Pulled out at 3.88 that was a
     * roofscape five metres from the lens: the headline survived it and the
     * paragraph under it did not. Starting at 3.76 the same words arrive
     * over a district seen from forty metres, which is a background rather
     * than a texture.
     */
    const out = ease(T, 3.76, 4.0);
    if (out > 0) {
      poseChase(dronePos, droneQuat, lerp(3.1, 44, out), lerp(0.72, 19, out), pos2, quat2);
      camPos.lerp(pos2, out);
      camQuat.slerp(quat2, out);
    }
  } else {
    const t = clamp01(T - 4);
    /*
     * Parked over the town's roofs, hovering, turned back across the
     * district so the shot has the streets running away behind it.
     *
     * Eased into from wherever the freestyle line ended rather than snapped
     * to. The line finishes travelling at twenty metres and banked; setting
     * the park pose directly levelled the aircraft and spun it on the exact
     * frame the closing act began.
     */
    const parkK = ease(T, 4.0, 4.20);
    cityPose(1, pos2, quat2, now * 2.1);
    parked.set(PARK.x, PARK.y + Math.sin(now * 1.1) * 0.07, PARK.z);
    dronePos.copy(pos2).lerp(parked, parkK);
    eul.set(-0.05, PARK_YAW + Math.sin(now * 0.55) * 0.10, Math.sin(now * 0.7) * 0.045);
    droneQuat.setFromEuler(eul);
    droneQuat.copy(quat2).slerp(droneQuat, parkK);

    poseChase(dronePos, droneQuat, 32, 13, camPos, camQuat);
    poseCity(t, pos2, quat2);
    const k = ease(T, 4.0, 4.34);
    camPos.lerp(pos2, k);
    camQuat.slerp(quat2, k);
  }

  droneRig.position.copy(dronePos);
  droneRig.quaternion.copy(droneQuat);

  /*
   * The train is the town's own and runs on the town's own sequence, so
   * there is nothing to drive here any more. It used to be posed from the
   * act's parameter so that it met the aircraft at the crossing; the real
   * town has a crossing sequence that lowers its barriers, rings, passes a
   * train and lifts them again, and driving that from a scrollbar would run
   * it backwards the moment somebody scrolled up. See city.update above.
   */

  /* Props: still while it is being built, spooling as it arms, working once
   * it is flying. */
  let throttle = 0;
  if (built > 0.999) {
    throttle = lerp(0.0, 0.30, ease(T, 0.92, 1.16));
  }
  if (inWorld) {
    throttle = lerp(0.34, 0.86, ease(T, 2.0, 2.14));
  }
  if (T >= 4.0) {
    throttle = 0.42;
  }
  /* Reduced motion means the props are stopped too. A spinning rotor is
   * the single most animated thing on the page. */
  drone.spin(dt, REDUCED ? 0 : throttle);

  stage.camera.position.copy(camPos);
  stage.camera.quaternion.copy(camQuat);
  /* The backdrop rides with the lens. It is a ten metre dome drawn before
   * everything with no depth test, so it has to be centred on the camera or
   * the horizon slides as the camera moves. */
  course.sky.position.copy(camPos);

  /*
   * Sakura, sized to whatever the act is looking at. A 1.6 m box in the
   * studio puts a few petals drifting past a 155 mm airframe; a 44 m box in
   * the flight streaks them past the lens at racing speed. They thin right
   * out over the plan view, which is a diagram and should not have weather.
   */
  if (T < 1.02) {
    /* A real blossom petal is about 15 mm. It is worth keeping it there:
     * against a 155 mm airframe the size is the thing that says how close
     * the lens is, and a petal drawn at 50 mm quietly shrinks the quad. */
    petals.update(dt, camPos, 0.85, 1.35, 0.017);
  } else if (T < 1.98) {
    /* Nearly off over the plan. A diagram should not have weather. */
    petals.update(dt, camPos, 0.10, 9, 0.02);
  } else if (T < 4.0) {
    /* A tight box in the flight, so most of them are NEAR the lens and
     * streak past it. Spread over 44 m they were all in the distance,
     * which is a still field rather than a fast one.
     *
     * The freestyle act keeps it, and gets a few more: the town has cherry
     * in it, so blossom past the lens in a shopping street is the district's
     * own weather rather than a decoration carried over from the field. */
    petals.update(dt, camPos, T < 3.0 ? 0.6 : 0.75, 14, 0.022);
  } else {
    petals.update(dt, camPos, 0.45, 22, 0.026);
  }

  /* The one shadow the page draws follows the subject. */
  if (T < 1.02) {
    stage.aimLight(dronePos, 0.22);
    /* Where there is no shadow map, the studio hero still needs something
     * under it or it is a cutout floating on a gradient. */
    stage.aimBlob(dronePos, stage.shadowsOn ? 0 : 0.85, 0.30);
  } else if (T < 2.0) {
    stage.aimLight(vTmp.set(0, 0, -2), 46);
    stage.aimBlob(dronePos, 0, 1);
  } else if (T < 4.0) {
    stage.aimLight(dronePos, 16);
    stage.aimBlob(dronePos, world, 1.05);
  } else {
    /*
     * At the close the subject is the DISTRICT, so the sun is aimed at the
     * district. Aimed at the quad instead, the shadow frustum was a 16 m box
     * round an aircraft hovering over one roof and the other four hundred
     * buildings were outside it, which on a machine with shadows on is a
     * town with one lit house in it.
     *
     * No blob, either: a painted shadow under a quad 90 m from the lens is
     * two pixels of dirt on a roof.
     */
    stage.aimLight(city.heart, 90);
    stage.aimBlob(dronePos, 0, 1);
  }

  /* -------------------------------------------------------------- the run */
  if (inCity) {
    /*
     * THE INSTRUMENT KEEPS RUNNING AND IT STOPS COUNTING GATES.
     *
     * A freestyle line has no gates, so the counter cannot say "gate 4 of 7"
     * over a shopping street without lying about what is being flown. It says
     * what the aircraft is doing instead. Everything else on the OSD carries
     * straight on from the lap: the same clock, the same pack, still going
     * down, because it is the same flight. Resetting the timer at the act
     * boundary would say these were two sorties, and the whole argument of
     * the join is that they are one.
     */
    course.setRun(-1, 0);
    course.hideLines(true);

    const kmh = citySpeed(roaming);
    el.osdSpeed.textContent = `${Math.round(kmh)} km/h`;
    el.osdLabel.textContent = 'Flight';
    el.osdTimer.textContent = fmtTime(LAP_TIME + roaming * CITY_SECONDS);
    el.osdGate.textContent = 'Freestyle';
    el.osdThrottle.style.width = `${Math.round(clamp01((kmh - 30) / 90) * 100)}%`;
    const volts = lerp(15.0, 13.9, roaming);
    el.osdVolts.textContent = `${volts.toFixed(1)} V`;
    el.osdBatt.style.width = `${Math.round(lerp(34, 9, roaming))}%`;
  } else if (inWorld && T < 4.0) {
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
    el.osdLabel.textContent = 'Lap';
    el.osdTimer.textContent = fmtTime((sRaw - LAP_START) * LAP_TIME);
    el.osdGate.textContent = `Gate ${Math.min(GATE_COUNT, next + 1)} of ${GATE_COUNT}`;
    el.osdThrottle.style.width = `${Math.round(clamp01((kmh - 30) / 80) * 100)}%`;
    const volts = lerp(16.6, 15.0, flying);
    el.osdVolts.textContent = `${volts.toFixed(1)} V`;
    el.osdBatt.style.width = `${Math.round(lerp(96, 34, flying))}%`;
  } else if (T >= 4.0) {
    /* The close. The track is a hundred and forty metres away behind the
     * town and nothing on it should still be lit for a run that finished two
     * acts ago. The lines stay hidden, because they are a builder's drawing
     * and the page is long past the builder. */
    course.setRun(-1, 0);
    course.hideLines(true);
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
    /*
     * THE INSTRUMENT LEAVES WITH THE GOGGLES.
     *
     * It used to run to 3.94, which is almost the end of the act, and that is
     * too late for two reasons. The camera leaves the airframe at 3.76, and an
     * OSD is what you see through goggles: kept on past that it is a heads up
     * display floating over a crane shot. And the reason section scrolls into
     * view about a screen before the timeline reaches it, so on a narrow
     * window the flight clock was sitting on top of the price table.
     */
    el.osd.classList.toggle('on', !REDUCED && T > 2.12 && T < 3.80);
    el.cue.style.opacity = T > 0.35 ? '0' : '1';
    if (el.progress) {
      el.progress.style.width = `${(clamp01(T / 5) * 100).toFixed(2)}%`;
    }
    el.veil.style.opacity = String(lerp(0.72, 0.5, world));

    setCopy('assemble', T > 0.04 && T < 0.90);
    setCopy('build', T > 1.06 && T < 1.90);
    setCopy('fly', T > 2.0 && T < 2.2);
    setCopy('city', T > 3.02 && T < 3.16);

    const act = T < 1 ? 0 : T < 2 ? 1 : T < 3 ? 2 : T < 4 ? 3 : 4;
    for (let i = 0; i < ledgerRows.length; i += 1) {
      ledgerRows[i].classList.toggle('on', i === act);
    }

    /*
     * Two runs of beats, and only one of them is ever on.
     *
     * They share the same column and the same styling because they are the
     * same device: a line of copy that belongs to whatever is in frame. What
     * they do not share is a parameter, because the lap's beats are keyed to
     * a position on a race line and the city's are keyed to a position in an
     * act.
     */
    for (let i = 0; i < beatEls.length; i += 1) {
      const b = BEATS[i];
      const nextAt = i + 1 < BEATS.length ? BEATS[i + 1].at : 1.02;
      const on = inWorld && !inCity && flying >= b.at && flying < nextAt - 0.02;
      beatEls[i].classList.toggle('on', on);
    }
    for (let i = 0; i < cityBeatEls.length; i += 1) {
      const b = CITY_BEATS[i];
      const nextAt = i + 1 < CITY_BEATS.length ? CITY_BEATS[i + 1].at : 1.02;
      const until = b.until ?? nextAt - 0.03;
      const on = inCity && roaming >= b.at && roaming < until;
      cityBeatEls[i].classList.toggle('on', on);
    }
  }

  stage.render();

  /*
   * The first frame is drawn UNDER the boot screen, then the town is built,
   * then the screen lifts. Drawing first is not a formality: it compiles the
   * cel shaders and uploads the airframe, so the frame the visitor is shown
   * when the screen goes is one the GPU has already seen.
   *
   * The build blocks for seconds. Everything driven from JavaScript stops
   * with it, which is why the boot bar's sweep is a CSS animation: it runs on
   * the compositor and keeps moving through a blocked main thread.
   */
  if (!bootDone) {
    bootDone = true;
    city.start();
    warmCity();
    clearBoot();
  }

  requestAnimationFrame(frame);
}

/*
 * COMPILING AND UPLOADING THE TOWN BEFORE ANYBODY LOOKS AT IT.
 *
 * Building the geometry under the boot screen fixed the first hitch and
 * revealed the second one. A mesh costs nothing until it is first DRAWN, and
 * then it costs everything at once: the material's shader is compiled and
 * linked, and its buffers are uploaded to the GPU. The town is about fifteen
 * hundred meshes across thirty odd materials, and all of that came due on the
 * frame it first entered the camera, which is the frame the field arrives.
 * Measured, that was a six second stall in the middle of the lap.
 *
 * So it is paid here instead, while the boot screen is still up. renderer
 * .compile walks the scene and builds every program it finds, and then a
 * handful of real renders from a wide shot over the district force the
 * geometry uploads that compile alone does not: a buffer is uploaded when it
 * is first submitted, so something has to actually draw it.
 *
 * Three angles, not one, because a frustum test decides what gets submitted
 * and one camera cannot see the whole of a district from inside it.
 *
 * The camera is put back exactly as it was found. The next frame is computed
 * from T like every other frame, so even if it were not, nothing would carry
 * over; restoring it is cheap and means this function has no side effects to
 * remember.
 */
const warmPos = new THREE.Vector3();
const warmQuat = new THREE.Quaternion();
function warmCity() {
  warmPos.copy(stage.camera.position);
  warmQuat.copy(stage.camera.quaternion);
  const wasShown = city.group.visible;
  const wasFov = stage.camera.fov;

  /*
   * THE COURSE IS WARMED TOO, and leaving it out cost a three second stall
   * in the middle of the track act.
   *
   * On the first frame the page is in the studio: the gates are invisible,
   * the flags and the treeline have not grown in, and the racing line is not
   * drawn. Invisible means never submitted, and never submitted means every
   * one of those meshes, and every canvas texture printed for the gates, was
   * still cold when the track stood up. Putting the course into its finished
   * state for the warm pass costs nothing, because setBuild and setWorld are
   * recomputed from T on the very next frame: there is no state here to put
   * back.
   */
  course.setBuild(1);
  course.setWorld(1);
  course.hideLines(false);
  course.setRun(0, 1);
  city.setShown(true);
  stage.setRegime(1, 1, 1);
  course.setFog(stage.scene.fog);
  stage.setFov(90);

  const heart = city.heart;
  /* Into an eight pixel scissor: everything the first draw of a mesh costs
   * except the fill, which is the part that is worth nothing here. */
  /*
   * CULLING IS TURNED OFF FOR THE WARM PASS, and that is the difference
   * between most of the stall and all of it.
   *
   * Three camera angles left a two second hitch behind: a frustum decides
   * what is submitted, and whatever fell outside all three was still cold
   * when the visitor reached it. Submitting the district unconditionally is
   * the only way to be sure every mesh has been through the pipeline once.
   * It is also why this is worth doing inside a scissor: with nothing culled
   * the town is a million triangles, and none of them need to land anywhere.
   */
  const culled = [];
  for (const root of [city.group, course.group, droneRig]) {
    root.traverse((o) => {
      if (o.isMesh && o.frustumCulled) {
        culled.push(o);
        o.frustumCulled = false;
      }
    });
  }

  stage.warm(() => {
    /* Two over the town, one over the race field, because the two places are
     * a hundred metres apart and a frustum that holds one loses the other. */
    for (const [dx, dy, dz] of [[120, 90, 120], [-130, 70, -60], [-heart.x + 40, 40, -heart.z + 40]]) {
      stage.camera.position.set(heart.x + dx, dy, heart.z + dz);
      stage.camera.lookAt(heart);
      stage.camera.updateMatrixWorld(true);
      course.sky.position.copy(stage.camera.position);
      /* compile() first, so the render below is an upload rather than a
       * compile AND an upload. */
      stage.renderer.compile(stage.scene, stage.camera);
      stage.render();
    }
  });

  for (const o of culled) {
    o.frustumCulled = true;
  }

  /*
   * ...and one frame at FULL SIZE, which the scissor above deliberately does
   * not do and which turned out to be the last of the hitch.
   *
   * Everything before this is about getting shaders compiled and buffers
   * uploaded, and an eight pixel scissor does all of that for a fraction of
   * the fill. What it does not do is exercise the renderer at the size it
   * will actually run at, and the first frame that does was measured at four
   * seconds: reproducibly, at T = 0, immediately after the boot screen lifted.
   * The first frame the visitor sees, in other words, which is the worst
   * possible place for it.
   *
   * So the studio is drawn once, properly, before the screen goes. It is the
   * cheapest shot on the page, which is why this costs almost nothing.
   */
  stage.camera.position.copy(warmPos);
  stage.camera.quaternion.copy(warmQuat);
  stage.camera.fov = wasFov;
  stage.camera.updateProjectionMatrix();
  stage.camera.updateMatrixWorld(true);
  course.sky.position.copy(stage.camera.position);
  stage.render();

  city.setShown(wasShown);
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


