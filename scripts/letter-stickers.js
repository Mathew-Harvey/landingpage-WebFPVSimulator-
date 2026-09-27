/*
 * letter-stickers.js: the slap pack's wordmarks, lettered in the simulator's
 * hand, as vector.
 *
 * Usage: node scripts/letter-stickers.js ../WebFPVSimulator
 *
 * The owner, 27 September 2026, after the front door and the board were
 * lettered, chose to have "the logo on the stickers" redrawn too: every
 * sticker that sets the WEBFPV wordmark in type now carries it the way the
 * simulator letters its own, heavy slanted capitals with an ink line, a
 * hard drop and two cel bands, WEB in cream and FPV in sakura. Brush
 * handwriting and small print stay as they were drawn.
 *
 * A sticker is printed, so the lettering has to be vector, and the
 * simulator's lettering (src/ui/lettering.js, copied into src/sim/ui/ and
 * never edited) draws into a canvas. It draws through a handful of 2D
 * context calls, though, and nothing else: a font, measureText, save,
 * restore, translate, rotate, transform, scale, strokeText, fillText and a
 * linear gradient. So this hands its drawRuns a context that WRITES SVG
 * instead of pixels, and every glyph lands where the simulator would have
 * put it: the same shear, the same turn and lift from the same hash of the
 * word, the same ink, drop and bands. The one thing that differs is the
 * skeleton. The simulator uses the system's heaviest sans, which is a
 * different face on every machine; a print has to be the same everywhere,
 * so here it is the pack's own Zen Kaku Gothic New at 900, which the pack
 * already embeds and which already set the visor strip's WEBFPV.
 *
 * WHERE. Each lettered wordmark is a SPOT in the pack, a <g data-letter> in
 * a sticker's SVG, and the spot's attributes are the design: which words
 * (data-letter, runs split on |), their colours (data-fill, cream and
 * sakura unless it says), the anchor point and baseline (data-x, data-y, in
 * the sticker's own units), the size (data-size), how it hangs off the
 * point (data-anchor: start, middle or end), the widest it may be
 * (data-max, set smaller to fit, never past), the ink as a fraction of the
 * size (data-ink), a paper rim outside the ink for a die-cut piece
 * (data-rim, the rim's colour) and one colour for a piece cut from vinyl
 * (data-mono). This fills every spot, and running it again redraws them
 * all from the attributes, so the spot is edited and the drawing inside it
 * is regenerated, never edited.
 *
 * MEASURED ONCE, DRAWN IN NODE. drawRuns lays a word out with measureText,
 * and only a browser has the face's advances. A glyph's advance is linear
 * in the size, so each character the spots use is measured once at 1000 px
 * in headless Chromium, the simulator's own tests/lib/page.js, with the
 * pack's font block loaded, and the drawing runs in Node against that
 * table. A character the embedded subset does not have is refused rather
 * than drawn in a fallback face that no print would match.
 *
 * Afterwards: node scripts/stickers.js, because the film wears the pack.
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

import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const PACK = join(root, 'stickers', 'index.html');
const sim = resolve(process.argv[2] || join(root, '..', 'WebFPVSimulator'));

/* The pack's heavy face, the skeleton the capitals are set on. */
const FAMILY = "'Zen Kaku Gothic New'";
const WEIGHT = 900;
/* The simulator's wordmark colours, its INKS.cream and INKS.sakura. */
const FILLS = ['#f3ead4', '#e8a8b8'];
/* The size the advances are measured at. */
const MEASURE_PX = 1000;

const L = await import(pathToFileURL(join(root, 'src', 'sim', 'ui', 'lettering.js')).href);

/* ---------------------------------------------------------------- *
 * The spots
 * ---------------------------------------------------------------- */

/* A spot is a <g data-letter> in a sticker's card, or in the page's own
 * top bar, where the pack's mark is. What this writes inside one has no
 * <g> of its own, which is what lets the next run find the end of it. */
