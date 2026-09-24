/*
 * glossary.js: the words the plain-language column is allowed to use.
 *
 * "In the air" is specified as the version you could tell somebody at the
 * field, and a review found it carrying about twenty five terms a reader
 * had never met: plant, bell, back EMF, airmode, 6S, five inch, setpoint,
 * ETL and the rest. A word nobody has defined is a wall, and a wall in the
 * column that promised to be plain is worse than one in the lab column,
 * because the reader has been told this is the easy half.
 *
 * So every term here gets one sentence a fifteen year old can read, and
 * `see` points at the page that does the full job where there is one. The
 * plan was for the shell to mark the first occurrence of a term in an
 * article and let the reader open the definition without leaving the page,
 * which is why this is data rather than a page of prose. As of 24 September
 * 2026 nothing imports this module, so no page shows these definitions yet.
 *
 * Terms that only ever appear in the lab column are deliberately absent.
 * That column has a different audience by design.
 *
 * This file is part of the WebFPVSimulator landing page.
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or (at
 * your option) any later version.
 *
 * This program is distributed in the hope that it will be useful, but
 * WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU
 * General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program. If not, see <https://www.gnu.org/licenses/>.
 */

/*
 * `term` is what gets matched in prose, case insensitively, on a word
 * boundary. `also` are other spellings that should point at the same entry.
 * Keep `short` to one sentence. If it needs two, the concept probably wants
 * a page instead of an entry.
 */
