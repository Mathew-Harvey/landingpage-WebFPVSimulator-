# Humanizer sweep, September 2026

A final sweep of the whole wiki against blader/humanizer, a checklist of 25
patterns that mark text as model-generated. Source consulted:
`https://github.com/blader/humanizer`, SKILL.md and README.md.

Scope: every reader-visible string in `articles.js`, `cli.js` (all 706 catalog
and feature pages), `figures.js` captions and `glossary.js`. 5,250 strings.

## Result

Clean on 18 of the 25 patterns, with zero hits each:

| | |
|---|---|
| P3 sayings dressed as insight | P16 sales language |
| P4 staged run-ups | P17 borrowed authority |
| P6 forced triads | P18 avoiding is/are/has |
| P9 stacked qualifiers | P19 bold as decoration |
| P10 cliche hyphenated pairs | P20 decorative headings and emoji |
| P12 overused model vocabulary | P21 curly quotes |
| P13 inflated significance | P22 chatbot residue |
| P14 vague associations | P23 knowledge-limit disclaimers |
| P15 shallow -ing riders | P8 em and en dashes |

P8 and P21 were already covered by the house rules, so those two were expected.
P12 and P13 each produced hits that turned out to be correct technical usage on
inspection: "sliding discrete Fourier transform", "a transformation of the I
state", and "chopping throttle kills the loop's leverage", which is mechanical
leverage rather than the business verb.

## The finding that mattered: measure against the sample, not against zero

The two loudest raw counts were P1, the "X, not Y" antithesis, at 306 string
hits, and P2, short closing fragments, at 21. Taken at face value those look
damning.

Two things deflate them. First, 306 hits is 54 distinct sentences: the CLI
family templates repeat across hundreds of pages, and one sentence about the HUD
accounts for 122 hits on its own. Second, and more usefully, humanizer's own key
rule says to match the patterns in the provided writing sample rather than
eliminate them, and this project has a writing sample: three CLAUDE.md files,
4,793 words of the owner's own prose.

Measured per thousand words:

| Pattern | Owner's CLAUDE.md | Wiki articles |
|---|---|---|
| P1 antithesis | 2.1 | 1.6 |
| P2 short closing fragment | 5.2 | 3.5 |

The wiki sits below the owner on both. The owner's own instances are
structurally identical to the wiki's: "decisions already made, not options",
"ported, not written", "a requirement, not a nice-to-have", "say why, not what",
"a list of addresses, not a rule about them". This is the house voice, and in a
settings reference the construction is doing real work: it names which of two
confusable things a key is. Zeroing it out would have moved the wiki further
from the owner's writing, not closer.

So the fix was not a cull. It was six specific sentences.

## What was changed

- **P5, arguing against an objection nobody made.** Three antitheses were
  defending rather than disambiguating. "is discrete time behaviour, not
  exaggeration" lost its second half. "Raising the loop rate to un-grey it is a
  human decision, not a suggestion from this page" became "Un-greying it means
  raising the loop rate, which is a human decision". "A different airframe is a
  change to the shape of the physics model, not a value a wiki page can offer"
  dropped the defensive tail. A fourth, "That is geometry, not piloting",
  contrasted with nothing the reader was thinking.
- **P2, a fragment standing in for the claim.** The `physics-timestep` lede read
  "That is deliberate, and load-bearing", which asserts importance instead of
  stating it. It now says what the fixed timestep buys. The AIRMODE feature page
  said "Without it, idle is a brick"; it now names the mechanism in the same
  number of words.
- **P24, a heading repeated in its own first sentence.** The catalog fallback
  page opened "A real Betaflight 4.5.1 CLI key named ${k}" under a heading that
  is `${k}`, above a meta line that also says `CLI key ${k}`: the key name three
  times before any information. The OSD family did the same with `OSD element
  "${elName}"` under the heading `OSD: ${elName}`. Both rewritten. This was the
  largest real win by page count, since the fallback covers every catalog key
  without a named family.

## Declined, with reasons

- **P25, writing about previous versions: 12 instances, all kept.** Humanizer
  means describing a superseded draft instead of current behaviour. What these
  are is engineering provenance: "An earlier model used axial = 1 −
  va/pitch_speed clamped at 1.35", "Before this term existed the pitching moment
  was identically zero at every speed". Each records why a constant has the value
  it has, which is the thing CLAUDE.md asks for and the thing a reader needs to
  avoid re-making the mistake. Two of the twelve were false positives on the
  regex: "the wake no longer clears the disc", and "phase margin you no longer
  have".
- **P7, repeated sentence openings: 8 instances, all kept.** Humanizer targets
  lazy pronoun handling. These are parallel lists: `physics-missing` opens 11 of
  11 sentences with "No", which is the correct form for a list of absences, and
  `start-howto` opens three sentences with "In" because they name the three
  section headings. Varying them would make the parallel harder to see.
- **P11, passive voice: 56 candidates, all kept.** "Gravity is applied along
  world −z after the body forces are rotated out" has no useful active form, and
  humanizer's own rule says to keep technical writing neutral. The passives here
  have an obvious implied actor, which is the plant.
- **The remaining 50 P1 antitheses.** They disambiguate: "Kd times a filtered
  derivative of gyro, not of error", "the game shell, not this field", "firmware
  units, not SI". Cutting them would cost the reader information.

## Checks

`lint:wiki`, `lint:nouns` and `lint:page` all run in the same session as the
edit and all pass: 36 articles, 35 figures, 706 cli and feature pages, 25 of 25
page checks. The technical-token check was run per file against both the
previous commit and 27b7047: nothing lost either way.

Three catalog pages were rendered and read to confirm the rewritten templates
still interpolate: `cli-adc_device`, `cli-osd_vbat_pos` and `feature-AIRMODE`.
No page was read on the served wiki, and no lint can see whether a paragraph is
any good.
