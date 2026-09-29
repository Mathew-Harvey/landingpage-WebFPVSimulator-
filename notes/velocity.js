/*
 * velocity.js: the hover, touch and keyboard layer for the velocity graph at
 * the top of the patch notes.
 *
 * The graph is plain SVG, HTML and a table, drawn by scripts/velocity.js, and
 * it reads without this file. This adds a band that snaps to a day, one
 * tooltip that lists every series for that day, and the arrow keys to walk the
 * days. It never gates a value: everything it shows is also in the table view,
 * and it reads its numbers from that table, so the two cannot disagree. If the
 * table and the graph do not describe the same number of days, it does nothing.
 *
 * Every string it puts on the page is set with textContent, never as markup.
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

const plots = document.querySelector('.viz .plots');

if (plots) {
  const viz = plots.closest('.viz');
  const ids = plots.dataset.ids.split(',');
  const n = Number(plots.dataset.n);
  const k = ids.length;
  const names = [...viz.querySelectorAll('.viz-table thead tr:nth-child(2) th')].slice(0, k).map((th) => th.textContent);

  /* The table is newest first. Here the days run oldest first, as on the plot. */
  const days = [...viz.querySelectorAll('.viz-table tbody tr')].reverse().map((tr) => {
    const cells = [...tr.querySelectorAll('td')].map((td) => Number(td.textContent.replace(/,/g, '')));
    return {
      label: tr.querySelector('th').textContent,
      lines: cells.slice(0, k),
      all: cells[k],
      commits: cells.slice(k + 1, 2 * k + 1),
      commitsAll: cells[2 * k + 1],
    };
  });

  if (days.length === n) {
    const plotA = plots.querySelector('.panel.a .plot');
    const plotB = plots.querySelector('.panel.b .plot');
    const cross = plots.querySelector('.cross');
    const tip = plots.querySelector('.tip');
    const live = plots.querySelector('.sr');
    const num = (v) => v.toLocaleString('en-US');
    let current = null;

    const el = (tag, cls, text) => {
      const e = document.createElement(tag);
      if (cls) {
        e.className = cls;
      }
      if (text !== undefined) {
        e.textContent = text;
      }
      return e;
    };

    /* Values lead and names follow, and the key is a short stroke of the series colour. */
    const row = (label, value, id) => {
      const r = el('div', 'r');
      r.append(el('i', id ? `k s-${id}` : 'k'), el('b', null, num(value)), el('span', null, label));
      return r;
    };

    function fill(d) {
      tip.replaceChildren(el('div', 'd', d.label), el('div', 'h', 'Lines of source'), row('All', d.all));
      ids.forEach((id, j) => tip.append(row(names[j], d.lines[j], id)));
      tip.append(el('div', 'h', 'Commits'), row('All', d.commitsAll));
      ids.forEach((id, j) => tip.append(row(names[j], d.commits[j], id)));
    }

    function show(i, announce) {
      current = i;
      const pr = plots.getBoundingClientRect();
      const a = plotA.getBoundingClientRect();
      const b = plotB.getBoundingClientRect();
      const slot = a.width / n;
      const x = a.left - pr.left + (i + 0.5) * slot;
      cross.hidden = false;
      cross.style.left = `${x - slot / 2}px`;
      cross.style.width = `${slot}px`;
      cross.style.top = `${a.top - pr.top}px`;
      cross.style.height = `${b.bottom - a.top}px`;
      fill(days[i]);
      tip.hidden = false;
      const w = tip.offsetWidth;
      const room = x + slot / 2 + 12 + w <= pr.width;
      tip.style.left = `${Math.max(0, room ? x + slot / 2 + 12 : x - slot / 2 - 12 - w)}px`;
      tip.style.top = `${a.top - pr.top + 6}px`;
      if (announce) {
        live.textContent = `${days[i].label}: ${num(days[i].all)} lines of source, ${days[i].commitsAll} commits.`;
      }
    }

    function hide() {
      current = null;
      cross.hidden = true;
      tip.hidden = true;
    }

    function point(e) {
      const a = plotA.getBoundingClientRect();
      const i = Math.floor(((e.clientX - a.left) / a.width) * n);
      if (i < 0 || i >= n) {
        hide();
      } else {
        show(i, false);
      }
    }

    plots.addEventListener('pointermove', point);
    plots.addEventListener('pointerdown', point);
    plots.addEventListener('pointerleave', (e) => {
      if (e.pointerType === 'mouse') {
        hide();
      }
    });
    document.addEventListener('pointerdown', (e) => {
      if (!plots.contains(e.target)) {
        hide();
      }
    });
    plots.addEventListener('focus', () => {
      if (current === null) {
        show(n - 1, true);
      }
    });
    plots.addEventListener('blur', hide);
    plots.addEventListener('keydown', (e) => {
      const at = current === null ? n - 1 : current;
      const to = { ArrowLeft: at - 1, ArrowRight: at + 1, Home: 0, End: n - 1 }[e.key];
      if (to !== undefined) {
        e.preventDefault();
        show(Math.min(n - 1, Math.max(0, to)), true);
      } else if (e.key === 'Escape') {
        hide();
      }
    });
    new ResizeObserver(() => {
      if (current !== null) {
        show(current, false);
      }
    }).observe(plots);
  }
}
