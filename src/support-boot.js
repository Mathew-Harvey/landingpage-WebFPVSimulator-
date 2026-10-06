/*
 * support-boot.js: the supporters section, the Support click, and the partners' marks counted.
 *
 * This file is part of the WebFPVSimulator landing page.
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or (at
 * your option) any later version.
 *
 * This program is distributed in the hope that it will be useful, but
 * WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU
 * General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program. If not, see <https://www.gnu.org/licenses/>.
 */

import { trackPartner, trackSupportClick, trackOfferClick } from './stats.js';
import { loadSupporters } from './supporters.js';
import { PATREON_NOTE } from './config.js';

/*
 * Load and render supporters from supporters.json.
 */
const list = document.getElementById('supporters-list');
if (list) {
  loadSupporters(list);
}

/*
 * Set Support link attributes from config constants and add click
 * tracking to both Support link and Patreon buttons. Uses sendBeacon
 * with fetch keepalive fallback so it never blocks navigation.
 */
const links = document.querySelectorAll('#support-link, [data-patreon]');
links.forEach((link) => {
  if (link.id === 'support-link') {
    link.setAttribute('aria-label', PATREON_NOTE);
    link.title = PATREON_NOTE;
  }
  link.addEventListener('click', trackSupportClick);
});

/*
 * Track offer link clicks (sign, track, club, clip).
 */
const offerLinks = document.querySelectorAll('[data-offer]');
offerLinks.forEach((link) => {
  link.addEventListener('click', () => trackOfferClick(link.dataset.offer));
});

/*
 * THE PARTNERS' MARKS: the footer's row and each partner's one moment in the
 * film ([data-partner] in index.html). A click is counted as it leaves for
 * the partners page. SEEN is what a partner is told their mark was: at least
 * half of it inside the window, drawn (no ancestor hidden or faded below
 * half, which is how the film's instruments come and go), for a second
 * together. Counted once a page load for each mark, and nothing at all for
 * a browser that sends Global Privacy Control (./stats.js).
 *
 * Here and not in main.js because this module is up without three.js and
 * the film: the footer row is counted on a phone whose WebGL never came.
 */
const SEEN_MS = 1000;
const SEEN_TICK = 250;
const marks = [...document.querySelectorAll('[data-partner]')];
for (const a of marks) {
  a.addEventListener('click', () => trackPartner(a.dataset.partner, 'click', a.dataset.place));
}

function drawn(node) {
  for (let n = node; n && n.nodeType === 1; n = n.parentElement) {
    const cs = getComputedStyle(n);
    if (cs.display === 'none' || cs.visibility === 'hidden' || Number(cs.opacity) < 0.5) {
      return false;
    }
  }
  return true;
}

if (marks.length && typeof IntersectionObserver !== 'undefined') {
  const inView = new Set();
  const shownMs = new Map();
  let timer = 0;
  const tick = () => {
    for (const a of inView) {
      const ms = drawn(a) ? (shownMs.get(a) || 0) + SEEN_TICK : 0;
      shownMs.set(a, ms);
      if (ms >= SEEN_MS) {
        inView.delete(a);
        io.unobserve(a);
        trackPartner(a.dataset.partner, 'seen', a.dataset.place);
      }
    }
    if (!inView.size) {
      clearInterval(timer);
      timer = 0;
    }
  };
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (e.isIntersecting && e.intersectionRatio >= 0.5) {
        inView.add(e.target);
      } else {
        inView.delete(e.target);
        shownMs.set(e.target, 0);
      }
    }
    if (inView.size && !timer) {
      timer = setInterval(tick, SEEN_TICK);
    }
  }, { threshold: [0, 0.5, 1] });
  marks.forEach((m) => io.observe(m));
}
