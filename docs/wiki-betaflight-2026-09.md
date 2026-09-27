# Wiki against Betaflight, September 2026

On 27 September 2026 the owner asked for the wiki to be fixed. Every earlier
pass (`wiki-copy`, `wiki-rewrite`, `wiki-textbook`, `wiki-tighten`) worked on
how the wiki reads. This one checked what it says about Betaflight against
Betaflight: the 4.5.1 source in the simulator's `vendor/betaflight`, and the
list of files `scripts/build-wasm.sh` compiles, which decides what can work in
the simulator at all. `docs/wiki-voice.md` rule 8 now makes that the standing
rule.

Every finding below was acted on unless it says otherwise. The file named is
where the truth was read.

## The settings pages

**Five hundred and forty eight pages said nothing twice.** Every grey setting
carried If you raise it and If you lower it, which said that raising it did
nothing and that "lowering it has no effect here either". A page for a filter
TYPE, a choice from a list, told the reader what raising it would do. Settings
pages now take the shape of the setting: a number that works here keeps raise
and lower, a list that works here gets The choices, one sentence per option,
and a setting that changes nothing stops at In this simulator.
`scripts/wiki-lint.js` fails a page of the wrong shape. The count is 131
numbers, 27 lists (25 settings and the two working features) and 548 grey.

**The grey templates described the wrong things.** A DShot setting opened with
"A real flight controller also has beepers, SD cards, camera control" and 103
settings with no template said only that they were a real Betaflight setting.
`GREY_FAMILIES` in `src/wiki/cli.js` gives every family its own sentence on
what the setting does on a real quad. Bidirectional DShot now says it is what
the RPM filter and dynamic idle need, and that the simulator supplies motor
speeds as if it were on.

**Five settings were marked Works here and do nothing here.** The pages for
two of them said so in their own text, under a Works here label.
`pid_at_min_throttle` and `airmode_start_throttle_percent` are read only by
`fc/core.c`, which is not compiled. `dyn_idle_start_increase` applies only
before airmode is activated, and `bf_stubs.c` reports it activated from the
start. `ez_landing_speed` is multiplied by a GPS speed that is always zero.
`max_check` is read only by the stick commands in `core.c` and the RPM
limiter. All five are Stored, not used in the simulator's catalog now, which
is the copy of record, and the snapshot here follows it.

**`min_check` was described as kept only for export.** `fc/rc.c` maps the
throttle from `min_check` to 2000 onto the whole range, so it sets a dead zone
at the bottom of the stick, and it works here.

**A feature that does not exist.** The catalog listed a feature `SERVO`.
Betaflight's CLI spells it `SERVO_TILT` (`featureNames` in `cli/cli.c`).
Renamed in the simulator's catalog, so the page is now `feature-SERVO_TILT`.

**The catalog's notes were internal shorthand.** "Plant owns pack current",
"No UART grid. The sim is not a radio link", "Configurator chrome". Every
note in the simulator's catalog is a plain sentence now. They show at the
foot of each grey page and in the simulator's settings screen.

## Airmode and the mixer

**The wiki said that without airmode a quad has no control at zero throttle,
with all four motors pinned at idle.** It said so in four places and drew it
in the TPA figure. Betaflight 4.5 does not do that. `applyMixerAdjustment` in
`flight/mixer.c` moves the throttle until every motor fits whether airmode is
on or not; what airmode changes is that, without it, the corrections are
scaled by `scaleRangef(throttle, 0, 0.5, 0.5, 1)`, half at zero throttle. On
a real board `core.c` also resets the I term at the bottom of the stick. The
articles, the glossary, the AIRMODE page and the figure now say and compute
that.

**The mixer figure and the yaw figure clipped each motor on its own.** So
they showed rotation lost at full throttle, and "yaw becomes weak at full
throttle". The LEGACY mixer keeps the correction and gives up throttle, and
scales the corrections only when they need more than the whole range. Both
figures now compute that, and the yaw figure reports the thrust given up
instead of yaw lost.

**The mixer types were described backwards.** LEGACY was "the textbook method
that easily drives a motor to its limit"; it is the default, and it is the one
that normalises. LINEAR and DYNAMIC shift the corrections with the throttle.
DYNAMIC was called "a common modern racing choice", which the source cannot
show.

## Named behaviour that was wrong

