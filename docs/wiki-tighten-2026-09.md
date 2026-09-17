# Wiki tightening, September 2026: the no-fluff pass

Third pass in a week, and the last one closes the arc. The first cut the prose
down and lost the readability with it. The second rewrote it as a magazine
feature and got the readability back at the cost of 61 percent more words. This
one keeps the shape and takes the padding out, across every surface including
the catalog, which the previous pass deliberately left alone.

`docs/wiki-voice.md` is the contract and now carries a ninth rule for what gets
cut. `wiki-copy-2026-09.md` and `wiki-rewrite-2026-09.md` are the earlier
records.

## What was cut

Four habits, all introduced by the magazine pass:

- **Announcement sentences**, which tell the reader what the next sentence will
  do. "The evidence for its importance is what happened without it." "The
  algebra is worth following, because." "This matters more than it sounds."
  Deleted, and the content left to land on its own.
- **Decorative tails**, the clause hanging off a sentence whose point has
  already been made. "...which is what makes it disorienting from inside the
  goggles."
- **Restatements**, where the second half of a sentence repeats the first.
- **Expletive openers**, "there is" and "it is the", replaced by a subject and a
  verb.

Terseness was not the goal, which is the mistake the first pass made. A 58 word
sentence listing PlantParams earns its length. A 12 word one announcing the next
paragraph does not.

## Numbers

| Surface | Before | After | Change |
|---|---|---|---|
| Article prose | 13,792 words | 12,135 | -12% |
| of which the In the air column | 6,057 | 5,159 | -15% |
| Figure captions | 2,628 (mean 75) | 2,353 (mean 67) | -10% |
| Catalog copy | 10,979 | 10,857 | -1% |
| Glossary | 38 entries | 38 entries | 8 trimmed |

Sentence rhythm survived the cut, which was the thing at risk. Across all 652
article sentences the mean is 17.2 words with a standard deviation of 9.5. The
pre-magazine version was 13.2 with a deviation of 7.8, which is the staccato the
owner objected to; the magazine version was 19.7 with 11.2. The variance is what
makes a page readable, and it is still there.

## The catalog

The previous pass argued the 696 catalog pages should stay reference and not be
rewritten. That still holds, and it is why this pass moved only 1 percent of
their words: at a mean of 6.3 words per string, most of the file is already as
short as it can be, and "Same." is the correct answer for an OSD coordinate that
does the same nothing in both directions.

The fat was concentrated in 26 long entries, and those were cut: the catalog
index page, the OSD and filter family templates, and the authored PID, rates,
mixer and dynamic idle keys. A separate sweep removed the last of the scare
quotes around ordinary words (`"barely on"`, `"make D easier"`, `"at min"`,
`"max"`, `"I am landing"`) and two idioms that did not survive a second reading,
gravy and nasty.

Reviewing the catalog was in scope this time and it was reviewed. It came back
with less to change than the articles did, which is the expected result for a
file whose register was correct already.

## Nothing was traded for a shorter sentence

The same check as last time, run per file: every technical token, meaning
decimals, scientific notation, snake_case identifiers, file paths and firmware
constants, extracted from the previous version and looked for in the new one.
Zero missing in `articles.js`, `cli.js`, `figures.js` and `glossary.js`, against
both the magazine version and commit 27b7047, which is where this week started.

## Checks

`lint:wiki`, `lint:nouns` and `lint:page` all run in the same session as the
edit and all pass: 36 articles, 35 figures, 696 catalog fields, 706 cli/feature
pages, 180 authored keys, 25 of 25 page checks. All five wiki modules import
cleanly in Node.

One failure worth recording: an edit introduced an unescaped apostrophe into a
single-quoted JS string and `lint:wiki` caught it on the next run, which is the
argument for running the cheap check after every batch rather than at the end.

Two pages were read as rendered prose, `start-welcome` and `physics-wash`. The
other 34 were not, none of the 696 catalog pages were read on screen, and no
lint can see whether a paragraph is any good.
