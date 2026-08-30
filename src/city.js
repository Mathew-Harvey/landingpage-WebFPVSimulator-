/*
 * city.js: the freestyle city, as much of it as a front door can carry.
 *
 * The simulator's freestyle map is a whole Japanese suburban railway town,
 * sixty four thousand lines of it, vendored from sakura-crossing under MIT.
 * None of that can come here. This page has no build step, no bundler and
 * one CDN import, and a landing page that downloads a town before it can
 * draw its first frame has already lost the visitor it was built for.
 *
 * So this is not the town. It is a PORTRAIT of the town, built the way the
 * rest of this page builds things: painted canvases, cel materials, merged
 * geometry, one seeded random stream so the picture is the same picture on
 * every load. What makes it recognisable is not detail, it is PROPORTION,
 * and the proportions are not invented. Every dimension below is copied
 * from the simulator's own source and the file it came from is named beside
 * it, the same way src/wiki/model.js snapshots the plant's constants. If
 * the town and this portrait ever disagree about how wide a Japanese
 * carriageway is, one of them is a bug and it will be this one.
 *
 * WHAT MAKES IT THIS TOWN AND NOT GENERIC ANIME JAPAN. Five things, and
 * they are the five things built first:
 *
 *   1. The level crossing. Yellow and black barriers, a ballast bed and a
 *      pair of signal lamps, cutting the main street at right angles. It is
 *      the thing the whole district is named after and the one silhouette a
 *      viewer will recognise from a hundred metres up.
 *   2. The overhead wires. A Japanese suburban street is roofed by cable.
 *      Poles every twenty five metres, a crossarm each, and eight wires
 *      sagging between them. Nothing else says the place so cheaply.
 *   3. The shotengai. A six metre shopping street with shops hard against
 *      both kerbs and lanterns strung across it overhead. It is the one
 *      place on this page where the quad flies through a corridor rather
 *      than over a field.
 *   4. The shopfronts. Two storeys, a deep fascia, an awning, a blade sign
 *      standing out at right angles over the footway. The blade signs are
 *      what read at speed.
 *   5. The blossom. Which this page already has, drifting past the lens.
 *
 * WHAT IS DELIBERATELY NOT HERE. Interiors, people, traffic, the school,
 * the onsen, the canal and the lake. The camera is doing three passes at
 * between eleven and twenty metres and none of them would be seen. A prop
 * that is never in frame is a download that is never justified.
 *
 * ON THE SIGNAGE. The shop signs are abstract strokes, not words. Painting
 * approximate kana onto forty fascias would produce forty pieces of
 * nonsense in somebody's actual writing system, which is worse than not
 * writing anything: at a hundred and forty kilometres an hour a viewer
 * reads a sign as a SHAPE, and a shape is what is painted.
 *
 * WHOSE TOWN IT IS. The district this portrays is sakura-crossing, by
 * Kenton Wang, MIT, https://github.com/kenton-gmi/sakura-crossing, which the
 * simulator vendors under src/maps/city/vendored and credits in its NOTICE.
 * No code from it is here and none of it is imported: what travels is the
 * PLAN, which is to say the numbers, and each one is attributed to the file
 * it was read from at the point it is used. MIT into GPLv3 is a one way fit
 * and this file is GPLv3 like the rest of the page, but the credit is owed
 * either way and is easier to lose than the code would be.
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
import { celMaterial } from './cel.js';
import { SEG, LITE } from './quality.js';

/* ------------------------------------------------------------- the palette */

/*
 * The town's own colours, hex for hex from the simulator's
 * src/maps/city/vendored/core/palette.js.
 *
 * The palette's own note explains itself better than a summary would: pale
 * masses, one or two saturated accents per area, and greens that lean teal.
 * That is why a town of forty buildings does not fight the page: thirty
 * eight of them are off white and the two that are not are a postbox red
 * and a vending machine.
 *
 * THE ONE THING THAT IS CHANGED IS THE HOUR. The simulator flies this town
 * at about four in the afternoon under a blue sky: skyTop 0x8fbdea, fog
 * 0xe6ecf7. This page is at golden hour and has been since the field, and
 * two suns on one scroll is not a transition, it is a continuity error. So
 * the masses keep their hues and the LIGHT does the work, which is what the
 * cel ramp in cel.js is for: a warm lit band and a cool shadow. A cream
 * wall under this page's sun is the same cream wall, lit differently.
 */
const PAL = {
  /* ground and paving */
  road: 0x8e8a9c,
  roadDark: 0x7b7689,
  lineWhite: 0xf4f2f6,
  sidewalk: 0xdcd8e2,
  curb: 0xc7c2d0,
  concrete: 0xd9d5dd,
  concreteMid: 0xc2bdc8,
  concreteDark: 0xa7a2b0,
  ballast: 0x7d7686,

  /* walls and roofs */
  wallWhite: 0xfaf6ef,
  wallCream: 0xf2e7d3,
  wallBlue: 0xd6e3ee,
  wallBeige: 0xe7dbc4,
  wallGray: 0xdedee6,
  wallPink: 0xf0dcda,
  roofSlate: 0x59617a,
  roofBlue: 0x4d5c78,
  roofBrown: 0x6b585c,
  roofTeal: 0x4f6b70,
  trim: 0x8b8496,
  glassDark: 0x53627a,
  shutter: 0x6e6a7a,

  /* the accents, used sparingly and on purpose */
  red: 0xe0453f,
  redDeep: 0xb5322f,
  yellow: 0xf4c033,
  black: 0x322e3b,
  teal: 0x2f9c9a,
  blue: 0x3d6ec4,
  orange: 0xef8a3c,

  /* planting */
  leafDeep: 0x3f7f60,
  cedar: 0x35624a,
  trunk: 0x9a8082,
  blossom: 0xfbc6d8,
  blossomDeep: 0xf0a3c0,
  blossomLight: 0xfff0f4,

  /* the railway */
  railHead: 0xc2bcc4,
  sleeper: 0x6d6576,
  gateYellow: 0xf4c033,
  gateBlack: 0x322e3b,

  /* the train */
  trainBody: 0xf7f2e6,
  trainStripe: 0x2f7fd0,
  trainWindow: 0x3a4258,
  trainSkirt: 0x9aa0ad,
  trainRoof: 0xbdb8bd,

  /* metal and misc */
  metal: 0xb8bcc6,
  metalDark: 0x878b96,
  vendWhite: 0xf8f5f0,
  vendRed: 0xdb4038,
  vendTeal: 0x2e9a98,
};

/*
 * The lit things, and they are lit rather than shaded.
 *
 * cel.js says it plainly: a cel surface that glows is a basic material, not
 * that one. At golden hour a paper lantern, a vending machine's face and a
 * lit upstairs window are the only things in the district emitting rather
 * than reflecting, and they are the whole reason the town reads as evening
 * instead of as a model. There are four of them and they are all cheap.
 */
const LIT = {
  lantern: 0xffd9a8,
  window: 0xffdcae,
  vend: 0xe8f4ff,
  signal: 0xff4d40,
};

/* ---------------------------------------------------- the town's own plan */

/*
 * Everything below is the simulator's, quoted.
 *
 * src/maps/city/vendored/world/street.js:
 *   ROAD_HALF 3.15, WALK_W 1.55, WALK_H 0.135, Z_MIN -66, Z_MAX 52,
 *   TRACK_HALF 2.2, GATE_Z 2.95, CROSS_BAND 3.35, and centerX() below.
 *
 * The district is shortened at both ends, because the simulator's road runs
 * to a school at one end and a canal at the other and this page visits
 * neither. What is kept is the stretch either side of the crossing, which
 * is the stretch the simulator's own title camera flies.
 */
export const ROAD_HALF = 3.15;
const WALK_W = 1.55;
const WALK_H = 0.135;
const Z_SOUTH = 48;
const Z_NORTH = -58;
const TRACK_HALF = 2.2;
const GATE_Z = 2.95;
const CROSS_BAND = 3.35;

/* smoothstep, as street.js spells it, so centerX below is the same curve */
function sstep(a, b, x) {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a || 1e-6)));
  return t * t * (3 - 2 * t);
}

/*
 * The lateral drift of the road centre, verbatim from street.js.
 *
 * This one function is why the town reads as a place. A straight road is a
 * diagram: you can see both ends of it from anywhere on it and there is
 * nothing to fly INTO. The simulator's own comment says what it is for, and
 * it is worth repeating because it is the reason this is copied rather than
 * simplified: the road "bends and climbs away to the north-west and bends
 * the other way behind the player, which hides both ends of the scene
 * without a visible wall".
 */
export function centerX(z) {
  return 3.0 * sstep(-11, -36, z) - 3.4 * sstep(16, 44, z);
}

/*
 * The ground's height along the street, also from street.js. It climbs past
 * the crossing, which is what stops the district being a card table.
 *
 * Kept because the CAMERA rides it: a flat run down a road that is visibly
 * climbing away from you is a shot with a mistake in it, and a shot that
 * rises with the road is a shot with a hill in it.
 */
export function groundY(z) {
  return 1.05 * sstep(-13, -32, z) + 0.45 * sstep(28, 48, z);
}

/*
 * The shopping street, from shotengai.js: a six metre corridor between kerb
 * lines at x 19.2 and 25.2, running from an alley in the south at z 16.3 to
 * a north end at z 42.6.
 *
 * The simulator's note on it is the reason it is here: "The street runs
 * north from a 2.4 m alley off the main road, which is the whole trick: you
 * cannot see it from the crossing, and you arrive in it rather than at it."
 * A camera that arrives in a corridor it could not see is the single best
 * thing this act can do, so the corridor is kept at its real width.
 */
const SG_X0 = 19.2;
const SG_X1 = 25.2;
const SG_CX = (SG_X0 + SG_X1) * 0.5;
const SG_Z_S = 16.3;
const SG_Z_N = 42.6;

/*
 * Shopfront proportions, from shops.js: 6.0 m of frontage, 6.5 m deep, a
 * 3.2 m ground floor under a 2.7 m upper one, and a 0.9 m recess behind the
 * shopfront line. A parapet stands 0.37 m over the roof slab.
 *
 * The upper storey is what makes a shopping street a street rather than a
 * row of sheds, and it is set back so the fascia and the awning have
 * somewhere to sit. That set back is 0.2 m and it is load bearing: without
 * it there is no shadow line along the top of the shopfronts and the whole
 * elevation goes flat.
 */
const SHOP_W = 6.0;
const SHOP_D = 6.5;
const SHOP_H1 = 3.2;
const SHOP_H2 = 2.7;

/*
 * The overhead wires, from railway.js and the town's utility poles: a
 * contact wire at 4.88 m, a messenger at 5.95 m, and poles that reach
 * 9.2 m. The simulator's own flythrough clears the crossing at 6.9 m
 * because "between the road and the wires there is NO height that clears a
 * train", and this page's camera obeys the same number for the same reason.
 */
const POLE_H = 9.2;
const WIRE_LOW = 4.88;
const WIRE_HIGH = 5.95;

/* --------------------------------------------------------------- the tools */

/*
 * One seeded stream for the whole town.
 *
 * Same generator as the treeline in course.js, and for the same reason: a
 * district laid out from Math.random is a different district on every load,
 * so a screenshot taken to argue about a composition is an argument about a
 * town that no longer exists. This one is the same town every time, on every
 * machine, forever.
 */
