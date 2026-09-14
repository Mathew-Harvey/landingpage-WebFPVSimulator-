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
 * over. The lap is 13.8 m of line inside a footprint 2.97 by 1.42 m
 * and 1.13 m off the floor at its highest, which is the most surprising
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
  { x: -0.7341, z: 0.325, yaw: 1.5708, sill: 0 },
  { x: 0.7417, z: -0.4129, yaw: 1.5708, sill: 0 },
  { x: 0.7417, z: -0.4129, yaw: 1.5708, sill: 0.7379 },
  { x: -0.3651, z: -0.7818, yaw: 3.1416, sill: 0 },
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
  { x: -0.0095, z: -0.7818, h: 1.4757, r: 0.0133 },
];

/*
 * Two lengths of the same pipe laid horizontally at one unit up, making a
 * rail across the middle of the room. Half the lap's character is here: the
 * line goes under it on the way out and over it on the way back.
 */
export const RAILS = [
  { x: 0.3727, z: -0.7818, y: 0, yaw: 0, w: 0.7379 },
  { x: -0.7341, z: -0.4129, y: 0, yaw: -1.5708, w: 0.7379 },
];

/* Where the aircraft sits before the run. One pad, 100 mm square. */
export const PADS = [
  { x: -1.1768, z: 0.325, yaw: -1.5708, size: 0.1 },
];

/*
 * THE LINE, in millimetres, as x y z triples.
 *
 * Not drawn by hand and not a guess at a racing line: this is what the
 * builder's own path solver produces from the track's pass sequence, which
 * is the curve the simulator draws as the guide and measures its ghost
 * against. 107 knots evenly spaced along 13.8 m, a knot every
 * 129 mm, which holds the rebuilt spline to within 10 mm of the
 * solver's own 673 point output. Ten millimetres is an eighth of the
 * aircraft, in a hole 711 mm across.
 *
 * Millimetres and integers because the source is a grid of whole inches and
 * the aircraft is 82 mm wide: a tenth of a millimetre would be four more
 * characters a number, saying nothing. room.js divides by a thousand.
 */
export const LINE_MM = [
  -734, 356, 325, -606, 356, 313, -482, 356, 280, -365, 356, 227, -255, 356, 161, -152, 356, 85, -52, 356, 3,
  46, 356, -80, 145, 356, -161, 248, 356, -238, 357, 356, -307, 473, 356, -362, 596, 356, -398, 724, 356, -412,
  840, 351, -370, 906, 340, -261, 953, 328, -142, 1012, 316, -29, 1121, 310, 30, 1236, 353, 51, 1300, 452, 101,
  1328, 564, 157, 1333, 678, 214, 1317, 792, 271, 1277, 902, 326, 1204, 995, 372, 1086, 1033, 391, 979, 1038, 330,
  937, 1047, 210, 923, 1056, 83, 917, 1066, -45, 909, 1075, -173, 884, 1085, -299, 808, 1092, -398, 682, 1093, -418,
  561, 1088, -458, 456, 1079, -532, 366, 1068, -622, 283, 1056, -720, 200, 1044, -817, 110, 1033, -909, 7, 1024, -984,
  -114, 1019, -1027, -240, 1025, -1020, -326, 1062, -936, -363, 1091, -817, -358, 1087, -690, -329, 1062, -567, -287, 1026, -452,
  -235, 981, -343, -176, 931, -240, -113, 876, -143, -45, 817, -51, 27, 755, 36, 102, 690, 117, 181, 622, 192,
  264, 550, 259, 352, 474, 314, 446, 394, 348, 540, 312, 331, 590, 269, 226, 591, 271, 98, 572, 303, -25,
  540, 359, -135, 501, 428, -236, 458, 502, -333, 417, 574, -431, 381, 637, -537, 355, 681, -654, 346, 697, -781,
  319, 737, -896, 250, 827, -953, 165, 922, -974, 71, 1009, -977, -34, 1082, -973, -154, 1125, -967, -278, 1104, -970,
  -350, 1001, -980, -381, 877, -987, -392, 749, -986, -391, 621, -974, -382, 496, -944, -370, 390, -876, -366, 356, -756,
  -415, 367, -641, -530, 393, -596, -656, 418, -600, -780, 442, -622, -904, 464, -652, -1026, 483, -684, -1150, 500, -716,
  -1275, 513, -744, -1401, 522, -763, -1529, 520, -761, -1614, 470, -685, -1639, 408, -576, -1640, 352, -461, -1633, 309, -340,
  -1627, 288, -214, -1606, 284, -88, -1544, 275, 24, -1453, 264, 113, -1339, 254, 172, -1213, 251, 192, -1088, 268, 214,
  -974, 304, 260, -859, 340, 305,
];

/*
 * What the solver measured, before the resample above rounded the corners
 * off it. The page prints this one, because it is the track's own figure and
 * not an artefact of how many knots this file happens to carry.
 */
export const LAP_LENGTH = 13.8;

/*
 * What the lap occupies: the footprint on the floor and the highest the line
 * ever gets. Measured off the solver's own output, and quoted on the page,
 * so a change of track changes the copy's numbers with it rather than
 * leaving the front door advertising the last track's dimensions.
 */
export const SPAN = { x: 2.97, y: 1.13, z: 1.42 };
