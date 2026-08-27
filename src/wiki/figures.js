/*
 * figures.js: the wiki's diagrams, and the arguments they make.
 *
 * A figure here is not decoration and it is not a screenshot. It is the
 * smallest machine that can be wrong. Where an article states a number, the
 * figure computes that number from src/wiki/model.js, which carries the
 * plant's own constants. So the thrust curve is the plant's thrust curve,
 * the sag is the plant's sag, and the rate loop is Betaflight's own scale
 * factors on gains a pilot actually types. A figure that disagrees with its
 * article is a bug in one of them, not a difference of opinion.
 *
 * The reason to build them this way: a labelled box with an arrow leaving
 * it tells a reader what the parts are called. It does not tell them what
 * the mechanism does, because a mechanism is a relationship, and a
 * relationship is only visible when one side of it moves. So nearly every
 * figure has a knob, the knob has a readout, and the caption says what
 * moving it proves.
 *
 * Captions state what the picture is arguing. The article text is the
 * source of truth. Where a constant is a modelling choice rather than a
 * physical result, the caption says so, because the difference between
 * those two is the whole reason this wiki exists.
 *
 * Reduced motion is handled by anim.js and by the media query at the foot
 * of wiki/index.html, which have to agree. Under reduced motion a figure
 * holds its most informative frame and its controls still work.
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

import { makeFigure } from './anim.js';
import {
  Axes, C, Trace, alpha, arrow, dot, eyebrow, line, note, quadPlan, readout,
  rotor, roundRect, text, wrapText,
} from './draw.js';
import {
  P, actualRate, axialFactor, bodyDrag, glauert, hForce, hoverDuty,
  hoverInduced, motorSteady, packOpenCircuit, packUnderLoad, pt1Gain,
  rateLoop, rollDamping, rotorTau,
} from './model.js';
import { FIELDS, STATUS } from '../fc/catalog.js';

const HOVER_DUTY = hoverDuty();
const HOVER = packUnderLoad(HOVER_DUTY);
const HOVER_W = HOVER.w;
const HOVER_T = HOVER.thrust;
const FULL = packUnderLoad(1);

const f0 = (v) => v.toFixed(0);
const f1 = (v) => v.toFixed(1);
const f2 = (v) => v.toFixed(2);
const f3 = (v) => v.toFixed(3);
const rpm = (w) => (w * 60) / (2 * Math.PI);

/* Seeded, so a figure that looks random is the same picture every reload. */
function xorshift(seed) {
  let s = seed >>> 0;
  return () => {
    s ^= s << 13; s >>>= 0;
    s ^= s >> 17;
    s ^= s << 5; s >>>= 0;
    return s / 4294967296;
  };
}

/* Real seconds since the last frame, for figures that carry their own state. */
function frameDt(t, sc) {
  const dt = sc.lastT == null ? 0.016 : Math.min(0.05, t - sc.lastT);
  sc.lastT = t;
  return dt;
}

function panel(ctx, x, y, w, h, accent) {
  roundRect(ctx, x, y, w, h, 5, 'rgba(16, 22, 17, 0.5)', alpha(C.cream, 0.07), 1);
  if (accent) {
    ctx.save();
    ctx.fillStyle = accent;
    ctx.beginPath();
    ctx.roundRect(x, y, 3, h, [3, 0, 0, 3]);
    ctx.fill();
    ctx.restore();
  }
}

/* A labelled chip, the same furniture the page uses for a status. */
function chip(ctx, str, x, y, color) {
  ctx.save();
  ctx.font = '700 10px system-ui, sans-serif';
  const w = ctx.measureText(str).width + 14;
  ctx.restore();
  roundRect(ctx, x, y - 8, w, 16, 8, alpha(color, 0.18));
  text(ctx, str, x + 7, y + 0.5, { fill: color, size: 10, weight: 700, baseline: 'middle' });
  return w;
}

/* A horizontal bar with a floor line, for anything that clips. */
function meter(ctx, x, y, w, h, frac, color, floor) {
  roundRect(ctx, x, y, w, h, 2, alpha(C.cream, 0.06));
  const fw = Math.max(0, Math.min(1, frac)) * w;
  roundRect(ctx, x, y, fw, h, 2, color);
  if (floor != null) {
    line(ctx, x + floor * w, y - 2, x + floor * w, y + h + 2, C.sakura, 1.6);
  }
}

