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
 * shell marks the first occurrence of a term in an article and lets the
 * reader open the definition without leaving the page, which is the whole
 * reason this is data rather than a page of prose.
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
    short: 'First person view: you fly wearing goggles that show the camera on the aircraft, so you see what it sees instead of watching it from the ground.',
  },
  {
    term: 'plant',
    short: 'Engineers call the thing a controller is trying to control the plant. Here it means the aircraft itself: four motors, four props, a battery and the air around them.',
    see: 'start-loop',
  },
  {
    term: 'Betaflight',
    short: 'The free, open-source software that runs on a racing drone\'s flight controller. This simulator compiles the real thing rather than imitating it.',
    see: 'start-compiled',
  },
  {
    term: 'flight controller',
    also: ['FC'],
    short: 'The small computer bolted inside the aircraft that reads the gyro a thousand times a second and decides what each motor should do.',
    see: 'start-loop',
  },
  {
    term: 'gyro',
    also: ['gyroscope'],
    short: 'A chip that measures how fast the aircraft is rotating, in degrees per second, about each of its three axes.',
    see: 'physics-gyro',
  },
  {
    term: 'quad',
    also: ['quadcopter', 'quadrotor'],
    short: 'A drone with four motors. Everything on this site is about one particular racing quad.',
    see: 'physics-airframe',
  },
  {
    term: 'five inch',
    also: ['5 inch', '5-inch'],
    short: 'The whole class of racing quad is named after the diameter of its propellers, so a five inch is a quad with props five inches across, about the width of your hand.',
    see: 'physics-airframe',
  },
  {
    term: '6S',
    short: 'Six battery cells wired in series, which gives about 25 volts fresh off the charger. A phone battery is 1S, about 4 volts.',
    see: 'physics-sag',
  },
  {
    term: 'kV',
    short: 'How many turns per minute a motor would spin for each volt you give it, with no propeller attached. Higher kV means a faster, thirstier motor.',
    see: 'physics-motor',
  },
  {
    term: 'ESC',
    short: 'Electronic speed controller: the small board that takes an order like "sixty percent" and switches the battery on and off fast enough to deliver it.',
    see: 'physics-motor',
  },
  {
    term: 'bell',
    short: 'The spinning outer can of the motor, the part the propeller bolts onto. It has real weight, which is why a motor cannot change speed instantly.',
    see: 'physics-motor',
  },
  {
    term: 'back EMF',
    short: 'A spinning motor also acts as a generator and pushes voltage back the way it came. The faster it spins, the more it pushes back, and the less current gets through.',
    see: 'physics-motor',
  },
  {
    term: 'hover',
    short: 'Holding still in the air. It takes about a quarter throttle on this aircraft, because the other three quarters are there for climbing and accelerating.',
    see: 'physics-airframe',
  },
  {
    term: 'punch',
    short: 'Slamming the throttle open from low to high. It is the hardest thing you can ask of the battery and the motors at once.',
    see: 'physics-sag',
  },
  {
    term: 'throttle',
    short: 'The stick that sets how hard all four motors work together. On a quad it controls acceleration, not height: let go and you fall.',
    see: 'control-mixer',
  },
  {
    term: 'acro',
    also: ['acro mode'],
    short: 'The mode racers fly. The stick asks for a rate of rotation, so letting go means "stop rotating", not "go back to level".',
    see: 'control-angle',
  },
  {
    term: 'angle mode',
    short: 'The beginner mode. The stick asks for a tilt, so letting go brings the aircraft back to level on its own.',
    see: 'control-angle',
  },
  {
    term: 'arm',
    also: ['armed', 'disarm', 'disarmed'],
    short: 'Arming is the deliberate switch flip that allows the motors to spin at all. A disarmed quad ignores the throttle, which is what stops it taking your fingers off on the bench.',
  },
  {
    term: 'idle',
    short: 'The slowest the motors are allowed to turn while armed. They are never quite stopped in flight, because a motor that has stopped takes far too long to come back.',
    see: 'control-mixer',
  },
  {
    term: 'setpoint',
    short: 'What you asked for, as a number. Move the stick and the flight controller turns that into a setpoint in degrees per second, then spends every millisecond trying to match it.',
    see: 'control-rates',
  },
  {
    term: 'feedforward',
    short: 'The controller watching your stick move and starting the motors immediately, instead of waiting to find out it is already behind.',
    see: 'control-ff',
  },
  {
    term: 'airmode',
    short: 'A rule that keeps the motors able to push against each other even at zero throttle, so you still have control while falling. Without it, chopping the throttle makes the aircraft a brick.',
    see: 'control-tpa',
  },
  {
    term: 'TPA',
    short: 'Throttle PID attenuation: turning the controller\'s gains down at high throttle, because props bite harder when they are spinning fast.',
    see: 'control-tpa',
  },
  {
    term: 'downwash',
    short: 'The column of air a propeller throws downwards. It is what holds the aircraft up, and descending into it is what causes most of the trouble on this site.',
    see: 'physics-vrs',
  },
  {
    term: 'induced velocity',
    short: 'How fast the air is being pulled through the propeller disc. Working against your own induced velocity is why hovering is the least efficient thing a quad can do.',
    see: 'physics-etl',
  },
  {
    term: 'ETL',
    also: ['translational lift'],
    short: 'Effective translational lift: once you start moving sideways the props meet fresh air instead of their own downwash, and the same motor speed makes more lift.',
    see: 'physics-etl',
  },
  {
    term: 'H-force',
    short: 'A spinning propeller flying sideways through the air also drags backwards, not just downwards. On a fast quad that backward drag is bigger than the drag on the frame.',
    see: 'physics-hforce',
  },
  {
    term: 'flare',
    short: 'Pitching the nose up hard to stop, so the props push against where you were going. It is how a quad brakes, because it has no brakes.',
  },
  {
    term: 'pitch speed',
    short: 'How fast a propeller would move forward in one turn if it were a screw going through a solid, which is the speed it stops being able to grip the air.',
    see: 'physics-advance',
  },
  {
    term: 'jitter',
    short: 'Small random timing errors in the radio link, so packets arrive slightly early or late instead of on an exact beat.',
    see: 'physics-radio',
  },
  {
    term: 'ELRS',
    also: ['ExpressLRS', 'Crossfire'],
    short: 'Brands of radio link between your transmitter and the aircraft. Each has its own packet rate, delay and rate of dropped packets.',
    see: 'physics-radio',
  },
  {
    term: 'notch',
    also: ['notch filter'],
    short: 'A filter that removes one narrow band of frequencies and leaves the rest alone, used to cut out the buzz of a particular motor speed.',
    see: 'control-filters',
  },
  {
    term: 'OSD',
    short: 'On-screen display: the numbers and warnings a real flight controller draws over the video feed, like a heads-up display.',
  },
  {
    term: 'VTX',
    short: 'Video transmitter: the radio that sends the camera picture back to your goggles. This simulator has no video link, so its settings do nothing here.',
  },
  {
    term: 'CLI',
    also: ['dump'],
    short: 'The command-line screen in the configurator, where every setting can be typed or pasted. A dump is the whole list of them as text.',
    see: 'cli-index',
  },
  {
    term: 'integrator',
    short: 'The part of the simulator that steps the physics forward, a thousand tiny steps a second, working out where everything is a millisecond from now.',
    see: 'physics-timestep',
  },
  {
    term: 'couple',
    short: 'Two equal forces pushing opposite ways at different places, so they do not move the object anywhere but they do twist it.',
    see: 'physics-noseup',
  },
  {
    term: 'CW',
    also: ['CCW'],
    short: 'Clockwise and counter clockwise. Two of a quad\'s props spin each way, and that balance is the only reason it does not spin on the spot.',
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
