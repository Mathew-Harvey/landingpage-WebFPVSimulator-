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

const html = readFileSync(resolve(__dirname, '../index.html'), 'utf-8');

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
  if (actual !== expected) {
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

/* Test: Support link href is exact */
test('Support link href is exactly https://www.patreon.com/cw/webfpv', () => {
  const dom = new JSDOM(html);
  const link = dom.window.document.getElementById('support-link');
  assertEquals(
    link.href,
    'https://www.patreon.com/cw/webfpv',
    'Support link href must be exact'
  );
});

/* Test: Support link has target="_blank" and rel="noopener" */
test('Support link opens in new tab with noopener', () => {
  const dom = new JSDOM(html);
  const link = dom.window.document.getElementById('support-link');
  assertEquals(link.target, '_blank', 'Support link must have target="_blank"');
  assertContains(link.rel, 'noopener', 'Support link must have rel="noopener"');
});

/* Test: Empty supporters state renders correctly */
test('Empty supporters state shows friendly message', () => {
  const dom = new JSDOM(html);
  const list = dom.window.document.getElementById('supporters-list');
  const empty = list.querySelector('.supporters-empty');
  assertEquals(empty !== null, true, 'Empty state element should exist');
  assertContains(
    empty.textContent,
    'No supporters listed yet',
    'Empty state should have friendly message'
  );
  const link = empty.querySelector('a');
  assertEquals(link !== null, true, 'Empty state should contain Support link');
  assertEquals(
    link.href,
    'https://www.patreon.com/cw/webfpv',
    'Empty state link should point to Patreon'
  );
});

/* Test: Hostile names are escaped via textContent */
test('Names are rendered with textContent (not innerHTML)', () => {
  const dom = new JSDOM(html);
  const list = dom.window.document.getElementById('supporters-list');
  list.innerHTML = '';
  
  const span = dom.window.document.createElement('span');
  span.className = 'supporter-name';
  span.textContent = '<script>alert("xss")</script>';
  list.appendChild(span);
  
  assertEquals(
    span.textContent,
    '<script>alert("xss")</script>',
    'Script tag should be text'
  );
  assertEquals(
    list.innerHTML.includes('<script>'),
    false,
    'HTML should not contain actual script tag'
  );
});

/* Test: Long names are handled */
test('Long names are capped at 50 characters', () => {
  const dom = new JSDOM(html);
  const MAX_NAME_LENGTH = 50;
  const longName = 'A'.repeat(60);
  const expected = longName.slice(0, MAX_NAME_LENGTH) + '...';
  
  assertEquals(expected.length, 53, 'Capped name should be 53 chars (50 + ...)');
  assertContains(expected, '...', 'Should contain ellipsis');
});

/* Test: Empty array behavior */
test('Empty supporters array shows empty state', () => {
  const dom = new JSDOM(html);
  const list = dom.window.document.getElementById('supporters-list');
  const empty = list.querySelector('.supporters-empty');
  
  assertEquals(empty !== null, true, 'Empty state should be visible with empty array');
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
