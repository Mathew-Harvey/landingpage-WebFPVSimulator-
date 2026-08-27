/*
 * wiki.js: the FPV wiki.
 *
 * A two-pane document on the landing site. One article at a time, a rail
 * that says where you are in a path of thirteen pages, and a search that
 * reaches all seven hundred. Hash is #wiki/<id> so a page can be shared.
 * Nothing here steps the integrator. The plant and the compiled controller
 * live in the simulator repo; this page describes them.
 *
 * Two things this file is careful about.
 *
 * The rail used to print the journey twice, once as a path and again as a
 * chapter, which made a reader think there were two of everything. There is
 * one list now. Membership of the path is drawn on the chapter entry as a
 * numbered step, so the path is a property of a page rather than a second
 * copy of it.
 *
 * Figures are live: they own a canvas, a requestAnimationFrame slot and two
 * observers. Replacing the article without telling them would leak all
 * three, so every render calls stopFigures() first. If you add another
 * place that empties this.article, it has to call it too.
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

import { stopFigures } from './anim.js';
import { ARTICLES, ARTICLE_BY_ID, CHAPTERS } from './articles.js';
import { allCliPages, cliIndexPage, cliPageId } from './cli.js';
import { wikiFigure } from './figures.js';
import { FIELDS, TABS } from '../fc/catalog.js';

function el(tag, cls, text) {
  const n = document.createElement(tag);
  if (cls) {
    n.className = cls;
  }
  if (text != null) {
    n.textContent = text;
  }
  return n;
}

function btn(cls, text) {
  const n = el('button', cls, text);
  n.type = 'button';
  return n;
}

const CLI_PAGES = allCliPages();
const CLI_BY_ID = new Map(CLI_PAGES.map((p) => [p.id, p]));
const INDEX = cliIndexPage();

/*
 * The reading path. Thirteen pages that make an argument in order, out of
 * seven hundred that are a reference. Everything else is reachable and
 * nothing else is compulsory.
 */
const JOURNEY = [
  'start-welcome',
  'start-nowings',
  'start-loop',
  'start-compiled',
  'start-honesty',
  'physics-airframe',
  'physics-motor',
  'physics-vrs',
  'physics-wash',
  'physics-hforce',
  'control-pid',
  'control-filters',
  'cli-index',
];
const JOURNEY_STEP = new Map(JOURNEY.map((id, i) => [id, i + 1]));

function pageById(id) {
  if (id === 'cli-index') {
    return INDEX;
  }
  return ARTICLE_BY_ID.get(id) || CLI_BY_ID.get(id) || null;
}

function chapterOf(page) {
  if (!page) {
    return null;
  }
  if (page.chapter) {
    return CHAPTERS.find((c) => c.id === page.chapter) || null;
  }
  return CHAPTERS.find((c) => c.id === 'cli') || null;
}

function searchHay(page) {
  const bits = [page.id, page.title, page.kicker, page.lede, page.key, page.status];
  for (const s of page.sections || []) {
    bits.push(s.title, ...(s.paras || []));
  }
  return bits.filter(Boolean).join(' ').toLowerCase();
}

let SEARCH_INDEX = null;
function searchIndex() {
  if (SEARCH_INDEX) {
    return SEARCH_INDEX;
  }
  SEARCH_INDEX = [
    ...ARTICLES,
    INDEX,
    ...CLI_PAGES,
  ].map((p) => ({
    id: p.id,
    title: p.title,
    status: p.status || '',
    kind: p.kind || 'article',
    lede: p.lede || '',
    hay: searchHay(p),
  }));
  return SEARCH_INDEX;
}

/*
 * Score a page against a query. The tie breakers at the bottom are only
 * ever applied to a page that actually matched: adding them unconditionally
 * put all thirty five articles at the top of every CLI key search, which
 * looks like a working search right up until you read the results.
 */
function hitScore(row, q) {
  let s = 0;
  if (row.id === q || row.id === `cli-${q}` || row.id === `feature-${q}`) {
    s += 120;
  }
  if (row.id.toLowerCase().includes(q)) {
    s += 40;
  }
  const title = row.title.toLowerCase();
  if (title === q) {
    s += 90;
  } else if (title.startsWith(q)) {
    s += 55;
  } else if (title.includes(q)) {
    s += 25;
  }
  if (row.hay.includes(q)) {
    s += 4;
  }
  if (s === 0) {
    return 0;
  }
  if (row.status === 'LIVE') {
    s += 2;
  }
  if (row.kind === 'article') {
    s += 3;
  }
  return s;
}