function stream(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/*
 * Merge a pile of geometries into one.
 *
 * Three ships this as an addon and the addon is not imported, because the
 * page's rule is that three.js arrives from the import map and nothing else
 * does. Thirty lines here is cheaper than a second CDN fetch on the one page
 * whose whole argument is that it asks for nothing.
 *
 * It matters more here than anywhere else on the page. The town is about
 * nine hundred boxes; drawn one at a time that is nine hundred draw calls
 * and a phone gives up. Merged by material it is about a dozen, and a
 * dozen is what the field already costs. The merge happens once, at build,
 * and nothing in the town moves afterwards except the train and the wires,
 * which are their own meshes for exactly that reason.
 *
 * Every input needs position, normal and uv. A geometry without uv gets
 * zeros, because a merged buffer with a missing attribute on one range is a
 * WebGL error rather than an untextured patch.
 */
function merge(parts) {
  let vertexCount = 0;
  let indexCount = 0;
  const prepared = [];
  for (const part of parts) {
    const geo = part.geometry;
    const pos = geo.getAttribute('position');
    if (!pos) {
      continue;
    }
    if (!geo.getAttribute('normal')) {
      geo.computeVertexNormals();
    }
    if (!geo.getAttribute('uv')) {
      geo.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(pos.count * 2), 2));
    }
    const index = geo.getIndex();
    prepared.push({ geo, pos, index, matrix: part.matrix });
    vertexCount += pos.count;
    indexCount += index ? index.count : pos.count;
  }

  const position = new Float32Array(vertexCount * 3);
  const normal = new Float32Array(vertexCount * 3);
  const uv = new Float32Array(vertexCount * 2);
  /* 16 bit indices top out at 65536 vertices and the shopfront run is well
   * past that, so the buffer is always 32 bit. Guessing per merge would save
   * a few kilobytes and cost an afternoon the first time a town grew. */
  const index = new Uint32Array(indexCount);

  const v = new THREE.Vector3();
  const n = new THREE.Vector3();
  const nm = new THREE.Matrix3();
  let vo = 0;
  let io = 0;
  for (const p of prepared) {
    const src = p.geo;
    const pos = p.pos;
    const nor = src.getAttribute('normal');
    const tex = src.getAttribute('uv');
    nm.getNormalMatrix(p.matrix);
    for (let i = 0; i < pos.count; i += 1) {
      v.fromBufferAttribute(pos, i).applyMatrix4(p.matrix);
      position[(vo + i) * 3 + 0] = v.x;
      position[(vo + i) * 3 + 1] = v.y;
      position[(vo + i) * 3 + 2] = v.z;
      n.fromBufferAttribute(nor, i).applyMatrix3(nm).normalize();
      normal[(vo + i) * 3 + 0] = n.x;
      normal[(vo + i) * 3 + 1] = n.y;
      normal[(vo + i) * 3 + 2] = n.z;
      uv[(vo + i) * 2 + 0] = tex.getX(i);
      uv[(vo + i) * 2 + 1] = tex.getY(i);
    }
    if (p.index) {
      for (let i = 0; i < p.index.count; i += 1) {
        index[io + i] = p.index.getX(i) + vo;
      }
      io += p.index.count;
    } else {
      for (let i = 0; i < pos.count; i += 1) {
        index[io + i] = vo + i;
      }
      io += pos.count;
    }
    vo += pos.count;
  }

  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(position, 3));
  out.setAttribute('normal', new THREE.BufferAttribute(normal, 3));
  out.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  out.setIndex(new THREE.BufferAttribute(index, 1));
  out.computeBoundingSphere();
  for (const p of prepared) {
    p.geo.dispose();
  }
  return out;
}

/*
 * A bin of parts, one per material, that turns into one mesh each at the
 * end of the build.
 *
 * The whole town is written as `put('wall', box, x, y, z)` and nothing in
 * the builders below has to know or care that a wall is going to end up
 * sharing a buffer with four hundred other walls. That is the only way a
 * town this size stays readable as source.
 */
function bins(materials) {
  const parts = new Map();
  const m4 = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const e = new THREE.Euler();
  const s = new THREE.Vector3(1, 1, 1);
  const p = new THREE.Vector3();

  function put(key, geometry, x, y, z, ry = 0, rx = 0, rz = 0) {
    if (!parts.has(key)) {
      parts.set(key, []);
    }
    e.set(rx, ry, rz, 'YXZ');
    q.setFromEuler(e);
    p.set(x, y, z);
    m4.compose(p, q, s);
    parts.get(key).push({ geometry, matrix: m4.clone() });
    return geometry;
  }

  function build(group) {
    const meshes = new Map();
    for (const [key, list] of parts) {
      const mat = materials[key];
      if (!mat || list.length === 0) {
        continue;
      }
      const mesh = new THREE.Mesh(merge(list), mat);
      /* The town is one object as far as culling is concerned. Its merged
       * meshes each span the whole district, so a bounding sphere test on
       * them answers "yes" from anywhere the district is visible and costs
       * a matrix multiply to say so. */
      mesh.frustumCulled = true;
      mesh.name = `city_${key}`;
      group.add(mesh);
      meshes.set(key, mesh);
    }
    parts.clear();
    return meshes;
  }

  return { put, build };
}

/* A box, centred, as a plain geometry the bin can place. */
function box(w, h, d) {
  return new THREE.BoxGeometry(w, h, d);
}

/*
 * A strip that follows the road.
 *
 * The carriageway cannot be a box, because centerX() bends it. It is built
 * as a ribbon instead: a pair of vertices at each station along the road,
 * stitched into quads. One geometry, no seams, and it takes the bend the
 * town's own function gives it.
 *
 * `edgeAt(z)` returns the two edges as full points rather than a centre and
 * a half width, which is what lets one function build all four surfaces the
 * street needs: a carriageway whose edges are level, a footway offset to one
 * side, and a KERB FACE, whose two edges are at the same x and different
 * heights. A face was previously a flat strip rotated on edge, which put it
 * in the wrong place by exactly its own distance from the origin.
 *
 * `flip` REVERSES THE WINDING, and it is not optional decoration.
 *
 * A strip's normal comes from the order its two edges are given in, so the
 * footway on the west side of the road, whose edges run outward in -x, came
 * out facing DOWN and was culled: the west pavement of the main street was
 * simply not drawn, and what showed through was the grass under it. Same for
 * the kerb face on the east side, which faced away from the road it is the
 * kerb of. Both were invisible in the way that is hardest to notice, which is
 * that something you expected to see is not obviously missing, it just looks
 * like the ground comes closer than it should.
 *
 * Detecting it automatically is tempting and does not work: a kerb face is
 * vertical, so "is the normal pointing up" has no answer for it. The caller
 * knows which side of the road it is building. It says so.
 */
