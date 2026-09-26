/*
 * yard.js: Hibari Yard Tandem, the map the freestyle chapter builds and then
 * flies, which is the simulator's own map rather than a drawing of one.
 *
 * WHAT THIS FILE IS. A join, like city.js. The document is the simulator's
 * showpiece and every car's lap is its physics module's, both baked into
 * ./yard-data.js by scripts/bake-yard.js. Everything drawn is drawn by the
 * simulator's own code under ./sim, copied byte for byte: where each
 * element stands (maps/built/place.js), the kit that draws it
 * (props/kit.js), the ground (maps/built/ground.js), the roads
 * (maps/built/roadmesh.js), the cars and their drift smoke
 * (maps/built/cars.js), all in the map's time of day (maps/built/looks.js).
 * Those are the parts the built map and the builder's 3D view put together,
 * so a visitor who clicks through to fly it or open it in the builder gets
 * the yard they were shown.
 *
 * WHAT IS OURS, AND IT IS FOUR THINGS:
 *
 *   1. WHERE IT STANDS. The numbers are in places.js.
 *   2. THE LAND PAST THE PLOT IS THE PAGE'S. The map's own terrain is a two
 *      kilometre plane, which here would lie over the town and the race
 *      field, so it is left out, and the page's deck is cut out from under
 *      the plot instead, the way it is from under the town.
 *   3. HOW IT IS BUILT ON SCREEN. The builder act places the map element by
 *      element, so each element is drawn into a chunk of its own (the kit's
 *      chunks are how a map groups its batches anyway; the map groups by
 *      forty eight metre cells, this by element), and each road is drawn on
 *      its own so it can be laid along its length. See setBuild.
 *   4. THE CLOCK. The cars are posed from the baked laps at whatever clock
 *      the film asks for, and the smoke is put down the way the simulator
 *      puts it down, from the poses at every sixteenth millisecond. See
 *      setClock.
 *
 * WHAT IT COSTS is a build of a second or two in all, in steps, behind the
 * film, like the town. See the loader in main.js.
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
import { YARD_ORIGIN, YARD_TURN } from './places.js';

/*
 * NOTHING OF THE SIMULATOR'S IS IMPORTED HERE, for the town's reason: the
 * yard's modules are about thirty files and a megabyte, and a static import
 * would put them on the page's first frame. They are the build's first step,
 * and so is the baked map, which is ninety kilobytes of numbers.
 */
const DATA = './yard-data.js';
let DOC = null;
let CARS = null;
let EVERY = 100;
let TANDEM = null;
const MODULES = [
  './sim/maps/built/place.js',
  './sim/props/kit.js',
  './sim/maps/built/ground.js',
  './sim/maps/built/roadmesh.js',
  './sim/maps/built/cars.js',
  './sim/maps/built/looks.js',
  './sim/maps/built/traffic.js',
];

/* How many steps a whole build takes, for the note a hold shows: the
 * imports, the traffic, the ground, the roads, the elements a few at a time,
 * the merge and the cars. Only ever a denominator. */
const STEPS = 30;
/* Elements drawn a step. */
const PER_STEP = 3;

/* The simulator's smoke stride, ms: see SMOKE_EVERY in maps/built/cars.js,
 * which a smoke fed at any other stride would not match. And how much clock
 * of it is alive at once, ms, a little over the smoke's own 1.6 s life. */
const SMOKE_EVERY = 16;
const SMOKE_BACK = 1700;

const COS = Math.cos(YARD_TURN);
const SIN = Math.sin(YARD_TURN);

/* A point in the map's own frame, into the race field's. */
export function yardToWorld(x, y, z, out) {
  return out.set(YARD_ORIGIN.x + x * COS + z * SIN, YARD_ORIGIN.y + y, YARD_ORIGIN.z - x * SIN + z * COS);
}

/* A point in the document's plan, metres from the plot's south west corner,
 * into the race field's frame: the simulator's docToWorld, then ours. The
 * plot's size is the map's, so this answers only once the map is in. */
export function planToWorld(x, y, h, out) {
  if (!DOC) {
    return null;
  }
  return yardToWorld(x - DOC.field.width / 2, h, -(y - DOC.field.depth / 2), out);
}

/* ---------------------------------------------------------------- the laps */

/*
 * One car's pose at a clock, read off its baked lap: a cubic through the
 * positions (Catmull-Rom, which passes through every sample the module
 * gave), and straight across for everything else. Into `out`, in the map's
 * own frame, in the shape the simulator's readVehicles fills.
 */
