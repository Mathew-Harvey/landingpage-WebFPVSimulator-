# Wiki rewrite, September 2026: the magazine pass

The September copy pass cut the wiki's prose down. The owner read the result
and asked for something different: the wiki should read like a feature in
Scientific American or National Geographic. Terseness was not the target;
register was. This file records the rewrite, and `docs/wiki-voice.md` is the
style contract it was written against.

## What changed

All 36 article pages in `src/wiki/articles.js` were rewritten: every lede,
every paragraph of the In the air column, and every paragraph of In the lab and
In this simulator. The file was regenerated from the copy rather than patched,
so the diff is total.

Nothing structural moved. Page ids, chapters, titles, kickers, figure bindings,
related links and source lines were carried across programmatically from the
previous version and then compared field by field: byte identical, all 36.

## The measurement

The habit the owner was reacting to shows up in the numbers. The old air column
was a wall of short declaratives of near-identical length, which is what a
machine emptying a buffer sounds like. A magazine feature varies sentence length
on purpose, building through subordinate clauses and then landing something
short.

| Air column | Before | After |
|---|---|---|
| Sentences | 285 | 308 |
| Mean length | 13.2 words | 19.7 words |
| Standard deviation | 7.8 | 11.2 |
| Short sentences, 8 words or fewer | 33 percent | 17 percent |
| Long sentences, 30 words or more | 4 percent | 19 percent |
| Total words | 3,764 | 6,058 |

The standard deviation is the number that matters. Rhythm is not decoration: it
is how a reader knows which sentence carried the point, and a corpus with no
variance gives them nothing to go on.

The In the lab column grew from 3,901 to 4,995 words, which is connective tissue
rather than new material. It stays technical; Scientific American does not write
its equations in the voice of its opening paragraph either.

Forty-one of the 46 air paragraphs that follow another paragraph now open on a
back-reference or a connective. Previously most paragraphs were islands.

## Nothing was traded away for a nicer sentence

This is documentation, so narrative is a delivery mechanism and not a licence. A
scan extracted every technical token from the old file, meaning decimals,
scientific notation, snake_case identifiers, file paths and firmware constants,
and checked each one against the new file. Four came back missing on the first
pass and all four were restored, because each carried something a paraphrase
lost:

- **SDFT**, the sliding discrete Fourier transform behind the dynamic notch. The
  rewrite had said "the code is compiled and present"; a reader looking the
  algorithm up needs its name. Now introduced in apposition and named.
- **QUADX**, and the qualifier "at this modelling order" on the claim that a
  symmetric frame cannot yaw from a roll. The hedge is real: the claim holds to
  the order this model works to, not universally.
- **d_min**, which is the CLI name for the field the Betaflight interface labels
  D max. That mismatch is a trap and naming it is the point.
- **ANGLE**, the firmware mode name, alongside the plain-language phrase.

The second scan came back clean: no technical token present before is absent
now.

## What was deliberately not rewritten

**The 696 catalog pages in `src/wiki/cli.js`.** Nobody wants a narrative essay
about `gyro_soft_notch_cutoff_2`, and somebody looking that key up between races
wants the answer on one screen. Reference has its own register. The dividing line
is the reader's posture: articles are read, the catalog is consulted. If this
judgement is wrong it is a large piece of work and worth saying so before it
starts.

**The figure captions in `src/wiki/figures.js`.** These were already written in
close to the target register, stating what the reader is looking at and then what
it means. They were cleaned in the September pass and left alone here.

**The glossary.** One-sentence definitions are reference, same argument.

**The h1 "How a racing drone actually flies"**, for the reasons recorded in
`wiki-copy-2026-09.md`. It is one of eight surviving uses of "actually", and all
eight now mark a real contrast between an ideal and a real case rather than
acting as intensifiers.

## Checks

`npm run lint:wiki` and `npm run lint:nouns` were run in the same session as the
rewrite and both pass: 36 articles, 35 figures, 696 catalog fields, 706
cli/feature pages, 180 authored keys. `articles.js` imports cleanly in Node, all
36 pages carry three sections, and no paragraph is empty. The em and en dash
check passes, as it must, since the only dashes in the file are U+2212 minus
signs in equations.

Two pages, `start-welcome` and `physics-vrs`, plus the air column of
`control-tpa`, were read as rendered prose during the rewrite. The other 33 were
not. No page was read on the actual rendered wiki, and no lint can see whether a
paragraph is any good.
