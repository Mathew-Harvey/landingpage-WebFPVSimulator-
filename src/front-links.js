/*
 * front-links.js: what the film's main.js did for the front door's links,
 * for a front page that has no film.
 *
 * Every launch link is already in index.html, pointing at production. This
 * does not build them, it RETARGETS them, the way main.js does and for the
 * same reason: a link that is the point of the page must not depend on a
 * module having loaded. With this file gone the page still flies.
 *
 * Three jobs:
 *
 *   Where the visitor came from (?ref=, a utm tag, the referrer) is kept for
 *   the session, and added to every link into the simulator or the board,
 *   so a lap flown after a click from here is counted against the place the
 *   visitor arrived from. src/attribution.js owns the rules.
 *
 *   Served from a loopback address, the launch links go to the local
 *   simulator and board instead (src/config.js), so a laptop serving all
 *   three repositories is one site.
 *
 *   The Patreon and tip links get their hover line and the address
 *   src/config.js holds, as they do on the film.
 *
 * src/config.js is imported at the address src/support-boot.js imports it
 * by. One module under two addresses runs twice, so the stamp here moves
 * with the one there (CLAUDE.md, "A deploy that changes a script changes its
 * address").
 *
 * This file is part of the WebFPVSimulator landing page.
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or (at
 * your option) any later version.
 *
 * This program is distributed in the hope that it will be useful, but
 * WITHOUT ANY WARRANTY, without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU
 * General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program. If not, see <https://www.gnu.org/licenses/>.
 */

import { bindPatreonLinks, bindTipLinks, destinations } from './config.js?v=20261021b';
import { captureAttribution, appendAttribution } from './attribution.js';

/* First, so the links below carry what this visit arrived with. */
captureAttribution();

const byDest = new Map(destinations().map((d) => [d.id, d]));
for (const a of document.querySelectorAll('[data-dest]')) {
  const d = byDest.get(a.dataset.dest);
  if (d) {
    a.href = appendAttribution(d.href);
  }
}
bindPatreonLinks();
bindTipLinks();
