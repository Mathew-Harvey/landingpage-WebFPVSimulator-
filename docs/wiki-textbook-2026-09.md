# Wiki rewrite, September 2026: the textbook pass

On 24 September 2026 the owner asked for the whole wiki to be rewritten with
the humanizer skill (github.com/blader/humanizer, version 3.0.0) so that it
"makes sense" and "reads like a text book aimed at yr 10 students, plain
english. get rid of the analogies". This replaces the magazine register of
`docs/wiki-rewrite-2026-09.md`. `docs/wiki-voice.md` is the new style
contract, and this file records what was done against it.

A four page sample was written first, from the copy that last lived in the
simulator repository, and pushed to the simulator's main as `WIKI-REWRITE.md`.
The owner then asked for this repository to be attached with push access and
the work pushed. The owner did not answer the sample's questions about the
section labels, chapter names and status labels one by one; the rewrite takes
the sample's proposals, with one change noted below, and each of them is a
single string or a single map to change back.

## What changed

**All 36 articles** in `src/wiki/articles.js`: every lede and paragraph, and
the titles that carried jargon or a figure of speech. Page ids, chapters,
figures and related links are unchanged and in the same order, compared field
by field against the previous version. Some source lines now name the files
that do the work.

**Every settings page** in `src/wiki/cli.js`: the 180 written pages, the
family templates that write the other 500 or so, the feature pages and the
index page. A page by page comparison against the previous module, on the same
catalog, found the same 180 written keys in the same order, the same 706
pages, and the same ids, statuses, related links, figures and section layout.
The code changed only in the section titles, the status words, the per-axis
examples in the PID templates, and the grey pages' status line.

**The figures** in `src/wiki/figures.js`: all 35 labels, headlines, captions,
knob labels and the text drawn inside them (194 strings). Two labels now
compute their numbers instead of hard-coding them, and two pieces of text in
the ground effect panel moved, because they had always sat on top of the x
axis label.

**The glossary** in `src/wiki/glossary.js`, all 38 definitions.

**The page shell**: the status chips and filters in `src/wiki/wiki.js`, and the
meta tags and footer of `wiki/index.html`.

**The model and the catalog**: `src/wiki/model.js` and the catalog snapshot in
`src/fc/catalog.js` were brought up to date with the simulator, as described
below.

## Structure

| Before | After |
|---|---|
| Article sections In the air, In the lab, In this simulator | The idea, How it works, In this simulator |
| Settings page sections In the air, In the lab, In this simulator, If you raise it, If you lower it | What it does, How it works, In this simulator, If you raise it, If you lower it |
| Chapters The journey, The aircraft, The controller, Every setting | Getting started, The aircraft, The flight controller, Settings reference |
| Status chips LIVE, GATED, APPLIED INERT, INERT, ABSENT | Works here, Off at 1 kHz, Stored, not used, Not simulated, Configurator only (the catalog code stays as the chip's tooltip) |

The sample proposed "What the pilot notices" for the first article section.
It became "The idea", because the first section of Why a quad needs a
computer, How to read this wiki or The two airframes is not about what a pilot
notices, and one label has to fit all 36 pages.

The two columns are no longer written for two different readers. Both are for
a Year 10 reader; the first explains, the second gives the equations and
numbers and explains them.

## How it was written and checked

The articles, the settings module's first and last sections, the glossary and
the shell were written by the session that owns this record. The middle four
sections of `cli.js` and the figure text were written by five helper agents
working from one brief, each on a line range nobody else touched, and every
section was reviewed before it was assembled. The simulator's `vendor/betaflight`
submodule was not checked out in that session's clone, so the helpers read
Betaflight's own files at the pinned commit (77d01ba) from GitHub to check
claims about Betaflight's behaviour; several of the corrections below come from
that reading.

Checks, all run on the final tree: `npm run lint:wiki` ok (36 articles, 35
figures, 696 catalog fields, 706 pages, 180 authored keys, 161 LIVE, 5 GATED,
14 APPLIED_INERT); `npm run lint:page` 25 of 25; `npm run lint:nouns` pass. A
scan of all 6,192 reader-visible strings found no em or en dash, no curly
quote, no stale number from the list below, and none of the analogies the old
copy used (brakes, shove, memory, bite, screw, doughnut, rubber band, glass,
washing machine, ghosts, cheat code and the rest). The words it still finds
are literal: a quad "has no brake", and "craft name" is the name of a
Betaflight OSD item. A technical token scan of the old articles against the
new ones found every setting name, file and constant still present, except
stale values, the numbers from the old vortex ring model's history (cut, and
still in the `plant.c` comment), numbers now written in standard form
(1.98 × 10⁻⁶ for 1.98e-6), and equation variables now written in words.

