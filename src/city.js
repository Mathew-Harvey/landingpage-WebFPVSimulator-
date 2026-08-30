/*
 * city.js: the freestyle city, which is the simulator's own town rather than
 * a drawing of one.
 *
 * WHAT THIS FILE IS. It is a join, not a model. The geometry under
 * ./city/vendored is sakura-crossing, MIT, Kenton Wang, copied from the
 * simulator's src/maps/city/vendored where it is the copy of record. The town
 * a visitor flies here is byte for byte the town they will fly when they
 * click through, because it is the same source building it. Nothing about
 * the district is authored in this repository.
 *
 * There WAS a hand built portrait here, about nine hundred boxes in this
 * page's own idiom with the proportions copied from the town's source. It
 * looked good and it was the wrong thing: a front door that advertises a
 * place should show the place. This file replaced it.
 *
 * WHAT IS OURS, AND IT IS ONLY THREE THINGS:
 *
 *   1. WHERE THE TOWN STANDS in the race field's coordinates, and the fact
 *      that it stands there at all.
 *   2. WHICH PARTS OF IT ARE BUILT. The town is a whole district, and the
 *      act flies one street of it. See PRUNE below: what the camera cannot
 *      reach is dropped before it is ever drawn.
 *   3. THE LINE FLOWN THROUGH IT. See flightLine.
 *
 * WHAT IT COSTS, MEASURED, because a landing page cannot take this on faith.
 * The town builds about eleven and a half thousand meshes and paints every
 * sign, fascia and price strip with Canvas2D as it goes. Pruned to the
 * corridor the act flies and then put through the simulator's own merge
 * passes it comes out at about a thousand meshes and half a million
 * triangles, which is the same order as the aircraft and the race field
 * already cost. What it also costs is the build itself, which is seconds
 * rather than milliseconds and is why it does not happen at import. See
 * buildCity.
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
import { buildWorld } from './city/vendored/world/index.js';
import { centerX, groundY } from './city/vendored/world/street.js';
import { bakeCity, thinFoliage, chunkInstanced } from './city/bake.js';
import { LITE } from './quality.js';

/* The town's own street functions, re-exported so the flight line and
 * anything else that needs to know where the road is asks the town rather
 * than a copy of it. */
export { centerX, groundY };

/*
 * Where the town stands, in the race field's own coordinates.
 *
 * NORTH OF THE FIELD, AND CLOSE. It was at 138 m, chosen so the field's own
 * treeline had room to stand between the two. That treeline is thinner now
 * and has a gap cut in it facing this way, which frees the ground, and 138 m
 * bought a transit rather than a transition: forty seconds of scroll spent
 * over a wood, at two and a half times the pace of everything either side of
 * it, because there was nothing out there to look at.
 *
 * At 96 m the aircraft leaves the last gate, climbs, and the town is already
 * arriving. The whole crossing is about forty metres of line instead of a
 * hundred and forty, which is a beat rather than a leg, and it is the beat
 * the act actually wanted: the moment the field runs out.
 *
 * IT IS ON THE SIDE THE CLOSING SHOT ALREADY LOOKED AT. The close orbits
 * from the south east looking roughly north, so putting the town there makes
 * the closing frame a wider version of a shot the page was already composing
 * rather than a new one bolted on.
 *
 * The town is authored around its level crossing at its own origin, with the
 * road running along z and north at -z, so it drops in with a translation and
 * no rotation. That is not luck, it is why this offset is a pure translation:
 * a rotated town would put every one of the town's own functions, centerX and
 * groundY included, in a frame that does not match the world.
 */
export const CITY_ORIGIN = new THREE.Vector3(0, 0, -96);

