/*
 * quality.js: one decision, made once, about how much machine is on the
 * other end.
 *
 * There is no settings panel here and there should not be. A landing page
 * gets one shot at a first frame, and a visitor on a phone will not go
 * looking for a quality slider before deciding whether the product is any
 * good. So the page picks, and it picks conservatively: a coarse pointer or
 * a narrow viewport means fewer trees, fewer flags, coarser lathes, a lower
 * pixel ratio and no shadow map.
 *
 * What it does NOT change is the composition, the timing, or any published
 * dimension. A phone gets the same film at a lower resolution, not a
 * different one.
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

/*
 * Read once, at import, and never again. Re-reading it on resize would mean
 * rebuilding geometry mid scroll, and a laptop dragged narrow is still a
 * laptop.
 */
export const LITE = (() => {
  try {
    const coarse = window.matchMedia('(pointer: coarse)').matches;
    const narrow = window.innerWidth < 900;
    return coarse || narrow;
  } catch {
    return false;
  }
})();

/* Segment counts, in one place, so a lathe and the prop it sits under
 * cannot disagree about which machine they are drawing for. */
export const SEG = {
  blade: LITE ? 10 : 16,
  bell: LITE ? 14 : 22,
  lathe: LITE ? 10 : 18,
  round: LITE ? 8 : 12,
  tube: LITE ? 6 : 8,
  trees: LITE ? 90 : 210,
  flags: LITE ? 11 : 18,
  planTube: LITE ? 200 : 460,
  raceTube: LITE ? 220 : 520,
  sky: LITE ? 16 : 24,
};
