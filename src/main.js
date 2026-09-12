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
import { buildRoom, ROOM_AIR } from './room.js';
import { buildWhoop, WHOOP_FOV, WHOOP_MOUNT_FORWARD, WHOOP_MOUNT_UP, WHOOP_CAM_TILT_DEG } from './whoop.js';
import { buildPetals } from './petals.js';
import { destinations } from './config.js';

const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* How long the opening assembly takes to play itself, in seconds. */
const BUILD_SECONDS = 9;

/*
 * ?t=<number> pins the timeline. 0 to 1 is the build, 1 to 2 the track, 2 to
 * 3 the lap, 3 to 4 the city, 4 to 5 the room and 5 to 6 the close, so
 * ?t=2.5 is the middle of a lap and ?t=3.5 is somewhere in the shopping
 * street.
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
  return Number.isFinite(v) ? Math.max(0, Math.min(6, v)) : null;
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
    k: 'Tracks and times',
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

/*
 * The room act's beats.
 *
 * Three again, and none of them repeats an argument the page has already
 * made. The lap's beats are about the control loop, the town's are about
 * having no gates; these are about SIZE and about who you are racing, which
 * are the two things nobody expects and the two things a picture of a shed
 * cannot say on its own.
 *
 * NO SERIES IS NAMED, and that is the board's decision rather than this
 * page's. The board's whoop plate is called Whoop Micro Tracks, and its own
 * note says why: the builder will make any micro track a whoop can fly, and
 * a series' name on the plate tells a pilot who built their own that it does
 * not belong. The same holds here. The track this act flies is a published
 * one and its designer is credited where a credit belongs, in NOTICE and in
 * the data file, not in a headline over somebody else's living room.
 *
 * The first waits until the act's copy block has gone, the same way the
 * town's does. The last stops before the end of the act, because the end of
 * the act is the camera leaving the airframe and the reason section arriving
 * over it.
 */
const ROOM_BEATS = [
  {
    at: 0.20,
    k: 'The aircraft',
    t: 'Sixty five millimetres, twenty three grams, one cell. The same Betaflight, a different plant: three times the angular acceleration and a fifth of the speed.',
  },
  {
    at: 0.44,
    k: 'The track',
    t: 'Four gates, two of them stacked, a pole and a rail, all cut from one length of three quarter inch plumbing pipe. Three and a half metres by two of floor.',
  },
  {
    at: 0.66,
    until: 0.86,
    k: 'The clock',
    t: 'Nobody lines up beside you. Everyone builds the same track, flies it alone, and posts a time. Three consecutive laps, and the clock says who was quicker.',
  },
];

/*
 * THE BOOT SCREEN'S PHASES, AND THEY ARE REAL ONES NOW.
 *
 * This used to be four jokes on a 220 ms interval and a bar that went to
 * 18 percent and then added 26 every tick, so the screen was a stopwatch
 * wearing a workshop's clothes: it said "Balancing props" while the module
 * graph was still arriving, and it said 96 percent while the town, which is
 * most of the wait, had not started. Reported, and rightly: the bar sat and
 * then jumped.
 *
 * Each entry is a thing that actually happens, in the order it happens, with
 * the share of the bar it gets when it starts. The shares are eyeballed
 * against a measured load rather than derived: the town dominates, so it is
 * given the room, and the two cheap phases before it are given enough of the
 * track to be visible rather than their true fraction of a second.
 *
 * `at` is where the bar sits when the phase BEGINS. What carries the wait
 * inside a phase is the creep: see aimBoot.
 */
const BOOT_PHASES = [
  { id: 'modules', at: 0.02, ms: 1400, note: 'Fetching the renderer' },
  { id: 'studio', at: 0.18, ms: 1200, note: 'Building the studio' },
  { id: 'frame', at: 0.34, ms: 1200, note: 'Drawing the first frame' },
  { id: 'town', at: 0.46, ms: 9000, note: 'Building the town' },
  { id: 'warm', at: 0.84, ms: 6000, note: 'Warming the shaders' },
];

/* ------------------------------------------------------------------- boot */

const canvas = document.getElementById('stage');
const bootEl = document.getElementById('boot');
const bootFill = document.getElementById('boot-fill');
const bootNote = document.getElementById('boot-note');

/*
 * MOVE THE BAR, AND MOVE IT ON THE COMPOSITOR.
 *
 * scaleX rather than width, for the reason the sweep beside it is a CSS
 * animation: building the town is seconds of synchronous JavaScript, and
 * during those seconds the main thread does no layout, so a width transition
 * stops dead and a transform transition does not. Both halves of this screen
 * have to keep moving through the one window where the visitor most needs to
 * see that something is happening.
 *
 * `to` is where the bar is aimed and `ms` is how long it may take to get
 * there. A phase aims at the START of the next phase and is given longer
 * than the phase is expected to take, with an easing that decelerates, so
 * the bar is always moving, never arrives early, and never crosses into
 * territory the next phase has not reached yet. When a phase really does
 * end, bootPhase aims at the next mark and the bar catches up.
 */
function aimBoot(to, ms) {
  if (!bootFill) {
    return;
  }
  bootFill.style.transition = `transform ${Math.round(ms)}ms cubic-bezier(0.2, 0.4, 0.3, 1)`;
  bootFill.style.transform = `scaleX(${Math.max(0, Math.min(1, to)).toFixed(4)})`;
  /*
   * AND START IT NOW, IN THIS TASK.
   *
   * A transition does not begin when the style is set, it begins at the
   * next style recalc, and the next style recalc is a rendering step the
   * main thread has to run. Set an aim and then block for four seconds
   * building a world and the transition has still not started when the
   * block begins, so there is nothing for the compositor to carry through
   * it: measured, and it is exactly the window this screen exists for.
   *
   * Reading a computed style forces the recalc here instead, so the
   * animation is handed to the compositor before the caller gets the
   * thread back. One forced recalc per aim, a handful per load.
   */
  void getComputedStyle(bootFill).transform;
}

/*
 * Say what is happening and aim the bar at the end of it.
 *
 * The note is the phase's own words rather than a joke on a timer: a line
 * that changes when a real thing finishes is the cheapest proof a page can
 * give that it is getting somewhere, and it is the difference between a
 * visitor waiting and a visitor leaving.
 */
let bootPhaseAt = -1;
function bootPhase(id) {
  const i = BOOT_PHASES.findIndex((p) => p.id === id);
  if (i < 0 || i <= bootPhaseAt) {
    return;
  }
  bootPhaseAt = i;
  const phase = BOOT_PHASES[i];
  const next = BOOT_PHASES[i + 1];
  if (bootNote) {
    bootNote.textContent = phase.note;
  }
  /*
   * ONE AIM, AND IT IS SET IN THIS TASK.
   *
   * The obvious version snaps to this phase's own mark and then arms the
   * creep in a requestAnimationFrame, so the phase that just ended visibly
   * lands before the next one starts crawling. It cannot be that, because
   * the two phases that matter are followed IMMEDIATELY by seconds of
   * blocked main thread, and a callback scheduled for the next frame does
   * not run before a block: the creep would be armed after the thing it was
   * supposed to cover had finished.
   *
   * So a phase aims once, from wherever the bar has got to, at the mark
   * where the NEXT phase begins, over the time this one is expected to
   * take. A phase that runs long leaves the bar decelerating toward that
   * mark and never past it; a phase that ends early is overtaken by the next
   * announcement. `at` is what the next phase pulls toward, which is why
   * both numbers are in the table.
   */
  const end = next ? next.at : 0.97;
  aimBoot(end, phase.ms);
}

