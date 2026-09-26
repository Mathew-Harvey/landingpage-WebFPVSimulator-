/*
 * places.js: where the page's places stand, and nothing else.
 *
 * These numbers used to live in city.js, beside the code that builds the
 * town. They moved here because the page needs to know WHERE the town is
 * before the town exists: the closing shot's cap is trigonometry against
 * the district's size, and the camera aims at its heart, and all of that is
 * worked out when the page starts. The town itself arrives later, built in
 * the background behind the film (see loader.js), and importing city.js to
 * read three constants would have made the page wait for it.
 *
 * So this module imports three.js and nothing of the town's, and city.js
 * takes its numbers from here.
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
 * The town's own centre in world space, which is what a camera looking AT
 * the district should aim at. It is not the crossing: the street runs further
 * north than south of it, so the crossing is off centre and a shot framed on
 * it puts the town in the bottom of the frame.
 */
export const CITY_HEART = new THREE.Vector3(CITY_ORIGIN.x + 4, CITY_ORIGIN.y + 4, CITY_ORIGIN.z - 8);

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
