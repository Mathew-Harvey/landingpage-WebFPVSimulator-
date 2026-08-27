# Wiki design review, August 2026

Five adversarial reviewers were run in parallel against `wiki/` starting at
commit 92d2a08, one each for content and reading level, visual design,
science communication, figures and animation, and correctness and
accessibility. The brief that prompted the review changed the audience: the
wiki was written for people who already fly, and must now be understandable
by a bright high school student who has never held a radio.

This file is the record. Every finding is listed whether or not it was acted
on, and a finding that was declined or deferred is recorded with the reason,
because a review whose losing arguments vanish is not a review.

Reviewers were told to be adversarial, to cite file and line, and to look at
rendered pixels rather than reason from source. Between them they read every
article, rendered and viewed most of the figures, drove roughly 2,400
control states, and measured contrast from decoded PNG pixels rather than
from the stylesheet.

## The verdict the five converged on

This was an excellent reference and a weak explainer. It was organised as an
argument about provenance, that the firmware is compiled rather than
imitated, which is the right thesis for a README and the wrong one for a
document meant to teach somebody how a quadcopter flies. Two reviewers
independently observed that the best design on the site was inside the
canvas rather than around it.

---

## Acted on

### Content and reading level

| # | Finding | What was done |
|---|---|---|
| C1 | `start-welcome` was titled "Simulating FPV, for nerds", telling the target reader in the h1 that the document was written for somebody else | Retitled "How a racing drone actually flies" |
| C2 | "plant" used 107 times, never defined, and the name of the largest chapter, so it reached the nav rail before any prose | Chapter renamed "The aircraft"; the term is defined in the glossary |
| C5 | `cli-index`, the last step of the path, opened "If you flew a real 5 inch last weekend" | Rewritten to assume no prior ownership |
| C25 | About 25 terms used in the plain-language column with no definition anywhere | `src/wiki/glossary.js` added: 38 entries, one plain sentence each, every cross-link validated |
| C4, C6, C9 | The reading path put contributor onboarding at steps 4 and 5, and taught vortex ring state before the quantity it is measured in | Path reordered and grown to 15 steps; both provenance pages moved off the route and left in the rail |

### Science communication

| # | Finding | What was done |
|---|---|---|
| S1 | No page explained why a quadcopter needs a computer. A grep for instability across every article and figure returned nothing | New page `start-whyacomputer` at step 2, with a new `unstable` figure whose knob is corrections per second |
| S1b | `figures.js` claimed a hovering quad "holds a heading on its own", contradicting the missing page | Rewritten: the twists cancel, but cancel is not correct |
| S2 | Zero questions asked anywhere in 849 lines; every caption spoiled its own knob | `ask:` added to the figure schema and rendered as a Predict block above the controls |
| S-fm | The figure of merit caption said kt/kq is the figure of merit. kt/kq is 70.71 and the figure of merit is 0.565, and the coincident-curve demonstration was circular: any two quadratics coincide when one is scaled by their coefficient ratio | Replaced with the gap between shaft power and ideal induced power, whose ratio really is invariant |
| S-vrs | The vortex ring slider stopped at 16 m/s; the floor its caption promised needs 18.7, so the fully developed state was unreachable. Mid range it printed a green "Holding, or better" under a headline saying the ring was forming | Slider runs to 22; the verdict now reports the bait and the trap, which is the actual mechanism |

### Visual design

| # | Finding | What was done |
|---|---|---|
| D1 | `.wiki-lede` lost a specificity tie to `.wiki-article p` and rendered at body size, so the page had no middle voice between a 44px heading and 14.5px prose | Qualified to `.wiki-article p.wiki-lede`; the deck is now 20px |
| D2 | Body ran at 87 characters a line and captions at 98, because `em` resolves against the element's own font size | Recapped in `ch`; measured lede 57, body 50, caption 60, sections 63 |
| D3 | The two column panels were `rgba(16, 22, 17, 0.5)` over a page already `rgb(16, 22, 17)`, which composites to itself, so the device separating the two voices was invisible | Repainted, and given the mint and amber rules the site's own "how to read this wiki" figure had been drawing all along |
| D4 | Below 700px every figure lost its bottom third: a 295px canvas inside a 199px stage, because the aspect ratio sat on the box rather than the canvas | Aspect ratio moved to the canvas; the swipe hint moved out of the scroll container where it had never rendered at any width |

### Correctness and accessibility

