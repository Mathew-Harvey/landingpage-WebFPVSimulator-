# Humanizer sweep of the landing page, September 2026

The September sweep recorded in `wiki-humanizer-2026-09.md` covered the wiki
and only the wiki: its three commits touched `src/wiki/` and nothing else. The
film, the sticker pack and the beats in `src/main.js` had never been measured
against the checklist. This is that pass, plus a re-measure of the wiki to see
whether the earlier one still holds.

Source consulted: `https://github.com/blader/humanizer`, SKILL.md at version
3.0.0, all 25 patterns.

## What was measured

Every reader-visible string on the three pages this repository serves, pulled
out by parsing rather than by grep: HTML text nodes and the attributes a reader
sees (`alt`, `aria-label`, `title`, `content`), and the string literals in the
modules that write to the DOM. Comments were excluded, because they are for
whoever is reading the code. 2,087 strings, about 30,400 words.

| | strings | words |
|---|---|---|
| `index.html` | 143 | 795 |
| `src/main.js` | 33 | 199 |
| `stickers/index.html` | 121 | 498 |
| `wiki/index.html` | 27 | 141 |
| `src/wiki/articles.js` | 259 | 11,887 |
| `src/wiki/cli.js` | 852 | 9,463 |
| `src/wiki/figures.js` | 432 | 5,091 |
| `src/wiki/glossary.js` | 39 | 936 |
| `src/fc/catalog.js` | 147 | 1,211 |

Two passes over it. A phrase pass for the 21 patterns a regular expression can
see, and a structural pass for the ones it cannot: a sentence repeated in two
places, a short paragraph-final sentence that restates the paragraph, three or
more consecutive sentences opening on the same word, and a heading echoed by
the copy directly under it.

## Result

Zero hits on 19 of the 25 patterns across the whole corpus. Nothing at all on
staged run-ups, arguing with no one, sayings that sound deep, stacked
qualifiers, model vocabulary, inflated significance, shallow -ing riders, sales
language, borrowed authority, avoiding is and are and has, emoji, curly quotes,
chatbot residue or knowledge-limit disclaimers. The dash rule and the quote
rule were already house rules with a lint behind them, so those two were
expected.

The phrase pass produced five single hits and all five were false positives on
inspection: "Tighter long-term RPM" is a hyphen doing its job before a noun,
`feedforward_boost` really does emphasise the start of a move, a tune that
feels "connected to the hand" is a feel and not a vague association between two
entities, "Blackbox here is a CSV" is not "here is a", and "that is what the
flight controller is for" carries the claim rather than restating one.

The 36 triads are lists of things that exist: the mixer's three columns, the
three drag areas, three brands of radio link, the elements a builder places.
Humanizer keeps three real items when the meaning needs three.

The 50 remaining `X, not Y` constructions were measured against the owner's own
prose in the last sweep and left. Nothing has changed that finding, and none of
them is on the landing page.

## What was changed

Four sentences, three on the film and one on the wiki.

**The close repeated the invitation, word for word.** Pattern 2, the strongest
form of it. `#close` read "Nobody gets smooth by reading about it. Free, in the
browser, no install, no account. Plug in a radio or a game controller and take
a lap." That third sentence is the invitation card's own last line, character
for character, and the second is a fourth reading of an offer the eyebrow, the
kit list table and card 01 all carry. The four cards sit directly under the
paragraph and make the same offer at larger type. So the close keeps the one
sentence that is not a repeat and stops.

**A beat said the act's own lede again.** Act 4's copy says "A Japanese town,
and a freestyle map." at T 3.02, and `CITY_BEATS[1]` said it again at T 3.42.
`main.js` already says a beat names what is in frame when it appears, so it now
does: at 0.42 of the act the pace ramp in `CITY_S` has finished, which puts the
aircraft out of the corridor and on to the road, and the beat reads "A shopping
street, then the main road."

**An imperative was spliced onto a declarative.** Act 5 read "Every Season 5
track is in the simulator, and using the builder, make your own", which is a
dangling participle and a change of mood inside one clause. It now reads "and
the builder makes your own", which is the wording CLAUDE.md itself uses.

**Two pages in a row ended their lede the same way.** `start-whyacomputer` is
step 2 of the reading path and ends "Everything else on this site follows from
that difference." `start-nowings` is step 3 and ended "Every manoeuvre follows
from that." A reader walking the path meets the same move twice running, which
is pattern 2 at the scale humanizer calls out. Step 2 is the version quoted in
`wiki-voice.md` as the model, so step 3 changed: it now says what the aircraft
has to do instead, "To slow down it has to point away from where it is going",
which the page's second paragraph then explains.

## Changed while in the copy, not a humanizer finding

The share card's kit list said "a gamepad and a browser is the whole kit list".
CLAUDE.md is explicit that no brand or shape of controller is named anywhere,
"in the invitation, the kit list, the beat and the cards", and this sentence is
the kit list. It now says "a radio or a game controller is the whole kit list".
Nothing on the page said "gamepad"; the meta description was the one place the
rule had been missed, and it is the copy a search result and a link preview
show first.

## Declined, with reasons

- **The admission's "There, out of the way. Now let's fly."** Pattern 4 lists
  "let's dive in" and its relatives, and this is the same shape. It stays
  because it is the owner's own wording, recorded as such in the commit that
  set it and in CLAUDE.md, and humanizer's first rule about voice is that a
  writing sample outranks the patterns.
- **"Plug in a radio or a game controller" in card 01 and in the lap beat.**
  Still two sightings of one sentence, and deliberately: CLAUDE.md asks for
  that phrase every time the controller is named. It was the invitation and the
  close saying an identical full sentence at opposite ends of the page that was
  the defect, not the phrase.
- **"Three clauses cover the difference" and "The three areas here are
  different on purpose."** Both announce rather than state, which `wiki-voice.md`
  rule 9 would cut. Both also carry a fact: there are exactly three clauses, and
  the three CdA values really are distinct in the plant. Left, and recorded here
  so the next pass does not have to rediscover the argument.
- **The 12 instances of writing about a previous version, the 8 repeated
  sentence openings and the 56 passives.** All re-measured, all unchanged from
  the reasons written down in `wiki-humanizer-2026-09.md`.
- **The repeated reason strings in `src/fc/catalog.js`.** "No GPS sensor in the
  plant" appears four times because four keys share the reason. It is a
  snapshot of the simulator's catalog, which is data, and the copy of record is
  in the other repository.

## Checks

`lint:page` 25 of 25 clean, `lint:wiki` clean at 36 articles, 35 figures, 706
cli and feature pages, and `lint:nouns` pass, all run in the same session as
the edit.

Then the served pages, which is what the lints cannot see. `npm run serve`,
then headless Chromium at 1440 by 900 and 430 by 932, reading the rendered DOM
rather than the source. Zero console errors, zero page errors and zero failed
requests at both widths, and no horizontal scroll at either.

The close was read off the page at both widths: one line, "Nobody gets smooth
by reading about it.", with the headline's top at y 172 against a nav whose
bottom edge is at 66 on the wide screen and at y 143 on the phone. The
September review's finding 6 was that this headline drew behind the nav; it
does not now, and the whole close including the four cards fits one 900 px
screen. The city act's three beats were read out of the DOM as they came on,
in order, and the new one reads "A shopping street, then the main road." Act
5's copy was read back as "Every Season 5 track is in the simulator, and the
builder makes your own." The wiki page was opened at `#start-nowings` and its
new lede read off the rendered page under the right h1.

Nobody has flown the simulator from these links in this session, and no lint
and no screenshot can say whether a paragraph is any good.