function lapPose(car, ms, out) {
  const P = car.period;
  const lap = Math.floor(ms / P);
  const u = ms - lap * P;
  const i = Math.min(car.x.length - 4, Math.floor(u / EVERY));
  const f = (u - i * EVERY) / EVERY;
  /* Sample k of the lap is at index k + 1: the file starts one before zero. */
  const cr = (a, k) => {
    const p0 = a[k];
    const p1 = a[k + 1];
    const p2 = a[k + 2];
    const p3 = a[k + 3];
    const f2 = f * f;
    const f3 = f2 * f;
    return 0.5 * ((2 * p1) + (-p0 + p2) * f + (2 * p0 - 5 * p1 + 4 * p2 - p3) * f2 + (-p0 + 3 * p1 - 3 * p2 + p3) * f3);
  };
  const lin = (a) => a[i + 1] + (a[i + 2] - a[i + 1]) * f;
  out.on = true;
  out.x = cr(car.x, i) * 1e-3;
  out.y = 0;
  out.z = cr(car.z, i) * 1e-3;
  const h = lin(car.h) * 1e-5;
  const t = lin(car.t) * 1e-5;
  /* A turn of h about y takes a nose along +x to (cos h, -sin h). */
  out.hx = Math.cos(h);
  out.hz = -Math.sin(h);
  out.tx = Math.cos(t);
  out.tz = -Math.sin(t);
  out.speed = lin(car.v) * 1e-3;
  out.vx = out.tx * out.speed;
  out.vy = 0;
  out.vz = out.tz * out.speed;
  out.distance = lin(car.d) * 1e-3 + lap * car.length;
  out.curvature = lin(car.k) * 1e-6;
  out.slip = lin(car.s) * 1e-5;
  out.yaw = h;
  out.travel = t;
  return out;
}

function blankPose() {
  return {
    on: false, x: 0, y: 0, z: 0, hx: 1, hz: 0, tx: 1, tz: 0, vx: 0, vy: 0, vz: 0,
    speed: 0, distance: 0, yawRate: 0, curvature: 0, slip: 0, yaw: 0, travel: 0,
  };
}

/* ------------------------------------------------------------- the build */

/*
 * THE YARD, built in steps by the loader in main.js, and never before it is
 * asked for. `onReady` fires when it is done; until then the group is empty
 * and the page holds its transition closed rather than show an empty plot
 * where a map should be.
 */
