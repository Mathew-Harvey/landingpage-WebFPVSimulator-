/*
 * anim.js: the runtime a wiki figure runs in.
 *
 * The argument this file exists to support: a diagram of nouns teaches
 * almost nothing. A reader learns a mechanism by moving one thing and
 * watching what happens to another. So a figure here is not a picture. It
 * is a small machine with a knob on it, and the caption says what the knob
 * proves.
 *
 * Three rules it enforces on every figure:
 *
 *   Nothing animates off screen. One requestAnimationFrame loop drives
 *   every visible figure and an IntersectionObserver takes the invisible
 *   ones out of it, so a page of fifteen figures costs one figure.
 *
 *   Reduced motion is honoured, and the meaning survives. REDUCED here and
 *   the media query at the foot of wiki/index.html are the two places that
 *   have to agree, the same contract main.js has with the stylesheet. A
 *   figure that would have animated is held on its most informative frame
 *   and its controls still work, because the control is where the meaning
 *   is. Nothing is hidden.
 *
 *   Every knob reads out. A slider with no number is a toy. The value, its
 *   unit, and where it sits relative to the interesting part are on screen.
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

const motionQuery = typeof window !== 'undefined' && window.matchMedia
  ? window.matchMedia('(prefers-reduced-motion: reduce)')
  : null;

export let REDUCED = motionQuery ? motionQuery.matches : false;

const live = new Set();
let rafId = 0;
let lastMs = 0;

function tick(ms) {
  rafId = 0;
  const dt = lastMs ? Math.min(0.05, (ms - lastMs) / 1000) : 0.016;
  lastMs = ms;
  let running = false;
  for (const fig of live) {
    if (fig.visible && (fig.playing || fig.dirty)) {
      if (fig.playing) {
        fig.t += dt;
      }
      fig.dirty = false;
      fig.paint();
    }
    if (fig.visible && fig.playing) {
      running = true;
    }
  }
  if (running || [...live].some((f) => f.dirty)) {
    rafId = requestAnimationFrame(tick);
  } else {
    lastMs = 0;
  }
}

function wake() {
  if (!rafId) {
    lastMs = 0;
    rafId = requestAnimationFrame(tick);
  }
}

if (motionQuery) {
  const onChange = () => {
    REDUCED = motionQuery.matches;
    for (const fig of live) {
      fig.playing = !REDUCED && fig.autoplay;
      fig.t = REDUCED ? fig.still : fig.t;
      fig.dirty = true;
      fig.syncPlayButton();
    }
    wake();
  };
  if (motionQuery.addEventListener) {
    motionQuery.addEventListener('change', onChange);
  }
}

function el(tag, cls, txt) {
  const n = document.createElement(tag);
  if (cls) {
    n.className = cls;
  }
  if (txt != null) {
    n.textContent = txt;
  }
  return n;
}

class Figure {
  constructor(spec) {
    this.spec = spec;
    this.w = spec.w || 640;
    this.h = spec.h || 300;
    this.autoplay = spec.autoplay !== false && typeof spec.draw === 'function' && spec.animated !== false;
    this.still = spec.still || 0;
    this.t = REDUCED ? this.still : 0;
    this.playing = this.autoplay && !REDUCED;
    this.visible = false;
    this.dirty = true;
    this.state = {};
    for (const c of spec.controls || []) {
      this.state[c.key] = c.value;
    }
    this.buildDom();
  }

  buildDom() {
    const { spec } = this;
    const root = el('figure', 'wiki-figure');
    root.dataset.fig = spec.id;
    if (spec.eyebrow) {
      root.append(el('div', 'wiki-fig-eyebrow', spec.eyebrow));
    }
    const stage = el('div', 'wiki-fig-stage');
    this.canvas = el('canvas', 'wiki-fig-canvas');
    /* On the canvas, so a forced minimum width still gets the right height. */
    this.canvas.style.aspectRatio = `${this.w} / ${this.h}`;
    this.canvas.setAttribute('role', 'img');
    this.canvas.setAttribute('aria-label', spec.label || spec.caption || spec.id);
    stage.append(this.canvas);
    root.append(stage);
    root.append(el('div', 'wiki-fig-hint', 'swipe the figure sideways to see all of it'));
    this.ctx = this.canvas.getContext('2d');

    /*
     * A question, asked before the reader touches anything. A figure that
     * tells you what the knob will do and then lets you turn it is a
     * demonstration; a figure that asks you to commit to an answer first is
     * a test you gave yourself, and people remember those. It goes above the
     * controls because it has to be read before they are used.
     */
    if (spec.ask) {
      const ask = el('div', 'wiki-fig-ask');
      ask.append(el('span', 'wiki-fig-ask-tag', 'Predict'));
      ask.append(el('span', null, spec.ask));
      root.append(ask);
    }

    const controls = spec.controls || [];
    if (controls.length || this.autoplay) {
      const bar = el('div', 'wiki-fig-controls');
      for (const c of controls) {
        bar.append(this.buildControl(c));
      }
      if (this.autoplay) {
        this.playBtn = el('button', 'wiki-fig-play');
        this.playBtn.type = 'button';
        this.playBtn.addEventListener('click', () => {
          this.playing = !this.playing;
          this.dirty = true;
          this.syncPlayButton();
          wake();
        });
        this.syncPlayButton();
        bar.append(this.playBtn);
      }
      root.append(bar);
    }
    if (spec.caption) {
      root.append(el('figcaption', null, spec.caption));
    }
    this.root = root;
  }

  syncPlayButton() {
    if (!this.playBtn) {
      return;
    }
    this.playBtn.textContent = this.playing ? 'Pause' : 'Play';
    this.playBtn.setAttribute('aria-pressed', String(this.playing));
    this.playBtn.title = this.playing ? 'Hold the figure still' : 'Let the figure run';
  }

  buildControl(c) {
    /* The modifier is deliberately not `wiki-ctl-pick`: that class is on
       the buttons inside, and sharing it gave the wrapper their box. */
    const wrap = el('label', `wiki-ctl wiki-ctl-is-${c.type || 'range'}`);
    const head = el('span', 'wiki-ctl-head');
    head.append(el('span', 'wiki-ctl-label', c.label));
    const out = el('span', 'wiki-ctl-value');
    head.append(out);
    wrap.append(head);
    if (c.type === 'toggle') {
      const input = document.createElement('input');
      input.type = 'checkbox';
      input.checked = !!c.value;
      input.className = 'wiki-ctl-check';
      const paint = () => {
        out.textContent = input.checked ? (c.on || 'on') : (c.off || 'off');
        out.classList.toggle('is-on', input.checked);
      };
      input.addEventListener('change', () => {
        this.state[c.key] = input.checked;
        paint();
        this.reset();
      });
      paint();
      wrap.append(input);
      wrap.classList.add('is-toggle');
      return wrap;
    }
    if (c.type === 'pick') {
      const row = el('span', 'wiki-ctl-picks');
      out.textContent = '';
      const paint = () => {
        for (const b of row.children) {
          b.classList.toggle('on', b.dataset.v === String(this.state[c.key]));
        }
      };
      for (const opt of c.options) {
        const b = el('button', 'wiki-ctl-pick', opt.label);
        b.type = 'button';
        b.dataset.v = String(opt.value);
        b.addEventListener('click', () => {
          this.state[c.key] = opt.value;
          paint();
          this.reset();
        });
        row.append(b);
      }
      paint();
      wrap.append(row);
      return wrap;
    }
    const input = document.createElement('input');
    input.type = 'range';
    input.min = c.min;
    input.max = c.max;
    input.step = c.step == null ? (c.max - c.min) / 100 : c.step;
    input.value = c.value;
    input.className = 'wiki-ctl-range';
    input.setAttribute('aria-label', c.label);
    const fmt = c.fmt || ((v) => String(v));
    const paint = () => {
      out.textContent = fmt(this.state[c.key]);
    };
    input.addEventListener('input', () => {
      this.state[c.key] = Number(input.value);
      paint();
      if (c.resets) {
        this.reset();
      } else {
        this.dirty = true;
        wake();
      }
    });
    paint();
    wrap.append(input);
    return wrap;
  }

  reset() {
    this.scratch = {};
    if (this.spec.reset) {
      this.spec.reset(this.state, this.scratch);
    }
    this.dirty = true;
    wake();
  }

  size() {
    const rect = this.canvas.getBoundingClientRect();
    const cssW = rect.width || this.w;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const px = Math.round(cssW * dpr);
    if (px && px !== this.canvas.width) {
      this.canvas.width = px;
      this.canvas.height = Math.round((px * this.h) / this.w);
      this.scale = px / this.w;
      this.dirty = true;
    }
  }

  paint() {
    const { ctx } = this;
    if (!this.canvas.width) {
      return;
    }
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.scale(this.scale, this.scale);
    try {
      this.spec.draw(ctx, this.w, this.h, this.state, this.t, this.scratch || (this.scratch = {}));
    } catch (err) {
      ctx.restore();
      throw err;
    }
    ctx.restore();
  }

  mount() {
    this.scratch = {};
    if (this.spec.reset) {
      this.spec.reset(this.state, this.scratch);
    }
    this.ro = new ResizeObserver(() => {
      this.size();
      wake();
    });
    this.ro.observe(this.canvas);
    this.io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        this.visible = e.isIntersecting;
      }
      if (this.visible) {
        this.size();
        this.dirty = true;
        wake();
      }
    }, { rootMargin: '120px' });
    this.io.observe(this.root);
    live.add(this);
    this.size();
    wake();
  }

  destroy() {
    live.delete(this);
    if (this.ro) {
      this.ro.disconnect();
    }
    if (this.io) {
      this.io.disconnect();
    }
  }
}

const mounted = new Set();

/*
 * Build a figure. The caller gets a <figure> back and is responsible for
 * putting it in the document; mounting happens on the next frame so the
 * element has a width to be measured against.
 */
export function makeFigure(spec) {
  const fig = new Figure(spec);
  mounted.add(fig);
  requestAnimationFrame(() => {
    if (fig.root.isConnected) {
      fig.mount();
    }
  });
  return fig.root;
}

/* Called by the shell before it replaces the article. */
export function stopFigures() {
  for (const fig of mounted) {
    fig.destroy();
  }
  mounted.clear();
  if (rafId) {
    cancelAnimationFrame(rafId);
    rafId = 0;
    lastMs = 0;
  }
}
