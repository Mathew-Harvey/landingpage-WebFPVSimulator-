/*
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
 * RaceGOW5 Track 8 was designed by AyyyKayyy and read off the official
 * animation gate by gate; the simulator credits andAgainFPV for bringing it
 * over. The lap is 43.9 m of line inside a footprint 3.25 by 2.28 m, which
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
  name: "RaceGOW5 Track 8",
  designer: "AyyyKayyy",
  series: "RaceGOW5",
  source: "racegow.com/tracks, the official Track 8 animation",
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
 * The gates that are actually BUILT, and there are 5.
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
  { x: -1.0376, z: 0.3745, yaw: 1.5708, sill: 0 },
  { x: 1.176, z: -0.3633, yaw: 1.5708, sill: 0 },
  { x: 1.176, z: -0.3633, yaw: 1.5708, sill: 0.7379 },
  { x: 0.0692, z: -0.7323, yaw: 3.1416, sill: 0 },
  { x: 0.8071, z: -0.7323, yaw: 3.1416, sill: 0 },
];

/*
 * The same square laid flat and flown down through. RaceGOW calls it a
 * Horizontal Gate; everybody else calls it the table top.
 */
export const DIVES = [
  { x: 0.8071, z: -0.3633, yaw: 1.5708, sill: 0.3823 },
];

/*
 * Poles: a marker rather than an aperture. You go round it, on the side the
 * track says, and RaceGOW's rule puts it at least 14 inches from the nearest
 * gate centre. The tall one is three units of pipe.
 */
export const POLES = [
  { x: 1.176, z: -0.0077, h: 2.2136, r: 0.0133 },
  { x: -1.0376, z: 0.0189, h: 1.4757, r: 0.0133 },
  { x: 0.4381, z: -0.7323, h: 1.4757, r: 0.0133 },
];

/*
 * Two lengths of the same pipe laid horizontally at one unit up, making a
 * rail across the middle of the room. Half the lap's character is here: the
 * line goes under it on the way out and over it on the way back.
 */
export const RAILS = [
  { x: -0.6687, z: 0.0056, y: 0.7245, yaw: 0, w: 0.7379 },
  { x: 0.0692, z: 0.0056, y: 0.7245, yaw: 0, w: 0.7379 },
];

/* Where the aircraft sits before the run. One pad, 100 mm square. */
export const PADS = [
  { x: -1.6279, z: 0.3745, yaw: -1.5708, size: 0.1 },
];

/*
 * THE LINE, in millimetres, as x y z triples.
 *
 * Not drawn by hand and not a guess at a racing line: this is what the
 * builder's own path solver produces from the track's pass sequence, which
 * is the curve the simulator draws as the guide and measures its ghost
 * against. 340 knots evenly spaced along 43.9 m, a knot every
 * 129 mm, which holds the rebuilt spline to within 10 mm of the
 * solver's own 1777 point output. Ten millimetres is an eighth of the
 * aircraft, in a hole 711 mm across.
 *
 * Millimetres and integers because the source is a grid of whole inches and
 * the aircraft is 82 mm wide: a tenth of a millimetre would be four more
 * characters a number, saying nothing. room.js divides by a thousand.
 */