/*
 * HOW MUCH OF THE TOWN IS BUILT.
 *
 * The town is a whole district: a school, an onsen, a lake and its road, a
 * tunnel, a canal, a library, a shrine on a hill, and eight numbered chome
 * blocks either side of the street. The act flies ONE STREET of it, from the
 * south end to the crossing and out the north, and the closing shot frames
 * that street from a hundred and fifty metres up and out.
 *
 * So everything whose bounding box centre lies outside this box is removed
 * before the merge passes run. Measured: it drops 1,266 of the town's top
 * level children, 4,306 meshes and 799,000 triangles, and it drops nothing
 * the camera can reach.
 *
 * THE BOX IS GENEROUS ON PURPOSE and it is not the flight corridor. The
 * closing shot sees a long way, so what is kept is everything the CLOSE can
 * see, which is a good deal more than the line touches. Tightening it to the
 * street saves a little more and puts a hard edge across the last frame of
 * the page, which is exactly the thing the closing shot was tuned to avoid.
 */
const KEEP = {
  x: [-190, 190],
  z: [-215, 175],
};

/*
 * How far the built town reaches, for the closing shot's cap.
 *
 * BUILT_R is where the street's own frontage stops and TREE_R is where the
 * kept district stops. main.js does the trigonometry against them: the brief
 * on the close was that the colour must not run out of the city, so the pull
 * back is bounded by the haze at BUILT_R and by the frame at TREE_R rather
 * than by a number somebody liked.
 */
export const BUILT_R = 60;
export const TREE_R = 190;
export const ROAD_HALF = 3.15;

/* ------------------------------------------------------------- the foliage */

/*
 * THINNING THE TOWN'S PLANTING, AND WHY IT IS NOT ONE LINE.
 *
 * The town is planted for a walker at ground level, where a dense canopy is
 * depth. Seen from a quad at twenty metres it is a duvet: the district reads
 * as blossom with some roofs in it, and the roofs are the thing the act is
 * about. So the planting comes down hard.
 *
 * `thinFoliage` in bake.js does not do this. Its FOLIAGE list is hill tufts,
 * moss, rocks and lake reeds, and it never touches a tree, so the keep
 * fraction that was being passed to it was doing nothing at all.
 *
 * THE HARD PART IS THAT A TREE IS TWO OBJECTS. Every species builds its
 * trunks and branches as ONE merged mesh for the whole town, and its canopy
 * as instanced blobs or cones. Dropping canopy instances is easy and gives
 * you a wood full of bare sticks; dropping the wood gives you blossom
 * floating in the air. Neither is a thinner town, they are both a broken one.
 *
 * So this drops whole trees. Canopy instances are bucketed into cells, each
 * cell gets one keep-or-drop decision from a hash of its own coordinates, and
 * then the WOOD is filtered against the same decisions: every triangle in the
 * merged trunk mesh is looked up by its own position and collapsed to a point
 * if the tree it belongs to has gone. A collapsed triangle has no area and
 * draws nothing, which is how you delete part of a merged mesh without
 * rebuilding it.
 *
 * The cell is deliberately coarse. Trees in this town stand five to eight
 * metres apart and a canopy blob sits up to three metres off its own trunk,
 * so a cell has to be big enough that a tree's blobs and its trunk land in
 * the same one. At four metres neighbouring trees sometimes share a decision,
 * which costs granularity and buys the thing actually working.
 *
 * Deterministic, because it hashes position rather than calling random: the
 * same town thins to the same town on every load, so a screenshot taken to
 * argue about a composition is an argument about a town that still exists.
 */
const CELL = 4;

function cellKey(x, z) {
  return `${Math.round(x / CELL)},${Math.round(z / CELL)}`;
}

/* FNV-1a over the cell's own name, to 0..1. */
function hash01(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i += 1) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 4294967295;
}

