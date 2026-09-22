# The package, in outline

The sellable units, assembled out of what `inventory.md` and
`attribution.md` establish is actually built. This is the draft a
conversation with a sponsor can be held from.

## There are no prices in this file, and that is on purpose

Nothing in any of the three repositories implies a price, a tier or a term.
Putting a number here would mean inventing one, and an invented number in a
file called `package-outline.md` gets quoted back within a week as though
somebody had decided it.

Every row below has its price left as **`TBD`**. Filling them in is the
owner's decision and wants the traffic figures off the live statistics tab
in front of it, which is also why no traffic figures are copied into this
folder.

## The units

### 1. Track exclusive

All five logo slots on one track, so every dressed structure on the lap
wears the same mark: every gate header, every upright sleeve, every pennant
and every track side flag. Plus paint on the grass wherever the author puts
it, plus the minted link.

This is the only configuration where a pilot flies a whole lap seeing one
name, and it is the product worth leading with.

Price: **TBD**

### 2. Track slot, one of five

One of the five slots on a shared track. The mark lands on every fifth
structure in flying order, spread down the lap rather than clustered. On a
fifteen gate track that is three gates, at three separate moments of a
race.

The floor is a fifth of a track, because there is no sixth slot.

Price: **TBD**

### 3. Paint on the grass

A mark on the turf, sized, placed and angled where the sponsor wants it:
the start straight, a hairpin, wherever the camera sits at the moment worth
owning.

Separately sellable from the five gate slots, because it is placed rather
than allotted, and it can be sold onto a track that is already popular
without disturbing anything, for the reason in the next section.

Price: **TBD**

### 4. Link only

The minted attributed link and the public arrival counter, with no presence
on any track. The unit for a sponsor who wants to run a code or a QR on
their own material and see what it returned.

Price: **TBD**

## Term, rotation, and the thing that makes terms possible

**The whole sponsorship layer sits outside the layout hash.** This is the
single most commercially important fact in the three repositories and it is
worth stating carefully.

A track's leaderboard is keyed to its layout. Change the flying layout and
the old times are cleared, because they were flown on a different track.
That is correct and it is not negotiable.

But the fingerprint reads only the field, the elements and the flying order.
`branding.logos` is not in it at all, and `groundLogo` is filtered out of
the elements on both sides. Both halves were checked for this document:
`layoutFingerprint()` in the simulator's `src/share/listing.js` and
`layoutHash()` in the board's `src/validate.js`.

So a track's sponsors can be **added, changed or removed on an established
track without clearing a single time.** A sponsor can take a three month
term on a track with two years of times on it, and at the end of the term
the next sponsor takes the same slot and the leaderboard is untouched.

That is what makes a rotating, term based offering possible at all, and
without it every sale would have to be on a fresh track with an empty
board, which is the least valuable thing there is to sell.

### The operational catch, and it is a real one

A rotation is a **republish of the same track id with its edit key**. The
board refuses a republish of an id without that key.

The edit key is returned on first publish and kept **in the browser that
sent the track**. Lose the browser, lose the key, lose the ability to
rotate that track's sponsors. The fallback is an admin removal and a fresh
publish, which mints a new board id.

Before selling a term on any track, confirm the edit key for it still
exists. Before selling terms as a product, the edit keys for the tracks
being sold want to be somewhere more durable than an author's browser
profile. **This is the one thing on this page that should be sorted out
before money changes hands**, and it is an operational fix rather than a
code change.

## What to tell a sponsor they get in writing

- A named slot or the exclusive on a named track.
- Their mark on the header board, both sleeves, the pennants and the track
  flags of every structure their slot dresses, readable from both sides.
- Paint on the grass at an agreed position, if bought.
- A minted link, with the slug fixed for the life of the deal.
- A public arrivals counter on the statistics tab, readable by them at any
  time without a login.
- The undertaking that the slug will not change, since it is printed on
  their material.

## What to tell them it is not

Say this at the start of the conversation rather than at the end of the
quarter.

- **No impression count.** Nothing counts how many times a mark was on
  screen.
- **No per track flight figures.** Arrivals are per sponsor link; laps and
  pilots are per site. There is no report of how many laps were flown on the
  track carrying their mark. This is the biggest gap in the offering and it
  is the first thing to build if sponsorship becomes real revenue.
- **Counts are a floor, not a total.** A browser sending Global Privacy
  Control is never counted, and the page carries an off switch.
- **Nothing about who anybody is.** No addresses, no user agents, no
  referrers, no cookies, no row describing one person. A sponsor wanting
  audience demographics cannot be given them, and should hear that before
  signing rather than after.

## What would have to be built to sell more

Listed in the order the value arrives, not the order of difficulty. None of
this exists today and nothing here should be promised to a sponsor as
imminent.

1. **Per track reporting.** Laps and pilots per track, joined to which
   sponsors that track carried at the time. The board already holds
   `hasLogo` and `logoCount` per track, and the times are already per
   track, so the shape is closer than it looks. It is the difference
   between selling a slot on trust and selling it on a number.
2. **Durable edit key custody**, per the catch above. Operational, not
   code, and it blocks term based selling until it is done.
3. **A term record.** Today a sponsor's presence is whatever the track
   document currently says. There is nothing anywhere recording that a
   sponsor bought a slot from one date to another, so nothing can report on
   a term or expire one. A rotation is a person remembering to do it.
4. **A sponsor facing view.** The statistics tab is public and general. A
   sponsor reading their own arrivals has to find their row on a list. A
   permalink to their own figure would cost little and is the kind of thing
   that gets forwarded inside a sponsor's own company.

## Recommended shape of a first deal

One track exclusive, on the most flown track, for a fixed term, with paint
on the grass at the start straight included, and the reporting limits
written into the agreement in the sponsor's own copy rather than left to be
discovered.

It exercises every part of the system that exists, it does not depend on
anything in the list above being built first, and if the edit key for that
one track is confirmed to exist beforehand it can be rotated cleanly at the
end of the term without touching a single lap time.