function ribbon(z0, z1, steps, edgeAt, flip = false) {
  const position = new Float32Array((steps + 1) * 2 * 3);
  const uv = new Float32Array((steps + 1) * 2 * 2);
  const index = new Uint32Array(steps * 6);
  for (let i = 0; i <= steps; i += 1) {
    const t = i / steps;
    const z = z0 + (z1 - z0) * t;
    const e = edgeAt(z);
    const k = i * 6;
    position[k + 0] = e.x0;
    position[k + 1] = e.y0;
    position[k + 2] = z;
    position[k + 3] = e.x1;
    position[k + 4] = e.y1;
    position[k + 5] = z;
    const u = i * 4;
    uv[u + 0] = 0;
    uv[u + 1] = (t * (z1 - z0)) / 8;
    uv[u + 2] = 1;
    uv[u + 3] = (t * (z1 - z0)) / 8;
    if (i < steps) {
      const o = i * 6;
      const a = i * 2;
      if (flip) {
        index[o + 0] = a;
        index[o + 1] = a + 1;
        index[o + 2] = a + 2;
        index[o + 3] = a + 1;
        index[o + 4] = a + 3;
        index[o + 5] = a + 2;
      } else {
        index[o + 0] = a;
        index[o + 1] = a + 2;
        index[o + 2] = a + 1;
        index[o + 3] = a + 1;
        index[o + 4] = a + 2;
        index[o + 5] = a + 3;
      }
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(position, 3));
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  geo.setIndex(new THREE.BufferAttribute(index, 1));
  /* Computed rather than assumed, because a kerb face is vertical and a
   * carriageway is not, and a strip with a hardcoded up normal is a strip
   * that goes black the moment it stands on edge. */
  geo.computeVertexNormals();
  return geo;
}

/* ------------------------------------------------------------ the printing */

function canvasTexture(w, h, paint) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');
  paint(ctx, w, h);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

const css = (hex) => `#${hex.toString(16).padStart(6, '0')}`;

/*
 * A block of strokes that reads as writing without being any.
 *
 * Two or three characters' worth of dense horizontal and vertical strokes
 * inside a square cell, which is what a kanji looks like from thirty metres
 * up at a hundred and forty kilometres an hour: a dark textured square with
 * horizontal emphasis. Written out as real characters it would be forty
 * shop signs of gibberish in somebody's language, which is the one way this
 * could be actively rude rather than merely stylised.
 */
function strokeBlock(ctx, x, y, size, rnd, ink) {
  ctx.fillStyle = ink;
  const pad = size * 0.14;
  const inner = size - pad * 2;
  const rows = 2 + Math.floor(rnd() * 3);
  const t = Math.max(1.5, size * 0.085);
  for (let i = 0; i < rows; i += 1) {
    const yy = y + pad + (inner * (i + 0.5)) / rows - t * 0.5;
    const inset = rnd() * inner * 0.22;
    ctx.fillRect(x + pad + inset, yy, inner - inset * 2, t);
  }
  const cols = 1 + Math.floor(rnd() * 3);
  for (let i = 0; i < cols; i += 1) {
    const xx = x + pad + (inner * (i + 0.5)) / cols - t * 0.5;
    const inset = rnd() * inner * 0.18;
    ctx.fillRect(xx, y + pad + inset, t, inner - inset * 2);
  }
}

/*
 * THE FASCIA ATLAS. One 1024 by 512 canvas holding sixteen shop signs in a
 * four by four grid, so forty shopfronts share one texture and one material
 * and therefore one draw call.
 *
 * Each cell is a coloured band with a stroke block on it and a thin rule
 * under it. The colours are the palette's accents at the density the
 * palette asks for: mostly quiet, two loud.
 */
const FASCIA_COLS = 4;
const FASCIA_ROWS = 4;
const FASCIA_N = FASCIA_COLS * FASCIA_ROWS;

function paintFascia(ctx, w, h) {
  const rnd = stream(0x5a4b3c);
  const cw = w / FASCIA_COLS;
  const ch = h / FASCIA_ROWS;
  const grounds = [
    PAL.wallWhite, PAL.wallCream, PAL.wallBlue, PAL.red,
    PAL.wallBeige, PAL.teal, PAL.wallWhite, PAL.wallGray,
    PAL.wallCream, PAL.blue, PAL.wallPink, PAL.wallWhite,
    PAL.yellow, PAL.wallBlue, PAL.wallCream, PAL.wallBeige,
  ];
  for (let r = 0; r < FASCIA_ROWS; r += 1) {
    for (let c = 0; c < FASCIA_COLS; c += 1) {
      const i = r * FASCIA_COLS + c;
      const x = c * cw;
      const y = r * ch;
      const g = grounds[i];
      ctx.fillStyle = css(g);
      ctx.fillRect(x, y, cw, ch);
      /* A darker band along the bottom of every fascia. Every shopfront in
       * the town has a shadow under its sign because every one of them has
       * a soffit, and without it the elevation is a row of flat rectangles. */
      ctx.fillStyle = 'rgba(50, 46, 59, 0.18)';
      ctx.fillRect(x, y + ch * 0.86, cw, ch * 0.14);
      /* Ink on a pale ground, cream on a loud one, which is what a signwriter
       * would do and what keeps the loud ones legible. */
      const loud = g === PAL.red || g === PAL.blue || g === PAL.teal;
      const ink = loud ? '#f7f2e6' : css(PAL.black);
      const size = ch * 0.56;
      const n = 2 + Math.floor(rnd() * 3);
      const total = n * size * 1.06;
      let sx = x + (cw - total) * 0.5;
      for (let k = 0; k < n; k += 1) {
        strokeBlock(ctx, sx, y + ch * 0.16, size, rnd, ink);
        sx += size * 1.06;
      }
    }
  }
}

/*
 * THE BLADE SIGNS, the tall thin boards that stand out at right angles over
 * the footway. They are the single most Japanese thing in an elevation and
 * they are also the thing that reads at speed, because a camera going down
 * a street sees them face on while the fascias are edge on.
 *
 * Eight of them across one 256 by 512 canvas, stacked, so the strip is
 * sampled by column.
 */
const BLADE_N = 8;

function paintBlades(ctx, w, h) {
  const rnd = stream(0x71c9e2);
  const cw = w / BLADE_N;
  const grounds = [
    PAL.red, PAL.wallWhite, PAL.blue, PAL.wallCream,
    PAL.teal, PAL.wallWhite, PAL.yellow, PAL.wallBlue,
  ];
  for (let i = 0; i < BLADE_N; i += 1) {
    const x = i * cw;
    const g = grounds[i];
    ctx.fillStyle = css(g);
    ctx.fillRect(x, 0, cw, h);
    ctx.fillStyle = 'rgba(50, 46, 59, 0.22)';
    ctx.fillRect(x, 0, cw * 0.06, h);
    ctx.fillRect(x + cw * 0.94, 0, cw * 0.06, h);
    const loud = g === PAL.red || g === PAL.blue || g === PAL.teal || g === PAL.yellow;
    const ink = loud && g !== PAL.yellow ? '#f7f2e6' : css(PAL.black);
    /* Read DOWN, because a blade sign is set vertically. Four cells with a
     * gap top and bottom, which is the proportion of every one of them. */
    const size = cw * 0.74;
    for (let k = 0; k < 4; k += 1) {
      strokeBlock(ctx, x + (cw - size) * 0.5, h * 0.09 + k * size * 1.08, size, rnd, ink);
    }
  }
}

/*
 * THE SHOPFRONT. Glass, a half lowered shutter on some of them, a noren
 * curtain on others, and the dark of an interior behind. Four across one
 * canvas.
 *
 * The half lowered shutter is worth the pixels it costs. The simulator's own
 * note on this street says what says the place is working: "a half-lowered
 * shutter, a menu board still out, crates stacked and squared off". This
 * page cannot afford the crates. It can afford the shutter.
 */
const FRONT_N = 4;

function paintFronts(ctx, w, h) {
  const cw = w / FRONT_N;
  for (let i = 0; i < FRONT_N; i += 1) {
    const x = i * cw;
    /* The interior: dark, because a shop at golden hour is darker inside
     * than the wall outside it, and that contrast is the whole reason a
     * shopfront reads as an opening rather than as a painted panel. */
    ctx.fillStyle = css(PAL.glassDark);
    ctx.fillRect(x, 0, cw, h);
    /* A lit counter deep inside two of the four. */
    if (i === 1 || i === 2) {
      ctx.fillStyle = 'rgba(255, 220, 174, 0.34)';
      ctx.fillRect(x + cw * 0.1, h * 0.42, cw * 0.8, h * 0.3);
    }
    /* Mullions. */
    ctx.fillStyle = css(PAL.trim);
    const bays = 3;
    for (let b = 0; b <= bays; b += 1) {
      ctx.fillRect(x + (cw * b) / bays - 2, 0, 4, h);
    }
    ctx.fillRect(x, h * 0.02, cw, 5);
    ctx.fillRect(x, h * 0.93, cw, h * 0.07);
    if (i === 0) {
      /* Shutter, down two thirds. */
      ctx.fillStyle = css(PAL.shutter);
      ctx.fillRect(x, 0, cw, h * 0.66);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.06)';
      for (let y = 0; y < h * 0.66; y += 9) {
        ctx.fillRect(x, y, cw, 3);
      }
    }
    if (i === 3) {
      /* Noren, the split curtain over the door. Indigo, which is what they
       * nearly always are. */
      ctx.fillStyle = '#2a3f6b';
      ctx.fillRect(x + cw * 0.08, 0, cw * 0.84, h * 0.34);
      ctx.fillStyle = css(PAL.glassDark);
      ctx.fillRect(x + cw * 0.49, h * 0.1, cw * 0.02, h * 0.24);
    }
  }
}

/*
 * THE VENDING MACHINE FACE. Two of them, side by side on one small canvas.
 * A lit white box with a red or teal band and a grid of cans on it, which
 * is the whole silhouette, and at dusk it is one of four things in the
 * district that emits light.
 */
function paintVend(ctx, w, h) {
  const cw = w / 2;
  const bands = [PAL.vendRed, PAL.vendTeal];
  for (let i = 0; i < 2; i += 1) {
    const x = i * cw;
    ctx.fillStyle = css(PAL.vendWhite);
    ctx.fillRect(x, 0, cw, h);
    ctx.fillStyle = css(bands[i]);
    ctx.fillRect(x, 0, cw, h * 0.15);
    ctx.fillStyle = 'rgba(58, 66, 88, 0.5)';
    ctx.fillRect(x, h * 0.62, cw, h * 0.06);
    ctx.fillRect(x + cw * 0.06, h * 0.72, cw * 0.4, h * 0.2);
    for (let r = 0; r < 3; r += 1) {
      for (let c = 0; c < 4; c += 1) {
        ctx.fillStyle = ['#db4038', '#2e9a98', '#3d6ec4', '#f4c033'][(r + c) % 4];
        ctx.fillRect(
          x + cw * (0.08 + c * 0.22), h * (0.2 + r * 0.13),
          cw * 0.15, h * 0.09,
        );
      }
    }
  }
}

/*
 * THE TRAIN'S SIDE. Cream with a blue stripe and a run of windows, which is
 * every suburban EMU in the country and is exactly as much of one as a
 * camera passing at roof height will take in.
 */
function paintTrain(ctx, w, h) {
  ctx.fillStyle = css(PAL.trainBody);
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = css(PAL.trainStripe);
  ctx.fillRect(0, h * 0.60, w, h * 0.10);
  ctx.fillStyle = 'rgba(47, 127, 208, 0.35)';
  ctx.fillRect(0, h * 0.71, w, h * 0.03);
  ctx.fillStyle = css(PAL.trainWindow);
  const n = 9;
  for (let i = 0; i < n; i += 1) {
    ctx.fillRect(w * (0.045 + i * 0.102), h * 0.24, w * 0.072, h * 0.27);
  }
  /* Doors: a taller opening every third bay, in a slightly lighter body
   * colour, which is the one detail that stops a carriage reading as a bus. */
  ctx.fillStyle = '#eae4d8';
  for (let i = 0; i < 3; i += 1) {
    ctx.fillRect(w * (0.135 + i * 0.306), h * 0.18, w * 0.062, h * 0.66);
    ctx.fillStyle = css(PAL.trainWindow);
    ctx.fillRect(w * (0.148 + i * 0.306), h * 0.24, w * 0.036, h * 0.24);
    ctx.fillStyle = '#eae4d8';
  }
  ctx.fillStyle = css(PAL.trainSkirt);
  ctx.fillRect(0, h * 0.86, w, h * 0.14);
}

/* ------------------------------------------------------------ the district */

/*
 * The materials, one per merged mesh.
 *
 * This list IS the draw call budget: every entry here is one more draw for
 * the whole town, and there are about thirty of them, which is the same
 * order as the race field already costs. It is short on purpose. Six wall
 * colours and four roof colours are enough variety for forty buildings
 * because the palette's own rule does the work: pale masses, one or two
 * saturated accents, and the variety lives in the awnings and the signs.
 */
function materials() {
  const wall = (c) => celMaterial({ color: c, rim: 0.18, spec: 0.0 });
  return {
    road: celMaterial({ color: PAL.road, rim: 0.10, spec: 0.0 }),
    roadDark: celMaterial({ color: PAL.roadDark, rim: 0.08, spec: 0.0 }),
    line: celMaterial({ color: PAL.lineWhite, rim: 0.10, spec: 0.0 }),
    walk: celMaterial({ color: PAL.sidewalk, rim: 0.14, spec: 0.0 }),
    curb: celMaterial({ color: PAL.curb, rim: 0.16, spec: 0.0 }),
    concrete: celMaterial({ color: PAL.concrete, rim: 0.16, spec: 0.0 }),
    ballast: celMaterial({ color: PAL.ballast, rim: 0.10, spec: 0.0 }),

    wallWhite: wall(PAL.wallWhite),
    wallCream: wall(PAL.wallCream),
    wallBlue: wall(PAL.wallBlue),
    wallBeige: wall(PAL.wallBeige),
    wallGray: wall(PAL.wallGray),
    wallPink: wall(PAL.wallPink),

    roofSlate: celMaterial({ color: PAL.roofSlate, rim: 0.30, spec: 0.30 }),
    roofBlue: celMaterial({ color: PAL.roofBlue, rim: 0.30, spec: 0.30 }),
    roofBrown: celMaterial({ color: PAL.roofBrown, rim: 0.28, spec: 0.24 }),
    roofTeal: celMaterial({ color: PAL.roofTeal, rim: 0.28, spec: 0.24 }),

    trim: celMaterial({ color: PAL.trim, rim: 0.22, spec: 0.20 }),
    metal: celMaterial({ color: PAL.metal, rim: 0.30, spec: 0.45 }),
    metalDark: celMaterial({ color: PAL.metalDark, rim: 0.26, spec: 0.35 }),
    red: celMaterial({ color: PAL.red, rim: 0.22, spec: 0.10 }),
    redDeep: celMaterial({ color: PAL.redDeep, rim: 0.20, spec: 0.10 }),
    yellow: celMaterial({ color: PAL.yellow, rim: 0.22, spec: 0.12 }),
    black: celMaterial({ color: PAL.black, rim: 0.34, spec: 0.20 }),
    teal: celMaterial({ color: PAL.teal, rim: 0.22, spec: 0.12 }),
    blue: celMaterial({ color: PAL.blue, rim: 0.22, spec: 0.12 }),
    orange: celMaterial({ color: PAL.orange, rim: 0.22, spec: 0.12 }),

    railHead: celMaterial({ color: PAL.railHead, rim: 0.40, spec: 0.70 }),
    sleeper: celMaterial({ color: PAL.sleeper, rim: 0.12, spec: 0.0 }),

    trunk: celMaterial({ color: PAL.trunk, rim: 0.16, spec: 0.0 }),

    fascia: celMaterial({
      color: 0xffffff, map: canvasTexture(1024, 512, paintFascia), rim: 0.14,
    }),
    blade: celMaterial({
      color: 0xffffff,
      map: canvasTexture(256, 512, paintBlades),
      rim: 0.14,
      side: THREE.DoubleSide,
    }),
    front: celMaterial({
      color: 0xffffff, map: canvasTexture(512, 256, paintFronts), rim: 0.10,
    }),

    /*
     * The lit four. Basic, not cel, because a surface that is emitting has
     * no lit side and no shadow side, and shading one is how a lantern ends
     * up darker on the side away from the sun.
     *
     * They keep fog, though, so a lit window a hundred metres out still goes
     * into the haze with the wall it is in. A lantern that stays crisp while
     * its own street dissolves is worse than no lantern.
     */
    lantern: new THREE.MeshBasicMaterial({ color: LIT.lantern, fog: true }),
    windowLit: new THREE.MeshBasicMaterial({
      color: LIT.window, fog: true, side: THREE.DoubleSide,
    }),
    vend: new THREE.MeshBasicMaterial({
      color: 0xffffff, map: canvasTexture(256, 256, paintVend), fog: true,
    }),
    signalLamp: new THREE.MeshBasicMaterial({ color: LIT.signal, fog: true }),
    signalOff: celMaterial({ color: 0x6a3b44, rim: 0.20, spec: 0.0 }),
  };
}

