# CLAUDE.md

Project conventions. Read fully before any turn. These are decisions already made, not options.

## What this is

The front door for WebFPVSimulator. One canvas, one scroll, five acts, a reason, and three links out. It owns no data and calls no API: the launch buttons are links, and the origins they point at live in `src/config.js`.

The three repositories are one product. `Mathew-Harvey/WebFPVSimulator` holds the simulator and the track builder and is the copy of record for anything shared; `Mathew-Harvey/WebFPVSimulator-LeaderBoard` is the board. Read the simulator's `CLAUDE.md` before changing anything that has to agree across the three, and `DEPLOY.md` there for how they are wired together.

## Decisions already made

**Licence is GPLv3.** Every file gets a header.

**No dependencies, no build step, no bundler.** Three.js arrives from a CDN import map and nothing else does. Adding anything needs an argument first.

**The scroll is the timeline.** `main.js` maps scroll position to a camera and a set of acts. It must not be hijacked by smooth scrolling: the damping lives in `main.js` where it can be tuned against the camera. Every `[data-act]` element is measured into the timeline, so a new section that is not an act goes outside `<main>`, the way `#why` and `#close` do. Nothing counts the acts by hand: `timeline()` measures them, the ledger is a list, and the eyebrow numbers renumber with the markup. An act inserted in the middle should cost the markup, the ledger row, the copy block and the camera branch, and nothing else.

**The town is a portrait, not the town.** `src/city.js` is the freestyle city that act 4 flies, built here rather than imported: the simulator's own map is sixty four thousand lines of vendored geometry and this page has no build step. Every dimension in it is copied from the simulator's source with the file it came from named beside it, the way `src/wiki/model.js` snapshots the plant. If the two disagree about a number, one of them is a bug and it will be this one.

**The palette is the simulator's.** Light is warm, shadow is cool. Cream for lit type, sakura for chrome, amber for an instrument, mint for something good, slate for type that should recede. The panel fill and the two pixel edge rule are the board's, so a visitor arriving from the board is looking at the same furniture.

**Reduced motion is honoured in two places that agree.** The CSS block at the foot of the stylesheet and `REDUCED` in `main.js`. Anything that animates on scroll needs an entry in both. Nothing that carries meaning is hidden. The wiki has its own pair of the same contract, the block at the foot of `wiki/index.html` and `REDUCED` in `src/wiki/anim.js`, and `npm run lint:wiki` fails if either half goes missing.

**A wiki figure computes, it does not illustrate.** `src/wiki/model.js` holds the plant's constants, snapshotted from `plant.c` the way `src/fc` snapshots the catalog, and the figures solve with them rather than drawing a shape from memory. If a figure and its article disagree about a number, one of them is a bug. Do not put a number in a caption the figure does not compute, and do not draw a curve the plant does not have: name the absence instead. Every article carries a figure, every figure has a knob with a readout, and the caption says what moving the knob proves.

**The site icon comes from the simulator's `scripts/icons.js`.** `icon.svg`, `favicon.ico` and `apple-touch-icon.png` are generated output, in cream, because the front door owns no product's accent. Regenerate, do not edit: `node scripts/icons.js cream ../landingpage-WebFPVSimulator-` from a checkout of the simulator beside this one.

**The marks under "Also by Mat Harvey" belong to other sites.** They are other people's artwork in a block that says so, and Winmarchy's green is the one colour on the page that is not in the palette above. That is deliberate. They carry no `data-dest`, so the local origin retargeting in `main.js` never touches them.

## Style

- Plain JavaScript. No TypeScript, no framework, no state library.
- Prefer one file doing an obvious thing over three files doing a clever thing.
- No em dashes or en dashes in prose, comments, commit messages or documentation. Use a comma, colon or full stop. The page's inline separator is `&#183;`.
- Long explanatory comments that say why, not what. Match the voice already in `index.html` and `src/main.js`.

## Working rules

- There is no test suite here. `npm run serve` and look at the page, at a wide width and at 430 px, and at the 900 px breakpoint where the ledger and the instruments drop out. The wiki has the same breakpoint, where its rail becomes a drawer.
- `npm run lint:wiki` before handing the wiki over. It is cheap, and it catches the things that stay invisible until somebody scrolls to the one page that has them.
- Never report a check as passing without having run it in the same turn. If a check was not run, say so, say why, and say what was done instead.
- The simulator's `npm run verify` is expensive and does not cover this repository. Do not reach for it here.

## Review

- **Do not run adversarial review, multi agent review or a review workflow unless directed.** Read your own diff, look at the page, and hand the work over. Fan out only when the request asks for it.
- When a review does run, its findings are written down whether or not they were acted on, and a finding that was declined is recorded with the reason.