function thinTrees(root, plan) {
  const m = new THREE.Matrix4();
  const v = new THREE.Vector3();
  const colour = new THREE.Color();
  const out = {};

  for (const spec of plan) {
    if (spec.keep >= 1) {
      continue;
    }
    const canopies = [];
    const woods = [];
    root.traverse((o) => {
      if (!o.isMesh) {
        return;
      }
      if (o.isInstancedMesh && spec.canopy.test(o.name || '')) {
        canopies.push(o);
      } else if (spec.wood.test(o.name || '')) {
        woods.push(o);
      }
    });

    /* One decision per cell, taken the first time a canopy blob lands in it. */
    const decide = new Map();
    let before = 0;
    let after = 0;
    for (const c of canopies) {
      before += c.count;
      let k = 0;
      for (let i = 0; i < c.count; i += 1) {
        c.getMatrixAt(i, m);
        v.setFromMatrixPosition(m);
        const key = cellKey(v.x, v.z);
        let live = decide.get(key);
        if (live === undefined) {
          live = hash01(key) < spec.keep;
          decide.set(key, live);
        }
        if (!live) {
          continue;
        }
        if (k !== i) {
          c.setMatrixAt(k, m);
          if (c.instanceColor) {
            c.getColorAt(i, colour);
            c.setColorAt(k, colour);
          }
        }
        k += 1;
      }
      /* Never to nothing: a set thinned to zero is a grove that vanished, and
       * three.js draws an InstancedMesh with count 0 as nothing at all, which
       * is fine, but a species that disappears entirely is a bug that looks
       * like a decision. */
      c.count = k;
      after += k;
      c.instanceMatrix.needsUpdate = true;
      if (c.instanceColor) {
        c.instanceColor.needsUpdate = true;
      }
      c.computeBoundingSphere();
    }

    /* Now the trunks, against the same decisions. */
    let collapsed = 0;
    let kept = 0;
    for (const wood of woods) {
      const geo = wood.geometry;
      const pos = geo.getAttribute('position');
      const index = geo.getIndex();
      if (!pos) {
        continue;
      }
      const tri = index ? index.count / 3 : pos.count / 3;
      for (let t = 0; t < tri; t += 1) {
        const a = index ? index.getX(t * 3) : t * 3;
        const b = index ? index.getX(t * 3 + 1) : t * 3 + 1;
        const c2 = index ? index.getX(t * 3 + 2) : t * 3 + 2;
        const cx = (pos.getX(a) + pos.getX(b) + pos.getX(c2)) / 3;
        const cz = (pos.getZ(a) + pos.getZ(b) + pos.getZ(c2)) / 3;
        const live = decide.get(cellKey(cx, cz));
        /* Unknown cells are KEPT. A trunk whose canopy never registered a
         * decision is a tree this pass does not understand, and leaving it
         * standing is the safe way to be wrong. */
        if (live === false) {
          /* Collapse to the first vertex: zero area, nothing rasterised, and
           * no need to touch the index buffer or the attribute counts. */
          const x = pos.getX(a);
          const y = pos.getY(a);
          const z = pos.getZ(a);
          pos.setXYZ(b, x, y, z);
          pos.setXYZ(c2, x, y, z);
          collapsed += 1;
        } else {
          kept += 1;
        }
      }
      pos.needsUpdate = true;
      geo.computeBoundingSphere();
    }
    out[spec.name] = {
      canopies: canopies.length, before, after, collapsed, kept,
    };
  }
  return out;
}

/* --------------------------------------------------------------- the build */

/*
 * THE TOWN IS NOT BUILT AT IMPORT, and that is the one piece of machinery in
 * this file that is worth the words.
 *
 * buildWorld is synchronous and it is seconds, not milliseconds: about
 * eleven and a half thousand meshes, every sign and fascia painted with
 * Canvas2D as it goes, and then the merge passes on top. Called at module
 * scope it would run before the page's first frame, which means a visitor
 * looks at a boot screen for the whole of it and the hero act, the thing the
 * page opens on, starts late.
 *
 * So it is deferred: the page draws its studio, the drone starts assembling,
 * and only then does the town get built, in an idle slot. The visitor has
 * three hundred vh of build act, three hundred of track and six hundred and
 * forty of lap to scroll through before act four needs it, which at any
 * plausible reading speed is tens of seconds.
 *
 * It still BLOCKS when it runs, because buildWorld cannot be sliced without
 * forking it, and forking the town's own entry point is exactly the thing
 * this file exists not to do. What it can do is run at a moment when nothing
 * is moving that a stall would ruin: requestIdleCallback puts it after the
 * first paint, and the studio act is an autoplay rather than a scroll, so it
 * survives a dropped frame better than any other part of the film.
 *
 * `onReady` fires when it is done. Until then the group is empty and
 * setShown does nothing, which is the correct behaviour for a page somebody
 * has scrolled through faster than the town could arrive: they get the field,
 * the lap and the close, and no error.
 */