| # | Finding | What was done |
|---|---|---|
| B1 | Arrow keys on a focused figure slider navigated the page away and dropped focus to `body`, making every figure on all 15 journey pages keyboard-inoperable | The path guard now stands aside for any form control and anything inside a figure |
| B4 | A hash containing a lone percent sign threw during boot, before the hashchange listener was registered, killing deep linking for the whole session, silently | Decode guarded; listener registered first |
| B5 | `wiki-lint` passed a figure with no caption, no aria label and no control. It read a fixed 4000 character window that for 23 of 35 figures ran into the next figure, and its aria check was satisfied by a control's own `label:` | Rewritten to cut each figure at its real brace boundary and read only the top level of the spec. All three removals are now proved by mutation to fail |
| B3 | The mixer could run a waterfall segment 600px past the frame at combined extremes, truncating bars silently | Bars clipped to the rails, text drawn outside the clip, in-bar segment labels removed because signed segments backtrack into the same band |
| B7 | `rates` printed an end value Betaflight's formula does not return, and let the curve leave the frame, whenever centre sensitivity exceeded max rate | Guarded, and the degenerate case is now stated on the figure |
| B-hist | Back left the wiki entirely however deep the reader had gone | `pushState` with `popstate` wired up |
| B-drawer | The phone drawer had no escape, no focus moved into it, and nothing to return to | All three added |
| B-aria | Ranges announced a bare number; pick and filter buttons announced no state; the rail did not mark the current page | `aria-valuetext`, `aria-pressed`, `aria-current` |
| B-contrast | Footer 4.04 to 1 and search placeholder 3.85, against the 4.5 AA asks for | Both above 7 to 1 |
| F-yaw | `physics-yaw` hardcoded y ticks against a computed `ymax`, leaving the curve in unlabelled space | Ticks derived from the axis |
| F-filters | The `filters` source note printed on the response plot's tick row at the default state | Separated |

---

## Deferred, with reason

These are accepted as real and are not yet done. They are listed so the next
person does not have to rediscover them.

- **The air column vocabulary pass.** A scripted scan found 43 sentences in
  the plain-language column carrying developer vocabulary, including a shell
  command. This is the single largest remaining source of bounce for the new
  audience. Deferred because it is 43 individual rewrites across 22 articles
  and wanted more care than the end of a long session affords.
- **Wiring the glossary into prose.** The data exists and is validated; the
  shell does not yet mark first use of a term or offer the definition
  in place. The page-level fallback is not built either. Doing this well
  means deciding between a glossary page and inline glosses, and the review
  argued for inline, which is the larger change.
- **Prediction prompts on the other figures.** The mechanism is in and one
  figure uses it. The reviewer asked for at least eight.
- **Telling the reader the figures are interactive at all.** Zero of 849
  lines of article prose mention dragging anything, and the control bar is
  styled like a passive readout. This is cheap and should be next.
- **`physics-missing` is a text list rendered as canvas pixels**: no knob, no
  computed value, unselectable, and it cannot reflow on a phone. It should be
  DOM. The lint now names it, with `boundary`, as a figure deliberately
  allowed to be still, which makes the exemption visible rather than silent.
- **`physics-lens` quotes both 150 and 155 degrees for the same lens.**
  Verified: the article contains both. One of them is wrong and the source
  needed to say which is not to hand.
- **`gyronoise` crowds its axis above about 85 percent throttle**, where the
  rotor line reaches 462 Hz against a 520 Hz axis. Verified by computation,
  not yet by eye.
- **Text collisions in `collide` and `radio` at their default state**, reported
  by the figures reviewer. Not independently verified, so not claimed fixed.
- **No skip link, and 68 tab presses to reach content.**

## Declined, with reason

- **Rebuilding `tpa` around loop gain, and the proposed `pidterms`,
  `hforcemech`, `loopgain`, `onemillisecond`, `washeffect` and `spectrum`
  figures.** These are good proposals and several would teach better than
  what is there. Declined for now on scope: each is a new figure with new
  physics to verify, and shipping six half-checked figures is worse than
  shipping none. They belong in a follow-up with the same verification the
  existing figures got.
- **`start-close` and `control-loopdelay` as new pages.** Same reason. The
  synthesis page in particular is a good idea and the path currently ends on
  a settings index, which is an anticlimax.
- **"616 px outside the canvas" as stated.** The draw calls did use those
  coordinates, but a canvas clips to its own bounds, so no ink escaped. The
  real defect was silent truncation of the bars, which is what was fixed.
  Recorded because the finding was right about the symptom and wrong about
  the mechanism, and the distinction matters if somebody re-runs the probe.

## Verified clean, recorded so it is not re-run

From the correctness sweep: no NaN, Infinity or division by zero anywhere
across roughly 2,400 control states; no requestAnimationFrame or observer
leak over 30 navigations; figures stop painting when off screen; reduced
motion honoured in both halves of the contract; 60 fps with no frame over
20 ms on every animated figure; `cli-index` builds its 696 rows in 22 to
31 ms. Contrast measured on 55 pairs with a median of 8.6 to 1.
