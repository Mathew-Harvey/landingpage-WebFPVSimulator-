/*
 * page.js: the first screen as a manga page.
 *
 * The owner's brief for the front door is that the game should feel like
 * flying a manga comic, and the first thing a visitor sees should say so.
 * So act one's first screen is laid out the way the simulator lays out the
 * page a freestyle run ends on (src/ui/mangapage.js there): paper, ink
 * borders, gutters that lean, the biggest panel first. The big panel is the
 * live studio, the quad being built in it; the three chapters are the tier
 * of panels under it. Scrolling opens the big panel into the film: main.js
 * sets --open and the frame zooms past the glass and goes.
 *
 * WHAT IS HERE is geometry and nothing else: where the panels are for this
 * window, drawn as one SVG of paper with the panels cut out of it and one
 * ink line round each, and each chapter panel clipped to its quad. The
 * panels' contents are the markup's, the studio is the canvas behind, and
 * the look of the studio is src/manga.js.
 *
 * EVERYTHING IS MEASURED IN u, a hundredth of the window's short side, and
 * that is the fix for the complaint that started it. The page this replaced
 * was sized in pixels with laptop caps, so on a 4K monitor it was a small
 * island of type in a dark field. A page has proportions rather than sizes:
 * the margin, gutter and border here are the simulator's page's (3.5, 2.2
 * and 0.65 per cent of the short side), so the front door and the results
 * screen are one hand at every size.
 *
 * THREE SHAPES, by the window's aspect: a spread when it is landscape, a
 * page when it is nearly square (the owner's own 4K window is 1877 by 1938),
 * a strip on a phone. They differ only in how deep the chapter tier is.
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

const SVG = 'http://www.w3.org/2000/svg';

/* Where two lines meet: (a, b) and (c, d), as points. */
function meet(a, b, c, d) {
  const r1 = [b[0] - a[0], b[1] - a[1]];
  const r2 = [d[0] - c[0], d[1] - c[1]];
  const den = r1[0] * r2[1] - r1[1] * r2[0];
  if (Math.abs(den) < 1e-9) {
    return [a[0], a[1]];
  }
  const t = ((c[0] - a[0]) * r2[1] - (c[1] - a[1]) * r2[0]) / den;
  return [a[0] + r1[0] * t, a[1] + r1[1] * t];
}

/*
 * The page for a window of W by H, with the top bar's foot at `bar`.
 *
 * One cut across, under the big panel, leaning down to the left; two cuts
 * down through the tier, leaning alternately. Every gutter is the same
 * width however its cut leans, because each panel's edge is its cut moved
 * half a gutter off, the way the simulator's insetQuad keeps them.
 */
export function layout(W, H, bar = 0) {
  const u = Math.min(W, H) / 100;
  const aspect = W / Math.max(1, H);
  const shape = aspect >= 1.3 ? 'spread' : aspect >= 0.75 ? 'page' : 'strip';
  const m = Math.max(10, 3.5 * u);
  const g = Math.max(7, 2.2 * u);
  const b = Math.max(2, 0.65 * u);
  const top = Math.max(m, bar + 0.8 * u);
  const bottom = H - m;
  const left = m;
  const right = W - m;
  /* The tier's depth: a third of a spread would crowd the studio, and on a
   * phone the panels are only a thumb's width, so they stay short. */
  const tierH = shape === 'spread' ? 0.24 * H : shape === 'page' ? 0.21 * H : Math.max(118, 0.17 * H);
  const lean = 0.022 * (right - left);
  const cutMid = bottom - tierH - g * 0.5;
  /* The cut across, as a line: lower at the left. */
  const cutY = (x) => cutMid + lean * (0.5 - (x - left) / (right - left));
  const splash = [
    [left, top],
    [right, top],
    [right, cutY(right) - g * 0.5],
    [left, cutY(left) - g * 0.5],
  ];
  /* The tier's top edge, and its two cuts down. */
  const tA = [left, cutY(left) + g * 0.5];
  const tB = [right, cutY(right) + g * 0.5];
  const bA = [left, bottom];
  const bB = [right, bottom];
  const span = right - left;
  const tilt = (shape === 'strip' ? 0.05 : 0.09) * tierH;
  const cuts = [1 / 3, 2 / 3].map((f, i) => {
    const x = left + span * f;
    const d = (i % 2 ? -1 : 1) * tilt;
    return [[x + d, cutMid], [x - d, bottom]];
  });
  const off = (line, dx) => [[line[0][0] + dx, line[0][1]], [line[1][0] + dx, line[1][1]]];
  const edges = [
    [[[left, 0], [left, H]], off(cuts[0], -g * 0.5)],
    [off(cuts[0], g * 0.5), off(cuts[1], -g * 0.5)],
    [off(cuts[1], g * 0.5), [[right, 0], [right, H]]],
  ];
  const tier = edges.map(([l, r]) => [
    meet(l[0], l[1], tA, tB),
    meet(r[0], r[1], tA, tB),
    meet(r[0], r[1], bA, bB),
    meet(l[0], l[1], bA, bB),
  ]);
  return { W, H, u, m, g, b, top, shape, splash, tier, tierTop: Math.min(tA[1], tB[1]) };
}

