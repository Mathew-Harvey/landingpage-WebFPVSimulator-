/*
 * attribution.js: capture and carry referrer and ref parameter for visit
 * attribution.
 *
 * Captures document.referrer and ?ref= query parameter on landing page load,
 * normalizes and sanitizes them, and stores in sessionStorage. First-party
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

const STORAGE_KEY = 'webfpv.session.attribution';

/*
 * Normalize a ref tag to a safe, canonical form. Max 16 chars, alphanumeric
 * and hyphens only. Known aliases (youtube->yt, twitter->x) are canonicalized.
 * Server-side closed list is the source of truth; this mirrors the board's
 * normalizer.
 */
function normalizeRef(raw) {
  if (!raw || typeof raw !== 'string') {
    return null;
  }
  
  let normalized = raw.toLowerCase().trim();
  
  /* Apply known aliases */
  if (normalized === 'youtube') {
    normalized = 'yt';
  } else if (normalized === 'twitter') {
    normalized = 'x';
  }
  
  /* Strip to alphanumeric and hyphens, max 16 chars */
  normalized = normalized.replace(/[^a-z0-9-]/g, '').slice(0, 16);
  
  return normalized || null;
}

/*
 * Extract hostname from a URL. Returns null for invalid URLs or same-host
 * referrers (internal navigation).
 */
function extractDomain(url) {
  if (!url) {
    return null;
  }
  try {
    const u = new URL(url);
    /* Same hostname is internal navigation, not an external referrer */
    if (u.hostname === window.location.hostname) {
      return null;
    }
    return u.hostname;
  } catch (e) {
    return null;
  }
}

/*
 * Get the current session's attribution data. Reads from sessionStorage
 * if available, otherwise captures fresh attribution from URL and referrer.
 */
export function getAttribution() {
  try {
    /* Check for existing session attribution */
    const stored = window.sessionStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
    
    /* New session: capture and normalize attribution */
    const params = new URLSearchParams(window.location.search);
    const rawRef = params.get('ref');
    const ref = normalizeRef(rawRef);
    const referrerDomain = extractDomain(document.referrer);
    
    const attribution = {
      ref,
      referrerDomain,
    };
    
    /* Store in sessionStorage (cleared when tab closes) */
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(attribution));
    
    return attribution;
  } catch (e) {
    /* Storage unavailable or disabled */
    return {
      ref: null,
      referrerDomain: null,
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