/*
 * How far a shopfront's face stands from the road centre: the carriageway,
 * then the footway. Everything on the elevation is measured off this one
 * number, so widening the road moves the whole town rather than leaving a
 * row of buildings standing in it.
 */
const FRONT_LINE = ROAD_HALF + WALK_W;

/* ------------------------------------------------------------- the surface */

/*
 * The road, its footways and its kerbs, all following centerX().
 *
 * Laid as ribbons rather than boxes because the road bends, and laid at
 * small heights above the deck rather than on it because the page's ground
 * plane is one 700 m quad and two coplanar surfaces z-fight from any
 * distance at all. The order is the order they stack: kerb over footway
 * over carriageway, each a centimetre up from the last.
 */
function surface(b) {
  const steps = LITE ? 52 : 104;
  const y = (z) => groundY(z);

  b.put('road', ribbon(Z_NORTH, Z_SOUTH, steps, (z) => ({
    x0: centerX(z) - ROAD_HALF, y0: y(z) + 0.012,
    x1: centerX(z) + ROAD_HALF, y1: y(z) + 0.012,
  })), 0, 0, 0);

  for (const side of [-1, 1]) {
    /* The footway: from the kerb line out to the building line. Wound the
     * other way on the west side, where "outward" is -x. */
    b.put('walk', ribbon(Z_NORTH, Z_SOUTH, steps, (z) => ({
      x0: centerX(z) + side * ROAD_HALF, y0: y(z) + WALK_H,
      x1: centerX(z) + side * (ROAD_HALF + WALK_W), y1: y(z) + WALK_H,
    }), side < 0), 0, 0, 0);
    /*
     * The kerb FACE, which is the part that reads.
     *
     * From a low camera the top of a kerb is the same value as the footway
     * behind it and disappears; what you actually see is the vertical strip
     * between the road and the footway, and a street without it has its
     * pavements floating. Two edges at one x and two heights.
     */
    b.put('curb', ribbon(Z_NORTH, Z_SOUTH, steps, (z) => ({
      x0: centerX(z) + side * ROAD_HALF, y0: y(z) + WALK_H,
      x1: centerX(z) + side * ROAD_HALF, y1: y(z) + 0.010,
    }), side > 0), 0, 0, 0);
  }

  /*
   * The centre line, dashed. Ten metres on, five off, which is close enough
   * to the real thing that nobody will measure it and far enough from solid
   * that the road reads as a road at roof height.
   */
  for (let z = Z_NORTH + 4; z < Z_SOUTH - 10; z += 15) {
    b.put('line', ribbon(z, z + 10, 4, (zz) => ({
      x0: centerX(zz) - 0.075, y0: y(zz) + 0.026,
      x1: centerX(zz) + 0.075, y1: y(zz) + 0.026,
    })), 0, 0, 0);
  }
}

/* ------------------------------------------------------------- the crossing */

/*
 * The level crossing, and it is the first thing built because it is the one
 * thing a viewer will name.
 *
 * The railway runs east to west across the street at z = 0. Everything here
 * is quoted from railway.js and street.js: a 4.4 m track between the rail
 * heads, a ballast band 6.7 m across, and the road gates standing 2.95 m
 * out from the track centre on both sides.
 */
function crossing(b) {
  const X0 = -70;
  const X1 = 70;
  const y = groundY(0);

  /* The ballast, and the formation it sits on. */
  b.put('ballast', box(X1 - X0, 0.30, CROSS_BAND * 2), (X0 + X1) * 0.5, y + 0.15, 0);
  /* Sleepers. Merged rather than instanced because they are already going
   * into a shared buffer with the ballast's neighbours and an InstancedMesh
   * would be a second draw call for eighty boxes. */
  for (let x = X0 + 1; x < X1; x += 0.62) {
    b.put('sleeper', box(0.22, 0.09, 2.4), x, y + 0.32, 0);
  }
  /* The rails. 1.44 m gauge from railway.js, rail top 0.30 m. */
  for (const s of [-1, 1]) {
    b.put('railHead', box(X1 - X0, 0.14, 0.075), (X0 + X1) * 0.5, y + 0.36, s * 0.72);
  }

  /*
   * The road crossing panels: the carriageway is carried across the track on
   * a slab, so the road does not simply stop at the ballast.
   */
  b.put('concrete', box(ROAD_HALF * 2 + 0.4, 0.06, CROSS_BAND * 2), centerX(0), y + 0.36, 0);

  /*
   * The gates. Four of them, one each side of the road on each side of the
   * track, which is how a Japanese crossing is actually arranged, and the
   * yellow and black diagonal is the read.
   *
   * They are DOWN. A crossing with its barriers up is a piece of street
   * furniture; a crossing with them down is a moment, and the town has a
   * train standing at the platform to explain it.
   */
  for (const zs of [-1, 1]) {
    for (const xs of [-1, 1]) {
      const gx = centerX(0) + xs * (ROAD_HALF + 0.55);
      const gz = zs * GATE_Z;
      b.put('metalDark', new THREE.CylinderGeometry(0.10, 0.12, 1.15, 8), gx, y + 0.575, gz);
      b.put('black', box(0.34, 0.62, 0.30), gx, y + 1.32, gz);
      /* The boom, lowered across the carriageway, striped by alternating
       * short boxes rather than by a texture: at this size the stripes are
       * about 0.4 m each and painting them costs a whole material. */
      const reach = ROAD_HALF + 0.5;
      const n = 8;
      for (let i = 0; i < n; i += 1) {
        const t = (i + 0.5) / n;
        b.put(
          i % 2 === 0 ? 'yellow' : 'black',
          box(reach / n, 0.13, 0.10),
          gx - xs * (t * reach), y + 1.05, gz,
        );
      }
      /* The counterweight arm behind the post. */
      b.put('metal', box(0.7, 0.09, 0.09), gx + xs * 0.35, y + 1.62, gz);
    }
    /* The signal: a black plate with two red lamps and a warning cross, on
     * the near side of the track for each approach. */
    const sx = centerX(0) + (ROAD_HALF + 1.05);
    const sz = zs * (GATE_Z + 0.5);
    b.put('metalDark', new THREE.CylinderGeometry(0.055, 0.065, 3.0, 8), sx, y + 1.5, sz);
    b.put('black', box(1.10, 0.34, 0.10), sx, y + 3.05, sz);
    /* The X plate above it, two crossed bars, which is the shape everybody
     * knows before they know what it says. */
    b.put('yellow', box(1.25, 0.11, 0.06), sx, y + 3.55, sz, 0, 0, 0.62);
    b.put('yellow', box(1.25, 0.11, 0.06), sx, y + 3.55, sz, 0, 0, -0.62);
  }
}

/* ---------------------------------------------------------- the elevations */

const WALLS = ['wallWhite', 'wallCream', 'wallBlue', 'wallBeige', 'wallGray', 'wallPink'];
const ROOFS = ['roofSlate', 'roofBlue', 'roofBrown', 'roofTeal'];
const AWNINGS = ['red', 'teal', 'blue', 'orange', 'wallCream'];

/*
 * One shophouse.
 *
 * `face` is the direction the shop looks, as a yaw: everything below is
 * built along +z looking down -z and then turned, which is the only way a
 * street with four different orientations in it does not become four copies
 * of the same builder with the signs of every offset flipped.
 *
 * The parts are pushed straight into the shared bins, so a shopfront is not
 * an object that exists at any point. It is a contribution to nine merged
 * meshes, which is the whole reason a district of this size is affordable.
 */
