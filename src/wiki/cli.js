/*
 * cli.js: one wiki page per Betaflight 4.5.1 catalog field.
 *
 * LIVE, GATED and APPLIED_INERT keys have authored copy in this file.
 * INERT and ABSENT keys use a family template plus the catalog reason, so
 * a VTX channel is not described as if it were a PID, and a grey key never
 * claims to fly.
 *
 * Voice: the same Year 10 textbook voice as the articles (docs/wiki-voice.md),
 * kept short, because these pages are looked up rather than read through.
 * Every string is a complete sentence in plain English with no analogies.
 * A page shows air, lab and sim as What it does, How it works and In this
 * simulator. What follows depends on the setting, and finishPage holds the
 * rule. A number that works here adds If you raise it (upAir, upLab) and If
 * you lower it (downAir, downLab): what the pilot notices first, then why.
 * A choice from a list that works here adds The choices (choices), a
 * sentence for each option. A setting that has no effect here adds
 * neither, because moving it changes nothing and saying so twice more is
 * padding. scripts/wiki-lint.js holds all three to it.
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

import {
  FEATURES,
  FIELDS,
  STATUS,
  TABS,
  fieldBounds,
  lookupValues,
} from '../fc/catalog.js?v=20260927w';

/*
 * The words a reader sees for each catalog status. The codes stay the
 * catalog's; these are what the chips, the filters and the page lines say.
 */
export const STATUS_LABEL = {
  LIVE: 'Works here',
  GATED: 'Off at 1 kHz',
  APPLIED_INERT: 'Stored, not used',
  INERT: 'Not simulated',
  ABSENT: 'Configurator only',
};

function copy({
  title, air, lab, sim, upAir, upLab, downAir, downLab, choices, related, figure,
}) {
  return {
    title,
    air,
    lab,
    sim,
    upAir,
    upLab,
    downAir,
    downLab,
    choices: choices || null,
    related: related || [],
    figure: figure || null,
  };
}

/*
 * The per-axis words the PID templates need. `lasting` is an example of a
 * steady disturbance on that axis that the I term corrects, and `pNote` and
 * `iNote` are sentences that are true of one axis only, so a roll page does
 * not carry a remark about yaw.
 */
function axisNoun(axis) {
  if (axis === 'roll') {
    return {
      axis, Axis: 'Roll', motion: 'rolling', stick: 'the right stick to the left and right', mixer: 'the left and right pairs of motors',
      lasting: 'a motor mounted at a slight angle',
      pNote: '',
      iNote: '',
    };
  }
  if (axis === 'pitch') {
    return {
      axis, Axis: 'Pitch', motion: 'pitching', stick: 'the right stick forward and back', mixer: 'the front and rear pairs of motors',
      lasting: 'the nose rising at high speed',
      pNote: '',
      iNote: ' On pitch, the propellers sit 20 mm above the centre of gravity, so rotor drag keeps trying to raise the nose at speed. With too little I, fast flight needs a constant push on the stick.',
    };
  }
  return {
    axis, Axis: 'Yaw', motion: 'yawing', stick: 'the left stick to the left and right', mixer: 'the clockwise and anticlockwise pairs of motors',
    lasting: 'the small yaw drift that the motor cant causes in a hover',
    pNote: ' On yaw, raising P is often a better choice than raising D, because the yaw D signal is noisy.',
    iNote: '',
  };
}

const AUTHORED = {};

function put(key, spec) {
  AUTHORED[key] = spec;
}

for (const axis of ['roll', 'pitch', 'yaw']) {
  const a = axisNoun(axis);
  put(`p_${axis}`, copy({
    title: `P ${a.axis}`,
    figure: 'pid',
    related: ['control-pid', `cli-i_${axis}`, `cli-d_${axis}`, `cli-f_${axis}`],
    air: `P ${a.axis} is the proportional gain for the ${a.axis} axis. When the quad is ${a.motion} faster or slower than you asked, P changes the power to ${a.mixer} in proportion to the difference.`,
    lab: `Betaflight's PID code calculates the ${a.axis} P term as the P gain multiplied by the error: the target ${a.axis} rate minus the filtered gyro rate. The gain is in Betaflight's own units, not SI units. P has no memory of earlier errors, so a disturbance that lasts, such as ${a.lasting}, is corrected by the I term.`,
    sim: `Works here. It sets the ${a.axis} P gain in Betaflight's PID profile. The physics model never reads it: it only receives the motor power levels that come out of the mixer.`,
    upAir: `${a.Axis} follows ${a.stick} more tightly. Past a certain point the axis oscillates, a fast wobble that is worst at high throttle.`,
    upLab: `A higher P corrects errors faster and shortens the delay between the stick and the quad. It also magnifies any vibration that gets past the gyro filters, and the quad settles less smoothly after each movement, so D has to do more work to stop overshoot.${a.pNote}`,
    downAir: `${a.Axis} feels soft and late. You wait for the quad to respond, then move the stick too far.`,
    downLab: 'A lower P takes longer to correct a rate error, and the I term builds up more in the meantime. Feedforward can hide a low P during stick movements, but the quad still recovers more slowly from a disturbance.',
  }));
  put(`i_${axis}`, copy({
    title: `I ${a.axis}`,
    figure: 'pid',
    related: ['control-pid', `cli-p_${axis}`, 'cli-iterm_relax', 'cli-anti_gravity_gain'],
    air: `I ${a.axis} is the integral gain for the ${a.axis} axis. The I term adds up the error over time, so when a small error lasts, such as ${a.lasting}, the I term keeps growing until the error is gone. You notice it as a correction you never have to hold on the stick.`,
    lab: `The I term is the I gain multiplied by a running total of the error. The settings iterm_limit, iterm_windup, iterm_relax and iterm_rotation all work here, and they can stop the total growing or move it between axes. Anti-gravity raises I when the throttle changes quickly, so that a sudden climb does not tip the quad.`,
    sim: `Works here. It sets the ${a.axis} I gain in Betaflight's PID profile. The motor cant table gives a small yaw drift in a hover, and I corrects it, as it would on a real quad.`,
    upAir: `${a.Axis} holds its line better and resists drift you would otherwise correct with the stick. Too much I can make the quad wobble slowly, or bounce back at the end of a flip if I-term relax is off.`,
    upLab: 'A higher I removes a steady error faster. An I term that grew large during a movement keeps pushing after the movement ends, which is why I-term relax, iterm_windup and iterm_limit exist.',
    downAir: `You have to hold a little ${a.axis} correction on the stick all the time. Fast movements may still look fine, because P and feedforward handle those.`,
    downLab: `A lower I leaves a small error that never goes away.${a.iNote}`,
  }));
  put(`d_${axis}`, copy({
    title: `D ${a.axis}`,
    figure: 'pid',
    related: ['control-pid', 'control-filters', `cli-d_min_${axis === 'yaw' ? 'yaw' : axis}`, 'cli-dterm_lpf1_static_hz'],
    air: `D ${a.axis} is the derivative gain for the ${a.axis} axis. D acts against fast changes in the rotation rate, which stops the quad rotating past the point where you stopped the stick. It also reacts to every vibration in the gyro signal, which is why D has its own filter, and why a simulator with a clean gyro makes a high D look harmless.`,
    lab: 'The D term is the D gain multiplied by the filtered rate of change of the gyro reading, not of the error, so a smooth stick movement does not produce a D response by itself. This value is the most D the axis gets: with a lower d_min set, Betaflight holds D down at d_min in calm flight and raises it towards this value when the gyro shows a fast change, such as propwash or the end of a flip, or when the stick moves quickly. TPA can also reduce D at high throttle. Betaflight\'s default yaw D is 0.',
    sim: 'Works here. The gyro vibration added in bf_glue.c means a high D is not free in this simulator. If you raise D and hear a buzz when you add throttle quickly, keep the filters, or you will export a tune that works only here.',
    upAir: `The quad stops ${a.motion} more cleanly. Too much D gives a grinding buzz that you can hear from the motors and see in the picture.`,
    upLab: 'More D adds damping to the rate control, and it also magnifies high frequency noise, which reaches the motors as heat and a grinding sound. With too much D and too little filtering the axis can oscillate.',
    downAir: `${a.Axis} goes past the point where you stop and bounces back. You feel snap-back when you centre the stick.`,
    downLab: 'A lower D gives less damping. The physics model still has aerodynamic rate damping, so too little D does less harm here than it would in a model without it, but the stop is still worse.',
  }));
  put(`f_${axis}`, copy({
    title: `Feedforward ${a.axis}`,
    related: ['control-ff', 'physics-radio', `cli-p_${axis}`, 'cli-feedforward_smooth_factor'],
    air: `Feedforward on ${a.axis} starts the motors as soon as you move ${a.stick}, before the gyro has measured any error. It makes the quad feel closely connected to the stick. It is also the first thing uneven radio timing makes rough.`,
    lab: 'F is a gain on the rate of change of the setpoint, after averaging, smoothing, jitter reduction, boost and the maximum rate limit. It does not use the error. A perfect 250 Hz radio link makes this rate of change smoother than ExpressLRS does.',
    sim: 'Works here. It sets the F gain in Betaflight\'s PID profile. If you fly ExpressLRS, tune F on the ELRS 250 Hz radio link preset, or the settings you export will be too twitchy.',
    upAir: `${a.Axis} responds ahead of the error. Too much makes the quad overshoot, especially at the start of a movement.`,
    upLab: 'A higher F leaves less of the stick tracking to P and can hide a low P on a graph. It does not help the quad recover from a disturbance, and radio jitter becomes motor activity.',
    downAir: 'You wait a moment after moving the stick before the quad responds.',
    downLab: 'The delay in following the stick is left to P and to the motors\' own delay. Many pilots fly like this.',
  }));
}

put('d_min_roll', copy({
  title: 'D min roll',
  related: ['control-pid', 'cli-d_roll', 'cli-d_max_gain'],
  air: 'The lower D value for roll. Betaflight uses it in calm flight and raises D towards d_roll when the gyro shows a fast change, such as propwash or the end of a flip, or when the stick moves quickly. The motors stay quieter in a cruise and still get full damping when they need it.',
  lab: 'This is d_min_roll in the PID profile, and Betaflight 4.5 calls the feature D_min. It works on an axis only when d_min is above 0 and below that axis\'s D. The two settings that control the rise are named d_max_gain and d_max_advance in this version, although they belong to the same feature.',
  sim: 'Works here. The gyro vibration and propwash in the physics model are what the rise responds to.',
  upAir: 'D in calm flight moves closer to d_roll, so the motors are busier, and there is less difference between calm flight and a hard stop.',
  upLab: 'A higher d_min raises the bottom of the D range. At d_roll or above, the feature is off for this axis and D stays at d_roll.',
  downAir: 'D is lower in calm flight, which is quieter. A fast change still raises D towards d_roll.',
  downLab: 'At 0 the feature is off for this axis, and D stays at d_roll all the time.',
}));
put('d_min_pitch', copy({
  title: 'D min pitch',
  related: ['control-pid', 'cli-d_pitch', 'cli-d_max_gain'],
  air: 'The lower D value for pitch, used in the same way as d_min_roll. Betaflight\'s defaults give pitch a little more D than roll, because a quad is harder to rotate about its pitch axis: its moment of inertia about pitch is larger.',
  lab: 'This is d_min_pitch in the PID profile. The rise towards d_pitch works as it does on roll. Pitch also carries the nose-up turning effect of rotor drag at speed, which the I term corrects.',
  sim: 'Works here.',
  upAir: 'D on pitch in calm flight moves closer to d_pitch, so the motors are busier.',
  upLab: 'A higher d_min raises the bottom of the D range. At d_pitch or above, the feature is off for this axis.',
  downAir: 'Pitch D is lower in calm flight. A fast change, such as the end of a flip, still raises it towards d_pitch.',
  downLab: 'At 0 the feature is off for this axis, and D stays at d_pitch all the time.',
}));
put('d_min_yaw', copy({
  title: 'D min yaw',
  related: ['control-pid', 'cli-d_yaw', 'physics-yaw'],
  air: 'The lower D value for yaw. Betaflight\'s default yaw D is 0, and while d_yaw is 0 this setting has no effect.',
  lab: 'This is d_min_yaw in the PID profile. D_min works on an axis only when d_min is above 0 and below that axis\'s D, so with yaw D at 0 there is nothing to lower.',
  sim: 'Works here. The drag torque of the propellers already slows yaw rotation in the physics model.',
  upAir: 'If d_yaw is above 0, yaw D in calm flight moves closer to it.',
  upLab: 'A higher d_min raises the bottom of the yaw D range. At d_yaw or above, the feature is off for yaw.',
  downAir: 'If d_yaw is above 0, yaw D is lower in calm flight.',
  downLab: 'At 0 the feature is off for yaw, and yaw D stays at d_yaw.',
}));
put('d_max_gain', copy({
  title: 'D max gain',
  related: ['cli-d_min_roll', 'control-pid'],
  air: 'How strongly a fast change raises D from d_min towards the full D value.',
  lab: 'In Betaflight 4.5 this is d_max_gain, stored as d_min_gain in the PID profile. pid.c smooths the rate of change of the gyro reading and multiplies its size by this gain, so a quick change in rotation, such as propwash or the end of a flip, raises D. The same gain, scaled by d_max_advance, sets the rise from fast stick movement. Whichever is larger is used.',
  sim: 'Works here. It has an effect only on an axis whose d_min is above 0 and below its D.',
  upAir: 'D rises further for the same disturbance, so the quad reaches full damping in smaller bumps too.',
  upLab: 'A higher gain turns the same rate of change into a larger rise. With a high enough gain D sits near its full value for most of a flight.',
  downAir: 'D stays closer to d_min unless the change is large.',
  downLab: 'At 0 nothing raises D, and it stays at d_min.',
}));
put('d_max_advance', copy({
  title: 'D max advance',
  related: ['cli-d_max_gain', 'control-pid'],
  air: 'How much a fast stick movement raises D, on top of the rise that fast changes in the gyro reading cause. It lets D rise at the start of a move, before the gyro has seen it.',
  lab: 'In Betaflight 4.5 this is d_max_advance, stored as d_min_advance. pid.c multiplies the rate of change of the setpoint by d_max_gain and by this value, compares the result with the rise from the gyro, and uses the larger.',
  sim: 'Works here.',
  upAir: 'D rises earlier in a stick movement, which can feel as if the start of a flick is damped.',
  upLab: 'A higher value gives the stick\'s rate of change more weight. It acts at the start of a movement, as feedforward does.',
  downAir: 'D rises only when the gyro sees a fast change.',
  downLab: 'At 0 the stick movement plays no part, and only the gyro raises D.',
}));

/*
 * The low-pass filters have three kinds of page: the filter's type, which is
 * a choice from a list; its static cutoff; and the two ends of the dynamic
 * cutoff, which moves with the throttle. They were one template, so a page
 * for a filter TYPE told the reader what raising it would do. The gyro
 * filters act on the gyro signal that every term reads; the D term filters
 * act on the D term alone.
 */
function lpfWhere(key) {
  return key.startsWith('gyro_')
    ? { what: 'the gyro signal', who: 'P, I, D and everything else that reads the gyro see the result', file: 'gyro_init.c and gyro.c' }
    : { what: 'the D term', who: 'only D sees the result, so P and I get no extra delay from it', file: 'pid_init.c and pid.c' };
}

function lpfTypePut(key, title, n, related) {
  const w = lpfWhere(key);
  put(key, copy({
    title,
    figure: 'filters',
    related,
    air: `Chooses the kind of filter used for low-pass filter ${n} on ${w.what}. A low-pass filter lets slow changes through and removes fast ones. The kinds differ in how sharply they cut above the cutoff frequency and how much delay they add below it.`,
    lab: 'The kinds come from Betaflight\'s filter.c. PT1 is a first-order filter. PT2 and PT3 are two and three first-order stages in a row, each set a little higher so that the whole filter still cuts at the frequency you choose. BIQUAD is a second-order filter with a sharper bend at the cutoff. The cutoff frequency is a separate setting.',
    sim: `Works here, in Betaflight's compiled ${w.file}.`,
    choices: [
      'PT1: the gentlest cut, and the least delay for its cutoff.',
      'BIQUAD: a second-order filter, like PT2 but with a sharper bend at the cutoff.',
      'PT2: two first-order stages. It removes more above the cutoff than PT1, and adds more delay.',
      'PT3: three first-order stages. It removes more again, and adds more delay again.',
    ],
  }));
}

function lpfHzPut(key, title, n, related) {
  const w = lpfWhere(key);
  put(key, copy({
    title,
    figure: 'filters',
    related,
    air: `The cutoff frequency, in hertz, of low-pass filter ${n} on ${w.what}. A low-pass filter lets changes slower than its cutoff through and removes faster ones, and ${w.who}. ${n === 1 ? '0 turns the filter off, as long as its dynamic minimum is 0 too.' : '0 turns the filter off.'}`,
    lab: `${n === 1 ? 'When the dynamic minimum is above 0, Betaflight uses the dynamic cutoff, which moves with the throttle, and ignores this value.' : 'Filter 2 has no dynamic version, so this is its cutoff whenever it is above 0.'} A real flight controller reads its gyro thousands of times a second. This simulator reads it 1,000 times a second, so nothing above 500 Hz reaches the filter here.`,
    sim: `Works here, in Betaflight's compiled ${w.file}. The vibration it removes is added to the simulated gyro reading, not to the quad's motion.`,
    upAir: 'Less smoothing and less delay. The quad feels more directly connected to the sticks, and more noise gets through to the motors.',
    upLab: 'A higher cutoff lets faster changes through. Judge it in a full throttle climb, where the vibration is strongest, not in a hover.',
    downAir: 'More smoothing and more delay. The quad feels softer, and too low a cutoff makes it slow to respond to everything.',
    downLab: 'A lower cutoff removes more noise and adds delay to the loop, and delay in a feedback loop brings it closer to oscillating.',
  }));
}

function lpfDynPut(key, title, end, related) {
  const w = lpfWhere(key);
  put(key, copy({
    title,
    figure: 'filters',
    related,
    air: `The cutoff frequency, in hertz, of low-pass filter 1 on ${w.what} at ${end === 'min' ? 'zero throttle' : 'full throttle'}. The dynamic cutoff moves from the minimum to the maximum as the throttle rises, because the vibration a quad makes rises in frequency with motor speed.`,
    lab: `${end === 'min' ? 'A minimum above 0 switches the dynamic cutoff on, and the static cutoff is then ignored. 0 switches it off.' : 'It is used only while the dynamic minimum is above 0.'} The dynamic expo setting shapes the curve between the two ends.`,
    sim: `Works here, in Betaflight's compiled ${w.file}.`,
    upAir: `Less smoothing and less delay ${end === 'min' ? 'at low throttle' : 'at high throttle'}, and more noise let through there.`,
    upLab: `A higher ${end === 'min' ? 'minimum' : 'maximum'} lets faster changes through at that end of the throttle.`,
    downAir: `More smoothing and more delay ${end === 'min' ? 'at low throttle' : 'at high throttle'}.`,
    downLab: end === 'min' ? 'At 0 the dynamic cutoff is off, and the static cutoff applies instead.' : 'Keep the maximum above the minimum. On a real flight controller Betaflight\'s configuration check turns the dynamic cutoff off when it is not, and that check is not compiled here.',
  }));
}

