/*
 * wiki-lint.js: fail if the FPV wiki does not cover the catalog it claims
 * to cover, or if a LIVE / GATED / APPLIED_INERT key is still on a family
 * template instead of authored copy.
 *
 * It also holds the figures to their side of the bargain: every article
 * carries one, every figure is reached by something, every figure says what
 * it is arguing, and the two places that honour reduced motion still agree
 * with each other. None of that can be checked by looking at the page,
 * which is exactly why it is checked here.
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

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  APPLIED_INERT_KEYS,
  FEATURES,
  FIELDS,
  GATED_KEYS,
  STATUS,
} from '../src/fc/catalog.js';
import { ARTICLES, ARTICLE_BY_ID, CHAPTERS } from '../src/wiki/articles.js';
import {
  AUTHORED,
  FEATURE_COPY,
  allCliPages,
  cliPageId,
  pageForField,
} from '../src/wiki/cli.js';
import { FIGURE_IDS } from '../src/wiki/figures.js';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const failures = [];

function fail(msg) {
  failures.push(msg);
}

const DASH = /[\u2013\u2014]/;
const wikiFiles = [
  'src/wiki/articles.js',
  'src/wiki/cli.js',
  'src/wiki/figures.js',
  'src/wiki/wiki.js',
  'src/wiki/boot.js',
  'src/wiki/anim.js',
  'src/wiki/draw.js',
  'src/wiki/model.js',
];
for (const rel of wikiFiles) {
  const text = readFileSync(join(root, rel), 'utf8');
  if (DASH.test(text)) {
    fail(`${rel} contains an em or en dash`);
  }
}

const authored = new Set(Object.keys(AUTHORED));
const figureSet = new Set(FIGURE_IDS);
const pages = allCliPages();
const pageIds = new Set(pages.map((p) => p.id));
pageIds.add('cli-index');
for (const a of ARTICLES) {
  pageIds.add(a.id);
}

const seenIds = new Set();
for (const a of ARTICLES) {
  if (seenIds.has(a.id)) {
    fail(`duplicate article id ${a.id}`);
  }
  seenIds.add(a.id);
  if (!CHAPTERS.some((c) => c.id === a.chapter)) {
    fail(`article ${a.id} has unknown chapter ${a.chapter}`);
  }
  if (a.figure && !figureSet.has(a.figure)) {
    fail(`article ${a.id} figure ${a.figure} is missing`);
  }
  for (const id of a.related || []) {
    if (!pageIds.has(id)) {
      fail(`article ${a.id} related link ${id} does not resolve`);
    }
  }
  for (const sec of a.sections || []) {
    for (const para of sec.paras || []) {
      if (!para || !String(para).trim()) {
        fail(`article ${a.id} section ${sec.id} has an empty paragraph`);
      }
    }
  }
}

for (const f of FIELDS) {
  const id = cliPageId(f.key);
  if (!pageIds.has(id)) {
    fail(`catalog key ${f.key} has no wiki page ${id}`);
  }
  const page = pageForField(f);
  if (!page || page.id !== id) {
    fail(`pageForField(${f.key}) did not return ${id}`);
  }
  if (!page.sections || page.sections.length < 3) {
    fail(`page ${id} is missing air/lab/sim sections`);
  }
  if (f.status === STATUS.LIVE || f.status === STATUS.GATED || f.status === STATUS.APPLIED_INERT) {
    if (!authored.has(f.key)) {
      fail(`${f.status} key ${f.key} has no authored copy in cli.js`);
    }
  }
  if (page.figure && !figureSet.has(page.figure)) {
    fail(`cli page ${id} figure ${page.figure} is missing`);
  }
  for (const id2 of page.related || []) {
    if (!pageIds.has(id2)) {
      fail(`cli page ${id} related link ${id2} does not resolve`);
    }
  }
}

for (const key of GATED_KEYS) {
  if (!authored.has(key)) {
    fail(`GATED key ${key} has no authored copy`);
  }
}
for (const key of APPLIED_INERT_KEYS) {
  if (!authored.has(key)) {
    fail(`APPLIED_INERT key ${key} has no authored copy`);
  }
}

for (const feat of FEATURES) {
  const id = `feature-${feat.name}`;
  if (!pageIds.has(id)) {
    fail(`feature ${feat.name} has no wiki page`);
  }
  if (feat.status === STATUS.LIVE && !FEATURE_COPY[feat.name]) {
    fail(`LIVE feature ${feat.name} has no authored FEATURE_COPY`);
  }
}

const unknownAuthored = [...authored].filter((k) => !FIELDS.some((f) => f.key === k));
for (const k of unknownAuthored) {
  fail(`AUTHORED key ${k} is not in the catalog`);
}

if (ARTICLES.length < 20) {
  fail(`expected a plant/controller journey, got ${ARTICLES.length} articles`);
}

/*
 * Every article carries a figure. A page of two prose columns with no
 * picture is the failure mode this wiki was rebuilt to get rid of, and it
 * is invisible until somebody scrolls to that one page.
 */
