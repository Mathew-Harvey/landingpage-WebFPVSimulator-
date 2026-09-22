# Patreon, the other revenue line

Sponsorship sells a place on a track to a business. Patreon asks the people
who fly it for money directly. They are separate offerings with separate
audiences and the only thing they share is that both are ways this product
pays for itself.

This one is **live and priced**, which makes it the only thing in this
folder with real numbers in it.

## The page

`https://www.patreon.com/c/webfpv`

## The three memberships

In the order Patreon lists them, which is the order the hover note reads
them out in:

| Membership | Price |
| --- | --- |
| Keep the lights on | $5 |
| Hosting + runway | $12 |
| Build the sim | $25 |

USD, plus GST on join.

The names are the argument. They are not Bronze, Silver and Gold: each one
says what the money is actually for, and they escalate from covering a bill
to funding the work. A supporter choosing the middle tier knows they are
paying for hosting and some runway, which is a more honest proposition than
a tier list that only differs by the size of the number.

## Where the control appears

The support link sits in **the top bar, before Fly now**, and again in the
**footer**. The wiki carries the same control. All three products have it:
the simulator, the landing page and the board.

On a phone the nav hides everything except the primary action, the wiki and
Patreon. That is a statement of priority worth noticing: when there is room
for three things, this is one of the three.

## Patreon's brand rules, which constrain the control

Written into `src/share/patreon.js` in the simulator's repository, which is
the copy of record.

The mark is **Patreon's symbol**, the vertical bar and the circle, in their
coral `#FF424D`. The visible word beside it is the name set in this page's
own type.

That arrangement is deliberate and it is the arrangement Patreon's brand
notes allow. What they do **not** allow is a redrawn wordmark, or the symbol
dropped into a sentence. Anybody producing collateral that shows the support
control has to keep those two rules.

`Do not restyle the path.` The symbol's path data is in `patreon.js` with
that instruction above it.

The coral is the one colour in the whole family that is not from this
product's palette, and it is theirs. Everything around the control stays in
this product's palette. A black mark, which is how the symbol is often
supplied, would disappear on these dark pages, which is why the coral is not
optional here.

## The three copies problem

`PATREON_URL` and `PATREON_NOTE` are set in **three places**, because the
three sites cannot import from each other:

| Repository | File |
| --- | --- |
| Simulator | `src/share/patreon.js` |
| Landing page | `src/config.js` |
| Board | `public/app.js` |

All three currently agree, checked in this turn against each repository's
`origin/main`.

**Changing a price means editing three files in three repositories.** There
is no lint tying them together and nothing fails if one is missed, so a
price change that touches two of the three leaves one site quoting the old
membership for as long as it takes somebody to notice.

That is the thing most likely to go wrong with this offering, and it is
worth knowing before a price is ever changed. The note also has to match
what Patreon's own page says, and nothing checks that either, because
nothing here can read Patreon.

## What the note says, verbatim

The hover text and the accessible label on every one of those controls, on
all three sites:

```
Support WebFPV on Patreon. Keep the lights on, $5. Hosting + runway, $12.
Build the sim, $25. USD, plus GST on join.
```

Prices in a hover label are prices in a public place. Treat that string as
published pricing, because it is.

## How this sits beside sponsorship

Worth being deliberate about, since both live in this folder.

**Different buyers.** A sponsor is a business buying attention. A patron is
a pilot funding a thing they like. Neither pitch works on the other.

**Different reporting.** Patreon does its own, and it reports far more than
the board does: Patreon knows who its members are and the board deliberately
knows nothing about anybody. Do not try to join the two. The board has no
identifier to join on, by design, and building one would cost the whole
privacy posture that `attribution.md` sets out.

**The link does not get a sponsor slug.** Patreon is outside the product,
and the board's comment says it must not take the `webfpv-sim` tab name
either. It is an external link, opened in a new tab, and it carries no
attribution parameters in either direction.

**One is live and one is not.** Patreon has a page, three priced
memberships and a control on every site. Sponsorship has a fully built
delivery mechanism and no price list. If somebody asks which is closer to
earning money today, it is this one.
