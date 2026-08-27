# Wiki design review, August 2026

Reviewed at commit 92d2a08. The brief that prompted this review changed the
audience: the wiki was written for people who already fly, and has to be
understandable by a bright high school student who has never held a radio,
never seen a control loop, and does not know what advance ratio, figure of
merit, induced velocity, airmode or feedforward mean.

This file is the record. Findings are listed whether or not they were acted
on, and a finding that was declined is recorded with the reason, because a
review whose losing arguments vanish is not a review.

## Method

Five adversarial reviewers were run in parallel, each with one lens and an
instruction to find what is wrong rather than to be encouraging:

| Lens | Brief |
| --- | --- |
| Content and reading level | What a fifteen year old bounces off. Undefined jargon, assumed knowledge, sentence density, ledes that show off |
| Visual design | Typographic hierarchy, measure, colour discipline, contrast, density at six widths from 1920 to 430 |
| Science communication | Intuition before formalism, missing analogies, unaddressed misconceptions, the order concepts arrive in |
| Figures and animation | Charts that should be mechanisms, invisible interactivity, clutter, motion design, control labels |
| Correctness and accessibility | Slider extremes, figure against text contradictions, keyboard operation, WCAG contrast, state leaks |

Reviewers were read only. Every finding cites a file and line, and the
design and figure reviewers were required to look at rendered pixels rather
than reason from source, because a design review done without looking at
pixels is worthless.

## Findings before the fan out

Three problems were visible without any tooling, and they are recorded here
because they set the shape of everything else.

**The masthead excludes the audience it now has.** The first page a reader
lands on is titled "Simulating FPV, for nerds". A teenager who is not
already certain they qualify has been told to leave before they have read a
sentence.

**The opening sentence is a definition rather than a hook.** "A racing quad
is a small rigid body with four spinning discs, a radio, and a computer
that tries 1,000 times a second to make the body rotate at the rate you
asked for." Rigid body is a technical term in sentence one, and nothing in
the paragraph says why any of it is worth caring about.

**The plain language column is not plain language.** "In the air" is
specified as the version you could tell somebody at the field. It currently
contains 6S, Mode 2, ailerons, elevator, static thrust and a vortex of its
own wake, none of them defined. It reads as the lab column with fewer
symbols, which is the exact failure the two column split exists to prevent.

Sentence length is mostly healthy at 12.9 words on average across the plain
column, but the worst pages run to 19 on average with individual sentences
of 38 and 39 words: start-nowings, physics-yaw and physics-hforce.

## Reviewer findings

Pending. The five reviewers are in flight; this section is filled in when
they report, with each finding marked acted on or declined.