function shophouse(b, o) {
  const rnd = o.rnd;
  const w = o.w ?? SHOP_W;
  const d = o.d ?? SHOP_D;
  const floors = o.floors ?? 2;
  const h1 = SHOP_H1;
  const h2 = SHOP_H2;
  const H = floors === 2 ? h1 + h2 : h1;
  const wall = WALLS[Math.floor(rnd() * WALLS.length)];
  const roof = ROOFS[Math.floor(rnd() * ROOFS.length)];

  /* Local frame: the shop faces -z, so its front face is at z = -d / 2.
   * The bin's `put` takes a yaw, so every offset below is rotated for free
   * by expressing it in this frame first. */
  const ry = o.ry;
  const cos = Math.cos(ry);
  const sin = Math.sin(ry);
  /* Local (lx, lz) to world, about the shop's own origin. */
  const wx = (lx, lz) => o.x + lx * cos + lz * sin;
  const wz = (lx, lz) => o.z - lx * sin + lz * cos;
  const at = (key, geo, lx, ly, lz, spin = 0, rx = 0, rz = 0) => {
    b.put(key, geo, wx(lx, lz), o.y + ly, wz(lx, lz), ry + spin, rx, rz);
  };

  const front = -d * 0.5;

  /* The ground floor mass, held back from the front so the shopfront can be
   * a recess rather than a decal. */
  const REC = 0.9;
  at(wall, box(w, h1, d - REC), 0, h1 * 0.5, REC * 0.5);
  /* The plinth: a band round the bottom, which is what stops a wall looking
   * like it was pushed into the pavement. */
  at('trim', box(w + 0.16, 0.40, d + 0.16), 0, 0.20, 0);

  /* The shopfront: dark glass set back in the recess, and a floor under it. */
  at('front', new THREE.PlaneGeometry(w - 0.5, h1 - 0.75), 0, (h1 - 0.75) * 0.5 + 0.20, front + REC + 0.02, Math.PI);
  at('concrete', box(w - 0.5, 0.06, REC), 0, 0.19, front + REC * 0.5);

  if (floors === 2) {
    /* Set back 0.2 m, which is what gives the elevation its shadow line. */
    at(wall, box(w, h2, d - 0.4), 0, h1 + h2 * 0.5, 0.1);
    /*
     * The upstairs windows. Three bays, and they are the difference between
     * a shopping street and a row of sheds: the thing above a shop in this
     * town is somebody's flat, and it has a balcony rail and a laundry pole.
     */
    for (let i = 0; i < 3; i += 1) {
      const lx = (i - 1) * w * 0.29;
      at('metalDark', box(w * 0.20, h2 * 0.52, 0.05), lx, h1 + h2 * 0.52, front + 0.22);
    }
    /*
     * One window in three is lit, and it is lit ON the building rather than
     * near it.
     *
     * These used to be scattered by polar coordinates over the whole
     * district, on the theory that a lit pane a hair proud of a wall is a lit
     * pane wherever it is put. It is not: the scatter did not know where the
     * walls were, so a third of them hung in the open air over a street, and
     * a glowing rectangle floating three metres off the ground is the single
     * most obviously wrong thing a town can contain. Placed by the builder
     * that already knows where the window openings are, they cannot miss.
     *
     * A third rather than all of them, because a town where every window is
     * lit is a town at nine in the evening, and this page is at the hour the
     * sun has just come off the roofs.
     */
    if (rnd() < 0.34) {
      const lit = Math.floor(rnd() * 3) - 1;
      at('windowLit', new THREE.PlaneGeometry(w * 0.19, h2 * 0.50), lit * w * 0.29, h1 + h2 * 0.52, front + 0.19, Math.PI);
    }
    at('metal', box(w * 0.92, 0.05, 0.05), 0, h1 + 0.55, front + 0.30);
    at('metal', box(w * 0.92, 0.05, 0.05), 0, h1 + 0.95, front + 0.30);
    for (let i = 0; i < 4; i += 1) {
      at('metal', box(0.04, 0.45, 0.04), (i - 1.5) * w * 0.27, h1 + 0.73, front + 0.30);
    }
  }

  /*
   * The fascia, which is the whole sign. One cell of the atlas, chosen by
   * the shop's own seed so it is stable, mapped onto a band across the front
   * at first floor level.
   */
  {
    const cell = Math.floor(rnd() * FASCIA_N);
    const cx = cell % FASCIA_COLS;
    const cy = Math.floor(cell / FASCIA_COLS);
    const geo = new THREE.PlaneGeometry(w, 0.92);
    const uv = geo.getAttribute('uv');
    for (let i = 0; i < uv.count; i += 1) {
      uv.setXY(
        i,
        (cx + uv.getX(i)) / FASCIA_COLS,
        /* The atlas is painted top row first and a texture's v runs up, so
         * the row index is counted from the other end. Getting this wrong is
         * silent: every sign is simply the wrong one. */
        (FASCIA_ROWS - 1 - cy + uv.getY(i)) / FASCIA_ROWS,
      );
    }
    uv.needsUpdate = true;
    at('fascia', geo, 0, h1 - 0.52, front - 0.03, Math.PI);
    /* The soffit over the shopfront, so the fascia has something to be the
     * front edge of rather than floating on the wall. */
    at('trim', box(w, 0.10, REC + 0.1), 0, h1 - 1.0, front + REC * 0.5);
  }

  /*
   * The awning, out over the footway, sloping down away from the building.
   * Not on every unit: a street where every shop has one reads as a market
   * stall, and the ones without are what give the run its rhythm.
   */
  if (rnd() < 0.55) {
    const awn = AWNINGS[Math.floor(rnd() * AWNINGS.length)];
    const reach = 1.25;
    at(awn, box(w - 0.3, 0.06, reach), 0, h1 - 1.28, front - reach * 0.5, 0, -0.22);
    at('metal', box(0.04, 0.04, reach), (w - 0.3) * 0.45, h1 - 1.28, front - reach * 0.5, 0, -0.22);
    at('metal', box(0.04, 0.04, reach), -(w - 0.3) * 0.45, h1 - 1.28, front - reach * 0.5, 0, -0.22);
  }

  /*
   * The blade sign: a tall board standing out at right angles over the
   * footway. It is the thing that reads at speed, because a camera going
   * down a street sees a blade face on for the whole approach while every
   * fascia on the same elevation is edge on until the moment it is past.
   */
  if (rnd() < 0.62) {
    const cell = Math.floor(rnd() * BLADE_N);
    const geo = new THREE.PlaneGeometry(0.62, 2.30);
    const uv = geo.getAttribute('uv');
    for (let i = 0; i < uv.count; i += 1) {
      uv.setXY(i, (cell + uv.getX(i)) / BLADE_N, uv.getY(i));
    }
    uv.needsUpdate = true;
    /* Turned a quarter turn so its face looks along the street, and pushed
     * out past the awning line so the two do not intersect. */
    at('blade', geo, w * 0.36, h1 + 0.55, front - 0.62, Math.PI * 0.5);
    at('metalDark', box(0.05, 0.05, 0.66), w * 0.36, h1 + 1.60, front - 0.32);
  }

  /* The roof. Flat with a parapet, or a gable, and the mix is what stops the
   * roofscape reading as a spreadsheet from the closing shot. */
  if (o.gable) {
    const rh = 1.05 + rnd() * 0.35;
    const eave = 0.42;
    const rw = w + eave * 2;
    const slope = Math.atan2(rh, rw * 0.5);
    const slab = Math.hypot(rw * 0.5, rh) + 0.08;
    for (const s of [-1, 1]) {
      at(roof, box(slab, 0.15, d + eave * 2), s * rw * 0.25, H + rh * 0.5, 0.1, 0, 0, -s * slope);
    }
    at(roof, box(0.26, 0.20, d + eave * 2), 0, H + rh + 0.05, 0.1);
    /* The gable end, so the roof has a wall under it rather than a gap. */
    for (const s of [-1, 1]) {
      at(wall, box(w, rh * 0.9, 0.14), 0, H + rh * 0.45, 0.1 + s * (d * 0.5 - 0.1));
    }
  } else {
    const dd = floors === 2 ? d - 0.4 : d;
    at(roof, box(w + 0.3, 0.20, dd + 0.3), 0, H + 0.10, 0.1);
    for (const s of [-1, 1]) {
      at(roof, box(w + 0.3, 0.34, 0.14), 0, H + 0.37, 0.1 + s * (dd * 0.5 + 0.14));
      at(roof, box(0.14, 0.34, dd + 0.3), s * (w * 0.5 + 0.14), H + 0.37, 0.1);
    }
    /*
     * The water tank and the air conditioning plant, and they are not
     * decoration. A flat roof in this country carries a stainless tank on a
     * frame and two condenser boxes, and from twenty metres up that clutter
     * is the entire difference between a town and a bar chart.
     */
    if (rnd() < 0.5) {
      at('metal', box(1.5, 0.95, 1.1), (rnd() - 0.5) * w * 0.5, H + 0.95, 0.1 + (rnd() - 0.5) * dd * 0.4);
      at('metalDark', box(0.10, 0.55, 0.10), (rnd() - 0.5) * w * 0.5, H + 0.42, 0.1);
    }
    if (rnd() < 0.6) {
      at('metalDark', box(0.85, 0.62, 0.42), (rnd() - 0.5) * w * 0.6, H + 0.51, 0.1 + (rnd() - 0.5) * dd * 0.5);
    }
  }
}

/*
 * A back block: a building with no shopfront, no sign and no awning, seen
 * only from above and from the end of an alley.
 *
 * These are two thirds of the town by count and about a twentieth of its
 * cost. A district whose depth is one building thick is a film set, and a
 * film set is exactly what the closing pull back would reveal.
 */
function backblock(b, o) {
  const rnd = o.rnd;
  const wall = WALLS[Math.floor(rnd() * WALLS.length)];
  const roof = ROOFS[Math.floor(rnd() * ROOFS.length)];
  const H = o.h;
  b.put(wall, box(o.w, H, o.d), o.x, o.y + H * 0.5, o.z, o.ry);
  if (o.gable) {
    const rh = 0.85 + rnd() * 0.5;
    const rw = o.w + 0.7;
    const slope = Math.atan2(rh, rw * 0.5);
    const slab = Math.hypot(rw * 0.5, rh) + 0.06;
    for (const s of [-1, 1]) {
      const lx = s * rw * 0.25;
      b.put(
        roof, box(slab, 0.14, o.d + 0.7),
        o.x + lx * Math.cos(o.ry), o.y + H + rh * 0.5, o.z - lx * Math.sin(o.ry),
        o.ry, 0, -s * slope,
      );
    }
  } else {
    b.put(roof, box(o.w + 0.24, 0.18, o.d + 0.24), o.x, o.y + H + 0.09, o.z, o.ry);
    if (rnd() < 0.35) {
      b.put('metal', box(1.2, 0.8, 0.9), o.x, o.y + H + 0.6, o.z, o.ry);
    }
  }
  /* A lit window, on a face this block actually has. Which face is chosen at
   * random, because a back block is seen from above and from whichever alley
   * runs past it, and its front is not a thing the layout decided. */
  if (rnd() < 0.30 && H > 2.8) {
    const face = Math.floor(rnd() * 4) * Math.PI * 0.5;
    const out = (face === 0 || face === Math.PI ? o.d : o.w) * 0.5 + 0.03;
    const ry = o.ry + face;
    b.put(
      'windowLit', new THREE.PlaneGeometry(0.85, 0.62),
      o.x + Math.sin(ry) * out, o.y + H - 1.15, o.z + Math.cos(ry) * out, ry,
    );
  }
}

/* ---------------------------------------------------------- the town plan */

/*
 * Where the buildings go.
 *
 * Three rules and one exception, which is all a district needs:
 *
 *   1. Shophouses stand along the main street on both sides, hard against
 *      the building line, in a run broken only by the crossing and by two
 *      alleys. A gap in a shopping street is an event, so there are two of
 *      them and they are both somewhere the camera goes.
 *   2. Shophouses line the shotengai, facing each other across six metres.
 *   3. Everything else is back blocks: masses and roofs, no frontage,
 *      filling the plots behind and thinning toward the edge of the
 *      district so the town has an outskirt rather than a wall.
 *
 * The exception is the railway. Nothing is built within five and a half
 * metres of the track, on any side, because that is where a railway's own
 * clearance is and because a building standing on a railway is the one
 * mistake in a town that everybody spots.
 */