lpfTypePut('gyro_lpf1_type', 'Gyro low-pass 1 type', 1, ['control-filters', 'cli-gyro_lpf1_static_hz']);
lpfHzPut('gyro_lpf1_static_hz', 'Gyro low-pass 1 (Hz)', 1, ['control-filters', 'physics-gyro']);
lpfTypePut('gyro_lpf2_type', 'Gyro low-pass 2 type', 2, ['control-filters', 'cli-gyro_lpf2_static_hz']);
lpfHzPut('gyro_lpf2_static_hz', 'Gyro low-pass 2 (Hz)', 2, ['control-filters']);
lpfDynPut('gyro_lpf1_dyn_min_hz', 'Gyro low-pass 1, dynamic minimum (Hz)', 'min', ['cli-gyro_lpf1_dyn_max_hz', 'cli-gyro_lpf1_static_hz']);
lpfDynPut('gyro_lpf1_dyn_max_hz', 'Gyro low-pass 1, dynamic maximum (Hz)', 'max', ['cli-gyro_lpf1_dyn_min_hz']);
put('gyro_lpf1_dyn_expo', copy({
  title: 'Gyro low-pass 1, dynamic expo',
  related: ['cli-gyro_lpf1_dyn_min_hz', 'control-filters'],
  air: 'Sets how the dynamic gyro filter moves between its minimum and maximum cutoff. A higher expo keeps the cutoff near the quieter, lower end for longer.',
  lab: 'This is gyro_lpf1_dyn_expo, from 0 to 10. The dynamic low-pass filter is compiled. Expo shapes the curve between the two cutoffs; it is not a second filter.',
  sim: 'Works here.',
  upAir: 'The gyro stays more heavily filtered as you add throttle.',
  upLab: 'More weight on the minimum cutoff.',
  downAir: 'The filter opens up towards the maximum cutoff sooner.',
  downLab: 'At 0 the cutoff moves in a straight line between the two values.',
}));
put('gyro_notch1_hz', copy({
  title: 'Gyro notch 1 (Hz)',
  related: ['control-filters', 'cli-gyro_notch1_cutoff'],
  air: 'The centre frequency of a static notch filter on the gyro. A notch filter removes a narrow band of frequencies and leaves the rest. A static notch suits a vibration that stays at one frequency whatever the motors do, such as a resonance of the frame. 0 turns it off.',
  lab: 'This is gyro_notch1_hz, stored as gyro_soft_notch_hz_1. Its width is set by gyro_notch1_cutoff, which must be below this frequency. Vibration that moves with motor speed belongs to the RPM filter.',
  sim: 'Works here. The imbalance lines added to the simulated gyro move with motor speed, so a static notch can only catch one of them at one throttle.',
  upAir: 'The notch moves to a higher frequency.',
  upLab: 'If the notch misses the peak it was meant for, it adds delay and removes nothing useful.',
  downAir: 'The notch moves to a lower frequency. 0 turns it off.',
  downLab: 'A notch at a low frequency adds delay where the controller is working. Do not leave one from an experiment.',
}));
put('gyro_notch1_cutoff', copy({
  title: 'Gyro notch 1 cutoff',
  related: ['cli-gyro_notch1_hz'],
  air: 'Sets the width of gyro notch 1. It is the frequency below the centre where the notch begins. The closer it is to the centre, the narrower the notch.',
  lab: 'This is gyro_soft_notch_cutoff_1. Betaflight works out the notch\'s Q, its sharpness, from the centre frequency and this cutoff, and the notch is a biquad filter from filter.c. The cutoff must be below the centre frequency. On a real flight controller Betaflight\'s configuration check turns the notch off when it is not; that check is in config/config.c, which is not compiled here, so nothing does it for you.',
  sim: 'Works here.',
  upAir: 'The cutoff moves towards the centre, so the notch gets narrower.',
  upLab: 'A higher cutoff gives a higher Q. It must stay below the centre frequency.',
  downAir: 'The cutoff moves away from the centre, so the notch gets wider and removes more of the signal around it.',
  downLab: 'A lower cutoff gives a lower Q, a wider notch and more delay below it.',
}));
put('gyro_notch2_hz', copy({
  title: 'Gyro notch 2 (Hz)',
  related: ['cli-gyro_notch1_hz', 'cli-gyro_notch2_cutoff'],
  air: 'A second static notch filter on the gyro, for a second fixed peak. It works like notch 1. 0 turns it off.',
  lab: 'This is gyro_notch2_hz, stored as gyro_soft_notch_hz_2, with its width set by gyro_notch2_cutoff.',
  sim: 'Works here.',
  upAir: 'The second notch moves to a higher frequency.',
  upLab: 'Each static notch adds its own delay. For vibration that moves with motor speed, the RPM filter is the tool.',
  downAir: 'The notch moves to a lower frequency. 0 turns it off.',
  downLab: 'A notch at a low frequency adds delay where the controller is working.',
}));
put('gyro_notch2_cutoff', copy({
  title: 'Gyro notch 2 cutoff',
  related: ['cli-gyro_notch2_hz'],
  air: 'Sets the width of gyro notch 2, in the same way as gyro_notch1_cutoff: the closer it is to the centre, the narrower the notch.',
  lab: 'This is gyro_soft_notch_cutoff_2. It must be below gyro_notch2_hz. On a real flight controller Betaflight\'s configuration check turns the notch off when it is not, and that check is not compiled here.',
  sim: 'Works here.',
  upAir: 'The cutoff moves towards the centre, so the notch gets narrower.',
  upLab: 'A higher cutoff gives a higher Q. It must stay below the centre frequency.',
  downAir: 'The notch gets wider and removes more of the signal around its centre.',
  downLab: 'A lower cutoff gives a lower Q and more delay below the notch.',
}));

lpfTypePut('dterm_lpf1_type', 'D term low-pass 1 type', 1, ['control-filters', 'cli-d_roll']);
lpfHzPut('dterm_lpf1_static_hz', 'D term low-pass 1 (Hz)', 1, ['control-filters']);
lpfTypePut('dterm_lpf2_type', 'D term low-pass 2 type', 2, ['control-filters']);
lpfHzPut('dterm_lpf2_static_hz', 'D term low-pass 2 (Hz)', 2, ['control-filters']);
lpfDynPut('dterm_lpf1_dyn_min_hz', 'D term low-pass 1, dynamic minimum (Hz)', 'min', ['cli-dterm_lpf1_dyn_max_hz', 'cli-dterm_lpf1_static_hz']);
lpfDynPut('dterm_lpf1_dyn_max_hz', 'D term low-pass 1, dynamic maximum (Hz)', 'max', ['cli-dterm_lpf1_dyn_min_hz']);
put('dterm_lpf1_dyn_expo', copy({
  title: 'D term low-pass 1, dynamic expo',
  related: ['cli-dterm_lpf1_dyn_min_hz'],
  air: 'Sets how the dynamic D term filter moves between its minimum and maximum cutoff, in the same way as the gyro version.',
  lab: 'This is dterm_lpf1_dyn_expo.',
  sim: 'Works here.',
  upAir: 'The D term stays more heavily filtered for longer as you add throttle.',
  upLab: 'More weight on the minimum cutoff.',
  downAir: 'The filter opens up sooner.',
  downLab: 'At 0 the cutoff moves in a straight line between the two values.',
}));
put('dterm_notch_hz', copy({
  title: 'D term notch (Hz)',
  related: ['cli-dterm_notch_cutoff', 'control-filters'],
  air: 'The centre frequency of a static notch filter on the D term only, for a fixed vibration that affects D without adding delay to P. 0 turns it off.',
  lab: 'This is dterm_notch_hz in the PID profile, set up in pid_init.c. Its width is set by dterm_notch_cutoff.',
  sim: 'Works here.',
  upAir: 'The D notch moves to a higher frequency.',
  upLab: 'The D term turns high frequency noise into motor heat. A notch on a real peak can let D be raised; one that misses only adds delay to D.',
  downAir: 'The notch moves to a lower frequency. 0 turns it off.',
  downLab: 'A notch at a low frequency delays the D term where it is doing its job.',
}));
put('dterm_notch_cutoff', copy({
  title: 'D term notch cutoff',
  related: ['cli-dterm_notch_hz'],
  air: 'Sets the width of the D term notch: the closer it is to dterm_notch_hz, the narrower the notch.',
  lab: 'This is dterm_notch_cutoff. It must be below dterm_notch_hz. On a real flight controller Betaflight\'s configuration check turns the notch off when it is not, and that check is not compiled here.',
  sim: 'Works here.',
  upAir: 'The cutoff moves towards the centre, so the notch gets narrower.',
  upLab: 'A higher cutoff gives a higher Q.',
  downAir: 'The notch gets wider and removes more of the D term around its centre.',
  downLab: 'A lower cutoff gives a lower Q and more delay on D.',
}));
put('yaw_lowpass_hz', copy({
  title: 'Yaw low-pass (Hz)',
  related: ['control-filters', 'cli-p_yaw', 'physics-gyro'],
  air: 'A low-pass filter on the yaw P term only. It smooths what P sends to the motors on yaw without adding delay to roll and pitch. 0 turns it off.',
  lab: 'This is yaw_lowpass_hz, a first-order filter in pid.c applied to the yaw P term. It works in addition to the gyro filters, which act on every axis.',
  sim: 'Works here. The yaw part of the simulated gyro vibration is half the size of the roll and pitch part, a chosen value.',
  upAir: 'Less smoothing on yaw P, and yaw follows the stick a little more directly.',
  upLab: 'A higher cutoff gives less delay on the yaw P term.',
  downAir: 'Yaw feels calmer and later.',
  downLab: 'More delay on the yaw P term. Too low, and yaw P starts to feel disconnected from the stick.',
}));

const RPM = (key, title, air, lab, upA, upL, downA, downL) => {
  put(key, copy({
    title,
    figure: 'filters',
    related: ['control-filters', 'physics-gyro', 'cli-rpm_filter_q'],
    air,
    lab,
    sim: 'Works here, and compiled. getMotorFrequencyHz gives Betaflight each motor\'s speed with a delay like real motor telemetry, and the filter can remove multiples of the once-per-revolution imbalance lines. Blade passing is not modelled, so the third harmonic aims at a line that is not there.',
    upAir: upA,
    upLab: upL,
    downAir: downA,
    downLab: downL,
  }));
};
RPM(
  'rpm_filter_harmonics',
  'RPM filter harmonics',
  'How many multiples of the motor speed the RPM filter removes. 1 is the vibration once per revolution, and 2 and 3 are twice and three times that frequency.',
  'This is rpm_filter_harmonics. For each harmonic Betaflight runs a notch that follows each motor\'s speed, on each axis, so three harmonics on a quad is thirty six notches. More notches mean more delay.',
  'More of the noise at multiples of the motor speed is removed, at the cost of a little more delay.',
  'More notch filters to run at 1 kHz, each one of less use beyond the lines that actually exist.',
  'Fewer notches. The loop has less delay, and the gyro signal is noisier at those multiples.',
  '1 covers the imbalance line this simulator adds.',
);
RPM(
  'rpm_filter_weights_1',
  'RPM filter weight, harmonic 1',
  'How strongly the first RPM notch removes its frequency. 0 leaves that harmonic alone.',
  'This is the first of the three rpm_filter_weights, as a percentage. Betaflight 4.5 prints the three as one list, rpm_filter_weights = 100,100,100, and an export here writes the same list.',
  'The first harmonic notch removes more.',
  'A higher weight reduces the signal more at the motor\'s rotation frequency.',
  'The notch removes less, and 0 turns it off for this harmonic.',
  'A weight of 0 is the clear way to say that you do not want this harmonic filtered.',
);
RPM(
  'rpm_filter_weights_2',
  'RPM filter weight, harmonic 2',
  'How strongly the second harmonic notch removes its frequency.',
  'This is the second of the three rpm_filter_weights.',
  'The second harmonic notch removes more.',
  'The simulator does not add a line at twice the rotation frequency, so this notch may add delay without removing anything.',
  'The notch removes less, or nothing at 0.',
  'Base the choice on a flight log. The vibration added here is the once-per-revolution line plus a broad band.',
);
RPM(
  'rpm_filter_weights_3',
  'RPM filter weight, harmonic 3',
  'How strongly the third harmonic notch removes its frequency. On a real quad with three-blade propellers the blade passing vibration is close to this frequency. This simulator does not add it.',
  'This is the third of the three rpm_filter_weights.',
  'The third harmonic notch removes more. On a real three-blade quad this can be the most useful notch. Here it mostly adds delay.',
  'Blade passing was deliberately not modelled, because the once-per-revolution line is the larger effect and a 1 kHz loop records little above 500 Hz.',
  'The notch removes less, or nothing at 0.',
  'Turning it off matches the physics model.',
);
RPM(
  'rpm_filter_min_hz',
  'RPM filter minimum (Hz)',
  'Below this frequency the RPM notches fade out. If you care about noise in a hover, make sure the idle speed is still covered.',
  'This is rpm_filter_min_hz. Above it, the fade range blends the notches in.',
  'The notches start at a higher motor speed, so low motor speeds are not filtered by them.',
  'The hover may become noisier. A full throttle climb is unchanged if it is already above the minimum.',
  'The notches work down to lower motor speeds, which adds delay when descending at idle.',
  'Too low, and the notch sits close to 0 Hz, where the signal is a manoeuvre rather than vibration.',
);
put('rpm_filter_fade_range_hz', copy({
  title: 'RPM filter fade range (Hz)',
  related: ['cli-rpm_filter_min_hz'],
  air: 'How wide the band is over which the RPM notches fade in above the minimum frequency.',
  lab: 'This is rpm_filter_fade_range_hz.',
  sim: 'Works here.',
  upAir: 'The notches fade in more gradually.',
  upLab: 'The notches are partly on over a wider range of frequencies.',
  downAir: 'The notches switch on and off more sharply.',
  downLab: 'The delay changes in a step as the motors pass the minimum frequency.',
}));
put('rpm_filter_q', copy({
  title: 'RPM filter Q',
  related: ['cli-rpm_filter_harmonics', 'control-filters'],
  air: 'Sets how narrow the RPM notches are. A high Q gives a narrow notch. A low Q gives a wide notch, which removes more of the signal around the motor frequency and adds more delay.',
  lab: 'This is rpm_filter_q, stored as the Q multiplied by 100, so 500 means a Q of 5. Q is the centre frequency divided by the width of the notch.',
  sim: 'Works here. The simulated imbalance lines are narrow, so a high Q can remove them.',
  upAir: 'Narrower notches, with less extra delay. They miss more easily if the motor speed they follow is late or wrong.',
  upLab: 'A higher Q means a narrower band.',
  downAir: 'Wider notches, which catch the vibration more surely and add more delay.',
  downLab: 'A lower Q also removes frequencies next to the motor\'s.',
}));
put('rpm_filter_lpf_hz', copy({
  title: 'RPM filter low-pass (Hz)',
  related: ['cli-rpm_filter_q'],
  air: 'Smooths the motor speed estimate that the RPM notches follow. Too low, and the notches lag behind a sudden climb. Too high, and they jump about with the noise.',
  lab: 'This is rpm_filter_lpf_hz. It filters the frequency the notches follow, not the gyro signal.',
  sim: 'Works here. The motor speed in the physics model is exact; the code that connects it to Betaflight delays it as real telemetry would, and this filter delays it further.',
  upAir: 'The notches follow the motor speed more quickly, and may move about.',
  upLab: 'The speed estimate responds to faster changes.',
  downAir: 'The notches lag behind a sudden climb, so they remove the frequency where the motor was rather than where it is.',
  downLab: 'The speed estimate responds more slowly.',
}));

for (const [key, title, air] of [
  ['dyn_notch_count', 'Dynamic notch count', 'Sets how many noise peaks the dynamic notch filter follows on each axis, with one notch for each peak.'],
  ['dyn_notch_q', 'Dynamic notch Q', 'Sets the Q of each dynamic notch, which decides how wide it is. A higher Q gives a narrower notch.'],
  ['dyn_notch_min_hz', 'Dynamic notch minimum (Hz)', 'Sets the lowest frequency, in hertz, at which the dynamic notch filter looks for noise peaks.'],
  ['dyn_notch_max_hz', 'Dynamic notch maximum (Hz)', 'Sets the highest frequency, in hertz, at which the dynamic notch filter looks for noise peaks.'],
]) {
  put(key, copy({
    title,
    related: ['control-filters', 'start-honesty', 'physics-gyro'],
    air: `${air} A notch filter removes a narrow band of frequencies. On a real flight controller the dynamic notch measures the frequencies of the vibration while the quad flies and places its notches on the strongest peaks.`,
    lab: 'The code is Betaflight\'s dyn_notch_filter.c, and it is compiled into the simulator. It finds the peaks with a sliding discrete Fourier transform (SDFT), a calculation that splits the gyro signal into its separate frequencies. dynNotchInit does not start it when the PID loop runs slower than 2 kHz (DYN_NOTCH_UPDATE_MIN_HZ), on any flight controller.',
    sim: 'Off at 1 kHz. This simulator\'s loop runs at 1 kHz, a rate fixed by the project\'s rules, so the firmware does what it does on a real board with a 1 kHz PID loop: nothing. The value is written into Betaflight\'s real setting group, so a tune keeps it and an export writes it out unchanged. The check scripts/fc-trace.js flies the same stick inputs with dyn_notch_count at 0 and at 3 and confirms that the two flights are identical.',
  }));
}

put('pid_process_denom', copy({
  title: 'PID process denominator',
  related: ['physics-timestep', 'start-honesty'],
  air: 'On a real flight controller, this sets how often the PID controller runs compared with how often the gyro is read. The PID rate is the gyro rate divided by this number: 1 means they run at the same rate, and 2 means the PID runs at half the gyro rate.',
  lab: 'The value is stored in Betaflight\'s pidConfig as pid_process_denom. The physics model steps at 1 kHz, and after a tune or a change saved on the firmware bench is applied, bf_config_finish in bf_glue.c sets this value back to 1, so that no setting can make the control loop drift out of step with the physics.',
  sim: 'Off at 1 kHz. The value is stored and then set to 1, so reading it back after Betaflight has started always gives 1.',
}));

put('iterm_relax', copy({
  title: 'I-term relax',
  related: ['control-pid', 'cli-iterm_relax_cutoff'],
  air: 'Stops the I term growing during a fast stick movement, so that a flip does not build up a correction that keeps pushing the quad on when you stop. A quick stick movement is not a disturbance, so it should not be added to the I term.',
  lab: 'Betaflight passes the setpoint, the target rate, through a high-pass filter, which keeps only its fast changes. The faster the setpoint is changing, the more the I term is held back. iterm_relax_type chooses how the held-back amount is worked out, and iterm_relax_cutoff sets what counts as fast.',
  sim: 'Works here, in Betaflight\'s compiled pid.c.',
  choices: [
    'OFF: the I term grows during a flip as it does at any other time, and keeps pushing when you stop.',
    'RP: relax on roll and pitch. This is Betaflight\'s default.',
    'RPY: relax on roll, pitch and yaw.',
    'RP_INC and RPY_INC: the same axes, but the I term is held back only while it would grow. It can still shrink during a movement.',
  ],
}));
put('iterm_relax_type', copy({
  title: 'I-term relax type',
  related: ['cli-iterm_relax'],
  air: 'Chooses how I-term relax decides how much to hold the I term back.',
  lab: 'The options are the itermRelaxType_e values in pid.h, and the calculation is applyItermRelax in pid.c. Both types use the same high-pass filtered setpoint, whose filter is set by iterm_relax_cutoff.',
  sim: 'Works here.',
  choices: [
    'SETPOINT: the error the I term adds up is scaled down by how fast the setpoint is changing. It depends only on the sticks. This is Betaflight\'s default.',
    'GYRO: the error the I term adds up is the difference between the gyro rate and a smoothed copy of the setpoint, with any difference smaller than the fast part of the stick movement ignored. If the quad falls behind during a movement, the I term still grows.',
  ],
}));
put('iterm_relax_cutoff', copy({
  title: 'I-term relax cutoff (Hz)',
  related: ['cli-iterm_relax'],
  air: 'Sets how fast a stick movement must be before I-term relax starts to hold the I term back. A lower value means that even slow stick movements reduce I.',
  lab: 'It is the cutoff frequency of the filter that detects fast stick movements. Betaflight smooths the setpoint with a low-pass filter at this frequency and subtracts the result from the setpoint, which leaves only the fast part of the movement. Together, these two steps make a high-pass filter, which keeps fast changes and removes slow ones.',
  sim: 'Works here.',
  upAir: 'Only sudden, fast stick movements hold I back. During smooth flying the I term keeps working.',
  upLab: 'A higher cutoff lets the low-pass filter follow the stick more closely, so the fast part left over is smaller and I is held back less.',
  downAir: 'The I term is held back sooner, so the quad may fall behind a slow, steady stick movement.',
  downLab: 'A lower cutoff leaves a larger fast part after filtering, so I is held back more.',
}));
put('iterm_windup', copy({
  title: 'I-term windup',
  related: ['cli-iterm_limit', 'control-pid'],
  air: 'Stops the I term growing when the PID corrections already use most of the motors\' range. The value is a percentage of that range. Without it, a move that uses the mixer\'s whole range builds up a large I term, which is then released suddenly.',
  lab: 'In Betaflight\'s code this is itermWindupPointPercent. The mixer measures the difference between the highest and lowest motor commands that come from the roll, pitch and yaw corrections. When that difference goes above this percentage of the motor range, the I term grows more slowly, and it stops growing when the difference reaches 100 percent.',
  sim: 'Works here. The throttle does not count towards this point: only the roll, pitch and yaw corrections do.',
  upAir: 'The I term keeps working closer to the point where the motors run out of range. If the motors do reach their limit, the correction released afterwards can be larger.',
  upLab: 'A higher percentage means I is held back later, closer to the full motor range.',
  downAir: 'The I term stops growing sooner. This is safer, but during a long roll that keeps the motors at their limit, the roll rate may fall further below the target.',
  downLab: 'A lower percentage means I is held back earlier, further from the full motor range.',
}));
put('iterm_limit', copy({
  title: 'I-term limit',
  related: ['cli-iterm_windup'],
  air: 'Sets the largest value the I term may reach, in Betaflight\'s own units. It is the final limit on how large a stored correction can become.',
  lab: 'In Betaflight\'s code this is itermLimit, stored as a 16-bit whole number (uint16). On every step, Betaflight keeps the I term on each axis between minus and plus this value.',
  sim: 'Works here.',
  upAir: 'The I term can correct a larger steady error, such as a stronger nose-up tendency at speed. The correction released after a move can also be larger.',
  upLab: 'A higher limit allows a larger I term on each axis.',
  downAir: 'This is safer, but the I term may not be able to cancel a strong steady turning effect.',
  downLab: 'The steady nose-up turning effect in fast forward flight is a good test of whether this limit is too small. It comes from the H-force, the backward drag force on each propeller, which acts above the centre of gravity.',
}));
put('iterm_rotation', copy({
  title: 'I-term rotation',
  related: ['control-pid', 'physics-gyroscopic'],
  air: 'Rotates the stored I term with the quad as it yaws, so that a stored roll correction becomes a pitch correction and keeps pointing the same way relative to the ground.',
  lab: 'It rotates the stored I values between the axes by the angle the gyro measures on each step, and adds no gain of its own.',
  sim: 'Works here.',
  choices: [
    'OFF: each stored I value stays on the axis where it built up. This is Betaflight\'s default.',
    'ON: the stored I values turn with the quad. It helps in slow moves that mix yaw with roll or pitch.',
  ],
}));

