/*
 * stickers.js: the stickers the film wears, cut from the slap pack.
 *
 * stickers/index.html is the copy of record. It is one self contained page
 * holding twenty two stickers as inline SVG and the three fonts they set
 * their type in, base64 in a style block, so it prints from a desk with no
 * server behind it. The landing page slaps eight of those on the glass,
 * and the film should not have to carry that page to do it: this writes
 * src/stickers-data.js, a module holding the SVG of every sticker index.html
 * asks for, verbatim, and the font block once. main.js puts the fonts in the
 * head and the markup in the anchors.
 *
 * WHY A MODULE AND NOT A FILE PER STICKER. An SVG shown through <img> is a
 * document of its own and sees none of the page's fonts, so each file would
 * have to embed the faces it sets, and Caveat Brush alone is 73 KB of base64
 * that four of the eight use. Written that way the set weighed 650 KB.
 * Inline, the type is set from one copy of each face, the set is a fifth of
 * that, and the pack stays the only place a sticker is drawn.
 *
 * WHICH ONES. The film says. This reads index.html for every data-slap on
 * the page and writes exactly those, so adding a sticker to the page is the
 * markup and a rerun, and a sticker nothing wears is never shipped.
 * scripts/page-lint.js calls bake() and compares the result with what is on
 * disk, so an edit to the pack that is not followed by a rerun fails the
 * lint instead of shipping two versions of one sticker.
 *
 *     node scripts/stickers.js
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

import { readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));

export const OUT = 'src/stickers-data.js';

/*
 * The pack's own rule for a file name, minus its webfpv_ prefix: the pack
 * downloads "pen & ink gate" as webfpv_pen_ink_gate.svg, and the film calls
 * the same sticker pen_ink_gate in a data-slap that already says whose it is.
 */
export function slug(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}

/*
 * Read the pack once: the faces out of its style block, the metadata out of
 * its script, and every sticker's SVG out of its card.
 */
async function readPack() {
  const pack = await readFile(join(root, 'stickers/index.html'), 'utf8');

  const fontcss = /<style id="fontcss">([\s\S]*?)<\/style>/.exec(pack);
  if (!fontcss) {
    throw new Error('stickers/index.html has no #fontcss block; the export code needs it too');
  }

  const metaSrc = /const META = (\{.*?\});/.exec(pack);
  if (!metaSrc) {
    throw new Error('stickers/index.html has no META table');
  }
  const meta = JSON.parse(metaSrc[1]);

  const cards = new Map();
  const card = /<figure class="card" id="card-(\w+)"[^>]*>\s*<div class="art"[^>]*>(<svg[\s\S]*?<\/svg>)<\/div>/g;
  for (const m of pack.matchAll(card)) {
    cards.set(m[1], m[2]);
  }
  for (const key of Object.keys(meta)) {
    if (!cards.has(key)) {
      throw new Error(`the pack's META names ${key} but there is no card for it`);
    }
  }
  return { fontcss: fontcss[1].trim(), meta, cards };
}

/*
 * The card's SVG as the page will hold it. Two attributes are added to the
 * root and nothing else is touched: the drawing is hidden from a screen
 * reader, because the anchor around it carries the name and the type inside
 * a sticker is not a sentence, and it is kept out of the tab order in the
 * one browser that puts an inline SVG in it.
 */
function inline(svg, name) {
  const open = /^<svg[^>]*>/.exec(svg);
  if (!open || !/viewBox="[^"]+"/.test(open[0])) {
    throw new Error(`${name}: the card's SVG has no viewBox`);
  }
  const tag = open[0].replace(/\s*>$/, ' aria-hidden="true" focusable="false">');
  return tag + svg.slice(open[0].length);
}

/*
 * The module's text. Nothing is written here; the CLI below writes it and
 * page-lint compares it with the file on disk.
 */
export async function bake() {
  const { fontcss, meta, cards } = await readPack();
  const index = await readFile(join(root, 'index.html'), 'utf8');
  const wanted = [...new Set([...index.matchAll(/data-slap="([a-z0-9_]+)"/g)].map((m) => m[1]))];
  const byName = new Map(Object.entries(meta).map(([key, m]) => [slug(m.name), key]));

  const rows = [];
  for (const name of wanted) {
    const key = byName.get(name);
    if (!key) {
      throw new Error(`index.html slaps on "${name}" and the pack has no sticker by that name`);
    }
    const m = meta[key];
    rows.push(`  /* ${m.name}, ${m.size}. */\n  ${name}: ${JSON.stringify(inline(cards.get(key), name))},`);
  }

  return `/*
 * stickers-data.js: the stickers the film wears. GENERATED.
 *
 * Written by scripts/stickers.js from stickers/index.html, which is the copy
 * of record for every sticker: regenerate, do not edit. Each entry is the
 * pack's SVG for that sticker, verbatim, and FONTCSS is the pack's own font
 * block, three faces base64 in one string, so the type on a sticker here is
 * set from the same bytes a printer gets.
 *
 * The faces are Zen Kaku Gothic New, Caveat Brush and M PLUS Rounded 1c,
 * subsetted, under the SIL Open Font License 1.1. See NOTICE.
 *
 * This file is part of the WebFPVSimulator landing page, GPLv3. See the
 * licence header on the script that writes it.
 */

export const FONTCSS = ${JSON.stringify(fontcss)};

export const STICKERS = {
${rows.join('\n')}
};
`;
}

async function main() {
  const text = await bake();
  await writeFile(join(root, OUT), text);
  const n = (text.match(/^  [a-z0-9_]+: "/gm) || []).length;
  console.log(`${OUT}  ${(text.length / 1024).toFixed(1)} KB, ${n} stickers`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  await main();
}