function layout(b, rnd) {
  /* The two alleys, as z ranges to leave empty on the east side. The south
   * one is the shotengai's own entrance, quoted from shotengai.js. */
  const ALLEYS = [[14.3, 16.1], [-27.5, -25.4]];
  const inAlley = (z) => ALLEYS.some(([a, c]) => z > a && z < c);
  /* The railway's clearance. */
  const onRail = (z) => Math.abs(z) < 5.6;

  /* ---- the main street frontage ---- */
  for (const side of [-1, 1]) {
    for (let z = -44; z < 40; z += SHOP_W + 0.45) {
      if (onRail(z) || (side > 0 && inAlley(z))) {
        continue;
      }
      const cx = centerX(z) + side * (FRONT_LINE + SHOP_D * 0.5);
      shophouse(b, {
        x: cx,
        y: groundY(z),
        z,
        /* Facing the road: a shop on the east side looks west. */
        ry: side > 0 ? Math.PI * 0.5 : -Math.PI * 0.5,
        floors: rnd() < 0.78 ? 2 : 1,
        gable: rnd() < 0.28,
        rnd,
      });
    }
  }

  /* ---- the shotengai ---- */
  for (const side of [-1, 1]) {
    for (let z = SG_Z_S + 3; z < SG_Z_N - 2; z += SHOP_W + 0.35) {
      const cx = side > 0
        ? SG_X1 + SHOP_D * 0.5
        : SG_X0 - SHOP_D * 0.5;
      shophouse(b, {
        x: cx,
        y: groundY(z),
        z,
        ry: side > 0 ? Math.PI * 0.5 : -Math.PI * 0.5,
        floors: rnd() < 0.85 ? 2 : 1,
        gable: false,
        rnd,
      });
    }
  }
  /* The corridor's own paving, a shade paler than the road because a
   * shopping street is laid rather than surfaced. */
  b.put('walk', ribbon(SG_Z_S, SG_Z_N, 12, (z) => ({
    x0: SG_X0, y0: groundY(z) + 0.02, x1: SG_X1, y1: groundY(z) + 0.02,
  })), 0, 0, 0);
  /* And the alley that arrives in it from the main road, which is the whole
   * trick of the place: it cannot be seen from the crossing. */
  b.put('walk', ribbon(14.4, 16.0, 3, () => ({
    x0: centerX(15) + FRONT_LINE, y0: groundY(15) + 0.02, x1: SG_X0, y1: groundY(15) + 0.02,
  })), 0, 0, 0);

  /* ---- the plots behind ---- */
  /*
   * Laid on a loose grid rather than scattered, because a Japanese suburb is
   * platted: the blocks are irregular but the buildings inside them are
   * square to each other, and a district of randomly rotated boxes reads as
   * rubble. The rotation each block gets is small and shared by its
   * neighbours.
   */
  const EDGE_X = 46;
  const EDGE_Z = 54;
  for (let z = -EDGE_Z; z < EDGE_Z; z += 9.5) {
    /* A slight, shared skew per row of plots, so the town is not on graph
     * paper either. */
    const skew = (rnd() - 0.5) * 0.14;
    for (let x = -EDGE_X; x < EDGE_X; x += 9.0) {
      const cx = centerX(z);
      /* Clear of the street's own frontage and its footways. */
      if (Math.abs(x - cx) < FRONT_LINE + SHOP_D + 2.5) {
        continue;
      }
      /* Clear of the shotengai and its shops. */
      if (x > SG_X0 - SHOP_D - 2 && x < SG_X1 + SHOP_D + 2 && z > SG_Z_S - 3 && z < SG_Z_N + 3) {
        continue;
      }
      if (onRail(z)) {
        continue;
      }
      /*
       * Thinning outward. The district is dense in the middle and frays at
       * its edge, which is what an outskirt is: past about forty metres from
       * the street the odds of a plot being built on fall away, so the last
       * houses stand in fields rather than the town stopping at a line.
       */
      const outward = Math.max(Math.abs(x - cx) / EDGE_X, Math.abs(z) / EDGE_Z);
      if (rnd() > 1.15 - outward * 0.95) {
        continue;
      }
      const jx = (rnd() - 0.5) * 2.2;
      const jz = (rnd() - 0.5) * 2.2;
      /* Nearer the street they are two and three storeys; out at the edge
       * they are single storey houses with tiled roofs. */
      const near = 1 - Math.min(1, outward * 1.3);
      const h = 3.0 + rnd() * (1.2 + near * 5.4);
      backblock(b, {
        x: x + jx,
        y: groundY(z),
        z: z + jz,
        w: 5.0 + rnd() * 3.4,
        d: 5.0 + rnd() * 3.4,
        h,
        ry: skew + (rnd() - 0.5) * 0.06,
        gable: h < 5.2 || rnd() < 0.3,
        rnd,
      });
    }
  }
}

/* ------------------------------------------------------------- the wires */

/*
 * The poles and the cable web over the street.
 *
 * If one thing here had to survive a budget cut it would be this. A
 * Japanese suburban street is ROOFED by cable: the poles are concrete, they
 * carry a transformer and a crossarm, and eight wires sag between them in
 * catenaries at two heights. It costs about forty boxes and thirty tubes,
 * and no other forty boxes on this page do as much to say where you are.
 *
 * The heights are the town's own: a contact wire at 4.88 m, a messenger at
 * 5.95, poles reaching 9.2. The sag is real sag, a cosh, not a parabola,
 * because at these spans the difference is visible at the middle of a span
 * and a wire that hangs wrong reads as a wire that was drawn.
 */
function wires(b) {
  const SPAN = 17.5;
  const poles = [];
  let n = 0;
  for (let z = Z_NORTH + 6; z < Z_SOUTH - 4; z += SPAN) {
    n += 1;
    /*
     * NOTHING WITHIN TWELVE METRES OF THE CROSSING, and this is the one
     * clearance on the page that a camera actually depends on.
     *
     * The street wires hang at 4.88 and 5.95 m. The flight line goes down
     * the street UNDER them at 3.3 m and hops the crossing OVER the
     * railway's own catenary at 6.9, which is railway.js's number and its
     * argument: between the road and the wires there is no height that
     * clears a train. A street wire running unbroken through the crossing
     * would put a cable exactly where the camera has to rise through, so
     * the poles stop short of the tracks, which is also where they stop in
     * every real town for the same reason.
     */
    if (Math.abs(z) < 12) {
      continue;
    }
    /* Alternating sides, which is how they actually run: a street is not
     * lined with poles on one edge, it is zig zagged across. */
    const side = n % 2 === 0 ? 1 : -1;
    const x = centerX(z) + side * (ROAD_HALF + 0.75);
    const y = groundY(z);
    poles.push({ x, y, z, side });
    /* The pole. Concrete, tapered, and it goes up past the wires because a
     * pole that stops at its own crossarm looks cut off. */
    b.put('concrete', new THREE.CylinderGeometry(0.14, 0.20, POLE_H, 7), x, y + POLE_H * 0.5, z);
    /* Two crossarms, the lower one carrying the low wires. */
    b.put('metalDark', box(2.10, 0.09, 0.09), x - side * 0.55, y + WIRE_HIGH + 0.55, z, Math.PI * 0.5);
    b.put('metalDark', box(1.70, 0.08, 0.08), x - side * 0.45, y + WIRE_LOW + 0.30, z, Math.PI * 0.5);
    /* The transformer drum, on every third pole, which is about right and is
     * the one lump that gives a pole a silhouette. */
    if (n % 3 === 1) {
      b.put('metal', new THREE.CylinderGeometry(0.28, 0.28, 0.78, 9), x - side * 0.42, y + 7.05, z);
    }
    /* The street lamp, on the road side, angled out over the carriageway. */
    b.put('metalDark', box(1.35, 0.07, 0.07), x - side * 0.68, y + 5.05, z, Math.PI * 0.5);
    b.put('metal', box(0.46, 0.10, 0.20), x - side * 1.30, y + 4.98, z);
  }

  /*
   * The spans. A catenary between each pair of poles, at four heights, with
   * the pair at each height offset sideways so the web has depth.
   *
   * Tubes rather than lines: a THREE.Line is one pixel wide at any distance,
   * which means the wires vanish at the exact moment the camera is far
   * enough away for the web to be the thing you are looking at.
   */
  const SAG = [0.55, 0.62, 0.34, 0.30];
  const HEIGHT = [WIRE_HIGH, WIRE_HIGH, WIRE_LOW, WIRE_LOW];
  const LATERAL = [-0.42, 0.42, -0.30, 0.30];
  for (let i = 0; i + 1 < poles.length; i += 1) {
    const a = poles[i];
    const c = poles[i + 1];
    /* The pair either side of the crossing is not a span. Skipping the poles
     * without skipping the wire between them would draw one cable straight
     * over the tracks, which is the exact thing the gap exists to prevent. */
    if (Math.abs(c.z - a.z) > SPAN * 1.6) {
      continue;
    }
    for (let k = 0; k < HEIGHT.length; k += 1) {
      const pts = [];
      const n = LITE ? 5 : 8;
      for (let s = 0; s <= n; s += 1) {
        const t = s / n;
        /* cosh normalised so it is zero at both ends and SAG in the middle. */
        const u = (t - 0.5) * 2;
        const dip = (Math.cosh(u * 1.6) - Math.cosh(1.6)) / (1 - Math.cosh(1.6));
        pts.push(new THREE.Vector3(
          a.x + (c.x - a.x) * t - (a.side + (c.side - a.side) * t) * LATERAL[k],
          a.y + (c.y - a.y) * t + HEIGHT[k] - SAG[k] * dip,
          a.z + (c.z - a.z) * t,
        ));
      }
      const curve = new THREE.CatmullRomCurve3(pts, false, 'centripetal', 0.5);
      b.put('metalDark', new THREE.TubeGeometry(curve, n, 0.026, 3, false), 0, 0, 0);
    }
  }
  return poles;
}

/* ----------------------------------------------------------- the planting */

/*
 * The trees, as two instanced meshes and nothing else.
 *
 * Sakura along the street and around the shrine, cedars at the edge of the
 * district. Instanced because they are the only thing in the town there are
 * a hundred of, and because course.js already proved the pattern on the race
 * field's treeline.
 *
 * The blossom is a cluster of three lumps rather than one ball. A cherry in
 * flower is not a sphere on a stick, it is two or three masses with sky
 * between them, and the sky between them is what makes a row of them read
 * as trees instead of as lollipops.
 */
