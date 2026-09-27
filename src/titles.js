/*
 * titles.js: the page's wordmarks and titles, in the simulator's hand.
 *
 * The owner, 27 September 2026: "see the new font in the sim, the logo etc,
 * update all the font and the logo on the landing page to match the awesome
 * sim style". The simulator letters its wordmark and every room's title in
 * the hand its freestyle callouts speak in: heavy slanted capitals, a thick
 * ink line, a hard drop and two cel bands, WEB in cream and FPV in sakura as
 * one word. There is no font file. The capitals are the system's heaviest
 * sans used as a skeleton, set a glyph at a time by the simulator's own
 * src/ui/lettering.js, which is copied into src/sim/ui/ and not restated
 * here: paintTitle draws a title into a canvas. What is this page's is the
 * join the simulator's menus make with it (letterHeading, in its
 * src/ui/ui.js): which words, and where each canvas lies.
 *
 * WHICH. The wordmarks, in the top bar, on the boot screen and over act
 * one, and every title: the acts', the chapters', the reason's, the
 * questions', the close's and the invitation's. What stays the system's text
 * is what the simulator keeps as text: ledes, eyebrows, rows, cards and the
 * beats, which are read rather than looked at.
 *
 * THE WORDS STAY. A title keeps its words in the DOM, in its own place, for
 * a screen reader, for find in page and for a search engine. .is-lettered
 * makes their fill transparent and sets them in heavy capitals, the
 * lettering's own proportions, so the lines the browser breaks them into are
 * the lines the lettering draws; the canvases are aria-hidden. Forced colours
 * gets the text back (index.html), and with no 2D context the title is its
 * text, as it was.
 *
 * A LINE AT A TIME, where the simulator letters a title as one line. Its
 * titles fit on one, and it sets one that wrapped smaller, across the middle
 * of its box. This page's wrap as a matter of course: "The hard part of FPV is
 * getting to the first lap" is four lines on a phone, and one line across the
 * middle of four would be a quarter of the size. So the browser breaks the
 * lines, each is lettered on a canvas of its own, and each lies on its own
 * baseline: the last line's from a zero sized probe after the words, which is
 * how the simulator finds it, and each line above that the line boxes'
 * distance higher.
 *
 * PAINTED WHEN IT CHANGES, NEVER PER FRAME. A ResizeObserver says when a
 * title is first laid out and when its box changes: a new window width, a
 * phone turned, a hidden title shown. The first time is at once, before the
 * frame it would first be seen in; after that a title waits until its box
 * has been still for a moment, the simulator's settled resize.
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

import { paintTitle } from './sim/ui/lettering.js';

/* Every lettered thing on a page. */
export const TITLES = '.mark, .boot-mark, .wordmark, h2';
const ART = 'lettered-art';
const PROBE = 'lettered-probe';
const SETTLE_MS = 140;

/*
 * A title's words as the browser laid them out: a list of lines, each with
 * its runs in their own colours (a title's <em> is sakura and the wordmark's
 * FPV likewise, because their CSS says so) and its box. Read a character at
 * a time, because a character's box is where the browser put it and nothing
 * else says which line a word landed on.
 */
function linesOf(h) {
  const walker = document.createTreeWalker(h, NodeFilter.SHOW_TEXT, {
    acceptNode: (n) => (n.parentElement && n.parentElement.closest(`.${ART}, .${PROBE}`)
      ? NodeFilter.FILTER_REJECT
      : NodeFilter.FILTER_ACCEPT),
  });
  const range = document.createRange();
  const fills = new Map();
  const lines = [];
  let line = null;
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    const el = n.parentElement;
    if (!fills.has(el)) {
      fills.set(el, getComputedStyle(el).color);
    }
    const fill = fills.get(el);
    const s = n.data;
    for (let i = 0; i < s.length; i += 1) {
      range.setStart(n, i);
      range.setEnd(n, i + 1);
      const r = range.getBoundingClientRect();
      /* White space the browser collapsed has no box at all. */
      if (!r.width && !r.height) {
        continue;
      }
      const space = /\s/.test(s[i]);
      if (!line || r.top > line.top + line.height * 0.5) {
        /* A space that would open a line is the one the line broke at. */
        if (space) {
          continue;
        }
        line = { top: r.top, height: r.height, left: r.left, right: r.right, chars: [] };
        lines.push(line);
      }
      line.chars.push({ ch: space ? ' ' : s[i], fill });
      if (!space) {
        line.left = Math.min(line.left, r.left);
        line.right = Math.max(line.right, r.right);
      }
    }
  }
  for (const l of lines) {
    while (l.chars.length && l.chars[l.chars.length - 1].ch === ' ') {
      l.chars.pop();
    }
    l.runs = [];
    let prev = '';
    for (const c of l.chars) {
      if (c.ch === ' ' && prev === ' ') {
        continue;
      }
      prev = c.ch;
      const last = l.runs[l.runs.length - 1];
      if (last && last.fill === c.fill) {
        last.text += c.ch;
      } else {
        l.runs.push({ text: c.ch, fill: c.fill });
      }
    }
  }
  return lines.filter((l) => l.runs.length);
}

