# Marketing

What a sponsor can buy on WebFPV, what they have to supply, what they get
back, and where every number in here came from.

## Why this folder exists

The sponsorship offering was real before it was written down. Five logo
slots on a track, the round robin that spreads them down a lap, the paint
on the grass, the minted link and the public per sponsor counters were all
built, shipped and argued about in three separate repositories over about a
month. What there was not was one place a person could read to find out
what is actually for sale.

So nothing here is new work. It is the offering assembled out of the code
that already implements it, with the source of every claim named so it can
be checked again later. A number in a file is evidence forever. A number in
a slide deck is evidence until somebody changes the code.

## The files

| File | What it answers |
| --- | --- |
| `inventory.md` | What a sponsor gets. Surfaces, counts, where a mark lands on a lap. |
| `artwork-spec.md` | What a sponsor's designer has to hand over, and the limits their file meets. |
| `attribution.md` | The sponsor link, what is counted, and the large amount that deliberately is not. |
| `brand-assets.md` | The creative that already exists: the sticker pack, the share card, the icons, the palette. |
| `package-outline.md` | The sellable units assembled from the above. Prices are not in it, and the file says why. |

## Where the claims come from

Every factual claim in these files is drawn from one of the three
repositories rather than from anybody's memory of them. The convention is
that a claim names its file, so the check is a `grep` rather than an
argument.

The three repositories, and what each one is the copy of record for:

- `Mathew-Harvey/WebFPVSimulator` is the simulator and the track builder,
  and it is the copy of record for anything shared. The logo slots, the
  budgets, the dressing rule, the printed artwork and the link handling on
  arrival all live there.
- `Mathew-Harvey/WebFPVSimulator-LeaderBoard` is the public board. The
  sponsor list, the fold that keeps a stranger's invented source out of a
  public table, and the counters a sponsor reads live there.
- `Mathew-Harvey/landingpage-WebFPVSimulator-` is the front door, and holds
  this folder, the sticker pack and the film.

## One word for one thing

The product's noun for the thing a sponsor buys a place on is a **track**,
never a course. `scripts/noun-lint.js` in this repository enforces it on
every string that reaches a reader, and the reason is in that file: a player
cannot be expected to work out that the thing they built, the thing they
published and the thing they are racing are the same object when the product
calls it two things.

The code's own comments say "course" in places, and the lint deliberately
allows that, because a comment is for whoever is reading the code. These
files say track throughout anyway, with one exception: `inventory.md` quotes
a comment from `src/trackbuilder/model.js` verbatim and the quote keeps its
own word.

This matters here more than in most folders. Marketing copy is the most
likely thing to be lifted into a sponsor facing page or a screen, and a
document that says course is how the word gets back in.

## What is deliberately not here

**Prices, tiers and terms.** Those are the owner's to set and no line of
code implies one. `package-outline.md` lays out the units and leaves the
number blank rather than inventing one that would then get quoted back.

**Audience figures.** The board counts pilots, sessions, laps, flight time
and crashes per UTC day, and those counters are public on the statistics
tab. Nobody has read a month off them into this folder, because a figure
copied into a document goes stale the day after it is written and the live
tab does not. Point a sponsor at the tab.

**Anything about who a visitor is.** There is nothing to say. The board
stores counters and never events, and `attribution.md` covers what that
rules out. It is a constraint on what can be reported and it is also the
most honest thing in the offering, so it is written down as both.