put('pidsum_limit', copy({
  title: 'PID sum limit',
  related: ['control-mixer', 'cli-pidsum_limit_yaw'],
  air: 'Limits the total PID output on roll and pitch, so that one axis cannot use up the whole range of the motors. If the PID output reaches this limit, the quad rotates more slowly than the rates curve asks for.',
  lab: 'In Betaflight\'s code this is pidSumLimit, usually about 500 in Betaflight\'s own units. The mixer clamps the roll and pitch PID sums to this value before it uses them.',
  sim: 'Works here.',
  upAir: 'The PID can make larger corrections, and a move that combines roll, pitch and throttle is more likely to drive a motor to full power.',
  upLab: 'A higher limit clamps less, so the mixer receives something closer to the unclamped PID output.',
  downAir: 'The motors are pushed less hard, and the maximum rotation rate can be lower than the srate settings suggest.',
  downLab: 'Check 9, which tests that full stick reaches the set maximum rate to within 3 percent, assumes the PID output is not being clamped. A limit that is too small would make the quad fail that check.',
}));
put('pidsum_limit_yaw', copy({
  title: 'PID sum limit, yaw',
  related: ['cli-pidsum_limit', 'physics-yaw'],
  air: 'The same limit for the yaw axis. Yaw usually has a lower limit, because it is easy to ask for more yaw than the propellers can produce.',
  lab: 'In Betaflight\'s code this is pidSumLimitYaw. The mixer clamps the yaw PID sum to this value.',
  sim: 'Works here.',
  upAir: 'Yaw can make larger corrections. When you use full yaw together with full roll or pitch, yaw is more likely to take motor range that roll and pitch need.',
  upLab: 'A higher limit lets a larger yaw command into the mixer.',
  downAir: 'Yaw reaches its limit sooner, and the quad cannot reach the highest yaw rates you ask for.',
  downLab: 'This matches the physics model, in which only a small turning force (torque) is available about the yaw axis.',
}));
put('pid_at_min_throttle', copy({
  title: 'PID at minimum throttle',
  related: ['control-tpa', 'control-mixer'],
  air: 'On a real quad, this decides whether the PID controller keeps running while the throttle stick is at the bottom and airmode is not active. In both cases Betaflight resets the I term there.',
  lab: 'In Betaflight\'s code this is pidAtMinThrottle, and the only code that reads it is in fc/core.c. When the throttle is low and neither airmode nor launch control is active, core.c resets the I term and switches the PID controller on or off according to this setting.',
  sim: 'Stored, not used. fc/core.c is not compiled. The simulator switches the PID controller on once when Betaflight starts, in bf_glue.c, and never switches it off. To see what zero throttle is like without airmode here, turn the AIRMODE feature off.',
}));
put('motor_output_limit', copy({
  title: 'Motor output limit (%)',
  related: ['cli-throttle_limit_percent', 'control-mixer'],
  air: 'Limits the motor output to a percentage of full power. It is stored in the PID profile. It is similar to throttle_limit_percent, but it limits the PID corrections as well as the throttle stick.',
  lab: 'The value is motor_output_limit, from 1 to 100. Betaflight lowers the top of the motor output range to this percentage when it sets up the motor outputs, so the throttle and the PID corrections are both scaled down.',
  sim: 'Works here. bf_glue.c sets up the motor output range the same way Betaflight does for DShot motors, including this limit.',
  upAir: 'Raising it towards 100 gives the motors their full range. 100 is the default.',
  upLab: 'At 100 there is no limit: Betaflight applies it only below 100.',
  downAir: 'The quad responds more gently and has less thrust when you punch the throttle.',
  downLab: 'On a full battery the five inch makes about 8.1 times its weight in thrust at Earth\'s gravity, and about 5 times its weight at the normal Weight setting, so it can still feel lively at 80 percent. Do not combine this with throttle_limit_type SCALE unless you mean to, because both reduce the output.',
}));
put('thrust_linear', copy({
  title: 'Thrust linearisation',
  related: ['control-mixer', 'physics-fm'],
  air: 'Compensates for the thrust of a propeller not rising in a straight line with motor output. Thrust grows with the square of motor speed, so a correction at low motor output changes the thrust less than the same correction at high output. Thrust linearisation raises low outputs more than high ones, so the PID corrections have a more even effect across the throttle range.',
  lab: 'In pid.c each motor\'s output is multiplied by 1 + thrust_linear / 100 × (1 − output)², which raises low outputs most. The mixer also divides the throttle by a matching amount, so that the throttle stick itself feels about the same. The net change is that PID corrections have more effect at low throttle. 0 turns it off, and 0 is Betaflight\'s default.',
  sim: 'Works here. The physics model calculates each propeller\'s thrust as a constant multiplied by the square of its speed (kt ω²), so the curve this setting corrects for is present in the simulator.',
  upAir: 'Corrections at low throttle get stronger, which can steady a descent. With too much, the quad twitches at low throttle.',
  upLab: 'A higher percentage raises low motor outputs more.',
  downAir: 'Corrections at low throttle are weaker than the same corrections at high throttle.',
  downLab: 'At 0 the motor outputs are left as the mixer made them.',
}));
put('transient_throttle_limit', copy({
  title: 'Transient throttle limit',
  related: ['control-mixer'],
  air: 'When the PID asks for a bigger difference between the motors than fits between idle and full power, the mixer moves the throttle up or down to make room. This setting makes Betaflight hold on to that throttle shift for a short time after a fast correction, and sets the largest shift it may hold, as a percentage of the throttle range. 0, the default, turns it off.',
  lab: 'In Betaflight\'s code this is transient_throttle_limit, which sets airmodeThrottleOffsetLimit (pid_init.c). On each step the mixer measures how far it moved the throttle. Betaflight\'s code calls this the airmode throttle offset, although the mixer makes the shift with or without airmode. Betaflight keeps the fast-changing part of that shift, lets it fade through a low-pass filter at 7 Hz, and adds it to the throttle on the next step, limited to this percentage. A code comment says the aim is to stop a fast oscillation from being distorted when the motors reach the edge of their range.',
  sim: 'Works here. The physics model has no ESC current limit, and this setting does not act as one: it changes only the throttle shift that the mixer makes.',
  upAir: 'After the mixer has moved the throttle to make room for a large correction, Betaflight may hold a larger shift. Nothing changes while the corrections fit between idle and full power.',
  upLab: 'A higher limit lets the held shift grow larger before it is clamped.',
  downAir: 'Less of the throttle shift is held. At 0, the mixer moves the throttle only as far as each step needs.',
  downLab: 'At 0 Betaflight skips this code completely.',
}));

put('launch_control_mode', copy({
  title: 'Launch control mode',
  related: ['control-mixer', 'cli-launch_control_gain'],
  air: 'Chooses how launch control holds the quad on the start line. Launch control holds the quad at idle, leaning against the gate or a launch stand at the angle you set with the sticks, until the throttle passes the trigger point. In this simulator you turn the feature on with the Launch control switch on the Quad screen, and press L on the start line to use it.',
  lab: 'This is launchControlMode in the PID profile. On a real quad, the code that starts launch control, detects the throttle trigger and resets it is in Betaflight\'s fc/core.c. That file is not compiled here, so a copy of that logic is in bf_glue.c. The settings it reads are Betaflight\'s own.',
  sim: 'Works here, through the copy of the launch control logic in bf_glue.c and Betaflight\'s own launch control code in pid.c.',
  choices: [
    'NORMAL: roll and pitch hold their angle, and the yaw I term is kept at zero. This is Betaflight\'s default.',
    'PITCHONLY: only pitch is held. Roll and yaw P and I are switched off, and the pitch I term may only push the nose forward.',
    'FULL: all three axes are held, with the yaw I term limited to a small value.',
  ],
}));
put('launch_trigger_allow_reset', copy({
  title: 'Launch trigger allow reset',
  related: ['cli-launch_control_mode'],
  air: 'Decides whether launch control can be used again after it has triggered. There is no disarm in this simulator, so this setting is what allows a second try.',
  lab: 'In Betaflight\'s code this is launchControlAllowTriggerReset. In bf_glue.c, a launch that has triggered goes back to the off state when the launch control switch goes off, but only if this setting is ON.',
  sim: 'Works here, in the launch control logic in bf_glue.c.',
  choices: [
    'ON: switching launch control off after a launch clears it, so switching it on again gives a new hold. With the L key: land, press L to switch it off, and press L again. This is Betaflight\'s default.',
    'OFF: one launch for each reset of the firmware.',
  ],
}));
put('launch_trigger_throttle_percent', copy({
  title: 'Launch trigger throttle (%)',
  related: ['cli-launch_control_mode'],
  air: 'Sets how far you must raise the throttle, as a percentage, to end the launch hold and fly off the line.',
  lab: 'In Betaflight\'s code this is launchControlThrottlePercent, with a maximum of 90. When the throttle goes above it, launch control triggers and the I term is reset.',
  sim: 'Works here.',
  upAir: 'Launch control is harder to trigger by accident, which helps if you tend to move the throttle slightly while you wait.',
  upLab: 'A higher value means the throttle must go further before the hold ends.',
  downAir: 'The quad leaves the line with less throttle, and a small throttle movement can start it too early.',
  downLab: 'A lower value means a smaller throttle movement ends the hold.',
}));
put('launch_angle_limit', copy({
  title: 'Launch angle limit',
  related: ['cli-launch_control_mode', 'control-angle'],
  air: 'Sets how far the quad may tilt forward, in degrees, while launch control holds it on the start line. 0 means no limit.',
  lab: 'In Betaflight\'s code this is launchControlAngleLimit, in degrees. When you pitch forward during the hold, Betaflight slows the pitch movement over the last 10 degrees before the limit and stops it at the limit. Betaflight uses the limit only when it has an accelerometer; the simulator gives it one, using the attitude from the physics model.',
  sim: 'Works here. The simulator sets it to 40 degrees by default, so that the quad does not tip far enough forward to loop over when you punch. Betaflight\'s own default is 0. A tune or the firmware bench can change it.',
  upAir: 'You can tilt the quad further forward on the line before you launch.',
  upLab: 'A larger limit allows a larger forward pitch angle before Betaflight stops the pitch movement.',
  downAir: 'The quad cannot tilt as far forward. The angle is measured from level, so on a launch stand that is not level the limit may stop the quad sooner or later than you expect.',
  downLab: 'A smaller limit stops the forward pitch at a smaller angle. At 0 there is no limit at all.',
}));
put('launch_control_gain', copy({
  title: 'Launch control gain',
  related: ['cli-launch_control_mode'],
  air: 'Sets how strongly launch control holds the quad\'s attitude on the line. With too much on a launch stand, the quad oscillates. With too little, it drifts away from the angle you set before you leave the line.',
  lab: 'In Betaflight\'s code this is launchControlGain. While launch control is active, Betaflight uses it as the I gain in place of the normal one (pid.c), and switches off D and feedforward.',
  sim: 'Works here.',
  upAir: 'The hold is firmer, and the quad may bounce on the launch stand.',
  upLab: 'A higher gain makes the I term build up faster while the quad is held.',
  downAir: 'The hold is softer.',
  downLab: 'A lower gain makes the I term build up more slowly during the hold.',
}));

put('anti_gravity_gain', copy({
  title: 'Anti-gravity gain',
  related: ['control-tpa', 'cli-anti_gravity_p_gain'],
  air: 'Sets how much anti-gravity raises the I term, and through anti_gravity_p_gain the P term, when the throttle changes quickly. It exists so that the quad does not tip in pitch or roll when you punch. Nothing measures gravity: it reacts only to fast changes in the throttle.',
  lab: 'It works together with the ANTI_GRAVITY feature line. Betaflight measures how fast the throttle is changing, smooths that with a filter that the mixer (mixTable) updates, and multiplies the result by this gain to get the boost.',
  sim: 'Works here. The ANTI_GRAVITY feature line, which switches the whole feature on or off, is a separate setting that also works here.',
  upAir: 'The quad stays level through a punch. With too much, its attitude jumps when you blip the throttle (raise it briefly).',
  upLab: 'A higher gain gives a larger I boost, and a larger P boost, during fast throttle changes.',
  downAir: 'The nose tips when you punch. This is a common fault, and you can see it in the camera view.',
  downLab: 'At 0 with the feature on, the anti-gravity code still runs but adds nothing. To switch it off completely, turn off the ANTI_GRAVITY feature.',
}));
put('anti_gravity_cutoff_hz', copy({
  title: 'Anti-gravity cutoff (Hz)',
  related: ['cli-anti_gravity_gain'],
  air: 'Sets the cutoff of the filter that smooths the measured rate of throttle change before anti-gravity uses it. This is a low-pass filter, which lets slow changes through and removes fast ones. A lower cutoff makes the boost smaller at its peak but makes it last longer.',
  lab: 'In Betaflight 4.5.1 this is the cutoff frequency of a PT2 low-pass filter (a second-order filter) applied to how fast the throttle is changing, in pidUpdateAntiGravityThrottleFilter in pid.c. The code\'s own comment says that a lower cutoff reduces the peaks and makes the effect last longer.',
  sim: 'Works here.',
  upAir: 'The boost follows the throttle more closely: it rises higher during a sharp punch and dies away sooner.',
  upLab: 'A higher cutoff smooths the throttle signal less, so the boost has higher peaks and lasts a shorter time.',
  downAir: 'The boost is smaller at its peak but lasts longer after each throttle change, so anti-gravity is active for more of an ordinary flight.',
  downLab: 'A lower cutoff smooths the throttle signal more, which lowers the peaks and spreads the boost over a longer time.',
}));
put('anti_gravity_p_gain', copy({
  title: 'Anti-gravity P gain',
  related: ['cli-anti_gravity_gain'],
  air: 'Adds extra P during the same fast throttle changes, on top of the I boost. It applies to roll and pitch only.',
  lab: 'In Betaflight\'s code this is anti_gravity_p_gain, in percent. The P boost uses the same smoothed rate of throttle change as the I boost.',
  sim: 'Works here.',
  upAir: 'The quad corrects its attitude faster during a punch, and may become twitchy.',
  upLab: 'A higher value gives a larger P boost whenever anti-gravity detects a fast throttle change.',
  downAir: 'At 0, anti-gravity raises only I. Betaflight\'s default is 100, so the P boost is normally on.',
  downLab: 'At 0 the P boost is off.',
}));

put('feedforward_transition', copy({
  title: 'Feedforward transition',
  related: ['control-ff'],
  air: 'Fades feedforward in as the stick moves away from centre, so that small, unintended stick movements near centre do not reach the motors.',
  lab: 'In Betaflight\'s code this is feedforward_transition. Below this stick position, measured from centre, Betaflight reduces feedforward in proportion to how far the stick has moved.',
  sim: 'Works here.',
  upAir: 'Feedforward reaches full strength only with a larger stick movement, and the quad is calmer around centre stick.',
  upLab: 'A higher value spreads the fade-in over more of the stick travel.',
  downAir: 'Feedforward works even near centre stick. The quad responds directly to small movements, but the motors may be busy on a radio link with noisy stick signals.',
  downLab: 'At 0, feedforward is at full strength everywhere on the stick.',
}));
put('feedforward_averaging', copy({
  title: 'Feedforward averaging',
  related: ['control-ff', 'physics-radio'],
  air: 'Averages the rate of change of the stick over the last 2, 3 or 4 radio packets. Feedforward becomes smoother, but it also arrives later.',
  lab: 'The average is taken over the rate of change of the setpoint, packet by packet, in fc/rc.c.',
  sim: 'Works here. With the perfect radio link this setting seems unnecessary. With an ELRS preset it becomes clear why it exists.',
  choices: [
    'OFF: each packet\'s rate of change is used on its own. Sharp on a perfect link, rough on a link with uneven timing.',
    '2_POINT, 3_POINT and 4_POINT: the average of the last 2, 3 or 4 packets. More points are smoother and later.',
  ],
}));
put('feedforward_smooth_factor', copy({
  title: 'Feedforward smooth factor',
  related: ['cli-feedforward_averaging'],
  air: 'Smooths feedforward with a low-pass filter, which lets slow changes through and removes fast ones. Betaflight applies it before the averaging.',
  lab: 'In Betaflight\'s code this is feedforward_smooth_factor. A higher value gives stronger smoothing.',
  sim: 'Works here.',
  upAir: 'Feedforward becomes softer.',
  upLab: 'A higher value smooths feedforward more, which also delays it slightly.',
  downAir: 'Feedforward is smoothed less, so it follows each change in the stick signal more directly.',
  downLab: 'A lower value smooths feedforward less.',
}));
put('feedforward_jitter_factor', copy({
  title: 'Feedforward jitter factor',
  related: ['physics-radio', 'control-ff'],
  air: 'Reduces small feedforward spikes that are probably caused by radio jitter (packets arriving at uneven times) rather than by a real stick movement.',
  lab: 'In Betaflight\'s code this is feedforward_jitter_factor. When the stick signal changes by less than this amount between packets, Betaflight reduces feedforward.',
  sim: 'Works here. With the perfect radio link it does almost nothing useful. With the Crossfire 150 Hz preset, which adds 1.8 ms of timing jitter, it decides whether the motors stay steady or change speed with every packet.',
  upAir: 'More jitter is removed, and the smallest stick movements feel slightly less sharp.',
  upLab: 'A higher value reduces feedforward more when the setpoint\'s rate of change, d(setpoint), is small.',
  downAir: 'Every small step in the stick signal between packets becomes feedforward.',
  downLab: 'A lower value reduces small changes in d(setpoint) less.',
}));
put('feedforward_boost', copy({
  title: 'Feedforward boost',
  related: ['control-ff'],
  air: 'Adds extra feedforward at the start of a stick movement, which then dies away.',
  lab: 'In Betaflight\'s code this is feedforward_boost. It adds feedforward in proportion to how fast the setpoint\'s rate of change is itself changing, which is the acceleration of the stick.',
  sim: 'Works here.',
  upAir: 'The quad starts each movement harder, and can overshoot at the start.',
  upLab: 'A higher value gives a larger boost at the start of each movement.',
  downAir: 'Feedforward stays more even through a movement.',
  downLab: 'At 0 there is no boost, and feedforward is only the F gain multiplied by the setpoint\'s rate of change.',
}));
put('feedforward_max_rate_limit', copy({
  title: 'Feedforward maximum rate limit',
  related: ['control-ff', 'control-rates'],
  air: 'Stops feedforward from asking for more rotation than the rates curve allows. The value is a percentage, and it applies to roll and pitch.',
  lab: 'In Betaflight\'s code this is feedforward_max_rate_limit. Betaflight limits feedforward according to how close the setpoint is to the maximum rate.',
  sim: 'Works here.',
  upAir: 'Towards 100, feedforward may push the quad close to the maximum rate of the rates curve. The response is sharp, and can get ahead of what P can correct.',
  upLab: 'A higher percentage allows more feedforward near the maximum rate.',
  downAir: 'Feedforward is limited earlier. This is safer, and the response is less sharp.',
  downLab: 'A lower percentage limits feedforward more near the maximum rate.',
}));