export function buildYard({ onReady = null } = {}) {
  const group = new THREE.Group();
  group.name = 'yard';
  group.position.copy(YARD_ORIGIN);
  group.rotation.y = YARD_TURN;
  group.visible = false;

  const state = { ready: false, stats: null };
  let shown = false;
  let taken = 0;

  /* What the build makes, for the reveal and the clock. */
  let carSet = null;
  /* The order the builder places things in: the document's own. */
  const order = [];
  /* Poses by slot, the shape cars.js reads, and one a step earlier for its
   * brake lamps. */
  const slots = [];
  const prevSlots = [];
  /* Each baked lap by the slot its car drives in. */
  const lapBySlot = [];
  const driftSlots = [];
  let startClock = 0;
  let flight = null;
  let spawn = null;
  let solids = null;

  /*
   * HOW NEAR THE LINE FLOWN COMES TO ANYTHING SOLID, against the solids the
   * simulator flies the map against (maps/built/place.js), sampled over the
   * whole flight: for the debug handle, because a lens this wide fills with
   * a wall a metre before it hits one and a near miss and a hit look the
   * same in a still. Returns the nearest, where, and the worst few.
   */
  function clearance(stepMs = 20) {
    if (!flight || !solids) {
      return null;
    }
    const out = {};
    const hits = [];
    let best = { gap: Infinity };
    for (let ms = flight.lift; ms <= flight.end; ms += stepMs) {
      flight.at(ms, out);
      const dx = out.pos.x - YARD_ORIGIN.x;
      const dz = out.pos.z - YARD_ORIGIN.z;
      const x = dx * COS - dz * SIN;
      const z = dx * SIN + dz * COS;
      const y = out.pos.y - YARD_ORIGIN.y;
      let gap = Infinity;
      let what = '';
      for (const sd of solids) {
        let d;
        if (sd.box) {
          const b = sd.box;
          const ex = Math.max(b[0] - x, 0, x - b[3]);
          const ey = Math.max(b[1] - y, 0, y - b[4]);
          const ez = Math.max(b[2] - z, 0, z - b[5]);
          d = Math.sqrt(ex * ex + ey * ey + ez * ez);
        } else {
          const c = sd.cap;
          const ux = c[3] - c[0];
          const uy = c[4] - c[1];
          const uz = c[5] - c[2];
          const l2 = ux * ux + uy * uy + uz * uz || 1;
          const t = Math.max(0, Math.min(1, ((x - c[0]) * ux + (y - c[1]) * uy + (z - c[2]) * uz) / l2));
          const qx = c[0] + ux * t - x;
          const qy = c[1] + uy * t - y;
          const qz = c[2] + uz * t - z;
          d = Math.sqrt(qx * qx + qy * qy + qz * qz) - c[6];
        }
        if (d < gap) {
          gap = d;
          what = `${sd.kind} ${sd.name || ''}`;
        }
      }
      if (gap < best.gap) {
        best = { gap: Math.round(gap * 100) / 100, ms: Math.round(ms), phase: out.phase, s: Math.round(out.s || 0), what };
      }
      if (gap < 1.5) {
        hits.push({ ms: Math.round(ms), gap: Math.round(gap * 100) / 100, phase: out.phase, what });
      }
    }
    return { nearest: best, under: hits.length, first: hits.slice(0, 8) };
  }
  let smokeAt = -Infinity;
  const scratch = blankPose();

  function* make() {
    const data = yield import(DATA);
    DOC = data.DOC;
    CARS = data.CARS;
    EVERY = data.EVERY;
    TANDEM = data.TANDEM;
    FIRST_ADDED = DOC.elements.findIndex((e) => e.id === data.ADDED);
    taken += 1;
    const [place, kitMod, groundMod, roadMod, carMod, looks, trafficMod] = yield Promise.all(MODULES.map((m) => import(m)));
    taken += 1;
    const t0 = performance.now();
    const placed = place.placeDocument(DOC);
    const look = looks.lookOf(DOC);
    const traffic = trafficMod.trafficOf(DOC);
    const cover = roadMod.roadCover(traffic, 0.3);
    taken += 1;
    yield 'traffic';

    /* The ground, less the map's own land past it: see the header. */
    const ground = groundMod.buildGround(placed, DOC, look, cover);
    const terrain = ground.group.getObjectByName('terrain');
    if (terrain) {
      terrain.removeFromParent();
      terrain.geometry.dispose();
      if (terrain.material.map) {
        terrain.material.map.dispose();
      }
      terrain.material.dispose();
    }
    group.add(ground.group);
    taken += 1;
    yield 'ground';

    /* Each road on its own, so the builder can lay it along its length. */
    const roads = new Map();
    for (const d of traffic.drawn) {
      const mesh = roadMod.buildRoadMesh(THREE, look, { drawn: [d], field: traffic.field });
      if (!mesh.batches) {
        continue;
      }
      group.add(mesh.group);
      roads.set(d.element, roadReveal(mesh.group, d));
    }
    taken += 1;
    yield 'roads';

    /* Every element into a chunk of its own. */
    const kit = new kitMod.PropKit(looks.kitLook(look.timeId));
    let n = 0;
    for (const it of placed.items) {
      kit.begin(it.x, it.y, it.z, it.yaw, it.el.id);
      kit.element(it.el);
      n += 1;
      if (n % PER_STEP === 0) {
        taken += 1;
        yield 'props';
      }
    }
    const props = kit.finish();
    taken += 1;
    yield 'merge';
    /* Each chunk under a pivot at its element's foot, so the builder can set
     * it down there. */
    const pivots = new Map();
    for (const it of placed.items) {
      const chunk = props.getObjectByName(`props:${it.el.id}`);
      if (!chunk) {
        continue;
      }
      const pivot = new THREE.Group();
      pivot.name = `place:${it.el.id}`;
      pivot.position.set(it.x, it.y, it.z);
      chunk.position.set(-it.x, -it.y, -it.z);
      pivot.add(chunk);
      group.add(pivot);
      pivots.set(it.el.id, pivot);
    }

    /* The moving cars, and their laps by slot. */
    carSet = carMod.buildCars(THREE, look, traffic);
    group.add(carSet.group);
    for (const v of traffic.vehicles) {
      const lap = CARS.find((c) => c.element === v.element);
      lapBySlot[v.slot] = lap || null;
      if (v.drift > 0) {
        driftSlots.push(v.slot);
      }
    }
    for (let m = 0; m < 64; m += 1) {
      slots.push(blankPose());
      prevSlots.push(blankPose());
    }
    const carRoots = new Map(carSet.cars.map((c) => [c.element, c]));

    /* The order the builder places things in: the document's. */
    for (const el of DOC.elements) {
      const at = { x: el.position.x, y: el.position.y };
      if (pivots.has(el.id)) {
        order.push({ id: el.id, type: el.type, kind: 'item', node: pivots.get(el.id), at });
      } else if (roads.has(el.id)) {
        order.push({ id: el.id, type: el.type, kind: 'road', road: roads.get(el.id), name: el.name, at });
      } else if (carRoots.has(el.id)) {
        /* A car stands where it starts, which is its road's business. */
        const start = trafficMod.vehicleStart(DOC, el);
        order.push({ id: el.id, type: el.type, kind: 'car', car: carRoots.get(el.id), name: el.name, at: start ? { x: start.x, y: start.y } : at });
      } else if (el.type === 'gap') {
        order.push({ id: el.id, type: el.type, kind: 'gap', name: el.name, points: el.points || 0, at });
      }
    }

    let meshes = 0;
    let tris = 0;
    group.traverse((o) => {
      if (!o.isMesh) {
        return;
      }
      meshes += 1;
      const g = o.geometry;
      tris += (g.index ? g.index.count : g.getAttribute('position').count) / 3;
    });
    state.stats = {
      elements: DOC.elements.length,
      items: placed.items.length,
      roads: roads.size,
      cars: carSet.cars.length,
      meshes,
      triangles: Math.round(tris),
      buildMs: Math.round(performance.now() - t0),
    };
    /* The ground as built, in the race field's frame, for the deck's cut. */
    group.updateMatrixWorld(true);
    state.ground = new THREE.Box3().setFromObject(ground.group);
    /* The pad the simulator seats the craft on, and the way it faces, in
     * the race field's frame. */
    spawn = yardToWorld(placed.spawn.x, placed.spawn.y, placed.spawn.z, new THREE.Vector3());
    spawn.yaw = placed.spawn.yaw + YARD_TURN;
    flight = makeFlight(carAt, spawn);
    solids = placed.solids;
    state.ready = true;
    setBuild(1, 1);
    setClock(startClock, true);
    group.visible = shown;
    if (onReady) {
      onReady(state.stats);
    }
  }

  let started = false;
  function* steps() {
    if (started) {
      return;
    }
    started = true;
    yield* make();
  }

  /* ---------------------------------------------------------- the reveal */

  /*
   * HOW MUCH OF THE MAP IS PLACED, in two parts, because that is how it was
   * made: `load` is the starter yard arriving as a document does when it is
   * opened, and `add` is everything the showpiece puts on it, placed one at
   * a time, the roads laid along their length. Both 0 to 1. Returns what is
   * on the plot, for the builder's instrument.
   */
  /* Where the showpiece's own elements begin in the document: every
   * element before this one is the starter's. Found when the map arrives. */
  let FIRST_ADDED = -1;
  const counts = {
    placed: 0, gaps: 0, road: 0, cars: 0, drift: 0, last: '', lastName: '', byType: {}, gapIds: [], lastAt: { x: 0, y: 0 },
  };
  let lastLoad = -1;
  let lastAdd = -1;
  function setBuild(load, add) {
    if (!state.ready) {
      return counts;
    }
    if (load === lastLoad && add === lastAdd) {
      return counts;
    }
    lastLoad = load;
    lastAdd = add;
    counts.placed = 0;
    counts.gaps = 0;
    counts.road = 0;
    counts.cars = 0;
    counts.drift = 0;
    counts.last = '';
    counts.lastName = '';
    counts.byType = {};
    counts.gapIds = [];
    const first = FIRST_ADDED < 0 ? order.length : order.findIndex((o) => DOC.elements.findIndex((e) => e.id === o.id) >= FIRST_ADDED);
    const loaded = first < 0 ? order.length : first;
    /* The additions share the second part by weight: a road is laid over
     * eight shares, everything else is set down in one. */
    const weights = order.slice(loaded).map((o) => (o.kind === 'road' ? 8 : 1));
    const total = weights.reduce((a, b) => a + b, 0) || 1;
    let acc = 0;
    order.forEach((o, i) => {
      let k;
      if (i < loaded) {
        /* The starter arrives as a cascade in document order, each element
         * over a short stretch of the load. */
        const at = i / Math.max(1, loaded);
        k = clamp01((load - at * 0.8) / 0.2);
      } else {
        const w = weights[i - loaded];
        k = clamp01((add * total - acc) / w);
        acc += w;
      }
      reveal(o, k);
      if (k > 0) {
        counts.placed += 1;
        counts.last = o.type;
        counts.lastName = o.name || '';
        counts.byType[o.type] = (counts.byType[o.type] || 0) + 1;
        /* Where the builder's cursor is: on the element just set down, or
         * at the head of the road being laid. */
        if (o.kind === 'road') {
          o.road.head(k, counts.lastAt);
        } else {
          counts.lastAt.x = o.at.x;
          counts.lastAt.y = o.at.y;
        }
        if (o.kind === 'gap') {
          counts.gaps += 1;
          counts.gapIds.push(o.id);
        } else if (o.kind === 'road') {
          counts.road += o.road.length * k;
        } else if (o.kind === 'car') {
          counts.cars += 1;
          if (o.car.drift) {
            counts.drift += 1;
          }
        }
      }
    });
    return counts;
  }

  /* One element at k of the way down: a pop that settles, the way the
   * builder sets a thing on the plan. */
  function reveal(o, k) {
    const s = k <= 0 ? 0 : (k >= 1 ? 1 : popOf(k));
    if (o.kind === 'item') {
      o.node.visible = s > 0;
      o.node.scale.setScalar(Math.max(1e-3, s));
    } else if (o.kind === 'road') {
      o.road.set(k);
    } else if (o.kind === 'car') {
      o.shown = s;
    }
  }

  /* ----------------------------------------------------------- the clock */

  /*
   * EVERY CAR AT THE MODULE'S CLOCK `ms`, and the smoke they have put down.
   *
   * The smoke is the simulator's: each drift car puts a puff down at every
   * sixteenth millisecond of the clock while it slides, from its pose at
   * that step, and a puff lives 1.6 s. The film's clock is the scroll, so it
   * jumps and runs backwards, and the smoke has to be what the clock says
   * rather than what happened: so a clock that moves on puts down the steps
   * it passed, and one that goes back, or leaps, starts the smoke again from
   * the last second and a half. Either way the frame is a function of the
   * clock.
   */
  function setClock(ms, force = false) {
    if (!state.ready) {
      return;
    }
    startClock = ms;
    const back = ms < smokeAt || ms - smokeAt > SMOKE_BACK;
    if (back || force) {
      carSet.clearSmoke();
      smokeAt = ms - SMOKE_BACK;
    }
    let step = Math.ceil((smokeAt + 1e-6) / SMOKE_EVERY) * SMOKE_EVERY;
    for (; step <= ms; step += SMOKE_EVERY) {
      if (step < 0) {
        continue;
      }
      poseAll(step, slots);
      carSet.emit(step, slots);
    }
    smokeAt = ms;
    poseAll(Math.max(0, ms - 1), prevSlots);
    poseAll(ms, slots);
    carSet.place(prevSlots, slots, 1, ms);
    /* A car the builder has not placed yet is not on the plan. */
    for (const o of order) {
      if (o.kind === 'car') {
        const s = o.shown ?? 1;
        o.car.root.visible = s > 0;
        o.car.root.scale.setScalar(Math.max(1e-3, s));
      }
    }
  }

  function poseAll(ms, into) {
    for (let m = 0; m < lapBySlot.length; m += 1) {
      const lap = lapBySlot[m];
      if (lap) {
        lapPose(lap, ms, into[m]);
      } else {
        into[m].on = false;
      }
    }
  }

  /* One car's pose at a clock, in the race field's frame: where it is, its
   * heading and its way of going as world yaws, its speed and its slide. */
  function carAt(element, ms, out = {}) {
    const lap = CARS && CARS.find((c) => c.element === element);
    if (!lap) {
      return null;
    }
    lapPose(lap, ms, scratch);
    out.pos = yardToWorld(scratch.x, 0, scratch.z, out.pos || new THREE.Vector3());
    out.yaw = scratch.yaw + YARD_TURN;
    out.travel = scratch.travel + YARD_TURN;
    out.speed = scratch.speed;
    out.slip = scratch.slip;
    out.curvature = scratch.curvature;
    return out;
  }

  return {
    group,
    steps,
    get ready() {
      return state.ready;
    },
    get progress() {
      return state.ready ? 1 : Math.min(0.99, taken / STEPS);
    },
    get stats() {
      return state.stats;
    },
    setShown(on) {
      shown = !!on;
      group.visible = shown && state.ready;
    },
    setBuild,
    setClock,
    carAt,
    /* The map and its laps, for the film's own arithmetic, once they are
     * in: null until the build's first step. */
    get doc() {
      return DOC;
    },
    get laps() {
      return CARS;
    },
    /* The order the builder places things in, for the instrument. */
    order,
    /* The ground as built, a world box, null until the build lands. */
    groundBox: () => state.ground || null,
    /* The line flown, null until the build lands: its clocks (lift, join,
     * end) and the aircraft at a clock. See makeFlight. */
    get flight() {
      return flight;
    },
    clearance,
    /* Where the craft sits before it flies, null until the build lands. */
    get spawn() {
      return spawn;
    },
    /* The tandem, lead and chase, by element. */
    get tandem() {
      return TANDEM;
    },
    /* The plot's middle, in the race field's frame. */
    heart: YARD_ORIGIN,
  };
}

