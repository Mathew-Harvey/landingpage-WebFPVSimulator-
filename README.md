# WebFPV landing page

The front door for [WebFPVSimulator](https://github.com/Mathew-Harvey/WebFPVSimulator).
One canvas, one scroll, five acts, a reason, three links out, and a wiki
at `wiki/` that is not part of the film: thirty five illustrated pages on
how a quad actually flies, plus every Betaflight setting, with figures you
can drive.

## Why it exists

FPV has a steep learning curve and it charges the fee up front: a quad, a
radio, goggles, batteries, a charger, and a first week spent mostly
repairing what you bought. The existing simulators are the right answer to
that and the good ones are genuinely good, but they are also a purchase, a
download and an install on a machine that can run them. For a lot of people
that is one more barrier on a pile that was already too tall.

This one takes barriers off the pile instead. It runs in a browser tab,
costs nothing, installs nothing, and asks for no account. An Xbox controller
and a computer you already have in front of you is the whole kit list.

The page says that in about eighty words, in `#why`, between the flight and
the close. It is deliberately short. Everything else here says its piece in
a headline and two lines over a moving camera, and an argument made in three
paragraphs and a comparison table read as a slide deck stapled to a film.

```
Act 1  A five inch racing quad assembles in a dark studio, part by part,
       in the order a person actually builds one: the frame goes together
       on its own and is LEFT OPEN, the ESC and the flight controller drop
       into the stack, and only then does the top plate bolt down over
       them. Motors, loom, camera, props.
Act 2  The camera pulls out. The studio floor turns out to be a track
       builder's plan grid, and a seven gate course draws itself on it.
Act 3  Daylight arrives, the quad drops onto the racing line, and one FPV
       lap runs through the gates. Scroll back up and it does not reverse:
       it yaws around, banked, and flies home nose first. The turn is flown
       from inside the goggles like everything else.
Act 4  The aircraft leaves the field. It climbs away from the last gate,
       crosses the wood at two and a half times the pace of the lap, and
       drops into a Japanese railway town: north up a nine metre street
       under a cable web, over a level crossing with its barriers down and
       a train going under, then a climb out over the roofs. Same aircraft,
       same lens, no cut.
Act 5  You must practice, over the town at golden hour.
```

Between act 4 and the close sits `#why`, which is not an act: nothing
assembles or draws itself there, the copy is simply on the page. It is
sized and placed like one all the same, at the act gutter and in the act
copy's column, so the reason lands in the exact place the flight's copy
just left.

The camera does not stop for it. The last stretch of the timeline begins at
`#why` rather than at the close, so 4 to 5 covers the reason and the close
together and the pull-out plays across the reading: the district falls away
behind the type and lands under the invitation. That stretch is also the
only place the pull-out ever had room to finish. Measured from the close
alone it had about a fifth of a screen of scroll and played a quarter of
its arc.

The town is not the simulator's town. The simulator's freestyle map is
sixty four thousand lines of vendored geometry and none of it can come
here, because this page has no build step and one CDN import. `src/city.js`
is a portrait of it instead, built in this page's own idiom, with every
dimension copied from the simulator's source and the file it came from
named beside it: a 6.3 m carriageway, a 1.55 m footway, shopfronts 3.2 m
under 2.7 m, poles at 9.2 m, wires at 4.88 and 5.95, and a crossing that
can only be cleared at 6.9. If the town and the portrait ever disagree
about a number, one of them is a bug and it will be this one.

The district is sakura-crossing, by Kenton Wang, MIT, which the simulator
vendors and credits in its `NOTICE`. No code from it is here and none of it
is imported. What travels is the plan, and every number in `src/city.js` is
attributed to the file it was read from at the point it is used.

Client side only. No build step, no bundler, no framework, no dependencies
to install, no API. Three.js comes from a CDN import map, the same version
the simulator uses.

## Run it

```bash
npm run serve
```

Then open <http://127.0.0.1:8080/>. The wiki is <http://127.0.0.1:8080/wiki/>.
Any static file server will do; the only requirement is that it serves over
http, because ES modules will not load from `file://`.

`npm run lint:wiki` checks that every catalog key still has a page, that
LIVE / GATED / APPLIED_INERT keys still have authored copy, that every
article carries a figure and every figure is reached by something, that
each figure has a caption saying what it argues and a label for anyone who
cannot see it, and that both halves of the reduced motion contract are
still in place.

## The wiki

The FPV wiki is a second page on this site, not a screen inside the
simulator. `https://webfpv.org/wiki/` is the public address. Hash links
are `#wiki/<id>`, so `wiki/#wiki/physics-vrs` is Vortex ring state.

Thirty five written pages, a numbered reading path of thirteen that make
the argument in order, and one page for every one of the 696 Betaflight
4.5.1 catalog keys. The rail is one list: a page on the path carries its
step number rather than being printed a second time in a block of its own.
Left and right arrows walk the path, and `/` focuses the search.

`src/fc/catalog.js` and `src/fc/catalog-data.js` are copies of the
simulator catalog so this static site can name every key without calling
the sim. If they disagree, the simulator wins, and the copies should be
replaced from that repo.

### The figures

Every article carries one, and the lint fails if one does not.

A figure here is not decoration. It is the smallest machine that can be
wrong. `src/wiki/model.js` holds the plant's own constants, snapshotted
from the comment block at the top of `plant.c` the same way `src/fc`
snapshots the catalog, and the figures solve with them rather than drawing
a shape from memory. The thrust curve is the plant's thrust curve. The sag
figure runs the same implicit solve the plant runs. The PID figure is
Betaflight's own scale factors on gains a pilot types, driving this
airframe's real inertia and its real rotor lag, so taking D to zero makes
it ring for the reason a real quad rings.

That is checkable, and it is the point: the model reproduces the numbers
the articles publish. Thrust to weight comes out at 9.21 against a measured
9.2. The rotor time constant lands between 21 and 30 ms against a check
that asks for 10 to 30. If a figure and its article disagree, one of them
is a bug rather than a matter of taste.

So nearly every figure has a knob, every knob has a readout, and the
caption says what moving it proves. Where a constant is somebody's
judgement about feel rather than a physical result, the caption says that
too.

| File | What it owns |
| --- | --- |
| `src/wiki/model.js` | The plant's constants and the closed forms a figure needs |
| `src/wiki/draw.js` | Canvas primitives, axes, and the palette |
| `src/wiki/anim.js` | The runtime: one rAF loop, controls, reduced motion, teardown |
| `src/wiki/figures.js` | The thirty four figures and the argument each one makes |

Three things the runtime enforces. Nothing animates off screen: one
`requestAnimationFrame` loop drives every visible figure and an
`IntersectionObserver` takes the rest out of it. Figures are torn down
before the article is replaced, because each one owns a canvas, an rAF
slot and two observers. And reduced motion is honoured in two places that
have to agree, `REDUCED` in `anim.js` and the media query at the foot of
`wiki/index.html`: a figure that would have animated holds its most
informative frame and every control on it still works, because the control
is where the meaning is.

That last one is why the figures that show a simulated trace solve the
whole trace in one pass rather than building it up frame by frame. A
reader who has asked for reduced motion gets one frame, and one frame of a
curve being drawn is not a curve.

## Colour

The tokens are the simulator's and the board's, unchanged: cream, sakura,
amber, mint, slate, forest carbon. What changed is where the light comes
from.

The studio is lit in SAKURA rather than slate. It is a graduated backdrop
now, plum overhead where the wordmark sits and rose at the deck where the
subject stands, because a near black airframe on a near black ground has
nowhere to be seen and a flat backdrop is why the opening read as dark. The
rim lamp is sakura too: it is the brightest edge on the hero for a whole act,
so it is the highest leverage place the theme has. The sun goes down through
rose rather than amber, and petals drift through every act, sized to a real
15 mm blossom.

Functional colour is untouched, because it is functional: gates are amber at
rest, mint at the start and finish, neon green for the one the run wants
next. Mint is still the only thing you press. The airframe's carbon was
lifted two shades to survive being seen against a lit backdrop instead of a
void.

## Phones

`src/quality.js` makes one decision, once, from `(pointer: coarse)` and the
viewport width. A phone gets fewer trees and flags, coarser lathes, a 1.5
pixel ratio cap and no shadow map, plus a painted contact shadow in its
place. Nothing about the composition, the timing or any published dimension
changes: it is the same film at a lower resolution.

The layout follows the camera. Below 900 px the copy takes the top of the
screen and the scene takes the bottom, which is why `composeBias()` in
`src/stage.js` tilts the camera DOWN as the aspect narrows. Those two have
to agree, or the headline prints on the subject. Heights are in `svh` so an
iOS URL bar sliding away does not resize every act mid scroll.

## Where the other two pages live

`src/config.js` holds the three origins and nothing else. Served from a
loopback address it points at a local simulator on 8000 and a local board on
3100, which are the defaults the simulator's own `src/share/board.js` uses.
Served from anywhere else it points at production. If a Render service is
renamed, that file is the only edit.

Every launch link is also written into `index.html` as a plain anchor
pointing at production. `main.js` only ever RETARGETS them, so the three
things this page exists to reach still work with JavaScript disabled, WebGL
unavailable, or the three.js request blocked.

## Inspecting a frame

```
http://127.0.0.1:8080/?t=2.5
```

`?t=` pins the timeline. `0` to `1` is the build, `1` to `2` the track, `2`
to `3` the lap, `3` to `4` the freestyle city, `4` to `5` the close, so
`?t=2.5` is the middle of a lap and `?t=3.5` is somewhere in the street.
Without it the page is a function of scroll position and a ten second
autoplay, and there is no way to name a frame in a bug report or a review.

With `?t=` set, `window.__wf` exposes `{ stage, course, city, drone, petals }` so a
frame can be interrogated as well as named. `?debug=1` exposes the same
handle without pinning, which is what the turn around needs: the heading is
a half second of animation that only happens while somebody is scrolling the
other way, and a pinned frame is exactly the state that cannot be in. It adds
`flight(s, flip)` to pose the aircraft and read the numbers back,
`heading()`, and `setHeading()` to force one. For the freestyle act it adds
`cityRoam(T)`, `cityWhere(roam)`, which answers with the aircraft's position
in the town's own coordinates and the gradient of the line there, and
`live()`, which reports where the camera and the aircraft actually ended up
on the last frame. Those three exist because the first version of the act
flew the quad into a shopfront, and working out which shopfront from a
screenshot of a wall is an afternoon. On a clean URL, no global.

## How it is put together

| File | What it owns |
| --- | --- |
| `index.html` | The page, its CSS, and every launch link as static markup |
| `wiki/index.html` | The FPV wiki's page, its CSS, and its layout grid |
| `src/wiki/` | Articles, CLI pages, figures, and the wiki shell |
| `src/fc/` | Snapshot of the simulator catalog. Recopy when that catalog changes |
| `src/main.js` | The timeline. One scalar `T` drives everything |
| `src/stage.js` | Renderer, lights, fog, clip planes, lens |
| `src/cel.js` | The simulator's cel shading, ported |
| `src/drone.js` | The airframe, and the seven stage build order |
| `src/gate.js` | One MultiGP gate at published dimensions |
| `src/course.js` | The layout, the ground, the racing line, the dress |
| `src/city.js` | The freestyle town, and the line flown through it |
| `src/config.js` | Where the simulator and the board are |
| `src/quality.js` | One decision about how much machine is on the other end |
| `src/petals.js` | Sakura, one draw call, all of it in the vertex shader |

Two rules hold the thing together:

A flying act's height is the GEARING between the wheel and the aircraft.
A wheel delivers steps, not scroll, so how far one notch moves the quad is
set by how tall that section is, and the scroll damping decides how much of
a notch survives to the camera. They are tuned together: 640vh over a 145 m
racing line and a 6.5 lerp is about 0.23 m of line per vh, which puts a
gate and a bit on a screen.

The city act uses the same 0.23 m per vh once it is down in the streets,
and about two and a half times that over the wood between the two places.
That is the one deliberate change of pace in the film and it does the
transition's work: speed is what makes an arrival read as an arrival. It is
a table rather than a formula, integrated once at start up, because the
mapping has to be monotonic and smooth in its derivative and the integral
of an obvious speed curve is easier to read than a piecewise one that is
both. See `CITY_S` in `main.js`.

The two acts hand the aircraft to each other at speed. A smoothstep has
zero slope at both ends, which is right for a camera move that starts and
stops and wrong for a lap running into a freestyle line: the quad
decelerated to a standstill at `T = 3`, hung there for the half screen it
took to cross the act boundary, and set off again. `ramp()` takes the two
ends separately, so the lap eases in and finishes at speed and the city
line starts at speed and eases out into the close.

**Every visual is a pure function of `T`**, with one deliberate exception:
which way the quad is pointing. That has to be hysteretic, because it depends
on the DIRECTION of travel rather than the position, and a turn once started
has to finish. It lives in one function with a deadband, so the damping
settling by a hundredth after a flick cannot spin the aircraft round. `T` is measured off the sections'
real offsets rather than assumed from their CSS heights, so changing a
section's length in the stylesheet re-times the film instead of
desynchronising it. Nothing accumulates between frames except the scroll
damping, which is why the page can be dragged backwards as happily as
forwards.

**The machine on the advert is the machine in the product.** The quad is
0.110 m centre to motor, 0.220 m diagonal, 0.0635 m prop radius, camera 0.080
m forward and 0.018 m up. The gates are a 5 ft MultiGP opening at the
simulator's own 15 percent departure, so 1.7526 m, on 1.315 in schedule 40
PVC. Those are the simulator's numbers, not numbers chosen to look good here.

## Licence

GPLv3, the same as the two repos it fronts. The cel shading, the airframe
geometry and the gate construction are ports of GPLv3 code from
WebFPVSimulator. See [LICENSE](LICENSE).