put('tpa_mode', copy({
  title: 'TPA mode',
  related: ['control-tpa', 'cli-tpa_rate'],
  air: 'Chooses which terms of the PID controller TPA reduces. TPA, throttle PID attenuation, turns the gains down at high throttle.',
  lab: 'tpa_mode is PD or D (tpaMode_e). In PD mode pid.c multiplies both the P term and the D term by the TPA factor. In D mode it multiplies only the D term.',
  sim: 'Works here.',
  choices: [
    'D: only the D term is reduced, and P keeps its full value at every throttle. This is Betaflight 4.5\'s default.',
    'PD: both P and D are reduced.',
  ],
}));
put('tpa_rate', copy({
  title: 'TPA rate',
  related: ['control-tpa', 'cli-tpa_breakpoint'],
  air: 'How much TPA (throttle PID attenuation) reduces the gains above the breakpoint, as a percentage. The reduction grows in a straight line from nothing at tpa_breakpoint to this percentage at full throttle. 0 is off, and 70 is a large reduction.',
  lab: 'tpa_rate is a whole number from 0 to 100. pid_init.c turns it into a slope, so that at full throttle the gains are multiplied by 1 − tpa_rate / 100.',
  sim: 'Works here. The physics model\'s thrust depends strongly on the throttle, and at full throttle the five inch makes about 5 times its weight in thrust at the normal Weight setting (about 8.1 times at Earth gravity), so TPA has a real effect here.',
  upAir: 'The quad feels softer and more stable during full-throttle bursts. It also has less control authority at the top of the throttle.',
  upLab: 'A higher rate reduces the gains more at high throttle.',
  downAir: 'The gains tuned for the hover stay at full strength all the way to full throttle, which often makes the quad buzz there.',
  downLab: 'A rate of 0 turns TPA off.',
}));
put('tpa_breakpoint', copy({
  title: 'TPA breakpoint',
  related: ['cli-tpa_rate'],
  air: 'The throttle at which TPA (throttle PID attenuation) starts, on the old radio pulse scale from 1000 (no throttle) to 2000 (full throttle), where 1500 is the middle of the stick. Below this the PID gains are at full strength. Above it, TPA reduces them.',
  lab: 'tpa_breakpoint is a whole number from 1000 to 2000. pid_init.c turns it into a fraction of the throttle: (tpa_breakpoint − 1000) / 1000.',
  sim: 'Works here. At the normal Weight setting the five inch hovers at about 35 percent of the throttle stick, which is about 1350 on this scale, so a breakpoint below that reduces the gains even in a hover, and a breakpoint of 1500 leaves the hover at full gain. The Weight setting scales gravity, so it moves the hover point.',
  upAir: 'TPA starts later, so hovering and cruising keep more of their PID gain.',
  upLab: 'A higher breakpoint moves the start of the reduction further up the throttle.',
  downAir: 'TPA starts earlier, so even a gentle climb has reduced gains.',
  downLab: 'A lower breakpoint moves the start of the reduction further down the throttle.',
}));
put('tpa_low_rate', copy({
  title: 'TPA low rate',
  related: ['cli-tpa_low_breakpoint', 'control-tpa'],
  air: 'How much TPA reduces the gains at very low throttle, below tpa_low_breakpoint. With tpa_low_always OFF, the default, it applies only from arming until the throttle first rises past that breakpoint, which covers the take-off.',
  lab: 'tpa_low_rate is a percentage from 0 to 100. The reduction is tpa_low_rate percent at zero throttle and falls in a straight line to nothing at tpa_low_breakpoint (pidUpdateTpaFactor in pid.c).',
  sim: 'Works here.',
  upAir: 'The gains are lower near zero throttle while low TPA applies.',
  upLab: 'A higher rate means a larger reduction at low throttle.',
  downAir: 'The gains stay at full strength at low throttle.',
  downLab: 'A rate of 0 turns low-throttle TPA off.',
}));
put('tpa_low_breakpoint', copy({
  title: 'TPA low breakpoint',
  related: ['cli-tpa_low_rate'],
  air: 'The throttle below which tpa_low_rate applies, on the same 1000 to 2000 scale as tpa_breakpoint.',
  lab: 'In pid.c, low-throttle TPA applies while the throttle is below this breakpoint. If it is set higher than tpa_breakpoint, pid_init.c lowers it to tpa_breakpoint.',
  sim: 'Works here.',
  upAir: 'The low-throttle region is larger, as long as tpa_low_rate is above 0.',
  upLab: 'Low-throttle TPA covers every throttle below this value. Read it together with tpa_low_always, which decides whether it applies for the whole flight.',
  downAir: 'The low-throttle region is smaller.',
  downLab: 'Setting it equal to tpa_breakpoint does not make the two cancel: low-throttle TPA then covers every throttle below the breakpoint, and normal TPA every throttle above it. The code is pidUpdateTpaFactor in pid.c.',
}));
put('tpa_low_always', copy({
  title: 'TPA low always',
  related: ['cli-tpa_low_rate'],
  air: 'Decides when low-throttle TPA applies. With OFF, it applies only at the start of a flight, until the throttle first rises past tpa_low_breakpoint. With ON, it applies every time the throttle is below that breakpoint.',
  lab: 'tpa_low_always is OFF or ON. With OFF, pidUpdateTpaFactor in pid.c sets a flag the first time the throttle passes the low breakpoint, and after that only the normal TPA applies. With ON the flag is never set.',
  sim: 'Works here. The simulator clears the flag each time it resets the quad; patches/0002 adds that reset to Betaflight.',
  choices: [
    'OFF: low throttle TPA applies only until the throttle first passes tpa_low_breakpoint after arming, and normal TPA after that. This is Betaflight\'s default.',
    'ON: low throttle TPA applies every time the throttle is below the breakpoint, for the whole flight.',
  ],
}));

put('throttle_boost', copy({
  title: 'Throttle boost',
  related: ['control-mixer'],
  air: 'Adds extra throttle for a moment when you move the throttle stick quickly, and the extra then fades away. It makes a slow-responding quad feel quicker. On the five inch, which makes about 5 times its weight in thrust at the normal Weight setting, it is easy to use too much.',
  lab: 'In mixer.c a low-pass filter, which lets slow changes through and removes fast ones, smooths the throttle. The throttle minus its smoothed value is the fast part of the movement, and throttle_boost / 10 times that fast part is added back to the throttle.',
  sim: 'Works here.',
  upAir: 'Quick throttle movements give a bigger jump in thrust. Too much can make the quad\'s height bounce.',
  upLab: 'A larger boost adds more of the fast part of each throttle movement.',
  downAir: 'At 0 throttle boost is off, and the throttle reaches the mixer with nothing added.',
  downLab: 'A value of 0 turns throttle boost off.',
}));
put('throttle_boost_cutoff', copy({
  title: 'Throttle boost cutoff (Hz)',
  related: ['cli-throttle_boost'],
  air: 'Sets how quick a throttle movement must be before throttle boost adds to it. It is the cutoff frequency, in hertz, of the low-pass filter that throttle boost compares the throttle with.',
  lab: 'throttle_boost_cutoff is a whole number from 5 to 50 Hz. pid_init.c uses it to set up the throttle boost filter.',
  sim: 'Works here.',
  upAir: 'Only sharp, quick throttle movements are boosted.',
  upLab: 'A higher cutoff lets the smoothed throttle follow the stick more closely, so only faster movements leave a difference to boost, and the boost fades sooner.',
  downAir: 'Even slow throttle movements get extra throttle.',
  downLab: 'A lower cutoff makes the smoothed throttle lag further behind the stick, so slower movements are boosted too, and for longer.',
}));

put('acc_limit', copy({
  title: 'Setpoint acceleration limit',
  related: ['control-rates', 'cli-acc_limit_yaw'],
  air: 'Limits how fast the setpoint, the target rotation rate set by the sticks, may change on roll and pitch. It limits how quickly the rate changes. It does not set the maximum rate.',
  lab: 'rateAccelLimit in pid.c. Each unit is 100 degrees per second of change per second, so 10 lets the setpoint change by at most 1,000 degrees per second in one second. 0 turns the limit off.',
  sim: 'Works here. The limit is applied in pid.c, to the setpoint that processRcCommand hands to the PID controller.',
  upAir: 'The target rate can change faster, so the quad responds to quick stick movements sooner. If you wanted a smoother response, lower it instead.',
  upLab: 'A higher limit keeps the setpoint closer to the raw stick. 0 is not the lowest limit: it switches the limit off.',
  downAir: 'Quick stick movements are rounded off, and a flip takes a moment to reach full rate.',
  downLab: 'At 0 there is no limit. Any other value limits how much the setpoint may change in each loop step.',
}));
put('acc_limit_yaw', copy({
  title: 'Setpoint acceleration limit, yaw',
  related: ['cli-acc_limit', 'physics-yaw'],
  air: 'The same limit for the yaw axis. The motors cannot change the yaw rate as fast as the stick can jump from one position to another, and this setting limits the yaw setpoint, the target yaw rate, to match.',
  lab: 'yawRateAccelLimit in pid.c, in the same units as acc_limit: 100 degrees per second of change per second. 0 turns the limit off.',
  sim: 'Works here.',
  upAir: 'The yaw setpoint can change faster.',
  upLab: 'A higher limit lets the yaw setpoint change by more in each loop step.',
  downAir: 'Yaw builds up gradually, which can feel as if the motors respond more slowly than they do.',
  downLab: 'A moderate yaw limit is common even when acc_limit for roll and pitch is 0.',
}));

put('abs_control_gain', copy({
  title: 'Absolute control gain',
  related: ['control-pid', 'cli-use_integrated_yaw'],
  air: 'Absolute control keeps a running total of the angle by which the quad has drifted from where the sticks sent it, on roll, pitch and yaw, and adds a correction to the target rate to bring it back. It is off by default.',
  lab: 'In pid.c the stored angle error, multiplied by abs_control_gain, is added to the setpoint (the target rate), and the other abs_control settings set its limits and its filter. Because this does part of the I term\'s job, Betaflight lowers the I gains when it is on. It runs only when iterm_relax is on, and 0 turns it off.',
  sim: 'Works here.',
  upAir: 'The quad holds its heading more firmly during rolls. Too much can work against you when you mix yaw into a roll on purpose.',
  upLab: 'A higher gain adds a larger correction for the same stored error, and Betaflight lowers the I gains further.',
  downAir: 'At 0 absolute control is off. A roll then yaws by whatever amount the physics model produces.',
  downLab: 'At 0 the code does not run.',
}));
put('abs_control_limit', copy({
  title: 'Absolute control limit',
  related: ['cli-abs_control_gain'],
  air: 'The largest correction, in degrees per second, that absolute control may add to the target rate.',
  lab: 'abs_control_limit is a whole number from 10 to 255. pid.c limits the correction to plus or minus this value.',
  sim: 'Works here. It has an effect only when abs_control_gain is above 0.',
  upAir: 'Absolute control can make a larger correction.',
  upLab: 'A higher limit allows a larger correction to the target rate.',
  downAir: 'Absolute control makes smaller corrections, which is the safer choice.',
  downLab: 'A lower limit caps the correction at a smaller value.',
}));
put('abs_control_error_limit', copy({
  title: 'Absolute control error limit',
  related: ['cli-abs_control_gain'],
  air: 'The largest angle error, in degrees, that absolute control stores.',
  lab: 'abs_control_error_limit is a whole number from 1 to 45. pid.c limits the stored error to plus or minus this value.',
  sim: 'Works here. It has an effect only when abs_control_gain is above 0.',
  upAir: 'Absolute control can store, and so correct, a larger drift.',
  upLab: 'A higher limit lets the stored error grow larger.',
  downAir: 'Only a small drift is stored, so less of a large drift is corrected.',
  downLab: 'A lower limit keeps the stored error smaller.',
}));
put('abs_control_cutoff', copy({
  title: 'Absolute control cutoff',
  related: ['cli-abs_control_gain'],
  air: 'The cutoff frequency, in hertz, of a low-pass filter (which lets slow changes through and removes fast ones) on the target rate that absolute control uses. A higher cutoff means less filtering.',
  lab: 'abs_control_cutoff is a whole number from 1 to 45 Hz. Absolute control adds to the stored error only while the gyro rate is outside a band around the filtered target rate, and inside the band it reduces the stored error. The band widens while the stick is moving.',
  sim: 'Works here. It has an effect only when abs_control_gain is above 0.',
  upAir: 'Absolute control acts sooner.',
  upLab: 'A higher cutoff makes the filtered target follow the stick more closely, so the band is narrower and more error is stored during stick movements.',
  downAir: 'Absolute control is smoother and acts later.',
  downLab: 'A lower cutoff widens the band during stick movements, so less error is stored until the stick settles.',
}));
put('use_integrated_yaw', copy({
  title: 'Integrated yaw',
  related: ['physics-yaw', 'control-mixer'],
  air: 'With integrated yaw on, the yaw output of the PID controller is added up over time before it goes to the mixer, so the PID sets how fast the yaw command changes instead of setting the yaw command itself. It is off by default.',
  lab: 'use_integrated_yaw is in the PID profile. When it is ON, pid.c adds the yaw PID sum, multiplied by the loop time, to a running total on every step, and integrated_yaw_relax makes that total decay towards zero.',
  sim: 'Works here. The integrated yaw code in pid.c is compiled into this build.',
  choices: [
    'OFF: the yaw PID sum goes straight to the mixer, as on roll and pitch.',
    'ON: the yaw PID sum goes through the running total first. Yaw can feel more firmly held, and later.',
  ],
}));
put('integrated_yaw_relax', copy({
  title: 'Integrated yaw relax',
  related: ['cli-use_integrated_yaw'],
  air: 'When integrated yaw is on, this makes the stored yaw total fall back toward zero, so that it cannot keep growing.',
  lab: 'integrated_yaw_relax is a whole number from 0 to 255. On every step pid.c removes a fraction of the running total that is proportional to this value.',
  sim: 'Works here. It has an effect only when use_integrated_yaw is ON.',
  upAir: 'The stored yaw total falls back faster, so less yaw is held.',
  upLab: 'A higher value removes a larger fraction of the total on every step.',
  downAir: 'The stored yaw total is held for longer.',
  downLab: 'A lower value removes a smaller fraction on every step. At 0 the total does not decay at all.',
}));

put('vbat_sag_compensation', copy({
  title: 'Battery sag compensation',
  related: ['physics-sag', 'control-pid'],
  air: 'Betaflight holds back part of the motor output when the battery is full and releases it as the battery voltage sags, so the last minute of a flight feels more like the first. It changes what the flight controller asks for. It does not add voltage.',
  lab: 'vbat_sag_compensation is a percentage from 0 (off) to 150. In mixer.c Betaflight lowers the highest motor output the mixer may use by an amount that depends on the cell voltage: the most at 4.20 V per cell, less as the voltage falls, and nothing at 3.50 V, the battery warning voltage.',
  sim: 'Works here. The code that connects Betaflight to the physics model (bf_glue.c) gives Betaflight the voltage of each cell under load, so the compensation follows the physics model\'s sag. The Pack charge setting, on the Before you fly screen, sets each cell\'s voltage when no current flows.',
  upAir: 'A full battery feels softer, because more of its output is held back, and a sagged battery feels closer to a full one.',
  upLab: 'At 100 percent the mixer holds back about 17 percent of the motor output range at 4.20 V per cell, and less as the voltage falls (bf_stubs.c gives the calculation).',
  downAir: 'At 0 the quad gets weaker as the battery sags, as a real quad does, and Betaflight does not compensate.',
  downLab: 'At 0 the only change through a flight is the physics model\'s own battery sag. Any value above 0 makes the quad feel more even from the start of a flight to the end.',
}));

put('dyn_idle_min_rpm', copy({
  title: 'Dynamic idle minimum RPM',
  related: ['control-mixer', 'cli-dshot_idle_value', 'physics-motor'],
  air: 'The lowest speed that dynamic idle lets the slowest motor fall to. When a motor is about to drop below it, dynamic idle raises the minimum motor output, which on a real quad helps prevent a desync, where the ESC (electronic speed controller) loses track of its motor. The physics model cannot desync, but dynamic idle still runs here, on real motor speeds from the physics model.',
  lab: 'dyn_idle_min_rpm is in hundreds of RPM (revolutions per minute), so 30 means 3,000 RPM, and 0 turns dynamic idle off. mixer.c compares it with the speed of the slowest motor and raises the minimum motor output with its own small PID controller, set by dyn_idle_p_gain, dyn_idle_i_gain and dyn_idle_d_gain.',
  sim: 'Works here. getMotorFrequencyHz in bf_glue.c gives Betaflight each motor\'s speed from the physics model, with the same delay as the motor speed reports (telemetry) from a real ESC.',
  upAir: 'The motors are not allowed to slow down as much. Descents float more, and it is harder to drop fast or to land softly.',
  upLab: 'A higher minimum speed makes dynamic idle raise the motor output sooner and further.',
  downAir: 'At 0 dynamic idle is off, and the idle is set by dshot_idle_value alone.',
  downLab: 'A value of 0 turns dynamic idle off.',
}));
put('dyn_idle_p_gain', copy({
  title: 'Dynamic idle P gain',
  related: ['cli-dyn_idle_min_rpm'],
  air: 'The P gain of dynamic idle\'s controller. It raises the minimum motor output in proportion to how far the slowest motor is below dyn_idle_min_rpm.',
  lab: 'dyn_idle_p_gain is a whole number from 1 to 250. mixer.c multiplies the speed shortfall by this gain to give one part of the increase.',
  sim: 'Works here. It has an effect only when dyn_idle_min_rpm is above 0.',
  upAir: 'Dynamic idle holds the minimum motor speed more firmly. Too much can make the idle speed rise and fall repeatedly.',
  upLab: 'A higher P gives a larger increase for the same shortfall.',
  downAir: 'Dynamic idle responds more gently.',
  downLab: 'A lower P gives a smaller increase for the same shortfall.',
}));
put('dyn_idle_i_gain', copy({
  title: 'Dynamic idle I gain',
  related: ['cli-dyn_idle_min_rpm'],
  air: 'The I gain of dynamic idle\'s controller. It adds up the speed shortfall over time, so that a shortfall that lasts is corrected.',
  lab: 'dyn_idle_i_gain is a whole number from 1 to 250. In mixer.c the running total rises quickly and falls slowly, and it is kept between zero and the maximum increase.',
  sim: 'Works here. It has an effect only when dyn_idle_min_rpm is above 0.',
  upAir: 'A lasting shortfall in motor speed is removed faster. The running total can also build up and keep the idle raised after it is no longer needed.',
  upLab: 'A higher I makes the running total grow faster.',
  downAir: 'A lasting shortfall is corrected less.',
  downLab: 'A lower I makes the running total grow more slowly.',
}));
put('dyn_idle_d_gain', copy({
  title: 'Dynamic idle D gain',
  related: ['cli-dyn_idle_min_rpm'],
  air: 'The D gain of dynamic idle\'s controller. It responds to how fast the slowest motor\'s speed is changing and acts against fast changes, which reduces overshoot.',
  lab: 'dyn_idle_d_gain is a whole number from 0 to 250. mixer.c smooths the motor speed with a delay of about 20 ms before it calculates the D part.',
  sim: 'Works here. It has an effect only when dyn_idle_min_rpm is above 0.',
  upAir: 'The idle speed overshoots less, but if the motor speed signal is noisy the idle twitches more.',
  upLab: 'A higher D acts more strongly against fast changes in the slowest motor\'s speed.',
  downAir: 'Dynamic idle damps changes in motor speed less.',
  downLab: 'A lower D acts less against fast changes, and 0 turns the D part off.',
}));
put('dyn_idle_max_increase', copy({
  title: 'Dynamic idle maximum increase',
  related: ['cli-dyn_idle_min_rpm'],
  air: 'The largest amount by which dynamic idle may raise the minimum motor output above ordinary idle.',
  lab: 'dyn_idle_max_increase is in tenths of a percent of the motor output range, so 150 allows 15 percent. It applies once airmode is active. Before that, dyn_idle_start_increase is the limit.',
  sim: 'Works here. It has an effect only when dyn_idle_min_rpm is above 0. This simulator treats airmode as active from the start, so this is always the limit that applies.',
  upAir: 'Dynamic idle can raise the idle higher. On a real quad that makes a desync less likely; here it makes the quad float more in descents.',
  upLab: 'A larger value allows a larger increase.',
  downAir: 'Dynamic idle is limited more, and may not hold the minimum motor speed in a hard descent.',
  downLab: 'A smaller value caps the increase at a lower level.',
}));
put('dyn_idle_start_increase', copy({
  title: 'Dynamic idle start increase',
  related: ['cli-dyn_idle_min_rpm'],
  air: 'On a real quad, the largest amount by which dynamic idle may raise the minimum motor output before airmode is activated: from arming until the throttle first passes airmode_start_throttle_percent. After that, dyn_idle_max_increase is the limit.',
  lab: 'dyn_idle_start_increase is in tenths of a percent of the motor output range. mixer.c uses it as the limit while isAirmodeActivated() is false.',
  sim: 'Stored, not used. isAirmodeActivated() always returns true here (bf_stubs.c stands in for fc/core.c, which is not compiled), so dyn_idle_max_increase is the limit from the start.',
}));

put('ez_landing_threshold', copy({
  title: 'EZ landing threshold',
  related: ['cli-mixer_type', 'physics-ground'],
  air: 'Used when mixer_type is EZLANDING, a mixer mode that helps with landing. At low throttle it limits how far the mixer may raise the throttle to make room for roll, pitch and yaw corrections, so a quad touching down is not lifted by its own corrections. This setting is the stick movement at which that limit is lifted.',
  lab: 'In mixer.c the limit relaxes as the largest roll, pitch or yaw stick movement grows, and is gone at twice ez_landing_threshold, as a percentage of stick travel. ez_landing_limit sets the least room the mixer always has.',
  sim: 'Works here. It has an effect only when mixer_type is EZLANDING. It changes only the motor outputs: contact with the ground is worked out by the physics model, and the simulator counts crashes separately, from the impact speed.',
  upAir: 'You have to move the sticks further before the mixer gets its full range back, so at low throttle the quad has less room for corrections, including in a descent you did not mean as a landing.',
  upLab: 'A higher threshold means a larger stick movement is needed to lift the limit.',
  downAir: 'A small stick movement gives the mixer its full range back, so EZ landing does less.',
  downLab: 'A lower threshold means a smaller stick movement lifts the limit.',
}));
put('ez_landing_limit', copy({
  title: 'EZ landing limit',
  related: ['cli-ez_landing_threshold'],
  air: 'Used when mixer_type is EZLANDING. The room, as a percentage of the throttle range, that the mixer always has to raise the throttle for corrections, even with the throttle low and the sticks centred. It is the least control authority EZ landing leaves the quad.',
  lab: 'In mixer.c the upper limit on the throttle is the largest of this value, the limit from stick movement, the limit from speed and the throttle itself. Motor commands that would need more room are scaled down to fit.',
  sim: 'Works here. It has an effect only when mixer_type is EZLANDING.',
  upAir: 'The quad keeps more control authority at low throttle, and EZ landing does less.',
  upLab: 'A higher limit leaves more room before the motor commands are scaled down.',
  downAir: 'The quad has less control authority at low throttle with the sticks centred.',
  downLab: 'A lower limit scales the motor commands down more at low throttle.',
}));
put('ez_landing_speed', copy({
  title: 'EZ landing speed',
  related: ['cli-ez_landing_threshold'],
  air: 'Used when mixer_type is EZLANDING. The speed, measured by GPS, at which EZ landing stops limiting the mixer, so that a fast-moving quad keeps its full control authority.',
  lab: 'In mixer.c the limit relaxes in proportion to the GPS ground speed and is gone at 2 × ez_landing_speed / 10 metres per second, so 50 means 10 m/s. At 0 the speed is not used.',
  sim: 'Stored, not used. There is no GPS, so the speed the mixer reads is always zero. The simulator\'s own crash count uses the impact speed and does not read this either.',
}));

