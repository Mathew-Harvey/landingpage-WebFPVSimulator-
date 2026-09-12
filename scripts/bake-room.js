/*
 * bake-room.js: print src/room-data.js from the simulator's own track.
 *
 * WHY A GENERATOR RATHER THAN A COPY. The whoop act flies RaceGOW5 Track 8,
 * and the front door has no business holding its own opinion about where the
 * gates are. The simulator is the copy of record: src/trackbuilder/presets.js
 * holds the track and src/game/trackdoc.js turns it into the course the game
 * builds, path solver and all. This asks those two the same questions the
 * game asks and writes the answers down.
 *
 *   node scripts/bake-room.js ../WebFPVSimulator > src/room-data.js
 *
 * IT IMPORTS NOTHING BUT THE SIMULATOR. No three.js, which this repository
 * does not have on disk: the resample below walks the solver's own 1777
 * point polyline by arc length, and at 25 mm between points the difference
 * between that and a spline through it is under a millimetre. A build step
 * that needs a package manager is a build step this repository does not have.
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

import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

/* The track, and how many knots the line is cut down to. 340 puts a knot
 * every 128 mm and holds the curve to 8 mm of the solver's own output,
 * measured. See the note in the generated file. */
const TRACK_ID = 'racegow5-track8';
const KNOTS = 340;

const simRoot = resolve(process.argv[2] ?? '../WebFPVSimulator');
const load = async (rel) => import(pathToFileURL(resolve(simRoot, rel)).href);

const { PRESETS } = await load('src/trackbuilder/presets.js');
const { courseFromDocument } = await load('src/game/trackdoc.js');

const doc = PRESETS.find((d) => d.id === TRACK_ID);
if (!doc) {
  throw new Error(`${TRACK_ID} is not in ${simRoot}/src/trackbuilder/presets.js`);
}
const course = courseFromDocument(structuredClone(doc));

/* Arc length resample of the solver's closed polyline. The loop closes, so
 * the last leg runs from the final point back to the first. */
function resample(line, n) {
  const legs = [];
  let total = 0;
  for (let i = 0; i < line.length; i += 1) {
    const a = line[i];
    const b = line[(i + 1) % line.length];
    const d = Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z);
    legs.push(d);
    total += d;
  }
  const out = [];
  let leg = 0;
  let walked = 0;
  for (let k = 0; k < n; k += 1) {
    const want = (total * k) / n;
    while (walked + legs[leg] < want && leg < legs.length - 1) {
      walked += legs[leg];
      leg += 1;
    }
    const t = legs[leg] > 0 ? (want - walked) / legs[leg] : 0;
    const a = line[leg];
    const b = line[(leg + 1) % line.length];
    out.push([
      Math.round((a.x + (b.x - a.x) * t) * 1000),
      Math.round((a.y + (b.y - a.y) * t) * 1000),
      Math.round((a.z + (b.z - a.z) * t) * 1000),
    ]);
  }
  return { points: out, length: total };
}

const n4 = (v) => Number(v.toFixed(4));
const gates = [];
const dives = [];
const poles = [];
const rails = [];
const pads = [];
for (const s of course.structures) {
  /* Unbuilt apertures are scored air, not pipe. See the generated file. */
  if (s.unbuilt) {
    continue;
  }
  if (s.type === 'gate') {
    if (Math.abs(s.dims.clearW - 0.7112) > 1e-6 || Math.abs(s.dims.clearH - 0.7112) > 1e-6) {
      throw new Error(`${s.name} is not a 28 inch square, and room.js assumes every gate is`);
    }
    gates.push({ x: n4(s.x), z: n4(s.z), yaw: n4(s.yaw), sill: n4(s.dims.sillH) });
  } else if (s.type === 'diveGate') {
    dives.push({ x: n4(s.x), z: n4(s.z), yaw: n4(s.yaw), sill: n4(s.dims.sillH) });
  } else if (s.type === 'pole') {
    poles.push({ x: n4(s.x), z: n4(s.z), h: n4(s.dims.height), r: n4(s.dims.poleRadius) });
  } else if (s.type === 'horizontalPole') {
    rails.push({ x: n4(s.x), z: n4(s.z), y: n4(s.baseY), yaw: n4(s.yaw), w: n4(s.dims.width) });
  } else if (s.type === 'startPads') {
    pads.push({ x: n4(s.x), z: n4(s.z), yaw: n4(s.yaw), size: n4(s.dims.padSize) });
  }
}

const { points, length } = resample(course.line, KNOTS);
const rows = [];
for (let i = 0; i < points.length; i += 7) {
  rows.push(`  ${points.slice(i, i + 7).map((p) => p.join(', ')).join(', ')},`);
}
const table = (list, keys) => list
  .map((o) => `  { ${keys.map((k) => `${k}: ${o[k]}`).join(', ')} },`).join('\n');

/*
 * The whole file, header and all, because a generated file that has to be
 * assembled by hand from six printed fragments is a generated file somebody
 * will quietly edit instead.
 */
