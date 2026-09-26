/*
 * stats.js: first-party click counting for the landing page.
 *
 * Mirrors the simulator's src/share/stats.js event envelope and GPC handling.
 * Sends support_click events to the board's stats endpoint when the Support
 * link is clicked. Never blocks navigation.
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

import { boardOrigin } from './config.js';

/*
 * Respects Global Privacy Control the same way the simulator does.
 * Returns true if counting should be blocked.
 */
function privacyRefused() {
  try {
    return navigator.globalPrivacyControl === true;
  } catch (e) {
    return false;
  }
}

/*
 * Sends an event to the board's stats endpoint. For support_click, sends
 * exactly {"v":1,"kind":"support_click","source":"landing"} as the board
 * contract requires.
 *
 * Uses sendBeacon with a fallback to fetch keepalive so the link never
 * blocks, even if the board is down.
 */
function sendEvent(payload) {
  if (privacyRefused()) {
    return false;
  }

  const url = `${boardOrigin()}/api/stats/events`;
  let body;
  
  try {
    body = JSON.stringify({
      v: 1,
      ...payload,
    });
  } catch (e) {
    return false;
  }

  try {
    if (navigator.sendBeacon) {
      return navigator.sendBeacon(
        url,
        new Blob([body], { type: 'text/plain;charset=UTF-8' })
      );
    }
  } catch (e) {
    /* Fall through to fetch. */
  }

  try {
    fetch(url, {
      method: 'POST',
      body,
      keepalive: true,
      headers: { 'content-type': 'text/plain' },
    }).catch(() => {});
    return true;
  } catch (e) {
    return false;
  }
}

/*
 * Called when the Support link is clicked. Sends a support_click event with
 * source='landing'. Does not block the navigation.
 */
export function trackSupportClick() {
  sendEvent({
    kind: 'support_click',
    source: 'landing',
  });
}
