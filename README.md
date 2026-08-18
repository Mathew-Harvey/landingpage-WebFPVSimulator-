# WebFPV landing page

The front door for [WebFPVSimulator](https://github.com/Mathew-Harvey/WebFPVSimulator).
One canvas, one scroll, four acts, and three links out.

```
Act 1  A five inch racing quad assembles in a dark studio, part by part,
       in the order a person actually builds one: the frame goes together
       on its own and is LEFT OPEN, the ESC and the flight controller drop
       into the stack, and only then does the top plate bolt down over
       them. Motors, loom, camera, props.
Act 2  The camera pulls out. The studio floor turns out to be a track
       builder's plan grid, and a seven gate course draws itself on it.
Act 3  Daylight arrives, the quad drops onto the racing line, and the rest
       of the page is one FPV lap through the gates.
Act 4  Don't be a Sh#t pilot. You must practice.
```

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
Without it the page is a function of scroll position and an eight second
autoplay, and there is no way to name a frame in a bug report or a review.

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

Two rules hold the thing together:

**Every visual is a pure function of `T`.** `T` is measured off the sections'
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
