/*
 * bake-yard.js: print src/yard-data.js from the simulator's own showpiece
 * map and its own physics module.
 *
 * WHY A GENERATOR RATHER THAN A COPY. The freestyle chapter builds a map and
 * then flies it, and both halves have to be the simulator's. The map is
 * Hibari Yard Tandem, src/maps/built/showpiece.js there, which is also the
 * map the page links to on the board; the cars on it are driven by the
 * physics module, dist/sim.wasm, which is the only thing that knows where a
 * drift car is. This asks both the questions the simulator's shell asks and
 * writes the answers down.
 *
 *   node scripts/bake-yard.js ../WebFPVSimulator > src/yard-data.js
 *
 * WHAT IS WRITTEN. The document, normalized, exactly as the simulator reads
 * it. And every car's poses over one lap of its road, every EVERY ms of the
 * module's clock, which is all a car ever does: the module keys a car's
 * speed on where it is along its road, so a car one lap on is the same car
 * one lap further round, and the page reads a clock of any length off one
 * lap. The lap is measured to a fraction of a millisecond and the bake
 * checks the car comes back to where it started.
 *
 * IT IMPORTS NOTHING BUT THE SIMULATOR. The module is loaded through the
 * simulator's own loader (tests/lib/simmod.js) and driven through its own
 * shell functions (src/game/plantworld.js), the way scripts/roads-check.js
 * there drives it.
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

import { readFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

/*
 * A pose every EVERY ms. A drift car at 20 m/s goes 2 m in that, and the
 * page puts a cubic through the positions, which on the course's 22 m bends
 * is out by well under a millimetre; the angles, the speed and the slide
 * change slowly enough to be read straight across. Ten a second keeps the
 * whole yard's traffic, five cars, under a hundred kilobytes.
 */
const EVERY = 100;

const simRoot = resolve(process.argv[2] ?? '../WebFPVSimulator');
const load = async (rel) => import(pathToFileURL(resolve(simRoot, rel)).href);

const { showpieceMap } = await load('src/maps/built/showpiece.js');
const { starterMap } = await load('src/maps/built/starter.js');
const { normalize } = await load('src/trackbuilder/model.js');
const { trafficOf, uploadTraffic } = await load('src/maps/built/traffic.js');
const { makeVehiclePoses, readVehicles, setVehicleClock } = await load('src/game/plantworld.js');
const { loadSim } = await load('tests/lib/simmod.js');

const { doc, repairs } = normalize(showpieceMap());
if (repairs.length) {
  throw new Error(`the showpiece needed repairs: ${repairs.join('; ')}`);
}
const traffic = trafficOf(doc);
if (traffic.problems.length) {
  throw new Error(`the showpiece's traffic has problems: ${traffic.problems.map((p) => p.message).join('; ')}`);
}
const sim = await loadSim(await readFile(resolve(simRoot, 'dist/sim.wasm')));
sim.e.sim_world_clear();
sim.e.sim_world_build();
const up = uploadTraffic(sim, traffic);
if (up.problems.length || up.vehicles !== traffic.vehicles.length) {
  throw new Error(`the module did not take the traffic: ${up.problems.map((p) => p.message).join('; ')}`);
}
const poses = makeVehiclePoses();
const at = (step) => {
  setVehicleClock(sim, step);
  readVehicles(sim, poses);
  return poses;
};

/* A car's lap, ms, to a fraction: the first whole step at which it has
 * driven its road's length, found by halving, then the part of that step
 * the last of the lap took. */
function lapOf(v) {
  const d0 = at(0)[v.slot].distance;
  const L = traffic.roads[v.road].length;
  let lo = 0;
  let hi = 1;
  while (at(hi)[v.slot].distance - d0 < L) {
    lo = hi;
    hi *= 2;
  }
  while (hi - lo > 1) {
    const mid = Math.floor((lo + hi) / 2);
    if (at(mid)[v.slot].distance - d0 >= L) {
      hi = mid;
    } else {
      lo = mid;
    }
  }
  const a = at(hi - 1)[v.slot].distance - d0;
  const b = at(hi)[v.slot].distance - d0;
  return hi - 1 + (L - a) / (b - a);
}

/* An angle carried on from the one before it, so a heading that goes round
 * reads as one smooth number rather than jumping at the half turn. */
function unwrap(prev, a) {
  if (prev === null) {
    return a;
  }
  let d = a - prev;
  while (d > Math.PI) {
    d -= 2 * Math.PI;
  }
  while (d < -Math.PI) {
    d += 2 * Math.PI;
  }
  return prev + d;
}