const SPOT = /<g data-letter="([^"]*)"([^>]*)>([\s\S]*?)<\/g>/g;
const CARD = /id="card-([A-Za-z0-9_]+)"/g;

function attrsOf(s) {
  const out = {};
  for (const m of s.matchAll(/\s(data-[a-z]+)="([^"]*)"/g)) {
    out[m[1]] = m[2];
  }
  return out;
}

function spotsIn(html) {
  const cards = [...html.matchAll(CARD)].map((m) => ({
    key: m[1], at: m.index, end: html.indexOf('</figure>', m.index),
  }));
  const spots = [];
  const count = new Map();
  for (const m of html.matchAll(SPOT)) {
    /* In a sticker's card, or the page's own: the mark in its top bar. */
    const card = cards.find((c) => c.at < m.index && m.index < c.end);
    const key = card ? card.key : 'page';
    const n = count.get(key) || 0;
    count.set(key, n + 1);
    const a = attrsOf(m[2]);
    const num = (k, d) => (a[k] === undefined ? d : Number(a[k]));
    spots.push({
      key,
      n,
      at: m.index,
      len: m[0].length,
      data: { 'data-letter': m[1], ...a },
      runs: m[1].split('|'),
      fills: (a['data-fill'] || FILLS.join('|')).split('|'),
      x: num('data-x', 0),
      y: num('data-y', 0),
      size: num('data-size', 40),
      anchor: a['data-anchor'] || 'start',
      max: num('data-max', 0),
      ink: num('data-ink', 0.14),
      rim: a['data-rim'] || '',
      mono: a['data-mono'] || '',
    });
  }
  return spots;
}

/* ---------------------------------------------------------------- *
 * The face's advances, from a browser
 * ---------------------------------------------------------------- */

async function measure(fontCss, chars) {
  const { openPage } = await import(pathToFileURL(join(sim, 'tests', 'lib', 'page.js')).href);
  const dir = await mkdtemp(join(tmpdir(), 'letter-stickers-'));
  await writeFile(join(dir, 'index.html'), `<!doctype html><meta charset="utf-8"><style>${fontCss}</style><body></body>`);
  const page = await openPage({ root: dir, width: 400, height: 300, url: '/index.html' });
  try {
    await page.until('document.readyState === "complete"');
    const table = await page.evaluate(`(async () => {
      const chars = ${JSON.stringify(chars)};
      await document.fonts.load(${JSON.stringify(`${WEIGHT} ${MEASURE_PX}px ${FAMILY}`)}, chars.join(''));
      const ctx = document.createElement('canvas').getContext('2d');
      const out = {};
      for (const ch of chars) {
        ctx.font = ${JSON.stringify(`${WEIGHT} ${MEASURE_PX}px ${FAMILY}, monospace`)};
        const w = ctx.measureText(ch).width;
        ctx.font = ${JSON.stringify(`${WEIGHT} ${MEASURE_PX}px monospace`)};
        /* The same advance as the fallback's means the fallback drew it. */
        out[ch] = ch === ' ' || Math.abs(w - ctx.measureText(ch).width) > 0.5 ? w : null;
      }
      return out;
    })()`);
    const missing = chars.filter((ch) => !(table[ch] > 0));
    if (missing.length) {
      throw new Error(`the pack's ${FAMILY} ${WEIGHT} has no ${missing.map((c) => JSON.stringify(c)).join(', ')}`);
    }
    return table;
  } finally {
    await page.close();
    await rm(dir, { recursive: true, force: true });
  }
}

/* ---------------------------------------------------------------- *
 * A 2D context that writes SVG
 * ---------------------------------------------------------------- */

const fmt = (v) => String(Math.round(v * 1000) / 1000);
const mul = (m, n) => [
  m[0] * n[0] + m[2] * n[1],
  m[1] * n[0] + m[3] * n[1],
  m[0] * n[2] + m[2] * n[3],
  m[1] * n[2] + m[3] * n[3],
  m[0] * n[4] + m[2] * n[5] + m[4],
  m[1] * n[4] + m[3] * n[5] + m[5],
];

