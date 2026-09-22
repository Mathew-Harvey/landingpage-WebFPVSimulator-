# The artwork specification

What a sponsor hands over, and what the builder does to it. Hand this file
to a sponsor's designer and they have everything they need.

All of it is enforced in `src/trackbuilder/logo.js` and
`src/trackbuilder/model.js` in the simulator's repository. The limits below
are not guidance, they are what the code does.

## The short version

One flat logo. PNG or SVG. Landscape suits the track better than square,
and square suits it better than portrait. Under about 96 kB once it is a
PNG. No photographs.

## What is accepted

| | |
| --- | --- |
| File types | PNG, JPEG, WebP, GIF, SVG |
| Upload limit | 12 MB |
| Stored as | PNG, always, whatever came in |
| Fitted inside | 1200 by 400 pixels |
| Per logo budget | 256 kB of data URL, about 190 kB of image |
| Budget across all five | 384 kB, about 96 kB each |

An SVG has to carry an intrinsic size. One exported without a width and a
height can be drawn but not measured, and the builder refuses it rather than
guessing a size for somebody's artwork.

## What happens to the file

**It is re-encoded.** Whatever arrives is drawn to a canvas and written back
out as a PNG. A sponsor's JPEG does not stay a JPEG. This matters for
artwork with soft gradients, which will gain bytes on the way through.

**It is fitted, never cropped.** The canvas takes the image's own aspect
ratio scaled to fit inside 1200 by 400. Nothing is cut off and nothing is
padded with transparent bars. An earlier version did pad, and a square logo
came out about a third of the size it should have been on the gate header,
because every surface fits the whole canvas into its space and was fitting
the bars along with the ink.

**A raster is never enlarged.** A 200 pixel wide PNG stays 200 pixels wide.
Blowing it up to 1200 is a hundred times the bytes for the same blur, and
the surfaces scale it anyway. Supply the artwork at the size it was drawn.

**An SVG is rasterised at the full box.** This is the exception to the rule
above, because scaling a vector up is where its detail comes from. **SVG is
the best format to supply**, and it is worth telling a sponsor so: it is
the only one that reaches the 1200 by 400 box at full quality regardless of
what size the file was authored at.

**It is shrunk if it will not fit the budget.** The builder tries 1200 by
400, then 768 by 256, then 540 by 180, then 384 by 128, and takes the first
that comes in under budget. A photograph will walk all the way down that
list and then fail with a message saying a flat logo rather than a
photograph is what fits. That message is correct and the answer is a
different file, not a bigger budget.

**It is embedded, never linked.** The logo is stored inside the track
document as a data URL. A remote URL is dropped on read, and that is a
security property as much as a validation one: a document is untrusted
input, the string ends up in a texture loader, and an `http` URL in there
would make opening somebody's track a network request to their server.

## The budget, and how a sponsor loses to it

`LOGO_MAX_CHARS` is 256 kB and bounds any single logo.
`BRANDING_MAX_CHARS` is 384 kB and bounds all five together. The second is
the one anybody actually meets.

Five sponsors sharing 384 kB is about 96 kB of PNG each, which is generous
for a flat logo and nowhere near enough for a photograph or a detailed
illustration. The budget is spent in the order the logos were added, so a
sponsor who supplies a heavy file first takes budget from whoever comes
after them. An author who runs out is told to remove one, which in
commercial terms means somebody's artwork has to be redrawn.

The practical instruction to a sponsor: send flat vector artwork, and send
it before the track is full.

## How the mark sits on each surface

### The gate header board

2.74 by 0.58 metres of printed banner, painted on a 512 by 112 canvas.

The roundel that carries the gate number takes **22 per cent of the width at
each end**, and that zone is kept clear. The mark gets the middle 56 per
cent of the width, between the top and bottom hems and above the chequer
band along the foot. It is fitted into that space and never cropped,
because a logo with a piece cut off it is worse than a small logo.

A wide mark uses that space well. A tall or square mark is fitted to the
height and ends up narrow, which is the single biggest reason one sponsor's
board reads at distance and another's does not. If a sponsor has a
horizontal lockup of their mark, that is the one to send.

### The upright sleeves

0.42 by 1.83 metres each, painted on a 112 by 512 canvas. The mark is
turned on its side in the middle, which is what a printed sleeve does with a
horizontal logo, and a chequer column runs down the outer edge.

The far leg's design is mirrored so the chequer column stays on the outside
of both uprights. **The mark is mirrored a second time inside that flip**,
so it reads forwards on both legs. Mirror the layout, never the ink.

### The flag sails

0.68 metres across by 2.43 up, painted on a 144 by 512 panel. The sail's
texture is the panel twice over, front in the left half and the reverse
mirrored in the right with the mark mirrored again so it comes back the
right way round. Readable from both sides, with the accent band on the mast
from both sides.

### Paint on the grass

Fitted into a footprint the author sizes and rotates, stamped into the
pitch canvas at **93 per cent opacity** so it reads as paint on turf rather
than as a decal floating over it, with a fade at the edges.

Grass is `#63a949` and `#4c8b38`. A mark in mid green with no outline will
disappear into it. A mark with a white keyline or a solid light ground will
not. This is the surface most worth previewing before signing anything off,
and the builder has a preview of exactly it beside every logo slot.

## The colours around the mark

From `BANNER` in `src/art/banners.js`. These are the colours a sponsor's
mark sits against, which is what a designer needs to check contrast.

| Token | Hex | Where |
| --- | --- | --- |
| `vinyl` | `#dcd6ca` | The banner itself, on every printed surface |
| `vinylShade` | `#c7c0b3` | The bound hems top and bottom |
| `navy` | `#1e3566` | A flag sail's sweep |
| `navyDeep` | `#152648` | The deeper half of that sweep |
| `red` | `#b8332c` | The alternating flag sail sweep |
| `ink` | `#1a1f2b` | Type on the banner |
| `chequerDark` | `#23272f` | The chequer band |
| `chequerLight` | `#eae6dd` | The chequer band |

The vinyl is not pure white and that is a measurement rather than a
preference. A pure white flag came out brighter than the sky, which inverts
the value structure the whole art direction rests on and made seventy two
pieces of dressing louder than the gate a pilot was trying to find. The
horizon band is `#f2e3cb`, so the vinyl sits a clear step under it.

For a sponsor's designer the consequence is simple: **a white logo on a
white banner will vanish.** A mark that relies on being the lightest thing
in frame needs a darker lockup for this application.

## What to send

1. The mark as **SVG**, with an intrinsic width and height, in a horizontal
   lockup if one exists.
2. A **PNG fallback** at its native size, under 96 kB.
3. A version with a keyline or a solid light ground, for the grass.
4. The mark's own brand colours, so a contrast check against the table
   above can be done before anybody prints anything.

## What not to send

A photograph. A mark with a drop shadow, which will not compress. A mark
that is only legible above about 200 pixels, since the header board is 512
pixels across and a pilot sees it for under a second at commit range. A
white on transparent lockup with nothing else supplied.
