# CLAUDE.md

Project conventions. Read fully before any turn. These are decisions already made, not options.

## What this is

The front door for WebFPVSimulator. One canvas, one scroll, six acts, a reason, and four links out. It owns no data and calls no API: the launch buttons are links, and the origins they point at live in `src/config.js`.

The three repositories are one product. `Mathew-Harvey/WebFPVSimulator` holds the simulator and the track builder and is the copy of record for anything shared; `Mathew-Harvey/WebFPVSimulator-LeaderBoard` is the board. Read the simulator's `CLAUDE.md` before changing anything that has to agree across the three, and `DEPLOY.md` there for how they are wired together.

## Decisions already made

**Licence is GPLv3.** Every file gets a header.

**No dependencies, no build step, no bundler.** Three.js arrives from a CDN import map and nothing else does. Adding anything needs an argument first.

**The scroll is the timeline.** `main.js` maps scroll position to a camera and a set of acts. It must not be hijacked by smooth scrolling: the damping lives in `main.js` where it can be tuned against the camera. Every `[data-act]` element is measured into the timeline, so a new section that is not an act goes outside `<main>`, the way `#why` and `#close` do. Nothing counts the acts by hand: `timeline()` measures them, the ledger is a list, and the eyebrow numbers renumber with the markup. An act inserted in the middle should cost the markup, the ledger row, the copy block and the camera branch, and nothing else.

**The town is the simulator's town.** `src/city/vendored/` is sakura-crossing, MIT, copied whole from the simulator's `src/maps/city/vendored/` where it is the copy of record, and recorded in `NOTICE`. Recopy the directory rather than editing a file here, so the two cannot drift. `src/city.js` is a join and nothing else: where the town stands, which parts of it are built, and the line flown through it. A hand built portrait of the town lived there first and was replaced, because a front door that advertises a place should show the place.

**The merge in `src/city.js` is ours, and `bakeCity` is not used.** bake.js is vendored alongside the town and its `shareMaterials`, `thinFoliage`, `chunkInstanced` and `findAnimated` are used; `bakeCity` itself drops the shopping street's buildings when called from here, with every option tried including the simulator's own. `mergeStatics` does the one thing that matters, which is turning eleven thousand meshes into a few hundred. It bakes each mesh's transform RELATIVE TO THE TOWN'S ROOT, not its world matrix: the merged mesh is parented back under that root, so a world matrix applies the town's offset twice.

**There are exactly two cuts in the film, they go opposite ways, and neither is a hard cut.** Everything else is flown: the studio floor becomes a plan grid, the grid becomes a field, and the quad that leaves the studio arrives at the track. Acts 4 and 5 are the exceptions, and each one is an exception for its own reason.

Act 4 is a **dissolve UP, into warm haze**. The alternative was a transit, forty metres of empty ground flown fast to get it over with, and it was the weakest thing on the page. Because nothing flies between them, the town sits 460 m from the field, past where the haze leaves anything of it.

Act 5 is a **blackout DOWN, into the dark**, and it is a different device rather than the same one twice. What is on the far side of it is indoors with the lights off, so the frame does not come back by a veil lifting off a lit room: the room's own two bulbs come on, in `setLamps`, and the light arrives in the place rather than on the page. Nothing could be flown between a town and a shed 300 m away and indoors, and the aircraft changes too, which is a thing a cut can say and a transit cannot.

Both are fades rather than hard cuts because the page is scrubbable: a reader dragging the bar slowly across a hard cut sees it flicker, and a fade has a middle for the camera to move in. Both are symmetric for the same reason. A third transition needs an argument this good, and there is not one: any further place in this film has to be flown to.

**The room is the simulator's room, and the track in it is generated.** `src/room.js` builds the same 10 by 12 by 4 m shed `WebFPVSimulator/src/render/scene.js` builds for a micro track, in the same colours and by the same recipe: uprights whose inner faces are the opening, a cross member above every opening and below only the ones that are off the floor, a moulded corner at each junction, stub feet, and no printing of any kind, because a RaceGOW gate is bare white pipe. A visitor who clicks through from that act lands in that room and the two must not disagree about it.

`src/room-data.js` is the demo track and is GENERATED, by `node scripts/bake-room.js ../WebFPVSimulator > src/room-data.js`. It reads the simulator's own preset through the simulator's own `courseFromDocument`, path solver and all, so the gates are where the track says and the line is the one the builder derives. A second argument picks a different preset by id, which is how the demo track is changed: never by editing the data. Regenerate, do not edit. What `src/room.js` owns is the shed, the lamps and the furniture; what it must never own is a gate position.

The act's copy now quotes NO measurement, and that is the safest state for it. It used to say three and a half metres by two and fourteen metres of lap; the generator has measured the shipped track at 2.97 by 1.42 with a 13.8 m lap since it was last regenerated, so the front door was advertising a track nobody could build. `LAP_LENGTH` and `SPAN` are still exported and still measured, so a number can come back into the copy whenever it earns its place, and any that does has to be checked against them when the track changes. The generator cannot write the prose, but it can make the prose's numbers findable in one file.

**The room act names RaceGOW, links them, and points at the next season.** Micro UTT is their format, the track in the act is their published Track 1 designed by Skittles, and the simulator ships all eight of Season 5. The act says so in one sentence, links `https://www.racegow.com/` on the name, and carries the sign up for RaceGOW 6 beside the link that flies the track. The series was deliberately unnamed here once, borrowing the board's argument about its whoop plate; that argument is about a heading over everybody's tracks and this is one act flying one of theirs, where leaving the name off is not neutrality. The builder still makes your own, and the copy still says so in the same breath.