export function buildCity({ onReady = null } = {}) {
  const group = new THREE.Group();
  group.name = 'city';
  group.position.copy(CITY_ORIGIN);
  group.visible = false;

  const state = {
    ready: false,
    world: null,
    /* The rectangle the race field's deck has to stop at. Null until built. */
    ground: null,
    /* What it actually cost, for the debug handle. A number in a comment is
     * a claim; a number the page measured is evidence. */
    stats: null,
  };

  let shown = false;

  function make() {
    const t0 = performance.now();
    /*
     * `bake: false` is the town's own flag and it means "do not bend this
     * onto the planet". The simulator declines the bake for two reasons that
     * both apply here: the flat authoring drops into a y up scene with no
     * transform, and the bake gives every mesh a bounding sphere the size of
     * the planet, which disables frustum culling for the whole world.
     */
    const world = buildWorld(group, { bake: false });
    const tBuilt = performance.now();

    /* Drop what the camera cannot reach, before the merge passes look at it. */
    const box = new THREE.Box3();
    let pruned = 0;
    for (const child of [...world.root.children]) {
      box.setFromObject(child);
      if (box.isEmpty()) {
        continue;
      }
      const cx = (box.min.x + box.max.x) * 0.5;
      const cz = (box.min.z + box.max.z) * 0.5;
      if (cx < KEEP.x[0] || cx > KEEP.x[1] || cz < KEEP.z[0] || cz > KEEP.z[1]) {
        world.root.remove(child);
        /*
         * DISPOSED, not just detached, and it matters more than it looks.
         *
         * Removing a child drops the reference and leaves several thousand
         * geometries and their buffers for the collector to find later.
         * Later turned out to be about three seconds after the boot screen
         * lifted, as a major collection in the middle of the track act:
         * measured as a four second frame on a page that had just promised
         * to be smooth. Freeing them here spends the same work inside the
         * loading screen, where there is nothing to interrupt.
         *
         * Materials are NOT disposed. The town caches and shares them across
         * the whole district, so a material on a pruned child is almost
         * always still in use by one that was kept, and disposing it would
         * take the texture with it.
         */
        child.traverse((o) => {
          if (o.geometry) {
            o.geometry.dispose();
          }
        });
        pruned += 1;
      }
    }

    /*
     * THE GROUND IS MEASURED BEFORE THE MERGE TOO, and for the same reason
     * the planting is thinned before it: bakeCity merges by material across
     * the whole town, so afterwards there is no mesh called hillSun or
     * lakeBed to find. Measured after it, this box was the union of whatever
     * happened to keep a matching name through the merge, which came out
     * three hundred metres adrift on one axis and was quietly cutting the
     * deck away from the wrong rectangle.
     */
    /*
     * WHERE THE TOWN'S OWN GROUND REACHES, measured off the geometry that was
     * just built rather than written down.
     *
     * The race field's deck has to be cut out from under it or the two are
     * coplanar at y = 0 across three hundred metres and z-fight. What the
     * cut needs is the extent of the town's GROUND, not of the town: a
     * utility pole nine metres up does not put ground under itself, and a
     * rectangle drawn round every mesh in the district would cut the deck
     * away from under thin air.
     *
     * So it is the union of the things that ARE ground, found by name off
     * the town's own builders: its landform and hills, its lake bed, its
     * school ground and its paved surfaces. Then inset, so the town's ground
     * overhangs the hole on every side and the cut edge is never visible.
     */
    const groundBox = new THREE.Box3();
    const rawGround = new THREE.Box3();
    const one = new THREE.Box3();
    world.root.traverse((o) => {
      if (!o.isMesh) {
        return;
      }
      const name = `${o.name || ''}|${(o.parent && o.parent.name) || ''}`;
      if (!/ground|land|terrain|hill|turf|grass|lake|road|street|pad/i.test(name)) {
        return;
      }
      one.setFromObject(o);
      if (!one.isEmpty()) {
        groundBox.union(one);
      }
    });
    rawGround.copy(groundBox);
    if (!groundBox.isEmpty()) {
      const INSET = 9;
      groundBox.min.x += INSET;
      groundBox.max.x -= INSET;
      groundBox.min.z += INSET;
      groundBox.max.z -= INSET;
      /* Into the race field's frame, which is where the deck lives. */
      groundBox.min.add(CITY_ORIGIN);
      groundBox.max.add(CITY_ORIGIN);
    }


    /*
     * THE PLANTING IS THINNED BEFORE THE MERGE, and the order is not a
     * preference.
     *
     * bakeCity merges by material across the whole town, so after it runs
     * there is no mesh called sakuraWood any more: its triangles are inside a
     * combined buffer with a different name and a different frame. Run
     * afterwards, thinTrees found the canopies (bakeCity leaves instanced
     * meshes alone) and none of the trunks, and what that looked like was a
     * hillside of bare sticks with the blossom gone off them. Thinning first
     * means the wood is still the wood.
     */
    /*
     * THE PLANTING, and these four numbers are the whole look of the act.
     *
     * The town is planted for somebody walking through it. From a quad it is
     * a duvet: at full density the district reads as blossom and conifer with
     * a few roofs showing, and the roofs are what the act is about.
     *
     * Blossom comes down hardest. It is the loudest thing in the palette, it
     * is the only pink, and there is a second blossom system on top of it
     * (the town's falling petals, and this page's own) so the frame gets its
     * cherry from the air as well as from the trees. A tenth of the trees
     * still reads as a town with cherry in it.
     *
     * The dark conifer is the other one: at full density the cedar and the
     * grove close the district in from every side and the closing shot is a
     * forest with a village in it. A third of them keeps the hillside wooded
     * without burying the town.
     *
     * Bamboo and shrub are left alone. There is little of either, neither is
     * ever the subject, and both are what a plot boundary looks like.
     */
    const thinned = thinTrees(world.root, [
      { name: 'sakura', canopy: /^sakuraCanopy/, wood: /^sakuraWood/, keep: LITE ? 0.08 : 0.10 },
      { name: 'cedar', canopy: /^cedarCanopy/, wood: /^cedarWood/, keep: LITE ? 0.22 : 0.30 },
      { name: 'grove', canopy: /^groveCanopy/, wood: /^groveWood/, keep: LITE ? 0.26 : 0.34 },
    ]);

    /*
     * The petals, which are two more instanced sets and are most of the pink
     * in any frame the aircraft is actually in. This page has its own petal
     * system drifting past the lens already, so the town's is turned right
     * down rather than off: what is wanted is a few coming off the trees, not
     * a snowstorm.
     */
    let petalsBefore = 0;
    let petalsAfter = 0;
    world.root.traverse((o) => {
      if (!o.isInstancedMesh) {
        return;
      }
      if (o.name === 'petalField' || o.name === 'fallenPetal') {
        petalsBefore += o.count;
        o.count = Math.max(1, Math.round(o.count * (LITE ? 0.06 : 0.10)));
        petalsAfter += o.count;
        o.instanceMatrix.needsUpdate = true;
        o.computeBoundingSphere();
      }
    });


    /*
     * The simulator's own merge passes, with its own numbers.
     *
     * cell: Infinity merges each material across the whole town rather than
     * per cell, which is what the simulator does when it is not paying for a
     * shadow pass over the result. Casters are switched off outright here:
     * the page's one shadow is the aircraft's own and it is aimed at the
     * aircraft, so a town that casts would be paying for a second pass over
     * a thousand meshes to draw a shadow nobody is looking at.
     */
    bakeCity(world, {
      cell: Infinity,
      shadowCell: 80,
      cullCell: 40,
      casterMinRadius: 1e9,
      casterMinRadiusInstanced: 1e9,
      releaseStillRigs: true,
      shadowProxyCell: 0,
    });
    /* The town's own knob, which only reaches its hill tufts, moss, rocks and
     * lake reeds. Cheap, and worth having, but it is not the planting. */
    thinFoliage(world.root, { keep: LITE ? 0.35 : 0.55 });

    chunkInstanced(world.root, { cell: 40 });

    let meshes = 0;
    let tris = 0;
    world.root.traverse((o) => {
      if (!o.isMesh) {
        return;
      }
      meshes += 1;
      const g = o.geometry;
      const idx = g && g.index;
      const n = idx ? idx.count : (g && g.getAttribute('position') ? g.getAttribute('position').count : 0);
      tris += (n / 3) * (o.isInstancedMesh ? o.count : 1);
      /* Nothing in the town casts. See the bake options above. */
      o.castShadow = false;
      o.receiveShadow = false;
    });

    state.world = world;
    state.ready = true;
    state.ground = groundBox.isEmpty() ? null : groundBox;
    state.stats = {
      pruned,
      thinned,
      petals: { before: petalsBefore, after: petalsAfter },
      ground: groundBox.isEmpty() ? null : {
        world: {
          min: groundBox.min.toArray().map((v) => Math.round(v)),
          max: groundBox.max.toArray().map((v) => Math.round(v)),
        },
        local: {
          min: rawGround.min.toArray().map((v) => Math.round(v)),
          max: rawGround.max.toArray().map((v) => Math.round(v)),
        },
      },
      meshes,
      triangles: Math.round(tris),
      buildMs: Math.round(tBuilt - t0),
      bakeMs: Math.round(performance.now() - tBuilt),
    };
    group.visible = shown;
    if (onReady) {
      onReady(state.stats);
    }
  }

  /*
   * WHEN IT RUNS IS THE CALLER'S DECISION NOW, and that is the whole fix for
   * the hitch.
   *
   * It used to start itself on an idle callback a second after load, which
   * put a two to four second block of synchronous work into a page that was
   * already up and being scrolled. There is no polite way to spend that:
   * requestIdleCallback gets you a slot, and then buildWorld holds it for as
   * long as it takes. What the visitor saw was the page freezing a moment
   * after it arrived.
   *
   * So the page decides instead, and it decides to do it while the boot
   * screen is still up. A loading screen is the one place on a page where
   * seconds of work are honest and expected. See start() below and its one
   * caller in main.js.
   */
  let started = false;
  function start() {
    if (started) {
      return;
    }
    started = true;
    make();
  }

  return {
    group,
    /* Build it. Synchronous, seconds long, and safe to call twice. */
    start,
    get ready() {
      return state.ready;
    },
    get stats() {
      return state.stats;
    },
    /*
     * The town's own moving parts: the train, the crossing sequence that
     * lowers the barriers for it, and the blossom coming off the trees.
     *
     * This is the one thing on the page that is driven by elapsed time rather
     * than by scroll position, and it is a deliberate exception rather than
     * an oversight. Everything else here is a pure function of T because the
     * page has to be scrubbable: drag the bar anywhere and the frame you get
     * is the frame that belongs there. A LEVEL CROSSING IS NOT LIKE THAT. Its
     * barriers come down, a train passes, they go up, and the whole point of
     * it is that it is a thing happening in the town rather than a thing the
     * reader is doing. Bound to scroll it would run backwards when somebody
     * scrolled up, which is not a crossing, it is a video being scrubbed.
     *
     * It is also already the page's own precedent: the props spin on a clock,
     * the petals drift on one, and the gate ahead pulses on one.
     */
    update(dt) {
      if (state.ready && shown) {
        state.world.update(Math.min(0.05, dt));
      }
    },
    /*
     * Shown from the moment there is daylight to see it in, which is a
     * composition decision rather than a saving: during the lap there is a
     * town on the northern horizon, over the treeline, so the flight act is
     * not followed by a new place, it is followed by THAT place.
     */
    setShown(on) {
      shown = !!on;
      group.visible = shown && state.ready;
    },
    /* The town's own world object, for the clearance check in main.js. Null
     * until the build lands. */
    world: () => state.world,
    /* The rectangle the deck must not draw inside, in the race field's own
     * coordinates. Null until the build lands. */
    groundBox: () => state.ground,
    origin: CITY_ORIGIN,
    /*
     * The town's own centre in world space, which is what a camera looking AT
     * the district should aim at. It is not the crossing: the street runs
     * further north than south of it, so the crossing is off centre and a
     * shot framed on it puts the town in the bottom of the frame.
     */
    heart: new THREE.Vector3(CITY_ORIGIN.x + 4, CITY_ORIGIN.y + 4, CITY_ORIGIN.z - 8),
  };
}

