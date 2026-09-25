/*
 * supporters.js: load and render supporters from supporters.json.
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

const MAX_NAME_LENGTH = 50;

/*
 * Load and render supporters from supporters.json. Render names with
 * textContent only (never innerHTML), trim and cap length. Only replaces
 * the empty state if there is at least one valid name; an all-invalid
 * array leaves the 'Be the first' message visible. Fails quietly if the
 * JSON is missing or malformed.
 */
export function loadSupporters(listElement, fetchFn = fetch) {
  if (!listElement) {
    return;
  }

  fetchFn('supporters.json')
    .then((response) => {
      if (!response.ok) {
        return null;
      }
      return response.json();
    })
    .then((supporters) => {
      if (!Array.isArray(supporters)) {
        return;
      }

      const validNames = [];
      
      supporters.forEach((supporter) => {
        if (!supporter || typeof supporter.name !== 'string') {
          return;
        }

        const name = supporter.name.trim();
        if (!name) {
          return;
        }

        const displayName = name.length > MAX_NAME_LENGTH
          ? name.slice(0, MAX_NAME_LENGTH) + '...'
          : name;
        
        validNames.push(displayName);
      });

      if (validNames.length === 0) {
        return;
      }

      listElement.innerHTML = '';
      
      validNames.forEach((displayName) => {
        const span = document.createElement('span');
        span.className = 'supporter-name';
        span.textContent = displayName;
        listElement.appendChild(span);
      });
    })
    .catch(() => {
      /* Fail quietly. Empty state stays visible. */
    });
}