function pathOf(q) {
  return `M${q.map((p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join('L')}Z`;
}

/*
 * The page, kept to its window.
 *
 * `root` is act one's pin; the SVG and the chapter panels are its children,
 * made or found here. `onLayout` hears each new layout, which is how the
 * camera and the focus lines learn where the big panel is.
 */
export function createPage(root, { bar, onLayout } = {}) {
  let svg = root.querySelector(':scope > svg.page-ink');
  if (!svg) {
    svg = document.createElementNS(SVG, 'svg');
    svg.setAttribute('class', 'page-ink');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('focusable', 'false');
    root.prepend(svg);
  }
  const paper = document.createElementNS(SVG, 'path');
  paper.setAttribute('class', 'page-paper');
  paper.setAttribute('fill-rule', 'evenodd');
  const lines = document.createElementNS(SVG, 'path');
  lines.setAttribute('class', 'page-lines');
  svg.replaceChildren(paper, lines);
  const panels = [...root.querySelectorAll('.worlds .world')];
  /* On the document, not the pin: the fixed chrome (the cue, the build
   * order) sits by the page's panels too. */
  const vars = document.documentElement.style;
  let last = null;

  function apply() {
    const W = root.clientWidth;
    const H = root.clientHeight;
    if (W < 2 || H < 2) {
      return;
    }
    const L = layout(W, H, bar ? bar() : 0);
    last = L;
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    svg.setAttribute('width', String(W));
    svg.setAttribute('height', String(H));
    paper.setAttribute('d', `M0,0H${W}V${H}H0Z${pathOf(L.splash)}${L.tier.map(pathOf).join('')}`);
    lines.setAttribute('d', [L.splash, ...L.tier].map(pathOf).join(''));
    lines.setAttribute('stroke-width', L.b.toFixed(2));
    vars.setProperty('--u', `${L.u.toFixed(3)}px`);
    vars.setProperty('--pm', `${L.m.toFixed(1)}px`);
    vars.setProperty('--pg', `${L.g.toFixed(1)}px`);
    vars.setProperty('--pb', `${L.b.toFixed(2)}px`);
    vars.setProperty('--ptop', `${L.top.toFixed(1)}px`);
    vars.setProperty('--ptier', `${L.tierTop.toFixed(1)}px`);
    root.dataset.shape = L.shape;
    /* Each chapter in its quad: the box round the quad, and the quad as a
     * clip in the box's own pixels. */
    L.tier.forEach((q, i) => {
      const a = panels[i];
      if (!a) {
        return;
      }
      const xs = q.map((p) => p[0]);
      const ys = q.map((p) => p[1]);
      const x0 = Math.min(...xs);
      const y0 = Math.min(...ys);
      a.style.left = `${x0.toFixed(1)}px`;
      a.style.top = `${y0.toFixed(1)}px`;
      a.style.width = `${(Math.max(...xs) - x0).toFixed(1)}px`;
      a.style.height = `${(Math.max(...ys) - y0).toFixed(1)}px`;
      a.style.clipPath = `polygon(${q.map((p) => `${(p[0] - x0).toFixed(1)}px ${(p[1] - y0).toFixed(1)}px`).join(',')})`;
      /* How far each corner is in from the box, so what sits in a corner
       * (the caption, the badge, the name) sits inside the lean. */
      const x1 = Math.max(...xs);
      a.style.setProperty('--lean-tl', `${(q[0][0] - x0).toFixed(1)}px`);
      a.style.setProperty('--lean-tr', `${(x1 - q[1][0]).toFixed(1)}px`);
      a.style.setProperty('--lean-bl', `${(q[3][0] - x0).toFixed(1)}px`);
    });
    if (onLayout) {
      onLayout(L);
    }
  }

  apply();
  if (typeof ResizeObserver !== 'undefined') {
    new ResizeObserver(apply).observe(root);
  } else {
    window.addEventListener('resize', apply);
  }
  return {
    apply,
    get layout() {
      return last;
    },
  };
}
