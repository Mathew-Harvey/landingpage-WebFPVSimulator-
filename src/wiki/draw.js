/*
 * draw.js: canvas primitives for the wiki's figures.
 *
 * Figures are drawn every frame rather than declared once, because most of
 * them are showing a quantity move. That means a canvas, and it means the
 * arithmetic of axes, ticks and arrowheads has to live somewhere other than
 * in thirty copies. This is that somewhere.
 *
 * Everything works in a figure's own coordinate space. The runtime in
 * anim.js has already scaled the context for device pixels and for the
 * width the figure was given, so a figure drawn for 640 by 300 stays 640 by
 * 300 no matter what it is displayed at.
 *
 * Colour is the site palette and it means something. Cream is a value you
 * read. Sakura is chrome and structure. Amber is an instrument. Mint is the
 * good case. Slate recedes. Nothing here should invent a colour.
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

export const C = {
  cream: '#f3ead4',
  sakura: '#e8a8b8',
  amber: '#ffd45c',
  mint: '#7dffb4',
  slate: '#9db3c8',
  ink: '#0c120e',
  deep: '#141c16',
  faint: 'rgba(157, 179, 200, 0.28)',
  fainter: 'rgba(157, 179, 200, 0.14)',
};

export const MONO = 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';
export const SANS = 'system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif';

export function alpha(hex, a) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
}

export function line(ctx, x1, y1, x2, y2, color = C.slate, width = 1.5, dash = null) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.setLineDash(dash || []);
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  ctx.restore();
}

export function arrow(ctx, x1, y1, x2, y2, color = C.slate, width = 2, head = 8) {
  const a = Math.atan2(y2 - y1, x2 - x1);
  const len = Math.hypot(x2 - x1, y2 - y1);
  if (len < 0.5) {
    return;
  }
  const h = Math.min(head, len * 0.6);
  const bx = x2 - Math.cos(a) * h * 0.9;
  const by = y2 - Math.sin(a) * h * 0.9;
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(bx, by);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x2, y2);
  ctx.lineTo(x2 - Math.cos(a - 0.42) * h, y2 - Math.sin(a - 0.42) * h);
  ctx.lineTo(x2 - Math.cos(a + 0.42) * h, y2 - Math.sin(a + 0.42) * h);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

export function text(ctx, str, x, y, o = {}) {
  const {
    fill = C.slate, size = 12, weight = 400, align = 'left',
    baseline = 'alphabetic', mono = false, track = 0,
  } = o;
  ctx.save();
  ctx.fillStyle = fill;
  ctx.font = `${weight} ${size}px ${mono ? MONO : SANS}`;
  ctx.textAlign = track ? 'left' : align;
  ctx.textBaseline = baseline;
  if (track) {
    const chars = [...str];
    const w = chars.reduce((s, c) => s + ctx.measureText(c).width + track, -track);
    let cx = align === 'center' ? x - w / 2 : align === 'right' ? x - w : x;
    for (const c of chars) {
      ctx.fillText(c, cx, y);
      cx += ctx.measureText(c).width + track;
    }
  } else {
    ctx.fillText(str, x, y);
  }
  ctx.restore();
}

/*
 * Wrap a sentence to a width and return where it ended, so a paragraph
 * inside a figure cannot silently run off the right edge. Several figures
 * had their own copy of this; one copy is enough.
 */
export function wrapText(ctx, str, x, y, maxWidth, o = {}) {
  const { size = 12, fill = C.cream, lead = 18, weight = 400 } = o;
  ctx.save();
  ctx.font = `${weight} ${size}px ${SANS}`;
  let line = '';
  let cy = y;
  for (const word of String(str).split(' ')) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      text(ctx, line, x, cy, { fill, size, weight });
      cy += lead;
      line = word;
    } else {
      line = test;
    }
  }
  ctx.restore();
  text(ctx, line, x, cy, { fill, size, weight });
  return cy + lead;
}

/*
 * The provenance line at the foot of a figure: which constant, which file,
 * whether it was measured or chosen. Quiet on purpose. A source note that
 * competes with the figure's own title is two titles.
 */
export function note(ctx, x, y, str, color = null) {
  text(ctx, str, x, y, { fill: color || alpha(C.slate, 0.72), size: 10.5 });
}

export function eyebrow(ctx, str, x, y, color = C.sakura) {
  text(ctx, str.toUpperCase(), x, y, { fill: color, size: 10, weight: 700, track: 1.4 });
}

export function roundRect(ctx, x, y, w, h, r, fill, stroke = null, width = 1) {
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  if (fill) {
    ctx.fillStyle = fill;
    ctx.fill();
  }
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = width;
    ctx.stroke();
  }
  ctx.restore();
}

export function dot(ctx, x, y, r, fill, ring = null) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = fill;
  ctx.fill();
  if (ring) {
    ctx.strokeStyle = ring;
    ctx.lineWidth = 2;
    ctx.stroke();
  }
  ctx.restore();
}

