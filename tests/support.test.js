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

async function test(name, fn) {
  testCount++;
  try {
    await fn();
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
  const dom = new JSDOM('<!DOCTYPE html><html><body><div class="supporters" hidden><div id="test"></div></div></body></html>');
  const listElement = dom.window.document.getElementById('test');
  
  const mockFetch = () => Promise.resolve({
    ok: true,
    json: () => Promise.resolve([
      { name: '<script>alert("xss")</script>', optIn: true, tier: 'test' },
      { name: 'Normal Name', optIn: true, tier: 'test' },
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
  const dom = new JSDOM('<!DOCTYPE html><html><body><div class="supporters" hidden><div id="test"></div></div></body></html>');
  const listElement = dom.window.document.getElementById('test');
  
  const longName = 'A'.repeat(60);
  const mockFetch = () => Promise.resolve({
    ok: true,
    json: () => Promise.resolve([
      { name: longName, optIn: true, tier: 'test' },
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
await test('loadSupporters leaves section hidden with empty array', async () => {
  const dom = new JSDOM('<!DOCTYPE html><html><body><div class="supporters" hidden><div id="test"></div></div></body></html>');
  const container = dom.window.document.querySelector('.supporters');
  const listElement = dom.window.document.getElementById('test');
  
  const mockFetch = () => Promise.resolve({
    ok: true,
    json: () => Promise.resolve([]),
  });

  const { loadSupporters } = await import('../src/supporters.js');
  loadSupporters(listElement, mockFetch);

  await new Promise(resolve => setTimeout(resolve, 50));

  assertEquals(
    container.hasAttribute('hidden'),
    true,
    'Section should stay hidden with empty array'
  );
});

/* Test: loadSupporters with all-invalid array */
await test('loadSupporters leaves section hidden with all-invalid array', async () => {
  const dom = new JSDOM('<!DOCTYPE html><html><body><div class="supporters" hidden><div id="test"></div></div></body></html>');
  const container = dom.window.document.querySelector('.supporters');
  const listElement = dom.window.document.getElementById('test');
  
  const mockFetch = () => Promise.resolve({
    ok: true,
    json: () => Promise.resolve([
      { name: '', optIn: true, tier: 'test' },
      { name: '   ', optIn: true, tier: 'test' },
      { tier: 'test', optIn: true },
      null,
    ]),
  });

  const { loadSupporters } = await import('../src/supporters.js');
  loadSupporters(listElement, mockFetch);

  await new Promise(resolve => setTimeout(resolve, 50));

  assertEquals(
    container.hasAttribute('hidden'),
    true,
    'Section should stay hidden when all names are invalid'
  );
});

/* Test: loadSupporters trims whitespace */
await test('loadSupporters trims whitespace from names', async () => {
  const dom = new JSDOM('<!DOCTYPE html><html><body><div class="supporters" hidden><div id="test"></div></div></body></html>');
  const listElement = dom.window.document.getElementById('test');
  
  const mockFetch = () => Promise.resolve({
    ok: true,
    json: () => Promise.resolve([
      { name: '  Test Name  ', optIn: true, tier: 'test' },
    ]),
  });

  const { loadSupporters } = await import('../src/supporters.js');
  loadSupporters(listElement, mockFetch);

  await new Promise(resolve => setTimeout(resolve, 50));

  const names = listElement.querySelectorAll('.supporter-name');
  assertEquals(names.length, 1, 'Should render 1 name');
  assertEquals(names[0].textContent, 'Test Name', 'Name should be trimmed');
});

/* Test: loadSupporters removes hidden when valid name exists */
await test('loadSupporters removes hidden attribute when valid name exists', async () => {
  const dom = new JSDOM('<!DOCTYPE html><html><body><div class="supporters" hidden><div id="test"></div></div></body></html>');
  const container = dom.window.document.querySelector('.supporters');
  const listElement = dom.window.document.getElementById('test');
  
  const mockFetch = () => Promise.resolve({
    ok: true,
    json: () => Promise.resolve([
      { name: 'Valid Name', optIn: true, tier: 'test' },
    ]),
  });

  const { loadSupporters } = await import('../src/supporters.js');
  loadSupporters(listElement, mockFetch);

  await new Promise(resolve => setTimeout(resolve, 50));

  assertEquals(
    container.hasAttribute('hidden'),
    false,
    'Section should show when valid name exists'
  );
  const names = listElement.querySelectorAll('.supporter-name');
  assertEquals(names.length, 1, 'Should render 1 name');
});

/* Test: loadSupporters skips entries without optIn: true */
await test('loadSupporters skips entries without optIn: true', async () => {
  const dom = new JSDOM('<!DOCTYPE html><html><body><div class="supporters" hidden><div id="test"></div></div></body></html>');
  const container = dom.window.document.querySelector('.supporters');
  const listElement = dom.window.document.getElementById('test');
  
  const mockFetch = () => Promise.resolve({
    ok: true,
    json: () => Promise.resolve([
      { name: 'No OptIn', tier: 'test' },
      { name: 'OptIn False', optIn: false, tier: 'test' },
      { name: 'OptIn True', optIn: true, tier: 'test' },
    ]),
  });

  const { loadSupporters } = await import('../src/supporters.js');
  loadSupporters(listElement, mockFetch);

  await new Promise(resolve => setTimeout(resolve, 50));

  const names = listElement.querySelectorAll('.supporter-name');
  assertEquals(names.length, 1, 'Should render only 1 name with optIn: true');
  assertEquals(names[0].textContent, 'OptIn True', 'Should render only the opted-in name');
  assertEquals(
    container.hasAttribute('hidden'),
    false,
    'Section should show when one valid opted-in name exists'
  );
});

/* The checkout links: every tip and offer anchor in the page is a fixed
   amount buy.stripe.com Payment Link, tagged, same tab, with the amount in
   its visible text. */
import { readFileSync } from 'node:fs';
import { TIP_URL, TIP_URL_PENDING, TIP_NOTE, bindTipLinks } from '../src/config.js';

const pageHtml = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const pageDom = new JSDOM(pageHtml);
const pageDoc = pageDom.window.document;
const checkoutLinks = [...pageDoc.querySelectorAll('[data-tip], [data-offer]')];

await test('every [data-tip] and [data-offer] href is a tagged buy.stripe.com link', () => {
  assertEquals(checkoutLinks.length >= 9, true, 'expected tip x2 and offers x8, found ' + checkoutLinks.length);
  for (const a of checkoutLinks) {
    const href = a.getAttribute('href');
    if (!href.startsWith('https://buy.stripe.com/')) throw new Error('not a Payment Link: ' + href);
    if (new URL(href).searchParams.get('utm_source') !== 'landing') throw new Error('no utm_source=landing: ' + href);
    if (href.includes('donate.stripe.com')) throw new Error('old donate link: ' + href);
  }
});

await test('checkout links open in the same tab and keep noopener', () => {
  for (const a of checkoutLinks) {
    if (a.hasAttribute('target')) throw new Error('target set on ' + a.getAttribute('href'));
    assertContains(a.getAttribute('rel') || '', 'noopener', 'rel must keep noopener');
  }
});

await test('the Tip button says the amount in its visible text and its href is TIP_URL', () => {
  const tips = [...pageDoc.querySelectorAll('[data-tip]')];
  assertEquals(tips.length, 2, 'header and footer tip');
  for (const a of tips) {
    assertContains(a.textContent, '$5', 'tip text must contain $5');
    assertEquals(a.getAttribute('href'), TIP_URL, 'hardcoded href must match src/config.js');
  }
});

await test('bindTipLinks rewrites tips to TIP_URL in the same tab', () => {
  const dom = new JSDOM('<a data-tip href="x" target="_blank">Tip</a>');
  bindTipLinks(dom.window.document);
  const a = dom.window.document.querySelector('[data-tip]');
  assertEquals(a.getAttribute('href'), TIP_URL);
  assertEquals(a.hasAttribute('target'), false, 'no target');
  assertEquals(a.getAttribute('rel'), 'noopener');
  assertEquals(a.getAttribute('aria-label'), TIP_NOTE);
});

await test('footer and phone menu offers match the header offers', () => {
  const byKey = {};
  for (const a of pageDoc.querySelectorAll('[data-offer]')) {
    (byKey[a.dataset.offer] ||= []).push(a.getAttribute('href') + '|' + a.textContent.trim());
  }
  for (const [k, v] of Object.entries(byKey)) {
    assertEquals(v.length, 2, k + ' should appear in the header and the footer');
    assertEquals(v[0], v[1], k + ' copies differ');
    if (!/\$\d+/.test(v[0].split('|')[1])) throw new Error(k + ' shows no price');
  }
});

if (TIP_URL === TIP_URL_PENDING) {
  console.log('WARNING: TIP_URL is still TIP_URL_PENDING. Paste the real Payment Link before merging.');
}

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
