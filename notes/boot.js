/*
 * boot.js: point the patch notes page at the local sim and board when
 * this site is being served from a laptop, and bind the Patreon link.
 *
 * The film and the wiki do the same job in their own boots. This page
 * has no timeline and no catalog, so this file stops once the links
 * are honest.
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

import { bindPatreonLinks, destinations } from '../src/config.js';

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