/* ------------------------------------------------------ the line flown */

/*
 * THE LINE FLOWN THROUGH IT, and it is two lines joined.
 *
 * THE APPROACH is a place: off the pads, which face north east across the
 * skate corner, round the near side of the sakura, and north up the gap
 * between the half built office and the bando, three metres up, under the
 * trees' canopies and nine metres clear of the office's face. Then a hard
 * right onto the course behind the two cars as they come out of the south
 * west corner. It is in the plan's own metres, so it moves if the map does.
 *
 * THE CHASE is a place relative to the chase car, keyed to how far round
 * the course that car has driven: how far behind it, how far to its side
 * (left positive, the side of its way of going) and how high, and where
 * between the two cars to look. The keys are where a drift chase is shot
 * from. Behind and low on a straight; out wide on the outside of a corner,
 * where both cars are side on and the smoke is between them and the lens;
 * across from one side to the other through the transition, where the cars
 * flick; alongside the chase car's door up the east straight, looking past
 * it at the lead; low and centred under the overpass; and outside the north
 * west corner with the container wall behind the cars. Distances round the
 * course count on past a lap, so the keys read as one run.
 */
const APPROACH = [
  /* plan x, plan y, height over the plot, m */
  [44.6, 56.6, 0.3],
  [45.8, 58.2, 1.4],
  [50.5, 62.5, 2.4],
  [56.8, 71.0, 2.6],
  [57.2, 92.0, 2.6],
  [57.0, 124.0, 2.8],
  [56.0, 150.0, 2.9],
  [53.5, 166.0, 2.8],
];
/* How long the approach takes, ms of the module's clock. */
const APPROACH_MS = 9000;