/*
 * Back to its words, for a title the lettering cannot draw: there is no 2D
 * context, or it has no words. It counts as not lettered, so words that
 * arrive later are lettered at once.
 */
function unletter(h) {
  for (const c of h.querySelectorAll(`:scope > .${ART}, :scope > .${PROBE}`)) {
    c.remove();
  }
  h.classList.remove('is-lettered');
  h.lettered = false;
}

/*
 * Letter one title where it stands. Heavy capitals first and the measuring
 * after, so the lines measured are the lines the lettering is drawn to.
 * Returns whether it is lettered.
 */
function letter(h) {
  if (!h.isConnected || h.letterFailed) {
    return false;
  }
  const cs = getComputedStyle(h);
  if (cs.display === 'none') {
    return false;
  }
  h.classList.add('is-lettered');
  const px = parseFloat(getComputedStyle(h).fontSize);
  const box = h.getBoundingClientRect();
  if (!(px > 0) || !box.width || !box.height) {
    /* No box, because it is hidden: nothing to draw until it has one. The
     * capitals stay, so the box it comes back with is already theirs and
     * lettering it then changes nothing the observer is measuring, and it
     * counts as not lettered, so that is at once. */
    h.lettered = false;
    return false;
  }
  let probe = h.querySelector(`:scope > .${PROBE}`);
  if (!probe) {
    probe = document.createElement('span');
    probe.className = PROBE;
    probe.setAttribute('aria-hidden', 'true');
    h.append(probe);
  }
  const lines = linesOf(h);
  if (!lines.length) {
    unletter(h);
    return false;
  }
  /*
   * How wide a line may be: to its column's far edge, or the window's, as
   * the simulator measures it, and the width of the column when the title
   * is centred. paintTitle sets a line smaller to fit, never past.
   */
  const parent = h.parentElement;
  const pcs = getComputedStyle(parent);
  const pr = parent.getBoundingClientRect();
  const right = Math.min(pr.right - parseFloat(pcs.paddingRight || '0'), window.innerWidth - 4);
  const left = Math.max(pr.left + parseFloat(pcs.paddingLeft || '0'), 4);
  const centred = cs.textAlign === 'center';
  /* The outline a fifth of the size at callout sizes and thinning toward a
   * tenth on a wordmark, where a fifth of a hundred pixels closes the
   * letters up into a blot: the simulator's rule. */
  const inkW = Math.min(0.2, Math.max(0.1, 7 / px));
  const pad = px * (inkW + 0.12);
  const originX = box.left + h.clientLeft;
  const lastBase = probe.offsetTop;
  const last = lines[lines.length - 1];

  const arts = [...h.querySelectorAll(`:scope > .${ART}`)];
  while (arts.length < lines.length) {
    const c = document.createElement('canvas');
    c.className = ART;
    c.setAttribute('aria-hidden', 'true');
    h.append(c);
    arts.push(c);
  }
  while (arts.length > lines.length) {
    arts.pop().remove();
  }
  for (let i = 0; i < lines.length; i += 1) {
    const l = lines[i];
    const art = arts[i];
    const maxW = Math.floor(centred ? right - left : right - l.left + pad);
    let m = null;
    try {
      m = paintTitle(art, l.runs, px, { maxW, inkW });
    } catch (e) {
      m = null;
    }
    if (!m) {
      /* No 2D context: the words are the title, as they were, for good. */
      h.letterFailed = true;
      unletter(h);
      return false;
    }
    const base = lastBase - (last.top - l.top);
    const x = centred
      ? (l.left + l.right) / 2 - originX - m.w / 2
      : l.left - originX - m.left;
    art.style.left = `${Math.round(x)}px`;
    art.style.top = `${Math.round(base - m.base)}px`;
  }
  h.lettered = true;
  return true;
}

let observer = null;
const waiting = new Set();
let timer = 0;

function settle() {
  timer = 0;
  for (const h of waiting) {
    letter(h);
  }
  waiting.clear();
}

/*
 * Letter every title under `root` and keep them lettered. `which` is TITLES
 * on the film's page, where a module of its own at the foot of index.html
 * calls this before the film's graph has fetched three.js; the wiki letters
 * its wordmark and nothing else, because its titles are articles' headings,
 * which are read.
 */
export function letterTitles(root = document, which = TITLES) {
  const titles = root.querySelectorAll(which);
  if (typeof ResizeObserver === 'undefined') {
    titles.forEach(letter);
    return;
  }
  if (!observer) {
    observer = new ResizeObserver((entries) => {
      for (const e of entries) {
        const h = e.target;
        /* The first time a title has a box, at once; after that, once it
         * has been still. */
        if (!h.lettered) {
          letter(h);
        } else {
          waiting.add(h);
        }
      }
      if (waiting.size) {
        clearTimeout(timer);
        timer = setTimeout(settle, SETTLE_MS);
      }
    });
  }
  for (const h of titles) {
    /* Heavy capitals from the start, before the observer first measures,
     * so lettering never changes the box it is reporting: a ResizeObserver
     * callback that resizes what it observes is the one thing it must not
     * do, and Chrome reports it as an error event. */
    h.classList.add('is-lettered');
    observer.observe(h);
  }
}
