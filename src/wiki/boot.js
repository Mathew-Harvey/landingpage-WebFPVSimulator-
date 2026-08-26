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

import { destinations, simOrigin } from '../config.js';
import { mountWiki } from './wiki.js';

{
  const byDest = new Map(destinations().map((d) => [d.id, d]));
  for (const a of document.querySelectorAll('[data-dest]')) {
    const d = byDest.get(a.dataset.dest);
    if (d && a.getAttribute('href') !== d.href) {
      a.href = d.href;
    }
  }
}

const host = document.getElementById('wiki');
if (!host) {
  throw new Error('wiki: missing #wiki host');
}

const wiki = mountWiki(host);
wiki.simHref = `${simOrigin()}/?map=field`;
wiki.openDefault();
window.addEventListener('hashchange', () => wiki.openDefault());
