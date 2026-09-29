/*
 * Tests for the velocity graph at the foot of the patch notes
 *
 * Run with: node tests/velocity.test.js
 *
 * Two halves. The generator, scripts/velocity.js, is fed history it has not
 * seen yet: a year of days, a span across New Year, a single day. A graph that
 * is right today and draws NaN in March is a graph nobody maintains. And the
 * hover layer, notes/velocity.js, is run against the page as it is written,
 * in a DOM with no layout, which is enough for everything that is not a pixel:
 * what it reads, what it says, and that it never puts a name in as markup.
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

import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { JSDOM, VirtualConsole } from 'jsdom';
import { BEGIN, DATA, REPOS, END, block, render, splice, stringify } from '../scripts/velocity.js';

const root = dirname(dirname(fileURLToPath(import.meta.url)));

let testCount = 0;
let passCount = 0;

async function test(name, fn) {
  testCount++;
  try {
    await fn();
    passCount++;
    console.log(`✓ ${name}`);
  } catch (e) {
    console.error(`✗ ${name}`);
    console.error(`  ${e.message}`);
  }
}

function assert(ok, message) {
  if (!ok) {
    throw new Error(message);
  }
}

function assertEquals(actual, expected, message) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(message || `Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

/* A history of this many days, growing a little every day, with a few empty ones. */
function synth(days, first = '2026-08-11') {
  const lines = {};
  const commits = {};
  REPOS.forEach(({ id }, k) => {
    let run = 0;
    lines[id] = Array.from({ length: days }, (_, i) => (run += 30 + ((i * (k + 3)) % 17) * 10));
    commits[id] = Array.from({ length: days }, (_, i) => (i % 5 === 0 ? 0 : (i * (k + 2)) % 9));
  });
  return {
    generated: 'scripts/velocity.js',
    heads: Object.fromEntries(REPOS.map((r) => [r.id, '0123abcd'])),
    zone: 'Perth, UTC+8',
    counted: ['js'],
    repos: REPOS.map((r) => ({ id: r.id, name: r.name, notCounted: [] })),
    first,
    days,
    lines,
    commits,
  };
}

const data = JSON.parse(await readFile(join(root, DATA), 'utf8'));
const page = await readFile(join(root, 'notes/index.html'), 'utf8');

/* What the hover layer should say for day i, worked out here from the JSON and not copied from the page, so a regeneration moves the test with it. */
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const n = data.days;
const isoOf = (i) => new Date(Date.parse(`${data.first}T00:00:00Z`) + i * 86400000).toISOString().slice(0, 10);
const label = (i) => `${Number(isoOf(i).slice(8))} ${MONTHS[Number(isoOf(i).slice(5, 7)) - 1]}`;
const total = (i) => REPOS.reduce((sum, r) => sum + data.lines[r.id][i], 0);
const made = (i) => REPOS.reduce((sum, r) => sum + data.commits[r.id][i], 0);
const commas = (v) => v.toLocaleString('en-US');
const say = (i) => `${label(i)}: ${commas(total(i))} lines of source, ${made(i)} commits.`;

/* ---- the generator ---- */

await test('the real data draws with no NaN, undefined or Infinity in it', () => {
  const html = render(data);
  assert(!/NaN|undefined|Infinity/.test(html), 'the markup has a bad number in it');
  assert(html.includes('<section id="velocity">'), 'no section');
});

