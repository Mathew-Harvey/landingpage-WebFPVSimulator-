/*
 * support-boot.js: initialize supporters section and click tracking.
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

import { trackSupportClick } from './stats.js';
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
