/*
 * gate.js: one MultiGP race gate, at the dimensions the simulator publishes.
 *
 * Ported from WebFPVSimulator/src/render/scene.js obstacle() and
 * src/art/banners.js. The numbers are quoted, not chosen:
 *
 *   A standard chapter gate has a 5 ft square clear opening, 1.524 m. The
 *   simulator builds every obstacle 15 percent larger than published,
 *   deliberately and in one named constant, so the built opening is
 *   1.7526 m. The frame is 1.315 in nominal schedule 40 PVC, 33.4 mm, built
 *   at 38.4 mm. Those two figures are the whole reason a 5 inch quad reads
 *   as a 5 inch quad against this thing.
 *
 * What makes it read as a race gate rather than a hoop, in the simulator's
 * own words: a SQUARE opening, a tube frame of four members, printed mesh
 * sleeves outboard of the uprights, and a header board carrying the gate
 * number. Every one of those is here. The number is real geometry on a
 * roundel rather than paint, so it reads at commit range.
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

import * as THREE from 'three';
import { celMaterial, outlineHull, PALETTE as P } from './cel.js';
import { SEG } from './quality.js';

export const FT = 0.3048;
export const IN = FT / 12;
export const FRAME_TUBE_OD = 1.315 * IN;
export const GATE_SCALE = 1.15;
export const BUILT_TUBE_OD = FRAME_TUBE_OD * GATE_SCALE;

export const CLEAR_W = 5 * FT * GATE_SCALE;
export const CLEAR_H = 5 * FT * GATE_SCALE;
export const BANNER_H = 0.58;
export const HEADER_NUMBER_ZONE = 0.22;
export const PANEL_W = 0.42;

const BANNER = {
  vinyl: '#dcd6ca',
  vinylShade: '#c7c0b3',
  navy: '#1e3566',
  red: '#b8332c',
  ink: '#1a1f2b',
  chequerDark: '#23272f',
  chequerLight: '#eae6dd',
};

const DIGITS = {
  0: ['111', '101', '101', '101', '111'],
  1: ['010', '110', '010', '010', '111'],
  2: ['111', '001', '111', '100', '111'],
  3: ['111', '001', '111', '001', '111'],
  4: ['101', '101', '111', '001', '001'],
  5: ['111', '100', '111', '001', '111'],
  6: ['111', '100', '111', '101', '111'],
  7: ['111', '001', '010', '010', '010'],
  8: ['111', '101', '111', '101', '111'],
  9: ['111', '101', '111', '001', '111'],
};

const GATE_COLOUR = 0xffd45c;
const START_COLOUR = 0x7dffb4;
const NEXT_COLOUR = 0x39ff8b;

function chequerBand(ctx, x, y, w, h, cells) {
  const cw = w / Math.max(1, cells);
  const ch = h / 2;
  for (let i = 0; i < cells; i += 1) {
    for (let j = 0; j < 2; j += 1) {
      ctx.fillStyle = (i + j) % 2 === 0 ? BANNER.chequerDark : BANNER.chequerLight;
      ctx.fillRect(x + i * cw, y + j * ch, cw + 0.5, ch + 0.5);
    }
  }
}

function chequerColumn(ctx, x, y, w, h, cells) {
  const ch = h / Math.max(1, cells);
  const cw = w / 2;
  for (let j = 0; j < cells; j += 1) {
    for (let i = 0; i < 2; i += 1) {
      ctx.fillStyle = (i + j) % 2 === 0 ? BANNER.chequerDark : BANNER.chequerLight;
      ctx.fillRect(x + i * cw, y + j * ch, cw + 0.5, ch + 0.5);
    }
  }
}

/*
 * The device that stands in for a sponsor's mark. On the board it is the
 * page's own wordmark rather than a placeholder rectangle, because a course
 * with "LOGO" printed on fourteen gates is a mock and this is not one.
 */