function crashPut(key, title, air, lab, up, down) {
  put(key, copy({
    title,
    related: ['control-pid', 'physics-ground'],
    air,
    lab,
    sim: 'Works here. The crash recovery code in pid.c runs whenever crash_recovery is not OFF. It levels the quad from Betaflight\'s record of the roll and pitch angles, which this simulator updates only in angle mode and during launch control, so in acro mode those angles are out of date. The simulator\'s own flip for a quad resting upside down, Betaflight\'s crashflip mixer (which runs only while you hold T) and the simulator setting a stuck quad down nearby are all separate from crash recovery.',
    upAir: up && up[0],
    upLab: up && up[1],
    downAir: down && down[0],
    downLab: down && down[1],
  }));
}
crashPut('crash_recovery', 'Crash recovery', 'Chooses what Betaflight does when it detects a crash, meaning the motors are at their limit and the quad is rotating fast in a way the sticks did not ask for. It is off by default.', 'The detection and the recovery are in pid.c. This simulator has no buzzer and never disarms, so BEEP acts like ON and DISARM does nothing.');
AUTHORED.crash_recovery.choices = [
  'OFF: nothing happens. This is Betaflight\'s default.',
  'ON: Betaflight takes over and steers the quad back towards level until it has settled.',
  'BEEP: the same as ON, and the buzzer sounds.',
  'DISARM: the motors are stopped instead.',
];
AUTHORED.crash_recovery.upAir = null;
crashPut('crash_dthreshold', 'Crash D threshold', 'How fast the measured rotation rate must be changing, as the D term sees it, before Betaflight counts a crash.', 'A crash is detected only when four things are true at once: the mixer is using the whole motor output range, the D term\'s input is above crash_dthreshold, the rate error is above crash_gthreshold, and the requested rate is below crash_setpoint_threshold.',
  ['A harder hit is needed before Betaflight counts a crash.', 'A higher threshold on the rate of change the D term sees.'],
  ['A smaller disturbance can count as a crash.', 'A lower threshold on the same quantity.']);
crashPut('crash_gthreshold', 'Crash gyro threshold', 'How large the rate error must be, in degrees per second, before Betaflight counts a crash. The rate error is the requested rotation rate minus the rate the gyro measures.', 'Despite its name, pid.c compares this value with the rate error, not with the gyro rate itself.',
  ['A larger rate error is needed before Betaflight counts a crash.', 'A higher threshold on the rate error.'],
  ['A smaller rate error can count as a crash.', 'A lower threshold on the rate error.']);
crashPut('crash_setpoint_threshold', 'Crash setpoint threshold', 'If you are asking for a rotation rate above this, in degrees per second, Betaflight does not count a crash, because you asked for the fast rotation.', 'pid.c compares the setpoint, the requested rotation rate, with this value. If the setpoint rises above it during crash_delay, a detected crash is cancelled.',
  ['You can ask for faster rotation before your own stick movement stops a crash being counted.', 'A higher threshold on the setpoint.'],
  ['A slower requested rotation is enough to rule a crash out.', 'A lower threshold on the setpoint.']);
crashPut('crash_time', 'Crash recovery time', 'The time, in milliseconds, after which recovery stops waiting for the quad to stop rotating.', 'Recovery ends when the quad is within crash_recovery_angle of level and has either slowed below crash_recovery_rate or been recovering for crash_time milliseconds.',
  ['Recovery can last longer.', 'A longer time before recovery stops waiting.'],
  ['Recovery gives up waiting sooner.', 'A shorter time before recovery stops waiting.']);
crashPut('crash_delay', 'Crash recovery delay', 'How long Betaflight waits, in milliseconds, after it detects a crash before recovery starts.', 'During the delay the crash is cancelled if the rate error falls below crash_gthreshold or the setpoint rises above crash_setpoint_threshold.',
  ['Recovery starts later, which gives the quad more time to sort itself out first.', 'A longer wait before recovery.'],
  ['Recovery starts sooner after a crash is detected.', 'A shorter wait before recovery.']);
crashPut('crash_recovery_angle', 'Crash recovery angle', 'How close to level the quad must be, in degrees, before recovery can end.', 'Recovery ends only when both roll and pitch are within this many degrees of level. Recovery always steers towards level; this setting decides when the quad is level enough to stop.',
  ['Recovery can end further from level.', 'A wider band around level counts as level.'],
  ['The quad has to be closer to level before recovery ends.', 'A narrower band around level counts as level.']);
crashPut('crash_recovery_rate', 'Crash recovery rate', 'How slowly the quad must be rotating, in degrees per second, before recovery can end early.', 'Recovery can end before crash_time once the rotation rate on all three axes is below this value, the mixer is no longer using the whole motor output range, and the quad is within crash_recovery_angle of level.',
  ['Recovery can end while the quad is still rotating faster.', 'A higher rate counts as settled.'],
  ['The quad has to be rotating more slowly before recovery ends early.', 'A lower rate counts as settled.']);
crashPut('crash_limit_yaw', 'Crash yaw limit', 'The largest yaw rate error, in degrees per second, that the PID controller acts on during recovery.', 'During recovery pid.c limits the yaw rate error to plus or minus this value. Recovery also holds the I term at zero on every axis.',
  ['Yaw can make a larger correction during recovery.', 'A higher limit on the yaw rate error.'],
  ['Yaw corrections during recovery are smaller.', 'A lower limit on the yaw rate error.']);

put('angle_p_gain', copy({
  title: 'Angle mode P gain',
  related: ['control-angle', 'cli-angle_limit'],
  air: 'Sets how strongly angle mode returns the quad to level, and how closely it follows the tilt you ask for with the stick. Too high and the quad oscillates, rocking back and forth. Too low and it is slow to reach the angle you ask for and slow to level.',
  lab: 'The value is stored as pid[PID_LEVEL].P and read by pidLevel, Betaflight\'s self-levelling function, when ANGLE_MODE is on. Angle mode is an outer loop: pidLevel turns the angle error, the target angle minus the measured angle, into a target rotation rate, and the ordinary rate PID controller then produces that rate.',
  sim: 'Works here. It is read only in angle mode, and acro mode never reads it. Racing with the keyboard starts in angle mode, the flight mode setting on the Quad screen chooses the mode otherwise, and the M key switches between angle and acro in flight.',
  upAir: 'The quad levels itself more firmly and reacts more sharply to the stick. Past a certain point it rocks back and forth around the target angle.',
  upLab: 'A higher P in the outer loop asks for a faster rotation for the same angle error. The quad reaches the target angle sooner and overshoots it more easily.',
  downAir: 'Angle mode feels soft. The quad takes longer to reach the tilt you ask for and to return to level.',
  downLab: 'A lower P in the outer loop asks for a slower rotation for the same angle error, so the error takes longer to close.',
}));
put('angle_feedforward', copy({
  title: 'Angle feedforward',
  related: ['cli-angle_p_gain', 'control-ff'],
  air: 'Adds feedforward to angle mode. Feedforward responds to how fast the stick is moving, so the quad starts to rotate as soon as you tilt the stick, before a difference between the target angle and the measured angle has built up.',
  lab: 'The value is stored as pid[PID_LEVEL].F, the feedforward gain of the self-levelling loop. pidLevel reads it when ANGLE_MODE is on.',
  sim: 'Works here. It is read only in angle mode.',
  upAir: 'The quad starts to tilt sooner after the stick moves, so angle mode feels more directly connected to the stick.',
  upLab: 'A higher angle F adds a larger target rotation rate for the same speed of stick movement.',
  downAir: 'The quad waits for an angle error to build up before it tilts, so it responds later.',
  downLab: 'A lower angle F leaves more of the work to angle P, which acts only once there is an angle error.',
}));
put('angle_feedforward_smoothing_ms', copy({
  title: 'Angle feedforward smoothing (ms)',
  related: ['cli-angle_feedforward'],
  air: 'Sets the smoothing time, in milliseconds, for angle mode\'s feedforward. A longer smoothing time makes the feedforward change more gradually.',
  lab: 'This is angle_feedforward_smoothing_ms. pidLevel reads it when ANGLE_MODE is on.',
  sim: 'Works here. It is read only in angle mode.',
  upAir: 'Angle feedforward acts more gently, so the start of each stick movement feels softer.',
  upLab: 'More milliseconds of smoothing make the feedforward change more slowly. That removes sudden jumps and also delays the response.',
  downAir: 'Angle feedforward follows the stick more closely, with less smoothing.',
  downLab: 'Fewer milliseconds of smoothing let the feedforward change faster, with less delay and less removal of sudden jumps.',
}));
put('angle_limit', copy({
  title: 'Angle limit',
  related: ['control-angle'],
  air: 'Sets the largest tilt, in degrees, that angle mode will ask for. This is why the quad cannot flip in angle mode.',
  lab: 'This is angle_limit, stored in the PID profile and read by pidLevel when ANGLE_MODE is on. Betaflight accepts values from 10 to 85 degrees.',
  sim: 'Works here. It is read only in angle mode.',
  upAir: 'The quad can tilt further, and angle mode starts to feel more like acro.',
  upLab: 'A higher limit raises the largest tilt that angle mode will ask for.',
  downAir: 'The quad stays flatter. Hovering is easier, but the quad cannot tilt far enough to fly through a racing gate at speed.',
  downLab: 'A lower limit reduces the largest tilt. Less of the thrust then points sideways, so the quad cannot accelerate as hard horizontally.',
}));
put('angle_earth_ref', copy({
  title: 'Angle earth reference',
  related: ['control-angle'],
  air: 'Sets how much angle mode works relative to the earth frame, directions fixed to the ground, rather than relative to the quad\'s own axes. It changes how the quad turns when you yaw while it is banked: about a vertical line fixed to the ground, or about its own tilted axis.',
  lab: 'This is angle_earth_ref, a value from 0 to 100, read by pidLevel when ANGLE_MODE is on. It sets the mix between the earth frame and the body frame, the axes fixed to the quad.',
  sim: 'Works here. It is read only in angle mode.',
  upAir: 'Angle mode works more relative to the ground, and the heading behaves differently when you yaw in a bank.',
  upLab: 'A higher value gives the earth frame a larger share of the mix.',
  downAir: 'Angle mode works more relative to the quad\'s own axes.',
  downLab: 'A lower value gives the body frame a larger share of the mix.',
}));
put('level_race_mode', copy({
  title: 'Level race mode',
  related: ['control-angle'],
  air: 'Makes angle mode level the roll axis only. Pitch is then flown as in acro, so you can tilt forward as far as you like and the quad stays there, while roll still returns to level when you let go.',
  lab: 'level_race_mode is in the PID profile. When it is ON, pid.c uses a self-level mode for roll alone (LEVEL_MODE_R), and angle mode\'s earth-referenced yaw is not used.',
  sim: 'Works here. It only makes a difference in angle mode.',
  choices: [
    'OFF: angle mode levels roll and pitch. This is Betaflight\'s default.',
    'ON: angle mode levels roll only, and pitch is flown in acro.',
  ],
}));

for (const [key, title, air] of [
  ['horizon_level_strength', 'Horizon level strength', 'Sets how strongly Horizon mode returns the quad to level. Horizon mode is a mix of acro and angle mode.'],
  ['horizon_limit_sticks', 'Horizon stick limit', 'Sets how far the stick must move before Horizon mode stops levelling the quad and behaves like acro.'],
  ['horizon_limit_degrees', 'Horizon angle limit', 'Sets the range of tilt angles, in degrees, over which Horizon mode levels the quad.'],
  ['horizon_ignore_sticks', 'Horizon ignore sticks', 'Chooses whether Horizon mode keeps levelling the quad while you move the sticks.'],
  ['horizon_delay_ms', 'Horizon delay (ms)', 'Sets the delay, in milliseconds, before Horizon mode starts levelling after you centre the sticks.'],
]) {
  put(key, copy({
    title,
    related: ['control-angle', 'start-honesty'],
    air: `${air} This simulator never switches HORIZON_MODE on. It has only acro and angle mode, and no mode in between.`,
    lab: 'The value is stored in the PID profile, in the level I and D fields (pid[PID_LEVEL]) and related fields, which pidLevel, Betaflight\'s self-levelling function, would read in Horizon mode. The simulator switches angle mode on through sim_set_angle_mode. There are no AUX channels, so no switch can turn Horizon mode on.',
    sim: 'Stored, not used. A Betaflight settings file (diff) that contains these settings still contains them when you export it, but they do not change how the quad flies.',
  }));
}

put('simplified_pids_mode', copy({
  title: 'Simplified PIDs mode',
  related: ['control-simplified'],
  air: 'Chooses which axes the simplified tuning sliders control: OFF (none), RP (roll and pitch) or RPY (roll, pitch and yaw). When it is not OFF, applying the sliders replaces the PID gains you typed for those axes.',
  lab: 'This is simplified_pids_mode in the PID profile. applySimplifiedTuning, the Betaflight function that calculates the PID gains from the sliders, is compiled into the simulator.',
  sim: 'Works here. The Betaflight default tune sets it to RPY. The expert table on the PIDs screen sets it to OFF, as Betaflight Configurator\'s expert mode does, so the gains you type there are the ones that fly.',
  choices: [
    'OFF: applying the sliders leaves every PID gain as it was typed.',
    'RP: the sliders set roll and pitch.',
    'RPY: the sliders set roll, pitch and yaw. This is Betaflight\'s default.',
  ],
}));
function simp(key, title, air) {
  put(key, copy({
    title,
    related: ['control-simplified', 'control-pid'],
    air,
    lab: 'This is one of the sliders in Betaflight\'s simplified_tuning.c. Every slider is 100 in Betaflight\'s default tune, and the usual range is 0 to 200; a tune can store other values, such as the master of 75 in the Whoop stock tune. The simplified_tuning apply command replaces the individual PID gains with values calculated from the sliders.',
    sim: 'Works here. The sliders on the PIDs screen (on the Quad screen) write this setting and then send the simplified_tuning apply command. If a diff sets the sliders without that command, the sliders change nothing and the quad flies on the gains already set, which may be the defaults. It is then easy to blame the physics model for how the tune feels.',
    upAir: 'The part of the tune this slider controls becomes stronger once the sliders are applied.',
    upLab: 'A higher multiplier gives larger gains when the simplified_tuning apply command runs.',
    downAir: 'The part of the tune this slider controls becomes weaker once the sliders are applied.',
    downLab: 'A lower multiplier gives smaller gains. A value of 0 can leave a tune that does not fly properly, so the PIDs screen stops the gain sliders at 30; only the D max and feedforward sliders can go to 0.',
  }));
}
simp('simplified_master_multiplier', 'Simplified master multiplier', 'The master slider. It raises or lowers P, I, D, D min and feedforward together and keeps the ratios between them.');
simp('simplified_i_gain', 'Simplified I slider', 'The I slider. It raises or lowers the I gains compared with the rest of the tune.');
simp('simplified_d_gain', 'Simplified D slider', 'The D slider. It raises or lowers the D gains and the D min values together.');
simp('simplified_pi_gain', 'Simplified PI slider', 'The PI slider. It raises or lowers P and I together and leaves D where it is compared with the rest of the tune.');
simp('simplified_dmax_gain', 'Simplified D max slider', 'The D max slider. It sets how far the full D value sits above D min, which decides how far D can rise in fast movements and propwash. It is stored as simplified_dmin_ratio.');
simp('simplified_feedforward_gain', 'Simplified feedforward slider', 'The feedforward (F) slider. It raises or lowers the feedforward gains.');
simp('simplified_pitch_d_gain', 'Simplified pitch D slider', 'Sets pitch D compared with roll D. In Betaflight\'s code the value is still stored under an older name, simplified_roll_pitch_ratio.');
simp('simplified_pitch_pi_gain', 'Simplified pitch PI slider', 'Sets pitch P, I and feedforward compared with roll.');
put('simplified_dterm_filter', copy({
  title: 'Simplified D-term filter',
  related: ['control-simplified', 'control-filters'],
  air: 'With ON, the D term filter slider may replace the D term low-pass filter frequencies, in Hz. A low-pass filter lets slow changes through and removes fast ones. With OFF, the frequencies you type stay as they are.',
  lab: 'This is simplified_dterm_filter in the PID profile. When it is ON, Betaflight\'s simplified_tuning.c calculates the D term filter frequencies from the slider.',
  sim: 'Works here. The Betaflight default tune turns it ON.',
  choices: [
    'ON: applying the sliders sets the D term filter cutoffs from the multiplier. This is Betaflight\'s default.',
    'OFF: the D term filter cutoffs you typed stay as they are.',
  ],
}));
put('simplified_dterm_filter_multiplier', copy({
  title: 'Simplified D-term filter multiplier',
  related: ['cli-simplified_dterm_filter'],
  air: 'The slider that sets the D term filter cutoffs. Each cutoff becomes Betaflight\'s default cutoff for that filter multiplied by this value divided by 100, so 100 gives the defaults and a higher value gives higher cutoffs and less filtering.',
  lab: 'This is simplified_dterm_filter_multiplier, from 10 to 200. simplified_tuning.c rewrites only the D term filters that are switched on: the dynamic minimum and maximum if the dynamic cutoff is on, the static cutoff of filter 1 if it is not 0, and the cutoff of filter 2 if it is not 0.',
  sim: 'Works here. It has an effect only when simplified_dterm_filter is ON.',
  upAir: 'Higher cutoffs: less smoothing and less delay on the D term, and more noise let through.',
  upLab: 'Every D term cutoff the slider writes rises in proportion.',
  downAir: 'Lower cutoffs: more smoothing and more delay on the D term.',
  downLab: 'Every D term cutoff the slider writes falls in proportion.',
}));
put('simplified_gyro_filter', copy({
  title: 'Simplified gyro filter',
  related: ['control-filters'],
  air: 'With ON, the gyro filter slider may replace the gyro low-pass filter frequencies, in Hz. A low-pass filter lets slow changes through and removes fast ones. With OFF, the frequencies you type stay as they are.',
  lab: 'This is simplified_gyro_filter. It is stored in Betaflight\'s gyro settings (gyroConfig), not in the PID profile.',
  sim: 'Works here. The Betaflight default tune and the three whoop tunes all turn it ON.',
  choices: [
    'ON: applying the sliders sets the gyro filter cutoffs from the multiplier. This is Betaflight\'s default.',
    'OFF: the gyro filter cutoffs you typed stay as they are.',
  ],
}));
put('simplified_gyro_filter_multiplier', copy({
  title: 'Simplified gyro filter multiplier',
  related: ['cli-simplified_gyro_filter'],
  air: 'The slider that sets the gyro filter cutoffs. Each cutoff becomes Betaflight\'s default cutoff for that filter multiplied by this value divided by 100, so 100 gives the defaults and a higher value gives higher cutoffs and less filtering.',
  lab: 'This is simplified_gyro_filter_multiplier, from 10 to 200, stored in Betaflight\'s gyro settings. simplified_tuning.c rewrites only the gyro filters that are switched on, in the same way as the D term slider.',
  sim: 'Works here. It has an effect only when simplified_gyro_filter is ON. The Betaflight default tune sets it to 100, and the whoop tunes set 110 or 120.',
  upAir: 'Higher cutoffs: less smoothing and less delay on the gyro signal, and more noise let through.',
  upLab: 'Every gyro cutoff the slider writes rises in proportion.',
  downAir: 'Lower cutoffs: more smoothing and more delay on the gyro signal.',
  downLab: 'Every gyro cutoff the slider writes falls in proportion.',
}));

