# WebFPV landing page

The front door for [WebFPVSimulator](https://github.com/Mathew-Harvey/WebFPVSimulator).
One canvas, one scroll, four acts, a reason, and three links out.

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
Act 3  Daylight arrives, the quad drops onto the racing line, and the rest
       of the page is one FPV lap through the gates. Scroll back up and it
       does not reverse: it yaws around, banked, and flies home nose first.
       The turn is flown from inside the goggles like everything else.
Act 4  Don't be a Sh#t pilot. You must practice.
```

Between act 3 and the close sits `#why`, which is not an act: nothing
assembles or draws itself there, the copy is simply on the page. It is
sized and placed like one all the same, at the act gutter and in the act
copy's column, so the reason lands in the exact place the flight's copy
just left.

The camera does not stop for it. The last stretch of the timeline begins at
`#why` rather than at the close, so 3 to 4 covers the reason and the close
together and the hero pull-out plays across the reading: the course falls
away behind the type and lands under the invitation. That stretch is also
the only place the pull-out ever had room to finish. Measured from the
close alone it had about a fifth of a screen of scroll and played a quarter
of its arc.

Client side only. No build step, no bundler, no framework, no dependencies
to install, no API. Three.js comes from a CDN import map, the same version
the simulator uses.

## Run it

```bash
npm run serve
```

Then open <http://127.0.0.1:8080/>. Any static file server will do; the only
requirement is that it serves over http, because ES modules will not load
from `file://`.

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
to `3` the flight, `3` to `4` the close, so `?t=2.5` is the middle of a lap.
Without it the page is a function of scroll position and a ten second
autoplay, and there is no way to name a frame in a bug report or a review.

With `?t=` set, `window.__wf` exposes `{ stage, course, drone, petals }` so a
frame can be interrogated as well as named. `?debug=1` exposes the same
handle without pinning, which is what the turn around needs: the heading is
a half second of animation that only happens while somebody is scrolling the
other way, and a pinned frame is exactly the state that cannot be in. It adds
`flight(s, flip)` to pose the aircraft and read the numbers back,
`heading()`, and `setHeading()` to force one. On a clean URL, no global.

## How it is put together

| File | What it owns |
| --- | --- |
| `index.html` | The page, its CSS, and every launch link as static markup |
| `src/main.js` | The timeline. One scalar `T` drives everything |
| `src/stage.js` | Renderer, lights, fog, clip planes, lens |
| `src/cel.js` | The simulator's cel shading, ported |
| `src/drone.js` | The airframe, and the seven stage build order |
| `src/gate.js` | One MultiGP gate at published dimensions |
| `src/course.js` | The layout, the ground, the racing line, the dress |
| `src/config.js` | Where the simulator and the board are |
| `src/quality.js` | One decision about how much machine is on the other end |
| `src/petals.js` | Sakura, one draw call, all of it in the vertex shader |

Two rules hold the thing together:

The flight act's height is the GEARING between the wheel and the aircraft.
A wheel delivers steps, not scroll, so how far one notch moves the quad is
set by how tall that section is, and the scroll damping decides how much of
a notch survives to the camera. They are tuned together: 1000vh and a 6.5
lerp puts about one and a quarter gates on a screen.

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