/* --------------------------------------------------------- the flight line */

/*
 * THE LINE, and it is three lines rather than one.
 *
 * The brief was "a few tasteful lines", and a freestyle line is not a lap: a
 * lap is a problem to be solved and a freestyle line is a place to be shown.
 * So the three are chosen for what each one shows, and they are flown in the
 * order a pilot arriving from the south would actually take them.
 *
 *   1. THE STREET. Down onto the carriageway at the south end of the
 *      district and north up it at three and a bit metres. The simulator's
 *      own title camera flies this stretch and its note says why: the
 *      carriageway is empty by construction, and everything at street level
 *      that is not empty stands off it. It is nine metres wide between the
 *      shopfronts and roofed by cable, which makes it a corridor, and a
 *      corridor is the one thing a race field cannot offer.
 *
 *   2. THE CROSSING. Up to 6.9 m over the barriers and down again. That
 *      number is railway.js's and so is the argument for it: a train roof is
 *      at 3.96 m, the contact wire at 4.88 and the messenger at 5.95, so
 *      between the road and the wires there is NO height that clears a
 *      train. 6.9 clears the lot with most of a metre in hand, and the
 *      street's own poles stop short of the tracks so nothing is strung
 *      across the gap the aircraft rises through.
 *
 *   3. THE CLIMB OUT, on the last stretch of road, which is also the
 *      simulator's own decision and made for the same reason: the ground at
 *      the end of the street is trees, and there is no height out there
 *      between the tarmac and the treetops. So the climb happens over the
 *      carriageway, where nothing is, and the aircraft is already over the
 *      roofs by the time it turns.
 *
 * WHAT WAS TRIED AND TAKEN OUT. The first version dropped into the
 * shotengai from above, flew the six metre corridor, and cut west through
 * the alley onto the main road. The corridor pass was the best shot in the
 * act and the alley ruined it: a ninety degree turn in a six metre gap is a
 * forty five degree bank, and a forty five degree bank inside a corridor
 * points a 104 degree lens straight up a shopfront. The screenshots are a
 * photograph of a wall. The transfer needed about fifteen metres it did not
 * have, and the only ways to buy them were to widen a street the town says
 * is six metres or to spend a third of the act's scroll getting out of it.
 *
 * The shotengai is still there, and it is the town's own. It is flown OVER
 * on the way out and it is in the closing shot. The main street turned out
 * to be the better corridor anyway: it is longer, it has the crossing at the
 * end of it, and its shopfronts stand nine metres apart rather than six,
 * which is the difference between a corridor and a slot.
 *
 * EVERY HEIGHT HERE IS CHECKED AGAINST THE TOWN'S OWN GROUND, not against a
 * copy of it: `centerX` and `groundY` are imported from the town's street.js
 * at the top of this file. The line cannot drift away from the road, because
 * the road is what it is built from.
 *
 * `entry` is where the quad leaves the race field and `exitDir` is the way
 * it was pointing when it got there. The transit between the two places is
 * part of THIS curve rather than a separate one, because a join between two
 * curves is a corner however carefully it is blended, and the whole point of
 * the arrival is that it is one move.
 *
 * exitDir is why the first two points look redundant. The lap's last gate
 * faces across the field and the town is most of a right angle off that, so
 * a curve that set off toward the town from the gate would spin the aircraft
 * on the spot at the exact frame the acts change over. Instead it carries on
 * the way it was going for seventeen metres, climbing, and then banks. Which
 * is what a quad leaving a gate does anyway.
 */
