# The wiki's voice

Tight, technical, straight to the point, and easy to read. A Scientific
American feature written by somebody with a word budget: the concrete opening
and the varied rhythm of a magazine, none of its wind-up. This file is the
working definition, because "make it sound better" is not an instruction
anybody can act on twice the same way.

The register applies to the article chapters, meaning The journey, The aircraft
and The controller. The 696 catalog pages are reference, and reference has its
own register, covered at the bottom. Both were tightened in the September
no-fluff pass; the difference between them is density, not care.

## The eight rules

**1. Open on something concrete, not a definition.** A magazine feature earns
the reader's attention in its first sentence and then spends it. So: "A five
inch racing quadcopter weighs about as much as a can of soft drink and will
accelerate straight up faster than a sports car accelerates forward." Not: "A
racing quad is a small rigid body with four spinning discs."

**2. The lede opens a gap.** One or two sentences that make the reader want the
next paragraph. "Throw a paper aeroplane and it flies. Throw a quadcopter and
it tumbles. Everything else on this site follows from that one difference."

**3. Vary sentence length on purpose.** The failure this replaced was a wall of
short declaratives, every one the same length, which reads as a machine
emptying a buffer. Build a long sentence through its subordinate clauses, then
land a short one. Rhythm is not decoration; it is how a reader knows which
sentence carried the point.

**4. Every analogy must predict.** A comparison earns its place if it lets the
reader anticipate the next paragraph, not if it merely paints a picture. "A
propeller is a device for throwing air downward" predicts that thrust and
torque are linked. "The quad danced through the gate" predicts nothing.

**5. Connect paragraphs.** Each paragraph after the first opens by taking hold
of the one before it. "That is only half of a descent." "The evidence for its
importance is what happened without it." "That coupling explains several things
pilots notice." Without these, a page is a list of facts wearing paragraph
indentation.

**6. Anchor every number to something a person can feel.** 9.2 to 1 thrust to
weight means nothing until it is "the kind of margin a fighter aircraft has in
afterburner, on a machine you can hold in one hand". Keep the number exact and
add the referent.

**7. Introduce a term in apposition and then use it.** "the bell, which is the
spinning outer can the propeller bolts to". Never a bare piece of jargon, and
never a definition parked in a box the reader has to go and find.

**8. Do not lose a fact to make a sentence nicer.** This is documentation. Every
number, file path, status and check that was in the old copy is still in the new
copy. Narrative is a delivery mechanism here, not a licence.

**9. Cut anything that is not carrying.** Four habits to delete on sight. An
announcement sentence, which tells the reader what the next sentence will do
("The evidence for its importance is what happened without it", "The algebra is
worth following, because"): delete it and let the content land. A decorative
tail, the clause after the point is already made. A restatement, where the
second half of a sentence says the first half again. And an expletive opener,
"there is" or "it is the", where a subject and a verb would do. Nothing here
argues for terseness as a virtue: a 60 word sentence full of coefficients earns
its length, and a 12 word one that announces the next paragraph does not.

## What each column is for

**In the air** gets the full treatment: scene, analogy, rhythm, transitions. It
is the magazine feature.

**In the lab** stays dense and technical. Scientific American does not write its
equations in the voice of its opening paragraph either. What it does get is a
topic sentence and connective tissue, so that it reads as an argument rather
than as a spilled drawer of constants. Keep the units, keep the coefficients,
explain why the form was chosen.

**In this simulator** is provenance: which file, which status, which check, what
is deliberately absent. Plain and short.

**Figure captions** state what the reader is looking at and what it means, in
that order, and end on the consequence. They are already close to the right
register and were mostly left alone.

## Still true from before

- No em dashes or en dashes anywhere. The minus signs in the equations are
  U+2212 and `wiki-lint` knows the difference.
- No filler adverbs used as intensifiers: really, quietly, very, extremely. The
  exception is a word marking a genuine contrast between the ideal and the real
  case, as in "the shaft power actually consumed" against the ideal power, or
  "the radio you actually own" against the perfect link. Eight of those survive
  and they are all doing work.
- No scare quotes around ordinary words. Quotation marks are for quoting.
- Do not end every paragraph on an aphorism. One good closing line per page is
  a voice; one per paragraph is a tic, and they cancel each other out.
- `X, not Y` is for disambiguating two things a reader might confuse. It is not
  a way to end a sentence with a flourish.

## The catalog pages are reference, not features

`src/wiki/cli.js` holds 696 pages, one per Betaflight setting, in five short
sections each. Nobody wants a narrative essay about `gyro_soft_notch_cutoff_2`,
and somebody looking that key up at a race wants the answer in one screen. Those
pages stay terse, imperative and scannable. They were cleaned of filler in the
September pass and the register is correct as it stands.

The dividing line is the reader's posture. Articles are read; the catalog is
consulted.