The pages were opened in headless Chromium at 1440, 900 and 430 px wide:
headings, chips and captions render, nothing overflows sideways, and the
console has no errors. The figures for the ground, battery sag, page layout
and missing effects pages were looked at by eye.

## Facts corrected against the simulator's code

The wiki had fallen behind the simulator. These were wrong on 24 September
and now follow the code:

- **Two aircraft, not one.** The airframe table in `plant.c` has the five inch
  and a 65 mm one-cell whoop, chosen with the Aircraft row on the Quad screen.
- **The five inch weighs 0.71 kg**, not 650 g: the owner raised it in two
  steps for a bigger pack and an HD camera.
- **Figure of merit 0.520, not 0.565**, and kq 3.04e-8, not 2.80e-8. With both,
  the five inch's full throttle thrust is 8.1 times its weight at Earth
  gravity in the model, not 9.2.
- **The Weight slider scales gravity.** At its normal setting the five inch
  flies at 1.62 times Earth gravity and the whoop at 2.025, so hover takes
  about 35 and 40 percent of the stick (`configs/airframes.js`), not a quarter
  or a fifth. No page said this before.
- **Propeller torque follows the air flow.** A descent unloads the motors and
  they speed up. The vortex ring page said the motors turn at the same speed
  throughout.
- **k_propwash is 0.15** on the five inch (0.05 on the whoop), not 0.08.
- **Gyro vibration** is 2.0 deg/s of broad band, 1.0 of imbalance line and a
  0.30 floor, not 1.5, 0.8 and 0.2.
- **Contact is inside the physics module.** Ground, roofs, walls, gates, trees
  and the train are solved in `world.c` at 1 kHz. "The integrator does not
  know that trees exist" is gone. A crash on the ground ends flat on the belly
  or the back (TUMBLE FLAT in `sim.c`, which reached the simulator's main
  while this pass was being written and is described as the chosen stand-in
  it is).
- **Ground effect** is modelled for the whoop (Cheeseman and Bennett), not for
  the five inch.
- **Turtle.** The automatic flip for a quad resting upside down is the
  simulator's own; Betaflight's crashflip mixer runs while the T key is held.
  crashflip_motor_percent and crashflip_expo are live, and the catalog
  snapshot, which still listed them as applied but inert, was recopied from
  the simulator.
- **A dropped diff file no longer loads.** Tunes come from the tune menu,
  rates from the Rates screen under Settings, and the firmware bench edits and
  exports the rest.
- **Arcade** turns off propwash, gyro noise and motor cant. No page mentioned
  it.
- **Check 10** is a band of 0.04 to 0.6 degrees, not a 2.0 degree floor.
- **Keyboard flight** starts in angle mode when racing, and M switches angle
  and acro; it no longer forces angle mode.
- **Launch control and angle mode**: while launch control holds the quad,
  Betaflight's own rule switches angle mode off.
- **Screens**: the firmware bench and the camera settings are on the Quad
  screen, rates and the Flight log under Settings, Pack charge on Before you
  fly.
