# The inventory

What a sponsor actually gets when they take a track. Every figure here is
in the code, and the file that holds it is named beside it.

## The unit of sale is a track, not an impression

A sponsor buys a place on a race track. The track is a document an author
builds in the track builder, publishes to the board, and other people fly.
There is no ad server, no auction and no rotation against a clock: the mark
goes into the track document and travels with it, so anybody who opens that
track sees it, on the board's thumbnail and in the simulator alike.

`src/trackbuilder/model.js` puts the reasoning plainly: "A course is sold to
sponsors, and a sponsor wants their logo on gates a pilot passes rather than
on a board in a corner."

## Five slots

`LOGO_SLOTS = 5` in `src/trackbuilder/model.js`. A track carries at most
five sponsors.

Five is not a round number somebody liked. It is the point past which a
pilot stops being able to tell one sponsor's gate from another's at commit
range, which is the speed a racing quad arrives at a gate, and it is also
about as much artwork as the document's size budget can carry. Both reasons
are written into the constant's comment.

The practical consequence for a sponsor: an exclusive track is a track
sold once, and a shared track divides by at most five. There is no tier
below a fifth of a track, because there is no sixth slot.

## Where a mark lands on a lap

`dressOrder()` in `src/trackbuilder/model.js` walks the flying order and
numbers the structures. Structure *i* wears mark *i* mod *n*, where *n* is
how many sponsors the track carries.

Two properties of that rule are the thing a sponsor is buying:

**It is spread, not clustered.** Fifteen gates and five sponsors is three
gates each, and the three are spread down the lap rather than being the
first three. A sponsor is seen at three separate moments of a race instead
of once in the opening two seconds.

**It counts structures, not passes.** A ladder flown three times has one
header board, so it takes one slot rather than three. A flag scored through
a virtual square carries no vinyl at all, so it takes none. The count is of
places a mark is printed, which is what was sold.

The same function feeds both the simulator's renderer and the track
builder's 3D preview, so what an author dresses is what a pilot flies. That
was deliberate: writing the rule once in each renderer is exactly the drift
that would have somebody selling one thing and delivering another.

## The printed surfaces

A gate wearing a sponsor's mark prints it on:

- **The header board.** The board across the top of the gate, 2.74 by 0.58
  metres of banner. This is the one a pilot lines up on.
- **A sleeve down each upright.** 0.42 by 1.83 metres each. The chequer
  column runs down the outside of both legs.
- **Two header pennants**, on a gate dressed with flags. Both pennants on
  one gate wear that gate's mark, never two sponsors' marks over one
  sponsor's board. `src/art/banners.js` and the September note in the
  simulator's `PROGRESS.md` both say why: a gate flying two sponsors'
  pennants over one sponsor's board is not what a sponsor bought.

Track side **teardrop flags** carry the marks too. A flag's sweep alternates
navy and red so a run of them reads as a run, and it cycles the sponsors at
the same time: the run is the lowest common multiple of *n* and 2 sails,
mark *i* mod *n* with accent *i* mod 2.

The physical dimensions above are in `BANNER_SIZE` and `GATE_BANNER_H` in
`src/art/banners.js`. A sail is 0.68 metres across by 2.43 up.

**Both sides read forwards.** This was a bug and it was fixed in August
2026. A gate's far leg used to mirror the sponsor's logo along with the
layout, and a flag's cloth sampled the same texels from behind, so every
track had marks reading backwards from one side. A board is now two planes
back to back and a sail's texture is the panel twice over with the mark
mirrored a second time. The rule the fix is written around: mirror the
layout, never the ink.

## Paint on the grass

A `groundLogo` is a decal element: a footprint, a heading, and the id of the
mark it wears. An author places it from the track builder, drags it,
rotates it and box selects it like any other element, and it is stamped into
the same canvas that draws the mown stripes so it takes the cloud shadows
and the cel ramp the grass takes.

It is separate from the five gate slots in one way that matters
commercially: it is placed rather than allotted. A sponsor who wants a mark
on the ground at the start straight gets it at the start straight.

**Selling one does not clear anybody's times.** This is the load bearing
part. A track's layout has a fingerprint, and a track whose layout changes
starts its leaderboard again. A `groundLogo` is filtered out of
`layoutFingerprint` in `src/share/listing.js` and out of `layoutHash` on the
board, so adding one to a track people have already flown leaves every
existing time standing. That is what makes it possible to sell a place on a
track that is already popular, which is the only kind worth selling.

The two skip lists are written out as literals in both repositories on
purpose and have to be edited together. Anybody changing them should read
the note in the simulator's `PROGRESS.md` first.

## The default, when nobody has bought anything

A track with no marks is not a track with blank boards. `chequerDevice()`
in `src/art/banners.js` draws a chequered flag on a staff, so an unsold
track still reads as a race track. Nothing on screen advertises a vacancy.

The base artwork carries no trademarks either. The reference for the look is
a MultiGP track and what is reproduced is the form: a white header board,
sleeve banners, a chequered border, teardrop flags with a navy or red sweep.
The mark on the board is whatever the author uploads and nothing else.

## What the sponsor gets besides the printing

Two things, both covered in their own files:

- A **link**, minted by the board, that puts a pilot in the simulator in one
  click and attributes the arrival. See `attribution.md`.
- A **public counter** of arrivals on that link, on the board's statistics
  tab, which the sponsor can read without asking anybody. Also
  `attribution.md`.

## The honest limits

Worth saying to a sponsor before they ask, rather than after.

**There is no impression count.** Nothing counts how many times a mark was
on screen, and nothing could without instrumenting the render loop, which
the simulator's own conventions forbid touching for anything that is not
physics. What is counted is arrivals on the link and the laps flown on the
board overall.

**There is no per track traffic figure.** The board counts pilots,
sessions and laps per day across the whole site, and arrivals per sponsor
link. It does not count flights per track per sponsor. That is a real gap
in the reporting and it should be quoted as one.

**The five slots are per track, and tracks are published by authors.** A
sponsor buying a slot is buying it on a specific track. Growth in how much
that slot is worth is growth in how much that track is flown, which is not
wholly in anybody's control.