/* A value with its unit, set the way an instrument sets it. */
export function readout(ctx, label, value, x, y, color = C.amber, size = 20) {
  text(ctx, label.toUpperCase(), x, y - size - 3, { fill: C.slate, size: 9.5, weight: 700, track: 1.2 });
  text(ctx, value, x, y, { fill: color, size, weight: 700, mono: true });
}

/*
 * A rotor seen in near-plan perspective. Blur is how a spinning disc
 * actually reads, and it lets one picture say "this one is working harder"
 * without a label.
 */
export function rotor(ctx, cx, cy, r, phase, o = {}) {
  const { color = C.cream, load = 0.5, squash = 0.30, blades = 2 } = o;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(1, squash);
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.strokeStyle = alpha(color, 0.30 + load * 0.5);
  ctx.lineWidth = 1.6 / squash === Infinity ? 1.6 : 1.6;
  ctx.stroke();
  ctx.fillStyle = alpha(color, 0.05 + load * 0.16);
  ctx.fill();
  for (let b = 0; b < blades; b += 1) {
    const a = phase + (b * Math.PI * 2) / blades;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, r * 0.92, a, a + 0.55);
    ctx.closePath();
    ctx.fillStyle = alpha(color, 0.22 + load * 0.5);
    ctx.fill();
  }
  ctx.restore();
}

/* The airframe from above, arms on the diagonals, nose marked. */
export function quadPlan(ctx, cx, cy, arm, o = {}) {
  const { rot = 0, color = C.slate, width = 7 } = o;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(rot);
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-arm, -arm); ctx.lineTo(arm, arm);
  ctx.moveTo(-arm, arm); ctx.lineTo(arm, -arm);
  ctx.stroke();
  roundRect(ctx, -arm * 0.2, -arm * 0.16, arm * 0.4, arm * 0.32, 3, C.deep, C.amber, 1.6);
  ctx.beginPath();
  ctx.moveTo(0, -arm * 0.30);
  ctx.lineTo(-arm * 0.10, -arm * 0.14);
  ctx.lineTo(arm * 0.10, -arm * 0.14);
  ctx.closePath();
  ctx.fillStyle = C.amber;
  ctx.fill();
  ctx.restore();
}

/*
 * A set of axes with a linear map from data to pixels.
 *
 * Kept deliberately small. It draws a frame, ticks with real numbers, and
 * traces. Anything cleverer belongs in the figure that needs it.
 */
export class Axes {
  constructor(ctx, o) {
    Object.assign(this, {
      x: 40, y: 20, w: 560, h: 200,
      xmin: 0, xmax: 1, ymin: 0, ymax: 1,
      xlabel: '', ylabel: '', xunit: '', yunit: '',
    }, o);
    this.ctx = ctx;
  }

  px(v) {
    return this.x + ((v - this.xmin) / (this.xmax - this.xmin)) * this.w;
  }

  py(v) {
    return this.y + this.h - ((v - this.ymin) / (this.ymax - this.ymin)) * this.h;
  }

  clampX(v) {
    return Math.max(this.x, Math.min(this.x + this.w, v));
  }

  frame(o = {}) {
    const { xticks = [], yticks = [], grid = true, fmtX = (v) => String(v), fmtY = (v) => String(v) } = o;
    const { ctx } = this;
    for (const t of xticks) {
      const px = this.px(t);
      if (grid) {
        line(ctx, px, this.y, px, this.y + this.h, C.fainter, 1);
      }
      text(ctx, fmtX(t), px, this.y + this.h + 15, { fill: C.slate, size: 10.5, align: 'center' });
    }
    for (const t of yticks) {
      const py = this.py(t);
      if (grid) {
        line(ctx, this.x, py, this.x + this.w, py, C.fainter, 1);
      }
      text(ctx, fmtY(t), this.x - 7, py, { fill: C.slate, size: 10.5, align: 'right', baseline: 'middle' });
    }
    line(ctx, this.x, this.y, this.x, this.y + this.h, C.faint, 1.2);
    line(ctx, this.x, this.y + this.h, this.x + this.w, this.y + this.h, C.faint, 1.2);
    if (this.xlabel) {
      text(ctx, this.xlabel, this.x + this.w, this.y + this.h + 27, { fill: C.slate, size: 11, align: 'right' });
    }
    if (this.ylabel) {
      text(ctx, this.ylabel, this.x, this.y - 10, { fill: C.slate, size: 11 });
    }
    return this;
  }