function planting(group, rnd) {
  const sites = [];
  /*
   * Along the street, at the BACK of the footway, and small.
   *
   * A cherry overhanging a street is right, and a cherry overhanging the
   * flight line is a wall of pink filling a 104 degree lens for half a
   * second. The first pass put them a metre inside the footway at full size
   * and their canopies reached to within two metres of the road centre,
   * which is exactly where the camera goes.
   *
   * So the street trees stand hard against the building line and carry a
   * tighter canopy: `spread` is how far the blossom masses sit from the
   * trunk and `rad` is how big they are, and the two of them together decide
   * whether a tree is scenery or an obstacle. The ones out in the district
   * keep their full size, because nothing flies through those.
   */
  for (let z = Z_NORTH + 12; z < Z_SOUTH - 8; z += 13.5) {
    if (Math.abs(z) < 9) {
      continue;
    }
    const side = rnd() < 0.5 ? 1 : -1;
    sites.push({
      x: centerX(z) + side * (ROAD_HALF + WALK_W * 0.86),
      y: groundY(z),
      z: z + (rnd() - 0.5) * 3,
      s: 0.62 + rnd() * 0.22,
      spread: 0.34,
      rad: [0.62, 0.30],
    });
  }
  /* A stand of them by the shrine and along the far edge of the district. */
  for (let i = 0; i < (LITE ? 16 : 30); i += 1) {
    const a = rnd() * Math.PI * 2;
    const r = 24 + rnd() * 30;
    const x = Math.cos(a) * r;
    const z = Math.sin(a) * r * 1.15;
    if (Math.abs(x - centerX(z)) < FRONT_LINE + 3 || Math.abs(z) < 7) {
      continue;
    }
    sites.push({
      x, y: groundY(z), z, s: 0.8 + rnd() * 0.6, spread: 0.62, rad: [0.95, 0.55],
    });
  }

  const trunkGeo = new THREE.CylinderGeometry(0.11, 0.19, 2.4, 6);
  trunkGeo.translate(0, 1.2, 0);
  const trunkMat = celMaterial({ color: PAL.trunk, rim: 0.16, spec: 0.0 });
  const trunks = new THREE.InstancedMesh(trunkGeo, trunkMat, sites.length);

  /* Three lumps per tree, so the blossom mesh carries three times the
   * instances the trunk does. */
  const LUMPS = 3;
  const blobGeo = new THREE.IcosahedronGeometry(1, LITE ? 0 : 1);
  const blobMat = celMaterial({ color: 0xffffff, rim: 0.22, spec: 0.0 });
  const blobs = new THREE.InstancedMesh(blobGeo, blobMat, sites.length * LUMPS);
  const TONES = [PAL.blossom, PAL.blossomDeep, PAL.blossomLight];

  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const p = new THREE.Vector3();
  const v = new THREE.Vector3();
  const col = new THREE.Color();
  for (let i = 0; i < sites.length; i += 1) {
    const t = sites[i];
    q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), rnd() * Math.PI);
    p.set(t.x, t.y, t.z);
    v.set(t.s, t.s, t.s);
    m.compose(p, q, v);
    trunks.setMatrixAt(i, m);
    for (let k = 0; k < LUMPS; k += 1) {
      const a = (k / LUMPS) * Math.PI * 2 + rnd() * 0.8;
      const r = t.spread * (0.75 + rnd() * 0.6);
      const rad = (t.rad[0] + rnd() * t.rad[1]) * t.s;
      p.set(t.x + Math.cos(a) * r * t.s, t.y + (2.4 + rnd() * 0.9) * t.s, t.z + Math.sin(a) * r * t.s);
      /* Squashed, because a blossom mass is wider than it is tall. */
      v.set(rad, rad * 0.74, rad);
      m.compose(p, q, v);
      blobs.setMatrixAt(i * LUMPS + k, m);
      col.setHex(TONES[Math.floor(rnd() * TONES.length)]);
      blobs.setColorAt(i * LUMPS + k, col);
    }
  }
  trunks.instanceMatrix.needsUpdate = true;
  blobs.instanceMatrix.needsUpdate = true;
  if (blobs.instanceColor) {
    blobs.instanceColor.needsUpdate = true;
  }
  group.add(trunks, blobs);

  /*
   * The cedars at the district's edge, which are the town's own horizon.
   *
   * Same three tier lathe as the race field's treeline in course.js and the
   * same argument for it: a cone is not a tree and a ring of cones is a
   * sawtooth. They are a MeshBasicMaterial for the reason given there too,
   * that a distant treeline at golden hour is a silhouette rather than a lit
   * shape, and scene fog is exactly what turns an unlit flat colour into
   * distance.
   */
  const cedarGeo = new THREE.LatheGeometry([
    new THREE.Vector2(0.00, 0.000),
    new THREE.Vector2(1.00, 0.030),
    new THREE.Vector2(0.54, 0.300),
    new THREE.Vector2(0.82, 0.330),
    new THREE.Vector2(0.40, 0.620),
    new THREE.Vector2(0.62, 0.650),
    new THREE.Vector2(0.00, 1.000),
  ], SEG.round - 1);
  const cedarMat = new THREE.MeshBasicMaterial({ color: PAL.cedar, fog: true });
  const CEDARS = LITE ? 110 : 240;
  const cedars = new THREE.InstancedMesh(cedarGeo, cedarMat, CEDARS);
  for (let i = 0; i < CEDARS; i += 1) {
    const a = (i / CEDARS) * Math.PI * 2 + (rnd() - 0.5) * 0.12;
    /*
     * WHERE THE TREELINE STANDS IS THE WHOLE ANSWER TO THE CLOSING SHOT.
     *
     * The brief on the pull back is that the colour must not run out of the
     * city: at the last frame the district still has to fill the frame to the
     * horizon. The buildings stop fraying at about fifty metres, so from
     * there outward there has to be SOMETHING, and woodland is the honest
     * thing to put there.
     *
     * IT REACHES 227 m, NOT 134. At 134 the closing camera saw a belt of
     * trees and then eighty metres of flat ground running away into haze,
     * which is a brown band across the top quarter of the last frame of the
     * page. A ring of low hills was tried out there and did not work: at
     * three hundred metres the fog leaves a hill about a shade off the sky,
     * so what arrived was a set of faint outlines crossing each other like
     * panes of glass. Trees work where hills do not, because they are small
     * enough that a hundred of them at graduated distances become a
     * gradient rather than a shape, which is what a wooded horizon actually
     * is.
     *
     * The 0.78 power biases them inward, so the belt is dense where the town
     * ends and thins as it goes, and the far ones are taller, which is what
     * stops the whole thing reading as one hedge.
     */
    const spread = Math.pow(rnd(), 0.78);
    const r = 60 + spread * 167;
    const x = Math.cos(a) * r;
    const z = Math.sin(a) * r * 1.1;
    const hgt = 6.5 + spread * 5 + rnd() * rnd() * 13;
    const wid = hgt * (0.42 + rnd() * 0.20);
    p.set(x, groundY(z) - 0.4, z);
    v.set(wid, hgt, wid);
    q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), rnd() * Math.PI);
    m.compose(p, q, v);
    cedars.setMatrixAt(i, m);
  }
  cedars.instanceMatrix.needsUpdate = true;
  group.add(cedars);

  return { trunks, blobs, cedars };
}

/* ------------------------------------------------------------- the shrine */

/*
 * A torii, a flight of steps and a stone lantern, on the rise west of the
 * street.
 *
 * Eleven boxes for the most legible silhouette in the country. It is not on
 * the flight line and it is not meant to be: it is what the eye finds on the
 * pass over the roofs, which is the shot that most needs somewhere to land.
 */
function shrine(b) {
  const z = -21;
  const x = centerX(z) - 21;
  const y = groundY(z) + 0.6;

  for (let i = 0; i < 4; i += 1) {
    b.put('concrete', box(6.4 - i * 0.35, 0.22, 1.0), x + 8 - i * 0.9, y - 0.9 + i * 0.22, z);
  }

  /* The torii. Two tapered posts, a curved lintel over them, and the second
   * beam under it, which is the proportion that makes it read. */
  const H = 4.3;
  const halfSpan = 2.1;
  for (const s of [-1, 1]) {
    b.put('red', new THREE.CylinderGeometry(0.16, 0.20, H, 9), x, y + H * 0.5, z + s * halfSpan);
  }
  b.put('red', box(0.34, 0.30, halfSpan * 2 + 1.5), x, y + H + 0.10, z);
  b.put('redDeep', box(0.40, 0.16, halfSpan * 2 + 1.9), x, y + H + 0.32, z);
  b.put('red', box(0.24, 0.22, halfSpan * 2 + 0.3), x, y + H - 0.75, z);
  b.put('red', box(0.30, 0.42, 0.30), x, y + H - 0.50, z);

  /* A stone lantern beside the steps, and a shrine roof back in the trees. */
  b.put('concrete', new THREE.CylinderGeometry(0.24, 0.30, 0.9, 7), x + 2.4, y + 0.45, z + 2.6);
  b.put('concrete', box(0.62, 0.44, 0.62), x + 2.4, y + 1.12, z + 2.6);
  b.put('concrete', box(0.92, 0.16, 0.92), x + 2.4, y + 1.42, z + 2.6);
  b.put('roofBrown', box(4.6, 0.26, 3.8), x - 5.5, y + 3.1, z, 0.1);
  b.put('wallCream', box(4.0, 3.0, 3.2), x - 5.5, y + 1.5, z, 0.1);
}

/* ------------------------------------------------------- the lit things */

/*
 * The four things in the district that emit rather than reflect.
 *
 * They are basic materials, which is cel.js's own rule: a cel surface that
 * glows is a basic material, not that one. They are also the entire reason
 * the town reads as evening. Under a low sun a pale wall is warm and a
 * slate roof is cool and that is a picture of a town in the afternoon; add
 * four lit surfaces and it becomes a picture of a town at the end of a day,
 * which is the hour the rest of this page has been in since the field.
 */
function litThings(b, rnd) {
  /*
   * The lantern string over the shotengai. Paper lanterns on a wire strung
   * between the shopfronts, which is what a shopping street in this country
   * has instead of streetlights, and the single warmest thing in the town.
   */
  const strings = LITE ? 5 : 8;
  for (let i = 0; i < strings; i += 1) {
    const z = SG_Z_S + 1.5 + ((SG_Z_N - SG_Z_S - 3) * i) / (strings - 1);
    const y = groundY(z) + 4.35;
    /* The wire, sagging. Across the corridor rather than along it, which is
     * how they are hung: each string is one span between two buildings. */
    const pts = [];
    for (let s = 0; s <= 6; s += 1) {
      const t = s / 6;
      const dip = Math.sin(t * Math.PI) * 0.26;
      pts.push(new THREE.Vector3(SG_X0 - 0.4 + (SG_X1 - SG_X0 + 0.8) * t, y - dip, z));
    }
    b.put(
      'metalDark',
      new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, false, 'centripetal', 0.5), 6, 0.018, 3, false),
      0, 0, 0,
    );
    /* Five lanterns hanging off it. */
    for (let k = 1; k <= 5; k += 1) {
      const t = k / 6;
      const dip = Math.sin(t * Math.PI) * 0.26;
      const lx = SG_X0 - 0.4 + (SG_X1 - SG_X0 + 0.8) * t;
      b.put('lantern', new THREE.CylinderGeometry(0.17, 0.17, 0.30, 8), lx, y - dip - 0.28, z);
      b.put('redDeep', new THREE.CylinderGeometry(0.09, 0.09, 0.05, 8), lx, y - dip - 0.44, z);
      b.put('metalDark', box(0.02, 0.14, 0.02), lx, y - dip - 0.07, z);
    }
  }

  /*
   * Vending machines. Six of them, standing against shopfronts on the main
   * street and in the shotengai, which is roughly the density this country
   * actually has and is funnier than it sounds: a lit white box on a dark
   * footway is a landmark you can navigate by.
   */
  const vends = [
    [FRONT_LINE - 0.55, 26], [-(FRONT_LINE - 0.55), 12],
    [FRONT_LINE - 0.55, -14], [-(FRONT_LINE - 0.55), -32],
  ];
  for (const [off, z] of vends) {
    const x = centerX(z) + off;
    const y = groundY(z) + WALK_H;
    const face = off > 0 ? -Math.PI * 0.5 : Math.PI * 0.5;
    b.put('metalDark', box(1.10, 1.85, 0.72), x, y + 0.925, z, face);
    b.put('vend', new THREE.PlaneGeometry(1.02, 1.72), x + (off > 0 ? -0.37 : 0.37), y + 0.95, z, face);
  }
  for (const z of [22, 33]) {
    b.put('metalDark', box(1.10, 1.85, 0.72), SG_X0 + 0.42, groundY(z) + WALK_H + 0.925, z, -Math.PI * 0.5);
    b.put('vend', new THREE.PlaneGeometry(1.02, 1.72), SG_X0 + 0.79, groundY(z) + WALK_H + 0.95, z, Math.PI * 0.5);
  }

  /* The crossing's own lamps, one lit and one dark, because they alternate
   * and a still frame catches one of each. */
  for (const zs of [-1, 1]) {
    const sx = centerX(0) + (ROAD_HALF + 1.05);
    const sz = zs * (GATE_Z + 0.5);
    b.put('signalLamp', new THREE.CircleGeometry(0.115, 10), sx - 0.28, groundY(0) + 3.05, sz + zs * 0.06, zs > 0 ? 0 : Math.PI);
    b.put('signalOff', new THREE.CircleGeometry(0.115, 10), sx + 0.28, groundY(0) + 3.05, sz + zs * 0.06, zs > 0 ? 0 : Math.PI);
  }
}

