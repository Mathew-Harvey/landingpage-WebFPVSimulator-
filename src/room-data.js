/*
 * room-data.js: RaceGOW5 Track 1, as numbers, and the line flown through it.
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
 * RaceGOW5 Track 1 was designed by Skittles and read off the official
 * animation gate by gate; the simulator credits andAgainFPV for bringing it
 * over. The lap is 14.4 m of line inside a footprint 3.54 by 2.00 m
 * and 1.25 m off the floor at its highest, which is the most surprising
 * set of numbers on this page.
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
  name: "RaceGOW5 Track 1",
  designer: "Skittles",
  series: "RaceGOW5",
  source: "racegow.com/tracks, the official Track 1 animation",
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
 * The gates that are actually BUILT, and there are 4.
 *
 * A RaceGOW track has more passes than it has structures, because half of
 * them are through air: "over the start gate" is the square directly above
 * the start gate with nothing above it, and the tower's third pass is over
 * the top of a two high stack. The builder calls those unbuilt apertures.
 * They are scored and they are flown, and there is no pipe there, so they
 * are not in this list. The line goes through them all the same.
 *
 * `sill` is the underside of the opening, so a gate at 0 stands on the floor
 * and one at a UNIT is the second of a stack. Two gates at the same x, z and
 * yaw ARE a stack and share a member, which is why this is a flat list and
 * not a tree: see columns() in room.js.
 */
export const GATES = [
  { x: -0.7341, z: -0.4154, yaw: 1.5708, sill: 0 },
  { x: 0.7417, z: 0.3225, yaw: 1.5708, sill: 0 },
  { x: 0.7417, z: 0.3225, yaw: 1.5708, sill: 0.7379 },
  { x: -0.3651, z: 0.6914, yaw: 3.1416, sill: 0 },
];

/*
 * The same square laid flat and flown down through. RaceGOW calls it a
 * Horizontal Gate; everybody else calls it the table top.
 */
export const DIVES = [

];

/*
 * Poles: a marker rather than an aperture. You go round it, on the side the
 * track says, and RaceGOW's rule puts it at least 14 inches from the nearest
 * gate centre. The tall one is three units of pipe.
 */
export const POLES = [
  { x: -0.0095, z: 0.6914, h: 1.4757, r: 0.0133 },
];

/*
 * Two lengths of the same pipe laid horizontally at one unit up, making a
 * rail across the middle of the room. Half the lap's character is here: the
 * line goes under it on the way out and over it on the way back.
 */
export const RAILS = [
  { x: 0.3727, z: 0.6914, y: 0, yaw: 0, w: 0.7379 },
  { x: -0.7341, z: 0.3225, y: 0, yaw: 1.5708, w: 0.7379 },
];

/* Where the aircraft sits before the run. One pad, 100 mm square. */
export const PADS = [
  { x: -1.1768, z: -0.4154, yaw: -1.5708, size: 0.1 },
];

/*
 * THE LINE, in millimetres, as x y z triples.
 *
 * Not drawn by hand and not a guess at a racing line: this is what the
 * builder's own path solver produces from the track's pass sequence, which
 * is the curve the simulator draws as the guide and measures its ghost
 * against. 112 knots evenly spaced along 14.4 m, a knot every
 * 128 mm, which holds the rebuilt spline to within 10 mm of the
 * solver's own 673 point output. Ten millimetres is an eighth of the
 * aircraft, in a hole 711 mm across.
 *
 * Millimetres and integers because the source is a grid of whole inches and
 * the aircraft is 82 mm wide: a tenth of a millimetre would be four more
 * characters a number, saying nothing. room.js divides by a thousand.
 */
export const LINE_MM = [
  -734, 356, -415, -606, 356, -404, -482, 356, -370, -365, 356, -318, -256, 356, -251, -152, 356, -175, -53, 356, -94,
  45, 356, -11, 145, 356, 70, 247, 356, 147, 356, 356, 216, 472, 356, 271, 595, 356, 307, 722, 356, 322,
  850, 366, 322, 974, 399, 322, 1094, 444, 322, 1215, 487, 322, 1341, 513, 322, 1465, 537, 322, 1530, 644, 322,
  1548, 771, 322, 1532, 898, 322, 1470, 1009, 322, 1348, 1034, 322, 1220, 1044, 322, 1092, 1061, 322, 965, 1078, 322,
  837, 1090, 322, 709, 1094, 325, 599, 1102, 384, 544, 1117, 498, 524, 1134, 623, 519, 1152, 750, 520, 1169, 877,
  522, 1186, 1005, 521, 1204, 1132, 511, 1221, 1259, 478, 1238, 1382, 399, 1251, 1478, 275, 1254, 1502, 149, 1246, 1481,
  32, 1229, 1431, -71, 1206, 1358, -159, 1181, 1268, -231, 1155, 1166, -289, 1131, 1053, -331, 1111, 934, -357, 1098, 809,
  -365, 1093, 681, -348, 1085, 554, -312, 1066, 433, -263, 1040, 316, -206, 1010, 205, -143, 977, 99, -74, 941, -4,
  -1, 902, -102, 77, 862, -195, 160, 818, -284, 247, 772, -365, 342, 723, -437, 445, 668, -489, 554, 611, -476,
  593, 591, -360, 587, 588, -232, 564, 579, -106, 528, 566, 17, 485, 550, 137, 439, 533, 255, 398, 517, 376,
  366, 505, 500, 348, 499, 627, 345, 497, 755, 335, 487, 883, 314, 471, 1008, 277, 451, 1130, 218, 430, 1241,
  124, 413, 1326, 1, 406, 1355, -122, 402, 1325, -219, 392, 1242, -284, 381, 1132, -326, 370, 1011, -351, 362, 886,
  -363, 356, 758, -371, 356, 630, -428, 360, 517, -533, 368, 445, -655, 376, 408, -782, 384, 391, -911, 391, 385,
  -1039, 397, 386, -1167, 402, 390, -1295, 405, 395, -1424, 406, 396, -1551, 403, 379, -1673, 396, 341, -1787, 388, 282,
  -1885, 379, 200, -1957, 372, 95, -1988, 369, -29, -1975, 369, -156, -1929, 369, -276, -1855, 369, -380, -1753, 369, -457,
  -1629, 369, -489, -1501, 368, -486, -1373, 367, -476, -1245, 364, -461, -1118, 361, -445, -990, 358, -430, -862, 356, -419,
];

/*
 * What the solver measured, before the resample above rounded the corners
 * off it. The page prints this one, because it is the track's own figure and
 * not an artefact of how many knots this file happens to carry.
 */
export const LAP_LENGTH = 14.4;

/*
 * What the lap occupies: the footprint on the floor and the highest the line
 * ever gets. Measured off the solver's own output, and quoted on the page,
 * so a change of track changes the copy's numbers with it rather than
 * leaving the front door advertising the last track's dimensions.
 */
export const SPAN = { x: 3.54, y: 1.25, z: 2.00 };