const cars = traffic.vehicles.map((v) => {
  const period = lapOf(v);
  /* One sample past the lap either end, so a cubic has its neighbours at
   * the seam. */
  const n = Math.ceil(period / EVERY) + 3;
  const rows = { x: [], z: [], h: [], t: [], v: [], d: [], k: [], s: [] };
  let h = null;
  let t = null;
  for (let i = -1; i < n - 1; i += 1) {
    const p = at(Math.max(0, i * EVERY))[v.slot];
    if (i < 0) {
      /* The step before zero is the lap's own end, which is where a clock
       * that wrapped would read it, and a lap less far driven. */
      const q = at(Math.round(period - EVERY))[v.slot];
      Object.assign(p, q);
      p.distance -= traffic.roads[v.road].length;
    }
    if (Math.abs(p.y) > 1e-9) {
      throw new Error(`${v.element} leaves the paving: y ${p.y}`);
    }
    /* Three.js's turn about y, which is what the page sets a car's rotation
     * to: a model nose along +x turned by `h` points at (cos h, -sin h). */
    h = unwrap(h, Math.atan2(-p.hz, p.hx));
    t = unwrap(t, Math.atan2(-p.tz, p.tx));
    rows.x.push(Math.round(p.x * 1000));
    rows.z.push(Math.round(p.z * 1000));
    rows.h.push(Math.round(h * 1e5));
    rows.t.push(Math.round(t * 1e5));
    rows.v.push(Math.round(p.speed * 1000));
    rows.d.push(Math.round(p.distance * 1000));
    rows.k.push(Math.round(p.curvature * 1e6));
    rows.s.push(Math.round(p.slip * 1e5));
  }
  /* One lap on, the car is where it started: the whole claim this file
   * rests on. Checked at three places in the lap. */
  for (const s0 of [0, 7000, 15000]) {
    const a = { ...at(s0)[v.slot] };
    const b = at(Math.round(s0 + period))[v.slot];
    const off = Math.hypot(a.x - b.x, a.z - b.z);
    /* Up to half a millisecond of rounding in the step, at up to 20 m/s. */
    if (off > 0.011) {
      throw new Error(`${v.element} does not come back to where it was a lap earlier: ${off} m`);
    }
  }
  return {
    element: v.element,
    period: Math.round(period * 1000) / 1000,
    length: Math.round(traffic.roads[v.road].length * 1000) / 1000,
    ...rows,
  };
});

let commit = 'unknown';
try {
  commit = execFileSync('git', ['rev-parse', '--short=12', 'HEAD'], { cwd: simRoot, encoding: 'utf8' }).trim();
} catch (e) {
  /* Not a checkout. The file says so. */
}

const lines = cars.map((c) => {
  const row = (k) => `    ${k}: [${c[k].join(',')}],`;
  return [
    '  {',
    `    element: '${c.element}',`,
    `    period: ${c.period},`,
    `    length: ${c.length},`,
    row('x'), row('z'), row('h'), row('t'), row('v'), row('d'), row('k'), row('s'),
    '  },',
  ].join('\n');
});

/* The first element the showpiece adds to the starter: everything before
 * it is Hibari Yard as every pilot first flies it. */
const starterIds = new Set(starterMap().elements.map((e) => e.id));
const added = doc.elements.find((e) => !starterIds.has(e.id));
if (!added || doc.elements.slice(doc.elements.indexOf(added)).some((e) => starterIds.has(e.id))) {
  throw new Error('the showpiece is not the starter with elements added after it');
}

/* The tandem: the two drift cars on the drift course, the one in front
 * first, which is the one whose offset is less than half a lap ahead of the
 * other's. */
const course = doc.elements.find((e) => e.type === 'road' && e.name === 'Drift course');
const tandem = traffic.vehicles.filter((v) => v.drift > 0 && traffic.roads[v.road].element === course.id);
if (tandem.length !== 2) {
  throw new Error(`the drift course has ${tandem.length} drift cars, not a tandem`);
}
{
  const L = traffic.roads[tandem[0].road].length;
  const ahead = (((tandem[0].offset - tandem[1].offset) % L) + L) % L;
  if (ahead > L / 2) {
    tandem.reverse();
  }
}

process.stdout.write(`/*
 * yard-data.js: Hibari Yard Tandem, the freestyle chapter's map, and every
 * car on it as the physics module drives it.
 *
 * GENERATED, NOT AUTHORED. Do not edit. Every figure below was read out of
 * the simulator's own showpiece document and its own physics module:
 *
 *   node scripts/bake-yard.js ../WebFPVSimulator > src/yard-data.js
 *
 * from a checkout of Mathew-Harvey/WebFPVSimulator beside this one, at
 * ${commit}. Change the map there and regenerate; change it here and the
 * front door starts showing a yard nobody can fly.
 *
 * DOC is the document, normalized exactly as the simulator reads it:
 * ${doc.elements.length} elements on a ${doc.field.width} by ${doc.field.depth} m plot, id ${doc.id}, which is the id it is
 * published on the board under. ADDED is the first of them that is not
 * Hibari Yard's own: the starter is everything before it, and the page's
 * builder loads that first and then sets the rest down one at a time.
 *
 * CARS is one lap of each vehicle, ${traffic.vehicles.length} of them, a pose every ${EVERY} ms of the
 * module's clock, from the sample one before the clock's zero to one past
 * the lap, so the page can wrap a clock of any length onto it and read a
 * cubic through the seam. A car's lap is \`period\`, ms, and \`length\` m of
 * its lane, which is how far its count goes on each lap. The frame is the
 * map's own, as the simulator builds it: Three.js metres, Y up, the plot's
 * middle at the origin; the page moves the whole yard to where it stands.
 * Fixed point, to keep the file small:
 *
 *   x, z   where the car is, the road point under its middle, mm
 *   h      its heading, the turn about y a model nose along +x is given,
 *          1e-5 rad, carried on round rather than wrapped
 *   t      the way it is going, the same way; h less t is the drift
 *   v      its speed along the road, mm/s
 *   d      how far it has driven, the module's own count, mm
 *   k      the road's curvature under it, 1e-6 per m, left positive
 *   s      its drift, tan(slip / 2), 1e-5, left positive
 *
 * THE TANDEM is ${tandem.map((v) => v.element).join(' and ')}, lead and chase: two cars on one road at one speed, which
 * the module drives off one speed table, so the one behind is the one in
 * front a fixed time later, every lap. Nothing here makes that so; the
 * simulator's scripts/roads-check.js holds it.
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

export const EVERY = ${EVERY};

export const DOC = ${JSON.stringify(doc)};

export const ADDED = '${added.id}';

export const TANDEM = { lead: '${tandem[0].element}', chase: '${tandem[1].element}', course: '${course.id}' };

export const CARS = [
${lines.join('\n')}
];
`);