  /* Sample a function across the x range and stroke it. */
  fn(f, color = C.mint, width = 2.4, steps = 200, dash = null) {
    const { ctx } = this;
    ctx.save();
    ctx.beginPath();
    ctx.rect(this.x - 1, this.y - 12, this.w + 2, this.h + 13);
    ctx.clip();
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.lineJoin = 'round';
    ctx.setLineDash(dash || []);
    ctx.beginPath();
    let started = false;
    for (let i = 0; i <= steps; i += 1) {
      const vx = this.xmin + ((this.xmax - this.xmin) * i) / steps;
      const vy = f(vx);
      if (!Number.isFinite(vy)) {
        started = false;
        continue;
      }
      const px = this.px(vx);
      const py = this.py(vy);
      if (started) {
        ctx.lineTo(px, py);
      } else {
        ctx.moveTo(px, py);
        started = true;
      }
    }
    ctx.stroke();
    ctx.restore();
    return this;
  }

  /* Stroke a series of [x, y] pairs already in data space. */
  series(pts, color = C.cream, width = 2, dash = null) {
    const { ctx } = this;
    if (!pts.length) {
      return this;
    }
    ctx.save();
    ctx.beginPath();
    ctx.rect(this.x - 1, this.y - 12, this.w + 2, this.h + 13);
    ctx.clip();
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.lineJoin = 'round';
    ctx.setLineDash(dash || []);
    ctx.beginPath();
    ctx.moveTo(this.px(pts[0][0]), this.py(pts[0][1]));
    for (let i = 1; i < pts.length; i += 1) {
      ctx.lineTo(this.px(pts[i][0]), this.py(pts[i][1]));
    }
    ctx.stroke();
    ctx.restore();
    return this;
  }

  /*
   * Two header rows above every plot, and each one belongs to somebody.
   * The upper row is for vline labels, the lower for the y label and the
   * legend. They used to share a line, which is fine until a figure has
   * both, and then it is a mess in exactly the figures that are working
   * hardest.
   */
  vline(vx, color = C.faint, dash = [4, 5], label = '', labelColor = null, below = false) {
    line(this.ctx, this.px(vx), this.y - (below ? 0 : 20), this.px(vx), this.y + this.h, color, 1.4, dash);
    if (label) {
      /* `below` puts the label inside the foot of the plot, for when two
         vlines are close enough together to print on each other. */
      text(this.ctx, label, this.clampX(this.px(vx)), below ? this.y + this.h - 8 : this.y - 25, {
        fill: labelColor || color, size: 10.5, align: 'center',
      });
    }
    return this;
  }

  /* `at` is where along the line the label sits, so two hlines close
     together can be told apart instead of printing on each other. */
  hline(vy, color = C.faint, dash = [4, 5], label = '', at = 1) {
    line(this.ctx, this.x, this.py(vy), this.x + this.w, this.py(vy), color, 1.4, dash);
    if (label) {
      const px = this.x + this.w * at;
      text(this.ctx, label, at >= 1 ? px - 4 : px, this.py(vy) - 6, {
        fill: color, size: 10.5, align: at >= 1 ? 'right' : 'left',
      });
    }
    return this;
  }

  mark(vx, vy, color = C.amber, r = 5.5, label = '') {
    dot(this.ctx, this.px(vx), this.py(vy), r, color, alpha(C.ink, 0.9));
    if (label) {
      text(this.ctx, label, this.px(vx) + 10, this.py(vy) - 9, { fill: color, size: 11.5, weight: 700 });
    }
    return this;
  }

  band(vx1, vx2, color) {
    this.ctx.save();
    this.ctx.fillStyle = color;
    this.ctx.fillRect(this.px(vx1), this.y, this.px(vx2) - this.px(vx1), this.h);
    this.ctx.restore();
    return this;
  }

  /*
   * The legend, laid out along one line under the axis rather than parked
   * in a corner of the plot. A stacked key inside the frame collides with
   * whatever the data happens to be doing that frame, which on an animated
   * figure is every frame sooner or later.
   */
  key(items, y = null, x = null) {
    const { ctx } = this;
    /*
     * The legend goes on the plot's own header line, next to the y label.
     * Under the axis is where the x label and the next subplot live, and
     * inside the frame is where the data lives, so both of those collide
     * sooner or later. This row is reserved and always empty.
     */
    let cx = x;
    if (cx == null) {
      cx = this.x;
      if (this.ylabel) {
        ctx.save();
        ctx.font = '400 11px system-ui, sans-serif';
        cx += ctx.measureText(this.ylabel).width + 24;
        ctx.restore();
      }
    }
    const cy = y == null ? this.y - 10 : y;
    ctx.save();
    ctx.font = '400 11px system-ui, sans-serif';
    for (const [label, color] of items) {
      line(ctx, cx, cy, cx + 15, cy, color, 2.6);
      text(ctx, label, cx + 21, cy, { fill: C.slate, size: 11, baseline: 'middle' });
      cx += 21 + ctx.measureText(label).width + 18;
    }
    ctx.restore();
    return this;
  }
}

/* A rolling window of samples, for a trace that scrolls. */
export class Trace {
  constructor(n) {
    this.n = n;
    this.pts = [];
  }

  push(x, y) {
    this.pts.push([x, y]);
    if (this.pts.length > this.n) {
      this.pts.shift();
    }
  }

  clear() {
    this.pts.length = 0;
  }
}
