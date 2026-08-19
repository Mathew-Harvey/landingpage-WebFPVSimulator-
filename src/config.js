/*
 * config.js: where the other two pages live, and nothing else.
 *
 * This page is a static site of its own, so it cannot reach the simulator
 * or the board with a relative path. Those origins are typed here, once,
 * and everything else in the page asks this file. The same three constants
 * appear in the simulator's DEPLOY.md; if a Render service is renamed, this
 * is the file that changes.
 *
 * Local development is detected rather than configured. Serving all three
 * repos on a laptop gives you the simulator on 8000 and the board on 3100,
 * which are the defaults the simulator's own src/share/board.js uses, so a
 * landing page opened from 127.0.0.1 points at the local pair without a
 * build flag or an environment variable, because a static site has neither.
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

export const PRODUCTION_SIM_ORIGIN = 'https://webfpvsimulator.onrender.com';
export const PRODUCTION_BOARD_ORIGIN = 'https://webfpv-board.onrender.com';

export const LOCAL_SIM_ORIGIN = 'http://127.0.0.1:8000';
export const LOCAL_BOARD_ORIGIN = 'http://127.0.0.1:3100';

export const REPOS = {
  sim: 'https://github.com/Mathew-Harvey/WebFPVSimulator',
  board: 'https://github.com/Mathew-Harvey/WebFPVSimulator-LeaderBoard',
};

function isLocal() {
  const h = window.location.hostname;
  return h === 'localhost' || h === '127.0.0.1' || h === '' || h === '[::1]';
}

export function simOrigin() {
  return isLocal() ? LOCAL_SIM_ORIGIN : PRODUCTION_SIM_ORIGIN;
}

export function boardOrigin() {
  return isLocal() ? LOCAL_BOARD_ORIGIN : PRODUCTION_BOARD_ORIGIN;
}

/*
 * The three destinations, in the order the page argues for them: fly
 * something, then build something, then compare. The track builder is a
 * page inside the simulator's static site rather than a service of its
 * own, which is why its path is spelled out; `map=field` is the simulator's
 * built in MultiGP circuit and is what a first visit should land on.
 *
 * IDS AND ADDRESSES ONLY. No titles, no wording, no accents.
 *
 * There used to be a full copy of every card in here, and the page has not
 * read it since the launch links moved into the static markup: index.html
 * is what a visitor sees. So it was three paragraphs of unreachable prose
 * quietly disagreeing with the three the page actually renders, which is
 * how one of them ended up still recommending a keyboard after the others
 * had stopped. The words live in the HTML. This file knows where things
 * are, and that is all it knows.
 */
export function destinations() {
  const sim = simOrigin();
  const board = boardOrigin();
  return [
    { id: 'sim', href: `${sim}/?map=field` },
    { id: 'builder', href: `${sim}/src/trackbuilder/index.html` },
    { id: 'board', href: `${board}/` },
  ];
}
