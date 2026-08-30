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
import { findAnimated, shareMaterials, thinFoliage, chunkInstanced } from './city/bake.js';
import { LITE } from './quality.js';

/* The town's own street functions, re-exported so the flight line and
 * anything else that needs to know where the road is asks the town rather
 * than a copy of it. */
export { centerX, groundY };

/*
 * Where the town stands, in the race field's own coordinates.
 *
 * FAR AWAY, and that is the dissolve's doing.
 *
 * While the page flew between the two places, this number was a compromise
 * between two things it could not satisfy at once. Far enough and the flight
 * over was a boring transit; near enough for the transit to be short and the
 * town stood inside the field's own treeline, which had to have a gap cut in
 * it. At 96 m it got worse than a compromise: from the roofs at the south end
 * of the town you could see the race track fifty metres away, so the page cut
 * from the field to a shot of the field.
 *
 * Nothing has to fly here now, so the distance is free, and the right value
 * is simply FAR: 460 m is three quarters of the fog's reach, which puts the
 * race field past the point where anything of it survives the haze, and the
 * town's own hills are in the way besides. The two places are two places
 * again, which is what the cut between them is for.
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
export const CITY_ORIGIN = new THREE.Vector3(0, 0, -460);

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
 * THE BOX IS THE CLOSING SHOT'S FRAME, measured rather than guessed, and it
 * is not the flight corridor: the close sees a great deal more than the line
 * touches, so the line is never what bounds this.
 *
 * At the last frame the camera is about 156 m from the town's heart through a
 * 58 degree lens, which is 173 m of frame width where the town is. Round that
 * up and centre it and you get roughly 110 m either side, which is what is
 * kept. Everything beyond it is off the edge of every frame the page has.
 *
 * It was almost twice this, and that was the single biggest thing wrong with
 * the town's cost: measured, the closing shot was submitting 4,597 draw calls,
 * most of them for district the lens cannot reach.
 *
 * The town's landform and its hills survive whatever this says, because
 * pruning is by a child's bounding box CENTRE and those meshes are one piece
 * spanning the district. That is what keeps a horizon behind the town rather
 * than a cliff edge.
 */
