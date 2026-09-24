# The wiki's voice

A physics textbook for Year 10 students: plain English, every term explained
where it first appears, no analogies, and nothing left out. This file is the
working definition, because "make it clearer" is not an instruction anybody
can act on twice the same way.

## Where this came from

On 24 September 2026 the owner asked for the whole wiki to be rewritten with
the humanizer skill (github.com/blader/humanizer, version 3.0.0) so that it
"makes sense" and "reads like a text book aimed at yr 10 students, plain
english. get rid of the analogies". That replaced the magazine register this
file described earlier in September, in which every analogy had to predict
something. There are no analogies now, predictive or not.
`docs/wiki-textbook-2026-09.md` records the rewrite itself.

## The rules

**1. Write for a reader aged 15 or 16.** They know forces, Newton's second
law, weight, speed and acceleration, energy and power, voltage, current and
resistance, graphs, squares and square roots, ratios and percentages. They do
not know control theory, filters, quaternions, parameter groups or any FPV
slang. Anything outside the first list is explained before it is used.

**2. Explain a term in the sentence that introduces it, then use it.** "The
bell, which is the spinning outer case the propeller is fixed to, has mass."
Never a bare piece of jargon, and never a definition the reader has to go and
find. A setting name, a file path or a function name stays exactly as it is,
because readers search for it, with a few words saying what it is.

**3. No analogies and no figures of speech.** Say what a thing is and what it
does. A propeller is not a screw, the D term is not a brake, the I term is not
a memory, and a quad does not bite, eat, chase or wade. A real example of the
same physics is allowed: helicopters do have vortex ring state, and a spinning
wheel is a gyroscope. A comparison that stands in for an explanation is not.

**4. Keep every fact, and check it.** This is documentation. Every number,
file path, status and check that was in the old copy is still in the new copy,
unless the simulator's code has changed, in which case the page follows the
code. The code in the simulator repository wins every disagreement. A number
in a figure caption must be one the figure computes (see `src/wiki/model.js`).

**5. Keep the maths at Year 10 level, and keep the maths.** Ratios, squares,
straight-line graphs, percentages and simple formulas stay, written with
their units and explained in words. Detail that needs more than that (a
numerical method, a derivation step) is either explained in plain words or
left in the code comment it came from.

**6. Plain structure.** Short and medium sentences, active voice, one idea
per sentence where possible. Each article has three sections, The idea, How
it works and In this simulator. Each settings page has What it does, How it
works, In this simulator, If you raise it and If you lower it, and each of
those is one to three sentences, because a settings page is looked up rather
than read through.

**7. No humanizer tells.** No "not X but Y" contrast unless both halves
carry information or the negative half corrects something a reader would
actually believe. No one-line closer that repeats the paragraph. No staged
opener ("Here is the thing"), no forced group of three, no inflated words, no
bold, no filler adverbs (really, quietly, very as an intensifier). History of
earlier versions of the model belongs in PROGRESS.md and the code comments,
not in an article, except where it is the evidence that a term is needed.

## Still true from before

- No em dashes or en dashes anywhere. The minus signs in the equations are
  U+2212 and `wiki-lint` knows the difference.
- No scare quotes around ordinary words. Quotation marks are for quoting.
- Straight quotes only.
- A status is said in words a reader can follow. The catalog's codes (LIVE,
  GATED, APPLIED_INERT, INERT, ABSENT) are shown on the page as Works here,
  Off at 1 kHz, Stored, not used, Not simulated and Configurator only
  (`STATUS_LABEL` in `src/wiki/cli.js`).

## Figure captions

A caption says what the reader is looking at, then what it means, then the
consequence, in plain words. It quotes no number the figure does not compute,
and it describes the figure it sits under, not the article.
