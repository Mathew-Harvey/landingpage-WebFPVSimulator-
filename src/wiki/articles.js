/*
 * articles.js: journey and physics pages for the FPV wiki.
 *
 * Every physics claim here is taken from src/native/plant.c, world.c,
 * sim.c, sim_abi.h, bf_glue.c, src/input/link.js, src/main.js or
 * src/render/lens.js in the simulator repository. If the code and this
 * page disagree, the code wins and this page is wrong. The pages were last
 * checked against that code on 24 September 2026.
 *
 * Voice: a physics textbook for Year 10 readers, as docs/wiki-voice.md sets
 * out. Plain English, every technical term explained where it first
 * appears, no analogies, and no fact dropped to make a sentence easier.
 * Each page has three sections: The idea, How it works, and In this
 * simulator.
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

export const CHAPTERS = [
  { id: 'start', title: 'Getting started', note: 'What FPV is, why a quadcopter needs a computer to fly, and what this simulator calculates.' },
  { id: 'physics', title: 'The aircraft', note: 'The physics of the airframe, motors, propellers and battery, before the flight controller is involved.' },
  { id: 'control', title: 'The flight controller', note: 'Betaflight 4.5.1, compiled from its own source code.' },
  { id: 'cli', title: 'Settings reference', note: 'One page for every Betaflight 4.5.1 setting, including the ones that have no effect here.' },
];

function page({
  id, chapter, title, kicker, lede, figure, air, lab, sim, related = [], source,
}) {
  return {
    id,
    chapter,
    title,
    kicker,
    lede,
    figure: figure || null,
    sections: [
      { id: 'air', title: 'The idea', paras: air },
      { id: 'lab', title: 'How it works', paras: lab },
      { id: 'sim', title: 'In this simulator', paras: sim },
    ],
    related,
    source: source || '',
    kind: 'article',
  };
}

export const ARTICLES = [
  page({
    id: 'start-welcome',
    chapter: 'start',
    title: 'How a racing drone flies',
    kicker: 'Start here',
    lede: 'A racing quadcopter has no wings and no control surfaces, and its four propellers point in fixed directions. It controls everything it does by changing how fast the four propellers spin.',
    figure: 'loop',
    air: [
      'A quadcopter, or quad, is a drone with four motors, each turning a propeller. The racing quad this wiki describes is called a five inch, because its propellers are five inches (12.7 cm) across. It has a mass of 710 grams. The pilot stands on the ground wearing goggles that show the picture from a camera on the front of the quad. This is called first-person view, or FPV, because the pilot sees what the quad sees.',
      'The pilot holds a radio with two sticks. In the Mode 2 layout, which almost every pilot uses, the left stick controls throttle and yaw and the right stick controls roll and pitch. Throttle is the total power sent to the motors. Roll tips the quad to the left or right, pitch tips its nose up or down, and yaw turns it to face a new direction. A quad has no brake. To move in a direction, the pilot tilts the whole quad, so that some of the thrust that was holding it up now pushes it sideways.',
      'With a fully charged battery, the four propellers together can make about eight times the quad\'s weight in thrust under Earth\'s gravity. The same propellers can also lose thrust suddenly. If the quad descends quickly into the air its own propellers have just pushed down, that air circulates back through the propellers and the thrust falls, even though the motors are still running. Both effects come from the same physics, and this simulator calculates both.',
      'The How to fly screen in the simulator teaches the sticks. This wiki explains why the quad responds to them the way it does, and which parts of that response come from the physics of the airframe and which come from the flight controller software.',
    ],
    lab: [
      'The simulator runs two programs together inside one WebAssembly module. WebAssembly is a format that lets compiled code run in a web browser at close to full speed. The first program is Betaflight 4.5.1, the flight controller software used on most racing quads. The parts of it that control flight (the rates curves, the PID controller, the filters, the mixer and the handling of stick input) are compiled from Betaflight\'s own source code in vendor/betaflight. They have not been rewritten. The second program is the physics model of the aircraft, written in the C language in src/native/plant.c. It models the motors, propellers, battery, air resistance and the motion of the quad as a rigid body. Engineers call the thing a controller controls the plant, which is where the file gets its name.',
      'The two programs take turns in fixed steps of one millisecond, 1,000 steps every second. The picture on the screen is drawn separately, from the two most recent physics steps, so the speed of the computer\'s display never affects the flight.',
      'All the physics uses SI units: metres, kilograms, seconds, radians, newtons, volts and amps. Degrees appear only where a person reads them, such as the settings screens and Betaflight\'s own configuration values, and they are converted at that point. The quad\'s own axes follow Betaflight and the standard flight dynamics textbooks: x points forward, y points left and z points up. Three.js, the library that draws the picture, uses y for up, so the simulator converts between the two in exactly one place, src/render/frame.js.',
      'The simulator is deterministic, which means the same stick inputs always produce exactly the same flight, on any computer. Without this, a lap time would mean nothing. The physics therefore does not use JavaScript\'s built-in sine, cosine or power functions, because different browsers calculate them slightly differently. The module carries its own maths library instead. Random effects, such as vibration, come from a seeded random number generator called xorshift32, which produces the same sequence every time it starts from the same seed. The same inputs must produce the same record of the flight, bit for bit, in Node and in the Chrome browser.',
    ],
    sim: [
      'The simulator began as a grey ground plane and one quad. It has grown to include maps, a screen for Betaflight\'s settings and a track builder. It now has two aircraft: the five inch described above and a 65 mm whoop, a small indoor quad with guards around its propellers. You choose between them with the Aircraft row at the top of the Quad screen.',
      'Some settings reach the physics and some do not. The Pack charge setting changes the battery voltage in the physics model, and the Weight slider on the flight screen changes how heavy the quad feels by scaling gravity. The motor_kv setting stores a number that nothing in the flight calculation reads. The settings screens show the settings that have no effect in grey, so the difference is visible.',
      'Read the aircraft chapter before changing PID numbers. Much of what pilots call a quad\'s tune comes from the airframe itself: the battery voltage falling under load, the propellers losing thrust as air moves through them, the drag of the propellers, and propwash. The flight controller chapter covers what Betaflight does with that airframe. The last chapter has a page for every setting, including several hundred that are stored but have no effect in this simulator.',
    ],
    related: ['start-nowings', 'start-loop', 'physics-airframe', 'start-honesty'],
    source: 'CLAUDE.md, STAGE1.md, src/native/sim_abi.h',
  }),

  page({
    id: 'start-whyacomputer',
    chapter: 'start',
    title: 'Why a quad needs a computer',
    kicker: 'Getting started',
    lede: 'An aeroplane that is tipped by a gust returns to level flight by itself. A quadcopter does not, so it needs a computer to keep it the right way up.',
    figure: 'unstable',
    air: [
      'An aeroplane is stable. This means that when a gust tips it, the shape of the aircraft pushes it back. Its wings slope slightly upwards from the body, so when one wing drops, that wing meets the air at a steeper angle and makes more lift than the raised wing, which rolls the aircraft back towards level. The tailplane, a small wing at the end of a long tail, pushes the nose back into line if it swings away. A folded paper aeroplane is stable for the same reasons.',
      'A quadcopter has none of these features. Its four motors are the same distance from the centre and push equally, so no angle is preferred over any other. If the quad is tipped by 10 degrees, nothing pushes it back. In practice it does not stay at 10 degrees either, because no real quad is built perfectly. One motor is mounted a fraction of a degree crooked and one propeller is slightly heavier than the others, and together these small errors make a steady push in one direction. The quad tips further and further. This is called being unstable.',
      'So something has to measure the tilt and correct it all the time. The figure on this page asks how often those corrections must happen. A skilled pilot, reacting to what they see, can correct about five times a second. That is too slow: by the time the pilot has noticed the tilt and moved a stick, the quad has already tipped too far. The flight controller corrects 1,000 times a second, which is fast enough to keep the quad steady.',
      'This changes what flying a quad means. The pilot does not balance the quad. The pilot tells the flight controller how fast to rotate, and the flight controller does the balancing.',
    ],
    lab: [
      'In a hover the four thrusts are equal, so the total moment, or turning effect, about the centre of gravity is zero at every angle. Nothing pushes the quad back towards level. Any small steady moment, from a build error, an unbalanced propeller or a gust, first changes the rotation rate and then the angle, so the angle keeps growing. A fixed wing aeroplane is different: the upward slope of its wings, called dihedral, and its tailplane both create moments that push it back. This is called positive static stability.',
      'The figure simulates a simple controller that measures the angle at a fixed rate, holds its correction constant until the next measurement, and works against a steady disturbance of 1.5 millinewton metres. It uses this quad\'s moment of inertia about the roll axis, 0.0035 kg m², which measures how hard the quad is to start rotating, and the real moment its motors can produce. When the controller updates too slowly it becomes unstable, because it keeps pushing in the old direction after the quad has already responded. For these settings the change from stable to unstable happens between 50 and 100 updates a second. That is why 1,000 updates a second is comfortable and five a second is not.',
      'Holding a position is harder than holding an angle. A quad tilted by an angle θ accelerates sideways at g tan θ, where g is 9.81 m/s². A small error in angle therefore becomes a growing sideways speed, and then a growing distance from where the pilot wanted the quad to be.',
    ],
    sim: [
      'The physics model contains nothing that returns the quad to level, because a real airframe has nothing that does. All the steadiness you feel in this simulator comes from Betaflight\'s control loop, running 1,000 times a second on the gyro readings. If you turn the PID gains far enough down, the quad behaves the way this page describes.',
      'The steady disturbance used in the figure comes from the motor cant table, which gives each motor a small fixed misalignment to model how real quads are built. It is a chosen model, not a measurement, and the page Motor cant and roll-to-yaw coupling explains it. In the Arcade flight style the misalignment is turned off.',
    ],
    related: ['start-loop', 'control-pid', 'physics-cant', 'control-angle'],
    source: 'src/native/plant.c, which contains no restoring moment',
  }),

  page({
    id: 'start-nowings',
    chapter: 'start',
    title: 'A quad has no wings',
    kicker: 'Getting started',
    lede: 'A quadcopter has one force it can aim, the total thrust of its propellers, and the only way to aim it is to rotate the whole quad. To slow down, it must aim that force against the direction it is moving.',
    figure: 'tilt',
    air: [
      'An aeroplane is held up by its wings and steered by control surfaces, which are hinged flaps that turn the air flowing past them. A quadcopter is held up by four propellers that push air downwards, and it steers by rotating its whole body. To roll right, the two motors on the right slow down and the two on the left speed up. The quad rotates to the right, and part of the thrust that was holding it up now pulls it to the right. Pitch and yaw work in the same way about the other axes. The propellers are fixed to the frame, so the only way to point the thrust is to point the frame.',
      'This is why a quadcopter has no brakes. To slow down, the pilot pitches the nose up, or rolls away from the direction of travel, so that the thrust works against the quad\'s speed. The drag of the propellers and the body helps. Cutting the throttle does not slow the quad down. It removes the only force the pilot controls and lets the quad fall into the column of air it has just pushed down.',
      'Racing pilots fly in a mode called acro. In acro the sticks set a rotation rate in degrees per second, and centring the stick means stop rotating, not return to level. If you let go of the sticks while upside down, the quad stays upside down. Angle mode works differently: it returns the quad to level when the stick is centred. When you race with a keyboard the simulator starts in angle mode, because a key is either pressed or not, which makes it a poor way to set a rotation rate.',
    ],
    lab: [
      'The physics model applies Newton\'s second law to a rigid body. For motion in a straight line, mass times acceleration equals the total force, m a = ΣF. For rotation, the matching law links the change in the rotation rate to the total torque, or turning force, through the quad\'s moment of inertia, with an extra term for a spinning body that the Gyroscopic coupling page explains. The quad\'s orientation is stored as a quaternion, a set of four numbers that describes a rotation. Every millisecond (dt = 0.001 s) the model updates the velocity from the forces first and then the position from the new velocity, a method called semi-implicit Euler. Gravity, 9.80665 m/s², acts straight down after the forces on the body have been turned into world directions.',
      'The simulator uses one sign convention for rotation rates, set in sim_abi.h: a positive roll rate rolls the quad right, a positive pitch rate pitches the nose down, and a positive yaw rate turns the nose left. Radio sticks use a different convention, in which positive pitch is nose up and positive yaw is nose right. The code that connects Betaflight to the physics model, called the glue, converts one into the other. If one sign in that chain were reversed, the controller would push the wrong way and make every error larger, which is called positive feedback. The comments on PLANT_SPIN in plant.c record the whole chain.',
      'Nothing on a quadcopter works like a wing. Apart from gravity and thrust, the only forces that act against its movement through the air are the drag of its body and the rotor drag of its propellers. Body drag is calculated separately for the underside, front and side of the quad as 0.5 ρ CdA v², where ρ is the density of the air, v is the speed and CdA is the drag area in that direction. Nothing in the physics turns the nose to follow the direction of travel, so in a banked turn the quad\'s nose and its path can point in different directions, as they do on a real acro quad.',
    ],
    sim: [
      'The How to fly screen shows these controls with live sticks. If the quad in this simulator ever flies like an aeroplane, for example by turning its nose to follow its path, the fault is in the drag model or the rotor drag. That would be a bug in the physics model, not something a setting should fix.',
    ],
    related: ['start-loop', 'physics-drag', 'physics-hforce', 'control-rates'],
    source: 'src/native/sim_abi.h, src/native/plant.c',
  }),

  page({
    id: 'start-loop',
    chapter: 'start',
    title: 'The closed loop',
    kicker: 'Getting started',
    lede: 'The sticks do not control the motors directly. They set a target rotation rate, and the flight controller measures the actual rotation rate and changes the power to the four motors to close the gap, 1,000 times a second. A system that measures its own output and corrects it like this is called a closed loop.',
    figure: 'loop',
    air: [
      'When you move the roll stick, the radio in your hands sends a short digital message, called a packet, to a receiver on the quad. The flight controller reads the stick position from the packet and turns it into a target roll rate, in degrees per second, using a formula called the rates curve. It then reads the gyro, a sensor that measures how fast the quad is rotating. The target rate minus the measured rate is called the error. A calculation called PID turns the error into a power level for each of the four motors. The motors change speed, the propellers change thrust, the quad rotates, the gyro measures the new rate, and the error gets smaller. Then the cycle starts again.',
      'If the frame vibrates, the gyro measures the vibration along with the rotation, and the flight controller corrects for movement that is not happening. The thrust also takes time to change. The spinning motor and propeller have mass, so they take time to speed up. The battery voltage falls when a large current is drawn, which is called sag, and this leaves less power for the motors. The propellers give less thrust when air is already moving through them (see Advance ratio and pitch speed). Each of these delays the thrust the flight controller asked for, so the correction arrives late and the quad rotates past its target before it settles. This is called overshoot. If you ask for a faster rotation than the quad can produce, some motors reach full power, and the quad rotates only as fast as those motors can turn it.',
      'Betaflight, the flight controller software, also uses feedforward. Feedforward measures how fast the stick is moving and changes the motor power straight away, before any error has built up. It is smoothest when stick positions arrive at regular times. On a real radio link the packets arrive at slightly uneven times, and this makes feedforward less smooth. A simulated link with perfectly even timing would make feedforward smoother than any real radio can, so the simulator has a radio model that adds the delays and uneven timing of a real link. You can turn it on with the Radio link setting.',
    ],
    lab: [
      'The simulator runs one step of the loop every millisecond (0.001 s), in the same order that Betaflight uses on a real flight controller. First it reads the gyro. The simulated gyro takes the quad\'s true rotation rate from the physics model, adds simulated vibration (in the Expert flight style), and rounds the result in the same way as a real 16-bit gyro chip that measures up to 2,000 degrees per second in either direction. Next, Betaflight\'s gyro filters remove as much of the vibration as they can. If a new radio packet has arrived, Betaflight reads the new stick positions, and on every step it turns the latest positions into target rates. The PID controller then compares the target rates with the filtered gyro rates and calculates a correction for each axis. Last, the mixer combines the corrections with the throttle to give a power level for each motor.',
      'The power level is a duty cycle: the fraction of the time that the motor\'s electronic speed controller (ESC) connects the motor to the battery. The four duty cycles go to the physics model, which works out the motor speeds, the forces on the quad, and how it moves during the next millisecond. Two Betaflight features, dynamic idle and the RPM filter, need to know how fast each motor is spinning. On a real quad the ESCs report this back to the flight controller after a short delay. The simulator passes Betaflight the motor speeds from the physics model with the same kind of delay.',
      'Betaflight works in degrees per second. The physics model uses radians per second, the SI unit (1 radian per second is about 57.3 degrees per second). The code that connects the two, called the glue, converts between them. Two features that depend on the throttle, TPA and anti-gravity, take their throttle value from the mixer. The mixer runs after the PID controller, so the PID controller always uses the throttle value from the step before. Real hardware runs in the same order.',
      'Each stick reading carries the time at which it was taken. The simulator applies each reading at the start of the millisecond step that contains that time. The moment the reading happened to reach the computer does not matter. If readings were applied when they arrived, the uneven timing of the computer would reach the physics, and the quad would feel floaty to pilots.',
    ],
    sim: [
      'When you press Save on the firmware bench (on the Quad screen), the simulator writes your settings out as Betaflight command line (CLI) text and restarts Betaflight with it, through sim_init. This resets the quad. The bench can also export those settings as a file. No menu sets a PID gain itself: every gain reaches the loop through Betaflight\'s own settings. Settings that reach Betaflight 4.5.1 code compiled into the simulator are marked as working here. Settings that have no effect are shown in grey, with the reason.',
    ],
    related: ['control-pid', 'physics-gyro', 'physics-radio', 'control-filters'],
    source: 'src/native/bf/bf_glue.c, src/native/sim.c',
  }),

  page({
    id: 'start-compiled',
    chapter: 'start',
    title: 'The controller is compiled, not rewritten',
    kicker: 'Getting started',
    lede: 'A simulator can use its own simple controller or compile the real flight controller software. This simulator compiles the real one, Betaflight, and that choice affects everything else.',
    figure: 'boundary',
    air: [
      'The quick way to build a drone simulator is to write a simple PID controller in the game code. It takes a few dozen lines, and its graphs look reasonable, but it flies like a different aircraft. Betaflight is much more than three PID gains. It includes a chain of filters on the D term, throttle PID attenuation, I-term relax, anti-gravity, feedforward averaging, the mixer, airmode and many other rules. Most of these were added because a pilot crashed in an unusual situation and a developer wrote code to handle it. A controller that copies only the three gains leaves all of that behaviour out.',
      'This simulator includes a copy of the Betaflight 4.5.1 source code and compiles its control loop to WebAssembly. When you change a setting, Betaflight\'s own code reads the value. The simplified tuning sliders run Betaflight\'s simplified_tuning.c. The rates graph on the settings screen is only a preview. The quad itself is flown by applyRates in fc/rc.c, the same function a real flight controller runs.',
    ],
    lab: [
      'The compiled source files include pid.c, pid_init.c, mixer.c, mixer_init.c, rc.c, rc_controls.c, controlrate_profile.c, the gyro filter chain, rpm_filter, dyn_notch_filter and simplified_tuning.c. The dynamic notch filter is compiled but refuses to start at a loop rate of 1 kHz, as it does on a slower real flight controller. The parts that talk to hardware are replaced by stand-ins: there is no serial port (UART), no MSP communication, no on-screen display and no GPS. Every change to the Betaflight source is kept as a patch file in patches/ and applied when the module is built, so the copy in vendor/betaflight stays exactly as Betaflight published it. After a build, git diff --stat vendor/betaflight must show no changes.',
      'The licence is the GNU General Public License, version 3 (GPLv3). Compiling someone else\'s GPL code into a program makes the program a derivative work, which must use the same licence. Every file carries a GPLv3 header, and no library with an incompatible licence can be added.',
    ],
    sim: [
      'The firmware bench on the Quad screen is laid out like Betaflight Configurator 10.10, with the same tab names, the 4.5.1 settings and the dark grey and orange colours. It is a separate program: it does not use Vue, MSP or an embedded copy of Configurator. Saving writes the settings as CLI text, and the screen reads the values back from the running firmware, so it cannot show a value the firmware does not hold. The bench has no box for pasting CLI text, and the simulator does not load a diff file dropped onto its page: you choose a tune from the menu, set rates on the Rates screen, and edit the rest on the bench, which can export the result.',
    ],
    related: ['control-pid', 'start-honesty', 'cli-index'],
    source: 'CLAUDE.md, src/native/bf/bf_glue.c, patches/, src/ui/fc.js',
  }),

  page({
    id: 'start-honesty',
    chapter: 'start',
    title: 'Settings that work, and settings that do not',
    kicker: 'Getting started',
    lede: 'Most of a flight controller\'s settings have nothing to do with flying. This simulator keeps them, shows them in grey and labels them, so it is always clear which settings have an effect.',
    figure: 'status',
    air: [
      'On a real quad, Betaflight Configurator also sets the video transmitter channel, the layout of the on-screen display, GPS rescue and the colours of the LEDs. This simulator has no video transmitter, no Betaflight on-screen display over the camera view, no GPS and no LEDs. The settings still exist, so the firmware bench can show and export a complete Betaflight settings file. They are shown in grey. If you change one and export, the new value is in the file, but the quad flies the same.',
      'A second group of settings has no effect because of Betaflight\'s own rules. The dynamic notch filter will not start unless the gyro loop runs at 2 kHz or faster. This simulator runs at 1 kHz, like a slower real flight controller. The settings are stored and the code is compiled, but the calculation the filter depends on, a sliding discrete Fourier transform (SDFT), never starts. The firmware is working as designed. These settings are called gated.',
      'A third group looks as if it should work but does not. The motor_kv setting is stored in a real Betaflight setting group, but nothing in the flight calculation reads it, because the physics model has its own motor constants for each aircraft. These settings are called applied but inert.',
    ],
    lab: [
      'The file src/fc/catalog.js decides the status of every setting, and nothing else does. There are five statuses, and each has a label on its page. LIVE, labelled Works here: the setting is written into Betaflight code that is compiled into the simulator and runs. GATED, labelled Off at 1 kHz: the setting is written, and Betaflight ignores it at this loop rate. APPLIED_INERT, labelled Stored, not used: the setting is written to a real setting group that nothing in the flight calculation reads. INERT, labelled Not simulated: a real Betaflight 4.5 CLI setting whose part of the firmware is not compiled. ABSENT, labelled Configurator only: a control in Configurator that is not a CLI setting at all.',
      'The function sim_bf_key_status does not tell you whether a setting does anything. A result of 0 only means the setting is in the table of settings the module can write, and that table includes gated and applied but inert settings. The catalog decides which settings are shown in grey.',
    ],
    sim: [
      'Every setting in the catalog has a page in this wiki. Pages for settings that work here say what raising or lowering the value does to the quad. Pages for grey settings say what the setting does on a real quad and then say that it has no effect here. If a page for a working setting and a flight disagree, the catalog is wrong, and that is worth reporting as a bug.',
    ],
    related: ['cli-index', 'control-filters', 'physics-airframe'],
    source: 'src/fc/catalog.js, src/native/bf/bf_settings.c',
  }),

  page({
    id: 'start-howto',
    chapter: 'start',
    title: 'How to read this wiki',
    kicker: 'Getting started',
    lede: 'Every article has three sections and a figure you can control. The sections move from the general idea to the details of this simulator.',
    figure: 'anatomy',
    air: [
      'The idea explains what happens and why, in plain words. How it works gives the equations and numbers the simulator uses. In this simulator says which file does the work, which settings have an effect, which automatic check measures it, and which parts of the real effect are not modelled. Pages about a single setting also have If you raise it and If you lower it, which describe what changes when you move the value.',
      'Every figure has a control below it. When you drag the control, the drawing and the numbers change together, because the figure calculates the relationship the page describes from the simulator\'s own constants. Figures are animated unless your browser is set to reduce motion. Each caption says what the figure shows.',
      'How a quad feels cannot be checked by reading a page. The simulator has a set of automatic checks, run with npm run verify, that measure the physics model. When a page mentions a check by number, it means a result from those checks.',
    ],
    lab: [
      'The related links at the end of a page are the suggested next pages, not a list of every page that mentions the topic. Each page about a single setting links back to the article about its family, such as PID, rates or filters, so that no setting is explained in isolation.',
      'The sources listed on a page are files in the simulator\'s repository, not textbooks. Where the simulator uses a result from a textbook, such as Glauert\'s inflow model, the figure of merit from momentum theory or the shape of the vortex ring state, the comment in the physics source code is the reference, because that is where the simulator chose the form of the equation.',
    ],
    sim: [
      'This wiki is part of the website, not a screen inside the simulator. Reading it does not affect a flight in progress.',
    ],
    related: ['start-welcome', 'physics-timestep', 'cli-index'],
    source: 'src/wiki/',
  }),

  page({
    id: 'physics-airframe',
    chapter: 'physics',
    title: 'The two airframes',
    kicker: 'The aircraft',
    lede: 'The simulator has two aircraft, a five inch racing quad and a 65 mm indoor whoop. Every number that describes them is a constant in the physics source code, not a setting you can change.',
    figure: 'quadx',
    air: [
      'The five inch is a 710 gram racing quad. Its frame measures 220 mm between opposite motors. It has four 2207 motors rated at about 1900 kV, which means each motor would turn at about 1,900 revolutions per minute for every volt if nothing were attached to it. Its propellers are 5×4.3×3: five inches across, with a pitch of 4.3 inches and three blades. Its battery has six lithium polymer cells (6S) and a capacity of 1300 mAh. This is an ordinary racing specification.',
      'With a full battery and Earth\'s gravity, the five inch makes about 8.1 times its own weight in thrust. The simulator also has a Weight slider on the flight screen, which scales gravity to change how heavy the quad feels. At its normal setting the five inch flies with 1.62 times Earth\'s gravity, a value the simulator\'s owner chose by flying it, so a hover needs about 35 percent of the throttle stick and the thrust is about five times the weight. Many pilots set a throttle limit so that the useful part of the throttle is spread over more of the stick, which makes fine control easier.',
      'The whoop is a 65 mm brushless quad with guards, called ducts, around its propellers. It is the kind of quad flown indoors on RaceGOW tracks. With its one-cell battery it weighs 23.4 grams, and its propellers are 31 mm across. On a fresh battery it makes 4.7 times its own weight in thrust under Earth\'s gravity, and about 3.8 times on a tired one. Its normal Weight setting is 2.025 times Earth\'s gravity, where a hover needs about 40 percent of the stick. Its battery voltage falls by nearly a quarter at full throttle, against about 8 percent on the five inch, so every hard input costs the whoop some of its power.',
      'You choose the aircraft with the Aircraft row at the top of the Quad screen. Changing it also loads that aircraft\'s tune, battery and camera settings, and switches the track builder between a sixty metre field for the five inch and a room for the whoop.',
    ],
    lab: [
      'Five inch constants, from SIM_AIRFRAME_5IN in the airframe table of plant.c: mass 0.71 kg, raised by the owner from 0.65 kg for a bigger battery and an HD camera; moments of inertia 0.0035, 0.0038 and 0.0068 kg m² about the roll, pitch and yaw axes; each motor 0.110/√2 = 0.078 m from the centre both forwards and sideways (arm_x and arm_y); thrust coefficient kt = 1.98 × 10⁻⁶ N per (rad/s)²; torque coefficient kq = 3.04 × 10⁻⁸ N m per (rad/s)²; motor constant ke = 0.006336 V s/rad; winding resistance r_motor = 0.1825 Ω; rotor moment of inertia 8.0 × 10⁻⁶ kg m²; six cells of r_cell = 2.5 mΩ each; air density 1.225 kg/m³; propeller radius 0.0635 m.',
      'The motor constant is not the value the 1900 kV rating suggests, 60/(2π × 1900). It is 0.006336, the constant of a 1507 kV motor. Manufacturers measure kV with nothing attached to the motor. Under load, real 2207 motors produce 10 to 20 percent more torque for each amp than the rating implies, which is why a thrust stand measures 33 A per motor at full throttle where the rating predicts 41 A. Using the rated value would also need a torque coefficient low enough to put the figure of merit at 0.67, above the range any real propeller reaches. The reasoning is written out at the top of plant.c.',
      'The torque coefficient is calculated from the thrust coefficient through the figure of merit, a measure of how efficiently a propeller turns shaft power into thrust: kq = kt^1.5 / (FM √(2ρA)), where A is the area swept by the propeller. The five inch uses FM = 0.520, the value measured for five inch three-blade propellers (0.50 to 0.53). The page Thrust, torque and figure of merit explains this. The simulator reads the value back from the compiled constants through sim_bf_debug case 12, and an automatic check keeps it between 0.4 and 0.6.',
      'Whoop constants, from SIM_AIRFRAME_WHOOP65: mass 0.0234 kg; moments of inertia 6.0, 7.4 and 12.5 × 10⁻⁶ kg m²; propeller radius 0.0155 m; one cell of 55 mΩ, which includes the connector and the wires; figure of merit 0.310. The figure of merit is much lower than the five inch\'s because air friction on small blades turning at high speed wastes a larger share of the power. The moments of inertia are estimates, and plant.c lists the published sources for the other numbers.',
    ],
    sim: [
      'None of these numbers are CLI settings. Pack charge sets the starting voltage of each cell, from 4.20 V down to 3.50 V on the five inch and from 4.35 V down to 3.60 V on the whoop, and everything else is fixed in the physics model. A new airframe would be a new entry in the airframe table.',
    ],
    related: ['physics-motor', 'physics-fm', 'physics-sag', 'start-honesty'],
    source: 'src/native/plant.c airframe table (SIM_AIRFRAME_5IN, SIM_AIRFRAME_WHOOP65), STAGE1.md',
  }),

  page({
    id: 'physics-timestep',
    chapter: 'physics',
    title: 'Fixed time steps and repeatable flights',
    kicker: 'The aircraft',
    lede: 'The physics does not depend on how fast your computer draws the picture. That is why a recorded flight replays exactly and a lap time can be compared with anyone else\'s.',
    figure: 'timestep',
    air: [
      'The physics moves forward in fixed steps of one millisecond, whatever the screen is doing, and the picture is drawn from the results. If the picture stutters, the quad in the calculation is still exactly where it would have been. A recorded flight therefore replays identically, bit for bit, on a different computer.',
      'The other approach is to move the physics forward by however long the last frame took to draw. Then a slow frame would produce a different flight, a faster computer would produce a different lap time, and the automatic checks would mean nothing, because the same stick inputs would no longer give the same result.',
    ],
    lab: [
      'sim.c runs at SIM_STEP_HZ = 1000 steps a second, and sim_step(n) moves the simulation forward by n milliseconds. The host program in src/main.js adds up the real time between frames and spends it in whole 1 ms steps. The renderer then draws the quad at a position between the two most recent physics states, which is called interpolation. The update of the quad\'s orientation is split into smaller parts, so that the simulator\'s own maths library stays within the range where its sine and cosine are accurate, and the result is then scaled back to unit length.',
      'Straight-line motion uses semi-implicit Euler integration: the velocity is updated first, then the position is updated using the new velocity. Gravity is added along the world\'s vertical axis after the forces on the body have been turned into world directions. The order of the operations never changes. The module is compiled with the options -fno-fast-math and -ffp-contract=off, which stop the compiler from reordering or combining decimal (floating point) operations, and without relaxed SIMD, a feature whose results can vary between computers.',
      'The random noise used for propwash and gyro vibration comes from xorshift32 generators, seeded in the simulation state and in the code that connects Betaflight to the physics, and reset at the start of every run. They use whole-number operations only, turned into a decimal number in a fixed range at the end. Math.random is never used.',
    ],
    sim: [
      'Checks 2, 3 and 4 measure this. Check 2 runs the same flight twice in one process. Check 3 runs it in Node and in Chrome. Check 4 runs it at simulated frame rates of 30, 60, 144 and 240 frames a second. Each time, a fingerprint (hash) of the full record of the flight must be identical. If a change to the rendering changes the fingerprint, a frame time or a JavaScript maths call has reached the physics. If a change to the physics does not change it, the check itself is broken.',
    ],
    related: ['start-welcome', 'physics-wash', 'physics-gyro'],
    source: 'src/native/sim.c, src/native/sim_abi.h, CLAUDE.md',
  }),

  page({
    id: 'physics-motor',
    chapter: 'physics',
    title: 'Motors: voltage, current and delay',
    kicker: 'The aircraft',
    lede: 'The throttle does not set the thrust directly. It sets a duty cycle, and the motor and propeller take time to speed up before the thrust changes.',
    figure: 'motor',
    air: [
      'When you push the throttle up, the flight controller tells each motor\'s electronic speed controller (ESC) to apply more of the battery voltage to the motor\'s windings, the coils of wire inside it. The motor does not reach its new speed at once. The bell, which is the spinning outer case the propeller is fixed to, has mass, and so does the propeller. For a few hundredths of a second you wait while they speed up. This delay is a large part of the difference between a quad that feels crisp and one that feels soft.',
      'The current in a motor depends on two voltages. The applied voltage drives current through the resistance of the windings. The spinning motor also works as a generator and produces a voltage that opposes the applied one, called back EMF. As the motor speeds up, the back EMF grows and the current falls. A real ESC also has inductance, which slows changes in current, and a maximum current. This physics model has neither, so for the first few milliseconds of a sudden full throttle it draws a current that would damage a real battery. The rotor takes much longer than that to speed up, so the spike has gone before it can change the thrust. It shows in the simulator\'s state readout but not in how the quad flies.',
      'The load on the motor also depends on the air. In a descent, air flowing up through a propeller makes it easier to turn, so at the same throttle the motor spins faster.',
    ],
    lab: [
      'The average voltage applied to a motor is the duty cycle d times the battery voltage under load V. The current is i = (d V − ke ω) / R, where ke ω is the back EMF, ω is the motor\'s angular speed in radians per second and R is the winding resistance. The motor\'s torque is ke i. The rotor speeds up according to j dω/dt = ke i − Q, where j is the rotor\'s moment of inertia and Q is the torque needed to turn the propeller. The duty cycle is limited to between 0 and 1, and ω cannot go below 0, because these motors do not reverse.',
      'In still air, Q = kq ω². When air moves through the propeller, the torque is split into two parts, as blade element theory does: a part caused by the friction of the air on the blades, which depends only on ω², and a part that depends on the thrust T and on the speed of the air through the propeller: Q = (1 − FM) kq ω² + T (va + vi) / ω. Here va is the speed of the air along the propeller\'s axis caused by the quad\'s own motion, and vi is the extra speed the propeller gives the air. In a hover this equals kq ω² exactly, so the hover and motor checks are unchanged. The result is kept between 0.90 and 1.60 times kq ω². The lower limit is a protection chosen to keep the climb check inside its measured range, not a result of the physics.',
      'The rotor\'s moment of inertia is 8.0 × 10⁻⁶ kg m², a little below the value for a real 2207 motor bell with a five inch propeller, about 9 × 10⁻⁶. Check 8 applies full duty to a motor at rest and measures how long it takes to reach 63 percent of its final speed, which must be between 10 and 30 ms. With 9 × 10⁻⁶ the result was about 29 ms, too close to the limit, so 8.0 × 10⁻⁶ was chosen. The result is now 26 ms.',
      'An ESC current limit of 48 A per motor was built and tested. It reduced the peak battery current from 410 A to 192 A, but it slowed the motor so much that check 8 took 51 ms, outside its range, so it was removed. plant.c records these measurements.',
      'The battery voltage and the motor currents depend on each other, so the model solves for both together in every step. Using the previous step\'s values instead would make the numbers oscillate. V = (Voc + Rp B / R) / (1 + Rp A / R), where Voc is the battery\'s voltage with no current flowing, Rp is its internal resistance, A = Σ d² and B = Σ d ke ω, with the sums taken over the four motors.',
    ],
    sim: [
      'The dshot_idle_value setting works here. It sets the lowest power the mixer will send to a motor, as DShot idle does on a real flight controller. The settings min_throttle, max_throttle and min_command belong to the older PWM motor signal. They are stored but not used, because the code that connects Betaflight to the physics model uses DShot values. motor_kv is also stored but not used, because each aircraft\'s motor constant is fixed in the physics model.',
    ],
    related: ['physics-fm', 'physics-sag', 'cli-dshot_idle_value', 'physics-advance'],
    source: 'src/native/plant.c motor loop and torque note',
  }),

  page({
    id: 'physics-fm',
    chapter: 'physics',
    title: 'Thrust, torque and figure of merit',
    kicker: 'The aircraft',
    lede: 'The thrust of a propeller and the torque needed to turn it both grow with the square of its speed. They are linked by the power the propeller gives to the air, and the figure of merit measures how well it does that.',
    figure: 'figmerit',
    air: [
      'A propeller pushes air downwards. The force this makes is the thrust. The turning force needed to spin the propeller is the torque. The two are linked by energy: the power put into the shaft has to supply the power carried away by the moving air. A propeller that made a lot of thrust for very little torque would give out more energy than it took in, which is impossible. An early version of this simulator used constants that did exactly that, and they were calculated again.',
      'The figure of merit measures this efficiency. It is the power an ideal propeller would need to hover, divided by the shaft power the real propeller uses. An ideal propeller scores 1.0. Real five inch racing propellers score between about 0.4 and 0.6. The rest of the power is lost to the friction of the air on the blades, the swirl of the air behind them and the air that spills round the blade tips. The five inch in this simulator uses 0.520, the value measured for five inch three-blade propellers. The whoop uses 0.310, because its small blades lose more to friction.',
      'The figure of merit also affects yaw, because a quad turns its nose using the torque of its propellers. If the figure of merit is too high, the torque is too low, and the quad has to move more air than a real one to turn its nose.',
    ],
    lab: [
      'For one propeller in a hover, the ideal power is T^1.5 / √(2ρA), where T is the thrust, ρ is the air density and A is the area swept by the propeller. The shaft power is torque times angular speed, kq ω³. The figure of merit is FM = ideal power / shaft power. Putting T = kt ω² into these gives kq = kt^1.5 / (FM √(2ρA)), with A = π × 0.0635² m² for the five inch. The simulator calculates kq from kt in this way, so the two can never be set independently.',
      'The value 0.520 was checked against thrust stand measurements, which are independent of the simulator. A 2207 1900 kV motor on 6S with a 5×4.3×3 propeller makes about 1.5 kgf of thrust (14.7 N) using about 600 W of shaft power at 26,000 RPM. That is a torque of 0.22 N m, and a ratio of torque to thrust of 0.0150 m. This ratio is kq / kt. The simulator\'s value is 0.01536, the closest any figure of merit between 0.4 and 0.6 comes to the measurement.',
      'Thrust after the air flow corrections is T = kt ω² × axial, where axial is a factor from the advance ratio, vortex ring state, propwash and translational lift pages. The drag torque uses the propeller\'s speed relative to the air, which includes the quad\'s own yaw rate r: ωrel = spin × ω + r, where spin is +1 or −1 depending on which way the propeller turns. When the quad yaws, one pair of propellers is loaded more and the other less, and the difference opposes the yaw. This is called yaw damping. The Motors page explains how the torque also changes with the air flowing through the propeller.',
    ],
    sim: [
      'Yaw authority comes from this torque, so a torque coefficient that is too small makes yaw weak. When the figure of merit was 2.01, other constants had to be distorted to make up for it. The simulator now derives kq from kt in its code, so the two cannot drift apart, and sim_bf_debug case 12 reads the figure of merit back from the compiled constants: 0.5202 for the five inch.',
    ],
    related: ['physics-motor', 'physics-advance', 'physics-vrs', 'physics-yaw'],
    source: 'src/native/plant.c propulsion note, PROGRESS.md (the change from 0.565 to 0.520)',
  }),

  page({
    id: 'physics-sag',
    chapter: 'physics',
    title: 'Battery sag',
    kicker: 'The aircraft',
    lede: 'A battery behaves like a fixed voltage in series with a small resistance. When it supplies a large current, some of its voltage is lost across that resistance, so the motors receive less.',
    figure: 'sag',
    air: [
      'A freshly charged battery makes the quad accelerate harder than one that has been flying for two minutes, even though plenty of charge is left. Every battery has an internal resistance, and when a large current flows the voltage at its terminals drops. The motors then receive less voltage and cannot spin as fast. This drop is called sag, and pilots describe the result as the battery falling off.',
      'At full throttle the five inch draws about 137 A from its battery, and the battery voltage drops by about 2 V, from 25.2 V to about 23.2 V. Because of this the quad makes about 8.1 times its weight in thrust under Earth\'s gravity, rather than the 9.3 times it would make if the voltage did not drop.',
      'The Pack charge setting, on the Before you fly screen, chooses the starting voltage of each cell: on the five inch, 4.2 V for a full battery, 3.8 V halfway through a flight and 3.5 V for an almost empty one. It does not count down as you fly, because the battery\'s capacity is not modelled, so a flight never ends by running out of charge. A lower setting gives weaker motors for the whole flight.',
    ],
    lab: [
      'Each cell of the five inch\'s battery has an internal resistance r_cell of 0.0025 Ω, so the six-cell battery has 0.015 Ω. The voltage under load comes from the calculation on the Motors page, which solves for the battery voltage and the motor currents together. The battery current is the sum over the motors of the duty cycle times the motor current, wherever that product is positive.',
      'Check 11 measures sag. It flies the same full throttle climb with the cells at 4.20 V and at 3.60 V, and the peak motor speed with the lower voltage must be between 4 and 15 percent lower. The result is 11.1 percent.',
      'The vbat_* settings are inert, because the physics model owns the battery. Betaflight\'s vbat_sag_compensation works here: it scales the controller\'s output according to the cell voltage it is given, and the simulator gives it the physics model\'s sagged voltage. It changes what the controller asks for. It does not change the battery.',
    ],
    sim: [
      'There is no model of battery temperature, no C rating and no separate connector resistance: 2.5 mΩ per cell is the value plant.c gives for a real six-cell 1300 mAh race battery. The whoop\'s single cell is 55 mΩ including its connector and wires, and its voltage falls by 23 percent at full throttle.',
    ],
    related: ['physics-motor', 'cli-vbat_sag_compensation', 'physics-airframe'],
    source: 'src/native/plant.c battery solve, tests/thresholds.json check 11',
  }),

  page({
    id: 'physics-advance',
    chapter: 'physics',
    title: 'Advance ratio and pitch speed',
    kicker: 'The aircraft',
    lede: 'A propeller makes less thrust when air is already moving through it in the direction it pushes. If that air moves fast enough, the thrust falls to zero.',
    figure: 'thrustmu',
    air: [
      'When the quad climbs quickly, air flows down through the propellers because of the quad\'s own motion. The propellers then add less speed to that air, and the thrust falls. This is why a full throttle climb does not keep accelerating, and it also limits the speed of a full throttle dive, even before drag is counted.',
      'What matters is the speed of the air through each propeller, not the speed of the quad through the sky, and rotation changes it too. When the quad rolls, the propellers on the rising side move upwards through the air and the propellers on the falling side move downwards. The rising side loses thrust and the falling side gains thrust. The difference makes a torque that opposes the roll, which is called aerodynamic rate damping. Without it, only the PID controller would stop a rotation, and a quad modelled without it overshoots and springs back when the stick is centred.',
    ],
    lab: [
      'The speed of the air along each propeller\'s axis is va = vz + p y − q x, where vz is the quad\'s speed along its own z axis, p and q are its roll and pitch rates, and x and y give the motor\'s position. The pitch of a propeller is the distance its blades would move along its axis in one turn if they moved exactly in the direction the blade angle points. The pitch speed is the pitch times the number of turns per second. In the code it is max(ω, 60) × k_inflow, where k_inflow is the pitch divided by 2π: 4.3 inches / 2π = 0.017382 m per radian on the five inch.',
      'The advance ratio μ (the Greek letter mu) is va divided by the pitch speed. When μ is 0 or more, in a climb, the thrust factor is axial = 1 − μ, and never less than 0. When μ is between −0.30 and 0, in a gentle descent, axial = 1 − μ as well, so the thrust rises. Faster descents use the vortex ring state model on the next page.',
      'The propeller speed used for the pitch speed is never allowed below 60 rad/s, so that a stopped propeller cannot cause a division by zero. This is a simplified blade element model in which the thrust reaches zero when the air speed reaches the pitch speed. It is not a full calculation of the air flow around a real five inch propeller.',
    ],
    sim: [
      'STAGE1.md, the simulator\'s first plan, left the advance ratio for a later stage. The code has it, and uses both the part caused by the quad\'s movement and the part caused by its rotation. The whoop\'s propellers have a pitch of only 0.7 inches, so its thrust falls away much sooner in a climb.',
    ],
    related: ['physics-vrs', 'physics-wash', 'physics-damping', 'physics-fm'],
    source: 'src/native/plant.c advance ratio block',
  }),

  page({
    id: 'physics-vrs',
    chapter: 'physics',
    title: 'Vortex ring state',
    kicker: 'The aircraft',
    lede: 'When a quad descends into the air its own propellers have just pushed down, that air starts to circulate around the propellers in a ring. The propellers lose thrust, the quad sinks faster, and the sticks have less effect. Pilots call the worst of this falling through.',
    figure: 'vrs',
    air: [
      'Helicopters are known for this effect, and a quadcopter has it on each of its four propellers. A slow descent causes no trouble. Air flows up through the propellers from below, and they make slightly more thrust than they do in a hover. At a faster descent this steady flow breaks down. Some of the air the propellers have pushed down flows back up around the outside of each propeller and is pushed down through it again, forming a ring of circulating air. The propellers lose thrust, and the pilot loses control authority, which means the sticks have less effect than usual.',
      'The motors can sound as if they are working normally, or even speed up. In a descent the air flowing up through each propeller makes it easier to turn, so at the same throttle the motor spins faster.',
      'The way out is the same as for a helicopter: stop descending into your own downwash. Pitch or roll so that the quad moves sideways into air that has not been pushed down, and add power once the propellers are in that clean air. If you drop straight down with the propellers level, expect control to become weak partway through the fall.',
    ],
    lab: [
      'The simulator describes a descent with the advance ratio μ from the previous page, which is negative when the quad is descending. It uses three ranges. From 0 to −0.30 the descent is shallow: the upward air helps the propeller, and the thrust rises in a straight line as the descent gets faster, up to 1.30 times the thrust the same propeller speed gives in a hover.',
      'From −0.30 to −1.20 the propeller is in the vortex ring state, and the thrust falls in a straight line from 1.30 times the hover value to 0.75 times. Beyond −1.20 the thrust stays at 0.75 times the hover value.',
      'This shape matches the range of descent speeds where momentum theory, the simple model of a propeller used elsewhere in the simulator, stops giving valid answers. It was not fitted to make the quad feel a particular way.',
      'On a real quad the four propellers do not lose thrust together, because each one sits in a different part of the air moving around the other three and around the frame. The simulator makes each propeller\'s loss slightly different, by up to about 3 percent, which is about how much one propeller differs from another on a real quad. The four differences add up to zero. Without them, all four propellers would lose exactly the same thrust, and the quad would lose height with no other disturbance, which is not what pilots feel on a real quad.',
    ],
    sim: [
      'This page covers the average loss of thrust. The shaking that comes with it is called propwash and has its own page. Propwash is switched on only in a descent into the downwash. The simulator\'s automatic flight checks (checks 5 to 12) were measured with this thrust loss in place, and propwash does not change their results.',
      'In the Arcade flight style the differences between the four propellers and the propwash shaking are turned off. The average loss of thrust is the same in Arcade and Expert. The motor load also follows the air flow, which is why the motors speed up in a descent (see Motors: voltage, current and delay).',
      'The values are set in plant.c. The loss starts at μ = −0.30, is complete at μ = −1.20, and leaves 75 percent of the thrust. Of the four propellers, one loses 3.1 percent less than the average, one 1.7 percent more, one 2.8 percent more and one 1.4 percent less.',
    ],
    related: ['physics-wash', 'physics-advance', 'physics-etl'],
    source: 'src/native/plant.c, the descent branch of the motor loop, PLANT_VRS_* and PLANT_INFLOW_ASYM',
  }),

  page({
    id: 'physics-wash',
    chapter: 'physics',
    title: 'Propwash',
    kicker: 'The aircraft',
    lede: 'In a descent the propellers lose thrust on average, and the air through them also becomes unsteady. The unsteady part makes the quad shake, and no controller setting can remove it completely.',
    figure: 'wash',
    air: [
      'When a real quad dives into the air it has just pushed down, pulls out of a dive, or cuts the throttle at the top of a flip, it shakes. The pilot sees it in the video and feels it through the sticks, as the flight controller keeps correcting a gyro reading that will not settle. A simulator without propwash is unrealistically smooth, and one with too much shakes all the time.',
      'In this simulator propwash appears only where the physics says it should: when the quad descends into its own downwash. When the quad climbs, its propellers are in clean air. In a hover it is not descending through its wake at all. The model switches the shaking on according to how deep the descent is, so it starts and stops where it does on a real quad.',
    ],
    lab: [
      'The depth of the descent is measured against the induced velocity, vh = √(T / (2ρA)), the speed at which the propeller pushes air down in a hover. The ratio rw is the descent speed divided by vh. Recirculation starts at rw = 0.25, is strongest at rw = 1.0 and ends at rw = 3.0. The range is that wide because the frame, battery and arms also leave a wake that the propellers sit in; a single propeller on its own would be clear by about rw = 2. The strength rises in a straight line from 0 at rw = 0.25 to 1 at rw = 1.0, then falls in a straight line to 0 at rw = 3.0.',
      'The unsteady air is made from four separate random signals, one per propeller, from xorshift32 generators. Each signal passes through two simple filters at 30 Hz and 3 Hz, so that it contains changes between about 3 and 30 times a second. The filter coefficients at 1 kHz are 0.171796 and 0.018673. The signal\'s average size (its root mean square) is 0.16730, measured over four million samples, and it is limited to three times that. Each propeller\'s thrust factor becomes axial + axial × k_propwash × depth × wash, where wash is that propeller\'s signal. k_propwash is 0.15 on the five inch and 0.05 on the whoop.',
      'The frequency range is chosen for a reason. Slower changes, below about 3 Hz, are removed by the I term, and faster ones, above about 30 Hz, are removed by the D term filter, so neither would feel like propwash. The random signals run every step whether or not the quad is in its wake, so flying into the wake does not restart them from zero, and only the part scaled by depth is applied.',
      'k_propwash is a feel constant: its value was chosen by pilots flying the simulator and reporting whether the shaking felt right. The mechanism it scales comes from the physics.',
    ],
    sim: [
      'The flattening of the grass under the quad is drawn by the renderer to show downwash. It is not connected to this model, so it cannot be used to judge k_propwash. In the Arcade flight style propwash is turned off.',
    ],
    related: ['physics-vrs', 'physics-gyro', 'physics-damping'],
    source: 'src/native/plant.c PROPWASH note and wash filters',
  }),

  page({
    id: 'physics-etl',
    chapter: 'physics',
    title: 'Translational lift',
    kicker: 'The aircraft',
    lede: 'A hovering propeller works in air it has already pushed down. When the quad moves sideways, the propellers meet fresh air, and the same throttle makes more thrust.',
    figure: 'etl',
    air: [
      'If the quad accelerates out of a hover without any change of throttle, it rises slightly. At speed it needs less throttle to hold its height than it does in a hover, because the propellers are working in air that has not already been pushed down. Helicopter pilots call this effective translational lift, and they feel it as a shudder and a gain in lift at about walking pace. The same equation applies to the four smaller propellers of a quadcopter.',
      'If a simulator leaves this out, hovering and fast flight feel like two different aircraft, and the pilot has to keep adjusting the throttle in a way a real five inch does not need.',
    ],
    lab: [
      'The thrust coefficient kt is set so that axial = 1 in a hover, which already includes the hover induced velocity vh. What changes as the quad moves sideways is the induced velocity vi, so the correction is axial_gain = (vh − vi) / pitch speed. It is exactly zero in a hover or in a straight vertical climb, and it is never more than 0.35, because at idle the pitch speed falls faster than vi and the ratio would grow without limit.',
      'vi comes from Glauert\'s inflow model, the same one used for rotor drag, calculated from the ideal thrust kt ω², because the actual thrust is what this correction is about to produce. The model solves the same equation twice per propeller per step instead of repeating a calculation until it settles, because each 1 ms step must finish in a fixed number of operations.',
    ],
    sim: [
      'Checks 5, 6, 7 and 11 fly straight up and down, where the sideways speed is almost zero, so this term cannot affect their results.',
    ],
    related: ['physics-hforce', 'physics-advance', 'physics-vrs'],
    source: 'src/native/plant.c TRANSLATIONAL LIFT block',
  }),

  page({
    id: 'physics-hforce',
    chapter: 'physics',
    title: 'Rotor drag (the H-force)',
    kicker: 'The aircraft',
    lede: 'At racing speed the propellers slow the quad down more than its body does. Without this rotor drag, a simulated quad slides through corners.',
    figure: 'hforce',
    air: [
      'A spinning propeller that moves sideways through the air does not only push downwards. It also pulls backwards, because the blade moving forwards into the oncoming air meets it faster than the blade moving back, and the difference produces a force in the plane of the propeller. Helicopter engineers call this the H-force. On a quadcopter it is why the quad slows down when it levels out, why a sideways slide stops, and why pitching up to 45 degrees slows the quad quickly.',
      'An earlier version of this simulator had no H-force. There, a quad levelled off at 20 m/s on hover throttle still had half of that speed 3.2 seconds later, and a 50 degree banked turn followed a circle of 29 m radius because the quad kept sliding outwards. Pilots described it as floaty.',
    ],
    lab: [
      'For each propeller, H = k ρ A vi V, where V is the speed of the air across the propeller disc and vi is the induced velocity from Glauert\'s model: vi = vh² / √(V² + vi²). The simulator calculates this in a rearranged form, y² = 2 / (√(x⁴ + 4) + x²) with x = V / vh and y = vi / vh, which avoids losing accuracy when x is large. At low speed y is close to 1, and H grows in proportion to V. At high speed y approaches 1/x and H levels off at k T / 2, so it does not cut the top speed too much. A version in which H grew in proportion to speed at every speed reduced the top level speed from 139 km/h to 87 km/h.',
      'On the five inch, k = 0.43842. It comes from a published measurement of about 0.30 per second of drag in proportion to speed, at hover, for a 0.6 kg five inch quad: 4ρA vh = 0.444787 kg/s, so k = 0.65 × 0.30 / 0.444787. That published value already includes some body drag, so k is an upper limit, and the body drag areas were reduced afterwards so that the same drag is not counted twice. The whoop uses k = 0.70, because its ducts turn more of the air.',
      'The force acts at the height of the propellers, 0.020 m above the centre of gravity on the five inch. It therefore produces a nose-up turning effect in forward flight, and a rolling effect away from the direction of a sideways slide. The turning effects about the vertical axis from the four propellers cancel, except for a small part caused by the quad\'s rotation, which damps yaw.',
    ],
    sim: [
      'Rolling and pitching move the propellers up and down, not sideways, so they produce no H-force and do not change the rate response. Climbs and punches move air straight through the propellers, so they are not affected either. That is why this term could be added without changing the results of checks 5 to 12.',
    ],
    related: ['physics-noseup', 'physics-drag', 'physics-etl', 'physics-yaw'],
    source: 'src/native/plant.c section 3b ROTOR DRAG',
  }),

  page({
    id: 'physics-drag',
    chapter: 'physics',
    title: 'Body drag',
    kicker: 'The aircraft',
    lede: 'The body of a quad meets the air with a different area from the front, the side and underneath. With a single drag value it would be equally slippery in every direction, and no real quad is.',
    figure: 'drag',
    air: [
      'Flying belly first into the air, as in a flare, where the pilot pitches up hard to slow down, presents far more area than flying nose first. Flying sideways is different again, because the battery is longer than it is wide and adds area that is not seen from the front. With one drag value for all three directions, a quad would slow down no harder in a flare than in a cruise. The simulator uses three different areas.',
      'Body drag also grows with the square of the speed. A value chosen to give the right top speed therefore gives very little drag at medium speeds. Something else must slow the quad in corners, and on a quadcopter that is the rotor drag of the propellers.',
    ],
    lab: [
      'The drag force along each body axis is F = 0.5 ρ CdA v |v|, acting against the motion, where CdA is the drag area in that direction. On the five inch the underside (plan) area cda_plan is 0.0225 m², the front area cda_front 0.0130 m² and the side area cda_side 0.0147 m². The front is about 0.011 m² of frame and parts seen from the front, with a drag coefficient near 1.2. The side adds the battery\'s extra 35 mm by 75 mm face, about 0.0017 m² of drag area. The plan area is the underside only. It does not include the rotor drag of the propellers, which is calculated separately.',
      'Before the H-force was added, all three areas were 0.016 m², doing two jobs at once. They were fitted again afterwards against the maximum level speed test, which measured 128 km/h, inside its range of 120 to 165 km/h.',
      'The whoop\'s drag areas are 0.00253 m² underneath, 0.00084 m² at the front and 0.00092 m² at the side. The underside value is what stops a whoop falling flat at about 10 m/s instead of 40 m/s.',
    ],
    sim: [
      'Because body drag grows with the square of the speed, it is weak at medium speed and strong at the top, and the H-force fills the gap. Body drag, the advance ratio and battery sag together set the top speed.',
    ],
    related: ['physics-hforce', 'physics-airframe', 'physics-advance'],
    source: 'src/native/plant.c cda_* notes',
  }),

  page({
    id: 'physics-noseup',
    chapter: 'physics',
    title: 'Pitching up at speed',
    kicker: 'The aircraft',
    lede: 'On the five inch the propellers are 20 mm above the centre of gravity. Because of that height difference, rotor drag tips the nose up, and every real multirotor has this effect.',
    figure: 'noseup',
    air: [
      'Fly a real quad fast with the pitch stick centred and its nose rises. Pilots correct it with a little forward stick, or let the I term hold it. The same effect means that cutting the throttle at speed changes the quad\'s angle as well as its thrust, so part of the slowing you feel is the quad rotating.',
      'A force that does not act through the centre of gravity produces a moment, or turning effect, about it. Rotor drag pulls backwards at the height of the propellers, 20 mm above the centre of gravity, so it rotates the quad nose up. If the propellers were modelled at the same height as the centre of gravity, this moment would disappear.',
    ],
    lab: [
      'Each propeller is placed 0.020 m above the centre of gravity on the five inch, and 0.006 m on the whoop (pos_z in the airframe table). On the five inch the arms are fixed to the middle plate of the frame, the propeller sits about 28 mm above that plate once the motor bell and hub are included, and plant.c works out that the centre of gravity of a 650 g quad with a 250 g battery on top is about 8 mm above the plate, a difference of about 20 mm. A force straight along the z axis acting at a point (x, y, z) has a moment of (y F, −x F, 0), which does not depend on z, so the hover and punch checks cannot change. The nose-up moment comes from the sideways H-force acting at that height.',
    ],
    sim: [
      'Before this term was added, the pitching moment in forward flight was exactly zero at every speed.',
    ],
    related: ['physics-hforce', 'physics-cant', 'physics-airframe'],
    source: 'src/native/plant.c pos_z note',
  }),

  page({
    id: 'physics-cant',
    chapter: 'physics',
    title: 'Motor cant and roll-to-yaw coupling',
    kicker: 'The aircraft',
    lede: 'A perfectly symmetrical quad in the X layout (QUADX) would not yaw when it rolls, at the level of detail this model works to. Real frames are not perfectly symmetrical, so a real quad yaws a little in a roll, and the simulator models that with small motor misalignments.',
    figure: 'cant',
    air: [
      'Roll a real quad hard and it turns its nose a little at the same time. Pilots either add a touch of yaw stick or accept it. A quad with no coupling at all would be built more accurately than any factory builds: motors are never aimed to a tenth of a degree, moulded arms are never exactly square, and four screws never pull a motor down perfectly flat.',
      'Each motor in this simulator is therefore given a fixed misalignment, called cant, of less than two degrees. That is the size of error a moulded arm and four screws produce. A roll then leaves a small yaw turning effect behind, and in a hover the I term corrects what is left, as it would on a real quad.',
    ],
    lab: [
      'Symmetry explains why the cant is needed. In the mixer the roll column is (−1, −1, +1, +1), and each side has one clockwise and one anticlockwise motor, so for any effect f that depends on the roll command, the sum over the four motors of SPIN[m] f(roll[m]) is zero. Drag torque, the reaction on the motors, the angular momentum of the propellers and the advance ratio all cancel in pairs. The inflow differences of the vortex ring model do not create coupling on a symmetrical frame either.',
      'On the five inch the sideways (tangential) cant of the four motors is −0.9, +1.4, +0.6 and −1.2 degrees. Their sum, −0.1 degrees, gives a small yaw drift in a hover. Their sum weighted by the roll column, −1.1 degrees, gives the coupling. A right roll turns the nose to the right, the direction check 10 expects. The outward (radial) cant of 1.4, 0.85, 1.15 and 0.6 degrees is chosen so that the sideways forces from the tangential cant cancel in a hover. Radial cant cannot cause yaw, because a force pointing straight out from the centre has no turning effect about the vertical axis. The whoop uses a smaller set.',
      'These values are a model of how accurately quads are built. They were chosen, not measured on a real frame. Check 10 rolls the quad for one second at half throttle and requires between 0.04 and 0.6 degrees of yaw in the expected direction.',
    ],
    sim: [
      'No yaw-on-roll term is written into the simulator. The coupling comes out of the physics. In the Arcade flight style the cant is turned off and every motor points straight up.',
    ],
    related: ['physics-yaw', 'physics-gyroscopic', 'start-honesty'],
    source: 'src/native/plant.c cant tables, tests/thresholds.json check 10',
  }),

  page({
    id: 'physics-yaw',
    chapter: 'physics',
    title: 'Yaw: how a quad turns its nose',
    kicker: 'The aircraft',
    lede: 'A quadcopter has no tail rotor. It turns its nose by making one pair of propellers harder to turn than the other pair, and the reaction turns the frame.',
    figure: 'yawtorque',
    air: [
      'Two of the propellers spin clockwise and two spin anticlockwise. In steady flight the torques needed to turn them cancel out. To turn the nose right, the mixer speeds up the pair that spins one way and slows down the other pair. The torques no longer cancel, and the reaction on the motors turns the frame. Yaw is weaker and slower than roll or pitch, and it affects everything else, because the motors that make it also hold the quad up.',
      'This explains several things pilots notice. Yaw feels slow when the idle setting is low, because the motors that need to slow down are already close to their minimum. Yaw becomes weak at full throttle, because the motors that need to speed up are already at their maximum. Airmode matters for the same reason: at zero throttle without airmode, the mixer has no room to change any motor\'s speed.',
    ],
    lab: [
      'The reaction on the frame from each motor is −spin × ke × i along the motor\'s axis, which is slightly tilted by the cant. The propeller\'s drag torque is kq ωrel |ωrel| in still air (the Motors page explains how it changes with the air flow). With yaw_motors_reversed off, the mixer\'s yaw column is −1, +1, +1, −1 for the rear right, front right, rear left and front left motors, and mixer.c reverses the sign of the yaw PID output. The code that connects Betaflight to the physics model passes the gyro\'s yaw rate as +r. The comment on PLANT_SPIN in plant.c lists the whole chain of signs, and reversing any one of them makes the loop run away.',
      'Integrated yaw (use_integrated_yaw) is a Betaflight mixer option that treats yaw as the integral of the difference between the motor pairs, instead of a direct torque command. It works here, and it is off in this simulator\'s tunes unless a preset turns it on.',
    ],
    sim: [
      'yaw_motors_reversed works here, but the physics model\'s table of spin directions does not change with it. Turning it on makes the firmware and the physics disagree about which way the propellers spin, and the quad spins out of control in yaw. The setting exists to tell the firmware which way the propellers spin, so it must match the aircraft.',
    ],
    related: ['physics-cant', 'physics-fm', 'control-mixer', 'cli-yaw_motors_reversed'],
    source: 'src/native/plant.c PLANT_SPIN, src/native/bf/bf_glue.c',
  }),

  page({
    id: 'physics-damping',
    chapter: 'physics',
    title: 'Aerodynamic rate damping',
    kicker: 'The aircraft',
    lede: 'The air resists rotation before the flight controller does anything. Without this effect in the model, the D term would have to do the job of the physics.',
    figure: 'damping',
    air: [
      'When a quad rolls, the propellers on one side move up through the air and those on the other side move down. The rising propellers make less thrust and the falling ones make more, at least until the falling pair reaches the vortex ring state. The difference is a torque that opposes the roll. Yaw has its own version: the quad\'s own yaw rate adds to the speed of one pair of propellers relative to the air and subtracts from the other pair.',
      'Pilots notice this effect most when it is missing. A simulated quad without aerodynamic damping overshoots when the stick is centred and is then pulled back by the flight controller, which pilots call snap-back. Some of that comes from the D gain doing its job. In a model without aerodynamic damping, most of it is the controller making up for a force that should be in the physics.',
    ],
    lab: [
      'For roll and pitch, the air speed through each propeller, va, includes the terms p y − q x, so the thrust factor axial(μ) changes with the roll and pitch rates, and that change is the damping. An older model of descent held axial at a fixed limit of 1.35, which made that change zero, and that is how the damping went missing. For yaw the effect comes from ωrel = spin × ω + r, and the H-force adds a little more yaw damping through the rotation of the propeller discs.',
    ],
    sim: [
      'If a tune that is smooth on a real five inch oscillates here, check the damping and the gyro noise before lowering P. If a tune that is smooth here oscillates on a real five inch, check the filters, because this simulator\'s gyro is still cleaner than one on a real quad with a bent motor bell.',
    ],
    related: ['physics-advance', 'physics-vrs', 'physics-hforce', 'control-pid'],
    source: 'src/native/plant.c motor loop preamble',
  }),

  page({
    id: 'physics-gyroscopic',
    chapter: 'physics',
    title: 'Gyroscopic coupling',
    kicker: 'The aircraft',
    lede: 'Each spinning motor bell and propeller is a small gyroscope. The four are arranged so that their effects cancel, and some manoeuvres stop them cancelling.',
    figure: 'gyroscopic',
    air: [
      'A spinning wheel resists being tilted, and if it is tilted anyway, it pushes back at right angles to the push. So forcing a spinning propeller to pitch produces a turning effect in yaw. Two propellers spin one way and two spin the other, so most of this cancels, which is an advantage of the quadcopter layout. It does not cancel completely when the four propellers spin at different speeds, which happens in every roll.',
    ],
    lab: [
      'The torque on the body includes the term −ω × (I ω + h), where ω is the quad\'s rotation rate, I is its moment of inertia and h is the total angular momentum of the four propellers: the sum of spin × j_rotor × ω along each motor\'s axis. I is diagonal, so the body part is the standard Euler coupling of a rigid body, and it never cancels: a rigid body spinning about one axis while it rotates about another produces a moment about the third, with or without propellers. The opposite spins keep h small in a hover, but not during a roll, when one diagonal pair of propellers spins faster and the other slower.',
    ],
    sim: [
      'There is no setting for this effect. It comes out of the physics, and making it stronger would need heavier motor bells or a different arrangement of spin directions, which would be a change to the airframe.',
    ],
    related: ['physics-yaw', 'physics-cant', 'physics-motor'],
    source: 'src/native/plant.c section 4 omega × (I omega + h)',
  }),

  page({
    id: 'physics-gyro',
    chapter: 'physics',
    title: 'Gyro vibration',
    kicker: 'The aircraft',
    lede: 'The quad\'s body rotates smoothly, but the gyro does not report smooth rotation. It also measures the vibration of the frame, and Betaflight\'s filters exist to remove that vibration.',
    figure: 'gyronoise',
    air: [
      'The flight controller is fixed to a frame that is shaken by four propellers, none of them perfectly balanced. The gyro reports the real rotation plus that shaking, and the filters stop the PID controller from reacting to the shaking. In a simulator with a perfectly clean gyro, the filters would do nothing and a high D gain would cause no problems, so a tune made there would oscillate on a real quad.',
      'In this simulator the vibration is added to the gyro reading, not to the motion of the quad. The body of the quad stays rigid, and the vibration reaches the flight path in the same way it does on a real quad: through the controller reacting to it.',
    ],
    lab: [
      'bf_glue.c adds two kinds of vibration. The first is a line at each propeller\'s own rotation frequency, caused by imbalance. Its size grows with the square of the propeller\'s speed, each motor has a slightly different imbalance factor, roll and pitch get the sine and cosine of the same phase, and yaw gets half the size, which is a chosen value rather than a calculated one. The second is a broad band of vibration between 80 and 350 Hz, made in the same way as the propwash signal. Under both is a small sensor noise of 0.30 degrees per second.',
      'A gyro read 1,000 times a second cannot record any vibration faster than 500 Hz. The propellers turn at about 130 revolutions a second at idle and about 425 at full throttle, which is below that limit. The blade passing frequency, three times the rotation frequency on a three-blade propeller, is not modelled. The broad band reaches 2.0 degrees per second at full throttle and the imbalance line 1.0 degree per second. Pilots flying the simulator judged these sizes. The broad band is scaled by its average size, 0.340474, measured over eight million samples.',
      'The gyro signal follows the same path as in Betaflight\'s own software-in-the-loop (SITL) build: a decimal value in degrees per second, converted to 16-bit whole-number counts at a full scale of 2,000 degrees per second, then passed to Betaflight\'s gyro.c filter chain.',
    ],
    sim: [
      'This vibration is what the gyro_lpf and rpm_filter settings work against here. The dynamic notch still does not start at 1 kHz, and the imbalance lines are there for the RPM filter to remove. The yaw share of 0.5 is the one chosen number in this model, and the comment in bf_glue.c says so. In the Arcade flight style the gyro noise is turned off.',
    ],
    related: ['control-filters', 'physics-wash', 'cli-rpm_filter_harmonics', 'cli-gyro_lpf1_static_hz'],
    source: 'src/native/bf/bf_glue.c GYRO VIBRATION',
  }),

  page({
    id: 'physics-radio',
    chapter: 'physics',
    title: 'The radio link',
    kicker: 'The aircraft',
    lede: 'No radio link delivers stick positions at perfectly even times. Feedforward and RC smoothing both depend on those timings, so the radio link is part of the control loop.',
    figure: 'radio',
    air: [
      'The sticks are not wired to the flight controller. A packet leaves the transmitter, spends a few milliseconds in the air and in the receiver, and now and then does not arrive at all. ExpressLRS (ELRS) at 250 packets a second is a common racing setup. It has about 4 ms of delay, less than a millisecond of variation in timing, which is called jitter, and loses a few packets in every ten thousand.',
      'The default in this simulator is a perfect link, which feels slightly sharper than a real radio. To fly with the timing of the radio you own, choose an ELRS or Crossfire preset in the Radio link setting. Keep the perfect link when you are trying to set a lap time, so that a record never changes because a simulated packet went missing.',
    ],
    lab: [
      'The link model is in src/input/link.js, with five presets: perfect (250 Hz, with no delay, jitter or loss); ELRS 500 Hz (3.0 ms of delay, 0.4 ms of jitter, 200 lost packets per million); ELRS 250 Hz (4.0 ms, 0.8 ms, 400 per million); ELRS 150 Hz (6.0 ms, 1.4 ms, 800 per million); and Crossfire 150 Hz (7.5 ms, 1.8 ms, 1,200 per million). Jitter is spread evenly within plus or minus the jitter value. The random numbers come from a seeded xorshift32 generator, as the propwash noise does. The WebAssembly module never sees the generator, only stick samples with their times attached, and a recording stores what was delivered.',
      'Feedforward uses the change in the setpoint divided by the time between radio packets. With perfectly even packets that division is smoother than any real hardware gives. RC smoothing adds to the effect, because it sets its filter frequencies from the measured time between packets, so a perfect interval chooses a filter that no real link would get.',
    ],
    sim: [
      'The link model runs outside the WebAssembly module on purpose. If it ran inside, the record of every flight would depend on the link\'s random seed, and every existing recording would stop replaying correctly. The automatic checks run with the link turned off.',
    ],
    related: ['control-ff', 'cli-rc_smoothing', 'physics-timestep'],
    source: 'src/input/link.js',
  }),

  page({
    id: 'physics-ground',
    chapter: 'physics',
    title: 'The ground, walls and ground effect',
    kicker: 'The aircraft',
    lede: 'The physics model itself handles the quad\'s contact with the ground, roofs, walls, gates, trees and the train, 1,000 times a second. Ground effect, the extra thrust close to the floor, is modelled for the whoop.',
    figure: 'collide',
    air: [
      'You can land on the ground or on a roof. A gentle arrival settles the quad on the surface, where it can slide, come to rest or tip over. A fast arrival bounces, and a hard hit on a wall or a gate can knock the quad onto its side.',
      'If the quad ends up upside down on the ground, TURTLE MODE appears. Move the pitch or roll stick and the simulator flips the quad back over; you do not have to time it. Betaflight\'s own turtle mode, which spins the motors on one side to push the quad over, runs while you hold the T key. If the quad is still and not upright for 1.5 seconds (5 seconds in turtle mode), the simulator sets it down nearby. Pressing X does the same at any time.',
      'Close to the floor, a propeller\'s downwash has nowhere to go but sideways, and the propeller makes more thrust. This is ground effect. A whoop flying low over a mat feels it as a cushion under a low hover. The five inch is out of ground effect within a second of taking off, and the simulator does not model it for the five inch.',
    ],
    lab: [
      'Contact is calculated in src/native/world.c, after each physics step and the ground. The quad\'s frame is a box, tested against every nearby box in the world with the separating axis test, and a flat side against a wall touches at up to eight points, so it rests as a patch rather than balancing on one point. Gates, trees and similar objects are capsules: cylinders with rounded ends. A small sphere around the camera stops the lens being pushed into a surface. On the five inch the propellers are soft. Each has thirteen contact points, and a propeller that hits a surface loses speed, 6 percent for every metre per second of closing speed, up to 70 percent. A whoop\'s ducts are part of its frame.',
      'The contact forces are found with an impulse method (accumulated impulses, eight passes per step). Friction is limited to the friction coefficient times the push of the surface, and the bounce depends on the speed of the impact. A quad pushed into a surface is moved back out by at most 5 cm per step. Roofs count as ground: when the centre of gravity is above the top of a box that is higher than the ground, that top is the ground for the step. The train is a box moved every step by the map\'s own formula, so its position depends only on the step number.',
      'Ground effect follows Cheeseman and Bennett\'s formula, T / T∞ = 1 / (1 − (R / 4h)²), where T∞ is the thrust far from the ground, h is the propeller\'s height above the ground and R is taken as twice the propeller radius, 31 mm on the whoop, because the downwash of the four small propellers joins together before it reaches the floor. That choice is the one assumption in this term. At a height of 16 mm the thrust is 1.33 times its value far from the ground, at 50 mm it is 1.025 times, and at 80 mm the gain is 1 percent. It applies only to a propeller facing away from the ground, and it gets weaker with the cosine of the tilt.',
    ],
    sim: [
      'No wind is modelled. The Wind setting in Settings is a sound, the noise of air over the airframe, which rises with speed. It applies no force. The automatic turtle flip, the set-down and the X key belong to the simulator\'s interface in src/main.js. Only the T key runs Betaflight\'s turtle mode, through the mixer.',
    ],
    related: ['physics-airframe', 'physics-vrs', 'start-honesty'],
    source: 'src/native/world.c, src/native/plant.c ground effect, src/game/plantworld.js, src/main.js stuckTick, src/game/collide.js (the set-down search)',
  }),

  page({
    id: 'physics-missing',
    chapter: 'physics',
    title: 'What the physics model leaves out',
    kicker: 'The aircraft',
    lede: 'A missing effect is easy to overlook, so this page lists the effects the simulator does not model.',
    figure: 'missing',
    air: [
      'The physics model has no wind; no blade element theory that divides each blade into sections around its turn; no bending of the propellers or the arms; no motor inductance; no ESC current limit; no temperature model of the motors, battery or ESCs; no camera delay separate from the radio; no video compression; and no Betaflight on-screen display in the goggles. Ground effect is modelled for the whoop only.',
      'Some of these may be added as the project grows. A general purpose physics engine will not be, because none of the available ones is designed for a rotorcraft stepped 1,000 times a second. This page describes the code as it was when the page was last checked, on 24 September 2026.',
    ],
    lab: [
      'Also absent: motors that reverse for 3D flight or for turtle mode (DShot reverse); servos; GPS, magnetometer, barometer and accelerometer hardware, so angle mode takes the quad\'s attitude from the physics model instead; a second gyro; the dynamic notch filter at 1 kHz; vibration at the blade passing frequency; and any interaction between the propellers\' wakes beyond the vortex ring, propwash and inflow difference models.',
      'Contact with the ground and with solid objects is calculated inside the physics module (see The ground, walls and ground effect). The launch stand holds the quad in place with a constraint in sim.c, which fixes its position and is not an aerodynamic model.',
    ],
    sim: [
      'If you need an effect for a research project, read the source rather than assuming a textbook propeller. The parts that come from Glauert\'s model and momentum theory are labelled. The feel constants, k_propwash, the gyro vibration sizes and the motor cant table, are labelled as chosen. Keep the two kinds separate.',
    ],
    related: ['physics-vrs', 'physics-wash', 'physics-motor', 'start-honesty'],
    source: 'STAGE1.md Not in Stage 1, plant.c ESC ceiling note, sim_abi.h, catalog.js INERT_REASONS',
  }),

  page({
    id: 'physics-lens',
    chapter: 'physics',
    title: 'The camera',
    kicker: 'The aircraft',
    lede: 'The camera lens is not part of the flight model, but it changes how you fly, because a pilot flies by the picture.',
    figure: 'lens',
    air: [
      'Camera angle is the angle at which the camera is tilted up on its mount. At 0 degrees it looks straight along the nose, 30 degrees suits cruising, and racers use 45 to 55 degrees, because at speed the quad is pitched steeply forward and a tilted camera then looks where the quad is going. The angle changes no force in the model. It changes where straight ahead appears in the picture, and so it changes the line you fly.',
      'The field of view printed on an FPV camera lens cannot be used directly here. FPV lenses are fisheye lenses, which map the angle from the centre almost in proportion to distance on the picture. The simulator\'s renderer is rectilinear: it keeps straight lines straight and maps by the tangent of the angle. Setting a rectilinear camera to the printed 150 to 160 degrees makes the centre of the picture so small that gates look tiny. The default of 85 degrees vertical makes the centre of the picture the same size as a 155 degree fisheye would, with a little extra width so that the next gate is visible.',
    ],
    lab: [
      'The calculation is in src/render/lens.js. An equidistant fisheye lens has r = f θ, and a rectilinear lens has r = f tan θ, where r is the distance from the centre of the image, θ is the angle from the camera\'s axis and f is the focal length. Making the two agree at the centre requires tan(v/2) = θV, where v is the rectilinear field of view and θV is the fisheye\'s vertical half angle. A 155 degree diagonal lens on a 4:3 sensor has a vertical half angle of 46.5 degrees (0.8116 rad), which gives v of about 78 degrees. The default of 85 degrees on a 16:9 screen is about 117 degrees wide. Making the gates or the world bigger (GATE_SCALE and WORLD_SCALE) cannot change how large things look, because a bigger gate seen from proportionally further away gives the same picture.',
      'The conversion between the simulator\'s axes and the renderer\'s is in src/render/frame.js: x_three = −y_sim, y_three = z_sim, z_three = −x_sim. A mistake here would reverse the sign of every yaw after it.',
    ],
    sim: [
      'Camera angle and field of view are on the Quad screen, and changing aircraft changes them too: the whoop starts with a 95 degree lens. Betaflight\'s fpv_mix_degrees is stored but not used, because BOXFPVANGLEMIX is never switched on, so rc.c never mixes the camera angle into roll and yaw.',
    ],
    related: ['cli-fpv_mix_degrees', 'start-nowings', 'physics-timestep'],
    source: 'src/render/lens.js, src/render/frame.js',
  }),

  page({
    id: 'control-pid',
    chapter: 'control',
    title: 'PID: the three main gains',
    kicker: 'The flight controller',
    lede: 'PID is the calculation the flight controller uses to turn the error into motor commands. The error is the difference between the rotation rate you asked for and the rate the gyro measures. PID has three parts, called P, I and D, and Betaflight adds a fourth, called F.',
    figure: 'pid',
    air: [
      'P stands for proportional. P makes a correction in proportion to the error: twice the error gives twice the correction. With too little P the quad is slow to respond. With too much P it vibrates rapidly, and you hear a buzz from the motors, because P also magnifies any noise that gets past the filters.',
      'I stands for integral. The I term adds up the error over time, so if a small error lasts, the I term keeps growing until the error is gone. A lasting error can come from the nose pitching up at high speed, or from a motor mounted at a slight angle. Wind is another cause on a real quad, but this simulator has no wind. With too little I, the quad slowly drifts away from where you point it. With too much I, the stored correction grows large and is then released suddenly, so the quad lurches. A feature called I-term relax stops the I term growing during a fast stick movement. Without it, a flip would store up a correction that pushes the quad on when you stop.',
      'D stands for derivative. D responds to how fast the rotation rate is changing and acts against fast changes. This reduces overshoot, which is when the quad rotates past the point where you stopped the stick. D also magnifies vibration in the gyro signal, so it has its own filter. A feature called D max lets the quad use a lower D while hovering and a higher D when you move the stick quickly. In Betaflight 4.5 the lower value is still stored under the name d_min.',
    ],
    lab: [
      'On every step the flight controller calculates an error for each axis (roll, pitch and yaw): the target rate, called the setpoint, minus the filtered gyro rate, in degrees per second. The P term is the P gain multiplied by the error. The I term is the I gain multiplied by a running total of the error from every step. Betaflight limits how large the total can grow. Two options change it further: I-term relax holds it back during fast stick movements, and I-term rotation moves the stored total between the roll and pitch axes as the quad yaws.',
      'The D term is the D gain multiplied by how fast the filtered gyro rate is changing. It uses the gyro rate, not the error, so D reacts only to the quad\'s measured movement. Moving the stick changes the setpoint, and D does not react to that change directly. The F term, feedforward, is calculated from how fast the setpoint is changing.',
      'TPA (throttle PID attenuation) reduces P and D, or only D, as the throttle rises. Anti-gravity raises I, and can also raise P, when the throttle changes quickly, so that the quad does not tip in pitch or roll when you suddenly add power.',
      'The gains are numbers in Betaflight\'s own units, not SI units, and each axis has its own values. On real five inch quads yaw D is often low or zero, because the yaw measurement is noisier and the quad has a larger moment of inertia about the yaw axis, which means a larger turning effect is needed to change its yaw rate. A setting called pidsum_limit caps the sum of the terms before it reaches the mixer, so that one axis cannot use up the whole range of the motors.',
    ],
    sim: [
      'Every P, I, D and F setting works here. When you change one and save, the value is written into Betaflight\'s PID profile (pidProfiles(0)), and the flight controller restarts through sim_init and flies with it. There is no PID written in JavaScript: the controller is Betaflight\'s own code, and it uses the gyro reading after filtering, never the exact rotation rate from the physics model. Betaflight\'s onboard blackbox recorder is not included. Instead, the Flight log setting records the whole flight in memory and saves it as a Betaflight blackbox CSV file.',
    ],
    related: ['control-ff', 'control-filters', 'control-tpa', 'cli-p_roll'],
    source: 'vendor/betaflight .../flight/pid.c, bf_glue.c pidController call',
  }),

  page({
    id: 'control-rates',
    chapter: 'control',
    title: 'Rates: how the stick sets the rotation rate',
    kicker: 'The flight controller',
    lede: 'Rates decide how fast the quad rotates for each stick position. A tune belongs to the aircraft and rates belong to the pilot, so they are kept in a separate profile.',
    figure: 'rates',
    air: [
      'The maximum rate is how fast the quad rotates at full stick, in degrees per second. Centre sensitivity is how quickly the rotation rate changes near the centre of the stick, which is not the same as the rate at half stick. Expo bends the curve so that small stick movements give gentle rotation while full stick still gives the same maximum. A pilot can then aim carefully through a gate and still flip quickly afterwards.',
      'This simulator uses Betaflight 4.5.1\'s ACTUAL rates by default: 670 degrees per second at full stick, 70 degrees per second for each unit of stick movement at the centre, and no expo. ACTUAL is the easiest type to reason about, because its two numbers mean exactly what they say. The BETAFLIGHT, KISS, RACEFLIGHT and QUICK rate types all work too, using Betaflight\'s own functions in fc/rc.c.',
    ],
    lab: [
      'From applyActualRates: centreSensitivity = rc_rate × 10; stickMovement = max(0, srate × 10 − centreSensitivity); rate = stick × centreSensitivity + stickMovement × expof, where expof blends in the fifth power of the stick position according to the expo setting. At full stick expof is 1, so the rate is exactly srate × 10. rc_rate and srate are stored in tens of degrees per second, as whole numbers from 0 to 255.',
      'Rates are set in Settings, and configs/rates.js is the only place the menus decide them. Tune files carry no rate profile. The rate profile page on the firmware bench points to Settings, and any rate values saved from the bench go into your own rate profile. Your rates are kept when you change aircraft, unless they are still the standard ones.',
    ],
    sim: [
      'The rates graph is drawn by src/fc/ratescurve.js, a copy of the same formulas used only for display, and the physics does not use it. Check 9 tests that full roll stick reaches the set maximum rate to within 3 percent. Check 12 tests that two diff files that differ only in srate give maximum rates in the same ratio.',
    ],
    related: ['cli-rates_type', 'cli-roll_srate', 'cli-roll_rc_rate', 'cli-throttle_limit_type'],
    source: 'configs/rates.js, vendor/betaflight .../fc/rc.c, src/fc/ratescurve.js',
  }),

  page({
    id: 'control-filters',
    chapter: 'control',
    title: 'Filters: delay against noise',
    kicker: 'The flight controller',
    lede: 'Every filter reduces noise but adds delay, and delay in a feedback loop makes the loop less stable.',
    figure: 'filters',
    air: [
      'Each filter deals with one problem. A low-pass filter lets slow changes through and removes fast ones. The gyro low-pass filter smooths the gyro signal before anything else uses it. The D term low-pass filter adds more smoothing to the D term, the part of the controller most sensitive to noise. Static notch filters remove noise at one fixed frequency, often a vibration of the frame. The RPM filter removes noise at the motors\' rotation frequencies, which change with motor speed, using the motor speeds reported by the ESCs. The dynamic notch filter searches for peaks in the noise while the quad flies, and at 1 kHz Betaflight will not run it.',
      'The filter types differ in how sharply they cut and how much delay they add. PT1 is a gentle first-order filter. PT2 and PT3 cut more sharply and add more delay. A biquad filter can be set up as a notch or a peak. A lower frequency setting means more smoothing. On some static notch settings, 0 means the filter is off.',
    ],
    lab: [
      'The gyro filters are in sensors/gyro.c, which is compiled. The RPM filter is flight/rpm_filter.c, which gets the motor frequencies from getMotorFrequencyHz. The dynamic notch is compiled and then refused by DYN_NOTCH_UPDATE_MIN_HZ. The D term filters are in pid_init.c and pid.c. yaw_lowpass_hz adds smoothing to yaw alone, because yaw is measured with more noise than roll and pitch.',
      'The simplified filter sliders rewrite the filter frequencies through simplified_tuning.c, and they work here. If simplified_gyro_filter is turned off, the frequencies you typed stay as they are.',
    ],
    sim: [
      'The imbalance lines added to the gyro are the signal the RPM filter was written to remove. If you turn off the RPM filter, set gyro_lpf1 to 0 and fly a full throttle climb, the D term becomes noisy. That shows the physics model and the simulated gyro working correctly. In the Arcade flight style there is no gyro noise, so the filters have almost nothing to remove.',
    ],
    related: ['physics-gyro', 'cli-gyro_lpf1_static_hz', 'cli-rpm_filter_q', 'cli-dyn_notch_count'],
    source: 'bf_glue.c, patches/0001, catalog.js GATED dyn_notch',
  }),

  page({
    id: 'control-ff',
    chapter: 'control',
    title: 'Feedforward',
    kicker: 'The flight controller',
    lede: 'P can only act once the quad is already behind the target, because the error is its only input. Feedforward acts on the movement of the stick instead.',
    figure: 'ff',
    air: [
      'Feedforward measures how fast the stick is moving and starts the motors straight away, on the assumption that you want that rotation, instead of waiting for an error to appear. More feedforward makes the quad respond sooner. Too much makes it overshoot at the start of every movement. A radio link with uneven timing makes this worse, because a calculation based on rate of change sees uneven timing as very fast stick movement.',
      'The extra settings around feedforward exist for that reason. Averaging, smoothing, jitter reduction and a maximum rate limit are all there because the rate of change of the stick, measured across packets arriving 250 times a second, jumps around. A perfect link does not test them properly, so tune feedforward on the ELRS 250 Hz preset if that is the radio you fly.',
    ],
    lab: [
      'f_roll, f_pitch and f_yaw are the gains. feedforward_averaging averages the last 2, 3 or 4 values. feedforward_smooth_factor adds a low-pass filter. feedforward_jitter_factor reduces small spikes. feedforward_boost adds extra at the start of a movement. feedforward_max_rate_limit stops feedforward asking for more than the rates curve allows. feedforward_transition fades feedforward in as the stick moves away from the centre.',
      'All of these work here, in the compiled pid.c and rc.c.',
    ],
    sim: [
      'Flying with a keyboard in angle mode does not need racing feedforward; flying acro with a radio does. If feedforward seems too good on the perfect link, the reason is explained on The radio link page.',
    ],
    related: ['physics-radio', 'control-pid', 'cli-f_roll', 'cli-feedforward_jitter_factor'],
    source: 'vendor/betaflight flight/pid.c feedforward, src/input/link.js',
  }),

  page({
    id: 'control-tpa',
    chapter: 'control',
    title: 'TPA, anti-gravity and airmode',
    kicker: 'The flight controller',
    lede: 'To the flight controller, a quad in a hover and the same quad at full throttle behave like two different aircraft. Three features deal with the difference.',
    figure: 'tpa',
    air: [
      'The first is throttle PID attenuation (TPA). At high motor speed a small change in motor power changes the thrust more, so the same gain corrects harder at full throttle than in a hover, and gains that suit the hover start to oscillate at full throttle. TPA reduces P and D above a set throttle, called the breakpoint. tpa_low does the opposite at very low throttle, where the motors have little control authority.',
      'The second is anti-gravity. When the throttle is raised suddenly, the quad tips in pitch or roll before the I term has time to correct it. Anti-gravity raises I, and can also raise P, while the throttle is changing quickly, so that the tip does not happen. It does not measure gravity: it reacts to fast changes in the throttle signal.',
      'The third is airmode. Without airmode, cutting the throttle sends all four motors to idle, which leaves the mixer no room to speed one motor up and slow another down, so the pilot has no control until the throttle comes back. Airmode lets the mixer keep working around idle, so a flip at zero throttle still has motors to control it.',
    ],
    lab: [
      'TPA is in pid.c, in PD or D mode. Anti-gravity is a feature switch plus a gain, a cut-off frequency and a P gain, and the throttle filter behind it is updated from mixTable. Airmode is a feature switch. On a real flight controller, airmode_start_throttle_percent and pid_at_min_throttle are read by fc/core.c, which is not compiled here, so in this simulator airmode is active whenever the feature is on, and neither setting has an effect.',
      'AIRMODE and ANTI_GRAVITY are CLI feature lines rather than ordinary settings, and both work here.',
    ],
    sim: [
      'To see why airmode exists, turn it off and try a flip at zero throttle.',
    ],
    related: ['control-mixer', 'cli-tpa_rate', 'cli-anti_gravity_gain', 'cli-airmode_start_throttle_percent'],
    source: 'flight/pid.c, flight/mixer.c, catalog.js FEATURES',
  }),

  page({
    id: 'control-mixer',
    chapter: 'control',
    title: 'Mixer, idle, dynamic idle, launch control and turtle mode',
    kicker: 'The flight controller',
    lede: 'The mixer turns three rotation commands and a throttle into four motor outputs. It is also where the quad runs out of room to do what it is asked.',
    figure: 'mixer',
    air: [
      'Mixer type LEGACY adds the throttle and the roll, pitch and yaw commands for each motor. LINEAR and DYNAMIC change how the throttle and the PID share the motor range when one motor is asked for more than 100 percent, which decides whether the command is followed or cut off. EZLANDING helps with landing and is not meant for racing.',
      'DShot idle sets a minimum motor speed a few percent above stopped, so that the motors keep turning while airmode works. If it is too low, yaw disappears at the bottom of the throttle, because the motors that need to slow down cannot. If it is too high, the quad will not descend. Dynamic idle watches the motor speeds and raises the minimum when a motor would slow too much, which on a real quad prevents an ESC losing track of its motor, called a desync. The physics model cannot desync, but dynamic idle still runs, because the physics model reports real motor speeds back to Betaflight.',
      'Launch control holds the quad\'s attitude at idle until the throttle passes a set point, so that a racer can leave the start gate cleanly. Press L on the start line to use it.',
      'Betaflight\'s turtle mode, called crashflip, is also part of the mixer. While you hold the T key, the pitch and roll sticks spin the motors on one side to push the quad over, and the crashflip settings control how those motors respond. When the quad rests upside down, the simulator also offers its own automatic flip, which does not use the mixer.',
    ],
    lab: [
      'mixTable in mixer.c is compiled. dshot_idle_value is the digital idle setting. The dyn_idle_* settings write to the PID profile and mixer_init, with getMotorFrequencyHz supplying the motor speeds that telemetry would supply on a real quad. The launch control logic is in bf_glue.c, because fc/core.c is not compiled, but the PID profile settings it reads are Betaflight\'s own.',
      'yaw_motors_reversed reverses the sign of the mixer\'s yaw column. isFlipOverAfterCrashActive, which switches the mixer into turtle mode, is raised while the T key is held (setManualFlip in src/main.js), and the I term is cleared when turtle mode starts and when it ends. DShot reverse, which reverses the motors in turtle mode on a real quad, is not modelled.',
    ],
    sim: [
      'motor_output_limit works here and limits the motor range to a percentage. It is similar to throttle_limit, but it belongs to the PID profile rather than the rate profile, and it limits the PID output as well as the throttle. Use one of them on purpose, not both by accident.',
    ],
    related: ['physics-yaw', 'cli-dshot_idle_value', 'cli-mixer_type', 'cli-dyn_idle_min_rpm'],
    source: 'flight/mixer.c, bf_glue.c launch control and crashflip, bf_settings.c',
  }),

  page({
    id: 'control-simplified',
    chapter: 'control',
    title: 'Simplified tuning sliders',
    kicker: 'The flight controller',
    lede: 'The sliders are Betaflight\'s own code. They calculate the real PID gains from a few slider positions.',
    figure: 'simplified',
    air: [
      'The sliders are Master, P, I, D, D Max, feedforward and pitch compared with roll. They let a pilot change a tune as a whole instead of as twelve separate numbers, and the firmware calculates p_roll and the other gains from the slider positions. The order matters: if you type gains and then move a slider, the slider\'s values replace the typed ones. A diff file that ends with a simplified tuning apply line replaces any gains typed above it.',
      'The filter sliders do the same for the gyro and D term filter frequencies. Turn the simplified filter switch off if you want typed frequencies to stay.',
    ],
    lab: [
      'simplified_pids_mode can be OFF, RP or RPY, and applySimplifiedTuning is compiled. The sliders on the PIDs screen write the simplified_* settings and then send a simplified tuning apply line, so without this code the sliders would change nothing. The tunes that ship with the simulator type their gains directly.',
    ],
    sim: [
      'The sliders work here. If moving a slider changes nothing, the apply line was not read. That happened once, and it is why bf_settings.c uses a table of settings instead of a chain of text comparisons that reported success for settings it did not know.',
    ],
    related: ['control-pid', 'cli-simplified_master_multiplier', 'start-compiled'],
    source: 'config/simplified_tuning.c, configs/, bf_settings.c history comment',
  }),

  page({
    id: 'control-angle',
    chapter: 'control',
    title: 'Angle mode and self-levelling',
    kicker: 'The flight controller',
    lede: 'In acro mode the stick sets a rotation rate. In angle mode the stick sets a tilt angle. Most pilots learn in angle mode and race in acro.',
    figure: 'angle',
    air: [
      'In angle mode, moving the pitch stick asks for a tilt, not a flip, and letting go returns the quad to level by itself. Most people use it to learn to hover. It also teaches habits a racer has to unlearn, because a racing quad spends much of a lap at angles angle mode will not allow: it holds the quad to about thirty degrees of bank. Horizon mode, which mixes the two, is stored here but never switched on.',
      'Racing with a keyboard starts in angle mode, because a key is either on or off. Freestyle uses the flight mode setting whatever you fly with. Pressing M in flight switches between angle and acro and keeps the choice. You can use launch control in angle mode: while launch control holds the quad on the start line, Betaflight\'s rules switch angle mode off, and it comes back after the launch.',
    ],
    lab: [
      'sim_set_angle_mode switches ANGLE_MODE on, and pidLevel reads angle_p_gain, angle_feedforward, angle_limit, angle_earth_ref and angle_feedforward_smoothing_ms. It takes the quad\'s attitude from the physics model\'s quaternion through a stand-in for the IMU, the part of a real flight controller that works out the attitude from its sensors. The horizon_* settings are stored but not used, because HORIZON_MODE is never switched on.',
      'level_race_mode works here. It is a Betaflight option that changes how angle mode levels the quad; its page in the settings reference has the detail.',
    ],
    sim: [
      'The flight mode setting on the Quad screen and the Modes tab on the firmware bench control the same switch. There are no AUX channels, the quad is always armed, and it cannot be disarmed by accident in flight.',
    ],
    related: ['cli-angle_p_gain', 'cli-horizon_level_strength', 'start-nowings'],
    source: 'bf_glue.c ANGLE_MODE and launch control, catalog.js horizon APPLIED_INERT, src/main.js flipFlightMode',
  }),
];

export const ARTICLE_BY_ID = new Map(ARTICLES.map((a) => [a.id, a]));

export function articlesIn(chapter) {
  return ARTICLES.filter((a) => a.chapter === chapter);
}
