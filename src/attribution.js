/*
 * attribution.js: capture and carry referrer and ref parameter for visit
 * attribution.
 *
 * Captures document.referrer and ?ref= query parameter on landing page load,
 * stores them, and provides them for any subsequent tracking calls. First-party
 * only: no third-party scripts or trackers.
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

const STORAGE_KEY = 'webfpv_attribution';
const SESSION_KEY = 'webfpv_session_start';
const SESSION_DURATION_MS = 30 * 60 * 1000; /* 30 minutes */

/*
 * Extract the domain from a URL. Returns null for invalid URLs or
 * same-origin referrers (internal navigation).
 */
function extractDomain(url) {
  if (!url) {
    return null;
  }
  try {
    const u = new URL(url);
    /* Same origin is internal navigation, not an external referrer */
    if (u.origin === window.location.origin) {
      return null;
    }
    return u.hostname;
  } catch (e) {
    return null;
  }
}

/*
 * Get the current session's attribution data. If this is a new session or
 * the session has expired, capture new attribution data.
 */
export function getAttribution() {
  try {
    const now = Date.now();
    const sessionStart = window.sessionStorage.getItem(SESSION_KEY);
    const stored = window.localStorage.getItem(STORAGE_KEY);
    
    /* Check if we're in an active session */
    const isActiveSession = sessionStart && (now - Number(sessionStart)) < SESSION_DURATION_MS;
    
    if (isActiveSession && stored) {
      /* Return existing attribution for this session */
      return JSON.parse(stored);
    }
    
    /* New session: capture fresh attribution */
    const params = new URLSearchParams(window.location.search);
    const ref = params.get('ref') || null;
    const referrerDomain = extractDomain(document.referrer) || null;
    
    const attribution = {
      ref,
      referrerDomain,
      landingUrl: window.location.pathname + window.location.search,
      timestamp: now,
    };
    
    /* Store attribution data */
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(attribution));
    window.sessionStorage.setItem(SESSION_KEY, String(now));
    
    return attribution;
  } catch (e) {
    /* Storage unavailable or disabled */
    return {
      ref: null,
      referrerDomain: null,
      landingUrl: window.location.pathname,
      timestamp: Date.now(),
    };
  }
}

/*
 * Append attribution parameters to a URL. Use this when linking from the
 * landing page to the simulator or board to carry attribution through.
 */
export function appendAttribution(url) {
  const attr = getAttribution();
  if (!attr.ref && !attr.referrerDomain) {
    return url;
  }
  
  try {
    const u = new URL(url, window.location.origin);
    if (attr.ref) {
      u.searchParams.set('ref', attr.ref);
    }
    if (attr.referrerDomain) {
      u.searchParams.set('referrer', attr.referrerDomain);
    }
    return u.toString();
  } catch (e) {
    return url;
  }
}

/*
 * Capture attribution on page load. Call this once when the landing page
 * loads.
 */
export function captureAttribution() {
  getAttribution();
}