export const LINE_MM = [
  -1038, 356, 375, -909, 361, 374, -781, 378, 374, -655, 405, 373, -531, 442, 371, -410, 487, 370, -292, 538, 368,
  -176, 595, 366, -61, 654, 364, 52, 715, 362, 166, 777, 359, 280, 837, 357, 395, 894, 355, 513, 947, 353,
  633, 994, 351, 756, 1034, 350, 881, 1064, 349, 1009, 1084, 348, 1137, 1093, 348, 1263, 1108, 333, 1357, 1171, 273,
  1413, 1254, 193, 1444, 1344, 106, 1457, 1437, 17, 1454, 1529, -72, 1433, 1621, -161, 1392, 1709, -245, 1321, 1786, -319,
  1209, 1829, -361, 1087, 1818, -337, 1008, 1771, -248, 970, 1715, -139, 956, 1656, -25, 963, 1597, 89, 993, 1539, 200,
  1058, 1488, 299, 1170, 1463, 348, 1287, 1441, 306, 1354, 1391, 210, 1387, 1333, 99, 1396, 1274, -15, 1384, 1215, -129,
  1348, 1158, -239, 1274, 1110, -331, 1154, 1093, -363, 1025, 1093, -361, 896, 1093, -356, 767, 1093, -346, 639, 1093, -332,
  512, 1093, -313, 385, 1093, -288, 260, 1093, -257, 136, 1093, -221, 14, 1093, -179, -106, 1093, -131, -223, 1093, -78,
  -339, 1093, -20, -451, 1093, 44, -554, 1093, 121, -654, 1093, 203, -757, 1093, 281, -870, 1093, 342, -995, 1093, 372,
  -1118, 1093, 348, -1193, 1093, 245, -1226, 1093, 120, -1233, 1093, -9, -1216, 1093, -136, -1168, 1093, -255, -1069, 1093, -333,
  -940, 1093, -335, -811, 1093, -329, -682, 1093, -320, -554, 1093, -309, -425, 1093, -299, -297, 1093, -289, -168, 1093, -280,
  -39, 1093, -275, 90, 1093, -274, 219, 1093, -279, 347, 1093, -293, 473, 1093, -320, 593, 1093, -366, 698, 1093, -441,
  771, 1093, -546, 803, 1093, -671, 791, 1093, -797, 697, 1093, -882, 574, 1093, -922, 446, 1093, -935, 318, 1093, -925,
  194, 1093, -889, 94, 1093, -811, 69, 1093, -687, 69, 1093, -558, 69, 1093, -429, 69, 1093, -300, 69, 1093, -171,
  69, 1093, -42, 69, 1070, 83, 69, 970, 161, 69, 847, 198, 69, 718, 208, 69, 590, 196, 69, 468, 156,
  69, 373, 72, 69, 356, -54, 69, 356, -183, 69, 356, -312, 69, 356, -441, 69, 356, -570, 69, 356, -699,
  101, 356, -821, 206, 356, -894, 330, 356, -927, 459, 356, -935, 587, 356, -920, 708, 356, -876, 796, 356, -786,
  807, 358, -658, 805, 373, -530, 804, 398, -404, 806, 429, -278, 813, 465, -155, 829, 505, -33, 857, 548, 85,
  905, 592, 196, 985, 631, 288, 1100, 654, 340, 1228, 660, 344, 1347, 689, 306, 1440, 738, 232, 1507, 795, 138,
  1555, 851, 33, 1589, 900, -82, 1609, 938, -203, 1618, 958, -330, 1612, 964, -459, 1581, 985, -582, 1529, 1019, -695,
  1459, 1060, -795, 1375, 1104, -883, 1279, 1148, -957, 1173, 1188, -1017, 1057, 1222, -1063, 934, 1246, -1091, 806, 1254, -1101,
  677, 1246, -1097, 550, 1227, -1085, 426, 1201, -1063, 306, 1169, -1026, 196, 1137, -968, 109, 1108, -878, 70, 1094, -758,
  85, 1093, -630, 151, 1093, -521, 257, 1093, -448, 379, 1093, -405, 505, 1093, -381, 633, 1093, -368, 762, 1093, -362,
  891, 1093, -361, 1020, 1093, -362, 1149, 1093, -363, 1271, 1109, -334, 1346, 1156, -242, 1384, 1213, -133, 1396, 1272, -19,
  1388, 1331, 95, 1356, 1389, 206, 1290, 1439, 303, 1175, 1462, 348, 1061, 1486, 302, 995, 1537, 204, 964, 1594, 93,
  956, 1654, -21, 969, 1713, -135, 1007, 1769, -244, 1083, 1817, -335, 1204, 1834, -363, 1320, 1888, -363, 1411, 1979, -363,
  1484, 2085, -363, 1540, 2202, -363, 1574, 2326, -363, 1565, 2453, -363, 1458, 2508, -363, 1330, 2497, -363, 1205, 2466, -363,
  1085, 2419, -363, 972, 2356, -363, 868, 2281, -363, 771, 2195, -363, 684, 2100, -363, 605, 1998, -363, 535, 1890, -363,
  473, 1776, -363, 421, 1659, -363, 377, 1537, -363, 343, 1413, -363, 319, 1286, -363, 306, 1158, -363, 304, 1029, -363,
  316, 900, -363, 342, 774, -363, 387, 654, -363, 465, 552, -363, 569, 475, -363, 687, 423, -363, 811, 389, -363,
  938, 368, -363, 1067, 358, -363, 1196, 356, -363, 1321, 376, -342, 1433, 415, -293, 1527, 461, -218, 1594, 500, -116,
  1619, 517, 9, 1602, 527, 136, 1548, 560, 247, 1462, 610, 327, 1358, 668, 377, 1247, 727, 405, 1133, 785, 420,
  1016, 840, 425, 898, 893, 424, 779, 942, 419, 658, 986, 411, 536, 1026, 401, 412, 1060, 391, 286, 1087, 382,
  158, 1103, 376, 29, 1107, 373, -96, 1107, 344, -210, 1106, 284, -310, 1105, 204, -401, 1104, 112, -487, 1103, 16,
  -573, 1103, -80, -664, 1102, -172, -766, 1101, -251, -881, 1100, -309, -1006, 1100, -336, -1127, 1100, -303, -1197, 1099, -196,
  -1228, 1098, -71, -1232, 1096, 58, -1213, 1095, 185, -1161, 1094, 303, -1057, 1093, 373, -928, 1093, 375, -799, 1093, 377,
  -670, 1093, 377, -541, 1093, 373, -413, 1093, 363, -285, 1093, 343, -161, 1093, 308, -48, 1093, 247, 36, 1093, 150,
  68, 1093, 27, 69, 1054, -92, 69, 946, -160, 69, 821, -191, 69, 692, -197, 69, 564, -179, 69, 445, -132,
  69, 362, -37, 79, 361, 91, 133, 390, 203, 226, 436, 277, 336, 488, 320, 452, 539, 343, 572, 586, 355,
  693, 630, 358, 817, 667, 357, 942, 698, 353, 1069, 718, 349, 1198, 725, 346, 1305, 756, 288, 1364, 808, 187,
  1391, 866, 75, 1395, 925, -39, 1379, 984, -153, 1336, 1040, -261, 1252, 1084, -345, 1128, 1102, -363, 1035, 1188, -363,
  990, 1309, -363, 974, 1436, -363, 980, 1565, -363, 1012, 1690, -363, 1083, 1796, -363, 1203, 1830, -361, 1313, 1791, -311,
  1377, 1723, -223, 1410, 1648, -124, 1422, 1569, -23, 1416, 1491, 79, 1389, 1414, 179, 1335, 1343, 272, 1239, 1292, 338,
  1113, 1282, 340, 1004, 1263, 276, 930, 1227, 177, 881, 1181, 67, 849, 1125, -44, 828, 1058, -152, 815, 975, -250,
  809, 873, -328, 807, 750, -363, 776, 627, -361, 687, 534, -352, 576, 472, -335, 458, 428, -309, 339, 396, -272,
  224, 374, -218, 124, 361, -138, 71, 356, -22, 58, 356, 106, 19, 356, 228, -39, 357, 344, -110, 357, 451,
  -190, 358, 553, -277, 359, 648, -370, 360, 737, -467, 360, 822, -569, 361, 901, -676, 362, 974, -786, 363, 1040,
  -901, 364, 1098, -1021, 365, 1146, -1147, 367, 1175, -1275, 368, 1170, -1376, 369, 1096, -1406, 369, 972, -1398, 368, 843,
  -1373, 366, 717, -1328, 363, 596, -1260, 360, 487, -1162, 357, 405,
];

/*
 * What the solver measured, before the resample above rounded the corners
 * off it. The page prints this one, because it is the track's own figure and
 * not an artefact of how many knots this file happens to carry.
 */
export const LAP_LENGTH = 43.9;