put('gyro_hardware_lpf', copy({
  title: 'Gyro hardware low-pass filter',
  related: ['control-filters', 'start-honesty'],
  air: 'On a real flight controller this chooses the analog or on-chip low-pass filter inside the gyro chip, such as an ICM or MPU chip, which acts before the reading reaches Betaflight. A low-pass filter lets slow changes through and removes fast ones. The options are NORMAL, OPTION_1, OPTION_2 and EXPERIMENTAL.',
  lab: 'This is gyro_hardware_lpf. The simulator has no gyro chip, and the digital gyro path that feeds Betaflight does not read this setting.',
  sim: 'Stored, not used. The value is kept in Betaflight\'s gyro settings (gyroConfig). The simulated gyro, built like the one in Betaflight\'s own software-in-the-loop (SITL) simulator, takes the rotation rate from the physics model as a decimal number and rounds it like a 16-bit gyro chip that measures up to 2,000 degrees per second in either direction.',
}));
put('gyro_filter_debug_axis', copy({
  title: 'Gyro filter debug axis',
  related: ['start-honesty'],
  air: 'Chooses which axis, ROLL, PITCH or YAW, a debug recording shows when developers work on Betaflight\'s gyro filters.',
  lab: 'This is gyro_filter_debug_axis. Only DEBUG_SET, the Betaflight code that writes values into the blackbox debug channels, would read it. Blackbox debug output does not control the flight here.',
  sim: 'Stored, not used. The value is kept in Betaflight\'s gyro settings, and nothing in the flight calculation reads it.',
}));
put('yaw_spin_recovery', copy({
  title: 'Yaw spin recovery',
  related: ['physics-yaw', 'control-pid'],
  air: 'Stops an uncontrolled yaw spin, the kind that can follow a hard hit. When the gyro reads a yaw rate above the threshold, Betaflight sets the yaw target to zero, clears the I term on every axis, switches off P, D and feedforward on roll and pitch, and lets yaw P use the whole motor range to stop the spin. It ends once the yaw rate has stayed 100 degrees per second below the threshold for 20 ms.',
  lab: 'The detection is in sensors/gyro.c and the response in pid.c and mixer.c, all compiled into the simulator.',
  sim: 'Works here. The physics model will spin the quad as fast as the motors can, and this adds no damping of its own: it only changes what the controller does.',
  choices: [
    'AUTO: the threshold is worked out from your maximum yaw rate, plus a quarter of it or 200 degrees per second, whichever is more. yaw_spin_threshold is not used. This is Betaflight\'s default.',
    'ON: the threshold is yaw_spin_threshold.',
    'OFF: Betaflight never steps in.',
  ],
}));
put('yaw_spin_threshold', copy({
  title: 'Yaw spin threshold',
  related: ['cli-yaw_spin_recovery'],
  air: 'The yaw rate, in degrees per second, above which yaw spin recovery treats the quad as spinning out of control.',
  lab: 'This is yaw_spin_threshold, stored in Betaflight\'s gyro settings and read by the yaw spin check in sensors/gyro.c.',
  sim: 'Works here. It is used only when yaw_spin_recovery is ON; AUTO works out its own threshold.',
  upAir: 'Recovery is harder to trigger, so you can yaw faster on purpose without it acting.',
  upLab: 'A higher threshold means the yaw rate must be higher before recovery starts.',
  downAir: 'Recovery triggers more easily in a fast yaw. Below your own maximum yaw rate, full yaw stick would trigger it.',
  downLab: 'A lower threshold lets a slower yaw rate start recovery.',
}));

put('rates_type', copy({
  title: 'Rates type',
  figure: 'pid',
  related: ['control-rates', 'cli-roll_srate'],
  air: 'Chooses the formula that turns stick position into rotation rate: BETAFLIGHT, RACEFLIGHT, KISS, ACTUAL or QUICK. The same three numbers give a different curve under each type. ACTUAL is the type whose maximum rate is exactly the number shown at full stick, and the Rates menu in Settings writes ACTUAL unless you choose another type there.',
  lab: 'rates_type selects one of the apply*Rates functions in fc/rc.c, and all five are compiled. The rates graph is drawn by a JavaScript copy of those formulas (src/fc/ratescurve.js), which is used only for drawing and does not fly the quad.',
  sim: 'Works here. Check 9, one of the automatic tests, reads the maximum roll rate from its own diff file and checks that full stick reaches it to within 3 percent. The same rc_rate, srate and expo numbers give a different curve under a different type, which is why the Rates type row in Settings loads the new type\'s own default numbers when you change it.',
  choices: [
    'BETAFLIGHT: RC rate, super rate and RC expo, Betaflight\'s original curve.',
    'RACEFLIGHT: the curve from RaceFlight. RC rate sets the rotation rate, rate adds more of it towards full stick, and expo bends the middle.',
    'KISS: the curve from the KISS flight controller, with an RC rate, a rate and an RC curve.',
    'ACTUAL: centre sensitivity, maximum rate and expo, each meaning exactly what it says. The Rates menu in Settings writes this type unless you choose another.',
    'QUICK: an RC rate and a maximum rate, with expo applied as quickrates_rc_expo chooses.',
  ],
}));
put('quickrates_rc_expo', copy({
  title: 'Quick rates RC expo',
  related: ['cli-rates_type'],
  air: 'Decides where QUICK rates apply expo. The other rate types ignore it.',
  lab: 'Stored as quickRatesRcExpo and read in applyQuickRates in fc/rc.c. The drawing copy of the formula is applyQuickRates in src/fc/ratescurve.js.',
  sim: 'Works here, and it matters only when rates_type is QUICK. The Rates menu in Settings writes it as OFF every time it writes the rate profile.',
  choices: [
    'OFF: expo bends only the part of the curve that rises towards the maximum rate, and the stick position itself is used as it is. This is Betaflight\'s default, and the curve the rates graph draws.',
    'ON: expo is applied to the stick position first, as the BETAFLIGHT type applies RC expo, and the rise towards the maximum rate uses the raw stick.',
  ],
}));

function rateAxis(axis) {
  const a = axisNoun(axis);
  put(`${axis}_rc_rate`, copy({
    title: `${a.Axis} RC rate (centre)`,
    related: ['control-rates', `cli-${axis}_srate`, `cli-${axis}_expo`],
    air: `On ACTUAL rates this is the ${a.axis} centre sensitivity, in tens of deg/s: how fast the rotation rate rises as the stick leaves the centre. A value of 7 means that near the centre the rate rises as steeply as a straight line that would reach 70 deg/s at full stick. It is the slope of the curve at the middle, not the rate at half stick.`,
    lab: `Stored in rcRates[FD_${a.Axis.toUpperCase()}] as a whole number up to 255. On ACTUAL, centre sensitivity = rc_rate × 10. The other types use the number differently: see applyBetaflightRates and the other rate functions in fc/rc.c.`,
    sim: 'Works here. It is set on the Rates menu in Settings. Roll and pitch share one value unless you turn on Separate pitch, and yaw has its own.',
    upAir: `The quad's ${a.axis} becomes twitchier near the centre of the stick, and fine aiming gets harder.`,
    upLab: 'On ACTUAL, the straight-line part of the curve near the centre becomes steeper.',
    downAir: `The centre feels softer. Small corrections need larger movements of ${a.stick}.`,
    downLab: 'The slope at the centre is shallower. On ACTUAL the maximum rate is still set by srate.',
  }));
  put(`${axis}_srate`, copy({
    title: `${a.Axis} super rate (maximum)`,
    related: ['control-rates', `cli-${axis}_rc_rate`],
    air: `On ACTUAL rates, the ${a.axis} rate at full stick is srate × 10 deg/s, so 67 means 670 deg/s. On roll, this is the number check 9 tests.`,
    lab: `Stored in rates[FD_${a.Axis.toUpperCase()}]. On ACTUAL, the rate at full stick is exactly srate × 10. Super rate on the BETAFLIGHT type is a different equation, so a value cannot simply be carried across from one type to the other.`,
    sim: 'Works here. The default is 67 on all three axes. Tune files carry no rate profile, so the Rates menu in Settings sets this value whichever tune you fly.',
    upAir: `Full stick gives faster ${a.motion}, so flips and turns take less time. Aiming near the end of the stick travel gets harder.`,
    upLab: 'The setpoint at full stick, the target rate, is higher. The physics model has to be able to follow it; if it cannot, motors reach full power and the gyro rate falls behind the target.',
    downAir: `Rotation at full stick is slower. Aiming is easier and quick flips take longer. A five inch quad can still turn hard enough to produce a large g-force.`,
    downLab: 'Check 12 tests this setting on purpose. It flies two diff files that differ only in srate, and the maximum roll rates must be in the same ratio as the two values, to within 2 percent.',
  }));
  put(`${axis}_expo`, copy({
    title: `${a.Axis} expo`,
    related: ['control-rates', `cli-${axis}_rc_rate`],
    air: `On ACTUAL rates, expo bends the ${a.axis} curve so that the middle of the stick gives gentler rotation while full stick still reaches the maximum rate. At 0 there is no extra bend, but the rate is still not in direct proportion to the stick unless centre sensitivity and maximum rate match.`,
    lab: `Stored in rcExpo[FD_${a.Axis.toUpperCase()}], from 0 to 100 as a percentage. ACTUAL blends in the fifth power of the stick position, and the BETAFLIGHT type uses the cube, so the same expo number does not mean the same thing on both.`,
    sim: 'Works here. The default is 0.',
    upAir: `The middle of ${a.stick} gives less rotation, so precise aiming is easier. With too much, small movements near the centre seem to do almost nothing.`,
    upLab: 'A higher expo gives the fifth-power term (expof) more weight in the ACTUAL formula.',
    downAir: 'At 0 the curve keeps the shape that centre sensitivity and maximum rate give it, with no extra bend.',
    downLab: 'The lowest value is 0, which adds no bend.',
  }));
  put(`${axis}_rate_limit`, copy({
    title: `${a.Axis} rate limit`,
    related: [`cli-${axis}_srate`],
    air: `A cap, in deg/s, on the ${a.axis} setpoint (the target rotation rate), applied after the rates curve. The default of 1998 is effectively off for any sensible maximum rate.`,
    lab: `Stored in rate_limit[FD_${a.Axis.toUpperCase()}]. The highest allowed value is CONTROL_RATE_CONFIG_RATE_LIMIT_MAX, 1998.`,
    sim: 'Works here. None of the simulator\'s menus change it, so it stays at Betaflight\'s default of 1998.',
    upAir: 'Raising it toward 1998 removes the extra cap.',
    upLab: 'A cap above the highest rate the curve can reach has no effect.',
    downAir: `A lower limit caps ${a.axis} below the rate srate asks for. It can be a deliberate safety setting, or a surprise if you forget it is there.`,
    downLab: 'On ACTUAL, a roll limit below srate × 10 would make check 9 fail, because full stick could no longer reach the set maximum rate.',
  }));
}
rateAxis('roll');
rateAxis('pitch');
rateAxis('yaw');

put('thr_mid', copy({
  title: 'Throttle mid',
  related: ['cli-thr_expo', 'cli-throttle_limit_type', 'physics-airframe'],
  air: 'Moves the point that Betaflight treats as the middle of the throttle curve, where thr_expo makes the curve flattest. With thr_expo set, putting thr_mid at your hover throttle gives the stick the most travel around hover.',
  lab: 'thrMid8, from 0 to 100, stored in hundredths, so 50 means 0.50. It is the pivot of the throttle curve that fc/rc.c builds for rcLookupThrottle.',
  sim: 'Works here, and it is set on the Rates menu in Settings. At the normal Weight setting the five inch hovers at about 35 percent of the stick, so with thr_mid at 50 and no expo, hover sits about a third of the way up the stick.',
  upAir: 'If thr_expo is also set, the flat part of the curve moves up the stick.',
  upLab: 'A higher mid moves the pivot of the throttle curve up the stick.',
  downAir: 'The pivot moves down the stick. Pilots who hover low often bring it down toward their hover point, so that thr_expo softens the part of the travel they use most.',
  downLab: 'A lower mid moves the pivot of the throttle curve down the stick.',
}));
put('thr_expo', copy({
  title: 'Throttle expo',
  related: ['cli-thr_mid'],
  air: 'Bends the throttle curve so that the stick is gentler around the mid point, set by thr_mid. It does not add motor range. A SCALE throttle limit is the other way to give hover more of the stick.',
  lab: 'thrExpo8, from 0 to 100, stored in hundredths. It flattens the throttle curve around thr_mid and steepens the ends. 0 is a straight line.',
  sim: 'Works here, and it is set on the Rates menu in Settings.',
  upAir: 'The throttle is softer around the mid point.',
  upLab: 'More expo flattens the curve more around thr_mid.',
  downAir: 'The throttle curve gets closer to a straight line, and at 0 it is straight.',
  downLab: '0 is the factory setting: no bend.',
}));
put('throttle_limit_type', copy({
  title: 'Throttle limit type',
  related: ['control-rates', 'cli-throttle_limit_percent', 'physics-airframe'],
  air: 'Chooses how throttle_limit_percent limits the throttle. SCALE spreads the whole stick travel from zero up to the cap, which puts hover higher up the stick on a quad with far more thrust than it needs to hover.',
  lab: 'applyThrottleLimit in mixer.c. SCALE: output = stick × cap. CLIP: output = the smaller of stick and cap.',
  sim: 'Works here. The Throttle limit row on the Rates menu in Settings writes SCALE when the cap is below 100 and OFF at 100, so CLIP cannot be chosen there.',
  choices: [
    'OFF: no limit. The five inch then has its full thrust, about 8 times its weight under Earth\'s gravity and about 5 times at the normal Weight setting.',
    'SCALE: the throttle is multiplied by the cap, so every part of the stick changes the throttle less.',
    'CLIP: the throttle stops at the cap. The stick below the cap is unchanged, and the top of the stick does nothing.',
  ],
}));
put('throttle_limit_percent', copy({
  title: 'Throttle limit percent',
  related: ['cli-throttle_limit_type'],
  air: 'The cap on the throttle. 100 means no cap. With SCALE and no throttle expo, hover moves up the stick in proportion to the cap: a hover that needs 35 percent of the stick with no cap needs about 58 percent with a cap of 60.',
  lab: 'throttle_limit_percent, from 25 to 100, used with SCALE or CLIP.',
  sim: 'Works here. It is the Throttle limit row on the Rates menu in Settings, which offers caps from 40 to 100 and shows where hover sits on the stick. At the normal Weight setting the five inch hovers at about 35 percent of the stick and has thrust to spare, which is why the row exists.',
  upAir: 'Toward 100 the quad has more punch, and the throttle around hover gets twitchier.',
  upLab: 'A higher cap lets full stick command more of the motors\' range.',
  downAir: 'Less punch, and more stick travel around hover. You will not win a full-throttle climbing contest at 40 percent, and that is the intention.',
  downLab: 'A lower cap reduces the throttle at full stick. Check 6 is a full-throttle climb for 3 seconds that must gain 55 to 85 m, so a very low cap would fail it. The automatic checks use their own diff file, not your settings.',
}));

put('rc_smoothing', copy({
  title: 'RC smoothing',
  related: ['physics-radio', 'control-ff'],
  air: 'Smooths the stick signal between radio packets. Betaflight filters the setpoint, the feedforward and the throttle separately. In auto mode it sets each filter\'s cutoff from the measured packet rate.',
  lab: 'rc_smoothing, plus the auto factors and a separate manual cutoff for each path. The code is in fc/rc.c, which is compiled.',
  sim: 'Works here. The default perfect link does not test auto smoothing properly, because its packets arrive at perfectly even times. Choose an ELRS preset in the Radio link setting to see it work.',
  choices: [
    'ON: the sticks are smoothed. This is Betaflight\'s default.',
    'OFF: each packet reaches the setpoint as a step, and uneven packet timing becomes a jump in the setpoint.',
  ],
}));
put('rc_smoothing_auto_factor', copy({
  title: 'RC smoothing auto factor (roll, pitch, yaw)',
  related: ['cli-rc_smoothing'],
  air: 'Sets how much auto smoothing filters roll, pitch and yaw. A higher value gives a lower cutoff: more smoothing, and a later response.',
  lab: 'Stored as rc_smoothing_auto_factor_rpy. fc/rc.c sets the setpoint and feedforward cutoffs to the measured packet rate × 1.5 / (1 + factor / 10). At 250 packets a second and the default of 30 that is about 94 Hz.',
  sim: 'Works here. With the perfect radio link the packet rate is exactly 250 per second.',
  upAir: 'The sticks feel smoother and slightly later.',
  upLab: 'A higher factor lowers both cutoffs.',
  downAir: 'The sticks feel more direct, with less smoothing.',
  downLab: 'A lower factor raises both cutoffs.',
}));
put('rc_smoothing_auto_factor_throttle', copy({
  title: 'RC smoothing auto factor (throttle)',
  related: ['cli-rc_smoothing'],
  air: 'The throttle version of the auto factor. A higher value gives a lower cutoff on the throttle: a smoother, later response to a punch.',
  lab: 'Stored as rc_smoothing_auto_factor_throttle. fc/rc.c sets the throttle cutoff to the measured packet rate × 1.5 / (1 + factor / 10).',
  sim: 'Works here.',
  upAir: 'The throttle feels smoother and slightly later.',
  upLab: 'A higher factor lowers the throttle cutoff.',
  downAir: 'Throttle changes pass through with less smoothing.',
  downLab: 'A lower factor raises the throttle cutoff.',
}));
put('rc_smoothing_setpoint_cutoff', copy({
  title: 'RC smoothing setpoint cutoff',
  related: ['cli-rc_smoothing'],
  air: 'A cutoff frequency in Hz that you set by hand for the setpoint filter, in place of auto. 0 means auto. A higher cutoff means less smoothing.',
  lab: 'rc_smoothing_setpoint_cutoff. In Betaflight 4.5, 0 means the cutoff is chosen automatically.',
  sim: 'Works here.',
  upAir: 'If it is not 0 and is above the auto value, the sticks feel less smoothed.',
  upLab: 'A higher cutoff lets faster changes through the filter.',
  downAir: 'The sticks feel smoother, and at 0 the filter goes back to auto.',
  downLab: 'A lower cutoff removes more of the fast changes. At 0 the cutoff is set automatically.',
}));
put('rc_smoothing_feedforward_cutoff', copy({
  title: 'RC smoothing feedforward cutoff',
  related: ['cli-rc_smoothing', 'control-ff'],
  air: 'The filter on the rate of change of the stick, which becomes feedforward. Jitter, the uneven timing of radio packets, affects this filter first.',
  lab: 'rc_smoothing_feedforward_cutoff. 0 means auto.',
  sim: 'Works here.',
  upAir: 'Feedforward follows the stick more closely, with less smoothing.',
  upLab: 'A higher cutoff lets faster changes in the stick\'s rate of change reach feedforward.',
  downAir: 'Feedforward is calmer, and it arrives later.',
  downLab: 'A lower cutoff smooths the rate of change more. At 0 the cutoff is set automatically.',
}));
put('rc_smoothing_throttle_cutoff', copy({
  title: 'RC smoothing throttle cutoff',
  related: ['cli-rc_smoothing'],
  air: 'A cutoff frequency in Hz that you set by hand for the throttle smoothing filter. 0 means auto.',
  lab: 'Stored as rc_smoothing_throttle_cutoff.',
  sim: 'Works here.',
  upAir: 'The throttle is less smoothed.',
  upLab: 'A higher cutoff lets faster throttle changes through.',
  downAir: 'The throttle is smoother.',
  downLab: 'A lower cutoff smooths the throttle more. At 0 the cutoff is set automatically.',
}));

put('mid_rc', copy({
  title: 'Mid RC',
  related: ['cli-min_check', 'physics-radio'],
  air: 'The PWM value that Betaflight treats as the stick centre, usually 1500. PWM is the older radio signal, in which each stick position is a number from 1000 to 2000. The simulator\'s sticks run from −1 to 1, but this setting still decides where Betaflight thinks the centre is.',
  lab: 'midrc, from 1200 to 1700. bf_glue.c, the code that connects Betaflight to the physics, writes each stick as 1500 + 500 × its position, so the centre always arrives as 1500.',
  sim: 'Works here. The joystick path is not a PWM radio, but a mid_rc far from 1500 still moves where Betaflight thinks the centre is.',
  upAir: 'Betaflight\'s centre moves up the PWM scale, so a centred stick no longer reads as centre.',
  upLab: 'A higher midrc moves the centre up.',
  downAir: 'The centre moves down the PWM scale. The effect can look like trim.',
  downLab: 'A lower midrc moves the centre down. Leave it at 1500 unless you know your radio centres somewhere else.',
}));
put('min_check', copy({
  title: 'Min check',
  related: ['cli-mid_rc', 'cli-max_check'],
  air: 'The throttle value, on the 1000 to 2000 scale, below which Betaflight treats the throttle as zero. Betaflight stretches the throttle above it to cover the whole range, so the bottom of the stick travel up to this point is a dead zone.',
  lab: 'Stored as mincheck. fc/rc.c maps the throttle from min_check to 2000 onto the full throttle range. On a real flight controller core.c also uses it to decide when the throttle is low, for arming and for the I term reset without airmode.',
  sim: 'Works here, through fc/rc.c. The simulator sends each stick as 1500 + 500 × its position, so a throttle stick at the bottom arrives as 1000.',
  upAir: 'More of the bottom of the throttle stick does nothing, and the rest of the travel gives slightly larger steps.',
  upLab: 'A higher mincheck raises the point where the throttle starts.',
  downAir: 'Less of the bottom of the stick is dead zone.',
  downLab: 'At 1000 there is no dead zone at the bottom. Keep it below max_check.',
}));
put('max_check', copy({
  title: 'Max check',
  related: ['cli-min_check'],
  air: 'The stick value, on the 1000 to 2000 scale, above which Betaflight treats a stick as at its maximum. It is used for stick commands, such as arming or calibrating with the sticks, and by the RPM limiter.',
  lab: 'Stored as maxcheck in the receiver settings.',
  sim: 'Stored, not used. The stick commands are in fc/core.c, which is not compiled, and the RPM limiter does not run here.',
}));
put('airmode_start_throttle_percent', copy({
  title: 'Airmode start throttle (%)',
  related: ['control-tpa', 'cli-pid_at_min_throttle'],
  air: 'On a real quad with airmode on, airmode does not start until the throttle first passes this percentage after arming, so that a quad sitting on the ground at zero throttle does not react to every bump.',
  lab: 'Stored as airModeActivateThreshold in the receiver settings. fc/core.c compares the throttle with it and latches airmode on once the throttle passes it.',
  sim: 'Stored, not used. fc/core.c is not compiled, and its stand-in, isAirmodeActivated in bf_stubs.c, always reports airmode as active, so airmode works from zero throttle whatever this is set to.',
}));
put('fpv_mix_degrees', copy({
  title: 'FPV mix degrees',
  related: ['physics-lens', 'start-honesty'],
  air: 'On a real flight controller this mixes the camera tilt into roll and yaw, so that "left" in the goggles is left along the horizon. This simulator never switches on the mode that uses it (BOXFPVANGLEMIX), so you correct for the camera tilt yourself as you fly.',
  lab: 'Stored in rxConfig.fpvCamAngleDegrees. fc/rc.c would mix it in if the mode were on.',
  sim: 'Stored, not used. The Camera angle setting on the Quad screen is the camera mount, a different number, and it does change what you see, because it sets the view the renderer draws.',
}));