/*
 * Exactly the calls drawRuns makes, and no more, so a call it starts making
 * one day fails here loudly rather than drawing nothing quietly. Strokes
 * and fills are kept as a list of glyphs in the order they were painted,
 * which is the painter's order an SVG needs too.
 */
class SvgContext {
  constructor(advances) {
    this.advances = advances;
    this.m = [1, 0, 0, 1, 0, 0];
    this.stack = [];
    this.px = MEASURE_PX;
    this.fillStyle = '#000';
    this.strokeStyle = '#000';
    this.lineWidth = 1;
    this.lineJoin = 'round';
    this.lineCap = 'round';
    this.textAlign = 'center';
    this.textBaseline = 'alphabetic';
    this.glyphs = [];
  }

  set font(v) {
    const m = String(v).match(/(\d+(?:\.\d+)?)px/);
    if (!m) {
      throw new Error(`a font with no size: ${v}`);
    }
    this.px = Number(m[1]);
  }

  get font() {
    return `${WEIGHT} ${this.px}px ${FAMILY}`;
  }

  measureText(s) {
    let w = 0;
    for (const ch of Array.from(s)) {
      w += this.advances[ch] * (this.px / MEASURE_PX);
    }
    return { width: w };
  }

  save() {
    this.stack.push({
      m: this.m, fillStyle: this.fillStyle, strokeStyle: this.strokeStyle, lineWidth: this.lineWidth,
    });
  }

  restore() {
    Object.assign(this, this.stack.pop());
  }

  translate(x, y) { this.m = mul(this.m, [1, 0, 0, 1, x, y]); }

  rotate(a) { this.m = mul(this.m, [Math.cos(a), Math.sin(a), -Math.sin(a), Math.cos(a), 0, 0]); }

  scale(x, y) { this.m = mul(this.m, [x, 0, 0, y, 0, 0]); }

  transform(a, b, c, d, e, f) { this.m = mul(this.m, [a, b, c, d, e, f]); }

  createLinearGradient(x0, y0, x1, y1) {
    const g = { x0, y0, x1, y1, stops: [] };
    g.addColorStop = (at, colour) => g.stops.push([at, colour]);
    return g;
  }

  paint(ch, x, y, fill, stroke) {
    if (x || y || this.textAlign !== 'center' || this.textBaseline !== 'alphabetic') {
      throw new Error('drawRuns drew a glyph this context does not know how to place');
    }
    const last = this.glyphs[this.glyphs.length - 1];
    const same = last && last.ch === ch && last.m.every((v, i) => v === this.m[i]);
    /* The drop strokes a glyph and then fills it where it stands, in one
     * colour: one element, filled and stroked. Only in one colour, because
     * an SVG paints the fill first and the stroke over it, the other way
     * round from these calls. */
    if (fill && same && last.stroke === fill && !last.fill) {
      last.fill = fill;
      return;
    }
    this.glyphs.push({
      ch, m: this.m, fill, stroke, width: stroke ? this.lineWidth : 0, px: this.px,
    });
  }

  strokeText(ch, x, y) { this.paint(ch, x, y, null, this.strokeStyle); }

  fillText(ch, x, y) { this.paint(ch, x, y, this.fillStyle, null); }
}

/* ---------------------------------------------------------------- *
 * One spot, drawn
 * ---------------------------------------------------------------- */

