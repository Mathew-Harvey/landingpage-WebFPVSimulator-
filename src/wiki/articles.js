/*
 * articles.js: journey and physics pages for the FPV wiki.
 *
 * Every physics claim here is taken from src/native/plant.c, sim.c,
 * sim_abi.h, bf_glue.c, src/input/link.js, src/game/collide.js or
 * src/render/lens.js. If the code and this page disagree, the code wins
 * and this page is wrong.
 *
 * Voice: two columns on each page. "In the air" is for somebody who has
 * never held a radio. "In the lab" is for somebody who wants the equation.
 * Neither is a paraphrase of the other with longer words.
 *
 * Source paths in the pages name files in the simulator repository. If the
 * code and this page disagree, the code wins and this page is wrong.
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
  { id: 'start', title: 'The journey', note: 'What FPV is, what the four motors are doing, and what this simulator computes.' },
  { id: 'physics', title: 'The aircraft', note: 'Everything the airframe itself does, before the computer gets involved.' },
  { id: 'control', title: 'The controller', note: 'Betaflight 4.5.1, compiled, not rewritten.' },
  { id: 'cli', title: 'Every setting', note: 'One page per Betaflight 4.5.1 catalog key, including the grey ones.' },
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
      { id: 'air', title: 'In the air', paras: air },
      { id: 'lab', title: 'In the lab', paras: lab },
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
    title: 'How a racing drone actually flies',
    kicker: 'Start here',
    lede: 'Four propellers, none of them steerable, no wings and no moving control surface anywhere on the aircraft. Everything a racing quadcopter does, it does by changing how fast four discs spin.',
    figure: 'loop',
    air: [
      'A five inch racing quadcopter weighs about as much as a full can of soft drink and will accelerate straight up faster than a sports car accelerates forward. The pilot cannot see it. They are standing on the ground in goggles, watching a video feed from a camera bolted to the front of the machine, flying entirely from the aircraft\'s point of view. That is what first-person view means, and it is the reason the sport exists: the experience is not of operating a model in front of you, but of riding something small at racing speed.',
      'The controls are two sticks and nothing else. In the Mode 2 layout almost everyone uses, the left stick sets throttle and yaw and the right stick sets roll and pitch. There are no ailerons, no elevator, no rudder pedals and no brake. You point the camera where you want to go and you push, and the aircraft gets there by tilting its whole body so that some of the thrust which was holding it up is aimed sideways instead.',
      'That machine on six cells makes roughly nine times its own weight in thrust, which is the kind of margin a fighter aircraft has in afterburner, on something you can hold in one hand. It will leave a hover and be above the treetops in about two seconds. It will also, if you descend too quickly into the column of air it has just pushed downward, settle into a self-sustaining ring of its own wake and stop making lift while the motors are still screaming. Both of those behaviours fall out of the same handful of equations, and both are in this simulator.',
      'Learning the sticks is a different document and a different screen. This one is about why the sticks do what they do: why a change to a tuning file alters the feel of the aircraft, which parts of that feel belong to the airframe and which to the software, and which of it a browser is genuinely computing rather than approximating.',
    ],
    lab: [
      'The simulator is two machines compiled into one WebAssembly module. The first is Betaflight 4.5.1 itself, the open source firmware that runs on most racing quadcopters: its rates curves, PID controller, filter chain, mixer and rc command handling are compiled from vendor/betaflight rather than reimplemented. The second is the plant, meaning the physical aircraft, written as C in src/native/plant.c, covering motors, propellers, battery, aerodynamics and rigid body. The two step together at a fixed 1000 Hz, and rendering reads a snapshot of the result and interpolates, so frame time never reaches the integrator.',
      'Everything on the physics path is in SI units: metres, kilograms, seconds, radians, newtons, volts and amps. Degrees appear only where a human reads them, in the on-screen display, in the settings copy and in Betaflight configuration values, and they are converted at that boundary. The body frame is right handed with x forward, y left and z up, which is the convention Betaflight and the flight dynamics literature share. Three.js is y-up instead, and that conversion happens exactly once, in src/render/frame.js.',
      'Determinism is treated as a requirement rather than an aspiration, because a lap time that depends on which browser recorded it is not a lap time. There is no relaxed SIMD in the build and no JavaScript Math.sin, Math.cos or Math.pow anywhere on the physics path, since none of those are specified to the last bit and they differ between engines. A fixed libm is compiled into the module instead, randomness comes from a seeded xorshift32, and the same input stream must hash to the same state trace in Node and in Chrome.',
    ],
    sim: [
      'Stage 1 began as a grey plane and a quadcopter, and the product grew around it: maps, a flight controller configurator, a track builder. The aircraft did not grow with it. There is still exactly one airframe, and changing motor_kv in the configurator stores a number that nothing in the flight path reads. Pack charge in the settings menu, by contrast, reaches the plant and changes how the machine flies. The configurator greys out the rows that do nothing, so that the difference is visible rather than hidden.',
      'Read the aircraft chapter before chasing a PID number. A surprising amount of what pilots call tune is the airframe instead: voltage sag, advance ratio, rotor drag, propwash. The controller chapter covers what compiled Betaflight does with that airframe. The last chapter is every setting, including the several hundred that store faithfully and do nothing at all here.',
    ],
    related: ['start-nowings', 'start-loop', 'physics-airframe', 'start-honesty'],
    source: 'CLAUDE.md, STAGE1.md, src/native/sim_abi.h',
  }),

  page({
    id: 'start-whyacomputer',
    chapter: 'start',
    title: 'Why it needs a computer',
    kicker: 'The journey',
    lede: 'Throw a paper aeroplane and it flies. Throw a quadcopter and it tumbles. Everything else on this site follows from that one difference.',
    figure: 'unstable',
    air: [
      'An aeroplane is built to fly straight even when nobody is helping it. The wings are angled slightly upward from the fuselage, so that when a gust tips the aircraft the lower wing meets the air at a steeper angle and lifts harder than the raised one. The tailplane sits at the end of a long lever arm behind the wing, so that when the nose wanders the tail is pushed back into line. None of this needs a pilot or a computer. It is geometry, and it is why a paper aeroplane thrown across a room sorts itself out on the way.',
      'A quadcopter has none of that geometry. It is four motors on the ends of four arms, and when all four push equally there is nothing anywhere on the airframe that prefers level to any other attitude. Tip it ten degrees and it stays at ten degrees. Worse, it does not stay there for long, because no real aircraft is built perfectly: one motor sits a fraction of a degree crooked in its mount, one propeller is a hundredth of a gram heavier than the one opposite, and those small asymmetries add up to a steady push in one direction. The aircraft does not merely fail to correct itself. It diverges.',
      'So something has to watch and push back, without pause, for as long as the machine is in the air. The figure asks how fast, and the answer is uncomfortable. A very good human, reacting to something they can see, manages about five corrections a second, and five is nowhere near enough: by the time a person has registered the tilt and moved a thumb, the aircraft is past the angle from which it could have been saved. The flight controller does the same job a thousand times a second. That gap, between five and a thousand, is the entire reason a quadcopter can be flown at all.',
      'This changes what the rest of this site is describing. Somebody flying a racing quadcopter is not flying the aircraft in the way a pilot flies an aeroplane. They are sending a computer a request for a rotation rate, the computer is flying the aircraft, and the skill of the sport lies in knowing what to ask for.',
    ],
    lab: [
      'A multirotor in hover has no static stability in attitude. With all four rotor thrusts equal, the net moment about the centre of gravity is zero at every orientation, so attitude behaves as a double integrator driven by whatever residual torque exists. There is no restoring term at all, unlike the dihedral and tailplane contributions that give a fixed wing positive static stability. Any bias, whether a build tolerance in a motor mount, a mass imbalance in a propeller, or an unmodelled gust, integrates twice into a divergent attitude.',
      'The figure runs a sample and hold PD loop on attitude against a constant 1.5 mN m bias, using this airframe\'s roll inertia of 0.0035 kg m^2 and its real torque per unit of mixer output. The instability that appears as the update rate falls is genuine discrete time behaviour rather than an exaggeration for effect: hold a control output constant for longer than the closed loop wants to respond, and the phase lost across that hold eats the stability margin. For these gains the transition sits between 50 and 100 Hz, which is why a 1 kHz loop is comfortable and a 5 Hz one is not.',
      'Position is worse than attitude. Attitude at least stays where it is put in the absence of a bias, whereas horizontal position cannot, because a tilt of theta commands a horizontal acceleration of g tan(theta). A small attitude error therefore becomes a growing velocity and then a growing displacement, whatever the pilot does about it afterwards.',
    ],
    sim: [
      'The plant in this simulator contains no stabilising term, because a real airframe contains none either. All of the steadiness a pilot feels here is produced by the compiled Betaflight loop, at 1 kHz, out of gyro readings and nothing else. Turn the gains far enough down on the PID page and the aircraft will do exactly what this page describes.',
      'The steady push the figure uses to destabilise the aircraft is the motor cant table, which is a modelled build tolerance rather than a measurement from a real frame. Motor cant and roll-to-yaw coupling explains what it is and why it is there.',
    ],
    related: ['start-loop', 'control-pid', 'physics-cant', 'control-angle'],
    source: 'src/native/plant.c, which contains no restoring moment',
  }),

  page({
    id: 'start-nowings',
    chapter: 'start',
    title: 'A quad has no wings',
    kicker: 'The journey',
    lede: 'A quadcopter has one force it can point, and no way to point it except by rotating the entire aircraft. Every manoeuvre in the sport follows from that constraint.',
    figure: 'tilt',
    air: [
      'An aeroplane holds itself up with wings and changes direction with control surfaces that bite into the oncoming air. A quadcopter holds itself up by aiming four propellers roughly at the ground, and changes direction by rotating its whole body. Roll to the right and the two motors on the right slow while the two on the left speed up; the aircraft rotates; and now some fraction of the thrust that was holding it up is pulling it sideways instead. Pitch and yaw work the same way on the other two axes. The thrust vector is bolted to the airframe, so the only way to change where it points is to change where the airframe points.',
      'This is also why a quadcopter has no brakes. To slow down, the pilot pitches the nose up, or rolls out of the line of travel, so that the thrust which was accelerating the aircraft now fights the speed it already has, helped by the drag of the propeller discs and of the body. Chopping the throttle reverses nothing. It removes the only force available and drops the aircraft into the column of disturbed air it has spent the last second pushing downward.',
      'The mode a racer flies, called acro, does not level the aircraft when the stick returns to centre. The stick is a request for a rate of rotation in degrees per second, so hands off means stop rotating rather than return to level. If the machine was inverted when the pilot let go, it stays inverted. Angle mode does the levelling job instead, and this simulator switches to it for keyboard pilots, because a key that is either pressed or not pressed makes a poor rate stick.',
    ],
    lab: [
      'The plant integrates Newton\'s second law for a rigid body, m a = sum F and I dot(omega) + omega × (I omega) = sum tau, using a diagonal inertia tensor, a quaternion attitude and semi-implicit Euler on the linear state, all at dt = 0.001 s. Gravity of 9.80665 m/s² is applied along world −z after the body forces have been rotated out.',
      'The body rate convention in sim_abi.h is that positive p rolls right, positive q pitches nose down and positive r yaws nose left. The stick channels follow RC convention instead, where positive pitch is nose up and positive yaw is nose right, and mapping one onto the other is the glue layer\'s job. Getting a single link of that chain backwards turns the control loop into positive feedback, a failure dramatic enough that the diagnosis is recorded in PROGRESS.md and in the comments on PLANT_SPIN.',
      'There is no lifting surface anywhere in the model. Quadratic drag on the plan, front and side areas, computed as 0.5 rho CdA |v| v in the body frame, together with the rotor H-force, are the only translational damping besides gravity and thrust. A banked turn flown without rudder therefore washes out the way a real acro quad does, with the nose failing to track the velocity vector, because nothing in the physics makes it track.',
    ],
    sim: [
      'The How to fly screen is the short version of this page with live gimbals on it. If a trajectory in this simulator ever feels like an aeroplane, the fault is in the drag model or the H-force. That is a plant bug, not a tune.',
    ],
    related: ['start-loop', 'physics-drag', 'physics-hforce', 'control-rates'],
    source: 'src/native/sim_abi.h, src/native/plant.c',
  }),

  page({
    id: 'start-loop',
    chapter: 'start',
    title: 'The closed loop',
    kicker: 'The journey',
    lede: 'A thousand times a second the aircraft asks itself one question: am I rotating at the rate the pilot asked for? Everything the flight controller does is an answer to it.',
    figure: 'loop',
    air: [
      'Move the roll stick. The radio packs the stick positions into a packet and transmits it. The flight controller receives the packet, runs the stick position through the pilot\'s rates curve to get a demanded rotation rate in degrees per second, and compares that demand against what the gyroscope says the aircraft is doing. The difference between the two is the error. The PID controller turns the error into four motor commands; the motors change speed; the propellers change thrust; the aircraft rotates; the gyroscope notices; and the error shrinks. That conversation happens a thousand times a second, and the pilot is one participant in it.',
      'Every part of the loop can fail in a way the pilot can feel. If the gyroscope is picking up frame vibration along with rotation, the controller chases ghosts and the motors buzz. If the motors are slow to answer, because the bells have mass or the battery is sagging or the propellers are already moving through fast air, the correction arrives late and the aircraft overshoots. And if the pilot asks for more rotation than the airframe can deliver, the motor commands saturate and the machine does what physics allows rather than what the rates curve promised.',
      'Feedforward is the clause that breaks the pattern. Instead of waiting for an error, it watches how fast the stick itself is moving and starts the motors on the assumption that the pilot meant it, which is most of what makes a well set up quad feel connected to the hand. It also means the radio matters: a link with perfectly even packet timing hands feedforward a cleaner derivative than any real radio can produce, which is why this simulator includes a link model that can be switched on.',
    ],
    lab: [
      'Each 1 ms step in bf_glue.c runs in Betaflight\'s own order: read the gyro device, which is the plant\'s angular velocity plus modelled imbalance, quantised the way a 16-bit sensor at 2000 deg/s full scale would quantise it; gyroFiltering; updateRcCommands and processRcCommand against the simulated clock; pidController; mixTable. The motor duties that come back become the plant\'s duty vector. Dynamic idle and the RPM filter read getMotorFrequencyHz from the plant, lagged the way DShot telemetry lags.',
      'The PID runs in degrees per second and the plant runs in radians per second, so the glue converts between them. TPA and the throttle filter that drives anti-gravity are updated from mixTable, matching Betaflight\'s own sequencing. Calling pidController with a stale throttle was a real bug once, and the fix is called out in bf_glue.c so that it is not reintroduced.',
      'Input samples carry their own timestamps, and sim.c applies each one before the 1 ms step that contains it rather than when it happened to arrive by wall clock. Feeding irregular packet times straight into a fixed-step integrator is what pilots read as floaty.',
    ],
    sim: [
      'Pressing save on the flight controller screen runs sim_init on a CLI dump, which is the same path as dropping a Betaflight diff onto the page. The interface never writes a PID gain into the plant directly. Greyed options are named rather than hidden, and options marked live reach compiled 4.5.1 parameter groups.',
    ],
    related: ['control-pid', 'physics-gyro', 'physics-radio', 'control-filters'],
    source: 'src/native/bf/bf_glue.c, src/native/sim.c',
  }),

  page({
    id: 'start-compiled',
    chapter: 'start',
    title: 'The controller is ported, not written',
    kicker: 'The journey',
    lede: 'A racing simulator can either write its own controller or compile the real one. This project compiles the real one, and that single decision shapes everything else about it.',
    figure: 'boundary',
    air: [
      'The tempting shortcut is to write a PID controller in the game engine. It takes a few dozen lines, it plots convincingly, and it flies like a different aircraft. The reason is that what a pilot means by Betaflight is not three gains. It is the D-term filter chain, throttle PID attenuation, I-term relax, anti-gravity, feedforward averaging, the mixer, airmode and perhaps a dozen other clauses, almost every one of which exists because somebody crashed into an edge case and then wrote code so that nobody else would. Reimplement the three gains and you have the skeleton and none of the behaviour.',
      'So this project vendors Betaflight 4.5.1 and compiles its control loop to WebAssembly. A dump pasted into the configurator is parsed by that firmware rather than by an imitation of it. The simplified tuning sliders run Betaflight\'s own simplified_tuning.c. The rates graph drawn on the configurator screen is a preview only; the aircraft is flown by applyRates in fc/rc.c, the same function a real flight controller runs.',
    ],
    lab: [
      'The compiled sources include pid.c, pid_init.c, mixer.c, mixer_init.c, rc.c, rc_controls.c, controlrate_profile.c, the gyro filtering chain, rpm_filter, dyn_notch_filter, which then refuses to arm at 1 kHz exactly as it would on a slow real board, and simplified_tuning.c. Hardware is stubbed out: no UART, no MSP, no OSD pixels, no GPS. Local changes live as patch files in patches/ and are applied at build time, and git diff --stat vendor/betaflight must come back empty after a build.',
      'The licence is GPLv3, because compiling somebody else\'s control loop into your program makes it a derivative work of theirs. Every file in this repository carries that header, and a dependency with an incompatible licence cannot be added.',
    ],
    sim: [
      'The flight controller screen is modelled on Configurator 10.10, down to the tab names, the 4.5.1 field set and the dark grey and orange. It is not that application: no Vue, no MSP, no iframe. Save writes CLI text, and readback dumps the live parameter groups, so the screen cannot show a value the firmware does not hold.',
    ],
    related: ['control-pid', 'start-honesty', 'cli-index'],
    source: 'CLAUDE.md, src/native/bf/bf_glue.c, patches/',
  }),

  page({
    id: 'start-honesty',
    chapter: 'start',
    title: 'Live, gated, inert',
    kicker: 'The journey',
    lede: 'Most of a flight controller\'s settings have nothing to do with flying. This simulator shows them anyway, greyed out and labelled, rather than pretending they are not there.',
    figure: 'status',
    air: [
      'A real Betaflight Configurator lets you set the video transmitter channel, lay out the on-screen display, configure GPS rescue and choose LED colours. This simulator has no video transmitter, no Betaflight OSD drawn over the camera view, no GPS receiver and no LEDs. Those settings still exist here, because a dump pasted in from a real aircraft should come back out unchanged rather than silently missing half its lines. They are shown in grey. Change one and export, and the new value will be in the file. It will not change how the aircraft flies.',
      'A second category is stranger, and it is Betaflight\'s own doing. The dynamic notch filter refuses to run below a 2 kHz gyro loop. This loop runs at 1 kHz, the same as a slower real board, so the dynamic notch settings store correctly, the code is compiled and present, and the sliding discrete Fourier transform it runs on, the SDFT, never starts. That is the firmware behaving as designed rather than a wiring fault here, and the catalog calls it gated.',
      'A third category looks as though it should work and does not. motor_kv is the one everybody reaches for: it writes to a real parameter group, and nothing in the 1 ms loop reads that group, because the plant\'s motor constant is its own number. The aircraft is still the Stage 1 five inch whatever the field says. The catalog calls that applied but inert.',
    ],
    lab: [
      'src/fc/catalog.js is the single place that decides a key\'s status. LIVE means the key writes a parameter group this build compiles, and that code runs. GATED means it writes the group and this firmware then ignores it at 1 kHz. APPLIED_INERT means it writes a real group that nothing in the flight path reads. INERT means a real 4.5 CLI key whose subsystem is not compiled here. ABSENT means Configurator chrome that is not a CLI key at all.',
      'Do not read sim_bf_key_status as a statement about whether a key does anything. A native return of 0 means the key is in the write table, which includes both GATED and APPLIED_INERT keys. The catalog, not the native call, decides what is greyed.',
    ],
    sim: [
      'Every key in the catalog has a page in this wiki. Live pages describe what raising the value does to this aircraft. Grey pages describe what the key does on a real machine and then say plainly that it does not fly here. If a live page and a flight disagree, that is a bug in the catalog and worth reporting.',
    ],
    related: ['cli-index', 'control-filters', 'physics-airframe'],
    source: 'src/fc/catalog.js, src/native/bf/bf_settings.c',
  }),

  page({
    id: 'start-howto',
    chapter: 'start',
    title: 'How to read this wiki',
    kicker: 'The journey',
    lede: 'Two columns on every page, a status label, and a figure you can drive. The plain column and the technical column are not the same sentence at two different lengths.',
    figure: 'anatomy',
    air: [
      'In the air is the version you could tell somebody at the flying field. In the lab is the version you could defend in a design review. In this simulator is the seam between them: which file, which status, which verification check, and which parts of the phenomenon are not modelled at all.',
      'Every figure has a control underneath it. Drag the control and the drawing and the numbers move together, because the figure is computing the relationship the page describes rather than illustrating it from memory. Figures animate unless the browser has been asked for reduced motion. They are arguments rather than photographs, and the caption states what each one is arguing.',
      'Flight feel cannot be verified from a page. The simulator\'s own harness, run with npm run verify, is the signal for the plant, and when a page here cites a check it is citing a number out of that harness rather than an impression.',
    ],
    lab: [
      'The related links at the foot of each page are the intended reading path rather than an index of every mention. Pages about a single CLI gain link back to the family article, whether PID, rates or filters, so that no individual number is left orphaned.',
      'Sources listed on a page are file paths in the simulator repository. They are not citations of textbooks. Where a textbook result is used, as with Glauert inflow, the momentum theory figure of merit or the shape of the vortex ring gap, the comment in the plant source is the citation, because that is where the implementation chose a particular form.',
    ],
    sim: [
      'This wiki is a page on the landing site rather than a screen inside the simulator. It does not step the integrator, and opening it does not affect a flight in progress.',
    ],
    related: ['start-welcome', 'physics-timestep', 'cli-index'],
    source: 'src/wiki/',
  }),

  page({
    id: 'physics-airframe',
    chapter: 'physics',
    title: 'The Stage 1 airframe',
    kicker: 'The plant',
    lede: 'One aircraft, and every number that describes it is a constant in a C file rather than a field you can edit.',
    figure: 'quadx',
    air: [
      'The machine is a 650 gram five inch quadcopter: a 220 mm frame, 2207 motors of roughly 1900 kV, five inch three-blade propellers with 4.3 inches of pitch, and a six cell 1300 mAh battery. That is a thoroughly ordinary specification, the kind of thing sitting on a table at any race meeting, and it is the only aircraft in this build. Switching to a different tune does not change the motors. Nor does typing a different motor_kv into the configurator.',
      'Fully charged it makes about 9.2 times its own weight in thrust. The consequence is arithmetic: a hover takes roughly one fifth of the throttle stick, and the remaining four fifths are climb. Pilots therefore set a throttle limit, not to fly more slowly, but to spread the useful part of the stick across a range a thumb can resolve, because a hover band a few percent wide is almost impossible to sit in.',
    ],
    lab: [
      'PlantParams holds the aircraft: mass 0.65 kg; inertia diagonal 0.0035, 0.0038 and 0.0068 kg m² in roll, pitch and yaw; arm_x = arm_y = 0.110/sqrt(2) m; kt = 1.98e-6 N/(rad/s)²; kq = 2.80e-8 N m/(rad/s)²; ke = 0.006336 V s/rad; r_motor = 0.1825 ohm; j_rotor = 8.0e-6 kg m²; six cells at 2.5 mOhm each; rho = 1.225 kg/m³; propeller radius 0.0635 m.',
      'ke is deliberately not 60/(2 π 1900). A motor\'s nameplate kV is measured unloaded, and the loaded torque constant of a real 2207 is better than the plate suggests, which is why a thrust stand draws less current than the nameplate predicts. Forcing the nameplate value would require a kq low enough to push the figure of merit above anything a real propeller achieves. The airframe is still a 1900 kV motor; 0.006336 is its loaded constant, and the reasoning is recorded in the comment block at the top of plant.c.',
      'The figure of merit is enforced rather than assumed: kq = kt^1.5 / (FM sqrt(2 rho A)) with FM = 0.565, inside the physically plausible band of 0.4 to 0.6. An earlier pair of constants produced a figure of merit of 2.01, which is thermodynamically impossible, and sim_bf_debug case 12 now recomputes the value from the compiled constants so that it cannot drift back.',
    ],
    sim: [
      'None of these numbers are exposed as CLI fields. Pack charge in the settings menu sets the cell open circuit voltage, at 4.2, 3.8 or 3.5 V, and everything else is fixed in the plant. A different airframe would be a change to the shape of the physics model rather than a value a wiki page can offer.',
    ],
    related: ['physics-motor', 'physics-fm', 'physics-sag', 'start-honesty'],
    source: 'src/native/plant.c PlantParams, STAGE1.md',
  }),

  page({
    id: 'physics-timestep',
    chapter: 'physics',
    title: 'Fixed timestep and determinism',
    kicker: 'The plant',
    lede: 'The aircraft in this simulator does not know how fast your computer is drawing. That is a deliberate decision, and a load-bearing one.',
    figure: 'timestep',
    air: [
      'What appears on screen is a recording of a calculation that is indifferent to the display. If the picture stutters, the aircraft in the calculation is exactly where it would have been anyway, because the physics advances in fixed one millisecond steps that bear no relationship to the frames. This is why a recorded flight replays bit for bit identically on two different machines.',
      'The alternative, in which the physics advances by however long the last frame happened to take, sounds harmless and is not. A slow frame would become a different flight. A fast computer would produce a different lap time from a slow one. And no verification check would mean anything, because the same input would no longer produce the same output twice.',
    ],
    lab: [
      'sim.c steps at SIM_STEP_HZ 1000, and sim_step(n) advances n milliseconds of simulated time. The host in src/main.js accumulates the real frame delta and spends it in whole 1 ms ticks, while the renderer interpolates between the two most recent physics states. The quaternion update subdivides so that the small angle approximation in the compiled libm stays inside its accurate range, then renormalises.',
      'The linear update is semi-implicit Euler, velocity before position, with gravity applied along world z after the body forces have been rotated out. The order of operations is fixed, the build carries -fno-fast-math and -ffp-contract=off, and relaxed SIMD is off.',
      'Wash noise and the gyro hash both use xorshift32, seeded in SimState and in the glue and reset with the run. They are integer operations mapped to a double in a closed range: no Math.random, and no float hashing of the seed.',
    ],
    sim: [
      'Checks 2, 3 and 4 in the harness are the ruler for all of this: the same run repeated in one process, the same run in Node and in Chrome, and the same run at simulated render rates of 30, 60, 144 and 240 Hz. If a rendering change moves the trace hash, a Math call or a frame delta has leaked into the plant. If a plant change does not move it, the check itself is broken.',
    ],
    related: ['start-welcome', 'physics-wash', 'physics-gyro'],
    source: 'src/native/sim.c, src/native/sim_abi.h, CLAUDE.md',
  }),

  page({
    id: 'physics-motor',
    chapter: 'physics',
    title: 'Motors: voltage, current, lag',
    kicker: 'The plant',
    lede: 'Throttle is not thrust. It is a duty cycle, and between the command and the force there is a rotating mass that takes its time.',
    figure: 'motor',
    air: [
      'When a pilot punches the throttle, the flight controller tells the speed controller to connect more of the battery to the motor windings. The motor does not arrive at its new speed. The bell, which is the spinning outer can the propeller bolts to, has mass, and so does the propeller. For a few hundredths of a second the aircraft is waiting on that inertia, and the wait is most of the difference between a quad that feels crisp and one that feels soft.',
      'Meanwhile the current is set by a race between two voltages. The applied voltage pushes current through the winding resistance, the spinning motor generates a back EMF that opposes it, and as the rotor speeds up the back EMF closes the gap and the current collapses. A real speed controller also has winding inductance and a current ceiling, and this plant has neither, so for the first couple of milliseconds of a punch it draws a current no real aircraft would survive. The rotor\'s own time constant absorbs that spike before it can become thrust: it shows in the state readout and it does not reach the feel.',
    ],
    lab: [
      'The average applied voltage is duty times the pack voltage under load, giving i = (d V_load − ke ω) / R, and the rotor obeys j dw/dt = ke i − spin * kq ω_rel |ω_rel|. Duty is clamped to [0, 1] and ω is clamped at 0, since this airframe has no reversing motors.',
      'j_rotor is set to 8.0e-6 kg m² against a real 2207 bell plus a five inch triblade at something nearer 9e-6. Check 8 measures the time from 0 to 100 percent duty to reach 63 percent of final RPM and wants 10 to 30 ms; 9e-6 measured about 29 ms, and 8.0e-6 leaves margin. An ESC current ceiling of 48 A was built and measured, cutting peak pack current from 410 A to 192 A, and then withdrawn, because it pushed that same time constant to 51 ms and out of band. The limit is commented in plant.c with those numbers.',
      'Pack voltage and motor current form an algebraic loop, and with realistic resistances a one-step lag in that loop oscillates. The plant solves it in closed form instead: V = (Voc + Rp B / R) / (1 + Rp A / R), where A = sum d_i² and B = sum d_i ke ω_i.',
    ],
    sim: [
      'dshot_idle_value is live and sets the floor below which the mixer will not command, the way DShot idle does on a real board. min_throttle, max_throttle and min_command are from the PWM era, and since the glue\'s motorInitEndpoints uses DShot constants, all three are applied but inert. So is motor_kv: the plant\'s ke stays at 0.006336 whatever the field says.',
    ],
    related: ['physics-fm', 'physics-sag', 'cli-dshot_idle_value', 'physics-advance'],
    source: 'src/native/plant.c motor loop',
  }),

  page({
    id: 'physics-fm',
    chapter: 'physics',
    title: 'Thrust, torque and figure of merit',
    kicker: 'The plant',
    lede: 'Thrust rises with the square of rotor speed, and so does the torque needed to turn the propeller. They are two faces of one number, and an early version of this aircraft did not respect that.',
    figure: 'figmerit',
    air: [
      'A propeller is a device for throwing air downward. How hard it throws, which is thrust, and how hard it is to turn, which is torque, are tied together by the power going into the air. A propeller that made a great deal of thrust while needing almost no torque would be returning more energy than it was given. Early in this project the constants described exactly such a propeller, and they were refitted.',
      'The quantity that keeps them honest is the figure of merit: the ratio of the power a perfect actuator disc would need to hover to the shaft power actually consumed. A perfect disc scores 1.0. A real five inch racing propeller lives between 0.4 and 0.6, losing the rest to profile drag, tip vortices and swirl. This aircraft is 0.565.',
    ],
    lab: [
      'The ideal induced power for one hovering disc is T^1.5 / sqrt(2 rho A) and the shaft power is kq ω³, so FM = P_ideal / P_shaft. Substituting T = kt ω² rearranges to kq = kt^1.5 / (FM sqrt(2 rho A)), where A is π (0.0635)². The code derives kq from kt this way rather than tuning the two independently.',
      'Thrust after the aerodynamic corrections is T = kt ω² * axial, where axial comes from the stack of advance ratio, vortex ring, propwash and translational lift terms. The propeller drag torque uses ω_rel = spin ω + r (body yaw), so a yawing aircraft loads one diagonal pair and unloads the other, and the residual is real yaw damping.',
    ],
    sim: [
      'Yaw authority is paid for out of this same torque, so starving kq makes yaw go soft. The figure of merit 2.01 plant had to distort other constants to compensate for it. Do not set kt and kq independently again.',
    ],
    related: ['physics-motor', 'physics-advance', 'physics-vrs', 'physics-yaw'],
    source: 'src/native/plant.c, PROGRESS.md OPEN QUESTIONS (historical FM 2.01)',
  }),

  page({
    id: 'physics-sag',
    chapter: 'physics',
    title: 'Battery sag',
    kicker: 'The plant',
    lede: 'A battery is a voltage source behind a resistor. Ask it for 130 amps and it answers with less voltage than the label promised.',
    figure: 'sag',
    air: [
      'A freshly charged pack punches harder than one that has been flying for two minutes, and it does so long before the capacity is gone. The reason is voltage. Under heavy current the pack\'s internal resistance drops its terminal voltage, the motors see less than the label says, and the available rotor speed falls with it. Pilots describe it as the pack falling off, and in this simulator punch-out at 3.6 V per cell is verification check 11 for exactly that reason.',
      'The pack charge setting in the menu chooses the open circuit voltage per cell: 4.2 for full, 3.8 for the middle of a flight, 3.5 for nearly empty. It is not a fuel gauge. Capacity is not modelled, so a flight here will not end by running out. A low setting gives a softer motor for the whole flight instead.',
    ],
    lab: [
      'r_cell is 0.0025 ohm and there are six cells, so r_pack is 0.015 ohm, and V_load comes from the implicit solve described under motors. Motor current is summed as d * i wherever that product is positive. Check 11 runs identical punch-outs at 4.20 V and 3.60 V per cell and expects the sagged pack to reach a peak RPM 4 to 15 percent lower.',
      'The vbat_* CLI keys are inert, because the plant owns the pack rather than the firmware. Betaflight\'s vbat_sag_compensation, by contrast, is live: it is firmware that scales the PID gains with whatever cell voltage it is told, and the glue feeds it the plant\'s sagged value. Compensation is a controller trick, not a bigger battery.',
    ],
    sim: [
      'There is no thermal model of the pack, no C rating and no connector resistance separate from r_cell. The 2.5 mOhm figure is plant.c\'s stated value for a six cell 1300 mAh race pack.',
    ],
    related: ['physics-motor', 'cli-vbat_sag_compensation', 'physics-airframe'],
    source: 'src/native/plant.c battery solve, tests/thresholds.json check 11',
  }),

  page({
    id: 'physics-advance',
    chapter: 'physics',
    title: 'Advance ratio and pitch speed',
    kicker: 'The plant',
    lede: 'A propeller is a screw cutting through air. Move it along its own axis fast enough and the thread stops biting.',
    figure: 'thrustmu',
    air: [
      'Climbing hard, a quadcopter is chasing the air it has just accelerated downward, so the propellers meet air already moving their way and take a smaller bite of it. Thrust falls. This is why a punch does not keep accelerating indefinitely, and it sets a ceiling on a full throttle dive before drag has even been counted.',
      'The speed that matters is not the aircraft\'s speed through the sky but the speed of air through each disc, and that includes rotation as well as translation. Roll the aircraft and the rising pair of motors is climbing through the air while the falling pair descends through it. The rising side loses thrust, the falling side gains it, and the difference is a torque opposing the roll. That is aerodynamic rate damping, and without it the PID controller is the only thing stopping a rotation, which is why a machine modelled without it snaps back when the stick returns to centre.',
    ],
    lab: [
      'The axial velocity at each rotor is va = v_body_z + p y_m − q x_m, and the pitch speed is max(ω, 60) * k_inflow, where k_inflow is the propeller\'s pitch radius, 4.3 inches of pitch divided by 2π, or 0.017382 m/rad. Their ratio is mu. For mu ≥ 0 the thrust factor is axial = max(0, 1 − mu). For −0.30 < mu < 0 it is axial = 1 − mu, the windmilling case where thrust rises. Deeper descents take the vortex ring branch instead.',
      'ω is floored at 60 rad/s in the pitch speed denominator so that a stopped rotor cannot divide by zero. The underlying model is a blade element linearisation in which thrust crosses zero when the axial speed reaches the pitch speed. It is a model, not a CFD solution of a five inch triblade.',
    ],
    sim: [
      'STAGE1.md deferred inflow and advance ratio to Stage 2, and the code has both. A comment in plant.c preserves an older paragraph claiming that only the rotational part was used; both parts have been in use since this model landed.',
    ],
    related: ['physics-vrs', 'physics-wash', 'physics-damping', 'physics-fm'],
    source: 'src/native/plant.c advance ratio block',
  }),

  page({
    id: 'physics-vrs',
    chapter: 'physics',
    title: 'Vortex ring state',
    kicker: 'The plant',
    lede: 'Descend into your own downwash fast enough and the wake stops leaving. It folds back over the disc as a closed ring, and the propeller begins working inside a doughnut of air it has already used.',
    figure: 'vrs',
    air: [
      'Helicopter pilots have known this one for a long time, and a quadcopter has the same problem on four smaller discs. A gentle descent actually helps: air arriving from below meets the propeller sooner and thrust rises. Past a certain rate of descent the picture inverts. The wake no longer clears the disc, it recirculates through it, and the propeller finds itself pumping the same disturbed air round and round. Thrust falls away while the motors turn at the same speed and make the same noise, which is what makes the condition so disorienting from inside the goggles.',
      'The recovery is the helicopter recovery: stop descending into it. Pitch forward or roll out of the column so that the discs meet air which has not been through them, and the ring collapses. Adding power does not help, because the problem is not a shortage of shaft power. It is that the air the propeller is working on has nowhere to go.',
    ],
    lab: [
      'The onset is at mu = −0.30, fully developed at −1.20, with a floor of axial = 0.75. Between onset and full development the factor interpolates linearly from (1 + 0.30) down to 0.75 and then holds. That is the shape of the gap momentum theory leaves rather than a curve fitted to feel. An earlier model used axial = 1 − va/pitch_speed clamped at 1.35 for every descent, which handed the aircraft more thrust the faster it fell, measured as a thrust to weight rising from 1.063 in hover to 1.434 at a 6.2 m/s sink, and which deleted rate damping entirely, because a clamp has zero derivative.',
      'PLANT_INFLOW_ASYM = {0.031, −0.017, −0.028, 0.014} is applied whenever axial < 1, scaled by depth, because four rotors in a recirculating field do not stall together. Without it the four losses cancel into a pure heave, which is not what a descending quad does. The four values sum to zero, so a perfectly symmetric deep descent cannot invent net extra thrust.',
    ],
    sim: [
      'This is the mean thrust loss only. The shake on top of it is propwash, on the next page. Checks 5 to 12 were measured against this loss model, and wash is gated out of them so that the vertical checks do not move.',
    ],
    related: ['physics-wash', 'physics-advance', 'physics-etl'],
    source: 'src/native/plant.c PLANT_VRS_* and descent branch',
  }),

  page({
    id: 'physics-wash',
    chapter: 'physics',
    title: 'Propwash',
    kicker: 'The plant',
    lede: 'The mean thrust loss is only half of a descent. The other half is that the air is no longer steady, and no gain setting can cancel a disturbance that is different on every rotor and different every millisecond.',
    figure: 'wash',
    air: [
      'Diving into your own wake, hauling out of the bottom of a dive, chopping the throttle over the top of a flip: a real quadcopter shakes, and the pilot feels it in the video and in the sticks as the flight controller chases a gyro reading that will not sit still. A simulator without this is glass. A simulator with too much of it is a washing machine.',
      'It appears where the physics says it should. Descending into the wake, the aircraft shakes. Climbing, it is flying into clean air and the shake is absent. Hovering, it is not inside the ring at all. The model gates the turbulence on descent depth rather than applying it everywhere, so it arrives and leaves the way it does in life.',
    ],
    lab: [
      'Depth here is not mu. It is the descent rate measured against the induced velocity v_h = sqrt(T / (2 rho A)). Recirculation begins around 0.25 v_h, is worst near 1.0, and is carried out to 3.0 v_h, because the frame, battery and arms shed wake into air the discs are sitting in, where a clean isolated rotor would be finished by about 2. The envelope is a triangle: (rw − 0.25)/0.75 rising to 1, then (3 − rw)/2 falling away.',
      'The unsteady field is one channel per rotor from xorshift32 through two one-pole filters at 30 Hz and 3 Hz, with coefficients 0.171796 and 0.018673 at 1 kHz, an RMS of 0.16730 measured over four million samples, and a clamp at three sigma. It is applied as axial += axial * k_propwash * depth * wash, with k_propwash = 0.08. A value of 0.30 put peak-to-peak gyro near 45 to 59 deg/s and a pilot called it too hot. 0.08 is a chosen feel constant; the mechanism it scales is not chosen.',
      'The two poles sit where they do for a reason. The field runs every step regardless of depth, so that flying into the wash does not restart the turbulence from a quiet state, and only the depth-scaled proportion is applied. Below about 3 Hz an I term trims the disturbance out, and above about 30 Hz the D-term filter removes it. Neither of those is what propwash feels like, so the energy is placed between them.',
    ],
    sim: [
      'The grass flattening in the renderer is a picture of downwash rather than this model, so do not tune k_propwash by looking at it. STAGE1.md deferred propwash and the plant has it. The renderer and the plant model wash separately and neither reads the other.',
    ],
    related: ['physics-vrs', 'physics-gyro', 'physics-damping'],
    source: 'src/native/plant.c PROPWASH comment and wash filters',
  }),

  page({
    id: 'physics-etl',
    chapter: 'physics',
    title: 'Translational lift',
    kicker: 'The plant',
    lede: 'A hovering rotor is condemned to fly in air it has already ruined. Start moving and it meets air that has not been through it yet, and the same throttle produces more lift.',
    figure: 'etl',
    air: [
      'Accelerate out of a hover without touching the throttle and the aircraft gets lighter. A fast pass needs less stick to hold altitude than a hover does, because the discs are biting into undisturbed air. Helicopter pilots meet this as a distinct shudder and a surge of lift at around walking pace and call it effective translational lift. On a quadcopter it is the same equation on four smaller discs.',
      'A simulator that leaves this out ends up with a hover and a cruise that feel like two different aircraft bolted together, and the pilot hunts the throttle in a way a real five inch never asks for.',
    ],
    lab: [
      'kt is calibrated so that axial = 1 corresponds to hover, which already has the hover induced velocity baked into it. What is missing is the change in induced velocity as the aircraft moves, so the correction is axial_gain = (v_h − v_i) / pitch_speed. It is identically zero in a hover or a pure vertical climb, and it is capped at 0.35, because at idle the pitch speed collapses faster than v_i does and the ratio runs away.',
      'v_i comes from the same Glauert quartic the H-force uses, solved from the ideal thrust kt ω², since the actual thrust is the quantity this expression is about to produce. That costs two solves of the same relation per rotor per step, which is accepted because iterating inside a fixed 1 ms step is not on offer.',
    ],
    sim: [
      'Vertical checks 5, 6, 7 and 11 cannot see this term by construction, because v_perp is approximately zero in all of them. If a future airframe ever flies those checks in a crosswind, this page needs rewriting.',
    ],
    related: ['physics-hforce', 'physics-advance', 'physics-vrs'],
    source: 'src/native/plant.c TRANSLATIONAL LIFT block',
  }),

  page({
    id: 'physics-hforce',
    chapter: 'physics',
    title: 'Rotor drag, the H-force',
    kicker: 'The plant',
    lede: 'At racing speed the propellers do more of the braking than the airframe does. Leave the term out and the aircraft skates through corners.',
    figure: 'hforce',
    air: [
      'A spinning disc moving edgewise through the air does not only push down. It also pulls backward, because the blade advancing into the airflow meets it faster than the blade retreating from it, and the imbalance shows up as a force in the plane of the disc. Helicopter engineers call it the H-force. On a quadcopter it is why the machine decelerates when it levels off, why a sideways slide dies out instead of continuing, and why pitching up at 45 degrees genuinely brakes rather than skating on.',
      'The evidence for its importance is what happened without it. On an earlier build, an aircraft levelled off at 20 m/s on hover throttle still had half that speed 3.2 seconds later, and a 50 degree banked turn traced a 29 metre radius because the machine kept sliding out of the turn. Pilots called it floaty, which is the word for an aircraft that has been given a top speed but not a middle.',
    ],
    lab: [
      'Per rotor, H = k rho A v_i v_perp, with v_i from Glauert: v_i = v_h² / sqrt(v_perp² + v_i²), evaluated in the closed form y² = 2 / (sqrt(x⁴+4) + x²), written that way to avoid catastrophic cancellation at large x. At low speed y approaches 1 and H is linear in v_perp; at high speed y approaches 1/x and H saturates at k T / 2, so the term does not steal the top end. A linear-only attempt took the maximum level speed from 139 km/h down to 87.',
      'k = 0.43842, anchored on a published linear drag coefficient of about 0.30 /s at hover for a 0.6 kg five inch: 4 rho A v_h = 0.444787 kg/s, so k = 0.65 * 0.30 / 0.444787. That published figure already contains some parasitic drag, which makes k an upper bound, and the body CdA was reduced afterwards so that the plant does not charge for the same drag twice.',
      'The in-plane force acts at z = +0.020 m, which produces a nose-up couple in forward flight and a roll-away couple in a slide. The four z-moments from symmetric H cancel, and what survives is the omega × r contribution, which is yaw damping.',
    ],
    sim: [
      'Roll and pitch rates move the rotors vertically rather than edgewise, so they generate no H-force and the rate response is untouched. Climbs and punches through the disc are untouched for the same reason. That is why this term could be added without moving checks 5 to 12.',
    ],
    related: ['physics-noseup', 'physics-drag', 'physics-etl', 'physics-yaw'],
    source: 'src/native/plant.c section 3b ROTOR DRAG',
  }),

  page({
    id: 'physics-drag',
    chapter: 'physics',
    title: 'Airframe drag',
    kicker: 'The plant',
    lede: 'A quadcopter is a bluff body with three different frontal areas. Give it one drag coefficient and it becomes equally slippery in every direction, which no real aircraft is.',
    figure: 'drag',
    air: [
      'Flying belly first into the wind, as in a flare, presents far more area than flying nose first. Sideways is different again, because the battery is longer than it is wide and adds a face that is not there from the front. Copy one number onto all three axes and the result is a machine that brakes no harder than it cruises. The three areas in this plant are different on purpose.',
      'This matters more than it sounds, because drag rises with the square of speed, which means a coefficient fitted to the top speed contributes almost nothing in the middle of the range. Something else has to do the braking through a corner, and on a quadcopter that something is the propellers.',
    ],
    lab: [
      'The body force on each axis is F_body_a = −0.5 rho CdA_a v_a |v_a|, with cda_plan = 0.0225 m², cda_front = 0.0130 m² and cda_side = 0.0147 m². The front figure is roughly 0.011 m² of projected structure at a drag coefficient near 1.2. The side adds the battery\'s extra 35 by 75 mm face, about 0.0017 m² of CdA. Plan is the belly, and it is explicitly not allowed to stand in for rotor drag, because the discs are modelled separately.',
      'All three were 0.016 before the H-force existed, at which point they were doing two jobs at once. They were re-fitted afterwards against the maximum level speed procedure, which measured 128 km/h inside a 120 to 165 band.',
    ],
    sim: [
      'Because the term is quadratic it is weak in the middle of the speed range and strong at the top, which is the gap the H-force was introduced to fill. Body drag still sets the high speed ceiling, together with advance ratio and voltage sag.',
    ],
    related: ['physics-hforce', 'physics-airframe', 'physics-advance'],
    source: 'src/native/plant.c cda_* comments',
  }),

  page({
    id: 'physics-noseup',
    chapter: 'physics',
    title: 'Pitch up at speed',
    kicker: 'The plant',
    lede: 'The propellers sit 20 mm above the centre of gravity. That small offset turns rotor drag into a pitching moment, and every real multirotor carries it.',
    figure: 'noseup',
    air: [
      'Fly fast with hands off the pitch stick and a real quadcopter wants to raise its nose. Pilots trim it out with a touch of forward stick, much as they would trim a tail-heavy model, or they leave the I term to hold it. The same offset means that chopping the throttle at speed produces a change in attitude as well as a loss of thrust, so part of the deceleration a pilot feels is the aircraft rotating rather than simply slowing.',
      'The mechanism is a lever. The backward pull of the rotors acts at the height of the discs, the mass of the aircraft resists at the height of the centre of gravity, and because those two heights differ the force becomes a couple. Model the motors in the same plane as the centre of gravity and the lever vanishes, leaving a machine that behaves like a flat plate. This plant did that until PLANT_POS_Z was added.',
    ],
    lab: [
      'PLANT_POS_Z is 0.020 m for all four rotors. The geometry: arms at the mid plate, the disc about 28 mm above that once the bell and hub are accounted for, and the centre of gravity of a 650 gram machine with a 250 gram battery on top about 8 mm above the plate, leaving a difference near 20 mm. A pure z force at (x, y, z) has moment (y F, −x F, 0), so hover and punch checks cannot move; the couple comes from the in-plane H-force acting at that height.',
    ],
    sim: [
      'Measured before this term existed, the pitching moment in forward flight was identically zero at every speed.',
    ],
    related: ['physics-hforce', 'physics-cant', 'physics-airframe'],
    source: 'src/native/plant.c PLANT_POS_Z comment',
  }),

  page({
    id: 'physics-cant',
    chapter: 'physics',
    title: 'Motor cant and roll-to-yaw coupling',
    kicker: 'The plant',
    lede: 'A perfectly symmetric QUADX cannot yaw from a roll, at least at the order this model works to. Real frames are not symmetric, and the yaw trim pilots carry is a measurement of how imperfect they are.',
    figure: 'cant',
    air: [
      'Roll hard on a real machine and it yaws a little. The pilot either carries a touch of yaw trim or rides it out. A simulator that shows exactly zero coupling is flying a frame built to a tolerance no factory holds: motors are never aimed to a tenth of a degree, moulded arms are never quite square, and four screws never pull a motor down perfectly flat.',
      'So this plant gives each motor a fixed misalignment of less than two degrees, the sort of error a moulded arm and four screws actually produce. A roll then leaves a small yaw moment behind it, and the hover I term trims out the remainder exactly as it would on a real machine.',
    ],
    lab: [
      'The algebra is worth following, because it shows the cant is necessary rather than decorative. The roll column of the mixer is (−1, −1, +1, +1), and each pair contains one clockwise and one counter-clockwise motor, so sum_m SPIN[m] f(roll[m]) = 0 for any function f. RPM-squared drag, stator reaction, net angular momentum and advance ratio all cancel pairwise. Inflow asymmetry does not rescue check 10 on a symmetric frame either.',
      'The tangential cant in degrees is −0.9, +1.4, +0.6, −1.2. The scalar sum is −0.1 degrees, which is the hover yaw bias, and the sum against the roll column is −1.1 degrees, which is the coupling. The sign is such that a right roll yaws the nose right, matching check 10\'s expected_sign. The radial cant of {1.4, 0.85, 1.15, 0.6} outward is then solved so that the tangential set\'s net in-plane force cancels at hover. Radial cant cannot produce yaw, because a force directed along r has zero moment about z.',
      'These numbers are a model of build tolerance, chosen rather than scanned from a real frame. Check 10\'s 2.0 degree floor has historically been larger than this tolerance produces under a yaw PID, and the argument about that sits in OPEN QUESTIONS in PROGRESS.md. This page does not claim the floor is met.',
    ],
    sim: [
      'Do not add a scripted yaw-on-roll term. The project rule is that coupling falls out of the physics rather than being written in. If somebody re-bands check 10, that is a decision about the threshold rather than about the cant table.',
    ],
    related: ['physics-yaw', 'physics-gyroscopic', 'start-honesty'],
    source: 'src/native/plant.c PLANT_CANT_*, PROGRESS.md check 10',
  }),

  page({
    id: 'physics-yaw',
    chapter: 'physics',
    title: 'Yaw: stator reaction and drag torque',
    kicker: 'The plant',
    lede: 'There is no tail rotor. A quadcopter turns by making two of its propellers harder to spin than the other two, and the frame feels the difference.',
    figure: 'yawtorque',
    air: [
      'Yaw is the leftover of four propellers fighting each other. Two turn clockwise and two counter-clockwise, and in steady flight the torques they absorb cancel out. Ask for nose right and the mixer speeds up the pair spinning one way and slows the pair spinning the other; the torques no longer cancel; and the frame rotates in response. It is a weaker axis than roll or pitch, it builds more slowly, and it couples into everything else, because the motors producing it are also the motors holding the aircraft up.',
      'That coupling explains several things pilots notice. Yaw feels late when the idle is set too low, because the motors that need to slow down are already near the floor. Yaw dies in a punch, because the motors that need to speed up are already at the ceiling. And airmode matters, because at zero throttle without it the mixer has no room in either direction and nothing to work with.',
    ],
    lab: [
      'The stator reaction on the frame is −spin * ke * i along each motor axis, canted, and the propeller drag is kq ω_rel |ω_rel|. With yaw_motors_reversed off, the mixer yaw column is RR −1, FR +1, RL +1, FL −1, and mixer.c negates the yaw PID sum. The glue feeds the gyro yaw as +r. The comment on PLANT_SPIN carries the full sign chain, and flipping one link in it makes the loop run away.',
      'Integrated yaw, use_integrated_yaw, is a Betaflight mixer option that treats yaw as an integral of motor difference rather than as a direct torque demand. It is live when compiled, and it is off by default on this airframe\'s dumps unless a preset turns it on.',
    ],
    sim: [
      'yaw_motors_reversed is live, and the plant\'s spin table does not flip with it, so turning it on builds a yaw runaway. That is the firmware and the plant disagreeing about which way the propellers turn, which is precisely what the field is for.',
    ],
    related: ['physics-cant', 'physics-fm', 'control-mixer', 'cli-yaw_motors_reversed'],
    source: 'src/native/plant.c PLANT_SPIN, src/native/bf/bf_glue.c',
  }),

  page({
    id: 'physics-damping',
    chapter: 'physics',
    title: 'Aerodynamic rate damping',
    kicker: 'The plant',
    lede: 'The air opposes rotation before the controller does. Model the aircraft without that and a D term ends up standing in for physics.',
    figure: 'damping',
    air: [
      'Roll the aircraft and one side\'s propellers are climbing through the air while the other side\'s are sinking. Climbing propellers make less thrust and sinking ones make more, at least until the sinking pair reaches vortex ring state, and the difference between them is a torque opposing the roll. Yaw has its own version: body yaw adds to the relative speed of one spin pair and subtracts from the other, loading one and unloading the other.',
      'Pilots recognise the absence of this more readily than its presence. A quadcopter without aerodynamic damping overshoots when the stick is centred and then gets yanked back by the controller, a behaviour racers call snap-back. Some of that is D gain doing its job. On a plant with no aerodynamic damping at all, most of it is the control loop substituting for a force that should have been in the physics.',
    ],
    lab: [
      'On roll and pitch, va includes the term p y − q x, which means axial(mu) has a non-zero derivative with respect to body rate. The clamp at 1.35 in the old descent model zeroed that derivative, which is how the damping went missing. On yaw the mechanism is w_rel = spin ω + r, and the H-force adds a further small yaw damping through the omega × r contribution on the discs.',
    ],
    sim: [
      'If a tune that is calm on a real five inch oscillates here, look at the damping and the gyro noise before cutting P. If a tune that is calm here oscillates on a real five inch, look at the filters, because this gyro is still cleaner than one bolted to a machine with a bent bell.',
    ],
    related: ['physics-advance', 'physics-vrs', 'physics-hforce', 'control-pid'],
    source: 'src/native/plant.c motor loop preamble',
  }),

  page({
    id: 'physics-gyroscopic',
    chapter: 'physics',
    title: 'Gyroscopic coupling',
    kicker: 'The plant',
    lede: 'Four spinning bells are four small gyroscopes. They are arranged to cancel, and the interesting question is which manoeuvres break the cancellation.',
    figure: 'gyroscopic',
    air: [
      'A spinning wheel resists being tilted, and when it is tilted anyway it pushes back at right angles to the direction you pushed. Force a gyroscope to pitch and it tugs on yaw. Four propellers turning in opposed directions cancel most of this, which is one of the quiet advantages of the quadcopter layout. They do not cancel all of it, particularly when the four rotor speeds are unequal, which is to say during every roll the aircraft ever performs.',
    ],
    lab: [
      'The torque includes − omega × (I omega + h_prop), where h_prop is sum spin * j_rotor * ω along each motor axis. Because I is diagonal, the body term is the ordinary Euler coupling with no products of inertia, and it never cancels: a rigid body spinning about one axis while being rotated about another produces a moment about the third with no propellers involved. Opposed propellers keep the net h_prop small in a hover and distinctly not small during a roll, when one diagonal pair is wound up and the other backed off.',
    ],
    sim: [
      'There is no precession slider. The effect falls out of the integration, and making it stronger would require heavier bells or a different spin map, which is a change to the airframe rather than a setting.',
    ],
    related: ['physics-yaw', 'physics-cant', 'physics-motor'],
    source: 'src/native/plant.c section 4 omega × (I omega + h)',
  }),

  page({
    id: 'physics-gyro',
    chapter: 'physics',
    title: 'Gyro vibration',
    kicker: 'The plant',
    lede: 'The airframe is rotating smoothly. The gyroscope is not reporting that. Every filter in Betaflight exists because of the gap between those two sentences.',
    figure: 'gyronoise',
    air: [
      'The flight controller is bolted to a frame being shaken by four propellers, none of which is perfectly balanced. What the gyroscope reports is the sum of genuine rotation and that shake, and the filter chain exists to stop the PID controller chasing the shake. A simulator with a perfectly clean gyro makes the whole filter chain decorative and makes D gain look free, so a pilot who tunes there and exports the result will oscillate on a real machine.',
      'The vibration in this simulator is added to the sensor reading rather than to the aircraft. The rigid body stays rigid, and the only route by which vibration reaches the trajectory is the route it takes in life: the controller reacting to it.',
    ],
    lab: [
      'There are two components, both in bf_glue.c. The first is a once-per-revolution imbalance line at each rotor\'s true frequency, with amplitude proportional to ω², four slightly different factors, roll as the sine and pitch as the cosine of a shared phase, and yaw at 0.5 of the in-plane amplitude, which is a chosen coupling rather than a modal analysis. The second is a broadband hump from 80 to 350 Hz, built from the same one-pole pair used for propwash. A 0.2 deg/s noise floor for the sensor itself sits under both.',
      'A 1 kHz gyro cannot represent anything above 500 Hz, and the propeller fundamental runs from about 130 Hz at idle to about 426 Hz at full throttle, comfortably under Nyquist. Blade passing, which on a triblade is three times the fundamental, is not modelled. The amplitudes are 1.5 deg/s for the hump and 0.8 for the line, set after a louder pair was judged too much on the sticks, with an RMS divisor of 0.340474 measured over eight million samples.',
      'The device path mimics a SITL build: a float in degrees per second, converted to int16 counts at 2000 deg/s full scale, then handed to Betaflight\'s own gyro.c filter chain.',
    ],
    sim: [
      'This is what gyro_lpf and rpm_filter are working against here. The dynamic notch still will not arm at 1 kHz, and the imbalance lines are present for the RPM filter and for any future argument about raising the loop rate. The yaw share of 0.5 is the one chosen number in this block, and the glue comment labels it as such.',
    ],
    related: ['control-filters', 'physics-wash', 'cli-rpm_filter_harmonics', 'cli-gyro_lpf1_static_hz'],
    source: 'src/native/bf/bf_glue.c GYRO VIBRATION',
  }),

  page({
    id: 'physics-radio',
    chapter: 'physics',
    title: 'The radio link',
    kicker: 'The plant',
    lede: 'No radio delivers a mathematically exact grid of packets. Feedforward and RC smoothing both measure that grid, which makes the link part of the control loop whether the pilot thinks about it or not.',
    figure: 'radio',
    air: [
      'The sticks are not wired to the flight controller. A packet leaves the transmitter, spends a few milliseconds in the air and in the receiver, and occasionally does not arrive at all. ExpressLRS at 250 Hz is a common racing setup: roughly 4 ms of delay, a fraction of a millisecond of jitter, and losses rare enough to be counted in parts per million.',
      'A perfect link, which is the default here, feels slightly too sharp, as though the aircraft were glued to the pilot\'s fingers. Switch on the ELRS preset in the settings to fly the radio you actually own. Leave the perfect link on when chasing a lap time or running the harness, so that a record does not move because a simulated packet went missing.',
    ],
    lab: [
      'The model is in src/input/link.js, with presets for perfect at 250 Hz with no delay, jitter or loss, plus elrs500, elrs250, elrs150 and crossfire. Jitter is uniform within ±jitterMs and loss is specified in parts per million, both driven by a seeded xorshift32 under the same discipline as the wash noise. The WASM module never sees the generator; it sees timestamped samples, and a recording captures what was actually delivered.',
      'Feedforward is the derivative of setpoint with respect to rc frame, so the denominator is the packet interval, and a jitter-free denominator is smoother than any hardware produces. RC smoothing compounds it by auto-tuning its cutoffs from the measured interval, so a perfect interval selects a filter no real link would ever be given.',
    ],
    sim: [
      'The link model deliberately lives outside the WASM module. Putting it inside would make the trace hash depend on a link seed and would break every existing recording. The verification harness runs with the link off.',
    ],
    related: ['control-ff', 'cli-rc_smoothing', 'physics-timestep'],
    source: 'src/input/link.js',
  }),

  page({
    id: 'physics-ground',
    chapter: 'physics',
    title: 'Ground, collisions, no ground effect',
    kicker: 'The plant',
    lede: 'The integrator does not know that trees exist. It integrates a rigid body in free air, and something else entirely decides that the aircraft has hit one.',
    figure: 'collide',
    air: [
      'You can land. A gentle arrival onto grass or a deck counts as a landing: the aircraft settles, the integrator stops, and it can be spooled up again. A fast arrival, or one at a bad attitude, is a crash. Striking a gate frame, a tree or a wall counts as a hit, and enough hits end the run.',
      'What you cannot do is hover in ground effect. A real rotor gains thrust within about one radius of the ground, where its downwash has nowhere to go but sideways, so a hover at ankle height takes noticeably less throttle than a hover at head height. This plant does not model that, and the landing logic in the shell is not a stand-in for it.',
    ],
    lab: [
      'collide.js works with a single primitive, the capsule. It sweeps a sphere, whose radius is derived from the 220 mm diagonal plus the five inch propellers, against those capsules using a closed-form segment-to-segment distance with no allocation in the query, over a broadphase grid. The optional sim_deflect entry point writes a velocity change into the module without stepping frame time into the integrator.',
      'Ground contact in main.js is a swept test of the aircraft\'s lowest point against the terrain height, with the landing-or-crash judgement made on speed and tilt. While landed, sim_step is not called at all. Takeoff resumes from the velocity recorded at the landing judgement, so that it does not inherit a buried downward spike.',
    ],
    sim: [
      'STAGE1.md deferred ground effect and wind, and both are still deferred. Wind audio exists; wind force does not. A breeze in this simulator is a picture and a sound.',
    ],
    related: ['physics-airframe', 'physics-vrs', 'start-honesty'],
    source: 'src/game/collide.js, src/main.js ground contact, src/native/sim.c stand constraint',
  }),

  page({
    id: 'physics-missing',
    chapter: 'physics',
    title: 'What this plant does not do',
    kicker: 'The plant',
    lede: 'An absence cannot be reasoned about unless somebody names it. This is the list, so that nobody has to infer it from silence.',
    figure: 'missing',
    air: [
      'No wind. No ground cushion. No blade element theory with azimuthal stations. No aeroelasticity. No motor inductance. No ESC current limit. No thermal model of windings, batteries or speed controllers. No flexible arms. No camera latency separate from the radio. No video compression. No Betaflight OSD drawn into the goggles.',
      'Some of those may arrive if the project grows. A general purpose physics engine will not, because none of the available ones are built for a rotorcraft at this timestep. This page is the contract as of the code this wiki was written against.',
    ],
    lab: [
      'Also absent: reverse motor direction, meaning 3D flight; servos; GPS, magnetometer, barometer and accelerometer hardware, with ANGLE mode attitude coming from the plant quaternion instead; dual gyro; the dynamic notch at 1 kHz; blade passing harmonics; any trailing vortex interaction beyond the vortex ring, wash and inflow asymmetry stack; and a ground effect inflow image system.',
      'Collision is not a contact Jacobian inside the plant. It is a query run by the shell. The plant can be held on a hinge for the launch stand inside sim.c, and that is a kinematic constraint rather than an aerodynamic model.',
    ],
    sim: [
      'If you need a phenomenon for a paper, read the source rather than assuming a textbook rotor. The Glauert and momentum theory pieces are labelled as such. The feel constants, meaning k_propwash, the gyro line and hump amplitudes and the cant table, are labelled as chosen. Keep the two categories apart.',
    ],
    related: ['physics-vrs', 'physics-wash', 'physics-motor', 'start-honesty'],
    source: 'STAGE1.md Not in Stage 1, plant.c ESC ceiling comment, catalog.js INERT_REASONS',
  }),

  page({
    id: 'physics-lens',
    chapter: 'physics',
    title: 'The camera',
    kicker: 'The plant',
    lede: 'The lens is not part of the flight model, and it changes what you can fly anyway, because a racer flies a picture rather than an aircraft.',
    figure: 'lens',
    air: [
      'Camera angle is set by the printed mount the camera sits in. Zero degrees looks along the nose, 30 is a cruising angle, and 45 to 55 is what racers use, because at speed the aircraft is pitched steeply forward and a steeply angled camera is the one looking where it is going. The angle changes no force in the model. It changes where forward sits in the picture, and therefore the line the pilot flies.',
      'Field of view is more subtle, because the number printed on an FPV lens is not a number this renderer can use. Those lenses are fisheyes, mapping angle to radius roughly linearly, while the renderer is rectilinear and maps by tangent. Type the printed 150 to 160 degrees into a rectilinear camera and the centre of the image shrinks until gates look like postage stamps. The default of 85 degrees vertical is instead a match of centre magnification to a 155 degree fisheye, with a little extra width so that the next gate is visible.',
    ],
    lab: [
      'The derivation is in src/render/lens.js. An equidistant fisheye is r = f θ and a rectilinear camera is r = f tan θ, so matching the scale at the centre requires tan(v/2) = θ_V. A 155 degree diagonal lens on a 4:3 sensor has a vertical half angle of 46.5 degrees, or 0.8116 rad, giving v of about 78 degrees. The default 85 degrees on 16:9 works out to about 117 degrees wide. GATE_SCALE and WORLD_SCALE cannot fix apparent size, because a larger gate seen from proportionally further away produces the same picture.',
      'The coordinate conversion in frame.js is x_three = −y_sim, y_three = z_sim, z_three = −x_sim. Get it wrong and every yaw sign downstream of it is wrong.',
    ],
    sim: [
      'Tilt and field of view belong to the settings menu. Betaflight\'s fpv_mix_degrees is applied but inert, because BOXFPVANGLEMIX is never raised and rc.c therefore never mixes camera angle into roll and yaw. In this simulator that compensation is the pilot\'s to make.',
    ],
    related: ['cli-fpv_mix_degrees', 'start-nowings', 'physics-timestep'],
    source: 'src/render/lens.js, src/render/frame.js',
  }),

  page({
    id: 'control-pid',
    chapter: 'control',
    title: 'PID, the three gains people mean',
    kicker: 'The controller',
    lede: 'Three numbers per axis: one for the present, one for the past, one for the rate of change. Everything else in a Betaflight tune exists to stop those three misbehaving.',
    figure: 'pid',
    air: [
      'P is the response to the present. If the aircraft is rolling more slowly than the pilot asked, P pushes the motors harder in proportion to how far off it is. Too little and the machine feels lazy. Too much and it buzzes, because P amplifies whatever noise survived the filters along with the signal it was meant to act on.',
      'I is memory. When an error persists, as it does when the nose wants to rise at speed or a motor sits slightly crooked in its mount, I accumulates that error and keeps pushing until it is gone. The pilot meets it as trim they never have to hold. Its failure mode is winding up during a manoeuvre and then releasing in a lurch, which is why I-term relax exists: without it, the sustained error through a flip would fill the accumulator and empty it into the stop.',
      'D is the response to change. It opposes an error that is growing quickly, which is how overshoot dies and what makes a stop feel clean. It is also the term that hears every rattle in the frame, because differentiating a noisy signal amplifies the noise, which is why D has a filter of its own and why D max, still stored under its old name d_min in 4.5, exists to run a low D in the hover and a higher one when the stick is thrown.',
    ],
    lab: [
      'The error is setpoint minus gyro, in degrees per second, taken after the gyro filter chain. P is Kp e. I integrates e subject to windup limits, relax and rotation options. D is Kd times a filtered derivative of gyro rather than of error, which is why a clean stick movement does not produce a D spike. F is feedforward from the setpoint derivative rather than from error. TPA attenuates P and D, or D alone, as throttle rises, and anti-gravity boosts I, and optionally P, when throttle changes quickly, so that a punch does not bow the aircraft.',
      'Gains are in firmware units rather than SI, and each axis carries its own. Yaw D is often low or zero on real five inches, because yaw measurement is noisier and yaw inertia is higher. pidsum_limit clamps the total before the mixer, so that one axis cannot consume the whole available motor range.',
    ],
    sim: [
      'All of p_*, i_*, d_* and f_* are live. Changing one writes pidProfiles(0), and the next sim_init flies it. There is no JavaScript PID anywhere in this project. Blackbox here is a CSV the shell can export rather than onboard flash.',
    ],
    related: ['control-ff', 'control-filters', 'control-tpa', 'cli-p_roll'],
    source: 'vendor/betaflight .../flight/pid.c, bf_glue.c pidController call',
  }),

  page({
    id: 'control-rates',
    chapter: 'control',
    title: 'Rates: how far the stick goes',
    kicker: 'The controller',
    lede: 'A tune belongs to the aircraft. Rates belong to the pilot, which is why they live in a separate profile.',
    figure: 'rates',
    air: [
      'Maximum rate is how fast the aircraft will rotate at full stick, in degrees per second. Centre sensitivity is how responsive the middle of the stick is, which is not the same thing as the rate at half stick. Expo bends the middle of the curve downward so that small movements are gentle while the ends still reach the same maximum, which is how a pilot can aim precisely through a gate and still flip quickly on the way out of it.',
      'This simulator defaults to Betaflight 4.5.1 ACTUAL rates at 670 degrees per second full stick, 70 degrees per second per unit of stick at centre, and no expo. ACTUAL is the curve whose two ends mean what they say, which makes it the easiest to reason about. The other types, BETAFLIGHT, KISS, RACEFLIGHT and QUICK, are all live and run Betaflight\'s own apply*Rates functions from fc/rc.c.',
    ],
    lab: [
      'From applyActualRates: centreSensitivity = rc_rate * 10, stickMovement = max(0, srate * 10 − centreSensitivity), and angleRate = stick * centreSensitivity + stickMovement * expof, where expof uses a fifth power blend. At full stick expof is 1, so the rate is exactly srate * 10. Both rc_rate and srate are stored in tens of degrees per second in a uint8.',
      'configs/rates.js is the only place the menu decides rates. Tune files do not carry a rate profile. The configurator rates page can still write a full profile, including per-axis values and the throttle limit SCALE.',
    ],
    sim: [
      'The graph on the configurator screen is src/fc/ratescurve.js, a display copy of those formulas, and the plant does not use it. Check 9 verifies that full roll stick tracks the configured maximum rate within 3 percent, and check 12 verifies that two dumps differing only in srate produce maximum rates in that ratio.',
    ],
    related: ['cli-rates_type', 'cli-roll_srate', 'cli-roll_rc_rate', 'cli-throttle_limit_type'],
    source: 'configs/rates.js, vendor/betaflight .../fc/rc.c, src/fc/ratescurve.js',
  }),

  page({
    id: 'control-filters',
    chapter: 'control',
    title: 'Filters: delay versus noise',
    kicker: 'The controller',
    lede: 'Every filter buys quiet with lateness, and lateness in a feedback loop is stability margin you no longer have.',
    figure: 'filters',
    air: [
      'The chain has a member for each kind of problem. The gyro low-pass smooths the sensor before anything else sees it. The D-term low-pass adds extra smoothing to the branch most sensitive to hash. Static notches cut a whistle that sits at a fixed frequency, usually a frame resonance. The RPM filter cuts the whistle that moves with motor speed, using telemetry to know where it is. The dynamic notch hunts peaks in a live spectrogram, and at 1 kHz Betaflight refuses to run it.',
      'The types differ in how steeply they cut and therefore in how much delay they cost. PT1 is a gentle single pole. PT2 and PT3 are steeper and later. A biquad can be a notch or a peak depending on how it is configured. Lower frequencies mean more smoothing, and on some static notch fields a zero means off rather than a cutoff at zero.',
    ],
    lab: [
      'The gyro path is sensors/gyro.c, compiled. The RPM filter is flight/rpm_filter.c, fed by getMotorFrequencyHz from the plant. The dynamic notch is compiled and then declined by DYN_NOTCH_UPDATE_MIN_HZ. The D-term filters live in pid_init.c and pid.c. yaw_lowpass_hz provides extra smoothing on yaw alone, because that axis is measured more noisily than the other two.',
      'The simplified filter sliders rewrite the underlying frequency values through simplified_tuning.c and are live. Turning simplified_gyro_filter off leaves whatever frequencies were typed.',
    ],
    sim: [
      'The injected imbalance lines are exactly the signal the RPM filter was written for. Disable RPM filtering, cut gyro_lpf1 to zero and fly a punch, and D will get lively. That is the plant and the glue behaving correctly rather than a fault in the tuning page.',
    ],
    related: ['physics-gyro', 'cli-gyro_lpf1_static_hz', 'cli-rpm_filter_q', 'cli-dyn_notch_count'],
    source: 'bf_glue.c, patches/0001, catalog.js GATED dyn_notch',
  }),

  page({
    id: 'control-ff',
    chapter: 'control',
    title: 'Feedforward',
    kicker: 'The controller',
    lede: 'P cannot act until the aircraft is already wrong, because error is its only input. Feedforward acts on the stick instead.',
    figure: 'ff',
    air: [
      'Feedforward watches how quickly the stick is moving and starts the motors on the assumption that the pilot meant that rotation, rather than waiting to discover the aircraft has fallen behind. Raise it and the machine leads the hand. Raise it too far and it overshoots at the start of every movement, and a radio with jitter makes that worse, because to a differentiator a jittery packet stream looks exactly like a violently moving stick.',
      'The clauses around it exist for that reason. Averaging, smoothing, jitter attenuation and a maximum rate limit are all there because a raw derivative taken across a 250 Hz packet stream is spiky. A perfect link in this simulator under-stresses every one of them, so tune feedforward on the ELRS 250 Hz preset if that is the radio you fly.',
    ],
    lab: [
      'f_roll, f_pitch and f_yaw are the gains. feedforward_averaging applies a 2, 3 or 4 point moving average to the derivative. feedforward_smooth_factor adds a further low-pass. feedforward_jitter_factor attenuates small spikes. feedforward_boost emphasises the beginning of a movement. feedforward_max_rate_limit stops feedforward asking for more than the rates curve allows. feedforward_transition blends it in as the stick leaves centre.',
      'All of them are live, in compiled pid.c and rc.c.',
    ],
    sim: [
      'Keyboard flight in angle mode does not need racing feedforward; radio acro does. If feedforward feels too good to be true on the perfect link, the explanation is on the radio page rather than in the plant.',
    ],
    related: ['physics-radio', 'control-pid', 'cli-f_roll', 'cli-feedforward_jitter_factor'],
    source: 'vendor/betaflight flight/pid.c feedforward, src/input/link.js',
  }),

  page({
    id: 'control-tpa',
    chapter: 'control',
    title: 'TPA, anti-gravity, airmode',
    kicker: 'The controller',
    lede: 'A quadcopter at hover and the same quadcopter at full throttle are, from the controller\'s point of view, two different aircraft. Three clauses exist to cover the difference.',
    figure: 'tpa',
    air: [
      'Throttle PID attenuation is the first. Propellers bite harder at high rotor speed, so the same gain produces a stronger correction at full throttle than it did in the hover, and gains that were right in the hover begin to oscillate at the top of the stick. TPA turns P and D down above a breakpoint. tpa_low does the opposite at the bottom of the stick, where authority is scarce for the same reason in reverse.',
      'Anti-gravity is the second. Punch the throttle and the aircraft bows, developing a pitch or roll error while the I term is still too slow to have caught up with it. Anti-gravity boosts I, and optionally P, during a fast throttle change so that the bow does not happen. No gravity sensor is involved anywhere: it is a high-pass filter on the throttle signal.',
      'Airmode is the third, and it is the one whose absence is most dramatic. Chop the throttle without it and all four motors go to idle, which leaves the mixer no room to speed one up and slow another down, so the aircraft has no control at all until throttle is added again. Airmode keeps that authority by letting the mixer work around idle, so a flip at zero throttle still has motors to fly with.',
    ],
    lab: [
      'TPA lives in pid.c with modes PD or D. Anti-gravity is a feature flag plus a gain, a cutoff frequency and a P gain, with mixTable updating the throttle filter that drives it. Airmode is a feature flag plus airmode_start_throttle_percent, and it requires the mixer to apply PID at minimum throttle, which is what pid_at_min_throttle controls.',
      'AIRMODE and ANTI_GRAVITY are live CLI feature lines rather than entries in the value table.',
    ],
    sim: [
      'Turn airmode off and fly a flip at zero throttle to feel why it exists. Do it over grass.',
    ],
    related: ['control-mixer', 'cli-tpa_rate', 'cli-anti_gravity_gain', 'cli-airmode_start_throttle_percent'],
    source: 'flight/pid.c, flight/mixer.c, catalog.js FEATURES',
  }),

  page({
    id: 'control-mixer',
    chapter: 'control',
    title: 'Mixer, idle, dyn idle, launch',
    kicker: 'The controller',
    lede: 'The mixer is where three rotation demands and a throttle become four numbers. It is also where the aircraft runs out of room.',
    figure: 'mixer',
    air: [
      'Mixer type LEGACY is the classic sum: throttle plus the roll, pitch and yaw columns, once per motor. LINEAR and DYNAMIC change how throttle and PID share the available range when a corner is being asked for more than 100 percent, which is the situation that decides whether a demand is honoured or clipped. EZLANDING is a landing aid rather than a racing default.',
      'DShot idle sets a floor a few percent above stopped, so that the bells never stall while airmode is working. Set it too low and yaw disappears at the bottom of the stick, because the motors that need to slow down have nowhere to go. Set it too high and the aircraft will not descend. Dynamic idle watches the actual rotor speed and raises the floor when a motor would otherwise droop, which on a real aircraft prevents an ESC desync. This plant cannot desync in that sense, and the loop still runs, because the plant feeds real rotor frequencies back to it.',
      'Launch control holds the attitude at idle until the throttle passes a trigger, which is how a racer leaves a start gate without drifting off the pad. The L key does it here.',
    ],
    lab: [
      'mixTable in mixer.c is compiled. dshot_idle_value is the digital idle offset. The dyn_idle_* fields write the PID profile and mixer_init, with getMotorFrequencyHz standing in for telemetry. The launch control state machine lives in bf_glue.c, because fc/core.c is not compiled, while the PID profile fields it reads are the real ones.',
      'yaw_motors_reversed flips the sign of the mixer yaw column. The crashflip_* fields are stored, and isFlipOverAfterCrashActive is stubbed to false.',
    ],
    sim: [
      'motor_output_limit is live and caps the motor range as a percentage. It is a relative of throttle_limit that lives in the PID profile rather than the rate profile, and it clips the PID output as well as the throttle stick. Use one of the two deliberately rather than both by accident.',
    ],
    related: ['physics-yaw', 'cli-dshot_idle_value', 'cli-mixer_type', 'cli-dyn_idle_min_rpm'],
    source: 'flight/mixer.c, bf_glue.c launch control, bf_settings.c',
  }),

  page({
    id: 'control-simplified',
    chapter: 'control',
    title: 'Simplified sliders',
    kicker: 'The controller',
    lede: 'The sliders are not a second tuning model sitting in front of the real one. They are Betaflight\'s own code, writing the real gains.',
    figure: 'simplified',
    air: [
      'Master, P, I, D, D Max, feedforward and pitch relative to roll: these exist so that a pilot can move a tune as a shape rather than as twelve separate numbers. The firmware then computes p_roll and its relatives from the slider positions. The catch is order of operations. If you type gains and then apply a slider, the slider wins, and a dump that ends with a simplified tuning apply line will overwrite whatever was typed above it.',
      'The filter sliders work the same way on the gyro and D-term frequencies. Turn the simplified filter switch off if typed frequencies should stay where they were put.',
    ],
    lab: [
      'simplified_pids_mode is OFF, RP or RPY, and applySimplifiedTuning is compiled. The Karate-style presets in configs/ depend on this path existing; without it they would load as comments and the aircraft would fly on defaults.',
    ],
    sim: [
      'Live. If a preset feels like defaults, the apply line was swallowed somewhere. That was a real bug once, and it is why bf_settings.c is a table rather than a chain of string comparisons that returned OK on an unknown key.',
    ],
    related: ['control-pid', 'cli-simplified_master_multiplier', 'start-compiled'],
    source: 'config/simplified_tuning.c, configs/, bf_settings.c history comment',
  }),

  page({
    id: 'control-angle',
    chapter: 'control',
    title: 'Angle mode and self-levelling',
    kicker: 'The controller',
    lede: 'In acro the stick is a rate. In angle the stick is a tilt. The difference is the whole distance between a first hover and a race lap.',
    figure: 'angle',
    air: [
      'In angle mode, pushing pitch asks for a nose-up attitude rather than a flip, and releasing the stick brings the aircraft back to level on its own. It is how most people survive their first hover, and it teaches habits a racer then has to unlearn, because a racing quad spends much of a lap at attitudes angle mode would refuse to hold. Horizon mode, which blends the two, is stored here but never raised.',
      'Launch control and angle mode can coexist on a start line, which makes the first few seconds of a session forgiving. Race laps are flown in acro.',
    ],
    lab: [
      'sim_set_angle_mode raises ANGLE_MODE, and pidLevel then reads angle_p_gain, angle_feedforward, angle_limit, angle_earth_ref and angle_feedforward_smoothing_ms, taking attitude from the plant quaternion by way of the IMU stub. The horizon_* fields are applied but inert, because HORIZON_MODE is never raised.',
      'level_race_mode is live firmware that changes how angle mode uses yaw. The keyboard path in the shell forces angle mode regardless of the settings whenever the keyboard is the stick source.',
    ],
    sim: [
      'The settings flight mode control and the configurator Modes tab are the same bit. There is no AUX channel, ARM is always on, and there is therefore no way to disarm accidentally in flight.',
    ],
    related: ['cli-angle_p_gain', 'cli-horizon_level_strength', 'start-nowings'],
    source: 'bf_glue.c ANGLE_MODE, catalog.js horizon APPLIED_INERT',
  }),
];

export const ARTICLE_BY_ID = new Map(ARTICLES.map((a) => [a.id, a]));

export function articlesIn(chapter) {
  return ARTICLES.filter((a) => a.chapter === chapter);
}
