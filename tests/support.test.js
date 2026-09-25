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

let testCount = 0;
let passCount = 0;
let failed = false;

async function test(name, fn) {
  testCount++;
  try {
    await fn();
    passCount++;
    console.log(`✓ ${name}`);
  } catch (e) {
    failed = true;
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
await test('trackSupportClick sends exact body with kind and source', async () => {
  const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
  global.window = dom.window;
  global.document = dom.window.document;
  global.Blob = dom.window.Blob;

  let capturedBody = null;
  
  const mockNavigator = {
    globalPrivacyControl: false,
    sendBeacon: (url, blob) => {
      capturedBody = blob;
      return true;
    },
  };
  
  Object.defineProperty(global, 'navigator', {
    value: mockNavigator,
    writable: true,
    configurable: true,
  });
  
  global.fetch = (url, options) => {
    capturedBody = options.body;
    return Promise.resolve();
  };

  const { trackSupportClick } = await import('../src/stats.js?t=' + Date.now());
  trackSupportClick();

  if (!capturedBody) {
    throw new Error('Neither sendBeacon nor fetch was called');
  }

  let bodyText;
  if (typeof capturedBody === 'string') {
    bodyText = capturedBody;
  } else if (capturedBody instanceof Blob) {
    bodyText = await capturedBody.text();
  } else {
    throw new Error('Unexpected body type: ' + typeof capturedBody);
  }

  const parsed = JSON.parse(bodyText);
  assertEquals(parsed, { v: 1, kind: 'support_click', source: 'landing' },
    'Body must be exactly {"v":1,"kind":"support_click","source":"landing"}');
});

/* Test: GPC true blocks all events */
await test('GPC true sends nothing', async () => {
  const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
  global.window = dom.window;
  global.document = dom.window.document;
  
  let beaconCalled = false;
  let fetchCalled = false;
  
  const mockNavigator = {
    globalPrivacyControl: true,
    sendBeacon: () => { beaconCalled = true; return true; },
  };
  
  Object.defineProperty(global, 'navigator', {
    value: mockNavigator,
    writable: true,
    configurable: true,
  });
  
  global.fetch = () => { fetchCalled = true; return Promise.resolve(); };

  const { trackSupportClick } = await import('../src/stats.js?t2=' + Date.now());
  trackSupportClick();

  assertEquals(beaconCalled, false, 'sendBeacon should not be called when GPC is true');
  assertEquals(fetchCalled, false, 'fetch should not be called when GPC is true');
});

/* Test: loadSupporters with hostile names (XSS protection) */
await test('loadSupporters escapes hostile names via textContent', async () => {
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
await test('loadSupporters caps names at 50 characters', async () => {
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
await test('loadSupporters fails quietly with malformed JSON', async () => {
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
await test('loadSupporters leaves empty state with empty array', async () => {
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
await test('loadSupporters leaves empty state with all-invalid array', async () => {
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
await test('loadSupporters trims whitespace from names', async () => {
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