let bootCleared = false;
function clearBoot() {
  if (bootCleared || !bootEl) {
    return;
  }
  bootCleared = true;
  /* All the way, and quickly: the screen is about to fade over the page and
   * a bar caught mid creep fades out unfinished, which reads as a load that
   * gave up rather than one that arrived. */
  aimBoot(1, 200);
  bootEl.classList.add('gone');
  setTimeout(() => {
    bootEl.remove();
    /*
     * The invitation waits for this, and for nothing else.
     *
     * It is announced here rather than read out of the DOM by the card's own
     * script, because the honest signal is the one the thing that knows says
     * out loud. It fires after the removal rather than with the fade so the
     * visitor gets a beat of the page before being asked anything, and it
     * fires on the WebGL failure path too, where the card checks #nowebgl
     * and stays down. The card has its own timer for the case where this
     * module never runs at all, which is the case it matters most in.
     */
    window.dispatchEvent(new Event('webfpv:ready'));
  }, 900);
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

/*
 * THE SHED, AND THE AIRCRAFT THAT FLIES IN IT.
 *
 * Built at import like the field and unlike the town, because it costs what
 * the town does not: about a hundred and fifty meshes of pipe, board and
 * furniture against the district's fifteen hundred. There is nothing here
 * worth a loading phase and nothing worth deferring.
 *
 * ITS LAMPS ARE NOT IN ITS GROUP. Hiding a subtree takes the lights inside it
 * out of the renderer's lighting state, and every material on the page
 * recompiles when they come back, which on this machine is a second of black
 * screen at the exact moment the act begins. So the geometry hides and the
 * lamps stay, turned down to nothing until the switch: see setLamps.
 */
const room = buildRoom();
stage.scene.add(room.group);
stage.scene.add(room.lamps);

/*
 * The whoop rides its own rig for the same reason the five inch does: the
 * pose is written to the rig and the model hangs off it, so nothing in here
 * ever touches the aircraft's own transform. Hidden until the room act, and
 * the five inch is hidden for the whole of it, because the two are never in
 * frame together and a 0.35 m machine parked behind a 0.082 m one would
 * settle the scale argument the wrong way round.
 */
const whoop = buildWhoop();
const whoopRig = new THREE.Group();
whoopRig.add(whoop.group);
whoopRig.visible = false;
stage.scene.add(whoopRig);

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
 * The freestyle line. It no longer starts where the lap ends, because the
 * page no longer flies between them: see the dissolve below. It starts at
 * the best shot in the town instead, which is what a cut is for.
 */
const cityLine = flightLine(CITY_ORIGIN);
const CITY_LENGTH = cityLine.getLength();

/*
 * THE PACING OF THE FREESTYLE ACT.
 *
 * There is no dash any more, because there is nothing to dash across: the
 * act used to open with forty metres of empty ground and had to be flown at
 * two and a half times everything else to stop it dragging. What is left is
 * a real difference rather than a cover up, and it is small: the shopping
 * street is flown at about two thirds the pace of the main road, because a
 * six metre corridor with lanterns over it is somewhere you slow down for
 * and a carriageway is somewhere you do not.
 *
 * It is a TABLE rather than a formula, integrated once at start up, for the
 * same reason SPEED above is: the mapping has to be monotonic and smooth in
 * its derivative, and a piecewise formula that is both is harder to read
 * than the integral of an obvious one. `pace` is speed against act progress;
 * CITY_S is its normalised integral, so scrubbing anywhere lands on the
 * frame that belongs there.
 */
const CITY_S = (() => {
  const N = 256;
  const out = new Float32Array(N + 1);
  /*
   * Slow down the shopping street, then let the road run, and the gap
   * between them is wide on purpose.
   *
   * The corridor is only about a sixth of the line's length. Flown at the
   * same rate as the rest it was over in a sixth of the act, which is a
   * couple of seconds: the quaint bit went past before anybody could look at
   * it. At these two rates it takes closer to a third, and the two numbers
   * come out at about 22 km/h under the lanterns and 50 on the main road,
   * which is the difference between picking your way and committing.
   */
  const pace = (t) => lerp(0.55, 1.25, smooth(clamp01((t - 0.28) / 0.12)));
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
 * About 180 m in 16 s comes out as roughly 28 km/h under the lanterns and
 * 43 down the main road. Those are the right numbers for what is on screen:
 * 28 is a quad picking its way along a six metre street, and 43 is one
 * flying a carriageway with intent and not hooning.
 */
const CITY_SECONDS = 16;
function citySpeed(p) {
  const d = 0.004;
  const a = cityAt(Math.max(0, p - d));
  const b = cityAt(Math.min(1, p + d));
  const per = (b - a) / (Math.min(1, p + d) - Math.max(0, p - d));
  return (per * CITY_LENGTH / CITY_SECONDS) * 3.6;
}

/* ----------------------------------------------------------- the room line */

/*
 * THE WHOOP LAP, measured rather than typed, because the demo track is a
 * regeneration away from being a different track.
 *
 * The one it ships with is 14.4 m of racing line inside 3.54 m by 2.00, with
 * four gates, a pole and a rail on it. That is a whole race track, with a
 * stack and a rail to go under, in the floor area of a large rug, and it is
 * the argument the act is making. The geometry makes it; the copy only
 * quotes it. room-data.js exports SPAN and LAP_LENGTH for the quoting.
 */
const ROOM_LENGTH = room.line.getLength();

/*
 * The speed profile, from the line's own curvature, the same way SPEED is
 * built for the field and for the same reason: the instrument reports the
 * aircraft rather than the reader's finger.
 *
 * The two ends of it are the whoop's, not the five inch's. A 65 mm machine
 * on 1S runs about 22 km/h down a straight it has room to use, and comes
 * back to walking pace through a 0.45 m radius corner under a rail. Those
 * are about a fifth of the five inch's numbers, which is the ratio
 * configs/airframes.js gives the two aircraft, and it is why a track this
 * size is a track at all.
 *
 * The top end is 22 rather than 26 because this track has no straight worth
 * the name: the longest run between two passes is a metre and a half, and a
 * whoop does not reach 26 in a metre and a half.
 */
const ROOM_SPEED = (() => {
  /*
   * SAMPLED AT A FIXED DISTANCE, not a fixed count, because the tracks are
   * not all the same length. A flat 340 samples measured the turn over half
   * a metre on a 43 m track and over 170 mm on a 14 m one, which is not the
   * same measurement: at 170 mm every corner on the track reads as the same
   * corner. 127 mm a sample and a four sample window is half a metre either
   * way, which is about what a whoop can see itself about to do.
   */
  const N = Math.max(64, Math.round(ROOM_LENGTH / 0.127));
  const raw = new Float32Array(N);
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  for (let i = 0; i < N; i += 1) {
    room.line.getTangentAt(i / N, a);
    room.line.getTangentAt(((i + 4) % N) / N, b);
    raw[i] = lerp(22, 7.5, clamp01(a.angleTo(b) / 0.55));
  }
  const out = new Float32Array(N);
  for (let i = 0; i < N; i += 1) {
    let sum = 0;
    for (let k = -7; k <= 7; k += 1) {
      sum += raw[(i + k + N) % N];
    }
    out[i] = sum / 15;
  }
  return out;
})();

function roomSpeedAt(u) {
  const N = ROOM_SPEED.length;
  const f = ((u % 1) + 1) % 1 * N;
  const i = Math.floor(f);
  return lerp(ROOM_SPEED[i % N], ROOM_SPEED[(i + 1) % N], f - i);
}

/* One lap, integrated from that profile, so the clock and the speedometer
 * cannot disagree. Three consecutive laps is the thing a time trial is
 * scored on, and the clock in the corner counts the run rather than the
 * lap for that reason. */
const ROOM_TIME = (() => {
  const N = ROOM_SPEED.length;
  let t = 0;
  for (let i = 0; i < N; i += 1) {
    t += (ROOM_LENGTH / N) / (ROOM_SPEED[i] / 3.6);
  }
  return t;
})();

/*
 * WHERE ON THE LINE, against progress through the act.
 *
 * The field's lap and the town's line both fly at a rate the act sets and
 * the curve follows. This one is the other way round: the pace comes from
 * the speed profile above, so the aircraft slows into the corners and runs
 * on the straights ON SCREEN as well as on the instrument. A whoop track is
 * mostly corner, and a line flown at a constant rate through it reads as a
 * camera on a rail rather than as somebody flying.
 *
 * Same shape as CITY_S: a normalised integral, built once, monotonic by
 * construction, so scrubbing anywhere lands on the frame that belongs there.
 */
const ROOM_S = (() => {
  const N = ROOM_SPEED.length;
  const out = new Float32Array(N + 1);
  let sum = 0;
  for (let i = 1; i <= N; i += 1) {
    /* Time to cover one step at that step's speed. The integral of time
     * against distance is what makes progress through the ACT linear in
     * seconds rather than in metres. */
    sum += 1 / ROOM_SPEED[i - 1];
    out[i] = sum;
  }
  for (let i = 0; i <= N; i += 1) {
    out[i] /= sum;
  }
  return out;
})();

/* Given progress through the act, where that is on the curve. */
function roomAt(p) {
  const N = ROOM_S.length - 1;
  /* ROOM_S is time against distance, so it has to be inverted: walk it for
   * the distance whose cumulative time is p. A 340 entry table binary
   * searched every frame would be silly; it is monotonic and short, so a
   * scan with a remembered start is both simpler and faster. */
  const want = clamp01(p);
  let lo = 0;
  let hi = N;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (ROOM_S[mid] <= want) {
      lo = mid;
    } else {
      hi = mid;
    }
  }
  const span = ROOM_S[hi] - ROOM_S[lo] || 1e-9;
  return (lo + (want - ROOM_S[lo]) / span) / N;
}

/*
 * THE PACK, AND IT IS THE AIRCRAFT'S PACK.
 *
 * The instrument read "4S pack" at 16.6 V for the whole of the lap and the
 * town, and configs/airframes.js ships the five inch as a 6S. It had been
 * wrong since the OSD was written and nothing could catch it, because the
 * cell count was a string in the markup and the voltage was a pair of
 * numbers in a lerp, and the two never had to agree with each other or with
 * the simulator.
 *
 * So the volts are a CELL COUNT TIMES A CELL VOLTAGE now. The per cell
 * figures are the ones the page already flew, 4.15 charged down to 3.48 at
 * the end of the town, which sit inside the 4.2 and 3.5 that
 * configs/airframes.js calls charged and nearly empty; only the multiplier
 * changed. The whoop's own numbers are in its branch below, on one cell,
 * from the same file.
 */
const CELLS_6S = 6;

/* ---------------------------------------------------------------- the page */

const el = {
  ledger: document.getElementById('ledger'),
  nav: document.getElementById('nav'),
  cue: document.getElementById('cue'),
  veil: document.getElementById('veil'),
  dissolve: document.getElementById('dissolve'),
  blackout: document.getElementById('blackout'),
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
  osdPack: document.getElementById('osd-pack'),
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
  { id: 'room', label: 'Whoop' },
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
const roomBeatEls = makeBeats(ROOM_BEATS);

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
function poseChase(pos, quat, back, high, outPos, outQuat, ahead = 4.5) {
  vTmp.set(0, 0, 1).applyQuaternion(quat).multiplyScalar(back);
  outPos.copy(pos).add(vTmp);
  outPos.y += high;
  /* Aimed four and a half metres ahead rather than six: looking further out
   * tips the camera down and pushes the quad off the bottom of the frame,
   * which it was doing on exactly the shot the page builds to.
   *
   * The default is the five inch's, and the room passes its own. A whoop
   * chased from 340 mm behind, aimed 4.5 m ahead, is a camera looking at a
   * wall with an aircraft somewhere along the bottom edge: the aim point has
   * to scale with the machine, not with the page. */
  vTmp2.set(0, 0, -ahead).applyQuaternion(quat).add(pos);
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
 * The whoop's own goggles, and every number in it is different.
 *
 * The five inch carries its camera 80 mm forward and 18 mm up at 30 degrees.
 * On a machine 82 mm across, 80 mm forward is a body length in front of the
 * aircraft: the lens would be outside the ducts, and every gate would pass
 * the camera before it passed the quad. The Air65 II's C03 is 24 mm forward
 * and 12 mm up, and it is tilted back 25 rather than 30 because the aircraft
 * is a fifth as fast and therefore flies a fifth as nose down.
 *
 * Both pairs are the simulator's, from configs/airframes.js and plant.c.
 */
const WHOOP_TILT = THREE.MathUtils.degToRad(WHOOP_CAM_TILT_DEG);
const qWhoopTilt = new THREE.Quaternion()
  .setFromAxisAngle(new THREE.Vector3(1, 0, 0), WHOOP_TILT);
function poseWhoopFPV(pos, quat, outPos, outQuat) {
  vTmp.set(0, WHOOP_MOUNT_UP, -WHOOP_MOUNT_FORWARD).applyQuaternion(quat);
  outPos.copy(pos).add(vTmp);
  outQuat.copy(quat).multiply(qWhoopTilt);
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
const whoopPos = new THREE.Vector3();
const whoopQuat = new THREE.Quaternion();
const parked = new THREE.Vector3();

/*
 * Where the whoop ends up for the close: hovering a hand's width over the
 * start gate, which is the gate a RaceGOW lap opens and closes on and
 * therefore where a pilot's aircraft is when the run ends.
 *
 * Taken from the line's own first point rather than typed, so moving the
 * track moves the hover with it. The town's quad used to park at the far end
 * of the freestyle line for the same reason and in the same way; that block
 * has gone, because the town's act now ends with the aircraft still flying
 * and the camera craning off it, which is a better way to leave a place than
 * stopping dead over it.
 */
const ROOM_HOVER = room.line.getPointAt(0).clone().setY(
  room.line.getPointAt(0).y + 0.16,
);

/*
 * Which way the aircraft faces on the pad: down the line's own first tangent,
 * so it is pointing at the gate it is about to fly through. Read rather than
 * typed, for the reason above.
 */
const padYaw = (() => {
  const t = room.line.getTangentAt(0);
  return Math.atan2(t.x, t.z) + Math.PI;
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
 * THE ROOM'S FLIGHT POSE.
 *
 * The same shape as the town's and tuned for a different machine. Three
 * things move:
 *
 *   THE TRIM is 0.38, which is STEEPER than the town's 0.34 even though the
 *   aircraft is slower, and that is about the room rather than about the
 *   flying. The whoop's lens sits 25 degrees back, the ceiling is four
 *   metres up, and the lap spends half its length above head height: at a
 *   gentle trim the net view is nine degrees up and two thirds of every
 *   frame is joists. At 0.38 the camera axis sits a few degrees above level
 *   and the track is in the middle of the picture, which is where a pilot
 *   flying it would be looking.
 *
 *   THE LOOKAHEAD is a fifth of the town's. 0.008 of this line is 350 mm,
 *   which on a 450 mm radius corner is most of the corner: the roll would
 *   arrive with the apex instead of before it. 0.0018 is about 80 mm, which
 *   is a whoop's own length and is what it can see itself about to do.
 *
 *   THE BANK is softer than it wants to be, and that is a decision made
 *   against a screenshot rather than against the physics. A 0.45 m radius
 *   corner at 2 m/s is a 42 degree bank and this track is almost all
 *   corner, so an honest gain put the horizon on the diagonal for most of
 *   the lap and every frame of it looked like the moment before a crash.
 *   Through a 95 degree lens a roll also reads as more than it is, because
 *   the frame's edges are further off axis than its middle. 0.42 rad at the
 *   limit, reached less often, reads as a whoop being flown and not as a
 *   page that has fallen over.
 *
 *   THE CLIMB feeds in at a third rather than at a half. The line leaves the
 *   start gate at seventeen degrees up, and a lens already tilted 25 back
 *   does not need help finding the ceiling.
 *
 *   THE ALTITUDE TERM is the last one and it was the one this act could
 *   least do without, which was a surprise. The town has one because a
 *   district seen from twenty metres wants a different attitude from a
 *   street seen from three. A four metre ceiling looked like too small a
 *   range for the question to arise, and it is not: the track is three and a
 *   half metres across in a room ten by twelve, so the moment the aircraft
 *   is above the pipe the ONLY thing a forward looking lens has in front of
 *   it is the far wall. Screenshots of two points in the lap came back as
 *   two photographs of a brown corner. A pilot who has climbed over
 *   something looks down at it, and so does this.
 *
 *   The band is the LINE'S band and not the room's. This lap runs from 0.36
 *   to 1.25 m, so it winds in between 0.55 and 1.30 and is fully wound by
 *   the top of the highest pass. A band sized to the ceiling would never
 *   engage on a track that stays under waist height.
 */
const ROOM_TRIM = -0.38;
const ROOM_LOOK_LOW = 0.55;
const ROOM_LOOK_HIGH = 1.30;
const ROOM_LOOK_DOWN = 0.34;
const roomTan = new THREE.Vector3();
const roomTan2 = new THREE.Vector3();
function roomPose(u, outPos, outQuat, bobPhase, flip = 0, turnBank = 0) {
  const c = clamp01(u);
  room.line.getPointAt(c, outPos);
  room.line.getTangentAt(c, roomTan);
  const yawBase = Math.atan2(roomTan.x, roomTan.z) + Math.PI;
  const yaw = yawBase + flip * Math.PI;

  room.line.getTangentAt((c + 0.0018) % 1, roomTan2);
  let dyaw = (Math.atan2(roomTan2.x, roomTan2.z) + Math.PI) - yawBase;
  while (dyaw > Math.PI) dyaw -= Math.PI * 2;
  while (dyaw < -Math.PI) dyaw += Math.PI * 2;
  const roll = THREE.MathUtils.clamp(dyaw * 2.1, -0.42, 0.42) * Math.cos(flip * Math.PI)
    + turnBank;

  const climb = THREE.MathUtils.clamp(
    Math.asin(THREE.MathUtils.clamp(roomTan.y, -1, 1)), -0.7, 0.5,
  );
  const high = clamp01((outPos.y - room.heart.y - ROOM_LOOK_LOW)
    / (ROOM_LOOK_HIGH - ROOM_LOOK_LOW));
  eul.set(ROOM_TRIM + climb * 0.30 - high * ROOM_LOOK_DOWN, yaw, roll);
  outQuat.setFromEuler(eul);
  /* A tenth of the town's bob. It is the same 23 gram machine that gets
   * blown about by its own wash indoors, but the camera is 24 mm from the
   * centre of it rather than 80, so the same angular twitch moves the frame
   * far less and a town sized bob would read as a fault. */
  outPos.y += Math.sin(bobPhase) * 0.004;
}

/*
 * ARRIVING IN THE SHED, and it is two shots rather than one.
 *
 * The act opens on the whole room, because the room is the surprise: four
 * walls, a ceiling, two bulbs and a small white lattice on a mat in the
 * middle of a floor big enough to park a van on. Then it pushes in on the
 * pad, where there is a 23 gram aircraft nobody has noticed yet, and hands
 * over to its camera.
 *
 * Read from the pad and the room rather than typed as six numbers, so that
 * moving the shed or the start of the track moves the shot with it.
 */
const roomFrom = new THREE.Vector3();
const roomTo = new THREE.Vector3();
function poseRoomIn(t, outPos, outQuat) {
  const k = smooth(clamp01(t));
  /* Wide: a high back corner, on the same side as the pad so the push in is
   * a move along one line rather than an orbit. High enough to have the
   * joists in the top of the frame, because the ceiling is half of what
   * says this is a room and not a floor. */
  roomFrom.set(room.heart.x - 4.3, 2.72, room.heart.z + 5.4);
  /*
   * Close: A HAND'S WIDTH BEHIND THE AIRCRAFT AND ALMOST ON THE MAT.
   *
   * 280 mm, which sounds absurd until the arithmetic is done. At 66 degrees
   * the frame is 360 mm across there, so an 82 mm machine is a fifth of it
   * and reads as a machine. From three quarters of a metre it is five
   * percent of the frame, which is a speck with a shed behind it.
   *
   * And that closeness is the shot rather than a compromise for it. What is
   * behind the aircraft at this range is a gate 711 mm across, standing over
   * it like a doorway. Both halves of the scale argument are in one frame:
   * the machine is tiny, and so is the track, and the track is still four
   * times bigger than the machine.
   */
  roomTo.set(room.pad.x - 0.28, 0.105, room.pad.z + 0.17);
  outPos.copy(roomFrom).lerp(roomTo, k);
  /* The aim slides from the middle of the track to the aircraft on the pad,
   * so the wide shot is of the room and the tight one is of the machine. */
  at.set(
    lerp(room.heart.x + 0.2, room.pad.x + 0.03, k),
    lerp(1.30, 0.048, k),
    lerp(room.heart.z - 0.3, room.pad.z, k),
  );
  lookQuat(outPos, at, outQuat);
}

/*
 * THE LAST SHOT OF THE PAGE.
 *
 * It used to be the town from 145 m, and the town still gets that shot: it
 * is the end of the freestyle act now, where the copy is not competing with
 * it. What the page closes on instead is this, and the swap is the whole
 * argument of adding the act.
 *
 * The town says "here is a place to fly", which is a promise about a good
 * afternoon. The shed says "here is a track, and it is in a room, and you
 * could have one tonight", which is what the words over it actually claim:
 * that the hard part of FPV is getting to the first lap and that this costs
 * nothing. The last frame should agree with the last sentence.
 *
 * Composed for the copy rather than for the room. The reason section's type
 * runs down the left and the three cards span the bottom, so the track sits
 * a little above centre with the mat's dark floor under it, which is the one
 * surface on the page a white card reads cleanly against.
 *
 * The aircraft is in it and it is two pixels of mint. At 5.5 m through a 62
 * degree lens the frame is 6.6 m across where the track is, so an 82 mm
 * machine is a bit over one percent of it: what reads is the pair of lamps
 * on its tail, hovering over the start gate. That is the honest version, and
 * it is the same admission the town's own wide shot makes about a five inch
 * at 145 m. The subject of this frame is the track and the room around it.
 *
 * How far it may go is bounded by the room and not by taste: at the last
 * frame the camera is 5.5 m out on a diagonal and 2.45 m up, which is inside
 * a 10 by 12 box with 4 m of headroom, clear of the joists at 3.86 and about
 * 400 mm off the wall behind it. A camera that leaves the room is a camera
 * looking at the outside of a closed box, which is the exact failure the
 * simulator's own title screen had to fix.
 */
const ROOM_CLOSE_FOV = 62;
function poseRoomClose(t, outPos, outQuat) {
  const k = smooth(clamp01(t));
  /*
   * The far corner from the one the act came in over, so the closing frame
   * is not the opening frame with the lights left on, and the corner with
   * nothing in it: the bench, the shelving, the crates and the ladder all
   * end up across the room where they belong in a wide shot, rather than a
   * metre and a half from the lens where a trestle table is a brown bar
   * across the bottom of the last frame of the page.
   *
   * 5.5 m out on the diagonal puts the camera 400 mm off the wall behind it,
   * which is as far as this room goes. What a landscape buys with distance
   * an interior has to buy with angle, which is why the lens is 62 rather
   * than the town's 58.
   */
  const az = lerp(0.72, 0.98, k);
  const dist = lerp(4.4, 5.5, k);
  const h = lerp(1.15, 2.45, k);
  outPos.set(
    room.heart.x + Math.sin(az) * dist,
    h,
    room.heart.z + Math.cos(az) * dist,
  );
  /*
   * Aimed at the top of the track rather than at the middle of it, which is
   * where the copy leaves room. The headline takes the top third of the last
   * frame and the four cards take the bottom, so the track has to sit in the
   * band between them. Aimed at the mat it ran through the headline; aimed
   * clear above the tall pole it dropped behind the cards and the last frame
   * of the page became four metres of empty board. This is the middle of
   * those two, and the only thing that crosses a letter is 27 mm of pipe.
   */
  at.set(room.heart.x + 0.15, 0.92, room.heart.z - 0.15);
  lookQuat(outPos, at, outQuat);
}

/*
 * The lens, as one function of T rather than as a ladder of ternaries.
 *
 * It was a ladder, and at four rungs it was already the hardest line in the
 * file to read. Six is not a line, it is a table, so it is written as one.
 * Every entry is the horizontal angle at that point on the timeline and the
 * lens eases between the pairs; see the note at the call site for what each
 * one is for.
 */
const LENS = [
  { at: 0.00, fov: STUDIO_FOV },
  { at: 1.00, fov: STUDIO_FOV },
  { at: 1.34, fov: 46 },
  { at: 1.98, fov: 46 },
  { at: 2.24, fov: 104 },
  { at: 3.80, fov: 104 },
  { at: 3.99, fov: CLOSE_FOV },
  { at: 4.01, fov: 66 },
  { at: 4.20, fov: 66 },
  { at: 4.33, fov: WHOOP_FOV },
  { at: 4.90, fov: WHOOP_FOV },
  { at: 5.16, fov: ROOM_CLOSE_FOV },
];
function lensAt(t) {
  for (let i = 1; i < LENS.length; i += 1) {
    if (t < LENS[i].at) {
      return lerp(LENS[i - 1].fov, LENS[i].fov, ease(t, LENS[i - 1].at, LENS[i].at));
    }
  }
  return LENS[LENS.length - 1].fov;
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
/* Which of the boot's four closing steps the frame loop is on. See the block
 * that reads it: each step announces or does, never both. */
let bootStep = 0;

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
  /*
   * Drawn from just before the dissolve rather than from the top of the
   * field. It used to come on with the daylight, when the town was a hundred
   * metres away and worth having on the horizon during the lap. At 460 m the
   * haze has all of it, so that was thirty draw calls of nothing for ten
   * screens of scroll.
   */
  city.setShown(T > 2.90 && T < 4.02);
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
  /*
   * INDOORS, and the switch is a step rather than a fade because it happens
   * inside the blackout.
   *
   * Two hundredths of an act is about a tenth of a screen of scroll, and at
   * either end of that window the overlay is more than ninety eight percent
   * opaque, so nothing on screen can see the lighting rig change hands. A
   * long crossfade would be worse than useless: there is no frame in which a
   * sun and a pair of shed bulbs are both the right answer.
   */
  const indoor = REDUCED ? 0 : clamp01((T - 3.988) / 0.016);
  stage.setIndoor(indoor, ROOM_AIR);
  course.setFog(stage.scene.fog);
  /* ------------------------------------------------------------- aircraft */
  /*
   * Eased in off the union, and eased out again at the end.
   *
   * It used to finish at speed, because it was handing the aircraft straight
   * to a freestyle line and a smoothstep at both ends would have stalled the
   * quad at the boundary. There is a dissolve between them now, so the lap
   * gets to finish rather than be overtaken: it settles into its last gate
   * as the frame goes to haze.
   */
  const flying = ramp(T, 2.06, 3.0, 0.16, 0.14);
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
  /* Already moving when the haze clears. There is no ease in: the aircraft
   * is not starting, the page has cut to it mid flight. */
  const roaming = ramp(T, 3.0, 3.97, 0, 0.13);
  const cityU = cityAt(roaming);
  const inCity = T >= 2.995 && T < 4.0;

  /*
   * THE ROOM ACT, and it opens standing still, which is the one thing none
   * of the other acts does.
   *
   * The lap begins in the air off the back of the plan view, and the town
   * act begins mid flight because the page has cut to it. This one begins
   * with the lights off, an empty shed, and an aircraft on a pad, because
   * the shed is the surprise and a surprise flown past at 20 km/h is not one.
   * It also means the two acts either side of it cannot be confused for each
   * other, which was the risk of a fifth act that is also somebody flying.
   *
   *   lamps    the light switch. See setLamps in room.js.
   *   lift     off the pad and onto the start of the line.
   *   running  progress through the lap, which the line's own speed profile
   *            then turns into a position: see roomAt.
   */
  const lamps = REDUCED ? 0 : ease(T, 4.004, 4.085);
  const lift = ease(T, 4.20, 4.27);
  const running = ramp(T, 4.27, 4.95, 0.05, 0.08);
  const roomU = roomAt(running);
  const inRoom = T >= 4.0 && T < 5.0;

  /*
   * Which way it is pointing. Live across all THREE flying acts, and driven
   * by whichever of them is running, so scrolling back up the page turns the
   * aircraft round in the city exactly the way it does on the lap. Handing it
   * only the lap's parameter would have left the quad flying backwards
   * through the shopping street with its nose still pointing at the roofs.
   *
   * The parameter jumps at an act boundary, from one act's 1 to the next
   * act's 0, and for one frame that reads as a hard reverse. It costs
   * nothing: the flip moves at most dt over 1.3 s in a frame, which is about
   * a hundredth, and the very next frame puts it back. Both boundaries are
   * behind a full screen transition anyway.
   */
  const heading = inRoom ? running : inCity ? roaming : flying;
  const flip = updateHeading(heading, dt, T >= 2.0 && T < 5.0);
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
   * the same argument the lap is making. It comes back to 58 at the end of
   * that act, where the page leaves the airframe and the town gets the one
   * shot a landscape can be composed in.
   *
   * THEN THE ROOM, and it needs two more.
   *
   *    66 deg the shed. An interior cannot be established on a long lens,
   *           because the camera cannot back away from it: a 10 by 12 m box
   *           seen from inside needs about what a 24 mm lens gives, and
   *           anything longer is a photograph of one wall. It is the same
   *           trade the closing shot makes and for the same reason.
   *    95 deg the whoop's own lens, from configs/airframes.js, and wider
   *           than the five inch's 85 because indoors everything is close.
   *    62 deg the last frame. Wider than the town's 58 because the camera
   *           cannot back off past a wall: what a landscape buys with
   *           distance an interior has to buy with angle.
   *
   * The step down from 58 to 44 happens across the blackout at the act
   * boundary, where the frame is black and there is nothing to see it in.
   */
  stage.setFov(lensAt(T));

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
     * No join. The two lines are a hundred metres and a dissolve apart, and
     * blending between them would be a hundred metre lerp behind a white
     * frame: work that cannot be seen, on a pose that is about to be
     * replaced. The aircraft is simply somewhere else, which is what a cut
     * means.
     */
    poseFPV(dronePos, droneQuat, camPos, camQuat);

    /*
     * OUT OF THE AIRFRAME, AND THE TOWN GETS ITS SHOT HERE.
     *
     * This pull back used to run into the closing act and finish there, at
     * 145 m, under the reason section's copy. The page ends in a shed now,
     * so the town's wide shot has to be spent inside the town's own act or
     * not at all, and it is worth spending: a hundred and forty metre
     * district in low sun is the best single frame the page owns.
     *
     * It gets it clean, which the old version never did. Under the closing
     * copy the shot was a background: four lines of lede down the left and
     * three cards across the bottom. Here there is no type on it at all, the
     * act's own beats having stopped at 0.82 of the act for exactly this
     * reason, so the last thing before the lights go out is a town and
     * nothing else.
     *
     * It stops at 0.62 of the crane rather than running to the end of it,
     * which puts the camera about 120 m out instead of 145. Further is
     * better with copy over it and worse without: the whole point of the
     * frame is that it is a place somebody flies, and a place needs to be
     * near enough to have streets in it.
     */
    const out = ease(T, 3.70, 3.94);
    if (out > 0) {
      poseChase(dronePos, droneQuat, lerp(3.1, 44, out), lerp(0.72, 19, out), pos2, quat2);
      camPos.lerp(pos2, out);
      camQuat.slerp(quat2, out);
    }
    const wide = ease(T, 3.88, 4.0);
    if (wide > 0) {
      poseCity(wide * 0.62, pos2, quat2);
      camPos.lerp(pos2, wide);
      camQuat.slerp(quat2, wide);
    }
  } else if (T < 5.0) {
    /*
     * THE ROOM ACT. A shed, one warm pair of bulbs, and 43 m of RaceGOW lap
     * folded into three metres by two.
     *
     * Three shots and two joins, and the order is the argument: the place,
     * then the machine, then the machine's own eye. Nothing here is a
     * repeat of the two flying acts before it, and that is deliberate. The
     * lap is an argument about a control loop and the town is a
     * demonstration of having nowhere you have to go; this is about size,
     * and about a track being a specification rather than a place, so it
     * opens on something standing still and lets the room be read.
     */
    poseRoomIn(ease(T, 4.085, 4.185), camPos, camQuat);

    /*
     * On the pad, then off it. The aircraft sits exactly where room.js put
     * the pad, nose down the line's own first tangent rather than at a typed
     * heading, so moving the track moves the aircraft with it.
     */
    roomPose(0, pos2, quat2, now * 3.1, flip, turnBank);
    if (lift < 1) {
      whoopPos.copy(room.pad);
      /* A 23 gram machine sitting on a mat does not hover and does not bob.
       * It is dead still until the throttle comes up, and the stillness is
       * half of what makes the first metre of the lap read as a launch. */
      eul.set(0, padYaw, 0);
      whoopQuat.setFromEuler(eul);
      whoopPos.lerp(pos2, lift);
      whoopQuat.slerp(quat2, lift);
    } else {
      roomPose(roomU, whoopPos, whoopQuat, now * 3.1, flip, turnBank);
    }

    /* Into the goggles. Shorter than the lap's union, because there is no
     * thirty metre gap to cross: the camera is already a metre from the
     * aircraft when it leaves the pad. */
    poseWhoopFPV(whoopPos, whoopQuat, pos2, quat2);
    const toFpv = ease(T, 4.23, 4.32);
    camPos.lerp(pos2, toFpv);
    camQuat.slerp(quat2, toFpv);

    /*
     * And out again for the close, on the same argument the town act makes:
     * the reason section scrolls into frame about a screen before the
     * timeline reaches it, so the camera has to be out of the airframe
     * before the copy lands on it. A goggle feed with a price table over it
     * is a heads up display, not a shot.
     *
     * The whoop settles into a hover as it goes, over the start gate, which
     * is where a RaceGOW pilot's aircraft is at the end of a run: the lap
     * closes on the gate it opened on.
     */
    const out = ease(T, 4.88, 4.97);
    if (out > 0) {
      poseChase(whoopPos, whoopQuat,
        lerp(0.34, 1.4, out), lerp(0.06, 0.55, out), pos2, quat2, 0.5);
      camPos.lerp(pos2, out);
      camQuat.slerp(quat2, out);
    }
    /*
     * ...and it arrives AT the closing crane's first frame rather than at a
     * chase pose the close then has to blend out of.
     *
     * The town act's close used to do that and the seam showed: half a
     * screen of scroll where the camera was neither behind the aircraft nor
     * looking at the place, pointing at a patch of floor between the two.
     * Landing on poseRoomClose(0) here means the closing act simply carries
     * the same crane on, and there is no blend at the boundary at all.
     */
    const wide = ease(T, 4.94, 5.0);
    if (wide > 0) {
      poseRoomClose(0, pos2, quat2);
      camPos.lerp(pos2, wide);
      camQuat.slerp(quat2, wide);
    }
  } else {
    /*
     * THE CLOSE, in the shed, hovering over the gate the lap closed on while
     * the camera cranes back into the corner of the room.
     *
     * Eased into from wherever the lap ended rather than snapped to, the
     * same way the town's close used to be: the line finishes travelling and
     * banked, and setting a hover pose directly levels the aircraft and
     * spins it on the exact frame the closing act begins.
     */
    const parkK = ease(T, 5.0, 5.14);
    roomPose(1, pos2, quat2, now * 3.1);
    parked.set(ROOM_HOVER.x, ROOM_HOVER.y + Math.sin(now * 1.3) * 0.012, ROOM_HOVER.z);
    whoopPos.copy(pos2).lerp(parked, parkK);
    eul.set(-0.02, padYaw + Math.sin(now * 0.6) * 0.14, Math.sin(now * 0.8) * 0.03);
    whoopQuat.setFromEuler(eul);
    whoopQuat.copy(quat2).slerp(whoopQuat, parkK);

    /* No blend. The room act's last frame IS this crane's first one. */
    poseRoomClose(clamp01(T - 5), camPos, camQuat);
  }

  droneRig.position.copy(dronePos);
  droneRig.quaternion.copy(droneQuat);
  whoopRig.position.copy(whoopPos);
  whoopRig.quaternion.copy(whoopQuat);
  /*
   * ONE AIRCRAFT IN FRAME AT A TIME.
   *
   * They are never both in shot, they are 300 m apart, and the room's group
   * is off for every act but its own, so in principle neither of these lines
   * changes a pixel. They are here because the scale argument is the whole
   * act: a five inch left switched on somewhere in the shed would be a 0.35 m
   * machine standing next to a 0.082 m one, and it would settle that argument
   * the wrong way round in one frame.
   */
  const shed = T >= 3.995;
  droneRig.visible = !shed;
  /* The field and its sky go with the daylight. The sky dome is a ten metre
   * shell centred on the lens, so leaving it on would put a painted horizon
   * through the shed's walls. */
  course.group.visible = !shed;
  whoopRig.visible = shed && !REDUCED;
  room.setShown(shed && !REDUCED);
  room.setLamps(lamps);

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
  /* Reduced motion means the props are stopped too. A spinning rotor is
   * the single most animated thing on the page. */
  drone.spin(dt, REDUCED ? 0 : throttle);

  /*
   * The whoop's own throttle. Dead until it is armed on the pad, up hard for
   * the launch, and then working for the lap: a 1S whoop indoors is nearer
   * its cap for more of a lap than a 6S five inch ever is, which is why it
   * sounds like an angry wasp and why the blur discs are on for all of it.
   */
  let whoopThrottle = 0;
  if (T >= 4.09) {
    whoopThrottle = lerp(0.18, 0.62, ease(T, 4.09, 4.24));
  }
  if (T >= 4.24) {
    whoopThrottle = 0.58;
  }
  if (T >= 5.0) {
    whoopThrottle = 0.44;
  }
  whoop.setArmed(T >= 4.06);
  whoop.spin(dt, REDUCED ? 0 : whoopThrottle);

  /*
   * A camera the debug handle can drive, in the town's own coordinates.
   *
   * Every other view on this page is a function of T, which is exactly what
   * you want for a film and exactly what you cannot debug with: when the
   * shopping street rendered as a set of shop banners floating over an empty
   * field, the question was "is the aircraft in the wrong place or is the
   * town" and no shot the timeline can produce answers it. This one can.
   * Six numbers, position and target, and nothing reads it unless something
   * sets it.
   */
  if (DEBUG && window.__camAt) {
    const o = window.__camAt;
    const c = city.origin;
    camPos.set(c.x + o[0], c.y + o[1], c.z + o[2]);
    m4.lookAt(camPos, vTmp.set(c.x + o[3], c.y + o[4], c.z + o[5]), up);
    camQuat.setFromRotationMatrix(m4);
  }
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
    /*
     * NO WEATHER INDOORS, and it is the cheapest thing on the page that says
     * where you are.
     *
     * Blossom has been drifting past the lens since the studio, so the frame
     * it stops in is the frame that has a roof over it. Left running it
     * would be cherry petals falling through a ceiling, which nobody would
     * be able to name and everybody would feel.
     *
     * Off rather than thinned. A single petal in a shed is not weather, it
     * is a bug somebody will report.
     */
    petals.update(dt, camPos, 0, 22, 0.026);
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
  } else if (T < 3.88) {
    stage.aimLight(dronePos, 16);
    stage.aimBlob(dronePos, world, 1.05);
  } else if (T < 4.0) {
    /*
     * At the end of the town act the subject is the DISTRICT, so the sun is
     * aimed at the district. Aimed at the quad instead, the shadow frustum
     * was a 16 m box round an aircraft hovering over one roof and the other
     * four hundred buildings were outside it, which on a machine with
     * shadows on is a town with one lit house in it.
     *
     * No blob, either: a painted shadow under a quad 90 m from the lens is
     * two pixels of dirt on a roof.
     */
    stage.aimLight(city.heart, 90);
    stage.aimBlob(dronePos, 0, 1);
  } else {
    /*
     * Indoors the directional light is turned down to a twentieth by
     * setIndoor and the room's two bulbs do the work, so what is left for it
     * to do is the shadow map. Aimed at the middle of the room with a seven
     * metre frustum, which holds the whole track and the mat it stands on.
     *
     * No blob under the aircraft. The painted one is sized for a five inch
     * over a field, and a whoop 300 mm off a mat casts a shadow the size of
     * a beer mat: the bulbs and the shadow map have that covered, and a
     * half metre smudge under an 82 mm machine is a smudge that says the
     * aircraft is the size of a dinner plate.
     */
    stage.aimLight(room.heart, 7);
    stage.aimBlob(whoopPos, 0, 1);
  }

  /* -------------------------------------------------------------- the run */
  if (inRoom) {
    /*
     * A DIFFERENT AIRCRAFT, SO A DIFFERENT INSTRUMENT, AND THE CLOCK RESETS.
     *
     * Everything about the OSD carries over from the lap to the town act on
     * purpose: one clock, one pack, one flight. Here every one of those is a
     * lie. It is a 23 gram machine on a 300 mAh cell in a shed on another
     * day, so the clock starts again, the pack is 1S, and the counter says
     * what a RaceGOW attempt is actually scored on.
     *
     * LAP 2 OF 3, and not lap 1. The series is scored on the fastest three
     * CONSECUTIVE laps, which means the run you are watching is somebody
     * three quarters of the way through a hot lap they will not get to
     * repeat. Starting the act on lap 1 would have needed two more laps of
     * scroll to say the same thing; joining in the middle says it in three
     * words and puts the pressure in the right place.
     *
     * The clock is the RUN clock rather than the lap's, so it is already
     * carrying a lap when the act opens: one whole lap plus however far into
     * this one we are.
     */
    course.setRun(-1, 0);
    course.hideLines(true);

    /* One decimal, which the other two acts do not get. At 90 km/h a whole
     * number is a tenth of a percent; at 14 it is a seventh of the range the
     * needle ever moves through, and a speedometer that reads 14, 14, 14
     * through a corner is a speedometer nobody believes. */
    const kmh = roomSpeedAt(roomU);
    el.osdSpeed.textContent = `${kmh.toFixed(1)} km/h`;
    el.osdLabel.textContent = 'Run';
    el.osdTimer.textContent = fmtTime(ROOM_TIME * (1 + running));
    el.osdGate.textContent = 'Lap 2 of 3';
    el.osdPack.textContent = '1S 280 mAh \u00b7 Acro';
    el.osdThrottle.style.width = `${Math.round(clamp01((kmh - 6) / 22) * 100)}%`;
    /*
     * One cell, and the numbers are the aircraft's. configs/airframes.js
     * ships the whoop on 4.35 V charged and 3.6 V nearly empty; a lap in is
     * about 4.05 under load and it sags to 3.78 by the end of the run, which
     * is a whoop pilot's actual problem and the reason a pack is three
     * minutes rather than five.
     */
    const volts = lerp(4.05, 3.78, running);
    el.osdVolts.textContent = `${volts.toFixed(2)} V`;
    el.osdBatt.style.width = `${Math.round(lerp(52, 14, running))}%`;
  } else if (inCity) {
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
    const volts = lerp(CELLS_6S * 3.75, CELLS_6S * 3.48, roaming);
    el.osdVolts.textContent = `${volts.toFixed(1)} V`;
    el.osdPack.textContent = '6S pack \u00b7 Acro';
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
    const volts = lerp(CELLS_6S * 4.15, CELLS_6S * 3.75, flying);
    el.osdVolts.textContent = `${volts.toFixed(1)} V`;
    el.osdPack.textContent = '6S pack \u00b7 Acro';
    el.osdBatt.style.width = `${Math.round(lerp(96, 34, flying))}%`;
  } else if (T >= 5.0) {
    /* The close, and it is in the shed now. The race track is three hundred
     * metres away with its lights off and nothing on it should still be lit
     * for a run that finished three acts ago. The lines stay hidden, because
     * they are a builder's drawing and the page is long past the builder. */
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
    /* ...and it comes back for the room act, from the moment the aircraft is
     * off the pad to the moment the camera leaves it. Same contract at both
     * ends: an OSD is what you see through goggles, so it is on exactly when
     * the page is in them. */
    el.osd.classList.toggle('on', !REDUCED
      && ((T > 2.12 && T < 3.74) || (T > 4.24 && T < 4.90)));
    el.cue.style.opacity = T > 0.35 ? '0' : '1';
    if (el.progress) {
      /* Six, not five: the acts run 0 to 5 and the tail is the sixth. It is
       * the one number on the page that has to be counted by hand, because
       * the bar is about the whole document and the document's last stretch
       * is not an act. */
      el.progress.style.width = `${(clamp01(T / 6) * 100).toFixed(2)}%`;
    }
    el.veil.style.opacity = String(lerp(0.72, 0.5, world));
    /*
     * THE DISSOLVE, and it is a pure function of T like everything else.
     *
     * One at the act boundary and nothing at all a twelfth of an act either
     * side of it, which at this act's height is about half a screen of
     * scroll in each direction. The camera changes place at the peak, where
     * the frame is entirely haze, so there is no frame in which both places
     * are visible and none in which neither is.
     *
     * Symmetric on purpose. The page is scrubbable in both directions and a
     * reader dragging the bar back up the page has to come out of the town
     * the same way they went in.
     */
    const flare = 1 - clamp01(Math.abs(T - 3.0) / 0.085);
    el.dissolve.style.opacity = (flare * flare * (3 - 2 * flare)).toFixed(3);

    /*
     * THE SECOND TRANSITION, AND IT GOES THE OTHER WAY.
     *
     * Same mechanism as the dissolve above, same symmetry, same reason for
     * both: the page is scrubbable and the camera changes place at the peak.
     * What is different is the direction through the tonal range, and that
     * is the whole of why this is a second device rather than the same one
     * used twice.
     *
     * The dissolve goes UP, into warm haze, which is what leaving a field in
     * low sun looks like. This goes DOWN, into the dark, because what is on
     * the other side of it is indoors with the lights off. Then the room's
     * own bulbs come up, in the room, on the room: see setLamps in room.js
     * and `lamps` above. The frame is not uncovered by a veil lifting, it is
     * lit by a switch being thrown, which is a thing that happens in the
     * place rather than a thing that happens to the page.
     *
     * A slightly narrower window than the dissolve's, because a fade to
     * black reads as complete sooner than a fade to white does.
     */
    const dark = 1 - clamp01(Math.abs(T - 4.0) / 0.075);
    el.blackout.style.opacity = (dark * dark * (3 - 2 * dark)).toFixed(3);

    /*
     * ACT 1'S COPY IS ON SCREEN FROM THE FIRST FRAME.
     *
     * It used to open at T > 0.04, which is about a screen of scroll, so the
     * page as it loaded was a dark stage, a small lit frame plate, the nav
     * and the word SCROLL, and the claim the whole page is making, that a
     * five inch quad is built in front of you on Betaflight 4.5.1 compiled
     * to WebAssembly, was not on screen until scrollY passed a thousand
     * pixels. On a phone that empty frame was the entire first impression,
     * and the first impression is the one thing a front door cannot afford
     * to spend on a held beat.
     *
     * The fade out at 0.90 is untouched: leaving is timing, arriving is not.
     */
    setCopy('assemble', T < 0.90);
    setCopy('build', T > 1.06 && T < 1.90);
    setCopy('fly', T > 2.0 && T < 2.2);
    setCopy('city', T > 3.02 && T < 3.16);
    /* Later into its act than the others, because the room act opens on a
     * dark shed and a headline over black is a headline nobody reads as part
     * of a film. By 4.06 the bulbs are up and there is something behind it. */
    setCopy('room', T > 4.06 && T < 4.20);

    const act = T < 1 ? 0 : T < 2 ? 1 : T < 3 ? 2 : T < 4 ? 3 : T < 5 ? 4 : 5;
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
    /* And the shed's, keyed to progress through its lap for the same reason
     * the town's are keyed to progress through its act: the beat is about
     * what is in frame, and what is in frame is a position on a line. */
    for (let i = 0; i < roomBeatEls.length; i += 1) {
      const b = ROOM_BEATS[i];
      const nextAt = i + 1 < ROOM_BEATS.length ? ROOM_BEATS[i + 1].at : 1.02;
      const until = b.until ?? nextAt - 0.03;
      const on = inRoom && running >= b.at && running < until;
      roomBeatEls[i].classList.toggle('on', on);
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
  /*
   * ONE STEP PER FRAME, AND THE ANNOUNCEMENT ALWAYS GETS ITS OWN.
   *
   * The two calls in here, building the town and warming it, are seconds of
   * synchronous work each. A note set in the same frame that then blocks is
   * a note nobody sees: the DOM was updated and nothing was composited, and
   * the visitor reads the PREVIOUS phase's words for the whole of the wait.
   * Same lesson as yieldToPaint in the simulator's loading screen, and the
   * same fix: say it, let the frame end, do it on the next one.
   *
   * Three extra frames on a boot that is measured in seconds.
   */
  if (!bootDone) {
    if (bootStep === 0) {
      /* The frame above this is the first one the visitor's GPU has drawn. */
      bootPhase('frame');
      /*
       * Not for a reduced motion visitor. The timeline is pinned to one
       * frame for them, that frame is on the race field, and the town is
       * never shown at all: building it would be seconds of loading screen
       * for geometry nobody is going to see. They get the page sooner, which
       * is the whole point of asking for less.
       */
      bootStep = REDUCED ? 2 : 1;
    } else if (bootStep === 1) {
      bootPhase('town');
      bootStep = 2;
    } else if (bootStep === 2) {
      if (!REDUCED) {
        city.start();
      }
      bootPhase('warm');
      bootStep = 3;
    } else {
      warmCity();
      clearBoot();
      bootDone = true;
    }
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
  /*
   * THE SHED IS WARMED WITH THEM, and it is the cheapest part of this whole
   * function and the one that would be missed.
   *
   * It is a hundred and fifty meshes against the district's fifteen hundred,
   * so nobody would think to. But it is hidden for four fifths of the page,
   * hidden means never submitted, and never submitted means its pipe, its
   * boards and its two bulbs were all cold at the exact frame the lights
   * come on. That frame is also the frame the camera changes place on, so a
   * stall there does not read as a stall, it reads as the transition being
   * broken.
   *
   * Its lamps go up for the pass too, because a material compiled with two
   * point lights at zero is not the same program as one compiled with two
   * point lights doing something. Both are put back below: the next frame
   * recomputes them from T, so there is no state here to lose.
   */
  const wasRoomShown = room.group.visible;
  room.setShown(true);
  room.setLamps(1);
  whoopRig.visible = true;

  const culled = [];
  for (const root of [city.group, course.group, droneRig, room.group, whoopRig]) {
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
    /* And one from inside the shed, which none of the three above can see
     * into: it is 300 m away and it is a closed box. From a back corner,
     * looking across the track, which is the act's own opening shot. */
    stage.camera.position.set(room.heart.x - 4.1, 2.35, room.heart.z + 5.1);
    stage.camera.lookAt(room.heart.x, 0.85, room.heart.z);
    stage.camera.updateMatrixWorld(true);
    stage.renderer.compile(stage.scene, stage.camera);
    stage.render();
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
  room.setShown(wasRoomShown);
  room.setLamps(0);
  whoopRig.visible = false;
}

/* --------------------------------------------------------------- start up */

measure();
window.addEventListener('resize', () => {
  measure();
  lastT = -1;
}, { passive: true });
window.addEventListener('load', measure);

/*
 * The studio is built: the module graph has arrived, WebGL is up, and the
 * quad, the course and the petals are in the scene. Everything above this
 * line ran to get here, which is why this is the phase that reports it.
 *
 * The two phases after this one are announced by the frame loop, which is
 * the only thing that knows when the first frame has actually been drawn and
 * when the town has been asked for.
 */
bootPhase('studio');

requestAnimationFrame(frame);