function device(ctx, x, y, w, h) {
  ctx.save();
  ctx.translate(x + w * 0.5, y + h * 0.5);
  ctx.fillStyle = BANNER.ink;
  ctx.font = `800 ${Math.round(h * 0.62)}px system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const t = 'WEB';
  const u = 'FPV';
  const wt = ctx.measureText(t).width;
  const wu = ctx.measureText(u).width;
  ctx.fillText(t, -(wu * 0.5), 0);
  ctx.fillStyle = '#c4677f';
  ctx.fillText(u, wt * 0.5, 0);
  ctx.restore();
}

function canvasTexture(w, h, paint) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');
  paint(ctx, w, h);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function paintHeader(ctx, w, h) {
  ctx.fillStyle = BANNER.vinyl;
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = BANNER.vinylShade;
  ctx.fillRect(0, 0, w, h * 0.045);
  ctx.fillRect(0, h * 0.955, w, h * 0.045);
  chequerBand(ctx, 0, h * 0.88, w, h * 0.075, Math.round(w / (h * 0.06)));
  const left = w * HEADER_NUMBER_ZONE;
  const right = w * (1 - HEADER_NUMBER_ZONE);
  device(ctx, left, h * 0.07, right - left, h * 0.79);
}

function paintSleeve(ctx, w, h, flip) {
  ctx.save();
  if (flip) {
    ctx.translate(w, 0);
    ctx.scale(-1, 1);
  }
  ctx.fillStyle = BANNER.vinyl;
  ctx.fillRect(0, 0, w, h);
  const colW = w * 0.18;
  chequerColumn(ctx, 0, 0, colW, h, Math.round(h / (colW * 0.5)));
  ctx.save();
  ctx.translate(colW + (w - colW) * 0.5, h * 0.48);
  ctx.rotate(-Math.PI / 2);
  device(ctx, -h * 0.22, -(w - colW) * 0.30, h * 0.44, (w - colW) * 0.60);
  ctx.restore();
  ctx.restore();
}

/*
 * The printed kit is made ONCE for a whole course. Every gate wears the
 * same print, exactly as the simulator does it, so fourteen headers can
 * share one texture.
 */
let KIT = null;
function kit() {
  if (KIT) {
    return KIT;
  }
  const header = canvasTexture(512, 112, paintHeader);
  const sleeve = canvasTexture(112, 512, (c, w, h) => paintSleeve(c, w, h, false));
  const sleeveFlipped = canvasTexture(112, 512, (c, w, h) => paintSleeve(c, w, h, true));
  KIT = {
    header: celMaterial({ color: 0xffffff, map: header, rim: 0.16 }),
    sleeve: celMaterial({ color: 0xffffff, map: sleeve, rim: 0.16 }),
    sleeveFlipped: celMaterial({ color: 0xffffff, map: sleeveFlipped, rim: 0.16 }),
  };
  return KIT;
}

let MATS = null;
function mats() {
  if (MATS) {
    return MATS;
  }
  MATS = {
    frame: celMaterial({ color: P.frame, rim: 0.26 }),
    fitting: celMaterial({ color: P.fitting, rim: 0.26 }),
    substrate: celMaterial({ color: 0xdcd6ca, rim: 0.22 }),
    hem: celMaterial({ color: P.hem, rim: 0.18 }),
    number: new THREE.MeshBasicMaterial({ color: P.numberInk }),
  };
  return MATS;
}

/* A printed board: a thin slab with the print on both faces. The simulator
 * builds it as a box with the map on the two large faces; a box takes one
 * material per face, so the sides get the plain substrate and the faces get
 * the print. */
function printedPanel(w, h, d, printMat, substrate) {
  const faces = [substrate, substrate, substrate, substrate, printMat, printMat];
  return new THREE.Mesh(new THREE.BoxGeometry(w, h, d), faces);
}

/*
 * The lit target. Four thin bars just inside the frame, a soft halo behind
 * them, and an additive pane across the opening for the gate the run wants
 * next. The bar is 0.16 m and that is a LEGIBILITY number lifted straight
 * from the simulator: 0.075 m measured sub pixel at the distance a racer has
 * to commit at, so the target was not a target.
 */
function apertureMarkers(group, clearW, clearH, isStart) {
  const colour = isStart ? START_COLOUR : GATE_COLOUR;
  const bar = 0.16;
  const cy = clearH * 0.5;
  const halfW = clearW * 0.5;
  const halfH = clearH * 0.5;
  const parts = [
    [0, cy + halfH - bar * 0.5, clearW, bar],
    [0, cy - halfH + bar * 0.5, clearW, bar],
    [-halfW + bar * 0.5, cy, bar, clearH],
    [halfW - bar * 0.5, cy, bar, clearH],
  ];

  const ringMat = new THREE.MeshBasicMaterial({ color: colour, fog: true });
  const haloMat = new THREE.MeshBasicMaterial({
    color: colour, transparent: true, opacity: 0.5, fog: true,
  });
  const ring = new THREE.Group();
  const halo = new THREE.Group();
  for (const [px, py, sw, sh] of parts) {
    const b = new THREE.Mesh(new THREE.BoxGeometry(sw, sh, bar), ringMat);
    b.position.set(px, py, 0);
    ring.add(b);
    const hgeo = new THREE.BoxGeometry(sw * 1.06 + 0.05, sh * 1.06 + 0.05, bar * 0.7);
    const hm = new THREE.Mesh(hgeo, haloMat);
    hm.position.set(px, py, 0);
    halo.add(hm);
  }
  group.add(ring, halo);

  /* Additive light across the opening, in the gate's own plane so it never
   * has to billboard, unfogged so distance cannot take the target away. */
  const size = Math.max(clearW, clearH) * 2.6;
  const glow = new THREE.Mesh(
    new THREE.PlaneGeometry(size, size),
    new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      /* DOUBLE sided, and this is not a detail. The plane lives in the
       * gate's own frame facing +Z, which is the direction of travel, so a
       * pilot flying at the gate is looking at its BACK. Front side only
       * culls it away and the one cue that says "this is the gate you want
       * next" is invisible from the only place anyone sees it from. */
      side: THREE.DoubleSide,
      uniforms: {
        uGain: { value: 0 },
        uColor: { value: new THREE.Color(NEXT_COLOUR) },
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }`,
      fragmentShader: `
        varying vec2 vUv;
        uniform float uGain;
        uniform vec3 uColor;
        void main() {
          float d = length(vUv - 0.5) * 2.0;
          float a = smoothstep(1.0, 0.0, d);
          a = a * a;
          gl_FragColor = vec4(uColor * a * uGain, a * uGain);
        }`,
    }),
  );
  glow.position.set(0, cy, 0);
  glow.renderOrder = 3;
  group.add(glow);

  return { ring, halo, glow, ringMat, haloMat, colour: new THREE.Color(colour) };
}