put('dshot_idle_value', copy({
  title: 'DShot idle',
  related: ['control-mixer', 'physics-motor', 'cli-dyn_idle_min_rpm'],
  air: 'The lowest command the mixer sends to a motor, in DShot units: percent times 100, so 550 is 5.5 percent. The motors spin at this idle whenever the quad is armed, so they still have room to slow down for a correction at zero throttle.',
  lab: 'Stored as digitalIdleOffsetValue. motorInitEndpoints in bf_glue.c, the code that connects Betaflight to the physics, sets the motor range from DShot values, not from the PWM setting min_throttle.',
  sim: 'Works here.',
  upAir: 'The motors spin faster at idle. The quad floats more and descends more slowly at low throttle, and yaw is stronger at the bottom of the throttle.',
  upLab: 'A higher digital idle raises the lowest power a motor can receive.',
  downAir: 'The motors come closer to stopping at idle. Drops are quicker and yaw feels weak at the bottom. On a real electronic speed controller (ESC), a very low idle risks a desync, where the ESC loses track of the motor; that is not modelled.',
  downLab: 'A lower idle lowers the lowest power a motor can receive. The physics model spins the motor at whatever power it is given and cannot desync.',
}));
put('motor_kv', copy({
  title: 'Motor kV',
  related: ['physics-airframe', 'physics-motor', 'start-honesty'],
  air: 'The kV figure on a motor\'s label: its speed in RPM for each volt, with nothing attached. Real setup pages ask for it, and people often type a new value here expecting the quad to fly differently. The physics model\'s motor constant is a value under load, not 60/(2π kV).',
  lab: 'Stored in motorConfig.kv. Each aircraft\'s motor constant ke is fixed in the physics model and does not depend on this setting: on the five inch it is 0.006336 V s/rad.',
  sim: 'Stored, not used. The motors belong to the aircraft chosen with the Aircraft row at the top of the Quad screen, and typing a different kV does not change them.',
}));
put('motor_poles', copy({
  title: 'Motor poles',
  related: ['cli-motor_kv', 'cli-rpm_filter_harmonics'],
  air: 'The number of magnetic poles in the motor. A real flight controller uses it to convert the electrical RPM (eRPM) that an ESC reports into the motor\'s real RPM.',
  lab: 'Stored as motorPoleCount. Here the motor speed in revolutions per second comes straight from the physics model, so the RPM filter does not need the pole count.',
  sim: 'Stored, not used.',
}));
put('min_throttle', copy({
  title: 'Min throttle (PWM)',
  related: ['cli-dshot_idle_value', 'start-honesty'],
  air: 'The lowest motor output for the older PWM motor signal. DShot idle replaced it for digital motor protocols.',
  lab: 'Stored in motorConfig.minthrottle. motorInitEndpoints in bf_glue.c uses DShot values instead.',
  sim: 'Stored, not used.',
}));
put('max_throttle', copy({
  title: 'Max throttle (PWM)',
  related: ['cli-min_throttle'],
  air: 'The highest motor output for the older PWM motor signal.',
  lab: 'Stored as maxthrottle. The DShot motor path used here does not read it.',
  sim: 'Stored, not used.',
}));
put('min_command', copy({
  title: 'Min command (PWM)',
  related: ['cli-min_throttle'],
  air: 'The PWM value sent to a stopped motor, below idle: the "off" signal for the older PWM motor protocol.',
  lab: 'Stored as mincommand. With DShot, stopping a motor is a DShot command, not this value.',
  sim: 'Stored, not used.',
}));

put('mixer_type', copy({
  title: 'Mixer type',
  figure: 'mixer',
  related: ['control-mixer', 'cli-ez_landing_threshold'],
  air: 'Decides how the mixer fits the PID corrections and the throttle into the motor range when they do not fit as they are.',
  lab: 'mixer_type chooses the adjustment in mixer.c, which is compiled: LEGACY uses applyMixerAdjustment, LINEAR and DYNAMIC use applyMixerAdjustmentLinear, and EZLANDING uses applyMixerAdjustmentEzLand.',
  sim: 'Works here.',
  choices: [
    'LEGACY: if the corrections need more than the whole motor range, they are scaled down to fit, and then the throttle is moved up or down so every motor fits. This is Betaflight\'s default.',
    'LINEAR: the corrections are also shifted with the throttle. At low throttle they are made mostly by speeding motors up, and at high throttle mostly by slowing them down, by the same amount on every motor.',
    'DYNAMIC: the same shift, but each motor is shifted by the size of its own correction.',
    'EZLANDING: a landing aid. At low throttle with the sticks near centre it limits how far the mixer may raise the throttle to make room for corrections, so a quad touching down is not lifted by them.',
  ],
}));
put('yaw_motors_reversed', copy({
  title: 'Yaw motors reversed',
  related: ['physics-yaw', 'start-loop'],
  air: 'Reverses the sign of yaw in the mixer, for propellers that spin "props out" instead of "props in". If it does not match the direction the motors spin on the quad, yaw runs away: the yaw correction pushes the wrong way and the quad spins faster and faster.',
  lab: 'yaw_motors_reversed. When it is OFF, mixer.c reverses the sign of the yaw PID output, which matches the props-in motor directions in the physics model.',
  sim: 'Works here. The physics model\'s motor spin directions do not change with this setting, so turning it on makes yaw run away. Betaflight and the physics model then disagree about which way the motors spin, and fixing that disagreement on a real quad is what this setting is for.',
  choices: [
    'OFF: the propellers spin props in, which is what the physics model has. This is Betaflight\'s default.',
    'ON: for props out. Here it makes yaw run away, because the physics model\'s propellers do not change direction with it.',
  ],
}));
put('crashflip_motor_percent', copy({
  title: 'Crashflip motor percent',
  related: ['cli-crash_recovery', 'start-honesty'],
  air: 'Sets how much power turtle mode gives to the motors that are not doing the flip. Turtle mode, which Betaflight calls crashflip, spins the motors on one side of an upside-down quad to roll it back over. At 0 the other motors stay stopped.',
  lab: 'Betaflight\'s turtle code, applyFlipOverAfterCrashModeToMotors in mixer.c, turns the pitch and roll stick positions into a flip power and sends it to the motors on one side. The motors on the other side receive crashflip_motor_percent of that power, or nothing when the setting is 0.',
  sim: 'Works here. Hold the T key and Betaflight\'s turtle mode takes over the mixer: the pitch and roll sticks spin the motors on one side, and this setting is read. The automatic flip that plays when the quad comes to rest upside down is separate and does not read it. DShot reverse, which runs the motors backwards in turtle mode on a real quad, is not modelled.',
  upAir: 'With T held, the motors on the other side spin as well, faster the higher you set it.',
  upLab: 'Those motors get a larger share of the flip power. At 100 they receive the same power as the motors doing the flip.',
  downAir: 'The other motors spin more slowly in turtle mode, and at 0 they stay stopped.',
  downLab: 'At 0, Betaflight gives the other motors no power, so only the motors on one side turn.',
}));
put('crashflip_expo', copy({
  title: 'Crashflip expo',
  related: ['cli-crashflip_motor_percent'],
  air: 'Expo on the sticks in turtle mode. Expo bends the stick curve so that small stick movements give less motor power, while full stick still gives full power.',
  lab: 'crashflip_expo, from 0 to 100. applyFlipOverAfterCrashModeToMotors in mixer.c blends each stick position between a straight line and its cube: at 0 the flip power follows the stick in a straight line, and at 100 it follows the cube. The small dead zone around the centre goes through the same curve.',
  sim: 'Works here. It shapes the pitch and roll sticks while turtle mode is held on the T key. The automatic flip that plays when the quad comes to rest upside down does not read it.',
  upAir: 'Small stick movements in turtle mode give less motor power, which makes gentle nudges easier. Full stick still gives full power.',
  upLab: 'More of the curve follows the cube of the stick position, which is flat near the centre.',
  downAir: 'The motors respond more directly to small stick movements in turtle mode.',
  downLab: 'At 0 the flip power follows the stick in a straight line.',
}));

put('runaway_takeoff_prevention', copy({
  title: 'Runaway takeoff prevention',
  related: ['start-honesty'],
  air: 'A safety check that disarms the quad if, just after arming, the PID controller is at its limit and the quad keeps rotating away from what it is asked for. That is what happens when the motors are in the wrong order, spin the wrong way, or the board is mounted in the wrong direction.',
  lab: 'Stored as runaway_takeoff_prevention. The code that acts on it is in fc/core.c, which is not compiled. It stops watching once the quad has flown normally for a while (runaway_takeoff_deactivate_delay and runaway_takeoff_deactivate_throttle_percent).',
  sim: 'Stored, not used. The quad is always armed, and its motor order and directions are fixed in the physics model.',
}));

const FEATURE_COPY = {
  AIRMODE: copy({
    title: 'Feature AIRMODE',
    related: ['control-tpa', 'control-mixer'],
    air: 'Airmode keeps the PID controller at full strength at zero throttle, so a flip or a roll with the throttle cut stays under control. Without it, Betaflight gives the PID corrections half their usual share of the motor range at zero throttle, rising to all of it at half throttle, and a real flight controller also resets the I term whenever the throttle stick is at the bottom.',
    lab: 'This is the line feature AIRMODE in a settings file. mixer.c reads it through airmodeIsEnabled(). With or without it, the mixer moves the throttle up or down so that every motor\'s command fits between idle and full power; airmode decides how large the corrections may be at low throttle.',
    sim: 'Works here, as a CLI feature line. The I term reset at the bottom of the stick is in fc/core.c, which is not compiled, so turning airmode off here changes only the mixer\'s share.',
    choices: [
      'ON: the PID corrections keep their full share of the motor range at every throttle position. This is the usual setting for racing and freestyle.',
      'OFF: below half throttle the corrections get a smaller share, down to half at zero throttle, so a flip with the throttle cut is less well controlled.',
    ],
  }),
  ANTI_GRAVITY: copy({
    title: 'Feature ANTI_GRAVITY',
    related: ['cli-anti_gravity_gain', 'control-tpa'],
    air: 'The main switch for anti-gravity, which raises I, and P on roll and pitch, while the throttle is changing quickly, so that the quad does not tip in pitch or roll when you punch.',
    lab: 'This is the line feature ANTI_GRAVITY in a settings file. On a real flight controller, fc/core.c switches anti-gravity on when this feature is set or when the ANTI GRAVITY mode is on a switch.',
    sim: 'Works here, as a CLI feature line. bf_glue.c switches anti-gravity on from this feature in the same way, and there is no mode switch.',
    choices: [
      'ON: anti_gravity_gain and anti_gravity_p_gain take effect. Betaflight turns it on by default.',
      'OFF: anti-gravity does nothing, whatever its gains are set to.',
    ],
  }),
};

/*
 * What each grey feature switches on, on a real flight controller. Betaflight
 * spells them as its CLI prints them (featureNames in cli/cli.c).
 */
const FEATURE_WHAT = {
  GPS: 'Switches on GPS support: the GPS module, GPS Rescue and the GPS readouts on the OSD.',
  OSD: 'Switches on Betaflight\'s on-screen display, the text drawn over the camera picture in the goggles.',
  LED_STRIP: 'Switches on the LED strip.',
  TELEMETRY: 'Switches on telemetry, the data the quad sends back to the pilot\'s radio.',
  RX_SPI: 'Tells Betaflight to use a radio receiver built into the flight controller board, on its SPI bus.',
  '3D': 'Switches on 3D mode, in which reversible motors can spin either way.',
  SERVO_TILT: 'Switches on servo tilt, which moves a camera gimbal with servos.',
  SOFTSERIAL: 'Switches on software serial ports, extra serial ports made in software on spare pins.',
};

/* The plain status words for a page line, falling back to the code. */
function statusWords(status) {
  return STATUS_LABEL[status] || status;
}

function featurePage(feat) {
  const authored = FEATURE_COPY[feat.name];
  const base = authored || copy({
    title: `Feature ${feat.name}`,
    air: FEATURE_WHAT[feat.name] || `A Betaflight feature switch named ${feat.name}.`,
    lab: `This is the line feature ${feat.name} in a settings file. Features are switched with the feature command in the CLI, not set like ordinary settings.`,
    sim: `${statusWords(feat.status)}. This part of Betaflight is not compiled into the simulator, so the switch is kept in the settings file and changes nothing.`,
  });
  return finishPage(`feature-${feat.name}`, {
    ...base,
    kicker: 'Feature',
    status: feat.status,
    key: `feature ${feat.name}`,
    metaLine: `Feature switch. ${statusWords(feat.status)}.`,
    reason: feat.reason,
  });
}

function prettyOsd(key) {
  return key.replace(/^osd_/, '').replace(/_pos$/, '').replace(/_/g, ' ');
}

// catalog.js is a snapshot of the simulator's catalog and its reasons carry no
// terminal stop, so several hundred pages ended a sentence without one. Close it
// here rather than hand-editing generated data.
function period(s) {
  const v = String(s || '').trim();
  return v && !/[.!?]$/.test(v) ? `${v}.` : v;
}

/*
 * THE GREY FAMILIES. A setting with no page of its own gets one here: a
 * sentence on what it does on a real quad, a sentence on where it lives in
 * Betaflight, and what the simulator does instead. The table is read top
 * down and the first match wins, so a narrow pattern sits above a wide one.
 *
 * These pages used to be a dozen templates, each shared by settings that
 * had little to do with one another: a DShot telemetry switch opened with
 * "A real flight controller also has beepers, SD cards, camera control",
 * and a hundred settings with no template at all said only that they were
 * "a real Betaflight 4.5.1 setting". Each also carried If you raise it and
 * If you lower it, which on a setting that changes nothing said so twice
 * more. The owner asked on 27 September 2026 for the wiki to make sense,
 * so every family now names its own subject, and a grey page stops at In
 * this simulator. The descriptions say what the setting is for and no
 * more, because a number a page cannot check against the firmware is a
 * number it should not print.
 */
const OSD_ALARM = {
  rssi: 'signal strength (RSSI)',
  'link quality': 'link quality',
  'rssi dbm': 'signal strength in dBm',
  rsnr: 'signal to noise ratio',
  cap: 'battery capacity used',
  alt: 'altitude',
};

const RX_SIM = ' The sticks come from a joystick, a gamepad or the keyboard, and the Radio link setting adds the delay, timing jitter and lost packets of a real link.';
const BAT_SIM = ' The physics model calculates the battery voltage and current, and Pack charge in Settings sets the starting voltage.';
const SENSOR_SIM = ' The simulated gyro reads the physics model directly, and angle mode takes the attitude from the physics model.';