function statusChip(status) {
  if (!status) {
    return null;
  }
  return el('span', `wiki-chip wiki-chip-${status.toLowerCase().replace(/_/g, '-')}`, status.replace(/_/g, ' '));
}

/* Highlight the query inside a result, so a hit says why it is a hit. */
function marked(str, q) {
  const frag = document.createDocumentFragment();
  if (!q) {
    frag.append(document.createTextNode(str));
    return frag;
  }
  const lower = str.toLowerCase();
  let at = 0;
  for (;;) {
    const hit = lower.indexOf(q, at);
    if (hit < 0) {
      break;
    }
    frag.append(document.createTextNode(str.slice(at, hit)));
    frag.append(el('mark', null, str.slice(hit, hit + q.length)));
    at = hit + q.length;
  }
  frag.append(document.createTextNode(str.slice(at)));
  return frag;
}

/* The sentence a hit was found in, so a result is worth clicking or not. */
function snippet(row, q) {
  const at = row.hay.indexOf(q);
  if (at < 0) {
    return '';
  }
  const from = Math.max(0, at - 60);
  const raw = row.hay.slice(from, at + 110);
  return `${from > 0 ? '...' : ''}${raw}${at + 110 < row.hay.length ? '...' : ''}`;
}

export class WikiView {
  constructor(host) {
    this.host = host;
    this.pageId = 'start-welcome';
    this.filter = 'all';
    this.cliTab = '';
    this.query = '';
    this.simHref = null;
    this.build();
  }