/* -------------------------------------------------------------- the train */

/*
 * A three car suburban set on the line, and it MOVES.
 *
 * It is the only thing in the district that does, and it earns the exception
 * twice over. The barriers at the crossing are down, and a crossing with its
 * barriers down and no train is a piece of scenery with a mistake in it. And
 * a town where nothing moves is a model of a town: one train crossing the
 * frame is the difference between a diorama and a place.
 *
 * Its position is a pure function of the act's own parameter, exactly like
 * everything else on this page, so a scrubbed frame is a reproducible frame
 * and a dropped frame changes nothing. It is not on a clock.
 *
 * The dimensions are a Japanese commuter EMU: 20 m over the body, 2.95 m
 * wide, the floor at 1.15 m and the roof at 3.96, which railway.js gives as
 * the reason its own camera has to clear the crossing at 6.9 m.
 */
const CAR_L = 20.0;
const CAR_W = 2.95;
const CAR_H = 2.81;
const FLOOR_Y = 1.15;

function buildTrain() {
  const g = new THREE.Group();
  const y = groundY(0);
  const body = celMaterial({
    color: 0xffffff, map: canvasTexture(1024, 256, paintTrain), rim: 0.26, spec: 0.30,
  });
  const roof = celMaterial({ color: PAL.trainRoof, rim: 0.30, spec: 0.35 });
  const end = celMaterial({ color: PAL.trainBody, rim: 0.26, spec: 0.30 });
  const skirt = celMaterial({ color: PAL.trainSkirt, rim: 0.20, spec: 0.10 });
  const glass = new THREE.MeshBasicMaterial({ color: LIT.window, fog: true });
  const dark = celMaterial({ color: PAL.black, rim: 0.24, spec: 0.20 });

  for (let c = 0; c < 3; c += 1) {
    const cx = (c - 1) * (CAR_L + 0.6);
    /* The sides carry the print; the ends and the roof do not, so a
     * three car set is four materials rather than one atlas with a
     * carriage end painted on the back of it. */
    for (const s of [-1, 1]) {
      const side = new THREE.Mesh(new THREE.PlaneGeometry(CAR_L, CAR_H), body);
      side.position.set(cx, y + FLOOR_Y + CAR_H * 0.5, s * CAR_W * 0.5);
      side.rotation.y = s > 0 ? 0 : Math.PI;
      g.add(side);
    }
    const shell = new THREE.Mesh(box(CAR_L - 0.06, CAR_H, CAR_W - 0.02), end);
    shell.position.set(cx, y + FLOOR_Y + CAR_H * 0.5, 0);
    g.add(shell);
    const top = new THREE.Mesh(box(CAR_L, 0.34, CAR_W - 0.16), roof);
    top.position.set(cx, y + FLOOR_Y + CAR_H + 0.14, 0);
    g.add(top);
    const under = new THREE.Mesh(box(CAR_L - 0.8, 0.62, CAR_W - 0.35), skirt);
    under.position.set(cx, y + FLOOR_Y - 0.31, 0);
    g.add(under);
    /* Bogies, which are what stop a carriage floating: two dark blocks under
     * every car at the quarter points, and they read from a long way off. */
    for (const s of [-1, 1]) {
      const bogie = new THREE.Mesh(box(2.5, 0.72, CAR_W - 0.55), dark);
      bogie.position.set(cx + s * CAR_L * 0.31, y + 0.36, 0);
      g.add(bogie);
    }
    /* The pantograph on the middle car, folded, because it is the one part
     * of a train that says electric. */
    if (c === 1) {
      const pan = new THREE.Mesh(box(1.9, 0.06, 0.06), dark);
      pan.position.set(cx, y + FLOOR_Y + CAR_H + 0.85, 0);
      pan.rotation.z = 0.32;
      g.add(pan);
      const arm = new THREE.Mesh(box(1.7, 0.05, 0.05), dark);
      arm.position.set(cx + 0.1, y + FLOOR_Y + CAR_H + 0.60, 0);
      arm.rotation.z = -0.40;
      g.add(arm);
    }
    /* The cab windows on the leading and trailing ends. */
    if (c === 0 || c === 2) {
      const cab = new THREE.Mesh(new THREE.PlaneGeometry(CAR_W - 0.7, 0.95), glass);
      const s = c === 0 ? -1 : 1;
      cab.position.set(cx + s * (CAR_L * 0.5 + 0.02), y + FLOOR_Y + CAR_H * 0.66, 0);
      cab.rotation.y = s * Math.PI * 0.5;
      g.add(cab);
    }
  }
  return g;
}

/*
 * The railway's own overhead, which crosses the street at right angles.
 *
 * Two masts and a catenary: a contact wire at 4.88 m and a messenger at
 * 5.95, from railway.js. It is four meshes and it is the reason the hop
 * over the crossing is 6.9 m rather than a number somebody liked, so it is
 * built even though a viewer will never consciously see it. A clearance
 * that is not there to be cleared is a clearance somebody will delete.
 */
function catenary(b) {
  const y = groundY(0);
  const MAST_H = 6.8;
  for (const x of [-26, -9, 9, 26]) {
    b.put('metalDark', new THREE.CylinderGeometry(0.10, 0.14, MAST_H, 7), x, y + MAST_H * 0.5, CROSS_BAND + 0.6);
    b.put('metalDark', box(0.08, 0.08, CROSS_BAND + 0.9), x, y + MAST_H - 0.4, (CROSS_BAND + 0.9) * 0.5);
  }
  for (const [h, r] of [[WIRE_LOW, 0.022], [WIRE_HIGH, 0.028]]) {
    const pts = [];
    for (let i = 0; i <= 10; i += 1) {
      const t = i / 10;
      const x = -70 + 140 * t;
      /* Sagging between the masts rather than over the whole run, which is
       * what a catenary does: it is re-tensioned at every mast. */
      const local = ((x + 70) % 17) / 17;
      const dip = Math.sin(local * Math.PI) * (h === WIRE_HIGH ? 0.10 : 0.05);
      pts.push(new THREE.Vector3(x, y + h - dip, 0));
    }
    b.put(
      'metalDark',
      new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, false, 'centripetal', 0.5), 12, r, 3, false),
      0, 0, 0,
    );
  }
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
 * The shotengai is still there. It is flown OVER on the way out and it is in
 * the closing shot, and the main street turned out to be the better corridor
 * anyway: it is longer, it has the crossing at the end of it, and its
 * shopfronts stand nine metres apart rather than six, which is the
 * difference between a corridor and a slot.
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
    new THREE.Vector3(entry.x + away.x * 17, entry.y + 7, entry.z + away.z * 17),
    new THREE.Vector3(entry.x + away.x * 26, entry.y + 19, entry.z + away.z * 26),

    /* ---- the transit, over the wood between the two places ---- */
    at(-15, 27, 96),
    at(-9, 31, 74),
    at(-5, 27, 58),

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
    road(-47, 18.0),

    /* ---- and away east over the roofs, turning off the road rather than
           back down it, so the last thing the act does is open the district
           out for the shot that follows it ---- */
    at(centerX(-52) + 10, 20.5, -52),
    at(centerX(-48) + 24, 21.5, -46),
    at(27, 22.0, -36),
  ], false, 'centripetal', 0.5);
}

/* ------------------------------------------------------------------ build */

/*
 * Where the town stands, in the race field's own coordinates.
 *
 * NORTH OF THE FIELD, AND FAR ENOUGH TO BE A JOURNEY. The race field's
 * treeline stands in a ring 66 to 144 m out (course.js), so a town closer
 * than that would have the field's own wood growing through its streets and
 * a town much further would be a transit rather than a transition. At 138 m
 * the wood between them is real, the flight over it takes a few seconds,
 * and the town is inside the fog's 302 m reach with most of its colour
 * intact.
 *
 * IT IS ON THE SIDE THE CLOSING SHOT ALREADY LOOKS AT. The close orbits
 * from the south east looking roughly north, which is why the town goes
 * north: it is already in the background of the last shot the page had
 * before this act existed, so putting it there makes the closing frame a
 * wider version of a shot the page was already composing rather than a new
 * one bolted on.
 *
 * THE HEIGHT IS EXACTLY ZERO, and it was briefly not.
 *
 * The race field's deck is one 700 m quad at y = 0 and the town lays its
 * carriageway at +0.012 above its own origin. Sinking the origin by two
 * centimetres to "be safe" put the whole road surface eight millimetres
 * UNDER the deck, so the town's streets were mown grass with a white line
 * painted down them. The clearance the paving needs is the one it already
 * has; the origin must not spend it.
 */
export const CITY_ORIGIN = new THREE.Vector3(0, 0, -138);

/*
 * How far the town reaches, for anything that needs to know.
 *
 * BUILT_R is where the buildings stop fraying and TREE_R is where the
 * woodland around them stops, and together they are what the closing shot's
 * pull back is capped against: the brief on that shot was that the colour
 * must not run out of the city, and past the trees there is nothing but
 * deck. See CLOSE_DIST in main.js, which does the trigonometry against
 * these two numbers.
 */
export const BUILT_R = 52;
export const TREE_R = 227;

export function buildCity() {
  const group = new THREE.Group();
  group.name = 'city';
  group.position.copy(CITY_ORIGIN);

  const mats = materials();
  const b = bins(mats);
  const rnd = stream(0x0c17a9);

  surface(b);
  crossing(b);
  catenary(b);
  layout(b, rnd);
  wires(b);
  shrine(b);
  litThings(b, rnd);
  const meshes = b.build(group);

  const green = planting(group, rnd);

  const train = buildTrain();
  group.add(train);

  /*
   * The train's run, as a pure function of the act's own parameter: 0 has it
   * approaching from the east, 0.5 has its middle car on the road, and 1 has
   * it clear to the west with its tail still near the barriers.
   *
   * EIGHTY METRES, NOT TWO HUNDRED, and the reason is the barriers. They are
   * built down, because a crossing with its barriers up is street furniture
   * and a crossing with them down is a moment. Down means a train is coming,
   * so the set is never allowed off the end of the district: at either
   * extreme of this run it is still inside the town, still on rails, and
   * still an explanation for the barriers. A train that slid away over the
   * horizon would leave four lowered booms and nothing to lower them for.
   */
  function setTrain(k) {
    const t = Math.max(0, Math.min(1, k));
    train.position.x = 40 - t * 80;
  }
  setTrain(0);

  /*
   * The town is BUILT once and SHOWN twice, and the two are separate on
   * purpose.
   *
   * Everything above happens at import, which costs about a fifth of a
   * second and happens while the boot bar is still up. What must not happen
   * is drawing it: for the whole of the studio act the camera is 1.4 m from
   * a 155 mm airframe with a 22 m far plane, and a district 138 m away is
   * thirty draw calls the frame cannot see and would still pay for.
   */
  function setShown(on) {
    group.visible = !!on;
  }
  setShown(false);

  return {
    group,
    meshes,
    green,
    train,
    setTrain,
    setShown,
    origin: CITY_ORIGIN,
    /* The town's own centre in world space, which is what a camera looking
     * AT the district should aim at. It is not the crossing: the district
     * runs further north than south of it, so the crossing is off centre and
     * a shot framed on it puts the town in the bottom of the frame. */
    heart: new THREE.Vector3(CITY_ORIGIN.x + 6, CITY_ORIGIN.y + 4, CITY_ORIGIN.z - 6),
  };
}