/*
 * Build one gate. Local frame: the opening is in the XY plane, the approach
 * runs along Z, and the sill is on the ground at y = 0.
 */
export function buildGate(index, opts = {}) {
  const isStart = Boolean(opts.isStart);
  const g = new THREE.Group();
  g.name = `gate-${index}`;
  const m = mats();
  const k = kit();
  const tubeR = BUILT_TUBE_OD * 0.5;
  const clearW = CLEAR_W;
  const clearH = CLEAR_H;

  const upX = clearW * 0.5 + tubeR;
  const topSurface = clearH;
  const upTop = topSurface + 2 * tubeR;

  /* Uprights, whose INNER surfaces are the opening's width, and a foot each
   * so the gate stands on the ground rather than growing out of it. */
  for (const sx of [-1, 1]) {
    const post = new THREE.Mesh(
      new THREE.CylinderGeometry(tubeR, tubeR, upTop, SEG.tube),
      m.frame,
    );
    post.position.set(sx * upX, upTop * 0.5, 0);
    post.castShadow = true;
    outlineHull(post, 1.06, P.ink);
    g.add(post);

    const foot = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.08, 0.62), m.frame);
    foot.position.set(sx * upX, 0.04, 0);
    foot.castShadow = true;
    g.add(foot);
  }

  /* One cross member, above the opening. A gate standing on grass has the
   * ground as its sill, which is how a 5 ft opening is measured. */
  const memberLen = clearW + 4 * tubeR;
  const memberY = clearH + tubeR;
  const bar = new THREE.Mesh(
    new THREE.CylinderGeometry(tubeR, tubeR, memberLen, SEG.tube),
    m.frame,
  );
  bar.rotation.z = Math.PI * 0.5;
  bar.position.set(0, memberY, 0);
  bar.castShadow = true;
  outlineHull(bar, 1.06, P.ink);
  g.add(bar);

  /* The moulded corner at every junction: it is what says the thing was
   * assembled rather than extruded. */
  const s = tubeR * 2.9;
  for (const sy of [-tubeR, clearH + tubeR]) {
    for (const sx of [-1, 1]) {
      const f = new THREE.Mesh(new THREE.BoxGeometry(s, s, s * 0.92), m.fitting);
      f.position.set(sx * (clearW * 0.5 + tubeR), sy, 0);
      f.castShadow = true;
      g.add(f);
    }
  }

  /* The printed sleeves, outboard of each upright, mirrored on the far leg
   * so the chequer column runs down the OUTSIDE on both sides. */
  const panelH = topSurface;
  for (const sx of [-1, 1]) {
    const cx = sx * (upX + tubeR + PANEL_W * 0.5);
    const sleeve = printedPanel(
      PANEL_W, panelH, 0.03,
      sx < 0 ? k.sleeveFlipped : k.sleeve,
      m.substrate,
    );
    sleeve.position.set(cx, panelH * 0.5, 0);
    sleeve.castShadow = true;
    g.add(sleeve);
  }

  /* The header board, spanning the whole structure, with the number on a
   * roundel at one end. */
  const outerW = 2 * (upX + tubeR + PANEL_W);
  const board = printedPanel(Math.max(0.9, outerW), BANNER_H, 0.05, k.header, m.substrate);
  const header = new THREE.Group();
  header.add(board);

  const glyphs = String(Math.max(0, Math.round(index))).split('').map((d) => DIGITS[Number(d)]);
  const dot = 0.048;
  const step = 0.058;
  const halfGlyphW = ((glyphs.length * 4 - 1) - 1) * 0.5 * step + dot * 0.5;
  const roundelR = Math.min(
    BANNER_H * 0.40,
    Math.hypot(halfGlyphW, 2 * step + dot * 0.5) + 0.03,
  );
  const roundelX = -(Math.max(0.9, outerW) * (0.5 - HEADER_NUMBER_ZONE * 0.5));

  const roundel = new THREE.Mesh(
    new THREE.CylinderGeometry(roundelR, roundelR, 0.062, SEG.lathe), m.hem,
  );
  roundel.rotation.x = Math.PI * 0.5;
  roundel.position.set(roundelX, 0, 0);
  header.add(roundel);

  const rim = new THREE.Mesh(
    new THREE.CylinderGeometry(roundelR * 1.14, roundelR * 1.14, 0.05, SEG.lathe), m.number,
  );
  rim.rotation.x = Math.PI * 0.5;
  rim.position.set(roundelX, 0, 0);
  header.add(rim);

  const glyphW = 4;
  const originX = -((glyphs.length * glyphW - 1) - 1) * 0.5;
  for (let gi = 0; gi < glyphs.length; gi += 1) {
    const rows = glyphs[gi];
    for (let ry = 0; ry < rows.length; ry += 1) {
      for (let rx = 0; rx < 3; rx += 1) {
        if (rows[ry][rx] !== '1') {
          continue;
        }
        for (const sz of [-1, 1]) {
          const pip = new THREE.Mesh(new THREE.BoxGeometry(dot, dot, 0.03), m.number);
          /* Mirrored on the back face, which is what a printed banner does:
           * the reverse is printed reversed so the number reads correctly
           * from whichever side a pilot arrives on. */
          const col = sz > 0 ? rx : 2 - rx;
          pip.position.set(
            roundelX + (originX + gi * glyphW + col) * step,
            (2 - ry) * step,
            sz * 0.036,
          );
          header.add(pip);
        }
      }
    }
  }
  header.position.set(0, upTop + BANNER_H * 0.5 + 0.03, 0);
  g.add(header);

  const marks = apertureMarkers(g, clearW, clearH, isStart);

  g.userData.gate = {
    index,
    isStart,
    clearW,
    clearH,
    centreY: clearH * 0.5,
    ...marks,
  };
  return g;
}

/*
 * Paint one gate's target. `gain` from 0 to 1 drives the additive pane, and
 * `passed` swaps the bars over to the mint the start gate wears, so a course
 * behind you reads as done rather than as still waiting.
 */
const TMP_COLOUR = new THREE.Color();
export function paintGate(gateGroup, gain, passed) {
  const d = gateGroup.userData.gate;
  if (!d) {
    return;
  }
  d.glow.material.uniforms.uGain.value = gain;
  const want = passed ? START_COLOUR : d.colour.getHex();
  TMP_COLOUR.setHex(want);
  d.ringMat.color.lerp(TMP_COLOUR, 0.18);
  d.haloMat.color.copy(d.ringMat.color);
  d.haloMat.opacity = 0.5 + gain * 0.35;
}
