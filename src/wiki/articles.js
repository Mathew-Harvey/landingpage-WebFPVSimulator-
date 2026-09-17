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
    lede: 'No wings, no control surfaces, and four propellers that cannot be aimed. A racing quadcopter does everything by changing how fast four discs spin.',
    figure: 'loop',
    air: [
      'A five inch racing quadcopter weighs about as much as a full can of soft drink and accelerates straight up faster than a sports car accelerates forward. The pilot never sees it. They stand on the ground in goggles, watching a camera bolted to the front of the machine, flying from the aircraft\'s point of view. That is first-person view, and it is the whole appeal: you are not operating a model, you are riding something small at racing speed.',
      'The controls are two sticks. In the Mode 2 layout almost everyone uses, the left stick is throttle and yaw, the right stick roll and pitch. No ailerons, no elevator, no rudder, no brake. You point the camera where you want to go and push, and the aircraft gets there by tilting its whole body so that thrust which was holding it up is aimed sideways instead.',
      'On six cells it makes nine times its own weight in thrust, the margin a fighter has in afterburner, on something you hold in one hand. It leaves a hover and clears the treetops in two seconds. Descend too fast into the air it just pushed down and it settles into a ring of its own wake and stops making lift while the motors are still screaming. Both behaviours fall out of the same equations, and both are here.',
      'Learning the sticks is a different screen. This is why the sticks do what they do: why a tuning file changes the feel, which parts of that feel are airframe and which are software, and which of it a browser computes rather than approximates.',
    ],
    lab: [
      'Two machines in one WebAssembly module. The first is Betaflight 4.5.1, the firmware on most racing quadcopters: rates curves, PID controller, filter chain, mixer and rc command handling, compiled from vendor/betaflight rather than reimplemented. The second is the plant, the aircraft itself, as C in src/native/plant.c: motors, propellers, battery, aerodynamics, rigid body. They step together at a fixed 1000 Hz. Rendering reads a snapshot and interpolates, so frame time never reaches the integrator.',
      'SI units throughout the physics path: metres, kilograms, seconds, radians, newtons, volts, amps. Degrees appear only where a human reads them, in the OSD, the settings copy and Betaflight config values, converted at that boundary. The body frame is right handed, x forward, y left, z up, matching Betaflight and the flight dynamics literature. Three.js is y-up, and that conversion happens once, in src/render/frame.js.',
      'Determinism is a requirement, because a lap time that depends on the browser is not a lap time. No relaxed SIMD, and no JavaScript Math.sin, Math.cos or Math.pow on the physics path: none of those are specified to the last bit and they differ between engines. A fixed libm is compiled in, randomness is a seeded xorshift32, and the same input stream must hash to the same state trace in Node and Chrome.',
    ],
    sim: [
      'Stage 1 began as a grey plane and a quadcopter, and the product grew around it: maps, a configurator, a track builder. The aircraft did not. There is still one airframe, and changing motor_kv stores a number nothing in the flight path reads. Pack charge in the settings does reach the plant. The configurator greys the rows that do nothing, so the difference is visible.',
      'Read the aircraft chapter before chasing a PID number. Much of what pilots call tune is the airframe: voltage sag, advance ratio, rotor drag, propwash. The controller chapter is what compiled Betaflight does with that airframe. The last chapter is every setting, including the several hundred that store faithfully and do nothing here.',
    ],
    related: ['start-nowings', 'start-loop', 'physics-airframe', 'start-honesty'],
    source: 'CLAUDE.md, STAGE1.md, src/native/sim_abi.h',
  }),

  page({
    id: 'start-whyacomputer',
    chapter: 'start',
    title: 'Why it needs a computer',
    kicker: 'The journey',
    lede: 'Throw a paper aeroplane and it flies. Throw a quadcopter and it tumbles. Everything else on this site follows from that difference.',
    figure: 'unstable',
    air: [
      'An aeroplane flies straight with nobody helping it. The wings are angled slightly upward, so a gust that tips the aircraft makes the lower wing meet the air at a steeper angle and lift harder than the raised one. The tailplane sits on a long lever arm behind the wing, so a wandering nose gets pushed back into line. That is geometry, not piloting, and it is why a paper aeroplane sorts itself out on the way across a room.',
      'A quadcopter has none of that geometry. Four motors on four arms, all pushing equally, and nothing anywhere on the airframe prefers level to any other attitude. Tip it ten degrees and it stays at ten degrees. It does not stay there long, because no real aircraft is built perfectly: one motor sits a fraction of a degree crooked, one propeller is a hundredth of a gram heavy, and those asymmetries add up to a steady push one way. The aircraft does not just fail to correct itself. It diverges.',
      'So something has to watch and push back, continuously. The figure asks how fast. A very good human, reacting to what they can see, manages about five corrections a second, and by the time they have registered the tilt and moved a thumb the aircraft is past saving. The flight controller does it a thousand times a second. That gap is the reason a quadcopter can be flown at all.',
      'Which changes what the rest of this site is describing. You are not flying the aircraft the way a pilot flies an aeroplane. You are sending a computer a rotation rate, the computer is flying the aircraft, and the skill is knowing what to ask for.',
    ],
    lab: [
      'A multirotor in hover has no static stability in attitude. With all four thrusts equal the net moment about the centre of gravity is zero at every orientation, so attitude is a double integrator driven by whatever residual torque exists. There is no restoring term, unlike the dihedral and tailplane contributions that give a fixed wing positive static stability. Any bias, a build tolerance, a propeller imbalance, an unmodelled gust, integrates twice into a divergent attitude.',
      'The figure runs a sample and hold PD loop on attitude against a constant 1.5 mN m bias, using this airframe\'s roll inertia of 0.0035 kg m^2 and its real torque per unit of mixer output. The instability as the update rate falls is discrete time behaviour, not exaggeration: hold a control output constant for longer than the closed loop wants to respond and the phase lost across the hold eats the margin. For these gains the transition sits between 50 and 100 Hz, which is why 1 kHz is comfortable and 5 Hz is not.',
      'Position is worse than attitude. Attitude at least stays where it is put without a bias. Horizontal position cannot, because a tilt of theta commands an acceleration of g tan(theta), so a small attitude error becomes a growing velocity and then a growing displacement whatever the pilot does afterwards.',
    ],
    sim: [
      'The plant contains no stabilising term, because a real airframe contains none. All the steadiness you feel here comes from the compiled Betaflight loop, at 1 kHz, out of gyro readings. Turn the gains far enough down on the PID page and the aircraft does what this page describes.',
      'The steady push the figure uses is the motor cant table, a modelled build tolerance rather than a measurement. Motor cant and roll-to-yaw coupling covers what it is and why it is there.',
    ],
    related: ['start-loop', 'control-pid', 'physics-cant', 'control-angle'],
    source: 'src/native/plant.c, which contains no restoring moment',
  }),

  page({
    id: 'start-nowings',
    chapter: 'start',
    title: 'A quad has no wings',
    kicker: 'The journey',
    lede: 'A quadcopter has one force it can point, and no way to point it except by rotating the whole aircraft. Every manoeuvre follows from that.',
    figure: 'tilt',
    air: [
      'An aeroplane holds itself up with wings and turns with surfaces that bite the oncoming air. A quadcopter holds itself up by aiming four propellers at the ground and turns by rotating its body. Roll right: the two right motors slow, the two left speed up, the aircraft rotates, and thrust that was holding it up now pulls it sideways. Pitch and yaw work the same way on the other axes. The thrust vector is bolted to the airframe, so pointing it means pointing the airframe.',
      'Which is why a quadcopter has no brakes. To slow down you pitch the nose up, or roll out of the line, so the thrust that was accelerating you now fights the speed you have, helped by the drag of the discs and the body. Chopping throttle reverses nothing. It removes the only force available and drops you into the column of air you have been pushing down.',
      'Acro, the mode racers fly, does not level the aircraft at centre stick. The stick asks for a rotation rate in degrees per second, so hands off means stop rotating, not return to level. Let go inverted and you stay inverted. Angle mode does the levelling instead, and this simulator switches to it for keyboard pilots, because a key that is either pressed or not makes a poor rate stick.',
    ],
    lab: [
      'The plant integrates Newton\'s second law for a rigid body, m a = sum F and I dot(omega) + omega × (I omega) = sum tau, with a diagonal inertia tensor, a quaternion attitude and semi-implicit Euler on the linear state, at dt = 0.001 s. Gravity of 9.80665 m/s² is applied along world −z after the body forces are rotated out.',
      'The body rate convention in sim_abi.h: positive p rolls right, positive q pitches nose down, positive r yaws nose left. Stick channels follow RC convention, where positive pitch is nose up and positive yaw is nose right, and mapping one onto the other is the glue\'s job. Get one link of that chain backwards and the control loop becomes positive feedback. The diagnosis is in PROGRESS.md and in the comments on PLANT_SPIN.',
      'There is no lifting surface. Quadratic drag on the plan, front and side areas, 0.5 rho CdA |v| v in the body frame, plus the rotor H-force, are the only translational damping besides gravity and thrust. A banked turn without rudder therefore washes out the way a real acro quad does, nose not tracking the velocity vector, because nothing in the physics makes it track.',
    ],
    sim: [
      'The How to fly screen is this page with live gimbals. If a trajectory here feels like an aeroplane, the fault is in the drag model or the H-force. That is a plant bug, not a tune.',
    ],
    related: ['start-loop', 'physics-drag', 'physics-hforce', 'control-rates'],
    source: 'src/native/sim_abi.h, src/native/plant.c',
  }),

  page({
    id: 'start-loop',
    chapter: 'start',
    title: 'The closed loop',
    kicker: 'The journey',
    lede: 'A thousand times a second the aircraft asks one question: am I rotating at the rate the pilot asked for? Everything the flight controller does is an answer to it.',
    figure: 'loop',
    air: [
      'Move the roll stick. The radio packs the stick positions into a packet and sends it. The flight controller runs the position through the rates curve to get a demanded rotation rate in degrees per second, and compares that against what the gyroscope reports. The difference is the error. PID turns the error into four motor commands; the motors change speed; the propellers change thrust; the aircraft rotates; the gyroscope notices; the error shrinks. A thousand times a second, with the pilot as one participant.',
      'Every part of that loop fails in a way you can feel. A gyroscope picking up frame vibration along with rotation makes the controller chase ghosts and the motors buzz. Motors that answer late, because the bells have mass or the battery is sagging or the propellers are already in fast air, deliver the correction after it was needed, and the aircraft overshoots. Ask for more rotation than the airframe can deliver and the motor commands saturate: you get what physics allows, not what the rates curve promised.',
      'Feedforward breaks the pattern. Instead of waiting for an error it watches how fast the stick is moving and starts the motors on the assumption you meant it, which is most of what makes a good tune feel connected to the hand. It also means the radio matters: perfectly even packet timing gives feedforward a cleaner derivative than any real radio, which is why this simulator has a link model you can switch on.',
    ],
    lab: [
      'Each 1 ms step in bf_glue.c runs in Betaflight\'s order: read the gyro device, which is the plant\'s angular velocity plus modelled imbalance, quantised as a 16-bit sensor at 2000 deg/s would quantise it; gyroFiltering; updateRcCommands and processRcCommand on the simulated clock; pidController; mixTable. The motor duties become the plant\'s duty vector. Dynamic idle and the RPM filter read getMotorFrequencyHz from the plant, lagged like DShot telemetry.',
      'The PID runs in degrees per second and the plant in radians per second, so the glue converts. TPA and the throttle filter behind anti-gravity update from mixTable, matching Betaflight\'s own sequencing. Calling pidController with a stale throttle was a real bug, and the fix is called out in bf_glue.c so it is not reintroduced.',
      'Input samples carry timestamps, and sim.c applies each one before the 1 ms step that contains it rather than when it arrived by wall clock. Irregular packet times into a fixed-step integrator read as floaty.',
    ],
    sim: [
      'Save on the flight controller screen runs sim_init on a CLI dump, the same path as dropping a Betaflight diff onto the page. The interface never writes a PID gain into the plant. Greyed options are named rather than hidden, and live options reach compiled 4.5.1 parameter groups.',
    ],
    related: ['control-pid', 'physics-gyro', 'physics-radio', 'control-filters'],
    source: 'src/native/bf/bf_glue.c, src/native/sim.c',
  }),

  page({
    id: 'start-compiled',
    chapter: 'start',
    title: 'The controller is ported, not written',
    kicker: 'The journey',
    lede: 'A racing simulator can write its own controller or compile the real one. This project compiles the real one, and that decision shapes everything else.',
    figure: 'boundary',
    air: [
      'The shortcut is to write a PID in the game engine. A few dozen lines, plots convincingly, flies like a different aircraft. What a pilot means by Betaflight is not three gains. It is the D-term filter chain, throttle PID attenuation, I-term relax, anti-gravity, feedforward averaging, the mixer, airmode, and a dozen other clauses, almost all of which exist because somebody crashed into an edge case and wrote code so nobody else would. Reimplement the gains and you have the skeleton without the behaviour.',
      'So this project vendors Betaflight 4.5.1 and compiles its control loop to WebAssembly. A dump pasted into the configurator is parsed by that firmware, not by an imitation. The simplified tuning sliders run Betaflight\'s simplified_tuning.c. The rates graph on the configurator screen is a preview; the aircraft is flown by applyRates in fc/rc.c, the function a real flight controller runs.',
    ],
    lab: [
      'Compiled sources: pid.c, pid_init.c, mixer.c, mixer_init.c, rc.c, rc_controls.c, controlrate_profile.c, the gyro filtering chain, rpm_filter, dyn_notch_filter, which then refuses to arm at 1 kHz exactly as on a slow real board, and simplified_tuning.c. Hardware is stubbed: no UART, no MSP, no OSD pixels, no GPS. Local changes are patch files in patches/, applied at build time, and git diff --stat vendor/betaflight must come back empty after a build.',
      'The licence is GPLv3, because compiling somebody else\'s control loop into your program makes it a derivative work. Every file here carries that header, and a dependency with an incompatible licence cannot be added.',
    ],
    sim: [
      'The flight controller screen is modelled on Configurator 10.10: tab names, the 4.5.1 field set, dark grey and orange. It is not that application. No Vue, no MSP, no iframe. Save writes CLI text, and readback dumps the live parameter groups, so the screen cannot show a value the firmware does not hold.',
    ],
    related: ['control-pid', 'start-honesty', 'cli-index'],
    source: 'CLAUDE.md, src/native/bf/bf_glue.c, patches/',
  }),

  page({
    id: 'start-honesty',
    chapter: 'start',
    title: 'Live, gated, inert',
    kicker: 'The journey',
    lede: 'Most of a flight controller\'s settings have nothing to do with flying. This simulator shows them anyway, greyed and labelled, rather than pretending they are absent.',
    figure: 'status',
    air: [
      'A real Betaflight Configurator sets the video transmitter channel, lays out the on-screen display, configures GPS rescue and picks LED colours. This simulator has no video transmitter, no Betaflight OSD over the camera view, no GPS and no LEDs. The settings still exist here, so a dump pasted in from a real aircraft comes back out whole instead of missing half its lines. They are grey. Change one, export, and the new value is in the file. It will not change how the aircraft flies.',
      'The second category is Betaflight\'s own doing. The dynamic notch refuses to run below a 2 kHz gyro loop. This loop is 1 kHz, the same as a slower real board, so the settings store, the code is compiled and present, and the sliding discrete Fourier transform it runs on, the SDFT, never starts. That is the firmware behaving as designed, and the catalog calls it gated.',
      'The third looks as though it should work and does not. motor_kv writes to a real parameter group that nothing in the 1 ms loop reads, because the plant\'s motor constant is its own number. The aircraft is still the Stage 1 five inch whatever the field says. The catalog calls that applied but inert.',
    ],
    lab: [
      'src/fc/catalog.js is the only place a key\'s status is decided. LIVE: writes a parameter group this build compiles, and that code runs. GATED: writes the group, and this firmware ignores it at 1 kHz. APPLIED_INERT: writes a real group nothing in the flight path reads. INERT: a real 4.5 CLI key whose subsystem is not compiled. ABSENT: Configurator chrome that is not a CLI key at all.',
      'Do not read sim_bf_key_status as a statement about whether a key does anything. A native 0 means the key is in the write table, which includes GATED and APPLIED_INERT. The catalog decides what is greyed.',
    ],
    sim: [
      'Every catalog key has a page here. Live pages say what raising the value does to this aircraft. Grey pages say what the key does on a real machine, then say plainly that it does not fly here. If a live page and a flight disagree, that is a catalog bug worth reporting.',
    ],
    related: ['cli-index', 'control-filters', 'physics-airframe'],
    source: 'src/fc/catalog.js, src/native/bf/bf_settings.c',
  }),

  page({
    id: 'start-howto',
    chapter: 'start',
    title: 'How to read this wiki',
    kicker: 'The journey',
    lede: 'Two columns on every page, a status label, and a figure you can drive. The plain column and the technical column are not the same sentence at two lengths.',
    figure: 'anatomy',
    air: [
      'In the air is what you could tell somebody at the flying field. In the lab is what you could defend in a design review. In this simulator is the seam: which file, which status, which verification check, and which parts of the phenomenon are not modelled.',
      'Every figure has a control under it. Drag it and the drawing and the numbers move together, because the figure computes the relationship the page describes rather than illustrating it from memory. Figures animate unless the browser asked for reduced motion. They are arguments rather than photographs, and the caption says what each one argues.',
      'Flight feel cannot be verified from a page. The simulator\'s harness, npm run verify, is the signal for the plant, and a page citing a check is citing a number out of that harness.',
    ],
    lab: [
      'The related links at the foot of a page are the intended reading path, not an index of every mention. Pages about a single CLI gain link back to the family article, PID, rates or filters, so no individual number is orphaned.',
      'Sources are file paths in the simulator repository, not citations of textbooks. Where a textbook result is used, as with Glauert inflow, the momentum theory figure of merit or the shape of the vortex ring gap, the comment in the plant source is the citation, because that is where the implementation chose a form.',
    ],
    sim: [
      'This wiki is a page on the landing site, not a screen inside the simulator. It does not step the integrator, and opening it does not affect a flight in progress.',
    ],
    related: ['start-welcome', 'physics-timestep', 'cli-index'],
    source: 'src/wiki/',
  }),

  page({
    id: 'physics-airframe',
    chapter: 'physics',
    title: 'The Stage 1 airframe',
    kicker: 'The plant',
    lede: 'One aircraft, and every number describing it is a constant in a C file rather than a field you can edit.',
    figure: 'quadx',
    air: [
      'A 650 gram five inch quadcopter: 220 mm frame, 2207 motors around 1900 kV, five inch three-blade propellers with 4.3 inches of pitch, six cell 1300 mAh battery. An ordinary specification, and the only aircraft in this build. A different tune does not change the motors. Nor does typing a different motor_kv into the configurator.',
      'Fully charged it makes 9.2 times its own weight in thrust, so a hover takes about a fifth of the throttle stick and the other four fifths are climb. Pilots set a throttle limit for that reason: not to fly slower, but to spread the useful part of the stick across a range a thumb can resolve. A hover band a few percent wide is almost impossible to sit in.',
    ],
    lab: [
      'PlantParams: mass 0.65 kg; inertia diagonal 0.0035, 0.0038, 0.0068 kg m² in roll, pitch, yaw; arm_x = arm_y = 0.110/sqrt(2) m; kt = 1.98e-6 N/(rad/s)²; kq = 2.80e-8 N m/(rad/s)²; ke = 0.006336 V s/rad; r_motor = 0.1825 ohm; j_rotor = 8.0e-6 kg m²; six cells at 2.5 mOhm each; rho = 1.225 kg/m³; propeller radius 0.0635 m.',
      'ke is deliberately not 60/(2 π 1900). Nameplate kV is measured unloaded, and the loaded torque constant of a real 2207 is better than the plate, which is why a thrust stand draws less current than the nameplate predicts. Forcing the nameplate value would need a kq low enough to push the figure of merit above anything a real propeller reaches. The airframe is still a 1900 kV motor; 0.006336 is its loaded constant, and the reasoning is in the comment block at the top of plant.c.',
      'The figure of merit is enforced rather than assumed: kq = kt^1.5 / (FM sqrt(2 rho A)) with FM = 0.565, inside the plausible band of 0.4 to 0.6. An earlier pair of constants gave 2.01, which is thermodynamically impossible, and sim_bf_debug case 12 now recomputes the value from the compiled constants so it cannot drift back.',
    ],
    sim: [
      'None of these are CLI fields. Pack charge sets the cell open circuit voltage, 4.2, 3.8 or 3.5 V, and the rest is fixed in the plant. A different airframe is a change to the shape of the physics model, not a value a wiki page can offer.',
    ],
    related: ['physics-motor', 'physics-fm', 'physics-sag', 'start-honesty'],
    source: 'src/native/plant.c PlantParams, STAGE1.md',
  }),

  page({
    id: 'physics-timestep',
    chapter: 'physics',
    title: 'Fixed timestep and determinism',
    kicker: 'The plant',
    lede: 'The aircraft does not know how fast your computer is drawing. That is deliberate, and load-bearing.',
    figure: 'timestep',
    air: [
      'What you see is a recording of a calculation that is indifferent to the display. If the picture stutters, the aircraft in the calculation is where it would have been anyway, because physics advances in fixed one millisecond steps with no relationship to frames. A recorded flight therefore replays bit for bit on another machine.',
      'The alternative, advancing physics by however long the last frame took, sounds harmless. A slow frame would be a different flight, a fast computer a different lap time, and no verification check would mean anything, because the same input would stop producing the same output.',
    ],
    lab: [
      'sim.c steps at SIM_STEP_HZ 1000, and sim_step(n) advances n milliseconds of simulated time. The host in src/main.js accumulates the real frame delta and spends it in whole 1 ms ticks, and the renderer interpolates between the two most recent physics states. The quaternion update subdivides so the small angle approximation in the compiled libm stays in its accurate range, then renormalises.',
      'The linear update is semi-implicit Euler, velocity before position, gravity on world z after the body forces are rotated out. Operation order is fixed, the build carries -fno-fast-math and -ffp-contract=off, and relaxed SIMD is off.',
      'Wash noise and the gyro hash use xorshift32, seeded in SimState and in the glue and reset with the run: integer operations mapped to a double in a closed range. No Math.random, no float hashing of the seed.',
    ],
    sim: [
      'Checks 2, 3 and 4 are the ruler: the same run repeated in one process, the same run in Node and Chrome, and the same run at simulated render rates of 30, 60, 144 and 240 Hz. If a rendering change moves the trace hash, a Math call or a frame delta has leaked into the plant. If a plant change does not move it, the check is broken.',
    ],
    related: ['start-welcome', 'physics-wash', 'physics-gyro'],
    source: 'src/native/sim.c, src/native/sim_abi.h, CLAUDE.md',
  }),

  page({
    id: 'physics-motor',
    chapter: 'physics',
    title: 'Motors: voltage, current, lag',
    kicker: 'The plant',
    lede: 'Throttle is not thrust. It is a duty cycle, and between the command and the force sits a rotating mass that takes its time.',
    figure: 'motor',
    air: [
      'Punch the throttle and the flight controller tells the speed controller to put more of the battery across the windings. The motor does not arrive at its new speed. The bell, the spinning outer can the propeller bolts to, has mass, and so does the propeller. For a few hundredths of a second you are waiting on that inertia, and the wait is most of the difference between a quad that feels crisp and one that feels soft.',
      'Current meanwhile is a race between two voltages. The applied voltage pushes current through the winding resistance, the spinning motor generates a back EMF opposing it, and as the rotor speeds up the back EMF closes the gap and the current collapses. A real speed controller also has inductance and a current ceiling; this plant has neither, so the first couple of milliseconds of a punch draw a current no real aircraft would survive. The rotor time constant absorbs that spike before it becomes thrust: it shows in the state readout and does not reach the feel.',
    ],
    lab: [
      'Average applied voltage is duty times pack voltage under load, so i = (d V_load − ke ω) / R, and the rotor obeys j dw/dt = ke i − spin * kq ω_rel |ω_rel|. Duty clamps to [0, 1] and ω clamps at 0, since this airframe has no reversing motors.',
      'j_rotor is 8.0e-6 kg m² against a real 2207 bell plus five inch triblade nearer 9e-6. Check 8 times 0 to 100 percent duty to 63 percent of final RPM and wants 10 to 30 ms; 9e-6 measured about 29 ms, and 8.0e-6 leaves margin. An ESC current ceiling of 48 A was built and measured, cutting peak pack current from 410 A to 192 A, then withdrawn, because it pushed that time constant to 51 ms and out of band. The limit is commented in plant.c with those numbers.',
      'Pack voltage and motor current are an algebraic loop, and with realistic resistances a one-step lag oscillates. The plant solves it closed form: V = (Voc + Rp B / R) / (1 + Rp A / R), with A = sum d_i² and B = sum d_i ke ω_i.',
    ],
    sim: [
      'dshot_idle_value is live and sets the floor the mixer will not command below, as DShot idle does on a real board. min_throttle, max_throttle and min_command are PWM-era fields, and since the glue\'s motorInitEndpoints uses DShot constants, all three are applied but inert. So is motor_kv: ke stays 0.006336 whatever the field says.',
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
      'A propeller throws air downward. How hard it throws, thrust, and how hard it is to turn, torque, are tied together by the power going into the air. A propeller making a great deal of thrust for almost no torque would return more energy than it was given. Early in this project the constants described exactly that, and they were refitted.',
      'The quantity that keeps them honest is the figure of merit: the power a perfect actuator disc would need to hover, divided by the shaft power actually consumed. A perfect disc scores 1.0. A real five inch racing propeller sits between 0.4 and 0.6, losing the rest to profile drag, tip vortices and swirl. This aircraft is 0.565.',
    ],
    lab: [
      'Ideal induced power for one hovering disc is T^1.5 / sqrt(2 rho A), shaft power is kq ω³, so FM = P_ideal / P_shaft. Substituting T = kt ω² rearranges to kq = kt^1.5 / (FM sqrt(2 rho A)), where A is π (0.0635)². The code derives kq from kt rather than tuning the two independently.',
      'Thrust after the aerodynamic corrections is T = kt ω² * axial, with axial from the advance ratio, vortex ring, propwash and translational lift stack. Propeller drag torque uses ω_rel = spin ω + r (body yaw), so a yawing aircraft loads one diagonal pair and unloads the other, and the residual is real yaw damping.',
    ],
    sim: [
      'Yaw authority is paid out of this torque, so starving kq makes yaw soft. The FM 2.01 plant had to distort other constants to compensate. Do not set kt and kq independently again.',
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
      'A fresh pack punches harder than one two minutes into a flight, long before the capacity is gone. Under heavy current the pack\'s internal resistance drops its terminal voltage, the motors see less than the label says, and available rotor speed falls with it. Pilots call it the pack falling off. Punch-out at 3.6 V per cell is verification check 11 for that reason.',
      'Pack charge in the menu picks the open circuit voltage per cell: 4.2 full, 3.8 mid-flight, 3.5 nearly empty. It is not a fuel gauge. Capacity is not modelled, so a flight will not end by running out. A low setting gives a softer motor for the whole flight instead.',
    ],
    lab: [
      'r_cell is 0.0025 ohm across six cells, so r_pack is 0.015 ohm, and V_load comes from the implicit solve under motors. Motor current sums as d * i wherever that product is positive. Check 11 runs identical punch-outs at 4.20 and 3.60 V per cell and expects the sagged pack to peak 4 to 15 percent lower in RPM.',
      'The vbat_* CLI keys are inert, because the plant owns the pack rather than the firmware. Betaflight\'s vbat_sag_compensation is live: firmware that scales PID gains with whatever cell voltage it is told, and the glue feeds it the plant\'s sagged value. Compensation is a controller trick, not a bigger battery.',
    ],
    sim: [
      'No thermal model of the pack, no C rating, no connector resistance separate from r_cell. The 2.5 mOhm figure is plant.c\'s stated value for a six cell 1300 mAh race pack.',
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
      'Climbing hard, a quadcopter chases the air it just accelerated downward, so the propellers meet air already moving their way and take a smaller bite. Thrust falls. That is why a punch does not accelerate indefinitely, and it caps a full throttle dive before drag is even counted.',
      'What matters is not speed through the sky but speed of air through each disc, which includes rotation as well as translation. Roll, and the rising pair climbs through the air while the falling pair descends through it. The rising side loses thrust, the falling side gains it, and the difference is a torque opposing the roll. That is aerodynamic rate damping. Without it the PID is the only thing stopping a rotation, which is why a machine modelled without it snaps back at centre stick.',
    ],
    lab: [
      'Axial velocity at each rotor is va = v_body_z + p y_m − q x_m, and pitch speed is max(ω, 60) * k_inflow, where k_inflow is the pitch radius, 4.3 inches of pitch over 2π, or 0.017382 m/rad. Their ratio is mu. For mu ≥ 0, axial = max(0, 1 − mu). For −0.30 < mu < 0, axial = 1 − mu, the windmilling case where thrust rises. Deeper descents take the vortex ring branch.',
      'ω is floored at 60 rad/s in the pitch speed denominator so a stopped rotor cannot divide by zero. The model is a blade element linearisation in which thrust crosses zero when axial speed reaches pitch speed. A model, not a CFD solution of a five inch triblade.',
    ],
    sim: [
      'STAGE1.md deferred inflow and advance ratio to Stage 2, and the code has both. A comment in plant.c preserves an older paragraph claiming only the rotational part was used; both parts have been in use since this model landed.',
    ],
    related: ['physics-vrs', 'physics-wash', 'physics-damping', 'physics-fm'],
    source: 'src/native/plant.c advance ratio block',
  }),

  page({
    id: 'physics-vrs',
    chapter: 'physics',
    title: 'Vortex ring state',
    kicker: 'The plant',
    lede: 'Descend into your own downwash fast enough and the wake stops leaving. It folds back over the disc as a closed ring, and the propeller works inside a doughnut of air it has already used.',
    figure: 'vrs',
    air: [
      'Helicopters have the same problem on one big disc; a quadcopter has it on four small ones. A gentle descent helps, because air arriving from below reaches the propeller sooner and thrust rises. Past a certain rate the picture inverts. The wake no longer clears the disc, it recirculates through it, and the propeller pumps the same disturbed air round and round. Thrust falls away while the motors turn at the same speed and make the same noise.',
      'The recovery is the helicopter recovery: stop descending into it. Pitch forward or roll out of the column so the discs meet air that has not been through them, and the ring collapses. Power does not help, because the problem is not shaft power. It is that the air the propeller is working on has nowhere to go.',
    ],
    lab: [
      'Onset at mu = −0.30, fully developed at −1.20, floor axial = 0.75. Between the two the factor interpolates linearly from (1 + 0.30) down to 0.75, then holds. That is the shape of the gap momentum theory leaves, not a curve fitted to feel. An earlier model used axial = 1 − va/pitch_speed clamped at 1.35 for every descent, which handed the aircraft more thrust the faster it fell, thrust to weight rising from 1.063 in hover to 1.434 at a 6.2 m/s sink, and deleted rate damping entirely, because a clamp has zero derivative.',
      'PLANT_INFLOW_ASYM = {0.031, −0.017, −0.028, 0.014} applies whenever axial < 1, scaled by depth, because four rotors in a recirculating field do not stall together. Without it the four losses cancel into a pure heave, which is not what a descending quad does. The values sum to zero, so a symmetric deep descent cannot invent net extra thrust.',
    ],
    sim: [
      'This is the mean thrust loss. The shake on top of it is propwash, next page. Checks 5 to 12 were measured against this loss model, and wash is gated out of them so the vertical checks do not move.',
    ],
    related: ['physics-wash', 'physics-advance', 'physics-etl'],
    source: 'src/native/plant.c PLANT_VRS_* and descent branch',
  }),

  page({
    id: 'physics-wash',
    chapter: 'physics',
    title: 'Propwash',
    kicker: 'The plant',
    lede: 'Mean thrust loss is half a descent. The other half is that the air is no longer steady, and no gain cancels a disturbance that differs on every rotor and every millisecond.',
    figure: 'wash',
    air: [
      'Diving into your own wake, hauling out of a dive, chopping throttle over the top of a flip: a real quadcopter shakes, and you feel it in the video and in the sticks as the controller chases a gyro that will not sit still. A simulator without this is glass. One with too much of it is a washing machine.',
      'It appears where the physics says it should. Descending into the wake, the aircraft shakes. Climbing, it is in clean air. Hovering, it is not in the ring at all. The model gates turbulence on descent depth rather than applying it everywhere, so it arrives and leaves as it does in life.',
    ],
    lab: [
      'Depth is not mu. It is descent rate against the induced velocity v_h = sqrt(T / (2 rho A)). Recirculation begins around 0.25 v_h, is worst near 1.0, and runs out to 3.0 v_h, because the frame, battery and arms shed wake into air the discs sit in, where a clean isolated rotor would be finished by about 2. The envelope is a triangle: (rw − 0.25)/0.75 rising to 1, then (3 − rw)/2 falling.',
      'The unsteady field is one channel per rotor from xorshift32 through two one-pole filters at 30 Hz and 3 Hz, coefficients 0.171796 and 0.018673 at 1 kHz, RMS 0.16730 measured over four million samples, clamped at three sigma. Applied as axial += axial * k_propwash * depth * wash, with k_propwash = 0.08. At 0.30 the peak-to-peak gyro sat near 45 to 59 deg/s and a pilot called it too hot. 0.08 is a chosen feel constant; the mechanism it scales is not.',
      'The poles sit where they do for a reason. The field runs every step regardless of depth, so flying into the wash does not restart the turbulence from quiet, and only the depth-scaled proportion is applied. Below about 3 Hz an I term trims the disturbance out; above about 30 Hz the D-term filter removes it. Neither is what propwash feels like, so the energy goes between them.',
    ],
    sim: [
      'Grass flattening in the renderer is a picture of downwash, not this model, so do not tune k_propwash by looking at it. STAGE1.md deferred propwash and the plant has it. Renderer and plant model wash separately and neither reads the other.',
    ],
    related: ['physics-vrs', 'physics-gyro', 'physics-damping'],
    source: 'src/native/plant.c PROPWASH comment and wash filters',
  }),

  page({
    id: 'physics-etl',
    chapter: 'physics',
    title: 'Translational lift',
    kicker: 'The plant',
    lede: 'A hovering rotor flies in air it has already ruined. Start moving and it meets air that has not been through it, and the same throttle makes more lift.',
    figure: 'etl',
    air: [
      'Accelerate out of a hover without touching the throttle and the aircraft gets lighter. A fast pass holds altitude on less stick than a hover, because the discs are biting undisturbed air. Helicopter pilots meet this as a shudder and a surge of lift at walking pace and call it effective translational lift. On a quadcopter it is the same equation on four smaller discs.',
      'Leave it out and the hover and the cruise feel like two different aircraft bolted together, and the pilot hunts the throttle in a way a real five inch never asks for.',
    ],
    lab: [
      'kt is calibrated so axial = 1 is hover, which already has the hover induced velocity baked in. What is missing is the change in induced velocity as the aircraft moves, so the correction is axial_gain = (v_h − v_i) / pitch_speed. It is identically zero in a hover or a pure vertical climb, and capped at 0.35, because at idle the pitch speed collapses faster than v_i and the ratio runs away.',
      'v_i comes from the same Glauert quartic the H-force uses, solved from the ideal thrust kt ω², since the actual thrust is what this expression is about to produce. That costs two solves of the same relation per rotor per step, accepted because iterating inside a fixed 1 ms step is not on offer.',
    ],
    sim: [
      'Vertical checks 5, 6, 7 and 11 cannot see this term by construction, because v_perp is approximately zero in all of them. If a future airframe flies those checks in a crosswind, this page needs rewriting.',
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
      'A spinning disc moving edgewise does not only push down. It also pulls backward, because the blade advancing into the airflow meets it faster than the blade retreating, and the imbalance appears as a force in the plane of the disc. Helicopter engineers call it the H-force. On a quadcopter it is why the machine decelerates when it levels off, why a sideways slide dies out, and why pitching up at 45 degrees brakes rather than skating on.',
      'Without it, on an earlier build: an aircraft levelled off at 20 m/s on hover throttle still had half that speed 3.2 seconds later, and a 50 degree banked turn traced a 29 metre radius because it kept sliding out. Pilots called it floaty, which is the word for an aircraft given a top speed but not a middle.',
    ],
    lab: [
      'Per rotor, H = k rho A v_i v_perp, with v_i from Glauert: v_i = v_h² / sqrt(v_perp² + v_i²), evaluated as y² = 2 / (sqrt(x⁴+4) + x²) to avoid catastrophic cancellation at large x. At low speed y approaches 1 and H is linear in v_perp; at high speed y approaches 1/x and H saturates at k T / 2, so it does not steal the top end. A linear-only attempt took maximum level speed from 139 km/h to 87.',
      'k = 0.43842, anchored on a published linear drag coefficient of about 0.30 /s at hover for a 0.6 kg five inch: 4 rho A v_h = 0.444787 kg/s, so k = 0.65 * 0.30 / 0.444787. That published figure already contains some parasitic drag, making k an upper bound, and the body CdA was cut afterwards so the plant does not charge for the same drag twice.',
      'The in-plane force acts at z = +0.020 m, giving a nose-up couple in forward flight and a roll-away couple in a slide. The four z-moments from symmetric H cancel; what survives is the omega × r contribution, which is yaw damping.',
    ],
    sim: [
      'Roll and pitch rates move the rotors vertically rather than edgewise, so they make no H-force and the rate response is untouched. Climbs and punches through the disc are untouched for the same reason. That is why this term could land without moving checks 5 to 12.',
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
      'Belly first into the wind, as in a flare, presents far more area than nose first. Sideways is different again, because the battery is longer than it is wide and adds a face that is not there from the front. Copy one number onto all three axes and you get a machine that brakes no harder than it cruises. The three areas here are different on purpose.',
      'Drag also rises with the square of speed, so a coefficient fitted to the top speed contributes almost nothing in the middle of the range. Something else has to brake through a corner, and on a quadcopter that something is the propellers.',
    ],
    lab: [
      'Body force per axis is F_body_a = −0.5 rho CdA_a v_a |v_a|, with cda_plan = 0.0225 m², cda_front = 0.0130 m², cda_side = 0.0147 m². Front is roughly 0.011 m² of projected structure at a drag coefficient near 1.2. Side adds the battery\'s extra 35 by 75 mm face, about 0.0017 m² of CdA. Plan is the belly, and it is not allowed to stand in for rotor drag, because the discs are modelled separately.',
      'All three were 0.016 before the H-force existed, doing two jobs at once. They were re-fitted afterwards against the maximum level speed procedure, which measured 128 km/h inside a 120 to 165 band.',
    ],
    sim: [
      'Being quadratic, the term is weak in the middle of the speed range and strong at the top, which is the gap the H-force fills. Body drag still sets the high speed ceiling, with advance ratio and voltage sag.',
    ],
    related: ['physics-hforce', 'physics-airframe', 'physics-advance'],
    source: 'src/native/plant.c cda_* comments',
  }),

  page({
    id: 'physics-noseup',
    chapter: 'physics',
    title: 'Pitch up at speed',
    kicker: 'The plant',
    lede: 'The propellers sit 20 mm above the centre of gravity. That offset turns rotor drag into a pitching moment, and every real multirotor carries it.',
    figure: 'noseup',
    air: [
      'Fly fast with hands off pitch and a real quadcopter raises its nose. Pilots trim it out with a touch of forward stick, as they would a tail-heavy model, or leave the I term to hold it. The same offset means chopping throttle at speed changes attitude as well as thrust, so part of the deceleration you feel is the aircraft rotating rather than slowing.',
      'The mechanism is a lever. The rotors pull backward at the height of the discs, the mass resists at the height of the centre of gravity, and because the heights differ the force becomes a couple. Model the motors in the plane of the centre of gravity and the lever vanishes, leaving a machine that behaves like a flat plate. This plant did that until PLANT_POS_Z was added.',
    ],
    lab: [
      'PLANT_POS_Z is 0.020 m for all four rotors. Arms at the mid plate, disc about 28 mm above that once bell and hub are counted, and the centre of gravity of a 650 gram machine with a 250 gram battery on top about 8 mm above the plate: difference near 20 mm. A pure z force at (x, y, z) has moment (y F, −x F, 0), so hover and punch checks cannot move. The couple comes from the in-plane H-force at that height.',
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
    lede: 'A perfectly symmetric QUADX cannot yaw from a roll, at least at the order this model works to. Real frames are not symmetric, and the yaw trim pilots carry measures how imperfect they are.',
    figure: 'cant',
    air: [
      'Roll hard on a real machine and it yaws a little. The pilot carries a touch of yaw trim or rides it out. A simulator showing zero coupling is flying a frame built to a tolerance no factory holds: motors are never aimed to a tenth of a degree, moulded arms are never square, and four screws never pull a motor down flat.',
      'So each motor here gets a fixed misalignment of less than two degrees, the error a moulded arm and four screws actually produce. A roll then leaves a small yaw moment behind, and the hover I term trims the remainder as it would on a real machine.',
    ],
    lab: [
      'The algebra shows why the cant is necessary. The roll column is (−1, −1, +1, +1), and each pair holds one clockwise and one counter-clockwise motor, so sum_m SPIN[m] f(roll[m]) = 0 for any f. RPM-squared drag, stator reaction, net angular momentum and advance ratio all cancel pairwise, and inflow asymmetry does not rescue check 10 on a symmetric frame either.',
      'Tangential cant in degrees: −0.9, +1.4, +0.6, −1.2. Scalar sum −0.1 degrees, the hover yaw bias. Sum against the roll column −1.1 degrees, the coupling. The sign puts a right roll into a nose-right yaw, matching check 10\'s expected_sign. Radial cant {1.4, 0.85, 1.15, 0.6} outward is then solved so the tangential set\'s net in-plane force cancels at hover. Radial cant cannot yaw, because a force along r has zero moment about z.',
      'These are a model of build tolerance, chosen rather than scanned from a real frame. Check 10\'s 2.0 degree floor has historically been larger than this tolerance produces under a yaw PID, and the argument sits in OPEN QUESTIONS in PROGRESS.md. This page does not claim the floor is met.',
    ],
    sim: [
      'Do not add a scripted yaw-on-roll term. Coupling falls out of the physics rather than being written in. If somebody re-bands check 10, that is a decision about the threshold, not about the cant table.',
    ],
    related: ['physics-yaw', 'physics-gyroscopic', 'start-honesty'],
    source: 'src/native/plant.c PLANT_CANT_*, PROGRESS.md check 10',
  }),

  page({
    id: 'physics-yaw',
    chapter: 'physics',
    title: 'Yaw: stator reaction and drag torque',
    kicker: 'The plant',
    lede: 'There is no tail rotor. A quadcopter turns by making two propellers harder to spin than the other two, and the frame feels the difference.',
    figure: 'yawtorque',
    air: [
      'Yaw is the leftover of four propellers fighting each other. Two turn clockwise, two counter-clockwise, and in steady flight the torques they absorb cancel. Ask for nose right and the mixer speeds the pair spinning one way and slows the pair spinning the other; the torques stop cancelling; the frame rotates. It is weaker than roll or pitch, builds more slowly, and couples into everything else, because the motors producing it are also holding the aircraft up.',
      'That coupling explains what pilots notice. Yaw feels late on a low idle, because the motors that need to slow are already near the floor. Yaw dies in a punch, because the motors that need to speed up are already at the ceiling. And airmode matters, because at zero throttle without it the mixer has no room in either direction.',
    ],
    lab: [
      'Stator reaction on the frame is −spin * ke * i along each motor axis, canted, and propeller drag is kq ω_rel |ω_rel|. With yaw_motors_reversed off the mixer yaw column is RR −1, FR +1, RL +1, FL −1, and mixer.c negates the yaw PID sum. The glue feeds gyro yaw as +r. The comment on PLANT_SPIN carries the full sign chain, and flipping one link makes the loop run away.',
      'Integrated yaw, use_integrated_yaw, is a Betaflight mixer option treating yaw as an integral of motor difference rather than a direct torque demand. Live when compiled, off by default on this airframe\'s dumps unless a preset turns it on.',
    ],
    sim: [
      'yaw_motors_reversed is live, and the plant\'s spin table does not flip with it, so turning it on builds a yaw runaway. That is the firmware and the plant disagreeing about which way the propellers turn, which is what the field is for.',
    ],
    related: ['physics-cant', 'physics-fm', 'control-mixer', 'cli-yaw_motors_reversed'],
    source: 'src/native/plant.c PLANT_SPIN, src/native/bf/bf_glue.c',
  }),

  page({
    id: 'physics-damping',
    chapter: 'physics',
    title: 'Aerodynamic rate damping',
    kicker: 'The plant',
    lede: 'The air opposes rotation before the controller does. Model the aircraft without it and a D term stands in for physics.',
    figure: 'damping',
    air: [
      'Roll, and one side\'s propellers climb through the air while the other side\'s sink. Climbing propellers make less thrust and sinking ones make more, at least until the sinking pair reaches vortex ring state, and the difference is a torque opposing the roll. Yaw has its own version: body yaw adds to the relative speed of one spin pair and subtracts from the other.',
      'Pilots recognise the absence more readily than the presence. A quadcopter without aerodynamic damping overshoots at centre stick and gets yanked back by the controller, which racers call snap-back. Some of that is D gain doing its job. On a plant with no aerodynamic damping, most of it is the control loop substituting for a force that should have been in the physics.',
    ],
    lab: [
      'On roll and pitch, va includes p y − q x, so axial(mu) has a non-zero derivative with respect to body rate. The clamp at 1.35 in the old descent model zeroed that derivative, which is how the damping went missing. On yaw the mechanism is w_rel = spin ω + r, and the H-force adds a further small yaw damping through omega × r on the discs.',
    ],
    sim: [
      'If a tune calm on a real five inch oscillates here, look at damping and gyro noise before cutting P. If a tune calm here oscillates on a real five inch, look at the filters: this gyro is still cleaner than one bolted to a machine with a bent bell.',
    ],
    related: ['physics-advance', 'physics-vrs', 'physics-hforce', 'control-pid'],
    source: 'src/native/plant.c motor loop preamble',
  }),

  page({
    id: 'physics-gyroscopic',
    chapter: 'physics',
    title: 'Gyroscopic coupling',
    kicker: 'The plant',
    lede: 'Four spinning bells are four small gyroscopes. They are arranged to cancel, and the question is which manoeuvres break the cancellation.',
    figure: 'gyroscopic',
    air: [
      'A spinning wheel resists being tilted, and when tilted anyway it pushes back at right angles to the push. Force a gyroscope to pitch and it tugs on yaw. Four propellers turning in opposed directions cancel most of this, which is a quiet advantage of the quadcopter layout. They do not cancel all of it, particularly when the four rotor speeds are unequal, which is every roll the aircraft performs.',
    ],
    lab: [
      'Torque includes − omega × (I omega + h_prop), where h_prop is sum spin * j_rotor * ω along each motor axis. I is diagonal, so the body term is the ordinary Euler coupling with no products of inertia, and it never cancels: a rigid body spinning about one axis while rotated about another makes a moment about the third with no propellers involved. Opposed propellers keep net h_prop small in a hover and not small during a roll, when one diagonal pair is wound up and the other backed off.',
    ],
    sim: [
      'There is no precession slider. The effect falls out of the integration, and strengthening it would need heavier bells or a different spin map, which is an airframe change rather than a setting.',
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
      'The flight controller is bolted to a frame shaken by four propellers, none perfectly balanced. What the gyroscope reports is genuine rotation plus that shake, and the filter chain exists to stop the PID chasing the shake. A simulator with a clean gyro makes the whole chain decorative and D gain look free, so a tune developed there will oscillate on a real machine.',
      'Vibration here is added to the sensor reading, not to the aircraft. The rigid body stays rigid, and the only route by which vibration reaches the trajectory is the route it takes in life: the controller reacting to it.',
    ],
    lab: [
      'Two components, both in bf_glue.c. First, a once-per-revolution imbalance line at each rotor\'s true frequency, amplitude proportional to ω², four slightly different factors, roll as sine and pitch as cosine of a shared phase, yaw at 0.5 of the in-plane amplitude, a chosen coupling rather than a modal analysis. Second, a broadband hump from 80 to 350 Hz, built from the same one-pole pair as propwash. A 0.2 deg/s sensor noise floor sits under both.',
      'A 1 kHz gyro cannot represent anything above 500 Hz, and the propeller fundamental runs from about 130 Hz at idle to about 426 Hz at full throttle, under Nyquist. Blade passing, three times the fundamental on a triblade, is not modelled. Amplitudes are 1.5 deg/s for the hump and 0.8 for the line, set after a louder pair was judged too much on the sticks, with an RMS divisor of 0.340474 measured over eight million samples.',
      'The device path mimics a SITL build: float degrees per second, converted to int16 counts at 2000 deg/s full scale, then handed to Betaflight\'s gyro.c filter chain.',
    ],
    sim: [
      'This is what gyro_lpf and rpm_filter work against here. The dynamic notch still will not arm at 1 kHz, and the imbalance lines are there for the RPM filter and for any future argument about raising the loop rate. The yaw share of 0.5 is the one chosen number in this block, and the glue comment labels it.',
    ],
    related: ['control-filters', 'physics-wash', 'cli-rpm_filter_harmonics', 'cli-gyro_lpf1_static_hz'],
    source: 'src/native/bf/bf_glue.c GYRO VIBRATION',
  }),

  page({
    id: 'physics-radio',
    chapter: 'physics',
    title: 'The radio link',
    kicker: 'The plant',
    lede: 'No radio delivers an exact grid of packets. Feedforward and RC smoothing both measure that grid, which puts the link inside the control loop whether you think about it or not.',
    figure: 'radio',
    air: [
      'The sticks are not wired to the flight controller. A packet leaves the transmitter, spends a few milliseconds in the air and in the receiver, and occasionally does not arrive. ExpressLRS at 250 Hz is a common racing setup: about 4 ms of delay, a fraction of a millisecond of jitter, losses counted in parts per million.',
      'A perfect link, the default here, feels slightly too sharp, as though the aircraft were glued to your fingers. Switch on the ELRS preset to fly the radio you own. Leave the perfect link on when chasing a lap time or running the harness, so a record does not move because a simulated packet went missing.',
    ],
    lab: [
      'src/input/link.js, with presets for perfect at 250 Hz with no delay, jitter or loss, plus elrs500, elrs250, elrs150 and crossfire. Jitter is uniform within ±jitterMs, loss is in parts per million, both from a seeded xorshift32 under the same discipline as the wash noise. The WASM module never sees the generator, only timestamped samples, and a recording captures what was delivered.',
      'Feedforward is d(setpoint)/d(rc frame), so the denominator is the packet interval, and a jitter-free denominator is smoother than any hardware. RC smoothing compounds it by auto-tuning its cutoffs from the measured interval, so a perfect interval picks a filter no real link would be given.',
    ],
    sim: [
      'The link model lives outside the WASM module on purpose. Inside, the trace hash would depend on a link seed and every existing recording would break. The harness runs with the link off.',
    ],
    related: ['control-ff', 'cli-rc_smoothing', 'physics-timestep'],
    source: 'src/input/link.js',
  }),

  page({
    id: 'physics-ground',
    chapter: 'physics',
    title: 'Ground, collisions, no ground effect',
    kicker: 'The plant',
    lede: 'The integrator does not know that trees exist. It integrates a rigid body in free air, and something else decides the aircraft has hit one.',
    figure: 'collide',
    air: [
      'You can land. A gentle arrival onto grass or a deck is a landing: the aircraft settles, the integrator stops, and it can spool up again. A fast arrival, or one at a bad attitude, is a crash. Hitting a gate frame, a tree or a wall is a hit, and enough hits end the run.',
      'You cannot hover in ground effect. A real rotor gains thrust within about one radius of the ground, where its downwash has nowhere to go but sideways, so a hover at ankle height takes noticeably less throttle than one at head height. This plant does not model that, and the landing logic is not a stand-in for it.',
    ],
    lab: [
      'collide.js uses one primitive, the capsule. It sweeps a sphere, radius derived from the 220 mm diagonal plus the five inch propellers, against those capsules with a closed-form segment-to-segment distance and no allocation in the query, over a broadphase grid. The optional sim_deflect entry point writes a velocity change into the module without stepping frame time into the integrator.',
      'Ground contact in main.js is a swept test of the aircraft\'s lowest point against terrain height, judging landing or crash on speed and tilt. While landed, sim_step is not called. Takeoff resumes from the velocity recorded at the landing judgement, so it does not inherit a buried downward spike.',
    ],
    sim: [
      'STAGE1.md deferred ground effect and wind, and both are still deferred. Wind audio exists; wind force does not. A breeze here is a picture and a sound.',
    ],
    related: ['physics-airframe', 'physics-vrs', 'start-honesty'],
    source: 'src/game/collide.js, src/main.js ground contact, src/native/sim.c stand constraint',
  }),

  page({
    id: 'physics-missing',
    chapter: 'physics',
    title: 'What this plant does not do',
    kicker: 'The plant',
    lede: 'An absence cannot be reasoned about unless somebody names it. This is the list, so nobody has to infer it from silence.',
    figure: 'missing',
    air: [
      'No wind. No ground cushion. No blade element theory with azimuthal stations. No aeroelasticity. No motor inductance. No ESC current limit. No thermal model of windings, batteries or speed controllers. No flexible arms. No camera latency separate from the radio. No video compression. No Betaflight OSD in the goggles.',
      'Some may arrive if the project grows. A general purpose physics engine will not, because none of the available ones are built for a rotorcraft at this timestep. This page is the contract as of the code this wiki was written against.',
    ],
    lab: [
      'Also absent: reverse motor direction, meaning 3D flight; servos; GPS, magnetometer, barometer and accelerometer hardware, with ANGLE mode attitude coming from the plant quaternion instead; dual gyro; the dynamic notch at 1 kHz; blade passing harmonics; trailing vortex interaction beyond the vortex ring, wash and inflow asymmetry stack; and a ground effect inflow image system.',
      'Collision is not a contact Jacobian inside the plant. It is a query run by the shell. The plant can be held on a hinge for the launch stand inside sim.c, which is a kinematic constraint rather than an aerodynamic model.',
    ],
    sim: [
      'If you need a phenomenon for a paper, read the source rather than assuming a textbook rotor. The Glauert and momentum theory pieces are labelled. The feel constants, k_propwash, the gyro line and hump amplitudes and the cant table, are labelled as chosen. Keep the two categories apart.',
    ],
    related: ['physics-vrs', 'physics-wash', 'physics-motor', 'start-honesty'],
    source: 'STAGE1.md Not in Stage 1, plant.c ESC ceiling comment, catalog.js INERT_REASONS',
  }),

  page({
    id: 'physics-lens',
    chapter: 'physics',
    title: 'The camera',
    kicker: 'The plant',
    lede: 'The lens is not part of the flight model, and it still changes what you can fly, because a racer flies a picture rather than an aircraft.',
    figure: 'lens',
    air: [
      'Camera angle is the printed mount. Zero looks along the nose, 30 is a cruise, 45 to 55 is what racers use, because at speed the aircraft is pitched steeply forward and a steep camera is the one looking where it is going. The angle changes no force in the model. It changes where forward sits in the picture, and so the line you fly.',
      'Field of view is subtler, because the number printed on an FPV lens is not one this renderer can use. Those lenses are fisheyes, mapping angle to radius roughly linearly, while the renderer is rectilinear and maps by tangent. Type the printed 150 to 160 degrees into a rectilinear camera and the centre of the image shrinks until gates look like postage stamps. The default 85 degrees vertical instead matches centre magnification to a 155 degree fisheye, with a little extra width so the next gate is visible.',
    ],
    lab: [
      'The derivation is in src/render/lens.js. An equidistant fisheye is r = f θ, a rectilinear camera is r = f tan θ, so matching scale at the centre requires tan(v/2) = θ_V. A 155 degree diagonal on a 4:3 sensor has a vertical half angle of 46.5 degrees, 0.8116 rad, giving v of about 78 degrees. The default 85 degrees on 16:9 works out about 117 degrees wide. GATE_SCALE and WORLD_SCALE cannot fix apparent size, because a larger gate seen from proportionally further away is the same picture.',
      'Coordinate conversion in frame.js: x_three = −y_sim, y_three = z_sim, z_three = −x_sim. Get it wrong and every yaw sign downstream is wrong.',
    ],
    sim: [
      'Tilt and field of view belong to the settings menu. Betaflight\'s fpv_mix_degrees is applied but inert, because BOXFPVANGLEMIX is never raised and rc.c never mixes camera angle into roll and yaw. Here that compensation is yours to make.',
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
      'P answers the present. Rolling slower than you asked, P pushes the motors harder in proportion to the shortfall. Too little and the machine is lazy. Too much and it buzzes, because P amplifies whatever noise survived the filters along with the signal.',
      'I is memory. When an error persists, as when the nose wants to rise at speed or a motor sits crooked in its mount, I accumulates it and keeps pushing until it is gone. You meet it as trim you never have to hold. Its failure mode is winding up during a manoeuvre and releasing in a lurch, which is why I-term relax exists: without it the sustained error through a flip would fill the accumulator and empty it into the stop.',
      'D answers change. It opposes an error growing quickly, which is how overshoot dies and what makes a stop clean. It also hears every rattle in the frame, because differentiating a noisy signal amplifies the noise. Hence D\'s own filter, and hence D max, still stored under its old name d_min in 4.5, which runs a low D in the hover and a higher one when the stick is thrown.',
    ],
    lab: [
      'Error is setpoint minus gyro in degrees per second, after the gyro filter chain. P is Kp e. I integrates e under windup limits, relax and rotation options. D is Kd times a filtered derivative of gyro rather than of error, which is why a clean stick move makes no D spike. F is feedforward from the setpoint derivative rather than from error. TPA attenuates P and D, or D alone, as throttle rises, and anti-gravity boosts I, and optionally P, on fast throttle changes so a punch does not bow the aircraft.',
      'Gains are firmware units, not SI, and each axis carries its own. Yaw D is often low or zero on real five inches, because yaw measurement is noisier and yaw inertia higher. pidsum_limit clamps the total before the mixer, so one axis cannot eat the whole motor range.',
    ],
    sim: [
      'All of p_*, i_*, d_* and f_* are live. Changing one writes pidProfiles(0), and the next sim_init flies it. There is no JavaScript PID anywhere in this project. Blackbox here is a CSV the shell exports, not onboard flash.',
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
      'Maximum rate is how fast the aircraft rotates at full stick, in degrees per second. Centre sensitivity is how responsive the middle is, which is not the rate at half stick. Expo bends the middle down so small movements are gentle while the ends still reach the same maximum, which is how you aim through a gate and still flip quickly on the way out.',
      'The default here is Betaflight 4.5.1 ACTUAL rates: 670 deg/s at full stick, 70 deg/s per unit of stick at centre, no expo. ACTUAL is the curve whose two ends mean what they say, which makes it easiest to reason about. BETAFLIGHT, KISS, RACEFLIGHT and QUICK are all live and run Betaflight\'s own apply*Rates from fc/rc.c.',
    ],
    lab: [
      'From applyActualRates: centreSensitivity = rc_rate * 10, stickMovement = max(0, srate * 10 − centreSensitivity), angleRate = stick * centreSensitivity + stickMovement * expof, expof using a fifth power blend. At full stick expof is 1, so the rate is exactly srate * 10. rc_rate and srate are stored in tens of deg/s in a uint8.',
      'configs/rates.js is the only place the menu decides rates. Tune files carry no rate profile. The configurator rates page can still write a full profile, including per-axis values and the throttle limit SCALE.',
    ],
    sim: [
      'The configurator graph is src/fc/ratescurve.js, a display copy of those formulas, and the plant does not use it. Check 9 verifies full roll stick tracks the configured maximum within 3 percent. Check 12 verifies two dumps differing only in srate produce maximum rates in that ratio.',
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
      'One member per problem. The gyro low-pass smooths the sensor before anything else sees it. The D-term low-pass adds smoothing to the branch most sensitive to hash. Static notches cut a whistle at a fixed frequency, usually a frame resonance. The RPM filter cuts the whistle that moves with motor speed, using telemetry to find it. The dynamic notch hunts peaks in a live spectrogram, and at 1 kHz Betaflight refuses to run it.',
      'The types differ in how steeply they cut and so in what they cost. PT1 is a gentle single pole. PT2 and PT3 are steeper and later. A biquad can be a notch or a peak depending on configuration. Lower frequency means more smoothing, and on some static notch fields zero means off rather than a cutoff at zero.',
    ],
    lab: [
      'The gyro path is sensors/gyro.c, compiled. The RPM filter is flight/rpm_filter.c, fed by getMotorFrequencyHz. The dynamic notch is compiled and then declined by DYN_NOTCH_UPDATE_MIN_HZ. D-term filters live in pid_init.c and pid.c. yaw_lowpass_hz adds smoothing on yaw alone, because that axis is measured more noisily than the other two.',
      'The simplified filter sliders rewrite the underlying frequencies through simplified_tuning.c and are live. Turning simplified_gyro_filter off leaves whatever frequencies were typed.',
    ],
    sim: [
      'The injected imbalance lines are the signal the RPM filter was written for. Disable RPM filtering, cut gyro_lpf1 to zero and fly a punch, and D gets lively. That is the plant and the glue behaving correctly, not a fault in the tuning page.',
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
      'Feedforward watches how fast the stick is moving and starts the motors on the assumption you meant that rotation, rather than waiting to find the aircraft behind. Raise it and the machine leads the hand. Raise it too far and it overshoots at the start of every move, and a jittery radio makes that worse, because to a differentiator jitter looks exactly like a violently moving stick.',
      'The clauses around it exist for that reason. Averaging, smoothing, jitter attenuation and a maximum rate limit are all there because a raw derivative across a 250 Hz packet stream is spiky. A perfect link under-stresses every one of them, so tune feedforward on the ELRS 250 Hz preset if that is the radio you fly.',
    ],
    lab: [
      'f_roll, f_pitch and f_yaw are the gains. feedforward_averaging applies a 2, 3 or 4 point moving average to the derivative. feedforward_smooth_factor adds a low-pass. feedforward_jitter_factor attenuates small spikes. feedforward_boost emphasises the start of a move. feedforward_max_rate_limit stops feedforward asking for more than the rates curve allows. feedforward_transition blends it in as the stick leaves centre.',
      'All live, in compiled pid.c and rc.c.',
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
    lede: 'A quadcopter at hover and the same quadcopter at full throttle are, to the controller, two different aircraft. Three clauses cover the difference.',
    figure: 'tpa',
    air: [
      'Throttle PID attenuation is the first. Propellers bite harder at high rotor speed, so the same gain corrects harder at full throttle than in the hover, and gains that were right in the hover start to oscillate at the top of the stick. TPA turns P and D down above a breakpoint. tpa_low does the opposite at the bottom, where authority is scarce for the same reason in reverse.',
      'Anti-gravity is the second. Punch the throttle and the aircraft bows, taking a pitch or roll error while I is still too slow to catch it. Anti-gravity boosts I, and optionally P, during a fast throttle change so the bow does not happen. No gravity sensor is involved: it is a high-pass on the throttle signal.',
      'Airmode is the third, and its absence is the most dramatic. Chop the throttle without it and all four motors go to idle, leaving the mixer no room to speed one up and slow another down, so you have no control until throttle comes back. Airmode keeps that authority by letting the mixer work around idle, so a flip at zero throttle still has motors to fly with.',
    ],
    lab: [
      'TPA is in pid.c, modes PD or D. Anti-gravity is a feature flag plus a gain, a cutoff frequency and a P gain, with mixTable updating the throttle filter behind it. Airmode is a feature flag plus airmode_start_throttle_percent, and it needs the mixer to apply PID at minimum throttle, which is pid_at_min_throttle.',
      'AIRMODE and ANTI_GRAVITY are live CLI feature lines, not value table entries.',
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
    lede: 'The mixer turns three rotation demands and a throttle into four numbers. It is also where the aircraft runs out of room.',
    figure: 'mixer',
    air: [
      'Mixer type LEGACY is the classic sum: throttle plus the roll, pitch and yaw columns, once per motor. LINEAR and DYNAMIC change how throttle and PID share the range when a corner is asked for more than 100 percent, which decides whether a demand is honoured or clipped. EZLANDING is a landing aid, not a racing default.',
      'DShot idle sets a floor a few percent above stopped, so the bells never stall while airmode works. Too low and yaw disappears at the bottom of the stick, because the motors that need to slow have nowhere to go. Too high and the aircraft will not descend. Dynamic idle watches rotor speed and raises the floor when a motor would droop, which on a real aircraft prevents an ESC desync. This plant cannot desync in that sense, and the loop still runs, because the plant feeds real rotor frequencies back.',
      'Launch control holds attitude at idle until throttle passes a trigger, which is how a racer leaves a start gate without drifting off the pad. The L key does it here.',
    ],
    lab: [
      'mixTable in mixer.c is compiled. dshot_idle_value is the digital idle offset. The dyn_idle_* fields write the PID profile and mixer_init, with getMotorFrequencyHz standing in for telemetry. The launch control state machine is in bf_glue.c, because fc/core.c is not compiled, while the PID profile fields it reads are real.',
      'yaw_motors_reversed flips the sign of the mixer yaw column. The crashflip_* fields store, and isFlipOverAfterCrashActive is stubbed false.',
    ],
    sim: [
      'motor_output_limit is live and caps motor range as a percentage. It is a relative of throttle_limit that lives in the PID profile rather than the rate profile, and it clips PID output as well as the throttle stick. Use one deliberately rather than both by accident.',
    ],
    related: ['physics-yaw', 'cli-dshot_idle_value', 'cli-mixer_type', 'cli-dyn_idle_min_rpm'],
    source: 'flight/mixer.c, bf_glue.c launch control, bf_settings.c',
  }),

  page({
    id: 'control-simplified',
    chapter: 'control',
    title: 'Simplified sliders',
    kicker: 'The controller',
    lede: 'The sliders are not a second tuning model in front of the real one. They are Betaflight\'s own code, writing the real gains.',
    figure: 'simplified',
    air: [
      'Master, P, I, D, D Max, feedforward and pitch relative to roll: these let a pilot move a tune as a shape rather than twelve separate numbers, and the firmware computes p_roll and its relatives from the slider positions. The catch is order of operations. Type gains, then apply a slider, and the slider wins. A dump ending with a simplified tuning apply line overwrites whatever was typed above it.',
      'The filter sliders do the same to the gyro and D-term frequencies. Turn the simplified filter switch off if typed frequencies should stay put.',
    ],
    lab: [
      'simplified_pids_mode is OFF, RP or RPY, and applySimplifiedTuning is compiled. The Karate-style presets in configs/ depend on this path; without it they load as comments and the aircraft flies on defaults.',
    ],
    sim: [
      'Live. If a preset feels like defaults, the apply line was swallowed. That was a real bug once, and it is why bf_settings.c is a table rather than a chain of string comparisons that returned OK on an unknown key.',
    ],
    related: ['control-pid', 'cli-simplified_master_multiplier', 'start-compiled'],
    source: 'config/simplified_tuning.c, configs/, bf_settings.c history comment',
  }),

  page({
    id: 'control-angle',
    chapter: 'control',
    title: 'Angle mode and self-levelling',
    kicker: 'The controller',
    lede: 'In acro the stick is a rate. In angle the stick is a tilt. That difference is the whole distance between a first hover and a race lap.',
    figure: 'angle',
    air: [
      'In angle mode, pushing pitch asks for a nose-up attitude rather than a flip, and releasing brings the aircraft back to level on its own. It is how most people survive a first hover, and it teaches habits a racer has to unlearn, because a racing quad spends much of a lap at attitudes angle mode would refuse to hold. Horizon mode, which blends the two, is stored here but never raised.',
      'Launch control and angle mode can coexist on a start line, which makes the first seconds of a session forgiving. Race laps are flown in acro.',
    ],
    lab: [
      'sim_set_angle_mode raises ANGLE_MODE, and pidLevel reads angle_p_gain, angle_feedforward, angle_limit, angle_earth_ref and angle_feedforward_smoothing_ms, taking attitude from the plant quaternion through the IMU stub. The horizon_* fields are applied but inert, because HORIZON_MODE is never raised.',
      'level_race_mode is live firmware that changes how angle mode uses yaw. The keyboard path forces angle mode regardless of the settings whenever the keyboard is the stick source.',
    ],
    sim: [
      'The settings flight mode control and the configurator Modes tab are the same bit. No AUX channel, ARM always on, and no way to disarm accidentally in flight.',
    ],
    related: ['cli-angle_p_gain', 'cli-horizon_level_strength', 'start-nowings'],
    source: 'bf_glue.c ANGLE_MODE, catalog.js horizon APPLIED_INERT',
  }),
];

export const ARTICLE_BY_ID = new Map(ARTICLES.map((a) => [a.id, a]));

export function articlesIn(chapter) {
  return ARTICLES.filter((a) => a.chapter === chapter);
}
