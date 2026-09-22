# The link, and what comes back

What a sponsor gets to measure, how the measuring works, and the large
amount that is deliberately not measured. The second half is as much a part
of the offering as the first, and it should be said out loud rather than
discovered.

Implemented in `src/sponsors.js` and `src/server.js` on the board, and in
`src/share/session.js` and `src/share/stats.js` in the simulator.

## The link

```
https://webfpv.org/sim/?utm_source=rotorriot&utm_medium=sponsor
```

Built by `sponsorLink()` on the board and shown to a signed in admin in the
Admin panel, ready to copy. It points at the simulator rather than at the
front door on purpose: a pilot arriving from a sponsor should be flying in
one click, not reading a page about flying.

`utm_medium` and `utm_campaign` are there for the sponsor's own reporting
and are never read on this side. A sponsor can put whatever campaign
taxonomy their agency uses on the end and nothing here will mind.

## The slug, and the one rule about it

A sponsor is a `slug:Name` pair, set by the host in `BOARD_SPONSORS`:

```
BOARD_SPONSORS=rotorriot:Rotor Riot,fpvshop:The FPV Shop
```

The slug matches `/^[a-z0-9-]{2,32}$/`, lower case so a poster printed in
capitals and a link typed in lower case are one sponsor rather than two
rows.

**The slug is what travels and must not change once a poster is printed.**
Changing it orphans every printed link and every QR code already in the
world, and the arrivals on the old one fold into `other`. The display name
is what the page prints and can be changed whenever anybody likes. Get the
slug right at signing and never touch it again.

A name is bounded to 40 characters and stripped of control and format
characters before it reaches a public page. Letters of any alphabet stay, so
a sponsor called Café FPV is called that.

Setting `BOARD_SPONSORS` **replaces** the list rather than adding to it, so
a host adding a second sponsor has to write both. The built in list is
empty, which is the right default: a made up example sponsor would ship a
name that is not a sponsor onto a public page and somebody would have to
notice it was fictional.

## The fold, which is why the numbers are worth anything

Whatever arrives in `utm_source` becomes exactly one of three things: a slug
on the list, `direct`, or `other`. Nothing else is ever stored.

That is the whole security property of the sponsor system. The alternative,
storing whatever `utm_source` said, is how a stranger with curl adds a row
to a public page: a thousand posts carrying a thousand invented sources is a
thousand rows nobody can clean, each one printed under a heading that says
where pilots came from. The sources table has at most two rows more than
the host wrote down, whatever anybody posts.

For a sponsor this is the reason their number means something. A public
counter that anybody can write to is not a counter.

## What a sponsor can read, and where

The board's **statistics tab** is public, and the per sponsor arrival
numbers are on it, deliberately, so a sponsor can check them without asking
anybody and without being given a login.

The list of sponsors is **not** public, because it includes the ones with no
traffic yet, which is a commercial fact rather than a public one. A sponsor
with arrivals appears; a sponsor who has not yet put a poster up does not.

Counted across the whole site, per UTC day:

| Counted | Where it comes from |
| --- | --- |
| Pilots, new and returning | one visit per browser per UTC day, from any of the three pages |
| Sessions | a simulator page load where the quad left the launch stand |
| Laps, flight time, crashes | deltas the simulator flushes once a minute |
| Country | two letters put on the request by the edge, never looked up |
| Source | `direct`, a sponsor's slug, or `other` |
| Aircraft, input, map | the session that reported them |

Flight time does not count a minute spent upside down in crashflip. That
was a bug and it was fixed.

## The address bar is cleaned on arrival

`captureSource` runs as the first line of the simulator's boot. It puts the
slug away for thirty days, deletes every `utm_` parameter, and leaves
`map`, `share`, `board` and `craft` exactly where they were.

This costs a sponsor nothing and protects the number. A simulator URL is how
a track travels, and those links get copied and pasted constantly. A pilot
who sends a friend the link they are looking at must not attribute their
friend to a poster they never saw. Without the strip, one popular pilot
sharing a track would inflate whichever sponsor they happened to arrive
from, and every sponsor's number would be worth less.

## The attribution window

Thirty days, held in the visitor's own browser. A pilot who walks past a
poster at a club night and comes back a fortnight later still counts for
that sponsor.

It is not a tracking identifier and it cannot become one. The slug rides on
the events that browser sends as one of a handful of known words. It says
which poster somebody walked past, not who they are.

## What is not measured, and cannot be

Every line of this is a limit to quote in a conversation with a sponsor
rather than to leave for them to find.

**No impressions.** Nothing counts how many times a mark was on screen.

**No per track figures.** Arrivals are per sponsor link and laps are per
site. There is no report saying how many laps were flown on the track
carrying a given sponsor's mark. This is the biggest gap in the offering.

**No click through beyond the arrival.** The board knows an arrival came in
on a sponsor link and that the browser later flew. It does not know anything
about what the person did on the sponsor's own site, in either direction.

**No individual anything.** The store holds one row per UTC day and one row
per day per dimension, and that is the finest grain there is. There is no
row anywhere that describes one visitor, one visit or one lap.

**Nothing that could identify a person.** No address, no user agent, no
referrer, no screen size, no pilot name, no track id, and no timestamp finer
than the day. There is no field in the wire format for any of them to
arrive in. No cookie is ever set.

New or returning is decided **by the browser**, from a first seen date it
keeps in its own local storage. It sends the answer, not the date.

The per tab handle that answers "how many are flying now" lives in memory
for three minutes and reaches no store.

**Visitors can turn it off, and some will.** The page carries a Count this
browser switch, and a browser sending Global Privacy Control is never
counted: the client checks `navigator.globalPrivacyControl` and sends
nothing, and the server checks the `Sec-GPC` header and stores nothing. So
every number is a floor rather than a total.

## The country

Two letters put on the request by the edge from Cloudflare's own
`request.cf.country`, believed only behind `BOARD_TRUST_PROXY`. Nothing
here ever looks an address up, and no address is held.

On the bare Render address there is no Worker in front, so the header is
whatever the client sent. That is the same trust the address already
extends to `x-forwarded-for` on a public counter, and it is written down
rather than glossed. The production address behind Cloudflare is the one to
quote figures from.

## Selling this rather than apologising for it

The honest framing, and it is a better pitch than a fabricated dashboard:

A sponsor gets a public, tamper resistant count of the people who arrived
because of them, on a page their own marketing department can open without
asking anybody for access, on a product that holds nothing about any of
those people. In a category where the usual answer is an opaque number from
a vendor with an interest in it being large, a small honest number that
anybody can check is worth more than it looks.

What it is not is a performance marketing channel, and a sponsor who wants
cost per acquisition attribution down to a purchase should be told plainly
that this cannot provide it.
