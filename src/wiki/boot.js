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
import { appendAttribution } from '../attribution.js';
import { mountWiki } from './wiki.js?v=20260928a';
/* At the film's address, stamp and all. The edge keeps a script for four
 * hours, so the bare address could hand the wiki the lettering from before
 * a deploy while the film had the new one. A stamp bumped in index.html is
 * bumped here with it. */
import { letterTitles } from '../titles.js?v=20260927m';

/* The wordmark in the simulator's hand, as it is on the film's page; the
 * wiki's titles are its articles' headings and stay text. See titles.js. */
letterTitles(document, '.mark');

{
  const byDest = new Map(destinations().map((d) => [d.id, d]));
  for (const a of document.querySelectorAll('[data-dest]')) {
    const d = byDest.get(a.dataset.dest);
    if (d) {
      /* Always append attribution parameters when linking to sim or board */
      a.href = appendAttribution(d.href);
    }
  }
  bindPatreonLinks();
}

const host = document.getElementById('wiki');
if (!host) {
  throw new Error('wiki: missing #wiki host');
}

const wiki = mountWiki(host);
wiki.simHref = appendAttribution(`${simOrigin()}/?map=field`);

/*
 * A READER IS NEVER SENT TO THE PLAIN COPY.
 *
 * Every article also has a plain copy at /wiki/<id>/, written for crawlers
 * by scripts/generate-wiki-pages.js: the text, and no figure, rail or search.
 * This file used to send every #wiki/<id> it saw to that copy with
 * location.replace, and it saw one far more often than on arrival. Going
 * Back or Forward between two articles fires hashchange as well as popstate,
 * because their fragments differ, even though pushState made both entries.
 * So Back from one article to the one before landed on the plain copy of it,
 * and every entry the reader went back through after that did the same, and
 * so did a reload, and so did Back to the wiki from any other page.
 *
 * It bought the crawlers nothing either. A crawler never sees a fragment, so
 * /wiki/#wiki/physics-wash is /wiki/ to it; the copies are canonical by their
 * own link rel and the sitemap. So #wiki/<id> opens its article here, which
 * is what the simulator's wikiPageUrl() and every old bookmark ask for, and
 * each copy links back to its article here.
 *
 * Listener first. It used to be registered after the initial openDefault(),
 * so anything that threw on the way in took deep linking down with it for
 * the rest of the session, and did it silently.
 */
window.addEventListener('hashchange', () => wiki.openDefault());
wiki.openDefault();