export const GLOSSARY = [
  {
    term: 'FPV',
    also: ['first-person view', 'first person view'],
    short: 'First-person view: the pilot wears goggles that show the picture from a camera on the quad, so they see what the quad sees instead of watching it from the ground.',
  },
  {
    term: 'plant',
    short: 'Engineers call the thing a controller is controlling the plant. Here it means the physics model of the aircraft: its motors, propellers, battery and the air around them.',
    see: 'start-loop',
  },
  {
    term: 'Betaflight',
    short: 'The free, open-source software that runs on most racing quads\' flight controllers. This simulator compiles Betaflight\'s own source code instead of writing its own version.',
    see: 'start-compiled',
  },
  {
    term: 'flight controller',
    also: ['FC'],
    short: 'The small computer on the quad that reads the gyro 1,000 times a second and decides how much power each motor should get.',
    see: 'start-loop',
  },
  {
    term: 'gyro',
    also: ['gyroscope'],
    short: 'A sensor chip that measures how fast the quad is rotating about each of its three axes, in degrees per second.',
    see: 'physics-gyro',
  },
  {
    term: 'quad',
    also: ['quadcopter', 'quadrotor'],
    short: 'A drone with four motors, also called a quadcopter. This simulator has two: a five inch racing quad and a 65 mm indoor whoop.',
    see: 'physics-airframe',
  },
  {
    term: 'five inch',
    also: ['5 inch', '5-inch'],
    short: 'A racing quad class named after the diameter of its propellers: five inches, which is 12.7 cm.',
    see: 'physics-airframe',
  },
  {
    term: '6S',
    short: 'A battery of six lithium polymer cells connected in series, which gives about 25 volts when fully charged. The whoop in this simulator uses one cell (1S).',
    see: 'physics-sag',
  },
  {
    term: 'kV',
    short: 'How many revolutions per minute a motor turns for each volt applied, measured with nothing attached. A higher kV means a faster motor that draws more current.',
    see: 'physics-motor',
  },
  {
    term: 'ESC',
    short: 'Electronic speed controller: the circuit that switches the battery on and off to each motor many times a second, so that the motor receives the average voltage the flight controller asks for.',
    see: 'physics-motor',
  },
  {
    term: 'bell',
    short: 'The spinning outer case of the motor, which the propeller is fixed to. Its mass is one reason a motor cannot change speed instantly.',
    see: 'physics-motor',
  },
  {
    term: 'back EMF',
    short: 'The voltage a spinning motor generates, which opposes the voltage applied to it. The faster the motor turns, the larger the back EMF and the smaller the current.',
    see: 'physics-motor',
  },
  {
    term: 'hover',
    short: 'Holding still in the air. At the simulator\'s normal Weight setting the five inch needs about 35 percent of its throttle to hover; the rest is for climbing and accelerating.',
    see: 'physics-airframe',
  },
  {
    term: 'punch',
    short: 'Raising the throttle quickly from low to full. It draws the largest current from the battery and asks the most of the motors.',
    see: 'physics-sag',
  },
  {
    term: 'throttle',
    short: 'The stick that sets the total power of all four motors together. On a quad it controls vertical acceleration: below the hover setting the quad descends.',
    see: 'control-mixer',
  },
  {
    term: 'acro',
    also: ['acro mode'],
    short: 'The mode racing pilots fly. The stick sets a rotation rate, so centring the stick means stop rotating, not return to level.',
    see: 'control-angle',
  },
  {
    term: 'angle mode',
    short: 'The mode most beginners use. The stick sets a tilt angle, and centring the stick returns the quad to level by itself.',
    see: 'control-angle',
  },
  {
    term: 'arm',
    also: ['armed', 'disarm', 'disarmed'],
    short: 'Switching the motors on so that they respond to the throttle. A disarmed quad ignores the throttle, which makes it safe to handle. In this simulator the quad is always armed.',
  },
  {
    term: 'idle',
    short: 'The lowest speed the motors turn at while armed. They never stop completely in flight, because a stopped motor takes too long to start again.',
    see: 'control-mixer',
  },
  {
    term: 'setpoint',
    short: 'The rotation rate you asked for, as a number in degrees per second. The flight controller turns the stick position into a setpoint and adjusts the motors every millisecond to reach it.',
    see: 'control-rates',
  },
  {
    term: 'feedforward',
    short: 'A part of the controller that measures how fast the stick is moving and changes the motor power straight away, instead of waiting for an error to appear.',
    see: 'control-ff',
  },
  {
    term: 'airmode',
    short: 'A setting that lets the mixer keep changing the motor speeds at zero throttle, so the pilot keeps control while descending. Without it, cutting the throttle removes all control.',
    see: 'control-tpa',
  },
  {
    term: 'TPA',
    short: 'Throttle PID attenuation: reducing the controller\'s gains at high throttle, because at high motor speed the same change in power changes the thrust more.',
    see: 'control-tpa',
  },
  {
    term: 'downwash',
    short: 'The column of air a propeller pushes downwards. It is what holds the quad up, and descending into it causes the vortex ring state.',
    see: 'physics-vrs',
  },
  {
    term: 'induced velocity',
    short: 'The speed at which a propeller pushes air through itself. In a hover the propeller works in air it has already pushed down, which is why hovering uses more power than slow forward flight.',
    see: 'physics-etl',
  },
  {
    term: 'ETL',
    also: ['translational lift'],
    short: 'Effective translational lift: when the quad moves sideways, its propellers meet air they have not already pushed down, and the same motor speed makes more thrust.',
    see: 'physics-etl',
  },
  {
    term: 'H-force',
    short: 'The backward drag of a spinning propeller that moves sideways through the air. On a fast quad it is larger than the drag of the frame.',
    see: 'physics-hforce',
  },
  {
    term: 'flare',
    short: 'Pitching the nose up hard to slow down, so that the thrust acts against the direction of travel. A quad has no other way to brake.',
  },
  {
    term: 'pitch speed',
    short: 'The pitch of a propeller times the number of turns it makes each second. When air moves along the propeller\'s axis at this speed, its thrust falls to zero.',
    see: 'physics-advance',
  },
  {
    term: 'jitter',
    short: 'Small random variations in the timing of the radio link, so that packets arrive slightly early or late instead of at exactly even intervals.',
    see: 'physics-radio',
  },
  {
    term: 'ELRS',
    also: ['ExpressLRS', 'Crossfire'],
    short: 'ExpressLRS and Crossfire are radio link systems between the pilot\'s radio and the quad. Each has its own packet rate, delay and rate of lost packets.',
    see: 'physics-radio',
  },
  {
    term: 'notch',
    also: ['notch filter'],
    short: 'A filter that removes one narrow band of frequencies and leaves the rest, used to remove the vibration at a particular motor speed.',
    see: 'control-filters',
  },
  {
    term: 'OSD',
    short: 'On-screen display: the numbers and warnings a real flight controller draws over the camera picture in the goggles.',
  },
  {
    term: 'VTX',
    short: 'Video transmitter: the radio on a real quad that sends the camera picture to the goggles. This simulator has no video transmitter, so its settings have no effect here.',
  },
  {
    term: 'CLI',
    also: ['dump'],
    short: 'The command line in Betaflight Configurator, where every setting can be typed as text. A dump or diff is the list of settings written out as text.',
    see: 'cli-index',
  },
  {
    term: 'integrator',
    short: 'The part of the simulator that moves the physics forward in steps of one millisecond, calculating where everything will be at the end of each step.',
    see: 'physics-timestep',
  },
  {
    term: 'couple',
    short: 'Two equal forces pushing in opposite directions along different lines. Together they do not move an object along, but they do rotate it.',
    see: 'physics-noseup',
  },
  {
    term: 'CW',
    also: ['CCW'],
    short: 'Clockwise and counter clockwise. Two of a quad\'s propellers spin each way, so that their turning effects on the frame cancel and it does not spin on the spot.',
    see: 'physics-airframe',
  },
];

const INDEX = new Map();
for (const entry of GLOSSARY) {
  for (const key of [entry.term, ...(entry.also || [])]) {
    INDEX.set(key.toLowerCase(), entry);
  }
}

export function glossaryLookup(word) {
  return INDEX.get(String(word).toLowerCase()) || null;
}

/* Longest first, so "angle mode" wins over "angle" and "five inch" over "5". */
export const GLOSSARY_TERMS = [...INDEX.keys()].sort((a, b) => b.length - a.length);