const KEEP = {
  x: [-105, 118],
  z: [-125, 102],
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

/* ---------------------------------------------------------------- merging */

/*
 * MERGING THE TOWN BY MATERIAL, and why this is not bake.js's bakeCity.
 *
 * bakeCity is the simulator's own pass and it is much cleverer than this: it
 * shares materials, bakes colour to vertices, atlases textures, builds shadow
 * proxies and merges by cell. It is also, called from here, wrong: it drops
 * the shopping street's buildings. Every one of its knobs was tried, the
 * simulator's own combination included, and the shops go every time; with the
 * call removed they come back. The simulator does a good deal of preparation
 * between buildWorld and bakeCity that this page does not, and chasing that
 * down means porting most of another file to get a pass this page needs one
 * eighth of.
 *
 * So the merge is done here, and it does the one thing that actually matters:
 * eleven thousand meshes become a few dozen. Group every static mesh by its
 * material and its attribute signature, concatenate the geometries with each
 * mesh's world transform baked in, and put one mesh in their place.
 *
 * WHAT IT MUST NOT TOUCH is anything that moves. findAnimated is bake.js's
 * own and is imported rather than reimplemented, because "which parts of this
 * town are animated" is a question about the town and the town's own code is
 * the authority on it. The train, the crossing booms and the petals come back
 * from it and are left exactly where they are.
 *
 * Grouping by ATTRIBUTE SIGNATURE as well as material is not fussiness. A
 * merged buffer has to have the same attributes all the way through, and this
 * town has geometries with vertex colours and geometries without. Merge those
 * together and the ones without get whatever was left in the buffer, which is
 * a wall painted with somebody else's colours.
 */
function mergeStatics(root, animated) {
  const groups = new Map();
  const skip = new Set();
  /* Everything under a moving object moves with it. */
  for (const a of animated) {
    a.traverse((o) => skip.add(o));
  }

  root.traverse((o) => {
    if (!o.isMesh || o.isInstancedMesh || skip.has(o) || !o.geometry || !o.material) {
      return;
    }
    if (Array.isArray(o.material)) {
      return;
    }
    const attrs = Object.keys(o.geometry.attributes).sort().join(',');
    const key = `${o.material.uuid}|${attrs}`;
    let g = groups.get(key);
    if (!g) {
      g = { material: o.material, attrs: attrs.split(','), meshes: [] };
      groups.set(key, g);
    }
    g.meshes.push(o);
  });

  /*
   * INTO THE ROOT'S FRAME, NOT THE WORLD'S, and this is the whole of the one
   * bug that made the first version of this look like a bombed town.
   *
   * Each source mesh's transform has to be baked into its vertices, because
   * after the merge there is no per mesh transform left to apply. The obvious
   * matrix to bake is matrixWorld, and it is wrong: the merged mesh is then
   * parented under this same root, which is itself under a group standing at
   * the town's origin, so every vertex gets that offset applied twice. At an
   * origin of 460 m that is a town scattered half a kilometre from its own
   * ground.
   *
   * So the transform baked is the mesh's position RELATIVE TO THE ROOT, and
   * the root's own placement is left to do its job once.
   */
  root.updateMatrixWorld(true);
  const toRoot = new THREE.Matrix4().copy(root.matrixWorld).invert();

  let merged = 0;
  let replaced = 0;
  for (const g of groups.values()) {
    if (g.meshes.length < 2) {
      continue;
    }
    root.updateMatrixWorld(true);
    const geo = concat(g.meshes, g.attrs, toRoot);
    if (!geo) {
      continue;
    }
    for (const m of g.meshes) {
      if (m.parent) {
        m.parent.remove(m);
      }
      m.geometry.dispose();
      replaced += 1;
    }
    const mesh = new THREE.Mesh(geo, g.material);
    mesh.name = 'cityMerged';
    mesh.castShadow = false;
    mesh.receiveShadow = false;
    root.add(mesh);
    merged += 1;
  }
  return { groups: groups.size, merged, replaced };
}

/*
 * Concatenate a set of meshes into one geometry, each with its own world
 * transform baked in. Indices are rebased; a geometry with no index gets a
 * generated one so the output is always indexed.
 */
function concat(meshes, attrs, toRoot) {
  let verts = 0;
  let idx = 0;
  for (const m of meshes) {
    const pos = m.geometry.getAttribute('position');
    if (!pos) {
      return null;
    }
    verts += pos.count;
    const index = m.geometry.getIndex();
    idx += index ? index.count : pos.count;
  }
  /* 32 bit indices always: this town's merges run past 65536 vertices in the
   * first material and guessing per group is a bug waiting for a big town. */
  if (verts > 4294967295) {
    return null;
  }

  const out = new THREE.BufferGeometry();
  const arrays = {};
  const sizes = {};
  for (const name of attrs) {
    const a = meshes[0].geometry.getAttribute(name);
    if (!a) {
      return null;
    }
    sizes[name] = a.itemSize;
    arrays[name] = new Float32Array(verts * a.itemSize);
  }
  const index = new Uint32Array(idx);

  const nm = new THREE.Matrix3();
  const v = new THREE.Vector3();
  const mat = new THREE.Matrix4();
  let vo = 0;
  let io = 0;
  for (const m of meshes) {
    const geo = m.geometry;
    mat.multiplyMatrices(toRoot, m.matrixWorld);
    nm.getNormalMatrix(mat);
    const count = geo.getAttribute('position').count;
    for (const name of attrs) {
      const a = geo.getAttribute(name);
      if (!a || a.itemSize !== sizes[name]) {
        return null;
      }
      const dst = arrays[name];
      const size = sizes[name];
      if (name === 'position') {
        for (let i = 0; i < count; i += 1) {
          v.fromBufferAttribute(a, i).applyMatrix4(mat);
          dst[(vo + i) * 3] = v.x;
          dst[(vo + i) * 3 + 1] = v.y;
          dst[(vo + i) * 3 + 2] = v.z;
        }
      } else if (name === 'normal') {
        for (let i = 0; i < count; i += 1) {
          v.fromBufferAttribute(a, i).applyMatrix3(nm).normalize();
          dst[(vo + i) * 3] = v.x;
          dst[(vo + i) * 3 + 1] = v.y;
          dst[(vo + i) * 3 + 2] = v.z;
        }
      } else {
        /*
         * Through the accessors, not the raw array.
         *
         * a.array is only the flat float buffer people assume it is for the
         * simple case. This town also has interleaved attributes, where the
         * array is the whole interleaved block and an index into it lands in
         * the middle of somebody else's vertex, and normalised integer
         * attributes, where the raw value is 0 to 255 and the accessor is
         * what divides it back down. Read raw, the merge produced a town of
         * flattened walls and scattered fragments, which is exactly what
         * garbage vertex data looks like. getX and friends handle both.
         */
        for (let i = 0; i < count; i += 1) {
          const at = (vo + i) * size;
          dst[at] = a.getX(i);
          if (size > 1) {
            dst[at + 1] = a.getY(i);
          }
          if (size > 2) {
            dst[at + 2] = a.getZ(i);
          }
          if (size > 3) {
            dst[at + 3] = a.getW(i);
          }
        }
      }
    }
    const gi = geo.getIndex();
    if (gi) {
      for (let i = 0; i < gi.count; i += 1) {
        index[io + i] = gi.getX(i) + vo;
      }
      io += gi.count;
    } else {
      for (let i = 0; i < count; i += 1) {
        index[io + i] = vo + i;
      }
      io += count;
    }
    vo += count;
  }

  for (const name of attrs) {
    out.setAttribute(name, new THREE.BufferAttribute(arrays[name], sizes[name]));
  }
  out.setIndex(new THREE.BufferAttribute(index, 1));
  out.computeBoundingSphere();
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

    /*
     * EVERY BOX BELOW IS MEASURED IN THE TOWN'S OWN FRAME, and getting that
     * wrong was a bug that hid for as long as the town stood close.
     *
     * Box3.setFromObject reads matrixWorld, and by the time this runs the
     * group has been through a render, so it answers in WORLD coordinates.
     * Both the prune limits and the town's own street numbers are in LOCAL
     * ones. While the town sat 96 m from the field the difference was small
     * against a four hundred metre box and nothing looked wrong; moved to
     * 460 m it pruned the entire district except the handful of children
     * whose bounds come back empty, which is why the shopping street arrived
     * as a set of shop banners hanging in an empty field.
     *
     * It also put the deck's cut rectangle out by one whole origin, because
     * that box was measured the same way and then had the origin added to it
     * a second time.
     *
     * So the transform is taken once and applied explicitly. No more
     * guessing which frame a number is in.
     */
    group.updateMatrixWorld(true);
    const toLocal = new THREE.Matrix4().copy(group.matrixWorld).invert();

    /* Drop what the camera cannot reach, before the merge passes look at it. */
    const box = new THREE.Box3();
    let pruned = 0;
    for (const child of [...world.root.children]) {
      box.setFromObject(child);
      if (box.isEmpty()) {
        continue;
      }
      box.applyMatrix4(toLocal);
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
        groundBox.union(one.applyMatrix4(toLocal));
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
    const { moving } = findAnimated(world, { releaseStillRigs: false });
    /* Dedupe identical materials first: the merge groups by material, and
     * two materials that differ only by object identity are two groups that
     * could have been one. bake.js own pass. */
    const shared = shareMaterials(world.root, moving);
    const mergeStats = mergeStatics(world.root, moving);
    mergeStats.shared = shared && shared.saved;
    /* The town's own knob, which only reaches its hill tufts, moss, rocks and
     * lake reeds. Cheap, and worth having, but it is not the planting. */
    thinFoliage(world.root, { keep: LITE ? 0.35 : 0.55 });
    /*
     * chunkInstanced is NOT run. It splits each instanced set into per cell
     * sets so distant cells cull, which is the right trade for a player
     * walking a district and the wrong one here: measured with and without,
     * it cost a hundred and twenty draw calls at the close and a hundred on
     * the main street, and saved seventy five in the corridor. The camera is
     * never inside enough of this town for the culling to pay for the meshes
     * it makes.
     */

    /* CHUNK OFF FOR TEST */

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
      merge: mergeStats,
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
 * THE LINE. A cruise, then a freestyle line, and no journey between them.
 *
 * IT USED TO OPEN WITH A TRANSIT and the transit was the weakest thing on
 * the page. The aircraft climbed out of the last gate, crossed the ground
 * between the race field and the town, and descended into the street: forty
 * metres of empty air with nothing in it, flown fast to get it over with,
 * and it still read as waiting. Every problem the act had was a problem the
 * transit created. It needed the town placed at a particular distance, which
 * needed a gap cut in the field's treeline; it needed a climb steep enough
 * to clear a cedar on the approach; it needed a separate faster pace so it
 * would not bore, and a pace change is a thing an audience notices and
 * wonders about.
 *
 * The page cuts to the town now. See the dissolve in main.js. What that buys
 * is this file: the line can start wherever the best shot is, because
 * nothing has to fly to it.
 *
 * So it starts in the SHOTENGAI, which is the best thing in the town and was
 * previously unreachable. Six metres between the kerbs, shops hard against
 * both of them, lanterns strung overhead, and the aircraft comes down it at
 * walking pace under the lanterns. That is the quaint street, and it is a
 * corridor, which is the one thing a race field cannot offer.
 *
 * Then the freestyle line, which begins the moment the corridor runs out:
 * up over the roofs at the south end, hard round, and down onto the main
 * road facing north. Blade signs and a cable web at head height, the level
 * crossing at 6.9 m with its barriers down and a train going under, and a
 * climb out over the roofs at the far end.
 *
 * THE HEIGHTS ARE THE TOWN'S. 2.8 m under the lanterns, 3.3 m down a street,
 * 6.9 m over the crossing because railway.js says a train roof is at 3.96,
 * the contact wire at 4.88 and the messenger at 5.95, so between the road and
 * the wires there is no other height that clears one. The street's own poles
 * stop short of the tracks, so nothing is strung across the gap the aircraft
 * rises through.
 */
export function flightLine(origin) {
  const gy = (z) => origin.y + groundY(z);
  /* A point in the town's own frame, `y` metres over the ground there. */
  const at = (x, y, z) => new THREE.Vector3(origin.x + x, gy(z) + y, origin.z + z);
  /* The same, but on the road's centreline, which bends. */
  const road = (z, y) => at(centerX(z), y, z);

  /* The shopping street's own kerb lines, from shotengai.js: a six metre
   * corridor between x 19.2 and 25.2. This flies the middle of it. */
  const SG = 22.2;

  return new THREE.CatmullRomCurve3([
    /* ---- 1. the cruise: down the shopping street, under the lanterns ---- */
    at(SG, 3.0, 17.5),
    at(SG, 2.8, 23),
    at(SG - 0.3, 2.8, 29),
    at(SG + 0.3, 2.8, 35),
    at(SG, 3.0, 40),

    /* ---- 2. up over the roofs at the south end, and hard round ----
       A hundred and eighty degrees in about twenty five metres, which is a
       bank a race line would never ask for and is the whole point of the
       act. It happens ABOVE the roofs, where the only thing to hit is
       nothing: the buildings here are six to eight metres and this is at
       twelve to fifteen. */
    at(SG - 0.4, 6.5, 44.5),
    at(SG - 2.5, 11.5, 48),
    at(15.5, 14.5, 50.5),
    at(9.0, 15.0, 50.0),
    at(3.0, 14.0, 47.0),

    /* ---- 3. down onto the main road, facing north ---- */
    at(centerX(44) - 0.4, 8.5, 44),
    at(centerX(39), 4.6, 39),
    road(34, 3.4),
    road(27, 3.3),
    road(20, 3.3),
    road(13, 3.3),
    road(7, 4.3),

    /* ---- 4. over the barriers, the wires and the train ---- */
    road(2, 6.5),
    road(-2, 6.7),
    road(-7, 4.8),
    road(-13, 3.3),
    road(-20, 3.3),
    road(-26, 3.5),

    /* ---- 5. the climb out, on the road, because the ground either side of
           it at this end is trees and there is no height out there between
           the tarmac and the treetops ---- */
    road(-33, 7.6),
    road(-40, 13.0),
    road(-46, 17.2),

    /* ---- and away east, then back south over the roofs, so the last thing
           the act does is open the district out for the shot that follows
           it ---- */
    at(centerX(-48) + 11, 19.6, -47),
    at(centerX(-42) + 22, 21.0, -40),
    at(28, 21.8, -29),
    at(23, 22.4, -15),
  ], false, 'centripetal', 0.5);
}