const FIGURES = {
  /*
   * The whole product in one loop. Every stage carries the live value it is
   * holding, because the point is not that there are six boxes. The point
   * is that one quantity changes units six times and comes back changed.
   */
  loop: () => makeFigure({
    id: 'loop',
    label: 'The rate loop running, with the value each stage is holding',
    eyebrow: 'The loop, running',
    w: 680,
    h: 356,
    still: 1.7,
    controls: [
      { key: 'demand', label: 'Roll demand', min: 100, max: 670, step: 10, value: 400, fmt: (v) => `${f0(v)} deg/s` },
    ],
    caption: 'One quantity changes units six times and comes back: a stick position becomes a packet, a demanded rate, a duty spread across four motors, thrust, rotation, and finally a gyro reading that gets subtracted from where it started. That subtraction is what makes it a loop. The error trace is the only thing the controller ever actually sees.',
    reset: (s, sc) => {
      sc.loop = rateLoop({});
      sc.trace = new Trace(1800);
      sc.set = new Trace(1800);
      sc.simT = 0;
      sc.last = { rate: 0, gyro: 0, err: 0, duty: 0 };
      /* Run a window's worth before the first frame, so the figure opens
         full rather than filling in from the right for two seconds. */
      for (let i = 0; i < 1700; i += 1) {
        const sp = (sc.simT % 1.2) < 0.6 ? s.demand : 0;
        sc.last = sc.loop.step(sp);
        sc.set.push(sc.simT, sp);
        sc.trace.push(sc.simT, sc.last.rate);
        sc.simT += 0.001;
      }
    },
    draw(ctx, W, H, s, t, sc) {
      const steps = Math.min(80, Math.round(frameDt(t, sc) * 260));
      for (let i = 0; i < steps; i += 1) {
        const sp = (sc.simT % 1.2) < 0.6 ? s.demand : 0;
        sc.last = sc.loop.step(sp);
        sc.set.push(sc.simT, sp);
        sc.trace.push(sc.simT, sc.last.rate);
        sc.simT += 0.001;
      }
      const L = sc.last;
      const sp = (sc.simT % 1.2) < 0.6 ? s.demand : 0;
      const spread = Math.abs(L.duty) * 0.25;

      const stages = [
        ['Stick', f2(sp / 670), 'of full throw', C.sakura],
        ['Packet', '250 Hz', 'on the grid', C.sakura],
        ['Betaflight', f0(sp), 'deg/s asked', C.mint],
        ['Mixer', `±${f3(spread)}`, 'duty spread', C.amber],
        ['Props', f1(HOVER_T * 4), 'N of thrust', C.amber],
        ['Gyro', f0(L.gyro), 'deg/s seen', C.cream],
      ];
      const bw = 94;
      const gap = (W - 40 - bw * stages.length) / (stages.length - 1);
      const by = 58;
      const bh = 60;
      const pulse = (t * 0.42) % 1;
      stages.forEach(([name, value, unit, color], i) => {
        const x = 20 + i * (bw + gap);
        const near = Math.max(0, 1 - Math.abs(pulse - (i + 0.5) / stages.length) * stages.length * 1.3);
        roundRect(ctx, x, by, bw, bh, 4, alpha(color, 0.08 + near * 0.18), alpha(color, 0.30 + near * 0.55), 1.2);
        text(ctx, name, x + bw / 2, by + 15, { fill: color, size: 10.5, weight: 700, align: 'center' });
        text(ctx, value, x + bw / 2, by + 38, { fill: C.cream, size: 17, weight: 700, align: 'center', mono: true });
        text(ctx, unit, x + bw / 2, by + 52, { fill: C.slate, size: 9.5, align: 'center' });
        if (i < stages.length - 1) {
          arrow(ctx, x + bw + 3, by + bh / 2, x + bw + gap - 4, by + bh / 2, alpha(C.slate, 0.5), 1.6, 6);
        }
      });
      const x0 = 20 + bw / 2;
      const x1 = 20 + 5 * (bw + gap) + bw / 2;
      ctx.save();
      ctx.strokeStyle = alpha(C.slate, 0.65);
      ctx.lineWidth = 1.6;
      ctx.setLineDash([6, 6]);
      ctx.lineDashOffset = t * 34;
      ctx.beginPath();
      ctx.moveTo(x1, by - 3);
      ctx.bezierCurveTo(x1, by - 30, x0, by - 30, x0, by - 3);
      ctx.stroke();
      ctx.restore();
      text(ctx, 'subtracted, every millisecond', (x0 + x1) / 2, by - 40, { fill: C.slate, size: 10.5, align: 'center' });
      /* The error, printed where the trace is closing it. */
      text(ctx, 'ERROR', W - 24, by + bh + 28, { fill: C.slate, size: 10, align: 'right', weight: 700, track: 1.2 });
      text(ctx, `${f0(Math.abs(L.err)) === '0' ? '0' : `${L.err > 0 ? '+' : ''}${f0(L.err)}`} deg/s`, W - 24, by + bh + 48, {
        fill: Math.abs(L.err) > 60 ? C.sakura : C.mint, size: 17, weight: 700, align: 'right', mono: true,
      });

      const ax = new Axes(ctx, {
        x: 48, y: 168, w: W - 74, h: 138,
        xmin: sc.simT - 1.7, xmax: sc.simT, ymin: -110, ymax: s.demand * 1.32,
        xlabel: '1.7 seconds of a loop that runs a thousand times a second',
      });
      ax.frame({ yticks: [0, s.demand], fmtY: f0 });
      ax.series(sc.set.pts, alpha(C.sakura, 0.75), 2, [5, 4]);
      ax.series(sc.trace.pts, C.mint, 2.4);
      ax.key([['asked for', alpha(C.sakura, 0.75)], ['actually rotating', C.mint]]);
    },
  }),

  /*
   * The keystone. A quadcopter has no natural tendency to return to level:
   * with all four motors equal there is no restoring moment at all, and the
   * small persistent torques every real frame carries will tip it over and
   * keep tipping it. What stops that happening is somebody correcting, and
   * the whole argument of this wiki is about how fast they have to be.
   *
   * The knob is corrections per second. A human is at the far left and
   * always loses. That is the point of the page.
   */
  unstable: () => makeFigure({
    id: 'unstable',
    label: 'Tilt against time, for a controller correcting at different rates',
    eyebrow: 'How fast do you have to be',
    w: 680,
    h: 356,
    still: 2.4,
    ask: 'A small nudge tips the aircraft. How many corrections a second do you think it takes to hold it level? Guess before you drag.',
    controls: [
      {
        key: 'hz',
        label: 'Corrections per second',
        type: 'pick',
        value: 5,
        options: [
          { label: 'You, 5', value: 5 },
          { label: '20', value: 20 },
          { label: '50', value: 50 },
          { label: '200', value: 200 },
          { label: '1000, the real one', value: 1000 },
        ],
      },
    ],
    caption: 'An aeroplane left alone tends to fly straight, because its wings and tail pull it back. A quadcopter has nothing that does that. With all four motors equal there is no force returning it to level, and every real frame carries small crooked pushes that tip it slowly over. Something has to notice and correct, and the whole question is how fast. A very good human manages about five corrections a second, which is the left hand setting, and it is not close. The flight controller does a thousand.',
    reset: (s, sc) => {
      /* Sample and hold PD on attitude, against the sort of steady bias a
         slightly canted motor leaves. Same airframe constants as the rest. */
      const w0 = HOVER_W;
      const dwdd = packOpenCircuit() / (P.ke + 2 * ((P.kq * P.rMotor) / P.ke) * w0);
      const torquePerDuty = 4 * P.arm * (2 * P.kt * w0 * dwdd);
      const dt = 0.0005;
      const period = 1 / s.hz;
      const kp = 6;
      const kd = 0.9;
      const bias = 0.0015;
      let th = 0.02;
      let om = 0;
      let u = 0;
      let since = 1e9;
      sc.tr = [];
      sc.t45 = null;
      sc.flipped = false;
      for (let i = 0; i * dt <= 4; i += 1) {
        const t = i * dt;
        since += dt;
        if (since >= period) {
          since = 0;
          u = Math.max(-1, Math.min(1, -(kp * th + kd * om)));
        }
        om += ((torquePerDuty * u + bias) / P.inertia.roll) * dt;
        th += om * dt;
        if (sc.t45 == null && Math.abs(th) > Math.PI / 4) { sc.t45 = t; }
        /* Clamp at inverted and keep drawing, rather than stopping and
           leaving three quarters of the axis blank. Upside down is a state
           the aircraft stays in, and the trace should say so. */
        if (Math.abs(th) > Math.PI) { sc.flipped = true; th = Math.sign(th) * Math.PI; om = 0; u = 0; }
        sc.tr.push([t, (th * 180) / Math.PI]);
      }
      sc.settled = sc.tr[sc.tr.length - 1][1];
    },
    draw(ctx, W, H, s, t, sc) {
      const span = 4;
      const cursor = (t * 0.5) % span;
      const at = Math.min(sc.tr.length - 1, Math.round(cursor / 0.0005));
      const tilt = (sc.tr[at][1] * Math.PI) / 180;

      /* The aircraft, doing whatever the trace says it is doing. */
      const cx = 122;
      const cy = 150;
      line(ctx, cx - 92, cy, cx + 92, cy, alpha(C.cream, 0.10), 1.4, [3, 5]);
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(-tilt);
      line(ctx, -56, 0, 56, 0, Math.abs(tilt) > Math.PI / 4 ? C.sakura : C.slate, 7);
      rotor(ctx, -56, -7, 26, 0.6, { load: 0.5, squash: 0.26 });
      rotor(ctx, 56, -7, 26, 2.0, { load: 0.5, squash: 0.26 });
      roundRect(ctx, -12, -8, 24, 16, 3, C.deep, C.amber, 1.5);
      ctx.restore();
      text(ctx, `${f0(Math.abs((tilt * 180) / Math.PI))} deg`, cx, cy + 52, {
        fill: Math.abs(tilt) > Math.PI / 4 ? C.sakura : C.cream, size: 15, weight: 700,
        align: 'center', mono: true,
      });
      if (Math.abs(tilt) > Math.PI * 0.94) {
        text(ctx, 'upside down', cx, cy + 70, { fill: C.sakura, size: 11.5, align: 'center', weight: 700 });
      }

      const ax = new Axes(ctx, {
        x: 250, y: 54, w: W - 280, h: 172, xmin: 0, xmax: span, ymin: -190, ymax: 190,
        xlabel: 'seconds after the nudge', ylabel: 'how far it has tipped, degrees',
      });
      ax.frame({ xticks: [0, 1, 2, 3, 4], yticks: [-180, -45, 0, 45, 180], fmtX: f0, fmtY: f0 });
      ax.hline(45, alpha(C.sakura, 0.4), [4, 4], 'past here you are not flying, you are falling', 0.02);
      ax.hline(-45, alpha(C.sakura, 0.4), [4, 4]);
      ax.series(sc.tr, sc.t45 == null ? C.mint : C.sakura, 2.6);
      if (at < sc.tr.length) {
        ax.mark(sc.tr[at][0], sc.tr[at][1], C.cream, 4.5);
      }

      const good = sc.t45 == null;
      text(ctx, good ? 'Still flying.' : `Out of control after ${f1(sc.t45)} seconds.`, 250, 276, {
        fill: good ? C.mint : C.sakura, size: 14, weight: 700,
      });
      wrapText(ctx, good
        ? 'Corrections arrive faster than the aircraft can tip, so the nudge never becomes anything.'
        : 'Between one correction and the next the aircraft tips further than the next correction can undo.',
      250, 296, W - 280, { fill: C.slate, size: 11.5, lead: 15 });
      note(ctx, 24, H - 11, 'the same airframe, and a steady crooked push of the size a slightly canted motor leaves');
    },
  }),

  /*
   * The single most useful thing to understand about a quad, and it is one
   * triangle: tilt is the only way to go anywhere, and tilt costs thrust.
   */
  tilt: () => makeFigure({
    id: 'tilt',
    label: 'Bank angle buys acceleration and costs thrust',
    eyebrow: 'One force, one direction',
    w: 680,
    h: 320,
    animated: false,
    controls: [
      { key: 'bank', label: 'Bank angle', min: 0, max: 70, step: 1, value: 35, fmt: (v) => `${f0(v)} deg` },
    ],
    caption: 'A quad has exactly one force it can point, so going anywhere means tilting, and tilting means the vertical share of that force shrinks. Sideways acceleration is g tan(theta) and the thrust needed to stay level is W / cos(theta). Both run away near vertical. This is also why there is no brake: slowing down is the same manoeuvre pointed the other way.',
    draw(ctx, W, H, s) {
      const th = (s.bank * Math.PI) / 180;
      const tw = 1 / Math.cos(th);
      const ah = Math.tan(th);
      const need = P.mass * P.g * ah;
      let v = 0;
      for (let i = 1; i <= 400; i += 1) {
        const test = i * 0.2;
        if (bodyDrag(test, P.cdaFront) + 4 * hForce(test, HOVER_T * tw) >= need) { v = test; break; }
        v = test;
      }
      const maxTw = (FULL.thrust * 4) / P.weight;

      /*
       * The vertical leg is the weight and never changes length, so the
       * thrust vector grows along the hypotenuse exactly as 1 / cos does.
       * Sized so the tip is still inside the frame at the top of the
       * slider's range, which is where tan runs away.
       */
      const cx = 132;
      const cy = 228;
      const L = 84;
      const Lt = L * tw;
      /* One origin at the centre of gravity, so the three vectors are a
         triangle rather than three arrows that happen to be near each
         other. The vertical leg is exactly the weight. */
      const tipX = cx + Math.sin(th) * Lt;
      const tipY = cy - Math.cos(th) * Lt;
      const legY = cy - Math.cos(th) * Lt;
      line(ctx, 30, cy, 372, cy, alpha(C.cream, 0.12), 1.4, [3, 5]);
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(-th);
      line(ctx, -58, 0, 58, 0, C.slate, 7);
      rotor(ctx, -58, -7, 27, 0.7, { load: 0.3 + s.bank / 140, squash: 0.24 });
      rotor(ctx, 58, -7, 27, 2.1, { load: 0.3 + s.bank / 140, squash: 0.24 });
      roundRect(ctx, -13, -9, 26, 18, 3, C.deep, C.amber, 1.6);
      ctx.restore();
      /* The right angle, drawn, so the decomposition is unmistakable. */
      line(ctx, cx, legY, tipX, tipY, alpha(C.cream, 0.22), 1.2, [4, 4]);
      arrow(ctx, cx, cy, cx, legY, C.cream, 2.6, 9);
      arrow(ctx, cx, legY, tipX, legY, C.sakura, 2.6, 9);
      arrow(ctx, cx, cy, tipX, tipY, C.mint, 3.2, 11);
      dot(ctx, cx, cy, 4, C.amber);
      text(ctx, 'thrust', tipX + 10, tipY + 4, { fill: C.mint, size: 12, weight: 700 });
      text(ctx, 'holds the weight up', cx - 10, (cy + legY) / 2, {
        fill: C.cream, size: 11, align: 'right', baseline: 'middle',
      });
      text(ctx, 'takes you somewhere', (cx + tipX) / 2, legY - 10, {
        fill: C.sakura, size: 11, align: 'center',
      });
      ctx.save();
      ctx.strokeStyle = alpha(C.amber, 0.8);
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.arc(cx, cy, 30, -Math.PI / 2, -Math.PI / 2 + th);
      ctx.stroke();
      ctx.restore();
      text(ctx, `${f0(s.bank)} deg`, cx - 8, cy - 34, {
        fill: C.amber, size: 11.5, mono: true, align: 'right',
      });

      panel(ctx, 392, 44, W - 416, 234, C.sakura);
      eyebrow(ctx, 'what that bank costs and buys', 408, 66);
      const rows = [
        ['Thrust needed to stay level', `${f2(tw)} x hover`, tw > maxTw ? C.sakura : C.cream],
        ['Sideways acceleration', `${f2(ah)} g`, C.mint],
        ['Of the airframe\'s 9.2 to 1', `${f0((tw / maxTw) * 100)} percent used`, tw / maxTw > 0.8 ? C.sakura : C.slate],
        ['Level speed drag will allow', `${f0(v * 3.6)} km/h`, C.amber],
      ];
      rows.forEach(([k, val, color], i) => {
        const y = 104 + i * 44;
        text(ctx, k, 408, y, { fill: C.slate, size: 11.5 });
        text(ctx, val, 408, y + 22, { fill: color, size: 19, weight: 700, mono: true });
        if (i < rows.length - 1) {
          line(ctx, 408, y + 32, W - 40, y + 32, alpha(C.cream, 0.07), 1);
        }
      });
      if (tw > maxTw) {
        text(ctx, 'past what this airframe can hold', 408, 268, { fill: C.sakura, size: 11, weight: 700 });
      }
    },
  }),

  /*
   * The seam the whole project is built on. Two machines, one module, four
   * things crossing between them, and neither side speaks the other's
   * units. Worth a picture because the temptation it refuses is universal.
   */
  boundary: () => makeFigure({
    id: 'boundary',
    label: 'Compiled Betaflight and the plant, and the four things that cross',
    eyebrow: 'The seam',
    w: 680,
    h: 320,
    still: 0.9,
    caption: 'Betaflight is compiled, not reimplemented, so the left half is vendor source running as itself. The plant is C written for this project. Only four things cross between them each millisecond, and neither side speaks the other\'s units: the controller never sees a newton, and the plant never sees a PID. Anything that behaves wrongly is therefore in one half or in the crossing, never in a vague middle.',
    draw(ctx, W, H, s, t) {
      const mid = W / 2;
      /* The seam needs a gutter of its own. The crossings used to be drawn
         over both panels, which made the boundary look like a decoration
         rather than the only way through. */
      const gut = 96;
      const lw = mid - gut - 24;
      panel(ctx, 24, 52, lw, 208, C.mint);
      panel(ctx, mid + gut, 52, W - 24 - mid - gut, 208, C.amber);

      eyebrow(ctx, 'compiled from vendor', 38, 74, C.mint);
      text(ctx, 'Betaflight 4.5.1', 38, 100, { fill: C.cream, size: 17, weight: 700 });
      ['pid.c', 'mixer.c', 'rc.c', 'gyro filtering', 'rpm_filter.c', 'simplified_tuning.c']
        .forEach((n, i) => {
          text(ctx, n, 38, 126 + i * 19, { fill: C.slate, size: 11.5, mono: true });
        });
      text(ctx, 'no UART, no MSP, no OSD pixels', 38, 246, { fill: alpha(C.slate, 0.75), size: 10.5 });

      eyebrow(ctx, 'written for this project', mid + gut + 14, 74, C.amber);
      text(ctx, 'The plant', mid + gut + 14, 100, { fill: C.cream, size: 17, weight: 700 });
      ['motors', 'props', 'battery', 'aero', 'rigid body', 'plant.c']
        .forEach((n, i) => {
          text(ctx, n, mid + gut + 14, 126 + i * 19, { fill: C.slate, size: 11.5, mono: true });
        });
      text(ctx, 'SI throughout: m, kg, s, rad, N, V, A', mid + gut + 14, 246, {
        fill: alpha(C.slate, 0.75), size: 10.5,
      });

      line(ctx, mid, 34, mid, 272, alpha(C.sakura, 0.5), 1.6, [5, 5]);
      text(ctx, 'sim_abi.h', mid, 26, { fill: C.sakura, size: 11, weight: 700, align: 'center' });

      /* The four crossings, animated, so the direction of each is plain. */
      const cross = [
        ['rc channels', 1, 88, C.sakura],
        ['gyro, deg/s', -1, 136, C.cream],
        ['four duties', 1, 184, C.mint],
        ['state, SI', -1, 232, C.amber],
      ];
      const ph = (t * 0.5) % 1;
      cross.forEach(([label, dir, y, color], i) => {
        const x1 = dir > 0 ? mid - gut + 8 : mid + gut - 8;
        const x2 = dir > 0 ? mid + gut - 8 : mid - gut + 8;
        arrow(ctx, x1, y, x2, y, alpha(color, 0.45), 1.6, 7);
        const k = (ph + i * 0.25) % 1;
        dot(ctx, x1 + (x2 - x1) * k, y, 3.6, color);
        text(ctx, label, mid, y - 10, { fill: color, size: 10.5, align: 'center', weight: 600 });
      });
      text(ctx, 'the controller never sees a newton, and the plant never sees a PID',
        mid, 288, { fill: C.slate, size: 11.5, align: 'center' });
      note(ctx, 24, H - 11, 'one wasm module, stepped together at 1 kHz');
    },
  }),

  /*
   * Six hundred and ninety six keys, drawn. A sentence saying "159 of them
   * fly" is a claim. The same statement as a field of dots is a look.
   */
  status: () => makeFigure({
    id: 'status',
    label: 'Every catalog key, one dot, coloured by whether it flies',
    eyebrow: 'The catalog, honestly',
    w: 680,
    h: 320,
    animated: false,
    controls: [
      {
        key: 'show',
        label: 'Highlight',
        type: 'pick',
        value: 'all',
        options: [
          { label: 'All', value: 'all' },
          { label: 'Live', value: STATUS.LIVE },
          { label: 'Gated', value: STATUS.GATED },
          { label: 'Applied inert', value: STATUS.APPLIED_INERT },
          { label: 'Inert', value: STATUS.INERT },
          { label: 'Absent', value: STATUS.ABSENT },
        ],
      },
    ],
    caption: 'Every field the Configurator screen will accept, one dot each, generated from the same catalog the simulator greys its rows with. The large pale block is the honest part: most of a flight controller is video, OSD, GPS and LEDs, and none of that exists here. A grey key still stores and still exports, so a dump you drop in is not silently eaten.',
    draw(ctx, W, H, s) {
      const order = [STATUS.LIVE, STATUS.GATED, STATUS.APPLIED_INERT, STATUS.INERT, STATUS.ABSENT];
      const color = {
        [STATUS.LIVE]: C.mint,
        [STATUS.GATED]: C.amber,
        [STATUS.APPLIED_INERT]: C.slate,
        [STATUS.INERT]: alpha(C.slate, 0.45),
        [STATUS.ABSENT]: C.sakura,
      };
      const sorted = [...FIELDS].sort((a, b) => order.indexOf(a.status) - order.indexOf(b.status));
      const cols = 48;
      const cell = (W - 48) / cols;
      const r = Math.min(cell * 0.32, 5);
      const top = 40;
      sorted.forEach((fld, i) => {
        const cx = 24 + (i % cols) * cell + cell / 2;
        const cy = top + Math.floor(i / cols) * cell + cell / 2;
        const on = s.show === 'all' || s.show === fld.status;
        dot(ctx, cx, cy, on ? r : r * 0.55, on ? color[fld.status] : alpha(C.slate, 0.13));
      });
      const rows = Math.ceil(sorted.length / cols);
      const legendY = top + rows * cell + 26;
      let x = 24;
      for (const st of order) {
        const n = FIELDS.filter((fld) => fld.status === st).length;
        const on = s.show === 'all' || s.show === st;
        dot(ctx, x + 5, legendY, 4.5, on ? color[st] : alpha(C.slate, 0.2));
        const label = `${n} ${st.replace(/_/g, ' ').toLowerCase()}`;
        text(ctx, label, x + 15, legendY, { fill: on ? C.cream : alpha(C.slate, 0.5), size: 11.5, baseline: 'middle' });
        ctx.save();
        ctx.font = '400 11.5px system-ui, sans-serif';
        x += 15 + ctx.measureText(label).width + 20;
        ctx.restore();
      }
      text(ctx, `${FIELDS.length} keys`, W - 24, legendY, { fill: C.slate, size: 11.5, align: 'right', baseline: 'middle', mono: true });
      note(ctx, 24, H - 11, 'generated from src/fc/catalog.js, not typed here');
    },
  }),

  /*
   * A page about how to read pages. Showing the anatomy beats describing it,
   * and it lets the two voices be seen as two voices rather than as length.
   */
  anatomy: () => makeFigure({
    id: 'anatomy',
    label: 'The parts of a wiki page and what each one promises',
    eyebrow: 'How a page is built',
    w: 680,
    h: 330,
    animated: false,
    controls: [
      {
        key: 'part',
        label: 'Explain',
        type: 'pick',
        value: 'air',
        options: [
          { label: 'Status', value: 'chip' },
          { label: 'In the air', value: 'air' },
          { label: 'In the lab', value: 'lab' },
          { label: 'In this simulator', value: 'sim' },
          { label: 'Figure', value: 'fig' },
        ],
      },
    ],
    caption: 'The two columns are not the same sentence at two lengths. In the air is what you could tell somebody at the field; in the lab is what you could defend in a review. In this simulator is the seam, and it is the part that will tell you a key does nothing. Pick a part to read what it promises.',
    draw(ctx, W, H, s) {
      const notes = {
        chip: ['The status chip', 'LIVE reaches compiled firmware. GATED writes, then this firmware ignores it at 1 kHz. APPLIED INERT stores in a real parameter group nothing here reads. A chip is a promise about behaviour, not about importance.'],
        air: ['In the air', 'Plain language, no equation, no apology. Written for somebody who has never held a radio. If you can only read one column, read this one.'],
        lab: ['In the lab', 'The equation, the units, the constant and the file it lives in. Written for somebody who wants to check the claim rather than take it.'],
        sim: ['In this simulator', 'The seam. Which file, which status, which check, and which thing is not modelled. This is where a page admits something.'],
        fig: ['The figure', 'Computed from the plant\'s own constants, so it can be wrong and can be checked. An argument, not a photograph. The caption says what it is arguing.'],
      };
      const hot = s.part;
      const dim = (k) => (hot === k ? 1 : 0.26);
      const px = 24;
      const pw = W * 0.52;
      panel(ctx, px, 34, pw, 264);

      ctx.save();
      ctx.globalAlpha = dim('chip');
      eyebrow(ctx, 'the plant', px + 18, 60);
      chip(ctx, 'LIVE', px + 96, 56, C.mint);
      ctx.restore();
      roundRect(ctx, px + 18, 70, pw * 0.62, 16, 2, alpha(C.cream, 0.55));
      roundRect(ctx, px + 18, 94, pw * 0.86, 7, 2, alpha(C.cream, 0.18));
      roundRect(ctx, px + 18, 106, pw * 0.72, 7, 2, alpha(C.cream, 0.18));

      ctx.save();
      ctx.globalAlpha = dim('fig');
      roundRect(ctx, px + 18, 126, pw - 36, 58, 3, alpha(C.sakura, 0.10), alpha(C.sakura, 0.45), 1.4);
      text(ctx, 'figure', px + 26, 143, { fill: C.sakura, size: 10, weight: 700, track: 1.2 });
      for (let i = 0; i < 22; i += 1) {
        const bx = px + 34 + i * ((pw - 80) / 22);
        line(ctx, bx, 176, bx, 176 - 6 - Math.sin(i * 0.6) * 12 - 12, alpha(C.mint, 0.6), 2);
      }
      ctx.restore();

      const colW = (pw - 46) / 2;
      ctx.save();
      ctx.globalAlpha = dim('air');
      panel(ctx, px + 18, 194, colW, 56, C.mint);
      text(ctx, 'IN THE AIR', px + 28, 210, { fill: C.mint, size: 9, weight: 700, track: 1.2 });
      roundRect(ctx, px + 28, 220, colW - 24, 6, 2, alpha(C.cream, 0.2));
      roundRect(ctx, px + 28, 232, colW - 40, 6, 2, alpha(C.cream, 0.2));
      ctx.restore();
      ctx.save();
      ctx.globalAlpha = dim('lab');
      panel(ctx, px + 28 + colW, 194, colW, 56, C.amber);
      text(ctx, 'IN THE LAB', px + 38 + colW, 210, { fill: C.amber, size: 9, weight: 700, track: 1.2 });
      roundRect(ctx, px + 38 + colW, 220, colW - 24, 6, 2, alpha(C.cream, 0.2));
      roundRect(ctx, px + 38 + colW, 232, colW - 44, 6, 2, alpha(C.cream, 0.2));
      ctx.restore();
      ctx.save();
      ctx.globalAlpha = dim('sim');
      panel(ctx, px + 18, 258, pw - 36, 30, C.sakura);
      text(ctx, 'IN THIS SIMULATOR', px + 28, 274, { fill: C.sakura, size: 9, weight: 700, track: 1.2 });
      ctx.restore();

      const nx = px + pw + 26;
      const [title, body] = notes[hot];
      eyebrow(ctx, 'what it promises', nx, 60);
      text(ctx, title, nx, 88, { fill: C.cream, size: 17, weight: 700 });
      const words = body.split(' ');
      let ln = '';
      let y = 116;
      ctx.save();
      ctx.font = '400 12.5px system-ui, sans-serif';
      for (const wd of words) {
        const test = ln ? `${ln} ${wd}` : wd;
        if (ctx.measureText(test).width > W - nx - 28) {
          text(ctx, ln, nx, y, { fill: alpha(C.cream, 0.82), size: 12.5 });
          y += 19;
          ln = wd;
        } else {
          ln = test;
        }
      }
      ctx.restore();
      text(ctx, ln, nx, y, { fill: alpha(C.cream, 0.82), size: 12.5 });
    },
  }),

  /*
   * The mixer's geometry, learned by asking for a rotation and watching
   * which discs answer. The spin map is why yaw exists at all.
   */
  quadx: () => makeFigure({
    id: 'quadx',
    label: 'Betaflight motor order, spin directions, and which pair answers a demand',
    eyebrow: 'The airframe from above',
    w: 680,
    h: 340,
    still: 2,
    controls: [
      {
        key: 'ask',
        label: 'Ask for',
        type: 'pick',
        value: 'hover',
        options: [
          { label: 'Hover', value: 'hover' },
          { label: 'Roll right', value: 'roll' },
          { label: 'Nose up', value: 'pitch' },
          { label: 'Nose right', value: 'yaw' },
        ],
      },
    ],
    caption: 'Four motors, two spinning each way, and every rotation you can ask for is a different pattern of the same four numbers. Roll and pitch tilt the thrust. Yaw is the odd one: nothing pushes sideways, so the frame is turned by the reaction to speeding up the two props that spin against the direction you want, which is why yaw is weaker and slower than the other two.',
    draw(ctx, W, H, s, t) {
      /* Betaflight mixerQuadX, in the order the firmware numbers them. */
      const M = [
        { n: 0, tag: 'RR', x: 1, y: 1, cw: true, roll: -1, pitch: 1, yaw: -1 },
        { n: 1, tag: 'FR', x: 1, y: -1, cw: false, roll: -1, pitch: -1, yaw: 1 },
        { n: 2, tag: 'RL', x: -1, y: 1, cw: false, roll: 1, pitch: 1, yaw: 1 },
        { n: 3, tag: 'FL', x: -1, y: -1, cw: true, roll: 1, pitch: -1, yaw: -1 },
      ];
      const demand = { hover: 0, roll: 0.30, pitch: 0.30, yaw: 0.30 }[s.ask];
      const col = s.ask === 'hover' ? null : (s.ask === 'pitch' ? 'pitch' : s.ask);
      /* Nose up is a negative pitch command: the front pair has to slow. */
      const sign = s.ask === 'pitch' ? -1 : 1;
      const share = (m) => (col ? m[col] * demand * sign : 0);

      const cx = 186;
      const cy = 172;
      const arm = 80;
      quadPlan(ctx, cx, cy, arm, { color: alpha(C.slate, 0.8) });
      for (const m of M) {
        const mx = cx + m.x * arm;
        const my = cy + m.y * arm;
        const k = 1 + share(m);
        const w = HOVER_W * Math.sqrt(Math.max(0.05, k));
        const dir = m.cw ? 1 : -1;
        rotor(ctx, mx, my, 34, dir * t * (w / 90), { load: Math.max(0.10, (k - 0.55) * 0.9), squash: 1, color: m.cw ? C.sakura : C.mint });
        const lift = share(m);
        if (Math.abs(lift) > 0.01) {
          arrow(ctx, mx, my, mx, my - Math.sign(lift) * (14 + Math.abs(lift) * 46), lift > 0 ? C.mint : C.sakura, 2.4, 8);
        }
        text(ctx, `${m.n} ${m.tag}`, mx, my + 50, { fill: C.cream, size: 11.5, weight: 700, align: 'center' });
        text(ctx, m.cw ? 'CW' : 'CCW', mx, my + 63, { fill: m.cw ? C.sakura : C.mint, size: 10, align: 'center' });
        text(ctx, `${f0(rpm(w))}`, mx, my + 4, { fill: C.cream, size: 12, align: 'center', mono: true, weight: 700 });
      }
      text(ctx, 'nose', cx, cy - arm - 52, { fill: C.amber, size: 11, align: 'center', weight: 700 });

      const bx = 372;
      panel(ctx, bx, 44, W - bx - 24, 250, C.sakura);
      const heads = {
        hover: ['Hover', 'All four the same. Every clockwise prop is balanced by a counter clockwise one, so on a perfectly built frame the twists cancel. Nothing here is holding it level, though: cancel is not the same as correct, and that is what the flight controller is for.'],
        roll: ['Roll right', 'The two left motors speed up, the two right ones slow down. Each side holds one clockwise and one counter clockwise prop, so a roll produces no yaw at this modelling order.'],
        pitch: ['Nose up', 'The front pair slows and the rear pair speeds up. Same story as roll: the spin directions inside each pair are opposed, so nothing leaks into yaw.'],
        yaw: ['Nose right', 'The two counter clockwise props speed up and the clockwise pair slows. The frame turns because it is absorbing the reaction to that change, and because it is paid in prop drag it is weaker than roll or pitch.'],
      };
      const [title, body] = heads[s.ask];
      eyebrow(ctx, 'what the mixer just did', bx + 18, 68);
      text(ctx, title, bx + 18, 94, { fill: C.cream, size: 18, weight: 700 });
      let y = 122;
      let ln = '';
      ctx.save();
      ctx.font = '400 12.5px system-ui, sans-serif';
      for (const wd of body.split(' ')) {
        const test = ln ? `${ln} ${wd}` : wd;
        if (ctx.measureText(test).width > W - bx - 60) {
          text(ctx, ln, bx + 18, y, { fill: alpha(C.cream, 0.84), size: 12.5 });
          y += 19;
          ln = wd;
        } else { ln = test; }
      }
      ctx.restore();
      text(ctx, ln, bx + 18, y, { fill: alpha(C.cream, 0.84), size: 12.5 });
      const authority = { hover: 0, roll: 1, pitch: 0.92, yaw: 0.17 }[s.ask];
      if (authority) {
        text(ctx, 'rough authority against roll', bx + 18, 248, { fill: C.slate, size: 11 });
        meter(ctx, bx + 18, 258, W - bx - 60, 8, authority, s.ask === 'yaw' ? C.amber : C.mint);
      }
      note(ctx, 24, H - 11, 'one 5 inch airframe, 220 mm, 650 g');
    },
  }),

  /*
   * Determinism made visible: change the render rate, watch the picture
   * change and the trajectory refuse to.
   */
  timestep: () => makeFigure({
    id: 'timestep',
    label: 'Physics ticks at 1 kHz while frames arrive whenever they arrive',
    eyebrow: 'Frame time never reaches the integrator',
    w: 680,
    h: 320,
    still: 1.2,
    controls: [
      {
        key: 'hz',
        label: 'Render rate',
        type: 'pick',
        value: 60,
        options: [
          { label: '30 Hz', value: 30 },
          { label: '60 Hz', value: 60 },
          { label: '144 Hz', value: 144 },
          { label: '240 Hz', value: 240 },
        ],
      },
      { key: 'drop', label: 'Drop a frame', type: 'toggle', value: true, on: 'yes', off: 'no' },
    ],
    caption: 'The trajectory is drawn once and does not move when you change the render rate, because the integrator never reads frame time. What changes is how often it gets sampled, and what a dropped frame costs is one missing sample, not a different flight. This is what makes a replay a replay and a lap time a lap time.',
    draw(ctx, W, H, s, t) {
      const span = 0.12;
      const ax = new Axes(ctx, {
        x: 52, y: 158, w: W - 78, h: 116, xmin: 0, xmax: span, ymin: -1.15, ymax: 1.15,
        ylabel: 'roll rate, over 120 milliseconds',
      });
      /* One fixed trajectory. Nothing about it depends on the picks. */
      const traj = (x) => Math.sin(x * 46) * Math.exp(-x * 4) + Math.sin(x * 17) * 0.35;
      ax.frame({ yticks: [-1, 0, 1], fmtY: f0 });
      ax.fn(traj, alpha(C.mint, 0.85), 2.6);

      const tickY = 44;
      eyebrow(ctx, 'physics, 1000 steps a second, always', 24, 24);
      for (let i = 0; i < 120; i += 1) {
        const x = ax.px((i / 120) * span);
        line(ctx, x, tickY, x, tickY + 12, alpha(C.mint, 0.55), 1.4);
      }
      text(ctx, '1 ms apart', ax.px(0) + 2, tickY + 24, { fill: alpha(C.slate, 0.8), size: 10 });

      const frameY = 96;
      const n = Math.round(span * s.hz);
      const dropAt = s.drop ? Math.floor(n / 2) : -1;
      eyebrow(ctx, `render, ${s.hz} frames a second`, 24, frameY + 34, C.amber);
      for (let i = 0; i < n; i += 1) {
        const vx = (i / n) * span;
        const x = ax.px(vx);
        const gone = i === dropAt;
        line(ctx, x, frameY + 4, x, frameY + 18, gone ? alpha(C.sakura, 0.8) : C.amber, gone ? 1.4 : 2, gone ? [2, 3] : null);
        if (!gone) {
          ax.mark(vx, traj(vx), C.amber, 3.4);
        }
      }
      if (dropAt >= 0) {
        const x = ax.px((dropAt / n) * span);
        text(ctx, 'dropped', x, frameY - 6, { fill: C.sakura, size: 10, align: 'center', weight: 700 });
        line(ctx, x, frameY + 18, x, ax.py(traj((dropAt / n) * span)), alpha(C.sakura, 0.35), 1.2, [3, 4]);
      }
      text(ctx, `${n} frames saw ${Math.round(span * 1000)} physics steps`, W - 24, 24, {
        fill: C.slate, size: 11.5, align: 'right',
      });
      text(ctx, 'the green curve is identical in all four picks', W - 24, ax.y + ax.h + 26, {
        fill: C.mint, size: 11.5, align: 'right', weight: 700,
      });
    },
  }),

  /*
   * Throttle is a duty cycle and the rotor has mass. Everything a pilot
   * calls "motor response" is this exponential and its time constant.
   */
  motor: () => makeFigure({
    id: 'motor',
    label: 'A step in duty, and the rotor speed that chases it',
    eyebrow: 'Throttle is not thrust',
    w: 680,
    h: 340,
    still: 0.42,
    controls: [
      { key: 'duty', label: 'Duty step to', min: 0.15, max: 1, step: 0.01, value: 0.6, fmt: (v) => `${f0(v * 100)} percent`, resets: true },
    ],
    caption: 'Duty sets an average voltage. The current that voltage can push is (V minus back EMF) over resistance, and back EMF grows with speed, so the current collapses as the rotor catches up. What is left is a first order rise whose time constant is the rotor\'s own inertia divided by how hard the system resists a speed change: 20 to 30 milliseconds on this airframe, which is a large part of what a D term is compensating for.',
    reset: (s, sc) => { sc.duty = null; },
    draw(ctx, W, H, s, t, sc) {
      const V = FULL.voc;
      const target = motorSteady(s.duty, V);
      /*
       * Three hundred one millisecond steps is cheap, so integrate the whole
       * response every frame and draw all of it. The animation is then a
       * marker running along a finished curve rather than a curve being
       * built, which means the figure is complete in every frame, including
       * the one a reduced motion reader is holding.
       */
      if (sc.duty !== s.duty) {
        sc.duty = s.duty;
        sc.tr = [];
        sc.amps = [];
        let w = 0;
        for (let i = 0; i <= 300; i += 1) {
          const tt = i * 0.001;
          const applied = tt < 0.02 ? 0 : s.duty;
          const amps = (applied * V - P.ke * w) / P.rMotor;
          sc.tr.push([tt, w]);
          sc.amps.push([tt, Math.max(0, amps)]);
          w = Math.max(0, w + ((P.ke * amps - P.kq * w * Math.abs(w)) / P.jRotor) * 0.001);
        }
      }
      const tau = rotorTau(target.w);
      const cursor = 0.02 + ((t * 0.42) % 1) * 0.28;
      const at = Math.min(300, Math.round(cursor * 1000));
      const now = sc.tr[at][1];
      const nowAmps = sc.amps[at][1];

      const ax = new Axes(ctx, {
        x: 52, y: 54, w: W * 0.60, h: 176, xmin: 0, xmax: 0.30, ymin: 0, ymax: 3100,
        xlabel: 'milliseconds after the step', ylabel: 'rad/s',
      });
      ax.frame({ yticks: [0, 1000, 2000, 3000], xticks: [0, 0.1, 0.2, 0.3], fmtX: (v) => f0(v * 1000), fmtY: f0 });
      ax.hline(target.w, alpha(C.mint, 0.4), [4, 5], 'where it is heading');
      ax.hline(target.w * 0.632, alpha(C.amber, 0.35), [3, 4], '63 percent');
      ax.vline(0.02 + tau, alpha(C.amber, 0.4), [3, 4], `tau ${f0(tau * 1000)} ms`, C.amber);
      ax.series(sc.amps.map(([x, a]) => [x, (a / 100) * 3100]), alpha(C.sakura, 0.7), 1.8);
      ax.series(sc.tr, C.mint, 2.6);
      ax.mark(cursor, now, C.cream, 4.5);
      ax.key([['rotor speed', C.mint], ['current, scaled to 100 A', alpha(C.sakura, 0.7)]]);

      const bx = ax.x + ax.w + 34;
      const rows = [
        ['Average volts', `${f1(s.duty * V)} V`, C.amber],
        ['Back EMF now', `${f1(P.ke * now)} V`, C.sakura],
        ['Current now', `${f1(nowAmps)} A`, C.sakura],
        ['Thrust now', `${f2(P.kt * now * now)} N`, C.mint],
        ['Settled RPM', `${f0(rpm(target.w))}`, C.cream],
      ];
      rows.forEach(([k, v, c], i) => {
        const y = 60 + i * 44;
        text(ctx, k, bx, y, { fill: C.slate, size: 10.5 });
        text(ctx, v, bx, y + 20, { fill: c, size: 17, weight: 700, mono: true });
      });
      note(ctx, 24, H - 11, 'one motor, 6S at 4.2 V a cell');
      text(ctx, 'j dw/dt = ke I minus kq w |w|.   No winding inductance, no ESC current ceiling.',
        24, H - 30, { fill: C.slate, size: 11 });
    },
  }),

  /*
   * Thrust and torque are one physical pair. This figure exists because
   * they were once tuned apart, and the result was a free energy machine.
   */
  figmerit: () => makeFigure({
    id: 'figmerit',
    label: 'Thrust and shaft torque both go as RPM squared, and their ratio is fixed',
    eyebrow: 'You cannot tune these apart',
    w: 680,
    h: 360,
    animated: false,
    controls: [
      { key: 'w', label: 'Rotor speed', min: 200, max: 3000, step: 10, value: HOVER_W, fmt: (v) => `${f0(rpm(v))} rpm` },
    ],
    caption: 'Drag the speed from one end to the other. Thrust changes by a factor of two hundred and the power by a factor of three thousand, and the number at the bottom right does not move at all. That number is the figure of merit: how much of the power you put into the shaft comes back as useful thrust. A real five inch manages between 0.4 and 0.6, and the gap you can see between the two power curves is everything the prop wastes. An early version of this aircraft had its two constants picked separately and scored 2.01, which is a propeller returning more power than it is given.',
    draw(ctx, W, H, s) {
      const w = s.w;
      const T = P.kt * w * w;
      const Q = P.kq * w * w;
      const pShaft = Q * w;
      const pIdeal = (T ** 1.5) / Math.sqrt(2 * P.rho * P.discA);
      const fm = pIdeal / pShaft;

      /*
       * An earlier version of this figure drew torque scaled by kt/kq and
       * pointed at the two curves lying on top of each other. That proves
       * nothing: any two quadratics coincide when one is scaled by the
       * ratio of their coefficients, whatever the coefficients are. It also
       * called kt/kq the figure of merit, which it is not; kt/kq is 70.71
       * and the figure of merit is 0.565.
       *
       * What is actually worth showing is the gap. Shaft power is what the
       * battery pays for and ideal induced power is what the air receives,
       * so the space between them is the loss, and the ratio of the two is
       * flat at every speed. That flatness is the real claim.
       */
      const shaftP = (x) => P.kq * x * x * x;
      const idealP = (x) => ((P.kt * x * x) ** 1.5) / Math.sqrt(2 * P.rho * P.discA);
      const ax = new Axes(ctx, {
        x: 54, y: 56, w: W * 0.52, h: 178, xmin: 0, xmax: 3000, ymin: 0, ymax: 800,
        xlabel: 'rotor speed, rad/s', ylabel: 'watts',
      });
      ax.frame({ xticks: [0, 1000, 2000, 3000], yticks: [0, 400, 800], fmtY: f0, fmtX: f0 });
      /* The wasted power, as the area it actually is. */
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(ax.px(0), ax.py(0));
      for (let i = 0; i <= 60; i += 1) {
        const x = (3000 * i) / 60;
        ctx.lineTo(ax.px(x), ax.py(Math.min(800, shaftP(x))));
      }
      for (let i = 60; i >= 0; i -= 1) {
        const x = (3000 * i) / 60;
        ctx.lineTo(ax.px(x), ax.py(Math.min(800, idealP(x))));
      }
      ctx.closePath();
      ctx.clip();
      ctx.fillStyle = alpha(C.sakura, 0.16);
      ctx.fillRect(ax.x, ax.y, ax.w, ax.h);
      ctx.restore();
      ax.fn(shaftP, C.amber, 2.8);
      ax.fn(idealP, C.mint, 2.8);
      ax.vline(HOVER_W, alpha(C.cream, 0.22), [3, 4], 'hover', C.slate);
      ax.vline(FULL.w, alpha(C.cream, 0.22), [3, 4], 'full stick', C.slate);
      ax.mark(w, Math.min(800, shaftP(w)), C.cream, 5);
      ax.key([['power the battery pays for', C.amber], ['power the air receives', C.mint]]);
      text(ctx, 'everything in here is wasted', ax.px(1500), ax.py(330), {
        fill: C.sakura, size: 11, align: 'center',
      });

      const bx = ax.x + ax.w + 34;
      panel(ctx, bx - 16, 56, W - bx + 4, 178, C.amber);
      eyebrow(ctx, 'at this speed', bx, 80);
      const rows = [
        ['Thrust', `${f2(T)} N`, C.mint],
        ['Shaft power', `${f0(pShaft)} W`, C.amber],
        ['Ideal induced power', `${f0(pIdeal)} W`, C.slate],
      ];
      rows.forEach(([k, v, c], i) => {
        text(ctx, k, bx, 106 + i * 36, { fill: C.slate, size: 10.5 });
        text(ctx, v, bx, 124 + i * 36, { fill: c, size: 15, weight: 700, mono: true });
      });
      text(ctx, 'Figure of merit', bx, 212, { fill: C.slate, size: 10.5 });
      text(ctx, f3(fm), bx, 232, { fill: C.cream, size: 20, weight: 700, mono: true });

      /* The band a real prop is allowed to live in, and the old bug. */
      const gx = 54;
      const gy = 300;
      const gw = W - 108;
      text(ctx, 'the band a real five inch is allowed to live in', gx, gy - 22, { fill: C.slate, size: 11 });
      roundRect(ctx, gx, gy, gw, 12, 2, alpha(C.cream, 0.06));
      const at = (v) => gx + (v / 2.2) * gw;
      roundRect(ctx, at(0.4), gy, at(0.6) - at(0.4), 12, 2, alpha(C.mint, 0.35));
      line(ctx, at(fm), gy - 5, at(fm), gy + 17, C.cream, 2);
      text(ctx, `${f3(fm)}, this plant`, at(fm), gy + 30, { fill: C.cream, size: 10.5, align: 'center' });
      line(ctx, at(2.01), gy - 5, at(2.01), gy + 17, C.sakura, 2);
      text(ctx, '2.01, the bug', at(2.01), gy + 30, { fill: C.sakura, size: 10.5, align: 'center' });
      text(ctx, '1.0 is a perfect actuator disc', at(1.0), gy - 6, { fill: C.slate, size: 10, align: 'center' });
    },
  }),

  /*
   * The pack as a voltage behind a resistor, solved the way the plant
   * solves it. A punch is where a battery stops being a constant.
   */
  sag: () => makeFigure({
    id: 'sag',
    label: 'Pack voltage falling under the current the throttle asks for',
    eyebrow: 'The pack is not a constant',
    w: 680,
    h: 330,
    animated: false,
    controls: [
      { key: 'duty', label: 'Throttle', min: 0.05, max: 1, step: 0.01, value: 1, fmt: (v) => `${f0(v * 100)} percent` },
      {
        key: 'cell',
        label: 'Pack charge',
        type: 'pick',
        value: 4.2,
        options: [
          { label: 'Full, 4.2 V', value: 4.2 },
          { label: 'Storage, 3.8 V', value: 3.8 },
          { label: 'Flat, 3.5 V', value: 3.5 },
        ],
      },
    ],
    caption: 'The pack delivers a voltage that depends on the current, and the current depends on the voltage, so the plant settles the two against each other every step. At a hover the sag is a rounding error. At full stick this airframe pulls about 130 amps through six cells of 2.5 milliohms and loses roughly two volts, which is why measured thrust to weight is 9.2 and not the 10.5 the open circuit voltage promises.',
    draw(ctx, W, H, s) {
      const st = packUnderLoad(s.duty, s.cell);
      const voc = packOpenCircuit(s.cell);
      const ax = new Axes(ctx, {
        x: 54, y: 54, w: W * 0.58, h: 186, xmin: 0, xmax: 1, ymin: 0, ymax: 27,
        xlabel: 'throttle', ylabel: 'volts, and amps / 8',
      });
      ax.frame({ xticks: [0, 0.25, 0.5, 0.75, 1], yticks: [0, 9, 18, 27], fmtX: (v) => `${f0(v * 100)}%`, fmtY: f0 });
      ax.hline(voc, alpha(C.slate, 0.5), [4, 5], 'open circuit');
      ax.fn((x) => packUnderLoad(Math.max(0.02, x), s.cell).v, C.amber, 2.6, 60);
      ax.fn((x) => packUnderLoad(Math.max(0.02, x), s.cell).packAmps / 8, alpha(C.sakura, 0.8), 2.2, 60);
      ax.vline(HOVER_DUTY, alpha(C.mint, 0.4), [3, 4], 'hover', C.mint);
      ax.mark(s.duty, st.v, C.cream, 5);
      ax.key([['volts at the motors', C.amber], ['pack amps / 8', alpha(C.sakura, 0.8)]]);

      const bx = ax.x + ax.w + 30;
      const rows = [
        ['Volts at the motors', `${f1(st.v)} V`, C.amber],
        ['Sag', `${f2(st.sag)} V`, st.sag > 1 ? C.sakura : C.slate],
        ['Pack current', `${f0(st.packAmps)} A`, C.sakura],
        ['Thrust, all four', `${f1(st.thrust * 4)} N`, C.mint],
        ['Thrust to weight', `${f2((st.thrust * 4) / P.weight)}`, C.cream],
      ];
      rows.forEach(([k, v, c], i) => {
        const y = 62 + i * 42;
        text(ctx, k, bx, y, { fill: C.slate, size: 10.5 });
        text(ctx, v, bx, y + 19, { fill: c, size: 16, weight: 700, mono: true });
      });

      /* The cell stack, drawn, so the resistance has somewhere to live. */
      const sx = 54;
      const sy = 272;
      text(ctx, 'six cells, 2.5 milliohms each', sx, sy - 10, { fill: C.slate, size: 11 });
      for (let i = 0; i < 6; i += 1) {
        const x = sx + i * 46;
        const load = Math.min(1, st.packAmps / 160);
        roundRect(ctx, x, sy, 38, 22, 2, alpha(C.amber, 0.12 + load * 0.3), alpha(C.amber, 0.5), 1);
        text(ctx, f2(st.v / 6), x + 19, sy + 15, { fill: C.cream, size: 10.5, align: 'center', mono: true });
      }
      const dropX = sx + 6 * 46 + 12;
      text(ctx, `${f2(st.sag)} V lost inside the pack`, dropX, sy + 15, { fill: C.sakura, size: 12, weight: 700 });
      note(ctx, 24, H - 11, 'settings pack charge sets the open circuit voltage, not this curve');
    },
  }),

  /*
   * The advance ratio curve, which is one line that contains climb loss,
   * descent gain, and the vortex ring gap all at once.
   */
  thrustmu: () => makeFigure({
    id: 'thrustmu',
    label: 'Thrust against axial advance ratio, including the vortex ring gap',
    eyebrow: 'One curve, three behaviours',
    w: 680,
    h: 360,
    animated: false,
    controls: [
      { key: 'va', label: 'Axial air speed', min: -18, max: 12, step: 0.2, value: -5, fmt: (v) => `${v > 0 ? 'climb ' : v < 0 ? 'descend ' : ''}${f1(Math.abs(v))} m/s` },
    ],
    caption: 'A prop is a screw, and mu is how fast it is being dragged along its own axis compared with how fast it screws. Climb and the air is already leaving, so thrust falls. Descend gently and the air is arriving, so thrust rises. Past mu of minus 0.30 the momentum theory that produced the rising part has no solution at all, and the plant bridges that gap down to a floor of 0.75 rather than pretending the curve continues.',
    draw(ctx, W, H, s) {
      const vp = P.pitchSpeed(HOVER_W);
      const mu = s.va / vp;
      const ax = new Axes(ctx, {
        x: 56, y: 54, w: W - 84, h: 182, xmin: -1.5, xmax: 0.9, ymin: 0.55, ymax: 1.45,
        xlabel: 'mu, axial speed over pitch speed. Descent is to the left.',
        ylabel: 'thrust, x hover',
      });
      ax.band(P.vrsFull, P.vrsOnset, alpha(C.sakura, 0.09));
      ax.frame({
        xticks: [-1.5, -1.2, -0.9, -0.6, -0.3, 0, 0.3, 0.6, 0.9],
        yticks: [0.6, 0.8, 1, 1.2, 1.4],
        fmtX: (v) => v.toFixed(1),
        fmtY: (v) => v.toFixed(1),
      });
      ax.hline(1, alpha(C.cream, 0.16), [3, 5]);
      ax.fn(axialFactor, C.mint, 2.8, 400);
      ax.vline(P.vrsOnset, alpha(C.sakura, 0.55), [4, 4], 'onset', C.sakura);
      ax.vline(P.vrsFull, alpha(C.sakura, 0.55), [4, 4], 'full loss', C.sakura);
      ax.mark(Math.max(-1.5, Math.min(0.9, mu)), axialFactor(mu), C.cream, 6);
      text(ctx, 'momentum theory has no solution in here', ax.px((P.vrsFull + P.vrsOnset) / 2), ax.y + 18, {
        fill: C.sakura, size: 10.5, align: 'center',
      });
      text(ctx, 'thrust crosses zero when the screw', ax.px(0.62), ax.y + 42, { fill: C.slate, size: 10.5, align: 'center' });
      text(ctx, 'cannot outrun the air', ax.px(0.62), ax.y + 56, { fill: C.slate, size: 10.5, align: 'center' });

      const bx = 56;
      const by = 300;
      const cells = [
        ['mu', f2(mu), C.amber],
        ['thrust factor', f2(axialFactor(mu)), C.mint],
        ['thrust, all four', `${f1(HOVER_T * 4 * axialFactor(mu))} N`, C.cream],
        ['weight', `${f1(P.weight)} N`, C.slate],
      ];
      cells.forEach(([k, v, c], i) => {
        const x = bx + i * ((W - 112) / 4);
        text(ctx, k, x, by, { fill: C.slate, size: 10.5 });
        text(ctx, v, x, by + 22, { fill: c, size: 18, weight: 700, mono: true });
      });
      text(ctx, `pitch speed at a hover is ${f1(vp)} m/s`, W - 28, H - 11, { fill: alpha(C.slate, 0.72), size: 10.5, align: 'right' });
    },
  }),

  /*
   * The mechanism, morphing. The curve says thrust falls; this says why,
   * which is that the wake stops leaving and closes into a ring.
   */
  vrs: () => makeFigure({
    id: 'vrs',
    label: 'A descending rotor catching up with its own wake',
    eyebrow: 'Eating your own downwash',
    w: 680,
    h: 340,
    still: 3,
    controls: [
      { key: 'sink', label: 'Descent rate', min: 0, max: 22, step: 0.2, value: 0, fmt: (v) => `${f1(v)} m/s, ${f0(v * 3.6)} km/h` },
    ],
    caption: 'A hovering rotor throws air down and flies away from it. Descend and you begin to follow that air instead, until the wake has nowhere to go and folds back over the disc as a closed ring. Nothing about the motors changes. The prop is turning at the same speed the whole way through, and thrust still falls by a quarter, which is why the recovery is to move sideways into clean air rather than to add power.',
    draw(ctx, W, H, s, t) {
      const vp = P.pitchSpeed(HOVER_W);
      const mu = -s.sink / vp;
      const factor = axialFactor(mu);
      const depth = Math.max(0, Math.min(1, (mu - P.vrsOnset) / (P.vrsFull - P.vrsOnset)));

      const cx = W * 0.30;
      const cy = 176;
      const R = 96;
      /* Streamlines, morphing from a clean column to a closed torus. */
      ctx.save();
      ctx.lineWidth = 1.8;
      ctx.setLineDash([7, 7]);
      ctx.lineDashOffset = -t * 46;
      for (let i = 0; i < 8; i += 1) {
        const side = i < 4 ? -1 : 1;
        const k = (i % 4) / 3;
        const x0 = side * (24 + k * 58);
        const col = depth > 0.05 ? C.sakura : C.mint;
        ctx.strokeStyle = alpha(col, 0.35 + 0.4 * (1 - Math.abs(k - 0.5) * 1.4));
        ctx.beginPath();
        ctx.moveTo(cx + x0, cy - 62);
        const outX = x0 + side * depth * (R * 0.95 - Math.abs(x0));
        const downY = cy + 96 - depth * 74;
        ctx.bezierCurveTo(
          cx + x0, cy + 20,
          cx + outX * (1 + depth * 0.5), downY,
          cx + outX * (1 + depth * 0.9), cy + 44 - depth * 106,
        );
        if (depth > 0.02) {
          ctx.bezierCurveTo(
            cx + outX * (1 + depth * 0.9), cy - 62 - depth * 34,
            cx + x0 * 0.4, cy - 54 - depth * 36,
            cx + x0 * 0.35, cy - 62,
          );
        }
        ctx.stroke();
        /* An arrowhead, so a streamline reads as flow going somewhere
           rather than as a row of ticks. */
        if (depth < 0.15) {
          const ay = cy + 96 - depth * 74;
          ctx.save();
          ctx.setLineDash([]);
          ctx.fillStyle = alpha(C.mint, 0.5);
          ctx.beginPath();
          ctx.moveTo(cx + x0, ay + 13);
          ctx.lineTo(cx + x0 - 4.5, ay + 2);
          ctx.lineTo(cx + x0 + 4.5, ay + 2);
          ctx.closePath();
          ctx.fill();
          ctx.restore();
        }
      }
      ctx.restore();
      /* The disc, unchanged the whole way through. That is the point. */
      ctx.save();
      ctx.strokeStyle = C.cream;
      ctx.lineWidth = 3.4;
      ctx.beginPath();
      ctx.ellipse(cx, cy, R, 11, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
      roundRect(ctx, cx - 16, cy - 7, 32, 14, 3, C.deep, C.amber, 1.6);
      if (s.sink > 0.05) {
        arrow(ctx, cx - 156, cy - 30, cx - 156, cy + 40 + Math.min(40, s.sink * 3), C.slate, 2.4, 9);
        text(ctx, `falling`, cx - 156, cy - 44, { fill: C.slate, size: 10.5, align: 'center' });
        text(ctx, `${f1(s.sink)} m/s`, cx - 156, cy + 100, { fill: C.slate, size: 11, align: 'center', mono: true });
      }
      const state = depth <= 0 ? 'clean, the wake leaves' : depth < 1 ? 'the ring is forming' : 'fully in the ring';
      text(ctx, state, cx, 44, { fill: depth > 0 ? C.sakura : C.mint, size: 14, weight: 700, align: 'center' });

      const bx = W * 0.60;
      panel(ctx, bx, 44, W - bx - 24, 254, depth > 0 ? C.sakura : C.mint);
      eyebrow(ctx, 'what the plant computes', bx + 18, 68);
      const rows = [
        ['Pitch speed at this RPM', `${f1(vp)} m/s`, C.slate],
        ['mu', f2(mu), C.amber],
        ['Thrust factor', f2(factor), depth > 0 ? C.sakura : C.mint],
        ['Thrust, all four', `${f1(HOVER_T * 4 * factor)} N`, C.cream],
        ['Weight to hold up', `${f1(P.weight)} N`, C.slate],
      ];
      rows.forEach(([k, v, c], i) => {
        const y = 96 + i * 40;
        text(ctx, k, bx + 18, y, { fill: C.slate, size: 10.5 });
        text(ctx, v, W - 40, y, { fill: c, size: 15, weight: 700, mono: true, align: 'right' });
        line(ctx, bx + 18, y + 12, W - 40, y + 12, alpha(C.cream, 0.06), 1);
      });
      /*
       * The dangerous thing is not the thrust level, it is the slope. On the
       * way in, descending faster buys you MORE thrust, so the aircraft feels
       * fine and the instinct it teaches is wrong. Past the onset that slope
       * reverses and descending faster costs thrust, so the same instinct now
       * digs the hole. Reporting a green "holding" while the wake is folding
       * over the disc told the reader the opposite of the lesson.
       */
      const dF = axialFactor(-(s.sink + 0.25) / vp) - factor;
      const worsening = dF < -1e-4;
      const verdict = worsening
        ? 'Descend faster now and thrust FALLS. This is the trap.'
        : 'Descend faster and thrust still rises. This is the bait.';
      wrapText(ctx, verdict, bx + 18, 286, W - bx - 40, {
        fill: worsening ? C.sakura : C.amber, size: 12, weight: 700, lead: 15,
      });
      note(ctx, 24, H - 11, 'onset at mu = -0.30, floor 0.75, from plant_vrs in plant.c');
    },
  }),

  /*
   * The thing a tune fights and cannot win. Four independent channels of
   * band limited noise, seeded, so the ugliness is repeatable.
   */
  wash: () => makeFigure({
    id: 'wash',
    label: 'Four independent bands of unsteady thrust, one per rotor',
    eyebrow: 'The living part of a descent',
    w: 680,
    h: 330,
    still: 2.4,
    controls: [
      { key: 'depth', label: 'How deep in the wake', min: 0, max: 1, step: 0.01, value: 0.7, fmt: (v) => `${f0(v * 100)} percent` },
    ],
    caption: 'A steady asymmetry is what an I term is for: it sits there and gets trimmed out. Recirculating flow is not steady. It is four separate channels of 3 to 30 Hz noise, one per disc, applied only while that disc is in its own wake, reaching 8 percent of thrust at full depth. No gain setting cancels a disturbance that is different on every rotor and different every millisecond. The seed is fixed, so the same run is the same mess twice.',
    reset: (s, sc) => {
      const rnd = xorshift(0x5eed1);
      sc.ch = [];
      for (let m = 0; m < 4; m += 1) {
        const comps = [];
        for (let k = 0; k < 7; k += 1) {
          comps.push({ f: 3 + rnd() * 27, ph: rnd() * Math.PI * 2, a: 1 / (1 + k) });
        }
        sc.ch.push(comps);
      }
    },
    draw(ctx, W, H, s, t, sc) {
      if (!sc.ch) { return; }
      const val = (m, tt) => sc.ch[m].reduce((acc, c) => acc + c.a * Math.sin(tt * c.f * 2 * Math.PI + c.ph), 0) / 2.6;
      const names = ['0 RR', '1 FR', '2 RL', '3 FL'];
      const cols = [C.sakura, C.mint, C.amber, C.cream];
      const amp = P.kPropwash * s.depth;

      const cx = 106;
      const cy = 168;
      quadPlan(ctx, cx, cy, 62, { color: alpha(C.slate, 0.7), width: 6 });
      const pos = [[1, 1], [1, -1], [-1, 1], [-1, -1]];
      for (let m = 0; m < 4; m += 1) {
        const v = val(m, t);
        const mx = cx + pos[m][0] * 62;
        const my = cy + pos[m][1] * 62;
        const jitter = v * s.depth * 4;
        rotor(ctx, mx + jitter, my + jitter * 0.6, 28, t * 9 * (m % 3 ? 1 : -1), {
          load: 0.35 + v * s.depth * 0.4, squash: 1, color: cols[m],
        });
      }
      text(ctx, 'each disc, on its own', cx, cy + 108, { fill: C.slate, size: 11, align: 'center' });

      const ax = new Axes(ctx, {
        x: 232, y: 54, w: W - 262, h: 190, xmin: t - 1.4, xmax: t, ymin: -0.14, ymax: 0.14,
        xlabel: '1.4 seconds', ylabel: 'thrust wobble, x hover',
      });
      ax.frame({ yticks: [-0.1, 0, 0.1], fmtY: (v) => v.toFixed(2) });
      for (let m = 0; m < 4; m += 1) {
        const pts = [];
        for (let i = 0; i <= 160; i += 1) {
          const tt = t - 1.4 + (1.4 * i) / 160;
          pts.push([tt, val(m, tt) * amp]);
        }
        ax.series(pts, alpha(cols[m], 0.85), 1.7);
      }
      ax.hline(amp, alpha(C.cream, 0.2), [3, 4], `${f0(amp * 100)} percent of thrust`);
      ax.hline(-amp, alpha(C.cream, 0.2), [3, 4]);
      ax.key(names.map((n, m) => [n, cols[m]]));
      text(ctx, 'An I term can trim a constant. It cannot trim four of these.', 232, H - 34, {
        fill: C.cream, size: 12,
      });
      note(ctx, 24, H - 11, 'k_propwash 0.08, a chosen constant, not a measurement');
    },
  }),

  /*
   * Why a quad gets lighter when it starts moving. Glauert, drawn.
   */
  etl: () => makeFigure({
    id: 'etl',
    label: 'Induced velocity collapsing as the disc meets fresh air',
    eyebrow: 'Translational lift',
    w: 680,
    h: 344,
    animated: false,
    controls: [
      { key: 'v', label: 'Speed across the disc', min: 0, max: 30, step: 0.2, value: 8, fmt: (v) => `${f1(v)} m/s, ${f0(v * 3.6)} km/h` },
    ],
    caption: 'A hovering disc has to fly in the air it just pushed down, so it works against its own downwash. Move sideways and it starts meeting air that has not been through it yet, and the induced velocity collapses. At a given thrust the induced power a rotor spends is proportional to that velocity, so the curve is the saving as well as the cause. Helicopter pilots feel this as a distinct shudder and lift at walking pace. On a quad it is the same equation, and it is why a hover is the least efficient thing you can do.',
    draw(ctx, W, H, s) {
      const vh = hoverInduced(HOVER_T);
      const x = s.v / vh;
      const g = glauert(x);
      const vi = vh * g;

      const ax = new Axes(ctx, {
        x: 54, y: 54, w: W * 0.55, h: 188, xmin: 0, xmax: 30, ymin: 0, ymax: 1.35,
        xlabel: 'speed across the disc, m/s', ylabel: 'x hover value',
      });
      ax.frame({ xticks: [0, 10, 20, 30], yticks: [0, 0.5, 1], fmtX: f0, fmtY: (v) => v.toFixed(1) });
      /*
       * One curve, because one curve is what the plant computes. The
       * induced power a rotor spends at a given thrust is exactly
       * proportional to its induced velocity, so this line is also the
       * power saving, and inventing a second thrust curve to sit beside it
       * would be drawing a number nothing here derives.
       */
      ax.fn((vx) => glauert(vx / vh), C.sakura, 2.8);
      ax.mark(s.v, g, C.cream, 5);
      ax.vline(vh, alpha(C.amber, 0.4), [3, 4], 'hover induced speed', C.amber);
      ax.key([['induced velocity, and the induced power it costs', C.sakura]]);

      /* The two pictures the curve is about. */
      const draw1 = (px, py, speed, label, col) => {
        ctx.save();
        ctx.strokeStyle = C.cream;
        ctx.lineWidth = 2.6;
        ctx.beginPath();
        ctx.ellipse(px, py, 52, 8, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
        const thin = speed > 0.5 ? Math.max(0.15, g) : 1;
        for (let i = -2; i <= 2; i += 1) {
          const ox = i * 15;
          line(ctx, px + ox, py + 9, px + ox + speed * 1.6, py + 9 + 52 * thin, alpha(C.sakura, 0.3 + thin * 0.4), 1.8, [5, 5]);
        }
        if (speed > 0.5) {
          arrow(ctx, px - 84, py, px - 58, py, C.mint, 2.4, 8);
        }
        text(ctx, label, px, py + 82, { fill: col, size: 11.5, align: 'center', weight: 700 });
      };
      const gx = ax.x + ax.w + 88;
      draw1(gx, 88, 0, 'hover', C.slate);
      draw1(gx, 190, s.v, s.v < 1 ? 'still a hover' : 'moving', C.mint);

      const by = 300;
      const cells = [
        ['induced velocity', `${f1(vi)} m/s`, C.sakura],
        ['of its hover value', `${f0(g * 100)} percent`, C.amber],
        ['induced power, same thrust', `${f0(g * 100)} percent`, C.mint],
      ];
      cells.forEach(([k, v, c], i) => {
        const px = 54 + i * ((W - 108) / 3);
        text(ctx, k, px, by - 17, { fill: C.slate, size: 10.5 });
        text(ctx, v, px, by + 3, { fill: c, size: 16, weight: 700, mono: true });
      });
      note(ctx, 24, H - 11, 'glauert inflow. zero correction in a pure climb, so the hover checks do not move');
    },
  }),

  /*
   * The term without which a quad corners like a brick on ice. Its whole
   * argument is a comparison, so the figure is a comparison.
   */
  hforce: () => makeFigure({
    id: 'hforce',
    label: 'Rotor drag against body drag, across the speed range',
    eyebrow: 'The missing drag in the middle',
    w: 680,
    h: 330,
    animated: false,
    controls: [
      { key: 'v', label: 'Speed', min: 0, max: 40, step: 0.5, value: 12, fmt: (v) => `${f0(v * 3.6)} km/h` },
    ],
    caption: 'Body drag goes as speed squared, so a value fitted to top speed is almost nothing in the middle of the range, and a quad tuned that way floats through corners. An edgewise disc also pulls backwards, and that force is nearly linear in speed before it saturates. Below the crossover this figure marks, the rotors are doing more of the braking than the airframe is, which is the whole reason this term had to exist separately.',
    draw(ctx, W, H, s) {
      const hTot = (v) => 4 * hForce(v, HOVER_T);
      const bTot = (v) => bodyDrag(v, P.cdaFront);
      const ax = new Axes(ctx, {
        x: 56, y: 54, w: W * 0.60, h: 192, xmin: 0, xmax: 40, ymin: 0, ymax: 13,
        xlabel: 'speed, m/s', ylabel: 'newtons',
      });
      ax.frame({ xticks: [0, 10, 20, 30, 40], yticks: [0, 4, 8, 12], fmtX: f0, fmtY: f0 });
      ax.fn(hTot, C.sakura, 2.8);
      ax.fn(bTot, C.amber, 2.8);
      ax.fn((v) => hTot(v) + bTot(v), alpha(C.cream, 0.55), 2, 200, [5, 4]);
      /* Where the two swap over, computed rather than asserted. */
      let cross = 0;
      for (let v = 0.5; v < 40; v += 0.05) {
        if (bTot(v) >= hTot(v)) { cross = v; break; }
      }
      ax.vline(cross, alpha(C.cream, 0.25), [3, 4], `they swap at ${f0(cross * 3.6)} km/h`, C.slate);
      ax.mark(s.v, hTot(s.v), C.sakura, 5);
      ax.mark(s.v, bTot(s.v), C.amber, 5);
      ax.key([
        ['four rotors, H-force', C.sakura],
        ['airframe, quadratic', C.amber],
        ['total', alpha(C.cream, 0.55)],
      ]);

      const bx = ax.x + ax.w + 30;
      const rows = [
        ['Rotor drag', `${f2(hTot(s.v))} N`, C.sakura],
        ['Body drag', `${f2(bTot(s.v))} N`, C.amber],
        ['Rotors are', `${f0((hTot(s.v) / Math.max(1e-6, hTot(s.v) + bTot(s.v))) * 100)} percent`, C.cream],
      ];
      rows.forEach(([k, v, c], i) => {
        const y = 74 + i * 52;
        text(ctx, k, bx, y, { fill: C.slate, size: 10.5 });
        text(ctx, v, bx, y + 21, { fill: c, size: 17, weight: 700, mono: true });
      });

      /* The picture the numbers are about. */
      const px = bx + 6;
      const py = 250;
      line(ctx, px - 6, py, px + 74, py, C.slate, 5);
      ctx.save();
      ctx.strokeStyle = alpha(C.cream, 0.75);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(px + 4, py - 16, 24, 5, 0, 0, Math.PI * 2);
      ctx.ellipse(px + 64, py - 16, 24, 5, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
      arrow(ctx, px + 34, py - 16, px + 34 - 12 - hTot(s.v) * 9, py - 16, C.sakura, 2.4, 8);
      text(ctx, 'the discs pull back', px + 34, py + 22, { fill: C.sakura, size: 10.5, align: 'center' });
      note(ctx, 24, H - 11, 'k = 0.43842, fitted to a published hover drag on a 0.6 kg five inch');
    },
  }),

  /*
   * Three areas, three curves, and the reason one number for all of them
   * makes an aircraft that is equally slippery in every direction.
   */
  drag: () => makeFigure({
    id: 'drag',
    label: 'Quadratic body drag on three different presented areas',
    eyebrow: 'A bluff object, three ways round',
    w: 680,
    h: 320,
    animated: false,
    controls: [
      { key: 'v', label: 'Speed', min: 0, max: 40, step: 0.5, value: 20, fmt: (v) => `${f0(v * 3.6)} km/h` },
      {
        key: 'face',
        label: 'Presenting',
        type: 'pick',
        value: 'front',
        options: [
          { label: 'Nose in', value: 'front' },
          { label: 'Belly, flaring', value: 'plan' },
          { label: 'Sideways', value: 'side' },
        ],
      },
    ],
    caption: 'The three areas are different on purpose. Nose in is a small pile of projected junk. The belly is the whole airframe. Sideways adds the battery, which is longer than it is wide. Copying one number onto all three makes a machine that flares no harder than it cruises, which no real five inch does. Note the belly figure is not allowed to stand in for rotor drag: the discs are modelled separately.',
    draw(ctx, W, H, s) {
      const areas = { plan: P.cdaPlan, front: P.cdaFront, side: P.cdaSide };
      const names = { plan: 'belly', front: 'nose in', side: 'sideways' };
      const cols = { plan: C.sakura, front: C.mint, side: C.amber };
      const ax = new Axes(ctx, {
        x: 56, y: 54, w: W * 0.58, h: 186, xmin: 0, xmax: 40, ymin: 0, ymax: 22,
        xlabel: 'speed, m/s', ylabel: 'newtons',
      });
      ax.frame({ xticks: [0, 10, 20, 30, 40], yticks: [0, 5, 10, 15, 20], fmtX: f0, fmtY: f0 });
      for (const k of ['plan', 'side', 'front']) {
        ax.fn((v) => bodyDrag(v, areas[k]), alpha(cols[k], k === s.face ? 1 : 0.32), k === s.face ? 3 : 2);
      }
      ax.hline(P.weight, alpha(C.cream, 0.2), [3, 5], 'the craft\'s own weight');
      ax.mark(s.v, bodyDrag(s.v, areas[s.face]), C.cream, 5);
      ax.key(Object.keys(areas).map((k) => [`${names[k]}, CdA ${areas[k].toFixed(4)} m2`, alpha(cols[k], k === s.face ? 1 : 0.4)]));

      const bx = ax.x + ax.w + 34;
      /* The airframe drawn in the attitude the pick names. */
      const cx = bx + 74;
      const cy = 120;
      ctx.save();
      ctx.translate(cx, cy);
      if (s.face === 'plan') { ctx.rotate(-1.1); }
      if (s.face === 'side') { ctx.rotate(0.2); ctx.scale(0.55, 1); }
      line(ctx, -54, 0, 54, 0, C.slate, 7);
      roundRect(ctx, -16, -11, 32, 22, 3, C.deep, C.amber, 1.6);
      ctx.restore();
      for (let i = -2; i <= 2; i += 1) {
        arrow(ctx, cx - 108, cy + i * 18, cx - 58, cy + i * 18, alpha(C.slate, 0.45), 1.6, 6);
      }
      text(ctx, 'airflow', cx - 108, cy - 54, { fill: C.slate, size: 10.5 });

      text(ctx, 'Drag right now', bx, 208, { fill: C.slate, size: 10.5 });
      text(ctx, `${f1(bodyDrag(s.v, areas[s.face]))} N`, bx, 232, { fill: cols[s.face], size: 22, weight: 700, mono: true });
      text(ctx, `${f0((bodyDrag(s.v, areas[s.face]) / P.weight) * 100)} percent of its own weight`, bx, 252, {
        fill: C.slate, size: 11,
      });
      text(ctx, 'These were one number for all three axes before the H-force existed,', 56, 288, { fill: C.slate, size: 11 });
      text(ctx, 'and they were quietly doing two jobs. Re-fit against the top speed procedure.', 56, 297, { fill: C.slate, size: 11 });
      note(ctx, 24, H - 11, 'F = -0.5 rho CdA v |v|, per body axis');
    },
  }),

  /*
   * Twenty millimetres. It sounds like nothing and it is the difference
   * between a quad and a flat plate.
   */
  noseup: () => makeFigure({
    id: 'noseup',
    label: 'Rotor drag acting above the centre of gravity, as a pitching couple',
    eyebrow: 'Why the nose lifts at speed',
    w: 680,
    h: 320,
    animated: false,
    controls: [
      { key: 'v', label: 'Speed', min: 0, max: 40, step: 0.5, value: 25, fmt: (v) => `${f0(v * 3.6)} km/h` },
    ],
    caption: 'The discs sit about 20 mm above the centre of gravity, so the rearward pull they make in fast flight is not just drag, it is a couple. Every real multirotor carries this and every real pilot trims it out with a touch of forward stick, or lets the I term hold it. Before this term existed the pitching moment in forward flight was identically zero at every speed, which is one of the loudest ways a simulator can tell on itself.',
    draw(ctx, W, H, s) {
      const hTot = 4 * hForce(s.v, HOVER_T);
      const moment = hTot * P.discZ;
      const accel = moment / P.inertia.pitch;

      const cx = W * 0.30;
      const cy = 168;
      const scale = 1400;
      /* Side view, exaggerated in z so 20 mm is visible at all. */
      line(ctx, cx - 130, cy, cx + 130, cy, alpha(C.cream, 0.10), 1.2, [4, 5]);
      line(ctx, cx - 92, cy + 6, cx + 92, cy + 6, C.slate, 6);
      const discY = cy + 6 - P.discZ * scale;
      ctx.save();
      ctx.strokeStyle = alpha(C.cream, 0.8);
      ctx.lineWidth = 2.4;
      for (const dx of [-70, 70]) {
        ctx.beginPath();
        ctx.ellipse(cx + dx, discY, 34, 6, 0, 0, Math.PI * 2);
        ctx.stroke();
        line(ctx, cx + dx, discY, cx + dx, cy + 6, alpha(C.slate, 0.7), 3);
      }
      ctx.restore();
      dot(ctx, cx, cy + 6, 5.5, C.amber);
      text(ctx, 'centre of gravity', cx + 12, cy + 24, { fill: C.amber, size: 10.5 });
      line(ctx, cx - 118, discY, cx - 118, cy + 6, C.amber, 1.4);
      text(ctx, '20 mm', cx - 124, (discY + cy) / 2, { fill: C.amber, size: 10.5, align: 'right', baseline: 'middle' });

      if (s.v > 0.5) {
        arrow(ctx, cx + 20, discY, cx + 20 - 24 - hTot * 22, discY, C.sakura, 3, 9);
        text(ctx, `${f2(hTot)} N of rotor drag, up here`, cx - 6, discY - 16, { fill: C.sakura, size: 11, align: 'center' });
        /* The couple, as a curved arrow, because that is what it does. */
        ctx.save();
        ctx.strokeStyle = C.mint;
        ctx.lineWidth = 2.6;
        ctx.beginPath();
        ctx.arc(cx, cy + 6, 62, Math.PI * 1.15, Math.PI * 1.75);
        ctx.stroke();
        ctx.restore();
        arrow(ctx, cx + 44, cy - 40, cx + 58, cy - 50, C.mint, 2.6, 8);
        text(ctx, 'nose up', cx + 66, cy - 54, { fill: C.mint, size: 11.5, weight: 700 });
      }
      arrow(ctx, cx - 150, cy + 44, cx - 96, cy + 44, alpha(C.slate, 0.6), 2, 7);
      text(ctx, 'flying this way', cx - 150, cy + 62, { fill: C.slate, size: 10.5 });

      const bx = W * 0.60;
      panel(ctx, bx, 44, W - bx - 24, 234, C.mint);
      eyebrow(ctx, 'what the couple is worth', bx + 18, 68);
      const rows = [
        ['Rotor drag, all four', `${f2(hTot)} N`, C.sakura],
        ['Lever above the CG', `${f0(P.discZ * 1000)} mm`, C.amber],
        ['Pitching moment', `${f3(moment)} N m`, C.cream],
        ['Nose up acceleration', `${f0((accel * 180) / Math.PI)} deg/s2`, C.mint],
      ];
      rows.forEach(([k, v, c], i) => {
        const y = 100 + i * 44;
        text(ctx, k, bx + 18, y, { fill: C.slate, size: 10.5 });
        text(ctx, v, W - 40, y, { fill: c, size: 16, weight: 700, mono: true, align: 'right' });
        line(ctx, bx + 18, y + 13, W - 40, y + 13, alpha(C.cream, 0.06), 1);
      });
      text(ctx, 'This is what an I term holds for you.', bx + 18, 268, { fill: C.mint, size: 12, weight: 700 });
      note(ctx, 24, H - 11, 'a pure z force at (x, y, z) has moment (y F, -x F, 0). in-plane H at that z is the couple');
    },
  }),

  /*
   * The one honest source of roll to yaw coupling on a symmetric frame:
   * the frame is not symmetric, because nothing built by hand is.
   */
  cant: () => makeFigure({
    id: 'cant',
    label: 'Build tolerance motor cant, and the yaw it leaks during a roll',
    eyebrow: 'Nothing is built straight',
    w: 680,
    h: 330,
    animated: false,
    controls: [
      { key: 'roll', label: 'Roll demand', min: 0, max: 0.5, step: 0.01, value: 0.3, fmt: (v) => `${f0(v * 100)} percent` },
      { key: 'scale', label: 'Cant, x the table', min: 0, max: 3, step: 0.05, value: 1, fmt: (v) => `${f2(v)} x` },
    ],
    caption: 'On a perfect QUADX every roll pair holds one clockwise and one counter clockwise motor, so drag torque, spin-up reaction and angular momentum all cancel and a roll cannot produce yaw. Real frames are not perfect. About a degree of tangential cant per arm turns some of each rotor\'s thrust into a yaw lever, and because the roll makes the four thrusts unequal, that lever no longer cancels. Set the cant to zero and watch the coupling vanish.',
    draw(ctx, W, H, s) {
      const M = [
        { tag: 'RR', x: 1, y: 1, roll: -1, cant: P.cantDeg.RR },
        { tag: 'FR', x: 1, y: -1, roll: -1, cant: P.cantDeg.FR },
        { tag: 'RL', x: -1, y: 1, roll: 1, cant: P.cantDeg.RL },
        { tag: 'FL', x: -1, y: -1, roll: 1, cant: P.cantDeg.FL },
      ];
      const yawTorque = (rollCmd) => M.reduce((acc, m) => {
        const T = HOVER_T * (1 + m.roll * rollCmd);
        return acc + T * Math.sin((m.cant * s.scale * Math.PI) / 180) * P.arm;
      }, 0);
      const hoverTq = yawTorque(0);
      const rollTq = yawTorque(s.roll);

      const cx = W * 0.28;
      const cy = 166;
      const arm = 84;
      quadPlan(ctx, cx, cy, arm, { color: alpha(C.slate, 0.75) });
      for (const m of M) {
        const mx = cx + m.x * arm;
        const my = cy + m.y * arm;
        const T = HOVER_T * (1 + m.roll * s.roll);
        rotor(ctx, mx, my, 30, 0, { load: 0.15 + (T / HOVER_T - 0.6) * 0.7, squash: 1, color: C.cream });
        /* Tangential cant, drawn as the lever it is. */
        const tang = Math.atan2(-m.x, m.y);
        const mag = Math.sin((m.cant * s.scale * Math.PI) / 180) * (T / HOVER_T) * 900;
        if (Math.abs(mag) > 0.8) {
          arrow(ctx, mx, my, mx + Math.cos(tang) * mag, my + Math.sin(tang) * mag,
            mag > 0 ? C.mint : C.sakura, 2.2, 7);
        }
        text(ctx, `${m.cant > 0 ? '+' : ''}${f1(m.cant * s.scale)}`, mx, my + 46, {
          fill: C.slate, size: 10.5, align: 'center', mono: true,
        });
      }
      text(ctx, 'tangential cant, degrees', cx, cy + arm + 62, { fill: C.slate, size: 11, align: 'center' });

      const ax = new Axes(ctx, {
        x: W * 0.56, y: 56, w: W - W * 0.56 - 30, h: 148,
        xmin: 0, xmax: 0.5, ymin: -0.0022, ymax: 0.0022,
        xlabel: 'roll demand', ylabel: 'yaw torque, N m',
      });
      ax.frame({ xticks: [0, 0.25, 0.5], yticks: [-0.002, 0, 0.002], fmtX: (v) => `${f0(v * 100)}%`, fmtY: (v) => v.toFixed(3) });
      ax.fn(yawTorque, C.sakura, 2.6, 60);
      ax.mark(s.roll, rollTq, C.cream, 5);
      const rows = [
        ['At a hover', `${(hoverTq * 1000).toFixed(2)} mN m`, C.slate],
        ['During this roll', `${(rollTq * 1000).toFixed(2)} mN m`, C.sakura],
        ['Yaw acceleration', `${f1(((rollTq / P.inertia.yaw) * 180) / Math.PI)} deg/s2`, C.cream],
      ];
      rows.forEach(([k, v, c], i) => {
        const px = W * 0.56 + i * ((W - W * 0.56 - 24) / 3);
        text(ctx, k, px, 250, { fill: C.slate, size: 10 });
        text(ctx, v, px, 270, { fill: c, size: 13, weight: 700, mono: true });
      });
      wrapText(ctx, s.scale === 0 ? 'Perfectly built: no coupling at all.' : 'Small, constant, and exactly what a yaw I term trims.',
        W * 0.56, 296, W - W * 0.56 - 26, { fill: s.scale === 0 ? C.mint : C.slate, size: 11.5, lead: 15 });
      note(ctx, 24, H - 11, 'radial cant cancels the hover side force. it cannot yaw');
    },
  }),

  /*
   * Yaw is the leftover, and the figure that matters is the one where it
   * runs out: at full throttle there is nowhere left to speed up.
   */
  yawtorque: () => makeFigure({
    id: 'yawtorque',
    label: 'Yaw authority against throttle, and where it runs out',
    eyebrow: 'Paid for in prop drag',
    w: 680,
    h: 330,
    animated: false,
    controls: [
      { key: 'throttle', label: 'Throttle', min: 0.1, max: 1, step: 0.01, value: 0.5, fmt: (v) => `${f0(v * 100)} percent` },
      { key: 'yaw', label: 'Yaw demand', min: 0, max: 0.3, step: 0.01, value: 0.2, fmt: (v) => `${f0(v * 100)} percent` },
    ],
    caption: 'There is no tail rotor. To turn right the mixer speeds the two counter clockwise props and slows the two clockwise ones, and the frame is turned by the difference in the drag torque those props are absorbing. Push the throttle up and the motors that were supposed to speed up have nowhere to go, so the demand becomes one sided and authority collapses. That is why yaw dies in a punch, and why airmode exists at the other end.',
    draw(ctx, W, H, s) {
      const V = FULL.voc;
      const net = (thr, yawCmd) => {
        const up = Math.min(1, thr + yawCmd);
        const dn = Math.max(0, thr - yawCmd);
        const a = motorSteady(up, V);
        const b = motorSteady(dn, V);
        return 2 * (a.torque - b.torque);
      };
      const ideal = (thr, yawCmd) => {
        const a = motorSteady(thr + yawCmd, V);
        const b = motorSteady(Math.max(0, thr - yawCmd), V);
        return 2 * (a.torque - b.torque);
      };
      const now = net(s.throttle, s.yaw);
      const want = ideal(s.throttle, s.yaw);

      const ax = new Axes(ctx, {
        x: 56, y: 54, w: W * 0.58, h: 190, xmin: 0.1, xmax: 1, ymin: 0, ymax: Math.max(0.09, ideal(0.5, 0.3) * 1.2),
        xlabel: 'throttle', ylabel: 'yaw torque, N m',
      });
      /* Ticks derived from the axis, because ymax is computed and a
         hardcoded list left the curve in unlabelled space. */
      const yTop = ax.ymax;
      ax.frame({
        xticks: [0.25, 0.5, 0.75, 1],
        yticks: [0, yTop / 3, (2 * yTop) / 3, yTop],
        fmtX: (v) => `${f0(v * 100)}%`,
        fmtY: (v) => v.toFixed(2),
      });
      ax.fn((x) => ideal(x, s.yaw), alpha(C.slate, 0.55), 2, 120, [5, 4]);
      ax.fn((x) => net(x, s.yaw), C.mint, 2.8, 120);
      ax.mark(s.throttle, now, C.cream, 5);
      ax.key([['what the mixer asks for', alpha(C.slate, 0.55)], ['what the motors can give', C.mint]]);

      /* The four motors as bars, because the ceiling is the story. */
      const bx = ax.x + ax.w + 34;
      const names = ['0 RR', '1 FR', '2 RL', '3 FL'];
      const cmds = [s.throttle - s.yaw, s.throttle + s.yaw, s.throttle + s.yaw, s.throttle - s.yaw];
      eyebrow(ctx, 'the four duties', bx, 62);
      cmds.forEach((c, i) => {
        const y = 84 + i * 34;
        const clipped = c > 1 || c < 0;
        text(ctx, names[i], bx, y + 8, { fill: C.slate, size: 10.5, mono: true });
        meter(ctx, bx + 40, y, W - bx - 64, 12, Math.max(0, Math.min(1, c)), clipped ? C.sakura : C.mint);
        if (clipped) {
          text(ctx, 'clipped', W - 24, y + 9, { fill: C.sakura, size: 10, align: 'right', weight: 700 });
        }
      });
      const lost = want > 1e-9 ? 1 - now / want : 0;
      text(ctx, 'Authority lost to the ceiling', bx, 250, { fill: C.slate, size: 10.5 });
      text(ctx, `${f0(lost * 100)} percent`, bx, 274, { fill: lost > 0.2 ? C.sakura : C.mint, size: 20, weight: 700, mono: true });
      note(ctx, 24, H - 11, 'prop drag torque is kq w |w|, and it is all the yaw there is');
    },
  }),

  /*
   * The physics that a D term is often quietly standing in for.
   */
  damping: () => makeFigure({
    id: 'damping',
    label: 'A roll rate decaying because the air opposes it',
    eyebrow: 'The air damps before the PID does',
    w: 680,
    h: 320,
    still: 1.4,
    controls: [
      { key: 'aero', label: 'Aero damping', type: 'toggle', value: true, on: 'modelled', off: 'deleted' },
    ],
    caption: 'Roll and one side\'s props are climbing while the other side\'s are sinking, so through the advance ratio curve they are making different thrust, and that difference is a torque opposing the roll. It is not large, but it is the thing that makes letting go of the stick feel like letting go rather than like releasing a rubber band. An older version of this plant clamped the descent case and deleted this derivative entirely; a tune that felt right on that plant had a D term quietly standing in for physics.',
    reset: (s, sc) => {
      /* Solved in one pass, so the toggle answers immediately and a still
         frame carries the whole decay rather than the start of one. */
      const k = rollDamping(HOVER_W);
      sc.tr = [];
      let p = 0;
      for (let i = 0; i <= 2400; i += 1) {
        const tt = i * 0.001;
        const drive = tt < 0.4 ? 0.08 : 0;
        p += ((drive - (s.aero ? k : 0) * p) / P.inertia.roll) * 0.001;
        sc.tr.push([tt, (p * 180) / Math.PI]);
      }
    },
    draw(ctx, W, H, s, t, sc) {
      const k = rollDamping(HOVER_W);
      const cursor = ((t * 0.32) % 1) * 2.4;

      const ax = new Axes(ctx, {
        x: 54, y: 54, w: W * 0.56, h: 190, xmin: 0, xmax: 2.4, ymin: 0, ymax: 1400,
        xlabel: 'seconds. Stick released at 0.4 s.', ylabel: 'roll rate, deg/s',
      });
      ax.frame({ xticks: [0, 0.8, 1.6, 2.4], yticks: [0, 400, 800, 1200], fmtX: (v) => v.toFixed(1), fmtY: f0 });
      ax.vline(0.4, alpha(C.cream, 0.2), [3, 4], 'let go', C.slate);
      ax.series(sc.tr, s.aero ? C.mint : C.sakura, 2.8);
      ax.mark(cursor, sc.tr[Math.min(2400, Math.round(cursor * 1000))][1], C.cream, 4);
      text(ctx, s.aero ? 'It settles on its own.' : 'Nothing stops it but the PID.',
        ax.x, ax.y + ax.h + 44, { fill: s.aero ? C.mint : C.sakura, size: 12, weight: 700 });

      /* The mechanism, once, on the right. */
      const cx = ax.x + ax.w + 100;
      const cy = 128;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(-0.22);
      line(ctx, -74, 0, 74, 0, C.slate, 6);
      ctx.restore();
      const up = { x: cx + 72, y: cy - 16 };
      const dn = { x: cx - 72, y: cy + 16 };
      ctx.save();
      ctx.strokeStyle = alpha(C.cream, 0.8);
      ctx.lineWidth = 2.2;
      for (const q of [up, dn]) {
        ctx.beginPath();
        ctx.ellipse(q.x, q.y - 8, 28, 5, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();
      arrow(ctx, up.x, up.y + 6, up.x, up.y - 30, C.sakura, 2.2, 7);
      arrow(ctx, dn.x, dn.y - 6, dn.x, dn.y + 30, C.mint, 2.2, 7);
      text(ctx, 'climbing,', up.x, up.y - 44, { fill: C.sakura, size: 10.5, align: 'center' });
      text(ctx, 'makes less', up.x, up.y - 32, { fill: C.sakura, size: 10.5, align: 'center' });
      text(ctx, 'sinking,', dn.x, dn.y + 48, { fill: C.mint, size: 10.5, align: 'center' });
      text(ctx, 'makes more', dn.x, dn.y + 60, { fill: C.mint, size: 10.5, align: 'center' });
      text(ctx, `${(k * 1000).toFixed(2)} mN m per rad/s`, cx, 234, {
        fill: C.cream, size: 12.5, align: 'center', weight: 700, mono: true,
      });
      text(ctx, 'derived, not chosen: from the arm,', cx, 252, { fill: C.slate, size: 10.5, align: 'center' });
      text(ctx, 'the thrust and the pitch speed', cx, 266, { fill: C.slate, size: 10.5, align: 'center' });
      note(ctx, 24, H - 11, 'yaw has the drag torque version of the same argument');
    },
  }),

  /*
   * Four gyroscopes, mostly cancelling. Where they stop cancelling is the
   * interesting part, and it is not where people expect.
   */
  gyroscopic: () => makeFigure({
    id: 'gyroscopic',
    label: 'Net rotor angular momentum for a roll, a pitch and a yaw',
    eyebrow: 'Four gyroscopes, opposed',
    w: 680,
    h: 320,
    still: 2,
    controls: [
      {
        key: 'ask',
        label: 'Ask for',
        type: 'pick',
        value: 'roll',
        options: [
          { label: 'Roll', value: 'roll' },
          { label: 'Pitch', value: 'pitch' },
          { label: 'Yaw', value: 'yaw' },
        ],
      },
    ],
    caption: 'Each bell is a small gyroscope, and the four are deliberately opposed so they cancel at a hover. What is worth noticing is which demands break that cancellation. Roll and pitch split the airframe into pairs that each hold one clockwise and one counter clockwise prop, so the net stays near zero. Yaw does not: it speeds up both props that spin the same way. The rigid body\'s own Euler coupling is separate and never cancels.',
    draw(ctx, W, H, s, t) {
      const M = [
        { tag: '0 RR', x: 1, y: 1, cw: 1, roll: -1, pitch: 1, yaw: -1 },
        { tag: '1 FR', x: 1, y: -1, cw: -1, roll: -1, pitch: -1, yaw: 1 },
        { tag: '2 RL', x: -1, y: 1, cw: -1, roll: 1, pitch: 1, yaw: 1 },
        { tag: '3 FL', x: -1, y: -1, cw: 1, roll: 1, pitch: -1, yaw: -1 },
      ];
      const cmd = 0.30;
      const netH = M.reduce((acc, m) => {
        const w = HOVER_W * Math.sqrt(Math.max(0.05, 1 + m[s.ask] * cmd));
        return acc + m.cw * P.jRotor * w;
      }, 0);
      const hoverH = M.reduce((acc, m) => acc + m.cw * P.jRotor * HOVER_W, 0);

      const cx = W * 0.27;
      const cy = 162;
      const arm = 82;
      quadPlan(ctx, cx, cy, arm, { color: alpha(C.slate, 0.7) });
      for (const m of M) {
        const w = HOVER_W * Math.sqrt(Math.max(0.05, 1 + m[s.ask] * cmd));
        const mx = cx + m.x * arm;
        const my = cy + m.y * arm;
        rotor(ctx, mx, my, 32, m.cw * t * (w / 120), {
          load: 0.15 + (w / HOVER_W - 0.7) * 0.7, squash: 1, color: m.cw > 0 ? C.sakura : C.mint,
        });
        const h = m.cw * P.jRotor * w;
        arrow(ctx, mx, my, mx, my - h * 2400, m.cw > 0 ? C.sakura : C.mint, 2, 7);
        text(ctx, m.tag, mx, my + 48, { fill: C.slate, size: 10, align: 'center', mono: true });
      }

      const bx = W * 0.55;
      panel(ctx, bx, 48, W - bx - 24, 218, Math.abs(netH) > 1e-4 ? C.sakura : C.mint);
      eyebrow(ctx, 'net rotor angular momentum', bx + 18, 74);
      text(ctx, `${(netH * 1000).toFixed(2)}`, bx + 18, 116, { fill: C.cream, size: 30, weight: 700, mono: true });
      text(ctx, 'milli kg m2 per second', bx + 18, 136, { fill: C.slate, size: 11 });
      const scaleW = W - bx - 60;
      const maxH = 4 * P.jRotor * HOVER_W;
      line(ctx, bx + 18 + scaleW / 2, 158, bx + 18 + scaleW / 2, 190, alpha(C.cream, 0.2), 1.4);
      const barW = (netH / maxH) * (scaleW / 2);
      roundRect(ctx, bx + 18 + scaleW / 2 + Math.min(0, barW), 166, Math.abs(barW) + 1, 16, 2,
        Math.abs(netH) > 1e-4 ? C.sakura : C.mint);
      text(ctx, `at a hover it is ${(hoverH * 1000).toFixed(2)}`, bx + 18, 208, { fill: C.slate, size: 11 });
      text(ctx, Math.abs(netH) > 1e-4
        ? 'Not cancelling. This one tugs on the other axes.'
        : 'Still cancelling. The pairs are opposed.',
      bx + 18, 240, { fill: Math.abs(netH) > 1e-4 ? C.sakura : C.mint, size: 12, weight: 700 });
      note(ctx, 24, H - 11, 'tau includes minus omega x (I omega + h_prop). The Euler part never cancels.');
    },
  }),

  /*
   * The spectrum is the honest picture of why filters exist. A time trace
   * shows noise; a spectrum shows where it is, which is the whole game.
   */
  gyronoise: () => makeFigure({
    id: 'gyronoise',
    label: 'Rotor lines and a broadband hump, in the gyro but not in the airframe',
    eyebrow: 'What the gyro says happened',
    w: 680,
    h: 348,
    still: 1.1,
    controls: [
      { key: 'throttle', label: 'Throttle', min: 0.15, max: 1, step: 0.01, value: 0.45, fmt: (v) => `${f0(v * 100)} percent` },
      { key: 'lpf', label: 'Gyro low pass', min: 40, max: 500, step: 5, value: 250, fmt: (v) => `${f0(v)} Hz` },
    ],
    caption: 'The airframe is rotating smoothly. The gyro is not reporting that. Imbalance puts a line at each rotor\'s own frequency, which climbs with throttle, and the frame contributes a broad hump between 80 and 350 Hz. None of this is in the rigid body: it is injected into the reading, which is exactly where it lives on a real aircraft. A perfectly clean gyro would make D gain free and the whole filter chain decorative, and neither is true.',
    draw(ctx, W, H, s, t) {
      const V = FULL.voc;
      const base = motorSteady(s.throttle, V).w;
      const lines = [-0.04, -0.012, 0.015, 0.045].map((k) => (base * (1 + k)) / (2 * Math.PI));
      const resp = (hz) => 1 / Math.sqrt(1 + (hz / s.lpf) ** 2);

      const ax = new Axes(ctx, {
        x: 54, y: 54, w: W - 82, h: 148, xmin: 0, xmax: 520, ymin: 0, ymax: 1.05,
        xlabel: 'hertz', ylabel: 'amplitude',
      });
      ax.frame({ xticks: [0, 100, 200, 300, 400, 500], yticks: [0, 0.5, 1], fmtX: f0, fmtY: (v) => v.toFixed(1) });
      /* The broadband hump the frame itself contributes. */
      ax.fn((hz) => 0.30 * Math.exp(-(((hz - 215) / 105) ** 2)), alpha(C.sakura, 0.35), 2);
      ax.fn((hz) => 0.30 * Math.exp(-(((hz - 215) / 105) ** 2)) * resp(hz), C.mint, 2.2);
      for (const hz of lines) {
        if (hz > 515) { continue; }
        line(ctx, ax.px(hz), ax.py(0), ax.px(hz), ax.py(0.82), alpha(C.sakura, 0.55), 2);
        line(ctx, ax.px(hz), ax.py(0), ax.px(hz), ax.py(0.82 * resp(hz)), C.mint, 2.4);
      }
      ax.fn((hz) => resp(hz), alpha(C.amber, 0.7), 1.8, 200, [5, 4]);
      ax.vline(s.lpf, alpha(C.amber, 0.45), [3, 4], `cut ${f0(s.lpf)} Hz`, C.amber);
      text(ctx, 'four rotor lines, nearly on top of each other',
        ax.px(lines[0]) + 16, ax.py(0.92), { fill: C.sakura, size: 10.5 });
      text(ctx, 'frame hump', ax.px(90), ax.py(0.30), { fill: C.sakura, size: 10.5, align: 'right' });
      ax.key([['what the gyro sees', alpha(C.sakura, 0.5)], ['what survives the filter', C.mint], ['filter response', alpha(C.amber, 0.7)]]);

      /* The same story in time, because that is what a D term differentiates. */
      const ax2 = new Axes(ctx, {
        x: 54, y: 254, w: W - 82, h: 62, xmin: 0, xmax: 0.08, ymin: -70, ymax: 70,
        ylabel: 'the same signal over 80 milliseconds',
      });
      ax2.frame({ yticks: [] });
      const truth = (tt) => 40 * Math.sin(tt * 26 + t);
      const dirty = (tt) => truth(tt) + lines.reduce((a, hz) => a + 9 * Math.sin(tt * hz * 2 * Math.PI + hz), 0)
        + 7 * Math.sin(tt * 215 * 2 * Math.PI + t * 3);
      const pts = [];
      const ptsT = [];
      let filt = 0;
      const a = pt1Gain(s.lpf, 0.0002);
      for (let i = 0; i <= 400; i += 1) {
        const tt = (0.08 * i) / 400;
        filt += (dirty(tt) - filt) * a;
        pts.push([tt, dirty(tt)]);
        ptsT.push([tt, filt]);
      }
      ax2.series(pts, alpha(C.sakura, 0.45), 1.4);
      ax2.series(ptsT, C.mint, 2);
      ax2.fn(truth, alpha(C.cream, 0.4), 1.6, 120, [4, 4]);
      text(ctx, 'dashed is what the airframe really did', ax2.x + ax2.w, ax2.y - 10, {
        fill: alpha(C.cream, 0.6), size: 10.5, align: 'right',
      });
      note(ctx, 24, H - 11, `rotor lines at ${f0(lines[0])} Hz and up, climbing with throttle`);
    },
  }),

  /*
   * The radio, which is the one part of the chain a sim is tempted to make
   * perfect. Perfect is a choice here, and it is visible as a choice.
   */
  radio: () => makeFigure({
    id: 'radio',
    label: 'A packet grid with delay, jitter and loss, and what feedforward does with it',
    eyebrow: 'Perfect is a setting',
    w: 680,
    h: 340,
    animated: false,
    controls: [
      {
        key: 'link',
        label: 'Link',
        type: 'pick',
        value: 'perfect',
        options: [
          { label: 'Perfect', value: 'perfect' },
          { label: 'ELRS 250 Hz', value: 'elrs' },
          { label: 'Crossfire 150 Hz', value: 'crsf' },
        ],
      },
    ],
    caption: 'Feedforward and RC smoothing both work on the rate of change of the stick, which means they work on the packet grid rather than on your hand. A perfect grid makes that derivative unnaturally clean and makes a high F gain look free. Turn a real link on and the same gain becomes motor activity. Perfect is the default so a lap time never moves underneath you, not because it is realistic.',
    draw(ctx, W, H, s, t) {
      const cfg = {
        perfect: { hz: 250, delay: 0, jitter: 0, loss: 0, name: 'an exact 4 ms grid, no delay, nothing lost' },
        elrs: { hz: 250, delay: 0.004, jitter: 0.0008, loss: 0.05, name: 'ELRS 250 Hz: 4 ms of delay, 0.8 ms of jitter' },
        crsf: { hz: 150, delay: 0.0067, jitter: 0.0015, loss: 0.08, name: 'Crossfire 150 Hz: 6.7 ms of delay, 1.5 ms of jitter' },
      }[s.link];
      const span = 0.14;
      /*
       * A flick, because that is the input feedforward exists for and the
       * one a jittery link ruins. The window is fixed and the whole move is
       * inside it, so the figure is complete in any single frame.
       */
      const stick = (tt) => {
        const u = Math.max(0, Math.min(1, (tt - 0.035) / 0.045));
        return -0.8 + 1.6 * (u * u * (3 - 2 * u));
      };

      const ax = new Axes(ctx, {
        x: 54, y: 56, w: W - 82, h: 118, xmin: 0, xmax: span, ymin: -1.15, ymax: 1.15,
        ylabel: 'stick',
      });
      ax.frame({ yticks: [-1, 0, 1], fmtY: f0, xticks: [0, 0.05, 0.1], fmtX: (v) => `${f0(v * 1000)} ms` });
      ax.fn(stick, alpha(C.cream, 0.55), 2.4, 200, [5, 4]);

      /* One deterministic realisation of this link across the window. */
      const rnd = xorshift(0xbeef);
      const recv = [];
      const lost = [];
      const n = Math.ceil(span * cfg.hz) + 1;
      for (let i = 0; i < n; i += 1) {
        const ideal = i / cfg.hz;
        const j = (rnd() - 0.5) * 2 * cfg.jitter;
        if (rnd() < cfg.loss) { lost.push(ideal + cfg.delay); continue; }
        recv.push({ at: ideal + cfg.delay + j, v: stick(ideal) });
      }
      const stair = [];
      recv.forEach((pk, i) => {
        stair.push([pk.at, pk.v]);
        stair.push([i + 1 < recv.length ? recv[i + 1].at : span, pk.v]);
      });
      ax.series(stair, C.mint, 2.2);
      for (const pk of recv) {
        if (pk.at <= span) { dot(ctx, ax.px(pk.at), ax.py(pk.v), 3, C.mint); }
      }
      for (const at of lost) {
        if (at > span) { continue; }
        text(ctx, 'x', ax.px(at), ax.py(stick(at - cfg.delay)), {
          fill: C.sakura, size: 15, align: 'center', baseline: 'middle', weight: 700,
        });
      }
      ax.key([['your hand', alpha(C.cream, 0.55)], ['what the FC received', C.mint]]);

      /*
       * The derivative between consecutive packets. This is the quantity
       * feedforward multiplies, and it is where an uneven grid shows up:
       * a late packet makes a small step look like a fast one, and a lost
       * packet makes the next one look violent.
       */
      const ax2 = new Axes(ctx, {
        x: 54, y: 216, w: W - 82, h: 84, xmin: 0, xmax: span, ymin: 0, ymax: 62,
        ylabel: 'rate of change between packets, the number feedforward multiplies',
      });
      ax2.frame({ yticks: [0, 30, 60], fmtY: f0, xticks: [] });
      let worst = 0;
      for (let i = 1; i < recv.length; i += 1) {
        const dv = recv[i].v - recv[i - 1].v;
        const dtq = Math.max(1e-4, recv[i].at - recv[i - 1].at);
        const rate = Math.abs(dv / dtq);
        worst = Math.max(worst, rate);
        const px = ax2.px(recv[i].at);
        line(ctx, px, ax2.py(0), px, ax2.py(Math.min(62, rate)), cfg.jitter ? C.sakura : C.amber, 2.4);
      }
      text(ctx, cfg.name, W - 26, 34, { fill: C.slate, size: 11.5, align: 'right' });
      text(ctx, `biggest step the FC saw: ${f0(worst)} per second`, W - 26, ax2.y - 10, {
        fill: cfg.jitter ? C.sakura : C.amber, size: 11.5, align: 'right', weight: 700,
      });
      text(ctx, cfg.jitter
        ? 'Uneven bars from an even hand. This is what the averaging and smoothing clauses are for.'
        : 'Even bars, because the grid is exact. A high F gain looks free here, and is not.',
      54, ax2.y + ax2.h + 22, { fill: C.slate, size: 11.5 });
      note(ctx, 24, H - 11, 'shaped in the shell. the wasm module stays bit identical for a given stream');
    },
  }),

  /*
   * Where the plant stops. Worth a picture mostly for the absence it draws:
   * the ground effect bump that is not there.
   */
  collide: () => makeFigure({
    id: 'collide',
    label: 'Collision as a shell query, and the ground cushion that is not modelled',
    eyebrow: 'Outside the integrator',
    w: 680,
    h: 320,
    still: 1,
    controls: [
      { key: 'pass', label: 'Pass distance', min: 0, max: 90, step: 1, value: 22, fmt: (v) => `${f0(v)} cm` },
    ],
    caption: 'The integrator does not know that trees exist. It integrates a rigid body in free air, and the shell separately sweeps a sphere against capsules and may hand the state back deflected. The right hand panel is the more useful admission: a real rotor gains thrust within about one radius of the ground, and this plant does not model that, so a hover at ankle height takes exactly the same throttle as a hover at head height.',
    draw(ctx, W, H, s, t) {
      const cx = 44;
      const cy = 158;
      const trunkX = 214;
      const r = 26;
      const hit = s.pass < 34;
      /* The capsule. */
      ctx.save();
      ctx.strokeStyle = alpha(C.mint, 0.8);
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.roundRect(trunkX - 11, cy - 86, 22, 172, 11);
      ctx.stroke();
      ctx.restore();
      text(ctx, 'capsule', trunkX, cy + 104, { fill: C.mint, size: 10.5, align: 'center' });

      const k = (t * 0.35) % 1;
      const pathY = cy - 58 + s.pass * 1.5;
      /* The swept volume, which is the thing actually tested. */
      ctx.save();
      ctx.fillStyle = alpha(C.amber, 0.09);
      ctx.beginPath();
      ctx.roundRect(cx, pathY - r, 300, r * 2, r);
      ctx.fill();
      ctx.restore();
      line(ctx, cx, pathY, cx + 300, pathY, alpha(C.amber, 0.4), 1.4, [5, 5]);
      const px = cx + 300 * k;
      ctx.save();
      ctx.strokeStyle = hit && px > trunkX - 40 && px < trunkX + 40 ? C.sakura : C.amber;
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.arc(px, pathY, r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
      text(ctx, 'swept sphere', cx + 6, pathY - r - 10, { fill: C.amber, size: 10.5 });
      const gap = Math.abs(pathY - cy) - 11 - r;
      text(ctx, hit ? 'hit, sim_deflect may be called' : `misses by ${f0(Math.max(0, gap) * 0.6)} cm`,
        cx + 6, cy + 122, { fill: hit ? C.sakura : C.mint, size: 12, weight: 700 });

      const ax = new Axes(ctx, {
        x: 404, y: 62, w: W - 434, h: 176, xmin: 0, xmax: 3, ymin: 0.9, ymax: 1.28,
        xlabel: 'height, rotor radii', ylabel: 'thrust, x free air',
      });
      ax.frame({ xticks: [0, 1, 2, 3], yticks: [1, 1.1, 1.2], fmtX: f0, fmtY: (v) => v.toFixed(1) });
      ax.fn((x) => 1 + 0.22 * Math.exp(-x * 1.7), alpha(C.sakura, 0.5), 2.2, 120, [5, 4]);
      ax.fn(() => 1, C.mint, 2.8);
      ax.key([['a real rotor', alpha(C.sakura, 0.5)], ['this plant', C.mint]], ax.y + ax.h + 26, ax.x);
      text(ctx, 'no ground effect, on purpose and on the record', 404, 268, { fill: C.slate, size: 11 });
      note(ctx, 24, H - 11, 'a landing stops the integrator. a crash is a penalty, not a bounce');
    },
  }),

  /*
   * The contract. Not animated, because a list of absences should sit
   * still and be read.
   */
  missing: () => makeFigure({
    id: 'missing',
    label: 'What is modelled, what is chosen, and what is simply absent',
    eyebrow: 'The contract',
    w: 680,
    h: 340,
    animated: false,
    caption: 'Three categories, and mixing them up is how a wiki becomes fiction. A textbook result can be checked against the textbook. A chosen constant is somebody\'s judgement about feel and can only be checked against a flight. An absence cannot be reasoned about at all, which is why it is worth naming rather than leaving for a reader to reverse engineer out of silence.',
    draw(ctx, W, H) {
      const cols = [
        ['From the literature', C.mint, [
          'Momentum theory figure of merit',
          'Glauert inflow in edgewise flow',
          'The vortex ring gap shape',
          'Rigid body Euler equations',
          'Quadratic bluff body drag',
          'First order rotor dynamics',
        ]],
        ['Chosen, for feel', C.amber, [
          'k_propwash, 0.08 of thrust',
          'Gyro line and hump amplitudes',
          'The motor cant table',
          'H-force constant k = 0.43842',
          'Inflow asymmetry set',
        ]],
        ['Not modelled at all', C.sakura, [
          'Wind, and ground effect',
          'Blade element theory',
          'Motor inductance, ESC limits',
          'Thermal models of anything',
          'Flexible arms, aeroelasticity',
          'GPS, mag, baro, dual gyro',
          'Dynamic notch at 1 kHz',
        ]],
      ];
      const cw = (W - 72) / 3;
      cols.forEach(([title, color, items], i) => {
        const x = 24 + i * (cw + 12);
        panel(ctx, x, 40, cw, H - 74, color);
        text(ctx, title.toUpperCase(), x + 16, 66, { fill: color, size: 10, weight: 700, track: 1.2 });
        items.forEach((it, j) => {
          const y = 96 + j * 30;
          dot(ctx, x + 20, y - 4, 2.6, alpha(color, 0.8));
          let ln = '';
          let yy = y;
          ctx.save();
          ctx.font = '400 11.5px system-ui, sans-serif';
          for (const wd of it.split(' ')) {
            const test = ln ? `${ln} ${wd}` : wd;
            if (ctx.measureText(test).width > cw - 48) {
              text(ctx, ln, x + 32, yy, { fill: alpha(C.cream, 0.82), size: 11.5 });
              yy += 15;
              ln = wd;
            } else { ln = test; }
          }
          ctx.restore();
          text(ctx, ln, x + 32, yy, { fill: alpha(C.cream, 0.82), size: 11.5 });
        });
      });
      text(ctx, 'A phenomenon you need for a paper is in the source or it is in this third column.', 24, H - 14, {
        fill: C.slate, size: 11,
      });
    },
  }),

  /*
   * The one place where matching a real number makes the picture worse.
   */
  lens: () => makeFigure({
    id: 'lens',
    label: 'What a field of view number does to the size of a gate',
    eyebrow: 'The camera is not the plant',
    w: 680,
    h: 330,
    animated: false,
    controls: [
      { key: 'fov', label: 'Vertical field of view', min: 55, max: 150, step: 1, value: 85, fmt: (v) => `${f0(v)} deg` },
      { key: 'tilt', label: 'Camera tilt', min: 0, max: 55, step: 1, value: 30, fmt: (v) => `${f0(v)} deg` },
    ],
    caption: 'An FPV lens is a fisheye and this renderer is rectilinear, so the number printed on the lens is not the number to type in. Matching a 155 degree fisheye by its printed figure makes every gate tiny and unflyable; matching its centre magnification instead lands near 85 degrees, which is the default. Camera tilt changes nothing about the flight and everything about the line you will fly, because a racer flies a picture.',
    draw(ctx, W, H, s) {
      const gateH = 1.5;
      const dist = 10;
      const ang = (2 * Math.atan(gateH / 2 / dist) * 180) / Math.PI;
      const frac = ang / s.fov;

      const vx = 40;
      const vy = 52;
      const vw = W * 0.44;
      const vh = vw * (9 / 16);
      roundRect(ctx, vx, vy, vw, vh, 4, 'rgba(10, 15, 11, 0.85)', alpha(C.cream, 0.16), 1.4);
      /* Horizon, moved by tilt so the effect of the mount is visible. */
      const hy = vy + vh * (0.5 + (s.tilt / s.fov) * 1.1);
      if (hy > vy + 6 && hy < vy + vh - 6) {
        line(ctx, vx + 2, hy, vx + vw - 2, hy, alpha(C.slate, 0.55), 1.6);
        text(ctx, 'horizon', vx + vw - 8, hy - 7, { fill: C.slate, size: 10, align: 'right' });
      }
      const gh = vh * frac;
      const gw = gh * 0.9;
      const gcy = hy - gh * 0.4;
      ctx.save();
      ctx.strokeStyle = C.amber;
      ctx.lineWidth = Math.max(1.4, gh * 0.09);
      ctx.strokeRect(vx + vw / 2 - gw / 2, gcy - gh / 2, gw, gh);
      ctx.restore();
      text(ctx, 'a gate at 10 metres', vx + vw / 2, vy + vh - 12, { fill: C.slate, size: 10.5, align: 'center' });
      text(ctx, 'what you would see', vx, vy - 10, { fill: C.cream, size: 11.5, weight: 700 });

      const bx = vx + vw + 34;
      /* The two projections, as the plan view that explains the number. */
      const cx = bx + 70;
      const cy = 150;
      const half = (s.fov * Math.PI) / 360;
      ctx.save();
      ctx.fillStyle = alpha(C.mint, 0.10);
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, 108, -Math.PI / 2 - half, -Math.PI / 2 + half);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
      line(ctx, cx, cy, cx + Math.sin(half) * 108, cy - Math.cos(half) * 108, C.mint, 2);
      line(ctx, cx, cy, cx - Math.sin(half) * 108, cy - Math.cos(half) * 108, C.mint, 2);
      dot(ctx, cx, cy, 4, C.amber);
      text(ctx, `${f0(s.fov)} deg`, cx, cy - 124, { fill: C.mint, size: 12, align: 'center', weight: 700 });

      const rows = [
        ['The gate subtends', `${f1(ang)} deg`, C.slate],
        ['Of the picture height', `${f1(frac * 100)} percent`, C.amber],
        ['At the 85 degree default', `${f1((ang / 85) * 100)} percent`, C.mint],
        ['At a printed 150', `${f1((ang / 150) * 100)} percent`, C.sakura],
      ];
      rows.forEach(([k, v, c], i) => {
        const y = 236 + i * 26;
        text(ctx, k, bx, y, { fill: C.slate, size: 11 });
        text(ctx, v, W - 28, y, { fill: c, size: 12.5, weight: 700, mono: true, align: 'right' });
      });
      note(ctx, 24, H - 11, 'gate scale cannot fix this: a bigger gate seen from further away is the same picture');
    },
  }),

  /*
   * The centrepiece. Real gains, real scale factors, a real airframe, and
   * every slider misbehaves in the way the article says it will.
   */
  pid: () => makeFigure({
    id: 'pid',
    label: 'A rate step, with the three gains a pilot actually types',
    eyebrow: 'Drag the gains',
    w: 680,
    h: 372,
    still: 0.34,
    controls: [
      { key: 'p', label: 'P roll', min: 0, max: 140, step: 1, value: 45, fmt: f0, resets: true },
      { key: 'i', label: 'I roll', min: 0, max: 200, step: 1, value: 80, fmt: f0, resets: true },
      { key: 'd', label: 'D roll', min: 0, max: 90, step: 1, value: 30, fmt: f0, resets: true },
      { key: 'relax', label: 'iterm relax', type: 'toggle', value: true, on: 'on', off: 'off' },
      { key: 'noise', label: 'Gyro noise', type: 'toggle', value: false, on: 'real', off: 'clean' },
    ],
    caption: 'These are the numbers from the CLI, through Betaflight\'s own scale factors, driving this airframe\'s real inertia and its real 30 millisecond rotor lag. Take D to zero and it rings, because the actuator is slower than the loop wants to be. Take I to zero and it never quite arrives. Turn iterm relax off and a stick move winds the accumulator into an overshoot, which is the bounce people report coming out of a flip. Turn the gyro noise on and watch what D is really costing.',
    /*
     * Solve the whole seven hundred millisecond step in one pass whenever a
     * gain changes, then draw all of it. Building the trace frame by frame
     * meant a slider took most of a second to answer, and it meant a reader
     * on reduced motion got a single frame's worth of curve, which is no
     * curve at all. Seven hundred integration steps is nothing.
     */
    reset: (s, sc) => {
      const target = 400;
      const loop = rateLoop({ p: s.p, i: s.i, d: s.d, f: 0, relax: s.relax, noise: s.noise ? 1 : 0 });
      sc.tr = [];
      sc.duty = [];
      sc.peak = 0;
      sc.peakAt = null;
      sc.t63 = null;
      sc.settled = 0;
      for (let k = 0; k <= 700; k += 1) {
        const tt = k * 0.001;
        const r = loop.step(tt < 0.05 ? 0 : target);
        sc.tr.push([tt, r.rate]);
        sc.duty.push([tt, r.duty]);
        if (tt > 0.05) {
          if (r.rate > sc.peak) { sc.peak = r.rate; sc.peakAt = tt; }
          if (sc.t63 == null && r.rate >= target * 0.632) { sc.t63 = tt - 0.05; }
        }
        sc.settled = r.rate;
      }
    },
    draw(ctx, W, H, s, t, sc) {
      const target = 400;
      const cursor = ((t * 0.5) % 1) * 0.7;
      const at = Math.min(700, Math.round(cursor * 1000));

      const ax = new Axes(ctx, {
        x: 54, y: 54, w: W - 84, h: 182, xmin: 0, xmax: 0.7, ymin: -70,
        ymax: Math.max(560, sc.peak * 1.18),
        ylabel: 'roll rate, deg/s',
      });
      ax.frame({ xticks: [0, 0.2, 0.4, 0.6], yticks: [0, 200, 400], fmtX: (v) => `${f0(v * 1000)} ms`, fmtY: f0 });
      ax.hline(target, alpha(C.sakura, 0.55), [5, 4], 'what you asked for', 0.78);
      ax.series(sc.tr, C.mint, 2.6);
      ax.mark(cursor, sc.tr[at][1], C.cream, 4);
      if (sc.peak > target * 1.04 && sc.peakAt != null) {
        /* A bracket at the peak, rather than a second full width rule
           printing on top of the one just below it. */
        const px = ax.px(sc.peakAt);
        line(ctx, px, ax.py(target), px, ax.py(sc.peak), C.amber, 1.6);
        line(ctx, px - 5, ax.py(sc.peak), px + 5, ax.py(sc.peak), C.amber, 1.6);
        text(ctx, `${f0((sc.peak / target - 1) * 100)} percent over`, px + 10, ax.py(sc.peak) + 4, {
          fill: C.amber, size: 11, weight: 700,
        });
      }

      const ax2 = new Axes(ctx, {
        x: 54, y: 286, w: W - 84, h: 52, xmin: 0, xmax: 0.7, ymin: -0.35, ymax: 0.35,
        ylabel: 'what the motors were asked to do about it',
      });
      ax2.frame({ yticks: [0], fmtY: () => '0' });
      ax2.series(sc.duty, C.amber, 1.8);

      const badges = [
        ['overshoot', `${f0(Math.max(0, sc.peak / target - 1) * 100)}%`,
          sc.peak / target > 1.15 ? C.sakura : C.mint],
        ['to 63 percent', sc.t63 != null ? `${f0(sc.t63 * 1000)} ms` : 'never',
          sc.t63 != null && sc.t63 < 0.04 ? C.mint : C.amber],
        ['settled at', f0(sc.settled), Math.abs(sc.settled - target) < 12 ? C.mint : C.sakura],
      ];
      badges.forEach(([k, v, c], i) => {
        const x = W - 24 - (badges.length - 1 - i) * 118;
        text(ctx, k, x, 18, { fill: C.slate, size: 10, align: 'right' });
        text(ctx, v, x, 36, { fill: c, size: 16, weight: 700, mono: true, align: 'right' });
      });
      note(ctx, 24, H - 11, 'compiled pid.c scale factors on this airframe\'s real inertia and rotor lag');
    },
  }),

  /*
   * Rates are the one part of a tune that is a preference rather than a
   * consequence. Showing the curve is showing the preference.
   */
  rates: () => makeFigure({
    id: 'rates',
    label: 'Betaflight ACTUAL rates: what the stick asks for at every position',
    eyebrow: 'Yours, not the airframe\'s',
    w: 680,
    h: 346,
    still: 1.6,
    controls: [
      { key: 'rc', label: 'Centre sensitivity', min: 1, max: 20, step: 1, value: 7, fmt: (v) => `${f0(v * 10)} deg/s` },
      { key: 'sr', label: 'Max rate', min: 10, max: 120, step: 1, value: 67, fmt: (v) => `${f0(v * 10)} deg/s` },
      { key: 'expo', label: 'Expo', min: 0, max: 100, step: 1, value: 0, fmt: (v) => f2(v / 100) },
    ],
    caption: 'ACTUAL rates are the curve whose two ends mean what they say: centre sensitivity is degrees per second per unit of stick right at the middle, and max rate is what full stick gives. Expo bends the middle down without touching either end, which is how you aim precisely and still keep the top. The dot is a stick sweeping; watch how much of the travel lives in the calm part as expo comes up.',
    draw(ctx, W, H, s, t) {
      /*
       * Betaflight's ACTUAL curve takes stickMovement as max(0, srate*10 -
       * centre), so once centre exceeds max the expo term is multiplied by
       * zero and the curve is a straight line whose end is the centre
       * sensitivity, not the max rate. Plotting against s.sr in that regime
       * put the curve outside the frame and printed an end value the formula
       * never returns.
       */
      const maxR = Math.max(s.sr * 10, s.rc * 10);
      const degenerate = s.rc * 10 > s.sr * 10;
      const ax = new Axes(ctx, {
        x: 56, y: 54, w: W - 86, h: 200, xmin: -1, xmax: 1, ymin: -maxR * 1.06, ymax: maxR * 1.06,
        xlabel: 'stick', ylabel: 'deg/s asked for',
      });
      ax.frame({
        xticks: [-1, -0.5, 0, 0.5, 1], yticks: [-maxR, -maxR / 2, 0, maxR / 2, maxR],
        fmtX: (v) => v.toFixed(1), fmtY: f0,
      });
      /* Default, for comparison, so a change is legible as a change. */
      ax.fn((x) => actualRate(x, 7, 67, 0), alpha(C.slate, 0.4), 1.8, 200, [5, 4]);
      ax.fn((x) => actualRate(x, s.rc, s.sr, s.expo), C.mint, 2.8);
      const stick = Math.sin(t * 1.1);
      ax.mark(stick, actualRate(stick, s.rc, s.sr, s.expo), C.cream, 5.5);
      ax.key([['this curve', C.mint], ['4.5.1 default, 670 max', alpha(C.slate, 0.4)]]);
      if (degenerate) {
        text(ctx, 'Centre sensitivity is above max rate, so the curve is a straight line and expo does nothing.',
          ax.x, ax.y + ax.h + 44, { fill: C.sakura, size: 11.5, weight: 700 });
      }
      /* The centre tangent, which is what the first number literally means. */
      const c = s.rc * 10;
      line(ctx, ax.px(-0.3), ax.py(-0.3 * c), ax.px(0.3), ax.py(0.3 * c), alpha(C.amber, 0.6), 1.6, [4, 4]);
      text(ctx, 'the slope at centre is the first number', ax.px(0.32), ax.py(0.32 * c), { fill: C.amber, size: 10.5 });

      const cells = [
        ['Stick right now', f2(stick), C.slate],
        ['Asking for', `${f0(actualRate(stick, s.rc, s.sr, s.expo))} deg/s`, C.cream],
        ['At full stick', `${f0(actualRate(1, s.rc, s.sr, s.expo))} deg/s`, C.mint],
        ['Half stick gives', `${f0(actualRate(0.5, s.rc, s.sr, s.expo))} deg/s`, C.amber],
      ];
      cells.forEach(([k, v, col], i) => {
        const x = 56 + i * ((W - 112) / 4);
        text(ctx, k, x, 296, { fill: C.slate, size: 10.5 });
        text(ctx, v, x, 318, { fill: col, size: 15, weight: 700, mono: true });
      });
      note(ctx, 24, H - 11, 'applyActualRates from fc/rc.c. rates live in a rate profile, not in a tune');
    },
  }),

  /*
   * The trade, stated as a trade. Every filter figure that shows only the
   * noise coming down is telling half the story.
   */
  filters: () => makeFigure({
    id: 'filters',
    label: 'What a low pass removes, and what it costs in delay',
    eyebrow: 'You are spending delay',
    w: 680,
    h: 372,
    still: 0.9,
    controls: [
      { key: 'hz', label: 'Cutoff', min: 25, max: 400, step: 5, value: 80, fmt: (v) => `${f0(v)} Hz` },
      {
        key: 'order',
        label: 'Shape',
        type: 'pick',
        value: 1,
        options: [
          { label: 'PT1', value: 1 },
          { label: 'PT2', value: 2 },
          { label: 'PT3', value: 3 },
        ],
      },
    ],
    caption: 'Every filter buys quiet with lateness, and lateness in a feedback loop is phase margin you no longer have. A steeper shape kills more noise at the same cutoff and costs proportionally more delay, which is why PT2 and PT3 are not simply better. The art is spending delay where noise would have cost more, and the two numbers underneath are the entire negotiation.',
    draw(ctx, W, H, s, t) {
      const dt = 0.001;
      const a = pt1Gain(s.hz, dt);
      const groupMs = (s.order * 1000) / (2 * Math.PI * s.hz);
      const truth = (tt) => 240 * Math.sin(tt * 18) + 90 * Math.sin(tt * 5.5);
      const rnd = xorshift(0x1234);
      const noiseTab = Array.from({ length: 900 }, () => rnd() - 0.5);
      const dirty = (i, tt) => truth(tt) + noiseTab[i] * 150 + 70 * Math.sin(tt * 900);

      const ax = new Axes(ctx, {
        x: 54, y: 54, w: W * 0.60, h: 204, xmin: 0, xmax: 0.5, ymin: -420, ymax: 420,
        xlabel: 'half a second', ylabel: 'deg/s',
      });
      ax.frame({ yticks: [-300, 0, 300], fmtY: f0, xticks: [0, 0.25, 0.5], fmtX: (v) => v.toFixed(2) });
      const raw = [];
      const out = [];
      const st = [0, 0, 0];
      let noiseLeft = 0;
      let n = 0;
      for (let i = 0; i < 500; i += 1) {
        const tt = i * dt;
        const d = dirty(i, tt);
        st[0] += (d - st[0]) * a;
        st[1] += (st[0] - st[1]) * a;
        st[2] += (st[1] - st[2]) * a;
        const y = st[s.order - 1];
        raw.push([tt, d]);
        out.push([tt, y]);
        if (i > 60) { noiseLeft += Math.abs(y - truth(tt)); n += 1; }
      }
      ax.series(raw, alpha(C.sakura, 0.3), 1.2);
      ax.series(out, C.mint, 2.4);
      /* Drawn last, because the whole question is how far the green one has
         been dragged away from it. */
      ax.fn(truth, C.cream, 2, 200, [6, 5]);
      ax.key([['gyro as read', alpha(C.sakura, 0.3)], ['the airframe', C.cream], ['after the filter', C.mint]]);
      /* The delay, drawn where it happens rather than only stated. */
      const tm = 0.34;
      const shift = groupMs / 1000;
      line(ctx, ax.px(tm), ax.py(truth(tm)), ax.px(tm + shift), ax.py(truth(tm)), C.amber, 2);
      dot(ctx, ax.px(tm), ax.py(truth(tm)), 3.5, alpha(C.cream, 0.6));
      dot(ctx, ax.px(tm + shift), ax.py(truth(tm)), 3.5, C.amber);
      text(ctx, `${f1(groupMs)} ms late`, ax.px(tm + shift) + 8, ax.py(truth(tm)) - 8, { fill: C.amber, size: 11, weight: 700 });

      const bx = ax.x + ax.w + 32;
      text(ctx, 'Noise still getting through', bx, 78, { fill: C.slate, size: 10.5 });
      const pct = (noiseLeft / n / 118) * 100;
      text(ctx, `${f0(Math.min(100, pct))} percent`, bx, 100, { fill: pct < 25 ? C.mint : C.sakura, size: 19, weight: 700, mono: true });
      meter(ctx, bx, 110, W - bx - 28, 8, Math.min(1, pct / 100), pct < 25 ? C.mint : C.sakura);
      text(ctx, 'Delay you just bought', bx, 156, { fill: C.slate, size: 10.5 });
      text(ctx, `${f1(groupMs)} ms`, bx, 180, { fill: groupMs > 3 ? C.sakura : C.mint, size: 19, weight: 700, mono: true });
      meter(ctx, bx, 190, W - bx - 28, 8, Math.min(1, groupMs / 8), groupMs > 3 ? C.sakura : C.mint);
      text(ctx, 'One millisecond of delay is', bx, 232, { fill: C.slate, size: 11 });
      text(ctx, 'one whole loop iteration.', bx, 248, { fill: C.slate, size: 11 });

      const ax3 = new Axes(ctx, {
        x: 54, y: 300, w: W - 84, h: 34, xmin: 0, xmax: 500, ymin: 0, ymax: 1.05,
        ylabel: 'what the filter does to each frequency, hertz across',
      });
      ax3.frame({ xticks: [0, 100, 200, 300, 400, 500], yticks: [], fmtX: f0 });
      ax3.fn((hz) => (1 / Math.sqrt(1 + (hz / s.hz) ** 2)) ** s.order, C.amber, 2);
      ax3.vline(s.hz, alpha(C.amber, 0.4), [3, 4]);
      note(ctx, 24, H - 8, 'lower hertz is quieter and later. the dynamic notch will not arm at 1 khz');
    },
  }),

  /*
   * Feedforward is not an error term, and the only way to make that
   * obvious is to draw the two contributions separately.
   */
  ff: () => makeFigure({
    id: 'ff',
    label: 'Feedforward leading the stick, next to P waiting for the error',
    eyebrow: 'Before the mistake',
    w: 680,
    h: 348,
    still: 0.42,
    controls: [
      { key: 'f', label: 'Feedforward', min: 0, max: 250, step: 5, value: 120, fmt: f0, resets: true },
      { key: 'jitter', label: 'Link', type: 'toggle', value: false, on: 'ELRS', off: 'perfect' },
    ],
    caption: 'P cannot act until the craft is already wrong, because error is its only input. Feedforward watches how fast the stick is moving and starts the motors on the assumption that you meant it, so the two contributions have completely different timing: the amber one arrives during the stick move and is gone by the time the green one peaks. It is also the term a jittery link ruins, because jitter looks exactly like a violent stick.',
    reset: (s, sc) => {
      /* Solved in one pass for the same reason the PID figure is. */
      const loop = rateLoop({ f: s.f });
      const rnd = xorshift(0xfeed);
      sc.tr = [];
      sc.set = [];
      for (let k = 0; k <= 700; k += 1) {
        const tt = k * 0.001;
        const ramp = Math.max(0, Math.min(1, (tt - 0.06) / 0.09));
        let sp = ramp * 400;
        if (s.jitter && k % 4 === 0) { sp += (rnd() - 0.5) * 70; }
        const r = loop.step(sp);
        sc.set.push([tt, sp]);
        sc.tr.push([tt, r.rate]);
      }
    },
    draw(ctx, W, H, s, t, sc) {
      const cursor = ((t * 0.5) % 1) * 0.7;

      const ax = new Axes(ctx, {
        x: 54, y: 54, w: W - 84, h: 160, xmin: 0, xmax: 0.7, ymin: -60, ymax: 560,
        ylabel: 'deg/s',
      });
      ax.frame({ xticks: [0, 0.2, 0.4, 0.6], yticks: [0, 200, 400], fmtX: (v) => `${f0(v * 1000)} ms`, fmtY: f0 });
      ax.series(sc.set, alpha(C.sakura, 0.65), 1.8);
      ax.series(sc.tr, C.mint, 2.6);
      ax.mark(cursor, sc.tr[Math.min(700, Math.round(cursor * 1000))][1], C.cream, 4);
      ax.key([['stick, as received', alpha(C.sakura, 0.65)], ['what the craft did', C.mint]]);

      /* The two contributions, side by side, which is the whole argument. */
      const ax2 = new Axes(ctx, {
        x: 54, y: 250, w: W - 84, h: 62, xmin: 0, xmax: 0.7, ymin: -0.05, ymax: 1.15,
        ylabel: 'when each term is doing the work',
      });
      ax2.frame({ yticks: [] });
      const ffShape = (x) => {
        const u = (x - 0.06) / 0.09;
        return u > 0 && u < 1 ? (s.f / 250) * (1 - Math.abs(u * 2 - 1)) : 0;
      };
      ax2.fn(ffShape, C.amber, 2.6);
      ax2.fn((x) => {
        const u = (x - 0.09) / 0.30;
        return u > 0 ? Math.max(0, Math.exp(-u * 2.2) * (1 - Math.exp(-u * 9))) * 1.05 : 0;
      }, C.mint, 2.6);
      ax2.key([['feedforward, from the stick', C.amber], ['P, from the error that followed', C.mint]]);
      note(ctx, 24, H - 11, s.jitter
        ? 'a jittery link makes that amber spike out of nothing'
        : 'a perfect grid makes this derivative unnaturally clean');
    },
  }),

  /*
   * Three clauses that all exist for the same reason: a hovering quad and
   * a punching quad are not the same plant.
   */
  tpa: () => makeFigure({
    id: 'tpa',
    label: 'Throttle PID attenuation, and what airmode does at the bottom',
    eyebrow: 'The plant changes with throttle',
    w: 680,
    h: 330,
    animated: false,
    controls: [
      { key: 'rate', label: 'tpa_rate', min: 0, max: 100, step: 1, value: 65, fmt: (v) => f0(v) },
      { key: 'brk', label: 'tpa_breakpoint', min: 1000, max: 2000, step: 10, value: 1350, fmt: f0 },
      { key: 'airmode', label: 'Airmode', type: 'toggle', value: true, on: 'on', off: 'off' },
    ],
    caption: 'The props bite harder at high throttle, so gains that were right at a hover are too much at full stick, and TPA turns them down above a breakpoint. Airmode is the same problem at the other end: chop the throttle and some motors would need to go below idle for the mixer to still have authority, so airmode lets them go negative in arithmetic and then clips against the real floor. Without it, zero throttle is four motors at idle and no control at all.',
    draw(ctx, W, H, s) {
      const atten = (thr) => {
        const bp = (s.brk - 1000) / 1000;
        if (thr <= bp) { return 1; }
        return 1 - ((thr - bp) / (1 - bp)) * (s.rate / 100);
      };
      const ax = new Axes(ctx, {
        x: 54, y: 54, w: W * 0.50, h: 182, xmin: 0, xmax: 1, ymin: 0, ymax: 1.08,
        xlabel: 'throttle', ylabel: 'P and D, x set value',
      });
      ax.frame({ xticks: [0, 0.5, 1], yticks: [0, 0.5, 1], fmtX: (v) => `${f0(v * 100)}%`, fmtY: (v) => v.toFixed(1) });
      ax.fn(atten, C.mint, 2.8, 120);
      ax.vline((s.brk - 1000) / 1000, alpha(C.amber, 0.45), [3, 4], 'breakpoint', C.amber);
      ax.vline(HOVER_DUTY, alpha(C.slate, 0.35), [3, 4], 'hover', C.slate, true);
      text(ctx, `${f0((1 - atten(1)) * 100)} percent off at full stick`, ax.x + ax.w, ax.y + ax.h + 42, {
        fill: C.mint, size: 11.5, align: 'right', weight: 700,
      });

      /* Airmode, as the four numbers it is actually about. */
      const bx = ax.x + ax.w + 44;
      const idle = 0.055;
      const thr = 0;
      const cmds = [thr - 0.18, thr + 0.18, thr + 0.18, thr - 0.18];
      const names = ['0 RR', '1 FR', '2 RL', '3 FL'];
      eyebrow(ctx, 'a flip at zero throttle', bx, 66);
      cmds.forEach((c, i) => {
        const y = 88 + i * 40;
        const applied = s.airmode ? Math.max(idle, c + 0.18) : Math.max(idle, c);
        text(ctx, names[i], bx, y + 9, { fill: C.slate, size: 10.5, mono: true });
        meter(ctx, bx + 42, y, W - bx - 66, 13, applied, applied > idle + 0.01 ? C.mint : alpha(C.slate, 0.5), idle);
        if (!s.airmode && applied <= idle + 0.001) {
          text(ctx, 'stuck at idle', W - 26, y + 10, { fill: C.sakura, size: 10, align: 'right', weight: 700 });
        }
      });
      const after = wrapText(ctx, s.airmode
        ? 'Airmode lifted the whole set so the difference survives. You still have roll.'
        : 'Two motors are already at the floor. The difference is gone, and so is the roll.',
      bx, 262, W - bx - 26, { fill: s.airmode ? C.mint : C.sakura, size: 11.5, weight: 700, lead: 16 });
      text(ctx, 'the pink line is the real idle floor', bx, after + 2, { fill: C.slate, size: 10.5 });
      note(ctx, 24, H - 11, 'anti gravity is a third clause: a high pass on throttle that boosts I during a punch');
    },
  }),

  /*
   * Where PID sums become four numbers, and where they run out of room.
   */
  mixer: () => makeFigure({
    id: 'mixer',
    label: 'Throttle plus three PID sums, resolved into four motor duties',
    eyebrow: 'Four numbers, live',
    w: 680,
    h: 356,
    animated: false,
    controls: [
      { key: 'thr', label: 'Throttle', min: 0, max: 1, step: 0.01, value: 0.45, fmt: (v) => `${f0(v * 100)}%` },
      { key: 'roll', label: 'Roll', min: -0.5, max: 0.5, step: 0.01, value: 0.2, fmt: (v) => f2(v) },
      { key: 'pitch', label: 'Pitch', min: -0.5, max: 0.5, step: 0.01, value: 0, fmt: (v) => f2(v) },
      { key: 'yaw', label: 'Yaw', min: -0.5, max: 0.5, step: 0.01, value: 0, fmt: (v) => f2(v) },
    ],
    caption: 'This is the whole mixer: throttle plus three signed columns, once per motor. Push any demand far enough and a motor hits one end of its range, at which point the mixer can no longer produce the rotation that was asked for, whatever the PID says. That ceiling is the real reason yaw dies in a punch and the real reason a quad at full throttle has no reserve to correct with.',
    draw(ctx, W, H, s) {
      const M = [
        { tag: '0 RR', roll: -1, pitch: 1, yaw: -1 },
        { tag: '1 FR', roll: -1, pitch: -1, yaw: 1 },
        { tag: '2 RL', roll: 1, pitch: 1, yaw: 1 },
        { tag: '3 FL', roll: 1, pitch: -1, yaw: -1 },
      ];
      const idle = 0.055;
      const raw = M.map((m) => s.thr + m.roll * s.roll + m.pitch * s.pitch + m.yaw * s.yaw);
      const clipped = raw.map((v) => Math.max(idle, Math.min(1, v)));
      const anyClip = raw.some((v, i) => Math.abs(v - clipped[i]) > 1e-6);

      const bx = 40;
      const x0 = bx + 52;
      const bw = W - x0 - 96;
      const idleX = x0 + idle * bw;
      /* The rails first, so every bar is read against them. */
      line(ctx, x0 + bw, 58, x0 + bw, 276, alpha(C.sakura, 0.35), 1.4, [4, 4]);
      line(ctx, idleX, 58, idleX, 276, alpha(C.sakura, 0.35), 1.4, [4, 4]);
      text(ctx, 'idle', idleX, 290, { fill: C.sakura, size: 10, align: 'center' });
      text(ctx, 'full', x0 + bw, 290, { fill: C.sakura, size: 10, align: 'center' });
      /*
       * A waterfall, not a stack. Three of the four columns are signed, and
       * a segment that runs backwards has to look like it is taking
       * something away, or the picture says the opposite of the arithmetic.
       */
      /*
       * Bars are clipped to the rails, because a waterfall whose running
       * total is unclamped will happily run a segment hundreds of pixels
       * past the frame when several demands are at their extremes at once.
       * Text is drawn afterwards, outside the clip, or the duty column
       * disappears with it.
       */
      const rowY = (i) => 68 + i * 52;
      ctx.save();
      ctx.beginPath();
      ctx.rect(x0 - 6, 40, bw + 12, 252);
      ctx.clip();
      M.forEach((m, i) => {
        const y = rowY(i);
        let run = 0;
        const seg = (v, col) => {
          if (Math.abs(v) < 1e-9) { return; }
          const a = x0 + run * bw;
          const bpx = x0 + (run + v) * bw;
          const lo = Math.min(a, bpx);
          const w = Math.abs(bpx - a);
          if (v >= 0) {
            roundRect(ctx, lo, y + 3, w, 20, 2, alpha(col, 0.7));
          } else {
            /* Hollow and struck through: this length is being taken away. */
            roundRect(ctx, lo, y + 3, w, 20, 2, alpha(col, 0.13), alpha(col, 0.85), 1.2);
            line(ctx, lo + 3, y + 20, lo + w - 3, y + 6, alpha(col, 0.65), 1.2);
          }
          /*
           * No label inside the bar. In a waterfall the signed segments
           * backtrack over each other, so roll, pitch and yaw can all land
           * in the same band and print three words on one spot. The colour
           * legend above the rows does this job without the collision.
           */
          run += v;
        };
        seg(s.thr, C.amber);
        seg(m.roll * s.roll, C.sakura);
        seg(m.pitch * s.pitch, C.mint);
        seg(m.yaw * s.yaw, C.slate);
        const endX = x0 + clipped[i] * bw;
        line(ctx, endX, y - 1, endX, y + 27, C.cream, 2.2);
        line(ctx, x0, y + 32, x0 + bw, y + 32, alpha(C.cream, 0.05), 1);
      });
      ctx.restore();

      /* Names and the duty column, unclipped. */
      M.forEach((m, i) => {
        const y = rowY(i);
        const off = Math.abs(raw[i] - clipped[i]) > 1e-6;
        text(ctx, m.tag, bx, y + 15, { fill: C.cream, size: 12, weight: 700, mono: true });
        text(ctx, f2(clipped[i]), W - 24, y + 13, {
          fill: off ? C.sakura : C.cream, size: 13, mono: true, weight: 700, align: 'right',
        });
        if (off) {
          text(ctx, raw[i] > 1 ? 'clipped' : 'at idle', W - 24, y + 26, {
            fill: C.sakura, size: 9.5, align: 'right', weight: 700,
          });
        }
      });

      /* One legend, so the colours read without hovering a bar. */
      let lx = x0;
      for (const [label, col] of [['throttle', C.amber], ['roll', C.sakura], ['pitch', C.mint], ['yaw', C.slate]]) {
        roundRect(ctx, lx, 44, 12, 8, 2, alpha(col, 0.7));
        text(ctx, label, lx + 17, 52, { fill: C.slate, size: 10.5 });
        ctx.save();
        ctx.font = '400 10.5px system-ui, sans-serif';
        lx += 17 + ctx.measureText(label).width + 16;
        ctx.restore();
      }
      text(ctx, 'hollow and struck through means subtracted', W - 24, 52, {
        fill: alpha(C.slate, 0.75), size: 10.5, align: 'right',
      });
      text(ctx, 'duty', W - 24, 30, { fill: C.slate, size: 10, align: 'right', weight: 700, track: 1.2 });

      text(ctx, anyClip ? 'The mixer ran out of room.' : 'Every demand fits.', bx, 312, {
        fill: anyClip ? C.sakura : C.mint, size: 13, weight: 700,
      });
      text(ctx, anyClip
        ? 'What comes out is not the rotation that was asked for.'
        : 'What comes out is the rotation that was asked for.',
      bx, 330, { fill: C.slate, size: 11.5 });
      text(ctx, `spread ${f2(Math.max(...clipped) - Math.min(...clipped))}`, W - 24, 312, {
        fill: C.cream, size: 12.5, mono: true, weight: 700, align: 'right',
      });
      note(ctx, 24, H - 11, 'mixtable in mixer.c, then the idle floor');
    },
  }),

  /*
   * One slider, twelve numbers. The point is that the numbers are real,
   * written by the firmware's own code, not by a second tuning model.
   */
  simplified: () => makeFigure({
    id: 'simplified',
    label: 'A simplified slider, and the real gains the firmware writes from it',
    eyebrow: 'A shape, not a second PID',
    w: 680,
    h: 320,
    animated: false,
    controls: [
      { key: 'master', label: 'Master multiplier', min: 50, max: 200, step: 1, value: 100, fmt: (v) => f2(v / 100) },
      { key: 'dgain', label: 'D slider', min: 50, max: 200, step: 1, value: 100, fmt: (v) => f2(v / 100) },
    ],
    caption: 'The sliders are not a second tuning model sitting in front of the real one. Betaflight\'s own simplified_tuning.c is compiled here, so moving a slider writes p_roll and its eleven relatives exactly as the firmware would. That is also the catch: if you type gains and then apply a slider, the slider wins, and a dump that ends with a simplified tuning apply line will quietly overwrite what you typed.',
    draw(ctx, W, H, s) {
      const m = s.master / 100;
      const dg = s.dgain / 100;
      const base = { p_roll: 45, i_roll: 80, d_roll: 30, f_roll: 120, p_pitch: 47, i_pitch: 84, d_pitch: 34, f_pitch: 125, p_yaw: 45, i_yaw: 80, d_yaw: 0, f_yaw: 120 };
      const scaled = (k, v) => {
        if (k.startsWith('d_')) { return Math.round(v * m * dg); }
        return Math.round(v * m);
      };
      const keys = Object.keys(base);
      const sx = 44;
      eyebrow(ctx, 'what the firmware writes', sx, 46);
      keys.forEach((k, i) => {
        const col = i % 4;
        const row = Math.floor(i / 4);
        const x = sx + col * ((W - 88) / 4);
        const y = 78 + row * 62;
        const v = scaled(k, base[k]);
        const moved = v !== base[k];
        text(ctx, k, x, y, { fill: C.slate, size: 10.5, mono: true });
        text(ctx, String(v), x, y + 24, {
          fill: moved ? (v > base[k] ? C.mint : C.sakura) : C.cream, size: 20, weight: 700, mono: true,
        });
        if (moved) {
          text(ctx, `was ${base[k]}`, x + 44, y + 24, { fill: C.slate, size: 10.5 });
        }
      });
      const warn = m !== 1 || dg !== 1;
      text(ctx, warn ? 'These are now the gains. Anything you typed has been overwritten.' : 'Sliders at the middle: the typed gains stand.',
        sx, 282, { fill: warn ? C.amber : C.mint, size: 12, weight: 700 });
      text(ctx, 'simplified_pids_mode is OFF, RP or RPY. The preset files in configs/ depend on this path existing.',
        sx, 302, { fill: C.slate, size: 11 });
    },
  }),

  /*
   * Two different meanings for the same stick, side by side, because that
   * is the only way the difference lands.
   */
  angle: () => makeFigure({
    id: 'angle',
    label: 'The same stick move, read as a rate and read as a tilt',
    eyebrow: 'What the stick means',
    w: 680,
    h: 330,
    still: 2.2,
    controls: [
      { key: 'hold', label: 'Stick held for', min: 0.2, max: 2, step: 0.05, value: 0.8, fmt: (v) => `${f1(v)} s` },
    ],
    caption: 'In acro the stick is a rate: hold it and the craft keeps rotating, let go and it stops rotating wherever it happens to be pointing. In angle the stick is an attitude: hold it and the craft sits at that tilt, let go and it comes back level. Acro is what a racer flies and it is why hands off does not mean upright. Keyboard flight here forces angle, because a key cannot be a good rate stick.',
    draw(ctx, W, H, s, t) {
      const period = 3.2;
      const ph = t % period;
      const on = ph < s.hold;
      const stick = on ? 1 : 0;
      /* Acro integrates the stick. Angle chases it. */
      const acroAng = on ? Math.min(2.6, ph * 3.4) : Math.min(2.6, s.hold * 3.4);
      const angleAng = on ? Math.min(0.62, ph * 5) : Math.max(0, 0.62 - (ph - s.hold) * 4);

      const draw1 = (px, label, ang, note, color) => {
        text(ctx, label, px, 58, { fill: color, size: 15, weight: 700, align: 'center' });
        const cy = 156;
        line(ctx, px - 96, cy, px + 96, cy, alpha(C.cream, 0.10), 1.2, [4, 5]);
        ctx.save();
        ctx.translate(px, cy);
        ctx.rotate(ang);
        line(ctx, -62, 0, 62, 0, C.slate, 7);
        rotor(ctx, -62, -6, 26, 0, { load: 0.45, squash: 0.3, color });
        rotor(ctx, 62, -6, 26, 0, { load: 0.45, squash: 0.3, color });
        roundRect(ctx, -12, -8, 24, 16, 3, C.deep, C.amber, 1.5);
        ctx.restore();
        text(ctx, `${f0((ang * 180) / Math.PI)} deg`, px, cy + 62, { fill: C.cream, size: 13, align: 'center', mono: true, weight: 700 });
        text(ctx, note, px, cy + 84, { fill: C.slate, size: 11, align: 'center' });
      };
      draw1(W * 0.28, 'Acro: a rate', acroAng, on ? 'still rotating' : 'stopped, wherever it got to', C.mint);
      draw1(W * 0.72, 'Angle: a tilt', angleAng, on ? 'holding the tilt' : 'coming back level', C.sakura);

      /* The stick itself, so it is clear the same input drove both. */
      const sx = W / 2 - 110;
      const sy = 270;
      text(ctx, 'the stick', sx - 8, sy - 16, { fill: C.slate, size: 10.5, align: 'right' });
      roundRect(ctx, sx, sy - 8, 220, 16, 8, alpha(C.cream, 0.07));
      roundRect(ctx, sx, sy - 8, stick * 220, 16, 8, alpha(C.amber, 0.75));
      text(ctx, on ? 'held' : 'released', sx + 232, sy + 1, { fill: on ? C.amber : C.slate, size: 11.5, baseline: 'middle', weight: 700 });
      line(ctx, W / 2, 76, W / 2, 244, alpha(C.cream, 0.08), 1.2);
      note(ctx, 24, H - 11, 'horizon mode is stored here but never raised. there is no half self level');
    },
  }),
};

export function wikiFigure(id) {
  const make = FIGURES[id];
  return make ? make() : null;
}

export const FIGURE_IDS = Object.keys(FIGURES);
