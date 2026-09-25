/*
 * boot.js: mount the FPV wiki on the landing site's wiki page.
 *
 * The film at / does not load this. This page owns no physics and does not
 * step anything. Deep links are #wiki/<id>.
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

import { bindPatreonLinks, destinations, simOrigin } from '../config.js';
import { mountWiki } from './wiki.js';

{
  const byDest = new Map(destinations().map((d) => [d.id, d]));
  for (const a of document.querySelectorAll('[data-dest]')) {
    const d = byDest.get(a.dataset.dest);
    if (d && a.getAttribute('href') !== d.href) {
      a.href = d.href;
    }
  }
  bindPatreonLinks();
}

const host = document.getElementById('wiki');
if (!host) {
  throw new Error('wiki: missing #wiki host');
}

const wiki = mountWiki(host);
wiki.simHref = `${simOrigin()}/?map=field`;

/*
 * Hash URL redirect: if someone lands on #wiki/<id>, redirect them to the
 * static /wiki/<id>/ page instead. Static pages are canonical; the SPA is
 * for in-app navigation only.
 */
function redirectHashToStatic() {
  const hash = (window.location.hash || '').replace(/^#/, '');
  let id = '';
  if (hash.startsWith('wiki/')) {
    id = hash.slice(5);
  } else if (hash && hash !== '') {
    id = hash;
  }
  
  if (id && id !== '') {
    /* Redirect to static page with location.replace (no history entry) */
    window.location.replace(`/wiki/${id}/`);
    return true;
  }
  return false;
}

/* Check for hash redirect on initial load */
if (!redirectHashToStatic()) {
  /*
   * Listener first. It used to be registered after the initial openDefault(),
   * so anything that threw on the way in took deep linking down with it for
   * the rest of the session, and did it silently.
   */
  window.addEventListener('hashchange', () => {
    if (!redirectHashToStatic()) {
      wiki.openDefault();
    }
  });
  wiki.openDefault();
}