const GREY_FAMILIES = [
  {
    re: /^osd_.*_pos$/,
    related: ['start-honesty', 'physics-lens'],
    air: (k) => `Where the ${prettyOsd(k)} readout sits on the on-screen display (OSD), the text Betaflight draws over the camera picture in the goggles, and whether it is shown.`,
    lab: 'Betaflight packs the readout\'s position and the OSD profiles that show it into one number. Configurator\'s OSD tab sets it when a readout is dragged into place.',
    sim: ' The lap clock and the battery readout in the simulator are drawn by the simulator itself.',
  },
  {
    re: /^osd_.*_alarm$/,
    related: ['start-honesty'],
    air: (k) => `The level at which the on-screen display (OSD) warns about ${OSD_ALARM[prettyOsd(k).replace(/ alarm$/, '')] || prettyOsd(k)}.`,
    lab: 'It is one of the OSD settings. When the value it watches crosses this level, the readout flashes in the goggles.',
    sim: '',
  },
  {
    re: /^osd_/,
    related: ['start-honesty'],
    air: (k) => `A setting for the on-screen display (OSD), the text Betaflight draws over the camera picture in the goggles: ${prettyOsd(k)}.`,
    lab: 'It is one of the OSD settings, which decide what the OSD shows and in which units.',
    sim: ' The lap clock and the battery readout in the simulator are drawn by the simulator itself.',
  },
  {
    re: /^vtx_/,
    related: ['start-honesty'],
    air: () => 'A setting for the video transmitter (VTX), the radio that sends the camera picture to the goggles: its band, channel, power, pit mode or the serial link to it.',
    lab: 'Betaflight sends these values to the transmitter over a serial link (SmartAudio, Tramp or MSP), using the VTX table set up for that transmitter.',
    sim: ' The picture you see is drawn in your browser.',
  },
  {
    re: /^gps_lap_timer/,
    related: ['start-honesty'],
    air: () => 'A setting for Betaflight\'s GPS lap timer, which times laps past a gate position saved from GPS.',
    lab: 'It belongs to the GPS lap timer settings and needs a GPS module.',
    sim: ' The simulator times laps itself, from the gates of the track.',
  },
  {
    re: /^gps_rescue_/,
    related: ['start-honesty', 'physics-missing'],
    air: () => 'A setting for GPS Rescue, which flies a quad back towards where it took off when the radio link is lost, or when the pilot switches it on.',
    lab: 'It belongs to the GPS_RESCUE setting group. GPS Rescue needs a GPS module and an accelerometer, and it flies with its own climb, speed, angle and throttle limits.',
    sim: '',
  },
  {
    re: /^gps/,
    related: ['start-honesty', 'physics-missing'],
    air: () => 'A setting for the GPS module: which protocol it speaks, how Betaflight configures it, and how it sets the home point.',
    lab: 'It belongs to the GPS setting group.',
    sim: '',
  },
  {
    re: /^(led_|ledstrip)/,
    related: ['start-honesty'],
    air: () => 'A setting for an LED strip: which LEDs light, in what colour, and what they show, such as the flight mode, a warning or a beacon for finding a crashed quad.',
    lab: 'It belongs to the LEDSTRIP setting group. LEDs have no effect on how a quad flies.',
    sim: '',
  },
  {
    re: /^blackbox_/,
    related: ['physics-gyro'],
    air: () => 'A setting for the blackbox, the flight recorder on a real flight controller: how often it records, which values it leaves out, and whether it writes to flash memory or an SD card.',
    lab: 'It belongs to the BLACKBOX_CONFIG setting group. A log is read afterwards with Betaflight\'s Blackbox Explorer, or turned into a table with its blackbox_decode tool.',
    sim: ' The simulator\'s own Flight log, in Settings, records a flight in memory and saves it as a CSV file in the layout blackbox_decode produces.',
  },
  {
    re: /^failsafe_/,
    related: ['physics-radio'],
    air: () => 'A setting for failsafe, what a real quad does when the radio link is lost: how long it holds the last sticks, and then whether it drops, lands or starts GPS Rescue.',
    lab: 'It belongs to FAILSAFE_CONFIG and is read by flight/failsafe.c.',
    sim: ' The Radio link setting can lose packets, but a lost packet here only means the sticks arrive a little later.',
  },
  {
    re: /^(mag_|align_mag)/,
    related: ['start-honesty'],
    air: () => 'A setting for the compass (magnetometer), which measures the direction of the Earth\'s magnetic field. Betaflight uses it for heading in GPS Rescue.',
    lab: 'It belongs to the COMPASS_CONFIG setting group: the chip, how it is wired and mounted, and its calibration.',
    sim: '',
  },
  {
    re: /^baro_/,
    related: ['start-honesty'],
    air: () => 'A setting for the barometer, which measures air pressure so that Betaflight can estimate height.',
    lab: 'It belongs to the BAROMETER_CONFIG setting group: the chip and how it is wired.',
    sim: '',
  },
  {
    re: /^acc_/,
    related: ['control-angle'],
    air: () => 'A setting for the accelerometer, which measures acceleration. When the quad is not accelerating, it shows which way is down, which angle mode and GPS Rescue need.',
    lab: 'It belongs to the ACCELEROMETER_CONFIG setting group: the chip, its filter, its trims and its calibration.',
    sim: SENSOR_SIM,
  },
  {
    re: /^align_board_/,
    related: ['physics-gyro'],
    air: () => 'How the flight controller board is mounted on the frame, in degrees, so that a board fitted at an angle still reads roll, pitch and yaw correctly.',
    lab: 'It belongs to the BOARD_ALIGNMENT setting group.',
    sim: SENSOR_SIM,
  },
  {
    re: /^(gyro_calib|gyro_offset|gyro_cal_on_first_arm)/,
    related: ['physics-gyro'],
    air: () => 'A setting for gyro calibration, in which Betaflight measures what the gyro reads while the quad is still and subtracts it from every later reading.',
    lab: 'Betaflight calibrates the gyro before arming, and waits if the quad is being moved.',
    sim: SENSOR_SIM,
  },
  {
    re: /^(gyro_overflow|gyro_high_range|gyro_to_use|gyro_[12]_)/,
    related: ['physics-gyro'],
    air: () => 'A setting for the gyro chip itself: which chip to use on a board with two, how it is wired and mounted, its measuring range, and what Betaflight does if a very fast rotation overflows it.',
    lab: 'These settings describe the hardware. The filters and the PID controller come after them.',
    sim: SENSOR_SIM,
  },
  {
    re: /^(expresslrs_|flysky_|frsky_spi|frsky_x_rx|cc2500_|rx_spi_|spektrum_spi_)/,
    related: ['physics-radio'],
    air: () => 'A setting for a radio receiver built into the flight controller board, on its SPI bus: the protocol, binding and channel settings.',
    lab: 'It belongs to the SPI receiver settings, which only boards with a built-in receiver use.',
    sim: RX_SIM,
  },
  {
    re: /^(serialrx_|sbus_|spektrum_|srxl2_|crsf_|rx_|msp_override|input_filtering_mode)/,
    related: ['physics-radio'],
    air: () => 'A setting for the radio receiver: its protocol, its serial wiring or the range of stick values it sends.',
    lab: 'It belongs to the receiver setting group (RX_CONFIG) or the serial receiver settings.',
    sim: RX_SIM,
  },
  {
    re: /^rssi_/,
    related: ['physics-radio'],
    air: () => 'A setting for RSSI, the received signal strength: where Betaflight reads it from and how it scales and smooths it.',
    lab: 'It belongs to the receiver settings. RSSI is shown on the OSD and can trigger warnings.',
    sim: RX_SIM,
  },
  {
    re: /^(telemetry_|tlm_|hott_|ibus_sensor|mavlink_|pid_in_tlm|report_cell_voltage|frsky_)/,
    related: ['physics-radio'],
    air: () => 'A setting for telemetry, the data the quad sends back to the pilot\'s radio, such as battery voltage and signal quality, and which values are left out.',
    lab: 'It belongs to the TELEMETRY_CONFIG setting group or to the settings of one telemetry protocol.',
    sim: RX_SIM,
  },
  {
    re: /^(vcd_|max7456_|displayport_max7456)/,
    related: ['start-honesty'],
    air: () => 'A setting for analog video: the video system (PAL or NTSC), and the chip that draws the analog OSD and where it places the text.',
    lab: 'These settings describe the analog OSD hardware.',
    sim: '',
  },
  {
    re: /^(serial|msp_|reboot_character|displayport_)/,
    related: ['start-honesty'],
    air: () => 'A setting for the serial ports (UARTs) and the MSP protocol that Configurator, digital video systems and other devices use to talk to the flight controller.',
    lab: 'It belongs to the SERIAL_CONFIG or MSP settings.',
    sim: ' Settings reach the firmware as CLI text.',
  },
  {
    re: /^(vbat_|ibat_|ibatv_|bat_|battery_|current_meter|cbat_|use_vbat|use_cbat|force_battery|ibata|ibatt)/,
    related: ['physics-sag', 'cli-vbat_sag_compensation'],
    air: () => 'A setting for the flight controller\'s battery monitoring: how it measures voltage and current, how it counts cells, and when it warns.',
    lab: 'It belongs to BATTERY_CONFIG or to the voltage and current sensor settings.',
    sim: BAT_SIM,
  },
  {
    re: /^dshot_bidir/,
    related: ['control-filters', 'cli-rpm_filter_harmonics'],
    air: () => 'Bidirectional DShot: each ESC sends its motor\'s speed back to the flight controller on the same wire that carries the motor command. The RPM filter and dynamic idle need it.',
    lab: 'It belongs to the MOTOR_CONFIG setting group. The ESC firmware has to support it.',
    sim: ' The simulator gives Betaflight each motor\'s speed from the physics model, with the delay real motor speed reports have, as if this were on.',
  },
  {
    re: /^dshot_/,
    related: ['control-mixer'],
    air: () => 'A setting for DShot, the digital protocol that carries motor commands to the ESCs: how the board generates the signal, and extended DShot telemetry.',
    lab: 'It belongs to the MOTOR_CONFIG setting group.',
    sim: ' Only dshot_idle_value is used here.',
  },
  {
    re: /^esc_sensor/,
    related: ['start-honesty'],
    air: () => 'A setting for ESC sensor telemetry, in which the ESCs report voltage, current and temperature to the flight controller over a serial wire.',
    lab: 'It belongs to the ESC sensor settings.',
    sim: '',
  },
  {
    re: /^beeper_/,
    related: ['start-honesty'],
    air: () => 'A setting for the buzzer: how it is driven, its frequency, and the tone the motors play through DShot as a beacon.',
    lab: 'It belongs to the BEEPER_CONFIG setting group.',
    sim: '',
  },
  {
    re: /^(sdcard_|sdio_|flash_spi_bus)/,
    related: ['start-honesty'],
    air: () => 'A setting for the storage the blackbox writes to: an SD card or a flash memory chip.',
    lab: 'These settings describe the hardware and how it is wired.',
    sim: '',
  },
  {
    re: /^(camera_|cam_|rcdevice_)/,
    related: ['physics-lens'],
    air: () => 'A setting for camera control, which lets the pilot change the FPV camera\'s own settings from the radio sticks.',
    lab: 'It belongs to the camera control or RunCam device settings.',
    sim: ' The camera angle and field of view are set on the Quad screen.',
  },
  {
    re: /^(pinio|box_user_)/,
    related: ['start-honesty'],
    air: () => 'A setting for PINIO and the user modes: spare output pins that a switch on the radio can turn on and off, for example to power a video transmitter, and the names those modes show.',
    lab: 'It belongs to the PINIO or mode settings.',
    sim: ' There are no AUX channels.',
  },
  {
    re: /^(i2c|mco|adc_|usb_|dashboard_|system_|cpu_overclock|scheduler_|cpu_late_limit|task_statistics|rangefinder_)/,
    related: ['start-honesty'],
    air: () => 'A setting for the flight controller board itself: its processor, clocks, buses, USB connection or an attached device.',
    lab: 'These settings describe the hardware Betaflight runs on.',
    sim: ' The simulator runs Betaflight\'s control loop as WebAssembly at a fixed 1 kHz, with no board.',
  },
  {
    re: /^stats_/,
    related: ['start-honesty'],
    air: () => 'One of the flight controller\'s own statistics: the number of flights, total flight time, distance or battery capacity used.',
    lab: 'Betaflight adds to these after each flight that lasts longer than stats_min_armed_time_s.',
    sim: '',
  },
  {
    re: /^(debug_mode|rc_smoothing_debug_axis|acro_trainer_debug_axis)$/,
    related: ['physics-gyro'],
    air: () => 'Chooses which internal values Betaflight writes into the four debug columns of a blackbox log, for looking into one part of the firmware.',
    lab: 'Debug values are recorded, not acted on, so they do not change how a quad flies.',
    sim: ' The simulator\'s Flight log records its own set of values.',
  },
  {
    re: /^(motor_pwm|use_unsynced_pwm)/,
    related: ['control-mixer'],
    air: () => 'A setting for the motor protocol: which protocol the ESCs use (PWM, Oneshot, Multishot or DShot), and for the older analog protocols their update rate and signal polarity.',
    lab: 'It belongs to the MOTOR_CONFIG setting group.',
    sim: ' The motors are driven the DShot way.',
  },
  {
    re: /^motor_output_reordering/,
    related: ['control-mixer'],
    air: () => 'Which output pin on the board drives which motor, so that a quad wired in a different order can still use Betaflight\'s motor numbers.',
    lab: 'It belongs to the MOTOR_CONFIG setting group.',
    sim: ' The motors are always in Betaflight\'s order: rear right, front right, rear left, front left.',
  },
  {
    re: /^3d_/,
    related: ['control-mixer'],
    air: () => 'A setting for 3D mode, in which reversible motors can spin either way, so that the quad can fly upside down with thrust pointing up.',
    lab: 'It sets the dead band around centre throttle and the limits used when the motors reverse.',
    sim: ' The motors in the physics model do not reverse.',
  },
  {
    re: /^(servo|gimbal_mode|channel_forwarding_start|tri_unarmed_servo)/,
    related: ['start-honesty'],
    air: () => 'A setting for servos, used on aircraft with moving control surfaces, a tilting tail motor or a camera gimbal.',
    lab: 'It belongs to the servo settings.',
    sim: ' The quad has four fixed motors and no servos.',
  },
  {
    re: /^(deadband|yaw_deadband)$/,
    related: ['physics-radio'],
    air: () => 'A band of stick movement around centre that Betaflight treats as exactly centre, so that a radio whose sticks do not centre perfectly does not make the quad drift.',
    lab: 'It belongs to the RC_CONTROLS setting group.',
    sim: ' Stick calibration and the dead zone are set in Settings.',
  },
  {
    re: /^yaw_control_reversed/,
    related: ['cli-yaw_motors_reversed'],
    air: () => 'Reverses the direction of the yaw stick.',
    lab: 'It belongs to the RC_CONTROLS setting group. It is not the same as yaw_motors_reversed, which tells the mixer which way the propellers spin.',
    sim: '',
  },
  {
    re: /^(small_angle|auto_disarm_delay|enable_stick_arming|pwr_on_arm_grace)/,
    related: ['start-honesty'],
    air: () => 'A setting for arming, the step that switches the motors on: the largest tilt at which arming is allowed, arming with a stick movement instead of a switch, a wait after power on before arming is allowed, or disarming after a delay at zero throttle.',
    lab: 'It belongs to the arming settings, which fc/core.c reads.',
    sim: ' The quad is always armed.',
  },
  {
    re: /^runaway_takeoff_deactivate/,
    related: ['cli-runaway_takeoff_prevention'],
    air: () => 'Decides when runaway takeoff prevention stops watching, after how long and above what throttle, once the quad has taken off normally.',
    lab: 'It is read by fc/core.c together with runaway_takeoff_prevention.',
    sim: '',
  },
  {
    re: /^acro_trainer_/,
    related: ['control-angle'],
    air: () => 'A setting for the acro trainer, which lets a learner fly acro while Betaflight stops the quad tilting past a set angle.',
    lab: 'It belongs to the PID profile.',
    sim: ' Angle mode, switched with M, is the simulator\'s way to fly with a tilt limit.',
  },
  {
    re: /^rpm_limit/,
    related: ['control-mixer'],
    air: () => 'A setting for the RPM limiter, which caps the average motor speed with its own PID controller. Some spec racing classes use it so that every quad has the same top speed.',
    lab: 'It needs the motor speeds that bidirectional DShot reports, and it reads motor_kv to estimate the speed at full throttle.',
    sim: '',
  },
  {
    re: /^(imu_|altitude_)/,
    related: ['control-angle'],
    air: () => 'A setting for the attitude and altitude estimate, which combines the gyro with the accelerometer, and the barometer or GPS, to work out which way is up and how high the quad is.',
    lab: 'It belongs to the IMU or position settings.',
    sim: ' The simulator gives Betaflight the attitude straight from the physics model.',
  },
  {
    re: /^(thr_corr_)/,
    related: ['control-angle'],
    air: () => 'Throttle angle correction: extra throttle when the quad is tilted in angle mode, so that it holds its height better.',
    lab: 'It belongs to the throttle correction settings.',
    sim: '',
  },
  {
    re: /^(max_aux_channels|rate_6pos_switch)/,
    related: ['start-honesty'],
    air: () => 'A setting for the AUX channels, the radio switches that change modes, and for choosing a rate profile with a six position switch.',
    lab: 'It belongs to the receiver and adjustment settings.',
    sim: ' There are no AUX channels.',
  },
  {
    re: /^(craft_name|pilot_name|profile_name|rateprofile_name|name)$/,
    related: ['start-honesty'],
    air: () => 'A name that the flight controller stores and can show on the OSD: the craft, the pilot, a PID profile or a rate profile.',
    lab: 'Names are stored as text and have no effect on flight.',
    sim: ' The simulator keeps its own names in its menus.',
  },
  {
    re: /^auto_profile_cell_count/,
    related: ['start-honesty'],
    air: () => 'Switches to this PID profile automatically when a battery with this many cells is plugged in.',
    lab: 'It belongs to the PID profile.',
    sim: ' The simulator uses one PID profile.',
  },
  {
    re: /^timezone_offset_minutes/,
    related: ['start-honesty'],
    air: () => 'The time zone of the flight controller\'s clock, used to stamp blackbox logs.',
    lab: 'It has no effect on flight.',
    sim: '',
  },
  {
    re: /^mixer_/,
    related: ['control-mixer'],
    air: () => 'A mixer setting for aircraft other than a four motor X quad, such as a custom motor layout.',
    lab: 'It belongs to the MIXER_CONFIG setting group. mixer_type is the one mixer setting used here, and it has its own page.',
    sim: ' The quad here is a four motor X.',
  },
  {
    re: /^rpm_filter_weights$/,
    related: ['cli-rpm_filter_weights_1', 'control-filters'],
    air: () => 'The RPM filter\'s three weights in the list form Betaflight 4.5 prints, one per harmonic, as percentages.',
    lab: 'rpm_filter_weights = 100,100,100 in a settings file sets all three at once.',
    sim: ' The simulator reads the list as rpm_filter_weights_1, _2 and _3, which have their own pages, and writes it back as the list when you export.',
  },
];

function family(field) {
  const k = field.key;
  if (k.startsWith('#')) {
    return copy({
      title: field.tab ? `${field.tab} (Configurator only)` : k,
      related: ['start-honesty'],
      air: 'A tab or tool in Betaflight Configurator, the program that sets up a flight controller from a computer, such as the firmware flasher, cloud backups or the LED painter. It is not a setting stored on the flight controller.',
      lab: 'Configurator runs it on the computer. Nothing it does is a CLI setting the firmware could read.',
      sim: 'Configurator only. The simulator\'s settings screen shows the tab in grey. The note from the settings catalog is below.',
    });
  }
  /* The catalog's own reason is printed at the foot of every grey page under
   * "Why, from the settings catalog", in the catalog's words, so the section
   * here says what the simulator does instead rather than repeating it. */
  const inert = `${statusWords(field.status)}. The part of Betaflight that reads it is not compiled into the simulator, so the value is kept in the settings file and changes nothing.`;
  const fam = GREY_FAMILIES.find((f) => f.re.test(k));
  if (fam) {
    return copy({
      title: k,
      related: fam.related,
      air: fam.air(k),
      lab: fam.lab,
      sim: `${inert}${fam.sim}`,
    });
  }
  return copy({
    title: k,
    related: ['start-honesty'],
    air: 'A Betaflight 4.5.1 setting for a part of the firmware that does not take part in flight control.',
    lab: field.pg ? `It belongs to the setting group ${field.pg}.` : 'It has no setting group in the value table.',
    sim: inert,
  });
}

function finishPage(id, spec) {
  const sections = [
    { id: 'air', title: 'What it does', paras: [spec.air] },
    { id: 'lab', title: 'How it works', paras: [spec.lab] },
    { id: 'sim', title: 'In this simulator', paras: [spec.sim] },
  ];
  if (spec.choices && spec.choices.length) {
    sections.push({ id: 'choices', title: 'The choices', paras: spec.choices });
  } else if (spec.upAir) {
    sections.push(
      { id: 'up', title: 'If you raise it', paras: [spec.upAir, spec.upLab] },
      { id: 'down', title: 'If you lower it', paras: [spec.downAir, spec.downLab] },
    );
  }
  return {
    id,
    chapter: 'cli',
    title: spec.title,
    kicker: spec.kicker || 'Betaflight 4.5.1',
    lede: spec.metaLine || '',
    figure: spec.figure || null,
    sections,
    related: spec.related || [],
    source: spec.source || 'src/fc/catalog.js, src/native/bf/bf_settings.c, vendor/betaflight 4.5.1',
    kind: 'cli',
    status: spec.status,
    key: spec.key,
    reason: spec.reason || '',
    meta: spec.meta || null,
  };
}

export function cliPageId(key) {
  if (key.startsWith('#')) {
    return `cli-${key.slice(1).replace(/[^a-z0-9]+/gi, '-')}`;
  }
  return `cli-${key.replace(/[^a-z0-9_]+/gi, '-')}`;
}

export function pageForField(field) {
  const authored = AUTHORED[field.key];
  const spec = authored ? { ...authored } : family(field);
  if (!authored) {
    spec.title = spec.title || field.key;
  }
  const bounds = field.min != null || field.max != null ? fieldBounds(field) : null;
  const lut = field.lookup ? lookupValues(field.lookup) : null;
  const boundText = bounds
    ? `Range ${bounds.min} to ${bounds.max}${field.units ? ` ${field.units}` : ''}.`
    : '';
  const lutText = lut ? `Values: ${lut.join(', ')}.` : '';
  const typeText = field.type ? `Firmware type ${field.type}.` : '';
  const pgText = field.pg ? `Parameter group ${field.pg}.` : '';
  const metaLine = [
    field.key.startsWith('#') ? 'A Configurator control, not a CLI setting.'
      : (spec.title === field.key ? '' : `CLI setting ${field.key}.`),
    `${statusWords(field.status)}.`,
    pgText,
    typeText,
    boundText,
    lutText,
  ].filter(Boolean).join(' ');
  /* The catalog's note goes at the foot of a grey page unless the page has
   * already said it: its fallback note is the sentence the grey families
   * open In this simulator with. */
  const note = String(field.reason || '').replace(/\.$/, '');
  const said = note && String(spec.sim || '').includes(note);
  return finishPage(cliPageId(field.key), {
    ...spec,
    status: field.status,
    key: field.key,
    reason: said ? '' : field.reason,
    metaLine,
    meta: { bounds, lut, type: field.type, pg: field.pg, tab: field.tab, page: field.page },
    source: authored
      ? 'src/wiki/cli.js (authored), bf_settings.c, catalog.js'
      : 'src/wiki/cli.js (family), catalog.js',
  });
}

export function allCliPages() {
  const pages = FIELDS.map(pageForField);
  for (const feat of FEATURES) {
    pages.push(featurePage(feat));
  }
  return pages;
}

export function authoredKeys() {
  return Object.keys(AUTHORED);
}

export function cliIndexPage() {
  const counts = { LIVE: 0, GATED: 0, APPLIED_INERT: 0, INERT: 0, ABSENT: 0 };
  for (const f of FIELDS) {
    counts[f.status] += 1;
  }
  return {
    id: 'cli-index',
    chapter: 'cli',
    title: 'Every Betaflight setting',
    kicker: 'Settings reference',
    lede: `${FIELDS.length} settings from Configurator and the Betaflight 4.5.1 value table, and ${FEATURES.length} feature switches. ${counts.LIVE} work here, ${counts.GATED} are switched off at 1 kHz, ${counts.APPLIED_INERT} are stored but not used, ${counts.INERT} are not simulated, and ${counts.ABSENT} exist only in Configurator. Search, or open a tab.`,
    figure: 'loop',
    sections: [
      {
        id: 'air',
        title: 'The idea',
        paras: [
          `This is every setting a real Betaflight flight controller has, all ${FIELDS.length}, in the order a pilot sees them in Configurator. Settings marked Works here change how this aircraft flies. Settings in grey belong to hardware this simulator does not have, such as a video transmitter or GPS. They are shown rather than hidden, so that a real settings file loads without losing anything. Open a setting to read what it does, what raising it changes, and whether it has any effect here.`,
        ],
      },
      {
        id: 'lab',
        title: 'How it works',
        paras: [
          'catalog.js decides each setting\'s status, bf_settings.c is the table of settings the module can write, and pid.c, mixer.c, rc.c, gyro.c and rpm_filter.c are the Betaflight files that read them. A setting marked Works here with nothing that reads it would be a bug. A template page for a setting that is not simulated is expected: the OSD alone has hundreds of position settings, and none of them affects flight.',
        ],
      },
      {
        id: 'sim',
        title: 'In this simulator',
        paras: [
          'The list below is built from the catalog when the page loads. The wiki lint fails if any catalog setting has no page, or if a setting that works here has no written page of its own.',
        ],
      },
    ],
    related: ['start-honesty', 'control-pid', 'control-filters', 'control-rates'],
    source: 'src/fc/catalog.js',
    kind: 'index',
    tabs: TABS,
    counts,
  };
}

export { AUTHORED, FEATURE_COPY };