function letterSpot(spot, advances) {
  const runs = spot.runs.map((text, i) => ({
    text: text.toUpperCase(), fill: spot.fills[i] || spot.fills[spot.fills.length - 1],
  }));
  const word = runs.map((r) => r.text).join('');
  const ctx = new SvgContext(advances);
  /* Set smaller to fit, as paintTitle does: once by the ratio, and once
   * more because the fit is linear in the size only to within a hair. */
  let px = spot.size;
  let w = L.wordWidth(ctx, word, px, spot.ink);
  for (let i = 0; i < 2 && spot.max && w > spot.max; i += 1) {
    px *= spot.max / w;
    w = L.wordWidth(ctx, word, px, spot.ink);
  }
  const left = spot.anchor === 'middle' ? spot.x - w / 2 : (spot.anchor === 'end' ? spot.x - w : spot.x);
  L.drawRuns(ctx, runs, left + px * spot.ink * 0.5, spot.y, px, { inkW: spot.ink, rim: Boolean(spot.rim) });

  const id = `lt-${spot.key}-${spot.n}`;
  const grads = new Map();
  const paintOf = (p) => {
    if (!p) {
      return 'none';
    }
    if (typeof p === 'string') {
      if (p === L.PAPER && spot.rim) {
        return spot.rim;
      }
      return spot.mono || p;
    }
    if (spot.mono) {
      return spot.mono;
    }
    if (!grads.has(p)) {
      grads.set(p, `${id}-${grads.size}`);
    }
    return `url(#${grads.get(p)})`;
  };
  const glyphs = spot.mono
    /* One colour, for a piece cut from vinyl: the outline, filled, is the
     * letter, and a drop or a band in the same colour would only be a
     * thicker letter. */
    ? ctx.glyphs.filter((g) => g.stroke === L.INK && !g.fill).map((g) => ({ ...g, fill: spot.mono }))
    : ctx.glyphs;
  const body = glyphs.map((g) => {
    const paint = [`fill="${paintOf(g.fill)}"`];
    if (g.stroke) {
      paint.push(`stroke="${paintOf(g.stroke)}" stroke-width="${fmt(g.width)}"`);
    }
    const ch = g.ch.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    return `<text transform="matrix(${g.m.map(fmt).join(' ')})" ${paint.join(' ')}>${ch}</text>`;
  }).join('');
  const defs = [...grads].map(([g, gid]) => `<linearGradient id="${gid}" gradientUnits="userSpaceOnUse" x1="${fmt(g.x0)}" y1="${fmt(g.y0)}" x2="${fmt(g.x1)}" y2="${fmt(g.y1)}">${
    g.stops.map(([at, colour]) => `<stop offset="${fmt(at)}" stop-color="${colour}"/>`).join('')}</linearGradient>`).join('');
  const data = Object.entries(spot.data).map(([k, v]) => ` ${k}="${v}"`).join('');
  const out = `<g${data} font-family="${FAMILY},sans-serif" font-weight="${WEIGHT}" font-size="${fmt(px)}" text-anchor="middle" stroke-linejoin="round" stroke-linecap="round">${
    defs ? `<defs>${defs}</defs>` : ''}${body}</g>`;
  if (/<g[\s>]/.test(out.slice(2))) {
    throw new Error('a spot drew a <g> of its own, and the next run could not find its end');
  }
  return { out, px, w };
}

/* ---------------------------------------------------------------- *
 * The pack, lettered
 * ---------------------------------------------------------------- */

const html = await readFile(PACK, 'utf8');
const fontCss = (html.match(/<style id="fontcss">([\s\S]*?)<\/style>/) || [])[1];
if (!fontCss) {
  throw new Error('the pack has no font block');
}
const spots = spotsIn(html);
if (!spots.length) {
  throw new Error('the pack has no <g data-letter> spots to letter');
}
const chars = [...new Set(spots.flatMap((s) => Array.from(s.runs.join('').toUpperCase())))].sort();
const advances = await measure(fontCss, chars);

let next = html;
for (const spot of [...spots].sort((a, b) => b.at - a.at)) {
  const { out, px, w } = letterSpot(spot, advances);
  next = next.slice(0, spot.at) + out + next.slice(spot.at + spot.len);
  console.log(`${spot.key.padEnd(16)} ${spot.runs.join('|').padEnd(8)} ${fmt(px).padStart(6)} px, ${fmt(w).padStart(7)} wide`);
}
await writeFile(PACK, next);
console.log(`letter-stickers: ${spots.length} spot${spots.length === 1 ? '' : 's'} in ${new Set(spots.map((s) => s.key)).size} stickers, ${FAMILY} ${WEIGHT} from the pack`);