**The copy says what a thing is, and nothing else.** A headline, a line under it, and a beat that names what is in frame. No aphorisms, no "every gate is a decision made three gates early", no promise that a keyboard cannot teach you anything. If a sentence would survive being moved to a different product's page, it is not saying anything about this one. The film is the argument; the words are captions for it.

**No brand is named for a controller.** A radio or a game controller, every time, in the invitation, the kit list, the beat and the cards. Naming one manufacturer's pad tells everybody holding a different one that the page was not written for them, and the kit list is the whole pitch.

**The AI disclosure is on the first screen and it is dry.** `.admission`, under act one's copy: built with AI, by me, a developer who, apparently, orders AI agents about these days, out of the way, now let's fly. Said once, in the owner's voice, quieter type than the lede, with no apology in it, because an apology invites an argument about whether the tool was allowed and the argument this page wants is about whether the quad flies right. Do not move it to the footer and do not expand it into a paragraph.

**The palette is the simulator's.** Light is warm, shadow is cool. Cream for lit type, sakura for chrome, amber for an instrument, mint for something good, slate for type that should recede. The panel fill and the two pixel edge rule are the board's, so a visitor arriving from the board is looking at the same furniture.

**Reduced motion is honoured in two places that agree.** The CSS block at the foot of the stylesheet and `REDUCED` in `main.js`. Anything that animates on scroll needs an entry in both. Nothing that carries meaning is hidden. The wiki has its own pair of the same contract, the block at the foot of `wiki/index.html` and `REDUCED` in `src/wiki/anim.js`, and `npm run lint:wiki` fails if either half goes missing.

**A wiki figure computes, it does not illustrate.** `src/wiki/model.js` holds the plant's constants, snapshotted from `plant.c` the way `src/fc` snapshots the catalog, and the figures solve with them rather than drawing a shape from memory. If a figure and its article disagree about a number, one of them is a bug. Do not put a number in a caption the figure does not compute, and do not draw a curve the plant does not have: name the absence instead. Every article carries a figure, every figure has a knob with a readout, and the caption says what moving the knob proves.

**The site icon comes from the simulator's `scripts/icons.js`.** `icon.svg`, `favicon.ico` and `apple-touch-icon.png` are generated output, in cream, because the front door owns no product's accent. Regenerate, do not edit: `node scripts/icons.js cream ../landingpage-WebFPVSimulator-` from a checkout of the simulator beside this one.

**The stickers are the slap pack's, and the pack is the copy of record.** `stickers/index.html` is one self contained page: twenty two stickers as inline SVG, the three fonts they are set in as base64, and a download for each. The film wears eight of them, slapped on the glass rather than laid on the page, and every one is the actual sticker: `src/stickers-data.js` is GENERATED from the pack by `node scripts/stickers.js` and holds each one's SVG verbatim plus the font block once, and `main.js` puts them in. Regenerate, do not edit; `npm run lint:page` fails if the module is stale. Where a sticker goes, when it is there and how long the one that opens waits after the boot is written on its anchor in `index.html`, and the stylesheet's block on `#slaps` says which corner of the glass is free of which instrument when. A sticker never sits where an instrument is at the same moment, never near the bottom at the close, and never carries a number the copy beside it could disagree with.

**The slap is an animation and it is the point of them.** `@keyframes slap` in `index.html`: in from nearly twice the size and eight degrees off, easing IN because that is what a hand does, short onto the glass at 93 per cent with the shadow tightening from 24 px of blur to 4, one ring back, settled. A transition cannot describe an impact, which is what it was before. It must never carry a fill mode, or it outranks the hover rule for the life of the page. Eight is the count because twelve read as a layer of the page rather than as something somebody stuck on it. Two stickers are never in one spot at the same time, and the three spots a phone folds into its one free band are disjoint in T as a set; `npm run lint:page` checks both, and the reduced motion contract has the usual two halves, the stylesheet stilling the animation and `REDUCED` skipping the wait.

**The marks under "Also by Mat Harvey" belong to other sites.** They are other people's artwork in a block that says so, and Winmarchy's green is the one colour on the page that is not in the palette above. That is deliberate. They carry no `data-dest`, so the local origin retargeting in `main.js` never touches them.

## Style

- Plain JavaScript. No TypeScript, no framework, no state library.
- Prefer one file doing an obvious thing over three files doing a clever thing.
- No em dashes or en dashes in prose, comments, commit messages or documentation. Use a comma, colon or full stop. The page's inline separator is `&#183;`.
- Long explanatory comments that say why, not what. Match the voice already in `index.html` and `src/main.js`.

## Working rules

- There is no test suite here. `npm run serve` and look at the page, at a wide width and at 430 px, and at the 900 px breakpoint where the ledger and the instruments drop out. The wiki has the same breakpoint, where its rail becomes a drawer.
- `npm run lint:wiki` before handing the wiki over. It is cheap, and it catches the things that stay invisible until somebody scrolls to the one page that has them.
- `npm run lint:page` before handing the film or the sticker pack over. Also cheap: the share cards, the sitemap, the dashes, and whether `src/stickers-data.js` is what the pack would generate now.
- Never report a check as passing without having run it in the same turn. If a check was not run, say so, say why, and say what was done instead.
- The simulator's `npm run verify` is expensive and does not cover this repository. Do not reach for it here.

## Review

- **Do not run adversarial review, multi agent review or a review workflow unless directed.** Read your own diff, look at the page, and hand the work over. Fan out only when the request asks for it.
- When a review does run, its findings are written down whether or not they were acted on, and a finding that was declined is recorded with the reason.