export function flightLine(entry, exitDir, origin) {
  const gy = (z) => origin.y + groundY(z);
  /* A point in the town's own frame, `y` metres over the ground there. */
  const at = (x, y, z) => new THREE.Vector3(origin.x + x, gy(z) + y, origin.z + z);
  /* The same, but on the road's centreline, which bends. */
  const road = (z, y) => at(centerX(z), y, z);

  const away = exitDir.clone().setY(0).normalize();
  return new THREE.CatmullRomCurve3([
    /* ---- off the field ---- */
    entry.clone(),
    /*
     * IT CLIMBS HARDER THAN IT USED TO, because it has less room to.
     *
     * With the town at 138 m there were a hundred and forty metres of empty
     * wood to gain height over. At 96 there are about forty, and the town's
     * southern outskirts start almost immediately. At +7 the aircraft went
     * straight through a canopy collider at 7 to 8.3 m, seventy metres along
     * the town's own local z; at +12 it went through the top of the same tree
     * at 8.1 to 10.4. It is a big cedar on the southern approach and the
     * answer is to be over it rather than to keep clipping its crown.
     *
     * Checked against the town's own collider list, which is the list the
     * simulator flies a quad against, and which is built before this file
     * thins the planting: it therefore includes trees that are no longer
     * drawn. Clearing a tree that is not there any more costs nothing and is
     * the right way to be wrong.
     */
    new THREE.Vector3(entry.x + away.x * 17, entry.y + 16, entry.z + away.z * 17),
    new THREE.Vector3(entry.x + away.x * 26, entry.y + 26, entry.z + away.z * 26),

    /* ---- the crossing between the two places, which is now a beat rather
           than a leg: three points instead of a leg's worth ---- */
    at(-12, 29, 82),
    at(-8, 27, 66),
    at(-5, 22, 56),

    /* ---- 1. down onto the street, and north up it ---- */
    at(centerX(48) - 1.2, 13, 48),
    road(42, 4.6),
    road(36, 3.4),
    road(28, 3.3),
    road(20, 3.3),
    road(13, 3.3),
    road(7, 4.3),

    /* ---- 2. over the barriers, the wires and the train ---- */
    road(2, 6.5),
    road(-2, 6.7),
    road(-7, 4.8),
    road(-13, 3.3),
    road(-20, 3.3),
    road(-26, 3.5),

    /* ---- 3. the climb out, on the road ---- */
    road(-33, 7.6),
    road(-40, 13.0),
    road(-46, 17.2),

    /*
     * ---- and away east, then BACK SOUTH over the roofs ----
     *
     * Turning off the road rather than back down it, for the reason the
     * simulator's own attract loop gives: a turn that cuts inward crosses
     * the leg it just flew, and a spline through its own path is a knot.
     *
     * Coming back south afterwards is this page's own addition and it is
     * about the last five seconds of the act. Climbing away northward, the
     * aircraft ends up over the top of the district looking at the trees
     * beyond it, so the final stretch of the freestyle line was a wooded
     * hillside with the town behind the camera. Swinging south puts the
     * district back in front, which is what the closing shot then opens on.
     */
    at(centerX(-48) + 11, 19.6, -47),
    at(centerX(-42) + 22, 21.0, -40),
    at(28, 21.8, -29),
    at(23, 22.4, -15),
  ], false, 'centripetal', 0.5);
}