  build() {
    this.host.textContent = '';
    this.host.classList.add('wiki-host');
    const shell = el('div', 'wiki-shell');

    this.railToggle = btn('wiki-rail-toggle', 'Contents');
    this.railToggle.setAttribute('aria-expanded', 'false');
    this.railToggle.addEventListener('click', () => this.toggleRail());

    this.rail = el('nav', 'wiki-rail');
    this.rail.setAttribute('aria-label', 'Wiki chapters');
    this.main = el('div', 'wiki-main');

    const tools = el('div', 'wiki-tools');
    this.search = document.createElement('input');
    this.search.type = 'search';
    this.search.className = 'wiki-search';
    this.search.placeholder = 'Search every page and all 696 settings';
    this.search.setAttribute('aria-label', 'Search the wiki');
    this.search.autocomplete = 'off';
    this.search.addEventListener('input', () => {
      this.query = this.search.value.trim();
      this.renderResults();
    });
    this.search.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.search.value = '';
        this.query = '';
        this.renderResults();
        this.search.blur();
      }
      if (e.key === 'Enter') {
        const first = this.results.querySelector('.wiki-hit');
        if (first) {
          first.click();
        }
      }
      e.stopPropagation();
    });
    const hint = el('kbd', 'wiki-search-hint', '/');
    tools.append(this.railToggle, this.search, hint);

    this.results = el('div', 'wiki-results');
    this.article = el('article', 'wiki-article');
    this.main.append(tools, this.results, this.article);
    shell.append(this.rail, this.main);
    this.host.append(shell);

    /* Arrow keys walk the path, the way a book does. */
    document.addEventListener('keydown', (e) => {
      if (e.target === this.search || e.metaKey || e.ctrlKey || e.altKey) {
        return;
      }
      if (e.key === '/') {
        e.preventDefault();
        this.search.focus();
        return;
      }
      const i = JOURNEY.indexOf(this.pageId);
      if (i < 0) {
        return;
      }
      if (e.key === 'ArrowLeft' && i > 0) {
        this.open(JOURNEY[i - 1]);
      }
      if (e.key === 'ArrowRight' && i < JOURNEY.length - 1) {
        this.open(JOURNEY[i + 1]);
      }
    });

    this.renderRail();
    this.render();
  }

  toggleRail(force) {
    const open = force == null ? !this.host.classList.contains('rail-open') : force;
    this.host.classList.toggle('rail-open', open);
    this.railToggle.setAttribute('aria-expanded', String(open));
  }

  typing() {
    return document.activeElement === this.search;
  }

  open(id, opts = {}) {
    const page = pageById(id);
    if (!page) {
      return false;
    }
    this.pageId = id;
    this.query = '';
    if (this.search) {
      this.search.value = '';
    }
    this.toggleRail(false);
    this.renderRail();
    this.render();
    if (!opts.silentHash) {
      const url = new URL(window.location.href);
      url.hash = `wiki/${id}`;
      history.replaceState(null, '', url);
    }
    this.main.scrollTop = 0;
    return true;
  }

  openDefault() {
    const hash = (window.location.hash || '').replace(/^#/, '');
    let id = '';
    if (hash.startsWith('wiki/')) {
      id = decodeURIComponent(hash.slice(5));
    } else if (hash) {
      id = decodeURIComponent(hash);
    }
    if (id && this.open(id, { silentHash: true })) {
      return;
    }
    this.open('start-welcome', { silentHash: false });
  }

  /*
   * One list, not two. A page's membership of the reading path is drawn on
   * the page's own entry as a step number, rather than printed again in a
   * second block above.
   */
  renderRail() {
    this.rail.textContent = '';
    const here = JOURNEY_STEP.get(this.pageId);

    const head = el('div', 'wiki-rail-head');
    head.append(el('div', 'wiki-rail-kicker', 'The reading path'));
    head.append(el('p', 'wiki-rail-note', 'Thirteen pages, in order, that make the whole argument. Everything else is reference you can reach from search.'));
    const bar = el('div', 'wiki-progress');
    const fill = el('div', 'wiki-progress-fill');
    fill.style.width = `${((here || 0) / JOURNEY.length) * 100}%`;
    bar.append(fill);
    head.append(bar);
    head.append(el('div', 'wiki-progress-label', here ? `Step ${here} of ${JOURNEY.length}` : 'Off the path, in the reference'));
    this.rail.append(head);

    for (const ch of CHAPTERS) {
      const block = el('div', 'wiki-rail-block');
      block.append(el('div', 'wiki-rail-kicker', ch.title));
      block.append(el('p', 'wiki-rail-note', ch.note));
      if (ch.id === 'cli') {
        block.append(this.railLink(INDEX, 'cli-index'));
        const subs = el('div', 'wiki-rail-subs');
        for (const tab of TABS) {
          const b = btn('wiki-rail-link wiki-rail-sub', tab.label);
          b.addEventListener('click', () => {
            this.cliTab = tab.id;
            this.filter = 'all';
            this.open('cli-index');
          });
          subs.append(b);
        }
        block.append(subs);
      } else {
        for (const p of ARTICLES.filter((a) => a.chapter === ch.id)) {
          block.append(this.railLink(p, p.id));
        }
      }
      this.rail.append(block);
    }
  }

  railLink(page, id) {
    const b = btn(this.pageId === id ? 'wiki-rail-link on' : 'wiki-rail-link');
    const step = JOURNEY_STEP.get(id);
    if (step) {
      b.append(el('span', 'wiki-rail-step', String(step)));
      b.classList.add('is-path');
    }
    b.append(el('span', 'wiki-rail-title', page.title));
    b.addEventListener('click', () => this.open(id));
    return b;
  }

  renderResults() {
    this.results.textContent = '';
    const q = this.query.toLowerCase();
    if (!q) {
      this.results.hidden = true;
      this.article.hidden = false;
      return;
    }
    this.results.hidden = false;
    this.article.hidden = true;
    const ranked = searchIndex()
      .map((row) => ({ row, score: hitScore(row, q) }))
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score);
    const hits = ranked.slice(0, 40).map((x) => x.row);
    this.results.append(el('p', 'wiki-results-cap', ranked.length
      ? `${hits.length}${ranked.length > 40 ? ` of ${ranked.length}` : ''} matches`
      : 'No matches. Try a CLI key, or a word from an article.'));
    for (const hit of hits) {
      const b = btn('wiki-hit');
      const top = el('span', 'wiki-hit-top');
      const title = el('span', 'wiki-hit-title');
      title.append(marked(hit.title, q));
      top.append(title);
      if (hit.status) {
        top.append(statusChip(hit.status));
      }
      top.append(el('span', 'wiki-hit-id', hit.id));
      b.append(top);
      const snip = snippet(hit, q);
      if (snip) {
        const line = el('span', 'wiki-hit-snip');
        line.append(marked(snip, q));
        b.append(line);
      }
      b.addEventListener('click', () => this.open(hit.id));
      this.results.append(b);
    }
  }

  render() {
    stopFigures();
    this.results.hidden = true;
    this.article.hidden = false;
    this.article.textContent = '';
    const page = pageById(this.pageId);
    if (!page) {
      this.article.append(el('p', null, 'That page is missing.'));
      return;
    }
    const chapter = chapterOf(page);
    const kicker = el('div', 'wiki-kicker');
    kicker.append(el('span', null, page.kicker || (chapter ? chapter.title : '')));
    if (page.status) {
      kicker.append(statusChip(page.status));
    }
    const step = JOURNEY_STEP.get(this.pageId);
    if (step) {
      kicker.append(el('span', 'wiki-step-tag', `Step ${step} of ${JOURNEY.length}`));
    }
    this.article.append(kicker);
    this.article.append(el('h2', null, page.title));
    if (page.key && page.kind === 'cli') {
      const code = el('p', 'wiki-key');
      code.append(el('code', null, page.key));
      this.article.append(code);
    }
    if (page.lede) {
      this.article.append(el('p', 'wiki-lede', page.lede));
    }
    if (page.figure) {
      const fig = wikiFigure(page.figure);
      if (fig) {
        this.article.append(fig);
      }
    }
    if (page.kind === 'index') {
      this.renderCliIndex(page);
      return;
    }
    const pair = el('div', 'wiki-pair');
    const air = (page.sections || []).find((s) => s.id === 'air');
    const lab = (page.sections || []).find((s) => s.id === 'lab');
    if (air) {
      pair.append(this.sectionNode(air, 'wiki-col wiki-col-air'));
    }
    if (lab) {
      pair.append(this.sectionNode(lab, 'wiki-col wiki-col-lab'));
    }
    this.article.append(pair);
    for (const s of page.sections || []) {
      if (s.id === 'air' || s.id === 'lab') {
        continue;
      }
      this.article.append(this.sectionNode(s, `wiki-sec wiki-sec-${s.id}`));
    }
    if (page.reason && page.status && page.status !== 'LIVE') {
      const note = el('p', 'wiki-reason');
      note.append(el('strong', null, 'Catalog reason. '), document.createTextNode(page.reason));
      this.article.append(note);
    }
    if (page.kind === 'cli' && this.simHref && page.key && !String(page.key).startsWith('feature ')) {
      const go = el('a', 'wiki-fc-link', 'Open the simulator this page describes');
      go.href = this.simHref;
      this.article.append(go);
    }
    if (page.related && page.related.length) {
      const rel = el('div', 'wiki-related');
      rel.append(el('div', 'wiki-rail-kicker', 'Where to go next'));
      const row = el('div', 'wiki-related-row');
      for (const id of page.related) {
        const p = pageById(id);
        const b = btn('wiki-related-link', p ? p.title : id);
        b.addEventListener('click', () => this.open(id));
        row.append(b);
      }
      rel.append(row);
      this.article.append(rel);
    }
    if (page.source) {
      this.article.append(el('p', 'wiki-source', `Source: ${page.source}`));
    }
    this.appendJourneyNav();
  }

  appendJourneyNav() {
    const i = JOURNEY.indexOf(this.pageId);
    if (i < 0) {
      return;
    }
    const nav = el('div', 'wiki-journey-nav');
    const make = (j, dir) => {
      const p = pageById(JOURNEY[j]);
      const b = btn(`wiki-journey-link is-${dir}`);
      b.append(el('span', 'wiki-journey-dir', dir === 'prev' ? 'Previous' : 'Next'));
      b.append(el('span', 'wiki-journey-title', p ? p.title : JOURNEY[j]));
      b.addEventListener('click', () => this.open(JOURNEY[j]));
      return b;
    };
    if (i > 0) {
      nav.append(make(i - 1, 'prev'));
    }
    if (i < JOURNEY.length - 1) {
      nav.append(make(i + 1, 'next'));
    }
    this.article.append(nav);
  }

  sectionNode(sec, cls) {
    const n = el('section', cls);
    n.append(el('h3', null, sec.title));
    for (const para of sec.paras || []) {
      if (para) {
        n.append(el('p', null, para));
      }
    }
    return n;
  }

  renderCliIndex(page) {
    const pair = el('div', 'wiki-pair');
    const air = page.sections.find((s) => s.id === 'air');
    const lab = page.sections.find((s) => s.id === 'lab');
    pair.append(this.sectionNode(air, 'wiki-col wiki-col-air'));
    pair.append(this.sectionNode(lab, 'wiki-col wiki-col-lab'));
    this.article.append(pair);
    this.article.append(this.sectionNode(page.sections.find((s) => s.id === 'sim'), 'wiki-sec wiki-sec-sim'));

    const filters = el('div', 'wiki-filters');
    filters.append(el('span', 'wiki-filter-label', 'Status'));
    for (const id of ['all', 'LIVE', 'GATED', 'APPLIED_INERT', 'INERT', 'ABSENT']) {
      const n = id === 'all' ? FIELDS.length : FIELDS.filter((f) => f.status === id).length;
      const b = btn(this.filter === id ? 'wiki-filter on' : 'wiki-filter');
      b.append(el('span', null, id === 'all' ? 'All' : id.replace(/_/g, ' ')));
      b.append(el('span', 'wiki-filter-n', String(n)));
      b.addEventListener('click', () => {
        this.filter = id;
        this.renderCliList();
        this.renderFilterState();
      });
      filters.append(b);
    }
    this.article.append(filters);

    const tabs = el('div', 'wiki-filters');
    tabs.append(el('span', 'wiki-filter-label', 'Tab'));
    const allTab = btn(!this.cliTab ? 'wiki-filter on' : 'wiki-filter', 'Every tab');
    allTab.dataset.tab = '';
    allTab.addEventListener('click', () => {
      this.cliTab = '';
      this.renderCliList();
      this.renderFilterState();
    });
    tabs.append(allTab);
    for (const tab of TABS) {
      const b = btn(this.cliTab === tab.id ? 'wiki-filter on' : 'wiki-filter', tab.label);
      b.dataset.tab = tab.id;
      b.addEventListener('click', () => {
        this.cliTab = tab.id;
        this.renderCliList();
        this.renderFilterState();
      });
      tabs.append(b);
    }
    this.article.append(tabs);
    this.filterRows = [filters, tabs];

    this.cliList = el('div', 'wiki-cli-list');
    this.article.append(this.cliList);
    this.renderCliList();
    if (page.source) {
      this.article.append(el('p', 'wiki-source', `Source: ${page.source}`));
    }
    this.appendJourneyNav();
  }

  renderFilterState() {
    if (!this.filterRows) {
      return;
    }
    const [filters, tabs] = this.filterRows;
    [...filters.querySelectorAll('.wiki-filter')].forEach((b, i) => {
      const id = ['all', 'LIVE', 'GATED', 'APPLIED_INERT', 'INERT', 'ABSENT'][i];
      b.classList.toggle('on', this.filter === id);
    });
    for (const b of tabs.querySelectorAll('.wiki-filter')) {
      b.classList.toggle('on', (b.dataset.tab || '') === this.cliTab);
    }
  }

  renderCliList() {
    if (!this.cliList) {
      return;
    }
    this.cliList.textContent = '';
    const rows = FIELDS.filter((f) => {
      if (this.filter !== 'all' && f.status !== this.filter) {
        return false;
      }
      if (this.cliTab && f.tab !== this.cliTab) {
        return false;
      }
      return true;
    });
    this.cliList.append(el('p', 'wiki-results-cap', `${rows.length} keys`));
    for (const f of rows) {
      const b = btn('wiki-cli-row');
      b.append(el('span', 'wiki-cli-key', f.key));
      b.append(statusChip(f.status));
      b.addEventListener('click', () => this.open(cliPageId(f.key)));
      this.cliList.append(b);
    }
  }
}

export function mountWiki(host) {
  return new WikiView(host);
}

export function wikiPageCount() {
  return ARTICLES.length + 1 + CLI_PAGES.length;
}

export { JOURNEY };
