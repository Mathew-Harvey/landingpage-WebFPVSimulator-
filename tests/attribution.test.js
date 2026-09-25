/*
 * Tests for src/attribution.js
 *
 * Run with: node tests/attribution.test.js
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

/* Set up a fake DOM environment for the attribution module */
const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
  url: 'https://webfpv.io/',
});

global.window = dom.window;
global.document = dom.window.document;
global.URL = dom.window.URL;

/* Import module under test after setting up globals */
const { getAttribution, appendAttribution } = await import('../src/attribution.js');

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

function clearStorage() {
  window.sessionStorage.clear();
}

/* Test: ref normalization - canonical tags */
test('normalizes canonical ref tags', () => {
  clearStorage();
  dom.reconfigure({ url: 'https://webfpv.io/?ref=reddit' });
  const attr = getAttribution();
  assertEquals(attr.ref, 'reddit', 'reddit should pass through');
  
  clearStorage();
  dom.reconfigure({ url: 'https://webfpv.io/?ref=yt' });
  const attr2 = getAttribution();
  assertEquals(attr2.ref, 'yt', 'yt should pass through');
});

/* Test: ref normalization - aliases */
test('normalizes ref aliases (youtube->yt, twitter->x)', () => {
  clearStorage();
  dom.reconfigure({ url: 'https://webfpv.io/?ref=youtube' });
  const attr = getAttribution();
  assertEquals(attr.ref, 'yt', 'youtube should become yt');
  
  clearStorage();
  dom.reconfigure({ url: 'https://webfpv.io/?ref=twitter' });
  const attr2 = getAttribution();
  assertEquals(attr2.ref, 'x', 'twitter should become x');
});

/* Test: ref normalization - lowercased */
test('lowercases ref tags', () => {
  clearStorage();
  dom.reconfigure({ url: 'https://webfpv.io/?ref=REDDIT' });
  const attr = getAttribution();
  assertEquals(attr.ref, 'reddit', 'REDDIT should become reddit');
});

/* Test: ref normalization - alphanumeric and hyphens only */
test('strips non-alphanumeric characters from ref', () => {
  clearStorage();
  dom.reconfigure({ url: 'https://webfpv.io/?ref=my_cool-site!' });
  const attr = getAttribution();
  assertEquals(attr.ref, 'mycool-site', 'should strip underscores and punctuation');
  
  clearStorage();
  dom.reconfigure({ url: 'https://webfpv.io/?ref=test@example.com' });
  const attr2 = getAttribution();
  assertEquals(attr2.ref, 'testexamplecom', 'should strip @ and dots');
});

/* Test: ref normalization - max 16 chars */
test('truncates ref to 16 chars', () => {
  clearStorage();
  dom.reconfigure({ url: 'https://webfpv.io/?ref=verylongreferrername' });
  const attr = getAttribution();
  assertEquals(attr.ref, 'verylongreferrer', 'should truncate to 16 chars');
  assertEquals(attr.ref.length, 16);
});

/* Test: ref normalization - invalid inputs */
test('returns null for invalid ref', () => {
  clearStorage();
  dom.reconfigure({ url: 'https://webfpv.io/?ref=' });
  const attr = getAttribution();
  assertEquals(attr.ref, null, 'empty ref should be null');
  
  clearStorage();
  dom.reconfigure({ url: 'https://webfpv.io/?ref=!!!' });
  const attr2 = getAttribution();
  assertEquals(attr2.ref, null, 'all non-alphanumeric should be null');
});

/* Test: referrer domain extraction */
test('extracts referrer domain from document.referrer', () => {
  clearStorage();
  Object.defineProperty(dom.window.document, 'referrer', {
    value: 'https://www.reddit.com/r/fpv/comments/123',
    configurable: true,
  });
  dom.reconfigure({ url: 'https://webfpv.io/' });
  const attr = getAttribution();
  assertEquals(attr.referrerDomain, 'www.reddit.com', 'should extract hostname');
});

/* Test: same-host referrer is ignored */
test('ignores same-host referrer', () => {
  clearStorage();
  Object.defineProperty(dom.window.document, 'referrer', {
    value: 'https://webfpv.io/wiki/',
    configurable: true,
  });
  dom.reconfigure({ url: 'https://webfpv.io/' });
  const attr = getAttribution();
  assertEquals(attr.referrerDomain, null, 'same-host should be null');
});

/* Test: sessionStorage persistence */
test('reads from sessionStorage on subsequent calls', () => {
  clearStorage();
  dom.reconfigure({ url: 'https://webfpv.io/?ref=hn' });
  const attr1 = getAttribution();
  assertEquals(attr1.ref, 'hn', 'first call should capture ref');
  
  /* Reconfigure URL without ref */
  dom.reconfigure({ url: 'https://webfpv.io/wiki/' });
  const attr2 = getAttribution();
  assertEquals(attr2.ref, 'hn', 'second call should read from sessionStorage');
});

/* Test: appendAttribution adds parameters */
test('appendAttribution adds ref and referrer to URL', () => {
  clearStorage();
  Object.defineProperty(dom.window.document, 'referrer', {
    value: 'https://news.ycombinator.com/',
    configurable: true,
  });
  dom.reconfigure({ url: 'https://webfpv.io/?ref=hn' });
  getAttribution();
  
  const url = appendAttribution('https://webfpv.io/sim');
  const u = new URL(url);
  assertEquals(u.searchParams.get('ref'), 'hn');
  assertEquals(u.searchParams.get('referrer'), 'news.ycombinator.com');
});

/* Test: appendAttribution does nothing when no attribution */
test('appendAttribution returns URL unchanged when no attribution', () => {
  clearStorage();
  Object.defineProperty(dom.window.document, 'referrer', {
    value: '',
    configurable: true,
  });
  dom.reconfigure({ url: 'https://webfpv.io/' });
  getAttribution();
  
  const url = appendAttribution('https://webfpv.io/sim');
  assertEquals(url, 'https://webfpv.io/sim', 'should return original URL');
});

/* Test: no localStorage usage */
test('does not use localStorage', () => {
  clearStorage();
  window.localStorage.clear();
  dom.reconfigure({ url: 'https://webfpv.io/?ref=test' });
  getAttribution();
  
  const keys = Object.keys(window.localStorage);
  assertEquals(keys.length, 0, 'localStorage should be empty');
  assertEquals(window.localStorage.getItem('webfpv_attribution'), null);
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