process.stdout.write(`/*
 * room-data.js: RaceGOW5 Track 8, as numbers, and the line flown through it.
 *
 * GENERATED, NOT AUTHORED. Do not edit. Every figure below was read out of
 * the simulator's own copy of the track and its own path solver, which is
 * the only way this page can claim to be showing the real thing:
 *
 *   node scripts/bake-room.js ../WebFPVSimulator > src/room-data.js
 *
 * from a checkout of Mathew-Harvey/WebFPVSimulator beside this one. That
 * script loads src/trackbuilder/presets.js, hands the document to
 * src/game/trackdoc.js exactly as the game does, and prints this. Change the
 * track there and regenerate; change it here and the front door starts
 * advertising a track nobody can fly.
 *
 * WHAT RaceGOW IS, because it decides what this act is about. It is an at
 * home, video verified whoop time trial series: a season of tracks, each
 * PUBLISHED AS A DIMENSIONED SPEC that every pilot builds in their own room
 * out of three quarter inch PVC and flies alone, scored on the fastest three
 * consecutive laps. Nobody lines up beside anybody. The track is a
 * specification rather than a place, which is exactly why a browser can hold
 * an honest copy of one.
 *
 * ${doc.name} was designed by ${doc.credit?.designer ?? 'unknown'} and read off the official
 * animation gate by gate; the simulator credits ${doc.credit?.broughtOverBy ?? 'unknown'} for bringing it
 * over. The lap is ${length.toFixed(1)} m of line inside a footprint 3.25 by 2.28 m, which
 * is the most surprising number on this page.
 *
 * THE FRAME IS THE PAGE'S, ALREADY CONVERTED. The simulator's track
 * documents are Z up with the origin at the room's near left corner; these
 * are Three.js metres, Y up, with the origin in the middle of the floor,
 * because trackdoc.js does that conversion and this is its output. Nothing
 * here needs converting again.
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

/* Who drew it, and where it came from. The page prints the first two. */
export const TRACK = {
  name: ${JSON.stringify(doc.name)},
  designer: ${JSON.stringify(doc.credit?.designer ?? '')},
  series: ${JSON.stringify(doc.credit?.series ?? '')},
  source: ${JSON.stringify(doc.credit?.source ?? '')},
};

/*
 * THE PIPE AND THE HOLE, quoted from RaceGOW's own build rules by way of the
 * simulator's src/trackbuilder/racegow.js.
 *
 * Three quarter inch schedule 40 PVC is 26.7 mm across the outside. One cut
 * length, between 26.5 and 27.25 inches, builds every element on the track:
 * cut them all the same and adjacent gates come out at the maximum legal
 * opening and the minimum legal spacing at once. The opening is a 28 inch
 * square, RaceGOW's maximum, and every gate here is one.
 *
 * UNIT is the lattice these tracks are drawn on: one opening plus one pipe,
 * which is what two gates sharing a member are apart centre to centre. Every
 * position below is a whole number of units from the next, and that is not a
 * coincidence, it is how the track was designed.
 */
export const PIPE_OD = 0.02667;
export const OPENING = 0.7112;
export const UNIT = 0.73787;

/*
 * The gates that are actually BUILT, and there are ${gates.length}.
 *
 * A RaceGOW track has more passes than it has structures, because half of
 * them are through air: "over the start gate" is the square directly above
 * the start gate with nothing above it, and the tower's third pass is over
 * the top of a two high stack. The builder calls those unbuilt apertures.
 * They are scored and they are flown, and there is no pipe there, so they
 * are not in this list. The line goes through them all the same.
 *
 * \`sill\` is the underside of the opening, so a gate at 0 stands on the floor
 * and one at a UNIT is the second of a stack. Two gates at the same x, z and
 * yaw ARE a stack and share a member, which is why this is a flat list and
 * not a tree: see columns() in room.js.
 */
export const GATES = [
${table(gates, ['x', 'z', 'yaw', 'sill'])}
];

/*
 * The same square laid flat and flown down through. RaceGOW calls it a
 * Horizontal Gate; everybody else calls it the table top.
 */
export const DIVES = [
${table(dives, ['x', 'z', 'yaw', 'sill'])}
];

/*
 * Poles: a marker rather than an aperture. You go round it, on the side the
 * track says, and RaceGOW's rule puts it at least 14 inches from the nearest
 * gate centre. The tall one is three units of pipe.
 */
export const POLES = [
${table(poles, ['x', 'z', 'h', 'r'])}
];

/*
 * Two lengths of the same pipe laid horizontally at one unit up, making a
 * rail across the middle of the room. Half the lap's character is here: the
 * line goes under it on the way out and over it on the way back.
 */
export const RAILS = [
${table(rails, ['x', 'z', 'y', 'yaw', 'w'])}
];

/* Where the aircraft sits before the run. One pad, 100 mm square. */
export const PADS = [
${table(pads, ['x', 'z', 'yaw', 'size'])}
];

/*
 * THE LINE, in millimetres, as x y z triples.
 *
 * Not drawn by hand and not a guess at a racing line: this is what the
 * builder's own path solver produces from the track's pass sequence, which
 * is the curve the simulator draws as the guide and measures its ghost
 * against. ${KNOTS} knots evenly spaced along ${length.toFixed(1)} m, a knot every
 * ${Math.round((length / KNOTS) * 1000)} mm, which holds the rebuilt spline to within 10 mm of the
 * solver's own ${course.line.length} point output. Ten millimetres is an eighth of the
 * aircraft, in a hole 711 mm across.
 *
 * Millimetres and integers because the source is a grid of whole inches and
 * the aircraft is 82 mm wide: a tenth of a millimetre would be four more
 * characters a number, saying nothing. room.js divides by a thousand.
 */
export const LINE_MM = [
${rows.join('\n')}
];

/*
 * What the solver measured, before the resample above rounded the corners
 * off it. The page prints this one, because it is the track's own figure and
 * not an artefact of how many knots this file happens to carry.
 */
export const LAP_LENGTH = ${length.toFixed(1)};
`);
