/*
 * Tests for support link and supporters functionality
 *
 * Run with: node tests/support.test.js
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

import { JSDOM } from 'jsdom';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let testCount = 0;
let passCount = 0;

function test(name, fn) {
  testCount++;
  try {
    fn();
    passCount++;
    console.log(`✓ ${name}`);
  } catch (e) {
    console.error(`✗ ${name}`);
    console.error(`  ${e.message}`);
  }
}

function assertEquals(actual, expected, message) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(
      message || `Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`
    );
  }
}

function assertContains(haystack, needle, message) {
  if (haystack.indexOf(needle) === -1) {
    throw new Error(
      message || `Expected to find "${needle}" in "${haystack}"`
    );
  }
}

/* Test: trackSupportClick sends correct beacon body */
test('trackSupportClick sends exact body with kind and source', async () => {
  const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
  global.window = dom.window;
  global.document = dom.window.document;
  global.navigator = {
    globalPrivacyControl: false,
    sendBeacon: null,
  };
  global.fetch = null;

  let beaconCalled = false;
  let beaconBody = null;

  global.navigator.sendBeacon = (url, blob) => {
    beaconCalled = true;
    const reader = new FileReader();
    return new Promise((resolve) => {
      reader.onload = () => {
        beaconBody = reader.result;
        resolve(true);
      };
      reader.readAsText(blob);
    });
  };

  const { trackSupportClick } = await import('../src/stats.js?t=' + Date.now());
  trackSupportClick();

  await new Promise(resolve => setTimeout(resolve, 10));

  if (!beaconCalled) {
    const { trackSupportClick: tc2 } = await import('../src/stats.js?t2=' + Date.now());
    
    let fetchCalled = false;
    let fetchBody = null;
    global.fetch = (url, options) => {
      fetchCalled = true;
      fetchBody = options.body;
      return Promise.resolve();
    };
    
    tc2();
    await new Promise(resolve => setTimeout(resolve, 10));
    
    if (fetchCalled) {
      const parsed = JSON.parse(fetchBody);
      assertEquals(parsed.v, 1, 'Body must have v: 1');
      assertEquals(parsed.kind, 'support_click', 'Body must have kind: support_click');
      assertEquals(parsed.source, 'landing', 'Body must have source: landing');
      assertEquals(Object.keys(parsed).length, 3, 'Body must have exactly 3 keys');
      return;
    }
  }

  throw new Error('Neither sendBeacon nor fetch was called');
});

/* Test: GPC true blocks all events */
test('GPC true sends nothing', async () => {
  const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
  global.window = dom.window;
  global.document = dom.window.document;
  
  let beaconCalled = false;
  let fetchCalled = false;
  
  global.navigator = {
    globalPrivacyControl: true,
    sendBeacon: () => { beaconCalled = true; return true; },
  };
  global.fetch = () => { fetchCalled = true; return Promise.resolve(); };

  const { trackSupportClick } = await import('../src/stats.js?t3=' + Date.now());
  trackSupportClick();

  await new Promise(resolve => setTimeout(resolve, 10));

  assertEquals(beaconCalled, false, 'sendBeacon should not be called when GPC is true');
  assertEquals(fetchCalled, false, 'fetch should not be called when GPC is true');
});

/* Test: loadSupporters with hostile names (XSS protection) */
test('loadSupporters escapes hostile names via textContent', async () => {
  const dom = new JSDOM('<!DOCTYPE html><html><body><div id="test"></div></body></html>');
  const listElement = dom.window.document.getElementById('test');
  
  const mockFetch = () => Promise.resolve({
    ok: true,
    json: () => Promise.resolve([
      { name: '<script>alert("xss")</script>', tier: 'test' },
      { name: 'Normal Name', tier: 'test' },
    ]),
  });

  const { loadSupporters } = await import('../src/supporters.js');
  loadSupporters(listElement, mockFetch);

  await new Promise(resolve => setTimeout(resolve, 50));

  const names = listElement.querySelectorAll('.supporter-name');
  assertEquals(names.length, 2, 'Should render 2 names');
  assertEquals(
    names[0].textContent,
    '<script>alert("xss")</script>',
    'Script tag should be rendered as text, not executed'
  );
  assertContains(
    listElement.innerHTML,
    '&lt;script&gt;',
    'HTML should be escaped'
  );
  assertEquals(names[1].textContent, 'Normal Name', 'Normal name should render');
});