await test('a year of days draws, with bars that have a width and about eight dates', () => {
  const html = render(synth(400));
  assert(!/NaN|undefined|Infinity/.test(html), 'the markup has a bad number in it');
  const widths = [...html.matchAll(/<rect class="bar[^>]*width="([^"]+)"/g)].map((m) => Number(m[1]));
  assert(widths.length > 0 && widths.every((w) => w > 0), 'a bar has no width');
  const dates = (html.match(/class="xt[ "]/g) || []).length;
  assert(dates >= 2 && dates <= 10, `${dates} dates under the bars`);
  assertEquals((html.match(/<tr><th scope="row">/g) || []).length, 400, 'a row for every day in the table');
});

await test('a span across New Year says the year in the table and on January\'s date', () => {
  const html = render(synth(120, '2026-11-20'));
  assert(/<th scope="row">\d+ [A-Z][a-z]+ 2027<\/th>/.test(html), 'a 2027 row without its year');
  assert(/<span class="xt[^"]*" style="[^"]*">\d+ Jan 2027<\/span>/.test(html), 'a January date without its year');
});

await test('a single day draws', () => {
  const html = render(synth(1));
  assert(!/NaN|undefined|Infinity/.test(html), 'the markup has a bad number in it');
  assertEquals((html.match(/<tr><th scope="row">/g) || []).length, 1, 'one row');
});

await test('the peak label hangs inward when the peak is near an end', () => {
  const late = synth(50);
  late.commits.sim[48] = 200;
  assert(/class="pk r"/.test(render(late)), 'a late peak is not right aligned');
  const early = synth(50);
  early.commits.sim[1] = 200;
  assert(/class="pk l"/.test(render(early)), 'an early peak is not left aligned');
  const middle = synth(50);
  middle.commits.sim[25] = 200;
  assert(/class="pk"/.test(render(middle)), 'a middle peak is not centred');
});

await test('regenerating twice changes nothing', () => {
  const once = splice(page, data);
  assertEquals(splice(once, data), once, 'splice is not idempotent');
  assertEquals(once, page, 'the page in the repository is not what splice writes from its own data');
  assertEquals(once.split(BEGIN).length, 2, 'one begin marker');
  assertEquals(once.split(END).length, 2, 'one end marker');
});

await test('the JSON is written the way it is read back', async () => {
  assertEquals(JSON.parse(stringify(data)), data, 'stringify then parse is not the identity');
  assertEquals(stringify(data), await readFile(join(root, DATA), 'utf8'), 'the file is not what stringify writes');
});

await test('no en or em dash anywhere in what it draws', () => {
  assert(!/[–—]/.test(block(data)), 'a dash in the block');
});

/* ---- the hover layer ---- */

let runs = 0;
/* An exception inside an event listener does not reach the caller of dispatchEvent, it reaches the window. Collect them, or a layer that crashes looks the same as one that declined. */
async function load(edit) {
  const errors = [];
  const virtualConsole = new VirtualConsole();
  virtualConsole.on('jsdomError', (e) => errors.push(e.detail ? String(e.detail) : e.message));
  const dom = new JSDOM(page, { virtualConsole });
  if (edit) {
    edit(dom.window.document);
  }
  global.window = dom.window;
  global.document = dom.window.document;
  global.ResizeObserver = class {
    observe() {}
  };
  runs += 1;
  await import(`${pathToFileURL(join(root, 'notes/velocity.js')).href}?run=${runs}`);
  const doc = dom.window.document;
  return {
    dom,
    errors,
    plots: doc.querySelector('.viz .plots'),
    tip: doc.querySelector('.viz .tip'),
    cross: doc.querySelector('.viz .cross'),
    live: doc.querySelector('.viz .sr'),
    press: (key) => doc.querySelector('.viz .plots').dispatchEvent(new dom.window.KeyboardEvent('keydown', { key, bubbles: true, cancelable: true })),
    focus: () => doc.querySelector('.viz .plots').dispatchEvent(new dom.window.Event('focus')),
  };
}

await test('focus reads the newest day out from the table', async () => {
  const v = await load();
  v.focus();
  assertEquals(v.live.textContent, say(n - 1));
  assertEquals(v.tip.hidden, false, 'the tooltip did not open');
  for (const r of REPOS) {
    assert(v.tip.textContent.includes(commas(data.lines[r.id][n - 1])), `the tooltip is missing ${r.name}'s lines`);
  }
  assertEquals(v.errors, [], 'a handler threw');
});

await test('the arrow keys walk the days and stop at the ends', async () => {
  const v = await load();
  v.focus();
  v.press('ArrowLeft');
  v.press('ArrowLeft');
  v.press('ArrowLeft');
  assertEquals(v.live.textContent, say(n - 4), 'three days back from the newest');
  v.press('Home');
  assertEquals(v.live.textContent, say(0));
  v.press('ArrowLeft');
  assertEquals(v.live.textContent, say(0), 'walked off the start');
  v.press('End');
  v.press('ArrowRight');
  assertEquals(v.live.textContent, say(n - 1), 'walked off the end');
  v.press('Escape');
  assertEquals(v.tip.hidden, true, 'Escape did not close it');
  assertEquals(v.errors, [], 'a handler threw');
});

await test('every day the graph can show is a row the table has, with the same numbers', async () => {
  const v = await load();
  const rows = [...v.dom.window.document.querySelectorAll('.viz-table tbody tr')];
  assertEquals(rows.length, n, 'a row for every day');
  const last = rows[0].querySelectorAll('td');
  assertEquals(Number(last[3].textContent.replace(/,/g, '')), total(n - 1), 'the first row is not the newest total');
});

await test('names go in as text, never as markup', async () => {
  const v = await load((doc) => {
    doc.querySelector('.viz-table thead tr:nth-child(2) th').textContent = '<img src=x onerror=alert(1)>';
  });
  v.focus();
  assertEquals(v.tip.querySelector('img'), null, 'a name became an element');
  assert(v.tip.textContent.includes('<img src=x'), 'the name was dropped instead of shown');
  assertEquals(v.errors, [], 'a handler threw');
});

await test('if the table and the graph disagree the layer does nothing', async () => {
  const v = await load((doc) => {
    doc.querySelector('.viz-table tbody tr').remove();
  });
  v.focus();
  assertEquals(v.live.textContent, '', 'it announced a day from a table that does not match');
  assertEquals(v.tip.hidden, true, 'it opened a tooltip on a table that does not match');
  assertEquals(v.errors, [], 'it tried to draw from a table that does not match and threw');
});

await test('with no graph on the page it does nothing and does not throw', async () => {
  const v = await load((doc) => {
    doc.querySelector('.viz').remove();
  });
  assertEquals(v.plots, null, 'the graph is still there');
  assertEquals(v.errors, [], 'it threw with nothing to draw');
});

/* Report results */
console.log('');
console.log(`${passCount}/${testCount} tests passed`);
if (passCount === testCount) {
  console.log('All tests passed!');
  process.exit(0);
} else {
  console.log(`${testCount - passCount} test(s) failed`);
  process.exit(1);
}
