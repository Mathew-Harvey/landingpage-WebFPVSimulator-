# Wiki copy pass, September 2026

The owner read the wiki and said the prose sounded generated rather than
written. This file records what was changed and what was left, because a copy
pass whose reasoning vanishes gets undone by the next person who likes a
sentence.

Scope: `src/wiki/articles.js`, the captions and canvas labels in
`src/wiki/figures.js`, `src/wiki/glossary.js`, `src/wiki/cli.js`, and one line
of `src/wiki/wiki.js`. No number, file path, status, threshold or physics claim
was touched. The change is sentence shape only.

## What was actually wrong

Not vocabulary. A scan for the usual generated-text words returned nothing
worth cutting: no "delve", no "seamless", no "robust", no "crucial". The three
hits for "harness", "leverage" and "revolution" were a test harness, the
mixer's leverage at low throttle, and revolutions per minute. There are 34
dashes in the corpus and every one of them is U+2212 MINUS SIGN inside an
equation, which is why `wiki-lint`'s em and en dash check has always passed.

The problem was four sentence habits, each fine once and a tic at volume.
Counts are over `articles.js`, `figures.js`, `glossary.js` and `cli.js`.

| Habit | Before | After | What it looked like |
|---|---|---|---|
| The `X, not Y` antithesis | 85 | 79 | Nearly every `sim:` paragraph and most ledes ended in one. 38 of the 85 were in `articles.js` alone |
| Setup and knockdown | 10 | 4 | "That sounds like a toy helicopter. It is not." |
| Quoted ordinary words | 49 | 24 | `a fitted "feel" curve`, `"crisp" versus "soft"`, `you will not "run out" mid-lap`. 21 of the 49 were in `articles.js` |
| Filler adverbs in copy | 32 | 2 | actually, really, quietly, happily, silly, simply |

Those four together are what reads as generated. Each one is a way of making a
sentence sound conclusive without adding anything to it, and when every
paragraph ends the same way they cancel out: the reader stops hearing emphasis
because everything is emphasised.

A fifth habit has no clean count: the aphoristic closer, a pithy line that
restates the paragraph it ends. "Verification would be theatre." "The sport is
learning those instincts until they are faster than thought." "Mixing those two
categories is how a wiki becomes fiction." Roughly thirty were cut by hand or
replaced with the fact they were standing in for.

## What was done

- **Antithesis cut where it was decorative, kept where it disambiguates.**
  Down from 38 to 35 in `articles.js`, and the survivors all tell the reader
  which of two similar things this is: "ported, not written", "GATED, not a
  wiring bug", "D is a filtered derivative of gyro, not of error". In the CLI
  reference the construction is the right one for the job and was mostly left,
  because a settings page exists to say what a key is and is not. The four
  surviving `It is not` constructions are informative negations rather than
  rhetorical setups.
- **Repeated lines deduplicated.** Where a good line appeared both on a page
  and on its figure, the figure kept it and the page lost it: "the art is
  spending delay where noise would have cost more", "a racer flies a picture",
  "mixing those two categories is how a wiki becomes fiction", "hovering is the
  least efficient thing a quad can do", "one of the loudest ways a simulator can
  tell on itself", "there is no half-self-level".
- **Quotes kept only where they quote something.** The two left in
  `articles.js` quote a firmware semantic ("in the write table") and a stick
  convention ("the stick is a tilt"). The rest in `cli.js` quote Configurator
  labels and firmware values.
- **`physics-lens` no longer contradicts itself.** The plain column said the
  printed lens figure was 150 degrees and the lab column worked the example at
  155. `src/render/lens.js` says "published 150 to 160 degrees" and picks 155
  for the worked case, so the plain column now says 150 to 160 and the lab
  column keeps 155. This closes the `physics-lens` entry in the deferred list
  of `wiki-review-2026-08.md`. No number in the code changed.
- **The figures are now said to be interactive.** The August review recorded
  that zero of 849 lines of article prose mentioned dragging anything. One
  sentence in `start-howto` now does. That closes another deferred entry.
- **One title shortened.** "The camera, which is not the plant" became "The
  camera". The lede already carries the distinction.

## What was left alone, and why

- **The h1 "How a racing drone actually flies".** It is the only surviving
  "actually" in the copy. It stays because the August review chose this title
  to fix a worse problem (C1: the old title told the target reader the document
  was written for somebody else), and because in a title the word sets up the
  contrast with what a reader assumes. Changing it also means changing the og:
  and twitter: titles in `wiki/index.html`. If it should go, it should go in
  all four places at once. The other surviving adverb is "PT2 and PT3 are not
  simply better" on the filters figure, where simply means straightforwardly
  and is carrying its own weight.
- **"A sim without this is glass. A sim with too much of this is a washing
  machine."** This is the same shape as the aphorisms that were cut, and it
  survived because it is the only statement of the propwash tuning trade on the
  page. It carries information; the cut ones restated the paragraph above them.
- **The CLI family templates' "Same." and "Same in reverse."** Terse to the
  point of curt, but honest: an OSD coordinate does the same nothing in both
  directions, and padding that out would be the filler this pass was clearing.
- **The air column vocabulary pass**, still deferred from August. The scripted
  scan found 43 sentences in the plain-language column carrying developer
  vocabulary. This pass fixed sentence shape, not vocabulary, and did not go
  looking for those 43.

## Checks

`npm run lint:wiki` and `npm run lint:nouns` were both run in the same session
as the edit and both pass: 36 articles, 35 figures, 696 catalog fields, 706
cli/feature pages, 180 authored keys. `articles.js` and `figures.js` were
imported in Node to prove they still parse. Before and after counts in the
table above were measured against `git show HEAD:` copies of the same files.

Neither lint can see prose quality, and nothing in this pass was read on the
rendered page.