const CHASE = [
  /* how far round the chase car is, m; behind, side, up, m; look, 0 at the
   * chase car and 1 at the lead */
  [178, 8.0, -2.5, 3.4, 0.55],
  [192, 7.5, -3.4, 3.0, 0.6],
  [224, 7.0, 3.8, 2.9, 0.6],
  [256, 7.5, -3.4, 3.0, 0.6],
  [276, 8.0, -4.2, 3.0, 0.55],
  [292, 8.5, -5.0, 3.1, 0.5],
  [312, 2.8, 3.8, 1.8, 0.85],
  [326, 5.0, 1.5, 2.4, 0.7],
  [342, 8.0, -4.5, 3.1, 0.5],
  [366, 7.0, 0.0, 2.5, 0.6],
  [388.6, 6.0, 0.0, 2.0, 0.6],
  [418, 7.0, -3.6, 3.0, 0.55],
  [440, 8.0, -4.0, 3.3, 0.5],
  [465, 10.0, -1.0, 4.8, 0.5],
];

/* A key's values at s, a cubic through the keys with each one's slope taken
 * from its neighbours (Catmull-Rom on uneven spacing), flat past either
 * end. */
function keyed(keys, s, col) {
  const n = keys.length;
  if (s <= keys[0][0]) {
    return keys[0][col];
  }
  if (s >= keys[n - 1][0]) {
    return keys[n - 1][col];
  }
  let i = 0;
  while (keys[i + 1][0] < s) {
    i += 1;
  }
  const s0 = keys[i][0];
  const s1 = keys[i + 1][0];
  const h = s1 - s0;
  const t = (s - s0) / h;
  const slope = (k) => {
    if (k <= 0 || k >= n - 1) {
      return 0;
    }
    return (keys[k + 1][col] - keys[k - 1][col]) / (keys[k + 1][0] - keys[k - 1][0]);
  };
  const p0 = keys[i][col];
  const p1 = keys[i + 1][col];
  const m0 = slope(i) * h;
  const m1 = slope(i + 1) * h;
  const t2 = t * t;
  const t3 = t2 * t;
  return (2 * t3 - 3 * t2 + 1) * p0 + (t3 - 2 * t2 + t) * m0 + (-2 * t3 + 3 * t2) * p1 + (t3 - t2) * m1;
}