for (const a of ARTICLES) {
  if (!a.figure) {
    fail(`article ${a.id} has no figure`);
  }
}

/*
 * And every figure is reached by something. A figure nothing links to is
 * dead code that still has to be maintained.
 */
const figuresUsed = new Set();
for (const a of ARTICLES) {
  if (a.figure) {
    figuresUsed.add(a.figure);
  }
}
for (const page of pages) {
  if (page.figure) {
    figuresUsed.add(page.figure);
  }
}
for (const id of FIGURE_IDS) {
  if (!figuresUsed.has(id)) {
    fail(`figure ${id} is not used by any page`);
  }
}

/*
 * A figure has to say what it is arguing, describe itself for somebody who
 * cannot see it, and give the reader something to move.
 *
 * This used to read a fixed 4000 character window after each id, which for
 * two thirds of the figures ran past the end of that figure and into the
 * next one, so a figure could pass on its neighbour's caption. It now cuts
 * each figure out at its real brace boundary, and it looks for the caption
 * and label at the top level of the spec rather than anywhere in the block,
 * because a control's own `label:` was satisfying the aria check.
 */
const figSrc = readFileSync(join(root, 'src/wiki/figures.js'), 'utf8');

function figureBlock(id) {
  const at = figSrc.indexOf(`id: '${id}',`);
  if (at < 0) {
    return null;
  }
  /* Walk back to the makeFigure({ that opens this spec, then brace match. */
  const open = figSrc.lastIndexOf('makeFigure({', at);
  if (open < 0) {
    return null;
  }
  let i = figSrc.indexOf('{', open);
  let depth = 0;
  for (; i < figSrc.length; i += 1) {
    const c = figSrc[i];
    if (c === '{') { depth += 1; }
    if (c === '}') {
      depth -= 1;
      if (depth === 0) { break; }
    }
  }
  return figSrc.slice(open, i + 1);
}

for (const id of FIGURE_IDS) {
  const block = figureBlock(id);
  if (!block) {
    fail(`figure ${id} could not be located in figures.js`);
    continue;
  }
  const caption = /^\s{4}caption: '((?:[^'\\]|\\.)*)'/m.exec(block);
  if (!caption || caption[1].length < 80) {
    fail(`figure ${id} has no caption, or one too short to be an argument`);
  }
  if (!/^\s{4}label: '/m.test(block)) {
    fail(`figure ${id} has no aria label of its own`);
  }
  /*
   * CLAUDE.md says every figure has a knob with a readout. Two are allowed
   * to be still, and they are named here so that adding a third is a
   * decision somebody has to make on purpose rather than an omission.
   */
  const STILL = new Set(['boundary', 'missing']);
  if (!/^\s{4}controls: \[/m.test(block) && !STILL.has(id)) {
    fail(`figure ${id} has no controls, and is not in the list of figures allowed to be still`);
  }
}

/*
 * Reduced motion is honoured in two places that have to agree: REDUCED in
 * anim.js and the media query at the foot of wiki/index.html. Losing either
 * half is silent for anybody who has not asked for reduced motion.
 */
const animSrc = readFileSync(join(root, 'src/wiki/anim.js'), 'utf8');
const wikiHtml = readFileSync(join(root, 'wiki/index.html'), 'utf8');
if (!/REDUCED/.test(animSrc) || !/prefers-reduced-motion/.test(animSrc)) {
  fail('anim.js no longer reads prefers-reduced-motion');
}
if (!/prefers-reduced-motion/.test(wikiHtml)) {
  fail('wiki/index.html no longer has a reduced motion block');
}
if (!/stopFigures/.test(readFileSync(join(root, 'src/wiki/wiki.js'), 'utf8'))) {
  fail('wiki.js no longer tears figures down before replacing the article');
}

if (failures.length) {
  console.error(`wiki-lint: ${failures.length} failure(s)`);
  for (const f of failures) {
    console.error(`  ${f}`);
  }
  process.exit(1);
}

const live = FIELDS.filter((f) => f.status === STATUS.LIVE).length;
const gated = FIELDS.filter((f) => f.status === STATUS.GATED).length;
const applied = FIELDS.filter((f) => f.status === STATUS.APPLIED_INERT).length;
console.log(
  `wiki-lint: ok. ${ARTICLES.length} articles, ${FIGURE_IDS.length} figures, `
  + `${FIELDS.length} catalog fields, ${pages.length} cli/feature pages, `
  + `${authored.size} authored keys, `
  + `${live} LIVE / ${gated} GATED / ${applied} APPLIED_INERT.`,
);