- **Crossfire** in the radio figure: 7.5 ms and 1.8 ms, as `link.js` has it.
- **The simplified sliders** send the apply line; the shipped tunes type their
  gains directly and depend on nothing.
- **Settings pages**, from the helpers' reading of the code, among others:
  anti-gravity's cutoff is a low-pass on the rate of throttle change, not a
  high-pass; transient_throttle_limit shapes airmode's throttle shift and has
  nothing to do with current; feedforward_smooth_factor is applied before
  averaging; anti_gravity_p_gain is on by default; I-term relax is gated by
  the setpoint in both modes; launch_control_gain is used as the I gain;
  vbat_sag_compensation holds back motor range at full charge; the EZ landing
  pages had raise and lower the wrong way round; crash_recovery's BEEP acts
  like ON and DISARM does nothing here; max_check's raise and lower
  contradicted its own definition.

`src/wiki/model.js` now has the current mass, kq, figure of merit and
k_propwash, so the figures compute with them. Everything in the figures is at
Earth gravity, and the captions that quote a thrust to weight say so.

## Found and not changed

These are in the simulator's code or data, outside the wiki, and are left for
the owner:

- **Four settings the catalog marks LIVE have no effect**: pid_at_min_throttle
  and airmode_start_throttle_percent (read only in fc/core.c, which is not
  compiled; isAirmodeActivated() is stubbed true), ez_landing_speed (GPS
  speed, which does not exist here) and dyn_idle_start_increase (never
  applies while airmode is always active). Their pages say so in words under
  a Works here chip. Moving them to APPLIED_INERT in the simulator's
  `catalog.js` and recopying the snapshot would make the chip agree.
- **The block comment at the top of `plant.c`** still quotes the full throttle
  numbers of the old kq and mass: 2723 rad/s and a thrust to weight of 9.21.
  The mass note beside `.mass_kg` says 8.43. With the current constants the
  same equations give 2669 rad/s and 8.10.
- **`plant.c` uses "windmill brake state" for two different things.** In rotor
  theory the name usually means the fast descent beyond the vortex ring
  state. The wiki does not use the term.
- **The `bf_glue.c` comment on isFlipOverAfterCrashActive** says the shell
  raises crashflip when the quad is inverted and in contact; `main.js` raises
  it only while T is held.
- **`src/ui/fc.js` line 717** says launch control is "the same Launch control
  in Settings"; the switch is on the Quad screen.
- **The catalog's INERT reasons for the vbat_, ibat_ and bat_ keys** say "use
  Pack charge in Settings"; Pack charge is on Before you fly. The reasons are
  the simulator's data, shown on grey pages under "Why, from the settings
  catalog", and were not rewritten, because the snapshot must match. Some
  still use "plant" and "craft".
- **The PIDs screen's intro** says "100 is that tune's stock"; the whoop tunes
  store a master of 75 or 85.
- **The glossary is not used by any page.** Nothing imports
  `src/wiki/glossary.js`. The definitions were rewritten anyway, and its
  header now says so.
- **The PID figure's overshoot label** ("0 percent over" at the peak) can
  disagree with its own overshoot readout; that is figure code, unchanged.
- **The simulator's menu note for the wiki** still says "The closed loop, the
  plant, and every Betaflight 4.5.1 key".

## Claims kept that were not checked

Kept in plain words, or made neutral, and worth a look by someone who knows
Betaflight 4.5.1 well:

- What `level_race_mode` does. The old copy said it changes how angle mode
  handles yaw. The pages now say only that it changes how angle mode levels
  the quad.
- What `yaw_spin_recovery` does when it acts, and whether yaw_spin_threshold
  is used under AUTO.
- The exact meaning of the horizon settings, which are never used here.
- That integrated yaw is compiled into this build.
- Pilot habit claims carried from the old copy: PITCHONLY is the racing
  favourite, racers leave crash recovery off, D-only TPA is common, OFF was the
  old iterm_relax default, pidsum_limit is usually about 500.