/*
 * The flight, once the map is in: the clocks it turns on, and where the
 * aircraft is at a clock. See buildYard's `flight`.
 */
function makeFlight(carAt, spawn) {
  const chase = TANDEM.chase;
  const lead = TANDEM.lead;
  const lap = CARS.find((c) => c.element === chase);
  const scratch = {};
  /* The clock at which the chase car has driven to s, by halving. */
  const clockAt = (s) => {
    let lo = 0;
    let hi = 1000;
    const dist = (ms) => {
      lapPose(lap, ms, SCRATCH);
      return SCRATCH.distance;
    };
    while (dist(hi) < s) {
      lo = hi;
      hi *= 2;
    }
    for (let k = 0; k < 40; k += 1) {
      const mid = (lo + hi) / 2;
      if (dist(mid) < s) {
        lo = mid;
      } else {
        hi = mid;
      }
    }
    return hi;
  };
  const join = clockAt(CHASE[0][0]);
  const end = clockAt(CHASE[CHASE.length - 1][0]);
  const lift = join - APPROACH_MS;

  const car = {};
  const other = {};
  const tmp = new THREE.Vector3();
  /* The chase: where the aircraft is and what it looks at, at clock ms. */
  function chaseAt(ms, pos, look) {
    carAt(chase, ms, car);
    carAt(lead, ms, other);
    lapPose(lap, ms, SCRATCH);
    const s = SCRATCH.distance;
    const back = keyed(CHASE, s, 1);
    const side = keyed(CHASE, s, 2);
    const up = keyed(CHASE, s, 3);
    const k = keyed(CHASE, s, 4);
    /* The way the chase car is going, and its left on the ground, which a
     * quarter turn about y takes the way to: (tz, -tx). */
    const tx = Math.cos(car.travel);
    const tz = -Math.sin(car.travel);
    pos.set(car.pos.x - tx * back + tz * side, up, car.pos.z - tz * back - tx * side);
    look.copy(car.pos).lerp(other.pos, k);
    look.y = 0.8;
    return s;
  }

  /* The approach, in the race field's frame, from the pad the simulator
   * seats the craft on, ending where the chase starts and pointed the way
   * it goes. */
  const pts = APPROACH.map(([x, y, h]) => planToWorld(x, y, h, new THREE.Vector3()));
  pts[0].set(spawn.x, pts[0].y, spawn.z);
  const j0 = new THREE.Vector3();
  const j1 = new THREE.Vector3();
  chaseAt(join, j0, tmp);
  chaseAt(join + 250, j1, tmp);
  const curve = new THREE.CatmullRomCurve3([...pts, j0.clone(), j1.clone()], false, 'centripetal');
  /* How far along the curve the join is, as a share of the whole. */
  const lengths = curve.getLengths(400);
  const total = lengths[lengths.length - 1];
  const joinLen = (() => {
    let best = 0;
    let bestD = Infinity;
    for (let i = 0; i <= 400; i += 1) {
      curve.getPointAt(i / 400, tmp);
      const d = tmp.distanceTo(j0);
      if (d < bestD) {
        bestD = d;
        best = i / 400;
      }
    }
    return best * total;
  })();
  /* The speed the chase starts at, so the approach arrives with it. */
  const vJoin = j0.distanceTo(j1) / 0.25;
  const m1 = Math.min(2.6, (vJoin * APPROACH_MS * 0.001) / joinLen);

  return {
    lift,
    join,
    end,
    /* The aircraft at clock ms: its position and the point it is looking
     * at, into `out`, and which part of the flight it is in. */
    at(ms, out) {
      out.pos = out.pos || new THREE.Vector3();
      out.look = out.look || new THREE.Vector3();
      if (ms >= join) {
        out.s = chaseAt(ms, out.pos, out.look);
        out.phase = 'chase';
        return out;
      }
      const x = Math.max(0, (ms - lift) / APPROACH_MS);
      /* From rest, arriving at the chase's speed: a cubic whose slope is
       * nothing at the pads and the chase's at the join. */
      const g = x >= 1 ? 1 : (-2 * x * x * x + 3 * x * x) + m1 * (x * x * x - x * x);
      const u = Math.min(1, (g * joinLen) / total);
      curve.getPointAt(u, out.pos);
      /* Looking down the line it flies, and at the tandem as it closes. */
      curve.getPointAt(Math.min(1, u + 10 / total), tmp);
      chaseAt(Math.max(ms, lift), scratch.p || (scratch.p = new THREE.Vector3()), out.look);
      const w = ease01((x - 0.55) / 0.4);
      out.look.lerp(tmp.setY(Math.max(1.2, tmp.y)), 1 - w);
      out.phase = x <= 0 ? 'pads' : 'approach';
      out.s = 0;
      return out;
    },
    /* The line, for a clearance check. */
    curve,
  };
}