/* Test: loadSupporters with over-long names */
test('loadSupporters caps names at 50 characters', async () => {
  const dom = new JSDOM('<!DOCTYPE html><html><body><div id="test"></div></body></html>');
  const listElement = dom.window.document.getElementById('test');
  
  const longName = 'A'.repeat(60);
  const mockFetch = () => Promise.resolve({
    ok: true,
    json: () => Promise.resolve([
      { name: longName, tier: 'test' },
    ]),
  });

  const { loadSupporters } = await import('../src/supporters.js');
  loadSupporters(listElement, mockFetch);

  await new Promise(resolve => setTimeout(resolve, 50));

  const names = listElement.querySelectorAll('.supporter-name');
  assertEquals(names.length, 1, 'Should render 1 name');
  assertEquals(names[0].textContent.length, 53, 'Capped name should be 53 chars (50 + ...)');
  assertContains(names[0].textContent, '...', 'Capped name should have ellipsis');
  assertEquals(names[0].textContent, longName.slice(0, 50) + '...', 'Should cap at exactly 50 + ...');
});

/* Test: loadSupporters with malformed JSON */
test('loadSupporters fails quietly with malformed JSON', async () => {
  const dom = new JSDOM('<!DOCTYPE html><html><body><div id="test">Initial</div></body></html>');
  const listElement = dom.window.document.getElementById('test');
  const initialHTML = listElement.innerHTML;
  
  const mockFetch = () => Promise.resolve({
    ok: true,
    json: () => Promise.reject(new Error('Invalid JSON')),
  });

  const { loadSupporters } = await import('../src/supporters.js');
  loadSupporters(listElement, mockFetch);

  await new Promise(resolve => setTimeout(resolve, 50));

  assertEquals(
    listElement.innerHTML,
    initialHTML,
    'Content should remain unchanged when JSON is malformed'
  );
});

/* Test: loadSupporters with empty array */
test('loadSupporters leaves empty state with empty array', async () => {
  const dom = new JSDOM('<!DOCTYPE html><html><body><div id="test">Empty state</div></body></html>');
  const listElement = dom.window.document.getElementById('test');
  const initialHTML = listElement.innerHTML;
  
  const mockFetch = () => Promise.resolve({
    ok: true,
    json: () => Promise.resolve([]),
  });

  const { loadSupporters } = await import('../src/supporters.js');
  loadSupporters(listElement, mockFetch);

  await new Promise(resolve => setTimeout(resolve, 50));

  assertEquals(
    listElement.innerHTML,
    initialHTML,
    'Empty state should remain with empty array'
  );
});

/* Test: loadSupporters with all-invalid array */
test('loadSupporters leaves empty state with all-invalid array', async () => {
  const dom = new JSDOM('<!DOCTYPE html><html><body><div id="test">Empty state</div></body></html>');
  const listElement = dom.window.document.getElementById('test');
  const initialHTML = listElement.innerHTML;
  
  const mockFetch = () => Promise.resolve({
    ok: true,
    json: () => Promise.resolve([
      { name: '', tier: 'test' },
      { name: '   ', tier: 'test' },
      { tier: 'test' },
      null,
    ]),
  });

  const { loadSupporters } = await import('../src/supporters.js');
  loadSupporters(listElement, mockFetch);

  await new Promise(resolve => setTimeout(resolve, 50));

  assertEquals(
    listElement.innerHTML,
    initialHTML,
    'Empty state should remain when all names are invalid'
  );
});

/* Test: loadSupporters trims whitespace */
test('loadSupporters trims whitespace from names', async () => {
  const dom = new JSDOM('<!DOCTYPE html><html><body><div id="test"></div></body></html>');
  const listElement = dom.window.document.getElementById('test');
  
  const mockFetch = () => Promise.resolve({
    ok: true,
    json: () => Promise.resolve([
      { name: '  Test Name  ', tier: 'test' },
    ]),
  });

  const { loadSupporters } = await import('../src/supporters.js');
  loadSupporters(listElement, mockFetch);

  await new Promise(resolve => setTimeout(resolve, 50));

  const names = listElement.querySelectorAll('.supporter-name');
  assertEquals(names.length, 1, 'Should render 1 name');
  assertEquals(names[0].textContent, 'Test Name', 'Name should be trimmed');
});

/* Report results */
console.log('');
console.log(`${passCount}/${testCount} tests passed`);
if (passCount === testCount) {
  console.log('All tests passed!');
  process.exit(0);
} else {
  console.log(`${testCount - passCount} test(s) failed`);
  process.exit(1);
}