- **Loop rate.** The wiki said a flight controller corrects 1,000 times a
  second. Most racing quads run Betaflight's loop at 4 or 8 kHz; the
  simulator runs it at 1 kHz.
- **The dynamic notch.** Said to need a 2 kHz gyro loop, and a 1 kHz board was
  called "slower". `dynNotchInit` checks the PID loop rate
  (`gyro.targetLooptime`, the gyro rate divided by `pid_process_denom`), on
  any board.
- **D min.** Called D max, and said to rise with the stick. In 4.5 the feature
  is D_min, and `pid.c` raises D from the larger of two things: a fast change
  in the gyro reading, scaled by `d_max_gain`, and a fast stick movement,
  scaled again by `d_max_advance`.
- **Yaw D.** Explained by yaw being "measured with more noise" and a larger
  inertia needing more torque. Betaflight's default yaw D is 0; yaw is turned
  by small drag torques that already damp it.
- **`yaw_lowpass_hz`.** Said to smooth yaw because yaw is noisier. It filters
  the yaw P term, and nothing else.
- **Notch cutoffs.** Lowering a cutoff was said to narrow the notch. It widens
  it. The cutoff must stay below the centre; Betaflight's check for that is in
  `config/config.c`, which is not compiled here, and the pages say so.
- **Yaw spin recovery.** Said to cut the motors. It zeroes the yaw target, the
  I term on every axis and roll and pitch P, D and feedforward, and lets yaw P
  use the whole motor range until the spin stops. `yaw_spin_threshold` is used
  only with ON; AUTO works out its own.
- **Level race mode.** Described only as "its racing behaviour". It makes
  angle mode level roll alone and fly pitch in acro.
- **Angle limit.** The article said about thirty degrees; Betaflight's default
  `angle_limit` is 60.
- **Simplified sliders.** Listed as "Master, P, I, D, D Max, feedforward and
  pitch compared with roll". There is no P slider: P and I move together, and
  the pitch PI slider also moves pitch feedforward. The filter multipliers
  were said to "usually" mean less filtering and to need checking each time;
  `simplified_tuning.c` sets each enabled cutoff to its default times the
  multiplier over 100, every time.
- **RC smoothing auto factor.** "Usually" more smoothing, see the
  documentation. `fc/rc.c` sets the cutoff to the packet rate × 1.5 /
  (1 + factor / 10).
- **TPA low.** Said to do "the opposite" of TPA. It also reduces the gains,
  near zero throttle, and by default only until the throttle first passes its
  breakpoint after arming.
- **Thrust linearisation.** Said to move hover up the stick, with SCALE
  throttle as the racer's alternative. `pid.c` also divides the throttle to
  keep the stick's feel; the net effect is stronger corrections at low
  throttle.
- **Launch control modes.** PITCHONLY "the most popular choice for racing".
  The pages now say what each mode switches off, from `pid.c`.
- **Quick rates expo.** "Applies expo the Quick rates way". It decides whether
  expo shapes the stick itself or only the rise towards the maximum rate.
- **Runaway takeoff prevention.** "Guards against mistakes with a real arming
  switch". It disarms when the PID is saturated and the quad rotates away just
  after arming, the sign of wrong motor order, motor direction or board
  orientation.
- **Feedforward's maximum rate limit** was grouped with the jitter settings.
  It exists to stop feedforward pushing past the maximum rate near full stick.

## Invented history and opinion, removed

"Most of these were added because a pilot crashed in an unusual situation";
"one of the reasons modern five inch quads can use more D than quads built in
2018 could"; "OFF was the default in older versions of Betaflight"; "GYRO is
the older of the two methods"; "Pilots call this effect breakout"; "Racers
often run it at 0"; "Many race tunes leave it off". None of these can be read
in the source, and each is gone. A reference to "Configurator 4.5", a version
that does not exist, is gone too.

## Left as it was

- **The physics chapter.** It describes the simulator's own model, was
  checked against `plant.c` on 24 September, and makes few claims about
  Betaflight. The Betaflight claims in it (the airmode sentence on the yaw
  page, integrated yaw called a mixer option, the battery meter settings) were
  corrected.
- **The glossary.** `src/wiki/glossary.js` is not imported by anything, so
  none of it reaches a reader. Its airmode, flight controller, setpoint and
  CLI entries were corrected anyway, so that wiring it up later does not bring
  the errors back.