const SCRATCH = {};

function ease01(v) {
  const t = v < 0 ? 0 : (v > 1 ? 1 : v);
  return t * t * (3 - 2 * t);
}

/*
 * A ROAD LAID ALONG ITS LENGTH. roadmesh.js draws a road as three layers,
 * each a strip the length of the road, or two (the kerbs and the edge
 * lines) with the centre dashes after them, and every strip in the order the
 * road runs. So the first k segments of every strip are the first k metres
 * of road, and a draw range per strip lays it: `set(f)` shows the first f of
 * the road's length. Returns { set, length }.
 */
function roadReveal(roadGroup, d) {
  const line = d.line;
  const n = line.points.length;
  const segs = line.closed ? n : n - 1;
  const perStrip = segs * 6;
  const L = line.length;
  const layers = [];
  /* How many whole length strips each layer starts with, by the name
   * roadmesh.js gives it: the asphalt one, the kerbs and the edge lines
   * two. */
  const STRIPS = { roadAsphalt: 1, roadKerb: 2, roadPaint: 2 };
  for (const mesh of roadGroup.children) {
    const g = mesh.geometry;
    const count = g.index.count;
    const whole = Math.min(STRIPS[mesh.name] ?? 1, Math.floor(count / perStrip));
    g.clearGroups();
    for (let s = 0; s < whole; s += 1) {
      g.addGroup(s * perStrip, perStrip, 0);
    }
    /* Whatever follows the whole length strips (a two lane road's dashes)
     * comes in as one when the road is done. */
    const rest = count - whole * perStrip;
    if (rest > 0) {
      g.addGroup(whole * perStrip, rest, 0);
    }
    if (!Array.isArray(mesh.material)) {
      mesh.material = [mesh.material];
    }
    layers.push({ g, whole, rest });
  }
  let last = -1;
  return {
    length: L,
    /* The plan point at the head of the road laid to f. */
    head(f, out) {
      const k = Math.min(n - 1, f <= 0 ? 0 : (f >= 1 ? n - 1 : segsAt(line, f * L)));
      out.x = line.points[k].x;
      out.y = line.points[k].y;
      return out;
    },
    set(f) {
      const k = f <= 0 ? 0 : (f >= 1 ? segs : segsAt(line, f * L));
      if (k === last) {
        return;
      }
      last = k;
      roadGroup.visible = k > 0;
      for (const { g, whole, rest } of layers) {
        for (let s = 0; s < whole; s += 1) {
          g.groups[s].count = k * 6;
        }
        if (rest > 0) {
          g.groups[whole].count = k >= segs ? rest : 0;
        }
      }
    },
  };
}

/* How many of a line's segments end within arc length s. */
function segsAt(line, s) {
  let k = 0;
  const n = line.points.length;
  while (k + 1 < n && line.s[k + 1] <= s) {
    k += 1;
  }
  return k;
}

/* A setting down: over and back once, and still. */
function popOf(k) {
  const c1 = 1.9;
  const c3 = c1 + 1;
  const x = k - 1;
  return 1 + c3 * x * x * x + c1 * x * x;
}

function clamp01(v) {
  return v < 0 ? 0 : (v > 1 ? 1 : v);
}
